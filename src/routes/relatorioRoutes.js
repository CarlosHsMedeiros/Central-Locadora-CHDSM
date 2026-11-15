const router = require("express").Router(), controller = require("../controllers/relatorioController"), authorize = require("../middlewares/authorize");
router.get("/veiculos", authorize("administrador", "atendimento", "financeiro", "manutenção", "consulta"), controller.veiculos);
module.exports = router;
