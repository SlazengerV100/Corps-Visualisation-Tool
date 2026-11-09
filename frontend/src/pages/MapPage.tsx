import { useEffect, useState } from "react";
import Box from '@mui/material/Box'
import Autocomplete from '@mui/material/Autocomplete'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
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
            <Box sx={{ flex: 1, height: '100%', position: 'relative' }}>
                <CorpsMap corpsData={corpsData} selectedCorps={selectedCorps} onCorpsSelect={setSelectedCorps} />
                <Paper
                    elevation={3}
                    sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, width: 280 }}
                >
                    <Autocomplete
                        size="small"
                        options={corpsData.toSorted((a, b) => a.area.localeCompare(b.area) || a.name.localeCompare(b.name))}
                        groupBy={corps => corps.area}
                        getOptionLabel={corps => corps.name}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        value={selectedCorps}
                        onChange={(_, corps) => setSelectedCorps(corps)}
                        renderInput={params => <TextField {...params} placeholder="Search corps" />}
                    />
                </Paper>
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
