const HttpError = require("../utils/httpError");

function inteiroPositivo(valor, nome, padrao, maximo) {
  if (valor === undefined || valor === null || valor === "") return padrao;
  if (!/^\d+$/.test(String(valor)) || Number(valor) < 1 || Number(valor) > maximo) {
    throw new HttpError(400, "INVALID_QUERY", `${nome} deve ser um inteiro entre 1 e ${maximo}.`);
  }
  return Number(valor);
}

function data(valor, nome) {
  if (!valor) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(valor)) || Number.isNaN(Date.parse(`${valor}T00:00:00Z`))) {
    throw new HttpError(400, "INVALID_QUERY", `${nome} deve estar no formato AAAA-MM-DD.`);
  }
  return String(valor);
}

function ids(valor) {
  if (!valor) return [];
  const lista = String(valor).split(",").map(item => item.trim()).filter(Boolean);
  if (lista.length > 100 || lista.some(item => !/^\d+$/.test(item) || item === "0")) {
    throw new HttpError(400, "INVALID_QUERY", "clienteIds deve conter IDs válidos separados por vírgula.");
  }
  return [...new Set(lista)];
}

function veiculos(query = {}) {
  const inicio = data(query.dataInicial, "dataInicial");
  const fim = data(query.dataFinal, "dataFinal");
  if (inicio && fim && inicio > fim) throw new HttpError(400, "INVALID_QUERY", "dataInicial não pode ser posterior a dataFinal.");
  return {
    busca: String(query.busca || "").trim().slice(0, 120),
    modelo: String(query.modelo || "").trim().slice(0, 120),
    clienteIds: ids(query.clienteIds), dataInicial: inicio, dataFinal: fim,
    page: inteiroPositivo(query.page, "page", 1, 1000000),
    limit: inteiroPositivo(query.limit, "limit", 50, 200),
  };
}

module.exports = { veiculos };
