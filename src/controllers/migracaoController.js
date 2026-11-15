const service=require("../services/migracaoService");
async function migrate(req,res,next){try{res.status(200).json({data:await service.migrate(req.params.etapa,req.body)});}catch(error){next(error);}}
module.exports={migrate};
