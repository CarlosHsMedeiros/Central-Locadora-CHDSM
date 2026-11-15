const policy = require("../../ARQUIVOS_SEGUROS.JS");
const HttpError = require("../utils/httpError");
function image(value) {
  if(value===""||value==null)return "";
  if(typeof value!=="string"||!policy.imageUrl(value))throw new HttpError(400,"INVALID_FILE","A foto deve ser um JPG ou PNG válido de até 650 KB.");
  return value;
}
function attachment(file) {
  if(!file||typeof file!=="object"||Array.isArray(file))throw new HttpError(400,"INVALID_FILE","Anexo inválido.");
  try{
    const result=policy.validateDataUrl(file.dados,file.nome);
    if(file.tipo&&file.tipo!==result.mime&&!(result.ext==="xml"&&file.tipo==="text/xml")&&file.tipo!=="application/octet-stream")throw Error("Tipo de anexo incompatível.");
    if(file.tamanho!=null&&Number(file.tamanho)!==result.bytes.length)throw Error("Tamanho do anexo incompatível.");
    return {nome:file.nome,tipo:policy.types[result.ext],tamanho:result.bytes.length,dados:file.dados};
  }catch(error){throw new HttpError(400,"INVALID_FILE",error.message);}
}
module.exports={image,attachment};
