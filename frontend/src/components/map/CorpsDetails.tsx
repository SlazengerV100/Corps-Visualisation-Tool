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
import SimilarCorpsExplanationDialog from './SimilarCorpsExplanationDialog.tsx';

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
  projected: boolean
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
}

interface MetricMatch extends Match {
  points: { year: number, metric: number }[]
}

interface Projection {
  window: number
  year: number
  matches: Match[]
  metrics: Record<string, { matches: MetricMatch[], points: { year: number, metric: number, low: number, high: number }[] }>
}

// The projection keeps the chart's purple; each match gets its own colour
const projectionColour = '#8884d8'
const matchColours = ['#f28e2b', '#59a14f', '#e15759']

// Red at the lowest similarity a match can have, 50, through to green at 100, dark enough to read as text
const confidenceColour = (similarity: number) => `hsl(${Math.min(Math.max((similarity - 50) / 50, 0), 1) * 120}, 75%, 40%)`

const financialYearLabel = (year: number) => `${year - 1}/${year.toString().slice(-2)}`

// Outside FUTURE the chart gets these same empty arrays whatever projection loads, so loading one doesn't redraw the chart
const noProjection: ChartPoint[] = []
const noMatchLines: MatchLine[] = []

const projectedPoints = (projection: Projection | null | undefined, metric: string): ChartPoint[] =>
  (projection?.metrics[metric]?.points ?? []).map(point => ({ ...point, financialYear: financialYearLabel(point.year), isProjected: true }))

// How many financial years each range covers, counting back from the latest; FUTURE covers the projection's window back and as many years ahead
const rangeYears: Record<Exclude<TimeRange, 'allTime' | 'future'>, number> = {
  pastYear: 1,
  pastTwoYears: 2,
  pastFiveYears: 5,
  pastTenYears: 10,
}

/**
 * Section heading with an info button that opens its explanation
 */
const ExplainedHeading = ({ variant, title, onExplain }: { variant: 'h6' | 'subtitle1', title: string, onExplain: () => void }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
    <Typography variant={variant} sx={{ fontWeight: variant === 'subtitle1' ? 'bold' : undefined }}>
      {title}
    </Typography>
    <IconButton size="small" color="primary" aria-label="How similar corps are found" onClick={onExplain}>
      ⓘ
    </IconButton>
  </Box>
)

/**
 * Each similar corps with its similarity in a circle coloured from red to green, and the years it matched on
 */
const SimilarCorpsList = ({ matches, window }: { matches: Match[], window: number }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 4, rowGap: 2 }}>
    {matches.map(match => {
      const colour = confidenceColour(match.similarity)
      return (
        <Box key={match.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress variant="determinate" value={100} size={48} thickness={4} sx={{ color: colour, opacity: 0.2 }} />
            <CircularProgress variant="determinate" value={match.similarity} size={48} thickness={4} sx={{ color: colour, position: 'absolute', left: 0 }} />
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: colour }}>
                {match.similarity}
              </Typography>
            </Box>
          </Box>
          <Box>
            <Typography variant="body1">{match.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {financialYearLabel(match.year - window + 1)}–{financialYearLabel(match.year)}
            </Typography>
          </Box>
        </Box>
      )
    })}
  </Box>
)

/**
 * Details and metric history of one corps, with a button to close them
 */
