require('dotenv').config();

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || '';
const isLocal =
  connectionString.includes('localhost') ||
  connectionString.includes('127.0.0.1') ||
  connectionString.includes('@db:') ||
  connectionString.includes('@postgres:');

const needsSsl =
  connectionString.includes('sslmode=require') ||
  (!isLocal && connectionString.length > 0);

const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : false
});

module.exports = pool;
