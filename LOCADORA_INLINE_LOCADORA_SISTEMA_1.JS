


        /* =====================================
           USUÁRIO LOGADO
        ====================================== */

        const usuario =
            Banco.getItem(
                "usuarioLogado"
            );


        if (usuario) {

            document.getElementById(
                "nomeUsuario"
            ).textContent = usuario;

        }



        /* =====================================
           ABRIR VEÍCULOS
        ====================================== */

        function abrirVeiculos() {

            window.location.href =
                "LOCADORA_VEICULOS.HTML";

        }


        function abrirClientes() {

            window.location.href =
                "LOCADORA_CLIENTES.HTML";

        }


        function abrirContratos() {

            window.location.href =
                "LOCADORA_CONTRATOS.HTML";

        }


        function abrirMultas() {

            window.location.href =
                "LOCADORA_MULTAS.HTML";

        }


        function abrirManutencao() {

            window.location.href =
                "LOCADORA_MANUTENCAO.HTML";

        }


        function abrirRelatorios() {

            window.location.href =
                "LOCADORA_RELATORIOS.HTML";

        }


        function abrirFinanceiro() {

            window.location.href =
                "LOCADORA_FINANCEIRO.HTML";

        }



        /* =====================================
           SAIR DO SISTEMA
        ====================================== */

        function sair() {

            localStorage.removeItem(
                "usuarioLogado"
            );


            window.location.href =
                "LOCADORA_PAGINA_INICIAL.HTML";

        }


    