const service=require("../services/authService"),cookies=require("../utils/cookies"),env=require("../config/env");
const options={httpOnly:true,secure:env.nodeEnv==="production",sameSite:"lax",path:"/",maxAge:env.sessionHours*3600000};
async function login(req,res,next){try{const result=await service.login(req.body,{ip:req.ip,userAgent:req.get("user-agent")});res.cookie("locadora_session",result.token,options);res.status(200).json({data:{user:result.user,expiresAt:result.expiresAt}});}catch(e){next(e);}}
async function me(req,res){res.json({data:{user:req.user}});}
async function logout(req,res,next){try{const token=req.authToken||cookies.parse(req.headers.cookie).locadora_session;await service.logout(token,req.user,{ip:req.ip,userAgent:req.get("user-agent")});res.clearCookie("locadora_session",{httpOnly:true,secure:options.secure,sameSite:"lax",path:"/"});res.status(204).end();}catch(e){next(e);}}
module.exports={login,me,logout};
