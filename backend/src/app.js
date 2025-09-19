import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { MetricService } from './services/MetricService.js'
import { createCorpsRoutes } from './routes/corpsRoutes.js'
import { createCorpsMetricRoutes } from './routes/corpsMetricRoutes.js'

// Load environment variables
dotenv.config()

/**
 * Create and configure the Express application
 * @param {MetricService} metricService - The metric service instance
 * @returns {express.Application} Configured Express app
 */
export function createApp(metricService) {
    const app = express()
    
    // Middleware
    app.use(express.json())
    app.use(cors())
    
    // Routes
    app.use('/api/corps', createCorpsRoutes(metricService))
    app.use('/api/corps', createCorpsMetricRoutes(metricService))
    
    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({ status: 'OK', timestamp: new Date().toISOString() })
    })
    
    // Error handling middleware
    app.use((err, req, res, next) => {
        console.error('Unhandled error:', err)
        res.status(500).json({ 
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
        })
    })
    
    return app
}

/**
 * Create the metric service instance
 * @returns {MetricService} Configured metric service
 */
export function createMetricService() {
    const dataFolder = process.env.DATA_FOLDER
    if (!dataFolder) {
        throw new Error('DATA_FOLDER environment variable is required')
    }
    return new MetricService(dataFolder)
}
