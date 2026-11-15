const test=require("node:test"),assert=require("node:assert/strict"),{EventEmitter}=require("node:events"),fs=require("node:fs"),acorn=require("acorn");
process.env.NODE_ENV="test";process.env.DB_HOST||="127.0.0.1";process.env.DB_NAME||="test";process.env.DB_USER||="test";
const policy=require("../ARQUIVOS_SEGUROS.JS"),files=require("../src/validators/arquivoValidator"),rate=require("../src/middlewares/loginRateLimit"),pool=require("../src/config/database"),app=require("../src/app");
const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=","base64");
const data=(bytes,mime)=>"data:"+mime+";base64,"+Buffer.from(bytes).toString("base64");
let server,url;
test.before(async()=>{await new Promise(resolve=>{server=app.listen(0,"127.0.0.1",()=>{url="http://127.0.0.1:"+server.address().port;resolve();});});});
test.after(async()=>{await new Promise(resolve=>server.close(resolve));await pool.end();});
test("aceita formatos autorizados e valida os bytes",()=>{
 assert.equal(files.image(data(png,"image/png")),data(png,"image/png"));
 for(const name of ["foto.JPG","foto.jpeg","foto.png","arquivo.PDF","video.mp4","video.webm"])assert.ok(policy.extension(name));
 assert.equal(policy.validateBytes(Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF"),"pdf"),"application/pdf");
});
test("bloqueia executáveis, tipos fora da lista, caminhos e nomes ambíguos",()=>{
 for(const name of ["a.exe","a.svg","a.html","a.json","a.zip","a.docm","a.xlsm","a.exe.pdf","../a.pdf","a.pdf.","a.pdf ","NUL.pdf","a\u202epdf.exe","x:foto.png"])assert.throws(()=>policy.extension(name),name);
 assert.throws(()=>policy.validateMeta({name:"a.png",type:"image/png",size:policy.MAX+1}));
 assert.throws(()=>policy.validateMeta({name:"a.pdf",type:"application/pdf",size:20},true));
 assert.throws(()=>policy.validateMeta({name:"a.png",type:"text/html",size:20}));
});
test("rejeita renomeações, SVG, XML com XXE e PDF com ações",()=>{
 assert.throws(()=>files.image(data(Buffer.from("<svg onload='alert(1)'/>"),"image/png")));
 assert.throws(()=>files.image(data(Buffer.from("<svg/>"),"image/svg+xml")));
 assert.throws(()=>files.attachment({nome:"x.pdf",dados:data(png,"application/pdf")}));
 for(const xml of ['<!DOCTYPE x [<!ENTITY secret SYSTEM "file:///etc/passwd">]><x>&secret;</x>','<?xml-stylesheet href="https://example.org/x"?><x/>'])assert.throws(()=>policy.validateBytes(Buffer.from(xml),"xml"));
 for(const action of ["/JavaScript","/J#53","/Launch","/OpenAction","/EmbeddedFile"])assert.throws(()=>policy.validateBytes(Buffer.from("%PDF-1.7\n"+action+"\n%%EOF"),"pdf"));
 assert.throws(()=>files.attachment({nome:"x.png",dados:data(png,"image/png"),tamanho:1}));
});
function attempt(ip,usuario,finish){
 const res=new EventEmitter();res.headers={};res.set=(k,v)=>res.headers[k]=v;res.statusCode=401;res.writableFinished=false;
 let error,accepted=false;rate({ip,body:{usuario}},res,e=>{error=e;accepted=!e;});
 if(accepted&&finish){res.writableFinished=true;res.emit("finish");}
 return {res,error,accepted};
}
test("bloqueia força bruta simultânea antes de comparar senhas",()=>{
 rate.reset();const active=[];for(let i=0;i<5;i++){const a=attempt("1","admin");assert.equal(a.accepted,true);active.push(a);}
 const blocked=attempt("1","admin");assert.equal(blocked.error.status,429);assert.ok(blocked.res.headers["Retry-After"]);
 active.forEach(a=>a.res.emit("close"));assert.equal(attempt("1","admin").error.status,429);
});
test("bloqueia pulverização de senhas e conta atacada por IPs diferentes",()=>{
 rate.reset();for(let i=0;i<30;i++)assert.equal(attempt("ip","user"+i,true).accepted,true);assert.equal(attempt("ip","outro").error.status,429);
 rate.reset();for(let i=0;i<10;i++)assert.equal(attempt("ip"+i,"ADMIN",true).accepted,true);assert.equal(attempt("novo-ip"," admin ").error.status,429);rate.reset();
});
test("protege páginas privadas, fontes, backups e caminhos malformados",async()=>{
 for(const path of ["/","/index.html","/LOCADORA_RELATORIOS.HTML","/LOCADORA_CONFIGURACOES.HTML"]){const r=await fetch(url+path,{redirect:"manual"});assert.equal(r.status,303,path);assert.equal(r.headers.get("location"),"/LOCADORA_PAGINA_INICIAL.HTML");}
 for(const path of ["/SRC/config/env.js","/Server.js","/src%5cconfig%5cenv.js","/AUDITORIA_PROJETO.md","/.env","/package-lock.json","/test/security.test.js","/database/schema.sql","/nao-publico.bak"]){const r=await fetch(url+path);assert.equal(r.status,404,path);}
 assert.equal((await fetch(url+"/%ZZ")).status,400);
 for(const path of ["/DOMPURIFY.js","/ARQUIVOS_SEGUROS.JS","/SEGURANCA_INTERFACE.JS","/LOCADORA_EVENTOS.JS"]){assert.equal((await fetch(url+path)).status,200,path);}
});
test("rejeita origem externa, JSON malformado e poluição de protótipo",async()=>{
 const post=(body,headers={})=>fetch(url+"/api/auth/login",{method:"POST",headers:{"content-type":"application/json",...headers},body});
 assert.equal((await post("{}",{origin:"https://invasor.invalid"})).status,403);
 assert.equal((await fetch(url+"/api/auth/me",{headers:{origin:"https://invasor.invalid"}})).status,403);
 assert.equal((await post("{}",{cookie:"locadora_session=fake","sec-fetch-site":"cross-site"})).status,403);
 assert.equal((await post("{}",{cookie:"locadora_session=fake"})).status,403);
 assert.equal((await post("{}",{origin:url})).status,400);
 const malformed=await post('{"segredo":"nao-expor"');assert.equal(malformed.status,400);assert.doesNotMatch(await malformed.text(),/nao-expor|SyntaxError|stack/);
 assert.equal((await post('{"__proto__":{"polluted":true}}')).status,400);
 assert.equal((await post('{"usuario":{"$ne":null},"senha":"senha"}')).status,400);
 assert.equal((await post("usuario=a",{ "content-type":"application/x-www-form-urlencoded"})).status,415);
 assert.equal((await fetch(url+"/api/clientes?busca=a&busca=b")).status,400);
 assert.equal({}.polluted,undefined);
});
test("não revela detalhes SQL nem aceita IDs e páginas excessivos",async()=>{
 for(const name of ["cliente","veiculo","contrato"]){const validator=require("../src/validators/"+name+"Validator");assert.throws(()=>validator.id("1 OR 1=1"));assert.throws(()=>validator.id("9".repeat(100)));assert.throws(()=>validator.query({page:"9007199254740992"}));}
 const original=pool.execute,calls=[];pool.execute=async(sql,params)=>{calls.push({sql,params});return sql.includes("COUNT(")?[[{total:0}]]:[[]];};
 try{const payload="' OR 1=1; DROP TABLE clientes; --";await require("../src/repositories/clienteRepository").list({busca:payload,limit:20,offset:0});for(const call of calls){assert.ok(!call.sql.includes(payload));assert.ok(call.params.includes("%"+payload+"%"));}}
 finally{pool.execute=original;}
});
test("todas as telas usam CSP sem scripts inline e HTML higienizado",async()=>{
 const r=await fetch(url+"/LOCADORA_PAGINA_INICIAL.HTML");const csp=r.headers.get("content-security-policy");assert.match(csp,/script-src 'self';/);assert.match(csp,/script-src-attr 'none'/);assert.match(csp,/object-src 'none'/);assert.match(csp,/form-action 'self'/);
 let sinks=0;
 for(const name of fs.readdirSync(".").filter(n=>/\.html$/i.test(n))){const text=fs.readFileSync(name,"utf8");assert.doesNotMatch(text,/<script(?![^>]*\bsrc=)[^>]*>\s*\S/i,name);assert.doesNotMatch(text,/\son(?:click|change|input|submit|keyup|blur)=/i,name);assert.ok(text.includes("SEGURANCA_INTERFACE.JS"),name);}
 for(const name of fs.readdirSync(".").filter(n=>/\.js$/i.test(n)&&n!=="server.js")){
  const source=fs.readFileSync(name,"utf8"),ast=acorn.parse(source,{ecmaVersion:"latest"});
  function walk(node){if(!node||typeof node!=="object")return;if(node.type==="AssignmentExpression"&&node.operator==="="&&node.left.type==="MemberExpression"&&["innerHTML","outerHTML"].includes(node.left.property.name)){assert.ok(source.slice(node.right.start,node.right.end).startsWith("SegurancaInterface.html("),name);sinks++;}for(const value of Object.values(node)){if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==="object")walk(value);}}
  walk(ast);
 }
 assert.ok(sinks>100);
});

const {office}=require("../scripts/security-fixtures");
test("inspeciona DOCX/XLSX comprimidos e rejeita conteúdo Office ativo",async()=>{
 for(const ext of ["docx","xlsx"]){
  const bytes=office(ext),mime=policy.types[ext];
  assert.throws(()=>files.attachment({nome:"documento."+ext,dados:data(bytes,mime)}));
  await assert.rejects(policy.validateFile(new File([bytes],"documento."+ext,{type:mime})));
 }
 for(const extra of [
  {"word/vbaProject.bin":"macro"},
  {"word/_rels/document.xml.rels":'<Relationships><Relationship TargetMode="External" Target="https://invasor.invalid"/></Relationships>'},
  {"word/document.xml":'<!DOCTYPE x [<!ENTITY e SYSTEM "file:///secret">]><x>&e;</x>'}
 ])assert.throws(()=>files.attachment({nome:"documento.docx",dados:data(office("docx",extra),policy.types.docx)}));
 const damaged=Buffer.from(office());damaged.writeUInt16LE(1,6);
 assert.throws(()=>files.attachment({nome:"documento.docx",dados:data(damaged,policy.types.docx)}));
});
