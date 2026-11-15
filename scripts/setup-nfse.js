const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const file=path.join(__dirname,'../.env');const current=fs.readFileSync(file,'utf8');
if(/^NFSE_ENCRYPTION_KEY=/m.test(current)){console.log('Chave existente preservada.');}else{fs.appendFileSync(file,'\n# Chave privada para protecao do certificado A1. Preserve no backup seguro.\nNFSE_ENCRYPTION_KEY='+crypto.randomBytes(32).toString('hex')+'\n');console.log('Chave de protecao criada no servidor. Reinicie o sistema.');}
