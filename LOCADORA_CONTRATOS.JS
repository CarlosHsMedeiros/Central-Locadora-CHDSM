/* =====================================
   USUÁRIO
===================================== */

const usuario =
    Banco.getItem("usuarioLogado");


if (usuario) {

    document.getElementById(
        "nomeUsuario"
    ).textContent = usuario;

}


/* =====================================
   DADOS
===================================== */

let contratos =
    JSON.parse(
        Banco.getItem("contratos")
    ) || [];


let clientes =
    JSON.parse(
        Banco.getItem("clientes")
    ) || [];


let veiculos =
    JSON.parse(
        Banco.getItem("veiculos")
    ) || [];


let indiceEdicao = null;

let indiceFicha = null;


/* =====================================
   CARREGAR CLIENTES
===================================== */

function carregarClientes() {

    const select =
        document.getElementById("cliente");

    select.innerHTML = SegurancaInterface.html(`
        <option value="">
            Selecione o cliente
        </option>
    `);


    clientes.forEach(
        (cliente, indice) => {

            const option =
                document.createElement("option");


            option.value = indice;


            option.textContent =
                cliente.nome ||
                cliente.razaoSocial ||
                `Cliente ${indice + 1}`;


            select.appendChild(option);

        }
    );

}


/* =====================================
   CARREGAR VEÍCULOS
===================================== */

function carregarVeiculos() {

    const select =
        document.getElementById("veiculo");

    select.innerHTML = SegurancaInterface.html(`
        <option value="">
            Selecione o veículo
        </option>
    `);


    veiculos.forEach(
        (veiculo, indice) => {

            const option =
                document.createElement("option");


            option.value = indice;


            option.textContent =
                `${veiculo.placa || "-"} — ${veiculo.marca || ""} ${veiculo.modelo || ""}`;


            select.appendChild(option);

        }
    );

    atualizarSeletorVeiculos();

}

function atualizarSeletorVeiculos() {
    const select = document.getElementById("veiculo");
    const opcoes = document.getElementById("opcoesVeiculos");
    const resumo = document.getElementById("resumoVeiculos");
    if (!select || !opcoes || !resumo) return;

    const opcoesValidas = Array.from(select.options).filter(opcao => opcao.value !== "");
    opcoes.innerHTML = SegurancaInterface.html("");
    if (!opcoesValidas.length) {
        opcoes.innerHTML = SegurancaInterface.html('<p class="vazio-veiculos">Nenhum veículo disponível.</p>');
        resumo.textContent = "Nenhum veículo disponível";
        return;
    }

    const atualizarResumo = () => {
        const selecionadas = opcoesValidas.filter(opcao => opcao.selected);
        resumo.textContent = !selecionadas.length ? "Selecione um ou mais veículos" : (selecionadas.length === 1 ? selecionadas[0].text : `${selecionadas.length} veículos selecionados`);
    };

    opcoesValidas.forEach(opcao => {
        const rotulo = document.createElement("label");
        rotulo.className = "opcao-veiculo";
        const caixa = document.createElement("input");
        caixa.type = "checkbox";
        caixa.checked = opcao.selected;
        caixa.addEventListener("change", () => {
            opcao.selected = caixa.checked;
            atualizarResumo();
        });
        const texto = document.createElement("span");
        texto.textContent = opcao.text;
        rotulo.append(caixa, texto);
        opcoes.appendChild(rotulo);
    });
    atualizarResumo();
}

function valorNumericoContrato(valor) {
    const texto = String(valor ?? "").trim().replace(/R\$\s?/g, "").replace(/\s/g, "");
    if (!texto) return 0;
    const normalizado = texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto;
    return Number(normalizado.replace(/[^0-9.-]/g, "")) || 0;
}

function formatarCampoMoedaContrato(campo) {
    if (!campo) return;
    const valor = valorNumericoContrato(campo.value);
    campo.value = valor ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
}


/* =====================================
   FORMULÁRIO
===================================== */

function abrirFormulario() {

    carregarClientes();

    document.getElementById("cliente").disabled = false;

    carregarVeiculos();


    document.getElementById(
        "formulario"
    ).classList.add("mostrar");

}


function fecharFormulario() {

    document.getElementById(
        "formulario"
    ).classList.remove("mostrar");


    limparFormulario();


    indiceEdicao = null;

}


/* =====================================
   LIMPAR FORMULÁRIO
===================================== */

function limparFormulario() {

    document.getElementById(
        "numeroContrato"
    ).value = "";


    document.getElementById(
        "cliente"
    ).value = "";


    document.getElementById(
        "veiculo"
    ).value = "";


    document.getElementById(
        "modalidade"
    ).value = "Diária";


    document.getElementById(
        "dataInicio"
    ).value = "";


    document.getElementById(
        "dataFim"
    ).value = "";


    document.getElementById(
        "valorLocacao"
    ).value = "";


    document.getElementById(
        "caucao"
    ).value = "";


    document.getElementById(
        "quilometragemInicial"
    ).value = "";


    document.getElementById(
        "limiteQuilometragem"
    ).value = "";


    document.getElementById(
        "combustivelRetirada"
    ).value = "4/8";


    document.getElementById(
        "combustivelDevolucao"
    ).value = "";


    document.getElementById(
        "quilometragemFinal"
    ).value = "";


    document.getElementById(
        "status"
    ).value = "Ativo";


    document.getElementById(
        "observacoes"
    ).value = "";

}


