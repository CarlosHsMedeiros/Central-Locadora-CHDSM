const healthRepository = require("../repositories/healthRepository");

async function getHealth() {
  const checkedAt = new Date().toISOString();
  try {
    await healthRepository.pingDatabase();
    return { httpStatus: 200, body: { status: "ok", service: "central-locadora-api", database: "connected", checkedAt } };
  } catch (error) {
    return { httpStatus: 503, body: { status: "degraded", service: "central-locadora-api", database: "disconnected", checkedAt } };
  }
}

module.exports = { getHealth };