const CorpsDetails = ({ corps, onClose }: { corps: Corps, onClose: () => void }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('pastYear');
  const [selectedMetric, setSelectedMetric] = useState('congregationalWorship');
  const [metricData, setMetricData] = useState<ChartPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [metrics, setMetrics] = useState<MetricDefinition[]>([])
  const [explaining, setExplaining] = useState<'overall' | 'metric' | null>(null)
  // How many years similar corps are matched on and projected ahead
  const [windowYears, setWindowYears] = useState<number | null>(null)
  const [loadedProjection, setLoadedProjection] = useState<{ corpsId: string, projection: Projection | null } | null>(null)
  // Undefined while this corps' projection loads, null when the corps can't be matched
  const projection = loadedProjection?.corpsId === corps.id ? loadedProjection.projection : undefined

  useEffect(() => {
    const fetchCatalogue = async () => {
      try {
        const response = await fetch('/api/catalogue')
        if (response.ok) {
          const catalogue: { metrics: MetricDefinition[], projection: { defaultWindow: number } } = await response.json()
          setMetrics(catalogue.metrics)
          setWindowYears(catalogue.projection.defaultWindow)
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
  const projectable = definition?.projected ?? false
  const effectiveRange = !supportsMonthly && monthlyRanges.includes(timeRange) ? 'allTime' : !projectable && timeRange === 'future' ? 'pastFiveYears' : timeRange
  // The chart spans these financial years whether or not the corps has a figure for each
  const rangeLength = effectiveRange === 'future' ? windowYears : effectiveRange === 'allTime' ? null : rangeYears[effectiveRange]
  const firstYear = latestYear === undefined || effectiveRange === 'allTime' ? definition?.years[0] : rangeLength === null ? undefined : latestYear - rangeLength + 1
  const lastYear = latestYear !== undefined && effectiveRange === 'future' ? (windowYears === null ? undefined : latestYear + windowYears) : latestYear

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

    const fetchMetricData = async (range: TimeRange) => {
      if (latestYear === undefined || firstYear === undefined) return

      setIsLoading(true)
      try {
        let data: ChartPoint[] = []
        const currentYear = latestYear

        // Use yearly data for 5Y, 10Y, ALL TIME and FUTURE selections
        if (range === 'pastFiveYears' || range === 'pastTenYears' || range === 'allTime' || range === 'future') {
          data = (await fetchYearlyData()).filter(item => item.year >= firstYear)
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

  // Without a window parameter, so the API's default length applies
  useEffect(() => {
    const fetchProjection = async () => {
      try {
        const response = await fetch(`/api/corps/${corps.id}/projection`)
        const data: Projection | null = response.ok ? await response.json() : null
        setLoadedProjection({ corpsId: corps.id, projection: data })
      } catch {
        console.error(`Failed to fetch the projection`)
        setLoadedProjection({ corpsId: corps.id, projection: null })
      }
    }

    void fetchProjection()
  }, [corps])

  const projected = useMemo(
    () => effectiveRange === 'future' ? projectedPoints(projection, selectedMetric) : noProjection,
    [effectiveRange, projection, selectedMetric]
  )

  const metricMatches = useMemo(() => projection?.metrics[selectedMetric]?.matches ?? [], [projection, selectedMetric])

  const matchLines = useMemo((): MatchLine[] => effectiveRange !== 'future' || firstYear === undefined ? noMatchLines : metricMatches.map((match, i) => ({
    colour: matchColours[i % matchColours.length],
    points: match.points
      .filter(point => point.year >= firstYear)
      .map(point => ({ ...point, financialYear: financialYearLabel(point.year) }))
  })), [effectiveRange, metricMatches, firstYear])

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

      <ExplainedHeading variant="h6" title="Similar Corps" onExplain={() => setExplaining('overall')} />

      {projection === undefined ? (
        <CircularProgress size={24} />
      ) : !projection ? (
        <Typography variant="body2" color="text.secondary">
          This corps is missing a worship figure in one of its last {windowYears} years, so it can't be matched.
        </Typography>
      ) : projection.matches.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No corps was ever in a position close enough to this one's.
        </Typography>
      ) : (
        <SimilarCorpsList matches={projection.matches} window={projection.window} />
      )}

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

      <ExplainedHeading variant="subtitle1" title="Similar Corps" onExplain={() => setExplaining('metric')} />

      {!projectable ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {definition?.label ?? 'This metric'} helps find similar corps but isn't matched or projected on its own.
        </Typography>
      ) : projection === undefined ? (
        <CircularProgress size={24} sx={{ mb: 2 }} />
      ) : !projection ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This corps is missing a worship figure in one of its last {windowYears} years, so it can't be matched.
        </Typography>
      ) : (
        <Box sx={{ mb: 2 }}>
          {metricMatches.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {definition?.label ?? 'This metric'} needs a figure in every recent year, for this corps and a similar one, to be matched.
            </Typography>
          ) : (
            <SimilarCorpsList matches={metricMatches} window={projection.window} />
          )}
        </Box>
      )}

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
        {projectable && <ToggleButton value="future">FUTURE</ToggleButton>}
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
      {effectiveRange === 'future' && !isLoading && (projected.length > 0 || metricMatches.length > 0) && (
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', columnGap: 3, rowGap: 0.5 }}>
          {projected.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 24, height: 10, bgcolor: `${projectionColour}33`, borderTop: `2px dashed ${projectionColour}` }} />
              <Typography variant="body2">Projection and spread</Typography>
            </Box>
          )}
          {metricMatches.map((match, i) => (
            <Box key={match.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 24, borderTop: `2px solid ${matchLines[i]?.colour}` }} />
              <Typography variant="body2">{match.name}</Typography>
            </Box>
          ))}
        </Box>
      )}
      <SimilarCorpsExplanationDialog
        open={explaining !== null}
        onClose={() => setExplaining(null)}
        perMetric={explaining === 'metric'}
        years={windowYears}
      />
    </Paper>
  );
};

export default CorpsDetails;