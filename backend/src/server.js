import { createApp, createMetricService } from './app.js'

/**
 * Main server entry point
 */
async function startServer() {
    try {
        // Create services
        const metricService = createMetricService()
        
        // Create Express app
        const app = createApp(metricService)
        
        // Initialize data processing
        await metricService.initializeProcessing()
        
        // Start server
        const PORT = process.env.PORT || 8080
        const server = app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`)
        })
        
        // Handle server errors
        server.on('error', (error) => {
            console.error('Server error:', error)
            process.exit(1)
        })
        
        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down gracefully')
            server.close(() => {
                console.log('Server closed')
                process.exit(0)
            })
        })
        
        process.on('SIGINT', () => {
            console.log('SIGINT received, shutting down gracefully')
            server.close(() => {
                console.log('Server closed')
                process.exit(0)
            })
        })
        
    } catch (error) {
        console.error('Failed to start server:', error)
        process.exit(1)
    }
}

startServer()
