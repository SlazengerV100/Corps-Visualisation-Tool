import { useEffect, useRef } from 'react'
import { useTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import * as d3 from 'd3'

export default function BubbleChart({ year, yearData, corps }) {
    const svgRef = useRef()
    const theme = useTheme()

    const width = 900
    const height = 600
    const margin = width / 8

    const xScale = d3.scaleLinear().domain([0, 100]).range([0, width - 2 * margin])
    const yScale = d3.scaleLinear().domain([0, 100]).range([height - 2 * margin, 0])
    const radiusScale = d3.scaleSqrt().domain([0, 50]).range([0, 25])

    // Draw and update chart
    useEffect(() => {
        d3.select(svgRef.current).selectAll("*").remove()

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

        plot.append('text')
            .attr('x', xScale(50))
            .attr('y', yScale(50))
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'middle')
            .attr('fill', 'black')
            .attr('font-size', '1000%')
            .attr('opacity', '10%')
            .style('user-select', 'none')
            .text(year)

        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0) // Initially hidden
            .style("position", "absolute")
            .style("background-color", "white")
            .style("border", "1px solid #ccc")
            .style("padding", "8px")
            .style("border-radius", "4px")
            .style("pointer-events", "none");

        if (!yearData || yearData.length === 0) return

        // DATA JOIN
        const visibleCorps = corps?.filter(c => c.selected).map(c => c.name) || []
        const filteredData = yearData.filter(d => visibleCorps.includes(d.name))

        const colourScale = d3.scaleOrdinal()
            .domain(corps.map(c => c.name))
            .range(d3.schemeTableau10)

        const circles = plot.selectAll('circle')
            .data(filteredData, d => d.name)

        // EXIT
        circles.exit().remove()

        // ENTER + UPDATE
        circles.enter()
            .append('circle')
            .merge(circles)
            .attr('cx', d => xScale(d.growth))
            .attr('cy', d => yScale(d.sustainability))
            .attr('r', d => radiusScale(d.size))
            .attr('fill', d => colourScale(d.name))
            .attr('stroke', 'black')
            .attr('stroke-width', 1.5)
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .attr('stroke-width', 3);

                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);

                tooltip.html(`<strong>${d.name}</strong><br/>Size: ${d.size}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on('mouseout', () => {
                d3.select(this)
                    .attr('stroke-width', 1.5);

                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    }, [yearData, year, corps, theme])

    return (
        <Box sx={{ overflow: 'auto' }}>
            <svg ref={svgRef}/>
        </Box>
    )
}
