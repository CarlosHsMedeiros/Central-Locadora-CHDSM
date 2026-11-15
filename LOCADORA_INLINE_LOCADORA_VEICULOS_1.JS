


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

let veiculos =
    JSON.parse(
        Banco.getItem("veiculos")
    ) || [];


let indiceEdicao = null;

let indiceFicha = null;



/* =====================================
   FORMULÁRIO
===================================== */

function abrirFormulario() {

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
        "placa"
    ).value = "";

    document.getElementById(
        "renavam"
    ).value = "";

    document.getElementById(
        "chassi"
    ).value = "";

    document.getElementById(
        "marca"
    ).value = "";

    document.getElementById(
        "modelo"
    ).value = "";

    document.getElementById(
        "ano"
    ).value = "";

    document.getElementById(
        "cor"
    ).value = "";

    document.getElementById(
        "quilometragem"
    ).value = "";

    document.getElementById(
        "situacao"
    ).value =
        "Disponível";

    document.getElementById(
        "localizacao"
    ).value = "";

}



/* =====================================
   SALVAR
===================================== */

function salvarVeiculo() {


    const placa =
        document.getElementById(
            "placa"
        ).value.trim();


    const renavam =
        document.getElementById(
            "renavam"
        ).value.trim();


    const marca =
        document.getElementById(
            "marca"
        ).value.trim();

    const chassi =
        document.getElementById(
            "chassi"
        ).value.trim();


    const modelo =
        document.getElementById(
            "modelo"
        ).value.trim();


    const ano =
        document.getElementById(
            "ano"
        ).value;


    const cor =
        document.getElementById(
            "cor"
        ).value.trim();


    const quilometragem =
        document.getElementById(
            "quilometragem"
        ).value;


    const situacao =
        document.getElementById(
            "situacao"
        ).value;

    const localizacao =
        document.getElementById(
            "localizacao"
        ).value.trim();



    if (!placa || !marca || !modelo) {

        alert(
            "Preencha os campos obrigatórios."
        );

        return;

    }



    let fotoAtual = "";


    if (indiceEdicao !== null) {

        fotoAtual =
            veiculos[indiceEdicao].foto || "";

    }



    const veiculo = {

        placa,
        renavam,
        chassi,
        marca,
        modelo,
        ano,
        cor,
        quilometragem,
        situacao,
        localizacao,

        foto: fotoAtual

    };



    if (indiceEdicao === null) {

        veiculos.push(
            veiculo
        );

    }

    else {

        veiculos[indiceEdicao] =
            veiculo;

    }



    localStorage.setItem(
        "veiculos",
        JSON.stringify(veiculos)
    );


    fecharFormulario();

    mostrarVeiculos();

}



/* =====================================
   MOSTRAR VEÍCULOS
===================================== */

