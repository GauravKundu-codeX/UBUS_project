import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client'; // Socket.IO client ko import karein
import MapComponent from '../components/MapComponent'; // Naya map component

// Backend server URLs
const API_URL = 'http://localhost:3001/api';
const SOCKET_URL = 'http://localhost:3001';

// --- YEH RAHA FIX ---
// Socket ko component ke bahar (outside) banayein
// Taaki yeh re-renders par change na ho
const socket = io(SOCKET_URL, {
  reconnection: true, // Automatically try to reconnect
  reconnectionAttempts: 5
});
// --- FIX END ---

function StudentDashboard({ user, onLogout }) {
  const [busData, setBusData] = useState(null); // Bus ki details (number, etc.)
  const [liveLocation, setLiveLocation] = useState(null); // Bus ki live location
  const [isTripActive, setIsTripActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // 1. Pehle, student ke route ki details fetch karein
    const fetchBusDetails = async () => {
      if (!user.routeNumber) {
        setError("You are not assigned to any route.");
        setLoading(false);
        return;
      }
      try {
        // Hum Admin ke 'v_bus_details' VIEW ka istemaal karenge
        const response = await axios.get(`${API_URL}/buses`);
        // Apne routeNumber se bus ko filter karein
        const myBus = response.data.find(bus => bus.routeNumber === user.routeNumber);

        if (myBus) {
          setBusData(myBus);
          setIsTripActive(myBus.isTripActive);
          if (myBus.isTripActive && myBus.lat && myBus.lng) {
            setLiveLocation({ 
              lat: myBus.lat, 
              lng: myBus.lng, 
              timestamp: new Date().getTime() // Abhi ke liye
            });
          }
        } else {
          setError("No bus is currently assigned to your route.");
        }
      } catch (err) {
        setError("Failed to fetch bus details.");
      }
      setLoading(false);
    };

    fetchBusDetails();

    // 2. Socket.IO connection (pehle se bana hua hai)
    
    // 3. Server ko batayein ki hum is route ko 'join' karna chahte hain
    if (user.routeNumber) {
      socket.emit('joinRouteRoom', user.routeNumber);
      console.log(`Socket joining room: ${user.routeNumber}`);
    }

    // 4. 'locationUpdate' event ko sunein
    socket.on('locationUpdate', (data) => {
      // Check karein ki yeh location update hamare route ke liye hai
      if (data.routeNumber === user.routeNumber) {
        setLiveLocation(data.location);
        setIsTripActive(true);
      }
    });
    
    // 5. 'tripStatus' event ko sunein (Start/Stop)
    socket.on('tripStatus', (data) => {
       if (data.routeNumber === user.routeNumber) {
         setIsTripActive(data.isActive);
         if (!data.isActive) {
           setLiveLocation(null); // Trip stop ho gaya
         }
       }
    });
    
    // 6. Socket errors ko bhi sunein
    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError('Live connection failed. Trying to reconnect...');
    });

    // 7. Cleanup: Jab component hatega, toh sirf listeners ko hatayein
    return () => {
      socket.off('locationUpdate');
      socket.off('tripStatus');
      socket.off('connect_error');
    };

  }, [user.routeNumber]); // Yeh effect tabhi chalega jab user ya uska route badlega

  // Helper function status card dikhane ke liye
  const renderBusStatus = () => {
    if (loading) {
      return <p>Finding your bus...</p>;
    }
    if (error) {
      return <p className="error-message">{error}</p>;
    }
    if (!busData) {
      return <p>No bus assigned to your route.</p>;
    }
    
    if (isTripActive) {
      return (
        <div className="status-indicator active">
          <h3>Bus is LIVE!</h3>
          {liveLocation ? (
            <p>
              Last update: {new Date(liveLocation.timestamp).toLocaleTimeString()}
            </p>
          ) : (
            <p>Waiting for location data...</p>
          )}
        </div>
      );
    } else {
      return (
        <div className="status-indicator inactive">
          <h3>Bus trip has not started.</h3>
          <p>Please check back later.</p>
        </div>
      );
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Student Dashboard</h1>
        <button onClick={onLogout} className="logout-button">Logout</button>
      </header>
      <div className="dashboard-content">
        <div className="welcome-card">
          <h2>Welcome, {user.name}!</h2>
          <p>Your Assigned Route: <strong>{user.routeNumber || 'Not Assigned'}</strong></p>
        </div>
        
        <div className="card">
          <h3>Your Bus Status</h3>
          {renderBusStatus()}
        </div>

        <div className="card">
          <h3>Live Map</h3>
          <div className="map-container">
            {isTripActive && liveLocation ? (
              <MapComponent location={liveLocation} />
            ) : (
              <div className="map-placeholder">
                <p>Bus trip has not started.</p>
                <p>The map will appear here when the bus is live.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;