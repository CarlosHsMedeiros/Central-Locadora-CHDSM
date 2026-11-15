"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const privatePath = /(?:^|\/)(?:\.env(?:\..*)?|[^/]+\.env|\.envrc|\.npmrc|\.pypirc|\.integration-backup|\.vscode|\.idea|\.ssh|\.aws|node_modules|coverage|backups?|dumps?|exports?|uploads?|logs?|private|secrets?|certificates?)(?:\/|$)|\.(?:pfx|p12|pem|key|keystore|jks|sqlite3?|db|bak|backup|log|zip|7z|rar)$/i;
const privateFile = /(?:^|\/)(?:(?:client[_-]?secret|credentials|service[_-]?account)[^/]*\.json|(?:dump|backup)[^/]*\.sql)$/i;
function isPrivate(name) {
  const normalized = name.replace(/\\/g, "/");
  if (normalized === ".env.example") return false;
  return privatePath.test(normalized) || privateFile.test(normalized)
    || /^scripts\/(?:register-nfse-(?:example|xml)\.js|[^/]+\.(?:png|pdf))$/i.test(normalized);
}
const patterns = [
  ["chave privada", /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g],
  ["token de provedor", /(?:AIza[0-9A-Za-z_-]{30,}|GOCSPX-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{25,}|sk-(?:proj-)?[A-Za-z0-9_-]{25,}|xox[baprs]-[A-Za-z0-9-]{20,}|ya29\.[A-Za-z0-9_-]{20,}|1\/\/[A-Za-z0-9_-]{30,})/g],
  ["URL com credencial", /(?:https?|mysql|postgres(?:ql)?|mongodb(?:\+srv)?):\/\/[^\s/@"']+:[^\s/@"']+@/gi],
  ["credencial fixa", /\b(?:password|senha|clientSecret|apiKey|accessToken|refreshToken|tokenEncryptionKey|DB_PASSWORD|GOOGLE_DRIVE_CLIENT_SECRET)\s*[:=]\s*["'][^"'\r\n]{3,}["']/gi],
  ["conta de servico privada", /"type"\s*:\s*"service_account"/g],
];
function scanText(name, text, known = []) {
  const findings = [];
  for (const [kind, regex] of patterns) {
    regex.lastIndex = 0;
    for (const match of text.matchAll(regex)) {
      findings.push({ file: name, line: text.slice(0, match.index).split("\n").length, kind });
    }
  }
  for (const value of known) {
    const offset = text.indexOf(value);
    if (offset >= 0) findings.push({ file: name, line: text.slice(0, offset).split("\n").length, kind: "valor de credencial local" });
  }
  return findings;
}
function git(args, encoding = "utf8") {
  const result = spawnSync("git", args, { cwd: root, encoding, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
  if (result.status !== 0) throw Error("Nao foi possivel consultar o Git. Inicialize o repositorio antes da verificacao.");
  return result.stdout;
}
function localSecrets() {
  const filename = path.join(root, ".env");
  if (!fs.existsSync(filename)) return [];
  return fs.readFileSync(filename, "utf8").split(/\r?\n/).flatMap(line => {
    const match = /^\s*([A-Z0-9_]*(?:PASSWORD|SECRET|TOKEN|API_KEY|PRIVATE_KEY)[A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) return [];
    const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
    return value.length >= 8 ? [value] : [];
  });
}
function main() {
  const staged = process.argv.includes("--staged");
  const names = git(staged
    ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]
    : ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]
  ).split("\0").filter(Boolean);
  const known = localSecrets();
  const findings = [];
  let count = 0;
  for (const name of new Set(names)) {
    if (isPrivate(name)) { findings.push({ file: name, kind: "arquivo privado" }); continue; }
    const absolute = path.join(root, name);
    let text;
    if (staged) {
      if (git(["ls-files", "--stage", "--", name]).startsWith("120000")) {
        findings.push({ file: name, kind: "link simbolico" }); continue;
      }
      text = git(["show", ":" + name]);
    } else {
      if (!fs.existsSync(absolute)) continue;
      if (fs.lstatSync(absolute).isSymbolicLink()) { findings.push({ file: name, kind: "link simbolico" }); continue; }
      text = fs.readFileSync(absolute, "utf8");
    }
    findings.push(...scanText(name, text, known));
    count++;
  }
  if (findings.length) {
    for (const item of findings) console.error(item.file + (item.line ? ":" + item.line : "") + " - " + item.kind);
    console.error("Publicacao bloqueada: remova esses itens do commit e mantenha credenciais no ambiente privado.");
    process.exitCode = 1;
  } else console.log("Verificacao concluida: " + count + " arquivos, sem ocorrencias detectadas. Valores privados nao sao exibidos.");
}
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = { isPrivate, scanText };
