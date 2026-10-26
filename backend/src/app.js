import express from 'express'
import dotenv from 'dotenv'
import { SamisCsvMissionRepository } from './repositories/mission/SamisCsvMissionRepository.js'
import { TechOneCsvFinanceRepository } from './repositories/finance/TechOneCsvFinanceRepository.js'
import { AddressListCsvDirectoryRepository } from './repositories/directory/AddressListCsvDirectoryRepository.js'
import { CorpsInsights } from './services/CorpsInsights.js'
import { InvalidQueryError } from './services/InvalidQueryError.js'
import { NotFoundError } from './services/NotFoundError.js'
import { createCatalogueRoutes } from './routes/catalogueRoutes.js'
import { createCorpsRoutes } from './routes/corpsRoutes.js'
import { createSnapshotRoutes } from './routes/snapshotRoutes.js'

// Load environment variables
dotenv.config()

/** @type {express.ErrorRequestHandler} */
const handleError = (err, req, res, _next) => {
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

/**
 * Create and configure the Express application
 * @param {CorpsInsights} insights - The combined corps insights
 * @param {string} [staticFolder] - Folder holding the built frontend, served for every non-API path
 * @returns {express.Application} Configured Express app
 */
export function createApp(insights, staticFolder) {
    const app = express()

    // Middleware
    app.use(express.json())

    // Routes
    app.use('/api/catalogue', createCatalogueRoutes(insights))
    app.use('/api/corps', createCorpsRoutes(insights))
    app.use('/api/snapshots', createSnapshotRoutes(insights))

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({ status: 'OK', timestamp: new Date().toISOString() })
    })

    // Frontend, falling back to index.html for client-side routes
    if (staticFolder) {
        app.use(express.static(staticFolder))
        app.get('/{*path}', (req, res) => {
            res.sendFile('index.html', { root: staticFolder })
        })
    }

    // Error handling middleware
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
        SamisCsvMissionRepository.load(dataFolder),
        TechOneCsvFinanceRepository.load(dataFolder),
        AddressListCsvDirectoryRepository.load(dataFolder)
    ])
    return new CorpsInsights(mission, finance, directory)
}
