import React, { useEffect, useMemo, useState } from 'react';
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
  region: string
  closingDate: string | null
  lat: number
  lng: number
}

export type Unit = 'people' | 'decisions' | 'dollars'

interface MetricDefinition {
  name: string
  label: string
  unit: Unit
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
  low?: number
  high?: number
}

export interface MatchLine {
  colour: string
  points: ChartPoint[]
}

interface Match {
  id: string
  name: string
  year: number
  similarity: number
  metrics: Record<string, { year: number, metric: number }[]>
}

// The projection keeps the chart's purple; each match gets its own colour
const projectionColour = '#8884d8'
const matchColours = ['#f28e2b', '#59a14f', '#e15759']

interface Projection {
  window: number
  year: number
  matches: Match[]
  metrics: Record<string, { year: number, metric: number, low: number, high: number }[]>
}

const financialYearLabel = (year: number) => `${year - 1}/${year.toString().slice(-2)}`

const projectedPoints = (projection: Projection | null, metric: string): ChartPoint[] =>
  (projection?.metrics[metric] ?? []).map(point => ({ ...point, financialYear: financialYearLabel(point.year), isProjected: true }))

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
  const [projection, setProjection] = useState<Projection | null>(null)

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
          financialYear: financialYearLabel(item.year),
          year: item.year
        }))
      } catch {
        console.error(`Failed to fetch yearly metric data`)
        return []
      }
    }

    // The API's default window length
    const fetchProjection = async (): Promise<Projection | null> => {
      try {
        const response = await fetch(`/api/corps/${corps.id}/projection`)
        if (!response.ok) {
          return null
        }
        const data: Projection = await response.json()
        return data
      } catch {
        console.error(`Failed to fetch the projection`)
        return null
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
          const [history, fetched] = await Promise.all([fetchYearlyData(), fetchProjection()])
          setProjection(fetched)
          data = history.filter(item => item.year >= firstYear)
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

  const projected = useMemo(
    () => effectiveRange === 'future' ? projectedPoints(projection, selectedMetric) : [],
    [effectiveRange, projection, selectedMetric]
  )

  const matchLines = useMemo((): MatchLine[] => effectiveRange !== 'future' || !projection || firstYear === undefined ? [] : projection.matches.map((match, i) => ({
    colour: matchColours[i % matchColours.length],
    points: (match.metrics[selectedMetric] ?? [])
      .filter(point => point.year >= firstYear)
      .map(point => ({ ...point, financialYear: financialYearLabel(point.year) }))
  })), [effectiveRange, projection, selectedMetric, firstYear])

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
        {[corps.address, corps.city].filter(Boolean).join(', ')}
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
        {isLoading || !definition || firstYear === undefined || lastYear === undefined ? (
          <CircularProgress />
        ) : (
          <MetricChart
            data={metricData}
            projected={projected}
            matches={matchLines}
            timeRange={effectiveRange}
            selectedMetric={selectedMetric}
            unit={definition.unit}
            firstYear={firstYear}
            lastYear={lastYear}
            height={300}
          />
        )}
      </Box>
      {effectiveRange === 'future' && (
        <Box sx={{ mt: 2 }}>
          {isLoading ? null : !projection ? (
            <Typography variant="body2" color="text.secondary">
              This corps is missing a worship figure in one of its recent years, so it can't be matched.
            </Typography>
          ) : projection.matches.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No other corps was ever in a position close enough to this one's to project from.
            </Typography>
          ) : !(selectedMetric in projection.metrics) ? (
            <Typography variant="body2" color="text.secondary">
              {definition?.label ?? 'This metric'} helps find similar corps but isn't projected.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 3, rowGap: 0.5 }}>
              {projected.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 24, height: 10, bgcolor: `${projectionColour}33`, borderTop: `2px dashed ${projectionColour}` }} />
                  <Typography variant="body2">Projection and spread</Typography>
                </Box>
              )}
              {projection.matches.map((match, i) => (
                <Box key={match.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 24, borderTop: `2px solid ${matchLines[i]?.colour}` }} />
                  <Typography variant="body2">
                    {match.name} {financialYearLabel(match.year - projection.window + 1)}–{financialYearLabel(match.year)}, <strong>{match.similarity}%</strong> similar
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default CorpsDetails;