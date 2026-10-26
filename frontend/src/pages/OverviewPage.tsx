import BubbleChart, { type BubblePoint } from '../components/overview/BubbleChart.tsx'
import AnimationPanel from '../components/overview/AnimationPanel.tsx'
import CheckboxSelectorPanel from '../components/overview/CheckboxSelectorPanel.tsx'
import TogglePanel from '../components/overview/TogglePanel.tsx'
import Box from '@mui/material/Box'
import {useEffect, useState} from 'react'
import type { Corps } from '../components/map/CorpsDetails.tsx'

interface ScoredSnapshot {
    id: string
    name: string
    year: number
    scores: Omit<BubblePoint, 'id' | 'name'>
}

export default function OverviewPage() {
    const [year, setYear] = useState<number | null>(null)
    const [years, setYears] = useState<number[]>([])
    const [pointsByYear, setPointsByYear] = useState<Record<number, BubblePoint[]>>({})
    const [selectedCorps, setSelectedCorps] = useState<string[]>([])
    const [corps, setCorps] = useState<Corps[]>([])
    const [hideUnselected, setHideUnselected] = useState(false)

    useEffect(() => {
        const fetchBubbleData = async () => {
            try {
                const [catalogueResponse, snapshotsResponse] = await Promise.all([
                    fetch('/api/catalogue'),
                    fetch('/api/snapshots?scored=true')
                ])
                if (!catalogueResponse.ok || !snapshotsResponse.ok) {
                    return
                }
                const catalogue: { snapshots: { scoredYears: number[] } } = await catalogueResponse.json()
                const snapshots: ScoredSnapshot[] = await snapshotsResponse.json()

                const byYear: Record<number, BubblePoint[]> = {}
                snapshots.forEach(snapshot => {
                    byYear[snapshot.year] ??= []
                    byYear[snapshot.year].push({ id: snapshot.id, name: snapshot.name, ...snapshot.scores })
                })

                const scoredYears = catalogue.snapshots.scoredYears
                setPointsByYear(byYear)
                setYears(scoredYears)
                setYear(scoredYears[scoredYears.length - 1] ?? null)
            } catch {
                console.error('Failed to fetch bubble chart data')
            }
        }

        void fetchBubbleData()
    }, [])

    const yearData = year === null ? null : pointsByYear[year] ?? null

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
                        pointsByYear={pointsByYear}
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
                    <AnimationPanel year={year} setYear={setYear} years={years} />
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
                            onCorpsDataLoaded={setCorps}
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
