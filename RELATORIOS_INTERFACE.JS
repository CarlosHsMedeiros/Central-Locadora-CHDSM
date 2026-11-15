(()=>{
'use strict';
const $=id=>document.getElementById(id),tipo=$('tipoRelatorio'),botao=$('gerarConsulta');let carregando=true;
const nomes=Object.fromEntries(Array.from(tipo.options).map(o=>[o.value,o.text]));
const mensagem=(texto,erro=false)=>{$('mensagemConsulta').textContent=texto;$('mensagemConsulta').classList.toggle('erro',erro);$('mensagemConsulta').hidden=!texto;};
function invalidar(){ocultarRelatoriosAteSolicitacao();$('tituloResultado').hidden=true;$('estadoInicialRelatorios').hidden=false;$('imprimirResultados').disabled=true;}
function contexto(){
 const personalizados=Array.from(document.querySelectorAll('.item-relatorio:checked')).map(el=>el.value);
 const itens=tipo.value==='personalizado'?personalizados:[tipo.value],licenca=itens.includes('licenciamento');
 $('selecaoPersonalizada').hidden=tipo.value!=='personalizado';
 $('filtrosLicenciamento').hidden=!licenca;
 const datas=itens.some(i=>!['frota','licenciamento'].includes(i));
 const clientes=itens.some(i=>!['frota','licenciamento','multas','manutencoes'].includes(i));
 for(const id of ['dataInicial','dataFinal']){const campo=$(id).closest('.campo');campo.hidden=!datas;if(!datas)$(id).value='';}
 $('filtroCliente').closest('.campo').hidden=!clientes;
 if(!clientes){Array.from($('filtroCliente').options).forEach(o=>o.selected=false);atualizarSeletorClientes();}
 $('filtroVeiculo').closest('.campo').hidden=itens.length===0||itens.every(i=>i==='frota');
 if($('filtroVeiculo').closest('.campo').hidden)$('filtroVeiculo').value='';
 $('filtrosGerais').hidden=!datas&&!clientes&&$('filtroVeiculo').closest('.campo').hidden;
 $('tituloFiltros').textContent='Filtros · '+nomes[tipo.value];
 $('descricaoFiltros').textContent=tipo.value==='frota'?'Indicadores de toda a frota cadastrada.':licenca?'Consulte o exercício, a situação e o final da placa.':'Refine a consulta com os critérios abaixo.';
 $('ajudaConsulta').textContent=tipo.value==='frota'?'Este relatório considera toda a frota.':licenca&&itens.length===1?'Calendário SP de 2026. Último CRLV conforme o cadastro do veículo.':'Campos em branco consideram todos os registros. Nos relatórios combinados, cada filtro se aplica ao respectivo conteúdo.';
 document.querySelectorAll('[data-tipo]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.tipo===tipo.value)));
 invalidar();
}
function selecionar(valor){tipo.value=valor;contexto();}
async function gerar(){
 if(carregando)return;
 if(tipo.value==='personalizado'&&!document.querySelector('.item-relatorio:checked')){mensagem('Selecione pelo menos um conteúdo para o relatório personalizado.',true);return;}
 for(const input of document.querySelectorAll('.painel-filtros input'))if(!input.closest('[hidden]')&&!input.reportValidity())return;
 if($('dataInicial').value&&$('dataFinal').value&&$('dataInicial').value>$('dataFinal').value){mensagem('A data inicial deve ser anterior ou igual à data final.',true);$('dataInicial').focus();return;}
 carregando=true;botao.disabled=true;botao.textContent='Gerando…';mensagem('Preparando seu relatório…');
 try{await aplicarFiltros();$('estadoInicialRelatorios').hidden=true;document.querySelector('.identificacao-relatorio>div>span').textContent=nomes[tipo.value];$('tituloResultado').hidden=false;$('descricaoResultado').textContent=nomes[tipo.value]+' · '+new Date().toLocaleString('pt-BR');$('imprimirResultados').disabled=false;document.querySelectorAll('.btn-pdf-topico').forEach(b=>b.textContent='Imprimir / PDF');
 document.querySelectorAll('#tabelaLicenciamento tr').forEach(tr=>{if(tr.children.length!==8)return;const td=tr.lastElementChild,txt=td.textContent;const span=document.createElement('span');span.className='licenca-status '+(txt.startsWith('Vencido')?'vencido':txt==='Licenciado'?'licenciado':txt.startsWith('Pendente')?'pendente':'neutro');span.textContent=txt;td.replaceChildren(span);});
 mensagem('');$('tituloResultado').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){invalidar();mensagem(e.message||'Não foi possível gerar o relatório. Tente novamente.',true);}finally{carregando=false;botao.disabled=false;botao.innerHTML=SegurancaInterface.html('Gerar relatório <span aria-hidden="true">→</span>');}
}
document.querySelectorAll('[data-tipo]').forEach(el=>el.addEventListener('click',()=>selecionar(el.dataset.tipo)));
document.querySelectorAll('.item-relatorio').forEach(el=>el.addEventListener('change',contexto));
$('limparConsulta').addEventListener('click',()=>{['dataInicial','dataFinal','filtroVeiculo','situacaoLicenciamento','finalLicenciamento','anoCrlvFiltro'].forEach(id=>$(id).value='');Array.from($('filtroCliente').options).forEach(o=>o.selected=false);atualizarSeletorClientes();contexto();mensagem('Filtros limpos. Gere o relatório para consultar novamente.');});
$('gerarConsulta').addEventListener('click',gerar);
$('imprimirResultados').addEventListener('click',imprimirRelatorio);
$('atualizarDadosRelatorios').addEventListener('click',async()=>{if(carregando)return;carregando=true;botao.disabled=true;invalidar();mensagem('Atualizando dados…');try{carregarDados();await carregarCadastrosDoBackend();carregarFiltroVeiculos();carregarFiltroClientes();mensagem('Dados atualizados. Gere o relatório para consultar.');}catch(e){mensagem(e.message,true);}finally{carregando=false;botao.disabled=false;contexto();}});
document.querySelectorAll('.painel-filtros input,.painel-filtros select').forEach(el=>el.addEventListener('change',invalidar));
$('opcoesClientes').addEventListener('change',invalidar);
selecionar('veiculos');botao.disabled=true;
inicializacaoRelatorios.then(()=>{carregando=false;botao.disabled=false;selecionar('veiculos');mensagem(usuarioRelatorioAtual?'':'Não foi possível carregar todos os cadastros. Use Atualizar dados para tentar novamente.',!usuarioRelatorioAtual);}).catch(e=>{carregando=false;botao.disabled=false;mensagem(e.message,true);});
})();
