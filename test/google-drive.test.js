const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const drive = require("../src/services/googleDriveService");
const pool = require("../src/config/database");

const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";

test("Drive valida extensão, MIME e conteúdo antes de enviar", () => {
  const file = drive.fileContent({ name: "foto.png", type: "image/png", data: `data:image/png;base64,${png}` });
  assert.equal(file.mime, "image/png");
  assert.equal(file.bytes.length, 68);
  assert.match(file.sha256, /^[a-f0-9]{64}$/);
  assert.throws(() => drive.fileContent({ name: "foto.pdf", type: "application/pdf", data: `data:application/pdf;base64,${png}` }), /conteúdo/i);
  assert.throws(() => drive.fileContent({ name: "script.js", type: "text/javascript", data: `data:text/javascript;base64,${png}` }));
});

test("Drive limita anexos aos cadastros e perfis conhecidos", () => {
  assert.deepEqual(Object.keys(drive.entities).sort(), ["administrativo", "checklist", "cliente", "contrato", "multa", "veiculo"]);
  assert.ok(drive.entities.veiculo.view.includes("consulta"));
  assert.ok(drive.entities.veiculo.write.includes("atendimento"));
  assert.ok(!drive.entities.veiculo.write.includes("consulta"));
});

test("credenciais OAuth não aparecem nos scripts enviados ao navegador", () => {
  const source = ["api.js", "LOCADORA_VEICULOS_API.JS", "LOCADORA_CONFIGURACOES.JS"]
    .map((file) => fs.readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(source, /GOOGLE_DRIVE_CLIENT_SECRET|GOOGLE_DRIVE_TOKEN_KEY|refresh_token|client_secret/i);
});

test("Drive removes only the uploaded checklist legacy photo", async () => {
  const original = pool.execute;
  const calls = [];
  pool.execute = async (sql, params) => {
    calls.push({ sql, params });
    if (sql.startsWith("SELECT id FROM checklists")) return [[{ id: "42" }]];
    return [{ affectedRows: 1 }];
  };
  try {
    await drive.clearLegacy("checklist", "42", "foto_3");
    assert.deepEqual(calls[1], {
      sql: "DELETE FROM checklist_fotos WHERE checklist_id=? AND ordem=?",
      params: ["42", 2],
    });
    await assert.rejects(
      drive.clearLegacy("checklist", "42", "invalid"),
      (error) => error.code === "INVALID_FILE_CATEGORY",
    );
    assert.equal(calls[2].sql.startsWith("SELECT id FROM checklists"), true);
  } finally {
    pool.execute = original;
  }
});
test("endpoints do Drive exigem sessão autenticada", async (t) => {
  const app = require("../src/app");
  const server = app.listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once("listening", resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/drive/status`);
  assert.equal(response.status, 401);
});
