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

const theme = createTheme({
    typography: {
        fontFamily: '"Fira Sans", sans-serif'
    }
})

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
                <Router>
                    <AppBar />
                    <Toolbar />
                    <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                        <Routes>
                            <Route path="/" element={<OverviewPage />} />
                            <Route path="/map" element={<MapPage />} />
                        </Routes>
                    </Box>
                </Router>
            </Box>
        </ThemeProvider>
    )
}

export default App
