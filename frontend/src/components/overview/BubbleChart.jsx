import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import * as d3 from 'd3'

export default function BubbleChart({ year, yearData, corps, selectedCorps, hideUnselected }) {
    const svgRef = useRef()
    const containerRef = useRef()
    const theme = useTheme()
    const [bubbleHistory, setBubbleHistory] = useState({}) // Store previous positions for selected corps
    const prevYearRef = useRef(year)
    const prevSelectedCorpsRef = useRef(selectedCorps)
    const [dimensions, setDimensions] = useState({ width: 900, height: 600 })

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

        updateDimensions()
        window.addEventListener('resize', updateDimensions)
        return () => window.removeEventListener('resize', updateDimensions)
    }, [])

    // Constant margins
    const margin = { left: 125, right: 20, top: 20, bottom: 30 }
    const innerWidth = dimensions.width - margin.left - margin.right
    const innerHeight = dimensions.height - margin.top - margin.bottom

    const xScale = d3.scaleLinear().domain([0, 100]).range([0, innerWidth])
    const yScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0])
    const radiusScale = d3.scaleLinear().domain([0, 250]).range([0, Math.min(innerWidth, innerHeight) / 12])

    // Draw axes, labels, and matrix lines once
    useEffect(() => {
        const svg = d3.select(svgRef.current)
            .attr('width', dimensions.width)
            .attr('height', dimensions.height)

        svg.selectAll('.plot-area').remove()

        const plot = svg.append('g')
            .attr('class', 'plot-area')
            .attr('transform', `translate(${margin.left}, ${margin.top})`)

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
            .attr('x', -10) // Position relative to the plot area (not the scaled position)
            .attr('y', yScale(100))
            .attr('text-anchor', 'end')
            .attr('alignment-baseline', 'text-top')
            .text('Sustainable')

        plot.append('text')
            .attr('x', -10) // Position relative to the plot area (not the scaled position)
            .attr('y', yScale(0))
            .attr('text-anchor', 'end')
            .attr('alignment-baseline', 'text-bottom')
            .text('Unsustainable')

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
            .text(year)

        // Add tooltip
        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background-color", "white")
            .style("border", "1px solid #ccc")
            .style("padding", "8px")
            .style("border-radius", "4px")
            .style("pointer-events", "none")

        // Store tooltip reference
        svgRef.current.tooltip = tooltip

    }, [dimensions]) // Re-run when dimensions change

        // Update year text and handle bubble history on year/yearData changes
    useEffect(() => {
        if (!yearData || yearData.length === 0) return

        const plot = d3.select(svgRef.current).select('.plot-area')

        // Update year text
        d3.select(svgRef.current).select('#year-text').text(year)

        // Update bubble history for selected corps
        const selectedCorpsData = yearData.filter(d => selectedCorps.includes(d.name))
        const newHistory = { ...bubbleHistory }

        selectedCorpsData.forEach(corp => {
            if (!newHistory[corp.name]) {
                newHistory[corp.name] = []
            }
            
            const currentPosition = {
                year: year,
                x: xScale(corp.growth),
                y: yScale(corp.sustainability),
                data: corp
            }

            // Check if we already have this year's data
            const existingIndex = newHistory[corp.name].findIndex(pos => pos.year === year)
            if (existingIndex === -1) {
                // Add new position
                newHistory[corp.name].push(currentPosition)
            } else {
                // Update existing position
                newHistory[corp.name][existingIndex] = currentPosition
            }
        })

        // Handle year changes
        if (year < prevYearRef.current) {
            // Year decreased - remove most recent bubbles and lines
            Object.keys(newHistory).forEach(corpName => {
                if (newHistory[corpName]) {
                    newHistory[corpName] = newHistory[corpName].filter(pos => pos.year <= year)
                }
            })
        }

        setBubbleHistory(newHistory)
        prevYearRef.current = year

        // Draw historical lines and bubbles when year changes
        const colourScale = d3.scaleOrdinal()
            .domain(corps.map(c => c.id))
            .range(d3.schemeTableau10)

        // Clear existing historical elements
        plot.selectAll('.connecting-line').remove()
        plot.selectAll('.historical-bubble').remove()

        // Draw connecting lines for selected corps
        selectedCorps.forEach(corpName => {
            const history = newHistory[corpName] || []
            if (history.length >= 2) {
                const sortedHistory = history.sort((a, b) => a.year - b.year)
                
                for (let i = 0; i < sortedHistory.length - 1; i++) {
                    const start = sortedHistory[i]
                    const end = sortedHistory[i + 1]
                    
                    plot.append('line')
                        .attr('class', 'connecting-line')
                        .attr('data-corp', corpName)
                        .attr('x1', start.x)
                        .attr('y1', start.y)
                        .attr('x2', end.x)
                        .attr('y2', end.y)
                        .attr('stroke', colourScale(corpName))
                        .attr('stroke-width', 2)
                        .attr('opacity', 0.7)
                }
            }
        })

        // Draw historical bubbles for selected corps
        selectedCorps.forEach(corpName => {
            const history = newHistory[corpName] || []
            history.forEach((position) => {
                if (position.year !== year) {
                    plot.append('circle')
                        .attr('class', 'historical-bubble')
                        .attr('data-corp', corpName)
                        .attr('cx', position.x)
                        .attr('cy', position.y)
                        .attr('r', radiusScale(position.data.size))
                        .attr('fill', colourScale(corpName))
                        .attr('stroke', 'black')
                        .attr('stroke-width', 1.5)
                        .attr('opacity', 0.6)
                }
            })
        })

    }, [year, yearData, dimensions])

    // Handle selectedCorps changes
    useEffect(() => {
        if (!yearData || yearData.length === 0) return

        const plot = d3.select(svgRef.current).select('.plot-area')
        const previouslySelectedCorps = prevSelectedCorpsRef.current || []
        
        // Handle corps deselection - remove historical elements for deselected corps
        const deselectedCorps = previouslySelectedCorps.filter(corp => !selectedCorps.includes(corp))
        if (deselectedCorps.length > 0) {
            // Remove historical bubbles and lines for deselected corps
            deselectedCorps.forEach(corpName => {
                plot.selectAll('.historical-bubble').filter((d, i, nodes) => {
                    const circle = d3.select(nodes[i])
                    return circle.attr('data-corp') === corpName
                }).remove()
                
                plot.selectAll('.connecting-line').filter((d, i, nodes) => {
                    const line = d3.select(nodes[i])
                    return line.attr('data-corp') === corpName
                }).remove()
            })

            // Remove history for deselected corps
            const newHistory = { ...bubbleHistory }
            deselectedCorps.forEach(corpName => {
                delete newHistory[corpName]
            })
            setBubbleHistory(newHistory)
        }

        // Handle corps selection
        const newlySelectedCorps = selectedCorps.filter(corp => !previouslySelectedCorps.includes(corp))
        const hadPreviousSelection = previouslySelectedCorps.length > 0

        if (newlySelectedCorps.length > 0) {
            // Add current position to history for newly selected corps
            const newHistory = { ...bubbleHistory }
            newlySelectedCorps.forEach(corpName => {
                const corpData = yearData.find(d => d.name === corpName)
                if (corpData) {
                    if (!newHistory[corpName]) {
                        newHistory[corpName] = []
                    }
                    
                    const currentPosition = {
                        year: year,
                        x: xScale(corpData.growth),
                        y: yScale(corpData.sustainability),
                        data: corpData
                    }

                    // Check if we already have this year's data
                    const existingIndex = newHistory[corpName].findIndex(pos => pos.year === year)
                    if (existingIndex === -1) {
                        // Add new position
                        newHistory[corpName].push(currentPosition)
                    } else {
                        // Update existing position
                        newHistory[corpName][existingIndex] = currentPosition
                    }
                }
            })
            setBubbleHistory(newHistory)

            if (hadPreviousSelection) {
                // If there were corps selected before, only redraw the new corps bubble with 100% opacity
                newlySelectedCorps.forEach(corpName => {
                    const currentBubble = plot.selectAll('.current-bubble').filter((d, i, nodes) => {
                        const circle = d3.select(nodes[i])
                        return circle.attr('data-corp') === corpName
                    })
                    currentBubble.attr('opacity', 1)
                })
            } else {
                // If there were no corps selected before, redraw all circles with new opacity
                plot.selectAll('.current-bubble').attr('opacity', d => {
                    return selectedCorps.includes(d.name) ? 1 : 0.2
                })
            }
        }

        prevSelectedCorpsRef.current = selectedCorps

    }, [selectedCorps])

    // Handle corps changes using data join
    useEffect(() => {
        if (!yearData || yearData.length === 0) return

        const plot = d3.select(svgRef.current).select('.plot-area')
        const tooltip = svgRef.current.tooltip

        const allCorpsNames = corps?.map(c => c.name) || []
        let filteredData = yearData.filter(d => allCorpsNames.includes(d.name))
        
        // If hideUnselected is true and there are selected corps, only show selected corps
        if (hideUnselected && selectedCorps && selectedCorps.length > 0) {
            filteredData = filteredData.filter(d => selectedCorps.includes(d.name))
        }

        // Sort data so selected corps are drawn last (appear on top)
        if (selectedCorps && selectedCorps.length > 0) {
            filteredData.sort((a, b) => {
                const aSelected = selectedCorps.includes(a.name)
                const bSelected = selectedCorps.includes(b.name)
                if (aSelected && !bSelected) return 1  // a comes after b
                if (!aSelected && bSelected) return -1 // a comes before b
                return 0 // maintain original order
            })
        }

        const colourScale = d3.scaleOrdinal()
            .domain(corps.map(c => c.id))
            .range(d3.schemeTableau10)

        // DATA JOIN for current year bubbles
        const circles = plot.selectAll('.current-bubble')
            .data(filteredData, d => d.name)

        // EXIT
        circles.exit().remove()

        // ENTER + UPDATE
        circles.enter()
            .append('circle')
            .attr('class', 'current-bubble')
            .merge(circles)
            .attr('data-corp', d => d.name)
            .attr('cx', d => xScale(d.growth))
            .attr('cy', d => yScale(d.sustainability))
            .attr('r', d => radiusScale(d.size))
            .attr('fill', d => colourScale(d.name))
            .attr('stroke', 'black')
            .attr('stroke-width', 1.5)
            .attr('opacity', d => {
                if (selectedCorps && selectedCorps.length > 0) {
                    return selectedCorps.includes(d.name) ? 1 : 0.2
                }
                return 1
            })
            .on('mouseover', function(event, d) {
                // Only show hover effects on selected corps when corps are selected
                if (selectedCorps && selectedCorps.length > 0 && !selectedCorps.includes(d.name)) {
                    return
                }

                d3.select(this)
                    .attr('stroke-width', 3)

                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9)

                tooltip.html(`<strong>${d.name}</strong><br/>Size: ${d.size}<br/>Growth: ${d.growth}<br/>Sustainability: ${d.sustainability}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px")
            })
            .on('mouseout', function() {
                // Only show hover effects on selected corps when corps are selected
                if (selectedCorps && selectedCorps.length > 0 && !selectedCorps.includes(d3.select(this).datum().name)) {
                    return
                }

                d3.select(this)
                    .attr('stroke-width', 1.5)

                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0)
            })
            .style('pointer-events', d => {
                // When corps are selected, only selected corps should capture mouse events
                if (selectedCorps && selectedCorps.length > 0) {
                    return selectedCorps.includes(d.name) ? 'all' : 'none'
                }
                return 'all'
            })

    }, [corps, yearData, selectedCorps, dimensions, hideUnselected])

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
        </Box>
    )
}
