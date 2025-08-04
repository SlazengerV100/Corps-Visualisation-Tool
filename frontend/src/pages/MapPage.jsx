import * as React from 'react'
import {useEffect, useState} from "react";
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
        <Box sx={{ display: 'flex', height: 'calc(100vh - 16px)' }}>
            <Box sx={{ flex: 1 }}>
                <CorpsMap corpsData={corpsData} onCorpsSelect={setSelectedCorps} />
            </Box>
            <CorpsDetails corps={selectedCorps} />
        </Box>
    )
}
