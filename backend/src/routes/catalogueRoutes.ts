import express from 'express'
import type { CorpsInsights } from '../services/CorpsInsights.ts'

/**
 * Create catalogue routes with dependency injection for services
 * @param insights - The combined corps insights
 * @returns Express router with catalogue routes
 */
export function createCatalogueRoutes(insights: CorpsInsights): express.Router {
    const router = express.Router()

    // Get every metric and the years with data
    router.get('/', (req, res) => {
        res.json(insights.catalogue())
    })

    return router
}
