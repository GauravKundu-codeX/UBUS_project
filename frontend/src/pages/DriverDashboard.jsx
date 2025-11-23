import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import MapComponent from '../components/MapComponent';

// Hamare backend server ka URL
// const API_URL = 'http://localhost:3001/api';
const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

// const SOCKET_URL = 'http://localhost:3001';
const SOCKET_URL = import.meta.env.VITE_API_BASE_URL;


// --- YEH RAHA FIX ---
// Socket ko component ke bahar (outside) banayein
const socket = io(SOCKET_URL, {
  reconnection: true,
  reconnectionAttempts: 5
});
// --- FIX END ---

function DriverDashboard({ user, onLogout }) {
  const [assignedBus, setAssignedBus] = useState(null); // Driver ki bus
  const [myLocation, setMyLocation] = useState(null); // Driver ki live location
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // locationIntervalRef ek "memory" jaisa hai jo 
  // har 10 second waale timer (setInterval) ko store karega
  const locationIntervalRef = useRef(null);

  // Jab page load ho, driver ki assigned bus ko fetch karein
  useEffect(() => {
    const fetchMyBus = async () => {
      try {
        const response = await axios.get(`${API_URL}/my-bus`, {
          params: { driverUid: user.uid } // 'user.uid' ko backend ko bhejega
        });
        
        const bus = response.data;
        setAssignedBus(bus);
        
        // Socket room join karein
        if (bus.routeNumber) {
          socket.emit('joinRouteRoom', bus.routeNumber);
          console.log(`Socket joining room: ${bus.routeNumber}`);
        }

        // Agar bus pehle se "LIVE" hai (server crash ke baad), toh location bhejna shuru kar dein
        if (bus.isTripActive) {
          startSendingLocation(bus);
        }
        
      } catch (err) {
        setError(err.response?.data?.message || "Error fetching bus assignment.");
      }
      setLoading(false);
    };

    fetchMyBus();
    
    // Cleanup: Jab component hatega (logout), toh timer band kar dein
    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
      // Hum socket ko yahan disconnect nahin karenge, 
      // taaki woh poore app session tak zinda rahe
    };
  }, [user.uid]); // Yeh effect tabhi chalega jab user login karega


  // --- Location Bhejne Ka Logic ---
  
  const sendLocationUpdate = (bus) => {
    // 1. Browser se GPS location maangein
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        // Sirf high-accuracy GPS hi accept karein
        if (accuracy > 500) {
           setError(`Location not accurate (${accuracy.toFixed(0)}m).`);
           return;
        }

        const locationData = {
          lat: latitude,
          lng: longitude,
          timestamp: Date.now()
        };
        
        setMyLocation(locationData); // Driver ke apne map ko update karein
        setError('');

        // 2. Backend ko location bhej dein (HTTP POST se database update)
        try {
          await axios.post(`${API_URL}/update-location`, {
            busId: bus.busId,
            lat: locationData.lat,
            lng: locationData.lng
          });
        } catch (err) {
           console.error("Failed to post location to DB", err);
        }
        
        // 3. Backend ko location bhej dein (Socket.IO se live broadcast)
        socket.emit('sendLocation', {
          routeNumber: bus.routeNumber,
          location: locationData
        });

      },
      (err) => {
        console.warn(`Geolocation error: ${err.message}`);
        setError("Could not get location. Please enable location services.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };
  
  // --- Trip Start/Stop Logic ---

  const startSendingLocation = (bus) => {
    // Pehle, turant ek baar location bhejein
    sendLocationUpdate(bus);
    
    // Phir, har 10 second mein location bhejte rahein
    // (Puraane interval ko clear karein, agar koi hai toh)
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
    }
    locationIntervalRef.current = setInterval(() => sendLocationUpdate(bus), 10000);
  };

  const stopSendingLocation = () => {
    // Timer ko band kar dein
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    setMyLocation(null); // Apne map se location hata dein
  };

  // 'Start Trip' / 'Stop Trip' button dabane par
  const handleToggleTrip = async () => {
    const newTripStatus = !assignedBus.isTripActive;
    
    try {
      // 1. Backend (DB) ko batayein ki trip start/stop ho gaya hai
      await axios.post(`${API_URL}/trip-status`, {
        busId: assignedBus.busId,
        isTripActive: newTripStatus
      });
      
      // 2. Socket (Live) par sabko batayein ki trip start/stop ho gaya hai
      socket.emit('tripStatus', {
        routeNumber: assignedBus.routeNumber,
        isActive: newTripStatus
      });
      
      // 3. Apne local state ko update karein
      setAssignedBus(prevBus => ({ ...prevBus, isTripActive: newTripStatus }));

      // 4. Location timer ko chalu ya band karein
      if (newTripStatus) {
        startSendingLocation(assignedBus); // Trip Start
      } else {
        stopSendingLocation(); // Trip Stop
      }
      
    } catch (err) {
      setError("Failed to update trip status.");
    }
  };


  // --- Render Functions ---
  
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
          <p>Your Driver ID: <strong>{user.collegeId}</strong></p>
        </div>

        {error && <p className="error-message">{error}</p>}
        
        {!assignedBus && !error && (
          <div className="card">
            <h3>My Assignment</h3>
            <p>You are not currently assigned to any bus.</p>
          </div>
        )}
        
        {assignedBus && (
          <>
            <div className="card">
              <h3>My Assignment</h3>
              <p>Bus Number: <strong>{assignedBus.busNumber}</strong></p>
              <p>Route Number: <strong>{assignedBus.routeNumber}</strong></p>
              
              <div className={`status-indicator ${assignedBus.isTripActive ? 'active' : 'inactive'}`}>
                <h3>{assignedBus.isTripActive ? 'TRIP IS LIVE' : 'TRIP INACTIVE'}</h3>
              </div>
              
              <button
                className={`trip-button ${assignedBus.isTripActive ? 'stop' : 'start'}`}
                onClick={handleToggleTrip}
              >
                {assignedBus.isTripActive ? 'Stop Trip' : 'Start Trip'}
              </button>
            </div>
            
            <div className="card">
              <h3>My Location</h3>
              <div className="map-container">
                {assignedBus.isTripActive && myLocation ? (
                  <MapComponent location={myLocation} />
                ) : (
                  <div className="map-placeholder">
                    <p>{assignedBus.isTripActive ? "Getting your location..." : "Start your trip to see your live location."}</p>
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