
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
  await send('Page.navigate',{url:'https://www.documentos.spsempapel.sp.gov.br/siga/public/app/login'});
  await new Promise(resolve=>setTimeout(resolve,6000));
  console.log((await evaluate('document.body.innerText')).slice(0,3000));
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.join(__dirname,'referencia-sempapel.png'),Buffer.from(shot.data,'base64'));
  await send('Browser.close');
 }finally{if(browserSocket)browserSocket.close();chrome.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
