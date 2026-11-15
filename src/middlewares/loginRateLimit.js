const crypto = require("node:crypto");
const HttpError = require("../utils/httpError");
const attempts = new Map();
const WINDOW = 15 * 60 * 1000;
const MAX_KEYS = 20000;
function cleanup(now) { for (const [key, entry] of attempts) if (entry.reset <= now && entry.pending === 0) attempts.delete(key); }
module.exports = function loginRateLimit(req, res, next) {
  const now = Date.now(); cleanup(now);
  const username = typeof req.body?.usuario === "string" ? req.body.usuario.trim().toLowerCase().slice(0,80) : "";
  const account = crypto.createHash("sha256").update(username).digest("hex");
  const limits = [[ "ip:" + req.ip, 30 ], [ "account:" + account, 10 ], [ "pair:" + req.ip + ":" + account, 5 ]];
  if (attempts.size + limits.filter(([key]) => !attempts.has(key)).length > MAX_KEYS) {
    res.set("Retry-After", "900");
    return next(new HttpError(429, "LOGIN_RATE_LIMITED", "Muitas tentativas. Tente novamente mais tarde."));
  }
  for (const [key, max] of limits) {
    const entry = attempts.get(key);
    if (entry && entry.failures + entry.pending >= max) {
      res.set("Retry-After", String(Math.max(1, Math.ceil((entry.reset - now) / 1000))));
      return next(new HttpError(429, "LOGIN_RATE_LIMITED", "Muitas tentativas de login. Tente novamente mais tarde."));
    }
  }
  const reserved = limits.map(([key]) => {
    let entry = attempts.get(key);
    if (!entry) { entry = { failures: 0, pending: 0, reset: now + WINDOW }; attempts.set(key, entry); }
    entry.pending++; return entry;
  });
  let settled = false;
  const settle = () => {
    if (settled) return; settled = true;
    reserved.forEach(entry => {
      entry.pending--;
      // Reserva antes do bcrypt impede bypass por requisições concorrentes.
      if (!res.writableFinished || res.statusCode >= 400) entry.failures++;
    });
  };
  res.once("finish", settle); res.once("close", settle);
  next();
};
module.exports.reset = () => attempts.clear();
