
import { Pool } from 'pg';

// Serverless-friendly pool configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Optimize for serverless environments
  max: process.env.VERCEL ? 2 : 10, // Limit connections in serverless
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Handle SSL properly for different environments
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
});

// Handle connection errors gracefully
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
