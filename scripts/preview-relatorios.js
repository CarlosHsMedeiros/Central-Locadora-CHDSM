
const fs=require('fs'),path=require('path'),os=require('os'),{spawn}=require('child_process');
(async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'locadora-relatorios-'));
 const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true});
 let browserSocket;
 try{
  const endpoint=await new Promise((resolve,reject)=>{let output='';const timeout=setTimeout(()=>reject(Error('Chrome não iniciou')),20000);chrome.stderr.on('data',data=>{output+=data;const m=output.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m){clearTimeout(timeout);resolve(m[1]);}});chrome.on('error',reject);});
  const origin=endpoint.replace('ws:','http:').split('/devtools')[0];
  const target=await(await fetch(origin+'/json/new?about:blank',{method:'PUT'})).json();
  const socket=new WebSocket(target.webSocketDebuggerUrl);browserSocket=socket;await new Promise(resolve=>socket.onopen=resolve);
  let failReports=false;let seq=0;const pending=new Map(),errors=[];
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const vehicles=[{id:'1',placa:'ABC1D23',marca:'Fiat',modelo:'Argo',ano:2023,situacao:'Disponível',anoLicenciamento:2025,ufRegistro:'SP',grupoLicenciamento:'geral'},{id:'2',placa:'DEF4G56',marca:'VW',modelo:'Polo',ano:2024,situacao:'Alugado',anoLicenciamento:2026,ufRegistro:'SP',grupoLicenciamento:'geral'},{id:'3',placa:'GHI7J89',marca:'Ford',modelo:'Ka',ano:2021,situacao:'Disponível',anoLicenciamento:null,ufRegistro:null,grupoLicenciamento:null}];
  socket.onmessage=async ev=>{const msg=JSON.parse(ev.data);if(msg.id){const p=pending.get(msg.id);if(p){pending.delete(msg.id);msg.error?p.reject(Error(msg.error.message)):p.resolve(msg.result);}return;}
   if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.text+': '+(msg.params.exceptionDetails.exception?.description||''));
   if(msg.method==='Fetch.requestPaused'){
    const p=msg.params,u=new URL(p.request.url);let body;
    if(u.pathname==='/api/health')body={database:'connected',status:'ok'};
    else if(u.pathname==='/api/auth/me')body={data:{user:{id:'1',nome:'Administrador',perfil:'administrador'}}};
    else if(u.pathname==='/api/veiculos')body={data:vehicles,pagination:{pages:1,total:vehicles.length}};
    else if(u.pathname==='/api/relatorios/veiculos'&&failReports)body={error:{message:'Falha simulada na consulta'}};
    else if(u.pathname==='/api/relatorios/veiculos')body={data:vehicles.map(v=>({...v,modelo:v.marca+' '+v.modelo,veiculoId:v.id,anoFabricacao:v.ano,statusVeiculo:v.situacao})),pagination:{page:1,pages:1,total:3}};
    else body={data:[],pagination:{page:1,pages:1,total:0}};
    await send('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:failReports&&u.pathname==='/api/relatorios/veiculos'?503:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(body)).toString('base64')});
   }
  };
  await send('Runtime.enable');await send('Page.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*/api/*',requestStage:'Request'}]});
  await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
  await send('Page.navigate',{url:'http://127.0.0.1:3000/LOCADORA_RELATORIOS.HTML'});
  for(let i=0;i<60;i++){await new Promise(r=>setTimeout(r,150));if(await evaluate("document.readyState==='complete'&&!!document.getElementById('gerarConsulta')&&!document.getElementById('gerarConsulta').disabled"))break;}
  await evaluate("document.querySelector('[data-tipo=licenciamento]').click()");
  let state=await evaluate("({license:!document.getElementById('filtrosLicenciamento').hidden,dateHidden:document.getElementById('dataInicial').closest('.campo').hidden,clientHidden:document.getElementById('filtroCliente').closest('.campo').hidden})");
  if(!state.license||!state.dateHidden||!state.clientHidden)throw Error('Filtros contextuais inválidos '+JSON.stringify(state)+' '+errors.join(';'));
  await evaluate("document.getElementById('gerarConsulta').click()");
  for(let i=0;i<60;i++){await new Promise(r=>setTimeout(r,100));if(await evaluate("!document.getElementById('imprimirResultados').disabled"))break;}
  await evaluate("window.scrollTo(0,0)");await new Promise(r=>setTimeout(r,400));
  const screen=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.join(__dirname,'relatorios-desktop.png'),Buffer.from(screen.data,'base64'));
  state=await evaluate("({rows:document.querySelectorAll('#tabelaLicenciamento tr').length,overflow:document.documentElement.scrollWidth>innerWidth,sections:[...document.querySelectorAll('.secao-relatorio')].filter(s=>getComputedStyle(s).display!=='none').map(s=>s.dataset.relatorio)})");
  if(state.rows!==3||state.overflow||state.sections.length!==1)throw Error('Resultado inválido '+JSON.stringify(state));
  await evaluate("document.getElementById('situacaoLicenciamento').value='vencido';document.getElementById('situacaoLicenciamento').dispatchEvent(new Event('change'));document.getElementById('gerarConsulta').click()");await new Promise(r=>setTimeout(r,300));
  if(await evaluate("document.querySelectorAll('#tabelaLicenciamento tr').length")!==1)throw Error('Filtro de vencidos inválido');
  await evaluate("document.querySelector('[data-tipo=personalizado]').click();document.querySelector('.item-relatorio[value=veiculos]').click();document.querySelector('.item-relatorio[value=licenciamento]').click();document.getElementById('gerarConsulta').click()");await new Promise(r=>setTimeout(r,400));
  const visible=await evaluate("[...document.querySelectorAll('.secao-relatorio')].filter(s=>getComputedStyle(s).display!=='none').length");if(visible!==2)throw Error('Personalizado: esperado 2, recebido '+visible);
  await send('Emulation.setEmulatedMedia',{media:'print'});
  const printState=await evaluate("({catalog:getComputedStyle(document.querySelector('.catalogo-relatorios')).display,filters:getComputedStyle(document.querySelector('.painel-filtros')).display,visible:[...document.querySelectorAll('.secao-relatorio')].filter(s=>getComputedStyle(s).display!=='none').length})");
  if(printState.catalog!=='none'||printState.filters!=='none'||printState.visible!==2)throw Error('Impressão incorreta '+JSON.stringify(printState));
  const pdf=await send('Page.printToPDF',{printBackground:true,preferCSSPageSize:true});fs.writeFileSync(path.join(__dirname,'relatorios-preview.pdf'),Buffer.from(pdf.data,'base64'));
  await send('Emulation.setEmulatedMedia',{media:''});
  for(const category of ['frota','veiculos','contratos','multas','manutencoes','financeiro','faturas']){
    await evaluate("document.querySelector('[data-tipo="+category+"]').click();document.getElementById('gerarConsulta').click()");await new Promise(r=>setTimeout(r,180));
    if(await evaluate("getComputedStyle(document.getElementById('filtrosLicenciamento')).display!=='none'"))throw Error('Filtro indevido em '+category);
    if(await evaluate("document.getElementById('tituloResultado').hidden"))throw Error('Categoria sem resultado: '+category);
  }
  failReports=true;
  await evaluate("document.querySelector('[data-tipo=veiculos]').click();document.getElementById('gerarConsulta').click()");await new Promise(r=>setTimeout(r,300));
  if(!await evaluate("document.getElementById('mensagemConsulta').classList.contains('erro')&&document.getElementById('imprimirResultados').disabled"))throw Error('Falha da API não apresentada');
  failReports=false;
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate("document.querySelector('[data-tipo=licenciamento]').click();window.scrollTo(0,0)");await new Promise(r=>setTimeout(r,300));
  const mobile=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.join(__dirname,'relatorios-mobile.png'),Buffer.from(mobile.data,'base64'));
  if(await evaluate('document.documentElement.scrollWidth>innerWidth'))throw Error('Overflow no celular');
  if(errors.length)throw Error(errors.join('\n'));
  console.log('Navegador OK: filtros contextuais, licenciamento, vencidos, personalizado e largura mobile. Capturas em scripts/relatorios-*.png.');
  await send('Browser.close');
 }finally{if(browserSocket)browserSocket.close();chrome.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
