# Documentação e proposta de backend — Central Locadora

## 1. Escopo desta análise

Este documento registra o estado atual do projeto e propõe a futura migração para Node.js, Express e MySQL. Nesta etapa, nenhum comportamento do sistema foi implementado, removido ou modificado. Os dados existentes no `localStorage` devem permanecer intactos durante toda a migração e só poderão ser considerados desativados depois de exportação, importação, validação e aceite explícito.

## 2. Diagnóstico atual

O projeto é uma aplicação multipágina feita em HTML, CSS e JavaScript puro. O arquivo `server.js` usa apenas os módulos nativos `http`, `fs` e `path`, escuta a porta 5500 e entrega arquivos estáticos. O `package.json` não possui dependências e expõe somente `npm start`.

Toda autenticação, autorização, regra de negócio e persistência ocorre no navegador. Isso implica:

- dados isolados por navegador, perfil e computador;
- ausência de concorrência, transações, auditoria confiável e backup central;
- relacionamentos frágeis, em especial os baseados em índices de arrays;
- senhas armazenadas em texto puro e usuário inicial `admin`/`admin` criado no cliente;
- sessão manipulável via DevTools (`usuarioLogado` e `sessaoUsuario`);
- permissões verificadas no frontend, portanto sem fronteira real de segurança;
- anexos e fotos em Data URL/base64 dentro do `localStorage`, sujeito a limite de espaço;
- risco de XSS em trechos que montam HTML com dados sem escape consistente;
- ausência de validação central, integridade referencial e unicidade no banco;
- compatibilidade acumulada com diferentes formatos históricos do mesmo registro.

Há também sinais de texto com codificação incorreta (`Não`, `veículo` etc.) em arquivos-fonte. A futura API deve usar UTF-8 de ponta a ponta (`utf8mb4` no MySQL e JSON UTF-8).

## 3. Módulos identificados

| Módulo | Arquivos principais | Responsabilidade atual |
|---|---|---|
| Login | `LOCADORA_PAGINA_INICIAL.HTML/.CSS/.JS` | autenticação local, criação do administrador inicial e sessão |
| Shell/painel | `index.html`, `app.js`, `app.css`, `LOCADORA_SISTEMA.HTML` | visão geral, navegação e relatórios resumidos |
| Navegação/ícones/listas | `LOCADORA_NAVEGACAO.JS`, `LOCADORA_ICONS.JS`, `LOCADORA_LISTAS.CSS` | recursos compartilhados de interface |
| Clientes | `LOCADORA_CLIENTES.HTML/.CSS/.JS` | cadastro, edição, consulta e exclusão de clientes |
| Veículos/frota | `LOCADORA_VEICULOS.HTML/.CSS` (JavaScript embutido) | cadastro, fotos, estado e localização da frota |
| Contratos | `LOCADORA_CONTRATOS.HTML/.CSS/.JS` | contratos, múltiplos veículos, troca de contratante e emissão documental |
| Devolução | `LOCADORA_DEVOLUCAO.JS` | devolução de veículos vinculados a contratos |
| Checklists | `LOCADORA_CHECKLISTS.HTML/.CSS/.JS` | vistoria de entrada/saída, itens e fotos |
| Multas | `LOCADORA_MULTAS.HTML/.CSS/.JS` | infrações, responsável, anexo e acompanhamento |
| Manutenções | `LOCADORA_MANUTENCAO.HTML/.CSS/.JS` | ordens/serviços, custos e previsão de próxima manutenção |
| Financeiro/faturas | `LOCADORA_FINANCEIRO.HTML/.CSS/.JS` | faturas, pagamentos, itens por veículo e vínculo a multa/contrato |
| Rentabilidade | `LOCADORA_RENTABILIDADE.JS` | geração automática mensal e rateio por veículos/contratos |
| Relatórios | `LOCADORA_RELATORIOS.HTML/.CSS/.JS` | consolidação de frota, contratos, multas, manutenção e financeiro |
| Documentos/impressão | `LOCADORA_DOCUMENTOS.HTML`, `LOCADORA_IMPRESSAO.CSS/.JS` | emissão e formatação de documentos/PDF via impressão do navegador |
| Configurações | `LOCADORA_CONFIGURACOES.HTML/.CSS/.JS` | empresa, modelos, campos de fotos, usuários, permissões e histórico |
| Servidor estático | `server.js` | entrega de arquivos; não possui API nem banco |

