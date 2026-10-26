import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import MetricChart from './MetricChart.jsx';

/**
 * @typedef {Object} Corps
 * @property {string} id
 * @property {string} name
 * @property {string} area
 * @property {string} address
 * @property {string} city
 * @property {string | null} closingDate
 * @property {number | null} lat
 * @property {number | null} lng
 */

/**
 * @typedef {Object} MetricDefinition
 * @property {string} name
 * @property {string} label
 * @property {('year' | 'month')[]} granularities
 * @property {number[]} years
 */

/**
 * @typedef {'pastYear' | 'pastTwoYears' | 'pastFiveYears' | 'pastTenYears' | 'allTime' | 'future'} TimeRange
 */

/**
 * @typedef {Object} ChartPoint
 * @property {number} year
 * @property {number} [month]
 * @property {number} metric
 * @property {string} [financialYear]
 * @property {boolean} [isProjected]
 */

/**
 * Details and metric history of one corps
 * @param {{ corps: Corps | null }} props
 * @returns {React.JSX.Element}
 */
const CorpsDetails = ({ corps }) => {
  const [timeRange, setTimeRange] = useState(/** @type {TimeRange} */ ('pastYear'));
  const [selectedMetric, setSelectedMetric] = useState('congregationalWorship');
  const [metricData, setMetricData] = useState(/** @type {ChartPoint[]} */ ([]))
  const [isLoading, setIsLoading] = useState(false)
  const [metrics, setMetrics] = useState(/** @type {MetricDefinition[]} */ ([]))

  useEffect(() => {
    const fetchCatalogue = async () => {
      try {
        const response = await fetch('/api/catalogue')
        if (response.ok) {
          setMetrics((await response.json()).metrics)
        }
      } catch {
        console.error('Failed to fetch the metric catalogue')
      }
    }

    void fetchCatalogue()
  }, [])

  const definition = metrics.find(metric => metric.name === selectedMetric)
  const supportsMonthly = definition?.granularities.includes('month') ?? false
  const latestYear = definition?.years[definition.years.length - 1]
  const monthlyRanges = ['pastYear', 'pastTwoYears']
  const effectiveRange = supportsMonthly || !monthlyRanges.includes(timeRange) ? timeRange : 'allTime'

  useEffect(() => {
    /**
     * @param {number} year - Financial year
     * @returns {Promise<ChartPoint[]>}
     */
    const fetchMonthlyData = async (year) => {
      try {
        const response = await fetch(`/api/corps/${corps.id}/series/${selectedMetric}?granularity=month&year=${year}`)
        if (!response.ok) {
          return []
        }
        const data = await response.json()
        return data
      } catch {
        console.error(`Failed to fetch monthly metric data for ${year}`)
        return []
      }
    }

    /**
     * @returns {Promise<ChartPoint[]>}
     */
    const fetchYearlyData = async () => {
      try {
        const response = await fetch(`/api/corps/${corps.id}/series/${selectedMetric}`)
        if (!response.ok) {
          return []
        }
        const data = await response.json()
        return data.map(item => ({
          ...item,
          financialYear: `${item.year - 1}/${item.year.toString().slice(-2)}`,
          year: item.year
        }))
      } catch {
        console.error(`Failed to fetch yearly metric data`)
        return []
      }
    }

    /**
     * @param {TimeRange} range
     */
    const fetchMetricData = async (range) => {
      if (!corps || latestYear === undefined) return

      setIsLoading(true)
      try {
        let data = []
        const currentYear = latestYear

        // Use yearly data for 5Y, 10Y, and ALL TIME selections
        if (range === 'pastFiveYears' || range === 'pastTenYears' || range === 'allTime') {
          data = await fetchYearlyData()

          // Filter data based on time range
          if (range !== 'allTime') {
            const yearsToInclude = range === 'pastFiveYears' ? 5 : 10
            data = data.filter(item => item.year > currentYear - yearsToInclude)
          }
        } else if (range === 'future') {
          data = await fetchYearlyData()
          
          // Check if there's a data point for the current year
          const currentYearData = data.find(item => item.year === currentYear)
          if (!currentYearData) {
            // No current year data available, return empty array
            data = []
          } else {
            // Get the last 5 years of data for trend analysis
            const lastFiveYears = data.filter(item => item.year > currentYear - 5)
            
            if (lastFiveYears.length >= 2) {
            // Calculate linear changes between consecutive years
            const linearChanges = []
            for (let i = 1; i < lastFiveYears.length; i++) {
              const prevValue = lastFiveYears[i - 1].metric
              const currentValue = lastFiveYears[i].metric
              
              const linearChange = currentValue - prevValue
              linearChanges.push(linearChange)
            }
            
            // Calculate average linear change
            const avgLinearChange = linearChanges.length > 0 
              ? linearChanges.reduce((sum, change) => sum + change, 0) / linearChanges.length
              : 0
            
            // Get the latest value from the last 5 years
            const latestValue = lastFiveYears[lastFiveYears.length - 1].metric
            
            // Project 5 future data points using linear growth
            const futureData = []
            for (let i = 1; i <= 5; i++) {
              const futureYear = currentYear + i
              const projectedValue = latestValue + (avgLinearChange * i)
              
              futureData.push({
                year: futureYear,
                metric: Math.round(projectedValue * 100) / 100, // Round to 2 decimal places
                financialYear: `${futureYear - 1}/${futureYear.toString().slice(-2)}`,
                isProjected: true
              })
            }
            
            // Combine historical data with projected future data
            data = [...lastFiveYears, ...futureData]
            } else {
              // If not enough historical data, just return the available data
              data = lastFiveYears
            }
          }

        } else if (range === 'pastYear' || range === 'pastTwoYears') {
          let yearsToFetch

          switch (range) {
            case 'pastYear':
              yearsToFetch = 1
              break
            case 'pastTwoYears':
              yearsToFetch = 2
              break
            default:
              yearsToFetch = 0
          }

          const fetchPromises = []

          for (let i = 0; i < yearsToFetch; i++) {
            fetchPromises.push(fetchMonthlyData(currentYear - i))
          }

          const allYearsData = await Promise.all(fetchPromises)

          data = allYearsData
            .flat()
            .toSorted((a, b) => {
              // Sort by year first, then by month
              if (a.year !== b.year) {
                return a.year - b.year
              }
              return a.month - b.month
            })
        }

        setMetricData(data)
      } catch (error) {
        console.error(error)
        console.error(`Failed to fetch metric data`)
        setMetricData([])
      } finally {
        setIsLoading(false)
      }
    }

    void fetchMetricData(effectiveRange)
  }, [corps, effectiveRange, selectedMetric, latestYear])

  if (!corps) {
    return (
      <Box sx={{
        p: 3
      }}>
        <Typography variant="h6">
          Select a corps on the map to view details
        </Typography>
      </Box>
    );
  }

  /**
   * @param {React.MouseEvent<HTMLElement>} event
   * @param {TimeRange | null} newTimeRange
   */
  const handleTimeRangeChange = (event, newTimeRange) => {
    if (newTimeRange !== null) {
      setTimeRange(newTimeRange);
    }
  };

  return (
    <Paper
      sx={{
        p: 3
      }}>
      <Typography variant="h4" gutterBottom>
        {corps.name}
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        {corps.area}
      </Typography>
      <Typography variant="body1" paragraph>
        {corps.address}, {corps.city}
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Typography variant="h6" gutterBottom>
        Metrics History
      </Typography>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Select Metric</InputLabel>
        <Select
          value={selectedMetric}
          label="Select Metric"
          onChange={(e) => setSelectedMetric(e.target.value)}
        >
          {metrics.map((metric) => (
            <MenuItem key={metric.name} value={metric.name}>
              {metric.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <ToggleButtonGroup
        value={effectiveRange}
        exclusive
        onChange={handleTimeRangeChange}
        size="small"
        sx={{ mb: 2 }}
      >
        {supportsMonthly && <ToggleButton value="pastYear">1Y</ToggleButton>}
        {supportsMonthly && <ToggleButton value="pastTwoYears">2Y</ToggleButton>}
        <ToggleButton value="pastFiveYears">5Y</ToggleButton>
        <ToggleButton value="pastTenYears">10Y</ToggleButton>
        <ToggleButton value="allTime">ALL TIME</ToggleButton>
        <ToggleButton value="future">FUTURE</ToggleButton>
      </ToggleButtonGroup>

      <Box sx={{ height: 300, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isLoading ? (
          <CircularProgress />
        ) : (
          <MetricChart
            data={metricData}
            timeRange={effectiveRange}
            selectedMetric={selectedMetric}
            height={300}
          />
        )}
      </Box>
    </Paper>
  );
};

export default CorpsDetails;