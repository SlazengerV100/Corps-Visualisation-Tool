import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Popper from '@mui/material/Popper'
import { useTheme } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import * as d3 from 'd3'
import ScoreBreakdown, { type ChangeBreakdown } from './ScoreBreakdown.tsx'
import ScoreExplanationDialog from './ScoreExplanationDialog.tsx'
import type { FigureGap } from '../common/figureGaps.ts'
import type { Corps } from '../map/CorpsDetails.tsx'

export interface BubblePoint {
    id: string
    name: string
    growth: number
    sustainability: number
    size: number
    firstTimeDecisions: number
    surplusDeficit: number | null
    gaps: Partial<Record<string, FigureGap>>
    breakdown: {
        growth: {
            congregationalWorship: ChangeBreakdown
            firstTimeDecisions: number
            kidsChurch: ChangeBreakdown | null
            youthDiscipleship: ChangeBreakdown | null
        }
        sustainability: {
            tithing: ChangeBreakdown
            surplusDeficit: number | null
        }
    }
}

interface BubblePosition {
    year: number
    x: number
    y: number
    data: BubblePoint
}

// Constant margins
// The left margin is measured from the y-axis labels instead
const margin = { right: 20, top: 20, bottom: 50 }

// Space between the y-axis and its labels
const labelGap = 10

