import fs from 'fs'
import csv from 'csv-parser'
import path from 'path'
import parse from 'date-fns/parse'
import { updateCurrentCorps } from '../utils/calculations.js'

/**
 * Service class for handling data operations
 */
export class DataService {
    constructor(dataFolder) {
        this.dataFolder = dataFolder
        this.growthDataCache = new Map()
        this.tithingDataCache = new Map()
        this.surplusDeficitDataCache = new Map()
        this.sustainabilityDataCache = new Map()
        this.monthlyGrowthMetricsCache = new Map()
        this.centreIdToLocation = new Map()
        this.corpsDataCache = new Map()
    }

    /**
     * Initialize all data caches
     */
    async initializeProcessing() {
        console.log('Starting server data initialization...')
        
        // Populate corps data cache first
        try {
            await this.getCorpsData()
        } catch (error) {
            console.error('Error populating corps data cache:', error)
            // Continue with other initialization even if corps data fails
        }
        
        const MIN_YEAR_SAMIS = 2001
        const MIN_YEAR_TECHONE = 2008
        
        for (let year = MIN_YEAR_SAMIS; year <= 2025; year++) {
            try {            
                // Run the five data processing functions in order
                const growthData = await this.getGrowthData(year)
                const monthlyGrowthMetricData = await this.getMonthlyGrowthMetricData(year)
                this.growthDataCache.set(year, growthData)
                this.monthlyGrowthMetricsCache.set(year, monthlyGrowthMetricData)
                
                if (year >= MIN_YEAR_TECHONE) {
                    const tithingData = await this.getTithingData(year)
                    const surplusDeficitData = await this.getSurplusDeficitData(year)
                    this.tithingDataCache.set(year, tithingData)
                    this.surplusDeficitDataCache.set(year, surplusDeficitData)
                    
                    tithingData.forEach(item => {
                        if (!this.centreIdToLocation.has(item.id)) {
                            this.centreIdToLocation.set(item.id, item.location)
                        }
                    })
                    
                    if (year >= MIN_YEAR_TECHONE + 1) {
                        const sustainabilityData = await this.getSustainabilityData(year)
                        this.sustainabilityDataCache.set(year, sustainabilityData)
                    }
                }
            } catch (error) {
                console.error(`Error processing data for year ${year}:`, error)
                // Continue with other years even if one fails
            }
        }
        
        console.log('Server data initialization complete!')
    }

