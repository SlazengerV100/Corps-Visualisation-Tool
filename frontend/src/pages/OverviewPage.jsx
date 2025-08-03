import AppBar from '../components/common/AppBar.jsx'
import BubbleChart from '../components/overview/BubbleChart.jsx'
import AnimationPanel from '../components/overview/AnimationPanel.jsx'
import CheckboxSelectorPanel from '../components/common/CheckboxSelectorPanel.jsx'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import {useEffect, useState} from 'react'

export default function OverviewPage() {
    const serverUrl = import.meta.env.VITE_SERVER_URL
    const [year, setYear] = useState(2024)
    const [yearData, setYearData] = useState(null)
    const [corps, setCorps] = useState([])

    useEffect(() => {
        const fetchYearData = async () => {
            try {
                const response = await fetch(`${serverUrl}/api/test/bubbleChart/${year}`)
                if (!response.ok) {
                    setYearData(null)
                    return
                }
                const data = await response.json()
                setYearData(data)
            } catch (error) {
                console.error(`Failed to fetch data for ${year}`)
                setYearData(null)
            }
        }

        fetchYearData()
    }, [serverUrl, year])

    useEffect(() => {
        const fetchCorpsData = async () => {
            try {
                const response = await fetch(`${serverUrl}/api/corps/${year}`)
                if (!response.ok) {
                    setCorps([])
                    return
                }
                const data = await response.json()
                const updated = data.map(name => {
                    const existing = corps.find(c => c.name === name)
                    return {
                        name,
                        selected: existing ? existing.selected : true
                    }
                })

                setCorps(updated)
            } catch (error) {
                console.error(`Failed to fetch corps data for ${year}`)
                setYearData(null)
            }
        }

        fetchCorpsData()
    }, [serverUrl, year])

    return (
        <Box>
            <Box sx={{ flexGrow: 1, padding: 4 }}>
                <Grid container>
                    <Grid size={{ xs: 12, md: 9 }}>
                        <BubbleChart year={year} yearData={yearData} corps={corps}/>
                        <Box mt={4}>
                            <AnimationPanel year={year} setYear={setYear} />
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3}}>
                        <CheckboxSelectorPanel corps={corps} setCorps={setCorps} />
                    </Grid>
                </Grid>
            </Box>
        </Box>
    )
}
