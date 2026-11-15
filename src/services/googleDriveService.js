"use strict";

const crypto = require("node:crypto");
const pool = require("../config/database");
const env = require("../config/env");
const HttpError = require("../utils/httpError");
const policy = require("../../ARQUIVOS_SEGUROS.JS");

const entities = Object.freeze({
  administrativo: { folder: "ADMINISTRATIVO", view: ["administrador"], write: ["administrador"] },
  veiculo: { table: "veiculos", folder: "VEICULOS", view: ["administrador", "atendimento", "financeiro", "manutenção", "consulta"], write: ["administrador", "atendimento", "manutenção"] },
  cliente: { table: "clientes", folder: "CLIENTES", view: ["administrador", "atendimento", "financeiro", "manutenção", "consulta"], write: ["administrador", "atendimento"] },
  contrato: { table: "contratos", folder: "CONTRATOS", view: ["administrador", "atendimento", "financeiro", "manutenção", "consulta"], write: ["administrador", "atendimento", "financeiro"] },
  multa: { table: "multas", folder: "MULTAS", view: ["administrador", "atendimento", "financeiro", "manutenção", "consulta"], write: ["administrador", "atendimento", "financeiro"] },
  checklist: { table: "checklists", folder: "CHECKLISTS", view: ["administrador", "atendimento", "financeiro", "manutenção", "consulta"], write: ["administrador", "atendimento", "manutenção"] },
  manutencao: { table: "manutencoes", folder: "MANUTENCOES", view: ["administrador", "manutenção"], write: ["administrador", "manutenção"] },
});
const maxSize = 5 * 1024 * 1024;
const b64url = (value) => Buffer.from(value).toString("base64url");

function credentials() {
  const d = env.googleDrive;
  if (!d.clientId || !d.clientSecret || !d.redirectUri || !d.tokenEncryptionKey) {
    throw new HttpError(503, "DRIVE_NOT_CONFIGURED", "Integração com Google Drive ainda não configurada pelo administrador.");
  }
  const key = Buffer.from(d.tokenEncryptionKey, "base64");
  if (key.length !== 32) throw new HttpError(503, "DRIVE_NOT_CONFIGURED", "Chave de proteção do Google Drive inválida.");
  return { ...d, key };
}

function encrypt(value) {
  const { key } = credentials();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((part) => part.toString("base64url")).join(".");
}

function decrypt(value) {
  const { key } = credentials();
  const [iv, tag, body] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  if (!iv || !tag || !body || iv.length !== 12 || tag.length !== 16) throw new Error("Credencial Drive inválida.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}

function oauthStateCookie(state) {
  const { key } = credentials();
  const signature = crypto.createHmac("sha256", key).update(state).digest("base64url");
  return `${state}.${signature}`;
}

function verifyState(state, cookie) {
  if (typeof state !== "string" || typeof cookie !== "string") return false;
  const expected = oauthStateCookie(state);
  const a = Buffer.from(expected), b = Buffer.from(cookie);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function connectUrl() {
  const d = credentials();
  const state = crypto.randomBytes(32).toString("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: d.clientId, redirect_uri: d.redirectUri, response_type: "code",
    scope: "https://www.googleapis.com/auth/drive.file openid email",
    access_type: "offline", prompt: "consent", login_hint: d.authorizedEmail, include_granted_scopes: "true", state,
  }).toString();
  return { url: url.toString(), state, cookie: oauthStateCookie(state) };
}

async function authorizedAccount() {
  const [rows] = await pool.execute("SELECT authorized_email AS email FROM google_drive_auth WHERE id=1 LIMIT 1");
  return rows[0] || null;
}

async function exchangeCode(code, state, cookie) {
  const d = credentials();
  if (!verifyState(state, cookie)) throw new HttpError(400, "DRIVE_OAUTH_STATE", "Estado de autorização inválido ou expirado.");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: d.clientId, client_secret: d.clientSecret, redirect_uri: d.redirectUri, grant_type: "authorization_code" }),
    signal: AbortSignal.timeout(15000),
  });
  const token = await response.json().catch(() => ({}));
  if (!response.ok || !token.access_token || !token.refresh_token) throw new HttpError(502, "DRIVE_OAUTH_FAILED", "Não foi possível concluir a autorização do Google Drive. Revise a configuração OAuth e tente novamente.");
  const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(10000) });
  const user = await userResponse.json().catch(() => ({}));
  if (!userResponse.ok || !user.email || user.email.toLowerCase() !== d.authorizedEmail) throw new HttpError(403, "DRIVE_ACCOUNT_MISMATCH", "Autorize a conta Google configurada para o sistema.");
  await pool.execute("INSERT INTO google_drive_auth(id,authorized_email,encrypted_refresh_token) VALUES(1,?,?) ON DUPLICATE KEY UPDATE authorized_email=VALUES(authorized_email),encrypted_refresh_token=VALUES(encrypted_refresh_token),drive_root_folder_id=NULL,authorized_at=CURRENT_TIMESTAMP", [user.email.toLowerCase(), encrypt(token.refresh_token)]);
  return { email: user.email.toLowerCase() };
}

