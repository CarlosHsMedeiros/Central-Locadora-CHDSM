const mysql = require("mysql2/promise");
const env = require("./env");

const pool = mysql.createPool({
  host: env.database.host,
  port: env.database.port,
  database: env.database.name,
  user: env.database.user,
  password: env.database.password,
  waitForConnections: true,
  connectionLimit: env.database.connectionLimit,
  queueLimit: 100,
  connectTimeout: env.database.connectTimeout,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: "utf8mb4",
  multipleStatements: false,
  timezone: "Z",
  supportBigNumbers: true,
  bigNumberStrings: true,
});

module.exports = pool;
