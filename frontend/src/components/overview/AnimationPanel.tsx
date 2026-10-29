import React, { useState, useEffect, useRef } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import MUISlider from '@mui/material/Slider'
import { styled } from '@mui/material/styles'

const Slider = styled(MUISlider)(({ theme }) => ({
    color: theme.palette.primary.main,
    height: 6,
    '& .MuiSlider-track': {
        border: 'none',
        backgroundColor: theme.palette.primary.main
    },
    '& .MuiSlider-thumb': {
        height: 20,
        width: 20,
        backgroundColor: theme.palette.background.paper,
        border: `2px solid ${theme.palette.primary.main}`,
        '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
            boxShadow: `0px 0px 0px 8px ${theme.palette.primary.main}33`,
        },
    },
    '& .MuiSlider-rail': {
        opacity: 0.3,
        backgroundColor: theme.palette.primary.main,
    },
    '& .MuiSlider-markLabel': {
        fontSize: 12,
    },
}))

export default function AnimationPanel({year, setYear, years}: {
    year: number | null
    setYear: React.Dispatch<React.SetStateAction<number | null>>
    years: number[]
}) {
    const MIN_YEAR = years[0]
    const MAX_YEAR = years[years.length - 1]
    const animationSpeed = 1000 // ms

    const [playing, setPlaying] = useState(false)
    const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)

    // Generate marks for every year between MIN_YEAR and MAX_YEAR
    const yearMarks = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, index) => ({
        value: MIN_YEAR + index,
        label: (MIN_YEAR + index).toString()
    }))

    const togglePlay = () => {
        setPlaying(prev => !prev)
    }

    useEffect(() => {
        if (playing) {
            setYear(MIN_YEAR)

            intervalRef.current = setInterval(() => {
                setYear(prev => {
                    if (prev === null || prev >= MAX_YEAR) {
                        clearInterval(intervalRef.current)
                        setPlaying(false)
                        return prev
                    }
                    return prev + 1
                })
            }, animationSpeed)
        } else {
            clearInterval(intervalRef.current)
        }

        return () => clearInterval(intervalRef.current)
    }, [playing, setYear, MIN_YEAR, MAX_YEAR])

    const handleSliderChange = (_: Event, newValue: number | number[]) => {
        if (Array.isArray(newValue)) return
        setPlaying(false)
        setYear(newValue)
    }

    if (years.length === 0 || year === null) {
        return null
    }

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            <IconButton onClick={togglePlay}>
                {playing ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>

            <Box sx={{ flexGrow: 1 }}>
                <Slider
                    value={year}
                    min={MIN_YEAR}
                    max={MAX_YEAR}
                    step={1}
                    marks={yearMarks}
                    onChange={handleSliderChange}
                />
            </Box>
        </Box>
    )
}
