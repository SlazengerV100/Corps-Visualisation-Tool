import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { ChartPoint, TimeRange } from './CorpsDetails.tsx';

const MetricChart = ({ data, timeRange, selectedMetric, height = 300 }: {
  data: ChartPoint[]
  timeRange: TimeRange
  selectedMetric: string
  height?: number
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svgElement = svgRef.current
    if (!svgElement || !data || data.length === 0) return undefined

    // Clear any existing chart
    d3.select(svgElement).selectAll('*').remove();

    // Create SVG
    const svg = d3.select(svgElement)
        .attr('width', '100%')
        .attr('height', height);

    // Set margins
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const innerWidth = svgElement.getBoundingClientRect().width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Determine if data is monthly or yearly based on data structure
    const isMonthlyData = data.some(d => d.month !== undefined);
    const monthDate = (d: ChartPoint) => new Date(d.year, (d.month ?? 1) - 1);

    // Only a surplus/deficit can fall below zero; a projection of anything else stops at zero
    const canBeNegative = selectedMetric === 'surplusDeficit'
    const floored = (d: ChartPoint) => canBeNegative ? d.metric : Math.max(d.metric, 0)

    const minMetric = d3.min(data, d => d.metric) ?? 0
    const maxMetric = d3.max(data, d => d.metric) ?? 0
    const y = d3.scaleLinear()
      .domain(canBeNegative ? [minMetric, maxMetric] : [0, maxMetric])
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
        .tickFormat(() => '')
      );

    // Improved axis handling with overlap prevention
    const createSmartAxis = (): { x: (value: Date | number) => number, axis: d3.Axis<Date | d3.NumberValue> } => {
      if (isMonthlyData) {
        // Use time scale for monthly data
        const [start, end] = d3.extent(data, monthDate);
        const x = d3.scaleTime()
          .domain(start && end ? [start, end] : [])
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
          axis: d3.axisBottom<Date | d3.NumberValue>(x)
            .ticks(tickInterval)
            .tickFormat(d => tickFormat(new Date(d.valueOf())))
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
        const tickPositions: number[] = [];
        for (let i = 0; i < data.length - 1; i += tickStep) {
          tickPositions.push(i + 0.5); // Always place ticks between data points
        }

        return {
          x,
          axis: d3.axisBottom<Date | d3.NumberValue>(x)
            .tickValues(tickPositions)
            .tickFormat(d => {
              const dataIndex = Math.floor(d.valueOf());
              if (dataIndex < data.length) {
                return String(data[dataIndex].year);
              }
              return '';
            })
        };
      }
    };

    const { x, axis: xAxisGenerator } = createSmartAxis();

    // Create line generator
    const line = d3.line<ChartPoint>()
      .x((d, i) => {
        if (isMonthlyData) {
          return x(monthDate(d));
        } else {
          return x(i);
        }
      })
      .y(d => y(d.metric))
      .curve(d3.curveMonotoneX);

    // Create x-axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxisGenerator)
      .call(axis => axis.select('.domain').attr('stroke-opacity', 0.2));

    // Add y-axis
    g.append('g')
      .call(d3.axisLeft(y)
        .tickSize(0))
      .call(axis => axis.select('.domain').attr('stroke-opacity', 0.2));

    // Create a custom line that changes from solid to dotted at the first projected point
    const futureStartIndex = data.findIndex(d => d.isProjected);

    if (futureStartIndex === -1) {
      // No future data, draw solid line
      g.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#8884d8')
        .attr('stroke-width', 2)
        .attr('d', line);
    } else {
      // Draw historical line (solid)
      const historicalData = data.slice(0, futureStartIndex);
      if (historicalData.length > 0) {
        g.append('path')
          .datum(historicalData)
          .attr('fill', 'none')
          .attr('stroke', '#8884d8')
          .attr('stroke-width', 2)
          .attr('d', line);
      }

      // Create a custom line generator for future data that uses original indices
      const futureLine = d3.line<ChartPoint>()
        .x(d => {
          if (isMonthlyData) {
            return x(monthDate(d));
          } else {
            // Find the original index in the full data array
            const originalIndex = data.findIndex(item => item.year === d.year);
            return x(originalIndex);
          }
        })
        .y(d => y(floored(d)))
        .curve(d3.curveMonotoneX);

      // Draw future line (dotted) starting from the last historical point
      const futureData = data.slice(futureStartIndex - 1); // Include last historical point for connection
      g.append('path')
        .datum(futureData)
        .attr('fill', 'none')
        .attr('stroke', '#8884d8')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('d', futureLine);
    }

    // Add dots (ensure they're above the line)
    const dots = g.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', (d, i) => {
        if (isMonthlyData) {
          return x(monthDate(d));
        } else {
          return x(i);
        }
      })
      .attr('cy', d => y(floored(d)))
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
    dots.on('mouseenter', function() {
      d3.select(this)
        .transition()
        .duration(150)
        .attr('r', 8)
        .attr('fill', '#5a67d8');
    })
    .on('mouseleave', function() {
      d3.select(this)
        .transition()
        .duration(150)
        .attr('r', 6)
        .attr('fill', '#8884d8');
    })
    .on('mouseover', (event: MouseEvent, d) => {
      const metricTextValue = selectedMetric === 'firstTimeDecisions' ? floored(d) : floored(d).toFixed(2)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const tooltipTextContent = isMonthlyData
        ? `${monthNames[(d.month ?? 1) - 1]} ${d.year}: ${metricTextValue}`
        : `${d.financialYear}: ${metricTextValue}`;

      // Set tooltip text
      tooltip.html(tooltipTextContent);

      // Get tooltip dimensions after setting content
      const tooltipNode = tooltip.node();
      if (!tooltipNode) return;
      const tooltipRect = tooltipNode.getBoundingClientRect();

      // Get chart container dimensions
      const chartRect = svgElement.getBoundingClientRect();

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

    // Animation for the lines
    const paths = g.selectAll<SVGPathElement, unknown>('path');

    paths.each(function() {
      const pathElement = d3.select(this);
      const pathLength = this.getTotalLength();

      if (pathElement.attr('stroke-dasharray') === '5,5') {
        // Future line (already dotted) - fade in
        pathElement
          .attr('opacity', 0)
          .transition()
          .duration(1000)
          .delay(500)
          .attr('opacity', 1);
      } else {
        // Historical line (solid) - draw animation
        pathElement
          .attr('stroke-dasharray', pathLength)
          .attr('stroke-dashoffset', pathLength)
          .transition()
          .duration(1000)
          .attr('stroke-dashoffset', 0);
      }
    });

    dots
      .attr('opacity', 0)
      .transition()
      .duration(1000)
      .attr('opacity', 1);

    // Cleanup function
    return () => {
      d3.select('body').selectAll('.tooltip').remove();
    };
  }, [data, timeRange, selectedMetric, height]);

  if (!data || data.length === 0) return <p>No data available for this metric in the selected time period.</p>

  return <svg ref={svgRef}></svg>
};

export default MetricChart;
