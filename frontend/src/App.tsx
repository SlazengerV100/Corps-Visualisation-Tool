import '@fontsource/fira-sans/300.css'
import '@fontsource/fira-sans/400.css'
import '@fontsource/fira-sans/700.css'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import { useEffect, useState } from 'react'
import AppBar from './components/common/AppBar.tsx'
import OverviewPage from './pages/OverviewPage.tsx'
import MapPage from './pages/MapPage.tsx'

const theme = createTheme({
    typography: {
        fontFamily: '"Fira Sans", sans-serif'
    }
})

const openingRegion = 'New Zealand'

function App() {
    const [region, setRegion] = useState(openingRegion)
    const [regions, setRegions] = useState<string[]>([openingRegion])

    useEffect(() => {
        const fetchRegions = async () => {
            try {
                const response = await fetch('/api/catalogue')
                if (!response.ok) {
                    return
                }
                const catalogue: { regions: string[] } = await response.json()
                setRegions(catalogue.regions)
            } catch {
                console.error('Failed to fetch regions')
            }
        }
        void fetchRegions()
    }, [])

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <style>
                {`
                    html, body {
                        margin: 0;
                        padding: 0;
                        height: 100%;
                        overflow: hidden;
                    }
                    #root {
                        height: 100%;
                        overflow: hidden;
                    }
                `}
            </style>
            <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100vh',
                overflow: 'hidden' // Prevent any scrollbars on the main container
            }}>
                <Router>
                    <AppBar region={region} regions={regions} onRegionChange={setRegion} />
                    <Toolbar />
                    <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                        <Routes>
                            <Route path="/" element={<OverviewPage region={region} />} />
                            <Route path="/map" element={<MapPage region={region} />} />
                        </Routes>
                    </Box>
                </Router>
            </Box>
        </ThemeProvider>
    )
}

export default App
