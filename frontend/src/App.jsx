import React, { useState, useEffect } from 'react';

// Abhi in files ko import kar rahe hain,
// lekin yeh khaali (empty) hongi
import AuthPage from './pages/AuthPage';
import StudentDashboard from './pages/StudentDashboard';
import DriverDashboard from './pages/DriverDashboard';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  // 'token' ka istemaal karke hum check karenge ki user logged in hai ya nahin
  const [token, setToken] = useState(localStorage.getItem('token'));
  // 'user' state mein hum logged-in user ki details save karenge
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  
  const handleLogin = (data) => {
    // Jab user login karega, hum token aur user details ko save karenge
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const handleLogout = () => {
    // Logout karne par token aur user details hata denge
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  // Yeh function check karega ki kaunsa page dikhana hai
  const renderDashboard = () => {
    if (token && user) {
      // Agar token aur user hain, toh role ke hisaab se dashboard dikhayein
      switch (user.role) {
        case 'student':
          return <StudentDashboard user={user} onLogout={handleLogout} />;
        case 'driver':
          return <DriverDashboard user={user} onLogout={handleLogout} />;
        case 'admin':
          return <AdminDashboard user={user} onLogout={handleLogout} />;
        default:
          // Agar role ajeeb hai, toh logout kar dein
          handleLogout();
          return <AuthPage onLogin={handleLogin} />;
      }
    }
    // Agar token nahin hai, toh login page dikhayein
    return <AuthPage onLogin={handleLogin} />;
  };

  return (
    <div className="app-container">
      {renderDashboard()}
    </div>
  );
}

export default App;