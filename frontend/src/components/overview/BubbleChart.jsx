import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import * as d3 from 'd3'

export default function BubbleChart({ year, yearData, corps, selectedCorps }) {
    const svgRef = useRef()
    const theme = useTheme()
    const [bubbleHistory, setBubbleHistory] = useState({}) // Store previous positions for selected corps
    const prevYearRef = useRef(year)
    const prevSelectedCorpsRef = useRef(selectedCorps)

    const width = 900
    const height = 600
    const margin = width / 8

    const xScale = d3.scaleLinear().domain([0, 100]).range([0, width - 2 * margin])
    const yScale = d3.scaleLinear().domain([0, 100]).range([height - 2 * margin, 0])
    const radiusScale = d3.scaleSqrt().domain([0, 50]).range([0, 25])

    // Draw axes, labels, and matrix lines once
    useEffect(() => {
        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height)

        svg.selectAll('.plot-area').remove()

        const plot = svg.append('g')
            .attr('class', 'plot-area')
            .attr('transform', `translate(${margin}, ${margin})`)

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
            .attr('x', xScale(0) - 10)
            .attr('y', yScale(100))
            .attr('text-anchor', 'end')
            .attr('alignment-baseline', 'text-top')
            .text('Sustainable')

        plot.append('text')
            .attr('x', xScale(0) - 10)
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
            .attr('font-size', '1000%')
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

    }, []) // Empty dependency array - only run once

    // Update year text and handle bubble history on year/yearData changes
    useEffect(() => {
        if (!yearData || yearData.length === 0) return

        const plot = d3.select(svgRef.current).select('.plot-area')
        
        // Update year text
        plot.select('#year-text').text(year)

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

    }, [year, yearData])

    // Handle selectedCorps changes - redraw all bubbles
    useEffect(() => {
        if (!yearData || yearData.length === 0) return

        const plot = d3.select(svgRef.current).select('.plot-area')
        const tooltip = svgRef.current.tooltip

        // Clear all existing bubbles and lines
        plot.selectAll('.bubble').remove()
        plot.selectAll('.connecting-line').remove()
        plot.selectAll('.historical-bubble').remove()

        const colourScale = d3.scaleOrdinal()
            .domain(corps.map(c => c.name))
            .range(d3.schemeTableau10)

        // Draw connecting lines for selected corps
        selectedCorps.forEach(corpName => {
            const history = bubbleHistory[corpName] || []
            if (history.length >= 2) {
                const sortedHistory = history.sort((a, b) => a.year - b.year)
                
                for (let i = 0; i < sortedHistory.length - 1; i++) {
                    const start = sortedHistory[i]
                    const end = sortedHistory[i + 1]
                    
                    plot.append('line')
                        .attr('class', 'connecting-line')
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
            const history = bubbleHistory[corpName] || []
            history.forEach((position) => {
                if (position.year !== year) {
                    plot.append('circle')
                        .attr('class', 'historical-bubble')
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

        // Handle corps deselection
        const previouslySelectedCorps = prevSelectedCorpsRef.current || []
        const deselectedCorps = previouslySelectedCorps.filter(corp => !selectedCorps.includes(corp))
        if (deselectedCorps.length > 0) {
            const newHistory = { ...bubbleHistory }
            deselectedCorps.forEach(corpName => {
                delete newHistory[corpName]
            })
            setBubbleHistory(newHistory)
        }
        prevSelectedCorpsRef.current = selectedCorps

    }, [selectedCorps])

    // Handle corps changes using data join
    useEffect(() => {
        if (!yearData || yearData.length === 0) return

        const plot = d3.select(svgRef.current).select('.plot-area')
        const tooltip = svgRef.current.tooltip

        const allCorpsNames = corps?.map(c => c.name) || []
        const filteredData = yearData.filter(d => allCorpsNames.includes(d.name))

        const colourScale = d3.scaleOrdinal()
            .domain(corps.map(c => c.name))
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
                d3.select(this)
                    .attr('stroke-width', 3)

                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9)

                tooltip.html(`<strong>${d.name}</strong><br/>Size: ${d.size}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px")
            })
            .on('mouseout', function() {
                d3.select(this)
                    .attr('stroke-width', 1.5)

                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0)
            })

    }, [corps, yearData, selectedCorps])

    return (
        <Box sx={{ overflow: 'auto' }}>
            <svg ref={svgRef}/>
        </Box>
    )
}
