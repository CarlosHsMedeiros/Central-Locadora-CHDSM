"use strict";
const origins = new Map();
const localOrigin = "http://central-locadora-chdsm";
function remember(req, state) {
  const now = Date.now();
  for (const [key, value] of origins) if (value.expires <= now) origins.delete(key);
  if (req.protocol + "://" + req.get("host").toLowerCase() === localOrigin) {
    origins.set(state, { expires: now + 10 * 60 * 1000 });
  }
}
function redirect(req, res, next) {
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const value = origins.get(state);
  if (!value || value.expires <= Date.now()) { origins.delete(state); return next(); }
  if (req.protocol + "://" + req.get("host").toLowerCase() === localOrigin) return next();
  // Return to the origin that holds the session and OAuth state cookies.
  // The existing callback still validates both cookies before redeeming the code.
  res.set("Cache-Control", "no-store");
  res.set("Referrer-Policy", "no-referrer");
  res.redirect(302, localOrigin + req.originalUrl);
}
module.exports = { remember, redirect };
