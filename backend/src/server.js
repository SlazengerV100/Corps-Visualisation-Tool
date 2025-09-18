import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import fs from 'fs'
import csv from 'csv-parser'
import path from 'path'
import parse from 'date-fns/parse'

dotenv.config()

const app = express()
app.use(express.json())
app.use(cors())

const MIN_YEAR_SAMIS = 2001
const MIN_YEAR_TECHONE = 2008
const PORT = process.env.PORT || 8080
const DATA_FOLDER = process.env.DATA_FOLDER

// In-memory data storage maps for each yeaR
const growthDataCache = new Map()
const tithingDataCache = new Map()
const surplusDeficitDataCache = new Map()
const sustainabilityDataCache = new Map()
const monthlyGrowthMetricsCache = new Map()
const centreIdToLocation = new Map()
const corpsDataCache = new Map()

// Initialize processing method
async function initializeProcessing() {
    console.log('Starting server data initialization...')
    
    // Populate corps data cache first
    try {
        await getCorpsData()
    } catch (error) {
        console.error('Error populating corps data cache:', error)
        // Continue with other initialization even if corps data fails
    }
    
    for (let year = MIN_YEAR_SAMIS; year <= 2025; year++) {
        try {            
            // Run the five data processing functions in order
            const growthData = await getGrowthData(year)
            const monthlyGrowthMetricData = await getMonthlyGrowthMetricData(year)
            growthDataCache.set(year, growthData)
            monthlyGrowthMetricsCache.set(year, monthlyGrowthMetricData)
            if (year >= MIN_YEAR_TECHONE) {
                const tithingData = await getTithingData(year)
                const surplusDeficitData = await getSurplusDeficitData(year)
                tithingDataCache.set(year, tithingData)
                surplusDeficitDataCache.set(year, surplusDeficitData)
                
                tithingData.forEach(item => {
                    if (!centreIdToLocation.has(item.id)) {
                        centreIdToLocation.set(item.id, item.location)
                    }
                })
                
                if (year >= MIN_YEAR_TECHONE + 1) {
                    const sustainabilityData = await getSustainabilityData(year)
                    sustainabilityDataCache.set(year, sustainabilityData)
                }
            }
        } catch (error) {
            console.error(`Error processing data for year ${year}:`, error)
            // Continue with other years even if one fails
        }
    }
    
    console.log('Server data initialization complete!')
}

const server = app.listen(PORT, async () => {
    await initializeProcessing()
    console.log(`Server running on http://localhost:${PORT}`)
})

server.on('error', (error) => {
    console.error('Server error:', error)
})

