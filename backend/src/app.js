import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { SamisCsvMissionStore } from './stores/SamisCsvMissionStore.js'
import { TechOneCsvFinanceStore } from './stores/TechOneCsvFinanceStore.js'
import { AddressListCsvDirectory } from './stores/AddressListCsvDirectory.js'
import { CorpsInsights } from './services/CorpsInsights.js'
import { InvalidQueryError } from './services/InvalidQueryError.js'
import { NotFoundError } from './services/NotFoundError.js'
import { createCatalogueRoutes } from './routes/catalogueRoutes.js'
import { createCorpsRoutes } from './routes/corpsRoutes.js'
import { createSnapshotRoutes } from './routes/snapshotRoutes.js'

// Load environment variables
dotenv.config()

/**
 * Create and configure the Express application
 * @param {CorpsInsights} insights - The combined corps insights
 * @returns {express.Application} Configured Express app
 */
export function createApp(insights) {
    const app = express()

    // Middleware
    app.use(express.json())
    app.use(cors())

    // Routes
    app.use('/api/catalogue', createCatalogueRoutes(insights))
    app.use('/api/corps', createCorpsRoutes(insights))
    app.use('/api/snapshots', createSnapshotRoutes(insights))

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({ status: 'OK', timestamp: new Date().toISOString() })
    })

    // Error handling middleware
    /** @type {express.ErrorRequestHandler} */
    const handleError = (err, req, res, next) => {
        if (err instanceof InvalidQueryError) {
            res.status(400).json({ error: err.message })
            return
        }
        if (err instanceof NotFoundError) {
            res.status(404).json({ error: err.message })
            return
        }
        console.error('Unhandled error:', err)
        res.status(500).json({
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
        })
    }
    app.use(handleError)

    return app
}

/**
 * Load every source once from the data folder and combine them
 * @param {string | undefined} dataFolder - Folder holding the source CSV exports
 * @returns {Promise<CorpsInsights>} Rejects naming any source that cannot be read
 */
export async function createInsights(dataFolder) {
    if (!dataFolder) {
        throw new Error('DATA_FOLDER environment variable is required')
    }
    const [mission, finance, directory] = await Promise.all([
        SamisCsvMissionStore.load(dataFolder),
        TechOneCsvFinanceStore.load(dataFolder),
        AddressListCsvDirectory.load(dataFolder)
    ])
    return new CorpsInsights(mission, finance, directory)
}
