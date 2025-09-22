// Calculation utility functions for growth and sustainability metrics

const maxBand = 70
const minBand = 30
const minCongregation = 25
const maxCongregation = 200
const benchmark = 0.1
const maxPointsChange = 15
const minTithingPerPerson = 500
const maxTithingPerPerson = 2000

/**
 * Calculate growth band based on congregational worship size
 * @param {number} congregationalWorship - Current year congregational worship attendance
 * @returns {number} Growth band value between minBand and maxBand
 */
export function getGrowthBand(congregationalWorship) {
    const difference = maxBand - minBand
    if (congregationalWorship <= minCongregation) return minBand
    if (congregationalWorship > maxCongregation) return maxBand
    const value = (congregationalWorship - minCongregation) / (maxCongregation - minCongregation)
    return minBand + difference * value
}

/**
 * Calculate sustainability band based on tithing per person
 * @param {number} tithingPerPerson - Tithing amount per person
 * @returns {number} Sustainability band value between minBand and maxBand
 */
export function getSustainabilityBand(tithingPerPerson) {
    const difference = maxBand - minBand
    if (tithingPerPerson <= minTithingPerPerson) return minBand
    if (tithingPerPerson > maxTithingPerPerson) return maxBand
    const value = (tithingPerPerson - minTithingPerPerson) / (maxTithingPerPerson - minTithingPerPerson)
    return minBand + difference * value
}

/**
 * Calculate nominal change for growth metrics
 * @param {number} prevYear - Previous year value
 * @param {number} currentYear - Current year value
 * @returns {number} Nominal change value
 */
export function calculateNominalChange(prevYear, currentYear) {
    const nominalChange = currentYear - prevYear
    const maxSize = maxCongregation * benchmark
    const value = nominalChange / maxSize * maxPointsChange
    if (value > maxPointsChange) return maxPointsChange
    if (value < -maxPointsChange) return -maxPointsChange 
    return value
}

/**
 * Calculate nominal change for sustainability metrics
 * @param {number} prevYear - Previous year value
 * @param {number} currentYear - Current year value
 * @returns {number} Nominal sustainability change value
 */
export function calculateNominalSustainability(prevYear, currentYear) {
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
 * @param {number} prevYear - Previous year value
 * @param {number} currentYear - Current year value
 * @returns {number} Percentage change
 */
export function calculatePercentageChange(prevYear, currentYear) {
    if (prevYear <= 0) {
        throw new Error('Cannot calculate percentage change when previous year is less than or equal to zero')
    }
    return (currentYear - prevYear) / prevYear
}

/**
 * Calculate overall growth score based on metrics
 * @param {Object} metrics - Growth metrics object
 * @returns {number} Rounded growth score or null if previous year is less than or equal to zero
 */
export function calculateGrowth(metrics) {
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
    } catch (error) {
        return null
    }
}

/**
 * Calculate overall sustainability score based on metrics and size
 * @param {Object} metrics - Sustainability metrics object
 * @param {number} size - Congregational size
 * @returns {number} Rounded sustainability score
 */
export function calculateSustainability(metrics, size) {
    const tithingPerPersonCurrentYear = metrics.tithing.currentYear / size
    let sustainability = getSustainabilityBand(tithingPerPersonCurrentYear)
    sustainability += calculateNominalSustainability(metrics.tithing.prevYear, metrics.tithing.currentYear)
    return Math.round(sustainability)
}

/**
 * Update current corps metrics based on metric name and value
 * @param {Object} metrics - Current metrics object
 * @param {string} metricName - Name of the metric to update
 * @param {number} value - Value to set
 * @param {string} yearType - Either 'currentYear' or 'prevYear'
 * @returns {Object} Updated metrics object
 */
export function updateCurrentCorps(metrics, metricName, value, yearType) {
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
