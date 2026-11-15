(function(root,factory){if(typeof module==="object"&&module.exports)module.exports=factory();else root.FiltrosFaturas=factory();})(globalThis,function(){
 const normal=v=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
 function filtrar(lista,f={},status,placas=()=>[]){
  return lista.filter(item=>{
   const date=String(item[f.dataCampo||"vencimento"]||"").slice(0,10);
   if(f.dataCampo!=="todos"&&(f.inicio||f.fim)&&(!date||(f.inicio&&date<f.inicio)||(f.fim&&date>f.fim)))return false;
   if(f.tipo&&item.tipo!==f.tipo)return false;
   if(f.situacao&&status(item)!==f.situacao)return false;
   if(f.cliente&&!normal(item.cliente).includes(normal(f.cliente)))return false;
   if(f.contrato&&!normal(item.contrato).includes(normal(f.contrato)))return false;
   if(f.placa&&!normal(placas(item).join(" ")).replace(/[^a-z0-9]/g,"").includes(normal(f.placa).replace(/[^a-z0-9]/g,"")))return false;
   return !f.busca||normal([item.numero,item.descricao,item.aitAutoInfracao].join(" ")).includes(normal(f.busca));
  });
 }
 return {filtrar};
});
