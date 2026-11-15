const HttpError = require("../utils/httpError");
const entries = new Map();
let lastCleanup = 0;
module.exports = function apiRateLimit(req,res,next) {
  const now=Date.now();
  if(now-lastCleanup>10000){for(const [key,value] of entries)if(value.reset<=now)entries.delete(key);lastCleanup=now;}
  let entry=entries.get(req.ip);
  if(!entry||entry.reset<=now){
    if(entries.size>=20000&&!entry){res.set("Retry-After","60");return next(new HttpError(429,"API_RATE_LIMITED","Muitas solicitações."));}
    entry={count:0,reset:now+60000};entries.set(req.ip,entry);
  }
  if(++entry.count>300){res.set("Retry-After",String(Math.max(1,Math.ceil((entry.reset-now)/1000))));return next(new HttpError(429,"API_RATE_LIMITED","Muitas solicitações. Aguarde um minuto."));}
  next();
};
