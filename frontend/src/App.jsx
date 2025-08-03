import '@fontsource/fira-sans/300.css'
import '@fontsource/fira-sans/400.css'
import '@fontsource/fira-sans/700.css'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import AppBar from './components/common/AppBar.jsx'
import OverviewPage from './pages/OverviewPage.jsx'
import MapPage from './pages/MapPage.jsx'
import DemographicsPage from './pages/DemographicsPage.jsx'

const theme = createTheme({
    typography: {
        fontFamily: '"Fira Sans", sans-serif'
    }
})

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline/>
            <Router>
                <AppBar/>
                <Routes>
                    <Route path="/" element={<OverviewPage/>}/>
                    <Route path="/map" element={<MapPage/>}/>
                    <Route path="/demographics" element={<DemographicsPage/>}/>
                </Routes>
            </Router>
        </ThemeProvider>
    )
}

export default App
