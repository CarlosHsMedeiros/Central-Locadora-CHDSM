const HttpError=require("../utils/httpError");
function login(body){if(!body||typeof body!=="object")throw new HttpError(400,"VALIDATION_ERROR","Corpo JSON inválido.");const usuario=String(body.usuario||"").trim().toLowerCase(),senha=String(body.senha||"");if(!/^[a-z0-9._-]{3,80}$/i.test(usuario))throw new HttpError(400,"VALIDATION_ERROR","Usuário inválido.");if(senha.length<8||Buffer.byteLength(senha,"utf8")>72)throw new HttpError(400,"VALIDATION_ERROR","Senha inválida.");return{usuario,senha};}
module.exports={login};
