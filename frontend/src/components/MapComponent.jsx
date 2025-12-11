import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import '../styles/map.css';


// Leaflet ke default icons ko fix karna (Vite ke liye zaroori)
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;


// Yeh naya Bus Icon hai
const busIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" stroke="#007bff" stroke-width="1.5">
    <path d="M4 6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V6Z" stroke-width="1.S"/>
    <path d="M6 8H18" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M6 16H7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M17 16H18" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M5 12H19" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9 20V22" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M15 20V22" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M8 5C8 4.44772 8.44772 4 9 4H15C15.5523 4 16 4.44772 16 5V8H8V5Z" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`,
  className: 'bus-icon', // Isse hum index.css mein style karenge
  iconSize: [36, 36],
  iconAnchor: [18, 18], 
});

// Yeh chhota component map ko bus ki nayi location par move karega
function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng]);
    }
  }, [lat, lng, map]);
  return null;
}

function MapComponent({ location }) {
  const position = [location.lat, location.lng];

  return (
    <MapContainer 
      center={position} 
      zoom={16} 
      scrollWheelZoom={true} 
      style={{ height: '100%', width: '100%', borderRadius: '8px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position} icon={busIcon}>
        <Popup>
          Bus Location <br />
          Last update: {new Date(location.timestamp).toLocaleTimeString()}
        </Popup>
      </Marker>
      <RecenterMap lat={location.lat} lng={location.lng} />
    </MapContainer>
  );
}

export default MapComponent;