/* =====================================
   MODALIDADE
===================================== */

function atualizarModalidade() {

    const modalidade =
        document.getElementById(
            "modalidade"
        ).value;


    const label =
        document.querySelector(
            'label[for="valorLocacao"]'
        );


    if (!label) {
        return;
    }


    if (modalidade === "Diária") {

        label.textContent =
            "Valor da diária *";

    }

    else if (modalidade === "Semanal") {

        label.textContent =
            "Valor semanal *";

    }

    else if (modalidade === "Quinzenal") {

        label.textContent =
            "Valor quinzenal *";

    }

    else if (modalidade === "Mensal") {

        label.textContent =
            "Valor mensal *";

    }

}


/* =====================================
   SALVAR
===================================== */

function salvarContrato() {

    const numeroContrato =
        document.getElementById(
            "numeroContrato"
        ).value.trim();


    const cliente =
        document.getElementById(
            "cliente"
        ).value;


    const veiculosSelecionados = Array.from(document.getElementById("veiculo").selectedOptions)
        .map(opcao => opcao.value)
        .filter(valor => valor !== "");
    const veiculo = veiculosSelecionados[0] || "";


    const modalidade =
        document.getElementById(
            "modalidade"
        ).value;


    const dataInicio =
        document.getElementById(
            "dataInicio"
        ).value;


    const dataFim =
        document.getElementById(
            "dataFim"
        ).value;


    const valorLocacaoTexto =
        document.getElementById(
            "valorLocacao"
        ).value;


    const caucaoTexto =
        document.getElementById(
            "caucao"
        ).value;


    const valorLocacao = valorNumericoContrato(valorLocacaoTexto);
    const caucao = valorNumericoContrato(caucaoTexto);

    const quilometragemInicial =
        document.getElementById(
            "quilometragemInicial"
        ).value;


    const limiteQuilometragem =
        document.getElementById(
            "limiteQuilometragem"
        ).value;


    const combustivelRetirada =
        document.getElementById(
            "combustivelRetirada"
        ).value;


    const combustivelDevolucao =
        document.getElementById(
            "combustivelDevolucao"
        ).value;


    const quilometragemFinal =
        document.getElementById(
            "quilometragemFinal"
        ).value;


    const status =
        document.getElementById(
            "status"
        ).value;


    const observacoes =
        document.getElementById(
            "observacoes"
        ).value.trim();



    if (
        !numeroContrato ||
        cliente === "" ||
        veiculo === "" ||
        !dataInicio ||
        !dataFim ||
        !valorLocacao
    ) {

        alert(
            "Preencha todos os campos obrigatórios."
        );

        return;

    }



    const contrato = {

        numeroContrato,

        cliente:
            Number(cliente),

        veiculo:
            Number(veiculo),

        veiculos: veiculosSelecionados.map(Number),

        modalidade,

        dataInicio,

        dataFim,

        valorLocacao,

        caucao,

        quilometragemInicial,

        limiteQuilometragem,

        combustivelRetirada,

        combustivelDevolucao,

        quilometragemFinal,

        status,

        observacoes,

        historicoContratantes:
            indiceEdicao === null
                ? [{ cliente: Number(cliente), nome: nomeCliente(cliente), dataInicio, dataFim: null }]
                : historicoContratantes(contratos[indiceEdicao])

    };



    if (indiceEdicao === null) {

        contratos.push(
            contrato
        );

    }

    else {

        contratos[
            indiceEdicao
        ] = contrato;

    }



    localStorage.setItem(
        "contratos",
        JSON.stringify(contratos)
    );


    fecharFormulario();

    mostrarContratos();

}


/* =====================================
   NOME CLIENTE
===================================== */

function nomeCliente(indice) {

    const cliente =
        clientes[indice];


    if (!cliente) {

        return "Cliente não encontrado";

    }


    return (
        cliente.nome ||
        cliente.razaoSocial ||
        "Cliente"
    );

}

function historicoContratantes(contrato) {
    if (Array.isArray(contrato.historicoContratantes) && contrato.historicoContratantes.length) {
        return contrato.historicoContratantes;
    }

    return [{
        cliente: Number(contrato.cliente),
        nome: nomeCliente(contrato.cliente),
        dataInicio: contrato.dataInicio,
        dataFim: null
    }];
}

function diaAnterior(data) {
    const dia = new Date(`${data}T12:00:00`);
    dia.setDate(dia.getDate() - 1);
    return `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, "0")}-${String(dia.getDate()).padStart(2, "0")}`;
}


/* =====================================
   NOME VEÍCULO
===================================== */

function nomeVeiculo(indice) {

    const veiculo =
        veiculos[indice];


    if (!veiculo) {

        return "Veículo não encontrado";

    }


    return `${veiculo.placa || "-"} — ${veiculo.marca || ""} ${veiculo.modelo || ""}`;

}


/* =====================================
   FORMATAÇÃO DE DATA
===================================== */

function formatarData(data) {

    if (!data) {
        return "-";
    }


    const partes =
        data.split("-");


    if (partes.length !== 3) {
        return data;
    }


    return `${partes[2]}/${partes[1]}/${partes[0]}`;

}


/* =====================================
   FORMATAÇÃO MONETÁRIA
===================================== */

