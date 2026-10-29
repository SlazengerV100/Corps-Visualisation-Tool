// Calculation utility functions for growth and sustainability metrics

import type { MissionIndicator } from '../models/MissionIndicator.ts'
import type { TithingPair, YearPair } from '../models/Snapshot.ts'

const maxBand = 70
const minBand = 30
const minCongregation = 25
const maxCongregation = 200
const benchmark = 0.1
const maxPointsChange = 15
const minTithingPerPerson = 500
const maxTithingPerPerson = 2000
const maxScore = 100
const minProgramme = 5
const maxProgramme = 50
const growthWeights = { congregationalWorship: 0.5, firstTimeDecisions: 0.2, kidsChurch: 0.15, youthDiscipleship: 0.15 }

/**
 * Calculate growth band based on attendance, scaled between minSize and maxSize
 * @param attendance - Current year attendance, congregational worship by default
 * @param minSize - Attendance at or below which the band is minBand
 * @param maxSize - Attendance above which the band is maxBand
 * @returns Growth band value between minBand and maxBand
 */
export function getGrowthBand(attendance: number, minSize = minCongregation, maxSize = maxCongregation): number {
    const difference = maxBand - minBand
    if (attendance <= minSize) return minBand
    if (attendance > maxSize) return maxBand
    const value = (attendance - minSize) / (maxSize - minSize)
    return minBand + difference * value
}

/**
 * Calculate sustainability band based on tithing per person
 * @param tithingPerPerson - Tithing amount per person
 * @returns Sustainability band value between minBand and maxBand
 */
export function getSustainabilityBand(tithingPerPerson: number): number {
    const difference = maxBand - minBand
    if (tithingPerPerson <= minTithingPerPerson) return minBand
    if (tithingPerPerson > maxTithingPerPerson) return maxBand
    const value = (tithingPerPerson - minTithingPerPerson) / (maxTithingPerPerson - minTithingPerPerson)
    return minBand + difference * value
}

/**
 * Calculate nominal change for growth metrics
 * @param prevYear - Previous year value
 * @param currentYear - Current year value
 * @param maxSize - Attendance at the top of the band, whose benchmark share earns the full change
 * @returns Nominal change value
 */
export function calculateNominalChange(prevYear: number, currentYear: number, maxSize = maxCongregation): number {
    const nominalChange = currentYear - prevYear
    const value = nominalChange / (maxSize * benchmark) * maxPointsChange
    if (value > maxPointsChange) return maxPointsChange
    if (value < -maxPointsChange) return -maxPointsChange
    return value
}

/**
 * Calculate nominal change for sustainability metrics
 * @param prevYear - Previous year value
 * @param currentYear - Current year value
 * @returns Nominal sustainability change value
 */
export function calculateNominalSustainability(prevYear: number, currentYear: number): number
export function calculateNominalSustainability(prevYear: number | null, currentYear: number | null): number | null
export function calculateNominalSustainability(prevYear: number | null, currentYear: number | null): number | null {
    if (prevYear === null || currentYear === null) {
        return null
    }
    const nominalChange = currentYear - prevYear
    const maxSize = maxCongregation * maxTithingPerPerson * benchmark
    const value = nominalChange / maxSize * maxPointsChange
    if (value > maxPointsChange) return maxPointsChange
    if (value < -maxPointsChange) return -maxPointsChange
    return value
}

/**
 * Calculate percentage change between two values
 * @param prevYear - Previous year value
 * @param currentYear - Current year value
 * @returns Percentage change
 */
export function calculatePercentageChange(prevYear: number, currentYear: number): number {
    if (prevYear <= 0) {
        throw new Error('Cannot calculate percentage change when previous year is less than or equal to zero')
    }
    return (currentYear - prevYear) / prevYear
}

/**
 * Calculate one indicator's growth score from its band, nominal change and percentage change
 * @returns Score with no percentage change when the previous year is zero
 */
function calculateIndicatorGrowth(prevYear: number, currentYear: number, minSize: number, maxSize: number): number {
    let score = getGrowthBand(currentYear, minSize, maxSize)
    score += calculateNominalChange(prevYear, currentYear, maxSize)
    if (prevYear > 0) {
        const percentage = calculatePercentageChange(prevYear, currentYear)
        if (percentage >= benchmark) {
            score += maxPointsChange
        } else {
            score = score * (1 + percentage)
        }
    }
    return score
}

