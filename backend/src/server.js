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

const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})

server.on('error', (error) => {
    console.error('Server error:', error)
})

// Not being used
app.get('/api/test/attendance', (req, res) => {
    const results = []

    fs.createReadStream(`${DATA_FOLDER}\\Territory_Corps_Indicators_Yr23_24.csv`)
        .pipe(csv())
        .on('data', (data) => {
            if (data.end_year === '2023/24' && data.indicator === '01-Main Worship') {
                results.push({
                    centre_name: data.centre_name,
                    attendance: parseFloat(data.averages)
                })
            }
        })
        .on('end', () => {
            res.json(results)
        })
        .on('error', (err) => {
            res.status(500).json({ error: 'Failed to read CSV file', details: err.message })
        })
})

app.get('/api/test/bubbleChart/:year', (req, res) => {
    const year = req.params.year
    const filePath = `${DATA_FOLDER}\\test\\TEST_Corps_${year}.json`

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            res.status(404).json({ error: `No data for ${year}` })
            return
        }
        try {
            const json = JSON.parse(data)
            res.json(json)
        } catch (parseErr) {
            res.status(500).json({ error: 'Invalid JSON format', details: parseErr.message })
        }
    })
})

app.get('/api/test/corps', (req, res) => {
    const filePath = `${DATA_FOLDER}\\test\\TEST_Corps.json`

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            res.status(404).json({ error: `No data` })
            return
        }
        try {
            const json = JSON.parse(data)
            res.json(json)
        } catch (parseErr) {
            res.status(500).json({ error: 'Invalid JSON format', details: parseErr.message })
        }
    })
})

app.get('/api/test/corps/:year', (req, res) => {
    const year = req.params.year
    const filePath = `${DATA_FOLDER}\\test\\TEST_Corps_${year}.json`

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            res.status(404).json({ error: `No data for ${year}` })
            return
        }
        try {
            const json = JSON.parse(data)

            // Extract only the name fields
            const names = json.map(entry => entry.name)
            res.json(names)
        } catch (parseErr) {
            res.status(500).json({ error: 'Invalid JSON format', details: parseErr.message })
        }
    })
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
                    if (current.id === data.centre_id) {
                        if (data.end_year === prevEndYear) {
                            current.metrics = updateCurrentCorps(current.metrics, data.indicator, parseFloat(data.averages), 'prevYear')
                        } else if (data.end_year === expectedEndYear) {
                            current.metrics = updateCurrentCorps(current.metrics, data.indicator, parseFloat(data.averages), 'currentYear')
                        }
                    } else {
                        results.push(current)
                        current = {
                            id: data.centre_id,
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

// Helper function to get tithing data for a specific year
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
                    const yearSuffix = String(numericYear).slice(-2)

                    if (mPeriod.startsWith(`M${yearSuffix}`)) {
                        const code = data.code
                        const name = data.name
                        const location = data["﻿location"]
                        const value = parseFloat(data.mth_value) || 0
                        
                        if (results.has(code)) {
                            // Add to existing total
                            results.get(code).tithing += value
                        } else {
                            // Create new entry
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

app.get('/api/corps/sustainability/:year', (req, res) => {
    const year = req.params.year
    
    getSurplusDeficitData(year)
        .then(results => {
            res.json(results)
        })
        .catch(err => {
            res.status(err.status).json({ error: err.error, details: err.details })
        })
})

app.get('/api/corps/tithing/:year', (req, res) => {
    const year = req.params.year
    
    getTithingData(year)
        .then(results => {
            res.json(results)
        })
        .catch(err => {
            res.status(err.status).json({ error: err.error, details: err.details })
        })
})

const maxBand = 70, minBand = 30, maxCongregation = 200, benchmark = 0.1, minCongregation = 25, maxPointsChange = 15

function getBand(congregationalWorship) {
    const difference = maxBand - minBand
    if (congregationalWorship <= minCongregation) return minBand
    if (congregationalWorship > maxCongregation) return maxBand
    const value = (congregationalWorship - minCongregation) / (maxCongregation - minCongregation)
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

function calculatePercentageChange(prevYear, currentYear) {
    return (currentYear - prevYear) / prevYear
}

function calculateGrowth(metrics) {
    let growth = getBand(metrics.congregationalWorship.currentYear)
    growth += calculateNominalChange(metrics.congregationalWorship.prevYear, metrics.congregationalWorship.currentYear)
    const percentage = calculatePercentageChange(metrics.congregationalWorship.prevYear, metrics.congregationalWorship.currentYear)
    if (percentage >= benchmark) {
        growth += maxPointsChange
    } else {
        growth = growth * (1 + percentage)
    }
    return Math.round(growth)
}

app.get('/api/corps/growth/:year', (req, res) => {
    const year = req.params.year
    
    getGrowthData(year)
        .then(results => {
            res.json(results.map(r => {
                return {
                    id: r.id,
                    name: r.name,
                    growth: calculateGrowth(r.metrics),
                    size: r.metrics.congregationalWorship.currentYear
                }
            }))
        })
        .catch(err => {
            res.status(err.status).json({ error: err.error, details: err.details })
        })
})

app.get('/api/surplus-deficit/:year', (req, res) => {
    const year = req.params.year
    
    getSurplusDeficitData(year)
        .then(results => {
            res.json(results)
        })
        .catch(err => {
            res.status(err.status).json({ error: err.error, details: err.details })
        })
})

// Helper function to get monthly metric data for a specific corps and year
function getMetricDataByMonth(centreId, year, indicator, metricName) {
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
                    if (data.end_year === expectedEndYear && data.indicator === indicator && parseInt(data.centre_id) === parseInt(centreId)) {
                        const period = toMonthNumber(data.period_code)
                        if (!(period < 0)) {
                            results.push({
                                month: period,
                                attendance: parseFloat(data.averages)
                            })
                        }
                    }
                })
                .on('end', () => {
                    if (results.length === 0) {
                        reject({ status: 404, error: `${metricName} metric is not available for corps ${centreId} in year ${numericYear}` })
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

app.get('/api/corps/:centreId/attendance/byMonth/:year', (req, res) => {
    const { centreId, year } = req.params
    
    getMetricDataByMonth(centreId, year, '01-Congregational Worship', 'Attendance')
        .then(results => {
            res.json(results)
        })
        .catch(err => {
            res.status(err.status).json({ error: err.error, details: err.details })
        })
})

app.get('/api/corps/:centreId/firstTimeDecisions/byMonth/:year', (req, res) => {
    const { centreId, year } = req.params
    
    getMetricDataByMonth(centreId, year, '03A-First Time Decisions', 'First Time Decisions')
        .then(results => {
            res.json(results)
        })
        .catch(err => {
            res.status(err.status).json({ error: err.error, details: err.details })
        })
})

app.get('/api/corps/:centreId/kidsChurch/byMonth/:year', (req, res) => {
    const { centreId, year } = req.params
    
    getMetricDataByMonth(centreId, year, '04-Kids Church', 'Kids Church')
        .then(results => {
            res.json(results)
        })
        .catch(err => {
            res.status(err.status).json({ error: err.error, details: err.details })
        })
})

app.get('/api/corps/:centreId/youthDiscipleship/byMonth/:year', (req, res) => {
    const { centreId, year } = req.params
    
    getMetricDataByMonth(centreId, year, '05-Youth Discipleship', 'Youth Discipleship')
        .then(results => {
            res.json(results)
        })
        .catch(err => {
            res.status(err.status).json({ error: err.error, details: err.details })
        })
})
