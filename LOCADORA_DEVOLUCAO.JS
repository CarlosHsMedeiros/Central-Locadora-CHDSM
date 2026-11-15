(function () {
    "use strict";
    let indiceContratoDevolucao = null;

    function hoje() { return Valores.hoje(); }
    function indicesDoContrato(contrato) {
        return (Array.isArray(contrato.veiculos) && contrato.veiculos.length ? contrato.veiculos : [contrato.veiculo]).filter(valor => valor !== undefined && valor !== null).map(Number);
    }
    function ocultarCamposDevolucaoDoCadastro() {
        ["combustivelDevolucao", "quilometragemFinal"].forEach(id => {
            const campo = document.getElementById(id)?.closest(".campo");
            if (campo) { campo.hidden = true; campo.classList.add("campo-exclusivo-devolucao"); }
        });
    }
    function criarModal() {
        if (document.getElementById("modalDevolucao")) return;
        document.body.insertAdjacentHTML("beforeend", SegurancaInterface.html(`
            <div class="modal" id="modalDevolucao">
                <div class="modal-conteudo modal-devolucao">
                    <div class="modal-cabecalho"><div><h2>Devolução do veículo</h2><span id="devolucaoSubtitulo">Contrato</span></div><button class="modal-fechar" type="button" data-sec-click="h41">✕</button></div>
                    <div class="devolucao-aviso">Registre os dados conferidos no momento em que os veículos retornarem. A conclusão encerrará o contrato.</div>
                    <div class="form-grid devolucao-grid">
                        <div class="campo"><label>Data da devolução *</label><input id="dataDevolucao" type="date"></div>
                        <div class="campo"><label>Quilometragem final *</label><input id="kmDevolucao" type="text" inputmode="numeric" placeholder="Ex.: 18.500 km" data-sec-input="h0"></div>
                        <div class="campo"><label>Combustível na devolução *</label><select id="combustivelDevolucaoModal"><option value="">Selecione</option><option>0/8</option><option>1/8</option><option>2/8</option><option>3/8</option><option>4/8</option><option>5/8</option><option>6/8</option><option>7/8</option><option>8/8</option></select></div>
                        <div class="campo"><label>Destino dos veículos *</label><select id="destinoDevolucao"><option value="Disponível">Disponível</option><option value="No Estacionamento A">No Estacionamento A</option><option value="No Estacionamento B">No Estacionamento B</option><option value="No Estacionamento C">No Estacionamento C</option><option value="Na Oficina">Na Oficina</option></select></div>
                        <div class="campo campo-completo"><label>Observações da devolução</label><textarea id="observacoesDevolucao" rows="4" placeholder="Avarias, pendências, condições de entrega ou outras observações"></textarea></div>
                    </div>
                    <div class="modal-rodape"><button class="btn-cancelar" type="button" data-sec-click="h41">Cancelar</button><button class="btn-salvar" id="btnConcluirDevolucao" type="button" data-sec-click="h42">Concluir devolução</button></div>
                </div>
            </div>`));
        document.getElementById("modalDevolucao").addEventListener("click", event => { if (event.target === event.currentTarget) fecharDevolucao(); });
    }
    function adicionarBotoes() {
        document.querySelectorAll("#tabelaContratos tr").forEach(linha => {
            const acoes = linha.querySelector(".acoes-contrato");
            if (!acoes || acoes.querySelector(".btn-devolucao")) return;
            const ficha = acoes.querySelector(".btn-ficha");
            const correspondencia = ficha?.getAttribute("data-sec-arg")?.match(/^(\d+)$/);
            if (!correspondencia) return;
            const indice = Number(correspondencia[1]);
            const contrato = contratos[indice];
            if (!contrato || contrato.status === "Cancelado") return;
            const botao = document.createElement("button");
            botao.type = "button"; botao.className = "btn-devolucao";
            botao.textContent = contrato.dataDevolucao || contrato.quilometragemFinal ? "Ver devolução" : "Devolução";
            botao.addEventListener("click", () => abrirDevolucao(indice));
            acoes.insertBefore(botao, acoes.querySelector(".btn-excluir"));
        });
    }
    window.abrirDevolucao = function (indice) {
        const contrato = contratos[indice]; if (!contrato) return;
        indiceContratoDevolucao = indice;
        const concluida = Boolean(contrato.dataDevolucao || contrato.quilometragemFinal);
        document.getElementById("devolucaoSubtitulo").textContent = `${contrato.numeroContrato} • ${typeof nomeCliente === "function" ? nomeCliente(contrato.cliente) : ""}`;
        document.getElementById("dataDevolucao").value = contrato.dataDevolucao || (concluida ? contrato.dataFim : hoje());
        document.getElementById("dataDevolucao").min = contrato.dataInicio || "";
        document.getElementById("kmDevolucao").value = contrato.quilometragemFinal || "";
        document.getElementById("combustivelDevolucaoModal").value = contrato.combustivelDevolucao || "";
        document.getElementById("destinoDevolucao").value = contrato.destinoDevolucao || "Disponível";
        document.getElementById("observacoesDevolucao").value = contrato.observacoesDevolucao || "";
        document.getElementById("btnConcluirDevolucao").textContent = concluida ? "Atualizar devolução" : "Concluir devolução";
        document.getElementById("modalDevolucao").classList.add("mostrar");
    };
    window.fecharDevolucao = function () { document.getElementById("modalDevolucao")?.classList.remove("mostrar"); indiceContratoDevolucao = null; };
    window.salvarDevolucao = async function () {
        const contract=contratos[indiceContratoDevolucao];if(!contract)return;
        const button=document.getElementById("btnConcluirDevolucao");if(button.disabled)return;
        const payload={dataDevolucao:document.getElementById("dataDevolucao").value,quilometragemFinal:document.getElementById("kmDevolucao").value.replace(/\D/g,""),combustivelDevolucao:document.getElementById("combustivelDevolucaoModal").value,destinoDevolucao:document.getElementById("destinoDevolucao").value,observacoesDevolucao:document.getElementById("observacoesDevolucao").value.trim()};
        if(!payload.dataDevolucao||payload.quilometragemFinal===""||!payload.combustivelDevolucao){alert("Preencha os campos obrigatórios da devolução.");return;}
        button.disabled=true;
        try{
            const response=await api.post("/contratos/"+encodeURIComponent(contract.id)+"/devolucao",payload);
            const item=response.data,linked=item.veiculos||[];
            Object.assign(contract,item,{cliente:String(item.clienteId),veiculos:linked.map(v=>String(v.id)),veiculosDetalhes:linked});
            fecharDevolucao();mostrarContratos();alert("Devolução registrada no banco e contrato finalizado.");
        }catch(error){alert(error.message);}finally{button.disabled=false;}
    };
    criarModal(); ocultarCamposDevolucaoDoCadastro();
    const mostrarOriginal = window.mostrarContratos;
    window.mostrarContratos = function () { mostrarOriginal.apply(this, arguments); adicionarBotoes(); };
    adicionarBotoes();
}());
