// Database configuration for PostgreSQL
// Handles connection setup and pooling

const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'plancompareai',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased timeout for production
  query_timeout: 20000, // Query timeout
  statement_timeout: 20000, // Statement timeout
};

// Add SSL config for production/hosted databases
if (process.env.DB_SSL === 'true') {
  dbConfig.ssl = {
    rejectUnauthorized: false, // Required for hosted PostgreSQL (like Render.com)
    require: true // Require SSL connection
  };
}

const pool = new Pool(dbConfig);

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err.message);
  console.log('Server will continue running, but database operations may fail');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};