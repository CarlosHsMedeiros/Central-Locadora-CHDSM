const database=require("../config/database");
const HttpError=require('../utils/httpError');
// Compatibilidade durante a aplicação da migração 006, sem perder dados silenciosamente.
const licensingColumns='ano_licenciamento AS anoLicenciamento,uf_registro AS ufRegistro,grupo_licenciamento AS grupoLicenciamento,';
const pool={getConnection:()=>database.getConnection(),execute:async(sql,params)=>{
 try{return await database.execute(sql,params);}catch(error){
  if(error.code!=='ER_BAD_FIELD_ERROR'||!String(error.message).includes('ano_licenciamento'))throw error;
  if(sql.startsWith('SELECT '))return database.execute(sql.replace(licensingColumns,'NULL AS anoLicenciamento,NULL AS ufRegistro,NULL AS grupoLicenciamento,'),params);
  const start=13,fields=params.slice(start,start+3);
  if(fields.some(value=>value!==null&&value!==undefined&&value!==''))throw new HttpError(503,'LICENSING_MIGRATION_REQUIRED','Licenciamento ainda não habilitado no banco. Solicite a aplicação da migração 006 ao administrador.');
  const legacyParams=[...params.slice(0,start),...params.slice(start+3)];
  const legacySql=sql.replace(',ano_licenciamento,uf_registro,grupo_licenciamento','').replace('VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)','VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').replace(',ano_licenciamento=?,uf_registro=?,grupo_licenciamento=?','');
  return database.execute(legacySql,legacyParams);
 }
}};
const cols="ano_licenciamento AS anoLicenciamento,uf_registro AS ufRegistro,grupo_licenciamento AS grupoLicenciamento,id,placa,renavam,chassi,marca,modelo,ano,cor,quilometragem,situacao,localizacao,foto,DATE_FORMAT(data_compra,'%Y-%m-%d') AS dataCompra,valor_compra AS valorCompra,created_at AS createdAt,updated_at AS updatedAt";
async function attachCosts(rows,connection=pool){
 if(!rows.length)return rows;
 const [costs]=await connection.execute("SELECT veiculo_id AS veiculoId,ano,valor FROM veiculo_custos_anuais WHERE veiculo_id IN ("+rows.map(()=>"?").join(",")+")",rows.map(row=>row.id));
 const indexed=new Map();
 for(const cost of costs){const key=String(cost.veiculoId);if(!indexed.has(key))indexed.set(key,{});indexed.get(key)[cost.ano]=Number(cost.valor);}
 return rows.map(row=>({...row,custosPorAno:indexed.get(String(row.id))||{}}));
}
async function list({busca,limit,offset}){const where=busca?"WHERE placa LIKE ? OR renavam LIKE ? OR marca LIKE ? OR modelo LIKE ?":"",filters=busca?Array(4).fill("%"+busca+"%"):[];const[rows]=await pool.execute("SELECT "+cols+" FROM veiculos "+where+" ORDER BY marca,modelo,id LIMIT ? OFFSET ?",[...filters,limit,offset]);const[[count]]=await pool.execute("SELECT COUNT(*) total FROM veiculos "+where,filters);return{rows:await attachCosts(rows),total:Number(count.total)};}
async function findById(id,connection=pool){const[rows]=await connection.execute("SELECT "+cols+" FROM veiculos WHERE id=? LIMIT 1",[id]);return (await attachCosts(rows,connection))[0]||null;}
async function findDuplicate(d,id=null){const sql=id?"SELECT id FROM veiculos WHERE (placa=? OR (?<>'' AND renavam=?) OR (?<>'' AND chassi=?)) AND id<>? LIMIT 1":"SELECT id FROM veiculos WHERE placa=? OR (?<>'' AND renavam=?) OR (?<>'' AND chassi=?) LIMIT 1";const p=[d.placa,d.renavam,d.renavam,d.chassi,d.chassi,...(id?[id]:[])];const[rows]=await pool.execute(sql,p);return rows[0]||null;}
const vals=d=>[d.placa,d.renavam||null,d.chassi||null,d.marca,d.modelo,d.ano,d.cor||null,d.quilometragem,d.situacao,d.localizacao||null,d.foto||null,d.dataCompra,d.valorCompra,d.anoLicenciamento,d.ufRegistro,d.grupoLicenciamento];
async function saveCosts(connection,id,costs){
 await connection.execute("DELETE FROM veiculo_custos_anuais WHERE veiculo_id=?",[id]);
 for(const [year,value]of Object.entries(costs||{}))await connection.execute("INSERT INTO veiculo_custos_anuais(veiculo_id,ano,valor) VALUES(?,?,?)",[id,Number(year),value]);
}
async function save(id,d){
 const connection=await database.getConnection();
 try{
  await connection.beginTransaction();
  if(id){
   const [existing]=await connection.execute("SELECT id FROM veiculos WHERE id=? FOR UPDATE",[id]);
   if(!existing.length){await connection.rollback();return null;}
   await connection.execute("UPDATE veiculos SET placa=?,renavam=?,chassi=?,marca=?,modelo=?,ano=?,cor=?,quilometragem=?,situacao=?,localizacao=?,foto=?,data_compra=?,valor_compra=?,ano_licenciamento=?,uf_registro=?,grupo_licenciamento=? WHERE id=?",[...vals(d),id]);
  }else{
   const[result]=await connection.execute("INSERT INTO veiculos(placa,renavam,chassi,marca,modelo,ano,cor,quilometragem,situacao,localizacao,foto,data_compra,valor_compra,ano_licenciamento,uf_registro,grupo_licenciamento) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",vals(d));
   id=String(result.insertId);
  }
  await saveCosts(connection,id,d.custosPorAno);
  if(d.licenciamentoPdf){const f=d.licenciamentoPdf;await connection.execute("INSERT INTO configuracoes(chave,valor) VALUES(?,?) ON DUPLICATE KEY UPDATE valor=VALUES(valor)",["crlv:"+id+":"+d.anoLicenciamento,JSON.stringify({...f,ano:d.anoLicenciamento})]);}
  const result=await findById(id,connection);
  await connection.commit();return result;
 }catch(error){
  await connection.rollback();
  if(error.code==="ER_BAD_FIELD_ERROR"&&/ano_licenciamento|uf_registro|grupo_licenciamento/.test(error.message))throw new HttpError(503,"LICENSING_MIGRATION_REQUIRED","Atualização de licenciamento pendente.");
  throw error;
 }finally{connection.release();}
}
const create=d=>save(null,d);
const update=(id,d)=>save(id,d);
async function removeOrDeactivate(id){
 const c=await pool.getConnection();
 try{
  await c.beginTransaction();
  const[[vehicle]]=await c.execute("SELECT id,situacao FROM veiculos WHERE id=? FOR UPDATE",[id]);
  if(!vehicle){await c.commit();return null;}
  if(vehicle.situacao!=="Inativo"){
   await c.execute("UPDATE veiculos SET situacao='Inativo' WHERE id=?",[id]);
   await c.commit();return"inactivated";
  }
  const[[links]]=await c.execute("SELECT (SELECT COUNT(*) FROM contrato_veiculos WHERE veiculo_id=?)+(SELECT COUNT(*) FROM multas WHERE veiculo_id=?)+(SELECT COUNT(*) FROM manutencoes WHERE veiculo_id=?)+(SELECT COUNT(*) FROM checklists WHERE veiculo_id=?)+(SELECT COUNT(*) FROM fatura_veiculos WHERE veiculo_id=?)+(SELECT COUNT(*) FROM google_drive_files WHERE entity_type='veiculo' AND entity_id=?) total",[id,id,id,id,id,id]);
  if(Number(links.total)>0){await c.commit();return"linked";}
  await c.execute("DELETE FROM configuracoes WHERE chave LIKE ?",["crlv:"+id+":%"]);
  const[r]=await c.execute("DELETE FROM veiculos WHERE id=?",[id]);
  await c.commit();return r.affectedRows?"deleted":null;
 }catch(e){await c.rollback();throw e;}finally{c.release();}
}
module.exports={list,findById,findDuplicate,create,update,removeOrDeactivate};
