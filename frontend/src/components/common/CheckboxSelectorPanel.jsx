import React, { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'

export default function CheckboxSelectorPanel({ corps, selectedCorps, setSelectedCorps }) {
    const handleToggle = (name) => {
        setSelectedCorps(prevSelected => {
            const isCurrentlySelected = prevSelected.includes(name)
            if (isCurrentlySelected) {
                // Remove from selected corps
                return prevSelected.filter(corpsName => corpsName !== name)
            } else {
                // Add to selected corps
                return [...prevSelected, name]
            }
        })
    }

    return (
        <Box>
            <FormGroup>
                {corps.map(c => (
                    <FormControlLabel
                        key={c.name}
                        control={
                            <Checkbox
                                checked={selectedCorps.includes(c.name)}
                                onChange={() => handleToggle(c.name)}
                            />
                        }
                        label={c.name}
                    />
                ))}
            </FormGroup>
        </Box>
    )
}