function formatarMoeda(valor) {

    const numero =
        Number(valor) || 0;


    return numero.toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );

}


/* =====================================
   MOSTRAR CONTRATOS
===================================== */

function mostrarContratos(
    lista = contratos
) {

    const tabela =
        document.getElementById(
            "tabelaContratos"
        );


    const mensagem =
        document.getElementById(
            "mensagemVazia"
        );


    tabela.innerHTML = SegurancaInterface.html("");



    if (lista.length === 0) {

        mensagem.style.display =
            "block";

    }

    else {

        mensagem.style.display =
            "none";

    }



    lista.forEach(
        (contrato, indice) => {

            const linha =
                document.createElement(
                    "tr"
                );


            linha.innerHTML = SegurancaInterface.html(`

                <td>
                    <strong>
                        ${contrato.numeroContrato}
                    </strong>
                </td>


                <td>
                    ${nomeCliente(contrato.cliente)}
                </td>


                <td>
                    ${nomeVeiculo(contrato.veiculo)}
                </td>


                <td>
                    ${formatarData(contrato.dataInicio)}
                    até
                    ${formatarData(contrato.dataFim)}
                </td>


                <td>
                    ${contrato.modalidade}
                </td>


                <td>
                    ⛽ ${contrato.combustivelRetirada || "-"}
                </td>


                <td>
                    ${formatarMoeda(contrato.valorLocacao)}
                </td>


                <td>

                    <span class="
                        status
                        ${classeStatus(contrato.status)}
                    ">

                        ${contrato.status}

                    </span>

                </td>


                <td>

                    <div class="acoes-contrato">

                    <button
                        class="btn-ficha"
                        data-sec-click="h37" data-sec-arg="${SegurancaInterface.escape(indice)}">

                        Ficha

                    </button>


                    <button
                        class="btn-editar"
                        data-sec-click="h38" data-sec-arg="${SegurancaInterface.escape(indice)}">

                        Editar

                    </button>


                    <button
                        class="btn-trocar-contratante"
                        data-sec-click="h39" data-sec-arg="${SegurancaInterface.escape(indice)}">

                        Novo CNPJ

                    </button>



                    <button
                        class="btn-excluir"
                        data-sec-click="h40" data-sec-arg="${SegurancaInterface.escape(indice)}">

                        Excluir

                    </button>

                    </div>

                </td>

            `);


            tabela.appendChild(
                linha
            );

        }
    );


    document.getElementById(
        "contador"
    ).textContent =

        `${lista.length} contrato(s)`;

}


/* =====================================
   STATUS
===================================== */

function classeStatus(status) {

    if (status === "Ativo") {
        return "ativo";
    }


    if (status === "Finalizado") {
        return "finalizado";
    }


    return "cancelado";

}


/* =====================================
   EDITAR
===================================== */

function editarContrato(
    indice
) {

    const contrato =
        contratos[indice];


    if (!contrato) {

        return;

    }


    abrirFormulario();


    document.getElementById(
        "numeroContrato"
    ).value =
        contrato.numeroContrato || "";


    document.getElementById(
        "cliente"
    ).value =
        contrato.cliente ?? "";

    document.getElementById("cliente").disabled = true;
    document.getElementById("cliente").title = "Use o botão Trocar contratante para preservar o histórico.";


    document.getElementById(
        "veiculo"
    ).value =
        contrato.veiculo ?? "";

    const veiculosDoContrato = Array.isArray(contrato.veiculos) && contrato.veiculos.length ? contrato.veiculos : [contrato.veiculo];
    Array.from(document.getElementById("veiculo").options).forEach(opcao => {
        opcao.selected = veiculosDoContrato.map(String).includes(opcao.value);
    });
    atualizarSeletorVeiculos();


    document.getElementById(
        "modalidade"
    ).value =
        contrato.modalidade || "Diária";


    document.getElementById(
        "dataInicio"
    ).value =
        contrato.dataInicio || "";


    document.getElementById(
        "dataFim"
    ).value =
        contrato.dataFim || "";


    document.getElementById(
        "valorLocacao"
    ).value =
        contrato.valorLocacao || "";
    formatarCampoMoedaContrato(document.getElementById("valorLocacao"));


    document.getElementById(
        "caucao"
    ).value =
        contrato.caucao || "";
    formatarCampoMoedaContrato(document.getElementById("caucao"));


    document.getElementById(
        "quilometragemInicial"
    ).value =
        contrato.quilometragemInicial || "";


    document.getElementById(
        "limiteQuilometragem"
    ).value =
        contrato.limiteQuilometragem || "";


    document.getElementById(
        "combustivelRetirada"
    ).value =
        contrato.combustivelRetirada || "4/8";


    document.getElementById(
        "combustivelDevolucao"
    ).value =
        contrato.combustivelDevolucao || "";


    document.getElementById(
        "quilometragemFinal"
    ).value =
        contrato.quilometragemFinal || "";


    document.getElementById(
        "status"
    ).value =
        contrato.status || "Ativo";


    document.getElementById(
        "observacoes"
    ).value =
        contrato.observacoes || "";


    indiceEdicao =
        indice;


    atualizarModalidade();

}


/* =====================================
   EXCLUIR
===================================== */

