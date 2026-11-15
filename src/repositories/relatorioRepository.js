const pool = require("../config/database");

function filtros(params) {
  const where = [], values = [];
  if (params.clienteIds.length) { where.push(`c.cliente_id IN (${params.clienteIds.map(() => "?").join(",")})`); values.push(...params.clienteIds); }
  if (params.modelo) { where.push("v.modelo = ?"); values.push(params.modelo); }
  if (params.dataInicial) { where.push("c.data_fim >= ?"); values.push(params.dataInicial); }
  if (params.dataFinal) { where.push("c.data_inicio <= ?"); values.push(params.dataFinal); }
  if (params.busca) {
    const termo = `%${params.busca}%`;
    where.push("(v.placa LIKE ? OR v.renavam LIKE ? OR v.chassi LIKE ? OR v.modelo LIKE ? OR cl.nome LIKE ? OR c.numero_contrato LIKE ?)");
    values.push(termo, termo, termo, termo, termo, termo);
  }
  return { sql: where.length ? `WHERE ${where.join(" AND ")}` : "", values };
}

async function veiculos(params) {
  const { sql, values } = filtros(params);
  const origem = `FROM veiculos v LEFT JOIN contrato_veiculos cv ON cv.veiculo_id=v.id LEFT JOIN contratos c ON c.id=cv.contrato_id LEFT JOIN clientes cl ON cl.id=c.cliente_id`;
  const campos = `v.id AS veiculoId,v.placa,v.renavam,v.chassi,TRIM(CONCAT_WS(' ',v.marca,v.modelo)) AS modelo,v.ano AS anoFabricacao,v.localizacao,v.situacao AS statusVeiculo,c.id AS contratoId,c.numero_contrato AS numeroContrato,DATE_FORMAT(c.data_inicio,'%Y-%m-%d') AS dataInicial,DATE_FORMAT(c.data_fim,'%Y-%m-%d') AS dataFinal,CASE WHEN c.id IS NULL THEN NULL ELSE DATEDIFF(c.data_fim,c.data_inicio)+1 END AS diasTotal,COALESCE(cv.valor_rateado,c.valor_locacao) AS valorMensal,c.status AS statusContrato,cl.id AS clienteId,cl.nome AS cliente`;
  const [rows] = await pool.execute(`SELECT ${campos} ${origem} ${sql} ORDER BY COALESCE(cl.nome,''),v.modelo,v.placa,c.data_inicio DESC LIMIT ? OFFSET ?`, [...values, params.limit, (params.page - 1) * params.limit]);
  const [[count]] = await pool.execute(`SELECT COUNT(*) AS total ${origem} ${sql}`, values);
  return { rows, total: Number(count.total) };
}

module.exports = { veiculos };
