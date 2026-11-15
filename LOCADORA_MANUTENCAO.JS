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

let manutencoes =
    JSON.parse(
        Banco.getItem("manutencoes")
    ) || [];

let veiculos =
    JSON.parse(
        Banco.getItem("veiculos")
    ) || [];

let indiceEdicao = null;
let indiceFicha = null;
const arquivoManutencaoInput=document.createElement("input");arquivoManutencaoInput.type="file";arquivoManutencaoInput.accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";arquivoManutencaoInput.multiple=true;arquivoManutencaoInput.id="arquivosManutencao";
const campoArquivosManutencao=document.createElement("div");campoArquivosManutencao.className="campo campo-completo";const rotuloArquivosManutencao=document.createElement("label");rotuloArquivosManutencao.htmlFor=arquivoManutencaoInput.id;rotuloArquivosManutencao.textContent="Arquivos do serviço ou produto (até 5)";const estadoArquivosManutencao=document.createElement("small");estadoArquivosManutencao.id="estadoArquivosManutencao";estadoArquivosManutencao.textContent="Anexe PDFs ou imagens de notas, peças e serviços. Máximo de 5 arquivos por manutenção.";campoArquivosManutencao.append(rotuloArquivosManutencao,arquivoManutencaoInput,estadoArquivosManutencao);document.getElementById("observacoes").parentElement.after(campoArquivosManutencao);
arquivoManutencaoInput.addEventListener("change",async()=>{const files=Array.from(arquivoManutencaoInput.files||[]);if(files.length>5){arquivoManutencaoInput.value="";estadoArquivosManutencao.textContent="Selecione no máximo 5 arquivos.";return;}try{for(const file of files)await ArquivosSeguros.validateFile(file,file.type.startsWith("image/"));estadoArquivosManutencao.textContent=files.length?`${files.length} arquivo(s) selecionado(s). Serão enviados ao Google Drive ao salvar.`:"Nenhum arquivo selecionado.";}catch(error){arquivoManutencaoInput.value="";estadoArquivosManutencao.textContent=error.message;}});


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

    veiculos.forEach((veiculo, indice) => {

        const option =
            document.createElement("option");

        option.value = indice;

        option.textContent =
            `${veiculo.placa} - ${veiculo.marca} ${veiculo.modelo}`;

        select.appendChild(option);

    });

}


/* =====================================
   FORMULÁRIO
===================================== */

