/* Dados de tela em memória. A confirmação de gravação sempre vem do MySQL. */
(function(){
"use strict";
const cache={},raw={},versions={};let busy=false;
const clone=v=>JSON.parse(JSON.stringify(v));
const index=(key,id)=>cache[key].findIndex(r=>String(r.id)===String(id));
const ref=(key,i)=>{const row=cache[key]?.[Number(i)];if(!row)throw Error("O cadastro vinculado não foi encontrado. Atualize a página.");return String(row.id);};
function project(key,rows){
 if(!Array.isArray(rows))return rows;
 return rows.map(original=>{
  const r=clone(original);
  if(key==="contratos"){r.cliente=index("clientes",r.clienteId);r.veiculosDetalhes=r.veiculos||[];r.veiculos=(r.veiculos||[]).map(v=>index("veiculos",v.id));r.veiculo=r.veiculos[0];r.historicoContratantes=(r.historicoContratantes||[]).map(h=>({...h,cliente:index("clientes",h.clienteId)}));}
  if(key==="manutencoes"||key==="checklistsVeiculos")r.veiculo=index("veiculos",r.veiculoId);
  if(key==="multas"){r.cliente=r.clienteId||"";r.contrato=r.contratoId||"";r.placa=cache.veiculos.find(v=>String(v.id)===String(r.veiculoId))?.placa||r.placa;}
  if(key==="faturas"){
   r.clienteIndice=index("clientes",r.clienteId);r.cliente=cache.clientes[r.clienteIndice]?.nome||"Cliente não encontrado";
   r.contratoIndice=r.contratoId?index("contratos",r.contratoId):"";
   r.itensVeiculos=(r.itensVeiculos||[]).map(item=>({...item,veiculoIndice:index("veiculos",item.veiculoId)}));
   r.aitIndice=r.multaId?index("multas",r.multaId):"";r.aitAutoInfracao=cache.multas?.[r.aitIndice]?.autoInfracao||"";
  }
  return r;
 });
}
function wire(key,rows){
 return rows.map(original=>{
  const r=clone(original);
  if((key==="multas"||key==="checklistsVeiculos")&&!original._dbId)r.clientKey=String(original.id??"");
  if(key==="manutencoes"||key==="checklistsVeiculos")r.veiculoId=ref("veiculos",r.veiculo);
  if(key==="checklistsVeiculos")r.fotos=(r.fotos||[]).filter(f=>!f.driveFileId);
  if(key==="multas"){r.veiculoId=String(cache.veiculos.find(v=>v.placa===r.placa)?.id||"");r.clienteId=r.cliente||null;r.contratoId=r.contrato||null;}
  if(key==="faturas"){
   r.clienteId=String(r.clienteId);
   r.contratosIds=(r.contratosIds||[r.contratoId]).filter(Boolean).map(String);
   r.multaId=r.tipo==="Multa"?String(cache.multas.find(m=>m.autoInfracao===r.aitAutoInfracao)?.id||""):null;
   r.itensVeiculos=(r.itensVeiculos||[]).map(i=>({...i,veiculoId:String(i.veiculoId)}));
  }
  return r;
 });
}
function syncGlobals(){
 if(typeof manutencoes!=="undefined"&&Array.isArray(manutencoes))manutencoes.splice(0,manutencoes.length,...clone(cache.manutencoes));
 if(typeof multas!=="undefined"&&Array.isArray(multas))multas.splice(0,multas.length,...clone(cache.multas));
}
function driveJobs(key,records){
 const jobs=[];
 for(const record of records||[]){
  if(key==="multas"&&record.arquivo?.dados?.startsWith("data:"))jobs.push({entityType:"multa",recordKey:String(record._dbId??record.id),category:"documentos",label:record.arquivo.nome,file:{name:record.arquivo.nome,type:record.arquivo.tipo,data:record.arquivo.dados}});
  if(key==="checklistsVeiculos")for(const [index,photo]of (record.fotos||[]).entries())if(photo.imagem?.startsWith("data:")){
   const match=/^data:([^;]+);base64,(.+)$/.exec(photo.imagem);if(!match)continue;
   const extension=match[1]==="image/png"?"png":"jpg";
   jobs.push({entityType:"checklist",recordKey:String(record._dbId??record.id),category:`foto_${index+1}`,label:photo.campo,file:{name:`checklist-foto-${index+1}.${extension}`,type:match[1],data:photo.imagem}});
  }
 }
 return jobs;
}
function driveTarget(key,job){
 return (key==="multas"?cache.multas:cache.checklistsVeiculos).find(row=>String(row.id)===String(job.savedId));
}
function browserFile(file){const encoded=file.data.split(",")[1],raw=atob(encoded),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new File([bytes],file.name,{type:file.type});}
async function setItem(key,json){
 if(!Object.hasOwn(versions,key))throw Error("Este conjunto deve ser salvo pela sua API específica.");
 if(busy)throw Error("Aguarde a gravação em andamento.");
 const value=JSON.parse(json);
 busy=true;document.documentElement.setAttribute("aria-busy","true");
 try{
  const registros=["configuracoesEmpresa","camposFotoChecklist"].includes(key)?[value]:wire(key,value);
  let payload={version:versions[key],registros};
  if(["multas","manutencoes","faturas","checklistsVeiculos"].includes(key)){
   const anteriores=cache[key]||[];
   const alterados=value.filter(r=>!r._dbId||JSON.stringify(r)!==JSON.stringify(anteriores.find(a=>a._dbId===r._dbId))||key==="multas"&&r.arquivo?.dados?.startsWith("data:")||key==="checklistsVeiculos"&&(r.fotos||[]).some(f=>f.imagem?.startsWith("data:")));
   const excluidos=anteriores.filter(a=>!value.some(r=>r._dbId===a._dbId)).map(a=>a._dbId);
   payload={version:versions[key],registros:wire(key,alterados),excluidos,modo:"delta"};
  }
  if(key==="faturas"){
   const paidChange=(payload.registros||[]).some(r=>Number((cache.faturas||[]).find(p=>String(p._dbId)===String(r.id||r._dbId))?.valorPago||0)>0);
   if(payload.excluidos?.length||paidChange){
    if(typeof window.confirmarOperacaoFatura!=="function")throw Error("Abra o Financeiro para alterar faturas pagas.");
    const auth=await window.confirmarOperacaoFatura(payload.excluidos?.length?"Excluir fatura":"Alterar fatura paga");
    if(!auth)throw Error("Operação cancelada. Nenhuma alteração foi gravada.");
    Object.assign(payload,auth);
   }
  }
  const fotosRemovidas=key==="checklistsVeiculos"?(cache[key]||[]).flatMap(antes=>{
   const depois=value.find(r=>String(r._dbId)===String(antes._dbId));
   if(!depois)return [];
   return (antes.fotos||[]).filter(f=>f.driveFileId&&!(depois.fotos||[]).some(atual=>atual.driveFileId===f.driveFileId)).map(f=>f.driveFileId);
  }):[];
  const jobs=driveJobs(key,payload.registros);
  if(key==="multas")for(const record of payload.registros)if(record.arquivo?.driveFileId)record.arquivo=null;
  const result=await api.put("/operacao/"+encodeURIComponent(key),payload);
  raw[key]=result.data;versions[key]=result.version;cache[key]=project(key,result.data);
  const persistedIds=new Map((result.recordIds||[]).map(entry=>[String(entry.clientKey),String(entry.id)]));for(const job of jobs)job.savedId=persistedIds.get(String(job.recordKey))||String(job.recordKey);
  syncGlobals();
  if(jobs.length){
   for(const job of jobs){
    const target=driveTarget(key,job);
    if(!target)throw Error("Registro salvo, mas não foi possível localizar o anexo para enviá-lo ao Google Drive.");
    if(key==="multas")target.arquivo={...job.file,drivePending:true};
    else target.fotos.push({campo:job.label,imagem:job.file.data,nome:job.file.name,tipo:job.file.type,drivePending:true});
    const uploaded=await api.driveUpload(job.entityType,target.id,job.category,browserFile(job.file),job.label);
    if(key==="multas")target.arquivo={nome:job.file.name,tipo:job.file.type,driveFileId:uploaded.data.id,tamanho:uploaded.data.size};
    else{const photo=target.fotos.find(item=>item.drivePending&&item.campo===job.label);if(photo)Object.assign(photo,{imagem:"",driveFileId:uploaded.data.id,tipo:uploaded.data.mimeType,tamanho:uploaded.data.size,drivePending:false});}
    await api.driveClearLegacy(job.entityType,target.id,job.category);
   }
  }
  for(const id of fotosRemovidas)await api.driveDelete(id);
  if(jobs.length||fotosRemovidas.length){
   const snapshot=await api.get("/operacao");Object.assign(raw,snapshot.data);Object.assign(versions,snapshot.versions);
   for(const name of Object.keys(snapshot.data))cache[name]=project(name,snapshot.data[name]);syncGlobals();
  }
  return true;
 }catch(error){syncGlobals();alert(error.message);throw error;}
 finally{busy=false;document.documentElement.removeAttribute("aria-busy");}
}
window.Banco={
 getItem(key){if(key==="usuarioLogado")return window.usuarioAtual?.nome||null;if(key==="sessaoUsuario")return JSON.stringify({...window.usuarioAtual,perfil:window.usuarioAtual?.perfil==="administrador"?"admin":window.usuarioAtual?.perfil});return Object.hasOwn(cache,key)?JSON.stringify(cache[key]):null;},
 setItem,removeItem(){throw Error("Use a operação autenticada para excluir registros.");},
 pronto:false
};
addEventListener("beforeunload",event=>{if(busy){event.preventDefault();event.returnValue="";}});
async function loadScript(src){await new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.onload=resolve;s.onerror=()=>reject(Error("Não foi possível carregar "+src));document.body.appendChild(s);});}
async function start(){
 const status=document.createElement("div");status.setAttribute("role","status");status.textContent="Carregando os dados do banco…";status.style.cssText="position:fixed;inset:0;background:#fff;z-index:99999;display:grid;place-content:center;font:18px Arial";document.body.appendChild(status);
 try{
  const [snapshot,clientes,veiculos,contratos,session]=await Promise.all([api.get("/operacao"),api.todos("/clientes"),api.todos("/veiculos"),api.todos("/contratos"),api.get("/auth/me")]);
  window.usuarioAtual=session.data.user;Object.assign(raw,snapshot.data);Object.assign(versions,snapshot.versions);
  cache.clientes=clientes;cache.veiculos=veiculos;cache.contratos=project("contratos",contratos);
  for(const key of ["multas","manutencoes","checklistsVeiculos","faturas","configuracoesEmpresa","camposFotoChecklist","historicoRelatoriosEmitidos"])cache[key]=project(key,raw[key]);
  for(const item of document.querySelectorAll("script[data-banco-src]"))await loadScript(item.dataset.bancoSrc);
  window.Banco.pronto=true;
  document.dispatchEvent(new Event("banco:pronto"));
  status.remove();
  const localKeys=["clientes","veiculos","contratos","multas","manutencoes","faturas","checklistsVeiculos"];
  if(window.usuarioAtual.perfil==="administrador"&&localStorage.getItem("migracaoBancoConcluida")!=="1"&&localKeys.some(k=>{try{return JSON.parse(localStorage.getItem(k))?.length>0;}catch{return false;}})){
   const aviso=document.createElement("p");aviso.textContent="Há registros antigos neste navegador. Use Configurações → Migração de dados locais para importá-los. Os originais foram preservados.";aviso.style.cssText="padding:12px;background:#fff3cd;color:#5c4600";const principal=document.querySelector("main");const conteudo=principal?.querySelector(":scope > .conteudo");if(conteudo)conteudo.prepend(aviso);else principal?.before(aviso);
  }
 }catch(error){status.textContent="Não foi possível carregar os dados: "+error.message+". Recarregue a página para tentar novamente.";}
}
start();
})();
