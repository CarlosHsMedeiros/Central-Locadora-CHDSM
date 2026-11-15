const repo=require("../repositories/veiculoRepository"),v=require("../validators/veiculoValidator"),HttpError=require("../utils/httpError");
async function list(q){const p=v.query(q),r=await repo.list(p);return{data:r.rows,pagination:{page:p.page,limit:p.limit,total:r.total,pages:Math.ceil(r.total/p.limit)}};}
async function get(raw){const id=v.id(raw),item=await repo.findById(id);if(!item)throw new HttpError(404,"VEHICLE_NOT_FOUND","Veículo não encontrado.");return{data:item};}
async function unique(d,id){if(await repo.findDuplicate(d,id))throw new HttpError(409,"VEHICLE_ALREADY_EXISTS","Placa, RENAVAM ou chassi já cadastrado.");}
async function create(b){const d=v.normalize(b);await unique(d);try{return{data:await repo.create(d)};}catch(e){if(e.code==="ER_DUP_ENTRY")throw new HttpError(409,"VEHICLE_ALREADY_EXISTS","Veículo duplicado.");throw e;}}
async function update(raw,b){const id=v.id(raw);const atual=(await get(id)).data;const d=v.normalize({...atual,...b});await unique(d,id);return{data:await repo.update(id,d)};}
async function remove(raw){const id=v.id(raw),result=await repo.removeOrDeactivate(id);if(!result)throw new HttpError(404,"VEHICLE_NOT_FOUND","Veículo não encontrado.");if(result==="linked")throw new HttpError(409,"VEHICLE_HAS_HISTORY","O veículo está Inativo, mas ainda possui contratos, multas, manutenções, check-lists, faturas ou arquivos anexados. Remova os vínculos e anexos antes de excluí-lo para preservar o histórico.");return result;}
module.exports={list,get,create,update,remove};
