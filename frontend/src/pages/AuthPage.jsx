import React, { useState, useEffect } from "react";
import '../styles/auth.css';
import axios from "axios";

// Backend URL from your Vite .env file
const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState("student");
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [routeNumber, setRouteNumber] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Update the selector background position
  useEffect(() => {
    const selector = document.querySelector('.user-type-selector');
    if (selector) {
      selector.setAttribute('data-active', userType);
    }
  }, [userType]);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setCollegeId("");
    setRouteNumber("");
    setError("");
  };

  const toggleAuthMode = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsLogin(!isLogin);
      resetForm();
      setIsTransitioning(false);
    }, 300);
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

  // ✅ Save to localStorage immediately
  localStorage.setItem("token", response.data.token);
  localStorage.setItem("user", JSON.stringify(response.data.user));

  // ✅ Pass only user & token to App
  onLogin({
    token: response.data.token,
    user: response.data.user
  });

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
        setTimeout(() => {
          toggleAuthMode();
        }, 1500);
      } catch (err) {
        setError(err.response?.data?.message || "Signup failed");
        console.error("Signup Error:", err);
      }
    }

    setLoading(false);
  };

  // ---------------- SIGNUP FIELDS ----------------
  const renderSignUpFields = () => {
    if (isTransitioning) return null;
    
    switch (userType) {
      case "student":
        return (
          <div className="form-fields">
            <p>🎓 I am a Student</p>
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
          </div>
        );

      case "driver":
        return (
          <div className="form-fields">
            <p>🚌 I am a Driver</p>
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
          </div>
        );

      case "admin":
        return (
          <div className="form-fields">
            <p className="message">⚠️ Admin sign-up is disabled.</p>
          </div>
        );

      default:
        return null;
    }
  };

  // ---------------- LOGIN FIELDS ----------------
  const renderSignInFields = () => {
    if (isTransitioning) return null;
    
    const icons = {
      student: "🎓",
      driver: "🚌",
      admin: "👨‍💼"
    };
    
    const labels = {
      student: "I am a Student",
      driver: "I am a Driver",
      admin: "I am an Admin"
    };

    return (
      <div className="form-fields">
        <p>{icons[userType]} {labels[userType]}</p>
      </div>
    );
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="title">🚌 UBus</h1>
        <p className="subtitle">Smart Campus Transportation System</p>

        <div className="user-type-selector" data-active={userType}>
          <button
            className={userType === "student" ? "active" : ""}
            onClick={() => {
              setUserType("student");
              resetForm();
            }}
            type="button"
          >
            Student
          </button>

          <button
            className={userType === "driver" ? "active" : ""}
            onClick={() => {
              setUserType("driver");
              resetForm();
            }}
            type="button"
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
            type="button"
          >
            Admin
          </button>
        </div>

        <h2>{isLogin ? "Welcome Back! 👋" : "Create Account ✨"}</h2>

        <form 
          onSubmit={handleAuthAction} 
          className={isTransitioning ? 'form-transition' : ''}
        >
          {isLogin ? renderSignInFields() : renderSignUpFields()}

          <input
            type="email"
            placeholder="📧 Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="🔒 Password"
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
            {loading ? "Processing..." : isLogin ? "🚀 Login" : "📝 Sign Up"}
          </button>
        </form>

        <button
          className="toggle-auth"
          onClick={toggleAuthMode}
          disabled={userType === "admin" && !isLogin}
          type="button"
        >
          {isLogin ? "Need an account? Sign Up 📝" : "Already have an account? Login 🚀"}
        </button>
      </div>
    </div>
  );
}

export default AuthPage;
