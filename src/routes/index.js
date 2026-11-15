const express = require("express");
const healthRoutes = require("./healthRoutes");
const clienteRoutes = require("./clienteRoutes");
const veiculoRoutes = require("./veiculoRoutes");
const authRoutes = require("./authRoutes");
const usuarioRoutes = require("./usuarioRoutes");
const relatorioRoutes = require("./relatorioRoutes");
const contratoRoutes = require("./contratoRoutes");
const authenticate = require("../middlewares/authenticate");
const auditAdministrativeAction = require("../middlewares/auditAdministrativeAction");

const router = express.Router();
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use(authenticate);
router.use(auditAdministrativeAction);
router.use("/clientes", clienteRoutes);
router.use("/veiculos", veiculoRoutes);
router.use("/relatorios", relatorioRoutes);
router.use("/contratos", contratoRoutes);
router.use("/admin/usuarios", usuarioRoutes);

module.exports = router;