function abrirTrocaContratante(indice) {
    const contrato = contratos[indice];
    if (!contrato) return;
    if (contrato.status !== "Ativo") {
        alert("A troca de contratante só pode ser registrada em contratos ativos.");
        return;
    }

    const select = document.getElementById("novoContratante");
    select.innerHTML = SegurancaInterface.html('<option value="">Selecione o cliente</option>');
    clientes.forEach((cliente, indiceCliente) => {
        if (Number(indiceCliente) === Number(contrato.cliente)) return;
        select.appendChild(new Option(cliente.nome || cliente.razaoSocial || `Cliente ${indiceCliente + 1}`, indiceCliente));
    });
    document.getElementById("dataTrocaContratante").value = "";
    document.getElementById("dataTrocaContratante").min = contrato.dataInicio || "";
    document.getElementById("dataTrocaContratante").max = contrato.dataFim || "";
    document.getElementById("trocaContratanteSubtitulo").textContent = `${contrato.numeroContrato} • atual: ${nomeCliente(contrato.cliente)}`;
    indiceFicha = indice;
    document.getElementById("modalTrocaContratante").classList.add("mostrar");
}

function fecharTrocaContratante() {
    document.getElementById("modalTrocaContratante").classList.remove("mostrar");
}

function salvarTrocaContratante() {
    if (indiceFicha === null || !contratos[indiceFicha]) return;
    const contrato = contratos[indiceFicha];
    const novoCliente = document.getElementById("novoContratante").value;
    const dataTroca = document.getElementById("dataTrocaContratante").value;
    if (novoCliente === "" || !dataTroca) {
        alert("Selecione o novo contratante e a data de vigência.");
        return;
    }

    const historico = historicoContratantes(contrato);
    const atual = historico[historico.length - 1];
    if (dataTroca <= atual.dataInicio || dataTroca > contrato.dataFim) {
        alert("A data da troca deve estar dentro do período do contrato e ser posterior ao início do contratante atual.");
        return;
    }

    atual.dataFim = diaAnterior(dataTroca);
    historico.push({
        cliente: Number(novoCliente),
        nome: nomeCliente(novoCliente),
        dataInicio: dataTroca,
        dataFim: null
    });
    contrato.cliente = Number(novoCliente);
    contrato.historicoContratantes = historico;
    localStorage.setItem("contratos", JSON.stringify(contratos));
    fecharTrocaContratante();
    mostrarContratos();
    alert("Contratante alterado e histórico registrado com sucesso.");
}

function excluirContrato(
    indice
) {

    const confirmar =
        confirm(
            "Deseja realmente excluir este contrato?"
        );


    if (!confirmar) {
        return;
    }


    contratos.splice(
        indice,
        1
    );


    localStorage.setItem(
        "contratos",
        JSON.stringify(contratos)
    );


    mostrarContratos();

}


/* =====================================
   PESQUISA
===================================== */

function pesquisarContratos() {

    const pesquisa =
        document.getElementById(
            "campoPesquisa"
        ).value
        .toLowerCase()
        .trim();


    const resultado =
        contratos.filter(
            contrato => {

                const cliente =
                    nomeCliente(
                        contrato.cliente
                    ).toLowerCase();


                const veiculo =
                    nomeVeiculo(
                        contrato.veiculo
                    ).toLowerCase();


                const numero =
                    (
                        contrato.numeroContrato ||
                        ""
                    ).toLowerCase();


                const modalidade =
                    (
                        contrato.modalidade ||
                        ""
                    ).toLowerCase();


                return (

                    numero.includes(pesquisa)

                    ||

                    cliente.includes(pesquisa)

                    ||

                    veiculo.includes(pesquisa)

                    ||

                    modalidade.includes(pesquisa)

                );

            }
        );


    mostrarContratos(
        resultado
    );

}


/* =====================================
   ABRIR FICHA
===================================== */

