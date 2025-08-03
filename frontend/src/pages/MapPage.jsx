import * as React from 'react'
import {useState} from "react";
import Box from '@mui/material/Box'
import ChurchMap from "../components/ChurchMap";
import ChurchDetails from "../components/ChurchDetails";

export default function MapPage() {
    const [selectedChurch, setSelectedChurch] = useState(null);

    return (
        <Box sx={{ display: 'flex', height: 'calc(100vh - 16px)' }}>
            <Box sx={{ flex: 1 }}>
                <ChurchMap onChurchSelect={setSelectedChurch} />
            </Box>
            <ChurchDetails church={selectedChurch} />
        </Box>
    )
}