## 4. Chaves do `localStorage`

| Chave | Formato observado | Uso |
|---|---|---|
| `usuariosSistema` | array de objetos | credenciais, perfis e permissões |
| `usuarioLogado` | string | nome do usuário; sessão legada |
| `sessaoUsuario` | objeto | dados da sessão sem senha |
| `clientes` | array de objetos | cadastro de clientes |
| `veiculos` | array de objetos | frota |
| `contratos` | array de objetos | locações e histórico de contratantes |
| `multas` | array de objetos | infrações e anexos |
| `manutencoes` | array de objetos | manutenções |
| `faturas` | array de objetos | faturamento e pagamentos |
| `checklistsVeiculos` | array de objetos | vistorias; acessada por chave dinâmica `chaveChecklists` |
| `configuracoesEmpresa` | objeto | dados da empresa e modelos de documentos |
| `camposFotoChecklist` | array de strings | nomes configuráveis das fotos de vistoria |
| `historicoRelatoriosEmitidos` | array de objetos (máximo 100 no frontend) | auditoria local de relatórios emitidos |

Não foi encontrado uso de `sessionStorage`.

## 5. Campos efetivamente utilizados

Os tipos abaixo descrevem o formato atual, não o formato ideal. Campos de formulário geralmente chegam como string, mesmo quando representam números ou datas.

### 5.1 Usuários e sessão

`usuariosSistema`: `id`, `nome`, `usuario`, `senha`, `cargo`, `perfil`, `permissoes[]`.

`sessaoUsuario`: `id`, `nome`, `cargo`, `perfil`, `permissoes[]`.

`usuarioLogado`: somente o nome, como string.

Perfis observados: `admin` e outros perfis escolhidos no formulário. Administradores recebem `permissoes: ["*"]`.

### 5.2 Clientes

`id`, `nome`, `documento`, `rg`, `nascimento`, `telefone`, `whatsapp`, `email`, `cep`, `estado`, `cidade`, `bairro`, `endereco`, `numero`, `complemento`, `cnh`, `categoria`, `validadeCnh`, `situacao`, `observacoes`.

Leituras de compatibilidade encontradas em relatórios/documentos: `razaoSocial` e `nomeCompleto` como alternativas a `nome`.

### 5.3 Veículos

`placa`, `renavam`, `chassi`, `marca`, `modelo`, `ano`, `cor`, `quilometragem`, `situacao`, `localizacao`, `foto`.

Alguns consumidores tentam usar `veiculo.id`, mas o cadastro atual não cria esse campo. Essa é uma inconsistência crítica.

### 5.4 Contratos

`numeroContrato`, `cliente`, `veiculo`, `veiculos[]`, `modalidade`, `dataInicio`, `dataFim`, `valorLocacao`, `caucao`, `quilometragemInicial`, `limiteQuilometragem`, `combustivelRetirada`, `combustivelDevolucao`, `quilometragemFinal`, `status`, `observacoes`, `historicoContratantes[]`.

Cada item de `historicoContratantes`: `cliente`, `nome`, `dataInicio`, `dataFim`.

Campos legados/alternativos lidos por outros módulos: `id`, `numero`, `inicio`, `fim`, `situacao`, `total`, `valorTotal`, `valor`, `clienteIndice`, `clienteNome`, `veiculoIndice`, `veiculoPlaca`, `veiculoDescricao`.

### 5.5 Multas

`autoInfracao`, `placa`, `cliente`, `contrato`, `orgao`, `codigo`, `descricao`, `data`, `hora`, `local`, `cidade`, `uf`, `valor`, `valorDesconto`, `vencimento`, `prazoCondutor`, `pontos`, `situacao`, `responsavel`, `observacoes`, `arquivo`, `dataCadastro`.

`arquivo`, quando presente: `nome`, `tipo`, `tamanho`, `dados` (Data URL/base64).

### 5.6 Manutenções

`veiculo`, `tipo`, `oficina`, `dataEntrada`, `dataSaida`, `quilometragem`, `valorPecas`, `valorMaoObra`, `valorTotal`, `status`, `proximaData`, `proximaKm`, `pecas`, `descricao`, `observacoes`.

Relatórios também aceitam os campos alternativos `veiculoIndice`, `placa` e `situacao`.

### 5.7 Faturas

