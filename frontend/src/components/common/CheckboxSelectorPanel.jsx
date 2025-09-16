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

export default function CheckboxSelectorPanel({ selectedCorps, setSelectedCorps, onCorpsDataLoaded }) {
    const [corpsData, setCorpsData] = useState([])
    const [areas, setAreas] = useState({})
    const [expandedAreas, setExpandedAreas] = useState({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchCorpsData = async () => {
            try {
                const serverUrl = import.meta.env.VITE_SERVER_URL
                const response = await fetch(`${serverUrl}/api/corps`)
                if (!response.ok) {
                    console.error('Failed to fetch corps data')
                    return
                }
                const data = await response.json()
                setCorpsData(data)
                
                // Group corps by area
                const groupedByArea = {}
                data.forEach(corp => {
                    if (!groupedByArea[corp.area]) {
                        groupedByArea[corp.area] = []
                    }
                    groupedByArea[corp.area].push(corp)
                })
                setAreas(groupedByArea)
                
                // Initialize all areas as collapsed
                const initialExpanded = {}
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

        fetchCorpsData()
    }, [])

    const handleToggle = (name) => {
        setSelectedCorps(prevSelected => {
            const isCurrentlySelected = prevSelected.includes(name)
            if (isCurrentlySelected) {
                // Remove from selected corps
                return prevSelected.filter(corpsName => corpsName !== name)
            } else {
                // Add to selected corps
                return [...prevSelected, name]
            }
        })
    }

    const handleAreaToggle = (areaName) => {
        setExpandedAreas(prev => ({
            ...prev,
            [areaName]: !prev[areaName]
        }))
    }

    const handleAreaSelectAll = (areaName) => {
        const areaCorps = areas[areaName] || []
        const areaCorpNames = areaCorps.map(corp => corp.name)
        const allSelected = areaCorpNames.every(name => selectedCorps.includes(name))
        
        if (allSelected) {
            // Deselect all corps in this area
            setSelectedCorps(prev => prev.filter(name => !areaCorpNames.includes(name)))
        } else {
            // Select all corps in this area
            setSelectedCorps(prev => {
                const newSelected = [...prev]
                areaCorpNames.forEach(name => {
                    if (!newSelected.includes(name)) {
                        newSelected.push(name)
                    }
                })
                return newSelected
            })
        }
    }

    const isAreaFullySelected = (areaName) => {
        const areaCorps = areas[areaName] || []
        return areaCorps.length > 0 && areaCorps.every(corp => selectedCorps.includes(corp.name))
    }

    const isAreaPartiallySelected = (areaName) => {
        const areaCorps = areas[areaName] || []
        const selectedCount = areaCorps.filter(corp => selectedCorps.includes(corp.name)).length
        return selectedCount > 0 && selectedCount < areaCorps.length
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
                {Object.keys(areas).sort().map(areaName => {
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
                                    {areaCorps.sort((a, b) => a.name.localeCompare(b.name)).map(corp => (
                                        <ListItem key={corp.name} sx={{ pl: 2, py: 0.25, overflow: 'hidden' }}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={selectedCorps.includes(corp.name)}
                                                        onChange={() => handleToggle(corp.name)}
                                                    />
                                                }
                                                label={
                                                    <Typography
                                                        sx={{
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            maxWidth: '100%'
                                                        }}
                                                    >
                                                        {corp.name}
                                                    </Typography>
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
