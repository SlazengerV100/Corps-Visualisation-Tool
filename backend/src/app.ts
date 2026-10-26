import express from 'express'
import dotenv from 'dotenv'
import { SamisCsvMissionRepository } from './repositories/mission/SamisCsvMissionRepository.ts'
import { TechOneCsvFinanceRepository } from './repositories/finance/TechOneCsvFinanceRepository.ts'
import { AddressListCsvDirectoryRepository } from './repositories/directory/AddressListCsvDirectoryRepository.ts'
import { CorpsInsights } from './services/CorpsInsights.ts'
import { InvalidQueryError } from './services/InvalidQueryError.ts'
import { NotFoundError } from './services/NotFoundError.ts'
import { createCatalogueRoutes } from './routes/catalogueRoutes.ts'
import { createCorpsRoutes } from './routes/corpsRoutes.ts'
import { createSnapshotRoutes } from './routes/snapshotRoutes.ts'

// Load environment variables
dotenv.config()

const handleError: express.ErrorRequestHandler = (err, req, res, _next) => {
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
 * @param insights - The combined corps insights
 * @param staticFolder - Folder holding the built frontend, served for every non-API path
 * @returns Configured Express app
 */
export function createApp(insights: CorpsInsights, staticFolder?: string): express.Application {
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
 * @param dataFolder - Folder holding the source CSV exports
 * @returns Rejects naming any source that cannot be read
 */
export async function createInsights(dataFolder: string | undefined): Promise<CorpsInsights> {
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
