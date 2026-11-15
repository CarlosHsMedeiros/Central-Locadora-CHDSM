# Integração das abas — 29/09/2026

As abas de multas, manutenção, financeiro (faturas e pagamentos), checklists, configurações da empresa, campos de fotos e histórico de relatórios agora usam as tabelas existentes do MySQL. Clientes, veículos, contratos e usuários continuam em suas APIs específicas. Não foi necessária alteração de esquema.

## Funcionamento
- LOCADORA_BANCO.JS carrega a sessão e os dados antes dos scripts das telas. A cópia usada para renderização fica em memória; dados operacionais novos não são gravados no localStorage.
- /api/operacao entrega os dados operacionais. PUT /api/operacao/:key recebe alterações e exclusões identificadas por IDs do banco.
- Os vínculos que as telas antigas exibem por posição são convertidos para IDs antes da gravação. O banco mantém as chaves estrangeiras.
- O servidor valida valores, datas, referências, anexos e permissões por perfil. Calcula o total da fatura em centavos.
- Uma transação grava o registro e seus filhos. Um identificador de versão recusa a gravação se outra aba modificou o mesmo conjunto; o formulário fica aberto.
- Faturas com pagamento não podem ser alteradas ou excluídas por este fluxo. Não há fluxo de estorno nesta entrega.
- A geração mensal de faturas passa a ser uma ação explícita no Financeiro, evitando novas cobranças apenas por abrir uma página.
- Gravações enviam somente registros alterados, evitando reenviar os anexos de todo o histórico. O carregamento inicial ainda consulta os conjuntos completos.

## Dados antigos deste navegador
Abra Configurações → Migração de dados antigos como administrador, no mesmo navegador e endereço em que os registros antigos foram criados.
A ação baixa um backup JSON, importa em lotes, mantém os vínculos, baixa um relatório e preserva os originais do navegador.
A origem da importação é identificada por navegador para evitar confundir índices de instalações diferentes.
Registros já importados são reconhecidos. Cadastros com identificação única já existente são vinculados, sem sobrescrever o registro do banco. Configurações existentes também são preservadas; eventuais diferenças continuam no backup.
Confira erros e duplicidades no relatório. Após a importação, recarregue a página.
A nova rota exige sessão de administrador. A rota administrativa antiga com chave adicional foi preservada.
Os dados antigos não foram importados durante o desenvolvimento: pertencem ao armazenamento do navegador do usuário, que não está disponível pela leitura dos arquivos do projeto.

## Validação
- npm test: 48 testes, incluindo validação de valores e permissões das novas rotas.
- node scripts/check-security-browser.js: 13 páginas no Chrome e fluxos de salvar, editar, recarregar, vincular e recusar conflito, com APIs simuladas.
- node scripts/check-operacao-database.js: SQL real para criação/edição/exclusão, pagamento, configurações, deltas e reexecução da importação. Todas as alterações de teste são revertidas em uma transação externa sem COMMIT.
- Os testes não mantiveram registros fictícios nem alteraram registros existentes. O teste SQL pode consumir números de AUTO_INCREMENT mesmo após ROLLBACK.

Arquivos anteriores das telas ficaram em .integration-backup/2026-09-29, bloqueado pelo servidor estático. Reinicie o Node após alterações do backend e recarregue o navegador com Ctrl+F5.
