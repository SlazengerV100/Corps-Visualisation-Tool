import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import AttendanceChart from './AttendanceChart.jsx';

const CorpsDetails = ({ corps }) => {
  const serverUrl = import.meta.env.VITE_SERVER_URL
  const [timeRange, setTimeRange] = useState('pastYear');
  const [attendanceData, setAttendanceData] = useState([])

  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!corps) return
      try {
        const response = await fetch(`${serverUrl}/api/corps/${corps.id}/attendance/byMonth/2024`)
        if (!response.ok) {
          setAttendanceData([])
          return
        }
        const data = await response.json()
        setAttendanceData(data)
      } catch (error) {
        console.error(`Failed to fetch corps data`)
        setAttendanceData([])
      }
    }
    fetchAttendanceData()
  }, [serverUrl, corps])

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
        Attendance History
      </Typography>

      <ToggleButtonGroup
        value={timeRange}
        exclusive
        onChange={handleTimeRangeChange}
        size="small"
        sx={{ mb: 2 }}
      >
        <ToggleButton value="pastMonth">1M</ToggleButton>
        <ToggleButton value="pastYear">1Y</ToggleButton>
        <ToggleButton value="pastTwoYears">2Y</ToggleButton>
        <ToggleButton value="pastFiveYears">5Y</ToggleButton>
        <ToggleButton value="allTime">ALL TIME</ToggleButton>
      </ToggleButtonGroup>

      <Box sx={{ height: 300, width: '100%' }}>
        <AttendanceChart 
          data={attendanceData}
          width={600}
          height={300}
        />
      </Box>
    </Paper>
  );
};

export default CorpsDetails;