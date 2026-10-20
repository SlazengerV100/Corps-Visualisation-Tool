import * as React from 'react'
import { useEffect, useState } from "react";
import Box from '@mui/material/Box'
import CorpsMap from "../components/map/CorpsMap.jsx";
import CorpsDetails from "../components/map/CorpsDetails.jsx";

/**
 * @typedef {import('../components/map/CorpsDetails.jsx').Corps} Corps
 */

/**
 * Map of every corps beside the details of the selected one
 * @returns {React.JSX.Element}
 */
export default function MapPage() {
    const [selectedCorps, setSelectedCorps] = useState(/** @type {Corps | null} */ (null));
    const [corpsData, setCorpsData] = useState(/** @type {Corps[]} */ ([]))

    useEffect(() => {
        const fetchCorpsData = async () => {
            try {
                const response = await fetch('/api/corps')
                if (!response.ok) {
                    setCorpsData([])
                    return
                }
                const data = await response.json()
                setCorpsData(data)
            } catch {
                console.error(`Failed to fetch corps data`)
                setCorpsData([])
            }
        }
        fetchCorpsData()
    }, [])

    return (
        <Box
            sx={{
                flex: 1,
                display: 'flex',
                height: '100%',
                overflow: 'hidden',
            }}
        >
            <Box sx={{ flex: 2, height: '100%' }}>
                <CorpsMap corpsData={corpsData} selectedCorps={selectedCorps}onCorpsSelect={setSelectedCorps} />
            </Box>

            <Box
                sx={{
                    flex: 1,
                    height: '100%',
                    overflowY: 'auto',
                }}
            >
                <CorpsDetails corps={selectedCorps} />
            </Box>
        </Box>
    )
}
