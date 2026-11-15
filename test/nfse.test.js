const certificatePassword=require("node:crypto").randomBytes(24).toString("hex"),encryptionSecret=require("node:crypto").randomBytes(24).toString("hex");
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),forge=require('node-forge'),{SignedXml}=require('xml-crypto'),{DOMParser}=require('@xmldom/xmldom');
const certificate=require('../src/services/nfseCertificate'),xml=require('../src/services/nfseXml'),transport=require('../src/services/nfseTransport'),service=require('../src/services/nfseService'),pool=require('../src/config/database');
const config={...service.defaults,cnpj:'11222333000181',serie:'900',regEspTrib:'0',tribISSQN:'4',retencao:'1',totalTributos:'simples',percentualSN:'6.00',ibsCbs:'naoAplicavel'};
const fatura={id:'1',numero:'3004',clienteId:'2',tipo:'Outro',natureza:'Receita',descricao:'Locacao <teste> & veiculo',valor:'1000.50',status:'Pendente'};
const cliente={id:'2',nome:'Cliente & teste',documento:'52998224725',cep:'16880000',endereco:'Rua Teste',numero:'10',bairro:'Centro',cidade:'Valparaiso',estado:'SP',email:'teste@example.com'};
const input={config,fatura,cliente,numero:'1',competencia:'2026-10-15',tomadorMunicipio:'3556305'};
let material,pfx;
test.before(()=>{
 const keys=forge.pki.rsa.generateKeyPair(2048),c=forge.pki.createCertificate();c.publicKey=keys.publicKey;c.serialNumber='01';c.validity.notBefore=new Date(Date.now()-86400000);c.validity.notAfter=new Date(Date.now()+86400000*10);c.setSubject([{name:'commonName',value:'Teste local'}]);c.setIssuer(c.subject.attributes);
 const a=forge.asn1;const san=a.create(a.Class.UNIVERSAL,a.Type.SEQUENCE,true,[a.create(a.Class.CONTEXT_SPECIFIC,0,true,[a.create(a.Class.UNIVERSAL,a.Type.OID,false,a.oidToDer('2.16.76.1.3.3').getBytes()),a.create(a.Class.CONTEXT_SPECIFIC,0,true,[a.create(a.Class.UNIVERSAL,a.Type.UTF8,false,config.cnpj)])])]);
 c.setExtensions([{name:'basicConstraints',cA:false},{id:'2.5.29.17',value:a.toDer(san).getBytes()}]);c.sign(keys.privateKey,forge.md.sha256.create());
 pfx=Buffer.from(a.toDer(forge.pkcs12.toPkcs12Asn1(keys.privateKey,[c],certificatePassword,{algorithm:'3des'})).getBytes(),'binary').toString('base64');
 material={privateKey:forge.pki.privateKeyToPem(keys.privateKey),cert:forge.pki.certificateToPem(c)};material.chain=material.cert;
});
test('A1 valida senha, chave privada e CNPJ',()=>{const parsed=certificate.parse(pfx,certificatePassword,config.cnpj);assert.equal(parsed.metadata.cnpj,config.cnpj);assert.throws(()=>certificate.parse(pfx,'errada',config.cnpj));assert.throws(()=>certificate.parse(pfx,certificatePassword,'12345678000199'));});
test('certificado criptografado nao revela chave ou senha e detecta alteracao',()=>{const old=process.env.NFSE_ENCRYPTION_KEY;process.env.NFSE_ENCRYPTION_KEY=crypto.randomBytes(32).toString('hex');try{const value=certificate.encrypt({senha:encryptionSecret,conteudo:pfx});assert.ok(!JSON.stringify(value).includes(encryptionSecret));assert.deepEqual(certificate.decrypt(value),{senha:encryptionSecret,conteudo:pfx});value.tag=Buffer.alloc(16).toString('base64');assert.throws(()=>certificate.decrypt(value));}finally{if(old)process.env.NFSE_ENCRYPTION_KEY=old;else delete process.env.NFSE_ENCRYPTION_KEY;}});
test('DPS assinada valida contra o XSD oficial e assinatura criptografica',async()=>{const built=xml.build(input),signed=xml.sign(built.xml,material);assert.equal(built.id,'DPS355630521122233300018100900000000000000001');assert.ok(signed.includes('<cTribNac>150307</cTribNac>'));assert.ok(signed.includes('<cNBS>111011100</cNBS>'));assert.ok(signed.includes('&lt;teste&gt; &amp;'));await xml.validate(signed);const doc=new DOMParser().parseFromString(signed,'text/xml'),verifier=new SignedXml({publicCert:material.cert});verifier.loadSignature(doc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#','Signature')[0]);assert.equal(verifier.checkSignature(signed),true);assert.equal(verifier.checkSignature(signed.replace('1000.50','1000.51')),false);});
test('XSD rejeita campo fiscal malformado',async()=>{await assert.rejects(xml.validate(xml.build({...input,config:{...config,nbs:'123'}}).xml));});
test('configuracao usa dados informados e exige completar tributacao',()=>{assert.equal(service.defaults.municipio,'3556305');assert.equal(service.defaults.opSimpNac,'3');assert.ok(service.pendingConfig(service.defaults).includes('tribISSQN'));assert.equal(service.normalizeConfig(config).codigoTributacao,'150307');assert.throws(()=>service.normalizeConfig({...config,ambiente:'https://outro'}));assert.throws(()=>service.normalizeConfig({...config,tribISSQN:'4',aliquota:'5'}));});
test('resposta fiscal deve corresponder a DPS e chave solicitadas',()=>{const built=xml.build(input),chave='1'.repeat(50),nfse=`<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse"><infNFSe Id="NFS${chave}">${built.xml}</infNFSe></NFSe>`;const result={chaveAcesso:chave,nfseXmlGZipB64:transport.pack(nfse)};assert.equal(service.verifiedResponse(result,{idDps:built.id}).chave,chave);assert.throws(()=>service.verifiedResponse(result,{idDps:'outra'}));assert.throws(()=>service.verifiedResponse({...result,chaveAcesso:'2'.repeat(50)},{idDps:built.id}));});
function mock(t){t.mock.method(require('../src/services/nfseEvents'),'cancellation',async()=>null);t.mock.method(require('../src/repositories/faturaNaturezaRepository'),'hasColumn',async()=>true);t.mock.method(require('../src/repositories/faturaNaturezaRepository'),'enrich',async rows=>rows);const store=new Map([['nfse:config',config],['nfse:certificado',{metadata:{cnpj:config.cnpj},protected:{}}]]);let transmitted=0,locked=false;const execute=async(sql,args=[])=>{
 if(sql.includes('GET_LOCK')){if(locked)return [[{adquirido:0}]];locked=true;return [[{adquirido:1}]];}
 if(sql.includes('RELEASE_LOCK')){locked=false;return [[{}]];}
 if(sql.startsWith('SELECT id,numero'))return [[{...fatura}]];
 if(sql.startsWith('SELECT id FROM faturas'))return [[{id:'1'}]];
 if(sql.startsWith('SELECT valor FROM configuracoes'))return [store.has(args[0])?[{valor:store.get(args[0])}]:[]];
 if(sql.startsWith('INSERT IGNORE')){if(!store.has(args[0]))store.set(args[0],JSON.parse(args[1]));return [{}];}
 if(sql.startsWith('INSERT INTO configuracoes')){store.set(args[0],JSON.parse(args[1]));return [{}];}
 if(sql.startsWith('SELECT id FROM configuracoes'))return [[{id:'1'}]];
 throw Error('SQL inesperado: '+sql);
 };const c={execute,beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{}};
 t.mock.method(pool,'execute',execute);t.mock.method(pool,'getConnection',async()=>c);t.mock.method(require('../src/repositories/clienteRepository'),'findById',async()=>cliente);t.mock.method(certificate,'decrypt',()=>({}));t.mock.method(certificate,'parse',()=>({...material,metadata:{cnpj:config.cnpj}}));
 t.mock.method(transport,'request',async()=>{transmitted++;throw Error('TIMEOUT');});return {store,count:()=>transmitted};
}
test('timeout preserva DPS e clique repetido nao reenvia nem gera outro numero',async t=>{const m=mock(t),body={competencia:'2026-10-15',tomadorMunicipio:'3556305'},user={id:'1'};const preview=await service.preview('1',body);await assert.rejects(service.emit('1',{...body,versao:preview.versao},user));assert.equal(m.count(),0);const result=await service.emit('1',{...body,versao:preview.versao,confirmar:true},user);assert.equal(result.status,'pendente');assert.equal(m.count(),1);await service.emit('1',{...body,versao:preview.versao,confirmar:true},user);assert.equal(m.count(),1);assert.equal(m.store.get('nfse:seq:2:11222333000181:900').proximo,'2');});
test('revisao desatualizada impede transmissao',async t=>{const m=mock(t);await assert.rejects(service.emit('1',{competencia:'2026-10-15',tomadorMunicipio:'3556305',versao:'antiga',confirmar:true},{id:'1'}),{code:'NFSE_STALE'});assert.equal(m.count(),0);});

test('padrao XML informado preserva totais SN e PIS COFINS sem retencao',async()=>{const built=xml.build({...input,config:{...config,tribISSQN:'1',pisCofins:'naoRetidos00',percentualSN:'11.60'}});assert.ok(built.xml.includes('<pTotTribSN>11.60</pTotTribSN>'));assert.ok(built.xml.includes('<CST>00</CST><tpRetPisCofins>0</tpRetPisCofins>'));assert.ok(!built.xml.includes('<pAliq>'));assert.ok(!built.xml.includes('<IBSCBS>'));await xml.validate(xml.sign(built.xml,material));assert.throws(()=>service.normalizeConfig({...config,pisCofins:'invalido'}));});

test('autorizacao nacional permite consulta, XML, PDF e nao duplica emissao',async t=>{
 const m=mock(t);let sends=0;
 t.mock.method(transport,'request',async(c,cert,method,route,body)=>{assert.equal(method,'POST');sends++;const dps=transport.unpack(body.dpsXmlGZipB64).replace(/^<\?xml[^?]*\?>/,''),key='1'.repeat(50);return {status:201,data:{chaveAcesso:key,nfseXmlGZipB64:transport.pack('<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse"><infNFSe Id="NFS'+key+'"><nNFSe>136</nNFSe>'+dps+'</infNFSe></NFSe>')}};});
 const body={competencia:'2026-10-15',tomadorMunicipio:'3556305'},user={id:'1'},p=await service.preview('1',body);
 const result=await service.emit('1',{...body,versao:p.versao,confirmar:true},user);
 assert.equal(result.status,'autorizada');assert.equal(result.numeroNfse,'136');assert.match(result.portalUrl,/www\.producaorestrita\.nfse\.gov\.br\/ConsultaPublica/);assert.equal(result.xmlDisponivel,true);
 await service.emit('1',{...body,versao:p.versao,confirmar:true},user);assert.equal(sends,1);assert.equal((await service.consult('1',user)).chave,result.chave);assert.match((await service.download('1')).xml,/<nNFSe>136<\/nNFSe>/);
 t.mock.method(transport,'pdf',async()=>({status:503,data:Buffer.from('indisponivel')}));const fallback=await service.downloadPdf('1',user);assert.equal(fallback.local,true);assert.equal(fallback.pdf.subarray(0,5).toString(),'%PDF-');assert.equal((await service.status('1')).status,'autorizada');assert.equal(sends,1);
 t.mock.method(transport,'pdf',async()=>({status:200,data:Buffer.from('%PDF-1.7 fixture')}));assert.equal((await service.downloadPdf('1',user)).pdf.subarray(0,5).toString(),'%PDF-');
 assert.equal(service.portalUrl('1',result.chave),'https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave='+result.chave);assert.equal(service.portalUrl('1','chave-invalida'),'');
});

test('XML enviado declara UTF-8 e preserva acentos, assinatura e XSD apos gzip',async()=>{
 const descricao='Loca\u00e7\u00e3o de ve\u00edculo em Valpara\u00edso - Jo\u00e3o';
 const signed=xml.sign(xml.build({...input,fatura:{...fatura,descricao}}).xml,material);
 assert.ok(signed.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
 const restored=transport.unpack(transport.pack(signed));assert.equal(restored,signed);assert.ok(restored.includes(descricao));
 await xml.validate(restored);
 const doc=new DOMParser().parseFromString(restored,'text/xml'),verifier=new SignedXml({publicCert:material.cert});verifier.loadSignature(doc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#','Signature')[0]);assert.equal(verifier.checkSignature(restored),true);
});
test('nova tentativa apos rejeicao regenera UTF-8 mantendo numero DPS',async t=>{
 const m=mock(t),body={competencia:'2026-10-15',tomadorMunicipio:'3556305'},user={id:'1'};
 t.mock.method(transport,'request',async()=>({status:400,data:{erros:[{Codigo:'E1229',Descricao:'Xml nao esta utilizando codificacao UTF-8.'}]}}));
 let p=await service.preview('1',body);await service.emit('1',{...body,versao:p.versao,confirmar:true},user);
 const prior=m.store.get('nfse:fatura:2:1');assert.equal(prior.status,'rejeitada');prior.xml=prior.xml.replace(/^<\?xml[^?]*\?>/,'');
 t.mock.method(transport,'request',async(c,cert,method,route,payload)=>{const sent=transport.unpack(payload.dpsXmlGZipB64);assert.ok(sent.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));assert.ok(sent.includes('Id="'+prior.idDps+'"'));return {status:400,data:{erros:[{Codigo:'TEST',Descricao:'Rejeicao simulada'}]}};});
 p=await service.preview('1',body);await service.emit('1',{...body,versao:p.versao,confirmar:true},user);assert.equal(m.store.get('nfse:fatura:2:1').numero,prior.numero);assert.equal(m.store.get('nfse:seq:2:11222333000181:900').proximo,'2');
});

test('dhEmi usa Sao Paulo sem mudar instante, inclusive na virada do dia',()=>{
 for(const [utc,expected] of [['2026-10-16T17:51:06Z','2026-10-16T14:51:06-03:00'],['2026-10-16T01:30:00Z','2026-10-15T22:30:00-03:00'],['2026-10-16T03:00:00Z','2026-10-16T00:00:00-03:00']]){const actual=xml.emissionTime(new Date(utc));assert.equal(actual,expected);assert.equal(Date.parse(actual),Date.parse(utc));}
 const built=xml.build(input).xml;assert.match(built,/<dhEmi>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00<\/dhEmi>/);assert.ok(built.includes('<dCompet>2026-10-15</dCompet>'));
});

test('cancelamento externo e persistido e preserva XML e bloqueio de reemissao',async t=>{
 const m=mock(t),key='1'.repeat(50),built=xml.build(input);m.store.set('nfse:fatura:2:1',{status:'autorizada',chave:key,idDps:built.id,numeroNfse:'136',config,nfseXml:'<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse">'+built.xml+'</NFSe>'});
 const event={tipo:101101,data:'2026-10-16T14:55:05-03:00',motivo:'Teste',xml:'<evento/>'};t.mock.method(require('../src/services/nfseEvents'),'cancellation',async()=>event);
 const user={id:'1'},s=await service.consult('1',user);assert.equal(s.status,'cancelada');assert.equal(s.cancelamentoDisponivel,true);assert.equal((await service.downloadCancellation('1')).xml,event.xml);assert.ok((await service.download('1')).xml);
 const pdf=await service.downloadPdf('1',user);assert.equal(pdf.local,true);assert.equal(pdf.pdf.subarray(0,5).toString(),'%PDF-');
 const body={competencia:'2026-10-15',tomadorMunicipio:'3556305'},p=await service.preview('1',body);assert.equal((await service.emit('1',{...body,versao:p.versao,confirmar:true},user)).status,'cancelada');assert.equal(m.count(),0);
});
test('eventos exigem chave e cancelamento efetivo; suporta arquivoXml duplamente codificado',()=>{
 const events=require('../src/services/nfseEvents'),key='1'.repeat(50),xmlEvent='<evento xmlns="http://www.sped.fazenda.gov.br/nfse"><infEvento Id="EVT'+key+'101101001"><dhProc>2026-10-16T14:55:05-03:00</dhProc><chNFSe>'+key+'</chNFSe><e101101><xMotivo>Teste</xMotivo></e101101></infEvento></evento>';
 const event={chaveAcesso:key,tipoEvento:101101,arquivoXml:Buffer.from(transport.pack(xmlEvent)).toString('base64')};assert.equal(events.parse(event,key,101101).motivo,'Teste');assert.throws(()=>events.parse(event,'2'.repeat(50),101101));assert.throws(()=>events.parse({...event,tipoEvento:101103},key,101103));
});
