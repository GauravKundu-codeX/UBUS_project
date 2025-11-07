// Yeh script 'schema.sql' file ko padhega aur database par run karega
const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config(); // .env file ko load karega

async function runSchema() {
  console.log('Connecting to database...');

  // 1. Railway se saare environment variables ko padho
  const dbConfig = {
    host: process.env.MYSQLHOST,     // Railway 'MYSQLHOST' use karta hai
    user: process.env.MYSQLUSER,     // Railway 'MYSQLUSER' use karta hai
    password: process.env.MYSQLPASSWORD, // Railway 'MYSQLPASSWORD' use karta hai
    database: process.env.MYSQLDATABASE, // Railway 'MYSQLDATABASE' use karta hai
    port: process.env.MYSQLPORT,       // Railway 'MYSQLPORT' use karta hai
    multipleStatements: true // Yeh 'schema.sql' ko run karne ke liye zaroori hai
  };

  if (!dbConfig.host) {
    console.error('Database configuration is missing!');
    console.log('Make sure you have linked this project with `railway link`');
    return;
  }

  let connection;
  try {
    // 2. Database se connect karo
    connection = await mysql.createConnection(dbConfig);
    console.log('Connection successful!');

    // 3. 'schema.sql' file ko padho
    console.log('Reading schema.sql file...');
    const schemaPath = path.join(__dirname, 'schema.sql'); // File ko dhoondho
    const sqlScript = await fs.readFile(schemaPath, 'utf-8');

    // 4. SQL script ko database par run (execute) karo
    console.log('Executing SQL script...');
    await connection.query(sqlScript);

    console.log('Database schema created successfully!');
    
  } catch (err) {
    // Agar koi galti (error) aayi
    console.error('Error:', err.message);
  } finally {
    // 5. Connection ko band kar do
    if (connection) {
      await connection.end();
      console.log('Connection closed.');
    }
  }
}

// Function ko run karo
runSchema();
