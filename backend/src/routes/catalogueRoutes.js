import express from 'express'

/**
 * @typedef {import('../services/CorpsInsights.js').CorpsInsights} CorpsInsights
 */

/**
 * Create catalogue routes with dependency injection for services
 * @param {CorpsInsights} insights - The combined corps insights
 * @returns {express.Router} Express router with catalogue routes
 */
export function createCatalogueRoutes(insights) {
    const router = express.Router()

    // Get every metric and the years with data
    router.get('/', (req, res) => {
        res.json(insights.catalogue())
    })

    return router
}