`id`, `numero`, `tipo`, `clienteId`, `clienteIndice`, `cliente`, `contratoId`, `contratoIndice`, `contrato`, `descricao`, `vencimento`, `valorBase`, `itensVeiculos[]`, `valor`, `dataPagamento`, `aitIndice`, `aitAutoInfracao`, `reutilizacaoAitCondutor`, `justificativaAit`, `dataCadastro`, `emitidoPor`.

Cada item de `itensVeiculos`: `veiculoId`, `veiculoIndice`, `placa`, `modelo`, `ano`, `cor`, `renavam`, `valor`, e, nos itens gerados pela rentabilidade, `contratoId`, `contratoIndice`, `contrato`.

Faturas automáticas acrescentam `automatica`, `competencia`, `contratosIds[]` e `contratos[]`. `emitidoPor` é um objeto de sessão (normalmente `nome` e `cargo`, potencialmente os demais campos da sessão).

### 5.8 Checklists

`id`, `veiculo`, `tipo`, `data`, `km`, `combustivel`, `responsavel`, `observacoes`, `itens[]`, `fotos[]`, `criadoEm`.

Item: `nome`, `condicao`, `observacao`.

Foto: `campo`, `imagem` (Data URL/base64). Existe compatibilidade de leitura com fotos antigas armazenadas diretamente como string.

### 5.9 Configurações e histórico

`configuracoesEmpresa`: `nome`, `cnpj`, `endereco`, `textoContrato`, `textoContratoHtml`, `modeloCompletoContrato`, `textoFaturaHtml`, `imagemCabecalho`, `modeloContratoVersao`.

`camposFotoChecklist`: array de strings.

`historicoRelatoriosEmitidos`: `relatorio`, `emitidoPor`, `cargo`, `emitidoEm`.

## 6. Relacionamentos frágeis baseados em índice

O índice é a posição do item no array no momento da gravação. Exclusão, reordenação, importação ou filtragem mal aplicada pode fazer o registro apontar para outra entidade.

| Origem | Campo atual | Destino/semântica |
|---|---|---|
| contrato | `cliente` e legado `clienteIndice` | `clientes[indice]` |
| contrato | `veiculo`, `veiculos[]` e legado `veiculoIndice` | `veiculos[indice]` |
| histórico de contratantes | `cliente` | `clientes[indice]` |
| manutenção | `veiculo` e legado `veiculoIndice` | `veiculos[indice]` |
| checklist | `veiculo` | `veiculos[indice]` |
| fatura | `clienteIndice` | `clientes[indice]` (há também `clienteId`) |
| fatura | `contratoIndice` | `contratos[indice]` (há também `contratoId`) |
| item de fatura | `veiculoIndice` | `veiculos[indice]` (há também `veiculoId`) |
| fatura de multa | `aitIndice` | `multas[indice]`; `aitAutoInfracao` funciona como identificador alternativo |
| rentabilidade | índices de cliente, contrato e veículo | gera faturas e rateios a partir da posição nos arrays |

Multas guardam `placa`, `cliente` e `contrato` predominantemente como valores textuais, criando vínculos por cópia de texto em vez de chaves estrangeiras. Isso preserva uma fotografia histórica, mas não garante integridade.

## 7. Inconsistências e duplicidades

### Identidade e relacionamentos

- Clientes têm `id` gerado e registros antigos são atualizados; veículos e contratos não recebem ID no fluxo principal.
- Financeiro e rentabilidade tentam usar IDs de veículos/contratos, mas recorrem a índices quando eles não existem.
- O mesmo relacionamento aparece como `cliente`, `clienteIndice`, `clienteId` ou nome copiado; veículo aparece como `veiculo`, `veiculos`, `veiculoIndice`, `veiculoId` ou placa.
- Um contrato possui simultaneamente `veiculo` (primeiro veículo) e `veiculos[]` (lista completa), duplicando a relação.
- Fatura possui `contratoId`/`contratoIndice`/`contrato`; faturas automáticas também possuem `contratosIds[]`/`contratos[]`.
- Multa e fatura se ligam por índice e número do auto (`aitIndice` e `aitAutoInfracao`), sem ID imutável.

### Nomes

