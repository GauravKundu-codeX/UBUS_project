import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/announcements.css";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export default function StudentAnnouncements({ onBack }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/announcements`);
      setAnnouncements(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  return (
    <div className="ann-page">

      {/* Header */}
      <div className="ann-header">
        <button className="back-btn" onClick={onBack}>⬅ Back</button>
        <h2>📢 Announcements</h2>
      </div>

      {/* Announcements List */}
      {loading ? (
        <p>Loading...</p>
      ) : announcements.length === 0 ? (
        <p>No announcements available.</p>
      ) : (
        <div className="ann-list">
          {announcements.map((a) => (
            <div className="ann-card" key={a.id}>
              <div className="ann-body">
                <h4>{a.title}</h4>
                <p>{a.message}</p>

                <span className="audience-tag">{a.audience}</span>

                <small>
                  {new Date(a.created_at).toLocaleString()}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
