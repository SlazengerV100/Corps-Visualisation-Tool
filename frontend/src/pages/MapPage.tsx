import { useEffect, useState } from "react";
import Box from '@mui/material/Box'
import CorpsMap from "../components/map/CorpsMap.tsx";
import CorpsDetails, { type Corps } from "../components/map/CorpsDetails.tsx";

/**
 * Map of every corps, beside the details of the selected one when there is one
 */
export default function MapPage() {
    const [selectedCorps, setSelectedCorps] = useState<Corps | null>(null);
    const [corpsData, setCorpsData] = useState<Corps[]>([])

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
        void fetchCorpsData()
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
            <Box sx={{ flex: 1, height: '100%' }}>
                <CorpsMap corpsData={corpsData} selectedCorps={selectedCorps} onCorpsSelect={setSelectedCorps} />
            </Box>

            {selectedCorps && (
                <Box
                    sx={{
                        flex: 3,
                        height: '100%',
                        overflowY: 'auto',
                    }}
                >
                    <CorpsDetails corps={selectedCorps} onClose={() => setSelectedCorps(null)} />
                </Box>
            )}
        </Box>
    )
}
