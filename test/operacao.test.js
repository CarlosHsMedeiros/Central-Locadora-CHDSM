const test=require("node:test"),assert=require("node:assert/strict");
process.env.NODE_ENV="test";
const v=require("../src/validators/operacaoValidator"),repo=require("../src/repositories/operacaoRepository");
test("calcula total da fatura no servidor e ignora total adulterado",()=>{
 const d=v.normalize("faturas",{numero:"FAT",tipo:"Outro",clienteId:"1",descricao:"Teste",vencimento:"2026-09-29",valor:9999,valorBase:"0,10",itensVeiculos:[{veiculoId:"2",valor:"0,20"}]});
 assert.equal(d.valor,0.3);
 assert.throws(()=>v.normalize("faturas",{...d,_dbId:null,itensVeiculos:[{veiculoId:"2",valor:1},{veiculoId:"2",valor:1}]}));
});
test("valida datas, valores negativos, referencias e anexos",()=>{
 const base={veiculoId:"1",tipo:"Revisão",dataEntrada:"2026-09-29",status:"Agendada",descricao:"Teste",valorPecas:10,valorMaoObra:20};
 for(const change of [{dataSaida:"2026-09-28"},{valorPecas:-1},{veiculoId:"1 OR 1=1"},{dataEntrada:"2026-02-30"}])assert.throws(()=>v.normalize("manutencoes",{...base,...change}));
 assert.throws(()=>v.normalize("multas",{veiculoId:"1",autoInfracao:"A",data:"2026-09-29",situacao:"Pendente",arquivo:{nome:"x.exe",dados:"data:application/octet-stream;base64,TVqQ"}}));
});
test("versao independe da ordem das propriedades mas detecta alteracoes",()=>{
 assert.equal(repo.version([{id:1,valor:20}]),repo.version([{valor:20,id:1}]));
 assert.notEqual(repo.version([{valor:20}]),repo.version([{valor:21}]));
});
const express=require("express"),router=require("../src/routes/operacaoRoutes"),errorHandler=require("../src/middlewares/errorHandler");
let server,base,writes=0;
test.before(async()=>{
 repo.snapshot=async()=>({data:{multas:[]},versions:{multas:"v1"}});
 repo.write=async(key,body)=>{writes++;return{data:body.registros,version:"v2"};};
 const app=express();app.use(express.json());app.use((req,res,next)=>{req.user={id:"1",nome:"Teste",perfil:req.get("x-test-role")||"consulta"};next();});app.use(router);app.use(errorHandler);
 await new Promise(resolve=>{server=app.listen(0,"127.0.0.1",()=>{base="http://127.0.0.1:"+server.address().port;resolve();});});
});
test.after(async()=>{await new Promise(resolve=>server.close(resolve));await require("../src/config/database").end();});
test("consulta nao grava e manutencao nao altera financeiro ou empresa",async()=>{
 for(const [role,key]of [["consulta","multas"],["manutenção","faturas"],["financeiro","configuracoesEmpresa"]]){
  const r=await fetch(base+"/"+key,{method:"PUT",headers:{"content-type":"application/json","x-test-role":role},body:JSON.stringify({version:"v1",registros:[]})});assert.equal(r.status,403);
 }
 assert.equal(writes,0);
 const ok=await fetch(base+"/manutencoes",{method:"PUT",headers:{"content-type":"application/json","x-test-role":"manutenção"},body:JSON.stringify({version:"v1",registros:[]})});assert.equal(ok.status,200);
});
test("importacao integrada exige administrador",async()=>{
 const r=await fetch(base+"/importar/clientes",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({registros:[]})});assert.equal(r.status,403);
});
