/* =====================================================
   LOCADORA DIGITAL
   MÓDULO DE RELATÓRIOS
===================================================== */


/* =====================================================
   USUÁRIO
===================================================== */

const usuario =
    Banco.getItem(
        "usuarioLogado"
    );


if (usuario) {

    document.getElementById(
        "nomeUsuario"
    ).textContent =
        usuario;

}



/* =====================================================
   DADOS
===================================================== */

let veiculos = [];

let clientes = [];

let contratos = [];

let multas = [];

let manutencoes = [];

let faturas = [];

let relatorioVeiculos = [];
let paginacaoVeiculos = { page: 1, pages: 1, total: 0 };
let usuarioRelatorioAtual = null;


/* dados atualmente filtrados */

let contratosFiltrados = [];

let multasFiltradas = [];

let manutencoesFiltradas = [];


/* =====================================================
   CARREGAR DADOS
===================================================== */

function carregarDados() {

    // Cadastros operacionais são carregados da API, nunca do localStorage.
    veiculos = [];
    clientes = [];


    contratos =
        JSON.parse(
            Banco.getItem(
                "contratos"
            )
        ) || [];


    multas =
        JSON.parse(
            Banco.getItem(
                "multas"
            )
        ) || [];


    manutencoes =
        JSON.parse(
            Banco.getItem(
                "manutencoes"
            )
    ) || [];


    faturas =
        JSON.parse(
            Banco.getItem(
                "faturas"
            )
        ) || [];

}



/* =====================================================
   UTILIDADES
===================================================== */

function valorNumerico(
    valor
) {

    const numero =
        Number(valor);

    return Number.isFinite(numero)
        ? numero
        : 0;

}



function formatarMoeda(
    valor
) {

    return valorNumerico(
        valor
    ).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );

}



function formatarData(
    data
) {

    if (!data) {

        return "-";

    }


    const partes =
        String(data).split("-");


    if (partes.length !== 3) {

        return data;

    }


    return (
        partes[2] +
        "/" +
        partes[1] +
        "/" +
        partes[0]
    );

}



function escaparHTML(
    valor
) {

    return String(
        valor ?? ""
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );

}



/* =====================================================
   COMPATIBILIDADE COM CONTRATOS
   Suporta versões diferentes criadas anteriormente
===================================================== */

function numeroContrato(
    contrato,
    indice
) {

    return (
        contrato.numeroContrato ||
        contrato.numero ||
        contrato.codigo ||
        `Contrato ${indice + 1}`
    );

}



function statusContrato(
    contrato
) {

    return (
        contrato.status ||
        contrato.situacao ||
        "-"
    );

}



function inicioContrato(
    contrato
) {

    return (
        contrato.dataInicio ||
        contrato.inicio ||
        contrato.dataRetirada ||
        ""
    );

}



function fimContrato(
    contrato
) {

    return (
        contrato.dataFim ||
        contrato.dataDevolucao ||
        contrato.termino ||
        ""
    );

}



function valorContrato(
    contrato
) {

    return valorNumerico(

        contrato.valorLocacao ??

        contrato.total ??

        contrato.valorTotal ??

        contrato.valor

    );

}



function nomeClienteContrato(
    contrato
) {

    if (
        contrato.clienteNome
    ) {

        return contrato.clienteNome;

    }


    if (
        typeof contrato.cliente ===
        "string" &&
        isNaN(
            Number(
                contrato.cliente
            )
        )
    ) {

        return contrato.cliente;

    }


    const indice =

        contrato.clienteIndice ??

        contrato.cliente;


    const cliente =
        clientes.find(item => String(item.id) === String(indice)) ||
        clientes[Number(indice)];


    return (

        cliente?.nome ||

        cliente?.nomeCompleto ||

        cliente?.razaoSocial ||

        "Cliente não identificado"

    );

}



function placaContrato(
    contrato
) {

    if (
        contrato.veiculoPlaca
    ) {

        return contrato.veiculoPlaca;

    }


    if (
        typeof contrato.veiculo ===
        "string" &&
        contrato.veiculo.includes("-")
    ) {

        return contrato.veiculo;

    }


    const indice =

        contrato.veiculoIndice ??

        contrato.veiculo;


    const veiculo =
        veiculos.find(item => String(item.id) === String(indice)) ||
        veiculos[Number(indice)];


    return (
        veiculo?.placa ||
        "-"
    );

}



function descricaoVeiculoContrato(
    contrato
) {

    if (
        contrato.veiculoDescricao
    ) {

        return (
            `${contrato.veiculoDescricao} ${contrato.veiculoPlaca || ""}`
        ).trim();

    }


    const indice =

        contrato.veiculoIndice ??

        contrato.veiculo;


    const veiculo =
        veiculos.find(item => String(item.id) === String(indice)) ||
        veiculos[Number(indice)];


    if (veiculo) {

        return (
            `${veiculo.placa || ""} - ${veiculo.marca || ""} ${veiculo.modelo || ""}`
        ).trim();

    }


    return (
        contrato.veiculo ||
        "-"
    );

}



function contratoPossuiModelo(contrato, modelo) {
    if (!modelo) return true;
    const veiculosContrato = Array.isArray(contrato.veiculos) && contrato.veiculos.length ? contrato.veiculos : [contrato.veiculoIndice ?? contrato.veiculo];
    return veiculosContrato.some(referencia => {
        const id = typeof referencia === "object" ? referencia.id : referencia;
        const veiculo = veiculos.find(item => String(item.id) === String(id)) || veiculos[Number(id)];
        return String(veiculo?.modelo || "") === String(modelo);
    });
}

function placaPertenceAoModelo(placa, modelo) {
    if (!modelo) return true;
    return String(veiculos.find(veiculo => String(veiculo.placa || "") === String(placa))?.modelo || "") === String(modelo);
}

function veiculosDoContrato(contrato) {
    return Array.isArray(contrato.veiculos) && contrato.veiculos.length
        ? contrato.veiculos
        : [contrato.veiculoIndice ?? contrato.veiculo];
}

function contratoMaisRecenteDoVeiculo(indiceVeiculo, veiculo) {
    return contratos
        .filter(contrato => {
            const vinculado = veiculosDoContrato(contrato).some(indice =>
                String(indice) === String(indiceVeiculo) ||
                (veiculo?.id !== undefined && String(indice) === String(veiculo.id))
            );
            return vinculado;
        })
        .sort((a, b) => {
            const dataA = Date.parse(`${inicioContrato(a)}T00:00:00`) || 0;
            const dataB = Date.parse(`${inicioContrato(b)}T00:00:00`) || 0;
            return dataB - dataA || contratos.indexOf(b) - contratos.indexOf(a);
        })[0] || null;
}

function contratoAtivoMaisRecenteDoVeiculo(indiceVeiculo, veiculo) {
    const contrato = contratoMaisRecenteDoVeiculo(indiceVeiculo, veiculo);
    return contrato && textoNormalizado(statusContrato(contrato)) === "ativo" ? contrato : null;
}

