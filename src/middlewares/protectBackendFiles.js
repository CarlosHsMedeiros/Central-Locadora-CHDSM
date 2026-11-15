const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
// Somente arquivos públicos conhecidos na inicialização. Pastas, fontes e backups não são públicos.
const allowed = new Set(fs.readdirSync(root).filter(name =>
  /^(?:index\.html|app\.(?:js|css)|api\.js|(?:LOCADORA_|RELATORIOS_INTERFACE|LICENCIAMENTO_SP|ARQUIVOS_SEGUROS|SEGURANCA_INTERFACE)[A-Z0-9_.-]*\.(?:html|css|js)|(?:HERO_[A-Z_]+|IMAGEM \d+)\.png)$/i.test(name)
).map(name=>name.toLowerCase()));
module.exports = function protectBackendFiles(req,res,next) {
  let pathname;
  try { pathname=decodeURIComponent(req.path); } catch { return res.status(400).send("Caminho inválido"); }
  if(pathname==="/")return next();
  const name=pathname.slice(1);
  if(/[\\/\x00-\x1f:%]/.test(name)||!allowed.has(name.toLowerCase()))return res.status(404).send("Não encontrado");
  next();
};
