# Integração com Google Drive

## Arquitetura

O backend Node/Express acessa o Drive pela API REST oficial. O navegador nunca recebe o segredo OAuth nem o refresh token. O administrador inicia o OAuth 2.0; o callback confere a conta `conta-autorizada@example.com`. O refresh token é protegido com AES-256-GCM antes de ser guardado no MySQL. Os arquivos permanecem privados e só são entregues pelo backend autenticado.

O escopo OAuth pedido é `drive.file`, mais `openid email` para conferir a identidade autorizada. `drive.file` limita o acesso aos arquivos criados ou selecionados para o aplicativo; esta implementação cria e consulta os próprios arquivos do sistema. Ela não dá ao aplicativo acesso geral aos demais arquivos pessoais do Drive. Referências e metadados ficam em `google_drive_files`; credencial cifrada fica em `google_drive_auth`.

Pastas são criadas sob demanda: `LOCADORA DIGITAL/{VEICULOS|CLIENTES|CONTRATOS|MULTAS|CHECKLISTS}/{registro}/{categoria}`. Documentos administrativos ficam em `LOCADORA DIGITAL/ADMINISTRATIVO/{categoria}`. Uma verificação de pastas existentes evita recriações no uso sequencial. Uploads repetidos do mesmo conteúdo no mesmo cadastro e categoria retornam a referência existente.

## Configuração do Google Cloud

1. Crie ou selecione um projeto no [Google Cloud Console](https://console.cloud.google.com/).
2. Ative **Google Drive API**.
3. Configure a tela de consentimento OAuth como aplicativo externo. Em modo de teste, inclua `conta-autorizada@example.com` como usuário de teste. Para uso contínuo, publique o aplicativo e conclua as verificações exigidas pelo Google: tokens de atualização emitidos para aplicativos externos em teste expiram após sete dias.
4. Cadastre os escopos `https://www.googleapis.com/auth/drive.file`, `openid` e `email`.
5. Crie uma credencial **OAuth client ID** do tipo **Web application**.
6. Cadastre como URI de redirecionamento autorizado o valor exato de `GOOGLE_DRIVE_REDIRECT_URI`. No desenvolvimento deste projeto, o backend usa a porta 3000: `http://127.0.0.1:3000/api/drive/oauth/callback`. Em produção, use HTTPS no domínio público do backend.
7. Copie o Client ID e Client Secret para o `.env` do servidor. Não os coloque no JavaScript, HTML ou repositório.
8. Gere a chave de cifragem com Node.js: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Guarde o resultado em `GOOGLE_DRIVE_TOKEN_KEY`, no gerenciador de segredos ou no ambiente privado do backend. Faça backup seguro: sem essa chave não será possível ler o refresh token já salvo.
9. Configure `GOOGLE_DRIVE_AUTHORIZED_EMAIL=conta-autorizada@example.com` e reinicie o backend.
10. Entre no site como administrador, abra **Configurações → Google Drive** e escolha **Autorizar ou reconectar conta Google**. Confirme que a conta mostrada é a conta autorizada.

Variáveis esperadas (valores secretos ficam somente no servidor):

```dotenv
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REDIRECT_URI=https://SEU_DOMINIO/api/drive/oauth/callback
GOOGLE_DRIVE_TOKEN_KEY=
GOOGLE_DRIVE_AUTHORIZED_EMAIL=conta-autorizada@example.com
```

## Banco e execução

Faça backup do banco e aplique a migration aditiva `database/migrations/008_google_drive_files.sql` ao MySQL antes de iniciar uploads. A migration também está incluída em `database/schema.sql` para instalações novas. Não apague as colunas ou dados legados nesta etapa.

Use Node.js 22+, configure as variáveis existentes do MySQL no `.env` e execute `npm install` quando necessário e `npm start`. O provedor de hospedagem não está indicado na configuração do repositório; em produção, registre a URI de callback HTTPS do backend e injete os segredos pelo mecanismo da hospedagem.

## Rotas implementadas

- `GET /api/drive/status` — informa se há uma conta conectada.
- `GET /api/drive/oauth/connect` e `/oauth/callback` — conexão administrativa OAuth.
- `POST /api/drive/files` — upload autenticado, com validação de conteúdo/tipo/tamanho e associação a cadastro.
- `GET /api/drive/files?entityType=...&entityId=...` — metadados paginados (até 100).
- `GET /api/drive/files/:id/content` e `/download` — leitura privada sob demanda.
- `DELETE /api/drive/files/:id` — exclusão autorizada conforme o perfil de escrita do cadastro.
- `DELETE /api/drive/connection` — revoga a autorização e remove o token cifrado; os arquivos permanecem no Drive.

As rotas aceitam os tipos já permitidos pela política comum de arquivos do projeto (JPG, PNG, PDF, MP4 e WebM), até 5 MB; fotos de veículo ficam limitadas a 650 KB. As telas de veículos, clientes, contratos e documentos administrativos têm acesso aos anexos privados. Multas e checklists integram a rotina de gravação dos registros: os anexos são enviados ao Drive após a confirmação do cadastro, e os dados binários legados só são limpos depois do sucesso do upload. Anexos antigos permanecem no banco até serem abertos e salvos novamente ou migrados; ainda não há rotina em lote para migrar todo o acervo existente.

## Verificações

Depois de configurar credenciais e aplicar a migration, teste como administrador:

1. Conecte a conta e confira que o status muda para conectado.
2. Envie JPG e PDF pela tela de veículos; confira os itens na pasta correspondente no Drive.
3. Feche e reabra a ficha, confira a foto e a prévia do PDF; teste abrir/baixar.
4. Repita o envio do mesmo arquivo e confira que não surge uma cópia para a mesma categoria.
5. Teste acesso com perfil sem permissão, ID inexistente e ID de outro cadastro; deve ser negado ou retornar não encontrado.
6. Desconecte e confirme que o sistema deixa de acessar o Drive sem excluir arquivos.
7. Teste falha de rede/Drive e confirme que o cadastro não apaga anexos antigos.

Os testes reais contra o Drive dependem da configuração manual OAuth, da migration aplicada e da conta Google acessível; ainda não foram declarados como aprovados.

## Referências oficiais

- [Escopos OAuth da API do Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [OAuth 2.0 para aplicações web de servidor](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Uploads da API do Google Drive](https://developers.google.com/workspace/drive/api/guides/manage-uploads?hl=pt)
