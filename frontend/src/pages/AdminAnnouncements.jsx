import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/announcements.css";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export default function AdminAnnouncements({ onBack, user }) {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("All");
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState("");

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/announcements`);
      setAnnouncements(res.data);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
    setLoading(false);
  };

  const createAnnouncement = async (e) => {
    e.preventDefault();
    setStatusMsg("");

    if (!title.trim() || !message.trim()) {
      setStatusMsg("⚠ Title and message required");
      return;
    }

    try {
      await axios.post(`${API_URL}/announcements`, {
        title,
        message,
        audience,
        admin_id: user.id,
      });

      setStatusMsg("✅ Announcement posted!");
      setTitle("");
      setMessage("");

      fetchAnnouncements();
    } catch (err) {
      console.error("Create error:", err);
      setStatusMsg("❌ Failed to post announcement");
    }
  };

  const deleteAnnouncement = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;

    try {
      await axios.delete(`${API_URL}/announcements/${id}`);
      fetchAnnouncements();
    } catch (err) {
      console.error("Delete Error:", err);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  return (
    <div className="ann-page">

      <div className="ann-header">
        <button className="back-btn" onClick={onBack}>⬅ Back</button>
        <h2>📢 Announcements (Admin)</h2>
      </div>

      {/* CREATE ANNOUNCEMENT FORM */}
      <form onSubmit={createAnnouncement} className="ann-form">
        <input
          type="text"
          placeholder="Announcement title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <textarea
          placeholder="Enter announcement message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />

        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
        >
          <option value="All">All</option>
          <option value="Students">Students</option>
          <option value="Drivers">Drivers</option>
        </select>

        <button type="submit" className="post-btn">
          📢 Post Announcement
        </button>

        {statusMsg && <p className="status-message">{statusMsg}</p>}
      </form>

      <h3 className="section-title">📜 Posted Announcements</h3>

      {/* ANNOUNCEMENT LIST */}
      {loading ? (
        <p>Loading...</p>
      ) : announcements.length === 0 ? (
        <p>No announcements yet.</p>
      ) : (
        <div className="ann-list">
          {announcements.map((a) => (
            <div className="ann-card" key={a.id}>
              <div className="ann-body">
                <h4>{a.title}</h4>
                <p>{a.message}</p>

                <span className="audience-tag">{a.audience}</span>

                <small>
                  By {a.adminName} • {new Date(a.created_at).toLocaleString()}
                </small>
              </div>

              <button
                className="delete-btn"
                onClick={() => deleteAnnouncement(a.id)}
              >
                ❌ Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
