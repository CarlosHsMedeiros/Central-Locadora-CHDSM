const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../LOCADORA_FINANCEIRO.JS'),'utf8');
function resolver(dados){const ctx=vm.createContext({lerDados:chave=>dados[chave]||[],clientesFinanceiro:[]});vm.runInContext(source.slice(source.indexOf('function dadosVinculadosDaFatura('),source.indexOf('function gerarPdfFatura(')),ctx);return ctx.dadosVinculadosDaFatura;}
test('PDF obtem cadastro completo sem abrir formulario e prioriza ID sobre indice',()=>{
 const cliente={id:'20',nome:'Cliente',telefone:'123',email:'teste@example.com',endereco:'Rua',cnh:'456',situacao:'Inativo'};
 const buscar=resolver({clientes:[{id:'10',nome:'Outro'},cliente]});
 assert.equal(buscar({clienteId:'20',clienteIndice:0}).cliente,cliente);
 assert.equal(buscar({clienteId:'99',clienteIndice:0}).cliente,undefined);
});
test('vinculos por IDs nao se confundem com posicoes dos cadastros',()=>{
 const cliente={id:'20'},veiculo={id:'30'},contrato={id:'10',clienteId:'20',veiculosDetalhes:[{id:'30'}]};
 const buscar=resolver({clientes:[cliente],veiculos:[veiculo],contratos:[{id:'5'},contrato]});
 const r=buscar({contratoId:'10',contratoIndice:0});assert.equal(r.cliente,cliente);assert.equal(r.contrato,contrato);assert.equal(r.veiculo,veiculo);
});
test('indices legados incluindo zero ainda sao resolvidos quando nao ha ID',()=>{const cliente={id:'20'};assert.equal(resolver({clientes:[cliente]})({clienteIndice:0}).cliente,cliente);});
test('rotulos financeiros nao possuem caracteres corrompidos',()=>{const html=fs.readFileSync(require.resolve('../LOCADORA_FINANCEIRO.HTML'),'utf8');assert.ok(html.includes('Movimenta\u00e7\u00e3o'));assert.ok(!source.includes('Movimenta??o'));assert.ok(!html.includes('Movimenta??o'));});