/**
 * Calculate overall growth score based on metrics
 * @param metrics - Growth metrics object
 * @returns Rounded weighted average of the worship, first-time decisions, kids church and youth scores, or null without worship in both years
 */
export function calculateGrowth(metrics: Record<MissionIndicator, YearPair>): number | null {
    const worship = metrics.congregationalWorship
    if (worship.prevYear === 0) {
        throw new Error('Cannot calculate growth score when previous year is zero')
    }
    if (worship.prevYear === null || worship.currentYear === null || worship.prevYear < 0) {
        return null
    }

    const decisionsPerPerson = worship.currentYear > 0 ? (metrics.firstTimeDecisions.currentYear ?? 0) / worship.currentYear : 0
    const scores = [
        { weight: growthWeights.congregationalWorship, score: calculateIndicatorGrowth(worship.prevYear, worship.currentYear, minCongregation, maxCongregation) },
        { weight: growthWeights.firstTimeDecisions, score: Math.min(decisionsPerPerson / benchmark, 1) * maxScore }
    ]
    for (const indicator of ['kidsChurch', 'youthDiscipleship'] as const) {
        const { prevYear, currentYear } = metrics[indicator]
        if (prevYear !== null || currentYear !== null) {
            scores.push({ weight: growthWeights[indicator], score: calculateIndicatorGrowth(prevYear ?? 0, currentYear ?? 0, minProgramme, maxProgramme) })
        }
    }
    const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0)
    return Math.round(scores.reduce((sum, s) => sum + s.weight * s.score, 0) / totalWeight)
}

/**
 * Calculate overall sustainability score based on metrics and size
 * @param metrics - Sustainability metrics object
 * @param size - Congregational size
 * @returns Rounded average of the tithing and surplus/deficit scores, from tithing alone without a surplus/deficit figure or any worship to share it across
 */
export function calculateSustainability(metrics: { tithing: TithingPair, surplusDeficit: number | null }, size: number): number {
    const tithingPerPersonCurrentYear = metrics.tithing.currentYear / size
    let tithingScore = getSustainabilityBand(tithingPerPersonCurrentYear)
    tithingScore += calculateNominalSustainability(metrics.tithing.prevYear, metrics.tithing.currentYear)
    if (metrics.tithing.prevYear > 0) {
        const percentage = calculatePercentageChange(metrics.tithing.prevYear, metrics.tithing.currentYear)
        if (percentage >= benchmark) {
            tithingScore += maxPointsChange
        } else {
            tithingScore = tithingScore * (1 + percentage)
        }
    }

    if (metrics.surplusDeficit === null || size <= 0) {
        return Math.round(tithingScore)
    }
    const surplusDeficitPerPerson = Math.min(Math.max(metrics.surplusDeficit / size, -maxTithingPerPerson), maxTithingPerPerson)
    const surplusDeficitScore = maxScore * (surplusDeficitPerPerson + maxTithingPerPerson) / (2 * maxTithingPerPerson)
    return Math.round((tithingScore + surplusDeficitScore) / 2)
}

/**
 * Update current corps metrics based on metric name and value
 * @param metrics - Current metrics object
 * @param metricName - Name of the metric to update
 * @param value - Value to set
 * @param yearType - Either 'currentYear' or 'prevYear'
 * @returns Updated metrics object
 */
export function updateCurrentCorps(metrics: Record<MissionIndicator, YearPair>, metricName: string, value: number, yearType: 'currentYear' | 'prevYear'): Record<MissionIndicator, YearPair> {
    if (yearType != 'currentYear' && yearType != 'prevYear') {
        throw new Error('Year type must be either currentYear or prevYear')
    }
    switch (metricName) {
        case '01-Congregational Worship':
            metrics.congregationalWorship[yearType] = value
            break
        case '03A-First Time Decisions':
            metrics.firstTimeDecisions[yearType] = value
            break
        case '04-Kids Church':
            metrics.kidsChurch[yearType] = value
            break
        case '05-Youth Discipleship':
            metrics.youthDiscipleship[yearType] = value
            break
    }
    return metrics
}
