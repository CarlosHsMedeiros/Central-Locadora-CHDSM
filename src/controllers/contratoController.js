const s=require("../services/contratoService"),wrap=f=>async(req,res,next)=>{try{await f(req,res);}catch(e){next(e);}};
module.exports={list:wrap(async(req,res)=>res.json(await s.list(req.query))),get:wrap(async(req,res)=>res.json(await s.get(req.params.id))),create:wrap(async(req,res)=>res.status(201).json(await s.create(req.body))),update:wrap(async(req,res)=>res.json(await s.update(req.params.id,req.body))),changeClient:wrap(async(req,res)=>res.json(await s.changeClient(req.params.id,req.body))),remove:wrap(async(req,res)=>{await s.remove(req.params.id);res.status(204).end();})};

module.exports.finish=async(req,res,next)=>{try{res.json(await require("../services/contratoService").finish(req.params.id,req.body));}catch(error){next(error);}};
