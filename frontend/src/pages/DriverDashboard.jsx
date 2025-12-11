import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import MapComponent from '../components/MapComponent';

import '../styles/driverDashboard.css';

// Backend server URL
const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;
const SOCKET_URL = import.meta.env.VITE_API_BASE_URL;

// Create socket outside component
const socket = io(SOCKET_URL, {
  reconnection: true,
  reconnectionAttempts: 5
});

function DriverDashboard({ user, onLogout }) {
  const [assignedBus, setAssignedBus] = useState(null);
  const [myLocation, setMyLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  
  const locationIntervalRef = useRef(null);

  // Fetch driver's assigned bus
  useEffect(() => {
    const fetchMyBus = async () => {
      try {
        const response = await axios.get(`${API_URL}/my-bus`, {
          params: { driverUid: user.uid }
        });
        
        const bus = response.data;
        setAssignedBus(bus);
        
        // Join socket room
        if (bus.routeNumber) {
          socket.emit('joinRouteRoom', bus.routeNumber);
          console.log(`✅ Socket joined room: ${bus.routeNumber}`);
        }

        // If trip is already active (after server restart), start sending location
        if (bus.isTripActive) {
          startSendingLocation(bus);
        }
        
      } catch (err) {
        setError(err.response?.data?.message || "❌ Error fetching bus assignment.");
        console.error("Fetch Error:", err);
      }
      setLoading(false);
    };

    fetchMyBus();
    
    // Socket connection listeners
    socket.on("connect", () => {
      console.log("✅ Socket connected");
    });

    socket.on("disconnect", () => {
      console.log("⚠️ Socket disconnected");
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket error:", err);
    });
    
    // Cleanup
    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
    };
  }, [user.uid]);

  // Send location update
  const sendLocationUpdate = (bus) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        setLocationAccuracy(accuracy);

        // Only accept high-accuracy GPS
        if (accuracy > 500) {
          setError(`⚠️ Location not accurate enough (${accuracy.toFixed(0)}m). Move to a clearer area.`);
          return;
        }

        const locationData = {
          lat: latitude,
          lng: longitude,
          timestamp: Date.now()
        };
        
        setMyLocation(locationData);
        setLastUpdateTime(new Date());
        setError('');

        // Update database via HTTP
        try {
          await axios.post(`${API_URL}/update-location`, {
            busId: bus.busId,
            lat: locationData.lat,
            lng: locationData.lng
          });
          console.log("📍 Location updated in database");
        } catch (err) {
          console.error("❌ Failed to update location in DB:", err);
        }
        
        // Broadcast via Socket.IO
        socket.emit('sendLocation', {
          routeNumber: bus.routeNumber,
          location: locationData
        });
        console.log("📡 Location broadcasted via socket");

      },
      (err) => {
        console.warn(`⚠️ Geolocation error: ${err.message}`);
        setError("❌ Could not get location. Please enable GPS and location services.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };
  
  // Start sending location every 10 seconds
  const startSendingLocation = (bus) => {
    // Send immediately
    sendLocationUpdate(bus);
    
    // Then send every 10 seconds
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
    }
    locationIntervalRef.current = setInterval(() => sendLocationUpdate(bus), 10000);
  };

  // Stop sending location
  const stopSendingLocation = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    setMyLocation(null);
    setLastUpdateTime(null);
    setLocationAccuracy(null);
  };

  // Toggle trip status
  const handleToggleTrip = async () => {
    const newTripStatus = !assignedBus.isTripActive;
    
    try {
      // Update database
      await axios.post(`${API_URL}/trip-status`, {
        busId: assignedBus.busId,
        isTripActive: newTripStatus
      });
      
      // Broadcast via socket
      socket.emit('tripStatus', {
        routeNumber: assignedBus.routeNumber,
        isActive: newTripStatus
      });
      
      // Update local state
      setAssignedBus(prevBus => ({ ...prevBus, isTripActive: newTripStatus }));

      // Start or stop location updates
      if (newTripStatus) {
        startSendingLocation(assignedBus);
        setError('');
      } else {
        stopSendingLocation();
      }

      console.log(`${newTripStatus ? '✅ Trip started' : '⏹️ Trip stopped'}`);
      
    } catch (err) {
      setError("❌ Failed to update trip status. Please try again.");
      console.error("Trip toggle error:", err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>Driver Dashboard</h1>
          <button onClick={onLogout} className="logout-button">Logout</button>
        </header>
        <div className="dashboard-content">
          <div className="loading-container">Loading your assignment...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Driver Dashboard</h1>
        <button onClick={onLogout} className="logout-button">Logout</button>
      </header>
      
      <div className="dashboard-content">
        <div className="welcome-card">
          <h2>Welcome, {user.name}!</h2>
          <p>
            🆔 Your Driver ID: <strong>{user.collegeId}</strong>
          </p>
        </div>

        {error && <p className="error-message">{error}</p>}
        
        {!assignedBus && !error && (
          <div className="card">
            <h3>📋 My Assignment</h3>
            <p style={{ textAlign: 'center', fontSize: '1.2rem', padding: '20px 0' }}>
              ⚠️ You are not currently assigned to any bus.
            </p>
            <p style={{ textAlign: 'center', opacity: 0.7 }}>
              Please contact your administrator for bus assignment.
            </p>
          </div>
        )}
        
        {assignedBus && (
          <>
            <div className="card">
              <h3>🚌 My Assignment</h3>
              <p>
                <span style={{ fontSize: '0.95rem', opacity: 0.8 }}>Bus Number:</span> 
                <strong>{assignedBus.busNumber}</strong>
              </p>
              <p>
                <span style={{ fontSize: '0.95rem', opacity: 0.8 }}>Route Number:</span> 
                <strong>{assignedBus.routeNumber}</strong>
              </p>
              
              <div className={`status-indicator ${assignedBus.isTripActive ? 'active' : 'inactive'}`}>
                <h3>
                  {assignedBus.isTripActive ? '🚍 TRIP IS LIVE' : '⏸️ TRIP INACTIVE'}
                </h3>
                {assignedBus.isTripActive && locationAccuracy && (
                  <p style={{ marginTop: '10px', fontSize: '0.95rem' }}>
                    📡 GPS Accuracy: <strong>{locationAccuracy.toFixed(0)}m</strong>
                  </p>
                )}
                {assignedBus.isTripActive && lastUpdateTime && (
                  <p style={{ fontSize: '0.95rem' }}>
                    🕒 Last Update: <strong>{lastUpdateTime.toLocaleTimeString()}</strong>
                  </p>
                )}
              </div>
              
              <button
                className={`trip-button ${assignedBus.isTripActive ? 'stop' : 'start'}`}
                onClick={handleToggleTrip}
              >
                {assignedBus.isTripActive ? 'Stop Trip' : 'Start Trip'}
              </button>
            </div>
            
            <div className="card">
              <h3>📍 My Location</h3>
              <div className="map-container">
                {assignedBus.isTripActive && myLocation ? (
                  <MapComponent location={myLocation} />
                ) : (
                  <div className="map-placeholder">
                    <p>
                      {assignedBus.isTripActive 
                        ? "🔄 Getting your location..." 
                        : "🚀 Start your trip to see your live location"}
                    </p>
                    {!assignedBus.isTripActive && (
                      <p style={{ fontSize: '1rem', opacity: 0.7, marginTop: '10px' }}>
                        💡 Click "Start Trip" button above to begin tracking
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        
      </div>
    </div>
  );
}

export default DriverDashboard;
