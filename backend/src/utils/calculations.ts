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

/**
 * Calculate growth band based on congregational worship size
 * @param congregationalWorship - Current year congregational worship attendance
 * @returns Growth band value between minBand and maxBand
 */
export function getGrowthBand(congregationalWorship: number): number {
    const difference = maxBand - minBand
    if (congregationalWorship <= minCongregation) return minBand
    if (congregationalWorship > maxCongregation) return maxBand
    const value = (congregationalWorship - minCongregation) / (maxCongregation - minCongregation)
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
 * @returns Nominal change value
 */
export function calculateNominalChange(prevYear: number, currentYear: number): number {
    const nominalChange = currentYear - prevYear
    const maxSize = maxCongregation * benchmark
    const value = nominalChange / maxSize * maxPointsChange
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
 * Calculate overall growth score based on metrics
 * @param metrics - Growth metrics object
 * @returns Rounded growth score or null if previous year is less than or equal to zero
 */
export function calculateGrowth(metrics: { congregationalWorship: YearPair }): number | null {
    if (metrics.congregationalWorship.prevYear === 0) {
        throw new Error('Cannot calculate growth score when previous year is zero')
    }
    if (metrics.congregationalWorship.prevYear === null || metrics.congregationalWorship.currentYear === null) {
        return null
    }

    let growth = getGrowthBand(metrics.congregationalWorship.currentYear)
    growth += calculateNominalChange(metrics.congregationalWorship.prevYear, metrics.congregationalWorship.currentYear)

    try {
        const percentage = calculatePercentageChange(metrics.congregationalWorship.prevYear, metrics.congregationalWorship.currentYear)
        if (percentage >= benchmark) {
            growth += maxPointsChange
        } else {
            growth = growth * (1 + percentage)
        }
        return Math.round(growth)
    } catch {
        return null
    }
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
