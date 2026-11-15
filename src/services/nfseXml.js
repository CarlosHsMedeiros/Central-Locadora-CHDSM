"use strict";
const crypto=require('node:crypto'),{SignedXml}=require('xml-crypto'),{spawn}=require('node:child_process'),path=require('node:path'),HttpError=require('../utils/httpError');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const tag=(n,v)=>`<${n}>${esc(v)}</${n}>`,opt=(n,v)=>v===undefined||v===null||v===''?'':tag(n,v);
const NS='http://www.sped.fazenda.gov.br/nfse';
function emissionTime(date=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZoneName:'longOffset'}).formatToParts(date).map(p=>[p.type,p.value]));
 const offset=parts.timeZoneName.replace('GMT','')||'+00:00';
 return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}
function build({config:c,fatura:f,cliente:t,competencia,tomadorMunicipio,numero,emissao=emissionTime()}){
 const id='DPS'+c.municipio+'2'+c.cnpj+String(c.serie).padStart(5,'0')+String(numero).padStart(15,'0');
 const reg=tag('opSimpNac',c.opSimpNac)+(c.opSimpNac==='3'?tag('regApTribSN',c.regApTribSN):'')+tag('regEspTrib',c.regEspTrib);
 const prest=tag('CNPJ',c.cnpj)+opt('IM',c.inscricaoMunicipal)+`<regTrib>${reg}</regTrib>`;
 const doc=String(t.documento).replace(/\D/g,'');
 const endereco=`<end><endNac>${tag('cMun',tomadorMunicipio)}${tag('CEP',String(t.cep).replace(/\D/g,''))}</endNac>${tag('xLgr',t.endereco)}${tag('nro',t.numero)}${opt('xCpl',t.complemento)}${tag('xBairro',t.bairro)}</end>`;
 const toma=tag(doc.length===14?'CNPJ':'CPF',doc)+tag('xNome',t.nome||t.razaoSocial)+endereco+opt('fone',String(t.telefone||'').replace(/\D/g,''))+opt('email',t.email);
 const serv=`<locPrest>${tag('cLocPrestacao',c.municipioPrestacao)}</locPrest><cServ>${tag('cTribNac',c.codigoTributacao)}${opt('cTribMun',c.codigoMunicipal)}${tag('xDescServ',f.descricao)}${tag('cNBS',c.nbs)}</cServ>`;
 const municipal=tag('tribISSQN',c.tribISSQN)+tag('tpRetISSQN',c.retencao)+(c.tribISSQN==='1'&&c.aliquota!==''?tag('pAliq',Number(c.aliquota).toFixed(2)):'');
 let total=c.totalTributos==='naoInformar'?tag('indTotTrib','0'):c.totalTributos==='simples'?tag('pTotTribSN',Number(c.percentualSN).toFixed(2)):`<pTotTrib>${tag('pTotTribFed',Number(c.percentualFederal).toFixed(2))}${tag('pTotTribEst',Number(c.percentualEstadual).toFixed(2))}${tag('pTotTribMun',Number(c.percentualMunicipal).toFixed(2))}</pTotTrib>`;
 const federal=c.pisCofins==='naoRetidos00'?'<tribFed><piscofins><CST>00</CST><tpRetPisCofins>0</tpRetPisCofins></piscofins></tribFed>':'';
 const valores=`<vServPrest>${tag('vServ',Number(f.valor).toFixed(2))}</vServPrest><trib><tribMun>${municipal}</tribMun>${federal}<totTrib>${total}</totTrib></trib>`;
 const ibs=c.ibsCbs==='informar'?`<IBSCBS>${tag('finNFSe','0')}${tag('indFinal',c.consumidorFinal)}${tag('cIndOp',c.indicadorOperacao)}${tag('indDest','0')}<valores><trib><gIBSCBS>${tag('CST',c.cstIbsCbs)}${tag('cClassTrib',c.classificacaoIbsCbs)}</gIBSCBS></trib></valores></IBSCBS>`:'';
 return {id,xml:`<DPS xmlns="${NS}" versao="1.01"><infDPS Id="${id}">${tag('tpAmb',c.ambiente)}${tag('dhEmi',emissao)}${tag('verAplic','CentralLocadora_1.0')}${tag('serie',c.serie)}${tag('nDPS',numero)}${tag('dCompet',competencia)}${tag('tpEmit','1')}${tag('cLocEmi',c.municipio)}<prest>${prest}</prest><toma>${toma}</toma><serv>${serv}</serv><valores>${valores}</valores>${ibs}</infDPS></DPS>`};
}
function sign(xml,certificate){
 const sig=new SignedXml({privateKey:certificate.privateKey,publicCert:certificate.cert,signatureAlgorithm:'http://www.w3.org/2000/09/xmldsig#rsa-sha1',canonicalizationAlgorithm:'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'});
 sig.addReference({xpath:"//*[local-name()='infDPS']",transforms:['http://www.w3.org/2000/09/xmldsig#enveloped-signature','http://www.w3.org/TR/2001/REC-xml-c14n-20010315'],digestAlgorithm:'http://www.w3.org/2000/09/xmldsig#sha1'});
 sig.computeSignature(xml,{location:{reference:"//*[local-name()='DPS']",action:'append'}});return '<?xml version="1.0" encoding="UTF-8"?>'+sig.getSignedXml().replace(/^\uFEFF?\s*<\?xml[^?]*\?>\s*/,'');
}
function validate(xml){return new Promise((resolve,reject)=>{
 const p=spawn(process.env.NFSE_PYTHON||'python',[path.join(__dirname,'../../scripts/validate-nfse.py')],{windowsHide:true,stdio:['pipe','pipe','pipe']});
 const timer=setTimeout(()=>{p.kill();reject(new HttpError(400,'NFSE_XSD','A validacao XML excedeu o tempo limite.'));},15000);
 p.on('error',()=>{clearTimeout(timer);reject(new HttpError(400,'NFSE_XSD','Instale Python e lxml para validar as notas no servidor.'));});
 p.stdout.resume();p.stderr.resume();p.stdin.on('error',()=>{});
 p.on('close',code=>{clearTimeout(timer);if(code===0)resolve();else reject(new HttpError(400,'NFSE_XSD','XML fora do leiaute oficial. Revise os campos fiscais e o cadastro completo do cliente.'));});p.stdin.end(xml);
});}
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
module.exports={build,sign,validate,hash,emissionTime};
