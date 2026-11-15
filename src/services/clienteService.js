const repository=require("../repositories/clienteRepository");
const validator=require("../validators/clienteValidator");
const HttpError=require("../utils/httpError");
async function list(raw){const query=validator.query(raw);const result=await repository.list(query);return {data:result.rows,pagination:{page:query.page,limit:query.limit,total:result.total,pages:Math.ceil(result.total/query.limit)}};}
async function options(){return {data:await repository.listOptions()};}
async function get(rawId){const id=validator.id(rawId);const cliente=await repository.findById(id);if(!cliente)throw new HttpError(404,"CLIENT_NOT_FOUND","Cliente não encontrado.");return {data:cliente};}
async function ensureUnique(documento,exceptId){if(await repository.findByDocument(documento,exceptId))throw new HttpError(409,"DOCUMENT_ALREADY_EXISTS","Já existe um cliente com este CPF/CNPJ.");}
function translate(error){if(error.code==="ER_DUP_ENTRY")throw new HttpError(409,"DUPLICATE_VALUE","Documento ou CNH já cadastrado.");if(error.code==="ER_ROW_IS_REFERENCED_2")throw new HttpError(409,"CLIENT_IN_USE","Cliente possui registros vinculados e não pode ser excluído.");throw error;}
async function create(body){const data=validator.normalize(body);await ensureUnique(data.documento);try{return {data:await repository.create(data)};}catch(error){return translate(error);}}
async function update(rawId,body){const id=validator.id(rawId);if(!await repository.findById(id))throw new HttpError(404,"CLIENT_NOT_FOUND","Cliente não encontrado.");const data=validator.normalize(body);await ensureUnique(data.documento,id);try{return {data:await repository.update(id,data)};}catch(error){return translate(error);}}
async function remove(rawId){const id=validator.id(rawId);try{if(!await repository.remove(id))throw new HttpError(404,"CLIENT_NOT_FOUND","Cliente não encontrado.");}catch(error){translate(error);}}
module.exports={list,options,get,create,update,remove};
