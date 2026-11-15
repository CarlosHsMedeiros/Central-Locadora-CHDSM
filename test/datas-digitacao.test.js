const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('clique no texto permite digitar e apenas icone abre calendario',()=>{
 const source=fs.readFileSync(require.resolve('../SEGURANCA_INTERFACE.JS'),'utf8');const ctx=vm.createContext({campoData:()=>true});
 vm.runInContext(source.slice(source.indexOf('    function clicouNoCalendario('),source.indexOf("    document.addEventListener('pointerdown'")),ctx);
 const target={getBoundingClientRect:()=>({right:300})};
 assert.equal(ctx.clicouNoCalendario({target,clientX:100}),false);assert.equal(ctx.clicouNoCalendario({target,clientX:285}),true);
 target.disabled=true;assert.equal(ctx.clicouNoCalendario({target,clientX:285}),false);
});
test('filtros permitem datas e usam vencimento ao preencher periodo',()=>{
 const source=fs.readFileSync(require.resolve('../LOCADORA_FINANCEIRO.JS'),'utf8');let eventos=0;
 const form={elements:{inicio:{value:'',disabled:true},fim:{value:'',disabled:true},dataCampo:{value:'todos',dispatchEvent:()=>eventos++}}};
 const ctx=vm.createContext({document:{getElementById:id=>id==='filtrosFaturas'?form:{}},Event:class{}});
 vm.runInContext(source.slice(source.indexOf('function atualizarPeriodoFaturas(){'),source.indexOf("document.querySelector('#filtrosFaturas [name=\"dataCampo\"]')")),ctx);
 ctx.atualizarPeriodoFaturas();assert.equal(form.elements.inicio.disabled,false);assert.equal(form.elements.fim.disabled,false);
 form.elements.inicio.value='2026-10-01';ctx.ativarPeriodoDigitadoFaturas();assert.equal(form.elements.dataCampo.value,'vencimento');assert.equal(eventos,1);
 form.elements.dataCampo.value='dataPagamento';ctx.ativarPeriodoDigitadoFaturas();assert.equal(form.elements.dataCampo.value,'dataPagamento');
});
