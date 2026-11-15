async function next(connection, tipo, prefixo, ano = new Date().getFullYear()) {
  await connection.execute("INSERT IGNORE INTO sequencias_documentos(tipo,ano,ultimo_numero) VALUES(?,?,0)", [tipo, ano]);
  const fontes = { contrato: ["contratos", "numero_contrato"], fatura: ["faturas", "numero"] };
  const fonte = fontes[tipo];
  if (!fonte) throw new Error("Tipo de documento sem sequência configurada.");
  // Tabela e coluna vêm de uma lista interna fixa; valores continuam parametrizados.
  await connection.execute(`UPDATE sequencias_documentos SET ultimo_numero=GREATEST(ultimo_numero,(SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(${fonte[1]},'-',-1) AS UNSIGNED)),0) FROM ${fonte[0]} WHERE ${fonte[1]} LIKE ?))+1 WHERE tipo=? AND ano=?`, [`${prefixo}-${ano}-%`, tipo, ano]);
  const [[row]] = await connection.execute("SELECT ultimo_numero FROM sequencias_documentos WHERE tipo=? AND ano=? FOR UPDATE", [tipo, ano]);
  return `${prefixo}-${ano}-${String(row.ultimo_numero).padStart(6, "0")}`;
}
module.exports = { next };
