import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import MapComponent from '../components/MapComponent';

// -----------------------------
// Replace localhost with ENV URLs
// -----------------------------
const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;
const SOCKET_URL = import.meta.env.VITE_API_BASE_URL; 
// Example: https://ubus-backend.onrender.com

// Create socket outside component (important)
const socket = io(SOCKET_URL, {
  reconnection: true,
  reconnectionAttempts: 5
});

function StudentDashboard({ user, onLogout }) {
  const [busData, setBusData] = useState(null);
  const [liveLocation, setLiveLocation] = useState(null);
  const [isTripActive, setIsTripActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch the bus details for student
    const fetchBusDetails = async () => {
      if (!user.routeNumber) {
        setError("You are not assigned to any route.");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/buses`);
        const myBus = response.data.find(
          (bus) => bus.routeNumber === user.routeNumber
        );

        if (myBus) {
          setBusData(myBus);
          setIsTripActive(myBus.isTripActive);

          if (myBus.isTripActive && myBus.lat && myBus.lng) {
            setLiveLocation({
              lat: myBus.lat,
              lng: myBus.lng,
              timestamp: Date.now(),
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

    // Join the student's route room on socket server
    if (user.routeNumber) {
      socket.emit("joinRouteRoom", user.routeNumber);
      console.log(`Joined socket room: ${user.routeNumber}`);
    }

    // Listening to live location updates
    socket.on("locationUpdate", (data) => {
      if (data.routeNumber === user.routeNumber) {
        setLiveLocation(data.location);
        setIsTripActive(true);
      }
    });

    // Listening to trip start/stop
    socket.on("tripStatus", (data) => {
      if (data.routeNumber === user.routeNumber) {
        setIsTripActive(data.isActive);
        if (!data.isActive) setLiveLocation(null);
      }
    });

    socket.on("connect_error", (err) => {
      console.error("Socket error:", err);
      setError("Live connection failed... Reconnecting...");
    });

    // Cleanup listeners
    return () => {
      socket.off("locationUpdate");
      socket.off("tripStatus");
      socket.off("connect_error");
    };
  }, [user.routeNumber]);

  // Status UI
  const renderBusStatus = () => {
    if (loading) return <p>Finding your bus...</p>;
    if (error) return <p className="error-message">{error}</p>;
    if (!busData) return <p>No bus assigned to your route.</p>;

    if (isTripActive) {
      return (
        <div className="status-indicator active">
          <h3>Bus is LIVE!</h3>
          {liveLocation ? (
            <p>
              Last update:{" "}
              {new Date(liveLocation.timestamp).toLocaleTimeString()}
            </p>
          ) : (
            <p>Waiting for location…</p>
          )}
        </div>
      );
    } else {
      return (
        <div className="status-indicator inactive">
          <h3>Trip has not started.</h3>
          <p>Please check again later.</p>
        </div>
      );
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Student Dashboard</h1>
        <button onClick={onLogout} className="logout-button">
          Logout
        </button>
      </header>

      <div className="dashboard-content">
        <div className="welcome-card">
          <h2>Welcome, {user.name}!</h2>
          <p>
            Your Route: <strong>{user.routeNumber || "Not Assigned"}</strong>
          </p>
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
                <p>The map will appear here when bus goes LIVE.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
