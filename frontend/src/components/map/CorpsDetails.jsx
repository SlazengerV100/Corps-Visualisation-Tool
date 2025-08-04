import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
} from '@mui/icons-material';
import AttendanceChart from './AttendanceChart.jsx';

const TrendIcon = ({ trend }) => {
  switch (trend) {
    case 'up':
      return <TrendingUp color="success" />;
    case 'down':
      return <TrendingDown color="error" />;
    default:
      return <TrendingFlat color="info" />;
  }
};

const CorpsDetails = ({ corps }) => {
  const [timeRange, setTimeRange] = useState('pastMonth');

  if (!corps) {
    return (
      <Paper sx={{ 
        p: 3, 
        height: 'calc(100vh - 16px)', // Adjust for padding
        width: '30vw'
      }}>
        <Typography variant="h6">
          Select a corps on the map to view details
        </Typography>
      </Paper>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(amount);
  };

  const handleTimeRangeChange = (event, newTimeRange) => {
    if (newTimeRange !== null) {
      setTimeRange(newTimeRange);
    }
  };

  return (
    <Paper sx={{ 
      p: 3, 
      height: 'calc(100vh - 16px)', // Adjust for padding
      width: '30vw', 
      overflowY: 'auto'
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
          data={corps.historicalAttendance[timeRange]}
          width={600}
          height={300}
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      <List>
        <ListItem>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Weekly Attendance</span>
                <TrendIcon trend={corps.metrics.trends.weeklyAttendance} />
              </Box>
            }
            secondary={corps.metrics.weeklyAttendance}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Tithes and Offerings</span>
                <TrendIcon trend={corps.metrics.trends.tithesAndOfferings} />
              </Box>
            }
            secondary={formatCurrency(corps.metrics.tithesAndOfferings)}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Staff Members</span>
                <TrendIcon trend={corps.metrics.trends.staffMembers} />
              </Box>
            }
            secondary={corps.metrics.staffMembers}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Volunteers</span>
                <TrendIcon trend={corps.metrics.trends.volunteerCount} />
              </Box>
            }
            secondary={corps.metrics.volunteerCount}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Youth Members</span>
                <TrendIcon trend={corps.metrics.trends.youthMembers} />
              </Box>
            }
            secondary={corps.metrics.youthMembers}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Kid's Church Attendance</span>
                <TrendIcon trend={corps.metrics.trends.kidsChurchAttendance} />
              </Box>
            }
            secondary={corps.metrics.kidsChurchAttendance}
          />
        </ListItem>
      </List>
    </Paper>
  );
};

export default CorpsDetails;