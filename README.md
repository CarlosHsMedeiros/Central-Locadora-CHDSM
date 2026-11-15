# Central Locadora

Sistema de gestão de locadora com cadastro de clientes e veículos, contratos, check-lists, financeiro, relatórios e integrações opcionais com Google Drive e NFS-e.

## Estrutura

- `src/`: servidor, regras de acesso, serviços e repositórios.
- `database/`: estrutura e migrações do MySQL; não contém cópias dos dados da instalação.
- `scripts/`: ferramentas administrativas e verificações.
- `test/`: testes com dados fictícios e serviços simulados.
- `LOCADORA_*`, `index.html`, `app.js`, `app.css`: interface.
- `.env.example`: nomes das variáveis de configuração, sem credenciais.

## Instalação

Requisitos: Node.js 22 ou superior e MySQL 8.

1. Execute `npm ci`.
2. Copie `.env.example` para `.env` e preencha os dados privados da sua instalação.
3. Siga `database/README.md` para criar a estrutura e aplicar as migrações.
4. Defina as variáveis `INITIAL_ADMIN_*` no ambiente e execute `npm run create-admin`. Remova essas variáveis depois da criação.
5. Execute `npm start` e abra `http://127.0.0.1:3000`.

As integrações opcionais estão descritas em `GOOGLE_DRIVE_INTEGRACAO.md` e `NFSE_INTEGRACAO.md`. Senhas e chaves são configuradas no ambiente do servidor. Não há senha administrativa padrão.

## Publicação no GitHub

O arquivo `.gitignore` exclui ambientes privados, backups, certificados, logs e documentos gerados. Os utilitários fiscais específicos da instalação também permanecem locais.

Antes de criar um commit:

```sh
npm run check:publication
git add .
git diff --cached --stat
node scripts/check-publication.js --staged
```

Ative a verificação antes de cada commit nesta cópia:

```sh
git config core.hooksPath .githooks
```

A verificação examina o conteúdo que será incluído no commit, procura credenciais conhecidas do ambiente local e padrões de tokens e chaves privadas, sem imprimir seus valores. Senhas e certificados usados nos testes são produzidos durante a execução.

O arquivo `.env`, o banco de dados operacional e os arquivos locais excluídos não devem ser enviados pela interface de upload do GitHub. Ao usar uma cópia exportada, envie somente os arquivos dessa cópia.

## Verificações

- `npm test`: testes automatizados.
- `npm run check:publication`: arquivos que podem entrar na publicação.
- `node scripts/check-publication.js --staged`: conteúdo preparado para o próximo commit.

O endereço local configurado no Windows funciona somente no computador em que foi instalado. Publicar o código no GitHub não disponibiliza o servidor nem o banco de dados na internet.


## Azure Static Web Apps

A implantacao executa `npm run build:web` e envia apenas `dist/web`. O pacote inclui o portal de acesso, folhas de estilo, imagens, scripts de interface e DOMPurify. Os arquivos do servidor, banco, ambiente e ferramentas administrativas ficam fora da hospedagem estatica.

A pagina inicial encaminha para `LOCADORA_PAGINA_INICIAL.HTML`. Nao use o painel alternativo como pagina de entrada.

Essa publicacao nao executa o servidor Express nem transfere o MySQL local. Para login, cadastros e anexos online, publique o backend e um banco acessivel por ele e integre a rota `/api`. Configure as credenciais no ambiente privado do backend. Nao publique o `.env` nem abra o MySQL local para a internet.

Referencias: https://learn.microsoft.com/azure/static-web-apps/build-configuration e https://learn.microsoft.com/azure/static-web-apps/configuration
