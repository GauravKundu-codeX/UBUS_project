import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/adminDashboard.css";
import AdminComplaints from "./AdminComplaints";
import AdminAnnouncements from "./AdminAnnouncements";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

function AdminDashboard({ user, onLogout }) {
  const [showComplaints, setShowComplaints] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);

  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [newRoute, setNewRoute] = useState("");
  const [newBus, setNewBus] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [routesRes, busesRes, driversRes] = await Promise.all([
        axios.get(`${API_URL}/routes`),
        axios.get(`${API_URL}/buses`),
        axios.get(`${API_URL}/drivers`)
      ]);
      setRoutes(routesRes.data);
      setBuses(busesRes.data);
      setDrivers(driversRes.data);
      setError("");
    } catch {
      setError("Failed to fetch data.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showMessageTimed = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleAddRoute = async (e) => {
    e.preventDefault();
    if (!newRoute.trim()) return;
    try {
      await axios.post(`${API_URL}/routes`, {
        routeNumber: newRoute,
        stops: []
      });
      showMessageTimed(`Route ${newRoute} added`);
      setNewRoute("");
      fetchData();
    } catch {
      setError("Failed to add route");
    }
  };

  const handleAddBus = async (e) => {
    e.preventDefault();
    if (!newBus.trim()) return;
    try {
      await axios.post(`${API_URL}/buses`, { busNumber: newBus });
      showMessageTimed(`Bus ${newBus} added`);
      setNewBus("");
      fetchData();
    } catch {
      setError("Failed to add bus");
    }
  };

  const handleAssignment = async (busId, driverUid, routeNumber) => {
    if (!driverUid || !routeNumber) {
      setError("Select driver and route");
      return;
    }
    setError("");
    try {
      await axios.post(`${API_URL}/assign`, {
        driverUid,
        busId,
        routeNumber
      });
      showMessageTimed("Assignment successful");
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Assign failed");
    }
  };

  const isBusAssigned = (bus) => bus.driverUid && bus.routeNumber;

  if (showComplaints) {
    return <AdminComplaints onBack={() => setShowComplaints(false)} />;
  }

  if (showAnnouncements) {
    return (
      <AdminAnnouncements
        user={user}
        onBack={() => setShowAnnouncements(false)}
      />
    );
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>Admin Dashboard</h1>
          <button onClick={onLogout} className="logout-button">Logout</button>
        </header>
        <div className="loading-container">Loading admin data...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Admin Dashboard</h1>

        <button
          onClick={() => setShowAnnouncements(true)}
          style={{
            marginRight: "15px",
            background: "#6F48FF",
            padding: "10px 16px",
            borderRadius: "8px",
            color: "white",
            fontWeight: "600",
            cursor: "pointer"
          }}
        >
          📢 Announcements
        </button>

        <button
          onClick={() => setShowComplaints(true)}
          style={{
            marginRight: "15px",
            background: "#5448C8",
            padding: "10px 16px",
            borderRadius: "8px",
            color: "white",
            fontWeight: "600",
            cursor: "pointer"
          }}
        >
          📣 Complaints Management
        </button>

        <button onClick={onLogout} className="logout-button">Logout</button>
      </header>

      <div className="dashboard-content admin-dashboard">
        <div className="welcome-card">
          <h2>Admin Control Panel</h2>
          <p>Welcome, {user.name}. Manage everything here.</p>
        </div>

        {error && <p className="error-message">{error}</p>}
        {message && <p className="message">{message}</p>}

        <div className="card admin-card full-width">
          <h3>🚌 Bus Assignments</h3>
          <table className="assignment-table">
            <thead>
              <tr>
                <th>Bus</th>
                <th>Route</th>
                <th>Driver</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {buses.map((bus) => (
                <tr key={bus.busId}>
                  <td>{bus.busNumber}</td>
                  <td>
                    {isBusAssigned(bus) ? (
                      <span>{bus.routeNumber}</span>
                    ) : (
                      <select id={`route-${bus.busId}`}>
                        <option value="">Select Route</option>
                        {routes.map((r) => (
                          <option key={r.id} value={r.routeNumber}>
                            {r.routeNumber}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>
                    {isBusAssigned(bus) ? (
                      <span>{bus.driverName}</span>
                    ) : (
                      <select id={`driver-${bus.busId}`}>
                        <option value="">Select Driver</option>
                        {drivers.map((d) => (
                          <option key={d.uid} value={d.uid}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>
                    {isBusAssigned(bus) ? (
                      <span className="assigned-badge">Assigned</span>
                    ) : (
                      <button
                        className="assign-button"
                        onClick={() =>
                          handleAssignment(
                            bus.busId,
                            document.getElementById(`driver-${bus.busId}`).value,
                            document.getElementById(`route-${bus.busId}`).value
                          )
                        }
                      >
                        Assign
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-grid">
          <div className="card admin-card">
            <h3>Manage Routes</h3>
            <form onSubmit={handleAddRoute}>
              <input
                type="text"
                placeholder="New Route"
                value={newRoute}
                onChange={(e) => setNewRoute(e.target.value)}
              />
              <button type="submit">Add</button>
            </form>

            <ul className="item-list">
              {routes.map((r) => (
                <li key={r.id}>{r.routeNumber}</li>
              ))}
            </ul>
          </div>

          <div className="card admin-card">
            <h3>Manage Buses</h3>
            <form onSubmit={handleAddBus}>
              <input
                type="text"
                placeholder="New Bus"
                value={newBus}
                onChange={(e) => setNewBus(e.target.value)}
              />
              <button type="submit">Add</button>
            </form>

            <ul className="item-list">
              {buses.map((b) => (
                <li key={b.busId}>{b.busNumber}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
