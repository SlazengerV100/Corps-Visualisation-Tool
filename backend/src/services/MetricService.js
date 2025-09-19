import fs from 'fs'
import csv from 'csv-parser'
import path from 'path'
import { DataService } from './DataService.js'

/**
 * Service class for handling metric-specific data operations
 */
export class MetricService extends DataService {
    constructor(dataFolder) {
        super(dataFolder)
    }

    /**
     * Get monthly metric data for a specific corps and year (using cache)
     */
    async getGrowthMetricDataByMonth(centreId, year, metric) {
        return new Promise((resolve, reject) => {
            const numericYear = parseInt(year, 10)
            const yearCache = this.monthlyGrowthMetricsCache.get(numericYear)
            if (!yearCache) {
                reject({ status: 404, error: `No monthly data available for year ${numericYear}` })
                return
            }

            const corpsCache = yearCache.get(centreId)
            if (!corpsCache) {
                reject({ status: 404, error: `${metric} metric is not available for corps ${centreId} in year ${numericYear}` })
                return
            }

            const monthlyData = corpsCache.get(metric)
            if (!monthlyData || monthlyData.length === 0) {
                reject({ status: 404, error: `${metric} metric is not available for corps ${centreId} in year ${numericYear}` })
                return
            }

            resolve(monthlyData)
        })
    }

    /**
     * Get growth metric data by year for a specific corps and metric (using cache)
     */
    async getGrowthMetricDataByYear(centreId, metric) {
        return new Promise((resolve, reject) => {
            const yearlyData = []
            
            // Iterate through all years in the cache
            for (const [year, yearCache] of this.monthlyGrowthMetricsCache) {
                const corpsCache = yearCache.get(centreId)
                if (corpsCache) {
                    const monthlyData = corpsCache.get(metric)
                    if (monthlyData && monthlyData.length > 0) {
                        // Calculate the average metric value for the year
                        const totalMetric = monthlyData.reduce((sum, data) => sum + data.metric, 0)
                        const averageMetric = totalMetric / monthlyData.length
                        
                        yearlyData.push({
                            year: year,
                            metric: averageMetric
                        })
                    }
                }
            }
            
            if (yearlyData.length === 0) {
                reject({ status: 404, error: `${metric} metric is not available for corps ${centreId} in any year` })
                return
            }
            
            // Sort by year
            yearlyData.sort((a, b) => a.year - b.year)
            resolve(yearlyData)
        })
    }

    /**
     * Get first time decisions data by year for a specific corps (using cache)
     */
    async getFirstTimeDecisionsDataByYear(centreId) {
        return new Promise((resolve, reject) => {
            const yearlyData = []
            
            // Iterate through all years in the cache
            for (const [year, yearData] of this.growthDataCache) {
                const corpsData = yearData.find(item => item.id === centreId)
                if (corpsData && corpsData.metrics.congregationalWorship.currentYear > 0) {
                    yearlyData.push({
                        year: year,
                        metric: corpsData.metrics.firstTimeDecisions.currentYear
                    })
                }
            }
            
            if (yearlyData.length === 0) {
                reject({ status: 404, error: `First time decisions data is not available for corps ${centreId} in any year` })
                return
            }
            
            // Sort by year
            yearlyData.sort((a, b) => a.year - b.year)
            resolve(yearlyData)
        })
    }

    /**
     * Get tithing data by year for a specific corps (using cache)
     */
    async getTithingDataByYear(centreId) {
        return new Promise((resolve, reject) => {
            const yearlyData = []
            
            // Iterate through all years in the cache
            for (const [year, yearData] of this.tithingDataCache) {
                const corpsData = yearData.find(item => item.id === centreId)
                if (corpsData) {
                    yearlyData.push({
                        year: year,
                        metric: corpsData.tithing
                    })
                }
            }
            
            if (yearlyData.length === 0) {
                reject({ status: 404, error: `Tithing data is not available for corps ${centreId} in any year` })
                return
            }
            
            // Sort by year
            yearlyData.sort((a, b) => a.year - b.year)
            resolve(yearlyData)
        })
    }

    /**
     * Get surplus/deficit data by year for a specific corps (using cache)
     */
    async getSurplusDeficitDataByYear(location) {
        return new Promise((resolve, reject) => {
            const yearlyData = []
            
            // Iterate through all years in the cache
            for (const [year, yearData] of this.surplusDeficitDataCache) {
                const corpsData = yearData.find(item => item.location === location)
                if (corpsData) {
                    yearlyData.push({
                        year: year,
                        metric: corpsData.surplusDeficit
                    })
                }
            }
            
            if (yearlyData.length === 0) {
                reject({ status: 404, error: `Surplus/deficit data is not available for corps ${location} in any year` })
                return
            }
            
            // Sort by year
            yearlyData.sort((a, b) => a.year - b.year)
            resolve(yearlyData)
        })
    }

    /**
     * Get tithing data by month for a specific corps and year
     */
    async getTithingDataByMonth(centreId, year) {
        return new Promise((resolve, reject) => {
            const numericYear = parseInt(year, 10)
            const currentYearSuffix = String(numericYear).slice(-2)
            const prevYearSuffix = String(numericYear - 1).slice(-2)
            const fileName = 'Territorial_Tithing_2000_2025.csv'
            const filePath = path.join(this.dataFolder, fileName)
            const monthlyData = []

            if (!fs.existsSync(filePath)) {
                reject({ status: 404, error: `No tithing data file found for year ${numericYear}` })
                return
            }

            try {
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (data) => {
                        const mPeriod = data.M_period
                        const code = data.code
                        const value = parseFloat(data.mth_value) || 0

                        // Only process data for the specified corps
                        if (code === centreId) {
                            // Extract year and month from M_period
                            const periodYear = mPeriod.substring(1, 3) // Extract year part (e.g., "24" from "M2407")
                            const month = parseInt(mPeriod.substring(3, 5)) // Extract month part (e.g., 7 from "M2407")
                            
                            // Financial year logic: July to June of the following year
                            // For financial year 2025: July 2024 (M2407) to June 2025 (M2506)
                            const isFinancialYearData = 
                                (periodYear === prevYearSuffix && month >= 7) || // Previous year, months 7-12
                                (periodYear === currentYearSuffix && month <= 6)  // Current year, months 1-6

                            if (isFinancialYearData) {
                                const actualYear = month >= 7 ? numericYear - 1 : numericYear
                                monthlyData.push({
                                    month: month,
                                    year: actualYear,
                                    metric: value
                                })
                            }
                        }
                    })
                    .on('end', () => {
                        if (monthlyData.length === 0) {
                            reject({ status: 404, error: `No tithing data available for corps ${centreId} in year ${numericYear}` })
                            return
                        }
                        
                        // Sort by month
                        monthlyData.sort((a, b) => a.month - b.month)
                        resolve(monthlyData)
                    })
                    .on('error', (err) => {
                        console.error(`Error reading CSV file: ${err.message}`)
                        reject({ status: 500, error: 'Failed to read CSV file', details: err.message })
                    })
            } catch (err) {
                console.error(`An unexpected error occurred: ${err.message}`)
                reject({ status: 500, error: 'An unexpected server error occurred.' })
            }
        })
    }
}