    /**
     * Get corps data from CSV file
     */
    async getCorpsData() {
        return new Promise((resolve, reject) => {
            const fileName = 'Corps address list.csv'
            const filePath = path.join(this.dataFolder, fileName)

            if (!fs.existsSync(filePath)) {
                reject({ status: 404, error: `No data file found: ${fileName}` })
                return
            }

            try {
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (data) => {
                        const lat = parseFloat(data.latitude)
                        const lng = parseFloat(data.longitude)
                        
                        this.corpsDataCache.set(data.code, {
                            id: data.code,
                            name: data.name,
                            area: data.division_name,
                            address: data.address1,
                            closingDate: parse(data.centre_close_date, 'dd/MM/yyyy', new Date()) || null,
                            city: data.city,
                            lat: lat,
                            lng: lng,
                            population: [
                                {
                                    year: 2013,
                                    value: parseInt(data['2013 Population']) || 0
                                },
                                {
                                    year: 2024,
                                    value: parseInt(data['2024 Estimate']) || 0
                                },
                                {
                                    year: 2050,
                                    value: parseInt(data['2050 Projection']) || 0
                                }
                            ]
                        })
                    })
                    .on('end', () => {
                        resolve()
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

    /**
     * Get growth data for a specific year
     */
    async getGrowthData(year) {
        return new Promise((resolve, reject) => {
            const expectedEndYear = `${year - 1}/${String(year).slice(-2)}`
            const prevEndYear = `${year - 2}/${String(year - 1).slice(-2)}`
            const fileName = 'Territory_Indicators_Yr2000_2025.csv'
            const filePath = path.join(this.dataFolder, fileName)
            const results = []

            if (!fs.existsSync(filePath)) {
                reject({ status: 404, error: `No data file found for year ${year}` })
                return
            }

            let current = {}

            try {
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (data) => {
                        if (current.id === data.centre_code) {
                            if (data.end_year === prevEndYear) {
                                current.metrics = updateCurrentCorps(current.metrics, data.indicator, parseFloat(data.averages), 'prevYear')
                            } else if (data.end_year === expectedEndYear) {
                                current.metrics = updateCurrentCorps(current.metrics, data.indicator, parseFloat(data.averages), 'currentYear')
                            }
                        } else {
                            results.push(current)
                            current = {
                                id: data.centre_code,
                                name: data.centre_name,
                                metrics: {
                                    congregationalWorship: {
                                        currentYear: null,
                                        prevYear: null
                                    },
                                    firstTimeDecisions: {
                                        currentYear: 0,
                                        prevYear: 0
                                    },
                                    kidsChurch: {
                                        currentYear: null,
                                        prevYear: null
                                    },
                                    youthDiscipleship: {
                                        currentYear: null,
                                        prevYear: null
                                    }
                                }
                            }
                            if (data.end_year === prevEndYear) {
                                current.metrics = updateCurrentCorps(current.metrics, data.indicator, parseFloat(data.averages), 'prevYear')
                            } else if (data.end_year === expectedEndYear) {
                                current.metrics = updateCurrentCorps(current.metrics, data.indicator, parseFloat(data.averages), 'currentYear')
                            }
                        }
                    })
                    .on('end', () => {
                        const newResults = results.slice(1)
                        if (newResults.length === 0) {
                            reject({ status: 404, error: `No metrics available for year ${year}` })
                            return
                        }
                        resolve(newResults)
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

    /**
     * Get surplus/deficit data for a specific year
     */
    async getSurplusDeficitData(year) {
        return new Promise((resolve, reject) => {
            // Convert year to the format used in CSV (e.g., 2025 -> 25GLA)
            const yearColumn = `${String(year).slice(-2)}GLA`
            const fileName = 'Surplus-Deficit Summary.csv'
            const filePath = path.join(this.dataFolder, fileName)
            const results = []

            if (!fs.existsSync(filePath)) {
                reject({ status: 404, error: `No surplus/deficit data file found for year ${year}` })
                return
            }

            try {
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (data) => {
                        // Check if the year column exists and has data
                        if (data[yearColumn] !== undefined && data[yearColumn] !== '') {
                            results.push({
                                location: data["﻿Location"],
                                locationDescription: data['Location Description'],
                                surplusDeficit: parseFloat(data[yearColumn]) || 0
                            })
                        }
                    })
                    .on('end', () => {
                        if (results.length === 0) {
                            reject({ status: 404, error: `No surplus/deficit data available for year ${year}` })
                            return
                        }
                        resolve(results)
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

    /**
     * Get tithing data for a specific year
     */
    async getTithingData(year) {
        return new Promise((resolve, reject) => {
            const fileName = 'Territorial_Tithing_2000_2025.csv'
            const filePath = path.join(this.dataFolder, fileName)
            const results = new Map() // Use Map to aggregate data by code

            if (!fs.existsSync(filePath)) {
                reject({ status: 404, error: `No tithing data file found.` })
                return
            }

            try {
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (data) => {
                        const mPeriod = data.M_period
                        const currentYearSuffix = String(year).slice(-2)
                        const prevYearSuffix = String(year - 1).slice(-2)

                        const code = data.code
                        const name = data.name
                        const location = data["﻿location"]
                        const value = parseFloat(data.mth_value) || 0

                        // Financial year logic: July to June of the following year
                        // For financial year 2025: July 2024 (M2407) to June 2025 (M2506)
                        // M_period format: M{year}{month} (e.g., M2407 for July 2024)
                        
                        // Extract year and month from M_period
                        const periodYear = mPeriod.substring(1, 3) // Extract year part (e.g., "24" from "M2407")
                        const month = parseInt(mPeriod.substring(3, 5)) // Extract month part (e.g., 7 from "M2407")
                        
                        const isFinancialYearData = 
                            (periodYear === prevYearSuffix && month >= 7) || // Previous year, months 7-12
                            (periodYear === currentYearSuffix && month <= 6)  // Current year, months 1-6

                        if (isFinancialYearData) {
                            if (results.has(code)) {
                                // Add to existing current year total
                                results.get(code).tithing += value
                            } else {
                                // Create new entry with current year data
                                results.set(code, {
                                    id: code,
                                    name: name,
                                    location: location,
                                    tithing: value
                                })
                            }
                        }
                    })
                    .on('end', () => {
                        const finalResults = Array.from(results.values())
                        if (finalResults.length === 0) {
                            reject({ status: 404, error: `No tithing data available for year ${year}` })
                            return
                        }
                        resolve(finalResults)
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

    /**
     * Get combined tithing and surplus/deficit data for a specific year
     */
    async getSustainabilityData(year) {
        return new Promise((resolve, reject) => {
            // Get both current year and previous year tithing data, plus surplus/deficit data
            Promise.all([
                this.getTithingData(year),
                this.getTithingData(year - 1),
                this.getSurplusDeficitData(year)
            ])
            .then(([currentYearTithingData, prevYearTithingData, surplusDeficitData]) => {
                // Create maps for efficient lookup
                const surplusDeficitMap = new Map()
                surplusDeficitData.forEach(item => {
                    surplusDeficitMap.set(item.location, item.surplusDeficit)
                })

                const prevYearTithingMap = new Map()
                prevYearTithingData.forEach(item => {
                    prevYearTithingMap.set(item.id, item.tithing)
                })

                // Combine the data by matching on location
                const combinedResults = []
                currentYearTithingData.forEach(tithingItem => {
                    const surplusDeficit = surplusDeficitMap.get(tithingItem.location)
                    const prevYearTithing = prevYearTithingMap.get(tithingItem.id) || 0
                    
                    if (surplusDeficit !== undefined) {
                        combinedResults.push({
                            id: tithingItem.id,
                            location: tithingItem.location,
                            name: tithingItem.name,
                            metrics: {
                                tithing: {
                                    currentYear: tithingItem.tithing,
                                    prevYear: prevYearTithing
                                },
                                surplusDeficit: surplusDeficit
                            }
                        })
                    }
                })

                if (combinedResults.length === 0) {
                    reject({ status: 404, error: `No combined data available for year ${year}` })
                    return
                }

                resolve(combinedResults)
            })
            .catch(err => {
                // If either promise rejects, pass the error along
                reject(err)
            })
        })
    }

    /**
     * Get monthly growth metrics data for a specific year
     */
    async getMonthlyGrowthMetricData(year) {
        return new Promise((resolve, reject) => {
            const numericYear = parseInt(year, 10)
            const expectedEndYear = `${numericYear - 1}/${String(numericYear).slice(-2)}`
            const fileName = 'Territory_Indicators_Mth2000_2025.csv'
            const filePath = path.join(this.dataFolder, fileName)
            
            if (!fs.existsSync(filePath)) {
                reject({ status: 404, error: `No monthly data file found for year ${numericYear}` })
                return
            }

            const yearCache = new Map() // Map<corpsId, Map<metric, monthlyData[]>>
            
            const toMonthNumber = (periodCode) => {
                if (!/^M\d{4}$/.test(periodCode)) {
                    return -1
                }
                const monthPart = periodCode.slice(-2)
                const month = parseInt(monthPart, 10)
                if (month < 1 || month > 12) {
                    return -1
                }
                return month
            }

            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => {
                    if (data.end_year === expectedEndYear) {
                        const centreId = data.centre_code
                        const indicator = data.indicator
                        const period = toMonthNumber(data.period_code)
                        
                        if (period >= 0) {
                            const actualYear = period >= 7 ? numericYear - 1 : numericYear
                            
                            if (!yearCache.has(centreId)) {
                                yearCache.set(centreId, new Map())
                            }
                            
                            const corpsCache = yearCache.get(centreId)
                            if (!corpsCache.has(indicator)) {
                                corpsCache.set(indicator, [])
                            }
                            
                            corpsCache.get(indicator).push({
                                month: period,
                                year: actualYear,
                                metric: parseFloat(data.averages)
                            })
                        }
                    }
                })
                .on('end', () => {
                    if (yearCache.size === 0) {
                        reject({ status: 404, error: `No monthly data available for year ${numericYear}` })
                        return
                    }
                    resolve(yearCache)
                })
                .on('error', (err) => {
                    console.error(`Error reading monthly CSV file: ${err.message}`)
                    reject({ status: 500, error: 'Failed to read CSV file', details: err.message })
                })
        })
    }

    // Getter methods for cached data
    getGrowthDataCache() { return this.growthDataCache }
    getTithingDataCache() { return this.tithingDataCache }
    getSurplusDeficitDataCache() { return this.surplusDeficitDataCache }
    getSustainabilityDataCache() { return this.sustainabilityDataCache }
    getMonthlyGrowthMetricsCache() { return this.monthlyGrowthMetricsCache }
    getCentreIdToLocation() { return this.centreIdToLocation }
    getCorpsDataCache() { return this.corpsDataCache }
}
