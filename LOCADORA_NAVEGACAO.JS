(()=>{const style=document.createElement("style");style.textContent="button,.botao{clip-path:none!important}";document.head.appendChild(style);if(/PAGINA_INICIAL/i.test(location.pathname))return;const css=document.createElement("link");css.rel="stylesheet";css.href="LOCADORA_FORMULARIOS_ROBUSTOS.CSS";document.head.appendChild(css);["LOCADORA_FORMULARIOS_ROBUSTOS.JS","LOCADORA_MASCARAS.JS"].forEach(src=>{const js=document.createElement("script");js.src=src;document.head.appendChild(js);});})();
(async()=>{if(location.pathname.toUpperCase().endsWith("LOCADORA_PAGINA_INICIAL.HTML"))return;try{const origemApi=location.port==="5500"?"http://127.0.0.1:3000":"";const response=await fetch(`${origemApi}/api/auth/me`,{headers:{Accept:"application/json"},credentials:"include"});if(!response.ok)throw new Error();const result=await response.json();window.usuarioAtual=result.data.user;document.querySelectorAll("#nomeUsuario").forEach(el=>el.textContent=result.data.user.nome);}catch(_){location.replace("LOCADORA_PAGINA_INICIAL.HTML");}})();
window.sair=async function(){const origemApi=location.port==="5500"?"http://127.0.0.1:3000":"";try{await fetch(`${origemApi}/api/auth/logout`,{method:"POST",headers:{Accept:"application/json"},credentials:"include"});}finally{["usuariosSistema","usuarioLogado","sessaoUsuario"].forEach(chave=>localStorage.removeItem(chave));location.replace("LOCADORA_PAGINA_INICIAL.HTML");}};
document.addEventListener("banco:pronto", () => {
    const rotas = {
        "início": "LOCADORA_SISTEMA.HTML", "veículos": "LOCADORA_VEICULOS.HTML",
        "clientes": "LOCADORA_CLIENTES.HTML", "contratos": "LOCADORA_CONTRATOS.HTML",
        "multas": "LOCADORA_MULTAS.HTML", "manutenção": "LOCADORA_MANUTENCAO.HTML",
        "financeiro": "LOCADORA_FINANCEIRO.HTML", "documentos": "LOCADORA_DOCUMENTOS.HTML",
        "relatórios": "LOCADORA_RELATORIOS.HTML", "configurações": "LOCADORA_CONFIGURACOES.HTML",
        "check-lists": "LOCADORA_CHECKLISTS.HTML", "checklists": "LOCADORA_CHECKLISTS.HTML"
    };
    document.querySelectorAll("nav a, aside a").forEach(link => {
        const texto = String(link.textContent || "").replace(/[^\p{L}-]/gu, " ").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
        if (rotas[texto]) link.href = rotas[texto];
    });
    const destino = "LOCADORA_CHECKLISTS.HTML";
    document.querySelectorAll("a").forEach(link => {
        if (/documentos/i.test(link.textContent)) link.href = "LOCADORA_DOCUMENTOS.HTML";
    });
    document.querySelectorAll("nav").forEach(nav => {
        if (!nav.querySelector("a[href*='LOCADORA_']")) return;
        if (nav.querySelector(`a[href="${destino}"]`)) return;
        const link = document.createElement("a");
        link.href = destino;
        link.textContent = "Check-lists";
        if (location.pathname.toUpperCase().endsWith(destino)) link.classList.add("ativo");
        nav.appendChild(link);
    });

    document.querySelectorAll("aside").forEach(lateral => {
        if (lateral.querySelector(`a[href="${destino}"]`)) return;
        const referencia = Array.from(lateral.querySelectorAll("a")).find(link => /relatórios/i.test(link.textContent));
        if (!referencia) return;
        const link = document.createElement("a");
        link.href = destino;
        link.className = referencia.className || "opcao";
        link.textContent = "📋 Check-lists";
        referencia.insertAdjacentElement("afterend", link);
    });
});
