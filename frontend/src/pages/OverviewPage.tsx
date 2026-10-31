import BubbleChart, { type BubblePoint } from '../components/overview/BubbleChart.tsx'
import AnimationPanel from '../components/overview/AnimationPanel.tsx'
import CheckboxSelectorPanel, { type CorpsStatus } from '../components/overview/CheckboxSelectorPanel.tsx'
import type { FigureGap } from '../components/common/figureGaps.ts'
import TogglePanel from '../components/overview/TogglePanel.tsx'
import Box from '@mui/material/Box'
import {useEffect, useState} from 'react'
import type { Corps } from '../components/map/CorpsDetails.tsx'

interface YearPair {
    currentYear: number | null
    prevYear: number | null
}

interface Snapshot {
    id: string
    name: string
    year: number
    metrics: {
        congregationalWorship: YearPair
        firstTimeDecisions: YearPair
        kidsChurch: YearPair
        youthDiscipleship: YearPair
        tithing: YearPair | null
        surplusDeficit: number | null
    }
    scores?: Omit<BubblePoint, 'id' | 'name' | 'firstTimeDecisions' | 'surplusDeficit' | 'gaps'>
}

// Which year a measure has no figure for, this year taking precedence
const gap = ({ currentYear, prevYear }: YearPair): FigureGap | null => {
    if (currentYear === null) return 'thisYear'
    return prevYear === null ? 'lastYear' : null
}

// Why a corps has no scores for the year, from the figures scoring needs
const unscoredStatus = ({ congregationalWorship, tithing }: Snapshot['metrics']): CorpsStatus => {
    if (congregationalWorship.currentYear === null) {
        return { gap: 'thisYear', why: 'No congregational worship recorded this year, so it has no scores.' }
    }
    if (tithing === null) {
        return { gap: 'thisYear', why: 'No tithing recorded this year, so it has no scores.' }
    }
    if (!congregationalWorship.prevYear) {
        return { gap: 'lastYear', why: 'No congregational worship recorded last year, so growth cannot be measured and it has no scores.' }
    }
    return { gap: 'lastYear', why: 'No finance figures for last year, so it has no scores.' }
}

export default function OverviewPage() {
    const [year, setYear] = useState<number | null>(null)
    const [years, setYears] = useState<number[]>([])
    const [pointsByYear, setPointsByYear] = useState<Record<number, BubblePoint[]>>({})
    const [selectedCorps, setSelectedCorps] = useState<string[]>([])
    const [corps, setCorps] = useState<Corps[]>([])
    const [hideUnselected, setHideUnselected] = useState(false)
    const [labels, setLabels] = useState<Record<string, string>>({})
    const [statusesByYear, setStatusesByYear] = useState<Record<number, Record<string, CorpsStatus>>>({})

    useEffect(() => {
        const fetchBubbleData = async () => {
            try {
                const [catalogueResponse, snapshotsResponse] = await Promise.all([
                    fetch('/api/catalogue'),
                    fetch('/api/snapshots')
                ])
                if (!catalogueResponse.ok || !snapshotsResponse.ok) {
                    return
                }
                const catalogue: { metrics: { name: string, label: string }[], snapshots: { scoredYears: number[] } } = await catalogueResponse.json()
                const snapshots: Snapshot[] = await snapshotsResponse.json()

                const byYear: Record<number, BubblePoint[]> = {}
                const statuses: Record<number, Record<string, CorpsStatus>> = {}
                snapshots.forEach(snapshot => {
                    statuses[snapshot.year] ??= {}
                    const { scores } = snapshot
                    if (!scores) {
                        statuses[snapshot.year][snapshot.id] = unscoredStatus(snapshot.metrics)
                        return
                    }
                    statuses[snapshot.year][snapshot.id] = {}

                    const { firstTimeDecisions, kidsChurch, youthDiscipleship, tithing, surplusDeficit } = snapshot.metrics
                    // First-time decisions and surplus/deficit are scored on this year alone, so only this year can be missing
                    const candidates: [string, FigureGap | null][] = [
                        ['firstTimeDecisions', firstTimeDecisions.currentYear === null ? 'thisYear' : null],
                        ['kidsChurch', gap(kidsChurch)],
                        ['youthDiscipleship', gap(youthDiscipleship)],
                        ['tithing', tithing && gap(tithing)],
                        ['surplusDeficit', surplusDeficit === null ? 'thisYear' : null]
                    ]
                    const gaps: Partial<Record<string, FigureGap>> = {}
                    for (const [name, figureGap] of candidates) {
                        if (figureGap) gaps[name] = figureGap
                    }
                    byYear[snapshot.year] ??= []
                    byYear[snapshot.year].push({
                        id: snapshot.id,
                        name: snapshot.name,
                        firstTimeDecisions: firstTimeDecisions.currentYear ?? 0,
                        surplusDeficit,
                        gaps,
                        ...scores
                    })
                })

                const scoredYears = catalogue.snapshots.scoredYears
                setLabels(Object.fromEntries(catalogue.metrics.map(m => [m.name, m.label])))
                setPointsByYear(byYear)
                setStatusesByYear(statuses)
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
                        labels={labels}
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
                            statuses={year === null ? null : statusesByYear[year] ?? {}}
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
