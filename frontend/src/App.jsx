import '@fontsource/fira-sans/300.css'
import '@fontsource/fira-sans/400.css'
import '@fontsource/fira-sans/700.css'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import AppBar from './components/common/AppBar.jsx'
import OverviewPage from './pages/OverviewPage.jsx'
import MapPage from './pages/MapPage.jsx'
import PopulationPage from './pages/PopulationPage.jsx'
import DefinitionsPage from './pages/DefinitionsPage.jsx'

const theme = createTheme({
    typography: {
        fontFamily: '"Fira Sans", sans-serif'
    }
})

function App() {
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
                    <AppBar />
                    <Toolbar />
                    <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                        <Routes>
                            <Route path="/" element={<OverviewPage />} />
                            <Route path="/map" element={<MapPage />} />
                            <Route path="/population" element={<PopulationPage />} />
                            <Route path="/definitions" element={<DefinitionsPage />} />
                        </Routes>
                    </Box>
                </Router>
            </Box>
        </ThemeProvider>
    )
}

export default App