function updateCurrentCorps(metrics, metricName, value, yearType) {
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

// Helper function to populate corps data cache
async function getCorpsData() {
    return new Promise((resolve, reject) => {
        const fileName = 'Corps address list.csv'
        const filePath = path.join(DATA_FOLDER, fileName)

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
                    
                    corpsDataCache.set(data.code, {
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

// Helper function to get all metric data for a specific corps and year
function getGrowthData(year) {
    return new Promise((resolve, reject) => {
        const expectedEndYear = `${year - 1}/${String(year).slice(-2)}`
        const prevEndYear = `${year - 2}/${String(year - 1).slice(-2)}`
        const fileName = 'Territory_Indicators_Yr2000_2025.csv'
        const filePath = path.join(DATA_FOLDER, fileName)
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

// Helper function to get surplus/deficit data for a specific year
function getSurplusDeficitData(year) {
    return new Promise((resolve, reject) => {
        // Convert year to the format used in CSV (e.g., 2025 -> 25GLA)
        const yearColumn = `${String(year).slice(-2)}GLA`
        const fileName = 'Surplus-Deficit Summary.csv'
        const filePath = path.join(DATA_FOLDER, fileName)
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

// Helper function to get tithing data for a specific year (current year only)
function getTithingData(year) {
    return new Promise((resolve, reject) => {
        const fileName = 'Territorial_Tithing_2000_2025.csv'
        const filePath = path.join(DATA_FOLDER, fileName)
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

// Helper function to get combined tithing and surplus/deficit data for a specific year
function getSustainabilityData(year) {
    return new Promise((resolve, reject) => {
        // Get both current year and previous year tithing data, plus surplus/deficit data
        Promise.all([
            getTithingData(year),
            getTithingData(year - 1),
            getSurplusDeficitData(year)
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


// Get monthly growth metrics data for a specific year
function getMonthlyGrowthMetricData(year) {
    return new Promise((resolve, reject) => {
        const numericYear = parseInt(year, 10)
        const expectedEndYear = `${numericYear - 1}/${String(numericYear).slice(-2)}`
        const fileName = 'Territory_Indicators_Mth2000_2025.csv'
        const filePath = path.join(DATA_FOLDER, fileName)
        
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

// Helper function to get monthly metric data for a specific corps and year (using cache)
function getGrowthMetricDataByMonth(centreId, year, metric) {
    return new Promise((resolve, reject) => {
        const numericYear = parseInt(year, 10)
        const yearCache = monthlyGrowthMetricsCache.get(numericYear)
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

// Helper function to get growth metric data by year for a specific corps and metric (using cache)
function getGrowthMetricDataByYear(centreId, metric) {
    return new Promise((resolve, reject) => {
        const yearlyData = []
        
        // Iterate through all years in the cache
        for (const [year, yearCache] of monthlyGrowthMetricsCache) {
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

// Helper function to get first time decisions data by year for a specific corps (using cache)
function getFirstTimeDecisionsDataByYear(centreId) {
    return new Promise((resolve, reject) => {
        const yearlyData = []
        
        // Iterate through all years in the cache
        for (const [year, yearData] of growthDataCache) {
            const corpsData = yearData.find(item => item.id === centreId)
            if (corpsData && corpsData.metrics.congregationalWorship.currentYear > 0) {
                yearlyData.push({
                    year: year,
                    metric: corpsData.metrics.firstTimeDecisions.currentYear
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

// Helper function to get tithing data by year for a specific corps (using cache)
function getTithingDataByYear(centreId) {
    return new Promise((resolve, reject) => {
        const yearlyData = []
        
        // Iterate through all years in the cache
        for (const [year, yearData] of tithingDataCache) {
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

// Helper function to get surplus/deficit data by year for a specific corps (using cache)
function getSurplusDeficitDataByYear(location) {
    return new Promise((resolve, reject) => {
        const yearlyData = []
        
        // Iterate through all years in the cache
        for (const [year, yearData] of surplusDeficitDataCache) {
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

// Helper function to get tithing data by month for a specific corps and year
function getTithingDataByMonth(centreId, year) {
    return new Promise((resolve, reject) => {
        const numericYear = parseInt(year, 10)
        const currentYearSuffix = String(numericYear).slice(-2)
        const prevYearSuffix = String(numericYear - 1).slice(-2)
        const fileName = 'Territorial_Tithing_2000_2025.csv'
        const filePath = path.join(DATA_FOLDER, fileName)
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

const maxBand = 70, minBand = 30, minCongregation = 25, maxCongregation = 200, benchmark = 0.1, maxPointsChange = 15, minTithingPerPerson = 500, maxTithingPerPerson = 2000

function getGrowthBand(congregationalWorship) {
    const difference = maxBand - minBand
    if (congregationalWorship <= minCongregation) return minBand
    if (congregationalWorship > maxCongregation) return maxBand
    const value = (congregationalWorship - minCongregation) / (maxCongregation - minCongregation)
    return minBand + difference * value
}

function getSustainabilityBand(tithingPerPerson) {
    const difference = maxBand - minBand
    if (tithingPerPerson <= minTithingPerPerson) return minBand
    if (tithingPerPerson > maxTithingPerPerson) return maxBand
    const value = (tithingPerPerson - minTithingPerPerson) / (maxTithingPerPerson - minTithingPerPerson)
    return minBand + difference * value
}

function calculateNominalChange(prevYear, currentYear) {
    const nominalChange = currentYear - prevYear
    const maxSize = maxCongregation * benchmark
    const value = nominalChange / maxSize * maxPointsChange
    if (value > maxPointsChange) return maxPointsChange
    if (value < -maxPointsChange) return -maxPointsChange 
    return value
}

function calculateNominalSustainability(prevYear, currentYear) {
    const nominalChange = currentYear - prevYear
    const maxSize = maxCongregation * maxTithingPerPerson * benchmark
    const value = nominalChange / maxSize * maxPointsChange
    if (value > maxPointsChange) return maxPointsChange
    if (value < -maxPointsChange) return -maxPointsChange 
    return value
}

function calculatePercentageChange(prevYear, currentYear) {
    return (currentYear - prevYear) / prevYear
}

function calculateGrowth(metrics) {
    let growth = getGrowthBand(metrics.congregationalWorship.currentYear)
    growth += calculateNominalChange(metrics.congregationalWorship.prevYear, metrics.congregationalWorship.currentYear)
    const percentage = calculatePercentageChange(metrics.congregationalWorship.prevYear, metrics.congregationalWorship.currentYear)
    if (percentage >= benchmark) {
        growth += maxPointsChange
    } else {
        growth = growth * (1 + percentage)
    }
    return Math.round(growth)
}

function calculateSustainability(metrics, size) {
    const tithingPerPersonCurrentYear = metrics.tithing.currentYear / size
    let sustainability = getSustainabilityBand(tithingPerPersonCurrentYear)
    sustainability += calculateNominalSustainability(metrics.tithing.prevYear, metrics.tithing.currentYear)
    return Math.round(sustainability)
}

app.get('/api/corps', (req, res) => {
    // Convert corps data cache to array and filter for valid coordinates
    const results = Array.from(corpsDataCache.values()).filter(corps => {
        return !isNaN(corps.lat) && !isNaN(corps.lng)
    })

    if (results.length === 0) {
        res.status(404).json({ error: 'No corps with valid coordinates found in the data' })
        return
    }

    res.json(results)
})

app.get('/api/corps/growth/:year', (req, res) => {
    const year = parseInt(req.params.year, 10)
    
    if (isNaN(year) || year < 2010 || year > 2025) {
        res.status(400).json({ error: 'Invalid year. Must be between 2010 and 2025.' })
        return
    }
    
    const cachedData = growthDataCache.get(year)
    if (!cachedData) {
        res.status(404).json({ error: `No growth data available for year ${year}` })
        return
    }
    
    res.json(cachedData)
})

app.get('/api/corps/sustainability/:year', (req, res) => {
    const year = parseInt(req.params.year, 10)
    
    if (isNaN(year) || year < 2010 || year > 2025) {
        res.status(400).json({ error: 'Invalid year. Must be between 2010 and 2025.' })
        return
    }
    
    const cachedData = sustainabilityDataCache.get(year)
    if (!cachedData) {
        res.status(404).json({ error: `No sustainability data available for year ${year}` })
        return
    }
    
    res.json(cachedData)
})

app.get('/api/corps/bubbleChart/:year', (req, res) => {
    const year = parseInt(req.params.year, 10)
    
    if (isNaN(year) || year < 2010 || year > 2025) {
        res.status(400).json({ error: 'Invalid year. Must be between 2010 and 2025.' })
        return
    }
    
    const growthData = growthDataCache.get(year)
    const sustainabilityData = sustainabilityDataCache.get(year)
    
    if (!growthData || !sustainabilityData) {
        res.status(404).json({ error: `No combined data available for year ${year}` })
        return
    }
    
    // Create a map of sustainability data by id for efficient lookup
    const sustainabilityMap = new Map()
    sustainabilityData.forEach(item => {
        sustainabilityMap.set(item.id, item)
    })

    // Combine the data by matching on id
    const combinedResults = []
    growthData.forEach(growthItem => {
        const sustainabilityItem = sustainabilityMap.get(growthItem.id)
        if (sustainabilityItem !== undefined && growthItem.metrics.congregationalWorship.currentYear > 0) {
            const size = growthItem.metrics.congregationalWorship.currentYear
            combinedResults.push({
                id: growthItem.id,
                name: growthItem.name,
                growth: calculateGrowth(growthItem.metrics),
                sustainability: calculateSustainability(sustainabilityItem.metrics, size),
                size: size
            })
        }
    })

    if (combinedResults.length === 0) {
        res.status(404).json({ error: `No combined data available for year ${year}` })
        return
    }

    res.json(combinedResults)
})

app.get('/api/corps/metrics/:year', (req, res) => {
    const year = parseInt(req.params.year, 10)
    
    if (isNaN(year) || year < MIN_YEAR_SAMIS || year > 2025) {
        res.status(400).json({ error: 'Invalid year. Must be between 2010 and 2025.' })
        return
    }
    
    const growthData = growthDataCache.get(year)
    const sustainabilityData = sustainabilityDataCache.get(year)
    
    if (!growthData && !sustainabilityData) {
        res.status(404).json({ error: `No metrics data available for year ${year}` })
        return
    }
    
    // Create a map of sustainability data by id for efficient lookup
    const sustainabilityMap = new Map()
    if (sustainabilityData) {
        sustainabilityData.forEach(item => {
            sustainabilityMap.set(item.id, item)
        })
    }

    // Combine the data by matching on id
    const combinedResults = []
    growthData.forEach(growthItem => {
        const sustainabilityItem = sustainabilityMap.get(growthItem.id)
        const populationData = corpsDataCache.get(growthItem.id)?.population || null
        let currentYearPopulation = null
        if (populationData && Array.isArray(populationData)) {
            const currentYearEntry = populationData.find(p => p.year === year)
            currentYearPopulation = currentYearEntry ? currentYearEntry.value : null
        }

        combinedResults.push({
            id: growthItem.id,
            name: growthItem.name,
            metrics: {
                congregationalWorship: growthItem.metrics.congregationalWorship,
                firstTimeDecisions: growthItem.metrics.firstTimeDecisions,
                kidsChurch: growthItem.metrics.kidsChurch,
                youthDiscipleship: growthItem.metrics.youthDiscipleship,
                tithing: sustainabilityItem?.metrics?.tithing || null,
                surplusDeficit: sustainabilityItem?.metrics?.surplusDeficit || null,
                population: currentYearPopulation
            }
        })
    })

    if (combinedResults.length === 0) {
        res.status(404).json({ error: `No combined metrics data available for year ${year}` })
        return
    }

    res.json(combinedResults)
})

app.get('/api/corps/:centreId/congregationalWorship/byMonth/:year', (req, res) => {
    const { centreId, year } = req.params
    
    getGrowthMetricDataByMonth(centreId, year, '01-Congregational Worship')
        .then(results => {
            res.json(results)
        })
        .catch(err => {
            res.status(err.status).json({ error: err.error, details: err.details })
        })
})

app.get('/api/corps/:centreId/kidsChurch/byMonth/:year', (req, res) => {
    const { centreId, year } = req.params
    
    getGrowthMetricDataByMonth(centreId, year, '04-Kids Church')
        .then(results => {
            res.json(results)
        })
        .catch(err => {
            res.status(err.status).json({ error: err.error, details: err.details })
        })
})

app.get('/api/corps/:centreId/youthDiscipleship/byMonth/:year', (req, res) => {
    const { centreId, year } = req.params
    
    getGrowthMetricDataByMonth(centreId, year, '05-Youth Discipleship')
        .then(results => {
            res.json(results)
        })
        .catch(err => {
            res.status(err.status).json({ error: err.error, details: err.details })
        })
})

app.get('/api/corps/:centreId/tithing/byMonth/:year', (req, res) => {
    const { centreId, year } = req.params
    
    getTithingDataByMonth(centreId, year)
        .then(results => {
            res.json(results)
        })
        .catch(err => {
            res.status(err.status).json({ error: err.error, details: err.details })
        })
})

app.get('/api/corps/:centreId/congregationalWorship/byYear', (req, res) => {
    const { centreId } = req.params
    
    getGrowthMetricDataByYear(centreId, '01-Congregational Worship')
        .then(results => {
            res.json(results)
        })
        .catch(err => {
            res.status(err.status).json({ error: err.error, details: err.details })
        })
})

app.get('/api/corps/:centreId/firstTimeDecisions/byYear', (req, res) => {
    const { centreId } = req.params
    
    getFirstTimeDecisionsDataByYear(centreId)
        .then(results => {
            res.json(results)
        })
        .catch(err => {
            res.status(err.status).json({ error: err.error, details: err.details })
        })
})

app.get('/api/corps/:centreId/kidsChurch/byYear', (req, res) => {
    const { centreId } = req.params
    
    getGrowthMetricDataByYear(centreId, '04-Kids Church')
        .then(results => {
            res.json(results)
        })
        .catch(err => {
            res.status(err.status).json({ error: err.error, details: err.details })
        })
})

app.get('/api/corps/:centreId/youthDiscipleship/byYear', (req, res) => {
    const { centreId } = req.params
    
    getGrowthMetricDataByYear(centreId, '05-Youth Discipleship')
        .then(results => {
            res.json(results)
        })
        .catch(err => {
            res.status(err.status).json({ error: err.error, details: err.details })
        })
})

app.get('/api/corps/:centreId/tithing/byYear', (req, res) => {
    const { centreId } = req.params
    
    getTithingDataByYear(centreId)
        .then(results => {
            res.json(results)
        })
        .catch(err => {
            res.status(err.status).json({ error: err.error, details: err.details })
        })
})

app.get('/api/corps/:centreId/surplusDeficit/byYear', (req, res) => {
    const { centreId } = req.params
    const location = centreIdToLocation.get(centreId)
    
    if (!location) {
        res.status(404).json({ error: `No location mapping found for corps ${centreId}` })
        return
    }
    
    getSurplusDeficitDataByYear(location)
        .then(results => {
            res.json(results)
        })
        .catch(err => {
            res.status(err.status).json({ error: err.error, details: err.details })
        })
})
