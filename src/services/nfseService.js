"use strict";
const pool=require('../config/database'),HttpError=require('../utils/httpError'),cert=require('./nfseCertificate'),xml=require('./nfseXml'),transport=require('./nfseTransport'),{DOMParser}=require('@xmldom/xmldom');
const valid=require('../validators/clienteValidator'),values=require('../../LOCADORA_VALORES.JS');
const defaults={pisCofins:'',ambiente:'2',municipio:'3556305',municipioPrestacao:'3556305',opSimpNac:'3',regApTribSN:'1',codigoTributacao:'150307',nbs:'111011100',serie:'',numeroInicial:'1',cnpj:'',inscricaoMunicipal:'',regEspTrib:'',tribISSQN:'',retencao:'',aliquota:'',totalTributos:'',percentualSN:'',percentualFederal:'',percentualEstadual:'',percentualMunicipal:'',codigoMunicipal:'',ibsCbs:'',consumidorFinal:'',indicadorOperacao:'',cstIbsCbs:'',classificacaoIbsCbs:''};
const fail=(message,code='NFSE_VALIDATION')=>{throw new HttpError(400,code,message);};
async function get(key,c=pool){const [rows]=await c.execute('SELECT valor FROM configuracoes WHERE chave=?',[key]);const v=rows[0]?.valor;return typeof v==='string'?JSON.parse(v):v||null;}
async function put(key,value,user,c=pool){await c.execute('INSERT INTO configuracoes(chave,valor,updated_by_usuario_id) VALUES(?,?,?) ON DUPLICATE KEY UPDATE valor=VALUES(valor),updated_by_usuario_id=VALUES(updated_by_usuario_id)',[key,JSON.stringify(value),user.id]);}
async function settings(){const company=await get('configuracoesEmpresa');return {...defaults,cnpj:String(company?.cnpj||'').replace(/\D/g,''),...await get('nfse:config')};}
function normalizeConfig(body){
 const c={};for(const key of Object.keys(defaults)){if(body[key]!=null&&!['string','number'].includes(typeof body[key]))fail('Campo fiscal invalido.');c[key]=String(body[key]??defaults[key]).trim();if(c[key].length>100)fail('Campo fiscal muito longo.');}
 c.cnpj=c.cnpj.replace(/\D/g,'');if(!valid.validCnpj(c.cnpj))fail('Informe um CNPJ valido para o prestador.');
 const enums={pisCofins:['','naoRetidos00'],ambiente:['1','2'],opSimpNac:['1','2','3'],regApTribSN:['','1','2','3'],regEspTrib:['','0','1','2','3','4','5','6','9'],tribISSQN:['','1','4'],retencao:['','1','2'],totalTributos:['','naoInformar','simples','percentuais'],ibsCbs:['','naoAplicavel','informar'],consumidorFinal:['','0','1']};
 for(const [k,choices]of Object.entries(enums))if(!choices.includes(c[k]))fail('Opcao fiscal invalida: '+k);
 for(const [k,re]of Object.entries({municipio:/^\d{7}$/,municipioPrestacao:/^\d{7}$/,codigoTributacao:/^\d{6}$/,nbs:/^\d{9}$/,serie:/^\d{1,5}$/,numeroInicial:/^[1-9]\d{0,14}$/,codigoMunicipal:/^\d{3}$/,indicadorOperacao:/^\d{6}$/,cstIbsCbs:/^\d{3}$/,classificacaoIbsCbs:/^\d{6}$/}))if(c[k]&&!re.test(c[k]))fail('Formato fiscal invalido: '+k);
 for(const k of ['aliquota','percentualSN','percentualFederal','percentualEstadual','percentualMunicipal'])if(c[k]){const n=values.numero(c[k]);if(n<0||n>100)fail('Percentual deve estar entre 0 e 100.');c[k]=n.toFixed(2);}
 if(c.tribISSQN==='4'&&(c.retencao==='2'||Number(c.aliquota)>0))fail('Nao incidencia nao deve informar retencao nem aliquota de ISS.');
 return c;
}
function pendingConfig(c){const fields=['cnpj','municipio','municipioPrestacao','serie','opSimpNac','regEspTrib','tribISSQN','retencao','totalTributos','ibsCbs'];if(c.opSimpNac==='3')fields.push('regApTribSN');if(c.totalTributos==='simples')fields.push('percentualSN');if(c.totalTributos==='percentuais')fields.push('percentualFederal','percentualEstadual','percentualMunicipal');if(c.ibsCbs==='informar')fields.push('consumidorFinal','indicadorOperacao','cstIbsCbs','classificacaoIbsCbs');return fields.filter(k=>c[k]===undefined||c[k]===null||c[k]==='');}
async function publicSettings(){const c=await settings(),stored=await get('nfse:certificado');return {config:c,certificado:stored?.metadata||null,pendencias:pendingConfig(c)};}
async function saveSettings(body,user){const c=normalizeConfig(body),stored=await get('nfse:certificado');if(stored&&stored.metadata.cnpj!==c.cnpj)fail('Substitua o certificado antes de alterar o CNPJ do prestador.');await put('nfse:config',c,user);return publicSettings();}
async function saveCertificate(body,user){const c=await settings();if(!valid.validCnpj(c.cnpj))fail('Salve primeiro o CNPJ da empresa nas configuracoes fiscais.');const parsed=cert.parse(body.conteudo,body.senha,c.cnpj);const stored={metadata:parsed.metadata,protected:cert.encrypt({conteudo:body.conteudo,senha:body.senha})};await put('nfse:certificado',stored,user);return {certificado:stored.metadata};}
async function certificate(c){const stored=await get('nfse:certificado');if(!stored)fail('Cadastre o certificado A1 nas Configuracoes > NFS-e.');const secret=cert.decrypt(stored.protected);return cert.parse(secret.conteudo,secret.senha,c.cnpj);}
const stateKey=(id,ambiente)=>'nfse:fatura:'+ambiente+':'+id;
function portalUrl(ambiente,chave){if(!['1','2'].includes(ambiente)||!/^\d{50}$/.test(chave))return '';return (ambiente==='1'?'https://www.nfse.gov.br':'https://www.producaorestrita.nfse.gov.br')+'/ConsultaPublica/?tpc=1&chave='+encodeURIComponent(chave);}
function publicState(s){return s?{status:s.status,ambiente:s.config.ambiente,idDps:s.idDps,numeroNfse:s.numeroNfse||'',portalUrl:s.chave?portalUrl(s.config.ambiente,s.chave):'',chave:s.chave||'',mensagem:s.mensagem||'',atualizadoEm:s.atualizadoEm,xmlDisponivel:!!s.nfseXml,cancelamentoDisponivel:!!s.cancelamento,consultadoEm:s.consultadoEm||null}:null;}
async function invoice(id,c=pool){valid.id(id);const nr=require("../repositories/faturaNaturezaRepository"),hasNatureza=await nr.hasColumn(c);const [rows]=await c.execute("SELECT id,numero,tipo,cliente_id AS clienteId,descricao,valor,status"+(hasNatureza?",natureza":"")+" FROM faturas WHERE id=?",[id]);await nr.enrich(rows,c);const f=rows[0];if(!f||['Excluida','Cancelada','Cancelado'].includes(f.status))throw new HttpError(404,'NFSE_INVOICE','Fatura nao encontrada ou cancelada.');if(f.natureza==='Despesa')fail('NFS-e de saida so pode ser emitida para faturas de receita.');return f;}
function data(value){const s=String(value||''),d=new Date(s+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(+d)||d.toISOString().slice(0,10)!==s)fail('Informe uma competencia valida.');return s;}
async function prepare(id,body){
 const f=await invoice(id),c=await settings(),t=await require('../repositories/clienteRepository').findById(f.clienteId);if(!t)fail('Cliente da fatura nao encontrado.');
 const fields=pendingConfig(c);if(fields.length)fail('Complete as configuracoes fiscais: '+fields.join(', '));
 const d=String(t.documento||'').replace(/\D/g,'');if(!valid.validCpf(d)&&!valid.validCnpj(d))fail('Corrija o CPF/CNPJ do cliente.');
 for(const k of ['nome','endereco','numero','bairro','cep'])if(!t[k])fail('Complete o cadastro do cliente: '+k);if(!/^\d{8}$/.test(String(t.cep).replace(/\D/g,'')))fail('Corrija o CEP do cliente.');
 if(!f.descricao||f.descricao.length>2000||!Number.isFinite(Number(f.valor))||Number(f.valor)<=0)fail('A fatura precisa de descricao de ate 2000 caracteres e valor positivo.');
 const competencia=data(body.competencia),tomadorMunicipio=String(body.tomadorMunicipio||'');if(!/^\d{7}$/.test(tomadorMunicipio))fail('Informe o codigo IBGE do municipio do cliente.');
 const snapshot={config:c,fatura:f,cliente:t,competencia,tomadorMunicipio};
 return {...snapshot,versao:xml.hash(snapshot)};
}
async function preview(id,body){const p=await prepare(id,body),certificateInfo=(await certificate(p.config)).metadata;const s=await get(stateKey(id,p.config.ambiente));return {versao:p.versao,fatura:{numero:p.fatura.numero,descricao:p.fatura.descricao,valor:p.fatura.valor},cliente:{nome:p.cliente.nome,documento:p.cliente.documento,cidade:p.cliente.cidade,estado:p.cliente.estado,endereco:[p.cliente.endereco,p.cliente.numero,p.cliente.bairro,p.cliente.cidade,p.cliente.estado].join(', ')},config:p.config,competencia:p.competencia,tomadorMunicipio:p.tomadorMunicipio,certificado:certificateInfo,nota:publicState(s)};}
async function status(id){valid.id(id);const c=await settings();return publicState(await get(stateKey(id,c.ambiente)));}
function verifiedResponse(response,state){
 const chave=response.chaveAcesso;if(!/^\d{50}$/.test(String(chave||'')))throw Error('INVALID_KEY');
 const nfseXml=transport.unpack(response.nfseXmlGZipB64);if(/<!DOCTYPE|<!ENTITY/i.test(nfseXml))throw Error('UNSAFE_XML');
 const doc=new DOMParser({onError:()=>{throw Error('INVALID_XML');}}).parseFromString(nfseXml,'text/xml');
 const inf=doc.getElementsByTagNameNS('*','infNFSe')[0],dps=doc.getElementsByTagNameNS('*','infDPS')[0];
 if(!inf||inf.getAttribute('Id')!=='NFS'+chave||!dps||dps.getAttribute('Id')!==state.idDps)throw Error('MISMATCHED_RESPONSE');
 const numeroNfse=inf.getElementsByTagNameNS('*','nNFSe')[0]?.textContent||'';
 return {chave,nfseXml,numeroNfse};
}
async function processResponse(result,state,key,user){
 try{const verified=verifiedResponse(result.data,state);Object.assign(state,verified,{status:'autorizada',mensagem:'NFS-e autorizada.'});}
 catch{
  const errors=result.data?.erros;const message=Array.isArray(errors)?errors.map(e=>[e.Codigo||e.codigo,e.Descricao||e.descricao,e.Complemento||e.complemento].filter(Boolean).join(' - ')).join('; ').slice(0,1500):'';
  state.status=result.status>=400&&result.status<500&&message&&!/duplic|existe|gerada/i.test(message)?'rejeitada':'pendente';
  state.mensagem=message||'Retorno inconclusivo. Consulte a situacao antes de tentar emitir novamente.';
 }
 state.atualizadoEm=new Date().toISOString();await put(key,state,user);return publicState(state);
}
async function emit(id,body,user){
 if(body.confirmar!==true)fail('Revise os dados e confirme a emissao.');const p=await prepare(id,body);if(body.versao!==p.versao)throw new HttpError(409,'NFSE_STALE','Os dados mudaram. Revise a fatura novamente.');
 const connection=await pool.getConnection(),lock='nfse:fatura:'+id;let locked=false;
 try{
  const [[r]]=await connection.execute('SELECT GET_LOCK(?,0) AS adquirido',[lock]);if(!r.adquirido)throw new HttpError(409,'NFSE_BUSY','Esta fatura ja esta sendo processada.');locked=true;
  const key=stateKey(id,p.config.ambiente),existing=await get(key,connection);if(existing&&['autorizada','pendente','cancelada'].includes(existing.status))return publicState(existing);
  const material=await certificate(p.config);await connection.beginTransaction();
  const [lockedInvoice]=await connection.execute('SELECT id FROM faturas WHERE id=? FOR UPDATE',[id]);if(!lockedInvoice.length)fail('Fatura nao encontrada.');
  const atual=await invoice(id,connection);if(xml.hash(atual)!==xml.hash(p.fatura))throw new HttpError(409,'NFSE_STALE','A fatura mudou. Revise os dados novamente.');
  if(existing&&['cnpj','serie','municipio'].some(k=>existing.config[k]!==p.config[k]))fail('A tentativa anterior usa outro prestador ou serie. Preserve esses dados para corrigir a rejeicao.');
  const sequenceKey='nfse:seq:'+p.config.ambiente+':'+p.config.cnpj+':'+p.config.serie;
  await connection.execute('INSERT IGNORE INTO configuracoes(chave,valor) VALUES(?,?)',[sequenceKey,JSON.stringify({proximo:p.config.numeroInicial})]);
  await connection.execute('SELECT id FROM configuracoes WHERE chave=? FOR UPDATE',[sequenceKey]);
  const sequence=await get(sequenceKey,connection),numero=existing?.numero||String(sequence.proximo);if(!/^[1-9]\d{0,14}$/.test(numero))fail('Numeracao DPS esgotada ou invalida.');
  const built=xml.build({...p,numero}),signed=xml.sign(built.xml,material);await xml.validate(signed);
  const state={status:'pendente',config:p.config,idDps:built.id,numero,xml:signed,faturaHash:xml.hash(p.fatura),usuarioId:user.id,atualizadoEm:new Date().toISOString(),mensagem:'Envio iniciado; aguardando retorno da API.'};
  if(!existing)await put(sequenceKey,{proximo:String(BigInt(numero)+1n)},user,connection);await put(key,state,user,connection);await connection.commit();
  let result;try{result=await transport.request(p.config,material,'POST','/nfse',{dpsXmlGZipB64:transport.pack(signed)});}catch{return publicState({...state,mensagem:'Sem confirmacao de recebimento. Use Consultar NFS-e; nao repita a emissao.'});}
  return processResponse(result,state,key,user);
 }catch(e){await connection.rollback();throw e;}finally{if(locked)await connection.execute('SELECT RELEASE_LOCK(?)',[lock]);connection.release();}
}
async function syncEvents(s,key,user){
 let event;try{event=await require('./nfseEvents').cancellation(s.config,await certificate(s.config),s.chave);}catch{fail('Nao foi possivel atualizar os eventos no portal. A situacao exibida e a ultima conhecida; tente novamente.');}
 if(event){s.status='cancelada';s.cancelamento=event;s.mensagem='Cancelamento confirmado pelo Sistema Nacional em '+event.data+'.';}
 else s.mensagem='Nenhum evento de cancelamento encontrado na consulta ao Sistema Nacional.';
 s.consultadoEm=new Date().toISOString();await put(key,s,user);return publicState(s);
}
async function consult(id,user){valid.id(id);const connection=await pool.getConnection(),lock='nfse:fatura:'+id;let locked=false;try{const [[r]]=await connection.execute('SELECT GET_LOCK(?,0) AS adquirido',[lock]);if(!r.adquirido)throw new HttpError(409,'NFSE_BUSY','Esta fatura ja esta sendo consultada.');locked=true;return await consultUnlocked(id,user);}finally{if(locked)await connection.execute('SELECT RELEASE_LOCK(?)',[lock]);connection.release();}}
async function consultUnlocked(id,user){valid.id(id);const c=await settings(),key=stateKey(id,c.ambiente),s=await get(key);if(!s)fail('Nao ha tentativa de emissao para esta fatura neste ambiente.');if(s.status==='cancelada')return publicState(s);if(s.status==='autorizada')return syncEvents(s,key,user);
 const material=await certificate(s.config);let result;try{result=await transport.request(s.config,material,'GET','/dps/'+encodeURIComponent(s.idDps));}catch{fail('API indisponivel. A tentativa foi preservada; consulte novamente mais tarde.');}
 if(!/^\d{50}$/.test(String(result.data?.chaveAcesso||'')))return {...publicState(s),podeReenviar:result.status===404,mensagem:'A API ainda nao confirmou uma NFS-e para esta DPS. Nenhuma nova nota foi enviada.'};
 const chaveConsultada=result.data.chaveAcesso;
 try{result=await transport.request(s.config,material,'GET','/nfse/'+chaveConsultada);result.data.chaveAcesso=result.data.chaveAcesso||chaveConsultada;}catch{fail('Nao foi possivel baixar a nota. Consulte novamente mais tarde.');}const processed=await processResponse(result,s,key,user);return processed.status==='autorizada'?syncEvents(s,key,user):processed;
}

