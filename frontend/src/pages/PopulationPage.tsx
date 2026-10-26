import React from 'react'
import Box from '@mui/material/Box'
import PopulationChart from '../components/population/PopulationChart'

const PopulationPage = () => {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <PopulationChart />
    </Box>
  )
}

export default PopulationPage
