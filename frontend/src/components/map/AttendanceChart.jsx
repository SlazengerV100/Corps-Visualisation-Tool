import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const AttendanceChart = ({ data, height = 300 }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Clear any existing chart
    d3.select(svgRef.current).selectAll('*').remove();

    // Create SVG
    const svg = d3.select(svgRef.current)
        .attr('width', '100%')
        .attr('height', height);

    // Set margins
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const innerWidth = svg.node().getBoundingClientRect().width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Determine if data is monthly or yearly based on data structure
    const isMonthlyData = data.some(d => d.month !== undefined);
    
    // Create scales
    const x = d3.scaleLinear()
      .domain([1, data.length])
      .range([0, innerWidth]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.attendance)])
      .nice()
      .range([innerHeight, 0]);

    // Create x-axis labels based on data type
    const xAxisLabels = data.map((d, i) => {
      if (isMonthlyData) {
        // For monthly data, show just month names
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return monthNames[d.month - 1] || `M${d.month}`;
      } else {
        // For yearly data, show financial year
        return d.financialYear || d.year?.toString() || `Y${i + 1}`;
      }
    });

    // Create line generator
    const line = d3.line()
      .x((d, i) => x(i + 1))
      .y(d => y(d.attendance))
      .curve(d3.curveMonotoneX);

    // Create chart group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(d3.axisLeft(y)
        .tickSize(-innerWidth)
        .tickFormat('')
      );

    // Add x-axis with custom labels
    const xAxis = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x)
        .ticks(Math.min(data.length, 10))
        .tickSize(0)
        .tickFormat((d, i) => {
          const index = Math.round(d) - 1;
          return xAxisLabels[index] || '';
        }))
      .call(g => g.select('.domain').attr('stroke-opacity', 0.2));

    // Add y-axis
    g.append('g')
      .call(d3.axisLeft(y)
        .tickSize(0))
      .call(g => g.select('.domain').attr('stroke-opacity', 0.2));

    // Add the line path
    const path = g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#8884d8')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Add dots
    const dots = g.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', (d, i) => x(i + 1))
      .attr('cy', d => y(d.attendance))
      .attr('r', 4)
      .attr('fill', '#8884d8');

    // Add tooltip functionality
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background-color', 'white')
      .style('padding', '5px')
      .style('border', '1px solid #ccc')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    dots.on('mouseover', (event, d) => {
      tooltip.transition()
        .duration(200)
        .style('opacity', .9);
      
      let tooltipText = `Attendance: ${d.attendance}`;
      if (isMonthlyData) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        tooltipText = `${monthNames[d.month - 1]} ${d.year}: ${d.attendance}`;
      } else {
        tooltipText = `FY ${d.financialYear}: ${d.attendance}`;
      }
      
      tooltip.html(tooltipText)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', () => {
      tooltip.transition()
        .duration(500)
        .style('opacity', 0);
    });

    // Animation
    const pathLength = path.node().getTotalLength();
    path
      .attr('stroke-dasharray', pathLength)
      .attr('stroke-dashoffset', pathLength)
      .transition()
      .duration(1000)
      .attr('stroke-dashoffset', 0);

    dots
      .attr('opacity', 0)
      .transition()
      .duration(1000)
      .attr('opacity', 1);

    // Cleanup function
    return () => {
      d3.select('body').selectAll('.tooltip').remove();
    };
  }, [data, height]);

  return <svg ref={svgRef}></svg>;
};

export default AttendanceChart; 