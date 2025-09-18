import * as React from 'react'
import { useEffect, useState } from "react";
import Box from '@mui/material/Box'
import CorpsMap from "../components/map/CorpsMap.jsx";
import CorpsDetails from "../components/map/CorpsDetails.jsx";

export default function MapPage() {
    const serverUrl = import.meta.env.VITE_SERVER_URL
    const [selectedCorps, setSelectedCorps] = useState(null);
    const [corpsData, setCorpsData] = useState([])

    useEffect(() => {
        const fetchCorpsData = async () => {
            try {
                const response = await fetch(`${serverUrl}/api/corps`)
                if (!response.ok) {
                    setCorpsData([])
                    return
                }
                const data = await response.json()
                setCorpsData(data)
            } catch (error) {
                console.error(`Failed to fetch corps data`)
                setCorpsData([])
            }
        }
        fetchCorpsData()
    }, [serverUrl])

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
