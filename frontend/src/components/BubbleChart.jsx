import * as React from 'react'
import { useState, useEffect, useRef } from 'react'
import { useTheme } from '@mui/material/styles'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import * as d3 from 'd3'

export default function BubbleChart() {
    const serverUrl = import.meta.env.VITE_SERVER_URL
    const year = 2024
    const [yearData, setYearData] = useState(null)
    const [loading, setLoading] = useState(true)
    const svgRef = useRef()
    const theme = useTheme()

    const width = 1200
    const height = 800
    const margin = width / 10

    const xScale = d3.scaleLinear().domain([0, 100]).range([0, width - 2 * margin])
    const yScale = d3.scaleLinear().domain([0, 100]).range([height - 2 * margin, 0])
    const radiusScale = d3.scaleSqrt().domain([0, 50]).range([0, 25])
    const colourScale = d3.scaleOrdinal(d3.schemeTableau10)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${serverUrl}/api/test/bubbleChart/${year}`)
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }
                const data = await response.json()
                setYearData(data)
            } catch (error) {
                console.error('Failed to fetch bubble chart data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [serverUrl, year])

    // Draw and update chart
    useEffect(() => {
        if (!yearData || yearData.length === 0) return

        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height)

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

        // Add left Y axis (line only)
        plot.append('line')
            .attr('x1', xScale(0))
            .attr('y1', yScale(0))
            .attr('x2', xScale(0))
            .attr('y2', yScale(100))
            .attr('stroke', 'black')

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

        plot.append('text')
            .attr('x', xScale(50))
            .attr('y', yScale(50))
            .attr('text-anchor', 'middle')
            .attr('fill', 'black')
            .attr('font-size', '1000%')
            .attr('opacity', '10%')
            .text(year)

        // DATA JOIN
        const circles = plot.selectAll('circle')
            .data(yearData, d => d.name)

        // EXIT
        circles.exit().remove()

        // ENTER + UPDATE
        circles.enter()
            .append('circle')
            .merge(circles)
            .attr('cx', d => xScale(d.growth))
            .attr('cy', d => yScale(d.sustainability))
            .attr('r', d => radiusScale(d.size))
            .attr('fill', (d, i) => colourScale(i))
            .attr('stroke', theme.palette.background.paper)
            .attr('stroke-width', 1.5)
    }, [yearData, theme])

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
            </Box>
        )
    }

    return (
        <Box sx={{ overflow: 'auto' }}>
            <svg ref={svgRef}/>
        </Box>
    )
}
