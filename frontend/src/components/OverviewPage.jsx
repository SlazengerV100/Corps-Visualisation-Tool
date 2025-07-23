import AppBar from './AppBar.jsx';
import BubbleChart from './BubbleChart.jsx';
import AnimationPanel from './AnimationPanel.jsx';
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import {useEffect, useState} from "react";

export default function OverviewPage() {
    const serverUrl = import.meta.env.VITE_SERVER_URL
    const [year, setYear] = useState(2024)
    const [yearData, setYearData] = useState(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${serverUrl}/api/test/bubbleChart/${year}`)
                if (!response.ok) {
                    setYearData(null)
                    return
                }
                const data = await response.json()
                setYearData(data)
            } catch (error) {
                console.error(`Failed to fetch bubble chart data for ${year}: `)
                setYearData(null)
            }
        }

        fetchData()
    }, [serverUrl, year, yearData])

    return (
        <Box>
            <AppBar />
            <Box sx={{ flexGrow: 1, padding: 4 }}>
                <Grid container>
                    <Grid size={{ xs: 12, md: 9 }}>
                        <BubbleChart year={year} yearData={yearData}/>
                        <Box mt={4}>
                            <AnimationPanel year={year} setYear={setYear} />
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3}}>

                    </Grid>
                </Grid>
            </Box>
        </Box>
    )
}
