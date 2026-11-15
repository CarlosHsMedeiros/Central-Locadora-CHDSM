# Segurança do sistema

Política de entrada: JPG/JPEG, PNG, PDF, DOC/DOCX, XML e XLS/XLSX. Não foi interpretado “Microsoft” como permissão para qualquer arquivo desse fabricante: executáveis, scripts, ZIP, JSON, SVG, DOCM e XLSM ficam fora da lista. CSV, MDB e ACCDB também não foram liberados sem definição de necessidade.

Fotos e logotipo: até 650 KB. Anexos: até 5 MB. O limite de armazenamento local do navegador continua valendo. O seletor, a validação do conteúdo no navegador e os validadores da API/migração aplicam a política; mudar apenas a extensão não basta. Há inspeção de assinaturas, MIME, nomes e tamanho. DOCX/XLSX são inspecionados internamente com limites de descompactação e rejeição de macros, objetos e referências externas. XML não aceita DTD/entidades externas. PDFs com ações ativas identificáveis são recusados. Anexos são baixados em vez de abertos como páginas da aplicação.

A validação de formato não substitui um antivírus/CDR: arquivos binários antigos e PDFs podem explorar vulnerabilidades dos programas que os abrem. Não há serviço antivírus instalado por esta alteração.

Todas as páginas carregam o DOMPurify localmente, e os pontos de inserção de HTML passam por higienização. Os editores de cláusulas preservam apenas formatação textual permitida. Scripts inline foram extraídos; eventos usam funções explícitas, sem eval. A CSP bloqueia scripts inline e atributos de evento, objetos, frames externos e formulários enviados a outras origens. CSS inline permanece permitido por compatibilidade com o layout.

A API valida estrutura/profundidade/tamanho, recusa chaves de poluição de protótipo, parâmetros de consulta duplicados, tipos compostos em campos escalares e identificadores/paginação excessivos. As consultas existentes usam parâmetros e múltiplas instruções SQL estão explicitamente desativadas. Não se remove apóstrofo de nomes para tentar impedir SQL injection.

Login: janela de 15 minutos; limites de 5 falhas/em andamento por combinação IP-conta, 10 por conta e 30 por IP. As tentativas em andamento já ocupam o limite antes do bcrypt, evitando corrida por paralelismo. Respostas usam credenciais inválidas genéricas; usuários inexistentes também passam por bcrypt. Há limite geral de 300 requisições/minuto por IP e tamanho máximo do mapa de contadores. Os contadores são locais ao processo e reiniciam junto com ele. Para várias instâncias, é necessário um armazenamento compartilhado (por exemplo Redis) antes de escalar a implantação.

Páginas internas exigem sessão válida no servidor; configurações exigem administrador. Apenas arquivos públicos previstos são servidos. Código do backend, ambiente, testes, documentação, dependências, caminhos anormais e backups ficam bloqueados. Escritas validam origem e tipo JSON. Cookies usam HttpOnly/SameSite e Secure em produção. Erros não devolvem SQL, pilha nem conteúdo de JSON malformado.

## Operação

Execute pelo servidor Node/Express, não por Live Server/servidor estático: os controles de sessão, origem, API e CSP são aplicados pelo backend. Reinicie o processo Node após alterações e use Ctrl+F5 para recarregar os scripts. Em produção, configure HTTPS, NODE_ENV=production e CORS_ORIGINS somente com as origens realmente necessárias. O aplicativo não confia automaticamente em X-Forwarded-For; um proxy requer configuração restrita ao proxy real.

Multas, manutenção, faturas/pagamentos, checklists, configurações e histórico agora usam rotas autenticadas e as tabelas do MySQL. O localStorage operacional antigo é lido somente pela importação; seus originais são preservados. A cópia para renderização das telas fica em memória. A gravação valida perfil, vínculos e versão, e usa transação. Consulte INTEGRACAO_MYSQL.md para detalhes e limitações.

## Verificação

- npm test
- node scripts/check-security-browser.js (Chrome instalado no caminho padrão do Windows; servidor isolado e APIs simuladas, sem gravações no banco real)
- npm audit --omit=dev

Os testes cobrem assinaturas falsas, formatos proibidos, XML/XXE, PDFs ativos, pacotes Office, concorrência de login, pulverização de senhas, autenticação de páginas, caminhos de backend, CSRF/origem, poluição de protótipo, consultas parametrizadas e HTML/CSP. O teste de navegador percorre as 13 páginas e verifica formulários e uploads.

Referências: [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html), [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).
