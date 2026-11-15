const HttpError = require("../utils/httpError");
const env = require("../config/env");
const forbidden = new Set(["__proto__", "prototype", "constructor"]);
function inspect(value, depth = 0, budget = { nodes: 0 }) {
  if (++budget.nodes > 40000 || depth > 16) throw new HttpError(400, "INVALID_INPUT", "Estrutura de dados excessiva.");
  if (typeof value === "string" && (value.length > 7 * 1024 * 1024 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)))
    throw new HttpError(400, "INVALID_INPUT", "Conteúdo de campo inválido.");
  if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) {
    if (forbidden.has(key) || key.length > 100) throw new HttpError(400, "INVALID_INPUT", "Nome de campo inválido.");
    inspect(child, depth + 1, budget);
  }
}
function validateInput(req, res, next) {
  try {
    inspect(req.body); inspect(req.query);
    const compound=new Set(["veiculoIds","veiculos","veiculosDetalhes","historicoContratantes","custosPorAno","registros","arquivo","itensVeiculos","contratosIds","excluidos","checklistIds","licenciamentoPdf"]);
    if(req.body&&(!Array.isArray(req.body)&&typeof req.body==="object"))for(const [key,value]of Object.entries(req.body)){
      if(value!==null&&typeof value==="object"&&!compound.has(key))throw new HttpError(400,"INVALID_INPUT","Tipo de campo inválido.");
      if(typeof value==="string"&&key!=="foto"&&value.length>65535)throw new HttpError(400,"INVALID_INPUT","Campo excessivo.");
    }
    if(Array.isArray(req.body))throw new HttpError(400,"INVALID_INPUT","Envie um objeto JSON.");
    for (const value of Object.values(req.query)) if (Array.isArray(value) || (value && typeof value === "object"))
      throw new HttpError(400, "INVALID_QUERY", "Parâmetros repetidos ou compostos não são permitidos.");
    next();
  } catch (error) { next(error); }
}
function originGuard(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  const ownOrigin = req.protocol + "://" + req.get("host");
  const allowed = origin && (origin === ownOrigin || env.corsOrigins.includes(origin));
  if ((origin && !allowed) || (!origin && req.get("sec-fetch-site") === "cross-site"))
    return next(new HttpError(403, "ORIGIN_DENIED", "Origem da solicitação não autorizada."));
  // Navegadores enviam Origin/Fetch Metadata. Clientes de API sem cookies podem não enviar.
  if (!origin && req.get("cookie") && !["same-origin", "same-site"].includes(req.get("sec-fetch-site")))
    return next(new HttpError(403, "ORIGIN_REQUIRED", "A origem da solicitação é obrigatória."));
  if (req.headers["content-length"] !== undefined && Number(req.headers["content-length"]) > 0 && !req.is("application/json"))
    return next(new HttpError(415, "JSON_REQUIRED", "Envie os dados no formato JSON."));
  next();
}
function inspectNfseInput(req,res,next){try{inspect(req.body);inspect(req.query);if(req.body&&(!req.body||Array.isArray(req.body)||typeof req.body!=='object'))throw new HttpError(400,'INVALID_INPUT','Envie um objeto JSON.');for(const [key,value]of Object.entries(req.body||{})){if(!['string','number','boolean'].includes(typeof value))throw new HttpError(400,'INVALID_INPUT','Campo fiscal invalido.');if(typeof value==='string'&&value.length>(req.path==='/certificado'&&key==='conteudo'?700000:5000))throw new HttpError(400,'INVALID_INPUT','Campo excessivo.');}next();}catch(e){next(e);}}
module.exports = { inspect, validateInput, originGuard, inspectNfseInput };
