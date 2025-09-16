import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import fs from 'fs'
import csv from 'csv-parser'
import path from 'path'

dotenv.config()

const app = express()
app.use(express.json())
app.use(cors())

const PORT = process.env.PORT || 8080
const DATA_FOLDER = process.env.DATA_FOLDER

// In-memory data storage maps for each year (2010-2025)
const growthDataCache = new Map()
const tithingDataCache = new Map()
const surplusDeficitDataCache = new Map()
const sustainabilityDataCache = new Map()

// Initialize processing method
async function initializeProcessing() {
    console.log('Starting server data initialization...')
    
    for (let year = 2010; year <= 2025; year++) {
        try {
            console.log(`Processing data for year ${year}...`)
            
            // Run the four data processing functions in order
            const growthData = await getGrowthData(year.toString())
            const tithingData = await getTithingData(year.toString())
            const surplusDeficitData = await getSurplusDeficitData(year.toString())
            const sustainabilityData = await getSustainabilityData(year.toString())
            
            // Store results in maps
            growthDataCache.set(year, growthData)
            tithingDataCache.set(year, tithingData)
            surplusDeficitDataCache.set(year, surplusDeficitData)
            sustainabilityDataCache.set(year, sustainabilityData)
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

app.get('/api/corps', (req, res) => {
    const fileName = 'Corps address list.csv'
    const filePath = path.join(DATA_FOLDER, fileName)
    const results = []

    if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: `No data file found: ${fileName}` })
        return
    }

    try {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => {
                const lat = parseFloat(data.latitude)
                const lng = parseFloat(data.longitude)
                
                // Only include corps with valid coordinates
                if (!isNaN(lat) && !isNaN(lng)) {
                    results.push({
                        id: data.code,
                        name: data.name,
                        area: data.division_name,
                        address: data.address1,
                        city: data.city,
                        lat: lat,
                        lng: lng
                    })
                } else {
                    console.warn(`Invalid coordinates for corps ${data.name} (${data.code}): lat=${data.latitude}, lng=${data.longitude}`)
                }
            })
            .on('end', () => {
                if (results.length === 0) {
                    res.status(404).json({ error: 'No corps with valid coordinates found in the data' })
                    return
                }
                res.json(results)
            })
            .on('error', (err) => {
                console.error(`Error reading CSV file: ${err.message}`)
                res.status(500).json({ error: 'Failed to read CSV file', details: err.message })
            })
    } catch (err) {
        console.error(`An unexpected error occurred: ${err.message}`)
        res.status(500).json({ error: 'An unexpected server error occurred.' })
    }
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

// Helper function to get all metric data for a specific corps and year
function getGrowthData(year) {
    return new Promise((resolve, reject) => {
        const numericYear = parseInt(year, 10)
        if (isNaN(numericYear) || numericYear < 2000) {
            reject({ status: 400, error: 'Invalid year' })
            return
        }

        const expectedEndYear = `${numericYear - 1}/${String(numericYear).slice(-2)}`
        const prevEndYear = `${numericYear - 2}/${String(numericYear - 1).slice(-2)}`
        const fileName = 'Territory_Indicators_Yr2000_2025.csv'
        const filePath = path.join(DATA_FOLDER, fileName)
        const results = []

        if (!fs.existsSync(filePath)) {
            reject({ status: 404, error: `No data file found for year ${numericYear}` })
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
                                    currentYear: null,
                                    prevYear: null
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
                        reject({ status: 404, error: `No metrics available for year ${numericYear}` })
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
        const numericYear = parseInt(year, 10)
        if (isNaN(numericYear) || numericYear < 2000) {
            reject({ status: 400, error: 'Invalid year' })
            return
        }

        // Convert year to the format used in CSV (e.g., 2025 -> 25GLA)
        const yearColumn = `${String(numericYear).slice(-2)}GLA`
        const fileName = 'Surplus-Deficit Summary.csv'
        const filePath = path.join(DATA_FOLDER, fileName)
        const results = []

        if (!fs.existsSync(filePath)) {
            reject({ status: 404, error: `No surplus/deficit data file found for year ${numericYear}` })
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
                        reject({ status: 404, error: `No surplus/deficit data available for year ${numericYear}` })
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
        const numericYear = parseInt(year, 10)
        if (isNaN(numericYear) || numericYear < 2000) {
            reject({ status: 400, error: 'Invalid year' })
            return
        }

        const fileName = 'Territorial_Tithing_2000_2025.csv'
        const filePath = path.join(DATA_FOLDER, fileName)
        const results = new Map() // Use Map to aggregate data by code

        if (!fs.existsSync(filePath)) {
            reject({ status: 404, error: `No tithing data file found for year ${numericYear}` })
            return
        }

        try {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => {
                    const mPeriod = data.M_period
                    const currentYearSuffix = String(numericYear).slice(-2)
                    const prevYearSuffix = String(numericYear - 1).slice(-2)

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
                        reject({ status: 404, error: `No tithing data available for year ${numericYear}` })
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
        const numericYear = parseInt(year, 10)
        if (isNaN(numericYear) || numericYear < 2000) {
            reject({ status: 400, error: 'Invalid year' })
            return
        }

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
                reject({ status: 404, error: `No combined data available for year ${numericYear}` })
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

app.get('/api/corps/metrics/:year', (req, res) => {
    const year = parseInt(req.params.year, 10)
    
    if (isNaN(year) || year < 2010 || year > 2025) {
        res.status(400).json({ error: 'Invalid year. Must be between 2010 and 2025.' })
        return
    }
    
    const growthData = growthDataCache.get(year)
    const sustainabilityData = sustainabilityDataCache.get(year)
    
    if (!growthData || !sustainabilityData) {
        res.status(404).json({ error: `No metrics data available for year ${year}` })
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
        if (sustainabilityItem !== undefined) {
            const size = growthItem.metrics.congregationalWorship.currentYear
            combinedResults.push({
                id: growthItem.id,
                name: growthItem.name,
                growth: calculateGrowth(growthItem.metrics),
                sustainability: calculateSustainability(sustainabilityItem.metrics, size),
                size: size,
                metrics: {
                    congregationalWorship: growthItem.metrics.congregationalWorship,
                    firstTimeDecisions: growthItem.metrics.firstTimeDecisions,
                    kidsChurch: growthItem.metrics.kidsChurch,
                    youthDiscipleship: growthItem.metrics.youthDiscipleship,
                    tithing: sustainabilityItem.metrics.tithing,
                    surplusDeficit: sustainabilityItem.metrics.surplusDeficit
                }
            })
        }
    })

    if (combinedResults.length === 0) {
        res.status(404).json({ error: `No combined metrics data available for year ${year}` })
        return
    }

    res.json(combinedResults)
})

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
        if (sustainabilityItem !== undefined) {
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

// Helper function to get monthly metric data for a specific corps and year
function getMetricDataByMonth(centreId, year, metric) {
    return new Promise((resolve, reject) => {
        const numericYear = parseInt(year, 10)
        if (isNaN(numericYear) || numericYear < 2000) {
            reject({ status: 400, error: 'Invalid year' })
            return
        }

        const expectedEndYear = `${numericYear - 1}/${String(numericYear).slice(-2)}`
        const fileName = 'Territory_Indicators_Mth2000_2025.csv'
        const filePath = path.join(DATA_FOLDER, fileName)
        const results = []
        
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

        if (!fs.existsSync(filePath)) {
            reject({ status: 404, error: `No data file found for year ${numericYear}` })
            return
        }

        try {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => {
                    if (data.end_year === expectedEndYear && data.indicator === metric && parseInt(data.centre_code) === parseInt(centreId)) {
                        const period = toMonthNumber(data.period_code)
                        if (!(period < 0)) {
                            // Calculate the actual year based on financial year logic
                            // For financial year 2025 (July 2024 - June 2025):
                            // Months 7-12 are in the previous calendar year
                            // Months 1-6 are in the current calendar year
                            const actualYear = period >= 7 ? numericYear - 1 : numericYear
                            
                            results.push({
                                month: period,
                                year: actualYear,
                                metric: parseFloat(data.averages)
                            })
                        }
                    }
                })
                .on('end', () => {
                    if (results.length === 0) {
                        reject({ status: 404, error: `${metric} metric is not available for corps ${centreId} in year ${numericYear}` })
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

app.get('/api/corps/:centreId/congregationalWorship/byMonth/:year', (req, res) => {
    const { centreId, year } = req.params
    
    getMetricDataByMonth(centreId, year, '01-Congregational Worship')
        .then(results => {
            res.json(results)
        })
        .catch(err => {
            res.status(err.status).json({ error: err.error, details: err.details })
        })
})

app.get('/api/corps/:centreId/firstTimeDecisions/byMonth/:year', (req, res) => {
    const { centreId, year } = req.params
    
    getMetricDataByMonth(centreId, year, '03A-First Time Decisions')
        .then(results => {
            res.json(results)
        })
        .catch(err => {
            res.status(err.status).json({ error: err.error, details: err.details })
        })
})

app.get('/api/corps/:centreId/kidsChurch/byMonth/:year', (req, res) => {
    const { centreId, year } = req.params
    
    getMetricDataByMonth(centreId, year, '04-Kids Church')
        .then(results => {
            res.json(results)
        })
        .catch(err => {
            res.status(err.status).json({ error: err.error, details: err.details })
        })
})

app.get('/api/corps/:centreId/youthDiscipleship/byMonth/:year', (req, res) => {
    const { centreId, year } = req.params
    
    getMetricDataByMonth(centreId, year, '05-Youth Discipleship')
        .then(results => {
            res.json(results)
        })
        .catch(err => {
            res.status(err.status).json({ error: err.error, details: err.details })
        })
})