- Cliente: `nome`, `nomeCompleto`, `razaoSocial`.
- Contrato: `numeroContrato`/`numero`, `dataInicio`/`inicio`, `dataFim`/`fim`, `status`/`situacao`, `valorLocacao`/`total`/`valorTotal`/`valor`.
- Veículo: relação singular `veiculo`, plural `veiculos`, `veiculoIndice`, `veiculoId`, `veiculoPlaca` e `veiculoDescricao`.
- Manutenção: `status` e leitura alternativa de `situacao`.
- Datas de criação: `dataCadastro`, `criadoEm` e `emitidoEm`.
- O produto alterna “check-list”, “checklist” e “checklists”.

### Tipos

- IDs misturam strings baseadas em timestamp, strings prefixadas (`u-`, `auto-`), números (`Date.now()`) e índices numéricos/string.
- Campos numéricos de clientes, veículos, contratos e checklists permanecem como string: ano, quilometragens, limites e `km`.
- Multas convertem `valor`, `valorDesconto` e `pontos` para número; manutenções e faturas também usam número, mas dados legados podem ser string monetária formatada.
- Datas são strings `YYYY-MM-DD`, data/hora local de `<input>` e ISO UTC, sem padrão único nem timezone explícito.
- `emitidoPor` é objeto em faturas, enquanto `emitidoPor` é string no histórico de relatórios.
- Arquivos e imagens são objetos ou strings base64; fotos antigas de checklist podem ser string, as atuais são objetos.
- Booleanos coexistem com ausência de campo, por exemplo `automatica`, `reutilizacaoAitCondutor` e flags de modelo.

### Segurança e consistência operacional

- Senha em texto puro, autenticação e autorização apenas no cliente.
- Usuário padrão previsível.
- Ausência de validação de unicidade no armazenamento para placa, RENAVAM, chassi, documento, número de contrato e número de fatura (alguns fluxos validam somente localmente).
- `localStorage` não oferece transações: atualizar contrato e situação do veículo pode ficar parcialmente concluído.
- Exclusão de uma entidade pode invalidar índices de todos os registros posteriores.
- HTML configurável e conteúdo dinâmico exigem sanitização antes de armazenamento/renderização.
- Base64 em JSON aumenta o tamanho em cerca de um terço e pode exceder rapidamente a cota do navegador.

## 8. Arquitetura proposta

### 8.1 Organização

```text
src/
  app.js                    # configuração do Express
  server.js                 # inicialização e encerramento gracioso
  config/                   # ambiente, banco, CORS e segurança
  db/
    pool.js                 # pool mysql2/promise
    migrations/             # SQL versionado
    seeds/                  # dados iniciais controlados
  modules/
    auth/
    users/
    clients/
    vehicles/
    contracts/
    fines/
    maintenance/
    invoices/
    checklists/
    settings/
    reports/
    integrations/
  middlewares/              # autenticação, autorização, erros e validação
  shared/                   # utilitários, paginação, auditoria e storage
public/                     # frontend atual, migrado gradualmente para fetch
scripts/
  export-localstorage.html  # exportação explícita no navegador
  import-legacy.js          # importação idempotente e auditável
```

Cada módulo deve separar rota, controller HTTP, validação, service/regra de negócio e repository SQL. O pool deve usar `mysql2/promise`, placeholders parametrizados e transações explícitas para operações que alteram mais de uma tabela.

### 8.2 Convenções

- API sob `/api/v1`, JSON, UTC no backend e apresentação em `America/Sao_Paulo` no frontend.
- IDs internos `BIGINT UNSIGNED AUTO_INCREMENT` ou UUID; escolher um padrão único. UUID é preferível se futuras integrações criarem dados fora do servidor central.
- Nomes da API em `camelCase`; colunas SQL em `snake_case`.
- Valores monetários em `DECIMAL(12,2)`, nunca ponto flutuante.
- Datas civis em `DATE`; instantes em `DATETIME(3)` UTC.
- Exclusão lógica (`deleted_at`) para cadastros referenciados; não permitir exclusão física que rompa histórico.
- Paginação, filtros e ordenação padronizados: `page`, `limit`, `sort`, `order`.
- Validação de entrada com biblioteca de schema; respostas de erro com código, mensagem e detalhes por campo.
- Logs estruturados com `requestId`; tabela de auditoria para ações relevantes.
- Fotos/anexos fora do MySQL (filesystem controlado ou armazenamento S3 compatível); banco guarda metadados e URL/chave. Nunca persistir Data URL como solução definitiva.

### 8.3 Autenticação segura

