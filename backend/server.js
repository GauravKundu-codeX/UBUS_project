// 1. Saare packages ko import karein
const express = require('express');
const http = require('http');
// --- CHANGE ---
const { Pool } = require('pg'); // mysql2 ki jagah 'pg' (Postgres)
// --- END CHANGE ---
const cors = require('cors');
require('dotenv').config(); 
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
const crypto = require('crypto'); 
const { Server } = require('socket.io'); 

// 2. Server setup
const app = express();
app.use(cors()); 
app.use(express.json()); 

const server = http.createServer(app);

// 3. Socket.IO Setup
const io = new Server(server, {
  cors: {
    // Hum localhost (5174, 5175) aur Render (frontend) ko allow karenge
    origin: [
      "http://localhost:5174", 
      "http://localhost:5175", 
      process.env.FRONTEND_URL // Yeh Render se aayega
    ], 
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  socket.on('joinRouteRoom', (routeNumber) => {
    socket.join(routeNumber);
    console.log(`Socket ${socket.id} joined room: ${routeNumber}`);
  });
  socket.on('sendLocation', (data) => {
    io.to(data.routeNumber).emit('locationUpdate', {
      location: data.location,
      routeNumber: data.routeNumber
    });
  });
  socket.on('tripStatus', (data) => {
    io.to(data.routeNumber).emit('tripStatus', {
      isActive: data.isActive,
      routeNumber: data.routeNumber
    });
  });
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// 4. Database Connection Pool (--- YEH POORA BADLA HAI ---)
const pool = new Pool({
  // Hum Render/Neon se 'DATABASE_URL' naam ka ek variable lenge
  connectionString: process.env.DATABASE_URL,
  // Render par production ke liye SSL zaroori hai
  ssl: { rejectUnauthorized: false }
});
// --- CHANGE END ---

// 5. Server ko Test Karne ke liye ek API
app.get('/api/test-db', async (req, res) => {
  try {
    // Query badal gayi hai
    const result = await pool.query('SELECT 1 + 1 AS solution');
    res.json({
      message: 'Connection successful!',
      solution: result.rows[0].solution
    });
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// 6. SIGNUP API ROUTE (Query badal gayi hai)
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password, role, collegeId, routeNumber } = req.body;
    // MySQL '?' ki jagah Postgres '$1', '$2' use karta hai
    const existingUsers = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUsers.rows.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const uid = crypto.randomUUID();

    if (role === 'student' && routeNumber) {
       await pool.query(
        'INSERT INTO users (uid, name, email, password, role, "collegeId", "routeNumber") VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [uid, name, email, hashedPassword, role, collegeId || null, routeNumber]
      );
    } else {
       await pool.query(
        'INSERT INTO users (uid, name, email, password, role, "collegeId") VALUES ($1, $2, $3, $4, $5, $6)',
        [uid, name, email, hashedPassword, role, collegeId || null]
      );
    }
    res.status(201).json({ message: 'User created successfully!' });
  } catch (err) {
    console.error('Signup Error:', err);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// 7. LOGIN API ROUTE (Query badal gayi hai)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query(
      `SELECT u.*, r.id as "routeId" 
       FROM users u 
       LEFT JOIN routes r ON u."routeNumber" = r."routeNumber"
       WHERE u.email = $1`,
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials (email)' });
    }
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials (password)' });
    }
    const payload = { user: { id: user.id, uid: user.uid, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    // User data (Postgres camelCase mein nahin, lowercase mein bhejta hai)
    res.json({
      message: 'Login successful!',
      token: token,
      user: {
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
        collegeId: user.collegeId, // Postgres ne isse lowercase kar diya hoga
        routeNumber: user.routeNumber, // Postgres ne isse lowercase kar diya hoga
        routeId: user.routeId
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// 8. ADMIN API ROUTES
app.get('/api/routes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM routes ORDER BY "routeNumber"');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/routes', async (req, res) => {
  try {
    const { routeNumber, stops } = req.body;
    await pool.query('INSERT INTO routes ("routeNumber", stops) VALUES ($1, $2)', [routeNumber, JSON.stringify(stops) || null]);
    res.status(201).json({ message: 'Route added!' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/buses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM v_bus_details');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching buses' });
  }
});

app.post('/api/buses', async (req, res) => {
  try {
    const { busNumber } = req.body;
    await pool.query('INSERT INTO buses ("busNumber") VALUES ($1)', [busNumber]);
    res.status(201).json({ message: 'Bus added!' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/drivers', async (req, res) => {
  try {
    const result = await pool.query('SELECT uid, name, "collegeId" FROM users WHERE role = $1', ['driver']);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ASSIGN (Stored Procedure ko Postgres mein FUNCTION kehte hain)
app.post('/api/assign', async (req, res) => {
  try {
    const { driverUid, busId, routeNumber } = req.body;
    if (!driverUid || !busId || !routeNumber) {
      return res.status(400).json({ message: 'driverUid, busId, and routeNumber are required.' });
    }
    // Hum Stored Function ko call karenge
    await pool.query(
      "SELECT sp_AssignDriverToBus($1, $2, $3)",
      [driverUid, busId, routeNumber]
    );
    res.json({ message: 'Assignment successful!' });
  } catch (err) {
    console.error('Assignment Error:', err);
    res.status(500).json({ message: 'Server error during assignment' });
  }
});

// 9. DRIVER API ROUTES
app.get('/api/my-bus', async (req, res) => {
  try {
    const { driverUid } = req.query;
    if (!driverUid) {
      return res.status(400).json({ message: 'Driver UID is required' });
    }
    const result = await pool.query(
      'SELECT * FROM v_bus_details WHERE "driverUid" = $1',
      [driverUid]
    );
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ message: 'No bus assigned to this driver' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/trip-status', async (req, res) => {
  try {
    const { busId, isTripActive } = req.body;
    await pool.query(
      'UPDATE buses SET "isTripActive" = $1 WHERE id = $2',
      [isTripActive, busId]
    );
    res.json({ message: 'Trip status updated!' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/update-location', async (req, res) => {
  try {
    const { busId, lat, lng } = req.body;
    await pool.query(
      'UPDATE buses SET lat = $1, lng = $2, "lastUpdate" = CURRENT_TIMESTAMP WHERE id = $3',
      [lat, lng, busId]
    );
    res.json({ message: 'Location updated' });
  } catch(err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Server ko Start karein
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend server (Kitchen) is running on http://localhost:${PORT}`);
});