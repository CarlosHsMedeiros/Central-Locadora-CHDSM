const test = require('node:test');
const assert = require('node:assert/strict');
const v = require('../LOCADORA_VALORES.JS');
test('valores brasileiros e decimais preservam os centavos', () => {
 assert.equal(v.numero('R$ 1.234,56'),1234.56);
 assert.equal(v.numero('1234.56'),1234.56);
 assert.equal(v.numero('1.234'),1234);
 assert.equal(v.somar([0.1,0.2]),0.3);
 assert.throws(()=>v.numero('12abc'));
 assert.throws(()=>v.numero(Infinity));
});
test('rateio conserva o total inclusive quando nao e divisivel', () => {
 const partes = v.ratear(100,3);
 assert.equal(partes.length,3);
 assert.equal(v.somar(partes),100);
 assert.ok(Math.max(...partes)-Math.min(...partes)<0.011);
});const veiculo = require('../src/validators/veiculoValidator');
const contrato = require('../src/validators/contratoValidator');
test('cadastro preserva compra e custos anuais e rejeita entradas invalidas', () => {
 const base={placa:'ABC-1D23',marca:'Marca',modelo:'Modelo',dataCompra:'2026-09-27',valorCompra:'100.000,00',custosPorAno:{2026:'5.000,01'}};
 const result=veiculo.normalize(base);
 assert.equal(result.placa,'ABC1D23');
 assert.equal(result.valorCompra,100000);
 assert.equal(result.custosPorAno[2026],5000.01);
 for(const change of [{placa:'ABC1D2'},{dataCompra:'2026-02-30'},{valorCompra:-1},{custosPorAno:{2026:-1}},{custosPorAno:{abc:10}}]) assert.throws(()=>veiculo.normalize({...base,...change}));
});
test('devolucao exige data real, quilometragem e destino valido', () => {
 const base={dataDevolucao:'2026-09-27',quilometragemFinal:12345,combustivelDevolucao:'8/8',destinoDevolucao:'Disponível'};
 assert.equal(contrato.devolucao(base).quilometragemFinal,12345);
 for(const change of [{dataDevolucao:'2026-02-30'},{quilometragemFinal:-1},{quilometragemFinal:''},{combustivelDevolucao:'9/8'},{destinoDevolucao:'qualquer'}]) assert.throws(()=>contrato.devolucao({...base,...change}));
});