const service=require("../services/clienteService");
const handler=(action)=>async(req,res,next)=>{try{await action(req,res);}catch(error){next(error);}};
const list=handler(async(req,res)=>res.status(200).json(await service.list(req.query)));
const options=handler(async(req,res)=>res.status(200).json(await service.options()));
const get=handler(async(req,res)=>res.status(200).json(await service.get(req.params.id)));
const create=handler(async(req,res)=>res.status(201).json(await service.create(req.body)));
const update=handler(async(req,res)=>res.status(200).json(await service.update(req.params.id,req.body)));
const remove=handler(async(req,res)=>{await service.remove(req.params.id);res.status(204).end();});
module.exports={list,options,get,create,update,remove};
