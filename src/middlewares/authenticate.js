const service=require("../services/authService"),cookies=require("../utils/cookies");
module.exports=async function authenticate(req,res,next){try{req.authToken=cookies.parse(req.headers.cookie).locadora_session;req.user=await service.authenticate(req.authToken);next();}catch(e){next(e);}};
