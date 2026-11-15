const pool = require("../config/database");

async function mapping(connection, entidade, indice, idLegado) {
  const [rows]=await connection.execute("SELECT novo_id AS novoId FROM migracao_registros WHERE origem=? AND entidade=? AND (indice_legado=? OR (? IS NOT NULL AND id_legado=?)) LIMIT 1",[connection.migrationOrigin||"localStorage",entidade,indice,idLegado,idLegado]);
  return rows[0]?.novoId||null;
}
async function saveMapping(connection,{entidade,indice,idLegado,novoId,hash}) {
  await connection.execute("INSERT INTO migracao_registros(origem,entidade,indice_legado,id_legado,novo_id,payload_hash) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE novo_id=VALUES(novo_id),payload_hash=VALUES(payload_hash)",[connection.migrationOrigin||"localStorage",entidade,indice,idLegado,novoId,hash]);
}
async function resolve(connection,entidade,reference) {
  if(reference===undefined||reference===null||reference==="")return null;
  const value=String(reference);
  const numeric=/^\d+$/.test(value)?Number(value):-1;
  const [rows]=await connection.execute("SELECT novo_id AS novoId FROM migracao_registros WHERE origem=? AND entidade=? AND (indice_legado=? OR id_legado=?) ORDER BY id_legado=? DESC LIMIT 1",[connection.migrationOrigin||"localStorage",entidade,numeric,value,value]);
  return rows[0]?.novoId||null;
}
async function find(connection,sql,params){const [rows]=await connection.execute(sql,params);return rows[0]||null;}
async function insert(connection,sql,params){const [result]=await connection.execute(sql,params);return String(result.insertId);}
module.exports={pool,mapping,saveMapping,resolve,find,insert};
