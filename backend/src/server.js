import { createApp, createInsights } from './app.js'

/**
 * Main server entry point
 */
async function startServer() {
    try {
        // Load every source once before accepting traffic
        const insights = await createInsights(process.env.DATA_FOLDER)

        // Create Express app
        const app = createApp(insights, process.env.STATIC_FOLDER)

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
