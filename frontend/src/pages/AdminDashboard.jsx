import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Hamare backend server ka URL
const API_URL = 'http://localhost:3001/api';

function AdminDashboard({ user, onLogout }) {
  // 3 collections ke liye state
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);

  // Naye forms ke liye state
  const [newRoute, setNewRoute] = useState('');
  const [newBus, setNewBus] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(''); // Success messages ke liye

  // Helper function: sab data fetch karega
  const fetchData = async () => {
    setLoading(true);
    try {
      // 3 API calls ek saath (Promise.all)
      const [routesRes, busesRes, driversRes] = await Promise.all([
        axios.get(`${API_URL}/routes`),
        axios.get(`${API_URL}/buses`), // Yeh 'v_bus_details' VIEW ko call karega
        axios.get(`${API_URL}/drivers`)
      ]);

      setRoutes(routesRes.data);
      setBuses(busesRes.data);
      setDrivers(driversRes.data);
      setError('');

    } catch (err) {
      setError('Failed to fetch data. Is the backend server running?');
    }
    setLoading(false);
  };

  // Jab page load ho, tab data fetch karein
  useEffect(() => {
    fetchData();
  }, []);

  // Success message ko thodi der dikhane ke liye
  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000); // 3 sec baad message hide kar dein
  };

  // --- Form Handlers ---
  const handleAddRoute = async (e) => {
    e.preventDefault();
    if (!newRoute) return;
    try {
      await axios.post(`${API_URL}/routes`, { routeNumber: newRoute, stops: [] });
      showMessage(`Route ${newRoute} added!`);
      setNewRoute('');
      fetchData(); // List ko refresh karein
    } catch (err) {
      setError("Failed to add route.");
    }
  };

  const handleAddBus = async (e) => {
    e.preventDefault();
    if (!newBus) return;
    try {
      await axios.post(`${API_URL}/buses`, { busNumber: newBus });
      showMessage(`Bus ${newBus} added!`);
      setNewBus('');
      fetchData(); // List ko refresh karein
    } catch (err) {
      setError("Failed to add bus.");
    }
  };

  // --- ASSIGNMENT HANDLER ---
  const handleAssignment = async (busId, driverUid, routeNumber) => {
    if (!driverUid || !busId || !routeNumber) {
      setError("Please select a bus, route, AND driver for assignment.");
      return;
    }
    setError('');
    
    try {
      // Backend ko data bhej dein
      await axios.post(`${API_URL}/assign`, {
        driverUid: driverUid,
        busId: busId,
        routeNumber: routeNumber
      });
      
      showMessage("Assignment successful!");
      fetchData(); // List ko refresh karein

    } catch (err) {
      setError(err.response?.data?.message || "Failed to assign.");
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>Admin Dashboard</h1>
          <button onClick={onLogout} className="logout-button">Logout</button>
        </header>
        <div className="dashboard-content">
          <div className="loading-container">Loading admin data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <button onClick={onLogout} className="logout-button">Logout</button>
      </header>

      <div className="dashboard-content admin-dashboard">
        <div className="welcome-card">
          <h2>Admin Control Panel</h2>
          <p>Welcome, {user.name}. Manage all buses, routes, and drivers here.</p>
        </div>

        {error && <p className="error-message">{error}</p>}
        {message && <p className="message">{message}</p>}

        {/* --- ASSIGNMENT CARD --- */}
        <div className="card admin-card full-width">
          <h3>Bus Assignments</h3>
          <p>Assign routes and drivers to available buses.</p>
          <table className="assignment-table">
            <thead>
              <tr>
                <th>Bus</th>
                <th>Assigned Route</th>
                <th>Assigned Driver</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {buses.length === 0 && (
                <tr><td colSpan="4">No buses found. Add one below.</td></tr>
              )}
              {buses.map(bus => (
                <tr key={bus.busId}>
                  <td><strong>{bus.busNumber}</strong></td>
                  {/* Route Dropdown */}
                  <td>
                    <select
                      id={`route-select-${bus.busId}`}
                      defaultValue={bus.routeNumber || ''}
                    >
                      <option value="">-- Select Route --</option>
                      {routes.map(route => (
                        <option key={route.id} value={route.routeNumber}>
                          {route.routeNumber}
                        </option>
                      ))}
                    </select>
                  </td>
                  {/* Driver Dropdown */}
                  <td>
                    <select
                      id={`driver-select-${bus.busId}`}
                      defaultValue={bus.driverUid || ''}
                    >
                      <option value="">-- Select Driver --</option>
                      {drivers.map(driver => (
                        // Hum 'uid' (VARCHAR) ko value mein use kar rahe hain
                        <option key={driver.uid} value={driver.uid}>
                          {driver.name} ({driver.collegeId})
                        </option>
                      ))}
                    </select>
                  </td>
                  {/* Assign Button */}
                  <td>
                    <button 
                      className="assign-button"
                      onClick={() => handleAssignment(
                        bus.busId,
                        document.getElementById(`driver-select-${bus.busId}`).value,
                        document.getElementById(`route-select-${bus.busId}`).value
                      )}
                    >
                      Assign
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- MANAGE ROUTES & BUSES (SIDE-BY-SIDE) --- */}
        <div className="admin-grid">
          <div className="card admin-card">
            <h3>Manage Routes</h3>
            <form onSubmit={handleAddRoute}>
              <input
                type="text"
                placeholder="New Route (e.g., R50)"
                value={newRoute}
                onChange={(e) => setNewRoute(e.target.value)}
              />
              <button type="submit">Add Route</button>
            </form>
            <ul className="item-list">
              {routes.map(route => (
                <li key={route.id}>
                  <span>{route.routeNumber}</span>
                  {/* Delete button (humne abhi nahin banaya) */}
                </li>
              ))}
            </ul>
          </div>

          <div className="card admin-card">
            <h3>Manage Buses</h3>
            <form onSubmit={handleAddBus}>
              <input
                type="text"
                placeholder="New Bus (e.g., PB 01 9999)"
                value={newBus}
                onChange={(e) => setNewBus(e.target.value)}
              />
              <button type="submit">Add Bus</button>
            </form>
            <ul className="item-list">
              {buses.map(bus => (
                <li key={bus.busId}>
                  <span>{bus.busNumber}</span>
                  {/* Delete button (humne abhi nahin banaya) */}
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}

export default AdminDashboard;