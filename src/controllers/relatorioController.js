const service = require("../services/relatorioService");
async function veiculos(req, res, next) { try { res.json(await service.veiculos(req.query)); } catch (erro) { next(erro); } }
module.exports = { veiculos };
