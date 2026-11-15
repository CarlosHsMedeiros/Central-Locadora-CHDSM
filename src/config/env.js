const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function integer(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} deve ser um número inteiro positivo.`);
  }
  return value;
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável de ambiente obrigatória ausente: ${name}.`);
  return value;
}

const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || "development",
  port: integer("PORT", 3000),
  corsOrigins: (process.env.CORS_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean),
  migrationAdminKey: process.env.MIGRATION_ADMIN_KEY || "",
  sessionHours: integer("SESSION_HOURS", 8),
  database: Object.freeze({
    host: required("DB_HOST"),
    port: integer("DB_PORT", 3306),
    name: required("DB_NAME"),
    user: required("DB_USER"),
    password: process.env.DB_PASSWORD || "",
    connectionLimit: integer("DB_CONNECTION_LIMIT", 10),
    connectTimeout: integer("DB_CONNECT_TIMEOUT", 5000),
  }),
  googleDrive: Object.freeze({
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || "",
    redirectUri: process.env.GOOGLE_DRIVE_REDIRECT_URI || "",
    tokenEncryptionKey: process.env.GOOGLE_DRIVE_TOKEN_KEY || "",
    authorizedEmail: (process.env.GOOGLE_DRIVE_AUTHORIZED_EMAIL || "").toLowerCase(),
  }),
});

module.exports = env;
