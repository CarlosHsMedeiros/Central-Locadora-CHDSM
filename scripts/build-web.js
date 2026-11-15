"use strict";
const fs = require("node:fs"), path = require("node:path");
const root = path.resolve(__dirname, "..");
const parent = path.join(root, "dist"), output = path.join(parent, "web");
const marker = ".central-locadora-build";
function build() {
  if (path.resolve(output) !== path.resolve(root, "dist", "web")) throw Error("Destino de build invalido.");
  for (const folder of [parent, output]) if (fs.existsSync(folder) && fs.lstatSync(folder).isSymbolicLink()) throw Error("Destino de build nao pode ser um link.");
  if (fs.existsSync(output)) {
    if (!fs.existsSync(path.join(output, marker))) throw Error("Destino ja existe sem identificacao de build; nenhum arquivo foi removido.");
    fs.rmSync(output, { recursive: true });
  }
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, marker), "");
  const allowed = /^(?:index\.html|app\.(?:js|css)|api\.js|(?:LOCADORA_|RELATORIOS_INTERFACE|LICENCIAMENTO_SP|ARQUIVOS_SEGUROS|SEGURANCA_INTERFACE)[A-Z0-9_.-]*\.(?:html|css|js)|(?:HERO_[A-Z_]+|IMAGEM \d+)\.png)$/i;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile() && allowed.test(entry.name)) fs.copyFileSync(path.join(root, entry.name), path.join(output, entry.name));
  }
  fs.copyFileSync(require.resolve("dompurify/dist/purify.min.js"), path.join(output, "DOMPURIFY.js"));
  fs.copyFileSync(path.join(root, "staticwebapp.config.json"), path.join(output, "staticwebapp.config.json"));
  console.log("Arquivos publicos preparados em dist/web. Servidor e configuracoes privadas nao foram copiados.");
}
if (require.main === module) build();
module.exports = { build, output };
