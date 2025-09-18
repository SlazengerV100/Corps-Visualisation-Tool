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
    { value: 'youthDiscipleship', label: 'Youth Discipleship' },
    { value: 'tithing', label: 'Tithing' },
    { value: 'surplusDeficit', label: 'Surplus/Deficit' },
  ]

  const fetchMonthlyData = async (year) => {
    try {
      const response = await fetch(`${serverUrl}/api/corps/${corps.id}/${selectedMetric}/byMonth/${year}`)
      if (!response.ok) {
        return []
      }
      const data = await response.json()
      return data
    } catch (error) {
      console.error(`Failed to fetch monthly metric data for ${year}`)
      return []
    }
  }

  const fetchYearlyData = async () => {
    try {
      const response = await fetch(`${serverUrl}/api/corps/${corps.id}/${selectedMetric}/byYear`)
      if (!response.ok) {
        return []
      }
      const data = await response.json()
      return data.map(item => ({
        ...item,
        financialYear: `${item.year - 1}/${item.year.toString().slice(-2)}`,
        year: item.year
      }))
    } catch (error) {
      console.error(`Failed to fetch yearly metric data`)
      return []
    }
  }

  const fetchSurplusDeficitYearlyData = async () => {
    try {
      const response = await fetch(`${serverUrl}/api/corps/${corps.location}/surplusDeficit/byYear`)
      if (!response.ok) {
        return []
      }
      const data = await response.json()
      return data
    } catch (error) {
      console.error(`Failed to fetch surplus/deficit yearly data`)
      return []
    }
  }

  const fetchMetricData = async (range) => {
    if (!corps) return

    setIsLoading(true)
    try {
      let data = []
      
      // Use yearly data for 5Y, 10Y, and ALL TIME selections
      if (timeRange === 'pastFiveYears' || timeRange === 'pastTenYears' || timeRange === 'allTime') {
        data = await fetchYearlyData()
        
        // Filter data based on time range
        const currentYear = new Date().getFullYear()
        let yearsToInclude;
        
        switch (timeRange) {
          case 'pastFiveYears':
            yearsToInclude = 5;
            break;
          case 'pastTenYears':
            yearsToInclude = 10;
            break;
          case 'allTime':
            yearsToInclude = new Date().getFullYear() - 2000;
            break;
          default:
            yearsToInclude = 0;
        }
        
        data = data.filter(item => item.year >= currentYear - yearsToInclude + 1)
      } else {
        // Use monthly data for 1Y and 2Y selections
        const currentYear = new Date().getFullYear()
        let yearsToFetch;

        switch (timeRange) {
          case 'pastYear':
            yearsToFetch = 1;
            break;
          case 'pastTwoYears':
            yearsToFetch = 2;
            break;
          default:
            yearsToFetch = 0;
        }

        const fetchPromises = []

        for (let i = 0; i < yearsToFetch; i++) {
          fetchPromises.push(fetchMonthlyData(currentYear - i))
        }

        const allYearsData = await Promise.all(fetchPromises)

        data = allYearsData
          .flat()
          .sort((a, b) => {
            // Sort by year first, then by month
            if (a.year !== b.year) {
              return a.year - b.year
            }
            return a.month - b.month
          })
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
    if (selectedMetric === 'surplusDeficit') {
      fetchMetricData('allTime')
    } else {
      fetchMetricData(timeRange)
    }
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
          {availableMetrics.map((metric) => (
            <MenuItem key={metric.value} value={metric.value}>
              {metric.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedMetric !== 'surplusDeficit' && (
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
          <ToggleButton value="pastTenYears">10Y</ToggleButton>
          <ToggleButton value="allTime">ALL TIME</ToggleButton>
          <ToggleButton value="future">FUTURE</ToggleButton>
        </ToggleButtonGroup>
      )}

      <Box sx={{ height: 300, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isLoading ? (
          <CircularProgress />
        ) : (
          <MetricChart
            data={metricData}
            timeRange={timeRange}
            selectedMetric={selectedMetric}
            height={300}
          />
        )}
      </Box>
    </Paper>
  );
};

export default CorpsDetails;