async function resend(id,body,user){
 valid.id(id);if(body.confirmar!==true)fail('Confirme o reenvio da mesma DPS.');
 const c=await settings(),key=stateKey(id,c.ambiente),connection=await pool.getConnection(),lock='nfse:fatura:'+id;let locked=false;
 try{
  const [[r]]=await connection.execute('SELECT GET_LOCK(?,0) AS adquirido',[lock]);if(!r.adquirido)throw new HttpError(409,'NFSE_BUSY','Fatura em processamento.');locked=true;
  const s=await get(key,connection);if(!s||s.status!=='pendente')fail('Somente uma DPS pendente pode ser reenviada.');
  const material=await certificate(s.config);let check;try{check=await transport.request(s.config,material,'GET','/dps/'+encodeURIComponent(s.idDps));}catch{fail('A API nao confirmou a ausencia da nota. Consulte mais tarde.');}
  if(check.status!==404)return {...publicState(s),mensagem:'Reenvio nao realizado. Consulte a NFS-e para obter o resultado.'};
  let result;try{result=await transport.request(s.config,material,'POST','/nfse',{dpsXmlGZipB64:transport.pack(s.xml)});}catch{return {...publicState(s),mensagem:'Sem confirmacao. A mesma DPS foi preservada; consulte novamente.'};}
  const processed=await processResponse(result,s,key,user);return processed.status==='autorizada'?syncEvents(s,key,user):processed;
 }finally{if(locked)await connection.execute('SELECT RELEASE_LOCK(?)',[lock]);connection.release();}
}