async function accessToken() {
  const [rows] = await pool.execute("SELECT encrypted_refresh_token AS token FROM google_drive_auth WHERE id=1 LIMIT 1");
  if (!rows[0]) throw new HttpError(503, "DRIVE_NOT_CONNECTED", "O administrador ainda precisa autorizar a conta Google.");
  const d = credentials();
  let refreshToken;
  try { refreshToken = decrypt(rows[0].token); } catch { throw new HttpError(503, "DRIVE_CREDENTIAL_ERROR", "Credencial protegida do Google Drive não pôde ser lida."); }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: d.clientId, client_secret: d.clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) throw new HttpError(502, "DRIVE_AUTH_EXPIRED", "A autorização do Google Drive expirou. O administrador precisa conectar a conta novamente.");
  return result.access_token;
}

async function driveRequest(path, options = {}) {
  const url = path.startsWith("https://") ? path : `https://www.googleapis.com/drive/v3/${path}`;
  const response = await fetch(url, {
    ...options, headers: { Authorization: `Bearer ${await accessToken()}`, ...(options.headers || {}) }, signal: options.signal || AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    if (response.status === 404) throw new HttpError(404, "DRIVE_FILE_MISSING", "O arquivo não está mais disponível no Google Drive.");
    if (response.status === 429 || response.status >= 500) throw new HttpError(503, "DRIVE_TEMPORARY_ERROR", "O Google Drive está temporariamente indisponível. Tente novamente.");
    throw new HttpError(502, "DRIVE_REQUEST_FAILED", "O Google Drive não concluiu a operação solicitada.");
  }
  return response;
}

const escQ = (value) => String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
async function findOrCreateFolder(name, parentId) {
  const q = `name='${escQ(name)}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentId ? ` and '${escQ(parentId)}' in parents` : ""}`;
  const search = await driveRequest(`files?q=${encodeURIComponent(q)}&pageSize=100&fields=files(id,name)&spaces=drive`);
  const result = await search.json();
  if (result.files?.length) return result.files[0].id;
  const response = await driveRequest("files?fields=id,name", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", ...(parentId ? { parents: [parentId] } : {}) }) });
  return (await response.json()).id;
}

async function folderFor(entity, id, category) {
  const [rows] = await pool.execute("SELECT drive_root_folder_id AS id FROM google_drive_auth WHERE id=1 LIMIT 1");
  let parent = rows[0]?.id;
  if (!parent) {
    parent = await findOrCreateFolder("LOCADORA DIGITAL");
    await pool.execute("UPDATE google_drive_auth SET drive_root_folder_id=? WHERE id=1", [parent]);
  }
  const names = entity.folder === "ADMINISTRATIVO" ? [entity.folder, category.toLowerCase()] : [entity.folder, `${entity.folder.slice(0, -1)}_${id}`, category.toLowerCase()];
  for (const name of names) parent = await findOrCreateFolder(name, parent);
  return parent;
}

async function assertEntity(entityType, entityId) {
  const entity = entities[entityType];
  if (!entity || !/^[1-9]\d{0,19}$/.test(String(entityId))) throw new HttpError(400, "INVALID_FILE_OWNER", "Cadastro relacionado inválido.");
  if (entityType === "administrativo" && String(entityId) === "1") return entity;
  if (!entity.table) throw new HttpError(400, "INVALID_FILE_OWNER", "Cadastro relacionado inválido.");
  const [rows] = await pool.execute(`SELECT id FROM ${entity.table} WHERE id=? LIMIT 1`, [entityId]);
  if (!rows.length) throw new HttpError(404, "FILE_OWNER_MISSING", "Cadastro relacionado não encontrado.");
  return entity;
}

function fileContent(input) {
  if (!input || typeof input !== "object" || typeof input.name !== "string" || typeof input.data !== "string") throw new HttpError(400, "INVALID_FILE", "Arquivo inválido.");
  const match = /^data:([a-z0-9.+/-]+);base64,([A-Za-z0-9+/]*={0,2})$/i.exec(input.data);
  if (!match || match[2].length % 4) throw new HttpError(400, "INVALID_FILE", "Conteúdo de arquivo inválido.");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > maxSize) throw new HttpError(400, "INVALID_FILE", "O arquivo excede o limite de 5 MB ou está vazio.");
  try { policy.validateBytes(bytes, policy.extension(input.name)); }
  catch (error) { throw new HttpError(400, "INVALID_FILE", error.message); }
  const mime = match[1].toLowerCase();
  const declared = policy.types[policy.extension(input.name)];
  if (mime !== declared && mime !== "application/octet-stream") throw new HttpError(400, "INVALID_FILE", "O tipo do arquivo não corresponde ao conteúdo.");
  if (declared.startsWith("image/") && bytes.length > 650 * 1024) throw new HttpError(400, "INVALID_FILE", "A imagem deve ter até 650 KB.");
  return { bytes, mime: declared, name: input.name, sha256: crypto.createHash("sha256").update(bytes).digest("hex") };
}

async function upload({ entityType, entityId, category, label, file, userId }) {
  const entity = await assertEntity(entityType, entityId);
  const cleanCategory = String(category || "documentos").toLowerCase();
  const displayLabel = label == null ? null : String(label).trim().slice(0, 120);
  if (!/^[a-z0-9_-]{1,40}$/.test(cleanCategory)) throw new HttpError(400, "INVALID_FILE_CATEGORY", "Categoria do arquivo inválida.");
  // O titulo do campo e exibido separadamente do nome tecnico do arquivo.
  // Normaliza tambem os envios de paginas abertas antes desta correcao.
  if(entityType==="checklist"&&file&&typeof file.name==="string"){
    const extension=/\.(png|jpe?g)$/i.exec(file.name)?.[1].toLowerCase();
    if(extension)file={...file,name:`checklist-${cleanCategory}.${extension}`};
  }
  const content = fileContent(file);
  const [duplicates] = await pool.execute("SELECT drive_file_id AS id,original_name AS name,mime_type AS mimeType,size_bytes AS size FROM google_drive_files WHERE entity_type=? AND entity_id=? AND category=? AND content_sha256=? LIMIT 1", [entityType, entityId, cleanCategory, content.sha256]);
  if (duplicates.length) return duplicates[0];
  if (entityType === "manutencao") {
    const [[{ total }]] = await pool.execute("SELECT COUNT(*) AS total FROM google_drive_files WHERE entity_type='manutencao' AND entity_id=?", [entityId]);
    if (Number(total) >= 5) throw new HttpError(400, "MAINTENANCE_FILE_LIMIT", "Cada manutenção pode ter no máximo 5 arquivos.");
  }
  const parent = await folderFor(entity, entityId, cleanCategory);
  const boundary = `drive_${crypto.randomBytes(18).toString("hex")}`;
  const metadata = JSON.stringify({ name: content.name, mimeType: content.mime, parents: [parent] });
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${content.mime}\r\n\r\n`),
    content.bytes, Buffer.from(`\r\n--${boundary}--`),
  ]);
  const response = await driveRequest("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,parents", {
    method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}`, "Content-Length": String(body.length) }, body,
  });
  const created = await response.json();
  try {
  await pool.execute("INSERT INTO google_drive_files(entity_type,entity_id,category,drive_file_id,drive_folder_id,original_name,display_name,display_label,mime_type,size_bytes,content_sha256,uploaded_by_usuario_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)", [entityType, entityId, cleanCategory, created.id, parent, content.name, content.name, displayLabel, content.mime, content.bytes.length, content.sha256, userId]);
  } catch (error) {
    // Keep the Drive object for recovery; do not delete it when DB persistence fails.
    throw new HttpError(503, "FILE_REFERENCE_FAILED", "O arquivo foi enviado, mas a referência não pôde ser salva. Avise o administrador para recuperar o arquivo no Drive.");
  }
  return { id: created.id, name: content.name, mimeType: content.mime, size: content.bytes.length };
}

