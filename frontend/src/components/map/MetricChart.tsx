import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { ChartPoint, TimeRange, Unit } from './CorpsDetails.tsx';

const count = new Intl.NumberFormat('en-NZ', { maximumFractionDigits: 1 });
const dollars = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 });

// The y-axis title, tick labels and tooltip figure for each unit
const unitFormats: Record<Unit, { title: string, tick: (value: d3.NumberValue) => string, figure: (value: number) => string }> = {
  people: { title: 'People', tick: d3.format(','), figure: value => `${count.format(value)} people` },
  decisions: { title: 'Decisions', tick: d3.format(','), figure: value => `${count.format(value)} decisions` },
  dollars: { title: 'Dollars', tick: d3.format('$~s'), figure: value => dollars.format(value) },
};

interface DrawnChart {
  projectionLayer: d3.Selection<SVGGElement, unknown, null, undefined>
  xOf: (d: ChartPoint) => number
  y: d3.ScaleLinear<number, number>
  floored: (d: ChartPoint) => number
  addDots: (parent: d3.Selection<SVGGElement, unknown, null, undefined>, points: ChartPoint[]) => d3.Selection<SVGCircleElement, ChartPoint, SVGGElement, unknown>
}

/**
 * Line chart of a metric across a fixed span of financial years, leaving out the years or months with no figure, followed by any dotted projection
 */
const MetricChart = ({ data, projected, timeRange, selectedMetric, unit, firstYear, lastYear, height = 300 }: {
  data: ChartPoint[]
  projected: ChartPoint[]
  timeRange: TimeRange
  selectedMetric: string
  unit: Unit
  firstYear: number
  lastYear: number
  height?: number
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const chartRef = useRef<DrawnChart | null>(null);

  useEffect(() => {
    const svgElement = svgRef.current
    chartRef.current = null
    if (!svgElement || !data || data.length === 0) return undefined

    // Clear any existing chart
    d3.select(svgElement).selectAll('*').remove();

    // Create SVG
    const svg = d3.select(svgElement)
        .attr('width', '100%')
        .attr('height', height);

    // Set margins
    const margin = { top: 20, right: 30, bottom: 40, left: 70 };
    const format = unitFormats[unit];
    const innerWidth = svgElement.getBoundingClientRect().width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Determine if data is monthly or yearly based on data structure
    const isMonthlyData = data.some(d => d.month !== undefined);
    const monthDate = (d: ChartPoint) => new Date(d.year, (d.month ?? 1) - 1);

    // Only a surplus/deficit can fall below zero; a projection of anything else stops at zero
    const canBeNegative = selectedMetric === 'surplusDeficit'
    const floored = (d: ChartPoint) => canBeNegative ? d.metric : Math.max(d.metric, 0)

    const scaled = [...data, ...projected]
    const minMetric = d3.min(scaled, d => Math.min(d.metric, d.low ?? d.metric)) ?? 0
    const maxMetric = d3.max(scaled, d => Math.max(d.metric, d.high ?? d.metric)) ?? 0
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
        // Use time scale for monthly data, from the July starting the first financial year to the June ending the last
        const x = d3.scaleTime()
          .domain([monthDate({ year: firstYear - 1, month: 7, metric: 0 }), monthDate({ year: lastYear, month: 6, metric: 0 })])
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
        // For yearly data, use linear scale across every year in the span
        const x = d3.scaleLinear()
          .domain([firstYear, lastYear])
          .range([0, innerWidth]);

        // Label every year that fits
        const maxTicks = Math.floor(innerWidth / 80); // 80px per label
        const tickStep = Math.max(1, Math.ceil((lastYear - firstYear + 1) / maxTicks));

        return {
          x,
          axis: d3.axisBottom<Date | d3.NumberValue>(x)
            .tickValues(d3.range(firstYear, lastYear + 1, tickStep))
            .tickFormat(d => String(d.valueOf()))
        };
      }
    };

    const { x, axis: xAxisGenerator } = createSmartAxis();
    const xOf = (d: ChartPoint) => isMonthlyData ? x(monthDate(d)) : x(d.year);

    // Create line generator, joining the points either side of a missing year or month
    const line = d3.line<ChartPoint>()
      .x(xOf)
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
        .tickSize(0)
        .tickFormat(format.tick))
      .call(axis => axis.select('.domain').attr('stroke-opacity', 0.2));

    // Name the y-axis's unit, centred alongside it
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -margin.left)
      .attr('dy', '1em')
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('font-weight', 'bold')
      .text(format.title);

    // The projection draws into its own layer, beneath the history
    const projectionLayer = g.append('g');

    // Draw the history with a line that draws itself in
    const historyPath = g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#8884d8')
      .attr('stroke-width', 2)
      .attr('d', line);
    const pathLength = historyPath.node()?.getTotalLength() ?? 0;
    historyPath
      .attr('stroke-dasharray', pathLength)
      .attr('stroke-dashoffset', pathLength)
      .transition()
      .duration(1000)
      .attr('stroke-dashoffset', 0);

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

    const addDots = (parent: d3.Selection<SVGGElement, unknown, null, undefined>, points: ChartPoint[]) => parent.selectAll<SVGCircleElement, ChartPoint>('.dot')
      .data(points)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', xOf)
      .attr('cy', d => y(floored(d)))
      .attr('r', 6)
      .attr('fill', '#8884d8')
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      // Add hover effects to dots
      .on('mouseenter', function() {
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
        const range = d.low !== undefined && d.high !== undefined ? `, ${format.figure(d.low)} to ${format.figure(d.high)}` : ''
        const metricTextValue = `${format.figure(floored(d))}${d.isProjected ? ` (projected${range})` : ''}`
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

    // Add dots (ensure they're above the line)
    addDots(g, data)
      .attr('opacity', 0)
      .transition()
      .duration(1000)
      .attr('opacity', 1);

    chartRef.current = { projectionLayer, xOf, y, floored, addDots }

    // Cleanup function
    return () => {
      d3.select('body').selectAll('.tooltip').remove();
    };
  }, [data, projected, timeRange, selectedMetric, unit, firstYear, lastYear, height]);

  // Draw the projection into its layer once the chart above has drawn
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const { projectionLayer, xOf, y, floored, addDots } = chart
    projectionLayer.selectAll('*').remove()
    if (projected.length === 0) return

    // Start from the last recorded point so the projection joins the history
    const last = data[data.length - 1]
    const joined = last && last.year < projected[0].year ? [last, ...projected] : projected

    // Shade the projection's margin for error, widening from the last recorded point
    projectionLayer.append('path')
      .datum(joined)
      .attr('fill', '#8884d8')
      .attr('opacity', 0.2)
      .attr('d', d3.area<ChartPoint>()
        .x(xOf)
        .y0(d => y(d.low ?? d.metric))
        .y1(d => y(d.high ?? d.metric))
        .curve(d3.curveMonotoneX));

    projectionLayer.append('path')
      .datum(joined)
      .attr('fill', 'none')
      .attr('stroke', '#8884d8')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('d', d3.line<ChartPoint>()
        .x(xOf)
        .y(d => y(floored(d)))
        .curve(d3.curveMonotoneX));

    addDots(projectionLayer, projected)

    projectionLayer
      .attr('opacity', 0)
      .transition()
      .duration(500)
      .attr('opacity', 1);
  }, [projected, data, timeRange, selectedMetric, unit, firstYear, lastYear, height]);

  if (!data || data.length === 0) return <p>No data available for this metric in the selected time period.</p>

  return <svg ref={svgRef}></svg>
};

export default MetricChart;