function abrirFormulario() {

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
   LIMPAR
===================================== */

function limparFormulario() {

    document.getElementById("veiculo").value = "";
    document.getElementById("tipo").value = "";
    document.getElementById("oficina").value = "";
    document.getElementById("dataEntrada").value = "";
    document.getElementById("dataSaida").value = "";
    document.getElementById("quilometragem").value = "";
    document.getElementById("valorPecas").value = "";
    document.getElementById("valorMaoObra").value = "";
    document.getElementById("status").value = "Agendada";
    document.getElementById("proximaData").value = "";
    document.getElementById("proximaKm").value = "";
    document.getElementById("pecas").value = "";
    document.getElementById("descricao").value = "";
    document.getElementById("observacoes").value = "";
    arquivoManutencaoInput.value="";estadoArquivosManutencao.textContent="Anexe PDFs ou imagens de notas, peças e serviços. Máximo de 5 arquivos por manutenção.";

}


/* =====================================
   SALVAR
===================================== */

async function salvarManutencao() {

    const arquivosSelecionados=Array.from(arquivoManutencaoInput.files||[]);
    if(arquivosSelecionados.length>5){alert("Selecione no máximo 5 arquivos para esta manutenção.");return;}

    const veiculo =
        document.getElementById("veiculo").value;

    const tipo =
        document.getElementById("tipo").value;

    const oficina =
        document.getElementById("oficina").value.trim();

    const dataEntrada =
        document.getElementById("dataEntrada").value;

    const dataSaida =
        document.getElementById("dataSaida").value;

    const quilometragem =
        String(document.getElementById("quilometragem").value).replace(/\D/g, "");

    const valorPecas =
        window.valorMascaraParaNumero(document.getElementById("valorPecas").value);

    const valorMaoObra =
        window.valorMascaraParaNumero(document.getElementById("valorMaoObra").value);

    const status =
        document.getElementById("status").value;

    const proximaData =
        document.getElementById("proximaData").value;

    const proximaKm =
        String(document.getElementById("proximaKm").value).replace(/\D/g, "");

    const pecas =
        document.getElementById("pecas").value.trim();

    const descricao =
        document.getElementById("descricao").value.trim();

    const observacoes =
        document.getElementById("observacoes").value.trim();


    if (
        veiculo === "" ||
        tipo === "" ||
        dataEntrada === "" ||
        descricao === ""
    ) {

        alert(
            "Preencha os campos obrigatórios."
        );

        return;

    }


    if(dataSaida && dataSaida < dataEntrada){alert("A saída não pode ser anterior à entrada.");return;}
    if(arquivosSelecionados.length&&indiceEdicao!==null){
        try{const atual=manutencoes[indiceEdicao],anexos=await api.driveFiles("manutencao",atual._dbId||atual.id);if(anexos.data.length+arquivosSelecionados.length>5){alert(`Esta manutenção já possui ${anexos.data.length} arquivo(s). O limite total é 5.`);return;}}
        catch(error){alert(error.message);return;}
    }
    const valorTotal =
        Valores.somar([valorPecas, valorMaoObra]);


    const manutencao = {
        ...(indiceEdicao === null ? {} : manutencoes[indiceEdicao]),

        veiculo,
        tipo,
        oficina,
        dataEntrada,
        dataSaida,
        quilometragem,
        valorPecas,
        valorMaoObra,
        valorTotal,
        status,
        proximaData,
        proximaKm,
        pecas,
        descricao,
        observacoes

    };


    if (indiceEdicao === null) {

        manutencoes.push(
            manutencao
        );

    } else {

        manutencoes[indiceEdicao] =
            manutencao;

    }


    await Banco.setItem(
        "manutencoes",
        JSON.stringify(manutencoes)
    );

    if(arquivosSelecionados.length){
        const salvo=manutencoes[indiceEdicao===null?manutencoes.length-1:indiceEdicao],id=salvo?._dbId||salvo?.id;
        if(!id){alert("Manutenção salva, mas não foi possível identificar o cadastro para associar os anexos.");return;}
        try{for(const file of arquivosSelecionados)await api.driveUpload("manutencao",id,"documentos",file,file.name);}
        catch(error){alert(`A manutenção foi salva, mas houve falha ao enviar os anexos: ${error.message}`);return;}
    }


    fecharFormulario();

    mostrarManutencoes();

}


/* =====================================
   NOME DO VEÍCULO
===================================== */

function nomeVeiculo(indice) {

    const veiculo =
        veiculos[indice];

    if (!veiculo) {

        return "Veículo não encontrado";

    }

    return `${veiculo.placa} - ${veiculo.marca} ${veiculo.modelo}`;

}


/* =====================================
   FORMATAÇÃO
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


function formatarMoeda(valor) {

    return Number(valor || 0).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );

}


/* =====================================
   STATUS
===================================== */

function classeStatus(status) {

    if (status === "Agendada") {

        return "status-agendada";

    }

    if (status === "Em andamento") {

        return "status-andamento";

    }

    if (status === "Concluída") {

        return "status-concluida";

    }

    return "status-cancelada";

}


/* =====================================
   MOSTRAR
===================================== */

function mostrarManutencoes(
    lista = manutencoes
) {

    const tabela =
        document.getElementById(
            "tabelaManutencoes"
        );

    const mensagem =
        document.getElementById(
            "mensagemVazia"
        );

    tabela.innerHTML = SegurancaInterface.html("");


    if (lista.length === 0) {

        mensagem.style.display =
            "block";

    } else {

        mensagem.style.display =
            "none";

    }


    lista.forEach(
        (manutencao, indice) => {

            const linha =
                document.createElement("tr");


            linha.innerHTML = SegurancaInterface.html(`

                <td>
                    <strong>
                        ${nomeVeiculo(
                            manutencao.veiculo
                        )}
                    </strong>
                </td>

                <td>
                    ${manutencao.tipo}
                </td>

                <td>
                    ${manutencao.oficina || "-"}
                </td>

                <td>
                    ${formatarData(
                        manutencao.dataEntrada
                    )}
                </td>

                <td>
                    ${formatarMoeda(
                        manutencao.valorTotal
                    )}
                </td>

                <td>

                    <span class="status
                        ${classeStatus(
                            manutencao.status
                        )}">

                        ${manutencao.status}

                    </span>

                </td>

                <td>

                    <button
                        class="btn-ficha"
                        data-sec-click="h37" data-sec-arg="${SegurancaInterface.escape(indice)}">

                        Ficha

                    </button>

                    <button
                        class="btn-editar"
                        data-sec-click="h61" data-sec-arg="${SegurancaInterface.escape(indice)}">

                        Editar

                    </button>

                    <button
                        class="btn-excluir"
                        data-sec-click="h62" data-sec-arg="${SegurancaInterface.escape(indice)}">

                        Excluir

                    </button>

                </td>

            `);


            tabela.appendChild(linha);

        }
    );


    document.getElementById(
        "contador"
    ).textContent =
        `${lista.length} manutenção(ões)`;


    atualizarResumo();

}


/* =====================================
   RESUMO
===================================== */

function atualizarResumo() {

    document.getElementById(
        "totalManutencoes"
    ).textContent =
        manutencoes.length;


    document.getElementById(
        "totalAgendadas"
    ).textContent =
        manutencoes.filter(
            m => m.status === "Agendada"
        ).length;


    document.getElementById(
        "totalAndamento"
    ).textContent =
        manutencoes.filter(
            m => m.status === "Em andamento"
        ).length;


    document.getElementById(
        "totalConcluidas"
    ).textContent =
        manutencoes.filter(
            m => m.status === "Concluída"
        ).length;

}


/* =====================================
   EDITAR
===================================== */

function editarManutencao(indice) {

    const manutencao =
        manutencoes[indice];

    carregarVeiculos();


    document.getElementById(
        "veiculo"
    ).value =
        manutencao.veiculo;


    document.getElementById(
        "tipo"
    ).value =
        manutencao.tipo;


    document.getElementById(
        "oficina"
    ).value =
        manutencao.oficina;


    document.getElementById(
        "dataEntrada"
    ).value =
        manutencao.dataEntrada;


    document.getElementById(
        "dataSaida"
    ).value =
        manutencao.dataSaida;


    document.getElementById(
        "quilometragem"
    ).value =
        manutencao.quilometragem;


    document.getElementById(
        "valorPecas"
    ).value =
        manutencao.valorPecas;


    document.getElementById(
        "valorMaoObra"
    ).value =
        manutencao.valorMaoObra;


    document.getElementById(
        "status"
    ).value =
        manutencao.status;


    document.getElementById(
        "proximaData"
    ).value =
        manutencao.proximaData;


    document.getElementById(
        "proximaKm"
    ).value =
        manutencao.proximaKm;


    document.getElementById(
        "pecas"
    ).value =
        manutencao.pecas;


    document.getElementById(
        "descricao"
    ).value =
        manutencao.descricao;


    document.getElementById(
        "observacoes"
    ).value =
        manutencao.observacoes;


    indiceEdicao =
        indice;


    document.getElementById(
        "formulario"
    ).classList.add("mostrar");

}


/* =====================================
   EXCLUIR
===================================== */

async function excluirManutencao(indice) {

    const confirmar =
        confirm(
            "Deseja realmente excluir esta manutenção?"
        );


    if (!confirmar) {

        return;

    }


    manutencoes.splice(
        indice,
        1
    );


    await Banco.setItem(
        "manutencoes",
        JSON.stringify(
            manutencoes
        )
    );


    mostrarManutencoes();

}


/* =====================================
   PESQUISA
===================================== */

function pesquisarManutencoes() {

    const pesquisa =
        document.getElementById(
            "campoPesquisa"
        ).value
        .toLowerCase()
        .trim();


    const resultado =
        manutencoes.filter(
            manutencao => {

                const veiculo =
                    nomeVeiculo(
                        manutencao.veiculo
                    ).toLowerCase();


                return (

                    veiculo.includes(pesquisa)

                    ||

                    manutencao.tipo
                        .toLowerCase()
                        .includes(pesquisa)

                    ||

                    manutencao.oficina
                        .toLowerCase()
                        .includes(pesquisa)

                    ||

                    manutencao.descricao
                        .toLowerCase()
                        .includes(pesquisa)

                );

            }
        );


    mostrarManutencoes(
        resultado
    );

}


/* =====================================
   FICHA
===================================== */

function abrirFicha(indice) {

    const manutencao =
        manutencoes[indice];

    indiceFicha =
        indice;


    document.getElementById(
        "fichaSubtitulo"
    ).textContent =
        `${nomeVeiculo(
            manutencao.veiculo
        )} • ${manutencao.tipo}`;


    document.getElementById(
        "fichaVeiculo"
    ).textContent =
        nomeVeiculo(
            manutencao.veiculo
        );


    document.getElementById(
        "fichaTipo"
    ).textContent =
        manutencao.tipo || "-";


    document.getElementById(
        "fichaOficina"
    ).textContent =
        manutencao.oficina || "-";


    document.getElementById(
        "fichaStatus"
    ).textContent =
        manutencao.status || "-";


    document.getElementById(
        "fichaEntrada"
    ).textContent =
        formatarData(
            manutencao.dataEntrada
        );


    document.getElementById(
        "fichaSaida"
    ).textContent =
        formatarData(
            manutencao.dataSaida
        );


    document.getElementById(
        "fichaKm"
    ).textContent =
        manutencao.quilometragem
            ? `${manutencao.quilometragem} km`
            : "-";


    document.getElementById(
        "fichaValor"
    ).textContent =
        formatarMoeda(
            manutencao.valorTotal
        );


    document.getElementById(
        "fichaDescricao"
    ).textContent =
        manutencao.descricao || "-";


    document.getElementById(
        "fichaPecas"
    ).textContent =
        manutencao.pecas || "-";


    document.getElementById(
        "fichaProximaData"
    ).textContent =
        formatarData(
            manutencao.proximaData
        );


    document.getElementById(
        "fichaProximaKm"
    ).textContent =
        manutencao.proximaKm
            ? `${manutencao.proximaKm} km`
            : "-";


    document.getElementById(
        "fichaObservacoes"
    ).textContent =
        manutencao.observacoes ||
        "Nenhuma observação registrada.";


    document.getElementById(
        "modalFicha"
    ).classList.add("mostrar");

    const anexos=document.getElementById("driveDocsManutencao");
    api.drivePanel("manutencao",manutencao._dbId||manutencao.id,anexos).catch(error=>{anexos.textContent=error.message;});

}


/* =====================================
   FECHAR FICHA
===================================== */

function fecharFicha() {

    document.getElementById(
        "modalFicha"
    ).classList.remove("mostrar");

    indiceFicha =
        null;

}


/* =====================================
   EDITAR PELA FICHA
===================================== */

function editarDaFicha() {

    if (indiceFicha === null) {

        return;

    }

    const indice =
        indiceFicha;

    fecharFicha();

    editarManutencao(indice);

}


/* =====================================
   GERAR PDF DA MANUTENÇÃO
===================================== */

function gerarPdfManutencao() {

    if (indiceFicha === null) {

        alert(
            "Abra a ficha de uma manutenção para gerar o PDF."
        );

        return;

    }


    window.print();

}



/* =====================================
   MODAL
===================================== */

document.getElementById(
    "modalFicha"
).addEventListener(
    "click",
    function(event) {

        if (
            event.target === this
        ) {

            fecharFicha();

        }

    }
);


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


/* =====================================
   INICIALIZAÇÃO
===================================== */

carregarVeiculos();

mostrarManutencoes();
