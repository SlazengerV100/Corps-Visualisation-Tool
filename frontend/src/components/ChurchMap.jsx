import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { churchesData } from '../data/churchesData';

// Fix for default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const ChurchMap = ({ onChurchSelect }) => {
  const nzCenter = [-41.2865, 174.7762]; // Wellington coordinates as center

  return (
    <MapContainer
      center={nzCenter}
      zoom={6}
      style={{ height: '100vh', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {churchesData.map((church) => (
        <Marker
          key={church.id}
          position={[church.location.lat, church.location.lng]}
          eventHandlers={{
            click: () => onChurchSelect(church),
          }}
        >
          <Popup>
            <div>
              <h3>{church.name}</h3>
              <p>{church.area}</p>
              <p>{church.address}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default ChurchMap; 