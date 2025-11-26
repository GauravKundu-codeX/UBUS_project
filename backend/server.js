// 1. Saare packages ko import karein
const express = require('express');
const http = require('http');
const mysql = require('mysql2/promise'); // MySQL ke liye
const cors = require('cors');
require('dotenv').config(); 
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
const crypto = require('crypto'); 
const { Server } = require('socket.io'); // Real-time ke liye

// 2. Server setup
const app = express();
app.use(cors()); // CORS ko enable karega (HTTP requests ke liye)
app.use(express.json()); // Taa ki server JSON (data) samajh paaye

const server = http.createServer(app);

// 3. SOCKET.IO SETUP (CORS fix ke saath)
const io = new Server(server, {
  cors: {
    origin: "*", // Development ke liye sabhi origins ko allow karo
    methods: ["GET", "POST"]
  }
});

// --- SOCKET.IO LOGIC ---
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Jab Student/Driver ek room join kare
  socket.on('joinRouteRoom', (routeNumber) => {
    socket.join(routeNumber); // Student ko uske routeNumber waale room mein daal do
    console.log(`Socket ${socket.id} joined room: ${routeNumber}`);
  });

  // Jab Driver apni location bheje
  socket.on('sendLocation', (data) => {
    // console.log('Location received:', data);
    // Yeh location usi route ke room mein broadcast kar do
    io.to(data.routeNumber).emit('locationUpdate', {
      location: data.location,
      routeNumber: data.routeNumber
    });
  });

  // Jab Driver trip start/stop kare
  socket.on('tripStatus', (data) => {
    // Yeh status usi route ke room mein broadcast kar do
    io.to(data.routeNumber).emit('tripStatus', {
      isActive: data.isActive,
      routeNumber: data.routeNumber
    });
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});
// --- SOCKET.IO LOGIC KHATAM ---


// 4. Database Connection Pool (MySQL)
const dbConfig = {
  host: process.env.DB_HOST,
   port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true // Stored Procedures ke liye zaroori
};

const pool = mysql.createPool(dbConfig);

// 5. Server ko Test Karne ke liye ek API
app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS solution');
    res.json({
      message: 'Connection successful!',
      solution: rows[0].solution
    });
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({ message: 'Database connection failed', error: err.message });
  }
});

// 6. SIGNUP API ROUTE
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password, role, collegeId, routeNumber } = req.body;
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const uid = crypto.randomUUID();
    
    // Yahan students ke liye routeNumber aur collegeId ko optional rakha hai
    await pool.query(
      'INSERT INTO users (uid, name, email, password, role, collegeId, routeNumber) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uid, name, email, hashedPassword, role, collegeId || null, routeNumber || null]
    );
    res.status(201).json({ message: 'User created successfully!' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error during signup', error: err.message });
  }
});

// 7. LOGIN API ROUTE
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await pool.query(
      // Login par hi user ka routeNumber aur routeId fetch kar lo
      `SELECT u.*, r.id as routeId 
       FROM users u 
       LEFT JOIN routes r ON u.routeNumber = r.routeNumber
       WHERE u.email = ?`,
      [email]
    );
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials (email)' });
    }
    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials (password)' });
    }
    const payload = { user: { id: user.id, uid: user.uid, role: user.role } };
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '30d' } 
    );
    
    // User ki saari details (password ke bina) frontend ko bhej do
    res.json({
      message: 'Login successful!',
      token: token,
        user: {
          id: user.id,              // ✅ REQUIRED
          uid: user.uid,
          name: user.name,
          email: user.email,
          role: user.role,
          collegeId: user.collegeId,
          routeNumber: user.routeNumber,
          routeId: user.routeId
  }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Server error during login', error: err.message });
  }
});


