import React from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useTheme } from '@mui/material/styles'

const CorpsMap = ({corpsData, onCorpsSelect}) => {
    const nzCenter = [-41.2865, 174.7762] // Wellington coordinates as center
    const theme = useTheme()

    return (
        <MapContainer
            center={nzCenter}
            zoom={6}
            style={{ height: '100%' }}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {corpsData.map((corps) => (
                <Marker
                    key={corps.id}
                    position={[corps.lat, corps.lng]}
                    eventHandlers={{
                        click: () => onCorpsSelect(corps),
                    }}
                >
                    <Popup>
                        <div style={{ fontFamily: theme.typography.fontFamily }}>
                            <h3>{corps.name}</h3>
                            <p>{corps.area}</p>
                            <p>{corps.address}</p>
                            <p>{corps.city}</p>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};

export default CorpsMap; 