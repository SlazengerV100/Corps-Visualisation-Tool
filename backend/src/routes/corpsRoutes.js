import express from 'express'
import { calculateGrowth, calculateSustainability } from '../utils/calculations.js'

/**
 * Create corps routes with dependency injection for services
 * @param {MetricService} metricService - The metric service instance
 * @returns {express.Router} Express router with corps routes
 */
export function createCorpsRoutes(metricService) {
    const router = express.Router()

    // Get all corps data
    router.get('/', (req, res) => {
        // Convert corps data cache to array and filter for valid coordinates
        const results = Array.from(metricService.getCorpsDataCache().values()).filter(corps => {
            return !isNaN(corps.lat) && !isNaN(corps.lng)
        })

        if (results.length === 0) {
            res.status(404).json({ error: 'No corps with valid coordinates found in the data' })
            return
        }

        res.json(results)
    })

    // Get growth data for a specific year
    router.get('/growth/:year', (req, res) => {
        const year = parseInt(req.params.year, 10)
        
        if (isNaN(year) || year < 2010 || year > 2025) {
            res.status(400).json({ error: 'Invalid year. Must be between 2010 and 2025.' })
            return
        }
        
        const cachedData = metricService.getGrowthDataCache().get(year)
        if (!cachedData) {
            res.status(404).json({ error: `No growth data available for year ${year}` })
            return
        }
        
        res.json(cachedData)
    })

    // Get sustainability data for a specific year
    router.get('/sustainability/:year', (req, res) => {
        const year = parseInt(req.params.year, 10)
        
        if (isNaN(year) || year < 2010 || year > 2025) {
            res.status(400).json({ error: 'Invalid year. Must be between 2010 and 2025.' })
            return
        }
        
        const cachedData = metricService.getSustainabilityDataCache().get(year)
        if (!cachedData) {
            res.status(404).json({ error: `No sustainability data available for year ${year}` })
            return
        }
        
        res.json(cachedData)
    })

    // Get bubble chart data for a specific year
    router.get('/bubbleChart/:year', (req, res) => {
        const year = parseInt(req.params.year, 10)
        
        if (isNaN(year) || year < 2010 || year > 2025) {
            res.status(400).json({ error: 'Invalid year. Must be between 2010 and 2025.' })
            return
        }
        
        const growthData = metricService.getGrowthDataCache().get(year)
        const sustainabilityData = metricService.getSustainabilityDataCache().get(year)
        
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

    // Get metrics data for a specific year
    router.get('/metrics/:year', (req, res) => {
        const year = parseInt(req.params.year, 10)
        const MIN_YEAR_SAMIS = 2001
        
        if (isNaN(year) || year < MIN_YEAR_SAMIS || year > 2025) {
            res.status(400).json({ error: 'Invalid year. Must be between 2010 and 2025.' })
            return
        }
        
        const growthData = metricService.getGrowthDataCache().get(year)
        const sustainabilityData = metricService.getSustainabilityDataCache().get(year)
        
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
            const populationData = metricService.getCorpsDataCache().get(growthItem.id)?.population || null
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

    return router
}
