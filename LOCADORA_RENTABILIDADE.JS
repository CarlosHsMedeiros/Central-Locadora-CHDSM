(function () {
    "use strict";

    const ler = chave => { try { return JSON.parse(Banco.getItem(chave)) || []; } catch (_) { return []; } };
    const salvar = (chave, valor) => Banco.setItem(chave, JSON.stringify(valor));
    const numero = valor => {
        if (typeof valor === "number") return valor;
        const texto = String(valor || "").trim();
        return Number((texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto).replace(/[^0-9.-]/g, "")) || 0;
    };
    const dinheiro = valor => numero(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const iso = data => new Date(`${data}T12:00:00`);
    const hojeIso = () => Valores.hoje();
    const indicesVeiculos = contrato => (Array.isArray(contrato.veiculos) && contrato.veiculos.length ? contrato.veiculos : [contrato.veiculo])
        .filter(valor => valor !== undefined && valor !== null && valor !== "").map(Number);
    const contratoAtivoNaData = (contrato, data) => contrato.status === "Ativo" && contrato.dataInicio <= data && (!contrato.dataFim || contrato.dataFim >= data);
    const idContrato = (contrato, indice) => String(contrato.id ?? indice);
    const idCliente = (cliente, indice) => String(cliente.id ?? indice);

    function projetarQuitacao(indiceVeiculo, veiculo) {
        return FaturamentoVeiculos.resumo(veiculo, ler("faturas"), ler("veiculos"), ler("contratos"), ler("multas"));
    }

    function iniciarVeiculos() {
        const placa = document.getElementById("placa");
        const grade = placa?.closest(".form-grid");
        if (!grade || document.getElementById("valorCompra")) return;
        grade.insertAdjacentHTML("beforeend", SegurancaInterface.html(`
            <div class="campo"><label>Data da compra</label><input type="date" id="dataCompra"></div>
            <div class="campo"><label>Valor da compra</label><input type="text" id="valorCompra" inputmode="decimal" placeholder="R$ 0,00"></div>
            `));

        document.getElementById("valorCompra").addEventListener("blur", event => { const valor = numero(event.target.value); event.target.value = valor ? dinheiro(valor) : ""; });
        const originalLimpar = window.limparFormulario;
        window.limparFormulario = function () { originalLimpar(); document.getElementById("dataCompra").value = ""; document.getElementById("valorCompra").value = ""; };
        const originalEditar = window.editarVeiculo;
        if (originalEditar) window.editarVeiculo = function (indice) {
            originalEditar(indice); const v = (typeof acharVeiculo === "function" ? acharVeiculo(indice) : ler("veiculos")[indice]) || {};
            document.getElementById("dataCompra").value = v.dataCompra || "";
            document.getElementById("valorCompra").value = v.valorCompra ? dinheiro(v.valorCompra) : "";
        };
        const originalFicha = window.abrirFicha;
        window.abrirFicha = function (indice) {
            originalFicha(indice); const v = typeof acharVeiculo === "function" ? acharVeiculo(indice) : ler("veiculos")[indice]; if (!v) return; const r = projetarQuitacao(indice, v);
            let painel = document.getElementById("rentabilidadeVeiculo");
            if (!painel) { painel = document.createElement("div"); painel.id = "rentabilidadeVeiculo"; painel.className = "ficha-secao"; document.querySelector("#modalFicha .ficha").appendChild(painel); }
            const campos = [["Receitas faturadas", r.emitido], ["Receitas recebidas", r.recebido], ["A receber", r.areceber], ["Despesas faturadas", r.custo], ["Despesas pagas", r.pago], ["A pagar", r.apagar], ["Saldo das faturas", r.saldo], ["Saldo realizado", r.saldoPago]];
            painel.innerHTML = SegurancaInterface.html(`<div class="ficha-titulo">Resultado por placa</div><div class="status-grid">${campos.map(([rotulo, valor]) => `<div class="status-item"><span>${rotulo}</span><strong>${dinheiro(valor)}</strong></div>`).join("")}</div><p>Somente faturas vinculadas a este veículo. O saldo realizado considera as faturas pagas.</p>`);
        };
    }

    function contratosDoClienteSelecionado() {
        const cliente = document.getElementById("clienteFatura");
        const indice = cliente?.options[cliente.selectedIndex]?.dataset.indice;
        return ler("contratos").map((contrato, i) => ({ contrato, indice: i })).filter(item => String(item.contrato.cliente ?? item.contrato.clienteIndice) === String(indice));
    }

    function preencherItensDosContratos() {
        const seletor = document.getElementById("contratoFatura"); if (!seletor) return;
        const selecionados = Array.from(seletor.selectedOptions).map(opcao => Number(opcao.dataset.indice));
        const contratos = ler("contratos"), veiculos = ler("veiculos"), itens = [];
        selecionados.forEach(indice => {
            const c = contratos[indice]; if (!c) return; const ids = indicesVeiculos(c), rateios = Valores.ratear(c.valorLocacao, Math.max(1, ids.length));
            ids.forEach((vi, posicaoRateio) => { const v = veiculos[vi]; if (v) itens.push({ veiculoId: v.id ?? vi, veiculoIndice: vi, placa: v.placa, modelo: [v.marca,v.modelo].filter(Boolean).join(" "), valor: rateios[posicaoRateio], contratoId: idContrato(c, indice), contratoIndice: indice, contrato: c.numeroContrato || c.numero }); });
        });
        const agrupados=new Map();for(const item of itens){const old=agrupados.get(String(item.veiculoId));if(old)old.valor=Valores.somar([old.valor,item.valor]);else agrupados.set(String(item.veiculoId),{...item});}
        if (window.carregarItensVeiculosFatura) window.carregarItensVeiculosFatura([...agrupados.values()]);
    }

    async function gerarFaturasMensais() {
        const hoje = hojeIso(), competencia = hoje.slice(0, 7), contratos = ler("contratos"), clientes = ler("clientes"), veiculos = ler("veiculos"), faturas = ler("faturas");
        clientes.forEach((cliente, ci) => {
            const ativos = contratos.map((contrato, i) => ({ contrato, i })).filter(x => String(x.contrato.cliente ?? x.contrato.clienteIndice) === String(ci) && contratoAtivoNaData(x.contrato, `${competencia}-01`));
            if (!ativos.length || faturas.some(f => f.automatica && f.competencia === competencia && String(f.clienteIndice) === String(ci))) return;
            const itens = []; ativos.forEach(({ contrato, i }) => { const ids = indicesVeiculos(contrato), rateios = Valores.ratear(contrato.valorLocacao, Math.max(1, ids.length)); ids.forEach((vi, posicao) => { const v=veiculos[vi]; if(v) itens.push({veiculoId:v.id??vi,veiculoIndice:vi,placa:v.placa,modelo:[v.marca,v.modelo].filter(Boolean).join(" "),valor:rateios[posicao],contratoId:idContrato(contrato,i),contratoIndice:i,contrato:contrato.numeroContrato||contrato.numero}); }); });
            const agrupados=new Map();for(const item of itens){const old=agrupados.get(String(item.veiculoId));if(old)old.valor=Valores.somar([old.valor,item.valor]);else agrupados.set(String(item.veiculoId),{...item});}itens.splice(0,itens.length,...agrupados.values());
            faturas.push({ id:`auto-${competencia}-${idCliente(cliente,ci)}`, numero:"", tipo:"Locação", clienteId:idCliente(cliente,ci), clienteIndice:ci, cliente:cliente.nome||cliente.razaoSocial||`Cliente ${ci+1}`, contratosIds:ativos.map(x=>idContrato(x.contrato,x.i)), contratos:ativos.map(x=>x.contrato.numeroContrato||x.contrato.numero), contrato:ativos.map(x=>x.contrato.numeroContrato||x.contrato.numero).join(", "), descricao:`Locações de ${competencia}`, vencimento:`${competencia}-01`, valorBase:0, itensVeiculos:itens, valor:Valores.somar(itens.map(i=>i.valor)), dataPagamento:"", automatica:true, competencia, dataCadastro:new Date().toISOString() });
        });
        await salvar("faturas", faturas);
    }

    function iniciarFinanceiro() {
        const seletor = document.getElementById("contratoFatura"); if (!seletor) return;
        seletor.multiple = true; seletor.size = 4; seletor.previousElementSibling.innerHTML = SegurancaInterface.html("Contratos e placas vinculados <span id=\"obrigatoriedadeContrato\">*</span>");
        const originalCarregar = window.carregarContratosFatura;
        window.carregarContratosFatura = function () { originalCarregar(); Array.from(seletor.options).forEach(o => { if (o.value) { const c=ler("contratos")[Number(o.dataset.indice)]; const placas=indicesVeiculos(c||{}).map(i=>ler("veiculos")[i]?.placa).filter(Boolean).join(", "); o.textContent += placas ? ` — ${placas}` : ""; } }); };
        seletor.addEventListener("change", preencherItensDosContratos);
        const originalEditar = window.editarFatura;
        window.editarFatura = async function (id) {
            await originalEditar(id);
            const fatura = ler("faturas").find(item => String(item.id) === String(id));
            const ids = (fatura?.contratosIds || [fatura?.contratoId]).filter(valor => valor !== undefined && valor !== null && valor !== "").map(String);
            Array.from(seletor.options).forEach(opcao => opcao.selected = ids.includes(String(opcao.value)));
        };
        if(window.atualizarFinanceiro) window.atualizarFinanceiro();
        const botao=document.createElement("button");botao.type="button";botao.textContent="Gerar faturas do mês";botao.onclick=async()=>{botao.disabled=true;try{await gerarFaturasMensais();atualizarFinanceiro();}catch(error){console.error(error.message);}finally{botao.disabled=false;}};botao.className="btn-atualizar";document.querySelector(".acoes-cabecalho").appendChild(botao);
    }

    iniciarVeiculos();
    iniciarFinanceiro();
    window.LocadoraRentabilidade = { projetarQuitacao, gerarFaturasMensais };
}());
