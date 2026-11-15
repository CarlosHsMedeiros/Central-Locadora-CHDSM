const test=require('node:test'),assert=require('node:assert/strict'),V=require('../LOCADORA_VALORES.JS');
test('somente multas ativas da locadora reduzem o saldo',()=>{
 const multas=[{responsavel:'Locadora',valor:'100,25',situacao:'Pendente'},{responsavel:'Cliente',valor:200},{responsavel:'Condutor',valor:300},{responsavel:'Empresa responsável',valor:400},{responsavel:'Locadora',valor:500,situacao:'Cancelada'},{responsavel:'',valor:600}];
 assert.equal(V.somar(multas.filter(V.multaDaLocadora).map(m=>m.valor)),100.25);
 assert.equal(V.multaDaLocadora({responsavel:' locadora ',situacao:'Paga'}),true);
});
