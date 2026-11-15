"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { build, output } = require("../scripts/build-web");
test("build publica o portal com suas dependencias e exclui o servidor", () => {
  build();
  assert.match(fs.readFileSync(path.join(output, "index.html"), "utf8"), /LOCADORA_PAGINA_INICIAL\.HTML/);
  assert.ok(fs.existsSync(path.join(output, "DOMPURIFY.js")));
  assert.ok(fs.existsSync(path.join(output, "LOCADORA_PAGINA_INICIAL.CSS")));
  for (const name of [".env", ".env.example", "src", "scripts", "database", "test", "package.json", "server.js"]) assert.equal(fs.existsSync(path.join(output, name)), false, name);
  const config = JSON.parse(fs.readFileSync(path.join(output, "staticwebapp.config.json")));
  assert.equal(config.routes.find(r => r.route === "/").redirect, "/LOCADORA_PAGINA_INICIAL.HTML");
  assert.equal(config.routes.find(r => r.route === "/src/*").statusCode, 404);
});
