import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import fs from 'fs'
import csv from 'csv-parser'

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

app.get('/api/attendance', (req, res) => {
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
});

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

app.get('/api/corps/:corpsId/attendance/byMonth/2024', (req, res) => {
    const id = parseInt(req.params.corpsId)
    const filePath = `${DATA_FOLDER}\\Territory_Corps_Indicators_Mths_23_24.csv`
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

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
            if (data.end_year === '2023/24' && data.indicator === '01-Main Worship' && parseInt(data.centre_id) === id) {
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
            res.json(results)
        })
        .on('error', (err) => {
            res.status(500).json({ error: 'Failed to read CSV file', details: err.message })
        })
})
