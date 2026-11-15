/* =====================================================
   LOCADORA DIGITAL
   CONTROLE DE MULTAS
===================================================== */


/* =====================================================
   USUÁRIO
===================================================== */

const usuarioLogado =
    Banco.getItem("usuarioLogado");

if (usuarioLogado) {

    const elementoUsuario =
        document.getElementById("nomeUsuario");

    if (elementoUsuario) {
        elementoUsuario.textContent =
            usuarioLogado;
    }

}



/* =====================================================
   DADOS
===================================================== */

let multas =
    JSON.parse(
        Banco.getItem("multas")
    ) || [];


let veiculos =
    JSON.parse(
        Banco.getItem("veiculos")
    ) || [];


let clientes = [];


let contratos =
    JSON.parse(
        Banco.getItem("contratos")
    ) || [];


let indiceEdicao = null;

let indiceFicha = null;



/* =====================================================
   UTILIDADES
===================================================== */

function escapeHTML(valor) {

    if (valor === null ||
        valor === undefined) {

        return "";

    }

    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}



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



function normalizarTexto(valor) {

    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

}



/* =====================================================
   FORMULÁRIO
===================================================== */

function abrirFormulario() {

    document
        .getElementById("formulario")
        .classList.add("mostrar");


    carregarOpcoes();


    if (indiceEdicao === null) {

        limparFormulario();

    }

}



function fecharFormulario() {

    document
        .getElementById("formulario")
        .classList.remove("mostrar");


    limparFormulario();


    indiceEdicao = null;


    const arquivoAtual =
        document.getElementById("arquivoAtual");

    arquivoAtual.style.display =
        "none";

    arquivoAtual.innerHTML = SegurancaInterface.html("");

}



/* =====================================================
   LIMPAR FORMULÁRIO
===================================================== */

function limparFormulario() {

    const campos = [

        "autoInfracao",
        "orgao",
        "codigo",
        "descricao",
        "data",
        "hora",
        "local",
        "cidade",
        "uf",
        "valor",
        "valorDesconto",
        "vencimento",
        "prazoCondutor",
        "pontos",
        "observacoes"

    ];


    campos.forEach(id => {

        const elemento =
            document.getElementById(id);

        if (elemento) {
            elemento.value = "";
        }

    });


    document.getElementById(
        "placa"
    ).value = "";


    document.getElementById(
        "cliente"
    ).value = "";


    document.getElementById(
        "contrato"
    ).value = "";


    document.getElementById(
        "situacao"
    ).value = "Pendente";


    document.getElementById(
        "responsavel"
    ).value = "Locadora";


    document.getElementById(
        "arquivoMulta"
    ).value = "";

}



/* =====================================================
   CARREGAR OPÇÕES
===================================================== */

function carregarOpcoes() {

    carregarVeiculos();

    carregarClientes();

    carregarContratos();

}



function carregarVeiculos() {

    const select =
        document.getElementById("placa");

    const valorAtual =
        select.value;


    select.innerHTML = SegurancaInterface.html(`
        <option value="">
            Selecione o veículo
        </option>
    `);


    veiculos.forEach(
        (veiculo, indice) => {

            const option =
                document.createElement("option");

            option.value =
                veiculo.placa || indice;

            option.textContent =
                veiculo.placa
                    ? `${veiculo.placa} - ${veiculo.marca || ""} ${veiculo.modelo || ""}`
                    : `Veículo ${indice + 1}`;

            select.appendChild(option);

        }
    );


    if (valorAtual) {
        select.value = valorAtual;
    }

}



