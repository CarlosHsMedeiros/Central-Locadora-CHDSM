const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];
const dados = chave => { try { return JSON.parse(localStorage.getItem(chave)) || []; } catch { return []; } };
const nomeCliente = (cliente = {}) => cliente.nome || cliente.nomeCompleto || cliente.razaoSocial || "Cliente não identificado";
const moeda = valor => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const estado = { view: "inicio", veiculos: [], clientes: [], contratos: [], multas: [], manutencoes: [], faturas: [] };
function atualizarDados() { ["veiculos", "clientes", "contratos", "multas", "manutencoes", "faturas"].forEach(chave => estado[chave] = dados(chave)); }
function contratoAtivo(contrato) { return String(contrato.status || contrato.situacao || "").toLowerCase().includes("ativo"); }
function veiculosContrato(contrato) { return Array.isArray(contrato.veiculos) && contrato.veiculos.length ? contrato.veiculos : [contrato.veiculoIndice ?? contrato.veiculo]; }
function clienteContrato(contrato) { const indice = contrato.clienteIndice ?? contrato.cliente; return typeof indice === "string" && Number.isNaN(Number(indice)) ? indice : nomeCliente(estado.clientes[Number(indice)]); }
function setTitulo(titulo, grupo) { $("#tituloPagina").textContent = titulo; $("#breadcrumb").textContent = grupo || "Painel"; }

function renderInicio() {
  const tela = $("#tela"); tela.innerHTML = SegurancaInterface.html($("#template-dashboard").innerHTML);
  const ativos = estado.contratos.filter(contratoAtivo).length;
  const dadosMetricas = [["Veículos", estado.veiculos.length], ["Em locação", estado.veiculos.filter(v => v.situacao === "Alugado").length], ["Contratos ativos", ativos], ["Faturas pendentes", estado.faturas.filter(f => !f.dataPagamento).length]];
  $("#metricas").innerHTML = SegurancaInterface.html(dadosMetricas.map(([nome, valor]) => `<article class="metric"><span>${nome}</span><strong>${valor}</strong></article>`).join(""));
  const atividades = [...estado.contratos.filter(contratoAtivo).map(c => `Contrato ${c.numeroContrato || c.numero || "-"} ativo para ${clienteContrato(c)}`), ...estado.multas.slice(-3).map(m => `Multa ${m.autoInfracao || "-"} registrada`)].slice(0, 5);
  $("#atividade").innerHTML = SegurancaInterface.html(atividades.length ? atividades.map(item => `<div class="activity"><strong>${SegurancaInterface.escape(item)}</strong><span>Registro disponível no sistema</span></div>`).join("") : '<div class="empty">Nenhuma atividade cadastrada.</div>');
  $("[data-action='relatorios']").onclick = () => navegar("relatorios");
}

function montarRosca(dados, titulo) {
  const total = dados.reduce((soma, item) => soma + item.valor, 0); let inicio = 0;
  const partes = dados.filter(item => item.valor).map(item => { const fim = inicio + item.valor / total * 100; const parte = `${item.cor} ${inicio}% ${fim}%`; inicio = fim; return parte; });
  return `<section class="panel donut-panel"><span class="eyebrow">DISTRIBUIÇÃO</span><h3>${titulo}</h3><div class="donut" style="background:${partes.length ? `conic-gradient(${partes.join(",")})` : "#e7edf0"}"><div><strong>${total}</strong><span>veículos</span></div></div><ul class="legend">${dados.map(item => `<li><span>● ${item.nome}</span><strong>${total ? Math.round(item.valor / total * 100) : 0}% · ${item.valor}</strong></li>`).join("")}</ul></section>`;
}

function renderRelatorios() {
  const tela = $("#tela"); tela.innerHTML = SegurancaInterface.html($("#template-relatorios").innerHTML);
  const modelos = [...new Set(estado.veiculos.map(v => v.modelo).filter(Boolean))].sort(); $("#filtroModelo").insertAdjacentHTML("beforeend", SegurancaInterface.html(modelos.map(modelo => `<option value="${modelo}">${modelo}</option>`).join("")));
  $("#filtroCliente").innerHTML = SegurancaInterface.html(estado.clientes.map((cliente, indice) => `<option value="${indice}">${SegurancaInterface.escape(nomeCliente(cliente))}</option>`).join(""));
  $("#limparRelatorio").onclick = () => { $$("input", tela).forEach(input => { if (input.type === "checkbox") input.checked = false; else input.value = ""; }); $("#filtroModelo").value = ""; $$("option", $("#filtroCliente")).forEach(opcao => opcao.selected = false); $("#resultadoRelatorio").hidden = true; };
  $("#gerarRelatorio").onclick = gerarRelatorio;
}