// 8. ADMIN API ROUTES (Routes, Buses, Drivers, Assign)
// GET ALL ROUTES
app.get('/api/routes', async (req, res) => {
  try {
    const [routes] = await pool.query('SELECT * FROM routes ORDER BY routeNumber');
    res.json(routes);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ADD A NEW ROUTE (stops ko JSON.stringify kiya hai)
app.post('/api/routes', async (req, res) => {
  try {
    const { routeNumber, stops } = req.body;
    await pool.query('INSERT INTO routes (routeNumber, stops) VALUES (?, ?)', [routeNumber, JSON.stringify(stops) || null]);
    res.status(201).json({ message: 'Route added!' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET ALL BUSES (VIEW) - YEH STUDENT DASHBOARD BHI USE KAREGA
app.get('/api/buses', async (req, res) => {
  try {
    // Humara banaya hua VIEW yahan call hoga
    const [buses] = await pool.query('SELECT * FROM v_bus_details');
    res.json(buses);
  } catch (err) {
    console.error('Error fetching v_bus_details:', err);
    res.status(500).json({ message: 'Server error fetching buses', error: err.message });
  }
});

// ADD A NEW BUS
app.post('/api/buses', async (req, res) => {
  try {
    const { busNumber } = req.body;
    await pool.query('INSERT INTO buses (busNumber) VALUES (?)', [busNumber]);
    res.status(201).json({ message: 'Bus added!' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET ALL DRIVERS
app.get('/api/drivers', async (req, res) => {
  try {
    // Hum 'id' (INT) ki jagah 'uid' (VARCHAR) bhejenge,
    // taaki Stored Procedure mein confusion na ho
    const [drivers] = await pool.query("SELECT uid, name, collegeId FROM users WHERE role = 'driver'");
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ASSIGN BUS TO DRIVER (STORED PROCEDURE)
app.post('/api/assign', async (req, res) => {
  try {
    // Frontend se 'driverUid' (VARCHAR), 'busId' (INT), aur 'routeNumber' (VARCHAR) aayega
    const { driverUid, busId, routeNumber } = req.body; 

    if (!driverUid || !busId || !routeNumber) {
      return res.status(400).json({ message: 'driverUid, busId, and routeNumber are required.' });
    }

    // Stored Procedure ko call karein (jo humne SQL mein banaya tha)
    await pool.query(
      'CALL sp_AssignDriverToBus(?, ?, ?)',
      [driverUid, busId, routeNumber]
    );
    
    res.json({ message: 'Assignment successful!' });
    
  } catch (err) {
    console.error('Assignment Error:', err);
    res.status(500).json({ message: 'Server error during assignment' });
  }
});


// --- DRIVER API ROUTES YAHAN SE SHURU ---

// GET MY ASSIGNED BUS (Driver Dashboard ke liye)
app.get('/api/my-bus', async (req, res) => {
  try {
    const { driverUid } = req.query; // Yeh frontend se 'user.uid' aayega
    if (!driverUid) {
      return res.status(400).json({ message: 'Driver UID is required' });
    }

    const [buses] = await pool.query(
      'SELECT * FROM v_bus_details WHERE driverUid = ?',
      [driverUid]
    );

    if (buses.length > 0) {
      res.json(buses[0]); // Driver ko sirf ek hi bus assign hogi
    } else {
      res.status(404).json({ message: 'No bus assigned to this driver' });
    }
  } catch (err) {
    console.error('Error fetching driver bus:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE TRIP STATUS (Driver 'Start/Stop' button se)
app.post('/api/trip-status', async (req, res) => {
  try {
    const { busId, isTripActive } = req.body;

    await pool.query(
      'UPDATE buses SET isTripActive = ? WHERE id = ?',
      [isTripActive, busId]
    );
    
    // MySQL Trigger (`trg_after_bus_status_update`) 
    // apna kaam karega aur bus_audit_log mein entry daal dega.
    
    res.json({ message: 'Trip status updated!' });
  } catch (err) {
    console.error('Error updating trip status:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// NAYA: UPDATE BUS LOCATION (Yeh driver har 10 sec mein bhejega)
app.post('/api/update-location', async (req, res) => {
  try {
    const { busId, lat, lng } = req.body;
    
    await pool.query(
      'UPDATE buses SET lat = ?, lng = ?, lastUpdate = CURRENT_TIMESTAMP WHERE id = ?',
      [lat, lng, busId]
    );
    
    res.json({ message: 'Location updated' });
  } catch(err) {
    console.error('Error updating location:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- DRIVER API ROUTES YAHAN KHATAM ---

// ✅ ✅ ✅ COMPLAINTS FEATURE (NEW) ✅ ✅ ✅

// 1️⃣ STUDENT: Submit a Complaint
app.post('/api/complaints', async (req, res) => {
  try {
    const { user_id, bus_id, driver_id, category, description } = req.body;

    if (!user_id || !category || !description) {
      return res.status(400).json({ message: 'Required fields missing' });
    }

    await pool.query(
      `INSERT INTO complaints (user_id, bus_id, driver_id, category, description)
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, bus_id || null, driver_id || null, category, description]
    );

    res.status(201).json({ message: 'Complaint submitted successfully!' });
  } catch (err) {
    console.error('Complaint Error:', err);
    res.status(500).json({ message: 'Server error while submitting complaint' });
  }
});


// 2️⃣ STUDENT: Get My Complaints
app.get('/api/complaints/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const [rows] = await pool.query(
      `SELECT c.*, b.busNumber, u.name AS driverName
       FROM complaints c
       LEFT JOIN buses b ON c.bus_id = b.id
       LEFT JOIN users u ON c.driver_id = u.id
       WHERE c.user_id = ?
       ORDER BY c.created_at DESC`,
      [user_id]
    );

    res.json(rows);
  } catch (err) {
    console.error('Fetch Error:', err);
    res.status(500).json({ message: 'Server error fetching complaints' });
  }
});


// 3️⃣ ADMIN: Get ALL Complaints
app.get('/api/complaints', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, s.name AS studentName, b.busNumber, d.name AS driverName
       FROM complaints c
       LEFT JOIN users s ON c.user_id = s.id
       LEFT JOIN buses b ON c.bus_id = b.id
       LEFT JOIN users d ON c.driver_id = d.id
       ORDER BY c.created_at DESC`
    );

    res.json(rows);
  } catch (err) {
    console.error('Admin Fetch Error:', err);
    res.status(500).json({ message: 'Server error fetching all complaints' });
  }
});


// 4️⃣ ADMIN: Update Complaint Status
app.put('/api/complaints/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    await pool.query(
      `UPDATE complaints
       SET status = ?, resolved_at = IF(? = 'Resolved', NOW(), NULL)
       WHERE id = ?`,
      [status, status, id]
    );

    res.json({ message: 'Status updated successfully!' });
  } catch (err) {
    console.error('Update Error:', err);
    res.status(500).json({ message: 'Server error updating status' });
  }
});


// Server ko Start karein
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend server (Kitchen) is running on http://localhost:${PORT}`);
});