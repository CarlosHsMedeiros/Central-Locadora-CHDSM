const usuarioFinanceiro = Banco.getItem("usuarioLogado");
let faturaEditandoId = null;
let clientesFinanceiro = [];

function dadosSessaoAtual() { if(window.usuarioAtual)return window.usuarioAtual;
    try { return JSON.parse(Banco.getItem("sessaoUsuario")) || { nome: usuarioFinanceiro || "Usuário não identificado", cargo: "Não informado" }; }
    catch (erro) { return { nome: usuarioFinanceiro || "Usuário não identificado", cargo: "Não informado" }; }
}

function dadosEmpresaAtual() {
    try { return JSON.parse(Banco.getItem("configuracoesEmpresa")) || {}; }
    catch (erro) { return {}; }
}

if (usuarioFinanceiro) {
    document.getElementById("nomeUsuario").textContent = usuarioFinanceiro;
}

function lerDados(chave) {
    try {
        return JSON.parse(Banco.getItem(chave)) || [];
    } catch (erro) {
        return [];
    }
}

function valorNumerico(valor) { return Valores.numero(valor); }

function moeda(valor) {
    return valorNumerico(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataFormatada(data) {
    if (!data) return "-";
    const partes = String(data).split("-");
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : String(data);
}

function escaparHTML(valor) {
    return String(valor ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function atualizarFinanceiro() {
    const faturas = lerDados("faturas").filter(f => !["cancelada", "cancelado", "excluida"].includes(String(f.status || "").toLowerCase()));
    const receitas = faturas.filter(f => f.natureza !== "Despesa");
    const despesas = faturas.filter(f => f.natureza === "Despesa");
    const receita = Valores.somar(receitas.map(f => f.valor));
    const custo = Valores.somar(despesas.map(f => f.valor));
    document.getElementById("receitaContratos").textContent = moeda(receita);
    document.getElementById("custoManutencao").textContent = moeda(custo);
    document.getElementById("valorMultas").textContent = moeda(Valores.somar(despesas.filter(f => f.dataPagamento).map(f => f.valor)));
    document.getElementById("saldoEstimado").textContent = moeda(Valores.somar([receita, -custo]));
    const movimentacoes = faturas.map(f => ({ tipo: f.natureza || "Receita", descricao: `Fatura ${f.numero || "-"}: ${f.descricao || ""}`, data: f.dataPagamento || f.vencimento, valor: valorNumerico(f.valor) }))
        .sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));

    const tabela = document.getElementById("tabelaFinanceiro");
    const vazio = document.getElementById("mensagemVazia");
    tabela.innerHTML = SegurancaInterface.html("");
    vazio.style.display = movimentacoes.length ? "none" : "block";
    movimentacoes.forEach(item => {
        const linha = document.createElement("tr");
        const receitaItem = item.tipo === "Receita";
        linha.innerHTML = SegurancaInterface.html(`<td>${escaparHTML(item.tipo)}</td><td>${escaparHTML(item.descricao)}</td><td>${dataFormatada(item.data)}</td><td class="${receitaItem ? "valor-receita" : "valor-despesa"}">${receitaItem ? "+" : "-"} ${moeda(item.valor)}</td>`);
        tabela.appendChild(linha);
    });
    document.getElementById("contador").textContent = `${movimentacoes.length} movimentação(ões)`;

    mostrarFaturas();
}

async function carregarClientesFatura() {
    const select = document.getElementById("clienteFatura");
    const valorAtual = select.value;
    select.innerHTML = SegurancaInterface.html('<option value="">Carregando clientes...</option>');
    let clientes;
    try {
        const resposta = await api.get("/clientes/opcoes");
        clientes = resposta.data || [];
        clientesFinanceiro = clientes;
    } catch (erro) {
        select.innerHTML = SegurancaInterface.html(`<option value="">${escaparHTML(erro.message || "Não foi possível carregar os clientes")}</option>`);
        return;
    }
    select.innerHTML = SegurancaInterface.html('<option value="">Selecione o cliente</option>');
    clientes.forEach((cliente) => {
        const opcao = document.createElement("option");
        opcao.value = cliente.id;
        opcao.dataset.indice = lerDados("clientes").findIndex(item => String(item.id) === String(cliente.id));
        opcao.textContent = cliente.nome || `Cliente ${cliente.id}`;
        select.appendChild(opcao);
    });
    if (valorAtual) select.value = valorAtual;
}

function carregarContratosFatura() {
    const contratos = lerDados("contratos");
    const clienteSelect = document.getElementById("clienteFatura");
    const contratoSelect = document.getElementById("contratoFatura");
    const clienteId = clienteSelect.value;
    contratoSelect.innerHTML = SegurancaInterface.html('<option value="">Selecione o contrato</option>');

    if (!clienteId) return;

    contratos.forEach((contrato, indice) => {
        const clienteContrato = contrato.clienteId ?? contrato.cliente_id ?? contrato.cliente ?? contrato.clienteIndice;
        if (String(clienteContrato) !== String(clienteId)) return;
        const opcao = document.createElement("option");
        opcao.value = contrato.id || indice;
        opcao.dataset.indice = indice;
        opcao.textContent = contrato.numeroContrato || contrato.numero || `Contrato ${indice + 1}`;
        contratoSelect.appendChild(opcao);
    });
}

function atualizarTipoFatura() {
    const tipo = document.getElementById("tipoFatura").value;
    const obrigatoriedade = document.getElementById("obrigatoriedadeContrato");
    obrigatoriedade.textContent = document.getElementById("semContratoFatura").checked ? "(sem vínculo)" : tipo === "Locação" ? "*" : "(opcional)";
    const camposMulta = document.getElementById("camposMultaFatura");
    camposMulta.hidden = tipo !== "Multa";
    if (tipo === "Multa") carregarAitsFatura();
    atualizarUsoAitFatura();
}

function normalizarAit(valor) {
    return String(valor || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function carregarAitsFatura(aitSelecionado = "") {
    const seletor = document.getElementById("aitFatura");
    if (!seletor) return;
    const selecionadoAtual = aitSelecionado || seletor.value;
    const multas = lerDados("multas");
    seletor.innerHTML = SegurancaInterface.html('<option value="">Selecione o AIT cadastrado em Multas</option>');
    multas.forEach((multa, indice) => {
        const ait = multa.autoInfracao || multa.ait || "Sem AIT";
        const opcao = new Option(`${ait} — ${multa.placa || "sem placa"} — ${multa.descricao || "Multa"}`, indice);
        opcao.dataset.ait = ait;
        opcao.dataset.valor = multa.valor || "";
        seletor.appendChild(opcao);
    });
    if (selecionadoAtual !== "") seletor.value = selecionadoAtual;
}

function atualizarUsoAitFatura() {
    const justificativa = document.getElementById("grupoJustificativaAit");
    const reutilizacao = document.getElementById("reutilizacaoAitCondutor");
    if (justificativa && reutilizacao) justificativa.hidden = !reutilizacao.checked;
}

function configurarCampoMoeda(campo) {
    campo.addEventListener("focus", () => campo.select());
    campo.addEventListener("blur", () => {
        const valor = valorNumerico(campo.value);
        campo.value = valor > 0 ? moeda(valor) : "";
        calcularTotalFatura();
    });
}

function adicionarItemVeiculoFatura(itemSalvo = {}) {
    const veiculos = lerDados("veiculos");
    const container = document.getElementById("itensVeiculosFatura");
    const item = document.createElement("div");
    item.className = "item-veiculo-fatura";

    const grupoVeiculo = document.createElement("div");
    const rotuloVeiculo = document.createElement("label");
    rotuloVeiculo.textContent = "Veículo";
    const select = document.createElement("select");
    select.className = "veiculo-item-fatura";
    select.appendChild(new Option("Selecione o veículo", ""));
    veiculos.forEach((veiculo, indice) => {
        const opcao = new Option(`${veiculo.placa || "Sem placa"} — ${[veiculo.marca, veiculo.modelo].filter(Boolean).join(" ")}`, veiculo.id || indice);
        opcao.dataset.indice = indice;
        select.appendChild(opcao);
    });
    const opcaoSalva = Array.from(select.options).find(opcao =>
        String(opcao.value) === String(itemSalvo.veiculoId) ||
        String(opcao.dataset.indice) === String(itemSalvo.veiculoIndice) ||
        opcao.textContent.startsWith(`${itemSalvo.placa || ""} —`)
    );
    if (opcaoSalva) {
        select.value = opcaoSalva.value;
    } else if (itemSalvo.placa) {
        const opcao = new Option(`${itemSalvo.placa} — ${itemSalvo.modelo || "Veículo cadastrado"}`, itemSalvo.veiculoId || "veiculo-anterior");
        opcao.dataset.indice = itemSalvo.veiculoIndice ?? "";
        select.appendChild(opcao);
        select.value = opcao.value;
    }
    grupoVeiculo.append(rotuloVeiculo, select);

    const grupoValor = document.createElement("div");
    const rotuloValor = document.createElement("label");
    rotuloValor.textContent = "Valor do veículo";
    const inputValor = document.createElement("input");
    inputValor.type = "text";
    inputValor.inputMode = "decimal";
    inputValor.placeholder = "R$ 0,00";
    inputValor.className = "valor-veiculo-item";
    inputValor.value = itemSalvo.valor ? moeda(itemSalvo.valor) : "";
    grupoValor.append(rotuloValor, inputValor);

    const remover = document.createElement("button");
    remover.type = "button";
    remover.className = "btn-remover-item";
    remover.textContent = "×";
    remover.title = "Remover veículo";
    remover.addEventListener("click", () => {
        item.remove();
        calcularTotalFatura();
    });
    select.addEventListener("change", calcularTotalFatura);
    inputValor.addEventListener("input", calcularTotalFatura);
    configurarCampoMoeda(inputValor);
    item.append(grupoVeiculo, grupoValor, remover);
    container.appendChild(item);
    calcularTotalFatura();
}

function carregarItensVeiculosFatura(itens = []) {
    document.getElementById("itensVeiculosFatura").innerHTML = SegurancaInterface.html("");
    itens.forEach(item => adicionarItemVeiculoFatura(item));
    calcularTotalFatura();
}

function totalFaturaManualPermitido() {
    const contrato = document.getElementById("contratoFatura");
    const temContrato = !contrato.disabled && Array.from(contrato.selectedOptions).some(opcao => opcao.value);
    const temVeiculo = Array.from(document.querySelectorAll(".veiculo-item-fatura")).some(campo => campo.value);
    return !temContrato && !temVeiculo;
}

function sincronizarTotalManualFatura() {
    if (!totalFaturaManualPermitido()) return;
    document.getElementById("valorBaseFatura").value = document.getElementById("valorFatura").value;
}

function calcularTotalFatura() {
    const valorBase = valorNumerico(document.getElementById("valorBaseFatura")?.value);
    const itens = Array.from(document.querySelectorAll(".item-veiculo-fatura"))
        .filter(item => item.querySelector(".veiculo-item-fatura").value);
    const total = Valores.somar([valorBase, ...itens.map(item => valorNumerico(item.querySelector(".valor-veiculo-item").value))]);
    const campoTotal = document.getElementById("valorFatura");
    campoTotal.readOnly = !totalFaturaManualPermitido();
    campoTotal.value = total ? moeda(total) : "";
    return total;
}

async function abrirFormularioFatura() {
    faturaEditandoId = null;
    document.getElementById("semContratoFatura").checked=false;document.getElementById("contratoFatura").disabled=false;
    await carregarClientesFatura();
    document.getElementById("tituloFormularioFatura").textContent = "Nova fatura";
    document.getElementById("btnSalvarFatura").textContent = "Salvar fatura";
    document.getElementById("numeroFatura").value = "";
    document.getElementById("tipoFatura").value = "Locação";
    document.getElementById("naturezaFatura").value = "Receita";
    document.getElementById("clienteFatura").value = "";
    document.getElementById("contratoFatura").innerHTML = SegurancaInterface.html('<option value="">Selecione o contrato</option>');
    document.getElementById("descricaoFatura").value = "";
    document.getElementById("vencimentoFatura").value = "";
    document.getElementById("valorBaseFatura").value = "";
    document.getElementById("valorFatura").value = "";
    document.getElementById("dataPagamentoFatura").value = "";
    document.getElementById("aitFatura").value = "";
    document.getElementById("reutilizacaoAitCondutor").checked = false;
    document.getElementById("justificativaAit").value = "";
    carregarItensVeiculosFatura();
    atualizarTipoFatura();
    document.getElementById("formularioFatura").classList.add("mostrar");
}

function fecharFormularioFatura() {
    document.getElementById("dataPagamentoFatura").closest("div").classList.remove("pagamento-em-destaque");
    document.getElementById("formularioFatura").classList.remove("mostrar");
    faturaEditandoId = null;
}

async function editarFatura(id) {
    const fatura = lerDados("faturas").find(item => String(item.id) === String(id));
    if (!fatura) return;

    document.getElementById("semContratoFatura").checked=!(fatura.contratosIds||[fatura.contratoId]).filter(Boolean).length;
    document.getElementById("contratoFatura").disabled=document.getElementById("semContratoFatura").checked;
    await carregarClientesFatura();
    const clienteSelect = document.getElementById("clienteFatura");
    const clienteOpcao = Array.from(clienteSelect.options).find(opcao =>
        String(opcao.value) === String(fatura.clienteId) || opcao.textContent === fatura.cliente
    );
    if (clienteOpcao) {
        clienteSelect.value = clienteOpcao.value;
    } else if (fatura.cliente) {
        const opcao = new Option(fatura.cliente, fatura.clienteId || "cliente-anterior");
        opcao.dataset.indice = fatura.clienteIndice ?? "";
        clienteSelect.appendChild(opcao);
        clienteSelect.value = opcao.value;
    }
    carregarContratosFatura();

    const contratoSelect = document.getElementById("contratoFatura");
    const contratoOpcao = Array.from(contratoSelect.options).find(opcao =>
        String(opcao.value) === String(fatura.contratoId) || opcao.textContent === fatura.contrato
    );
    if (contratoOpcao) {
        contratoSelect.value = contratoOpcao.value;
    } else if (fatura.contrato) {
        const opcao = new Option(fatura.contrato, fatura.contratoId || "contrato-anterior");
        opcao.dataset.indice = fatura.contratoIndice ?? "";
        contratoSelect.appendChild(opcao);
        contratoSelect.value = opcao.value;
    }

    document.getElementById("numeroFatura").value = fatura.numero || "";
    document.getElementById("tipoFatura").value = fatura.tipo || "Outro";
    document.getElementById("naturezaFatura").value = fatura.natureza || "Receita";
    document.getElementById("descricaoFatura").value = fatura.descricao || "";
    document.getElementById("vencimentoFatura").value = fatura.vencimento || "";
    const itensVeiculos = Array.isArray(fatura.itensVeiculos) ? fatura.itensVeiculos : [];
    const campoValorBase = document.getElementById("valorBaseFatura");
    const valorBaseSalvo = fatura.valorBase ?? (itensVeiculos.length ? "" : valorNumerico(fatura.valor) || "");
    campoValorBase.value = valorBaseSalvo ? moeda(valorBaseSalvo) : "";
    carregarItensVeiculosFatura(itensVeiculos);
    calcularTotalFatura();
    document.getElementById("dataPagamentoFatura").value = fatura.dataPagamento || "";
    document.getElementById("reutilizacaoAitCondutor").checked = Boolean(fatura.reutilizacaoAitCondutor);
    document.getElementById("justificativaAit").value = fatura.justificativaAit || "";
    document.getElementById("tituloFormularioFatura").textContent = "Editar fatura";
    document.getElementById("btnSalvarFatura").textContent = "Salvar altera\u00e7\u00f5es";
    faturaEditandoId = id;
    atualizarTipoFatura();
    carregarAitsFatura(fatura.aitIndice ?? "");
    const formulario = document.getElementById("formularioFatura");
    formulario.classList.add("mostrar");
    requestAnimationFrame(() => {
        const titulo = document.getElementById("tituloFormularioFatura");
        titulo.setAttribute("tabindex", "-1");
        titulo.focus({ preventScroll: true });
        formulario.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
            block: "start"
        });
    });
}

async function excluirFatura(id) {
    const faturas = lerDados("faturas");
    const fatura = faturas.find(item => String(item.id) === String(id));
    if (!fatura) return;

    // Confirmação de senha e justificativa solicitadas antes da gravação.

    await Banco.setItem("faturas", JSON.stringify(faturas.filter(item => String(item.id) !== String(id))));
    if (faturaEditandoId === id) fecharFormularioFatura();
    atualizarFinanceiro();
    alert("Fatura excluída com sucesso.");
}

async function salvarFatura() {
    sincronizarTotalManualFatura();
    const numero = document.getElementById("numeroFatura").value.trim();
    const clienteSelect = document.getElementById("clienteFatura");
    const cliente = clienteSelect.options[clienteSelect.selectedIndex]?.textContent || "";
    const clienteId = clienteSelect.value;
    const clienteIndice = clienteSelect.options[clienteSelect.selectedIndex]?.dataset.indice;
    const tipo = document.getElementById("tipoFatura").value;
    const contratoSelect = document.getElementById("contratoFatura");
    const contrato = contratoSelect.options[contratoSelect.selectedIndex]?.textContent || "";
    const contratoId = contratoSelect.value;
    const contratoIndice = contratoSelect.options[contratoSelect.selectedIndex]?.dataset.indice;
    const descricao = document.getElementById("descricaoFatura").value.trim();
    const aitSelect = document.getElementById("aitFatura");
    const aitOpcao = aitSelect.options[aitSelect.selectedIndex];
    const aitIndice = aitSelect.value;
    const aitAutoInfracao = aitOpcao?.dataset.ait || "";
    const reutilizacaoAitCondutor = document.getElementById("reutilizacaoAitCondutor").checked;
    const justificativaAit = document.getElementById("justificativaAit").value.trim();
    const vencimento = document.getElementById("vencimentoFatura").value;
    const valorBase = valorNumerico(document.getElementById("valorBaseFatura").value);
    const veiculosCadastrados = lerDados("veiculos");
    const itensVeiculos = Array.from(document.querySelectorAll(".item-veiculo-fatura"))
        .map(elemento => {
            const select = elemento.querySelector(".veiculo-item-fatura");
            const opcao = select.options[select.selectedIndex];
            const indice = opcao?.dataset.indice;
            const veiculo = veiculosCadastrados[indice];
            return {
                veiculoId: select.value,
                veiculoIndice: indice,
                placa: veiculo?.placa || opcao?.textContent.split(" — ")[0] || "",
                modelo: [veiculo?.marca, veiculo?.modelo].filter(Boolean).join(" "),
                ano: veiculo?.ano || "",
                cor: veiculo?.cor || "",
                renavam: veiculo?.renavam || "",
                valor: valorNumerico(elemento.querySelector(".valor-veiculo-item").value)
            };
        })
        .filter(item => item.veiculoId && item.valor > 0);
    const valor = Valores.somar([valorBase, ...itensVeiculos.map(item => item.valor)]);
    document.getElementById("valorFatura").value = valor ? moeda(valor) : "";
    const dataPagamento = document.getElementById("dataPagamentoFatura").value;

    if (!clienteId || !descricao || !vencimento || valor <= 0) {
        alert("Preencha todos os campos obrigatórios da fatura.");
        return;
    }

    if (tipo === "Locação" && !contratoId && !document.getElementById("semContratoFatura").checked) {
        alert("Vincule um contrato às faturas de locação.");
        return;
    }

    const faturas = lerDados("faturas");
    if (tipo === "Multa" && !aitAutoInfracao) {
        alert("Selecione o AIT cadastrado em Multas para emitir a fatura de multa.");
        return;
    }
    const aitJaFaturado = tipo === "Multa" && faturas.some(fatura => fatura.id !== faturaEditandoId && fatura.tipo === "Multa" && normalizarAit(fatura.aitAutoInfracao) === normalizarAit(aitAutoInfracao));
    if (aitJaFaturado && (!reutilizacaoAitCondutor || !justificativaAit)) {
        alert("Este AIT já foi utilizado em outra fatura de multa. A reutilização só é permitida por não identificação de condutor, com justificativa.");
        return;
    }
    if (tipo === "Multa" && reutilizacaoAitCondutor && !justificativaAit) {
        alert("Informe a justificativa para a cobrança por não identificação de condutor.");
        return;
    }
    if (numero && faturas.some(fatura => fatura.id !== faturaEditandoId && String(fatura.numero).toLowerCase() === numero.toLowerCase())) {
        alert("Já existe uma fatura com este número.");
        return;
    }

    const indiceFatura = faturas.findIndex(fatura => fatura.id === faturaEditandoId);
    const faturaAnterior = indiceFatura >= 0 ? faturas[indiceFatura] : null;
    const editando = Boolean(faturaAnterior);
    const faturaSalva = {
        _dbId: faturaAnterior?._dbId,
        semContrato: document.getElementById("semContratoFatura").checked,
        contratosIds: Array.from(contratoSelect.selectedOptions).map(o=>o.value).filter(Boolean),
        id: faturaAnterior?.id || `${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
        numero, tipo, natureza: document.getElementById("naturezaFatura").value, clienteId, clienteIndice, cliente, contratoId, contratoIndice,
        contrato: contratoId ? contrato : "", descricao, vencimento, valorBase, itensVeiculos, valor, dataPagamento,
        aitIndice: tipo === "Multa" ? aitIndice : "", aitAutoInfracao: tipo === "Multa" ? aitAutoInfracao : "",
        reutilizacaoAitCondutor: tipo === "Multa" ? reutilizacaoAitCondutor : false, justificativaAit: tipo === "Multa" ? justificativaAit : "",
        dataCadastro: faturaAnterior?.dataCadastro || new Date().toISOString(),
        emitidoPor: faturaAnterior?.emitidoPor || dadosSessaoAtual()
    };
    if (indiceFatura >= 0) faturas[indiceFatura] = faturaSalva;
    else faturas.push(faturaSalva);
    await Banco.setItem("faturas", JSON.stringify(faturas));
    fecharFormularioFatura();
    atualizarFinanceiro();
    alert(editando ? "Fatura atualizada com sucesso." : "Fatura cadastrada com sucesso."); return true;
}

function situacaoFatura(fatura) {
    if (fatura.dataPagamento) return "Paga";
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(`${fatura.vencimento}T00:00:00`);
    return vencimento < hoje ? "Vencida" : "Pendente";
}

function classeStatusFatura(status) {
    return `status-${String(status || "").toLowerCase().replace(/[^a-z]/g, "")}`;
}

let filtrosFaturasAtivos={};
function aplicarFiltrosFaturas(evento){
 evento.preventDefault();
 const form=document.getElementById("filtrosFaturas");
 const filtros=Object.fromEntries(new FormData(form));
 const erro=document.getElementById("erroFiltrosFaturas");
 if(filtros.dataCampo!=="todos"&&filtros.inicio&&filtros.fim&&filtros.inicio>filtros.fim){erro.textContent="A data inicial deve ser anterior ou igual à data final.";return;}
 erro.textContent="";filtrosFaturasAtivos=filtros;mostrarFaturas();
}
function mostrarFaturas() {
    const todasFaturas = lerDados("faturas").sort((a, b) => String(a.vencimento || "").localeCompare(String(b.vencimento || "")));
    const faturas=FiltrosFaturas.filtrar(todasFaturas,filtrosFaturasAtivos,situacaoFatura,f=>{
      if(typeof FaturamentoVeiculos!=="undefined")return FaturamentoVeiculos.distribuir(f,lerDados("veiculos"),lerDados("contratos"),lerDados("multas")).map(v=>v.placa);
      return (f.itensVeiculos||[]).map(v=>v.placa);
    });
    const pago=Valores.somar(faturas.filter(f=>f.dataPagamento).map(f=>f.valor));
    const total=Valores.somar(faturas.map(f=>f.valor));
    const resumo=document.getElementById("resumoFiltrosFaturas");resumo.replaceChildren();
    for(const [rotulo,valor] of [["Total listado",total],["Pago",pago],["Em aberto",Valores.somar([total,-pago])]]){const card=document.createElement("div"),label=document.createElement("span"),amount=document.createElement("strong");label.textContent=rotulo;amount.textContent=moeda(valor);card.append(label,amount);resumo.append(card);}
    const tabela = document.getElementById("tabelaFaturas");
    const vazio = document.getElementById("mensagemFaturasVazia");
    tabela.innerHTML = SegurancaInterface.html("");
    vazio.style.display = faturas.length ? "none" : "block";
    vazio.textContent=todasFaturas.length?"Nenhuma fatura corresponde aos filtros aplicados.":"Nenhuma fatura cadastrada.";
    faturas.forEach(fatura => {
        const linha = document.createElement("tr");
        const situacao = situacaoFatura(fatura);
        const botaoPagamento = fatura.dataPagamento
            ? ""
            : `<button type="button" class="btn-acao" data-sec-click="h53" data-sec-arg="${SegurancaInterface.escape(fatura.id)}">Pagar</button>`;
        linha.innerHTML = SegurancaInterface.html(`<td data-label="Fatura / cliente"><strong class="fatura-numero">#${escaparHTML(fatura.numero)}</strong><span class="fatura-cliente">${escaparHTML(fatura.cliente)}</span></td><td data-label="Detalhes"><strong>${escaparHTML(fatura.natureza||"Receita")} / ${escaparHTML(fatura.tipo||"-")}</strong><span class="fatura-descricao">${escaparHTML(fatura.descricao)}</span><small>Contrato: ${escaparHTML(fatura.contrato||"-")}</small></td><td data-label="Datas"><span class="fatura-data"><small>Vencimento</small>${dataFormatada(fatura.vencimento)}</span><span class="fatura-data"><small>Pagamento</small>${dataFormatada(fatura.dataPagamento)}</span></td><td data-label="Situação"><span class="status-fatura ${classeStatusFatura(situacao)}">${situacao}</span></td><td data-label="Valor" class="fatura-valor">${moeda(fatura.valor)}</td><td data-label="Ações"><button type="button" class="btn-acao" data-sec-click="h54" data-sec-arg="${SegurancaInterface.escape(fatura.id)}">PDF</button>${botaoPagamento}${fatura.natureza!=="Despesa"&&["administrador","financeiro"].includes(window.usuarioAtual?.perfil)?`<button type="button" class="btn-acao" data-nfse-id="${escaparHTML(fatura.id)}">Emitir NFS-e</button>`:""}</td>`);
        linha.lastElementChild.insertAdjacentHTML("afterbegin", SegurancaInterface.html(`<button type="button" class="btn-acao" data-sec-click="h55" data-sec-arg="${SegurancaInterface.escape(fatura.id)}">Editar</button><button type="button" class="btn-acao btn-excluir" data-sec-click="h56" data-sec-arg="${SegurancaInterface.escape(fatura.id)}">Excluir</button>`));
        tabela.appendChild(linha);
    });
    document.getElementById("contadorFaturas").textContent = `${faturas.length} de ${todasFaturas.length} fatura(s)`;
}

async function registrarPagamentoFatura(id) {
    await editarFatura(id);
    const campo=document.getElementById('dataPagamentoFatura');
    campo.closest('div').classList.add('pagamento-em-destaque');
    if(!campo.value)campo.value=Valores.hoje();
    document.getElementById('tituloFormularioFatura').textContent='Registrar pagamento da fatura '+document.getElementById('numeroFatura').value;
    document.getElementById('btnSalvarFatura').textContent='Confirmar pagamento';
    campo.scrollIntoView({behavior:'smooth',block:'center'});campo.focus();
}

function dadosVinculadosDaFatura(fatura) {
    const clientes = lerDados("clientes");
    const contratos = lerDados("contratos");
    const veiculos = lerDados("veiculos");
    const temReferencia = valor => valor !== undefined && valor !== null && valor !== "";
    const contratoId = fatura.contratoId || fatura.contratosIds?.[0];
    const contrato = temReferencia(contratoId)
        ? contratos.find(item => String(item.id) === String(contratoId))
        : temReferencia(fatura.contratoIndice) ? contratos[Number(fatura.contratoIndice)] : null;
    const clienteId = temReferencia(fatura.clienteId) ? fatura.clienteId : contrato?.clienteId;
    const indiceCliente = temReferencia(fatura.clienteIndice) ? fatura.clienteIndice : contrato?.cliente;
    const cliente = temReferencia(clienteId)
        ? clientes.find(item => String(item.id) === String(clienteId))
        : temReferencia(indiceCliente) ? clientes[Number(indiceCliente)]
        : clientes.find(item => fatura.cliente && (item.nome || item.razaoSocial) === fatura.cliente);
    const veiculoId = fatura.itensVeiculos?.[0]?.veiculoId || contrato?.veiculosDetalhes?.[0]?.id;
    const veiculo = temReferencia(veiculoId)
        ? veiculos.find(item => String(item.id) === String(veiculoId))
        : temReferencia(contrato?.veiculo) ? veiculos[Number(contrato.veiculo)] : null;
    return { cliente, contrato, veiculo };
}

function gerarPdfFatura(id) {
    const fatura = lerDados("faturas").find(item => String(item.id) === String(id));
    if (!fatura) return;
    const situacao = situacaoFatura(fatura);
    const janela = window.open("", "_blank");
    if (!janela) {
        alert("Permita pop-ups no navegador para gerar a fatura em PDF.");
        return;
    }
    const campo = (rotulo, valor) => `<div class="campo"><span>${escaparHTML(rotulo)}</span><strong>${escaparHTML(valor || "-")}</strong></div>`;
    const { cliente, veiculo } = dadosVinculadosDaFatura(fatura);
    const enderecoCliente = cliente
        ? [cliente.endereco, cliente.numero, cliente.complemento, cliente.bairro, cliente.cidade, cliente.estado, cliente.cep].filter(Boolean).join(", ")
        : "";
    const detalhesCliente = cliente
        ? `${campo("CPF/CNPJ", cliente.documento)}${campo("RG", cliente.rg)}${campo("Telefone", cliente.telefone)}${campo("WhatsApp", cliente.whatsapp)}${campo("E-mail", cliente.email)}${campo("Endereço", enderecoCliente)}${campo("CNH", cliente.cnh)}${campo("Categoria CNH", cliente.categoria)}`
        : `<p class="sem-dados">Dados detalhados do cliente não encontrados no cadastro.</p>`;
    const detalhesVeiculo = veiculo
        ? `${campo("Placa", veiculo.placa)}${campo("Marca / modelo", [veiculo.marca, veiculo.modelo].filter(Boolean).join(" / "))}${campo("Ano / cor", [veiculo.ano, veiculo.cor].filter(Boolean).join(" / "))}${campo("Renavam", veiculo.renavam)}${campo("Quilometragem", veiculo.quilometragem ? `${veiculo.quilometragem} km` : "")}`
        : `<p class="sem-dados">Nenhum veículo vinculado a esta fatura.</p>`;
    janela.document.write(SegurancaInterface.html(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Fatura ${escaparHTML(fatura.numero)}</title><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#333;margin:0;padding:0;max-width:100%;overflow-wrap:anywhere}header{border-bottom:3px solid #008fd0;padding-bottom:14px;margin-bottom:24px;break-inside:avoid-page}h1{margin:0;color:#00558b;font-size:25px}h2{font-size:16px;color:#00558b;margin:24px 0 10px;break-after:avoid-page}.sub{color:#666;margin-top:6px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;max-width:100%}.campo{border:1px solid #ddd;padding:11px;min-width:0;min-height:56px;break-inside:avoid-page}.campo span{display:block;color:#777;font-size:12px;margin-bottom:6px}.total{margin-top:22px;background:#eef8fc;border-left:4px solid #008fd0;padding:16px;font-size:20px;break-inside:avoid-page}.rodape{margin-top:28px;border-top:1px solid #ddd;padding-top:10px;color:#777;font-size:11px;break-inside:avoid-page}</style></head><body><header><h1>LOCADORA DIGITAL</h1><p class="sub">Fatura ${escaparHTML(fatura.numero)}</p></header><div class="grid">${campo("Movimentação", fatura.natureza || "Receita")}${campo("Tipo", fatura.tipo)}${campo("Status", situacao)}${campo("Cliente", fatura.cliente)}${campo("Contrato", fatura.contrato)}${campo("Vencimento", dataFormatada(fatura.vencimento))}${campo("Data de pagamento", dataFormatada(fatura.dataPagamento))}</div><h2>Descrição</h2><p>${escaparHTML(fatura.descricao)}</p><div class="total"><strong>Valor da fatura: ${moeda(fatura.valor)}</strong></div><div class="rodape">Documento gerado em ${new Date().toLocaleString("pt-BR")}.</div></body></html>`, true));
    janela.document.close(); LocadoraEventos.bindDocument(janela.document);

    const emitente = fatura.emitidoPor || { nome: "Usuário não identificado", cargo: "Não informado" };
    const empresaDocumento = dadosEmpresaAtual();
    const nomeEmpresaDocumento = empresaDocumento.nome && empresaDocumento.nome.toUpperCase() !== "LOCADORA DIGITAL" ? empresaDocumento.nome : "CENTRAL LOCADORA";
    janela.document.querySelector("header h1").textContent = nomeEmpresaDocumento;
    const identificacaoDocumento = janela.document.createElement("div");
    identificacaoDocumento.className = "identificacao-documento";
    identificacaoDocumento.textContent = "Emitido por: " + emitente.nome + " · " + (emitente.cargo || "Não informado") + " | Emissão: " + new Date().toLocaleString("pt-BR") + " | CNPJ: " + (empresaDocumento.cnpj || "Não cadastrado");
    janela.document.body.appendChild(identificacaoDocumento);
    if (empresaDocumento.imagemCabecalho) {
        const imagemCabecalho = janela.document.createElement("img");
        imagemCabecalho.className = "imagem-cabecalho-documento";
        imagemCabecalho.src = empresaDocumento.imagemCabecalho;
        imagemCabecalho.alt = "Marca da empresa";
        janela.document.querySelector("header").prepend(imagemCabecalho);
    }
    if (fatura.tipo === "Multa" && fatura.aitAutoInfracao) {
        const resumoFatura = janela.document.querySelector(".grid");
        const campoAit = janela.document.createElement("div");
        campoAit.className = "campo";
        campoAit.innerHTML = SegurancaInterface.html("<span>AIT / Auto de infração</span><strong>" + escaparHTML(fatura.aitAutoInfracao) + "</strong>");
        resumoFatura.appendChild(campoAit);
        if (fatura.reutilizacaoAitCondutor) {
            const campoJustificativa = janela.document.createElement("div");
            campoJustificativa.className = "campo";
            campoJustificativa.innerHTML = SegurancaInterface.html("<span>Não identificação de condutor</span><strong>" + escaparHTML(fatura.justificativaAit || "Justificativa não informada") + "</strong>");
            resumoFatura.appendChild(campoJustificativa);
        }
    }

    const dadoClienteCompacto = (rotulo, valor) => `<span><b>${escaparHTML(rotulo)}</b>${escaparHTML(valor || "-")}</span>`;
    const clienteCompacto = cliente
        ? `<div class="linha-cliente linha-cliente-identificacao">${dadoClienteCompacto("CPF/CNPJ", cliente.documento)}${dadoClienteCompacto("RG", cliente.rg)}${dadoClienteCompacto("Telefone", cliente.telefone)}${dadoClienteCompacto("WhatsApp", cliente.whatsapp)}</div><div class="linha-cliente">${dadoClienteCompacto("E-mail", cliente.email)}</div><div class="linha-cliente">${dadoClienteCompacto("Endereço", enderecoCliente)}</div><div class="linha-cliente linha-cliente-cnh">${dadoClienteCompacto("CNH", cliente.cnh)}${dadoClienteCompacto("Categoria CNH", cliente.categoria)}</div>`
        : `<p class="sem-dados">Dados detalhados do cliente não encontrados no cadastro.</p>`;

    const veiculosCadastrados = lerDados("veiculos");
    const itensFaturados = Array.isArray(fatura.itensVeiculos) && fatura.itensVeiculos.length
        ? fatura.itensVeiculos
        : veiculo ? [{ placa: veiculo.placa, modelo: [veiculo.marca, veiculo.modelo].filter(Boolean).join(" "), ano: veiculo.ano, cor: veiculo.cor, renavam: veiculo.renavam, valor: null }] : [];
    const linhasVeiculos = itensFaturados.map(item => {
        const cadastro = veiculosCadastrados.find((veiculoItem, indice) =>
            String(veiculoItem.id) === String(item.veiculoId) || String(indice) === String(item.veiculoIndice)
        );
        const placa = item.placa || cadastro?.placa || "-";
        const modelo = item.modelo || [cadastro?.marca, cadastro?.modelo].filter(Boolean).join(" ") || "-";
        const renavam = item.renavam || cadastro?.renavam;
        const detalhes = [item.ano || cadastro?.ano, item.cor || cadastro?.cor, renavam ? `Renavam ${renavam}` : ""].filter(Boolean).join(" · ");
        return `<div class="linha-veiculo-pdf"><strong>${escaparHTML(placa)}</strong><span>${escaparHTML(modelo)}</span><span>${escaparHTML(detalhes || "-")}</span><strong>${item.valor === null || item.valor === undefined ? "-" : moeda(item.valor)}</strong></div>`;
    }).join("");
    const tabelaVeiculosPdf = linhasVeiculos
        ? `<div class="lista-veiculos-pdf"><div class="cabecalho-veiculos-pdf"><span>Placa</span><span>Veículo</span><span>Detalhes</span><span>Valor</span></div>${linhasVeiculos}</div>`
        : `<p class="sem-dados">Nenhum veículo adicionado a esta fatura.</p>`;

    const detalhes = janela.document.createElement("section");
    detalhes.className = "detalhes-fatura";
    detalhes.innerHTML = SegurancaInterface.html(`<h2>Dados vinculados</h2><div class="dados-partes"><section class="cartao-dados"><h3>Cliente</h3><div class="grid grid-detalhes">${detalhesCliente}</div></section><section class="cartao-dados"><h3>Veículo vinculado</h3><div class="grid grid-detalhes">${detalhesVeiculo}</div></section></div>`);
    detalhes.querySelector("h2").textContent = "Dados do cliente";
    const dadosCliente = detalhes.querySelector(".cartao-dados:first-child .grid-detalhes");
    dadosCliente.className = "dados-cliente-pdf";
    dadosCliente.innerHTML = SegurancaInterface.html(clienteCompacto);
    detalhes.querySelector(".cartao-dados:last-child h3").textContent = "Veículos faturados";
    const listaVeiculos = detalhes.querySelector(".cartao-dados:last-child .grid-detalhes");
    listaVeiculos.className = "lista-veiculos-fatura";
    listaVeiculos.innerHTML = SegurancaInterface.html(tabelaVeiculosPdf);
    janela.document.querySelector(".total").before(detalhes);
    const modeloFatura = SegurancaInterface.rich(empresaDocumento.textoFaturaHtml || empresaDocumento.textoFatura);
    if (modeloFatura) {
        const complementoFatura = janela.document.createElement("section");
        complementoFatura.className = "modelo-fatura";
        complementoFatura.innerHTML = SegurancaInterface.html("<h2>Informações complementares</h2><div></div>");
        complementoFatura.querySelector("div").innerHTML = SegurancaInterface.html(modeloFatura);
        janela.document.querySelector(".total").before(complementoFatura);
    }
    janela.document.querySelector(".grid").classList.add("resumo-fatura");

    const estiloImpressao =
        janela.document.createElement("style");

    estiloImpressao.textContent = `
        @page {
            size: A4;
            margin: 12mm;
        }

        html,
        body {
            width: 100%;
            font-family: "Segoe UI", "Trebuchet MS", Arial, sans-serif !important;
            font-size: 10pt !important;
            line-height: 1.25;
        }

        header {
            padding-bottom: 3mm !important;
            margin-bottom: 4mm !important;
        }

        .imagem-cabecalho-documento {
            display: block;
            max-width: 42mm;
            max-height: 16mm;
            object-fit: contain;
            margin-bottom: 2mm;
        }

        .modelo-fatura {
            margin-top: 4mm;
            padding: 2.5mm 3mm;
            border: 1px solid #c9dce7;
            background: #f8fcfe;
            font-size: 8.5pt;
            line-height: 1.35;
        }

        .modelo-fatura h2 {
            margin-top: 0 !important;
        }

        h1 {
            font-size: 20pt !important;
            letter-spacing: .4px;
        }

        .sub {
            font-size: 10pt !important;
        }

        h2 {
            font-size: 11pt !important;
            margin: 4mm 0 2mm !important;
            letter-spacing: .3px;
            text-transform: uppercase;
        }

        .grid {
            gap: 2mm !important;
        }

        .campo {
            padding: 2.5mm !important;
            min-height: 11mm !important;
            border-color: #c9dce7 !important;
        }

        .campo span {
            font-size: 7.5pt !important;
            color: #537083 !important;
        }

        .campo strong {
            font-size: 9.5pt !important;
            color: #163547 !important;
        }

        .detalhes-fatura {
            break-inside: auto;
        }

        .grid-detalhes .campo {
            min-height: 8mm !important;
            background: #f6fafc;
        }

        .grid-detalhes {
            grid-template-columns: repeat(3, 1fr) !important;
        }

        .resumo-fatura {
            grid-template-columns: repeat(3, 1fr) !important;
            border: 1px solid #b8d4e2;
            padding: 2mm;
            background: #f8fcfe;
        }

        .resumo-fatura .campo {
            min-height: 8mm !important;
            border: 0 !important;
            border-bottom: 1px solid #d7e6ee !important;
            background: transparent !important;
        }

        .dados-partes {
            display: grid;
            grid-template-columns: 1fr;
            gap: 3mm;
        }

        .cartao-dados {
            border: 1px solid #b8d4e2;
            background: #f8fcfe;
            padding: 2.5mm;
        }

        .cartao-dados h3 {
            margin: 0 0 2mm;
            padding-bottom: 1.5mm;
            color: #00558b;
            font-size: 9pt;
            text-transform: uppercase;
            letter-spacing: .45px;
            border-bottom: 2px solid #008fd0;
        }

        .dados-partes .grid-detalhes {
            grid-template-columns: repeat(2, 1fr) !important;
        }

        .dados-partes .grid-detalhes .campo {
            min-height: 6.5mm !important;
            padding: 1.7mm !important;
            background: white;
        }

        .dados-cliente-pdf {
            display: grid;
            gap: 0;
            background: white;
            border: 1px solid #d4e3ea;
        }

        .linha-cliente {
            display: grid;
            grid-template-columns: 1fr;
            padding: 1.4mm 2mm;
            border-top: 1px solid #e2edf2;
            font-size: 8pt;
            line-height: 1.2;
        }

        .linha-cliente:first-child {
            border-top: 0;
        }

        .linha-cliente-identificacao {
            grid-template-columns: repeat(4, 1fr);
            gap: 2mm;
        }

        .linha-cliente-cnh {
            grid-template-columns: repeat(2, 1fr);
            gap: 2mm;
        }

        .linha-cliente span {
            min-width: 0;
            overflow-wrap: anywhere;
        }

        .linha-cliente b {
            color: #537083;
            display: block;
            font-size: 6.8pt;
            font-weight: normal;
            margin-bottom: .4mm;
            text-transform: uppercase;
        }

        .lista-veiculos-pdf,
        .cabecalho-veiculos-pdf,
        .linha-veiculo-pdf {
            width: 100%;
            box-sizing: border-box;
        }

        .cabecalho-veiculos-pdf,
        .linha-veiculo-pdf {
            display: grid;
            grid-template-columns: .8fr 1.25fr 1.4fr .75fr;
            gap: 1.5mm;
            align-items: center;
        }

        .cabecalho-veiculos-pdf {
            background: #00558b;
            color: white;
            padding: 1.7mm;
            font-size: 7pt;
            font-weight: bold;
            text-transform: uppercase;
        }

        .linha-veiculo-pdf {
            padding: 1.8mm;
            border: 1px solid #d4e3ea;
            border-top: 0;
            font-size: 7.8pt;
            line-height: 1.2;
            break-inside: avoid;
        }

        .linha-veiculo-pdf strong:last-child {
            text-align: right;
            color: #00558b;
        }

        .sem-dados {
            color: #666;
            font-style: italic;
        }

        .total {
            margin-top: 4mm !important;
            padding: 3mm !important;
            font-size: 13pt !important;
        }

        .rodape {
            margin-top: 4mm !important;
            font-size: 7.5pt !important;
        }

        .identificacao-documento {
            margin-top: 4mm;
            padding-top: 2mm;
            border-top: 1px solid #d7e3e9;
            text-align: right;
            color: #5d707a;
            font-size: 7.5pt;
            line-height: 1.4;
        }

        .acao-pdf {
            position: fixed;
            top: 16px;
            right: 16px;
            background: #008fd0;
            color: white;
            border: none;
            padding: 12px 18px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
        }

        .documento-pdf {
            background: white;
            width: 100%;
            margin: 0;
            box-sizing: border-box;
        }

        @media screen {
            html {
                background: #e5e5e5;
            }

            body {
                width: 210mm !important;
                max-width: 210mm !important;
                min-height: auto;
                box-sizing: border-box;
                margin: 12px auto !important;
                padding: 8mm !important;
                background: white;
                box-shadow: 0 2px 12px rgba(0,0,0,.25);
                overflow-x: hidden;
            }

            .campo {
                min-height: 11mm !important;
            }

            .documento-pdf {
                margin: 0 !important;
                padding: 10mm !important;
            }
        }

        @media print {
            .acao-pdf {
                display: none !important;
            }

            .documento-pdf {
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border: 1px solid #a8c6d6;
                box-sizing: border-box;
            }
        }
    `;

    janela.document.head.appendChild(estiloImpressao);

    const acaoPdf =
        janela.document.createElement("button");

    acaoPdf.type = "button";
    acaoPdf.className = "acao-pdf";
    acaoPdf.textContent = "Salvar como PDF";

    acaoPdf.addEventListener(
        "click",
        function() {

            janela.print();

        }
    );

    janela.document.body.prepend(acaoPdf);

    const documento =
        janela.document.createElement("main");

    documento.className = "documento-pdf";

    Array.from(
        janela.document.body.children
    ).forEach(
        function(elemento) {

            if (elemento !== acaoPdf) {

                documento.appendChild(elemento);

            }

        }
    );

    janela.document.body.appendChild(documento);

    janela.focus();
}

function sair() {
    localStorage.removeItem("usuarioLogado");
    window.location.href = "LOCADORA_PAGINA_INICIAL.HTML";
}

function atualizarPeriodoFaturas(){
 const form=document.getElementById("filtrosFaturas");
 form.elements.inicio.disabled=false;form.elements.fim.disabled=false;
 document.getElementById("erroFiltrosFaturas").textContent="";
}
function ativarPeriodoDigitadoFaturas(){
 const form=document.getElementById("filtrosFaturas");
 if((form.elements.inicio.value||form.elements.fim.value)&&form.elements.dataCampo.value==="todos"){
  form.elements.dataCampo.value="vencimento";
  form.elements.dataCampo.dispatchEvent(new Event("change",{bubbles:true}));
 }
}
document.querySelector('#filtrosFaturas [name="dataCampo"]').addEventListener("change",()=>{
 const form=document.getElementById("filtrosFaturas");
 if(form.elements.dataCampo.value==="todos"){form.elements.inicio.value="";form.elements.fim.value="";}
 atualizarPeriodoFaturas();
});
for(const nome of ["inicio","fim"]){
 const campo=document.getElementById("filtrosFaturas").elements[nome];
 campo.addEventListener("input",ativarPeriodoDigitadoFaturas);
 campo.addEventListener("change",ativarPeriodoDigitadoFaturas);
}
document.getElementById("filtrosFaturas").addEventListener("reset",()=>setTimeout(atualizarPeriodoFaturas,0));
atualizarPeriodoFaturas();
document.getElementById("filtrosFaturas").addEventListener("submit",aplicarFiltrosFaturas);
document.getElementById("filtrosFaturas").addEventListener("reset",()=>{
 filtrosFaturasAtivos={};document.getElementById("erroFiltrosFaturas").textContent="";mostrarFaturas();
});
document.getElementById("valorFatura").addEventListener("input", sincronizarTotalManualFatura);
configurarCampoMoeda(document.getElementById("valorFatura"));
document.getElementById("contratoFatura").addEventListener("change", calcularTotalFatura);
configurarCampoMoeda(document.getElementById("valorBaseFatura"));
atualizarFinanceiro();

(function(){
 const dialog=document.createElement("dialog");dialog.id="confirmacaoFatura";
 dialog.innerHTML=SegurancaInterface.html('<form method="dialog"><h2 id="tituloConfirmacaoFatura">Confirmar operação</h2><p>Confirme a senha do seu usuário e justifique a alteração. O histórico será preservado.</p><label>Senha do sistema<input id="senhaOperacaoFatura" type="password" autocomplete="current-password" required maxlength="256"></label><label>Justificativa<textarea id="motivoOperacaoFatura" required minlength="10" maxlength="2000" rows="4" placeholder="Explique o motivo da alteração ou exclusão"></textarea></label><div class="confirmacao-acoes"><button type="button" id="cancelarOperacaoFatura">Cancelar</button><button type="submit">Confirmar e gravar</button></div></form>');
 document.body.append(dialog);
 let resolver=null;
 const finish=result=>{const done=resolver;resolver=null;dialog.close();dialog.querySelector("form").reset();if(done)done(result);};
 dialog.querySelector("form").onsubmit=event=>{event.preventDefault();const motivo=document.getElementById("motivoOperacaoFatura");if(motivo.value.trim().length<10){motivo.setCustomValidity("Explique o motivo com pelo menos 10 caracteres.");motivo.reportValidity();return;}finish({senha:document.getElementById("senhaOperacaoFatura").value,justificativa:motivo.value.trim()});};
 document.getElementById("motivoOperacaoFatura").oninput=event=>event.target.setCustomValidity("");
 document.getElementById("cancelarOperacaoFatura").onclick=()=>finish(null);
 dialog.oncancel=event=>{event.preventDefault();finish(null);};
 window.confirmarOperacaoFatura=title=>new Promise(resolve=>{resolver=resolve;document.getElementById("tituloConfirmacaoFatura").textContent=title;dialog.showModal();document.getElementById("senhaOperacaoFatura").focus();});
 const section=document.createElement("section");section.className="historico-faturas tabela-container";
 section.innerHTML=SegurancaInterface.html('<div class="tabela-topo"><div><h2>Histórico de faturas</h2><p>Exclusões e alterações de faturas pagas, com responsável e justificativa.</p></div></div><form id="buscarHistoricoFaturas"><label>Pesquisar por número, cliente ou justificativa<input name="busca" type="search" maxlength="150" placeholder="Buscar no histórico"></label><button type="submit">Pesquisar</button></form><p id="estadoHistoricoFaturas" role="status">Clique em Pesquisar para consultar o histórico.</p><div id="listaHistoricoFaturas"></div><div class="historico-paginacao"><button type="button" id="historicoAnterior">Anterior</button><span id="paginaHistoricoFaturas"></span><button type="button" id="historicoProxima">Próxima</button></div>');
 document.querySelector(".tabela-faturas").after(section);
 let page=1,total=0,busca="";
 async function carregar(){
  const state=document.getElementById("estadoHistoricoFaturas"),list=document.getElementById("listaHistoricoFaturas");
  state.textContent="Carregando histórico…";list.replaceChildren();
  try{
   const result=await api.get("/operacao/faturas/historico?pagina="+page+"&busca="+encodeURIComponent(busca));total=result.total;
   for(const row of result.data){
    const card=document.createElement("article"),title=document.createElement("h3"),meta=document.createElement("p"),reason=document.createElement("p"),details=document.createElement("details"),summary=document.createElement("summary"),body=document.createElement("pre");
    title.textContent="Fatura "+row.anterior.numero+" — "+(row.acao==="FATURA_EXCLUIDA"?"Excluída":"Alterada");
    meta.textContent=[row.anterior.cliente,moeda(row.anterior.valor),new Date(row.data).toLocaleString("pt-BR"),row.registro.responsavel].filter(Boolean).join(" · ");
    reason.textContent="Justificativa: "+row.registro.justificativa;summary.textContent="Consultar dados registrados";
    const a=row.anterior,n=row.registro.alteracoes;
    body.textContent=["Descrição: "+a.descricao,"Tipo: "+a.tipo,"Contrato: "+(a.contrato||"-"),"Vencimento: "+dataFormatada(a.vencimento),"Pagamento: "+dataFormatada(a.dataPagamento),"Veículos: "+(a.itensVeiculos||[]).map(v=>v.placa).join(", "),n?"Após alteração: "+n.descricao+" | Valor: "+moeda(n.valor)+" | Pagamento: "+dataFormatada(n.dataPagamento):""].filter(Boolean).join("\n");
    details.append(summary,body);card.append(title,meta,reason,details);list.append(card);
   }
   state.textContent=total?total+" registro(s) encontrado(s).":"Nenhum registro encontrado.";
   document.getElementById("paginaHistoricoFaturas").textContent="Página "+page+" de "+Math.max(1,Math.ceil(total/25));
  }catch(error){state.textContent=error.message;}
  document.getElementById("historicoAnterior").disabled=page<=1;document.getElementById("historicoProxima").disabled=page*25>=total;
 }
 document.getElementById("buscarHistoricoFaturas").onsubmit=event=>{event.preventDefault();page=1;busca=event.target.elements.busca.value;carregar();};
 document.getElementById("historicoAnterior").onclick=()=>{if(page>1){page--;carregar();}};
 document.getElementById("historicoProxima").onclick=()=>{if(page*25<total){page++;carregar();}};
 document.getElementById("historicoAnterior").disabled=true;document.getElementById("historicoProxima").disabled=true;
})();

document.getElementById("semContratoFatura").addEventListener("change",event=>{
 const select=document.getElementById("contratoFatura");
 select.disabled=event.target.checked;
 if(event.target.checked)Array.from(select.options).forEach(option=>option.selected=false);
 calcularTotalFatura();
 atualizarTipoFatura();
});
