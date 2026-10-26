import express from 'express'
import { InvalidQueryError } from '../services/InvalidQueryError.ts'
import { parseYear } from './parseYear.ts'
import type { CorpsInsights } from '../services/CorpsInsights.ts'

/**
 * Create snapshot routes with dependency injection for services
 * @param insights - The combined corps insights
 * @returns Express router with snapshot routes
 */
export function createSnapshotRoutes(insights: CorpsInsights): express.Router {
    const router = express.Router()

    // Get per-corps records, optionally for one year and only those with scores
    router.get('/', (req, res) => {
        const { scored } = req.query
        if (scored !== undefined && scored !== 'true' && scored !== 'false') {
            throw new InvalidQueryError(`Invalid scored ${JSON.stringify(scored)}`)
        }
        res.json(insights.snapshots({ year: parseYear(req.query.year), scored: scored === 'true' }))
    })

    return router
}
