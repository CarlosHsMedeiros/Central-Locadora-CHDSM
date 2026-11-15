const test = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.DB_HOST ||= "127.0.0.1";
process.env.DB_NAME ||= "central_locadora_test";
process.env.DB_USER ||= "central_locadora_test";
process.env.DB_CONNECT_TIMEOUT = "200";

const app = require("../src/app");
const pool = require("../src/config/database");

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await pool.end();
});

test("mantém o frontend estático disponível", async () => {
  const response = await fetch(`${baseUrl}/LOCADORA_PAGINA_INICIAL.HTML`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  const csp=response.headers.get("content-security-policy");
  assert.match(csp,/script-src 'self'(?:;|$)/);
  assert.match(csp,/script-src-attr 'none'/);
});

test("não expõe arquivos do backend pelo servidor estático", async () => {
  for (const pathname of ["/server.js", "/package.json", "/src/config/env.js", "/database/schema.sql", "/scripts/create-admin.js", "/DOCUMENTACAO_BACKEND.md", "/.env.example"]) {
    const response = await fetch(`${baseUrl}${pathname}`);
    assert.equal(response.status, 404);
  }
});

test("GET /api/health informa também o estado do MySQL", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();
  assert.ok([200, 503].includes(response.status));
  assert.ok(["connected", "disconnected"].includes(body.database));
  assert.equal(body.service, "central-locadora-api");
  assert.ok(body.checkedAt);
});

test("rotas desconhecidas da API retornam erro JSON", async () => {
  const response = await fetch(`${baseUrl}/api/inexistente`);
  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.error.code, "AUTH_REQUIRED");
});
