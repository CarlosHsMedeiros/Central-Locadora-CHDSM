const test=require("node:test"),assert=require("node:assert/strict"),F=require("../LOCADORA_FATURAMENTO.JS"),M=require("../LOCADORA_MODELO_CONTRATO.JS"),numbers=require("../src/utils/invoiceNumber");
test("numera a partir de 3000 e respeita sequencia ja existente",async()=>{
 let last=2999n,existing=0n;
 const c={execute:async(sql,p)=>{
  if(sql.startsWith("SELECT ultimo"))return [[{ultimo_numero:String(last)}]];
  if(sql.startsWith("SELECT COALESCE"))return [[{maior:String(existing)}]];
  if(sql.startsWith("UPDATE"))last=BigInt(p[0]);return [{}];
 }};
 assert.equal(await numbers.next(c),"3000");assert.equal(await numbers.next(c),"3001");existing=3500n;assert.equal(await numbers.next(c),"3501");
});
test("inclui todas as faturas da placa e separa emitido de recebido",()=>{
 const v={id:"1",placa:"ABC1D23"},f=[{numero:"3000",tipo:"Locação",valor:150,valorBase:50,itensVeiculos:[{veiculoId:"1",placa:"ABC-1D23",valor:100}]},{numero:"3001",tipo:"Multa",valor:25,dataPagamento:"2026-10-02",itensVeiculos:[{veiculoId:"1",valor:25}]}];
 const r=F.resumo(v,f,[v],[],[]);assert.equal(r.emitido,175);assert.equal(r.recebido,25);assert.equal(r.areceber,150);
});
test("rateia o adicional sem perder centavos e recupera vinculo por contrato",()=>{
 const items=F.distribuir({valor:100.01,itensVeiculos:[{veiculoId:"1",valor:20},{veiculoId:"2",valor:20}]});
 assert.equal(items[0].valor,50.01);assert.equal(items[1].valor,50);
 const recovered=F.distribuir({valor:100,contratosIds:["10"],itensVeiculos:[]},[],[{id:"10",veiculosDetalhes:[{id:"1",placa:"ABC1234"}]}]);assert.equal(recovered[0].valor,100);
});
test("contrato preenche partes, veiculos, observacoes e complementos sem tokens pendentes",()=>{
 const texto=M.preencher({empresa:{nome:"Empresa",cnpj:"123",endereco:"Rua A"},cliente:{nome:"Cliente Teste",documento:"456",endereco:"Rua B"},contrato:{dataInicio:"2026-10-02",dataFim:"2026-11-02",valorLocacao:1200,observacoes:"Entrega revisada"},veiculos:[{id:"1",placa:"ABC1D23",marca:"Marca",modelo:"Modelo",renavam:"12345678901"}]},{horaInicio:"10:00",formaPagamento:"PIX",testemunhas:"Nome e documento"});
 for(const expected of ["Empresa","Cliente Teste","ABC1D23","Entrega revisada","10:00","PIX","Nome e documento"])assert.ok(texto.includes(expected),expected);
 assert.ok(!texto.includes("{{"));assert.ok(!texto.includes("undefined"));
});
