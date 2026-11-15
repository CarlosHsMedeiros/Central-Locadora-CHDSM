# Auditoria técnica do projeto

Data: 14/09/2026

## Escopo verificado

- 88 arquivos JavaScript próprios, com validação de sintaxe.
- 13 páginas HTML e 14 folhas CSS, incluindo referências locais, IDs duplicados e equilíbrio estrutural básico.
- Backend Express, autenticação, autorização, CORS, Helmet, rate limit e exposição de arquivos.
- Schema e banco MySQL ativo: tabelas, engines, collations, timestamps e chaves estrangeiras.
- Dependências de produção com `npm audit`.
- Suíte automatizada completa.

## Correções aplicadas

- Atualizada a dependência transitiva `qs`; auditoria npm passou a informar zero vulnerabilidades conhecidas.
- Corrigida a versão mínima do Node para refletir a versão suportada e efetivamente testada (`>=22`).
- Ativada Content Security Policy no Helmet, mantendo compatibilidade temporária com os handlers inline existentes.
- Bloqueado o acesso HTTP a `database/`, `scripts/`, `src/`, `test/`, `node_modules/`, arquivos `.env`, manifesto npm e documentação interna.
- Corrigido o limitador de login: somente falhas contam; sucessos limpam o contador; entradas expiradas são removidas.
- Removido o cadastro legado que podia guardar senha de usuário em texto puro no `localStorage`.
- Protegida contra injeção de HTML a tabela administrativa de usuários.
- Check-lists e Documentos passaram a validar a sessão real no backend.
- Consulta de saúde do MySQL padronizada com `execute`.
- Mantida e testada a rota MySQL de clientes usada por Multas e Financeiro.

## Banco de dados

- MySQL 8.0.46 conectado.
- Todas as tabelas usam InnoDB e `utf8mb4`.
- Todas as tabelas possuem `created_at` e `updated_at`.
- Chaves estrangeiras de clientes, veículos, contratos, multas, manutenções, faturas, pagamentos e check-lists foram confirmadas.
- O schema ativo possui 24 tabelas.

## Verificações finais

- 25 testes aprovados, zero falhas.
- Zero vulnerabilidades conhecidas pelo `npm audit`.
- API e MySQL respondendo como conectados.
- Cabeçalho CSP presente.
- Tentativa de acesso público ao schema retorna HTTP 404.

## Pendências arquiteturais identificadas

Estas pendências não devem ser ocultadas como se fossem pequenos defeitos isolados:

1. Multas, manutenções, financeiro/faturas, check-lists e parte das configurações ainda possuem persistência operacional legada no `localStorage`. As tabelas já existem no MySQL, mas esses módulos precisam concluir suas APIs REST antes da remoção segura dos dados locais.
2. Existem aproximadamente 100 handlers HTML inline. Eles permanecem permitidos na CSP por compatibilidade; a CSP poderá remover `unsafe-inline` depois que esses eventos forem externalizados.
3. A pasta não é um repositório Git. Recomenda-se inicializar controle de versão e produzir um commit estável antes da migração final dos módulos legados.

## Pendência resolvida após a auditoria

- Criada a conta `central_locadora_app@localhost` com privilégios restritos a `SELECT`, `INSERT`, `UPDATE` e `DELETE` apenas em `locadora.*`.
- O `.env` deixou de utilizar `root`.
- As quatro operações foram verificadas dentro de uma transação revertida, sem deixar dados de teste no banco.

Nenhuma limpeza de dados locais ou alteração destrutiva foi executada durante a auditoria.
