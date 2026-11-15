(function () {
    "use strict";
    if (/PAGINA_INICIAL/i.test(location.pathname)) return;
    document.body.classList.add("sistema-formularios");

    const obrigatorios = new Set(["nome", "documento", "placa", "marca", "modelo", "numeroContrato", "cliente", "veiculo", "dataInicio", "dataFim", "valorLocacao", "autoInfracao", "data", "dataEntrada", "descricao", "numeroFatura", "clienteFatura", "vencimentoFatura"]);
    const ajudas = {
        documento: "CPF ou CNPJ válido; duplicidades são verificadas no banco.",
        placa: "Padrão nacional, por exemplo ABC1D23.",
        renavam: "Somente números.",
        email: "Será normalizado para letras minúsculas.",
        cep: "Informe oito números.",
        cnh: "Número da habilitação.",
        valorLocacao: "Valor monetário contratado.",
        quilometragem: "Leitura atual do hodômetro."
    };

    function adicionarCabecalho(container) {
        if (container.querySelector(":scope > .formulario-institucional-topo")) return;
        const titulo = container.querySelector("h2,h3")?.textContent?.trim() || "Cadastro de informações";
        const topo = document.createElement("div");
        topo.className = "formulario-institucional-topo";
        topo.innerHTML = SegurancaInterface.html(`<div><strong>${titulo}</strong><small>Preencha com atenção. Os dados serão validados antes da gravação.</small></div><span class="formulario-institucional-selo">Registro oficial</span>`);
        container.prepend(topo);
        const legenda = document.createElement("div");
        legenda.className = "formulario-legenda";
        legenda.innerHTML = SegurancaInterface.html("<span><b>*</b> Campos obrigatórios</span><span>Persistência com identificação permanente</span>");
        topo.after(legenda);
    }

    function prepararCampo(input) {
        if (!input.id || input.type === "hidden" || input.dataset.robusto) return;
        input.dataset.robusto = "1";
        const rotulo = input.closest(".campo,label");
        if (obrigatorios.has(input.id) || rotulo?.textContent.includes("*")) {
            input.required = true;
            input.setAttribute("aria-required", "true");
        }
        if (["documento", "cep", "renavam", "quilometragem"].includes(input.id)) input.inputMode = "numeric";
        const mensagem = document.createElement("small");
        mensagem.className = "campo-mensagem";
        mensagem.id = `ajuda-${input.id}`;
        mensagem.textContent = ajudas[input.id] || "";
        input.setAttribute("aria-describedby", mensagem.id);
        input.after(mensagem);
        const validar = () => {
            const invalido = !input.checkValidity();
            input.setAttribute("aria-invalid", String(invalido));
            mensagem.classList.toggle("erro", invalido);
            mensagem.textContent = invalido ? (input.validity.valueMissing ? "Este campo é obrigatório." : "Revise o valor informado.") : (ajudas[input.id] || "");
        };
        input.addEventListener("blur", validar);
        input.addEventListener("input", () => {
            if (input.getAttribute("aria-invalid") === "true") validar();
        });
    }

    function preparar() {
        document.querySelectorAll(".formulario,#areaFormulario").forEach(adicionarCabecalho);
        document.querySelectorAll("input,select,textarea").forEach(prepararCampo);
        document.querySelectorAll(".secao-formulario,form>section").forEach((secao, indice) => {
            const titulo = secao.querySelector("h3");
            if (titulo && !titulo.querySelector(".secao-numero")) {
                const numero = document.createElement("span");
                numero.className = "secao-numero";
                numero.textContent = String(indice + 1).padStart(2, "0");
                titulo.prepend(numero);
            }
        });
    }

    async function verificarBanco() {
        const indicador = document.createElement("div");
        indicador.className = "status-banco";
        indicador.textContent = "Verificando banco de dados...";
        const alvo = document.querySelector(".cabecalho-pagina,.conteudo>h1,main>h1");
        if (alvo) alvo.after(indicador);
        try {
            const origem = location.port === "5500" ? "http://127.0.0.1:3000" : "";
            const resposta = await fetch(`${origem}/api/health`, { credentials: "include" });
            const dados = await resposta.json();
            if (!resposta.ok || dados.database !== "connected") throw new Error();
            indicador.classList.add("conectado");
            indicador.textContent = "Servidor e MySQL disponíveis";
        } catch (_) {
            indicador.classList.add("erro");
            indicador.textContent = "Banco indisponível • verifique o servidor";
        }
    }

    preparar();
    verificarBanco();
    new MutationObserver(preparar).observe(document.body, { childList: true, subtree: true });
}());
