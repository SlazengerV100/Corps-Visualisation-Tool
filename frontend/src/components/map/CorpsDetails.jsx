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

const CorpsDetails = ({ corps }) => {
  const serverUrl = import.meta.env.VITE_SERVER_URL
  const [timeRange, setTimeRange] = useState('pastYear');
  const [selectedMetric, setSelectedMetric] = useState('congregationalWorship');
  const [metricData, setMetricData] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const availableMetrics = [
    { value: 'congregationalWorship', label: 'Congregational Worship' },
    { value: 'firstTimeDecisions', label: 'First Time Decisions' },
    { value: 'kidsChurch', label: 'Kid\'s Church' },
    { value: 'youthDiscipleship', label: 'Youth Discipleship' }
  ]

  const fetchMonthlyData = async (year) => {
    try {
      // Map metric names to metric codes
      const metricToCode = {
        'congregationalWorship': '01-Congregational Worship',
        'firstTimeDecisions': '03A-First Time Decisions',
        'kidsChurch': '04-Kids Church',
        'youthDiscipleship': '05-Youth Discipleship'
      }
      
      const metricCode = metricToCode[selectedMetric]
      const response = await fetch(`${serverUrl}/api/corps/${corps.id}/${selectedMetric}/byMonth/${year}`)
      if (!response.ok) {
        return []
      }
      const data = await response.json()
      return data.map(item => ({
        ...item,
        value: item.metric, // Map metric to value for consistency
        financialYear: `${year - 1}/${year.toString().slice(-2)}`,
        period: `${item.year}-${item.month.toString().padStart(2, '0')}`
      }))
    } catch (error) {
      console.error(`Failed to fetch monthly metric data for ${year}`)
      return []
    }
  }

  const fetchYearlyData = async (year) => {
    try {
      const response = await fetch(`${serverUrl}/api/corps/metrics/${year}`)
      if (!response.ok) {
        return null
      }
      const data = await response.json()
      const corpsData = data.find(item => item.id === corps.id)
      return corpsData ? {
        value: corpsData.metrics[selectedMetric]?.currentYear || 0,
        year: year,
        financialYear: `${year - 1}/${year.toString().slice(-2)}`,
        period: year.toString()
      } : null
    } catch (error) {
      console.error(`Failed to fetch yearly metric data for ${year}`)
      return null
    }
  }

  const fetchMetricData = async (range) => {
    if (!corps) return
    
    setIsLoading(true)
    try {
      let data = []
      const currentYear = new Date().getFullYear()

      switch (range) {
        case 'pastYear':
          // Get current year monthly data
          data = await fetchMonthlyData(currentYear)
          break

        case 'pastTwoYears':
          // Get monthly data for current year and previous year
          const [currentYearData, prevYearData] = await Promise.all([
            fetchMonthlyData(currentYear),
            fetchMonthlyData(currentYear - 1)
          ])
          data = [...prevYearData, ...currentYearData].sort((a, b) => {
            // Sort by year first, then by month
            if (a.year !== b.year) {
              return a.year - b.year
            }
            return a.month - b.month
          })
          break

        case 'pastFiveYears':
          // Get yearly data for past 5 years
          const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
          const yearlyData = await Promise.all(years.map(year => fetchYearlyData(year)))
          data = yearlyData.filter(item => item !== null).sort((a, b) => a.year - b.year)
          break

        case 'allTime':
          // Get yearly data from 2010 to current year
          const allYears = Array.from({ length: currentYear - 2009 }, (_, i) => currentYear - i)
          const allTimeData = await Promise.all(allYears.map(year => fetchYearlyData(year)))
          data = allTimeData.filter(item => item !== null).sort((a, b) => a.year - b.year)
          break

        default:
          data = []
      }

      setMetricData(data)
    } catch (error) {
      console.error(`Failed to fetch metric data`)
      setMetricData([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMetricData(timeRange)
  }, [serverUrl, corps, timeRange, selectedMetric])

  if (!corps) {
    return (
      <Paper sx={{ 
        p: 3
      }}>
        <Typography variant="h6">
          Select a corps on the map to view details
        </Typography>
      </Paper>
    );
  }

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
        {corps.address}
      </Typography>
      <Typography variant="body1" paragraph>
        {corps.city}
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
          {availableMetrics.map((metric) => (
            <MenuItem key={metric.value} value={metric.value}>
              {metric.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <ToggleButtonGroup
        value={timeRange}
        exclusive
        onChange={handleTimeRangeChange}
        size="small"
        sx={{ mb: 2 }}
      >
        <ToggleButton value="pastYear">1Y</ToggleButton>
        <ToggleButton value="pastTwoYears">2Y</ToggleButton>
        <ToggleButton value="pastFiveYears">5Y</ToggleButton>
        <ToggleButton value="allTime">ALL TIME</ToggleButton>
      </ToggleButtonGroup>

      <Box sx={{ height: 300, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isLoading ? (
          <CircularProgress />
        ) : (
          <MetricChart 
            data={metricData}
            width={600}
            height={300}
          />
        )}
      </Box>
    </Paper>
  );
};

export default CorpsDetails;