import React, { useState } from 'react';
import axios from 'axios'; // API call ke liye hum axios ka istemaal karenge

// Hamare backend server ka URL
const API_URL = 'http://localhost:3001/api';

function AuthPage({ onLogin }) { // 'onLogin' prop App.jsx se aa raha hai
  // 'login' ya 'signup'
  const [isLogin, setIsLogin] = useState(true);
  // 'student', 'driver', ya 'admin'
  const [userType, setUserType] = useState('student');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [routeNumber, setRouteNumber] = useState(''); // Sirf student ke liye
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Function to reset the form when switching modes
  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setCollegeId('');
    setRouteNumber('');
    setError('');
  };

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isLogin) {
      // --- Handle Login ---
      try {
        const response = await axios.post(`${API_URL}/login`, {
          email,
          password,
        });
        
        // Login successful! App.jsx ko data bhej dein
        onLogin(response.data);
        
      } catch (err) {
        // Server se error message dikhayein
        setError(err.response?.data?.message || 'Login failed');
        console.error("Login Error: ", err);
      }

    } else {
      // --- Handle Sign Up ---
      if (userType === 'admin') {
        setError("Admin accounts cannot be created from the sign-up page.");
        setLoading(false);
        return;
      }

      // Signup ke liye poora data object banayein
      const signupData = {
        name,
        email,
        password,
        role: userType,
        collegeId,
        routeNumber: userType === 'student' ? routeNumber : null,
      };

      try {
        // Backend ko signup data bhej dein
        await axios.post(`${API_URL}/signup`, signupData);
        
        // Signup successful! Ab user ko bolein ki login karein
        setError('Signup successful! Please login.');
        setIsLogin(true); // Login tab par switch kar dein
        resetForm();

      } catch (err) {
        setError(err.response?.data?.message || 'Signup failed');
        console.error("Sign Up Error: ", err);
      }
    }
    setLoading(false);
  };

  // Yeh function userType ke hisaab se sign-up fields dikhayega
  const renderSignUpFields = () => {
    switch (userType) {
      case 'student':
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
              placeholder="Your Bus Route Number (e.g., R10)" 
              value={routeNumber} 
              onChange={(e) => setRouteNumber(e.target.value)} 
              required 
            />
          </>
        );
      case 'driver':
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
      case 'admin':
        return (
          <p className="message">
            Admin sign-up is disabled. Please log in.
          </p>
        );
      default:
        return null;
    }
  };
  
  // Yeh function userType ke hisaab se sign-in text dikhayega
  const renderSignInFields = () => {
     switch (userType) {
      case 'student':
        return <p>I am a Student</p>;
      case 'driver':
        return <p>I am a Driver</p>;
      case 'admin':
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
            className={userType === 'student' ? 'active' : ''} 
            onClick={() => { setUserType('student'); resetForm(); }}
          >
            Student
          </button>
          <button 
            className={userType === 'driver' ? 'active' : ''} 
            onClick={() => { setUserType('driver'); resetForm(); }}
          >
            Driver
          </button>
          <button 
            className={userType === 'admin' ? 'active' : ''} 
            onClick={() => { setUserType('admin'); setIsLogin(true); resetForm(); }}
          >
            Admin
          </button>
        </div>

        <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
        
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
          
          {error && <p className={error.includes('successful') ? 'message' : 'error-message'}>{error}</p>}
          
          <button type="submit" disabled={loading || (!isLogin && userType === 'admin')}>
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>
        
        <button 
          className="toggle-auth" 
          onClick={() => { setIsLogin(!isLogin); resetForm(); }}
          disabled={userType === 'admin'} // Admin ke liye toggle disable
        >
          {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
}

// AuthPage styling (auth-container, auth-card, etc.)
// Yeh styling humne pehle hi frontend/src/index.css mein daal di hai
// Lekin kuch specific styles yahan add kar raha hoon
const authStyles = `
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100%;
  padding: 20px;
}

.auth-card {
  background: white;
  padding: 30px 40px;
  border-radius: 12px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 450px;
  text-align: center;
}

.title {
  color: #007bff;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 5px;
}

.subtitle {
  font-size: 1.1rem;
  color: #6c757d;
  margin-bottom: 25px;
}

.auth-card h2 {
  margin-bottom: 20px;
  font-weight: 500;
}

.auth-card p {
  margin-bottom: 10px;
  color: #555;
  font-weight: 500;
}

.user-type-selector {
  display: flex;
  margin-bottom: 20px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ddd;
}

.user-type-selector button {
  flex: 1;
  padding: 12px;
  border: none;
  background: #f1f1f1;
  color: #333;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 0;
  border-radius: 0;
}

.user-type-selector button.active {
  background: #007bff;
  color: white;
  font-weight: 600;
}

.user-type-selector button:not(:last-child) {
  border-right: 1px solid #ddd;
}

.toggle-auth {
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  padding: 5px;
  font-size: 0.9rem;
  width: auto;
  margin-top: 10px;
}

.toggle-auth:disabled {
  color: #ccc;
  cursor: not-allowed;
}
`;

// Styles ko dynamically inject karein (ya inhein index.css mein move kar dein)
// Abhi ke liye, hum index.css par nirbhar rahenge
// export default AuthPage;

// Better way: return JSX with a style tag
// Lekin humne index.css mein daal diya hai, toh iski zaroorat nahin
export default AuthPage;