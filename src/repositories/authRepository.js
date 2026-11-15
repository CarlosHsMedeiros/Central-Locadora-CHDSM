const pool=require("../config/database");
async function findUser(username){const[rows]=await pool.execute("SELECT id,nome,usuario,senha_hash AS senhaHash,cargo,perfil,ativo FROM usuarios WHERE usuario=? LIMIT 1",[username]);return rows[0]||null;}
async function createSession({usuarioId,tokenHash,expiresAt,ip,userAgent}){await pool.execute("INSERT INTO sessoes(usuario_id,token_hash,expires_at,ip,user_agent) VALUES(?,?,?,?,?)",[usuarioId,tokenHash,expiresAt,ip||null,userAgent||null]);}
async function findSession(tokenHash){const[rows]=await pool.execute("SELECT s.id AS sessaoId,s.expires_at AS expiresAt,u.id,u.nome,u.usuario,u.cargo,u.perfil,u.ativo FROM sessoes s JOIN usuarios u ON u.id=s.usuario_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP() AND u.ativo=TRUE LIMIT 1",[tokenHash]);return rows[0]||null;}
async function touch(tokenHash){await pool.execute("UPDATE sessoes SET ultimo_uso_em=UTC_TIMESTAMP() WHERE token_hash=?",[tokenHash]);}
async function deleteSession(tokenHash){const[r]=await pool.execute("DELETE FROM sessoes WHERE token_hash=?",[tokenHash]);return r.affectedRows>0;}
async function recordLogin(userId){await pool.execute("UPDATE usuarios SET ultimo_login_em=UTC_TIMESTAMP() WHERE id=?",[userId]);}
async function audit({userId,action,entity="auth",entityId=null,newData=null,ip=null,userAgent=null}){await pool.execute("INSERT INTO logs_auditoria(usuario_id,acao,entidade,entidade_id,dados_novos,ip,user_agent) VALUES(?,?,?,?,?,?,?)",[userId,action,entity,entityId,newData?JSON.stringify(newData):null,ip,userAgent]);}
module.exports={findUser,createSession,findSession,touch,deleteSession,recordLogin,audit};