async function list({ entityType, entityId, page = 1, limit = 100 }) {
  await assertEntity(entityType, entityId);
  const offset = (page - 1) * limit;
  const [rows] = await pool.execute("SELECT drive_file_id AS id,category,original_name,display_name AS name,display_label AS label,mime_type AS mimeType,size_bytes AS size,created_at AS uploadedAt FROM google_drive_files WHERE entity_type=? AND entity_id=? ORDER BY id DESC LIMIT ? OFFSET ?", [entityType, entityId, limit, offset]);
  const [[count]] = await pool.execute("SELECT COUNT(*) AS total FROM google_drive_files WHERE entity_type=? AND entity_id=?", [entityType, entityId]);
  return { rows, total: Number(count.total) };
}

async function getRecord(id) {
  const [rows] = await pool.execute("SELECT * FROM google_drive_files WHERE drive_file_id=? LIMIT 1", [id]);
  if (!rows.length) throw new HttpError(404, "DRIVE_FILE_MISSING", "Arquivo não encontrado.");
  return rows[0];
}

async function assertAccess(record, user, write = false) {
  const entity = await assertEntity(record.entity_type, record.entity_id);
  if (!entity[(write ? "write" : "view")].includes(user?.perfil)) throw new HttpError(403, "FORBIDDEN", "Você não possui permissão para acessar este documento.");
  return entity;
}

