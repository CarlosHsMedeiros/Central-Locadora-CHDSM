const test=require('node:test'),assert=require('node:assert/strict'),express=require('express');
const service=require('../src/services/nfseService'),app=express();let server,url,uploads=0,emissions=0;
app.use(express.json());app.use((req,res,next)=>{req.user={id:'1',perfil:req.get('x-test-role')||'consulta'};next();});
app.use('/nfse',require('../src/routes/nfseRoutes'));app.use(require('../src/middlewares/errorHandler'));
test.before(async()=>{await new Promise(resolve=>{server=app.listen(0,'127.0.0.1',()=>{url='http://127.0.0.1:'+server.address().port;resolve();});});});
test.after(async()=>{await new Promise(resolve=>server.close(resolve));await require('../src/config/database').end();});
async function call(role,path,method='GET',body){return fetch(url+'/nfse'+path,{method,headers:{'x-test-role':role,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
test('somente administrador pode cadastrar certificado',async t=>{t.mock.method(service,'saveCertificate',async()=>{uploads++;return {certificado:{cnpj:'11222333000181'}};});assert.equal((await call('financeiro','/certificado','POST',{})).status,403);assert.equal((await call('consulta','/certificado','POST',{})).status,403);assert.equal(uploads,0);const r=await call('administrador','/certificado','POST',{});assert.equal(r.status,200);assert.equal(uploads,1);assert.doesNotMatch(JSON.stringify(await r.json()),/senha|privateKey|conteudo/);});
test('perfil de consulta nao emite nem baixa XML; financeiro pode emitir',async t=>{t.mock.method(service,'emit',async()=>{emissions++;return {status:'pendente'};});assert.equal((await call('consulta','/faturas/1/emitir','POST',{})).status,403);assert.equal((await call('consulta','/faturas/1/xml')).status,403);assert.equal(emissions,0);assert.equal((await call('financeiro','/faturas/1/emitir','POST',{})).status,200);});

test('PDF exige perfil financeiro e indisponibilidade preserva mensagem',async t=>{
 assert.equal((await call('consulta','/faturas/1/danfse')).status,403);
 t.mock.method(service,'downloadPdf',async()=>({chave:'1'.repeat(50),pdf:Buffer.from('%PDF-1.7 teste')}));let r=await call('financeiro','/faturas/1/danfse');assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/application\/pdf/);
 t.mock.method(service,'downloadPdf',async()=>{const e=new Error('Servico PDF indisponivel; nota autorizada preservada.');e.code='NFSE_PDF_UNAVAILABLE';throw e;});r=await call('financeiro','/faturas/1/danfse');assert.equal(r.status,503);assert.match((await r.json()).error.message,/preservada/);
});
