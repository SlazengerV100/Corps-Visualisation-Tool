import BarChart from "./components/BarChart.jsx";
import AppBar from "./components/AppBar.jsx";
import '@fontsource/fira-sans/300.css';
import '@fontsource/fira-sans/400.css';
import '@fontsource/fira-sans/700.css';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const theme = createTheme({
    typography: {
        fontFamily: '"Fira Sans", sans-serif',
    }
})

function App() {
  return (
    <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppBar />
        <BarChart />
    </ThemeProvider>
  )
}

export default App
