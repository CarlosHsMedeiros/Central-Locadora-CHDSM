const env = require("../config/env");

module.exports = {
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
    const error = new Error("Origem não autorizada pelo CORS.");
    error.status = 403;
    error.code = "CORS_ORIGIN_DENIED";
    callback(error);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept", "X-Migration-Key"],
};