- Senhas com Argon2id ou bcrypt (custo adequado), nunca reversíveis nem retornadas pela API.
- Login com rate limiting, atraso progressivo e registro de tentativas.
- Preferência por sessão opaca em cookie `HttpOnly`, `Secure` e `SameSite=Lax/Strict`, armazenada no servidor/banco ou Redis. Se JWT for necessário, usar access token curto e refresh token rotacionado em cookie HttpOnly.
- CSRF quando a autenticação usar cookie, CORS por allowlist, Helmet e limites de corpo/upload.
- RBAC persistido em `roles`, `permissions`, `user_roles` e `role_permissions`; toda autorização também é verificada no backend.
- Primeiro administrador criado por comando de implantação/variáveis protegidas, com troca obrigatória de senha; jamais `admin/admin` no código.
- Recuperação/troca de senha, revogação de sessões, `last_login_at`, `password_changed_at` e auditoria.

### 8.4 Preparação para n8n

- Criar contas de integração próprias com permissões mínimas, não reutilizar usuários humanos.
- Autenticação máquina-a-máquina por API key com hash no banco ou OAuth2 client credentials.
- Endpoints idempotentes, aceitando `Idempotency-Key` em criações acionadas por automação.
- Webhooks de saída versionados e assinados com HMAC (`vehicle.updated`, `contract.created`, `invoice.overdue`, `maintenance.due`, `fine.created`).
- Tabelas `webhook_subscriptions` e `webhook_deliveries`, com tentativas, backoff, status e payload.
- Fila/outbox transacional para que a gravação de negócio e o evento não se desencontrem.
- Endpoint de webhook de entrada com assinatura, timestamp contra replay e log de processamento.

## 9. Tabelas necessárias

### Identidade e auditoria

- `users`: id, name, username, password_hash, job_title, status, last_login_at, password_changed_at, timestamps, deleted_at.
- `roles`: id, code, name.
- `permissions`: id, code, description.
- `user_roles`: user_id, role_id.
- `role_permissions`: role_id, permission_id.
- `sessions` ou `refresh_tokens`: token_hash, user_id, expires_at, revoked_at, metadados.
- `audit_logs`: actor_user_id, action, entity_type, entity_id, before_json, after_json, ip, user_agent, created_at.

### Cadastros e operação

- `clients`: todos os campos do cliente, documento normalizado/único quando aplicável, timestamps e deleted_at.
- `vehicles`: todos os campos do veículo, placa/RENAVAM/chassi normalizados e únicos quando presentes, timestamps e deleted_at.
- `contracts`: numero, client_id atual, modalidade, datas, valores, quilometragens, combustíveis, status, observações, timestamps.
- `contract_vehicles`: contract_id, vehicle_id, started_at, ended_at, valores/quilometragens específicos se necessários; substitui `veiculo` + `veiculos[]`.
- `contract_client_history`: contract_id, client_id, started_at, ended_at; `nome` só deve ser snapshot opcional quando exigido juridicamente.
- `vehicle_returns`: contract_id, vehicle_id, returned_at, final_mileage, fuel_level, notes, user_id.
- `fines`: vehicle_id, client_id, contract_id, auto_number, órgão, código, descrição, ocorrência, localidade, valores, pontos, prazos, status, responsável, observações e timestamps.
- `fine_attachments`: fine_id, storage_key/url, original_name, mime_type, size, checksum.
- `maintenance_orders`: vehicle_id e todos os campos de manutenção, com números/valores tipados e timestamps.
- `maintenance_parts` (opcional, recomendado): maintenance_order_id, descrição, quantidade, unit_price, total.

### Financeiro

- `invoices`: number, type, client_id, description, due_date, base_amount, total_amount, paid_at, status, fine_id opcional, justificativa/reutilização, competência, automática, created_by, timestamps.
- `invoice_contracts`: invoice_id, contract_id; suporta as faturas automáticas com vários contratos.
- `invoice_items`: invoice_id, vehicle_id opcional, contract_id opcional, description, amount e snapshots de placa/modelo quando necessários ao documento fiscal.
- `payments` (recomendado): invoice_id, paid_at, amount, method, reference, user_id; evita reduzir pagamento a uma única data.

### Checklists, arquivos e configuração

