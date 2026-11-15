const bcrypt=require("bcryptjs"),pool=require("../config/database"),HttpError=require("../utils/httpError");
async function authorize(body,user){
 if(typeof body.justificativa!=="string"||body.justificativa.trim().length<10||body.justificativa.length>2000)throw new HttpError(400,"REASON_REQUIRED","Informe uma justificativa com 10 a 2000 caracteres.");
 if(typeof body.senha!=="string"||!body.senha||body.senha.length>256)throw new HttpError(403,"PASSWORD_REQUIRED","Confirme sua senha para esta operação.");
 const account=await require("../repositories/authRepository").findUser(user.usuario);
 if(!account||!account.ativo||String(account.id)!==String(user.id)||!await bcrypt.compare(body.senha,account.senhaHash))throw new HttpError(403,"INVALID_PASSWORD","Senha incorreta.");
}
async function record(c,action,previous,next,reason,user){
 const [payments]=await c.execute("SELECT * FROM pagamentos WHERE fatura_id=? ORDER BY id",[previous._dbId]);
 const [[client]]=await c.execute("SELECT nome FROM clientes WHERE id=?",[previous.clienteId]);
 const before={...previous,cliente:client?.nome||"",pagamentos:payments};
 await c.execute("INSERT INTO logs_auditoria(usuario_id,acao,entidade,entidade_id,dados_anteriores,dados_novos) VALUES(?,?,?,?,?,?)",[user.id,action,"fatura",previous._dbId,JSON.stringify(before),JSON.stringify({justificativa:reason.trim(),responsavel:user.nome,alteracoes:next})]);
}
async function history(query){
 const page=Math.max(1,Math.min(100000,Math.floor(Number(query.pagina))||1));
 const termo=String(query.busca||"").trim().slice(0,150);
 const where="entidade='fatura' AND acao IN ('FATURA_EXCLUIDA','FATURA_EDITADA') AND (CAST(dados_anteriores AS CHAR) LIKE ? OR CAST(dados_novos AS CHAR) LIKE ?)";
 const params=["%"+termo+"%","%"+termo+"%"];
 const [[count]]=await pool.execute("SELECT COUNT(*) AS total FROM logs_auditoria WHERE "+where,params);
 const [rows]=await pool.query("SELECT id,acao,created_at AS data,dados_anteriores AS anterior,dados_novos AS registro FROM logs_auditoria WHERE "+where+" ORDER BY id DESC LIMIT 25 OFFSET "+((page-1)*25),params);
 return {data:rows.map(r=>({...r,anterior:typeof r.anterior==="string"?JSON.parse(r.anterior):r.anterior,registro:typeof r.registro==="string"?JSON.parse(r.registro):r.registro})),total:Number(count.total),pagina:page};
}
module.exports={authorize,record,history};
