"use strict";
const source='https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/documentacao-atual';
const expected=['nfse-esquemas_xsd-v1-01-20260209.zip','anexo_i-sefin_adn-dps_nfse-snnfse-v1-01-20260209.xlsx','anexo_b-nbs2-lista_servico_nacional-snnfse-v1-01-20260122.xlsx'];
function analyze(html){
 const names=[...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map(m=>{try{const u=new URL(m[1],source);return u.hostname==='www.gov.br'?decodeURIComponent(u.pathname.split('/').pop()).toLowerCase():'';}catch{return '';}});
 const monitored=[...new Set(names.filter(n=>/^(nfse-esquemas_xsd-|anexo_i-sefin_adn-dps_nfse-|anexo_b-nbs2-lista_servico_nacional-)/.test(n)&&/\.(zip|xlsx)$/.test(n)))];
 if(!monitored.length)return {status:'indisponivel',mensagem:'N\u00e3o foi poss\u00edvel identificar as refer\u00eancias oficiais. Confira o portal.'};
 const changed=monitored.some(n=>!expected.includes(n))||expected.some(n=>!monitored.includes(n));
 return {status:changed?'revisar':'semAlteracao',mensagem:changed?'O portal apresenta refer\u00eancias diferentes das utilizadas nesta integra\u00e7\u00e3o. \u00c9 necess\u00e1ria revis\u00e3o t\u00e9cnica antes de atualizar.':'Nenhuma mudan\u00e7a identificada nas refer\u00eancias de XSD, leiaute e c\u00f3digos monitoradas. Isso n\u00e3o verifica todas as regras fiscais.',referencias:monitored};
}
let cache,pending;
async function check(){
 if(cache&&Date.now()-cache.time<3600000)return cache.value;
 if(pending)return pending;
 pending=(async()=>{let result;try{
 const response=await fetch(source,{signal:AbortSignal.timeout(10000),redirect:'error',headers:{'User-Agent':'Mozilla/5.0 Locadora-NFSe-Documentation-Check'}});
 if(!response.ok)throw Error('HTTP');
 const reader=response.body.getReader(),chunks=[];let bytes=0;
 while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2000000){await reader.cancel();throw Error('SIZE');}chunks.push(Buffer.from(value));}
 result=analyze(Buffer.concat(chunks).toString('utf8'));
 }catch{result={status:'indisponivel',mensagem:'Consulta ao portal indispon\u00edvel. As configura\u00e7\u00f5es foram preservadas; tente novamente mais tarde.'};}
 const value={...result,fonte:source,verificadoEm:new Date().toISOString()};cache={time:Date.now(),value};return value;
 })();try{return await pending;}finally{pending=null;}
}
module.exports={check,analyze};
