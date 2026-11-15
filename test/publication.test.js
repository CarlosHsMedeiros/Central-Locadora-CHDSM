"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { isPrivate, scanText } = require("../scripts/check-publication");
test("exclui ambientes, certificados, backups e dados privados", () => {
  for (const filename of [".env", ".env.production", "config/local.env", ".integration-backup/nota.pdf", ".vscode/settings.json", "certificado.pfx", "private/arquivo.xml", "credentials.json", "scripts/register-nfse-xml.js"]) assert.equal(isPrivate(filename), true, filename);
  for (const filename of [".env.example", "src/app.js", "database/schema.sql", "database/migrations/008_google_drive_files.sql", "scripts/create-admin.js"]) assert.equal(isPrivate(filename), false, filename);
});
test("identifica chaves e valores privados sem incluir o valor no diagnostico", () => {
  const secret = require("node:crypto").randomBytes(24).toString("hex");
  const findings = scanText("arquivo.js", "linha\n" + secret, [secret]);
  assert.equal(findings[0].line, 2);
  assert.ok(!JSON.stringify(findings).includes(secret));
  assert.ok(scanText("arquivo", ["-----BEGIN", "PRIVATE KEY-----"].join(" ")).length);
  assert.deepEqual(scanText("arquivo.js", "const senha = process.env.DB_PASSWORD;"), []);
});
