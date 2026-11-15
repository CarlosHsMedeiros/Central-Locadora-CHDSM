# Banco de dados — Locadora Digital

Modelagem MySQL 8.0+ derivada dos campos efetivamente lidos e gravados pelos JavaScript e scripts embutidos nos HTMLs.

## Criar e executar

No PowerShell, na raiz do projeto:

```powershell
cmd /c "mysql --default-character-set=utf8mb4 -u root -p < database\schema.sql"
cmd /c "mysql --default-character-set=utf8mb4 -u root -p locadora < database\seed.sql"
```

`schema.sql` cria e seleciona `locadora`. `seed.sql` é repetível e só cria configurações iniciais. Em instalações novas use `schema.sql`; `migrations/001_initial_schema.sql` marca a baseline e futuras mudanças são incrementais (`002_...`, `003_...`, `004_...`).

Em bancos existentes, aplique também o gerador transacional de números de documentos:

```powershell
cmd /c "mysql --default-character-set=utf8mb4 -u root -p locadora < database\migrations\004_document_sequences.sql"
```

Contratos são numerados no servidor como `CT-ANO-000001`. A mesma sequência segura é usada por faturas como `FAT-ANO-000001` quando seu módulo é gravado pela API; campos de número no navegador não são fonte de unicidade.

## Usuário MySQL restrito

Execute como administrador, trocando a senha:

```sql
CREATE USER 'locadora_app'@'localhost' IDENTIFIED BY 'troque-por-uma-senha-longa-e-unica';
GRANT SELECT, INSERT, UPDATE, DELETE ON locadora.* TO 'locadora_app'@'localhost';
FLUSH PRIVILEGES;
```

Essa conta não recebe `DROP`, `ALTER`, `CREATE` ou acesso a outros bancos. Use outra conta somente para migrações. Configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME`; não versione senhas.

## Testar a conexão

```powershell
mysql -h 127.0.0.1 -P 3306 -u locadora_app -p -D locadora -e "SELECT DATABASE() AS banco, NOW() AS conectado_em; SHOW TABLES;"
```

O backend existente usa `mysql2` e seu health check executa `SELECT 1`; após configurar o `.env`, iniciar o servidor também testa a conexão.

## Mapeamento dos dados atuais

| localStorage/frontend | Modelo relacional |
|---|---|
| `usuariosSistema`, `permissoes[]` | `usuarios`, `usuario_permissoes` |
| `clientes[].documento`, `validadeCnh` | `clientes.documento`, `validade_cnh` |
| `veiculos[]`, `custosPorAno` | `veiculos`, `veiculo_custos_anuais` |
| `contrato.cliente`, `veiculo`, `veiculos[]` | `contratos.cliente_id`, `contrato_veiculos` |
| `historicoContratantes[]` | `contrato_historico_contratantes` |
| `multas[].arquivo` | `multas`, `multa_arquivos` |
| `faturas[].contratoId`, `contratosIds[]`, `itensVeiculos` | `faturas`, `fatura_contratos`, `fatura_veiculos` |
| `fatura.dataPagamento` | `pagamentos.data_pagamento` |
| `checklists[].itens`, `fotos` | `checklists`, `checklist_itens`, `checklist_fotos` |
| configurações e histórico de relatórios | `configuracoes`, `historico_relatorios` |

Todos os campos funcionais encontrados foram preservados. Campos `*_snapshot` preservam texto usado em documentos históricos. Data URLs atuais cabem em `LONGTEXT`, mas para produção prefira armazenamento de objetos e persista a `url`.

## Migração do localStorage

O frontend ainda usa posições de array (`clienteIndice`, `contratoIndice`, `veiculoIndice`, `aitIndice`, `contrato.veiculo` e `contrato.veiculos[]`). Elas não existem no banco.

1. Importe clientes e veículos, montando mapas `índice legado -> BIGINT id`.
2. Importe contratos com `cliente_id` e seus veículos em `contrato_veiculos`.
3. Importe multas, manutenções, faturas e checklists resolvendo cada índice pelo mapa.
4. Envie para revisão qualquer índice que não puder ser resolvido.
5. Faça a API e o frontend usarem somente IDs permanentes.

IDs textuais legados também devem ser mapeados para o `BIGINT` gerado, nunca usados como posição.

### Ferramenta administrativa de migração

Para um banco criado antes desta ferramenta, aplique a migração do mapa idempotente:

```powershell
cmd /c "mysql --default-character-set=utf8mb4 -u root -p locadora < database\migrations\002_local_storage_migration_map.sql"
```

Defina uma chave aleatória longa em `MIGRATION_ADMIN_KEY`, reinicie o backend e abra **Configurações > Migração > Migrar dados locais** com uma sessão administrativa. A ferramenta baixa primeiro um backup, processa clientes, veículos, contratos, multas, manutenções e faturas nessa ordem e baixa um relatório JSON. A rota `POST /api/admin/migracao/:etapa` exige a chave no cabeçalho `X-Migration-Key`.

Não compartilhe a chave, não a coloque no JavaScript e use HTTPS fora de `localhost`. A limpeza do `localStorage` não é automática e só é oferecida quando a execução termina sem erros.

### Autenticação e administrador inicial

Em bancos existentes, aplique `database/migrations/003_auth_sessions.sql`. Depois defina temporariamente `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_USER` e `INITIAL_ADMIN_PASSWORD` (mínimo de 12 caracteres), execute `npm run create-admin` e remova essas três variáveis. A senha é transformada em bcrypt antes do `INSERT` e nunca é impressa ou gravada em texto puro.

As sessões usam cookie `locadora_session` com `httpOnly`, `sameSite=lax` e `secure` em produção. Configure `CORS_ORIGINS` explicitamente em produção.

## Integridade e segurança

- `RESTRICT` protege históricos; `CASCADE` remove apenas filhos dependentes; `SET NULL` preserva documentos com vínculo opcional.
- CPF/CNPJ, placa, RENAVAM, chassi, contrato, auto de infração e fatura têm unicidade.
- Dinheiro usa `DECIMAL(15,2)`, datas civis `DATE`, eventos `DATETIME` e flags `BOOLEAN`.
- `senha_hash` recebe Argon2id/bcrypt. O frontend atual grava `senha` em texto no localStorage; isso deve ser descontinuado e a autenticação movida ao backend.
- Normalize CPF/CNPJ, placa e RENAVAM antes de importar para que `UNIQUE` detecte duplicidades.

## Relatório de licenciamento SP (2026)

No MySQL Workbench, conecte como administrador, selecione o banco `locadora` e execute `migrations/006_veiculos_licenciamento.sql`. A conta da aplicação não deve receber ALTER. A migração adiciona três campos opcionais e preserva os veículos existentes. Depois, preencha em Veículos → Editar o ano do último CRLV emitido, a UF de registro e o grupo de calendário. O relatório usa o calendário 2026 conferido no portal oficial em 17/09/2026; não consulta o Detran e outros exercícios exigem validação do calendário. Sem migração, a API preserva o cadastro original e rejeita a gravação dos novos campos com uma mensagem explícita.
