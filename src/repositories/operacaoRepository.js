"use strict";
const pool=require("../config/database"),crypto=require("node:crypto"),HttpError=require("../utils/httpError"),v=require("../validators/operacaoValidator");
const definitions={
 manutencoes:{table:"manutencoes",fields:{veiculoId:"veiculo_id",tipo:"tipo",oficina:"oficina",dataEntrada:"data_entrada",dataSaida:"data_saida",quilometragem:"quilometragem",valorPecas:"valor_pecas",valorMaoObra:"valor_mao_obra",status:"status",proximaData:"proxima_data",proximaKm:"proxima_km",pecas:"pecas",descricao:"descricao",observacoes:"observacoes"},extra:",valor_total AS valorTotal"},
 multas:{table:"multas",fields:{veiculoId:"veiculo_id",clienteId:"cliente_id",contratoId:"contrato_id",autoInfracao:"auto_infracao",placa:"placa_snapshot",orgao:"orgao",codigo:"codigo",descricao:"descricao",data:"data_infracao",hora:"hora_infracao",local:"local_infracao",cidade:"cidade",uf:"uf",valor:"valor",valorDesconto:"valor_desconto",vencimento:"vencimento",prazoCondutor:"prazo_condutor",pontos:"pontos",situacao:"situacao",responsavel:"responsavel",observacoes:"observacoes"}},
 checklistsVeiculos:{table:"checklists",fields:{veiculoId:"veiculo_id",tipo:"tipo",data:"data_checklist",km:"km",combustivel:"combustivel",responsavel:"responsavel",observacoes:"observacoes"},extra:",contrato_id AS contratoId"},
 faturas:{table:"faturas",fields:{numero:"numero",tipo:"tipo",natureza:"natureza",clienteId:"cliente_id",contratoId:"contrato_id",multaId:"multa_id",descricao:"descricao",competencia:"competencia",vencimento:"vencimento",valorBase:"valor_base",valor:"valor",automatica:"automatica",reutilizacaoAitCondutor:"reutilizacao_ait_condutor",justificativaAit:"justificativa_ait"},extra:",emitido_por_snapshot AS emitidoPor"}
};
const naturezaRepo=require("./faturaNaturezaRepository");
const configs=new Set(["configuracoesEmpresa","camposFotoChecklist"]);
const keys=[...Object.keys(definitions),...configs,"historicoRelatoriosEmitidos"];
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==="object"?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
const version=rows=>crypto.createHash("sha256").update(JSON.stringify(stable(rows))).digest("hex");
function known(key){if(!keys.includes(key))throw new HttpError(404,"NOT_FOUND","Conjunto inexistente.");}
function output(row){
 const result={...row,id:String(row.id),_dbId:String(row.id)};
 for(const [k,val]of Object.entries(result)){
  if(val instanceof Date)result[k]=val.toISOString().slice(0,k==="data"&&"responsavel" in row&&!('autoInfracao' in row)?19:10);
  if(k.endsWith("Id")&&val!=null)result[k]=String(val);
 }
 return result;
}
async function read(key,c=pool){
 known(key);
 if(configs.has(key)){const [rows]=await c.execute("SELECT valor FROM configuracoes WHERE chave=?",[key]);const val=rows[0]?.valor;return typeof val==="string"?JSON.parse(val):val??(key==="camposFotoChecklist"?[]:{});}
 if(key==="historicoRelatoriosEmitidos"){const [rows]=await c.execute("SELECT id,relatorio,emitido_em AS emitidoEm,emitido_por_snapshot AS emitidoPor,cargo_snapshot AS cargo FROM historico_relatorios ORDER BY id DESC LIMIT 100");return rows.map(r=>({...r,id:String(r.id),emitidoEm:r.emitidoEm instanceof Date?r.emitidoEm.toISOString():r.emitidoEm}));}
 const spec=key==="faturas"?naturezaRepo.spec(definitions[key],await naturezaRepo.hasColumn(c)):definitions[key],columns=Object.entries(spec.fields).map(([alias,col])=>col+" AS "+alias).join(",");
 const [rows]=await c.execute("SELECT id,"+columns+(spec.extra||"")+" FROM "+spec.table+(key==="faturas"?" WHERE status<>'Excluida'":"")+" ORDER BY id");
 if(key==="faturas")await naturezaRepo.enrich(rows,c);
 const data=rows.map(output),byId=new Map(data.map(r=>[r.id,r]));
 if(key==="multas"){
  const [attachments]=await c.execute("SELECT multa_id AS parent,nome,tipo_mime AS tipo,tamanho_bytes AS tamanho,dados FROM multa_arquivos ORDER BY id");
  const [driveAttachments]=await c.execute("SELECT entity_id AS parent,drive_file_id AS driveFileId,original_name AS nome,mime_type AS tipo,size_bytes AS tamanho,display_label AS label FROM google_drive_files WHERE entity_type='multa' ORDER BY id");
  data.forEach(r=>r.arquivo=null);
  for(const {parent,...a}of attachments)if(byId.has(String(parent)))byId.get(String(parent)).arquivo=a;
  for(const {parent,driveFileId,...a}of driveAttachments)if(byId.has(String(parent))&&!byId.get(String(parent)).arquivo?.dados)byId.get(String(parent)).arquivo={...a,driveFileId};
 }
 if(key==="checklistsVeiculos"){
  data.forEach(r=>{r.itens=[];r.fotos=[];});
  const [clientSnapshots]=await c.execute("SELECT chave,valor FROM configuracoes WHERE chave LIKE ?",["checklist-cliente:%"]);
  for(const entry of clientSnapshots){
   const row=byId.get(entry.chave.slice("checklist-cliente:".length));if(!row)continue;
   const stored=typeof entry.valor==="string"?JSON.parse(entry.valor):entry.valor;
   row.clienteId=stored.clienteId;row.clienteDados=stored.dados;
  }

  for(const [table,cols,field]of [["checklist_itens","nome,condicao,observacao","itens"],["checklist_fotos","campo,imagem","fotos"]]){
   const [children]=await c.execute("SELECT checklist_id AS parent,"+cols+" FROM "+table+" ORDER BY ordem,id");
   for(const {parent,...child}of children)if(field!=="fotos"||child.imagem)byId.get(String(parent))?.[field].push(child);
  }
  const [drivePhotos]=await c.execute("SELECT entity_id AS parent,drive_file_id AS driveFileId,original_name AS nome,mime_type AS tipo,size_bytes AS tamanho,display_label AS campo FROM google_drive_files WHERE entity_type='checklist' ORDER BY id");
  for(const {parent,driveFileId,...photo}of drivePhotos)byId.get(String(parent))?.fotos.push({...photo,imagem:"",driveFileId});
 }
 if(key==="faturas"){
  data.forEach(r=>{r.itensVeiculos=[];r.contratosIds=[];r.contratos=[];r.dataPagamento="";r.automatica=Boolean(r.automatica);r.reutilizacaoAitCondutor=Boolean(r.reutilizacaoAitCondutor);});
  const [items]=await c.execute("SELECT fatura_id AS parent,veiculo_id AS veiculoId,placa_snapshot AS placa,modelo_snapshot AS modelo,ano_snapshot AS ano,cor_snapshot AS cor,renavam_snapshot AS renavam,valor FROM fatura_veiculos ORDER BY id");
  for(const {parent,...item}of items){item.veiculoId=String(item.veiculoId);byId.get(String(parent))?.itensVeiculos.push(item);}
  const [contracts]=await c.execute("SELECT fc.fatura_id AS parent,fc.contrato_id AS contratoId,COALESCE(fc.numero_contrato_snapshot,c.numero_contrato) AS numero FROM fatura_contratos fc JOIN contratos c ON c.id=fc.contrato_id ORDER BY fc.id");
  for(const h of contracts){const row=byId.get(String(h.parent));if(row){row.contratosIds.push(String(h.contratoId));row.contratos.push(h.numero);}}
  const [payments]=await c.execute("SELECT fatura_id AS parent,DATE_FORMAT(MAX(data_pagamento),'%Y-%m-%d') AS dia,SUM(valor) AS pago FROM pagamentos WHERE estornado=FALSE GROUP BY fatura_id");
  for(const p of payments){const row=byId.get(String(p.parent));if(row){row.valorPago=Number(p.pago);if(Number(p.pago)>=Number(row.valor))row.dataPagamento=p.dia;}}
  data.forEach(r=>{r.contrato=r.contratos.join(", ");if(!r.contratosIds.length&&r.contratoId)r.contratosIds=[r.contratoId];});
 }
 if(key==="faturas")data.forEach(r=>r.semContrato=!r.contratosIds.length);
 return data;
}
async function reference(c,table,id){
 if(!id)return null;
 const [[row]]=await c.execute("SELECT * FROM "+table+" WHERE id=? FOR UPDATE",[id]);
 if(!row)throw new HttpError(400,"INVALID_REFERENCE","Cadastro vinculado não encontrado.");
 return row;
}
async function saveRow(key,d,c,user){
 const spec=key==="faturas"?naturezaRepo.spec(definitions[key],await naturezaRepo.hasColumn(c)):definitions[key];
 const vehicle=await reference(c,"veiculos",d.veiculoId);
 if(vehicle&&vehicle.situacao==="Inativo")throw new HttpError(409,"INACTIVE_VEHICLE","Veículo inativo.");
 const client=await reference(c,"clientes",d.clienteId);
 const contract=await reference(c,"contratos",d.contratoId);
 if(contract&&d.clienteId&&String(contract.cliente_id)!==String(d.clienteId))throw new HttpError(400,"INVALID_REFERENCE","Contrato não pertence ao cliente selecionado.");
 if(key==="multas"&&vehicle)d.placa=vehicle.placa;
 if(key==="faturas"){
  for(const cid of d.contratosIds){const r=await reference(c,"contratos",cid);if(String(r.cliente_id)!==d.clienteId)throw new HttpError(400,"INVALID_REFERENCE","Contrato não pertence ao cliente.");}
  if(d.multaId){await reference(c,"multas",d.multaId);const [[prior]]=await c.execute("SELECT id FROM faturas WHERE multa_id=? AND id<>? AND status<>'Excluida' LIMIT 1",[d.multaId,d.id||"0"]);if(prior&&(!d.reutilizacaoAitCondutor||!d.justificativaAit))throw new HttpError(409,"DUPLICATE_FINE","AIT já faturado; informe a justificativa de reutilização.");}
  if(!d.itensVeiculos.length){
   const linked=new Set();
   for(const cid of d.contratosIds){const [vehicles]=await c.execute("SELECT veiculo_id AS id FROM contrato_veiculos WHERE contrato_id=? ORDER BY veiculo_id",[cid]);for(const vehicle of vehicles)linked.add(String(vehicle.id));}
   if(d.multaId){const fine=await reference(c,"multas",d.multaId);linked.add(String(fine.veiculo_id));}
   d.itensVeiculos=[...linked].map(veiculoId=>({veiculoId,valor:0}));
  }
  for(const item of d.itensVeiculos)await reference(c,"veiculos",item.veiculoId);
 }
 if(key==="faturas"&&!d.id)d.numero=await require("../utils/invoiceNumber").next(c);
 const entries=Object.entries(spec.fields),params=entries.map(([alias])=>d[alias]??null);
 let id=d.id;
 if(id)await c.execute("UPDATE "+spec.table+" SET "+entries.map(([,col])=>col+"=?").join(",")+" WHERE id=?",[...params,id]);
 else {const [result]=await c.execute("INSERT INTO "+spec.table+"("+entries.map(([,col])=>col).join(",")+") VALUES("+params.map(()=>"?").join(",")+")",params);id=String(result.insertId);}
 d.id=String(id);
 if(key==="multas"){
  if(d.arquivo){
   await c.execute("DELETE FROM multa_arquivos WHERE multa_id=?",[id]);
   const a=d.arquivo;await c.execute("INSERT INTO multa_arquivos(multa_id,nome,tipo_mime,tamanho_bytes,dados) VALUES(?,?,?,?,?)",[id,a.nome,a.tipo,a.tamanho,a.dados]);
  }
 }
 if(key==="checklistsVeiculos"){
  if(client){
   const dados={nome:client.nome,razaoSocial:client.razao_social,documento:client.documento,endereco:client.endereco,numero:client.numero,complemento:client.complemento,bairro:client.bairro,cidade:client.cidade,estado:client.estado,cep:client.cep,telefone:client.telefone,whatsapp:client.whatsapp,email:client.email};
   await c.execute("INSERT INTO configuracoes(chave,valor) VALUES(?,?) ON DUPLICATE KEY UPDATE valor=VALUES(valor)",["checklist-cliente:"+id,JSON.stringify({clienteId:String(d.clienteId),dados})]);
  }else await c.execute("DELETE FROM configuracoes WHERE chave=?",["checklist-cliente:"+id]);
  await c.execute("DELETE FROM checklist_itens WHERE checklist_id=?",[id]);
  await c.execute("DELETE FROM checklist_fotos WHERE checklist_id=?",[id]);
  for(const [i,item]of d.itens.entries())await c.execute("INSERT INTO checklist_itens(checklist_id,nome,condicao,observacao,ordem) VALUES(?,?,?,?,?)",[id,item.nome,item.condicao,item.observacao,i]);
  for(const [i,f]of d.fotos.entries())await c.execute("INSERT INTO checklist_fotos(checklist_id,campo,imagem,ordem) VALUES(?,?,?,?)",[id,f.campo,f.imagem,i]);
 }
 if(key==="faturas"){
  await naturezaRepo.save(id,d.natureza,user,c);
  for(const table of ["fatura_contratos","fatura_veiculos"])await c.execute("DELETE FROM "+table+" WHERE fatura_id=?",[id]);
  for(const cid of d.contratosIds)await c.execute("INSERT INTO fatura_contratos(fatura_id,contrato_id,numero_contrato_snapshot) SELECT ?,id,numero_contrato FROM contratos WHERE id=?",[id,cid]);
  for(const item of d.itensVeiculos)await c.execute("INSERT INTO fatura_veiculos(fatura_id,veiculo_id,placa_snapshot,modelo_snapshot,ano_snapshot,cor_snapshot,renavam_snapshot,valor) SELECT ?,id,placa,CONCAT(marca,' ',modelo),ano,cor,renavam,? FROM veiculos WHERE id=?",[id,item.valor,item.veiculoId]);
  if(d.dataPagamento)await c.execute("INSERT INTO pagamentos(fatura_id,data_pagamento,valor,registrado_por_usuario_id) VALUES(?,?,?,?)",[id,d.dataPagamento,d.valor,user.id]);
  await c.execute("UPDATE faturas SET status=?,emitido_por_usuario_id=COALESCE(emitido_por_usuario_id,?),emitido_por_snapshot=COALESCE(emitido_por_snapshot,?) WHERE id=?",[d.dataPagamento?"Paga":"Pendente",user.id,JSON.stringify({nome:user.nome,cargo:user.cargo||"",id:user.id}),id]);
 }
}
async function write(key,body,user){
 known(key);
 if(!body||typeof body.version!=="string"||!Array.isArray(body.registros)||body.registros.length>2000)throw new HttpError(400,"INVALID_INPUT","Lote inválido.");
 const c=await pool.getConnection();let recordIds=[];
 try{
  await c.beginTransaction();
  await c.execute("INSERT IGNORE INTO configuracoes(chave,valor) VALUES(?,'{}')",["lock:"+key]);
  await c.execute("SELECT id FROM configuracoes WHERE chave=? FOR UPDATE",["lock:"+key]);
  const before=await read(key,c);
  if(version(before)!==body.version)throw new HttpError(409,"STALE_DATA","Os dados foram alterados em outra aba. Atualize a página antes de salvar; suas alterações não foram gravadas.");
  if(configs.has(key)){
   if(body.registros.length!==1) v.fail("Configuração inválida.");
   const value=body.registros[0];
   if(key==="camposFotoChecklist"){
    if(!Array.isArray(value)||!value.length||value.length>45||value.some(s=>typeof s!=="string"||!s.trim()||s.length>120)||new Set(value).size!==value.length)v.fail("Campos de fotos inválidos.");
   }else{
    if(!value||Array.isArray(value)||typeof value!=="object"||JSON.stringify(value).length>1500000)v.fail("Dados da empresa inválidos.");
    if(Object.hasOwn(value,"itensVerificacaoChecklist")){
     const itens=value.itensVerificacaoChecklist;
     if(!Array.isArray(itens)||!itens.length||itens.length>100||itens.some(s=>typeof s!=="string"||!s.trim()||s.length>120)||new Set(itens.map(s=>s.trim().toLocaleLowerCase("pt-BR"))).size!==itens.length)v.fail("Itens de vistoria inválidos.");
     value.itensVerificacaoChecklist=itens.map(s=>s.trim());
    }
    if(value.imagemCabecalho)require("../validators/arquivoValidator").image(value.imagemCabecalho);
   }
   await c.execute("INSERT INTO configuracoes(chave,valor,updated_by_usuario_id) VALUES(?,?,?) ON DUPLICATE KEY UPDATE valor=VALUES(valor),updated_by_usuario_id=VALUES(updated_by_usuario_id)",[key,JSON.stringify(value),user.id]);
  }else if(key==="historicoRelatoriosEmitidos"){
   const added=body.registros.filter(r=>!before.some(b=>String(b.id)===String(r.id)));
   for(const row of added.slice(0,1))await c.execute("INSERT INTO historico_relatorios(relatorio,emitido_em,emitido_por_usuario_id,emitido_por_snapshot,cargo_snapshot) VALUES(?,UTC_TIMESTAMP(),?,?,?)",[v.text(row.relatorio,180,true),user.id,user.nome,user.cargo||""]);
  }else{
   const normalized=body.registros.map(d=>v.normalize(key,d)),old=new Map(before.map(r=>[r._dbId,r]));
   const ids=normalized.map(d=>d.id).filter(Boolean);
   if(new Set(ids).size!==ids.length||ids.some(id=>!old.has(id)))v.fail("Registro desconhecido ou repetido.");
   const removidos=body.modo==="delta"?body.excluidos:before.filter(r=>!ids.includes(r._dbId)).map(r=>r._dbId);
   if(!Array.isArray(removidos)||removidos.some(id=>typeof id!=="string"||!old.has(id)||ids.includes(id)))v.fail("Exclusões inválidas.");
   if(key==="faturas")await require("../services/nfseService").protectChanges(c,before,normalized,removidos);
   const protectedInvoice=key==="faturas"&&(removidos.length>0||normalized.some(d=>Number(old.get(d.id)?.valorPago||0)>0&&version(v.normalize(key,old.get(d.id)))!==version(d)));
   if(protectedInvoice)await require("../services/faturaAuditService").authorize(body,user);
   for(const previous of before)if(removidos.includes(previous._dbId)){
    if(key==="checklistsVeiculos"&&previous.contratoId)throw new HttpError(409,"LINKED_CHECKLIST","Desvincule o checklist na revisão do contrato antes de excluí-lo.");
    if(key==="faturas"){
     await require("../services/faturaAuditService").record(c,"FATURA_EXCLUIDA",previous,null,body.justificativa,user);
     await c.execute("UPDATE faturas SET status='Excluida' WHERE id=?",[previous._dbId]);continue;
    }
    if(key==="checklistsVeiculos")await c.execute("DELETE FROM configuracoes WHERE chave=?",["checklist-cliente:"+previous._dbId]);
    await c.execute("DELETE FROM "+definitions[key].table+" WHERE id=?",[previous._dbId]);
   }
   for(const d of normalized){
    const previous=old.get(d.id);
    if(key==="faturas"&&previous)d.numero=previous.numero;
    if(previous&&version(v.normalize(key,previous))===version(d))continue;
    if(key==="faturas"&&Number(previous?.valorPago||0)>0){
     await require("../services/faturaAuditService").record(c,"FATURA_EDITADA",previous,d,body.justificativa,user);
     await c.execute("UPDATE pagamentos SET estornado=TRUE,estornado_em=UTC_TIMESTAMP() WHERE fatura_id=? AND estornado=FALSE",[previous._dbId]);
    }
    await saveRow(key,d,c,user);
   }
   recordIds=normalized.filter(d=>d.clientKey).map(d=>({clientKey:d.clientKey,id:String(d.id)}));
  }
  const data=await read(key,c);await c.commit();return {data,version:version(data),recordIds};
 }catch(error){await c.rollback();if(["ER_DUP_ENTRY","ER_ROW_IS_REFERENCED_2"].includes(error.code))throw new HttpError(409,"DATA_CONFLICT","Registro duplicado ou vinculado a outros dados.");throw error;}finally{c.release();}
}
async function snapshot(){const data={},versions={};for(const key of keys){data[key]=await read(key);versions[key]=version(data[key]);}return {data,versions};}
module.exports={read,write,snapshot,version,keys,definitions};
