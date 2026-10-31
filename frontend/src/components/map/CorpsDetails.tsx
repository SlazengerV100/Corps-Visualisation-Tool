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
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MetricChart from './MetricChart.tsx';

export interface Corps {
  id: string
  name: string
  area: string
  address: string
  city: string
  closingDate: string | null
  lat: number
  lng: number
}

interface MetricDefinition {
  name: string
  label: string
  granularities: ('year' | 'month')[]
  years: number[]
}

export type TimeRange = 'pastYear' | 'pastTwoYears' | 'pastFiveYears' | 'pastTenYears' | 'allTime' | 'future'

export interface ChartPoint {
  year: number
  month?: number
  metric: number
  financialYear?: string
  isProjected?: boolean
}

// How many financial years each range covers, counting back from the latest; FUTURE projects as many again
const rangeYears: Record<Exclude<TimeRange, 'allTime'>, number> = {
  pastYear: 1,
  pastTwoYears: 2,
  pastFiveYears: 5,
  pastTenYears: 10,
  future: 5,
}

/**
 * Details and metric history of one corps, with a button to close them
 */
const CorpsDetails = ({ corps, onClose }: { corps: Corps, onClose: () => void }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('pastYear');
  const [selectedMetric, setSelectedMetric] = useState('congregationalWorship');
  const [metricData, setMetricData] = useState<ChartPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [metrics, setMetrics] = useState<MetricDefinition[]>([])

  useEffect(() => {
    const fetchCatalogue = async () => {
      try {
        const response = await fetch('/api/catalogue')
        if (response.ok) {
          const catalogue: { metrics: MetricDefinition[] } = await response.json()
          setMetrics(catalogue.metrics)
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
  const monthlyRanges: TimeRange[] = ['pastYear', 'pastTwoYears']
  const effectiveRange = supportsMonthly || !monthlyRanges.includes(timeRange) ? timeRange : 'allTime'
  // The chart spans these financial years whether or not the corps has a figure for each
  const firstYear = latestYear === undefined || effectiveRange === 'allTime' ? definition?.years[0] : latestYear - rangeYears[effectiveRange] + 1
  const lastYear = latestYear !== undefined && effectiveRange === 'future' ? latestYear + rangeYears.future : latestYear

  useEffect(() => {
    const fetchMonthlyData = async (year: number): Promise<ChartPoint[]> => {
      try {
        const response = await fetch(`/api/corps/${corps.id}/series/${selectedMetric}?granularity=month&year=${year}`)
        if (!response.ok) {
          return []
        }
        const data: ChartPoint[] = await response.json()
        return data
      } catch {
        console.error(`Failed to fetch monthly metric data for ${year}`)
        return []
      }
    }

    const fetchYearlyData = async (): Promise<ChartPoint[]> => {
      try {
        const response = await fetch(`/api/corps/${corps.id}/series/${selectedMetric}`)
        if (!response.ok) {
          return []
        }
        const data: ChartPoint[] = await response.json()
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

    const fetchMetricData = async (range: TimeRange) => {
      if (latestYear === undefined || firstYear === undefined) return

      setIsLoading(true)
      try {
        let data: ChartPoint[] = []
        const currentYear = latestYear

        // Use yearly data for 5Y, 10Y, and ALL TIME selections
        if (range === 'pastFiveYears' || range === 'pastTenYears' || range === 'allTime') {
          data = (await fetchYearlyData()).filter(item => item.year >= firstYear)
        } else if (range === 'future') {
          // Get the last 5 years of data for trend analysis
          const lastFiveYears = (await fetchYearlyData()).filter(item => item.year >= firstYear)

          // Check if there's a data point for the current year
          if (!lastFiveYears.some(item => item.year === currentYear)) {
            // No current year data available, return empty array
            data = []
          } else {
            if (lastFiveYears.length >= 2) {
            // Calculate linear changes between consecutive years
            const linearChanges: number[] = []
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
            const futureData: ChartPoint[] = []
            for (let i = 1; i <= rangeYears.future; i++) {
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
          const fetchPromises: Promise<ChartPoint[]>[] = []

          for (let year = firstYear; year <= currentYear; year++) {
            fetchPromises.push(fetchMonthlyData(year))
          }

          const allYearsData = await Promise.all(fetchPromises)

          data = allYearsData
            .flat()
            .toSorted((a, b) => {
              // Sort by year first, then by month
              if (a.year !== b.year) {
                return a.year - b.year
              }
              return (a.month ?? 0) - (b.month ?? 0)
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
  }, [corps, effectiveRange, selectedMetric, latestYear, firstYear])

  const handleTimeRangeChange = (event: React.MouseEvent<HTMLElement>, newTimeRange: TimeRange | null) => {
    if (newTimeRange !== null) {
      setTimeRange(newTimeRange);
    }
  };

  return (
    <Paper
      sx={{
        p: 3
      }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Typography variant="h4" gutterBottom>
          {corps.name}
        </Typography>
        <IconButton aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        {corps.area}
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
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
        {isLoading || firstYear === undefined || lastYear === undefined ? (
          <CircularProgress />
        ) : (
          <MetricChart
            data={metricData}
            timeRange={effectiveRange}
            selectedMetric={selectedMetric}
            firstYear={firstYear}
            lastYear={lastYear}
            height={300}
          />
        )}
      </Box>
    </Paper>
  );
};

export default CorpsDetails;