function textoNormalizado(valor) {
    return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function manutencaoAbertaDoVeiculo(indiceVeiculo, veiculo) {
    return manutencoes.some(manutencao => {
        const status = textoNormalizado(manutencao.status || manutencao.situacao);
        if(manutencao.veiculoId)return !status.includes("conclu")&&!status.includes("cancel")&&String(manutencao.veiculoId)===String(veiculo.id);
        if (status.includes("conclu") || status.includes("cancel")) return false;
        const referencia = manutencao.veiculoIndice ?? manutencao.veiculo ?? manutencao.placa;
        return String(referencia) === String(indiceVeiculo) ||
            String(referencia) === String(veiculo?.id ?? "") ||
            String(referencia).toUpperCase() === String(veiculo?.placa || "").toUpperCase();
    });
}

function situacaoEfetivaVeiculo(indiceVeiculo, veiculo) {
    if (manutencaoAbertaDoVeiculo(indiceVeiculo, veiculo)) return "Manutenção";
    if (contratoAtivoMaisRecenteDoVeiculo(indiceVeiculo, veiculo)) return "Alugado";
    const situacaoCadastral = textoNormalizado(veiculo?.situacao);
    if (situacaoCadastral.includes("inativo")) return "Inativo";
    if (situacaoCadastral.includes("manutencao")) return "Manutenção";
    return "Disponível";
}

function resumoSituacaoFrota() {
    const resumo = { total: veiculos.length, disponiveis: 0, alugados: 0, manutencao: 0, inativos: 0 };
    veiculos.forEach((veiculo, indice) => {
        const situacao = situacaoEfetivaVeiculo(indice, veiculo);
        if (situacao === "Alugado") resumo.alugados += 1;
        else if (situacao === "Manutenção") resumo.manutencao += 1;
        else if (situacao === "Inativo") resumo.inativos += 1;
        else resumo.disponiveis += 1;
    });
    return resumo;
}

/* =====================================================
   COMPATIBILIDADE MANUTENÇÃO
===================================================== */

function descricaoVeiculoManutencao(
    manutencao
) {

    const referencia = manutencao.veiculoId ? veiculos.findIndex(v=>String(v.id)===String(manutencao.veiculoId)) : manutencao.veiculo;


    if (
        referencia !== undefined &&
        referencia !== null &&
        veiculos[
            Number(referencia)
        ]
    ) {

        const veiculo =
            veiculos[
                Number(referencia)
            ];


        return (
            `${veiculo.placa || ""} - ${veiculo.marca || ""} ${veiculo.modelo || ""}`
        ).trim();

    }


    return (
        manutencao.placa ||
        referencia ||
        "Veículo não identificado"
    );

}



function placaManutencao(
    manutencao
) {

    const referencia = manutencao.veiculoId ? veiculos.findIndex(v=>String(v.id)===String(manutencao.veiculoId)) : manutencao.veiculo;


    const veiculo =
        veiculos[
            Number(referencia)
        ];


    return (
        veiculo?.placa ||
        manutencao.placa ||
        ""
    );

}



function valorManutencao(
    manutencao
) {

    if (
        manutencao.valorTotal !==
        undefined
    ) {

        return valorNumerico(
            manutencao.valorTotal
        );

    }


    return (
        valorNumerico(
            manutencao.valorPecas
        )
        +
        valorNumerico(
            manutencao.valorMaoObra
        )
    );

}



/* =====================================================
   CARREGAR VEÍCULOS NO FILTRO
===================================================== */

function carregarFiltroVeiculos() {

    const select =
        document.getElementById(
            "filtroVeiculo"
        );

    const selecionado = select.value;
    const modelos = new Map();
    veiculos.forEach(veiculo => {
        const modelo = String(veiculo.modelo || "").trim();
        if (modelo) modelos.set(modelo, [veiculo.marca, modelo].filter(Boolean).join(" — "));
    });
    select.innerHTML = SegurancaInterface.html('<option value="">Todos os modelos</option>');
    Array.from(modelos).sort(([a], [b]) => a.localeCompare(b, "pt-BR")).forEach(([modelo, texto]) => select.appendChild(new Option(texto, modelo)));
    if (modelos.has(selecionado)) select.value = selecionado;
    return;


    select.innerHTML = SegurancaInterface.html(`

        <option value="">
            Todos os veículos
        </option>

    `);


    veiculos.forEach(
        veiculo => {

            if (!veiculo.placa) {

                return;

            }


            const option =
                document.createElement(
                    "option"
                );


            option.value =
                veiculo.placa;


            option.textContent =

                `${veiculo.placa} - ${veiculo.marca || ""} ${veiculo.modelo || ""}`;


            select.appendChild(
                option
            );

        }
    );

}



function carregarFiltroClientes() {
    const select = document.getElementById("filtroCliente");
    if (!select) return;
    select.innerHTML = SegurancaInterface.html('<option value="">Todos os clientes</option>');
    clientes.forEach(cliente => {
        const nome = cliente.nome || cliente.nomeCompleto || cliente.razaoSocial;
        if (nome && cliente.id !== undefined) select.appendChild(new Option(nome, String(cliente.id)));
    });
    atualizarSeletorClientes();
}

function atualizarSeletorClientes() {
    const select = document.getElementById("filtroCliente");
    const opcoes = document.getElementById("opcoesClientes");
    const resumo = document.getElementById("resumoClientes");
    if (!select || !opcoes || !resumo) return;

    opcoes.innerHTML = SegurancaInterface.html("");
    const clientesDisponiveis = Array.from(select.options).filter(opcao => opcao.value !== "");
    if (!clientesDisponiveis.length) {
        opcoes.innerHTML = SegurancaInterface.html('<p class="vazio-clientes">Nenhum cliente cadastrado.</p>');
        resumo.textContent = "Todos os clientes";
        return;
    }

    const atualizarResumo = () => {
        const selecionados = clientesDisponiveis.filter(opcao => opcao.selected);
        resumo.textContent = !selecionados.length ? "Todos os clientes" : (selecionados.length === 1 ? selecionados[0].text : `${selecionados.length} clientes selecionados`);
    };

    clientesDisponiveis.forEach(opcao => {
        const rotulo = document.createElement("label");
        rotulo.className = "opcao-cliente";
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

function mostrarItensSelecionados() {
 const tipo=document.getElementById('tipoRelatorio').value;
 const itens=tipo==='personalizado'?Array.from(document.querySelectorAll('.item-relatorio:checked')).map(el=>el.value):[tipo];
 document.querySelectorAll('.secao-relatorio').forEach(secao=>{
  const grupos=secao.dataset.relatorio.split(' '),detalhada=secao.classList.contains('secao-veiculos-detalhada');
  const mostrar=itens.some(item=>item==='veiculos'?detalhada:item==='frota'?grupos.includes('frota')&&!detalhada:grupos.includes(item));
  secao.style.display=mostrar?'block':'none';
 });
 const identificacao=document.querySelector('.identificacao-relatorio');if(identificacao)identificacao.style.display=itens.length?'flex':'none';return itens.length>0;
}

function ocultarRelatoriosAteSolicitacao() {
    document.querySelectorAll(".secao-relatorio").forEach(secao => secao.style.display = "none");
    const identificacao = document.querySelector(".identificacao-relatorio");
    if (identificacao) identificacao.style.display = "none";
}

/* =====================================================
   FILTRO DE DATA
===================================================== */

function estaNoPeriodo(
    data,
    inicio,
    fim
) {

    if (!data) {

        return (
            !inicio &&
            !fim
        );

    }


    if (
        inicio &&
        data < inicio
    ) {

        return false;

    }


    if (
        fim &&
        data > fim
    ) {

        return false;

    }


    return true;

}



/* =====================================================
   APLICAR FILTROS
===================================================== */

async function aplicarFiltros() {

    const dataInicial =
        document.getElementById(
            "dataInicial"
        ).value;


    const dataFinal =
        document.getElementById(
            "dataFinal"
        ).value;


    const placa =
        document.getElementById(
            "filtroVeiculo"
        ).value;

    const clientesSelecionados =
        Array.from(
            document.getElementById(
                "filtroCliente"
            ).selectedOptions
        ).map(opcao => opcao.value).filter(Boolean);


    const tipo =
        document.getElementById(
            "tipoRelatorio"
        ).value;



    contratosFiltrados =
        contratos.filter(
            contrato => {

                const inicio = inicioContrato(contrato);
                const fim = fimContrato(contrato) || inicio;


                const placaAtual =
                    placaContrato(
                        contrato
                    );


                return (

                    (!dataInicial || fim >= dataInicial)

                    &&

                    (!dataFinal || inicio <= dataFinal)

                    &&

                    (
                        !placa ||

                        contratoPossuiModelo(
                            contrato,
                            placa
                        )
                    )

                    &&

                    (
                        !clientesSelecionados.length ||
                        clientesSelecionados.includes(String(contrato.clienteId ?? contrato.cliente_id ?? clientes[Number(contrato.clienteIndice ?? contrato.cliente)]?.id ?? ""))
                    )

                );

            }
        );



    multasFiltradas =
        multas.filter(
            multa => {

                return (

                    estaNoPeriodo(
                        multa.data,
                        dataInicial,
                        dataFinal
                    )

                    &&

                    (
                        !placa ||

                        placaPertenceAoModelo(
                            multa.placa,
                            placa
                        )
                    )

                );

            }
        );



    manutencoesFiltradas =
        manutencoes.filter(
            manutencao => {

                const data =
                    manutencao.dataEntrada;


                return (

                    estaNoPeriodo(
                        data,
                        dataInicial,
                        dataFinal
                    )

                    &&

                    (
                        !placa ||

                        placaPertenceAoModelo(
                            placaManutencao(
                                manutencao
                            ),
                            placa
                        )
                    )

                );

            }
        );


    atualizarPeriodo();


    if (!mostrarItensSelecionados()) {
        ocultarRelatoriosAteSolicitacao();
        alert("Selecione ao menos um item para gerar o relatório.");
        return;
    }


    const precisaVeiculos=tipo==='veiculos'||(tipo==='personalizado'&&document.querySelector('.item-relatorio[value="veiculos"]:checked'));
    if(precisaVeiculos){await carregarRelatorioVeiculos(1);if(document.getElementById('estadoRelatorioVeiculos')?.classList.contains('erro'))throw new Error(document.getElementById('estadoRelatorioVeiculos').textContent);}
    gerarRelatorios();

}



/* =====================================================
   PERÍODO
===================================================== */

function atualizarPeriodo() {

    const inicio =
        document.getElementById(
            "dataInicial"
        ).value;


    const fim =
        document.getElementById(
            "dataFinal"
        ).value;


    let texto =
        "Todos os períodos";


    if (
        inicio &&
        fim
    ) {

        texto =
            `${formatarData(inicio)} até ${formatarData(fim)}`;

    }

    else if (inicio) {

        texto =
            `A partir de ${formatarData(inicio)}`;

    }

    else if (fim) {

        texto =
            `Até ${formatarData(fim)}`;

    }


    document.getElementById(
        "periodoRelatorio"
    ).textContent =
        texto;

}



/* =====================================================
   TIPO DE RELATÓRIO
===================================================== */

function mostrarTipoRelatorio(
    tipo
) {

    const secoes =
        document.querySelectorAll(
            "[data-relatorio]"
        );


    secoes.forEach(
        secao => {

            const tipos =
                secao
                .dataset
                .relatorio
                .split(" ");


            secao.style.display =

                tipos.includes(tipo)

                ? "block"

                : "none";

        }
    );

}



/* =====================================================
   LIMPAR FILTROS
===================================================== */

function limparFiltros() {
['situacaoLicenciamento','finalLicenciamento','anoCrlvFiltro'].forEach(id=>document.getElementById(id).value='');document.getElementById('exercicioLicenciamento').value='2026';

    document.getElementById(
        "dataInicial"
    ).value = "";


    document.getElementById(
        "dataFinal"
    ).value = "";


    document.getElementById(
        "filtroVeiculo"
    ).value = "";


    document.getElementById(
        "tipoRelatorio"
    ).value = "geral";


    Array.from(document.getElementById("filtroCliente")?.options || []).forEach(opcao => {
        opcao.selected = false;
    });
    atualizarSeletorClientes();
    aplicarFiltros();

}



/* =====================================================
   ATUALIZAR TUDO
===================================================== */

async function atualizarRelatorios() {

    carregarDados();

    try {
        await carregarCadastrosDoBackend();
    } catch (erro) {
        estadoVeiculos(erro.message || "Não foi possível atualizar os dados do banco.", true);
        return;
    }

    carregarFiltroVeiculos();

    carregarFiltroClientes();


    contratosFiltrados =
        [...contratos];


    multasFiltradas =
        [...multas];


    manutencoesFiltradas =
        [...manutencoes];


    await aplicarFiltros();


    atualizarDataGeracao();

}



/* =====================================================
   GERAR RELATÓRIOS
===================================================== */

function gerarRelatorios() {
    gerarLicenciamento();

    gerarResumoFrota();

    gerarTabelaVeiculos();

    gerarResumoContratos();

    gerarResumoMultas();

    gerarResumoManutencoes();

    gerarFinanceiro();

    gerarGraficosRosca();

    gerarGraficosModalidades();

    gerarTabelaContratos();

    gerarTabelaMultas();

    gerarTabelaManutencoes();

    gerarTabelaFaturas();

}



/* =====================================================
   FROTA
===================================================== */

function gerarResumoFrota() {

    const resumoCalculado = resumoSituacaoFrota();

    const total =
        resumoCalculado.total;


    const disponiveis = resumoCalculado.disponiveis;


    const alugados = resumoCalculado.alugados;


    const manutencao = resumoCalculado.manutencao;


    const inativos = resumoCalculado.inativos;


    document.getElementById(
        "totalVeiculos"
    ).textContent =
        total;


    document.getElementById(
        "veiculosDisponiveis"
    ).textContent =
        disponiveis;


    document.getElementById(
        "veiculosAlugados"
    ).textContent =
        alugados;


    document.getElementById(
        "veiculosManutencao"
    ).textContent =
        manutencao;


    document.getElementById(
        "veiculosInativos"
    ).textContent =
        inativos;

}



/* =====================================================
   CONTRATOS
===================================================== */

function gerarResumoContratos() {

    const lista =
        contratosFiltrados;


    document.getElementById(
        "totalClientes"
    ).textContent =
        clientes.length;


    document.getElementById(
        "totalContratos"
    ).textContent =
        lista.length;


    document.getElementById(
        "contratosAtivos"
    ).textContent =

        lista.filter(
            contrato =>

                statusContrato(
                    contrato
                ) === "Ativo"

        ).length;


    document.getElementById(
        "contratosFinalizados"
    ).textContent =

        lista.filter(
            contrato =>

                statusContrato(
                    contrato
                ) ===
                "Finalizado"

        ).length;


    document.getElementById(
        "contratosCancelados"
    ).textContent =

        lista.filter(
            contrato =>

                statusContrato(
                    contrato
                ) ===
                "Cancelado"

        ).length;

}



/* =====================================================
   MULTAS
===================================================== */

function gerarResumoMultas() {

    const lista =
        multasFiltradas;


    document.getElementById(
        "totalMultas"
    ).textContent =
        lista.length;


    document.getElementById(
        "multasPendentes"
    ).textContent =

        lista.filter(
            multa =>
                multa.situacao ===
                "Pendente"
        ).length;


    document.getElementById(
        "multasPagas"
    ).textContent =

        lista.filter(
            multa =>
                multa.situacao ===
                "Pago"
        ).length;


    document.getElementById(
        "multasRecurso"
    ).textContent =

        lista.filter(
            multa =>
                multa.situacao ===
                "Recurso"
        ).length;


    document.getElementById(
        "multasCanceladas"
    ).textContent =

        lista.filter(
            multa =>
                multa.situacao ===
                "Cancelada"
        ).length;

}



/* =====================================================
   MANUTENÇÕES
===================================================== */

function gerarResumoManutencoes() {

    const lista =
        manutencoesFiltradas;


    document.getElementById(
        "totalManutencoes"
    ).textContent =
        lista.length;


    document.getElementById(
        "manutencoesAgendadas"
    ).textContent =

        lista.filter(
            m =>
                m.status ===
                "Agendada"
        ).length;


    document.getElementById(
        "manutencoesAndamento"
    ).textContent =

        lista.filter(
            m =>
                m.status ===
                "Em andamento"
        ).length;


    document.getElementById(
        "manutencoesConcluidas"
    ).textContent =

        lista.filter(
            m =>
                m.status ===
                "Concluída"
        ).length;


    document.getElementById(
        "manutencoesCanceladas"
    ).textContent =

        lista.filter(
            m =>
                m.status ===
                "Cancelada"
        ).length;

}



/* =====================================================
   FINANCEIRO
===================================================== */

function manutencoesFinanceiras() {
    return manutencoesFiltradas.filter(manutencao => textoNormalizado(manutencao.status || manutencao.situacao).includes("conclu"));
}

function multasFinanceiras() {
    return multasFiltradas.filter(Valores.multaDaLocadora);
}

function gerarFinanceiro() {

    const receita =

        contratosFiltrados.reduce(
            (
                soma,
                contrato
            ) =>

                soma +
                valorContrato(
                    contrato
                ),

            0
        );


    const manutencoesEfetivadas = manutencoesFinanceiras();
    const multasConsideradas = multasFinanceiras();

    const manutencao =

        manutencoesEfetivadas.reduce(
            (
                soma,
                manutencao
            ) =>

                soma +
                valorManutencao(
                    manutencao
                ),

            0
        );


    const totalMultas =

        multasConsideradas.reduce(
            (
                soma,
                multa
            ) =>

                soma +
                valorNumerico(
                    multa.valor
                ),

            0
        );


    const resultado =

        receita -
        manutencao -
        totalMultas;


    document.getElementById(
        "receitaContratos"
    ).textContent =
        formatarMoeda(
            receita
        );


    document.getElementById(
        "custoManutencao"
    ).textContent =
        formatarMoeda(
            manutencao
        );


    document.getElementById(
        "valorMultas"
    ).textContent =
        formatarMoeda(
            totalMultas
        );


    const resultadoElemento =
        document.getElementById(
            "resultadoEstimado"
        );


    resultadoElemento.textContent =
        formatarMoeda(
            resultado
        );


    resultadoElemento.style.color =

        resultado >= 0

        ? "#218c4d"

        : "#a93226";

    const secao = resultadoElemento.closest(".secao-relatorio");
    let origem = secao?.querySelector(".origem-financeira");
    if (secao && !origem) {
        origem = document.createElement("div");
        origem.className = "origem-financeira";
        secao.appendChild(origem);
    }
    if (origem) origem.innerHTML = SegurancaInterface.html(`<strong>Origem dos valores considerados</strong><span>Receita: ${contratosFiltrados.length} contrato(s) do filtro.</span><span>Manutenção: ${manutencoesEfetivadas.length} serviço(s) concluído(s).</span><span>Multas: ${multasConsideradas.length} registro(s) não cancelado(s).</span>`);

}



/* =====================================================
   GRÁFICO FROTA
===================================================== */

function gerarGraficoFrota() {

    const resumoCalculado = resumoSituacaoFrota();

    const total =
        resumoCalculado.total;


    const valores = {
        disponiveis: resumoCalculado.disponiveis,
        alugados: resumoCalculado.alugados,
        manutencao: resumoCalculado.manutencao,
        inativos: resumoCalculado.inativos
    };


    function percentual(
        valor
    ) {

        if (
            total === 0
        ) {

            return 0;

        }


        return Math.round(
            (
                valor /
                total
            ) * 100
        );

    }


    const pDisponiveis =
        percentual(
            valores.disponiveis
        );


    const pAlugados =
        percentual(
            valores.alugados
        );


    const pManutencao =
        percentual(
            valores.manutencao
        );


    const pInativos =
        percentual(
            valores.inativos
        );


    document.getElementById(
        "percentualDisponiveis"
    ).textContent =
        `${pDisponiveis}%`;


    document.getElementById(
        "percentualAlugados"
    ).textContent =
        `${pAlugados}%`;


    document.getElementById(
        "percentualManutencao"
    ).textContent =
        `${pManutencao}%`;


    document.getElementById(
        "percentualInativos"
    ).textContent =
        `${pInativos}%`;


    document.getElementById(
        "graficoDisponiveis"
    ).style.width =
        `${pDisponiveis}%`;


    document.getElementById(
        "graficoAlugados"
    ).style.width =
        `${pAlugados}%`;


    document.getElementById(
        "graficoManutencao"
    ).style.width =
        `${pManutencao}%`;


    document.getElementById(
        "graficoInativos"
    ).style.width =
        `${pInativos}%`;

}



function gerarGraficosRosca() {
    const painel = document.querySelector(".grafico-container");
    if (!painel) return;
    const resumoCalculado = resumoSituacaoFrota();
    const dadosFrota = [
        { nome: "Disponíveis", valor: resumoCalculado.disponiveis, cor: "#27ae60" },
        { nome: "Alugados", valor: resumoCalculado.alugados, cor: "#008fd0" },
        { nome: "Em manutenção", valor: resumoCalculado.manutencao, cor: "#e67e22" },
        { nome: "Inativos", valor: resumoCalculado.inativos, cor: "#7b8790" }
    ];
    const porCliente = new Map();
    veiculos.forEach((veiculo, indice) => {
        const contrato = contratoMaisRecenteDoVeiculo(indice, veiculo);
        if (!contrato || !contratosFiltrados.includes(contrato)) return;
        const nome = nomeClienteContrato(contrato);
        porCliente.set(nome, (porCliente.get(nome) || 0) + 1);
    });
    const coresClientes = ["#00558b", "#7c4dff", "#d35400", "#00897b", "#c0392b", "#6c757d", "#b8860b", "#1565c0"];
    const dadosClientes = Array.from(porCliente, ([nome, valor], indice) => ({ nome, valor, cor: coresClientes[indice % coresClientes.length] }));
    painel.innerHTML = SegurancaInterface.html(`<div class="dashboard-roscas"><section class="cartao-rosca"><h3>Distribuição da frota</h3><div id="roscaFrota"></div></section><section class="cartao-rosca"><h3>Veículos por locatário</h3><div id="roscaClientes"></div></section></div>`);
    montarRosca("roscaFrota", dadosFrota, "veículos");
    montarRosca("roscaClientes", dadosClientes, "veículos vinculados");
}

function montarRosca(id, dados, rotuloTotal, formatarValor = valor => String(valor)) {
    const alvo = document.getElementById(id);
    if (!alvo) return;
    const total = dados.reduce((soma, item) => soma + item.valor, 0);
    const raio = 68;
    const circunferencia = 2 * Math.PI * raio;
    let deslocamento = 0;
    const fatias = dados.map((item, indice) => {
        if (!total || item.valor <= 0) return "";
        const tamanho = (item.valor / total) * circunferencia;
        const fatia = `<circle class="rosca-fatia" data-indice="${indice}" cx="85" cy="85" r="${raio}" fill="none" stroke="${item.cor}" stroke-width="30" stroke-dasharray="${tamanho} ${circunferencia - tamanho}" stroke-dashoffset="${-deslocamento}" transform="rotate(-90 85 85)"></circle>`;
        deslocamento += tamanho;
        return fatia;
    }).join("");
    const legenda = dados.map(item => {
        const percentual = total ? Math.round((item.valor / total) * 100) : 0;
        return `<li><i style="background:${item.cor}"></i><span>${escaparHTML(item.nome)}</span><strong>${percentual}% · ${formatarValor(item.valor)}</strong></li>`;
    }).join("") || "<li class=\"legenda-vazia\"><span>Nenhum dado disponível para o período selecionado.</span></li>";
    alvo.innerHTML = SegurancaInterface.html(`<div class="rosca-layout"><div class="rosca-grafico"><div class="rosca" role="img" aria-label="Gráfico de ${escaparHTML(rotuloTotal)}"><svg viewBox="0 0 170 170" aria-hidden="true"><circle cx="85" cy="85" r="${raio}" fill="none" stroke="#e6edf1" stroke-width="30"></circle>${fatias}</svg><div class="rosca-centro"><strong>${total}</strong><span>${rotuloTotal}</span></div></div><div class="tooltip-rosca" role="tooltip" hidden></div></div><ul class="legenda-rosca">${legenda}</ul></div>`);

    const tooltip = alvo.querySelector(".tooltip-rosca");
    const mostrarTooltip = (indice, evento) => {
        const item = dados[Number(indice)];
        if (!item || !tooltip || !total) return;
        const percentual = Math.round((item.valor / total) * 100);
        tooltip.textContent = `${item.nome}: ${formatarValor(item.valor)} (${percentual}%)`;
        tooltip.hidden = false;
        const limiteDireito = window.innerWidth - tooltip.offsetWidth - 12;
        tooltip.style.left = `${Math.max(12, Math.min(limiteDireito, evento.clientX + 14))}px`;
        tooltip.style.top = `${Math.max(12, evento.clientY - 42)}px`;
    };
    const esconderTooltip = () => { if (tooltip) tooltip.hidden = true; };
    alvo.querySelectorAll(".rosca-fatia").forEach(fatia => {
        fatia.addEventListener("mouseenter", evento => mostrarTooltip(fatia.dataset.indice, evento));
        fatia.addEventListener("mousemove", evento => mostrarTooltip(fatia.dataset.indice, evento));
        fatia.addEventListener("mouseleave", esconderTooltip);
    });
}

function prepararPainelGrafico(id, ancora, titulo) {
    const secao = document.getElementById(ancora)?.closest(".secao-relatorio");
    if (!secao) return null;
    let painel = document.getElementById(id);
    if (!painel) {
        painel = document.createElement("div");
        painel.id = id;
        painel.className = "graficos-modalidade";
        const cabecalho = document.createElement("h3");
        cabecalho.textContent = titulo;
        painel.appendChild(cabecalho);
        const conteudo = document.createElement("div");
        conteudo.className = "conteudo-grafico-modalidade";
        painel.appendChild(conteudo);
        secao.appendChild(painel);
    }
    return painel.querySelector(".conteudo-grafico-modalidade");
}

function gerarGraficosModalidades() {
    const contem = (valor, termo) => String(valor || "").toLocaleLowerCase("pt-BR").includes(termo);

    const contratos = prepararPainelGrafico("graficosContratos", "totalContratos", "Situação dos contratos");
    if (contratos) {
        contratos.innerHTML = SegurancaInterface.html('<div id="roscaContratos"></div>');
        montarRosca("roscaContratos", [
            { nome: "Ativos", valor: contratosFiltrados.filter(item => contem(statusContrato(item), "ativo")).length, cor: "#27ae60" },
            { nome: "Finalizados", valor: contratosFiltrados.filter(item => contem(statusContrato(item), "finalizado")).length, cor: "#008fd0" },
            { nome: "Cancelados", valor: contratosFiltrados.filter(item => contem(statusContrato(item), "cancelado")).length, cor: "#d9534f" }
        ], "contratos");
    }

    const multas = prepararPainelGrafico("graficosMultas", "totalMultas", "Situação das multas");
    if (multas) {
        multas.innerHTML = SegurancaInterface.html('<div id="roscaMultas"></div>');
        montarRosca("roscaMultas", [
            { nome: "Pendentes", valor: multasFiltradas.filter(item => contem(item.situacao, "pendente")).length, cor: "#e67e22" },
            { nome: "Pagas", valor: multasFiltradas.filter(item => contem(item.situacao, "pago")).length, cor: "#27ae60" },
            { nome: "Em recurso", valor: multasFiltradas.filter(item => contem(item.situacao, "recurso")).length, cor: "#008fd0" },
            { nome: "Canceladas", valor: multasFiltradas.filter(item => contem(item.situacao, "cancelada")).length, cor: "#d9534f" }
        ], "multas");
    }

    const manutencoes = prepararPainelGrafico("graficosManutencoes", "totalManutencoes", "Situação das manutenções");
    if (manutencoes) {
        manutencoes.innerHTML = SegurancaInterface.html('<div id="roscaManutencoes"></div>');
        montarRosca("roscaManutencoes", [
            { nome: "Agendadas", valor: manutencoesFiltradas.filter(item => contem(item.status, "agendada")).length, cor: "#008fd0" },
            { nome: "Em andamento", valor: manutencoesFiltradas.filter(item => contem(item.status, "andamento")).length, cor: "#e67e22" },
            { nome: "Concluídas", valor: manutencoesFiltradas.filter(item => contem(item.status, "concluída")).length, cor: "#27ae60" },
            { nome: "Canceladas", valor: manutencoesFiltradas.filter(item => contem(item.status, "cancelada")).length, cor: "#d9534f" }
        ], "manutenções");
    }

    const financeiro = prepararPainelGrafico("graficosFinanceiro", "receitaContratos", "Composição financeira");
    if (financeiro) {
        const receita = contratosFiltrados.reduce((soma, item) => soma + valorContrato(item), 0);
        const custoManutencao = manutencoesFinanceiras().reduce((soma, item) => soma + valorManutencao(item), 0);
        const custoMultas = multasFinanceiras().reduce((soma, item) => soma + valorNumerico(item.valor), 0);
        financeiro.innerHTML = SegurancaInterface.html('<div id="roscaFinanceiro"></div>');
        montarRosca("roscaFinanceiro", [
            { nome: "Receita de contratos", valor: receita, cor: "#27ae60" },
            { nome: "Custos de manutenção", valor: custoManutencao, cor: "#e67e22" },
            { nome: "Multas", valor: custoMultas, cor: "#d9534f" }
        ], "movimentação", formatarMoeda);
    }

    const faturasGrafico = prepararPainelGrafico("graficosFaturas", "contadorFaturasRelatorio", "Situação das faturas");
    if (faturasGrafico) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const situacaoFatura = fatura => {
            if (fatura.dataPagamento) return "Paga";
            const vencimento = fatura.vencimento ? new Date(`${fatura.vencimento}T00:00:00`) : null;
            return vencimento && vencimento < hoje ? "Vencida" : "Pendente";
        };
        faturasGrafico.innerHTML = SegurancaInterface.html('<div id="roscaFaturas"></div>');
        montarRosca("roscaFaturas", [
            { nome: "Pagas", valor: faturas.filter(item => situacaoFatura(item) === "Paga").length, cor: "#27ae60" },
            { nome: "Pendentes", valor: faturas.filter(item => situacaoFatura(item) === "Pendente").length, cor: "#008fd0" },
            { nome: "Vencidas", valor: faturas.filter(item => situacaoFatura(item) === "Vencida").length, cor: "#d9534f" }
        ], "faturas");
    }
}

/* =====================================================
   STATUS VISUAL
===================================================== */

function classeStatus(
    status
) {

    switch (
        status
    ) {

        case "Ativo":
        case "Pago":
        case "Concluída":

            return "status-verde";


        case "Pendente":
        case "Agendada":
        case "Em andamento":

            return "status-amarelo";


        case "Finalizado":
        case "Recurso":

            return "status-azul";


        case "Cancelado":
        case "Cancelada":
        case "Vencida":

            return "status-vermelho";


        default:

            return "status-cinza";

    }

}



/* =====================================================
   TABELA CONTRATOS
===================================================== */

function gerarTabelaContratos() {

    const tbody =
        document.getElementById(
            "tabelaContratosRelatorio"
        );


    const vazio =
        document.getElementById(
            "semContratos"
        );


    tbody.innerHTML = SegurancaInterface.html("");


    contratosFiltrados.forEach(
        (
            contrato,
            indice
        ) => {

            const status =
                statusContrato(
                    contrato
                );


            const tr =
                document.createElement(
                    "tr"
                );


            tr.innerHTML = SegurancaInterface.html(`

                <td>
                    <strong>
                        ${escaparHTML(
                            numeroContrato(
                                contrato,
                                indice
                            )
                        )}
                    </strong>
                </td>

                <td>
                    ${escaparHTML(
                        nomeClienteContrato(
                            contrato
                        )
                    )}
                </td>

                <td>
                    ${escaparHTML(
                        descricaoVeiculoContrato(
                            contrato
                        )
                    )}
                </td>

                <td>
                    ${formatarData(
                        inicioContrato(
                            contrato
                        )
                    )}
                </td>

                <td>
                    ${formatarData(
                        fimContrato(
                            contrato
                        )
                    )}
                </td>

                <td>

                    <span class="
                        status
                        ${classeStatus(
                            status
                        )}
                    ">

                        ${escaparHTML(
                            status
                        )}

                    </span>

                </td>

                <td class="valor-positivo">
                    ${formatarMoeda(
                        valorContrato(
                            contrato
                        )
                    )}
                </td>

            `);


            tbody.appendChild(
                tr
            );

        }
    );


    vazio.style.display =

        contratosFiltrados.length

        ? "none"

        : "block";


    document.getElementById(
        "contadorContratosRelatorio"
    ).textContent =

        `${contratosFiltrados.length} registro(s)`;

}



/* =====================================================
   TABELA MULTAS
===================================================== */

function gerarTabelaMultas() {

    const tbody =
        document.getElementById(
            "tabelaMultasRelatorio"
        );


    const vazio =
        document.getElementById(
            "semMultas"
        );


    tbody.innerHTML = SegurancaInterface.html("");


    multasFiltradas.forEach(
        multa => {

            const tr =
                document.createElement(
                    "tr"
                );


            tr.innerHTML = SegurancaInterface.html(`

                <td>
                    <strong>
                        ${escaparHTML(
                            multa.autoInfracao ||
                            "-"
                        )}
                    </strong>
                </td>

                <td>
                    ${escaparHTML(
                        multa.placa ||
                        "-"
                    )}
                </td>

                <td>
                    ${escaparHTML(
                        multa.cliente ||
                        "-"
                    )}
                </td>

                <td>
                    ${formatarData(
                        multa.data
                    )}
                </td>

                <td>

                    <span class="
                        status
                        ${classeStatus(
                            multa.situacao
                        )}
                    ">

                        ${escaparHTML(
                            multa.situacao ||
                            "-"
                        )}

                    </span>

                </td>

                <td class="valor-negativo">

                    ${formatarMoeda(
                        multa.valor
                    )}

                </td>

            `);


            tbody.appendChild(
                tr
            );

        }
    );


    vazio.style.display =

        multasFiltradas.length

        ? "none"

        : "block";


    document.getElementById(
        "contadorMultasRelatorio"
    ).textContent =

        `${multasFiltradas.length} registro(s)`;

}



/* =====================================================
   TABELA MANUTENÇÕES
===================================================== */

function gerarTabelaManutencoes() {

    const tbody =
        document.getElementById(
            "tabelaManutencoesRelatorio"
        );


    const vazio =
        document.getElementById(
            "semManutencoes"
        );


    tbody.innerHTML = SegurancaInterface.html("");


    manutencoesFiltradas.forEach(
        manutencao => {

            const tr =
                document.createElement(
                    "tr"
                );


            tr.innerHTML = SegurancaInterface.html(`

                <td>
                    ${escaparHTML(
                        descricaoVeiculoManutencao(
                            manutencao
                        )
                    )}
                </td>

                <td>
                    ${escaparHTML(
                        manutencao.tipo ||
                        "-"
                    )}
                </td>

                <td>
                    ${escaparHTML(
                        manutencao.oficina ||
                        "-"
                    )}
                </td>

                <td>
                    ${formatarData(
                        manutencao.dataEntrada
                    )}
                </td>

                <td>

                    <span class="
                        status
                        ${classeStatus(
                            manutencao.status
                        )}
                    ">

                        ${escaparHTML(
                            manutencao.status ||
                            "-"
                        )}

                    </span>

                </td>

                <td class="valor-negativo">

                    ${formatarMoeda(
                        valorManutencao(
                            manutencao
                        )
                    )}

                </td>

            `);


            tbody.appendChild(
                tr
            );

        }
    );


    vazio.style.display =

        manutencoesFiltradas.length

        ? "none"

        : "block";


    document.getElementById(
        "contadorManutencoesRelatorio"
    ).textContent =

        `${manutencoesFiltradas.length} registro(s)`;

}



/* =====================================================
   TABELA FATURAS
===================================================== */

function gerarTabelaFaturas() {

    const tbody =
        document.getElementById(
            "tabelaFaturasRelatorio"
        );

    const vazio =
        document.getElementById(
            "semFaturas"
        );

    const lista = [...faturas].sort(
        (a, b) =>
            String(a.vencimento || "").localeCompare(
                String(b.vencimento || "")
            )
    );

    tbody.innerHTML = SegurancaInterface.html("");

    const situacaoFaturaRelatorio =
        function(fatura) {

            if (fatura.dataPagamento) return "Pago";

            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            const vencimento = new Date(
                `${fatura.vencimento}T00:00:00`
            );

            return vencimento < hoje
                ? "Vencida"
                : "Pendente";

        };


    lista.forEach(
        fatura => {

            const tr =
                document.createElement("tr");

            const situacao =
                situacaoFaturaRelatorio(fatura);

            tr.innerHTML = SegurancaInterface.html(`
                <td><strong>${escaparHTML(fatura.numero || "-")}</strong></td>
                <td>${escaparHTML(fatura.tipo || "-")}</td>
                <td>${escaparHTML(fatura.cliente || "-")}</td>
                <td>${escaparHTML(fatura.contrato || "-")}</td>
                <td>${escaparHTML(fatura.descricao || "-")}</td>
                <td>${formatarData(fatura.vencimento)}</td>
                <td>${formatarData(fatura.dataPagamento)}</td>
                <td>
                    <span class="status ${classeStatus(situacao)}">
                        ${escaparHTML(situacao)}
                    </span>
                </td>
                <td class="valor-positivo">${formatarMoeda(fatura.valor)}</td>
            `);

            tbody.appendChild(tr);

        }
    );

    vazio.style.display = lista.length ? "none" : "block";

    document.getElementById(
        "contadorFaturasRelatorio"
    ).textContent = `${lista.length} registro(s)`;

}

function mesDaData(data) {
    if (!data) return "-";
    const nomes = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    return nomes[Number(String(data).slice(5, 7)) - 1] || "-";
}

function atualizarPaginacaoVeiculos() {
    const resumo = document.getElementById("paginaVeiculosResumo");
    const anterior = document.getElementById("paginaVeiculosAnterior");
    const proxima = document.getElementById("paginaVeiculosProxima");
    if (resumo) resumo.textContent = `Página ${paginacaoVeiculos.page} de ${Math.max(1, paginacaoVeiculos.pages)} · ${paginacaoVeiculos.total} registro(s)`;
    if (anterior) anterior.disabled = paginacaoVeiculos.page <= 1;
    if (proxima) proxima.disabled = paginacaoVeiculos.page >= paginacaoVeiculos.pages;
}

function estadoVeiculos(texto, erro = false) {
    const elemento = document.getElementById("estadoRelatorioVeiculos");
    if (!elemento) return;
    elemento.textContent = texto || "";
    elemento.className = `estado-relatorio-veiculos${texto ? " ativo" : ""}${erro ? " erro" : ""}`;
}

async function carregarRelatorioVeiculos(page = paginacaoVeiculos.page || 1) {
    if (!window.api) return;
    const parametros = new URLSearchParams({ page: String(page), limit: "50" });
    const modelo = document.getElementById("filtroVeiculo")?.value;
    const dataInicial = document.getElementById("dataInicial")?.value;
    const dataFinal = document.getElementById("dataFinal")?.value;
    const clienteIds = Array.from(document.getElementById("filtroCliente")?.selectedOptions || []).map(item => item.value).filter(Boolean);
    if (modelo) parametros.set("modelo", modelo);
    if (dataInicial) parametros.set("dataInicial", dataInicial);
    if (dataFinal) parametros.set("dataFinal", dataFinal);
    if (clienteIds.length) parametros.set("clienteIds", clienteIds.join(","));
    estadoVeiculos("Carregando veículos do banco de dados...");
    try {
        const resposta = await api.get(`/relatorios/veiculos?${parametros}`);
        relatorioVeiculos = resposta.data || [];
        paginacaoVeiculos = resposta.pagination || { page: 1, pages: 1, total: relatorioVeiculos.length };
        estadoVeiculos(relatorioVeiculos.length ? "" : "Nenhum veículo encontrado para os filtros selecionados.");
    } catch (erro) {
        relatorioVeiculos = [];
        paginacaoVeiculos = { page: 1, pages: 1, total: 0 };
        estadoVeiculos(erro.message || "Não foi possível carregar o relatório de veículos.", true);
    }
    atualizarPaginacaoVeiculos();
}

function gerarTabelaVeiculos() {
    const tabela = document.getElementById("tabelaVeiculosRelatorio");
    if (!tabela) return;
    tabela.innerHTML = SegurancaInterface.html("");
    if (!relatorioVeiculos.length) {
        tabela.innerHTML = SegurancaInterface.html('<tr><td colspan="14" class="mensagem-vazia">Nenhum veículo encontrado.</td></tr>');
        return;
    }
    relatorioVeiculos.forEach((veiculo, indice) => {
        const linha = document.createElement("tr");
        const numero = (paginacaoVeiculos.page - 1) * 50 + indice + 1;
        const inicioFiltro = document.getElementById("dataInicial")?.value;
        const fimFiltro = document.getElementById("dataFinal")?.value;
        const dataInicialExibida = inicioFiltro || veiculo.dataInicial;
        const dataFinalExibida = fimFiltro || veiculo.dataFinal;
        const diasExibidos = dataInicialExibida && dataFinalExibida ? Math.floor((new Date(`${dataFinalExibida}T12:00:00`) - new Date(`${dataInicialExibida}T12:00:00`)) / 86400000) + 1 : veiculo.diasTotal;
        linha.innerHTML = SegurancaInterface.html(`<td>${numero}</td><td><strong>${escaparHTML(veiculo.placa || "-")}</strong></td><td>${escaparHTML(veiculo.renavam || "-")}</td><td>${escaparHTML(veiculo.chassi || "-")}</td><td>${escaparHTML(veiculo.modelo || "-")}</td><td>${escaparHTML(veiculo.anoFabricacao || "-")}</td><td>${escaparHTML(mesDaData(dataInicialExibida))}</td><td>${formatarData(dataInicialExibida)}</td><td>${formatarData(dataFinalExibida)}</td><td>${escaparHTML(diasExibidos ?? "-")}</td><td class="valor-positivo">${veiculo.valorMensal == null ? "-" : formatarMoeda(veiculo.valorMensal)}</td><td>${escaparHTML(veiculo.cliente || "-")}</td><td>${escaparHTML(veiculo.localizacao || "-")}</td><td><span class="status ${classeStatus(veiculo.statusContrato || veiculo.statusVeiculo)}">${escaparHTML(veiculo.statusContrato || veiculo.statusVeiculo || "-")}</span></td>`);
        tabela.appendChild(linha);
    });
}



/* =====================================================
   DATA DE GERAÇÃO
===================================================== */

function atualizarDataGeracao() {

    const agora =
        new Date();


    document.getElementById(
        "dataGeracao"
    ).textContent =

        agora.toLocaleString(
            "pt-BR"
        );

    let sessao = {};
    let empresa = {};
    try { sessao = JSON.parse(Banco.getItem("sessaoUsuario")) || {}; empresa = JSON.parse(Banco.getItem("configuracoesEmpresa")) || {}; } catch (erro) {}
    const campoEmitente = document.getElementById("emitenteRelatorio");
    if (campoEmitente) campoEmitente.textContent = `Emitido por: ${usuarioRelatorioAtual?.nome || sessao.nome || usuario || "Usuário não identificado"} · ${usuarioRelatorioAtual?.cargo || sessao.cargo || "Não informado"} · CNPJ: ${empresa.cnpj || "Não cadastrado"}`;

}

function registrarEmissaoRelatorio(titulo) {
    let sessao = {};
    try { sessao = JSON.parse(Banco.getItem("sessaoUsuario")) || {}; } catch (erro) {}
    let historico = [];
    try { historico = JSON.parse(Banco.getItem("historicoRelatoriosEmitidos")) || []; } catch (erro) {}
    historico.unshift({ id: Date.now(), relatorio: titulo, emitidoEm: new Date().toISOString(), emitidoPor: sessao.nome || usuario || "Usuário não identificado", cargo: sessao.cargo || "Não informado" });
    Banco.setItem("historicoRelatoriosEmitidos", JSON.stringify(historico.slice(0, 100))).catch(error=>console.error(error.message));
}



/* =====================================================
   IMPRIMIR
===================================================== */

function imprimirRelatorio() {

    atualizarDataGeracao();
    registrarEmissaoRelatorio("Relatório geral");


    window.print();

}



/* =====================================================
   PDF POR TÓPICO
===================================================== */

function adicionarBotoesPdfTopicos() {

    document.querySelectorAll(
        ".secao-relatorio"
    ).forEach(
        function(secao) {

            const titulo =
                secao.querySelector(
                    ".secao-titulo"
                );


            if (!titulo ||
                titulo.querySelector(
                    ".btn-pdf-topico"
                )) {

                return;

            }


            const botao =
                document.createElement("button");

            botao.type = "button";

            botao.className =
                "btn-pdf-topico no-print";

            botao.textContent =
                "🖨️ Gerar PDF deste tópico";


            botao.addEventListener(
                "click",
                function() {

                    imprimirTopicoRelatorio(secao);

                }
            );


            titulo.appendChild(botao);

        }
    );

}


function imprimirTopicoRelatorio(
    secao
) {

    atualizarDataGeracao();
    registrarEmissaoRelatorio(secao.querySelector(".secao-titulo")?.textContent.trim() || "Tópico de relatório");


    document.body.classList.add(
        "imprimir-topico"
    );

    secao.classList.add(
        "topico-impressao"
    );


    window.print();


    secao.classList.remove(
        "topico-impressao"
    );

    document.body.classList.remove(
        "imprimir-topico"
    );

}



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

try {
    let sessaoConfiguracoes = JSON.parse(Banco.getItem("sessaoUsuario")) || null;
    if (!sessaoConfiguracoes && Banco.getItem("usuarioLogado")) { sessaoConfiguracoes = { perfil: "admin" }; localStorage.setItem("sessaoUsuario", JSON.stringify({ id: "sessao-legada", nome: Banco.getItem("usuarioLogado"), cargo: "Administrador", perfil: "admin", permissoes: ["*"] })); }
    sessaoConfiguracoes = sessaoConfiguracoes || {};
    document.querySelectorAll(".link-configuracoes").forEach(link => link.style.display = sessaoConfiguracoes.perfil === "admin" ? "block" : "none");
} catch (erro) {}



/* =====================================================
   INICIALIZAÇÃO
===================================================== */

async function carregarCadastrosDoBackend() {
    if (!window.api) throw new Error("Módulo de comunicação com a API indisponível.");
    async function carregarTodos(caminho) {
        const itens = [];
        for (let pagina = 1; pagina <= 1000; pagina += 1) {
            const resposta = await api.get(`${caminho}${caminho.includes("?") ? "&" : "?"}page=${pagina}&limit=100`);
            itens.push(...(resposta.data || []));
            if (pagina >= (resposta.pagination?.pages || 1)) break;
        }
        return itens;
    }
    const [listaVeiculos, listaClientes, listaContratos, sessao] = await Promise.all([
        carregarTodos("/veiculos"), carregarTodos("/clientes"), carregarTodos("/contratos"), api.get("/auth/me")
    ]);
    veiculos = listaVeiculos;
    clientes = listaClientes;
    usuarioRelatorioAtual = sessao.data?.user || null;
    const nomeUsuario = document.getElementById("nomeUsuario");
    if (nomeUsuario && usuarioRelatorioAtual?.nome) nomeUsuario.textContent = usuarioRelatorioAtual.nome;
    document.querySelectorAll(".link-configuracoes").forEach(link => {
        link.style.display = usuarioRelatorioAtual?.perfil === "administrador" ? "block" : "none";
    });
    contratos = listaContratos.map(contrato => {
        const vinculados = contrato.veiculos || [];
        return { ...contrato, cliente: String(contrato.clienteId), clienteIndice: undefined,
            veiculo: vinculados[0] ? String(vinculados[0].id) : "", veiculos: vinculados.map(item => String(item.id)),
            veiculoPlaca: vinculados.map(item => item.placa).filter(Boolean).join(", "),
            veiculoDescricao: vinculados.map(item => `${item.placa || "-"} — ${item.marca || ""} ${item.modelo || ""}`.trim()).join("; ") };
    });
}

async function inicializar() {

    carregarDados();

    try { await carregarCadastrosDoBackend(); }
    catch (erro) { estadoVeiculos(erro.message || "Não foi possível acessar o banco de dados.", true); }


    carregarFiltroVeiculos();

    carregarFiltroClientes();

    await carregarRelatorioVeiculos(1);

    adicionarBotoesPdfTopicos();


    contratosFiltrados =
        [...contratos];


    multasFiltradas =
        [...multas];


    manutencoesFiltradas =
        [...manutencoes];


    atualizarDataGeracao();


    atualizarPeriodo();


    mostrarTipoRelatorio(
        "geral"
    );


    gerarRelatorios();

}


document.getElementById("paginaVeiculosAnterior")?.addEventListener("click", async () => { await carregarRelatorioVeiculos(paginacaoVeiculos.page - 1); gerarTabelaVeiculos(); });
document.getElementById("paginaVeiculosProxima")?.addEventListener("click", async () => { await carregarRelatorioVeiculos(paginacaoVeiculos.page + 1); gerarTabelaVeiculos(); });

const inicializacaoRelatorios = inicializar().finally(ocultarRelatoriosAteSolicitacao);

function gerarLicenciamento() {
 const valor=id=>document.getElementById(id).value;
 const exercicio=Number(valor('exercicioLicenciamento')),situacao=valor('situacaoLicenciamento'),final=valor('finalLicenciamento'),ano=valor('anoCrlvFiltro'),modelo=valor('filtroVeiculo'),hoje=LicenciamentoSP.hoje();
 const linhas=veiculos.map(v=>({v,r:LicenciamentoSP.avaliar(v,exercicio,hoje)})).filter(({v,r})=>(!situacao||r.status===situacao)&&(final===''||r.final===final)&&(!ano||Number(v.anoLicenciamento)===Number(ano))&&(!modelo||v.modelo===modelo)).sort((a,b)=>(a.r.prazo||'9999').localeCompare(b.r.prazo||'9999')||a.v.placa.localeCompare(b.v.placa));
 const labels=document.getElementById('situacaoLicenciamento');
 document.getElementById('resumoLicenciamento').textContent='Exercício '+exercicio+' • Consulta em '+formatarData(hoje)+' • '+labels.options[labels.selectedIndex].text+' • Final: '+(final||'Todos')+' • Último CRLV: '+(ano||'Todos')+' • Modelo: '+(modelo||'Todos')+' • '+linhas.length+' veículo(s)';
 document.getElementById('tabelaLicenciamento').innerHTML=SegurancaInterface.html(linhas.length?linhas.map(({v,r})=>'<tr>'+[v.placa,r.final??'—',[v.marca,v.modelo].filter(Boolean).join(' '),v.ufRegistro||'Não informada',v.grupoLicenciamento==='caminhao'?'Caminhão':v.grupoLicenciamento==='geral'?'Geral':'Não informado',v.anoLicenciamento||'Não informado',r.prazo?formatarData(r.prazo):'—',r.rotulo].map(x=>'<td>'+escaparHTML(x)+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="8">Nenhum veículo encontrado para esses filtros.</td></tr>');
}
