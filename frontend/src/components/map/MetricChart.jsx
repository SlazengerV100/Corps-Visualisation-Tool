import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const MetricChart = ({ data, timeRange, selectedMetric, height = 300 }) => {
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

    const yDomain = () => {
      const min = d3.min(data, d => d.metric)
      const max = d3.max(data, d => d.metric)
      if (min < 0) {
        return [min, max]
      }
      if (max === 0) {
        return [0, 1]
      }
      return [0, d3.max(data, d => d.metric)]
    }

    const y = d3.scaleLinear()
      .domain(selectedMetric === 'surplusDeficit' ? [d3.min(data, d => d.metric), d3.max(data, d => d.metric)] : [0, d3.max(data, d => d.metric)])
      .nice()
      .range([innerHeight, 0]);

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

    // Improved axis handling with overlap prevention
    const createSmartAxis = (data, innerWidth, timeRange) => {
      const isMonthlyData = data.some(d => d.month !== undefined);
      
      if (isMonthlyData) {
        // Use time scale for monthly data
        const x = d3.scaleTime()
          .domain(d3.extent(data, d => new Date(d.year, d.month - 1)))
          .range([0, innerWidth]);
        
        // Smart tick selection based on time range
        let tickInterval, tickFormat;
        switch (timeRange) {
          case 'pastYear':
            tickInterval = d3.timeMonth.every(1);
            tickFormat = d3.timeFormat("%b");
            break;
          case 'pastTwoYears':
            tickInterval = d3.timeMonth.every(2);
            tickFormat = d3.timeFormat("%b %y");
            break;
          default:
            tickInterval = d3.timeMonth.every(3);
            tickFormat = d3.timeFormat("%b %y");
        }
        
        return {
          x,
          axis: d3.axisBottom(x)
            .ticks(tickInterval)
            .tickFormat(tickFormat)
        };
      } else {
        // For yearly data, use linear scale with smart spacing
        const x = d3.scaleLinear()
          .domain([0, data.length - 1])
          .range([0, innerWidth]);
        
        // Calculate optimal number of ticks
        const maxTicks = Math.floor(innerWidth / 80); // 80px per label
        const tickStep = Math.max(1, Math.floor(data.length / maxTicks));
        
        // Create tick positions that are always in between data points
        // We want ticks at positions: 0.5, 1.5, 2.5, etc. (between data points)
        const tickPositions = [];
        for (let i = 0; i < data.length - 1; i += tickStep) {
          tickPositions.push(i + 0.5); // Always place ticks between data points
        }
        
        return {
          x,
          axis: d3.axisBottom(x)
            .tickValues(tickPositions)
            .tickFormat((d, i) => {
              const dataIndex = Math.floor(d);
              if (dataIndex < data.length) {
                return data[dataIndex].year;
              }
              return '';
            })
        };
      }
    };

    const { x, axis: xAxisGenerator } = createSmartAxis(data, innerWidth, timeRange);

    // Create line generator
    const line = d3.line()
      .x((d, i) => {
        if (isMonthlyData) {
          return x(new Date(d.year, d.month - 1));
        } else {
          return x(i);
        }
      })
      .y(d => y(d.metric))
      .curve(d3.curveMonotoneX);

    // Create x-axis
    const xAxis = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxisGenerator)
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

    // Add dots (ensure they're above the line)
    const dots = g.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', (d, i) => {
        if (isMonthlyData) {
          return x(new Date(d.year, d.month - 1));
        } else {
          return x(i);
        }
      })
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
      const metricTextValue = selectedMetric === 'firstTimeDecisions' ? d.metric : d.metric.toFixed(2)
      let tooltipTextContent = `Value: ${metricTextValue}`;
      if (isMonthlyData) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        tooltipTextContent = `${monthNames[d.month - 1]} ${d.year}: ${metricTextValue}`;
      } else {
        tooltipTextContent = `${d.financialYear}: ${metricTextValue}`;
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