async function carregarClientes() {

    const select =
        document.getElementById("cliente");

    const valorAtual =
        select.value;


    select.innerHTML = SegurancaInterface.html('<option value="">Carregando clientes...</option>');

    try {
        const resposta = await api.get("/clientes/opcoes");
        clientes = resposta.data || [];
    } catch (erro) {
        select.innerHTML = SegurancaInterface.html(`<option value="">${escapeHTML(erro.message || "Não foi possível carregar os clientes")}</option>`);
        return;
    }

    select.innerHTML = SegurancaInterface.html('<option value="">Selecione o cliente</option>');
    clientes.forEach(
        (cliente, indice) => {

            const nome =
                cliente.nome ||
                cliente.nomeCompleto ||
                cliente.razaoSocial ||
                cliente.cliente ||
                `Cliente ${indice + 1}`;


            const option =
                document.createElement("option");

            option.value =
                nome;

            option.dataset.clienteId = cliente.id;

            option.textContent =
                nome;

            select.appendChild(option);

        }
    );


    if (valorAtual) {
        select.value = valorAtual;
    }

}



function carregarContratos() {

    const select =
        document.getElementById("contrato");

    const valorAtual =
        select.value;


    select.innerHTML = SegurancaInterface.html(`
        <option value="">
            Selecione o contrato
        </option>
    `);


    contratos.forEach(
        (contrato, indice) => {

            const identificador =
                contrato.numero ||
                contrato.id ||
                contrato.codigo ||
                `Contrato ${indice + 1}`;


            const option =
                document.createElement("option");

            option.value =
                identificador;

            option.textContent =
                identificador;

            select.appendChild(option);

        }
    );


    if (valorAtual) {
        select.value = valorAtual;
    }

}



/* =====================================================
   SALVAR MULTA
===================================================== */

async function salvarMulta() {

    const autoInfracao =
        document
            .getElementById("autoInfracao")
            .value
            .trim();


    const placa =
        document
            .getElementById("placa")
            .value
            .trim();


    const cliente =
        document
            .getElementById("cliente")
            .value
            .trim();


    const contrato =
        document
            .getElementById("contrato")
            .value
            .trim();


    const orgao =
        document
            .getElementById("orgao")
            .value
            .trim();


    const codigo =
        document
            .getElementById("codigo")
            .value
            .trim();


    const descricao =
        document
            .getElementById("descricao")
            .value
            .trim();


    const data =
        document
            .getElementById("data")
            .value;


    const hora =
        document
            .getElementById("hora")
            .value;


    const local =
        document
            .getElementById("local")
            .value
            .trim();


    const cidade =
        document
            .getElementById("cidade")
            .value
            .trim();


    const uf =
        document
            .getElementById("uf")
            .value
            .trim()
            .toUpperCase();


    const valor =
        document
            .getElementById("valor")
            .value;


    const valorDesconto =
        document
            .getElementById("valorDesconto")
            .value;


    const vencimento =
        document
            .getElementById("vencimento")
            .value;


    const prazoCondutor =
        document
            .getElementById("prazoCondutor")
            .value;


    const pontos =
        document
            .getElementById("pontos")
            .value;


    const situacao =
        document
            .getElementById("situacao")
            .value;


    const responsavel =
        document
            .getElementById("responsavel")
            .value;


    const observacoes =
        document
            .getElementById("observacoes")
            .value
            .trim();



    /* =============================================
       VALIDAÇÕES
    ============================================== */

    if (!autoInfracao) {

        alert(
            "Informe o número do Auto de Infração."
        );

        return;

    }


    if (!placa) {

        alert(
            "Selecione o veículo."
        );

        return;

    }



    /* =============================================
       AUTO ÚNICO
    ============================================== */

    const autoDuplicado =
        multas.some(
            (multa, indice) =>

                indice !== indiceEdicao &&

                normalizarTexto(
                    multa.autoInfracao
                ) ===
                normalizarTexto(
                    autoInfracao
                )
        );


    if (autoDuplicado) {

        alert(
            "Já existe uma multa cadastrada com este número de Auto de Infração."
        );

        return;

    }



    /* =============================================
       ARQUIVO
    ============================================== */

    const arquivo =
        document.getElementById(
            "arquivoMulta"
        ).files[0];


    if (arquivo) {

        const tipoValido = Object.values(ArquivosSeguros.types).includes(arquivo.type);


        if (!tipoValido) {

            alert(
                "Use JPG, PNG, PDF, DOC/DOCX, XML ou XLS/XLSX."
            );

            return;

        }

    }



    /* =============================================
       OBJETO
    ============================================== */

    const multaBase = {
        ...(indiceEdicao === null ? {} : multas[indiceEdicao]),

        autoInfracao,

        placa,

        cliente,

        contrato,

        orgao,

        codigo,

        descricao,

        data,

        hora,

        local,

        cidade,

        uf,

        valor:

            window.valorMascaraParaNumero(valor),

        valorDesconto:

            window.valorMascaraParaNumero(valorDesconto),

        vencimento,

        prazoCondutor,

        pontos:

            Number(pontos) || 0,

        situacao,

        responsavel,

        observacoes

    };



    /* =============================================
       FOTO/ARQUIVO EXISTENTE
    ============================================== */

    if (indiceEdicao !== null) {

        multaBase.arquivo =
            multas[indiceEdicao].arquivo || null;

        multaBase.dataCadastro =
            multas[indiceEdicao].dataCadastro ||
            new Date().toISOString();

    }

    else {

        multaBase.arquivo = null;

        multaBase.dataCadastro =
            new Date().toISOString();

    }



    /* =============================================
       SEM ARQUIVO
    ============================================== */

    if (!arquivo) {

        await finalizarSalvamento(
            multaBase
        );

        return;

    }



    /* =============================================
       LER ARQUIVO
    ============================================= */

    const leitor =
        new FileReader();


    leitor.onload =
        async function(event) {

            multaBase.arquivo = {

                nome:
                    arquivo.name,

                tipo:
                    arquivo.type,

                tamanho:
                    arquivo.size,

                dados:
                    event.target.result

            };


            await finalizarSalvamento(
                multaBase
            );

        };


    leitor.onerror =
        function() {

            alert(
                "Não foi possível ler o arquivo."
            );

        };


    leitor.readAsDataURL(
        arquivo
    );

}



