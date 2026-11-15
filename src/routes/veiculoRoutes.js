const r=require("express").Router(),c=require("../controllers/veiculoController"),a=require("../middlewares/authorize");r.get("/",a("administrador","atendimento","financeiro","manutenção","consulta"),c.list);r.get("/:id",a("administrador","atendimento","financeiro","manutenção","consulta"),c.get);r.post("/",a("administrador","atendimento"),c.create);r.put("/:id",a("administrador","atendimento","manutenção"),c.update);r.delete("/:id",a("administrador"),c.remove);
r.get("/:id/licenciamentos",a("administrador","atendimento","financeiro","manutenção","consulta"),async(req,res,next)=>{try{
 const id=require("../validators/veiculoValidator").id(req.params.id);
 const [rows]=await require("../config/database").execute("SELECT JSON_EXTRACT(valor,'$.ano') AS ano,JSON_UNQUOTE(JSON_EXTRACT(valor,'$.nome')) AS nome,JSON_EXTRACT(valor,'$.tamanho') AS tamanho FROM configuracoes WHERE chave LIKE ? ORDER BY chave DESC",["crlv:"+id+":%"]);
 res.json({data:rows});
}catch(e){next(e);}});
r.get("/:id/licenciamentos/:ano",a("administrador","atendimento","financeiro","manutenção","consulta"),async(req,res,next)=>{try{
 const id=require("../validators/veiculoValidator").id(req.params.id);
 if(!/^\d{4}$/.test(req.params.ano))return res.status(400).json({message:"Ano inválido."});
 const [[row]]=await require("../config/database").execute("SELECT JSON_UNQUOTE(JSON_EXTRACT(valor,'$.dados')) AS dados FROM configuracoes WHERE chave=?",["crlv:"+id+":"+req.params.ano]);
 if(!row)return res.status(404).json({message:"Documento não encontrado."});
 res.set({"Content-Type":"application/pdf","Content-Disposition":'attachment; filename="CRLV-'+id+'-'+req.params.ano+'.pdf"',"Cache-Control":"no-store"}).send(Buffer.from(row.dados.split(",")[1],"base64"));
}catch(e){next(e);}});
module.exports=r;
