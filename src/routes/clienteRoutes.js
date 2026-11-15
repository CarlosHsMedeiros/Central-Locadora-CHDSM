const express=require("express");
const controller=require("../controllers/clienteController");
const authorize=require("../middlewares/authorize");
const router=express.Router();
router.get("/",authorize("administrador","atendimento","financeiro","manutenção","consulta"),controller.list); router.get("/opcoes",authorize("administrador","atendimento","financeiro","manutenção","consulta"),controller.options); router.get("/:id",authorize("administrador","atendimento","financeiro","manutenção","consulta"),controller.get); router.post("/",authorize("administrador","atendimento"),controller.create); router.put("/:id",authorize("administrador","atendimento"),controller.update); router.delete("/:id",authorize("administrador"),controller.remove);
module.exports=router;
