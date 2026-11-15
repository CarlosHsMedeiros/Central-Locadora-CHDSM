const pool = require("../config/database");

async function pingDatabase() {
  const connection = await pool.getConnection();
  try {
    await connection.execute("SELECT 1 AS ok");
  } finally {
    connection.release();
  }
}

module.exports = { pingDatabase };
