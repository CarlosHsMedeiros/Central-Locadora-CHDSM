(function () {
    "use strict";

    function mensagem(erro) { return erro?.message || "Não foi possível concluir a operação."; }
    function adaptar(item) {
        const vinculados = item.veiculos || [];
        return { ...item, cliente: String(item.clienteId), veiculo: vinculados[0] ? String(vinculados[0].id) : "", veiculos: vinculados.map(v => String(v.id)), veiculosDetalhes: vinculados,
            historicoContratantes: (item.historicoContratantes || []).map(h => ({...h,cliente:String(h.clienteId || item.clienteId)})) };
    }
    async function listar(busca = "") {
        try {
            const resposta = {data: await api.todos(`/contratos?busca=${encodeURIComponent(busca)}`)};
            contratos = (resposta.data || []).map(adaptar);
            mostrarContratos(contratos);
        } catch (erro) { alert(mensagem(erro)); }
    }
    async function cadastros() {
        const [c, v] = await Promise.all([api.todos("/clientes"), api.todos("/veiculos")]);
        clientes = c;
        veiculos = v;
        carregarClientes();
        carregarVeiculos();
    }

    carregarClientes = function () {
        const select = document.getElementById("cliente");
        select.innerHTML = SegurancaInterface.html('<option value="">Selecione o cliente</option>');
        clientes.filter(c => c.situacao !== "Inativo").forEach(c => select.appendChild(new Option(c.nome || c.razaoSocial || `Cliente ${c.id}`, String(c.id))));
    };
    carregarVeiculos = function () {
        const select = document.getElementById("veiculo");
        select.innerHTML = SegurancaInterface.html('<option value="">Selecione um ou mais veículos</option>');
        veiculos.filter(v => v.situacao !== "Inativo").forEach(v => select.appendChild(new Option(`${v.placa || "-"} — ${v.marca || ""} ${v.modelo || ""}`, String(v.id))));
        atualizarSeletorVeiculos();
    };
    nomeCliente = function (id) { const c = clientes.find(item => String(item.id) === String(id)); return c?.nome || c?.razaoSocial || "Cliente não encontrado"; };
    nomeVeiculo = function (id) { const v = veiculos.find(item => String(item.id) === String(id)); return v ? `${v.placa || "-"} — ${v.marca || ""} ${v.modelo || ""}` : "Veículo não encontrado"; };

    abrirFormulario = async function () {
        try { await cadastros(); }
        catch (erro) { alert(mensagem(erro)); return; }
        document.getElementById("cliente").disabled = false;
        document.getElementById("formulario").classList.add("mostrar");
        if (indiceEdicao === null) document.getElementById("numeroContrato").value = "Gerado ao salvar";
    };

    salvarContrato = async function () {
        const clienteId = document.getElementById("cliente").value;
        const veiculoIds = Array.from(document.getElementById("veiculo").selectedOptions).map(o => o.value).filter(Boolean);
        const payload = {
            clienteId, veiculoIds, modalidade: document.getElementById("modalidade").value,
            dataInicio: document.getElementById("dataInicio").value, dataFim: document.getElementById("dataFim").value,
            valorLocacao: valorNumericoContrato(document.getElementById("valorLocacao").value),
            quilometragemInicial: window.digitosMascara(document.getElementById("quilometragemInicial").value),
            limiteQuilometragem: window.digitosMascara(document.getElementById("limiteQuilometragem").value),
            combustivelRetirada: document.getElementById("combustivelRetirada").value,
            combustivelDevolucao: document.getElementById("combustivelDevolucao").value,
            quilometragemFinal: window.digitosMascara(document.getElementById("quilometragemFinal").value),
            status: document.getElementById("status").value, observacoes: document.getElementById("observacoes").value.trim()
        };
        try {
            if (indiceEdicao === null) await api.post("/contratos", payload);
            else await api.put(`/contratos/${contratos[indiceEdicao].id}`, payload);
            fecharFormulario(); await listar(document.getElementById("campoPesquisa").value.trim());
        } catch (erro) { alert(mensagem(erro)); }
    };

    editarContrato = async function (indice) {
        const contrato = contratos[indice];
        if (!contrato) return;
        try { await cadastros(); } catch (erro) { alert(mensagem(erro)); return; }
        indiceEdicao = indice;
        document.getElementById("formulario").classList.add("mostrar");
        document.getElementById("numeroContrato").value = contrato.numeroContrato || "";
        document.getElementById("cliente").value = String(contrato.clienteId);
        document.getElementById("cliente").disabled = true;
        const ids = (contrato.veiculos || []).map(String);
        Array.from(document.getElementById("veiculo").options).forEach(o => { o.selected = ids.includes(o.value); });
        atualizarSeletorVeiculos();
        ["modalidade","dataInicio","dataFim","quilometragemInicial","limiteQuilometragem","combustivelRetirada","combustivelDevolucao","quilometragemFinal","status","observacoes"].forEach(campo => {
            const elemento = document.getElementById(campo); if (elemento) elemento.value = contrato[campo] ?? "";
        });
        document.getElementById("valorLocacao").value = contrato.valorLocacao || "";
        formatarCampoMoedaContrato(document.getElementById("valorLocacao"));
        atualizarModalidade();
    };

    excluirContrato = async function (indice) {
        const contrato = contratos[indice];
        if (!contrato || !confirm(`Excluir o contrato ${contrato.numeroContrato}?`)) return;
        try { await api.delete(`/contratos/${contrato.id}`); await listar(document.getElementById("campoPesquisa").value.trim()); }
        catch (erro) { alert(mensagem(erro)); }
    };
    abrirTrocaContratante = function (indice) {
        const contrato=contratos[indice]; if(!contrato)return;
        if(contrato.status!=="Ativo"){alert("A troca de contratante só pode ser registrada em contratos ativos.");return;}
        const select=document.getElementById("novoContratante");select.innerHTML=SegurancaInterface.html('<option value="">Selecione o cliente</option>');
        clientes.filter(c=>String(c.id)!==String(contrato.clienteId)&&c.situacao!=="Inativo").forEach(c=>select.appendChild(new Option(c.nome||c.razaoSocial,String(c.id))));
        document.getElementById("dataTrocaContratante").value="";document.getElementById("dataTrocaContratante").min=contrato.dataInicio;document.getElementById("dataTrocaContratante").max=contrato.dataFim;
        document.getElementById("trocaContratanteSubtitulo").textContent=`${contrato.numeroContrato} • atual: ${nomeCliente(contrato.clienteId)}`;indiceFicha=indice;document.getElementById("modalTrocaContratante").classList.add("mostrar");
    };
    salvarTrocaContratante = async function () {
        const contrato=contratos[indiceFicha],clienteId=document.getElementById("novoContratante").value,dataInicio=document.getElementById("dataTrocaContratante").value;
        if(!contrato||!clienteId||!dataInicio){alert("Selecione o novo contratante e a data de vigência.");return;}
        try{await api.post(`/contratos/${contrato.id}/trocar-contratante`,{clienteId,dataInicio});fecharTrocaContratante();await listar(document.getElementById("campoPesquisa").value.trim());alert("Contratante alterado e histórico preservado no banco de dados.");}
        catch(erro){alert(mensagem(erro));}
    };
    pesquisarContratos = function () { listar(document.getElementById("campoPesquisa").value.trim()); };

    cadastros().then(() => listar()).catch(erro => alert(mensagem(erro)));
}());
