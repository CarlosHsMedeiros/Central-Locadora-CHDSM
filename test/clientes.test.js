const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

process.env.NODE_ENV="test"; process.env.DB_HOST||="127.0.0.1"; process.env.DB_NAME||="central_locadora_test"; process.env.DB_USER||="test"; process.env.DB_CONNECT_TIMEOUT="200";

const repository=require("../src/repositories/clienteRepository");
require("../src/services/authService").authenticate=async()=>({id:"1",nome:"Admin",perfil:"administrador"});
require("../src/repositories/authRepository").audit=async()=>{};
let records=[]; let nextId=1; let failList=false;
repository.list=async({busca,limit,offset})=>{if(failList)throw new Error("falha simulada");const term=busca.toLowerCase();const filtered=records.filter(c=>[c.nome,c.documento,c.telefone,c.whatsapp,c.cnh,c.email].some(v=>String(v||"").toLowerCase().includes(term)));return {rows:filtered.slice(offset,offset+limit),total:filtered.length};};
repository.listOptions=async()=>records.filter(c=>c.situacao!=="Inativo").map(c=>({id:c.id,nome:c.nome||c.razaoSocial,documento:c.documento,tipoPessoa:c.tipoPessoa}));
repository.findById=async(id)=>records.find(c=>String(c.id)===String(id))||null;
repository.findByDocument=async(documento,exceptId)=>records.find(c=>c.documento===documento&&String(c.id)!==String(exceptId))||null;
repository.create=async(data)=>{const record={id:nextId++,...data,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};records.push(record);return record;};
repository.update=async(id,data)=>{const index=records.findIndex(c=>String(c.id)===String(id));if(index<0)return null;records[index]={...records[index],...data,updatedAt:new Date().toISOString()};return records[index];};
repository.remove=async(id)=>{const before=records.length;records=records.filter(c=>String(c.id)!==String(id));return records.length<before;};

const app=require("../src/app");
const pool=require("../src/config/database");
let server,baseUrl;
const payload=(overrides={})=>({nome:"Maria da Silva",documento:"529.982.247-25",rg:"123",nascimento:"1990-01-02",telefone:"11999999999",whatsapp:"",email:"maria@example.com",cep:"01001-000",estado:"sp",cidade:"São Paulo",bairro:"Centro",endereco:"Praça da Sé",numero:"1",complemento:"",cnh:"123456",categoria:"b",validadeCnh:"2030-12-31",situacao:"Ativo",observacoes:"Teste",...overrides});
async function call(pathname,options={}){const response=await fetch(`${baseUrl}${pathname}`,{...options,headers:{"Content-Type":"application/json",...(options.headers||{})}});const body=response.status===204?null:await response.json();return {response,body};}

test.before(async()=>{await new Promise(resolve=>{server=app.listen(0,"127.0.0.1",()=>{baseUrl=`http://127.0.0.1:${server.address().port}`;resolve();});});});
test.after(async()=>{await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await pool.end();});
test.beforeEach(()=>{records=[];nextId=1;failList=false;});

test("CRUD completo de clientes",async()=>{
  let result=await call("/api/clientes",{method:"POST",body:JSON.stringify(payload())});
  assert.equal(result.response.status,201); assert.equal(result.body.data.documento,"52998224725"); assert.equal(result.body.data.estado,"SP"); const id=result.body.data.id;
  result=await call(`/api/clientes/${id}`); assert.equal(result.response.status,200); assert.equal(result.body.data.nome,"Maria da Silva");
  result=await call(`/api/clientes/${id}`,{method:"PUT",body:JSON.stringify(payload({nome:"Maria Atualizada"}))}); assert.equal(result.response.status,200); assert.equal(result.body.data.nome,"Maria Atualizada");
  result=await call(`/api/clientes/${id}`,{method:"DELETE"}); assert.equal(result.response.status,204);
  result=await call(`/api/clientes/${id}`); assert.equal(result.response.status,404); assert.equal(result.body.error.code,"CLIENT_NOT_FOUND");
});

test("pesquisa e paginação",async()=>{
  await call("/api/clientes",{method:"POST",body:JSON.stringify(payload())});
  const empresa=await call("/api/clientes",{method:"POST",body:JSON.stringify(payload({tipoPessoa:"PJ",nome:"",razaoSocial:"Empresa Exemplo",nomeFantasia:"Exemplo",inscricaoEstadual:"110042490114",responsavel:"Ana",documento:"04.252.011/0001-10",email:"financeiro@empresa.test"}))});
  assert.equal(empresa.response.status,201);assert.equal(empresa.body.data.tipoPessoa,"PJ");assert.equal(empresa.body.data.razaoSocial,"Empresa Exemplo");
  let result=await call("/api/clientes?busca=empresa&page=1&limit=20"); assert.equal(result.response.status,200); assert.equal(result.body.data.length,1); assert.equal(result.body.pagination.total,1);
  result=await call("/api/clientes?page=2&limit=1"); assert.equal(result.body.data.length,1); assert.deepEqual(result.body.pagination,{page:2,limit:1,total:2,pages:2});
});

test("fornece clientes ativos para vínculos de multas e faturas",async()=>{
  await call("/api/clientes",{method:"POST",body:JSON.stringify(payload())});
  await call("/api/clientes",{method:"POST",body:JSON.stringify(payload({nome:"Cliente Inativo",documento:"04.252.011/0001-10",tipoPessoa:"PJ",razaoSocial:"Cliente Inativo Ltda",situacao:"Inativo"}))});
  const result=await call("/api/clientes/opcoes");
  assert.equal(result.response.status,200); assert.equal(result.body.data.length,1);
  assert.deepEqual(Object.keys(result.body.data[0]).sort(),["documento","id","nome","tipoPessoa"]);
});

test("valida CPF/CNPJ e paginação",async()=>{
  let result=await call("/api/clientes",{method:"POST",body:JSON.stringify(payload({documento:"111.111.111-11"}))}); assert.equal(result.response.status,400); assert.equal(result.body.error.code,"INVALID_DOCUMENT");
  result=await call("/api/clientes?page=0&limit=500"); assert.equal(result.response.status,400); assert.equal(result.body.error.code,"VALIDATION_ERROR");
  result=await call("/api/clientes/abc"); assert.equal(result.response.status,400); assert.equal(result.body.error.code,"INVALID_ID");
});

test("impede documento duplicado",async()=>{
  await call("/api/clientes",{method:"POST",body:JSON.stringify(payload())});
  const result=await call("/api/clientes",{method:"POST",body:JSON.stringify(payload({nome:"Outra Pessoa"}))}); assert.equal(result.response.status,409); assert.equal(result.body.error.code,"DOCUMENT_ALREADY_EXISTS");
});

test("padroniza erros inesperados como 500 JSON",async()=>{
  failList=true; const result=await call("/api/clientes"); assert.equal(result.response.status,500); assert.equal(result.body.error.code,"INTERNAL_SERVER_ERROR"); assert.equal(result.body.error.message,"Erro interno do servidor.");
});

test("repository utiliza pool.execute e placeholders",()=>{
  const source=fs.readFileSync(path.resolve(__dirname,"../src/repositories/clienteRepository.js"),"utf8");
  assert.match(source,/pool\.execute/g); assert.doesNotMatch(source,/pool\.query/g);
  assert.match(source,/WHERE id=\?/); assert.match(source,/documento=\?/); assert.match(source,/VALUES \(\$\{writable\.map/);
});
