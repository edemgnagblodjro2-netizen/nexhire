const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function query(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

// Thin helper — returns rows array
async function all(text, params = []) {
  const res = await query(text, params);
  return res.rows;
}

// Returns first row or null
async function get(text, params = []) {
  const res = await query(text, params);
  return res.rows[0] || null;
}

// Returns rowCount
async function run(text, params = []) {
  const res = await query(text, params);
  return res.rowCount;
}

module.exports = { pool, query, all, get, run };
