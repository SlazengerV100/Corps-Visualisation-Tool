import React, { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Collapse from '@mui/material/Collapse'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import Typography from '@mui/material/Typography'
import type { Corps } from '../map/CorpsDetails.tsx'
import HoverTooltip from '../common/HoverTooltip.tsx'
import { gapColours, type FigureGap } from '../common/figureGaps.ts'

export interface CorpsStatus {
    gap?: FigureGap
    why?: string
}

const noFigures: CorpsStatus = { gap: 'thisYear', why: 'No figures recorded this year, so it has no scores.' }

export default function CheckboxSelectorPanel({ selectedCorps, setSelectedCorps, onCorpsDataLoaded, year, statuses }: {
    selectedCorps: string[]
    setSelectedCorps: React.Dispatch<React.SetStateAction<string[]>>
    onCorpsDataLoaded: (corps: Corps[]) => void
    year: number | null
    statuses: Record<string, CorpsStatus> | null
}) {
    const [corpsData, setCorpsData] = useState<Corps[]>([])
    const [areas, setAreas] = useState<Record<string, Corps[]>>({})
    const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchCorpsData = async () => {
            try {
                const response = await fetch('/api/corps')
                if (!response.ok) {
                    console.error('Failed to fetch corps data')
                    return
                }
                const data: Corps[] = await response.json()
                setCorpsData(data)
                
                // Group corps by area
                const groupedByArea: Record<string, Corps[]> = {}
                data.forEach(corps => {
                    if (!groupedByArea[corps.area]) {
                        groupedByArea[corps.area] = []
                    }
                    groupedByArea[corps.area].push(corps)
                })
                setAreas(groupedByArea)
                
                // Initialize all areas as collapsed
                const initialExpanded: Record<string, boolean> = {}
                Object.keys(groupedByArea).forEach(area => {
                    initialExpanded[area] = false
                })
                setExpandedAreas(initialExpanded)
                
                // Notify parent component of loaded corps data
                if (onCorpsDataLoaded) {
                    onCorpsDataLoaded(data)
                }
                
            } catch (error) {
                console.error('Error fetching corps data:', error)
            } finally {
                setLoading(false)
            }
        }

        void fetchCorpsData()
    }, [onCorpsDataLoaded])

    const handleToggle = (id: string) => {
        setSelectedCorps(prevSelected => {
            const isCurrentlySelected = prevSelected.includes(id)
            if (isCurrentlySelected) {
                // Remove from selected corps
                return prevSelected.filter(corpsId => corpsId !== id)
            } else {
                // Add to selected corps
                return [...prevSelected, id]
            }
        })
    }

    const handleAreaToggle = (areaName: string) => {
        setExpandedAreas(prev => ({
            ...prev,
            [areaName]: !prev[areaName]
        }))
    }

    const handleAreaSelectAll = (areaName: string) => {
        const areaCorps = areas[areaName] || []
        const areaCorpsIds = areaCorps.map(corps => corps.id)
        const allSelected = areaCorpsIds.every(id => selectedCorps.includes(id))
        
        if (allSelected) {
            // Deselect all corps in this area
            setSelectedCorps(prev => prev.filter(id => !areaCorpsIds.includes(id)))
        } else {
            // Select all corps in this area
            setSelectedCorps(prev => {
                const newSelected = [...prev]
                areaCorpsIds.forEach(id => {
                    if (!newSelected.includes(id)) {
                        newSelected.push(id)
                    }
                })
                return newSelected
            })
        }
    }

    const isAreaFullySelected = (areaName: string) => {
        const areaCorps = areas[areaName] || []
        return areaCorps.length > 0 && areaCorps.every(corp => selectedCorps.includes(corp.id))
    }

    const isAreaPartiallySelected = (areaName: string) => {
        const areaCorps = areas[areaName] || []
        const selectedCount = areaCorps.filter(corp => selectedCorps.includes(corp.id)).length
        return selectedCount > 0 && selectedCount < areaCorps.length
    }

    const isClosed = (centreId: string) => {
        if (!corpsData || !Array.isArray(corpsData)) {
            return false
        }
        
        const corps = corpsData.find(corp => corp.id === centreId)
        if (!corps || !corps.closingDate || year === null) {
            return false
        }
        
        // Check if closing date is prior to June of the year before the year prop
        const closingDate = new Date(corps.closingDate)
        const cutoffDate = new Date(year, 5, 1) // June 1st of the year before the year prop (month is 0-indexed)
        
        return closingDate < cutoffDate
    }

    // Why a corps has no scores for the year, if it has none, once the year's statuses have loaded
    const statusOf = (centreId: string) => statuses === null ? null : statuses[centreId] ?? noFigures

    // Get the styling for a corps based on its status
    const getCorpsStyling = (centreId: string) => {
        const gap = statusOf(centreId)?.gap
        if (isClosed(centreId)) {
            return {
                textDecoration: 'line-through',
                color: 'text.secondary'
            }
        } else if (gap) {
            return {
                textDecoration: 'none',
                color: gapColours[gap]
            }
        } else {
            return {
                textDecoration: 'none',
                color: 'inherit'
            }
        }
    }

    // The corps' name and address, with why it is struck through or coloured; its area is the dropdown it sits in
    const corpsTooltip = (corps: Corps) => {
        const status = statusOf(corps.id)
        let summary: React.ReactNode = null
        if (isClosed(corps.id) && corps.closingDate) {
            summary = `Closed on ${new Date(corps.closingDate).toLocaleDateString('en-NZ')}.`
        } else if (status?.gap) {
            summary = <Box component="span" sx={{ color: gapColours[status.gap] }}>{status.why}</Box>
        }
        return (
            <>
                <strong>{corps.name}</strong>
                <br />{corps.address}, {corps.city}
                {summary && <><br />{summary}</>}
            </>
        )
    }

    if (loading) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography>Loading corps data...</Typography>
            </Box>
        )
    }

    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Select Corps
            </Typography>
            <FormGroup>
                {Object.keys(areas).toSorted().map(areaName => {
                    const areaCorps = areas[areaName]
                    const isExpanded = expandedAreas[areaName]
                    const isFullySelected = isAreaFullySelected(areaName)
                    const isPartiallySelected = isAreaPartiallySelected(areaName)
                    
                    return (
                        <Box key={areaName} sx={{ mb: 0.5 }}>
                            {/* Area header with expand/collapse and select all */}
                            <ListItemButton 
                                onClick={() => handleAreaToggle(areaName)}
                                sx={{ 
                                    pl: 0,
                                    width: '100%',
                                    overflow: 'hidden'
                                }}
                            >
                                <Checkbox
                                    checked={isFullySelected}
                                    indeterminate={isPartiallySelected}
                                    onChange={() => handleAreaSelectAll(areaName)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <ListItemText 
                                    primary={
                                        <Typography 
                                            variant="subtitle1" 
                                            sx={{ 
                                                fontWeight: 'bold',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                maxWidth: '100%'
                                            }}
                                        >
                                            {areaName} ({areaCorps.length})
                                        </Typography>
                                    }
                                    sx={{ 
                                        overflow: 'hidden',
                                        minWidth: 0 // Allows flex item to shrink
                                    }}
                                />
                                {isExpanded ? <ExpandLess /> : <ExpandMore />}
                            </ListItemButton>
                            
                            {/* Corps list for this area */}
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                <List component="div" disablePadding>
                                    {areaCorps.toSorted((a, b) => a.name.localeCompare(b.name)).map(corps => (
                                        <ListItem key={corps.id} sx={{ pl: 2, py: 0.25, overflow: 'hidden' }}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={selectedCorps.includes(corps.id)}
                                                        onChange={() => handleToggle(corps.id)}
                                                    />
                                                }
                                                label={
                                                    <HoverTooltip title={corpsTooltip(corps)}>
                                                        <Typography
                                                            sx={{
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                maxWidth: '100%',
                                                                ...getCorpsStyling(corps.id)
                                                            }}
                                                        >
                                                            {corps.name}
                                                        </Typography>
                                                    </HoverTooltip>
                                                }
                                                sx={{ 
                                                    width: '100%',
                                                    overflow: 'hidden',
                                                    minWidth: 0 // Allows flex item to shrink
                                                }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Collapse>
                        </Box>
                    )
                })}
            </FormGroup>
        </Box>
    )
}
