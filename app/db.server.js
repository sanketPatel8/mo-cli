// // app/db.server.js

// import mysql from "mysql2/promise";

// const pool = mysql.createPool({
//   host: process.env.MYSQL_HOST,
//   user: process.env.MYSQL_USER,
//   password: process.env.MYSQL_PASSWORD,
//   database: process.env.MYSQL_DATABASE,
//   waitForConnections: true,
//   connectionLimit: 10,
// });

// export default pool;

// app/db.server.js
import mysql from "mysql2/promise";

let pool;

if (!global._pool) {
  global._pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

pool = global._pool;

/**
 * Gracefully close the pool connection.
 * Useful during app shutdown or testing teardown.
 */
export async function closePool() {
  try {
    await pool.end();
    console.log("✅ MySQL pool closed successfully.");
  } catch (err) {
    console.error("❌ Error closing MySQL pool:", err);
  }
}

export default pool;
