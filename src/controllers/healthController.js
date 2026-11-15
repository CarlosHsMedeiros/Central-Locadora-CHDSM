const healthService = require("../services/healthService");

async function show(req, res) {
  const result = await healthService.getHealth();
  res.status(result.httpStatus).json(result.body);
}

module.exports = { show };
