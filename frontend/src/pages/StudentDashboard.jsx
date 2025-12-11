import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import MapComponent from '../components/MapComponent';
import StudentComplaints from '../pages/StudentComplaints';
import StudentAnnouncements from '../pages/StudentAnnouncements';   // ✅ NEW IMPORT
import '../styles/studentDashboard.css';

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;
const SOCKET_URL = import.meta.env.VITE_API_BASE_URL;

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
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  // Pages
  const [showComplaints, setShowComplaints] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);   // ✅ NEW STATE

  // ==========================
  //     USE EFFECT
  // ==========================
  useEffect(() => {
    const fetchBusDetails = async () => {
      if (!user.routeNumber) {
        setError("⚠️ You are not assigned to any route.");
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
              timestamp: Date.now()
            });
          }
        } else {
          setError("🚌 No bus is currently assigned to your route.");
        }
      } catch (err) {
        setError("❌ Failed to fetch bus details.");
        console.error("Fetch Error:", err);
      }

      setLoading(false);
    };

    fetchBusDetails();

    if (user.routeNumber) {
      socket.emit("joinRouteRoom", user.routeNumber);
    }

    socket.on("connect", () => setConnectionStatus('connected'));
    socket.on("disconnect", () => setConnectionStatus('disconnected'));

    socket.on("locationUpdate", (data) => {
      if (data.routeNumber === user.routeNumber) {
        setLiveLocation(data.location);
        setIsTripActive(true);
        setConnectionStatus('connected');
      }
    });

    socket.on("tripStatus", (data) => {
      if (data.routeNumber === user.routeNumber) {
        setIsTripActive(data.isActive);
        if (!data.isActive) setLiveLocation(null);
      }
    });

    socket.on("connect_error", () => {
      setConnectionStatus('error');
      setError("🔴 Live connection failed... Reconnecting...");
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("locationUpdate");
      socket.off("tripStatus");
      socket.off("connect_error");
    };
  }, [user.routeNumber]);

  // ==========================
  //     RENDER BUS STATUS
  // ==========================
  const renderBusStatus = () => {
    if (loading)
      return (
        <div className="status-indicator inactive">
          <h3>🔍 Finding your bus...</h3>
          <p>Please wait.</p>
        </div>
      );

    if (error) return <p className="error-message">{error}</p>;

    if (!busData)
      return (
        <div className="status-indicator inactive">
          <h3>🚌 No bus assigned</h3>
          <p>Contact admin.</p>
        </div>
      );

    if (isTripActive)
      return (
        <div className="status-indicator active">
          <h3>🚍 Bus is LIVE!</h3>
          {liveLocation ? (
            <>
              <p>
                📍 <strong>Last Update:</strong>{" "}
                {new Date(liveLocation.timestamp).toLocaleTimeString()}
              </p>
              <p>
                🌐 <strong>Connection:</strong>{" "}
                <span
                  style={{
                    color: connectionStatus === 'connected' ? '#27ae60' : '#e74c3c',
                    fontWeight: 'bold'
                  }}
                >
                  {connectionStatus === 'connected'
                    ? 'Active'
                    : 'Reconnecting...'}
                </span>
              </p>
            </>
          ) : (
            <p>⏳ Waiting for location...</p>
          )}
        </div>
      );

    return (
      <div className="status-indicator inactive">
        <h3>⏸️ Trip has not started</h3>
        <p>Map will appear once bus goes LIVE.</p>
      </div>
    );
  };

  // ==========================
  //       PAGE SWITCHING
  // ==========================

  if (showComplaints) {
    return <StudentComplaints user={user} onBack={() => setShowComplaints(false)} />;
  }

  if (showAnnouncements) {
    return <StudentAnnouncements user={user} onBack={() => setShowAnnouncements(false)} />;
  }

  // ==========================
  //        MAIN UI
  // ==========================
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Student Dashboard</h1>

        {/* NEW BUTTON */}
        <button
          className="complaint-button"
          onClick={() => setShowAnnouncements(true)}
        >
          📢 Announcements
        </button>

        <button
          className="complaint-button"
          onClick={() => setShowComplaints(true)}
        >
          📝 My Complaints
        </button>

        <button onClick={onLogout} className="logout-button">
          Logout
        </button>
      </header>

      <div className="dashboard-content">
        <div className="welcome-card">
          <h2>Welcome, {user.name}!</h2>
          <p>
            🚌 Route: <strong>{user.routeNumber || "Not Assigned"}</strong>
          </p>
        </div>

        <div className="card">
          <h3>🚦 Bus Status</h3>
          {renderBusStatus()}
        </div>

        <div className="card">
          <h3>🗺️ Live Map</h3>
          <div className="map-container">
            {isTripActive && liveLocation ? (
              <MapComponent location={liveLocation} />
            ) : (
              <div className="map-placeholder">
                <p>🚌 Bus not live yet</p>
                <p>Map will appear when trip starts</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
