"use strict";
const {DOMParser}=require('@xmldom/xmldom'),transport=require('./nfseTransport');
const types=[101101,105102,105104,305101];
function decode(value){if(typeof value!=='string'||value.length>4*1024*1024)throw Error('INVALID_EVENT');try{return transport.unpack(value);}catch{return transport.unpack(Buffer.from(value,'base64').toString('utf8'));}}
function parse(event,key,type){
 if(event.chaveAcesso!==key||Number(event.tipoEvento)!==type)throw Error('EVENT_MISMATCH');
 const xml=decode(event.arquivoXml||event.eventoXmlGZipB64);if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('UNSAFE_EVENT');
 const doc=new DOMParser({onError:()=>{throw Error('INVALID_EVENT');}}).parseFromString(xml,'text/xml');
 const find=n=>doc.getElementsByTagNameNS('http://www.sped.fazenda.gov.br/nfse',n)[0];
 if(!find('infEvento')?.getAttribute('Id').startsWith('EVT'+key)||find('chNFSe')?.textContent!==key||!types.includes(type)||!find('e'+type))throw Error('EVENT_MISMATCH');
 return {xml,tipo:type,data:find('dhProc')?.textContent||'',motivo:find('xMotivo')?.textContent||find('xDesc')?.textContent||'Cancelamento registrado'};
}
async function cancellation(config,certificate,key){
 async function query(type){const result=await transport.request(config,certificate,'GET','/nfse/'+key+'/eventos/'+type+'/1');if(result.status===404)return null;if(result.status!==200||!Array.isArray(result.data.eventos))throw Error('EVENT_UNAVAILABLE');const event=result.data.eventos.find(e=>Number(e.tipoEvento)===type&&e.chaveAcesso===key);return event?parse(event,key,type):null;}
 const direct=await query(types[0]);if(direct)return direct;
 const rest=await Promise.all(types.slice(1).map(query));return rest.find(Boolean)||null;
}
module.exports={cancellation,parse};