function abrirFicha(
    indice
) {

    const contrato =
        contratos[indice];


    indiceFicha =
        indice;


    document.getElementById(
        "fichaSubtitulo"
    ).textContent =

        `${contrato.numeroContrato} • ${nomeCliente(contrato.cliente)}`;


    document.getElementById(
        "fichaNumero"
    ).textContent =
        contrato.numeroContrato || "-";


    document.getElementById(
        "fichaStatus"
    ).textContent =
        contrato.status || "-";


    document.getElementById(
        "fichaModalidade"
    ).textContent =
        contrato.modalidade || "-";


    document.getElementById(
        "fichaCliente"
    ).textContent =
        nomeCliente(contrato.cliente);


    document.getElementById(
        "fichaVeiculo"
    ).textContent =
        nomeVeiculo(contrato.veiculo);


    document.getElementById(
        "fichaPeriodo"
    ).textContent =

        `${formatarData(contrato.dataInicio)} até ${formatarData(contrato.dataFim)}`;


    document.getElementById(
        "fichaValor"
    ).textContent =
        formatarMoeda(contrato.valorLocacao);


    document.getElementById(
        "fichaCombustivelRetirada"
    ).textContent =
        contrato.combustivelRetirada || "-";


    document.getElementById(
        "fichaCombustivelDevolucao"
    ).textContent =
        contrato.combustivelDevolucao ||
        "Ainda não devolvido";


    document.getElementById(
        "fichaKmInicial"
    ).textContent =

        contrato.quilometragemInicial
            ? `${contrato.quilometragemInicial} km`
            : "-";


    document.getElementById(
        "fichaKmFinal"
    ).textContent =

        contrato.quilometragemFinal
            ? `${contrato.quilometragemFinal} km`
            : "Ainda não devolvido";


    document.getElementById(
        "fichaKmLimite"
    ).textContent =

        contrato.limiteQuilometragem
            ? `${contrato.limiteQuilometragem} km`
            : "-";


    let utilizado = "-";


    if (
        contrato.quilometragemInicial &&
        contrato.quilometragemFinal
    ) {

        utilizado =
            Number(
                contrato.quilometragemFinal
            )
            -
            Number(
                contrato.quilometragemInicial
            );


        utilizado =
            `${utilizado} km`;

    }


    document.getElementById(
        "fichaKmUtilizado"
    ).textContent =
        utilizado;


    document.getElementById(
        "fichaObservacoes"
    ).textContent =

        contrato.observacoes ||
        "Nenhuma observação registrada.";

    document.getElementById("fichaHistoricoContratantes").innerHTML =
        SegurancaInterface.html(historicoContratantes(contrato).map(item => `
            <div class="historico-contratante-item">
                <div>
                    <strong>${escaparHTMLContrato(item.nome || nomeCliente(item.cliente))}</strong>
                    <small><b>CPF/CNPJ:</b> ${escaparHTMLContrato(item.documento || "Não informado")}</small>
                    <small><b>Telefone:</b> ${escaparHTMLContrato(item.telefone || "-")} · <b>WhatsApp:</b> ${escaparHTMLContrato(item.whatsapp || "-")}</small>
                    <small><b>E-mail:</b> ${escaparHTMLContrato(item.email || "Não informado")}</small>
                </div>
                <span>${formatarData(item.dataInicio)} até ${item.dataFim ? formatarData(item.dataFim) : "atual"}</span>
            </div>
        `).join(""));


    document.getElementById(
        "modalFicha"
    ).classList.add(
        "mostrar"
    );
    let drivePanel=document.getElementById("driveDocsContrato");if(!drivePanel){drivePanel=document.createElement("section");drivePanel.id="driveDocsContrato";document.querySelector("#modalFicha .ficha").append(drivePanel);}api.drivePanel("contrato",contrato.id,drivePanel);

}

