(function(root,factory){if(typeof module==="object"&&module.exports)module.exports=factory(require("./LOCADORA_VALORES.JS"));else root.FaturamentoVeiculos=factory(root.Valores);})(globalThis,function(V){
 const placa=v=>String(v||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
 function distribuir(fatura,veiculos=[],contratos=[],multas=[]){
  const mapa=new Map();
  function incluir(item){
   const v=veiculos.find(v=>item.veiculoId!=null?String(v.id)===String(item.veiculoId):placa(v.placa)===placa(item.placa));
   const id=String(item.veiculoId??v?.id??""),p=placa(item.placa||v?.placa),key=id||p;
   if(!key)return;
   if(!mapa.has(key))mapa.set(key,{veiculoId:id,placa:p,centavos:0});
   mapa.get(key).centavos+=V.centavos(item.valor||0);
  }
  for(const item of fatura.itensVeiculos||[])incluir(item);
  if(!mapa.size){
   const ids=(fatura.contratosIds||[fatura.contratoId]).filter(Boolean).map(String);
   for(const c of contratos.filter(c=>ids.includes(String(c.id)))){
    for(const v of c.veiculosDetalhes||c.veiculos||[]){if(v&&typeof v==="object")incluir({veiculoId:v.id,placa:v.placa});}
   }
   const multa=multas.find(m=>String(m.id)===String(fatura.multaId));
   if(multa)incluir({veiculoId:multa.veiculoId,placa:multa.placa});
  }
  const linhas=[...mapa.values()];if(!linhas.length)return [];
  const total=V.centavos(fatura.valor),base=linhas.reduce((s,i)=>s+i.centavos,0),residuo=total-base;
  const extras=V.ratear(residuo/100,linhas.length).map(V.centavos);
  return linhas.map((i,n)=>({...i,valor:(i.centavos+extras[n])/100}));
 }
 function resumo(veiculo,faturas,veiculos,contratos,multas){
  const linhas=[];
  for(const f of faturas){
   if(["cancelada","cancelado","excluida"].includes(String(f.status||"").toLowerCase()))continue;
   const item=distribuir(f,veiculos,contratos,multas).find(i=>i.veiculoId?String(i.veiculoId)===String(veiculo.id):i.placa===placa(veiculo.placa));
   if(item)linhas.push({numero:f.numero,valor:item.valor,dataPagamento:f.dataPagamento||"",tipo:f.tipo,natureza:f.natureza||"Receita"});
  }
  const receitas=linhas.filter(i=>i.natureza!=="Despesa"),despesas=linhas.filter(i=>i.natureza==="Despesa");
  const emitido=V.somar(receitas.map(i=>i.valor)),recebido=V.somar(receitas.filter(i=>i.dataPagamento).map(i=>i.valor));
  const custo=V.somar(despesas.map(i=>i.valor)),pago=V.somar(despesas.filter(i=>i.dataPagamento).map(i=>i.valor));
  return {linhas,emitido,recebido,areceber:V.somar([emitido,-recebido]),custo,pago,apagar:V.somar([custo,-pago]),saldo:V.somar([emitido,-custo]),saldoPago:V.somar([recebido,-pago])};
 }
 return {distribuir,resumo};
});
