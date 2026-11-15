const express=require('express'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const app=express(),root=path.resolve(__dirname,'..');app.use(express.json());let uploads=0,emissions=0;
const config={ambiente:'2',cnpj:'11222333000181',municipio:'3556305',municipioPrestacao:'3556305',opSimpNac:'3',regApTribSN:'1',codigoTributacao:'150307',nbs:'111011100',serie:'900',numeroInicial:'1',regEspTrib:'0',tribISSQN:'4',retencao:'1',totalTributos:'simples',percentualSN:'6',ibsCbs:'naoAplicavel'};
const cliente={id:'2',nome:'CLIENTE FICTICIO PARA TESTE',documento:'52998224725',cidade:'Valparaiso',estado:'SP'};
const fatura={id:'1',_dbId:'1',numero:'3004',tipo:'Outro',natureza:'Receita',clienteId:'2',descricao:'Teste local de interface',valor:1000,valorBase:1000,vencimento:'2026-10-20',itensVeiculos:[],contratosIds:[]};
app.use('/api',(req,res)=>{
 let value={data:[],pagination:{pages:1}};
 if(req.path==='/auth/me')value={data:{user:{id:'1',perfil:'administrador',nome:'Administrador de teste'}}};
 else if(req.path==='/operacao')value={data:{faturas:[fatura],multas:[],manutencoes:[],checklistsVeiculos:[],configuracoesEmpresa:{nome:'Empresa teste',cnpj:config.cnpj},camposFotoChecklist:[],historicoRelatoriosEmitidos:[]},versions:{faturas:'v1'}};
 else if(req.path==='/clientes'||req.path==='/clientes/opcoes')value={data:[cliente],pagination:{pages:1}};
 else if(req.path==='/nfse/atualizacoes')value={data:{mensagem:'Referencias conferidas no teste.',verificadoEm:new Date().toISOString()}};
 else if(req.path==='/nfse/configuracoes')value={data:{config,certificado:null,pendencias:[]}};
 else if(req.path==='/nfse/certificado'){uploads++;value={data:{certificado:{cnpj:config.cnpj,validade:'2027-10-15T00:00:00Z'}}};}
 else if(req.path==='/nfse/faturas/1')value={data:null};
 else if(req.path.endsWith('/emitir')){emissions++;value={data:{status:'autorizada',ambiente:'2',numeroNfse:'136',chave:'1'.repeat(50),portalUrl:'https://www.producaorestrita.nfse.gov.br/ConsultaPublica/?chave='+'1'.repeat(50),xmlDisponivel:true,mensagem:'NFS-e autorizada.'}};}
 else if(req.path.endsWith('/danfse'))return res.status(503).json({error:{message:'PDF oficial indisponivel; nota autorizada preservada.'}});
 else if(req.path.endsWith('/prever'))value={data:{versao:'teste',config,fatura,cliente:{...cliente,endereco:'Rua Teste, 1'},competencia:'2026-10-15',tomadorMunicipio:'3556305',nota:null}};
 else if(req.path.endsWith('/historico'))value={data:[],total:0,pagina:1};
 else if(req.path==='/health')value={status:'ok',database:{status:'up'}};
 res.json(value);
});
app.get('/DOMPURIFY.js',(req,res)=>res.sendFile(require.resolve('dompurify/dist/purify.min.js')));app.use(express.static(root));
(async()=>{let server,browser;const errors=[];try{
 await new Promise(resolve=>{server=app.listen(0,'127.0.0.1',resolve);});const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true});const page=await browser.newPage({viewport:{width:1366,height:900}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/LOCADORA_FINANCEIRO.HTML');await page.waitForFunction(()=>window.Banco?.pronto);await page.locator('[data-nfse-id="1"]').click();assert.equal(await page.locator('.nfse-dialog').isVisible(),true);await page.getByRole('button',{name:'Revisar dados',exact:true}).click();await page.getByText('Ambiente: HOMOLOGA\u00c7\u00c3O - sem validade fiscal',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Confirmar emiss\u00e3o da NFS-e'}).isEnabled(),true);await page.getByRole('button',{name:'Confirmar emiss\u00e3o da NFS-e'}).click();await page.getByRole('link',{name:'Consultar no portal nacional'}).waitFor();assert.equal(await page.getByRole('button',{name:'Confirmar emiss\u00e3o da NFS-e'}).isEnabled(),false);assert.match(await page.getByRole('link',{name:'Consultar no portal nacional'}).getAttribute('href'),/^https:\/\/www\.producaorestrita\.nfse\.gov\.br\//);await page.getByRole('button',{name:'Baixar PDF da NFS-e',exact:true}).click();await page.getByText('PDF oficial indisponivel; nota autorizada preservada.',{exact:true}).waitFor();assert.equal(emissions,1);await page.getByRole('button',{name:'Fechar',exact:true}).click();
 await page.goto(base+'/LOCADORA_CONFIGURACOES.HTML');await page.waitForFunction(()=>window.Banco?.pronto);await page.locator('button[data-categoria="nfse"]').click();await page.locator('#nfse-cnpj').waitFor({state:'visible'});assert.equal(await page.locator('#nfse-nbs').inputValue(),'111011100');assert.equal(await page.locator('#nfseCertificado').getAttribute('accept'),'.pfx,.p12');
 await page.locator('#nfse-senhaCertificado').fill('senha-teste');await page.locator('#nfseCertificado').setInputFiles({name:'teste.pfx',mimeType:'application/x-pkcs12',buffer:Buffer.from('fixture exclusiva do teste de interface')});await page.getByRole('button',{name:'Validar e guardar certificado'}).click();await page.getByText('Certificado validado e protegido no servidor.',{exact:true}).waitFor();assert.equal(await page.locator('#nfse-senhaCertificado').inputValue(),'');assert.equal(uploads,1);assert.deepEqual(errors,[]);console.log('UI OK: botao NFS-e, revisao, categoria fiscal, upload A1 e limpeza da senha. Nenhuma transmissao externa.');
 }finally{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}})().catch(e=>{console.error(e.message);process.exitCode=1;});
