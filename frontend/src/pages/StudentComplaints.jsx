// src/pages/StudentComplaints.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/complaints.css";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export default function StudentComplaints({ user, onBack }) {
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [complaints, setComplaints] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // ✅ Helper: check if user + id present
  const hasUserId = user && typeof user.id !== "undefined";

  // ✅ Fetch complaints for this user
  const loadComplaints = async () => {
    if (!hasUserId) {
      console.warn("StudentComplaints: user.id is missing, cannot load complaints.");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(`${API_URL}/complaints/user/${user.id}`);
      setComplaints(res.data || []);
    } catch (err) {
      console.error("Fetch error:", err);
      setMessage("❌ Failed to load your complaints.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Submit complaint
  const submitComplaint = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!hasUserId) {
      setMessage("❌ Cannot submit complaint: user id missing. Please log in again.");
      return;
    }

    try {
      await axios.post(`${API_URL}/complaints`, {
        user_id: user.id,  // ✅ must match backend field
       
        category,
        description,
      });

      setMessage("✅ Complaint submitted!");
      setCategory("");
      setDescription("");
      loadComplaints(); // reload list
    } catch (err) {
      console.error("Submit error:", err);
      setMessage("❌ Failed to submit complaint. Try again.");
    }
  };

  // If user.id itself missing -> show clear note
  if (!hasUserId) {
    return (
      <div className="complaint-page">
        <h2>📢 Submit a Complaint</h2>
        <p className="error-message">
          We couldn't find your user ID from login response.  
          Please log out and log in again.
        </p>
        <button onClick={onBack}>⬅ Back</button>
      </div>
    );
  }

  return (
    <div className="complaint-page">
      <h2>📢 Submit a Complaint</h2>

      <form onSubmit={submitComplaint}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          <option value="">Select Category</option>
          <option>Driver Behavior</option>
          <option>Bus Condition</option>
          <option>Route Issue</option>
          <option>Late Arrival</option>
          <option>Other</option>
        </select>

        <textarea
          placeholder="Describe your issue..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <button type="submit">Submit</button>
      </form>

      {message && <p>{message}</p>}

      <hr />

      <h2>📋 My Complaints</h2>

      {loading ? (
        <p>Loading your complaints...</p>
      ) : complaints.length === 0 ? (
        <p>No complaints submitted yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Description</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map((c) => (
              <tr key={c.id}>
                <td>{c.category}</td>
                <td>{c.description}</td>
                <td>{c.status}</td>
                <td>{new Date(c.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button onClick={onBack}>⬅ Back</button>
    </div>
  );
}