function gerarRelatorio() {
  const tela = $("#tela"), modelo = $("#filtroModelo").value, clientes = $$("#filtroCliente option:checked").map(o => o.value), inicio = $("#dataInicial").value, fim = $("#dataFinal").value;
  const itens = $$(".choices input:checked", tela).map(input => input.value); const resultado = $("#resultadoRelatorio");
  if (!itens.length) { alert("Selecione ao menos um item para gerar o relatório."); return; }
  const contratos = estado.contratos.filter(contrato => { const data = contrato.dataInicio || contrato.inicio || ""; const cliente = String(contrato.clienteIndice ?? contrato.cliente); return (!inicio || data >= inicio) && (!fim || data <= fim) && (!clientes.length || clientes.includes(cliente)) && (!modelo || veiculosContrato(contrato).some(indice => estado.veiculos[Number(indice)]?.modelo === modelo)); });
  const veiculosVinculados = estado.veiculos.filter((veiculo, indice) => { if (modelo && veiculo.modelo !== modelo) return false; return !clientes.length || contratos.some(contrato => veiculosContrato(contrato).some(id => String(id) === String(indice))); });
  let html = "";
  if (itens.includes("frota")) { const status = [["Disponíveis", "Disponível", "#27ae60"], ["Alugados", "Alugado", "#008fd0"], ["Em manutenção", "Manutenção", "#e77a1e"], ["Inativos", "Inativo", "#718096"]].map(([nome, chave, cor]) => ({ nome, cor, valor: veiculosVinculados.filter(v => v.situacao === chave).length })); const porCliente = new Map(); contratos.filter(contratoAtivo).forEach(c => porCliente.set(clienteContrato(c), (porCliente.get(clienteContrato(c)) || 0) + veiculosContrato(c).length)); html += `<div class="report-grid">${montarRosca(status, "Situação da frota")}${montarRosca([...porCliente].map(([nome, valor], i) => ({ nome, valor, cor: ["#00558b", "#7c4dff", "#e77a1e", "#15955d"][i % 4] })), "Veículos por locatário")}</div>`; }
  if (itens.includes("veiculos")) { const linhas = veiculosVinculados.map((veiculo, indiceLocal) => { const indice = estado.veiculos.indexOf(veiculo); const contrato = contratos.find(c => veiculosContrato(c).some(id => String(id) === String(indice))); return `<tr><td>${veiculo.placa || "-"}</td><td>${veiculo.renavam || "-"}</td><td>${veiculo.chassi || "-"}</td><td>${[veiculo.marca,veiculo.modelo].filter(Boolean).join(" ")}</td><td>${veiculo.ano || "-"}</td><td>${contrato ? clienteContrato(contrato) : "-"}</td><td>${contratoAtivo(contrato || {}) ? "Com " + clienteContrato(contrato) : (veiculo.localizacao || veiculo.situacao || "-")}</td><td>${contrato ? moeda(contrato.valorLocacao) : "-"}</td></tr>`; }).join(""); html += `<section class="panel"><div class="panel-heading"><span class="eyebrow">VEÍCULOS FILTRADOS</span><h3>Relação de veículos</h3></div><div class="table-wrap"><table><thead><tr><th>Placa</th><th>RENAVAM</th><th>Chassi</th><th>Modelo</th><th>Ano</th><th>Locatário</th><th>Onde está</th><th>Valor</th></tr></thead><tbody>${linhas || '<tr><td colspan="8" class="empty">Nenhum veículo encontrado.</td></tr>'}</tbody></table></div></section>`; }
  if (itens.includes("contratos")) html += `<section class="panel"><div class="panel-heading"><span class="eyebrow">CONTRATOS</span><h3>${contratos.length} contrato(s) no filtro</h3></div></section>`;
  resultado.hidden = false; resultado.innerHTML = SegurancaInterface.html(html);
}

function renderEmDesenvolvimento(nome) { $("#tela").innerHTML = SegurancaInterface.html(`<section class="panel"><div class="panel-heading"><span class="eyebrow">MIGRAÇÃO EM ANDAMENTO</span><h3>${nome}</h3><p>Este módulo será consolidado aqui com os dados já existentes preservados.</p></div><div class="empty">Use o painel de Relatórios para consultar os dados durante a migração.</div></section>`); }
function navegar(view) { atualizarDados(); estado.view = view; $$(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === view)); const nomes = { inicio:["Visão geral","Painel"],veiculos:["Veículos","Cadastros"],clientes:["Clientes","Cadastros"],contratos:["Contratos","Operação"],multas:["Multas","Operação"],manutencoes:["Manutenções","Operação"],financeiro:["Financeiro","Gestão"],relatorios:["Relatórios","Análises"],configuracoes:["Configurações","Administração"] }; setTitulo(...nomes[view]); view === "inicio" ? renderInicio() : view === "relatorios" ? renderRelatorios() : renderEmDesenvolvimento(nomes[view][0]); }

$("#menuPrincipal").addEventListener("click", evento => { const botao = evento.target.closest("[data-view]"); if (botao) navegar(botao.dataset.view); });
$("#menuMobile").onclick = () => $(".sidebar").classList.toggle("open");
try { const sessao = JSON.parse(localStorage.getItem("sessaoUsuario")) || {}; $("#nomeUsuario").textContent = sessao.nome || "Administrador"; $("#cargoUsuario").textContent = sessao.cargo || "Administrador"; $("#avatarUsuario").textContent = (sessao.nome || "A").trim().charAt(0).toUpperCase(); } catch {}
navegar("inicio");