- `checklists`: vehicle_id, contract_id opcional, type, inspected_at, mileage, fuel_level, responsible_name ou responsible_user_id, notes, created_by, timestamps.
- `checklist_items`: checklist_id, item_name, condition, observation, sort_order.
- `checklist_photos`: checklist_id, field_name, storage_key/url, mime_type, size, checksum, sort_order.
- `checklist_photo_fields`: name, sort_order, active.
- `company_settings`: company_name, tax_id, address e demais dados cadastrais.
- `document_templates`: type, version, content_html sanitizado, active, timestamps.
- `company_assets`: type, storage_key/url, metadados.
- `report_issues`: report_type, issued_by, issued_at, filters_json, checksum/storage_key opcional.

### Integrações

- `api_clients`, `api_keys`, `webhook_subscriptions`, `webhook_deliveries`, `integration_events`/`outbox_events`.

## 10. Endpoints REST necessários

Todos sob `/api/v1`. Listagens devem aceitar paginação e filtros; alterações devem validar RBAC.

### Autenticação e usuários

- `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/me`, `PATCH /auth/password`.
- `GET/POST /users`, `GET/PATCH/DELETE /users/:id`.
- `GET/POST /roles`, `PATCH/DELETE /roles/:id`, `GET /permissions`.
- `GET/DELETE /sessions` e `/sessions/:id` para revogação.

### Clientes e veículos

- `GET/POST /clients`, `GET/PATCH/DELETE /clients/:id`.
- `GET/POST /vehicles`, `GET/PATCH/DELETE /vehicles/:id`.
- `POST /vehicles/:id/photo` e `DELETE /vehicles/:id/photo`.
- `GET /vehicles/:id/history` para contratos, checklists, multas e manutenções.

### Contratos e devoluções

- `GET/POST /contracts`, `GET/PATCH /contracts/:id`, `DELETE /contracts/:id` somente quando permitido.
- `POST /contracts/:id/vehicles`, `DELETE /contracts/:id/vehicles/:vehicleId`.
- `POST /contracts/:id/client-changes`.
- `POST /contracts/:id/returns`, `GET /contracts/:id/returns`.
- `POST /contracts/:id/close` e, se necessário, `POST /contracts/:id/cancel`.
- `GET /contracts/:id/document` para dados/HTML/PDF do documento.

### Multas e manutenção

- `GET/POST /fines`, `GET/PATCH/DELETE /fines/:id`.
- `POST /fines/:id/attachments`, `GET/DELETE /fines/:id/attachments/:attachmentId`.
- `GET/POST /maintenance-orders`, `GET/PATCH/DELETE /maintenance-orders/:id`.
- `POST /maintenance-orders/:id/complete`.

### Faturas e pagamentos

- `GET/POST /invoices`, `GET/PATCH/DELETE /invoices/:id`.
- `POST /invoices/generate-monthly` com chave de idempotência.
- `POST /invoices/:id/payments`, `GET /invoices/:id/payments`, `DELETE /invoices/:id/payments/:paymentId` quando autorizado.
- `GET /invoices/:id/document`.

### Checklists, configurações e relatórios

- `GET/POST /checklists`, `GET/PATCH/DELETE /checklists/:id`.
- `POST /checklists/:id/photos`, `DELETE /checklists/:id/photos/:photoId`.
- `GET/POST /settings/checklist-photo-fields`, `PATCH/DELETE /settings/checklist-photo-fields/:id`.
- `GET/PATCH /settings/company`, `GET/POST/PATCH /document-templates`.
- `GET /reports/fleet`, `/reports/contracts`, `/reports/financial`, `/reports/profitability`, `/reports/fines`, `/reports/maintenance`.
- `POST /reports/issues`, `GET /reports/issues`.

### Migração e integração (administrativos)

- Preferir importação por CLI. Se houver endpoint: `POST /migration/localstorage/validate`, `POST /migration/localstorage/import`, `GET /migration/runs/:id`, estritamente restritos a administrador e removíveis após a transição.
- `POST/GET/PATCH/DELETE /integrations/webhooks`.
- `POST /integrations/webhooks/inbound/:source` e `POST /integrations/webhooks/:id/test`.

## 11. Estratégia de migração sem perda de dados

