import express from 'express'

/**
 * Create corps metric routes with dependency injection for services
 * @param {MetricService} metricService - The metric service instance
 * @returns {express.Router} Express router with corps metric routes
 */
export function createCorpsMetricRoutes(metricService) {
    const router = express.Router()

    // Get congregational worship data by month for a specific corps and year
    router.get('/:centreId/congregationalWorship/byMonth/:year', (req, res) => {
        const { centreId, year } = req.params
        
        metricService.getGrowthMetricDataByMonth(centreId, year, '01-Congregational Worship')
            .then(results => {
                res.json(results)
            })
            .catch(err => {
                res.status(err.status).json({ error: err.error, details: err.details })
            })
    })

    // Get kids church data by month for a specific corps and year
    router.get('/:centreId/kidsChurch/byMonth/:year', (req, res) => {
        const { centreId, year } = req.params
        
        metricService.getGrowthMetricDataByMonth(centreId, year, '04-Kids Church')
            .then(results => {
                res.json(results)
            })
            .catch(err => {
                res.status(err.status).json({ error: err.error, details: err.details })
            })
    })

    // Get youth discipleship data by month for a specific corps and year
    router.get('/:centreId/youthDiscipleship/byMonth/:year', (req, res) => {
        const { centreId, year } = req.params
        
        metricService.getGrowthMetricDataByMonth(centreId, year, '05-Youth Discipleship')
            .then(results => {
                res.json(results)
            })
            .catch(err => {
                res.status(err.status).json({ error: err.error, details: err.details })
            })
    })

    // Get tithing data by month for a specific corps and year
    router.get('/:centreId/tithing/byMonth/:year', (req, res) => {
        const { centreId, year } = req.params
        
        metricService.getTithingDataByMonth(centreId, year)
            .then(results => {
                res.json(results)
            })
            .catch(err => {
                res.status(err.status).json({ error: err.error, details: err.details })
            })
    })

    // Get congregational worship data by year for a specific corps
    router.get('/:centreId/congregationalWorship/byYear', (req, res) => {
        const { centreId } = req.params
        
        metricService.getGrowthMetricDataByYear(centreId, '01-Congregational Worship')
            .then(results => {
                res.json(results)
            })
            .catch(err => {
                res.status(err.status).json({ error: err.error, details: err.details })
            })
    })

    // Get first time decisions data by year for a specific corps
    router.get('/:centreId/firstTimeDecisions/byYear', (req, res) => {
        const { centreId } = req.params
        
        metricService.getFirstTimeDecisionsDataByYear(centreId)
            .then(results => {
                res.json(results)
            })
            .catch(err => {
                res.status(err.status).json({ error: err.error, details: err.details })
            })
    })

    // Get kids church data by year for a specific corps
    router.get('/:centreId/kidsChurch/byYear', (req, res) => {
        const { centreId } = req.params
        
        metricService.getGrowthMetricDataByYear(centreId, '04-Kids Church')
            .then(results => {
                res.json(results)
            })
            .catch(err => {
                res.status(err.status).json({ error: err.error, details: err.details })
            })
    })

    // Get youth discipleship data by year for a specific corps
    router.get('/:centreId/youthDiscipleship/byYear', (req, res) => {
        const { centreId } = req.params
        
        metricService.getGrowthMetricDataByYear(centreId, '05-Youth Discipleship')
            .then(results => {
                res.json(results)
            })
            .catch(err => {
                res.status(err.status).json({ error: err.error, details: err.details })
            })
    })

    // Get tithing data by year for a specific corps
    router.get('/:centreId/tithing/byYear', (req, res) => {
        const { centreId } = req.params
        
        metricService.getTithingDataByYear(centreId)
            .then(results => {
                res.json(results)
            })
            .catch(err => {
                res.status(err.status).json({ error: err.error, details: err.details })
            })
    })

    // Get surplus/deficit data by year for a specific corps
    router.get('/:centreId/surplusDeficit/byYear', (req, res) => {
        const { centreId } = req.params
        const location = metricService.getCentreIdToLocation().get(centreId)
        
        if (!location) {
            res.status(404).json({ error: `No location mapping found for corps ${centreId}` })
            return
        }
        
        metricService.getSurplusDeficitDataByYear(location)
            .then(results => {
                res.json(results)
            })
            .catch(err => {
                res.status(err.status).json({ error: err.error, details: err.details })
            })
    })

    return router
}
