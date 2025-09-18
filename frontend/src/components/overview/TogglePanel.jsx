import React from 'react'
import Box from '@mui/material/Box'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import { useEffect } from 'react'

export default function TogglePanel({ hideUnselected, setHideUnselected, selectedCorps }) {
    const handleToggleChange = (event) => {
        setHideUnselected(event.target.checked)
    }

    useEffect(() => {
        setHideUnselected(false)
    }, [selectedCorps])

    // Disable the toggle if no corps are selected
    const isDisabled = !selectedCorps || selectedCorps.length === 0

    return (
        <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Display Options
            </Typography>
            <FormControlLabel
                control={
                    <Switch
                        checked={hideUnselected}
                        onChange={handleToggleChange}
                        disabled={isDisabled}
                        color="primary"
                    />
                }
                label={
                    <Typography 
                        variant="body2" 
                        sx={{ 
                            color: isDisabled ? 'text.disabled' : 'text.primary',
                            fontWeight: 'medium'
                        }}
                    >
                        Hide unselected corps
                    </Typography>
                }
            />
        </Box>
    )
}
