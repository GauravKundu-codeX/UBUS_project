import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/adminComplaints.css";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export default function AdminComplaints({ onBack }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/complaints`);
      setComplaints(res.data);
    } catch (err) {
      console.error("Error fetching complaints:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.put(`${API_URL}/complaints/${id}`, { status: newStatus });
      fetchComplaints();
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  const filteredComplaints =
    filter === "All"
      ? complaints
      : complaints.filter((c) => c.status === filter);

  if (loading) return <div className="admin-loading">Loading complaints...</div>;

  return (
    <div className="admin-complaints-container">

      {/* Header */}
      <div className="complaints-header">
        <button className="back-btn" onClick={onBack}>
          ⬅ Back
        </button>
        <h2>📢 Complaints Management</h2>
      </div>

      {/* Filters */}
      <div className="filter-row">
        <label>Filter by Status:</label>
        <select
          className="filter-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option>All</option>
          <option>Pending</option>
          <option>In Progress</option>
          <option>Resolved</option>
          <option>Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="complaints-table-wrapper">
        <table className="complaints-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Student</th>
              <th>Category</th>
              <th>Description</th>
              <th>Bus</th>
              <th>Driver</th>
              <th>Status</th>
              <th>Update Status</th>
              <th>Filed On</th>
            </tr>
          </thead>

          <tbody>
            {filteredComplaints.length === 0 ? (
              <tr>
                <td colSpan="9" className="no-data">No complaints found</td>
              </tr>
            ) : (
              filteredComplaints.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>

                  {/* FIX: Correct student name column */}
                  <td>{c.studentName || "Unknown"}</td>

                  <td>{c.category}</td>

                  <td className="description-cell">
                    {c.description || "(No description)"}
                  </td>

                  <td>{c.busNumber || "-"}</td>
                  <td>{c.driverName || "-"}</td>

                  {/* Status Badge */}
                  <td>
                    <span
                      className={`status-badge ${c.status
                        .toLowerCase()
                        .replace(/\s+/g, "")}`}  // 🔥 FIXED
                    >
                      {c.status}
                    </span>
                  </td>

                  {/* Dropdown to update */}
                  <td>
                    <select
                      className="status-select"
                      value={c.status}
                      onChange={(e) => updateStatus(c.id, e.target.value)}
                    >
                      <option>Pending</option>
                      <option>In Progress</option>
                      <option>Resolved</option>
                      <option>Rejected</option>
                    </select>
                  </td>

                  <td>{new Date(c.created_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
