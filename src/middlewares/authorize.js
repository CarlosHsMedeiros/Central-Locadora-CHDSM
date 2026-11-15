const HttpError=require("../utils/httpError");
module.exports=(...profiles)=>(req,res,next)=>req.user&&profiles.includes(req.user.perfil)?next():next(new HttpError(403,"FORBIDDEN","Você não possui permissão para esta operação."));
