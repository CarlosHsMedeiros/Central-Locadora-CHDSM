const test=require("node:test");
const assert=require("node:assert/strict");
process.env.NODE_ENV="test";process.env.DB_HOST||="127.0.0.1";process.env.DB_NAME||="test";process.env.DB_USER||="test";process.env.DB_CONNECT_TIMEOUT="200";process.env.MIGRATION_ADMIN_KEY="chave-administrativa-de-teste-123456";

const repo=require("../src/repositories/migracaoRepository");
require("../src/services/authService").authenticate=async()=>({id:"1",nome:"Admin",perfil:"administrador"});
require("../src/repositories/authRepository").audit=async()=>{};
const maps=new Map(),clients=new Map();let nextId=1;
const key=(entity,index)=>`${entity}:${index}`;
const connection={beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},query:async()=>[{}],execute:async(sql)=>{if(sql.startsWith("INSERT INTO usuario_impossivel"))throw new Error("unexpected");return [{affectedRows:1}];}};
repo.pool.getConnection=async()=>connection;
repo.mapping=async(_c,entity,index,idOld)=>maps.get(key(entity,index))||[...maps.values()].find(item=>item.entity===entity&&idOld&&item.idOld===idOld)?.newId||null;
repo.saveMapping=async(_c,item)=>maps.set(key(item.entidade,item.indice),{entity:item.entidade,idOld:item.idLegado,newId:String(item.novoId)});
repo.resolve=async(_c,entity,reference)=>{for(const item of maps.values())if(item.entity===entity&&(item.idOld===String(reference)||item===maps.get(key(entity,Number(reference)))))return item.newId;return maps.get(key(entity,Number(reference)))?.newId||null;};
repo.find=async(_c,sql,params)=>sql.includes("FROM clientes")?clients.get(params[0])||null:null;
repo.insert=async(_c,sql,params)=>{if(sql.includes("INTO clientes")){const id=String(nextId++);clients.set(params[1],{id});return id;}return String(nextId++);};

const service=require("../src/services/migracaoService");
const app=require("../src/app");const pool=require("../src/config/database");let server,baseUrl;
async function post(stage,keyHeader,records){const response=await fetch(`${baseUrl}/api/admin/migracao/${stage}`,{method:"POST",headers:{"content-type":"application/json",...(keyHeader?{"x-migration-key":keyHeader}:{})},body:JSON.stringify({registros:records})});return {response,body:await response.json()};}
test.before(async()=>{await new Promise(resolve=>{server=app.listen(0,"127.0.0.1",()=>{baseUrl=`http://127.0.0.1:${server.address().port}`;resolve();});});});
test.after(async()=>{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));await pool.end();});
test.beforeEach(()=>{maps.clear();clients.clear();nextId=1;});

test("rota de migração exige chave administrativa",async()=>{const result=await post("clientes",null,[]);assert.equal(result.response.status,401);assert.equal(result.body.error.code,"ADMIN_AUTH_REQUIRED");});

test("migra registros válidos, relata inválidos e cria mapa",async()=>{const records=[{indice:0,idLegado:"cli-antigo",dados:{nome:"Maria",documento:"52998224725",situacao:"Ativo"}},{indice:1,dados:{nome:"Inválido",documento:"11111111111"}}];const result=await post("clientes",process.env.MIGRATION_ADMIN_KEY,records);assert.equal(result.response.status,200);assert.equal(result.body.data.importados,1);assert.equal(result.body.data.erros.length,1);assert.deepEqual(result.body.data.mapa[0],{indiceAntigo:0,idAntigo:"cli-antigo",novoId:"1"});});

test("reexecução é idempotente",async()=>{const records=[{indice:0,idLegado:"cli-antigo",dados:{nome:"Maria",documento:"52998224725",situacao:"Ativo"}}];let result=await service.migrate("clientes",{registros:records});assert.equal(result.importados,1);result=await service.migrate("clientes",{registros:records});assert.equal(result.importados,0);assert.equal(result.ignorados,1);assert.equal(clients.size,1);});

test("valida etapa e tamanho do lote",async()=>{let result=await post("desconhecida",process.env.MIGRATION_ADMIN_KEY,[]);assert.equal(result.response.status,400);assert.equal(result.body.error.code,"INVALID_MIGRATION_STAGE");result=await post("clientes",process.env.MIGRATION_ADMIN_KEY,new Array(1001).fill({dados:{}}));assert.equal(result.response.status,400);});
