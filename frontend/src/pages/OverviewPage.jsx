import BubbleChart from '../components/overview/BubbleChart.jsx'
import AnimationPanel from '../components/overview/AnimationPanel.jsx'
import CheckboxSelectorPanel from '../components/overview/CheckboxSelectorPanel.jsx'
import TogglePanel from '../components/overview/TogglePanel.jsx'
import Box from '@mui/material/Box'
import {useEffect, useState} from 'react'

export default function OverviewPage() {
    const serverUrl = import.meta.env.VITE_SERVER_URL
    const [year, setYear] = useState(new Date().getFullYear())
    const [yearData, setYearData] = useState(null)
    const [selectedCorps, setSelectedCorps] = useState([])
    const [corps, setCorps] = useState([])
    const [hideUnselected, setHideUnselected] = useState(false)

    useEffect(() => {
        const fetchYearData = async () => {
            try {
                const response = await fetch(`${serverUrl}/api/corps/bubbleChart/${year}`)
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

    const handleCorpsDataLoaded = (corpsData) => {
        setCorps(corpsData)
    }

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
                        hideUnselected={hideUnselected}
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
                width: '350px', // Increased width to show dropdown chevron
                borderLeft: '1px solid #e0e0e0',
                backgroundColor: '#fafafa'
            }}>
                <Box sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <Box sx={{ 
                        flex: 1,
                        overflowY: 'auto', // Allow vertical scrolling
                        overflowX: 'hidden', // Prevent horizontal scrollbar
                        padding: 2
                    }}>
                        <CheckboxSelectorPanel 
                            selectedCorps={selectedCorps} 
                            setSelectedCorps={setSelectedCorps}
                            onCorpsDataLoaded={handleCorpsDataLoaded}
                            year={year}
                            yearData={yearData}
                        />
                    </Box>
                    <TogglePanel 
                        hideUnselected={hideUnselected}
                        setHideUnselected={setHideUnselected}
                        selectedCorps={selectedCorps}
                    />
                </Box>
            </Box>
        </Box>
    )
}