async function download(id) {
  const record = await getRecord(id);
  await assertEntity(record.entity_type, record.entity_id);
  const response = await driveRequest(`files/${encodeURIComponent(id)}?alt=media`, { headers: { Accept: "*/*" } });
  return { record, response };
}

async function refreshMetadata(id) {
  const record = await getRecord(id);
  const response = await driveRequest(`files/${encodeURIComponent(id)}?fields=id,name,mimeType,size,modifiedTime,parents`);
  const current = await response.json();
  const parent = current.parents?.[0] || null;
  const size = Number(current.size || record.size_bytes);
  if (!Object.values(policy.types).includes(current.mimeType) || !Number.isSafeInteger(size) || size < 1 || size > maxSize || current.mimeType.startsWith("image/") && size > 650 * 1024) throw new HttpError(415, "DRIVE_FILE_TYPE_CHANGED", "O arquivo no Google Drive mudou para um formato ou tamanho não permitido.");
  await pool.execute("UPDATE google_drive_files SET display_name=?,mime_type=?,size_bytes=?,drive_folder_id=? WHERE drive_file_id=?", [current.name, current.mimeType, size, parent, id]);
  return { ...record, display_name: current.name, mime_type: current.mimeType, size_bytes: size, drive_folder_id: parent };
}

async function rename(id, name, user) {
  const record = await getRecord(id);
  let mime;
  try { mime = policy.types[policy.extension(name)]; } catch (error) { throw new HttpError(400, "INVALID_FILE_NAME", error.message); }
  if (mime !== record.mime_type || name.length > 180) throw new HttpError(400, "INVALID_FILE_NAME", "O novo nome precisa manter o formato do arquivo.");
  const response = await driveRequest(`files/${encodeURIComponent(id)}?fields=id,name`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
  const updated = await response.json();
  await pool.execute("UPDATE google_drive_files SET display_name=? WHERE drive_file_id=?", [updated.name, id]);
  await pool.execute("INSERT INTO logs_auditoria(usuario_id,acao,entidade,entidade_id,dados_anteriores,dados_novos) VALUES(?,?,?,?,?,?)", [user?.id || null, "DRIVE_FILE_RENAMED", record.entity_type, record.entity_id, JSON.stringify({ driveFileId: id, name: record.display_name }), JSON.stringify({ driveFileId: id, name: updated.name })]);
  return { id, name: updated.name };
}

async function remove(id, user) {
  const record = await getRecord(id);
  await assertEntity(record.entity_type, record.entity_id);
  await driveRequest(`files/${encodeURIComponent(id)}`, { method: "DELETE" });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("DELETE FROM google_drive_files WHERE drive_file_id=?", [id]);
    await connection.execute("INSERT INTO logs_auditoria(usuario_id,acao,entidade,entidade_id,dados_anteriores) VALUES(?,?,?,?,?)", [user?.id || null, "DRIVE_FILE_DELETED", record.entity_type, record.entity_id, JSON.stringify({ driveFileId: id, category: record.category })]);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

async function disconnect() {
  const [rows] = await pool.execute("SELECT encrypted_refresh_token AS token FROM google_drive_auth WHERE id=1 LIMIT 1");
  if (!rows[0]) return;
  let token;
  try { token = decrypt(rows[0].token); } catch { throw new HttpError(503, "DRIVE_CREDENTIAL_ERROR", "Credencial protegida do Google Drive não pôde ser lida."); }
  const response = await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new HttpError(502, "DRIVE_REVOKE_FAILED", "O Google não confirmou a revogação. A conexão foi mantida.");
  await pool.execute("DELETE FROM google_drive_auth WHERE id=1");
}

async function clearLegacy(entityType, entityId, category) {
  const entity = await assertEntity(entityType, entityId);
  if (entityType === "veiculo") {
    await pool.execute("UPDATE veiculos SET foto=NULL WHERE id=?", [entityId]);
    await pool.execute("DELETE FROM configuracoes WHERE chave LIKE ?", [`crlv:${entityId}:%`]);
  } else if (entityType === "multa") {
    await pool.execute("DELETE FROM multa_arquivos WHERE multa_id=?", [entityId]);
  } else if (entityType === "checklist") {
    const match = /^foto_(\d{1,2})$/.exec(String(category || ""));
    if (!match) throw new HttpError(400, "INVALID_FILE_CATEGORY", "Categoria de foto do check-list invalida.");
    await pool.execute("DELETE FROM checklist_fotos WHERE checklist_id=? AND ordem=?", [entityId, Number(match[1]) - 1]);
  }
  return Boolean(entity);
}

module.exports = { entities, fileContent, connectUrl, authorizedAccount, exchangeCode, upload, list, getRecord, assertAccess, download, refreshMetadata, rename, remove, disconnect, clearLegacy };




