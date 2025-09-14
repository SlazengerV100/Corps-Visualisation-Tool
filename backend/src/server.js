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

function updateCurrentCorps(current, metricName, value) {
    switch (metricName) {
        case '01-Congregational Worship':
            current.congregationalWorship = value
            break
        case '03A-First Time Decisions':
            current.firstTimeDecisions = value
            break
        case '04-Kids Church':
            current.kidsChurch = value
            break
        case '05-Youth Discipleship':
            current.youthDiscipleship = value
            break
    }
    return current
}

// Helper function to get all metric data for a specific corps and year
function getMetricData(year) {
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
                            current.metrics.prevYear = updateCurrentCorps(current.metrics.prevYear, data.indicator, parseFloat(data.averages))
                        } else if (data.end_year === expectedEndYear) {
                            current.metrics.currentYear = updateCurrentCorps(current.metrics.currentYear, data.indicator, parseFloat(data.averages))
                        }
                    } else {
                        results.push(current)
                        current = {
                            id: data.centre_id,
                            name: data.centre_name,
                            metrics: {
                                prevYear: {
                                    congregationalWorship: null,
                                    firstTimeDecisions: null,
                                    kidsChurch: null,
                                    youthDiscipleship: null
                                },
                                currentYear: {
                                    congregationalWorship: null,
                                    firstTimeDecisions: null,
                                    kidsChurch: null,
                                    youthDiscipleship: null
                                }
                            }
                        }
                        if (data.end_year === prevEndYear) {
                            current.metrics.prevYear = updateCurrentCorps(current.metrics.prevYear, data.indicator, parseFloat(data.averages))
                        } else if (data.end_year === expectedEndYear) {
                            current.metrics.currentYear = updateCurrentCorps(current.metrics.currentYear, data.indicator, parseFloat(data.averages))
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

function getBand(congregationalWorship) {
    if (congregationalWorship <= 50) return 30
    if (congregationalWorship <= 100) return 40
    if (congregationalWorship <= 150) return 50
    if (congregationalWorship <= 200) return 60
    
    // For values above 200, return 70
    return 70
}

function calculateGrowth(metrics) {
    let growth = getBand(metrics.congregationalWorship)
    return growth
}

app.get('/api/corps/growth/:year', (req, res) => {
    const year = req.params.year
    
    getMetricData(year)
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
