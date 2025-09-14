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
    const [selectedCorps, setSelectedCorps] = useState([])

    useEffect(() => {
        const fetchYearData = async () => {
            try {
                const response = await fetch(`${serverUrl}/api/corps/growth/${year}`)
                if (!response.ok) {
                    setYearData(null)
                    return
                }
                const data = await response.json()
                const dataWithSustainability = data.map(corp => ({
                    ...corp,
                    sustainability: 50 // Placeholder value until sustainability API is implemented
                }))
                setYearData(dataWithSustainability)
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
                const response = await fetch(`${serverUrl}/api/corps/growth/${year}`)
                if (!response.ok) {
                    setCorps([])
                    return
                }
                const data = await response.json()
                const updated = data.map(corp => {
                    const existing = corps.find(c => c.name === corp.name)
                    return {
                        name: corp.name,
                        selected: existing ? existing.selected : false
                    }
                })

                setCorps(updated)
            } catch (error) {
                console.error(`Failed to fetch corps data for ${year}`)
                setCorps([])
            }
        }

        fetchCorpsData()
    }, [serverUrl, year])

    return (
        <Box sx={{ 
            height: '100%', 
            width: '100%', 
            display: 'flex', 
            flexDirection: 'row',
            overflow: 'hidden'
        }}>
            {/* Main content area - takes remaining space */}
            <Box sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                minWidth: 0 // Allows flex item to shrink below content size
            }}>
                {/* BubbleChart - takes most of the available space */}
                <Box sx={{ 
                    flex: 1, 
                    minHeight: 0, // Allows flex item to shrink
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <BubbleChart 
                        year={year} 
                        yearData={yearData} 
                        corps={corps} 
                        selectedCorps={selectedCorps}
                    />
                </Box>
                
                {/* AnimationPanel - takes minimum space needed */}
                <Box sx={{ 
                    flexShrink: 0, // Prevents shrinking
                    padding: 2
                }}>
                    <AnimationPanel year={year} setYear={setYear} />
                </Box>
            </Box>
            
            {/* CheckboxSelectorPanel - fixed width, full height, right-aligned */}
            <Box sx={{ 
                flexShrink: 0, // Prevents shrinking
                height: '100%',
                borderLeft: '1px solid #e0e0e0',
                backgroundColor: '#fafafa'
            }}>
                <Box sx={{ 
                    height: '100%',
                    overflow: 'auto',
                    padding: 2,
                    minWidth: 'fit-content'
                }}>
                    <CheckboxSelectorPanel 
                        corps={corps} 
                        selectedCorps={selectedCorps} 
                        setSelectedCorps={setSelectedCorps} 
                    />
                </Box>
            </Box>
        </Box>
    )
}
