const express = require("express");
const healthController = require("../controllers/healthController");

const router = express.Router();
router.get("/", healthController.show);

module.exports = router;
