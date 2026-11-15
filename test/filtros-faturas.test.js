const test=require('node:test'),assert=require('node:assert/strict');
const {filtrar}=require('../LOCADORA_FILTROS_FATURAS.JS');
const lista=[{numero:'3000',cliente:'Jose',contrato:'CTR-10',tipo:'Outro',vencimento:'2026-10-01',dataPagamento:'2026-10-05',descricao:'Mensal',placa:'ABC1D23'},{numero:'3001',cliente:'Maria',contrato:'CTR-20',tipo:'Multa',vencimento:'2026-10-31',dataPagamento:'',descricao:'Infracao',placa:'DEF4G56'}];
const status=f=>f.dataPagamento?'Paga':'Pendente',placas=f=>[f.placa];
test('periodo inclusivo e data de pagamento exclui nao pagas',()=>{assert.equal(filtrar(lista,{inicio:'2026-10-01',fim:'2026-10-31'},status).length,2);assert.equal(filtrar(lista,{dataCampo:'dataPagamento',inicio:'2026-10-05',fim:'2026-10-05'},status)[0].numero,'3000');});
test('combina placa normalizada, cliente, contrato, tipo, situacao e busca',()=>{assert.equal(filtrar(lista,{cliente:'jose',contrato:'10',placa:'ABC-1D23',tipo:'Outro',situacao:'Paga',busca:'3000'},status,placas).length,1);assert.equal(filtrar(lista,{cliente:'Maria',situacao:'Paga'},status).length,0);assert.equal(filtrar(lista,{},status).length,2);});

test('todos ignora datas e preserva demais filtros',()=>{
 assert.equal(filtrar(lista,{dataCampo:'todos',inicio:'2030-01-01',fim:'2020-01-01'},status).length,2);
 assert.equal(filtrar(lista,{dataCampo:'todos',inicio:'2030-01-01',cliente:'Maria'},status).length,1);
});
