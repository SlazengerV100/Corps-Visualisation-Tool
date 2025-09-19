import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from '@mui/material/styles'
import * as d3 from 'd3'
import { Box, Typography, CircularProgress } from '@mui/material'

const PopulationChart = () => {
  const svgRef = useRef()
  const theme = useTheme()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [year, setYear] = useState(2024)
  const serverUrl = import.meta.env.VITE_SERVER_URL

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${serverUrl}/api/corps/metrics/${year}`)
        if (!response.ok) {
          throw new Error('Failed to fetch data')
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [serverUrl, year])

  useEffect(() => {
    if (!data || data.length === 0) return

    // Clear any existing chart
    d3.select(svgRef.current).selectAll('*').remove()

    // Get container dimensions
    const container = svgRef.current.parentElement
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', containerWidth)
      .attr('height', containerHeight)

    // Set margins
    const margin = { top: 60, right: 60, bottom: 60, left: 80 }
    const innerWidth = containerWidth - margin.left - margin.right
    const innerHeight = containerHeight - margin.top - margin.bottom

    // Filter data to only include corps with population data
    const filteredData = data.filter(d => 
      d.metrics.population && 
      d.metrics.population > 0 && 
      d.metrics.congregationalWorship.currentYear > 0
    )

    if (filteredData.length === 0) {
      // Show no data message
      svg.append('text')
        .attr('x', containerWidth / 2)
        .attr('y', containerHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', '18px')
        .attr('fill', '#666')
        .text('No data available for the selected criteria')
      return
    }

    // Calculate percentage values
    const chartData = filteredData.map(d => ({
      id: d.id,
      name: d.name,
      congregationalWorship: d.metrics.congregationalWorship.currentYear,
      population: d.metrics.population,
      percentage: (d.metrics.congregationalWorship.currentYear / d.metrics.population) * 100
    }))

    // Sort by percentage (descending)
    chartData.sort((a, b) => b.percentage - a.percentage)

    // Create scales
    const xScale = d3.scaleBand()
      .domain(chartData.map(d => d.id))
      .range([0, innerWidth])
      .padding(0) // No gaps between bars

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => d.percentage)])
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
        .tickFormat('')
      )

    // Add bars
    g.selectAll('.bar')
      .data(chartData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.id))
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
        .tickFormat('') // Hide tick labels since we'll add custom labels
      )
      .call(g => g.select('.domain').attr('stroke-opacity', 0.2))

    // Add custom x-axis labels (corps names)
    g.selectAll('.x-label')
      .data(chartData)
      .enter()
      .append('text')
      .attr('class', 'x-label')
      .attr('x', d => xScale(d.id) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.percentage) - 10)
      .attr('dy', '0.35em')
      .attr('font-size', '12px')
      .attr('fill', '#333')
      .style('user-select', 'none')
      .text(d => d.name.replace(' Corps', ''))
      .attr('transform', d => `rotate(-90, ${xScale(d.id) + xScale.bandwidth() / 2}, ${yScale(d.percentage) - 10})`)

    // Add y-axis
    g.append('g')
      .call(d3.axisLeft(yScale)
        .tickSize(0)
        .tickFormat(d => `${d.toFixed(1)}%`)
      )
      .call(g => g.select('.domain').attr('stroke-opacity', 0.2))

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
    g.selectAll('.bar')
      .on('mouseover', function(event, d) {
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
  }, [data])

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
