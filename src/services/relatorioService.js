const repository = require("../repositories/relatorioRepository");
const validator = require("../validators/relatorioValidator");
async function veiculos(query) {
  const params = validator.veiculos(query), resultado = await repository.veiculos(params);
  return { data: resultado.rows, resumo: { registros: resultado.total, valorMensalPagina: resultado.rows.reduce((t, i) => t + Number(i.valorMensal || 0), 0) }, pagination: { page: params.page, limit: params.limit, total: resultado.total, pages: Math.ceil(resultado.total / params.limit) } };
}
module.exports = { veiculos };
