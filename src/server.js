const http = require("node:http");
const app = require("./app");
const env = require("./config/env");
const pool = require("./config/database");

const server = http.createServer(app);
server.listen(env.port, () => console.log(`Central Locadora em http://localhost:${env.port}`));

async function shutdown(signal) {
  console.log(`${signal} recebido. Encerrando servidor...`);
  server.close(async (error) => {
    try {
      await pool.end();
    } catch (poolError) {
      console.error("Erro ao encerrar o pool MySQL:", poolError);
    }
    if (error) {
      console.error("Erro ao encerrar o servidor:", error);
      process.exitCode = 1;
    }
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

module.exports = server;
