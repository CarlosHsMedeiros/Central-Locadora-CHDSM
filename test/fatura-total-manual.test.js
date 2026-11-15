const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Valores=require('../LOCADORA_VALORES.JS');
function form(){
 const campos={contratoFatura:{disabled:false,selectedOptions:[]},valorBaseFatura:{value:''},valorFatura:{value:'',readOnly:true}};
 const itens=[];
 const document={getElementById:id=>campos[id],querySelectorAll:sel=>sel==='.item-veiculo-fatura'?itens:itens.map(i=>i.select)};
 const ctx=vm.createContext({document,Valores,valorNumerico:Valores.numero,moeda:v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})});
 const src=fs.readFileSync(require.resolve('../LOCADORA_FINANCEIRO.JS'),'utf8');
 vm.runInContext(src.slice(src.indexOf('function totalFaturaManualPermitido()'),src.indexOf('async function abrirFormularioFatura()')),ctx);
 return {campos,itens,ctx};
}
test('total manual sem v?nculos preserva centavos e n?o duplica o valor',()=>{
 const {campos,ctx}=form();ctx.calcularTotalFatura();assert.equal(campos.valorFatura.readOnly,false);
 campos.valorFatura.value='1.234,56';ctx.sincronizarTotalManualFatura();assert.equal(ctx.calcularTotalFatura(),1234.56);assert.equal(ctx.calcularTotalFatura(),1234.56);
 campos.valorFatura.value='';ctx.sincronizarTotalManualFatura();assert.equal(ctx.calcularTotalFatura(),0);
});
test('contrato bloqueia edi??o e op??o sem contrato libera',()=>{
 const {campos,ctx}=form();campos.contratoFatura.selectedOptions=[{value:'1'}];ctx.calcularTotalFatura();assert.equal(campos.valorFatura.readOnly,true);
 campos.contratoFatura.disabled=true;ctx.calcularTotalFatura();assert.equal(campos.valorFatura.readOnly,false);
});
test('ve?culo usa soma autom?tica; linha sem sele??o n?o comp?e o total',()=>{
 const {campos,itens,ctx}=form();campos.valorBaseFatura.value='50';const select={value:'1'},valor={value:'100'};
 itens.push({select,querySelector:sel=>sel==='.veiculo-item-fatura'?select:valor});
 assert.equal(ctx.calcularTotalFatura(),150);assert.equal(campos.valorFatura.readOnly,true);
 select.value='';assert.equal(ctx.calcularTotalFatura(),50);assert.equal(campos.valorFatura.readOnly,false);
});
