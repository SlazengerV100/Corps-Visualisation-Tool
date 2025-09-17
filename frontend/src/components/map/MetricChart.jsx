import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const MetricChart = ({ data, timeRange, height = 300 }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return

    // Clear any existing chart
    d3.select(svgRef.current).selectAll('*').remove();

    // Create SVG
    const svg = d3.select(svgRef.current)
        .attr('width', '100%')
        .attr('height', height);

    // Set margins
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const innerWidth = svg.node().getBoundingClientRect().width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Determine if data is monthly or yearly based on data structure
    const isMonthlyData = data.some(d => d.month !== undefined);
    
    // Create scales
    const x = d3.scaleLinear()
      .domain([0, data.length])
      .range([0, innerWidth]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.metric)])
      .nice()
      .range([innerHeight, 0]);

    // Create x-axis labels based on data type
    const xAxisLabels = data.map((d, i) => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
      // For past year (1Y), show just month names
      if (timeRange === 'pastYear') {
        return monthNames[d.month - 1] || `M${d.month}`;
      } else if (timeRange === 'pastTwoYears') {
        // For past two years and longer, show "Jul 23" format
        const monthName = monthNames[d.month - 1] || `M${d.month}`;
        const yearShort = d.year ? d.year.toString().slice(-2) : '';
        return `${monthName} ${yearShort}`;
      } else {
        return d.year;
      }
    });

    // Create line generator
    const line = d3.line()
      .x((d, i) => x(i))
      .y(d => y(d.metric))
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
        .ticks(isMonthlyData ? data.length : data.length * 2)
        .tickFormat((d, i) => {
          if (isMonthlyData) {
            return xAxisLabels[i] || '';
          } else {
            if (i === 0) return '';
            return xAxisLabels[(i - 1) / 2] || '';
          }
        }))
      .call(g => g.select('.domain').attr('stroke-opacity', 0.2));

    // Make labels vertical only for past two years
    if (timeRange === 'pastTwoYears') {
      xAxis.call(g => g.selectAll('.tick text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', 'rotate(-45)'));
    }

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

    // Add dots (ensure they're above the line)
    const dots = g.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', (d, i) => x(i))
      .attr('cy', d => y(d.metric))
      .attr('r', 6)
      .attr('fill', '#8884d8')
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    // Add tooltip functionality
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background-color', 'white')
      .style('padding', '5px')
      .style('border', '1px solid #ccc')
      .style('border-radius', '4px')
      .style('opacity', 0)
      .style('width', '0px')
      .style('height', '0px')
      .style('overflow', 'hidden')
      .style('pointer-events', 'none')
      .style('z-index', 1000);

    // Add hover effects to dots
    dots.on('mouseenter', function(event, d) {
      d3.select(this)
        .transition()
        .duration(150)
        .attr('r', 8)
        .attr('fill', '#5a67d8');
    })
    .on('mouseleave', function(event, d) {
      d3.select(this)
        .transition()
        .duration(150)
        .attr('r', 6)
        .attr('fill', '#8884d8');
    })
    .on('mouseover', (event, d) => {
      let tooltipTextContent = `Value: ${d.metric.toFixed(2)}`;
      if (isMonthlyData) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        tooltipTextContent = `${monthNames[d.month - 1]} ${d.year}: ${d.metric.toFixed(2)}`;
      } else {
        tooltipTextContent = `${d.financialYear}: ${d.metric.toFixed(2)}`;
      }
      
      // Set tooltip text
      tooltip.html(tooltipTextContent);
      
      // Get tooltip dimensions after setting content
      const tooltipNode = tooltip.node();
      const tooltipRect = tooltipNode.getBoundingClientRect();
      
      // Get chart container dimensions
      const chartRect = svg.node().getBoundingClientRect();
      
      // Calculate smart positioning
      let left = event.pageX + 10;
      let top = event.pageY - 28;
      
      // Check if tooltip would extend beyond right edge of chart
      if (left + tooltipRect.width > chartRect.right) {
        left = event.pageX - tooltipRect.width - 10;
      }
      
      // Check if tooltip would extend beyond left edge of chart
      if (left < chartRect.left) {
        left = chartRect.left + 10;
      }
      
      // Check if tooltip would extend beyond top edge of chart
      if (top < chartRect.top) {
        top = event.pageY + 10;
      }
      
      // Check if tooltip would extend beyond bottom edge of chart
      if (top + tooltipRect.height > chartRect.bottom) {
        top = event.pageY - tooltipRect.height - 10;
      }
      
      // Position tooltip
      tooltip
        .style('left', left + 'px')
        .style('top', top + 'px')
        .style('width', 'auto')
        .style('height', 'auto');
      
      // Show tooltip
      tooltip.transition()
        .duration(200)
        .style('opacity', .9);
    })
    .on('mouseout', () => {
      tooltip.transition()
        .duration(500)
        .style('opacity', 0)
        .on('end', () => {
          // Reset dimensions after opacity transition completes
          tooltip
            .style('width', '0px')
            .style('height', '0px');
        });
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
  }, [data, timeRange, height]);

  if (!data || data.length === 0) return <p>No data available for this metric in the selected time period.</p>

  return <svg ref={svgRef}></svg>
};

export default MetricChart; 