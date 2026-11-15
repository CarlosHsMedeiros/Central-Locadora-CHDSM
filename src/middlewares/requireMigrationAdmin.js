const crypto = require("node:crypto");
const env = require("../config/env");
const HttpError = require("../utils/httpError");

module.exports = function requireMigrationAdmin(req, res, next) {
  if (!env.migrationAdminKey) return next(new HttpError(503, "MIGRATION_DISABLED", "Migração administrativa não configurada no servidor."));
  const supplied = req.get("x-migration-key") || "";
  const expected = Buffer.from(env.migrationAdminKey);
  const received = Buffer.from(supplied);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return next(new HttpError(401, "ADMIN_AUTH_REQUIRED", "Chave administrativa inválida."));
  next();
};
