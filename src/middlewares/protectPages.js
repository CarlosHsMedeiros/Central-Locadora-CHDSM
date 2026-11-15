const service=require("../services/authService");
const cookies=require("../utils/cookies");
module.exports=async function protectPages(req,res,next){
 const page=req.path==="/"?"index.html":req.path.slice(1).toLowerCase();
 if(!page.endsWith(".html")||page==="locadora_pagina_inicial.html")return next();
 res.set("Cache-Control","no-store");
 try{
  const user=await service.authenticate(cookies.parse(req.headers.cookie).locadora_session);
  if(page==="locadora_configuracoes.html"&&user.perfil!=="administrador")return res.status(403).send("Acesso restrito ao administrador.");
  next();
 }catch(error){
  if(error.status===401)return res.redirect(303,"/LOCADORA_PAGINA_INICIAL.HTML");
  next(error);
 }
};
