(function () {
    "use strict";
    function empresaAtual() { try { return JSON.parse(Banco.getItem("configuracoesEmpresa")) || {}; } catch (_) { return {}; } }
    function sessaoAtual() {
        try {
            return JSON.parse(Banco.getItem("sessaoUsuario")) || { nome: Banco.getItem("usuarioLogado") || "Usuário não identificado", cargo: "Não informado" };
        } catch (_) {
            return { nome: Banco.getItem("usuarioLogado") || "Usuário não identificado", cargo: "Não informado" };
        }
    }
    function texto(elemento) { return String(elemento?.textContent || "").replace(/\s+/g, " ").trim(); }
    function tituloImpressao() {
        const topico = document.querySelector("body.imprimir-topico .topico-impressao h1, body.imprimir-topico .topico-impressao h2, body.imprimir-topico .topico-impressao .ficha-titulo");
        const modal = document.querySelector(".modal.mostrar h2, dialog[open] h2");
        const pagina = document.querySelector("main h1, .conteudo h1, .cabecalho-pagina h1");
        return texto(topico || modal || pagina) || document.title.replace(/^Locadora\s*[-–—]\s*/i, "") || "Documento";
    }
    function escapar(valor) { return String(valor || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
    function montarCabecalho() {
        let cabecalho = document.getElementById("cabecalhoImpressaoGlobal");
        const empresa = empresaAtual();
        const nome = empresa.nome && String(empresa.nome).toUpperCase() !== "LOCADORA DIGITAL" ? empresa.nome : "CENTRAL LOCADORA";
        const titulo = tituloImpressao();
        const logo = empresa.imagemCabecalho ? `<img class="cabecalho-impressao-logo" src="${SegurancaInterface.image(empresa.imagemCabecalho)}" alt="Marca da empresa">` : "";
        if (!cabecalho) { cabecalho = document.createElement("header"); cabecalho.id = "cabecalhoImpressaoGlobal"; cabecalho.className = "cabecalho-impressao-global"; document.body.prepend(cabecalho); }
        cabecalho.innerHTML = SegurancaInterface.html(`<div class="cabecalho-impressao-marca">${logo}<div><h1>${escapar(nome)}</h1><p>${escapar(titulo)}</p></div></div><div class="cabecalho-impressao-meta"><strong>${escapar(titulo)}</strong>Emitido em ${new Date().toLocaleString("pt-BR")}</div>`);
        montarRodape();
    }
    function montarRodape() {
        let rodape = document.getElementById("rodapeImpressaoGlobal");
        const empresa = empresaAtual();
        const sessao = sessaoAtual();
        const cnpj = empresa.cnpj || "CNPJ não informado";
        if (!rodape) {
            rodape = document.createElement("footer");
            rodape.id = "rodapeImpressaoGlobal";
            rodape.className = "rodape-impressao-global";
            document.body.appendChild(rodape);
        }
        rodape.innerHTML = SegurancaInterface.html(`Emitido por: <strong>${escapar(sessao.nome || "Usuário não identificado")}</strong> · ${escapar(sessao.cargo || "Não informado")} | Emissão: ${new Date().toLocaleString("pt-BR")} | CNPJ: ${escapar(cnpj)}`);
    }
    window.addEventListener("beforeprint", montarCabecalho);
    window.criarCabecalhoImpressao = montarCabecalho;
}());
