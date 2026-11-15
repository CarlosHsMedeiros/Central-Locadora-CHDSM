/* Exercita INSERT/UPDATE/DELETE reais dentro de uma única transação SEM COMMIT. */
const assert=require("node:assert/strict"),pool=require("../src/config/database"),repo=require("../src/repositories/operacaoRepository");
(async()=>{
 const c=await pool.getConnection(),originalGet=pool.getConnection.bind(pool);
 const execute=c.execute.bind(c),rollback=c.rollback.bind(c),release=c.release.bind(c);
 await c.beginTransaction();
 try{
  const stamp=String(Date.now());
  const [[user]]=await execute("SELECT id FROM usuarios WHERE perfil='administrador' AND ativo=TRUE LIMIT 1");
  assert.ok(user,"Administrador necessário para o teste reversível.");
  const [client]=await execute("INSERT INTO clientes(nome,documento) VALUES(?,?)",["TESTE TRANSACAO DESCARTADA",stamp]);
  const [vehicle]=await execute("INSERT INTO veiculos(placa,marca,modelo) VALUES(?,?,?)",["T"+stamp.slice(-8),"TESTE","DESCARTADO"]);
  const [contract]=await execute("INSERT INTO contratos(numero_contrato,cliente_id,data_inicio,data_fim,valor_locacao) VALUES(?,?,?,?,?)",["TESTE-"+stamp,client.insertId,"2026-01-01","2026-12-31",100]);
  const vid=String(vehicle.insertId),cid=String(client.insertId),ctid=String(contract.insertId);
  await execute("INSERT INTO contrato_veiculos(contrato_id,veiculo_id) VALUES(?,?)",[ctid,vid]);
  const actor={id:String(user.id),nome:"Teste descartado",cargo:"Teste"};
  // Repository lifecycle becomes savepoints, never commits the outer transaction.
  c.beginTransaction=()=>c.query("SAVEPOINT operacao_teste");
  c.commit=()=>c.query("RELEASE SAVEPOINT operacao_teste");
  c.rollback=()=>c.query("ROLLBACK TO SAVEPOINT operacao_teste");
  c.release=()=>{};pool.getConnection=async()=>c;
  async function write(key,rows){const old=await repo.read(key,c);return repo.write(key,{version:repo.version(old),registros:rows},actor);}
  const vehicleRepo=require("../src/repositories/veiculoRepository"),vehicleValidator=require("../src/validators/veiculoValidator");
  const pdf={nome:"CRLV.pdf",tipo:"application/pdf",dados:"data:application/pdf;base64,"+Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF").toString("base64")};
  const vehicleData=vehicleValidator.normalize({placa:"TST1A23",marca:"Teste",modelo:"PDF",anoLicenciamento:2026,licenciamentoPdf:pdf});
  await vehicleRepo.update(vid,vehicleData);
  await vehicleRepo.update(vid,{...vehicleData,anoLicenciamento:2025});
  const [documents]=await execute("SELECT chave,JSON_UNQUOTE(JSON_EXTRACT(valor,'$.dados')) AS dados FROM configuracoes WHERE chave LIKE ?",["crlv:"+vid+":%"]);
  assert.equal(documents.length,2);assert.equal(documents[0].dados,pdf.dados);
  await vehicleRepo.update(vid,{...vehicleData,licenciamentoPdf:undefined});
  const [[preserved]]=await execute("SELECT COUNT(*) AS total FROM configuracoes WHERE chave LIKE ?",["crlv:"+vid+":%"]);assert.equal(Number(preserved.total),2);
  assert.throws(()=>vehicleValidator.normalize({...vehicleData,anoLicenciamento:null,licenciamentoPdf:pdf}));
  console.log("OK PDFs anuais persistidos e preservados sem novo anexo.");
  const cases={
   manutencoes:{veiculoId:vid,tipo:"Revisão",dataEntrada:"2026-09-29",descricao:"Teste",status:"Agendada",valorPecas:"10,10",valorMaoObra:"20,20"},
   multas:{veiculoId:vid,autoInfracao:"TESTE-"+stamp,data:"2026-09-29",situacao:"Pendente",valor:50,valorDesconto:0},
   checklistsVeiculos:{veiculoId:vid,tipo:"Entrada",data:"2026-09-29T10:00",responsavel:"Teste",itens:[{nome:"Pneus",condicao:"Conforme"}],fotos:[]},
   faturas:{numero:"TESTE-"+stamp,tipo:"Locação",clienteId:cid,contratosIds:[ctid],descricao:"Teste",vencimento:"2026-09-29",valorBase:"0,10",itensVeiculos:[{veiculoId:vid,valor:"0,20"}]}
  };
  for(const [key,record]of Object.entries(cases)){
   const original=await repo.read(key,c);const created=await write(key,[...original,record]);
   const saved=created.data.find(r=>!original.some(o=>o._dbId===r._dbId));assert.ok(saved?._dbId,key);
   if(key==="manutencoes")assert.equal(Number(saved.valorTotal),30.3);
   if(key==="faturas")assert.equal(Number(saved.valor),0.3);
   const changed=created.data.map(r=>r._dbId===saved._dbId?{...r,observacoes:"Alterado",descricao:"Alterado",responsavel:"Alterado"}:r);
   const updated=await write(key,changed);assert.ok(updated.data.some(r=>r._dbId===saved._dbId));
   await assert.rejects(repo.write(key,{version:"desatualizada",registros:changed},actor),e=>e.code==="STALE_DATA");
   if(key==="faturas"){
    const paid=await write(key,updated.data.map(r=>r._dbId===saved._dbId?{...r,dataPagamento:"2026-09-29"}:r));
    assert.equal(paid.data.find(r=>r._dbId===saved._dbId).dataPagamento,"2026-09-29");
    await assert.rejects(write(key,original),e=>e.code==="REASON_REQUIRED");
    const authRepo=require("../src/repositories/authRepository"),findUser=authRepo.findUser;
    const senha=require("node:crypto").randomBytes(24).toString("hex"),hash=await require("bcryptjs").hash(senha,4);
    authRepo.findUser=async()=>({id:actor.id,ativo:true,senhaHash:hash});
    try{
     const oldPaid=paid.data.find(r=>r._dbId===saved._dbId);
     const editPayload={version:paid.version,modo:"delta",excluidos:[],registros:[{...oldPaid,descricao:"Correção auditada",valorBase:1}],justificativa:"Correção de valor para teste"};
     await assert.rejects(repo.write(key,{...editPayload,senha:senha+"-invalida"},actor),e=>e.code==="INVALID_PASSWORD");
     const corrected=await repo.write(key,{...editPayload,senha},actor);
     const row=corrected.data.find(r=>r._dbId===saved._dbId);assert.equal(Number(row.valor),1.2);assert.equal(Number(row.valorPago),1.2);
     const [[payments]]=await execute("SELECT COUNT(*) AS total,SUM(estornado=FALSE) AS ativos FROM pagamentos WHERE fatura_id=?",[saved._dbId]);assert.equal(Number(payments.total),2);assert.equal(Number(payments.ativos),1);
     const deleted=await repo.write(key,{version:corrected.version,modo:"delta",registros:[],excluidos:[saved._dbId],senha,justificativa:"Exclusão justificada para teste"},actor);
     assert.equal(deleted.data.some(r=>r._dbId===saved._dbId),false);
     const [[archived]]=await execute("SELECT status FROM faturas WHERE id=?",[saved._dbId]);assert.equal(archived.status,"Excluida");
     const [[audit]]=await execute("SELECT COUNT(*) AS total FROM logs_auditoria WHERE entidade='fatura' AND entidade_id=? AND acao IN ('FATURA_EDITADA','FATURA_EXCLUIDA')",[saved._dbId]);assert.equal(Number(audit.total),2);
     console.log("OK senha incorreta bloqueada, edição paga sem duplicação, exclusão arquivada e auditoria.");
    }finally{authRepo.findUser=findUser;}
   }else{const deleted=await write(key,original);assert.equal(deleted.data.length,original.length);}
   console.log("OK transacional: "+key);
  }
  await write("camposFotoChecklist",[["Frente","Painel"]]);assert.deepEqual(await repo.read("camposFotoChecklist",c),["Frente","Painel"]);
  await write("configuracoesEmpresa",[{nome:"Teste descartado",modeloContratoVersao:2}]);
  const savedMaint=await repo.read("manutencoes",c);
  const two=await write("manutencoes",[...savedMaint,cases.manutencoes,{...cases.manutencoes,descricao:"Segundo"}]);
  const one=two.data.find(r=>!savedMaint.some(o=>o._dbId===r._dbId));
  const delta=await repo.write("manutencoes",{version:two.version,modo:"delta",excluidos:[],registros:[{...one,descricao:"Delta"}]},actor);
  assert.equal(delta.data.length,two.data.length);
  assert.equal(delta.data.find(r=>r._dbId===one._dbId).descricao,"Delta");
  const source="local:"+"a".repeat(32);
  c.migrationOrigin=source;
  await require("../src/repositories/migracaoRepository").saveMapping(c,{entidade:"veiculos",indice:0,idLegado:"vehicle-test",novoId:vid,hash:"a".repeat(64)});
  const migration=require("../src/services/migracaoService");
  const batch={origem:source,registros:[{indice:0,idLegado:"check-test",dados:{veiculo:0,tipo:"Entrada",data:"2026-09-29T10:00",responsavel:"Teste",itens:[],fotos:[]}}]};
  const imported=await migration.migrate("checklistsVeiculos",batch);assert.equal(imported.importados,1);assert.equal(imported.erros.length,0);
  const repeated=await migration.migrate("checklistsVeiculos",batch);assert.equal(repeated.ignorados,1);
  const configImport=await migration.migrate("configuracoesEmpresa",{origem:source,registros:[{indice:0,dados:{nome:"Nao deve substituir"}}]});
  assert.equal(configImport.duplicidades,1);assert.equal((await repo.read("configuracoesEmpresa",c)).nome,"Teste descartado");
  console.log("OK deltas, migração de checklist, reexecução e preservação de configurações.");
  const documentoService=require("../src/services/contratoDocumentoService");
  const checklistState=await repo.read("checklistsVeiculos",c);
  const novoChecklist=await write("checklistsVeiculos",[...checklistState,cases.checklistsVeiculos]);
  const checklist=novoChecklist.data.find(r=>!checklistState.some(old=>old._dbId===r._dbId));
  const doc=await documentoService.get(ctid,c);
  const savedDoc=await documentoService.save(ctid,{version:doc.version,texto:"Texto editado e salvo",checklistIds:[checklist._dbId],formaPagamento:"PIX"},actor);
  assert.equal(savedDoc.documento.texto,"Texto editado e salvo");assert.deepEqual(savedDoc.checklistIds,[checklist._dbId]);
  await assert.rejects(documentoService.save(ctid,{version:doc.version,texto:"Não sobrescrever",checklistIds:[]},actor),e=>e.code==="STALE_DOCUMENT");
  const [[link]]=await execute("SELECT contrato_id FROM checklists WHERE id=?",[checklist._dbId]);assert.equal(String(link.contrato_id),ctid);
  await assert.rejects(write("checklistsVeiculos",checklistState),e=>e.code==="LINKED_CHECKLIST");
  console.log("OK revisão de contrato, vínculo de checklist, conflito e preservação do anexo.");
  console.log("OK configurações, conflitos e pagamentos.");
 }finally{pool.getConnection=originalGet;await rollback();release();await pool.end();console.log("ROLLBACK executado: nenhum registro de teste foi mantido.");}
})().catch(e=>{console.error(e);process.exitCode=1;});
