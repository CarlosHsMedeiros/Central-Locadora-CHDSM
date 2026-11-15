/* Teste isolado: APIs simuladas; não altera dados da locadora. */
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os"),{spawn}=require("node:child_process");
process.env.NODE_ENV="test";process.env.DB_HOST||="127.0.0.1";process.env.DB_NAME||="test";process.env.DB_USER||="test";
const auth=require("../src/services/authService");auth.authenticate=async()=>({id:"1",nome:"Administrador",perfil:"administrador"});
const app=require("../src/app"),pool=require("../src/config/database");
(async()=>{
 let server,chrome,socket;
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),"locadora-security-"));
 const issues=[],dialogs=[];
 const opData={multas:[],manutencoes:[],faturas:[],checklistsVeiculos:[],configuracoesEmpresa:{},camposFotoChecklist:[],historicoRelatoriosEmitidos:[]};let nextRecord=1,nextInvoice=3000,failWrite=false;let docDraft=null;const writes=[];
 try{
  const base=await new Promise(resolve=>{server=app.listen(0,"127.0.0.1",()=>resolve("http://127.0.0.1:"+server.address().port));});
  chrome=spawn("C:/Program Files/Google/Chrome/Application/chrome.exe",["--headless=new","--disable-gpu","--no-first-run","--no-default-browser-check","--remote-debugging-port=0","--user-data-dir="+profile,"about:blank"],{windowsHide:true});
  const endpoint=await new Promise((resolve,reject)=>{let out="";const timer=setTimeout(()=>reject(Error("Chrome não iniciou")),20000);chrome.stderr.on("data",d=>{out+=d;const m=out.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m){clearTimeout(timer);resolve(m[1]);}});chrome.on("error",reject);});
  const devtools=endpoint.replace("ws:","http:").split("/devtools")[0];
  const target=await(await fetch(devtools+"/json/new?about:blank",{method:"PUT"})).json();
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>socket.onopen=resolve);
  let seq=0;const pending=new Map();
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  socket.onmessage=async event=>{
   const message=JSON.parse(event.data);
   if(message.id){const item=pending.get(message.id);if(item){pending.delete(message.id);message.error?item.reject(Error(message.error.message)):item.resolve(message.result);}return;}
   const p=message.params;
   if(message.method==="Runtime.exceptionThrown")issues.push(p.exceptionDetails.exception?.description||p.exceptionDetails.text);
   if(message.method==="Log.entryAdded"&&p.entry.level==="error"&&p.entry.source==="security")issues.push(p.entry.text);
   if(message.method==="Page.javascriptDialogOpening"){dialogs.push(p.message);await send("Page.handleJavaScriptDialog",{accept:true});}
   if(message.method==="Fetch.requestPaused"){
    const route=new URL(p.request.url).pathname;
    let body={data:[],pagination:{pages:1,page:1,total:0}};
    if(route==="/api/auth/me")body={data:{user:{id:"1",nome:"Administrador",perfil:"administrador"}}};
    if(route==="/api/veiculos")body={data:[{id:"1",placa:"ABC1D23",marca:"Fiat",modelo:"Argo",ano:2024,situacao:"Disponível",anoLicenciamento:2026,ufRegistro:"SP",grupoLicenciamento:"geral"}],pagination:{page:1,pages:1,total:1}};

    if(route==="/api/clientes"||route==="/api/clientes/opcoes")body={data:[{id:"1",nome:"Cliente teste",documento:"52998224725",situacao:"Ativo"}],pagination:{pages:1,page:1,total:1}};
    if(route==="/api/contratos")body={data:[{id:"1",clienteId:"1",numeroContrato:"CTR-TESTE",valorLocacao:100,dataInicio:"2026-01-01",dataFim:"2026-12-31",status:"Ativo",veiculos:[{id:"1",placa:"ABC1D23",marca:"Fiat",modelo:"Argo"}]}],pagination:{pages:1,page:1,total:1}};
    if(route==="/api/operacao/faturas/historico")body={data:[],total:0,pagina:1};
    if(route==="/api/operacao")body={data:opData,versions:Object.fromEntries(Object.keys(opData).map(k=>[k,"fixture"]))};
    let code=200;
    if(route.startsWith("/api/operacao/")&&p.request.method==="PUT"){
     if(failWrite){failWrite=false;code=409;body={error:{code:"STALE_DATA",message:"Conflito de teste"}};}
     else{
      const key=route.split("/").pop(),payload=JSON.parse(p.request.postData);writes.push({key,payload});
      if(["configuracoesEmpresa","camposFotoChecklist"].includes(key))opData[key]=payload.registros[0];
      else{
       let rows=payload.modo==="delta"?opData[key].filter(r=>!(payload.excluidos||[]).includes(r._dbId)):[];
       for(const row of payload.registros){const id=row._dbId||String(nextRecord++),copy={...row,id,_dbId:id};if(key==="faturas"&&!row._dbId)copy.numero=String(nextInvoice++);if(key==="manutencoes")copy.valorTotal=require("../LOCADORA_VALORES.JS").somar([copy.valorPecas,copy.valorMaoObra]);const i=rows.findIndex(r=>r._dbId===id);if(i<0)rows.push(copy);else rows[i]=copy;}
       opData[key]=rows;
      }
      body={data:opData[key],version:"fixture"};
     }
    }

    if(route==='/api/contratos/1/documento'){
     if(p.request.method==='PUT'){const payload=JSON.parse(p.request.postData);docDraft={texto:payload.texto,checklistIds:payload.checklistIds,complementos:{horaInicio:payload.horaInicio,formaPagamento:payload.formaPagamento}};}
     body={data:{contrato:{id:'1',numeroContrato:'CTR-TESTE',valorLocacao:100,dataInicio:'2026-01-01',dataFim:'2026-12-31',observacoes:'Observacoes do cadastro'},cliente:{id:'1',nome:'Cliente teste',documento:'52998224725',endereco:'Rua Teste'},empresa:{nome:'Empresa integrada',cnpj:'123',endereco:'Rua Empresa'},veiculos:[{id:'1',placa:'ABC1D23',marca:'Fiat',modelo:'Argo'}],checklists:opData.checklistsVeiculos.map(c=>({...c,placa:'ABC1D23'})),checklistIds:docDraft?.checklistIds||[],documento:docDraft,version:docDraft?'doc2':'doc1'}};
    }
    if(route==="/api/health")body={status:"ok",database:"connected",service:"central-locadora-api"};
    await send("Fetch.fulfillRequest",{requestId:p.requestId,responseCode:code,responseHeaders:[{name:"Content-Type",value:"application/json"}],body:Buffer.from(JSON.stringify(body)).toString("base64")});
   }
  };
  await send("Page.enable");await send("Runtime.enable");await send("Log.enable");
  await send("Fetch.enable",{patterns:[{urlPattern:"*/api/*"}]});
  const evaluate=async expression=>{const result=await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
  async function navigate(page){
   await send("Page.navigate",{url:base+"/"+page});
   for(let i=0;i<100;i++){await new Promise(r=>setTimeout(r,50));if(await evaluate("document.readyState==='complete'&&location.pathname==="+JSON.stringify("/"+page)))break;}
   for(let i=0;i<150;i++){if(await evaluate("!document.querySelector('script[src=\"LOCADORA_BANCO.JS\"]')||window.Banco?.pronto"))break;await new Promise(r=>setTimeout(r,50));}
   assert.equal(await evaluate("typeof SegurancaInterface"),"object",page);
  }
  const pages=fs.readdirSync(path.resolve(__dirname,"..")).filter(n=>/\.html$/i.test(n));
  for(const page of pages){
   await navigate(page);
   const count=await evaluate("Array.from(document.querySelectorAll('*')).filter(el=>Array.from(el.attributes).some(a=>/^on/.test(a.name))).length");
   assert.equal(count,0,page);
   if(["LOCADORA_CLIENTES.HTML","LOCADORA_VEICULOS.HTML","LOCADORA_CONTRATOS.HTML","LOCADORA_MULTAS.HTML","LOCADORA_MANUTENCAO.HTML"].includes(page)){
    await evaluate("document.querySelector('button[data-sec-click]')?.click()");
    await new Promise(r=>setTimeout(r,100));
    assert.equal(await evaluate("document.getElementById('formulario')?.classList.contains('mostrar')"),true,page+" abrir formulário");
   }
   if(page==="LOCADORA_VEICULOS.HTML"){
    assert.equal(await evaluate("document.querySelectorAll('#tabelaVeiculos td').length"),7);
    await evaluate("document.querySelector('#tabelaVeiculos .btn-ficha').click()");
    assert.equal(await evaluate("document.getElementById('modalFicha').classList.contains('mostrar')"),true);
   }
   console.log("OK página: "+page);
  }
  await navigate("LOCADORA_CONFIGURACOES.HTML");
  assert.equal(await evaluate("SegurancaInterface.html('<img src=x onerror=alert(999)><script>alert(999)</script><a href=\"javascript:alert(1)\">x</a>').includes('onerror')"),false);
  assert.equal(await evaluate("SegurancaInterface.rich('<h3>Título</h3><script>evil()</script><p onclick=\"evil()\">Texto</p>')"),"<h3>Título</h3><p>Texto</p>");
  assert.equal(await evaluate("SegurancaInterface.html('<td>A</td><td>B</td>')"),"<td>A</td><td>B</td>");
  assert.equal(await evaluate("SegurancaInterface.html('<tr><td>A</td></tr>')"),"<tr><td>A</td></tr>");
  const before=dialogs.length;
  await evaluate("(async()=>{const input=document.getElementById('imagemCabecalho');const d=new DataTransfer();d.items.add(new File(['<svg onload=\"alert(1)\"/>'],'foto.png',{type:'image/png'}));input.files=d.files;input.dispatchEvent(new Event('change',{bubbles:true}));while(SegurancaInterface.pending)await new Promise(r=>setTimeout(r,20));return input.files.length;})()");
  assert.equal(await evaluate("document.getElementById('imagemCabecalho').files.length"),0);
  assert.equal(dialogs.length,before+1);
  const png="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
  await evaluate("(async()=>{const input=document.getElementById('imagemCabecalho');const d=new DataTransfer();d.items.add(new File([Uint8Array.from(atob("+JSON.stringify(png)+"),c=>c.charCodeAt(0))],'foto.png',{type:'image/png'}));input.files=d.files;input.dispatchEvent(new Event('change',{bubbles:true}));while(SegurancaInterface.pending)await new Promise(r=>setTimeout(r,20));await new Promise(r=>setTimeout(r,100));})()");
  assert.equal(await evaluate("document.getElementById('previewImagemCabecalho').src.startsWith('data:image/png;base64,')"),true);
  await navigate("LOCADORA_MULTAS.HTML");
  assert.equal(await evaluate("document.getElementById('arquivoMulta').accept"),".jpg,.jpeg,.png,.pdf,.mp4,.webm");
  
  const officeFixture=require("./security-fixtures").office();
  await evaluate("(async()=>{const input=document.getElementById('arquivoMulta');const bytes=Uint8Array.from(atob("+JSON.stringify(officeFixture.toString("base64"))+"),c=>c.charCodeAt(0));const d=new DataTransfer();d.items.add(new File([bytes],'documento.docx',{type:ArquivosSeguros.types.docx}));input.files=d.files;input.dispatchEvent(new Event('change',{bubbles:true}));while(SegurancaInterface.pending)await new Promise(r=>setTimeout(r,20));})()");
  assert.equal(await evaluate("document.getElementById('arquivoMulta').files.length"),0);


  await navigate("LOCADORA_MANUTENCAO.HTML");
  await evaluate('(async()=>{abrirFormulario();const set=(id,v)=>document.getElementById(id).value=v;set("veiculo","0");const tipo=document.getElementById("tipo");tipo.value=[...tipo.options].find(o=>o.value)?.value;set("dataEntrada","2026-09-29");set("descricao","Manutencao de teste");set("valorPecas","10,10");set("valorMaoObra","20,20");await salvarManutencao();})()');
  assert.equal(opData.manutencoes.length,1);assert.equal(opData.manutencoes[0].veiculoId,"1");assert.equal(opData.manutencoes[0].valorTotal,30.3);
  await navigate("LOCADORA_MANUTENCAO.HTML");
  assert.equal(await evaluate('manutencoes.length'),1);
  await evaluate('editarManutencao(0)');
  failWrite=true;
  await evaluate('(async()=>{document.getElementById("descricao").value="Nao deve salvar";try{await salvarManutencao();}catch{}})()');
  assert.equal(opData.manutencoes[0].descricao,"Manutencao de teste");
  assert.equal(await evaluate('document.getElementById("formulario").classList.contains("mostrar")'),true);
  await evaluate('(async()=>{document.getElementById("descricao").value="Edicao confirmada";await salvarManutencao();})()');
  assert.equal(opData.manutencoes.length,1);assert.equal(opData.manutencoes[0].descricao,"Edicao confirmada");
  await navigate("LOCADORA_CHECKLISTS.HTML");
  await evaluate('(async()=>{document.getElementById("veiculoChecklist").value="0";document.getElementById("responsavelChecklist").value="Teste";await salvarChecklist(new Event("submit"));})()');
  assert.equal(opData.checklistsVeiculos.length,1);assert.equal(opData.checklistsVeiculos[0].veiculoId,"1");
  await navigate("LOCADORA_CHECKLISTS.HTML");
  assert.equal(await evaluate('document.querySelectorAll("#listaChecklists .registro").length'),1);
  await navigate("LOCADORA_FINANCEIRO.HTML");
  await evaluate('(async()=>{await abrirFormularioFatura();const set=(id,v)=>document.getElementById(id).value=v;set("clienteFatura","1");carregarContratosFatura();set("contratoFatura","1");set("numeroFatura","FAT-TESTE");set("descricaoFatura","Fatura de teste");set("vencimentoFatura","2026-09-29");set("valorBaseFatura","100,10");await salvarFatura();})()');
  assert.equal(opData.faturas.length,1);assert.equal(opData.faturas[0].clienteId,"1");assert.deepEqual(opData.faturas[0].contratosIds,["1"]);
  await navigate("LOCADORA_FINANCEIRO.HTML");
  assert.equal(await evaluate('lerDados("faturas").length'),1);
  assert.equal(await evaluate('localStorage.getItem("faturas")'),null);
  await navigate("LOCADORA_CONFIGURACOES.HTML");
  await evaluate('(async()=>{document.getElementById("empresaNome").value="Empresa integrada";await salvarEmpresa();})()');
  assert.equal(opData.configuracoesEmpresa.nome,"Empresa integrada");
  await navigate("LOCADORA_CONFIGURACOES.HTML");
  assert.equal(await evaluate('document.getElementById("empresaNome").value'),"Empresa integrada");
  await navigate("LOCADORA_MULTAS.HTML");
  await evaluate('(async()=>{abrirFormulario();const set=(id,v)=>document.getElementById(id).value=v;set("placa","ABC1D23");set("autoInfracao","AIT-TESTE");set("data","2026-09-29");set("valor","50,00");set("contrato","1");await salvarMulta();})()');
  assert.equal(opData.multas.length,1);assert.equal(opData.multas[0].veiculoId,"1");assert.equal(opData.multas[0].contratoId,"1");
  await navigate("LOCADORA_MULTAS.HTML");
  assert.equal(await evaluate('multas.length'),1);
  assert.equal(await evaluate('localStorage.getItem("multas")'),null);
  console.log("OK integração: gravação, edição, recarga, vínculos e conflito preservando formulário.");

  await navigate('LOCADORA_FINANCEIRO.HTML');
  assert.equal(opData.faturas[0].numero,'3000');
  const dialogsBefore=dialogs.length;
  await evaluate('registrarPagamentoFatura('+JSON.stringify(opData.faturas[0].id)+')');
  assert.equal(dialogs.length,dialogsBefore,'pagamento sem prompt');
  assert.equal(await evaluate('document.getElementById("formularioFatura").classList.contains("mostrar")'),true);
  assert.equal(await evaluate('document.getElementById("dataPagamentoFatura").type'),'date');
  await evaluate('(async()=>{document.getElementById("dataPagamentoFatura").value="2026-10-02";await salvarFatura();})()');
  assert.equal(opData.faturas[0].dataPagamento,'2026-10-02');
  await evaluate('(()=>{const form=document.getElementById("filtrosFaturas");form.elements.busca.value="nao-existe";form.requestSubmit();})()');
  assert.equal(await evaluate('document.querySelectorAll("#tabelaFaturas tr").length'),0);
  await evaluate('document.getElementById("filtrosFaturas").reset()');
  assert.equal(await evaluate('document.querySelectorAll("#tabelaFaturas tr").length'),1);
  await evaluate('(()=>{const form=document.getElementById("filtrosFaturas");form.elements.dataCampo.value="dataPagamento";form.elements.dataCampo.dispatchEvent(new Event("change"));form.elements.inicio.value="2026-10-02";form.elements.fim.value="2026-10-02";form.requestSubmit();})()');
  assert.equal(await evaluate('document.querySelectorAll("#tabelaFaturas tr").length'),1);
  await evaluate('(()=>{const form=document.getElementById("filtrosFaturas");form.elements.inicio.value="2026-10-03";form.requestSubmit();})()');
  assert.equal(await evaluate('document.getElementById("erroFiltrosFaturas").textContent.length>0'),true);
  console.log("OK filtros de faturas: busca, limpeza, periodo e validacao.");
  await evaluate('window.resultadoConfirmacao="pendente";void confirmarOperacaoFatura("Alterar fatura paga").then(r=>window.resultadoConfirmacao=r);');
  assert.equal(await evaluate('document.getElementById("confirmacaoFatura").open'),true);
  assert.equal(await evaluate('document.getElementById("senhaOperacaoFatura").type'),"password");
  await evaluate('document.getElementById("senhaOperacaoFatura").value="teste";document.getElementById("motivoOperacaoFatura").value="Correção justificada de teste";document.querySelector("#confirmacaoFatura form").requestSubmit()');
  assert.equal(await evaluate('window.resultadoConfirmacao.justificativa'),"Correção justificada de teste");
  assert.equal(await evaluate('document.getElementById("senhaOperacaoFatura").value'),"");
  await evaluate('window.resultadoConfirmacao="pendente";confirmarOperacaoFatura("Excluir fatura").then(r=>window.resultadoConfirmacao=r);document.getElementById("cancelarOperacaoFatura").click()');
  assert.equal(await evaluate('window.resultadoConfirmacao'),null);
  await evaluate('document.getElementById("buscarHistoricoFaturas").requestSubmit()');
  await new Promise(r=>setTimeout(r,200));
  assert.equal(await evaluate('document.getElementById("estadoHistoricoFaturas").textContent'),"Nenhum registro encontrado.");
  console.log("OK confirmação com senha, justificativa, cancelamento e consulta de histórico.");


  await navigate('LOCADORA_CONTRATOS.HTML');
  await evaluate('(async()=>{abrirFicha(0);await gerarPdfContrato();})()');
  assert.equal(await evaluate('document.getElementById("revisaoContrato").open'),true);
  assert.equal(await evaluate('document.getElementById("docTexto").value.includes("Cliente teste")'),true);
  assert.equal(await evaluate('document.getElementById("docTexto").value.includes("ABC1D23")'),true);
  await evaluate('(async()=>{document.querySelector("#docChecklists input").checked=true;document.getElementById("docTexto").value+=String.fromCharCode(10)+"Condicao personalizada de teste.";await document.getElementById("docSalvar").onclick();document.getElementById("docFechar").click();await gerarPdfContrato();})()');
  assert.equal(await evaluate('document.getElementById("docTexto").value.includes("Condicao personalizada de teste.")'),true);
  assert.equal(await evaluate('document.querySelector("#docChecklists input").checked'),true);
  await evaluate('document.getElementById("docVisualizar").click()');
  assert.equal(await evaluate('document.getElementById("docPrevia").textContent.includes("CHECKLISTS VINCULADOS")'),true);
  console.log('OK pagamento na fatura e revisão editável de contrato com checklist.');


  await navigate("LOCADORA_FINANCEIRO.HTML");
  await evaluate('abrirFormularioFatura()');
  await evaluate('document.querySelector("[data-escolha-para=clienteFatura]").querySelector("button").click()');
  assert.equal(await evaluate('document.querySelector("[data-escolha-para=clienteFatura]").querySelector(".escolha-painel").matches(":popover-open")'),true);
  await evaluate('(()=>{const w=document.querySelector("[data-escolha-para=clienteFatura]"),input=w.querySelector("input");input.value="teste";input.dispatchEvent(new Event("input"));w.querySelector(".escolha-opcao").click();})()');
  assert.equal(await evaluate('document.getElementById("clienteFatura").value'),"1");
  assert.equal(await evaluate('document.querySelector("[data-escolha-para=clienteFatura]").querySelector(".escolha-painel").hidden'),true);
  await evaluate('document.querySelector("[data-escolha-para=contratoFatura]").querySelector("button").click()');
  await evaluate('(()=>{const w=document.querySelector("[data-escolha-para=contratoFatura]"),input=w.querySelector("input");input.value="CT";input.dispatchEvent(new Event("input"));w.querySelector(".escolha-opcao").click();})()');
  assert.equal(await evaluate('Array.from(document.getElementById("contratoFatura").selectedOptions).some(o=>o.value==="1")'),true);
  assert.equal(await evaluate('document.querySelector("[data-escolha-para=contratoFatura]").querySelector(".escolha-painel").hidden'),false);
  await evaluate('document.querySelector("[data-escolha-para=contratoFatura]").querySelector("input").dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
  console.log("OK seletores pesquisaveis: cliente, contrato multiplo e fechamento.");

  await navigate("LOCADORA_FINANCEIRO.HTML");
  await evaluate('abrirFormularioFatura()');
  const monetaryDialogs=dialogs.length;
  await evaluate('document.getElementById("valorBaseFatura").focus()');
  for(const digit of "5000")await send("Input.insertText",{text:digit});
  assert.equal(await evaluate('Valores.numero(document.getElementById("valorBaseFatura").value)'),50);
  assert.equal(await evaluate('Valores.numero(document.getElementById("valorFatura").value)'),50);
  assert.equal(dialogs.length,monetaryDialogs,"digitar reais sem alerta prematuro");
  await evaluate('document.getElementById("valorBaseFatura").select()');
  for(const digit of "123456")await send("Input.insertText",{text:digit});
  assert.equal(await evaluate('Valores.numero(document.getElementById("valorFatura").value)'),1234.56);
  await evaluate('adicionarItemVeiculoFatura();document.querySelector(".valor-veiculo-item").focus()');
  for(const digit of "5050")await send("Input.insertText",{text:digit});
  assert.equal(await evaluate('Valores.numero(document.getElementById("valorFatura").value)'),1285.06);
  assert.equal(dialogs.length,monetaryDialogs);
  console.log("OK digitacao real: mascara monetaria antes do calculo, substituicao e soma de itens.");
  assert.deepEqual(issues,[]);


  console.log("OK: "+pages.length+" páginas, formulários, CSP, higienização e uploads testados em Chrome.");
 }finally{
  if(socket)socket.close();
  if(chrome){chrome.kill();await new Promise(r=>setTimeout(r,300));}
  if(server)await new Promise(r=>server.close(r));await pool.end();
  const resolved=path.resolve(profile),temp=path.resolve(os.tmpdir())+path.sep;
  if(resolved.startsWith(temp)&&path.basename(resolved).startsWith("locadora-security-"))try{fs.rmSync(resolved,{recursive:true,force:true});}catch{/* Chrome pode demorar a liberar o perfil temporário. */}
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
