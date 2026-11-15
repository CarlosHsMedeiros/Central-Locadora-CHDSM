const pool=require("../config/database"),contracts=require("../repositories/contratoRepository"),validator=require("../validators/contratoValidator"),HttpError=require("../utils/httpError"),crypto=require("node:crypto");
const hash=v=>crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex");
const decode=v=>typeof v==="string"?JSON.parse(v):v;
async function get(raw,c=pool){
 const id=validator.id(raw),contrato=await contracts.findById(id,c);
 if(!contrato)throw new HttpError(404,"CONTRACT_NOT_FOUND","Contrato não encontrado.");
 const [[cliente]]=await c.execute("SELECT * FROM clientes WHERE id=?",[contrato.clienteId]);
 const [vehicles]=await c.execute("SELECT v.id,v.placa,v.marca,v.modelo,v.ano,v.cor,v.renavam,v.chassi,v.quilometragem FROM veiculos v JOIN contrato_veiculos cv ON cv.veiculo_id=v.id WHERE cv.contrato_id=? ORDER BY v.placa",[id]);
 const [configs]=await c.execute("SELECT chave,valor FROM configuracoes WHERE chave IN (?,?)",["configuracoesEmpresa","contrato_documento:"+id]);
 const empresa=decode(configs.find(r=>r.chave==="configuracoesEmpresa")?.valor)||{};
 const documento=decode(configs.find(r=>r.chave==="contrato_documento:"+id)?.valor)||null;
 const [checklists]=await c.execute("SELECT c.id,c.veiculo_id AS veiculoId,c.contrato_id AS contratoId,v.placa,c.tipo,DATE_FORMAT(c.data_checklist,'%Y-%m-%dT%H:%i:%s') AS data,c.km,c.combustivel,c.responsavel,c.observacoes FROM checklists c JOIN veiculos v ON v.id=c.veiculo_id JOIN contrato_veiculos cv ON cv.veiculo_id=c.veiculo_id WHERE cv.contrato_id=? AND (c.contrato_id IS NULL OR c.contrato_id=?) ORDER BY c.data_checklist DESC,c.id",[id,id]);
 for(const check of checklists){const [items]=await c.execute("SELECT nome,condicao,observacao FROM checklist_itens WHERE checklist_id=? ORDER BY ordem,id",[check.id]);check.itens=items;const [fotos]=await c.execute("SELECT campo,imagem FROM checklist_fotos WHERE checklist_id=? ORDER BY ordem,id",[check.id]);check.fotos=fotos;}
 const checklistIds=checklists.filter(r=>String(r.contratoId)===id).map(r=>String(r.id));
 return {contrato,cliente,veiculos:vehicles,empresa,checklists,documento,checklistIds,version:hash({documento,checklistIds,contrato:contrato.updatedAt})};
}
async function save(raw,body,user){
 const id=validator.id(raw);
 if(!body||typeof body.texto!=="string"||!body.texto.trim()||body.texto.length>60000||typeof body.version!=="string"||!Array.isArray(body.checklistIds)||body.checklistIds.length>100)throw new HttpError(400,"VALIDATION_ERROR","Texto ou checklists inválidos.");
 const ids=[...new Set(body.checklistIds.map(x=>validator.id(x)))];
 const extra={};for(const key of ["horaInicio","horaFim","formaPagamento","primeiroPagamento","fiadores","avalistas","testemunhas"]){const value=body[key]??"";if(typeof value!=="string"||value.length>4000)throw new HttpError(400,"VALIDATION_ERROR","Complemento inválido.");extra[key]=value.trim();}
 for(const key of ["horaInicio","horaFim"])if(extra[key]&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(extra[key]))throw new HttpError(400,"VALIDATION_ERROR","Horário inválido.");
 const c=await pool.getConnection();
 try{
  await c.beginTransaction();const [[exists]]=await c.execute("SELECT id FROM contratos WHERE id=? FOR UPDATE",[id]);if(!exists)throw new HttpError(404,"CONTRACT_NOT_FOUND","Contrato não encontrado.");
  const current=await get(id,c);
  if(current.version!==body.version)throw new HttpError(409,"STALE_DOCUMENT","O contrato foi alterado em outra aba. Reabra a revisão antes de salvar.");
  for(const checkId of ids){
   const [[check]]=await c.execute("SELECT c.id,c.contrato_id AS contratoId,EXISTS(SELECT 1 FROM contrato_veiculos cv WHERE cv.contrato_id=? AND cv.veiculo_id=c.veiculo_id) AS vinculado FROM checklists c WHERE c.id=? FOR UPDATE",[id,checkId]);
   if(!check||!Number(check.vinculado)||check.contratoId&&String(check.contratoId)!==id)throw new HttpError(409,"INVALID_CHECKLIST","O checklist não pertence a um veículo deste contrato ou já está vinculado a outro contrato.");
  }
  await c.execute("UPDATE checklists SET contrato_id=NULL WHERE contrato_id=?",[id]);
  for(const checkId of ids)await c.execute("UPDATE checklists SET contrato_id=? WHERE id=?",[id,checkId]);
  const doc={texto:body.texto,complementos:extra,checklistIds:ids,atualizadoEm:new Date().toISOString(),atualizadoPor:String(user.id)};
  await c.execute("INSERT INTO configuracoes(chave,valor,updated_by_usuario_id) VALUES(?,?,?) ON DUPLICATE KEY UPDATE valor=VALUES(valor),updated_by_usuario_id=VALUES(updated_by_usuario_id)",["contrato_documento:"+id,JSON.stringify(doc),user.id]);
  const result=await get(id,c);await c.commit();return result;
 }catch(error){await c.rollback();throw error;}finally{c.release();}
}
module.exports={get,save};
