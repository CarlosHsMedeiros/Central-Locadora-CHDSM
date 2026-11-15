const HttpError = require("../utils/httpError");
module.exports = function errorHandler(error,req,res,next) {
  if(res.headersSent)return next(error);
  const status=Number.isInteger(error.status)&&error.status>=400&&error.status<=599?error.status:500;
  const licensingPending = error instanceof HttpError && status === 503 && error.code === "LICENSING_MIGRATION_REQUIRED";
  const messages={413:"Os dados enviados excedem o limite permitido.",400:"Solicitação inválida."};
  const parseError=error.type==="entity.parse.failed";
  const body={error:{code:licensingPending?error.code:status>=500?"INTERNAL_SERVER_ERROR":parseError?"INVALID_JSON":status===413?"PAYLOAD_TOO_LARGE":error.code||"REQUEST_ERROR",message:licensingPending?"Cadastro indisponível: falta atualizar os campos de licenciamento no banco de dados. Solicite ao administrador a aplicação da migração 006 e tente novamente.":status>=500?"Erro interno do servidor.":parseError?messages[400]:messages[status]&&status===413?messages[status]:error.message}};
  if(error.details&&status<500&&!parseError)body.error.details=error.details;
  if(status>=500)console.error("[server error]",error.code||error.name);
  res.status(status).json(body);
};
