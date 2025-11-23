import React, { useState } from "react";
import axios from "axios";

// Backend URL from your Vite .env file
const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState("student");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [routeNumber, setRouteNumber] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setCollegeId("");
    setRouteNumber("");
    setError("");
  };

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isLogin) {
      // ---------------- LOGIN ----------------
      try {
        const response = await axios.post(`${API_URL}/login`, {
          email,
          password,
        });

        onLogin(response.data);
      } catch (err) {
        setError(err.response?.data?.message || "Login failed");
        console.error("Login Error:", err);
      }
    } else {
      // ---------------- SIGNUP ----------------
      if (userType === "admin") {
        setError("Admin accounts cannot be created.");
        setLoading(false);
        return;
      }

      const signupData = {
        name,
        email,
        password,
        role: userType,
        collegeId,
        routeNumber: userType === "student" ? routeNumber : null,
      };

      try {
        await axios.post(`${API_URL}/signup`, signupData);
        setError("Signup successful! Please login.");
        setIsLogin(true);
        resetForm();
      } catch (err) {
        setError(err.response?.data?.message || "Signup failed");
        console.error("Signup Error:", err);
      }
    }

    setLoading(false);
  };

  // ---------------- SIGNUP FIELDS ----------------
  const renderSignUpFields = () => {
    switch (userType) {
      case "student":
        return (
          <>
            <p>I am a Student</p>
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Student ID"
              value={collegeId}
              onChange={(e) => setCollegeId(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Route Number (e.g., R10)"
              value={routeNumber}
              onChange={(e) => setRouteNumber(e.target.value)}
              required
            />
          </>
        );

      case "driver":
        return (
          <>
            <p>I am a Driver</p>
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Driver ID / Staff ID"
              value={collegeId}
              onChange={(e) => setCollegeId(e.target.value)}
              required
            />
          </>
        );

      case "admin":
        return <p className="message">Admin sign-up is disabled.</p>;

      default:
        return null;
    }
  };

  // ---------------- LOGIN FIELDS ----------------
  const renderSignInFields = () => {
    switch (userType) {
      case "student":
        return <p>I am a Student</p>;
      case "driver":
        return <p>I am a Driver</p>;
      case "admin":
        return <p>I am an Admin</p>;
      default:
        return null;
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="title">UBus (MySQL)</h1>
        <p className="subtitle">Welcome to the Bus Tracker</p>

        <div className="user-type-selector">
          <button
            className={userType === "student" ? "active" : ""}
            onClick={() => {
              setUserType("student");
              resetForm();
            }}
          >
            Student
          </button>

          <button
            className={userType === "driver" ? "active" : ""}
            onClick={() => {
              setUserType("driver");
              resetForm();
            }}
          >
            Driver
          </button>

          <button
            className={userType === "admin" ? "active" : ""}
            onClick={() => {
              setUserType("admin");
              setIsLogin(true);
              resetForm();
            }}
          >
            Admin
          </button>
        </div>

        <h2>{isLogin ? "Login" : "Sign Up"}</h2>

        <form onSubmit={handleAuthAction}>
          {isLogin ? renderSignInFields() : renderSignUpFields()}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p className={error.includes("successful") ? "message" : "error-message"}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading || (!isLogin && userType === "admin")}>
            {loading ? "Processing..." : isLogin ? "Login" : "Sign Up"}
          </button>
        </form>

        <button
          className="toggle-auth"
          onClick={() => {
            setIsLogin(!isLogin);
            resetForm();
          }}
          disabled={userType === "admin"}
        >
          {isLogin ? "Need an account? Sign Up" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
}

export default AuthPage;
