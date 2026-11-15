const express=require("express");
const controller=require("../controllers/migracaoController");
const router=express.Router();
router.post("/:etapa",controller.migrate);
module.exports=router;
