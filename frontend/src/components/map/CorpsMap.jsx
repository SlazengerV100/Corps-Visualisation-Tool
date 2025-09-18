import React from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTheme } from '@mui/material/styles'

const CorpsMap = ({corpsData, selectedCorps,onCorpsSelect}) => {
    const nzCenter = [-41.2865, 174.7762] // Wellington coordinates as center
    const theme = useTheme()

    // Create custom icons
    const defaultIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    })

    const selectedIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    })

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
                    icon={selectedCorps && selectedCorps.id === corps.id ? selectedIcon : defaultIcon}
                    eventHandlers={{
                        click: (e) => {
                            onCorpsSelect(corps)
                            e.target.openPopup()
                        },
                        mouseover: (e) => {
                            e.target.openPopup()
                        },
                        mouseout: (e) => {
                            e.target.closePopup()
                        }
                    }}
                >
                    <Popup>
                        <div style={{ fontFamily: theme.typography.fontFamily }}>
                            <h3>{corps.name}</h3>
                            <h4>{corps.area}</h4>
                            <p>{corps.address}, {corps.city}</p>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};

export default CorpsMap; 