async function download(id){valid.id(id);const c=await settings(),s=await get(stateKey(id,c.ambiente));if(!['autorizada','cancelada'].includes(s?.status)||!s.nfseXml)fail('XML autorizado ainda indisponivel.');return {xml:s.nfseXml,chave:s.chave};}
async function downloadPdf(id,user){
 await consult(id,user);const c=await settings(),s=await get(stateKey(id,c.ambiente));if(!['autorizada','cancelada'].includes(s?.status)||!s.nfseXml)fail('Aguarde a autorizacao da NFS-e antes de baixar o PDF.');
 if(s.status!=='cancelada'){try{const result=await transport.pdf(s.config,await certificate(s.config),s.chave);if(result.status===200&&Buffer.isBuffer(result.data)&&result.data.subarray(0,5).toString()==='%PDF-')return {pdf:result.data,chave:s.chave,local:false};}catch{}}
 return {pdf:await require('./nfseLocalPdf').render(s),chave:s.chave,local:true};
}
async function downloadCancellation(id){valid.id(id);const c=await settings(),s=await get(stateKey(id,c.ambiente));if(!s?.cancelamento?.xml)fail('Evento de cancelamento ainda indisponivel.');return {xml:s.cancelamento.xml,chave:s.chave};}
function fiscalData(d){return {clienteId:String(d.clienteId),tipo:d.tipo,natureza:d.natureza||'Receita',descricao:d.descricao,valor:Number(d.valor),itensVeiculos:d.itensVeiculos,contratosIds:d.contratosIds};}
async function protectChanges(c,before,normalized,removed){
 for(const old of before){const next=normalized.find(n=>n.id===old._dbId);if(!removed.includes(old._dbId)&&(!next||xml.hash(fiscalData(next))===xml.hash(fiscalData(require('../validators/operacaoValidator').normalize('faturas',old)))) )continue;
  await c.execute('SELECT id FROM faturas WHERE id=? FOR UPDATE',[old._dbId]);
  const [rows]=await c.execute('SELECT valor FROM configuracoes WHERE chave IN (?,?)',[stateKey(old._dbId,'1'),stateKey(old._dbId,'2')]);
  if(rows.some(r=>['autorizada','pendente','cancelada'].includes((typeof r.valor==='string'?JSON.parse(r.valor):r.valor).status)))throw new HttpError(409,'NFSE_LINKED','Esta fatura possui NFS-e autorizada, cancelada ou envio pendente. Os dados fiscais e a exclusao estao bloqueados; o pagamento pode ser atualizado.');
 }
}
module.exports={settings,publicSettings,saveSettings,saveCertificate,preview,status,emit,consult,resend,download,downloadPdf,downloadCancellation,portalUrl,protectChanges,normalizeConfig,pendingConfig,verifiedResponse,defaults};
