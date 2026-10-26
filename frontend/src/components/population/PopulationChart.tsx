import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from '@mui/material/styles'
import * as d3 from 'd3'
import { Box, Typography, CircularProgress } from '@mui/material'

interface PopulationSnapshot {
  id: string
  name: string
  year: number
  metrics: {
    congregationalWorship: { currentYear: number | null }
    population: number | null
  }
}

interface ChartDatum {
  id: string
  name: string
  congregationalWorship: number
  population: number
  percentage: number
}

const PopulationChart = (): React.JSX.Element => {
  const svgRef = useRef<SVGSVGElement>(null)
  const theme = useTheme()
  const [data, setData] = useState<PopulationSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [year, setYear] = useState<number | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/snapshots')
        if (!response.ok) {
          throw new Error('Failed to fetch data')
        }
        const result: PopulationSnapshot[] = await response.json()
        // Show the latest year that has population figures
        const latestYear = Math.max(...result.filter(d => (d.metrics.population ?? 0) > 0).map(d => d.year))
        setYear(latestYear)
        setData(result.filter(d => d.year === latestYear))
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [])

  useEffect(() => {
    const svgElement = svgRef.current
    if (!svgElement || !data || data.length === 0) return undefined

    // Clear any existing chart
    d3.select(svgElement).selectAll('*').remove()

    // Get container dimensions
    const container = svgElement.parentElement
    if (!container) return undefined
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    // Create SVG
    const svg = d3.select(svgElement)
      .attr('width', containerWidth)
      .attr('height', containerHeight)

    // Set margins
    const margin = { top: 60, right: 60, bottom: 60, left: 80 }
    const innerWidth = containerWidth - margin.left - margin.right
    const innerHeight = containerHeight - margin.top - margin.bottom

    // Keep only corps with population data, and calculate percentage values
    const chartData: ChartDatum[] = data.flatMap(d => {
      const population = d.metrics.population
      const congregationalWorship = d.metrics.congregationalWorship.currentYear
      if (!population || population <= 0 || !congregationalWorship || congregationalWorship <= 0) {
        return []
      }
      return [{
        id: d.id,
        name: d.name,
        congregationalWorship,
        population,
        percentage: (congregationalWorship / population) * 100
      }]
    })

    if (chartData.length === 0) {
      // Show no data message
      svg.append('text')
        .attr('x', containerWidth / 2)
        .attr('y', containerHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', '18px')
        .attr('fill', '#666')
        .text('No data available for the selected criteria')
      return undefined
    }

    // Sort by percentage (descending)
    chartData.sort((a, b) => b.percentage - a.percentage)

    // Create scales
    const xScale = d3.scaleBand()
      .domain(chartData.map(d => d.id))
      .range([0, innerWidth])
      .padding(0) // No gaps between bars
    const barX = (d: ChartDatum) => xScale(d.id) ?? 0

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => d.percentage) ?? 0])
      .nice()
      .range([innerHeight, 0])

    // Create chart group
    const g = svg.append('g')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Add grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(d3.axisLeft(yScale)
        .tickSize(-innerWidth)
        .tickFormat(() => '')
      )

    // Add bars
    g.selectAll('.bar')
      .data(chartData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', barX)
      .attr('y', d => yScale(d.percentage))
      .attr('width', xScale.bandwidth())
      .attr('height', d => innerHeight - yScale(d.percentage))
      .attr('fill', theme.palette.primary.main)
      .attr('stroke', 'white')
      .attr('stroke-width', 1)

    // Add x-axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale)
        .tickSize(0)
        .tickFormat(() => '') // Hide tick labels since we'll add custom labels
      )
      .call(axis => axis.select('.domain').attr('stroke-opacity', 0.2))

    // Add custom x-axis labels (corps names)
    g.selectAll('.x-label')
      .data(chartData)
      .enter()
      .append('text')
      .attr('class', 'x-label')
      .attr('x', d => barX(d) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.percentage) - 10)
      .attr('dy', '0.35em')
      .attr('font-size', '12px')
      .attr('fill', '#333')
      .style('user-select', 'none')
      .text(d => d.name.replace(' Corps', ''))
      .attr('transform', d => `rotate(-90, ${barX(d) + xScale.bandwidth() / 2}, ${yScale(d.percentage) - 10})`)

    // Add y-axis
    g.append('g')
      .call(d3.axisLeft(yScale)
        .tickSize(0)
        .tickFormat(d => `${d.valueOf().toFixed(1)}%`)
      )
      .call(axis => axis.select('.domain').attr('stroke-opacity', 0.2))

    // Add axis labels
    // X-axis label
    svg.append('text')
      .attr('x', containerWidth / 2)
      .attr('y', containerHeight - margin.bottom / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .text('Corps')

    // Y-axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('text-anchor', 'middle')
      .attr('x', -containerHeight / 2)
      .attr('y', margin.left / 2 - 10)
      .attr('dy', '0.35em')
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .text('% of Population')

    // Add title
    svg.append('text')
      .attr('x', containerWidth / 2)
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .attr('font-size', '24px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .text(`Congregational Worship as a Percentage of Population (${year})`)

    // Add tooltip
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background-color', 'white')
      .style('padding', '8px')
      .style('border', '1px solid #ccc')
      .style('border-radius', '4px')
      .style('opacity', 0)
      .style('pointer-events', 'none')
      .style('z-index', 1000)
      .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)')

    // Add hover effects
    g.selectAll<SVGRectElement, ChartDatum>('.bar')
      .on('mouseover', function(event: MouseEvent, d) {
        d3.select(this)
          .attr('fill', theme.palette.primary.light)

        tooltip
          .html(`
            <strong>${d.name}</strong><br/>
            Congregational Worship: ${d.congregationalWorship}<br/>
            Population Estimate: ${d.population}<br/>
            Percentage: ${d.percentage.toFixed(2)}%
          `)
          .style('opacity', 0.9)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('fill', theme.palette.primary.main)

        tooltip
          .style('opacity', 0)
      })

    // Cleanup function
    return () => {
      d3.select('body').selectAll('.tooltip').remove()
    }
  }, [data, year, theme])

  if (loading) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }}></svg>
    </Box>
  )
}

export default PopulationChart
