"use strict";
const crypto=require('node:crypto'),forge=require('node-forge'),HttpError=require('../utils/httpError');
const fail=message=>{throw new HttpError(400,'NFSE_CERTIFICATE',message);};
function key(){const value=process.env.NFSE_ENCRYPTION_KEY||'';if(!/^[a-f0-9]{64}$/i.test(value))fail('Configure a chave de protecao do certificado no servidor (npm run nfse:setup).');return Buffer.from(value,'hex');}
function encrypt(value){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key(),iv);const data=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return {v:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')};}
function decrypt(value){try{const decipher=crypto.createDecipheriv('aes-256-gcm',key(),Buffer.from(value.iv,'base64'));decipher.setAuthTag(Buffer.from(value.tag,'base64'));return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.data,'base64')),decipher.final()]).toString('utf8'));}catch{fail('Nao foi possivel abrir o certificado protegido. Confira a chave do servidor ou cadastre o certificado novamente.');}}
function parse(base64,password,cnpj){
 if(typeof base64!=='string'||base64.length>700000||!base64||!/^[A-Za-z0-9+/]+={0,2}$/.test(base64))fail('Envie um certificado A1 .pfx/.p12 de ate 512 KB.');
 if(typeof password!=='string'||password.length>256)fail('Informe a senha do certificado.');
 let p12;try{p12=forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(Buffer.from(base64,'base64').toString('binary')),false,password);}catch{fail('Certificado A1 invalido ou senha incorreta.');}
 const keys=[...(p12.getBags({bagType:forge.pki.oids.pkcs8ShroudedKeyBag})[forge.pki.oids.pkcs8ShroudedKeyBag]||[]),...(p12.getBags({bagType:forge.pki.oids.keyBag})[forge.pki.oids.keyBag]||[])].filter(b=>b.key);
 if(keys.length!==1)fail('O arquivo deve conter uma chave privada A1.');
 const privateKey=forge.pki.privateKeyToPem(keys[0].key),nativeKey=crypto.createPrivateKey(privateKey);
 const certs=(p12.getBags({bagType:forge.pki.oids.certBag})[forge.pki.oids.certBag]||[]).map(b=>b.cert).filter(Boolean);
 const match=certs.find(c=>{try{return new crypto.X509Certificate(forge.pki.certificateToPem(c)).checkPrivateKey(nativeKey);}catch{return false;}});
 if(!match)fail('Certificado e chave privada nao correspondem.');
 const cert=forge.pki.certificateToPem(match),x509=new crypto.X509Certificate(cert);
 if(Date.parse(x509.validFrom)>Date.now()||Date.parse(x509.validTo)<=Date.now())fail('Certificado vencido ou ainda fora da validade.');
 const extension=match.extensions.find(e=>e.id==='2.5.29.17');
 let holder='';
 function walk(node){if(!node||!Array.isArray(node.value))return;const first=node.value[0];if(first?.type===forge.asn1.Type.OID&&forge.asn1.derToOid(first.value)==='2.16.76.1.3.3'){const vals=[];function leaf(n){if(Array.isArray(n.value))n.value.forEach(leaf);else if(typeof n.value==='string')vals.push(n.value);}node.value.slice(1).forEach(leaf);holder=vals.join('').match(/\d{14}/)?.[0]||'';}node.value.forEach(walk);}
 if(extension?.value)try{walk(forge.asn1.fromDer(extension.value));}catch{}
 if(!holder)fail('Use o e-CNPJ A1 da empresa, com identificacao ICP-Brasil.');
 if(cnpj&&holder!==cnpj)fail('O CNPJ do certificado difere do CNPJ configurado para a empresa.');
 return {privateKey,cert,chain:[cert,...certs.filter(c=>c!==match).map(forge.pki.certificateToPem)].join('\n'),metadata:{cnpj:holder,titular:x509.subject,validade:new Date(x509.validTo).toISOString(),fingerprint:x509.fingerprint256}};
}
module.exports={encrypt,decrypt,parse};