function escaparHTMLContrato(valor) {
    return String(valor ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function gerarPdfContrato() {
    if (indiceFicha === null || !contratos[indiceFicha]) {
        alert("Abra a ficha do contrato antes de gerar o PDF.");
        return;
    }

    const contrato = contratos[indiceFicha];
    const cliente = clientes.find(item => String(item.id) === String(contrato.cliente)) || {};
    const veiculo = veiculos.find(item => String(item.id) === String(contrato.veiculo)) || {};
    let configuracoesEmpresa = {};
    let sessaoDocumento = {};
    try { configuracoesEmpresa = JSON.parse(Banco.getItem("configuracoesEmpresa")) || {}; sessaoDocumento = JSON.parse(Banco.getItem("sessaoUsuario")) || {}; } catch (erro) {}
    const janela = window.open("", "_blank");
    if (!janela) {
        alert("Permita pop-ups no navegador para gerar o contrato em PDF.");
        return;
    }

    const clienteNome = cliente.nome || cliente.razaoSocial || nomeCliente(contrato.cliente);
    const clienteEndereco = [cliente.endereco, cliente.numero, cliente.complemento, cliente.bairro, cliente.cidade, cliente.estado, cliente.cep].filter(Boolean).join(", ");
    const veiculoDescricao = [veiculo.marca, veiculo.modelo, veiculo.ano ? `Ano ${veiculo.ano}` : "", veiculo.cor].filter(Boolean).join(" · ");
    const item = (rotulo, valor) => `<div class="item"><span>${escaparHTMLContrato(rotulo)}</span><strong>${escaparHTMLContrato(valor || "-")}</strong></div>`;
    const clausula = (numero, titulo, texto) => `<section class="clausula"><h3>CLÁUSULA ${numero} — ${escaparHTMLContrato(titulo)}</h3><p>${texto}</p></section>`;
    const historico = historicoContratantes(contrato).map(itemHistorico => `<li><strong>${escaparHTMLContrato(itemHistorico.nome || nomeCliente(itemHistorico.cliente))}</strong> — CPF/CNPJ ${escaparHTMLContrato(itemHistorico.documento || "não informado")}; telefone ${escaparHTMLContrato(itemHistorico.telefone || itemHistorico.whatsapp || "não informado")}; e-mail ${escaparHTMLContrato(itemHistorico.email || "não informado")}: de ${formatarData(itemHistorico.dataInicio)} até ${itemHistorico.dataFim ? formatarData(itemHistorico.dataFim) : "a vigência atual"}.</li>`).join("");

    janela.document.write(SegurancaInterface.html(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Contrato ${escaparHTMLContrato(contrato.numeroContrato)}</title><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:"Segoe UI",Arial,sans-serif;color:#20313b;margin:0;font-size:11pt;line-height:1.5}header{border-bottom:4px solid #008fd0;padding-bottom:12px;margin-bottom:18px;display:flex;justify-content:space-between;gap:20px}h1{margin:0;color:#00558b;font-size:24px}header p{margin:3px 0 0;color:#64727a}.numero{font-weight:700;color:#00558b;text-align:right}.bloco{border:1px solid #cbdde6;background:#f8fcfe;margin:12px 0}.bloco h2{margin:0;padding:8px 12px;background:#eaf6fb;color:#00558b;font-size:13px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0;padding:8px}.item{padding:7px 8px;border-right:1px solid #dce9ef;border-bottom:1px solid #dce9ef;min-height:48px}.item span{display:block;font-size:9px;color:#59727f;text-transform:uppercase}.item strong{font-size:10px}.clausula{margin:13px 0;break-inside:avoid}.clausula h3{font-size:11px;color:#00558b;margin:0 0 4px}.clausula p{margin:0;text-align:justify}.historico{padding-left:20px;margin:4px 0}.assinaturas{display:grid;grid-template-columns:repeat(2,1fr);gap:45px;margin-top:45px;break-inside:avoid}.assinatura{border-top:1px solid #4b5960;text-align:center;padding-top:6px;font-size:10px}.rodape{margin-top:22px;border-top:1px solid #d7e0e5;padding-top:8px;font-size:9px;color:#6b7880}.acao-pdf{position:fixed;right:18px;top:18px;background:#008fd0;color:#fff;border:1px solid #008fd0;padding:11px 16px;font-weight:bold;cursor:pointer}@media print{.acao-pdf{display:none}}</style></head><body><button class="acao-pdf" data-sec-click="h2">Salvar como PDF</button><header><div><h1>LOCADORA DIGITAL</h1><p>Contrato de locação de veículo</p></div><div class="numero">CONTRATO<br>${escaparHTMLContrato(contrato.numeroContrato)}</div></header><div class="bloco"><h2>Partes e dados do contrato</h2><div class="grid">${item("Contratante", clienteNome)}${item("CPF/CNPJ", cliente.documento)}${item("Telefone", cliente.telefone || cliente.whatsapp)}${item("E-mail", cliente.email)}${item("Endereço", clienteEndereco)}${item("Período", `${formatarData(contrato.dataInicio)} até ${formatarData(contrato.dataFim)}`)}${item("Veículo", veiculoDescricao)}${item("Placa / Renavam", `${veiculo.placa || "-"} / ${veiculo.renavam || "-"}`)}${item("Modalidade / valor", `${contrato.modalidade || "-"} / ${formatarMoeda(contrato.valorLocacao)}`)}</div></div>${clausula("1", "Objeto", `A LOCADORA DIGITAL entrega ao CONTRATANTE o veículo ${escaparHTMLContrato(veiculoDescricao || "descrito neste contrato")}, placa ${escaparHTMLContrato(veiculo.placa || "-")}, nas condições registradas nesta contratação.`)}${clausula("2", "Prazo", `A locação inicia-se em ${formatarData(contrato.dataInicio)} e termina em ${formatarData(contrato.dataFim)}. Qualquer prorrogação deverá ser formalizada antes do término da vigência.`)}${clausula("3", "Preço e pagamento", `O valor da locação é de ${formatarMoeda(contrato.valorLocacao)}, na modalidade ${escaparHTMLContrato(contrato.modalidade || "contratada")} e nas condições acordadas entre as partes.`)}${clausula("4", "Uso e quilometragem", `O veículo será utilizado exclusivamente pelo contratante e condutores autorizados. A quilometragem de retirada é ${escaparHTMLContrato(contrato.quilometragemInicial || "-")} km, com limite previsto de ${escaparHTMLContrato(contrato.limiteQuilometragem || "-")} km.`)}${clausula("5", "Combustível e conservação", `O veículo é entregue com nível de combustível ${escaparHTMLContrato(contrato.combustivelRetirada || "-")}. O contratante deverá devolvê-lo nas mesmas condições de conservação, ressalvado o desgaste natural de uso.`)}${clausula("6", "Multas, danos e responsabilidades", `Infrações de trânsito, danos, avarias, despesas de limpeza e demais encargos originados durante a posse do veículo são de responsabilidade do contratante, observadas as comprovações e a legislação aplicável.`)}${clausula("7", "Alteração de contratante", `Qualquer substituição de contratante é registrada com data de vigência, preservando a responsabilidade de cada parte no período correspondente.<ul class="historico">${historico}</ul>`)}${clausula("8", "Devolução e encerramento", `Ao final da locação será realizada vistoria de devolução, com conferência de quilometragem, combustível, documentos, acessórios e eventuais danos. O contrato será encerrado após a apuração dos valores pendentes.`)}${clausula("9", "Disposições gerais", `As partes declaram que leram e concordam com as condições deste contrato. Os casos não previstos serão resolvidos de acordo com a legislação brasileira aplicável.`)}<div class="assinaturas"><div class="assinatura">LOCADORA DIGITAL<br>LOCADORA</div><div class="assinatura">${escaparHTMLContrato(clienteNome)}<br>CONTRATANTE</div></div><div class="rodape">Documento gerado em ${new Date().toLocaleString("pt-BR")}. Contrato ${escaparHTMLContrato(contrato.numeroContrato)}.</div></body></html>`, true));
    janela.document.close(); LocadoraEventos.bindDocument(janela.document);
    const estiloVisualizacao = janela.document.createElement("style");
    estiloVisualizacao.textContent = `
        @media screen {
            html { background: #e5e5e5; }
            body { width: 210mm; min-height: 297mm; margin: 14px auto; padding: 12mm; background: #fff; box-shadow: 0 2px 14px rgba(0,0,0,.25); }
            .acao-pdf { position: fixed; }
        }
        .imagem-cabecalho-documento { max-width: 150px; max-height: 46px; object-fit: contain; align-self: flex-start; }
        .clausulas-personalizadas { margin: 13px 0; }
        .clausulas-personalizadas h3 { font-size: 11px; color: #00558b; margin: 13px 0 4px; }
        .clausulas-personalizadas p { margin: 0; text-align: justify; }
        @media print {
            @page { size: A4; margin: 12mm; }
            body { margin: 0; padding: 0; max-width: 100%; overflow-wrap: anywhere; background: #fff; }
            *, *::before, *::after { box-sizing: border-box; }
            .bloco, .grid, .item, .clausula, .assinaturas { max-width: 100%; }
            .bloco, .item, .clausula, .assinaturas { break-inside: avoid-page; }
            img, svg { max-width: 100%; height: auto; }
            .acao-pdf { display: none !important; }
        }
    `;
    janela.document.head.appendChild(estiloVisualizacao);
    const nomeEmpresaDocumento = configuracoesEmpresa.nome && configuracoesEmpresa.nome.toUpperCase() !== "LOCADORA DIGITAL" ? configuracoesEmpresa.nome : "CENTRAL LOCADORA";
    janela.document.querySelector("header h1").textContent = nomeEmpresaDocumento;
    const assinaturaLocadora = janela.document.querySelector(".assinaturas .assinatura:first-child");
    if (assinaturaLocadora) assinaturaLocadora.innerHTML = SegurancaInterface.html(escaparHTMLContrato(nomeEmpresaDocumento) + "<br>LOCADORA");
    const veiculosContratoPdf = (Array.isArray(contrato.veiculos) && contrato.veiculos.length ? contrato.veiculos : [contrato.veiculo])
        .map(indice => veiculos[indice])
        .filter(Boolean);
    const resumoVeiculos = veiculosContratoPdf.map(veiculoItem => [veiculoItem.marca, veiculoItem.modelo, veiculoItem.placa ? "placa " + veiculoItem.placa : ""].filter(Boolean).join(" · ")).join("; ");
    const clausulaObjeto = janela.document.querySelector(".clausula p");
    if (clausulaObjeto && resumoVeiculos) {
        clausulaObjeto.textContent = "A LOCADORA DIGITAL entrega ao CONTRATANTE os veículos relacionados neste contrato: " + resumoVeiculos + ". As condições da locação estão registradas neste documento.";
    }
    if (configuracoesEmpresa.imagemCabecalho) {
        const imagemCabecalho = janela.document.createElement("img");
        imagemCabecalho.className = "imagem-cabecalho-documento";
        imagemCabecalho.src = configuracoesEmpresa.imagemCabecalho;
        imagemCabecalho.alt = "Marca da empresa";
        janela.document.querySelector("header").prepend(imagemCabecalho);
    }
    const blocoVeiculos = janela.document.createElement("section");
    blocoVeiculos.className = "bloco";
    blocoVeiculos.innerHTML = SegurancaInterface.html("<h2>Veículos incluídos na locação</h2><div class=\"grid\"></div>");
    const gradeVeiculos = blocoVeiculos.querySelector(".grid");
    veiculosContratoPdf.forEach((veiculoItem, indice) => {
        const campoVeiculo = janela.document.createElement("div");
        campoVeiculo.className = "item";
        campoVeiculo.innerHTML = SegurancaInterface.html("<span>Veículo " + (indice + 1) + "</span><strong>" + escaparHTMLContrato([veiculoItem.marca, veiculoItem.modelo, veiculoItem.ano ? "Ano " + veiculoItem.ano : "", veiculoItem.cor].filter(Boolean).join(" · ")) + "<br>Placa: " + escaparHTMLContrato(veiculoItem.placa || "-") + " · Renavam: " + escaparHTMLContrato(veiculoItem.renavam || "-") + "</strong>");
        gradeVeiculos.appendChild(campoVeiculo);
    });
    janela.document.querySelector(".bloco").after(blocoVeiculos);
    const modeloClausulas = SegurancaInterface.rich(configuracoesEmpresa.textoContratoHtml || configuracoesEmpresa.textoContrato);
    if (configuracoesEmpresa.modeloCompletoContrato && modeloClausulas) {
        const marcadores = {
            "[EMPRESA]": escaparHTMLContrato(nomeEmpresaDocumento),
            "[EMPRESA_CNPJ]": escaparHTMLContrato(configuracoesEmpresa.cnpj || "não cadastrado"),
            "[EMPRESA_ENDERECO]": escaparHTMLContrato(configuracoesEmpresa.endereco || "não cadastrado"),
            "[CONTRATANTE]": escaparHTMLContrato(clienteNome),
            "[CLIENTE_DOCUMENTO]": escaparHTMLContrato(cliente.documento || "não informado"),
            "[CLIENTE_ENDERECO]": escaparHTMLContrato(clienteEndereco || "não informado"),
            "[CLIENTE_TELEFONE]": escaparHTMLContrato(cliente.telefone || cliente.whatsapp || "não informado"),
            "[CLIENTE_EMAIL]": escaparHTMLContrato(cliente.email || "não informado"),
            "[VEICULOS]": escaparHTMLContrato(resumoVeiculos || "não informado"),
            "[DATA_INICIO]": escaparHTMLContrato(formatarData(contrato.dataInicio)),
            "[DATA_FIM]": escaparHTMLContrato(formatarData(contrato.dataFim)),
            "[PERIODO]": escaparHTMLContrato(formatarData(contrato.dataInicio) + " até " + formatarData(contrato.dataFim)),
            "[VALOR]": escaparHTMLContrato(formatarMoeda(contrato.valorLocacao)),
            "[MODALIDADE]": escaparHTMLContrato(contrato.modalidade || "-"),
            "[OBJETO]": escaparHTMLContrato(contrato.observacoes || "Objeto não informado."),
            "[OBSERVACOES]": escaparHTMLContrato(contrato.observacoes || "Sem observações registradas.")
        };
        let clausulasPersonalizadas = modeloClausulas;
        Object.entries(marcadores).forEach(([marcador, valor]) => {
            clausulasPersonalizadas = clausulasPersonalizadas.split(marcador).join(valor);
        });
        const modeloCompleto = janela.document.createElement("section");
        modeloCompleto.className = "clausulas-personalizadas";
        modeloCompleto.innerHTML = SegurancaInterface.html(clausulasPersonalizadas);
        const tituloComplementar = Array.from(modeloCompleto.querySelectorAll("h3")).find(titulo => titulo.textContent.trim().toLowerCase().includes("condições complementares"));
        if (tituloComplementar) {
            let textoComplementar = tituloComplementar.nextElementSibling;
            if (!textoComplementar || textoComplementar.tagName !== "P") {
                textoComplementar = janela.document.createElement("p");
                tituloComplementar.after(textoComplementar);
            }
            textoComplementar.textContent = contrato.observacoes || "Sem observações registradas para este contrato.";
        }
        janela.document.querySelectorAll(".clausula").forEach(clausulaPadrao => clausulaPadrao.remove());
        janela.document.querySelector(".assinaturas").before(modeloCompleto);
    } else if (modeloClausulas) {
        const complemento = janela.document.createElement("section");
        complemento.className = "clausula";
        complemento.innerHTML = SegurancaInterface.html("<h3>OBJETO</h3><p></p>");
        complemento.querySelector("p").textContent = contrato.observacoes || "Objeto não informado nas observações do contrato.";
        janela.document.querySelector(".assinaturas").before(complemento);
    }
    Array.from(janela.document.querySelectorAll("p")).filter(paragrafo => paragrafo.textContent.trim() === "E, por estarem de acordo, as partes firmam o presente instrumento.").forEach(paragrafo => paragrafo.remove());
    const encerramento = janela.document.createElement("p");
    encerramento.className = "encerramento-contrato";
    encerramento.textContent = "E, por estarem de acordo, as partes firmam o presente instrumento.";
    janela.document.querySelector(".assinaturas").before(encerramento);
    const identificacao = janela.document.createElement("div");
    identificacao.className = "rodape";
    identificacao.style.textAlign = "right";
    identificacao.textContent = "Emitido por: " + (sessaoDocumento.nome || "Usuário não identificado") + " · " + (sessaoDocumento.cargo || "Não informado") + " · CNPJ: " + (configuracoesEmpresa.cnpj || "Não cadastrado") + " · " + new Date().toLocaleString("pt-BR");
    janela.document.body.appendChild(identificacao);
    janela.focus();
}


/* =====================================
   FECHAR FICHA
===================================== */

function fecharFicha() {

    document.getElementById(
        "modalFicha"
    ).classList.remove(
        "mostrar"
    );


    indiceFicha =
        null;

}


/* =====================================
   EDITAR PELA FICHA
===================================== */

function editarDaFicha() {

    if (
        indiceFicha ===
        null
    ) {
        return;
    }


    const indice =
        indiceFicha;


    fecharFicha();


    editarContrato(
        indice
    );

}


/* =====================================
   FECHAR MODAL FORA
===================================== */

document.getElementById(
    "modalFicha"
).addEventListener(
    "click",
    function(event) {

        if (
            event.target ===
            this
        ) {

            fecharFicha();

        }

    }
);

document.getElementById("modalTrocaContratante").addEventListener("click", function(event) {
    if (event.target === this) fecharTrocaContratante();
});


/* =====================================
   ESC
===================================== */

document.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key ===
            "Escape"
        ) {

            fecharFicha();
            fecharTrocaContratante();

        }

    }
);


/* =====================================
   SAIR
===================================== */

function sair() {

    localStorage.removeItem(
        "usuarioLogado"
    );


    window.location.href =
        "LOCADORA_PAGINA_INICIAL.HTML";

}

try {
    let sessaoConfiguracoes = JSON.parse(Banco.getItem("sessaoUsuario")) || null;
    if (!sessaoConfiguracoes && Banco.getItem("usuarioLogado")) { sessaoConfiguracoes = { perfil: "admin" }; localStorage.setItem("sessaoUsuario", JSON.stringify({ id: "sessao-legada", nome: Banco.getItem("usuarioLogado"), cargo: "Administrador", perfil: "admin", permissoes: ["*"] })); }
    sessaoConfiguracoes = sessaoConfiguracoes || {};
    document.querySelectorAll(".link-configuracoes").forEach(link => link.style.display = sessaoConfiguracoes.perfil === "admin" ? "block" : "none");
} catch (erro) {}


/* =====================================
   INICIALIZAÇÃO
===================================== */

carregarClientes();

carregarVeiculos();

mostrarContratos();

atualizarModalidade();
