"use strict";
const https=require('node:https'),zlib=require('node:zlib');
const bases={'1':'https://sefin.nfse.gov.br/SefinNacional','2':'https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional'};
function exchange(url,certificate,method,body,binary=false){return new Promise((resolve,reject)=>{
 const payload=body?JSON.stringify(body):null;
 const req=https.request(url,{method,key:certificate.privateKey,cert:certificate.chain,minVersion:'TLSv1.2',rejectUnauthorized:true,headers:{Accept:binary?'application/pdf':'application/json',...(payload?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}:{})}},res=>{
  const parts=[];let size=0;res.on('data',chunk=>{size+=chunk.length;if(size>4*1024*1024){req.destroy(Error('RESPONSE_LIMIT'));return;}parts.push(chunk);});res.on('error',reject);res.on('end',()=>{try{resolve({status:res.statusCode,data:binary?Buffer.concat(parts):JSON.parse(Buffer.concat(parts).toString('utf8')||'{}')});}catch{reject(Error('INVALID_RESPONSE'));}});
 });const timer=setTimeout(()=>req.destroy(Error('TIMEOUT')),45000);req.on('close',()=>clearTimeout(timer));req.on('error',reject);if(payload)req.write(payload);req.end();
});}
function request(config,certificate,method,route,body){if(!bases[config.ambiente])throw Error('INVALID_ENV');return exchange(new URL(bases[config.ambiente]+route),certificate,method,body);}
async function pdf(config,certificate,chave){if(!bases[config.ambiente]||!/^\d{50}$/.test(chave))throw Error('INVALID_KEY');const base=config.ambiente==='1'?'https://adn.nfse.gov.br':'https://adn.producaorestrita.nfse.gov.br';return exchange(new URL(base+'/danfse/'+chave),certificate,'GET',null,true);}
const pack=xml=>zlib.gzipSync(Buffer.from(xml,'utf8')).toString('base64');
function unpack(value){if(typeof value!=='string'||value.length>4*1024*1024)throw Error('INVALID_XML');return zlib.gunzipSync(Buffer.from(value,'base64'),{maxOutputLength:4*1024*1024}).toString('utf8');}
module.exports={request,pdf,pack,unpack};