/* =====================================================
   FINALIZAR SALVAMENTO
===================================================== */

async function finalizarSalvamento(
    multa
) {

    if (indiceEdicao === null) {

        multas.push(
            multa
        );

    }

    else {

        multas[
            indiceEdicao
        ] = multa;

    }


    await Banco.setItem(
        "multas",
        JSON.stringify(multas)
    );


    fecharFormulario();


    mostrarMultas();


    atualizarDashboard();


    alert(
        "Multa salva com sucesso."
    );

}



/* =====================================================
   MOSTRAR MULTAS
===================================================== */

function mostrarMultas(
    lista = multas
) {

    const tabela =
        document.getElementById(
            "tabelaMultas"
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
        (multa) => {

            const indiceOriginal =
                multas.indexOf(multa);


            const linha =
                document.createElement("tr");


            linha.innerHTML = SegurancaInterface.html(`

                <td>
                    <strong>
                        ${escapeHTML(
                            multa.autoInfracao
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(
                        multa.placa
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        multa.cliente || "-"
                    )}
                </td>

                <td>
                    ${formatarData(
                        multa.data
                    )}
                </td>

                <td>
                    ${formatarMoeda(
                        multa.valor
                    )}
                </td>

                <td>
                    <span class="situacao
                        ${classeSituacao(
                            multa.situacao
                        )}">
                        ${escapeHTML(
                            multa.situacao
                        )}
                    </span>
                </td>

                <td>

                    <button
                        class="btn-ficha"
                        data-sec-click="h37" data-sec-arg="${SegurancaInterface.escape(indiceOriginal)}">

                        Ficha

                    </button>

                    <button
                        class="btn-editar"
                        data-sec-click="h66" data-sec-arg="${SegurancaInterface.escape(indiceOriginal)}">

                        Editar

                    </button>

                    <button
                        class="btn-excluir"
                        data-sec-click="h67" data-sec-arg="${SegurancaInterface.escape(indiceOriginal)}">

                        Excluir

                    </button>

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

        `${lista.length} multa(s)`;

}



/* =====================================================
   SITUAÇÃO
===================================================== */

function classeSituacao(
    situacao
) {

    switch (situacao) {

        case "Pago":
            return "situacao-pago";

        case "Recurso":
            return "situacao-recurso";

        case "Indicação de Condutor":
            return "situacao-indicacao";

        case "Cancelada":
            return "situacao-cancelada";

        default:
            return "situacao-pendente";

    }

}



/* =====================================================
   DASHBOARD
===================================================== */

function atualizarDashboard() {

    const total =
        multas.length;


    const pendentes =
        multas.filter(
            multa =>
                multa.situacao === "Pendente"
        ).length;


    const pagas =
        multas.filter(
            multa =>
                multa.situacao === "Pago"
        ).length;


    const valorTotal =
        multas.reduce(
            (total, multa) =>

                total +
                (Number(multa.valor) || 0),

            0
        );


    document.getElementById(
        "totalMultas"
    ).textContent =
        total;


    document.getElementById(
        "multasPendentes"
    ).textContent =
        pendentes;


    document.getElementById(
        "multasPagas"
    ).textContent =
        pagas;


    document.getElementById(
        "valorTotal"
    ).textContent =
        formatarMoeda(
            valorTotal
        );

}



/* =====================================================
   PESQUISA
===================================================== */

function pesquisarMultas() {

    const pesquisa =
        normalizarTexto(
            document
                .getElementById(
                    "campoPesquisa"
                )
                .value
                .trim()
        );


    if (!pesquisa) {

        mostrarMultas();

        return;

    }


    const resultado =
        multas.filter(
            multa =>

                normalizarTexto(
                    multa.autoInfracao
                ).includes(pesquisa)

                ||

                normalizarTexto(
                    multa.placa
                ).includes(pesquisa)

                ||

                normalizarTexto(
                    multa.cliente
                ).includes(pesquisa)

                ||

                normalizarTexto(
                    multa.contrato
                ).includes(pesquisa)

                ||

                normalizarTexto(
                    multa.orgao
                ).includes(pesquisa)

                ||

                normalizarTexto(
                    multa.codigo
                ).includes(pesquisa)

        );


    mostrarMultas(
        resultado
    );

}



/* =====================================================
   EDITAR
===================================================== */

function editarMulta(
    indice
) {

    const multa =
        multas[indice];


    if (!multa) {
        return;
    }


    indiceEdicao =
        indice;


    carregarOpcoes();


    document.getElementById(
        "autoInfracao"
    ).value =
        multa.autoInfracao || "";


    document.getElementById(
        "placa"
    ).value =
        multa.placa || "";


    document.getElementById(
        "cliente"
    ).value =
        multa.cliente || "";


    document.getElementById(
        "contrato"
    ).value =
        multa.contrato || "";


    document.getElementById(
        "orgao"
    ).value =
        multa.orgao || "";


    document.getElementById(
        "codigo"
    ).value =
        multa.codigo || "";


    document.getElementById(
        "descricao"
    ).value =
        multa.descricao || "";


    document.getElementById(
        "data"
    ).value =
        multa.data || "";


    document.getElementById(
        "hora"
    ).value =
        multa.hora || "";


    document.getElementById(
        "local"
    ).value =
        multa.local || "";


    document.getElementById(
        "cidade"
    ).value =
        multa.cidade || "";


    document.getElementById(
        "uf"
    ).value =
        multa.uf || "";


    document.getElementById(
        "valor"
    ).value =
        multa.valor || "";


    document.getElementById(
        "valorDesconto"
    ).value =
        multa.valorDesconto || "";


    document.getElementById(
        "vencimento"
    ).value =
        multa.vencimento || "";


    document.getElementById(
        "prazoCondutor"
    ).value =
        multa.prazoCondutor || "";


    document.getElementById(
        "pontos"
    ).value =
        multa.pontos || "";


    document.getElementById(
        "situacao"
    ).value =
        multa.situacao || "Pendente";


    document.getElementById(
        "responsavel"
    ).value =
        multa.responsavel || "Locadora";


    document.getElementById(
        "observacoes"
    ).value =
        multa.observacoes || "";


    mostrarArquivoAtual(
        multa.arquivo
    );


    document
        .getElementById("formulario")
        .classList.add("mostrar");

}



/* =====================================================
   ARQUIVO ATUAL
===================================================== */

function mostrarArquivoAtual(
    arquivo
) {

    const elemento =
        document.getElementById(
            "arquivoAtual"
        );


    if (!arquivo) {

        elemento.style.display =
            "none";

        elemento.innerHTML =
            SegurancaInterface.html("");

        return;

    }


    elemento.style.display =
        "block";


    elemento.innerHTML = SegurancaInterface.html(`

        📎 Arquivo atual:
        <strong>
            ${escapeHTML(
                arquivo.nome
            )}
        </strong>

        <br>

        <small>
            Se selecionar outro arquivo,
            ele substituirá o atual.
        </small>

    `);

}



/* =====================================================
   EXCLUIR
===================================================== */

async function excluirMulta(
    indice
) {

    const multa =
        multas[indice];


    if (!multa) {
        return;
    }


    const confirmar =
        confirm(
            `Deseja realmente excluir a multa do Auto de Infração ${multa.autoInfracao}?`
        );


    if (!confirmar) {
        return;
    }


    multas.splice(
        indice,
        1
    );


    await Banco.setItem(
        "multas",
        JSON.stringify(multas)
    );


    mostrarMultas();


    atualizarDashboard();

}



/* =====================================================
   ABRIR FICHA
===================================================== */

function abrirFicha(
    indice
) {

    const multa =
        multas[indice];


    if (!multa) {
        return;
    }


    indiceFicha =
        indice;


    document.getElementById(
        "fichaSubtitulo"
    ).textContent =

        `Auto de Infração: ${
            multa.autoInfracao || "-"
        }`;


    document.getElementById(
        "fichaAuto"
    ).textContent =
        multa.autoInfracao || "-";


    document.getElementById(
        "fichaOrgao"
    ).textContent =
        multa.orgao || "-";


    document.getElementById(
        "fichaPlaca"
    ).textContent =
        multa.placa || "-";


    document.getElementById(
        "fichaCliente"
    ).textContent =
        multa.cliente || "-";


    document.getElementById(
        "fichaContrato"
    ).textContent =
        multa.contrato || "-";


    document.getElementById(
        "fichaData"
    ).textContent =
        formatarData(
            multa.data
        );


    document.getElementById(
        "fichaHora"
    ).textContent =
        multa.hora || "-";


    document.getElementById(
        "fichaLocal"
    ).textContent =
        multa.local || "-";


    document.getElementById(
        "fichaCidade"
    ).textContent =

        multa.cidade
            ? `${multa.cidade}${multa.uf ? " / " + multa.uf : ""}`
            : multa.uf || "-";


    document.getElementById(
        "fichaCodigo"
    ).textContent =
        multa.codigo || "-";


    document.getElementById(
        "fichaDescricao"
    ).textContent =
        multa.descricao || "-";


    document.getElementById(
        "fichaPontos"
    ).textContent =

        multa.pontos !== undefined
            ? `${multa.pontos} ponto(s)`
            : "-";


    document.getElementById(
        "fichaValor"
    ).textContent =
        formatarMoeda(
            multa.valor
        );


    document.getElementById(
        "fichaValorDesconto"
    ).textContent =
        formatarMoeda(
            multa.valorDesconto
        );


    document.getElementById(
        "fichaVencimento"
    ).textContent =
        formatarData(
            multa.vencimento
        );


    document.getElementById(
        "fichaResponsavel"
    ).textContent =
        multa.responsavel || "-";


    document.getElementById(
        "fichaStatus"
    ).textContent =
        multa.situacao || "-";


    document.getElementById(
        "fichaPrazoCondutor"
    ).textContent =
        formatarData(
            multa.prazoCondutor
        );


    document.getElementById(
        "fichaObservacoes"
    ).textContent =

        multa.observacoes ||
        "Nenhuma observação.";


    mostrarArquivoFicha(
        multa.arquivo
    );


    document
        .getElementById("modalFicha")
        .classList.add("mostrar");

}



/* =====================================================
   ARQUIVO NA FICHA
===================================================== */

function mostrarArquivoFicha(
    arquivo
) {

    const secao =
        document.getElementById(
            "fichaArquivoSecao"
        );


    const elemento =
        document.getElementById(
            "fichaArquivo"
        );


    if (!arquivo ||
        (!arquivo.dados && !arquivo.driveFileId)) {

        secao.style.display =
            "none";

        elemento.innerHTML =
            SegurancaInterface.html("");

        return;

    }


    secao.style.display =
        "block";


    const link =
        document.createElement("a");


    link.href = "#";

    link.textContent =
        `📎 Abrir ${arquivo.nome}`;


    link.addEventListener(
        "click",
        async function(event) {

            event.preventDefault();

            abrirArquivoMulta(arquivo);

        }
    );


    elemento.replaceChildren(link);

}



/* =====================================================
   ABRIR ARQUIVO ANEXADO
===================================================== */

async function abrirArquivoMulta(arquivo) {
    try {
        if (arquivo?.driveFileId) { window.open(api.driveContentUrl(arquivo.driveFileId), "_blank", "noopener"); return; }
        const validado = await ArquivosSeguros.validateStoredFile(arquivo?.dados, arquivo?.nome);
        const endereco = URL.createObjectURL(new Blob([validado.bytes], { type: ArquivosSeguros.types[validado.ext] }));
        const download = document.createElement("a");
        download.href = endereco; download.download = arquivo.nome;
        document.body.appendChild(download); download.click(); download.remove();
        setTimeout(() => URL.revokeObjectURL(endereco), 60000);
    } catch (erro) { alert(erro.message || "Anexo inválido."); }
}

/* =====================================================
   FECHAR FICHA
===================================================== */

function fecharFicha() {

    document
        .getElementById("modalFicha")
        .classList.remove("mostrar");


    indiceFicha =
        null;

}



/* =====================================================
   EDITAR PELA FICHA
===================================================== */

function editarDaFicha() {

    if (indiceFicha === null) {
        return;
    }


    const indice =
        indiceFicha;


    fecharFicha();


    editarMulta(
        indice
    );

}



/* =====================================================
   FECHAR MODAL CLICANDO FORA
===================================================== */

document
    .getElementById("modalFicha")
    .addEventListener(
        "click",
        async function(event) {

            if (
                event.target === this
            ) {

                fecharFicha();

            }

        }
    );



/* =====================================================
   TECLA ESC
===================================================== */

document.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Escape"
        ) {

            fecharFicha();

        }

    }
);



/* =====================================================
   SAIR
===================================================== */

function sair() {

    localStorage.removeItem(
        "usuarioLogado"
    );


    window.location.href =
        "LOCADORA_PAGINA_INICIAL.HTML";

}



/* =====================================================
   PREPARAÇÃO PARA FUTURA INTEGRAÇÃO
   SENATRAN / n8n
===================================================== */

/*
    IMPORTANTE:

    O Auto de Infração é tratado como identificador
    principal da multa.

    Futuramente, quando o n8n receber uma nova
    infração do SENATRAN, poderá enviar os dados
    para uma API do sistema.

    Exemplo conceitual de objeto recebido:

    {
        autoInfracao: "A123456789",
        placa: "ABC1D23",
        orgao: "DETRAN-SP",
        codigo: "74550",
        descricao: "Infração",
        data: "2026-08-07",
        hora: "10:30",
        valor: 195.23
    }

    Nesse momento o sistema funciona com localStorage.
    A integração automática deverá ser feita posteriormente
    através de backend/API + n8n.

    NÃO utilizar localStorage como mecanismo definitivo
    de integração com SENATRAN.
*/



/* =====================================================
   INICIALIZAÇÃO
===================================================== */

carregarOpcoes();

mostrarMultas();

atualizarDashboard();