export default function BubbleChart({ year, yearData, pointsByYear, corps, selectedCorps, hideUnselected, labels }: {
    year: number | null
    yearData: BubblePoint[] | null
    pointsByYear: Record<number, BubblePoint[]>
    corps: Corps[]
    selectedCorps: string[]
    hideUnselected: boolean
    labels: Record<string, string>
}) {
    const svgRef = useRef<SVGSVGElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    // The year and selection a tooltip was opened for; changing either redraws the bubbles it may be attached to
    const view = `${year}|${selectedCorps.join(',')}|${hideUnselected}`
    const [tooltip, setTooltip] = useState<{ anchor: Element, content: ReactNode, view: string, pinned: boolean } | null>(null)
    const pinnedRef = useRef<{ anchor: Element, view: string } | null>(null) // Bubble whose tooltip stays open after a click
    const [explaining, setExplaining] = useState(false)
    const theme = useTheme()
    const bubbleHistoryRef = useRef<Record<string, BubblePosition[]>>({}) // Store previous positions for selected corps
    const prevYearRef = useRef(year)
    const prevSelectedCorpsRef = useRef(selectedCorps)
    const [dimensions, setDimensions] = useState({ width: 900, height: 600 })
    const [leftMargin, setLeftMargin] = useState(0)

    // Calculate responsive dimensions
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect()
                const padding = 10 // Minimum padding
                const width = Math.max(rect.width - padding, 400) // Minimum width
                const height = Math.max(rect.height - padding, 300) // Minimum height
                setDimensions({ width, height })
            }
        }

        // Observe the container rather than the window: it also shrinks when the year slider below loads
        const observer = new ResizeObserver(updateDimensions)
        if (containerRef.current) observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [])

    // Hovering shows a bubble's tooltip unless another is pinned; clicking pins it until clicked again, elsewhere, or Escape
    const isPinned = useCallback(() => pinnedRef.current?.view === view, [view])
    const showTooltip = useCallback((anchor: Element, content: ReactNode) => {
        if (!isPinned()) setTooltip({ anchor, content, view, pinned: false })
    }, [isPinned, view])
    const hideTooltip = useCallback(() => {
        if (!isPinned()) setTooltip(null)
    }, [isPinned])
    const unpinTooltip = useCallback(() => {
        pinnedRef.current = null
        setTooltip(null)
    }, [])
    const togglePinnedTooltip = useCallback((anchor: Element, content: ReactNode) => {
        if (isPinned() && pinnedRef.current?.anchor === anchor) {
            unpinTooltip()
            return
        }
        pinnedRef.current = { anchor, view }
        setTooltip({ anchor, content, view, pinned: true })
    }, [isPinned, unpinTooltip, view])

    useEffect(() => {
        const unpinOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') unpinTooltip()
        }
        document.addEventListener('keydown', unpinOnEscape)
        return () => document.removeEventListener('keydown', unpinOnEscape)
    }, [unpinTooltip])

    const innerWidth = dimensions.width - leftMargin - margin.right
    const innerHeight = dimensions.height - margin.top - margin.bottom

    const xScale = useMemo(() => d3.scaleLinear().domain([0, 100]).range([0, innerWidth]), [innerWidth])
    const yScale = useMemo(() => d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]), [innerHeight])
    const radiusScale = useMemo(
        () => d3.scaleLinear().domain([0, 250]).range([0, Math.min(innerWidth, innerHeight) / 12]),
        [innerWidth, innerHeight]
    )

    // Draw axes, labels, and matrix lines once
    useEffect(() => {
        const svg = d3.select(svgRef.current)
            .attr('width', dimensions.width)
            .attr('height', dimensions.height)

        svg.selectAll('.plot-area').remove()

        // Clicking anywhere but a bubble closes a pinned tooltip
        svg.on('click', (event: MouseEvent) => {
            if (!(event.target instanceof Element && event.target.closest('.current-bubble, .historical-bubble'))) unpinTooltip()
        })

        const plot = svg.append('g')
            .attr('class', 'plot-area')
            .attr('transform', `translate(${leftMargin}, ${margin.top})`)

        // Add bottom X axis (line only)
        plot.append('line')
            .attr('x1', xScale(0))
            .attr('y1', yScale(0))
            .attr('x2', xScale(100))
            .attr('y2', yScale(0))
            .attr('stroke', 'black')
            .attr('stroke-width', 3)

        // Add matrix X line
        plot.append('line')
            .attr('x1', xScale(0))
            .attr('y1', yScale(50))
            .attr('x2', xScale(100))
            .attr('y2', yScale(50))
            .attr('stroke', 'black')
            .attr('opacity', '20%')

        // Add left Y axis (line only)
        plot.append('line')
            .attr('x1', xScale(0))
            .attr('y1', yScale(0))
            .attr('x2', xScale(0))
            .attr('y2', yScale(100))
            .attr('stroke', 'black')
            .attr('stroke-width', 3)

        // Add matrix Y line
        plot.append('line')
            .attr('x1', xScale(50))
            .attr('y1', yScale(0))
            .attr('x2', xScale(50))
            .attr('y2', yScale(100))
            .attr('stroke', 'black')
            .attr('opacity', '20%')

        // Axis Labels
        // X-axis: "Not growing" and "Growing"
        plot.append('text')
            .attr('x', xScale(0))
            .attr('y', yScale(0) + 20)
            .attr('text-anchor', 'start')
            .text('Not growing')

        plot.append('text')
            .attr('x', xScale(100))
            .attr('y', yScale(0) + 20)
            .attr('text-anchor', 'end')
            .text('Growing')

        // Y-axis: "Sustainable" and "Unsustainable"
        plot.append('text')
            .attr('class', 'y-label')
            .attr('x', -labelGap) // Position relative to the plot area (not the scaled position)
            .attr('y', yScale(100))
            .attr('text-anchor', 'end')
            .attr('alignment-baseline', 'text-top')
            .text('Sustainable')

        plot.append('text')
            .attr('class', 'y-label')
            .attr('x', -labelGap) // Position relative to the plot area (not the scaled position)
            .attr('y', yScale(0))
            .attr('text-anchor', 'end')
            .attr('alignment-baseline', 'text-bottom')
            .text('Unsustainable')

        // Axis titles
        plot.append('text')
            .attr('x', xScale(50))
            .attr('y', yScale(0) + 42)
            .attr('text-anchor', 'middle')
            .attr('font-weight', 'bold')
            .text('Growth')

        plot.append('text')
            .attr('class', 'y-label')
            .attr('x', -labelGap)
            .attr('y', yScale(50))
            .attr('text-anchor', 'end')
            .attr('alignment-baseline', 'middle')
            .attr('font-weight', 'bold')
            .text('Sustainability')

        // Info icon in the top right corner, opening the explanation of how the scores are calculated
        const infoIcon = plot.append('text')
            .attr('x', xScale(100) - 10)
            .attr('y', yScale(100))
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'hanging')
            .attr('font-size', 20)
            .attr('fill', theme.palette.primary.main)
            .attr('role', 'button')
            .attr('aria-label', 'How the scores are calculated')
            .style('cursor', 'pointer')
            .on('click', () => setExplaining(true))
            .text('ⓘ')

        // Widen the left margin to fit the widest y-axis label, redrawing with the new margin
        const widestLabel = d3.max(plot.selectAll<SVGTextElement, unknown>('.y-label').nodes(), node => node.getBBox().width) ?? 0
        const neededMargin = Math.ceil(widestLabel) + 2 * labelGap
        if (neededMargin !== leftMargin) setLeftMargin(neededMargin)

        // Size legend below the info icon: nested circles at reference worship sizes below the scale's maximum
        const legendSizes = radiusScale.ticks(5).filter(s => s > 0 && s < radiusScale.domain()[1])
        const legendRadius = radiusScale(legendSizes[legendSizes.length - 1] ?? 0)
        const legendTitleY = yScale(100) + (infoIcon.node()?.getBBox().height ?? 0) + 14
        const legendX = xScale(100) - 10 - legendRadius
        const legendBase = legendTitleY + 8 + 2 * legendRadius
        plot.append('text')
            .attr('x', xScale(100) - 10)
            .attr('y', legendTitleY)
            .attr('text-anchor', 'end')
            .attr('font-size', 12)
            .text('Scale: Congregational Worship')
        for (const size of legendSizes) {
            const radius = radiusScale(size)
            plot.append('circle')
                .attr('cx', legendX)
                .attr('cy', legendBase - radius)
                .attr('r', radius)
                .attr('fill', 'none')
                .attr('stroke', 'grey')
            plot.append('text')
                .attr('x', legendX)
                .attr('y', legendBase - 2 * radius + 11)
                .attr('text-anchor', 'middle')
                .attr('font-size', 10)
                .attr('fill', 'grey')
                .text(size)
        }

        // Add year text container
        plot.append('text')
            .attr('id', 'year-text')
            .attr('x', xScale(50))
            .attr('y', yScale(50))
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'middle')
            .attr('fill', 'black')
            .attr('font-size', `${dimensions.width * 0.15}px`)
            .attr('opacity', '10%')
            .style('user-select', 'none')

    }, [dimensions.width, dimensions.height, leftMargin, xScale, yScale, radiusScale, theme, unpinTooltip]) // Re-run when dimensions change

    // Update year text, including after the plot is redrawn
    useEffect(() => {
        d3.select(svgRef.current).select('#year-text').text(year)
    }, [year, dimensions.width, dimensions.height])

        // Handle bubble history on year/yearData changes
    useEffect(() => {
        if (year === null || !yearData || yearData.length === 0) return

        const plot = d3.select(svgRef.current).select<SVGGElement>('.plot-area')

        // Update bubble history for selected corps
        const selectedCorpsData = yearData.filter(d => selectedCorps.includes(d.id))
        const newHistory = { ...bubbleHistoryRef.current }

        selectedCorpsData.forEach(corp => {
            if (!newHistory[corp.id]) {
                newHistory[corp.id] = []
            }

            const currentPosition = {
                year: year,
                x: xScale(corp.growth),
                y: yScale(corp.sustainability),
                data: corp
            }

            // Check if we already have this year's data
            const existingIndex = newHistory[corp.id].findIndex(pos => pos.year === year)
            if (existingIndex === -1) {
                // Add new position
                newHistory[corp.id].push(currentPosition)
            } else {
                // Update existing position
                newHistory[corp.id][existingIndex] = currentPosition
            }
        })

        // Handle year changes
        if (prevYearRef.current !== null && year < prevYearRef.current) {
            // Year decreased - remove most recent bubbles and lines
            Object.keys(newHistory).forEach(corpsId => {
                if (newHistory[corpsId]) {
                    newHistory[corpsId] = newHistory[corpsId].filter(pos => pos.year <= year)
                }
            })
        }

        bubbleHistoryRef.current = newHistory
        prevYearRef.current = year

        // Draw historical lines and bubbles when year changes
        const colourScale = d3.scaleOrdinal<string, string>()
            .domain(corps.map(c => c.id))
            .range(d3.schemeTableau10)

        // Clear existing historical elements
        plot.selectAll('.connecting-line').remove()
        plot.selectAll('.historical-bubble').remove()

        // Draw connecting lines for selected corps using actual data
        const drawConnectingLines = () => {
            for (const corpsId of selectedCorps) {
                const history = newHistory[corpsId] || []
                if (history.length === 0) continue

                const sortedHistory = history.toSorted((a, b) => a.year - b.year)
                const minYear = sortedHistory[0].year
                const maxYear = sortedHistory[sortedHistory.length - 1].year

                // Get positions for all years between min and max
                const allPositions: BubblePosition[] = []
                for (let yearToFetch = minYear; yearToFetch <= maxYear; yearToFetch++) {
                    let position: BubblePosition | undefined

                    if (yearToFetch === year) {
                        // Use current year data from yearData prop
                        const corpsData = yearData.find(d => d.id === corpsId)
                        if (corpsData) {
                            position = {
                                year: yearToFetch,
                                x: xScale(corpsData.growth),
                                y: yScale(corpsData.sustainability),
                                data: corpsData
                            }
                        }
                    } else {
                        // Look up historical data
                        const yearDataForCorps = pointsByYear[yearToFetch] ?? null
                        if (yearDataForCorps) {
                            const corpsData = yearDataForCorps.find(d => d.id === corpsId)
                            if (corpsData) {
                                position = {
                                    year: yearToFetch,
                                    x: xScale(corpsData.growth),
                                    y: yScale(corpsData.sustainability),
                                    data: corpsData
                                }
                            }
                        }
                    }

                    if (position) {
                        allPositions.push(position)
                    }
                }

                // Draw lines between consecutive years
                for (let i = 0; i < allPositions.length - 1; i++) {
                    const start = allPositions[i]
                    const end = allPositions[i + 1]

                    // Only draw line if the years are consecutive (no gaps)
                    if (end.year - start.year === 1) {
                        plot.append('line')
                            .attr('class', 'connecting-line')
                            .attr('data-corp', corpsId)
                            .attr('x1', start.x)
                            .attr('y1', start.y)
                            .attr('x2', end.x)
                            .attr('y2', end.y)
                            .attr('stroke', colourScale(corpsId))
                            .attr('stroke-width', 2)
                            .attr('opacity', 0.7)
                    }
                }
            }
        }

        drawConnectingLines()

        // Draw historical bubbles for selected corps using actual data
        const drawHistoricalBubbles = () => {
            for (const corpsId of selectedCorps) {
                const history = newHistory[corpsId] || []
                if (history.length === 0) continue

                const sortedHistory = history.toSorted((a, b) => a.year - b.year)
                const minYear = sortedHistory[0].year
                const maxYear = sortedHistory[sortedHistory.length - 1].year

                // Fetch data for all years between min and max
                for (let yearToFetch = minYear; yearToFetch <= maxYear; yearToFetch++) {
                    if (yearToFetch === year) continue // Skip current year

                    const pointsForYear = pointsByYear[yearToFetch] ?? null
                    if (!pointsForYear) continue

                    // Find the corps data for this year
                    const corpsData = pointsForYear.find(d => d.id === corpsId)
                    if (!corpsData) continue

                    // Create position data
                    const position = {
                        year: yearToFetch,
                        x: xScale(corpsData.growth),
                        y: yScale(corpsData.sustainability),
                        data: corpsData
                    }
                    const breakdown = <ScoreBreakdown point={position.data} title={`${position.data.name} (${position.year})`} labels={labels} />

                    // Draw the bubble
                    plot.append('circle')
                        .attr('class', 'historical-bubble')
                        .attr('data-corp', corpsId)
                        .attr('cx', position.x)
                        .attr('cy', position.y)
                        .attr('r', radiusScale(position.data.size))
                        .attr('fill', colourScale(corpsId))
                        .attr('stroke', 'black')
                        .attr('stroke-width', 1.5)
                        .attr('opacity', 0.6)
                        .style('cursor', 'pointer')
                        .on('mouseover', function() {
                            d3.select(this)
                                .attr('stroke-width', 3)
                                .attr('opacity', 0.8)

                            showTooltip(this, breakdown)
                        })
                        .on('mouseout', function() {
                            d3.select(this)
                                .attr('stroke-width', 1.5)
                                .attr('opacity', 0.6)

                            hideTooltip()
                        })
                        .on('click', function() {
                            togglePinnedTooltip(this, breakdown)
                        })
                }
            }
        }

        drawHistoricalBubbles()

    }, [year, yearData, pointsByYear, corps, selectedCorps, xScale, yScale, radiusScale, labels, showTooltip, hideTooltip, togglePinnedTooltip])

    // Handle selectedCorps changes
    useEffect(() => {
        if (year === null || !yearData || yearData.length === 0) return

        const plot = d3.select(svgRef.current).select<SVGGElement>('.plot-area')
        const previouslySelectedCorps = prevSelectedCorpsRef.current || []

        // Handle corps deselection - remove historical elements for deselected corps
        const deselectedCorps = previouslySelectedCorps.filter(corp => !selectedCorps.includes(corp))
        if (deselectedCorps.length > 0) {
            // Remove historical bubbles and lines for deselected corps
            deselectedCorps.forEach(corpsId => {
                plot.selectAll('.historical-bubble').filter((d, i, nodes) => {
                    const circle = d3.select(nodes[i])
                    return circle.attr('data-corp') === corpsId
                }).remove()

                plot.selectAll('.connecting-line').filter((d, i, nodes) => {
                    const line = d3.select(nodes[i])
                    return line.attr('data-corp') === corpsId
                }).remove()
            })

            // Remove history for deselected corps
            const newHistory = { ...bubbleHistoryRef.current }
            deselectedCorps.forEach(corpsId => {
                delete newHistory[corpsId]
            })
            bubbleHistoryRef.current = newHistory
        }

        // Handle corps selection
        const newlySelectedCorps = selectedCorps.filter(corpsId => !previouslySelectedCorps.includes(corpsId))
        const hadPreviousSelection = previouslySelectedCorps.length > 0

        if (newlySelectedCorps.length > 0) {
            // Add current position to history for newly selected corps
            const newHistory = { ...bubbleHistoryRef.current }
            newlySelectedCorps.forEach(corpsId => {
                const corpData = yearData.find(d => d.id === corpsId)
                if (corpData) {
                    if (!newHistory[corpsId]) {
                        newHistory[corpsId] = []
                    }

                    const currentPosition = {
                        year: year,
                        x: xScale(corpData.growth),
                        y: yScale(corpData.sustainability),
                        data: corpData
                    }

                    // Check if we already have this year's data
                    const existingIndex = newHistory[corpsId].findIndex(pos => pos.year === year)
                    if (existingIndex === -1) {
                        // Add new position
                        newHistory[corpsId].push(currentPosition)
                    } else {
                        // Update existing position
                        newHistory[corpsId][existingIndex] = currentPosition
                    }
                }
            })
            bubbleHistoryRef.current = newHistory

            if (hadPreviousSelection) {
                // If there were corps selected before, only redraw the new corps bubble with 100% opacity
                newlySelectedCorps.forEach(corpsId => {
                    const currentBubble = plot.selectAll('.current-bubble').filter((d, i, nodes) => {
                        const circle = d3.select(nodes[i])
                        return circle.attr('data-corp') === corpsId
                    })
                    currentBubble.attr('opacity', 1)
                })
            } else {
                // If there were no corps selected before, redraw all circles with new opacity
                plot.selectAll<SVGCircleElement, BubblePoint>('.current-bubble').attr('opacity', d => {
                    return selectedCorps.includes(d.id) ? 1 : 0.2
                })
            }
        }

        prevSelectedCorpsRef.current = selectedCorps

    }, [year, yearData, selectedCorps, xScale, yScale])

    // Handle corps changes using data join
    useEffect(() => {
        if (!yearData || yearData.length === 0) return

        const plot = d3.select(svgRef.current).select<SVGGElement>('.plot-area')

        const allCorpsIds = corps?.map(c => c.id) || []
        let filteredData = yearData.filter(d => allCorpsIds.includes(d.id))

        // If hideUnselected is true and there are selected corps, only show selected corps
        if (hideUnselected && selectedCorps && selectedCorps.length > 0) {
            filteredData = filteredData.filter(d => selectedCorps.includes(d.id))
        }

        // Sort data so selected corps are drawn last (appear on top)
        if (selectedCorps && selectedCorps.length > 0) {
            filteredData.sort((a, b) => {
                const aSelected = selectedCorps.includes(a.id)
                const bSelected = selectedCorps.includes(b.id)
                if (aSelected && !bSelected) return 1  // a comes after b
                if (!aSelected && bSelected) return -1 // a comes before b
                return 0 // maintain original order
            })
        }

        const colourScale = d3.scaleOrdinal<string, string>()
            .domain(corps.map(c => c.id))
            .range(d3.schemeTableau10)

        // Tooltip content, showing the year when the corps is selected (similar to historical bubbles)
        const currentBreakdown = (d: BubblePoint) => {
            const showYear = selectedCorps && selectedCorps.length > 0 && selectedCorps.includes(d.id)
            return <ScoreBreakdown point={d} title={showYear ? `${d.name} (${year})` : d.name} labels={labels} />
        }

        // DATA JOIN for current year bubbles
        const circles = plot.selectAll<SVGCircleElement, BubblePoint>('.current-bubble')
            .data(filteredData, d => d.id)

        // EXIT
        circles.exit().remove()

        // ENTER + UPDATE
        circles.enter()
            .append('circle')
            .attr('class', 'current-bubble')
            .merge(circles)
            .attr('data-corp', d => d.id)
            .attr('cx', d => xScale(d.growth))
            .attr('cy', d => yScale(d.sustainability))
            .attr('r', d => radiusScale(d.size))
            .attr('fill', d => colourScale(d.id))
            .attr('stroke', 'black')
            .attr('stroke-width', 1.5)
            .attr('opacity', d => {
                if (selectedCorps && selectedCorps.length > 0) {
                    return selectedCorps.includes(d.id) ? 1 : 0.2
                }
                return 1
            })
            .on('mouseover', function(_event: MouseEvent, d) {
                // Only show hover effects on selected corps when corps are selected
                if (selectedCorps && selectedCorps.length > 0 && !selectedCorps.includes(d.id)) {
                    return
                }

                d3.select(this)
                    .attr('stroke-width', 3)

                showTooltip(this, currentBreakdown(d))
            })
            .on('mouseout', function(_event: MouseEvent, d) {
                // Only show hover effects on selected corps when corps are selected
                if (selectedCorps && selectedCorps.length > 0 && !selectedCorps.includes(d.id)) {
                    return
                }

                d3.select(this)
                    .attr('stroke-width', 1.5)

                hideTooltip()
            })
            .on('click', function(_event: MouseEvent, d) {
                togglePinnedTooltip(this, currentBreakdown(d))
            })
            .style('cursor', 'pointer')
            .style('pointer-events', d => {
                // When corps are selected, only selected corps should capture mouse events
                if (selectedCorps && selectedCorps.length > 0) {
                    return selectedCorps.includes(d.id) ? 'all' : 'none'
                }
                return 'all'
            })

    }, [year, corps, yearData, selectedCorps, hideUnselected, xScale, yScale, radiusScale, labels, showTooltip, hideTooltip, togglePinnedTooltip])

    return (
        <Box
            ref={containerRef}
            sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <svg ref={svgRef}/>
            <Popper
                open={tooltip !== null && tooltip.view === view}
                anchorEl={tooltip?.anchor}
                placement="right-start"
                sx={{ pointerEvents: tooltip?.pinned ? 'auto' : 'none', zIndex: 'tooltip' }}
            >
                <Paper elevation={4} sx={{ p: 1.5, m: 1, position: 'relative' }}>
                    {tooltip?.pinned && (
                        <IconButton aria-label="Close" size="small" onClick={unpinTooltip} sx={{ position: 'absolute', top: 2, right: 2 }}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    )}
                    {tooltip?.content}
                </Paper>
            </Popper>
            <ScoreExplanationDialog open={explaining} onClose={() => setExplaining(false)} />
        </Box>
    )
}