1. **Congelar o contrato de dados:** versionar este inventário e definir o schema legado (`legacyVersion: 1`). Não limpar nem reescrever chaves do navegador.
2. **Adicionar IDs estáveis no processo de importação:** manter o `id` válido dos clientes; gerar UUIDs para veículos, contratos, multas, manutenções e checklists; registrar mapa `tipo + índice legado -> UUID`.
3. **Exportar no navegador:** criar posteriormente uma tela/script explícito que leia todas as 13 chaves e baixe um único JSON com versão, data, origem e checksum. A exportação é cópia, nunca “mover” ou `removeItem`.
4. **Fazer backup bruto:** armazenar o JSON original imutável e seu hash antes de qualquer transformação. Como `localStorage` é por navegador, repetir a coleta em cada máquina/perfil usado e identificar a origem.
5. **Validar antes de importar:** conferir JSON, arrays/objetos esperados, duplicidades, datas, números, referências fora do intervalo, base64 inválido e chaves desconhecidas. Gerar relatório sem modificar banco.
6. **Importar em staging com transação:** importar entidades-mãe primeiro (usuários sem reutilizar senha em texto puro, clientes, veículos), depois contratos/relações, multas/manutenções/checklists/faturas e configurações. Usar tabelas de staging e uma tabela `migration_runs` para idempotência.
7. **Resolver índices pelo mapa:** `clientes[3]`, por exemplo, vira o UUID atribuído ao cliente de índice 3 daquela origem. Nunca tentar resolver um índice depois de ordenar/deduplicar o array.
8. **Preservar snapshots:** nomes, placas e descrições copiadas em multas/faturas podem ser mantidos como snapshot, além da FK resolvida. Referências inválidas devem ir para fila de pendências, não ser descartadas.
9. **Tratar credenciais:** não importar senhas em texto puro como credenciais ativas. Criar usuários desabilitados/pendentes e exigir redefinição segura; criar o administrador inicial fora do frontend.
10. **Migrar anexos:** decodificar Data URLs, validar MIME por conteúdo, calcular checksum, gravar no storage de arquivos e vincular metadados. Manter o JSON bruto para recuperação.
11. **Reconciliação:** comparar contagens por entidade, somas financeiras, contratos por cliente, vínculos de frota e hashes de anexos. Produzir relatório de importados, duplicados, corrigidos e pendentes.
12. **Operação paralela controlada:** frontend passa a ler/escrever a API; durante homologação, o `localStorage` permanece como backup somente leitura. Evitar escrita dupla, que cria divergência.
13. **Aceite e corte:** após testes e aceite, remover gradualmente a dependência de leitura do `localStorage`. Não apagar as chaves automaticamente; oferecer exportação final e política explícita de retenção/limpeza.

### Regras sugeridas de normalização na importação

- Aparar espaços; normalizar placa, UF, CPF/CNPJ, RENAVAM e chassi para comparação, mantendo valor original quando necessário.
- Converter monetários brasileiros com rotina única e armazenar `DECIMAL`.
- Converter campos numéricos vazios para `NULL`, não zero, salvo quando zero tiver significado real.
- Guardar datas inválidas como pendência com o valor legado no staging.
- Deduplicar apenas com regra aprovada; placa/documento iguais devem ser sinalizados, não mesclados automaticamente.
- Manter `legacy_source`, `legacy_index`, `legacy_id` e `migration_run_id` durante a transição para rastreabilidade.

## 12. Ordem recomendada de implementação futura

1. Infraestrutura Express, configuração, migrations, pool MySQL e tratamento de erros.
2. Autenticação/RBAC, usuários e auditoria.
3. Clientes e veículos com IDs estáveis.
4. Contratos, relações N:N de veículos e histórico de contratantes/devoluções.
5. Multas, manutenções e checklists com storage de arquivos.
6. Faturas, pagamentos e rentabilidade transacional.
7. Configurações, templates, documentos e relatórios.
8. Ferramenta de exportação/importação, reconciliação e corte do frontend.
9. Outbox, webhooks e credenciais dedicadas para n8n.

## 13. Critérios mínimos para considerar a migração concluída

- 100% das origens de `localStorage` identificadas e exportadas com checksum.
- Contagens e totais reconciliados, com toda divergência documentada.
- Nenhuma FK baseada em posição de array na API ou no banco.
- Nenhuma senha em texto puro e nenhuma autorização confiada apenas ao frontend.
- Backups e restauração testados.
- Operações críticas cobertas por transações e auditoria.
- Uploads fora do `localStorage` e do JSON principal.
- Frontend homologado contra a API, mantendo a cópia legada até aceite formal.
