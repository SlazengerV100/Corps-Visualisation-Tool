import express from 'express'
import { InvalidQueryError } from '../services/InvalidQueryError.ts'
import { parseYear } from './parseYear.ts'
import type { CorpsInsights } from '../services/CorpsInsights.ts'

/**
 * Create corps routes with dependency injection for services
 * @param insights - The combined corps insights
 * @returns Express router with corps routes
 */
export function createCorpsRoutes(insights: CorpsInsights): express.Router {
    const router = express.Router()

    // Get all corps with valid coordinates
    router.get('/', (req, res) => {
        res.json(insights.corps())
    })

    // Get a metric for a corps by year or by month, optionally for one financial year
    router.get('/:centreId/series/:metric', (req, res) => {
        const { granularity = 'year' } = req.query
        if (granularity !== 'year' && granularity !== 'month') {
            throw new InvalidQueryError(`Invalid granularity ${JSON.stringify(granularity)}`)
        }
        res.json(insights.series(req.params.centreId, req.params.metric, { granularity, year: parseYear(req.query.year) }))
    })

    return router
}
