"use strict";

const router = require("express").Router();
const files = require("../services/googleDriveService");
const HttpError = require("../utils/httpError");
const { parse } = require("../utils/cookies");
const authorize = require("../middlewares/authorize");

router.get("/status", async (req, res, next) => {
  try { res.json({ data: { connected: Boolean(await files.authorizedAccount()) } }); }
  catch (error) { next(error); }
});

router.get("/oauth/connect", authorize("administrador"), async (req, res, next) => {
  try {
    const result = await files.connectUrl();
    require("../utils/driveLocalOrigin").remember(req, result.state);
    const secure = req.secure || req.get("x-forwarded-proto") === "https";
    res.cookie("drive_oauth_state", result.cookie, { httpOnly: true, secure, sameSite: "lax", maxAge: 10 * 60 * 1000, path: "/api/drive/oauth/callback" });
    res.redirect(result.url);
  } catch (error) { next(error); }
});

router.get("/oauth/callback", authorize("administrador"), async (req, res, next) => {
  try {
    if (req.query.error) throw new HttpError(400, "DRIVE_OAUTH_DENIED", "A autorização do Google Drive foi cancelada.");
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    if (!code || !state) throw new HttpError(400, "DRIVE_OAUTH_INVALID", "Resposta OAuth inválida.");
    const account = await files.exchangeCode(code, state, parse(req.headers.cookie).drive_oauth_state);
    res.clearCookie("drive_oauth_state", { path: "/api/drive/oauth/callback" });
    res.type("html").send(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Drive conectado</title><body><p>Google Drive conectado para ${account.email}.</p><p>Você pode fechar esta janela.</p></body></html>`);
  } catch (error) { next(error); }
});

router.post("/files", async (req, res, next) => {
  try {
    const entity = files.entities[req.body?.entityType];
    if (!entity || !entity.write.includes(req.user.perfil)) throw new HttpError(403, "FORBIDDEN", "Você não possui permissão para enviar arquivos a este cadastro.");
    const data = await files.upload({ ...req.body, userId: req.user.id });
    res.status(201).json({ data });
  } catch (error) { next(error); }
});

router.post("/legacy/clear", async (req, res, next) => {
  try {
    const { entityType, entityId, category } = req.body || {};
    const entity = files.entities[entityType];
    if (!entity || !entity.write.includes(req.user.perfil)) throw new HttpError(403, "FORBIDDEN", "Você não possui permissão para migrar anexos deste cadastro.");
    await files.clearLegacy(entityType, entityId, category);
    res.status(204).end();
  } catch (error) { next(error); }
});

router.get("/files", async (req, res, next) => {
  try {
    const entity = files.entities[req.query.entityType];
    if (!entity || !entity.view.includes(req.user.perfil)) throw new HttpError(403, "FORBIDDEN", "Você não possui permissão para consultar estes arquivos.");
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? 100 : Number(req.query.limit);
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new HttpError(400, "INVALID_PAGE", "Paginação inválida.");
    const result = await files.list({ entityType: req.query.entityType, entityId: req.query.entityId, page, limit });
    res.json({ data: result.rows, pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) } });
  } catch (error) { next(error); }
});

router.get("/files/:id", async (req, res, next) => {
  try {
    const record = await files.getRecord(req.params.id);
    await files.assertAccess(record, req.user);
    const current = await files.refreshMetadata(req.params.id);
    res.json({ data: { id: current.drive_file_id, category: current.category, name: current.display_name, mimeType: current.mime_type, size: current.size_bytes, folderId: current.drive_folder_id } });
  } catch (error) { next(error); }
});

router.patch("/files/:id", async (req, res, next) => {
  try {
    const record = await files.getRecord(req.params.id);
    await files.assertAccess(record, req.user, true);
    res.json({ data: await files.rename(req.params.id, req.body?.name, req.user) });
  } catch (error) { next(error); }
});

router.get("/files/:id/content", async (req, res, next) => {
  try {
    const record = await files.getRecord(req.params.id);
    await files.assertAccess(record, req.user);
    const current = await files.refreshMetadata(req.params.id);
    const { response } = await files.download(req.params.id);
    res.set({ "Content-Type": current.mime_type, "Content-Length": current.size_bytes, "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(current.display_name)}`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (error) { next(error); }
});

router.get("/files/:id/download", async (req, res, next) => {
  try {
    const record = await files.getRecord(req.params.id);
    await files.assertAccess(record, req.user);
    const current = await files.refreshMetadata(req.params.id);
    const { response } = await files.download(req.params.id);
    res.set({ "Content-Type": current.mime_type, "Content-Length": current.size_bytes, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(current.display_name)}`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (error) { next(error); }
});

router.delete("/files/:id", async (req, res, next) => {
  try {
    const record = await files.getRecord(req.params.id);
    await files.assertAccess(record, req.user, true);
    await files.remove(req.params.id, req.user);
    res.status(204).end();
  }
  catch (error) { next(error); }
});

router.delete("/connection", authorize("administrador"), async (req, res, next) => {
  try {
    await files.disconnect();
    res.status(204).end();
  } catch (error) { next(error); }
});

module.exports = router;
