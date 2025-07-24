import React, { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'

export default function CheckboxSelectorPanel({ corps, setCorps }) {
    const handleToggle = (name) => {
        setCorps(prevCorps =>
            prevCorps.map(c =>
                c.name === name ? { ...c, selected: !c.selected } : c
            )
        )
    }

    return (
        <Box>
            <FormGroup>
                {corps.map(c => (
                    <FormControlLabel
                        key={c.name}
                        control={
                            <Checkbox
                                checked={c.selected}
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