function mostrarVeiculos(
    lista = veiculos
) {


    const tabela =
        document.getElementById(
            "tabelaVeiculos"
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
        (veiculo, indice) => {


            const linha =
                document.createElement(
                    "tr"
                );


            linha.innerHTML = SegurancaInterface.html(`

                <td>

                    <strong>
                        ${veiculo.placa}
                    </strong>

                </td>


                <td>
                    ${veiculo.marca}
                </td>


                <td>
                    ${veiculo.modelo}
                </td>


                <td>
                    ${veiculo.ano || "-"}
                </td>


                <td>

                    ${veiculo.quilometragem || "0"}
                    km

                </td>


                <td>

                    <span class="
                        situacao
                        ${classeSituacao(
                            veiculo.situacao
                        )}
                    ">

                        ${veiculo.situacao}

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
                        data-sec-click="h82" data-sec-arg="${SegurancaInterface.escape(indice)}">

                        Editar

                    </button>


                    <button
                        class="btn-excluir"
                        data-sec-click="h83" data-sec-arg="${SegurancaInterface.escape(indice)}">

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

        `${lista.length} veículo(s)`;

}



/* =====================================
   SITUAÇÃO
===================================== */

function classeSituacao(
    situacao
) {


    if (
        situacao ===
        "Disponível"
    ) {

        return "disponivel";

    }


    if (
        situacao ===
        "Alugado"
    ) {

        return "alugado";

    }


    if (
        situacao ===
        "Manutenção"
    ) {

        return "manutencao";

    }


    if (situacao === "No Estacionamento A") return "estacionamento-a";

    if (situacao === "No Estacionamento B") return "estacionamento-b";

    if (situacao === "No Estacionamento C") return "estacionamento-c";

    if (situacao === "Na Oficina") return "oficina";

    return "inativo";

}



/* =====================================
   EDITAR
===================================== */

function editarVeiculo(
    indice
) {


    const veiculo =
        veiculos[indice];


    document.getElementById(
        "placa"
    ).value =
        veiculo.placa;


    document.getElementById(
        "renavam"
    ).value =
        veiculo.renavam;

    document.getElementById(
        "chassi"
    ).value =
        veiculo.chassi || "";


    document.getElementById(
        "marca"
    ).value =
        veiculo.marca;


    document.getElementById(
        "modelo"
    ).value =
        veiculo.modelo;


    document.getElementById(
        "ano"
    ).value =
        veiculo.ano;


    document.getElementById(
        "cor"
    ).value =
        veiculo.cor;


    document.getElementById(
        "quilometragem"
    ).value =
        veiculo.quilometragem;


    document.getElementById(
        "situacao"
    ).value =
        veiculo.situacao;

    document.getElementById(
        "localizacao"
    ).value =
        veiculo.localizacao || "";


    indiceEdicao =
        indice;


    abrirFormulario();

}



/* =====================================
   EXCLUIR
===================================== */

function excluirVeiculo(
    indice
) {


    const confirmar =
        confirm(
            "Deseja realmente excluir este veículo?"
        );


    if (!confirmar) {

        return;

    }


    veiculos.splice(
        indice,
        1
    );


    localStorage.setItem(
        "veiculos",
        JSON.stringify(
            veiculos
        )
    );


    mostrarVeiculos();

}



/* =====================================
   PESQUISA
===================================== */

function pesquisarVeiculos() {


    const pesquisa =
        document.getElementById(
            "campoPesquisa"
        ).value
        .toLowerCase()
        .trim();


    const resultado =
        veiculos.filter(
            veiculo =>

                veiculo.placa
                    .toLowerCase()
                    .includes(
                        pesquisa
                    )

                ||

                veiculo.marca
                    .toLowerCase()
                    .includes(
                        pesquisa
                    )

                ||

                veiculo.modelo
                    .toLowerCase()
                    .includes(
                        pesquisa
                    )
        );


    mostrarVeiculos(
        resultado
    );

}



/* =====================================
   ABRIR FICHA
===================================== */

function abrirFicha(
    indice
) {


    const veiculo =
        veiculos[indice];


    indiceFicha =
        indice;



    document.getElementById(
        "fichaSubtitulo"
    ).textContent =

        `${veiculo.marca} ${veiculo.modelo} • ${veiculo.placa}`;



    document.getElementById(
        "fichaPlaca"
    ).textContent =
        veiculo.placa || "-";


    document.getElementById(
        "fichaRenavam"
    ).textContent =
        veiculo.renavam || "-";


    document.getElementById(
        "fichaMarca"
    ).textContent =
        veiculo.marca || "-";


    document.getElementById(
        "fichaModelo"
    ).textContent =
        veiculo.modelo || "-";


    document.getElementById(
        "fichaAno"
    ).textContent =
        veiculo.ano || "-";


    document.getElementById(
        "fichaCor"
    ).textContent =
        veiculo.cor || "-";


    document.getElementById(
        "fichaQuilometragem"
    ).textContent =

        veiculo.quilometragem
            ? `${veiculo.quilometragem} km`
            : "-";


    document.getElementById(
        "fichaSituacao"
    ).textContent =
        veiculo.situacao || "-";



    const foto =
        veiculo.foto || "";


    mostrarFoto(
        foto
    );


    document.getElementById(
        "btnRemoverFoto"
    ).style.display =

        foto
            ? "inline-block"
            : "none";


    document.getElementById(
        "inputFoto"
    ).value = "";



    document.getElementById(
        "modalFicha"
    ).classList.add(
        "mostrar"
    );

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
   FOTO DO VEÍCULO
===================================== */

function selecionarFoto(
    event
) {


    const arquivo =
        event.target.files[0];


    if (!arquivo) {

        return;

    }



    if (
        !arquivo.type.startsWith(
            "image/"
        )
    ) {

        alert(
            "Selecione apenas arquivos de imagem."
        );

        return;

    }



    const leitor =
        new FileReader();


    leitor.onload =
        function(e) {


            const foto =
                e.target.result;


            if (
                indiceFicha ===
                null
            ) {

                alert(
                    "Não foi possível identificar o veículo."
                );

                return;

            }



            veiculos[
                indiceFicha
            ].foto =
                foto;



            localStorage.setItem(
                "veiculos",
                JSON.stringify(
                    veiculos
                )
            );



            mostrarFoto(
                foto
            );



            document.getElementById(
                "btnRemoverFoto"
            ).style.display =
                "inline-block";

        };


    leitor.readAsDataURL(
        arquivo
    );

}



/* =====================================
   MOSTRAR FOTO
===================================== */

function mostrarFoto(
    foto
) {


    const area =
        document.getElementById(
            "fotoVeiculo"
        );


    if (foto) {


        area.innerHTML = SegurancaInterface.html(`

            <img
                src="${foto}"
                alt="Foto do veículo"
            >

        `);

    }

    else {


        area.innerHTML =
            SegurancaInterface.html("🚗");

    }

}



/* =====================================
   REMOVER FOTO
===================================== */

function removerFoto() {


    if (
        indiceFicha ===
        null
    ) {

        return;

    }



    const confirmar =
        confirm(
            "Deseja remover a foto deste veículo?"
        );


    if (!confirmar) {

        return;

    }



    veiculos[
        indiceFicha
    ].foto = "";



    localStorage.setItem(
        "veiculos",
        JSON.stringify(
            veiculos
        )
    );



    mostrarFoto(
        ""
    );



    document.getElementById(
        "btnRemoverFoto"
    ).style.display =
        "none";



    document.getElementById(
        "inputFoto"
    ).value = "";

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


    editarVeiculo(
        indice
    );

}



/* =====================================
   FECHAR MODAL CLICANDO FORA
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



/* =====================================
   TECLA ESC
===================================== */

document.addEventListener(
    "keydown",
    function(event) {


        if (
            event.key ===
            "Escape"
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

mostrarVeiculos();


