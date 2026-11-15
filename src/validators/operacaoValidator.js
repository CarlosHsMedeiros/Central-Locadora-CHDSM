"use strict";
const HttpError=require("../utils/httpError"),money=require("../../LOCADORA_VALORES.JS"),files=require("./arquivoValidator");
const fail=m=>{throw new HttpError(400,"VALIDATION_ERROR",m);};
const text=(v,n=255,required=false)=>{if(v!=null&&typeof v!=="string"&&typeof v!=="number")fail("Tipo de campo inválido.");const s=String(v??"").trim();if(s.length>n||required&&!s)fail("Campo obrigatório ausente ou muito longo.");return s;};
const date=(v,required=false)=>{const s=text(v,10,required);if(!s)return null;const d=new Date(s+"T12:00:00Z");if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(+d)||d.toISOString().slice(0,10)!==s)fail("Data inválida.");return s;};
const id=v=>{if(v==null||v==="")return null;if(!/^[1-9]\d{0,19}$/.test(String(v))||BigInt(v)>18446744073709551615n)fail("Referência inválida.");return String(v);};
const integer=v=>{if(v==null||v==="")return null;const n=Number(v);if(!Number.isSafeInteger(n)||n<0||n>4294967295)fail("Quilometragem inválida.");return n;};
const odometro=v=>{
 if(v==null||v==="")return null;
 if(typeof v==="string"){
  v=v.trim();
  if(!/^(?:[0-9]+|[0-9]{1,3}(?:\.[0-9]{3})+)$/.test(v))fail("Quilometragem inválida.");
  v=v.replace(/\./g,"");
 }else if(typeof v!=="number")fail("Quilometragem inválida.");
 return integer(v);
};
const amount=v=>{let n;try{n=money.numero(v);}catch{fail("Valor inválido.");}if(n<0||n>9999999999999.99)fail("Valor fora do limite.");return n;};
const ref=v=>id(v)||fail("Selecione o cadastro vinculado.");
const list=(v,max)=>{if(!Array.isArray(v)||v.length>max)fail("Lista inválida.");return v;};
function normalize(key,d){
 if(!d||typeof d!=="object"||Array.isArray(d))fail("Registro inválido.");
 const common={id:d._dbId?id(d._dbId):null,clientKey:d.clientKey==null?null:text(d.clientKey,80)};
 if(key==="manutencoes"){
  const r={...common,veiculoId:ref(d.veiculoId),tipo:text(d.tipo,80,true),oficina:text(d.oficina,150),dataEntrada:date(d.dataEntrada,true),dataSaida:date(d.dataSaida),quilometragem:integer(d.quilometragem),valorPecas:amount(d.valorPecas),valorMaoObra:amount(d.valorMaoObra),status:text(d.status,40,true),proximaData:date(d.proximaData),proximaKm:integer(d.proximaKm),pecas:text(d.pecas,65535),descricao:text(d.descricao,65535,true),observacoes:text(d.observacoes,65535)};
  if(r.dataSaida&&r.dataSaida<r.dataEntrada)fail("Saída anterior à entrada.");return r;
 }
 if(key==="multas"){
  const r={...common,veiculoId:ref(d.veiculoId),clienteId:id(d.clienteId),contratoId:id(d.contratoId),autoInfracao:text(d.autoInfracao,80,true).toUpperCase(),placa:text(d.placa,10),orgao:text(d.orgao,120),codigo:text(d.codigo,40),descricao:text(d.descricao,65535),data:date(d.data,true),hora:text(d.hora,8)||null,local:text(d.local,200),cidade:text(d.cidade,120),uf:text(d.uf,2),valor:amount(d.valor),valorDesconto:amount(d.valorDesconto),vencimento:date(d.vencimento),prazoCondutor:date(d.prazoCondutor),pontos:integer(d.pontos)||0,situacao:text(d.situacao,40,true),responsavel:text(d.responsavel,150),observacoes:text(d.observacoes,65535),arquivo:d.arquivo?files.attachment(d.arquivo):null};
  if(r.pontos>255||r.hora&&!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(r.hora))fail("Hora ou pontos inválidos.");return r;
 }
 if(key==="checklistsVeiculos"){
  const stamp=text(d.data,19,true),day=date(stamp.slice(0,10),true);
  if(!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(stamp))fail("Horário inválido.");
  const itens=list(d.itens,100).map(i=>({nome:text(i.nome,120,true),condicao:text(i.condicao,40,true),observacao:text(i.observacao,65535)}));
  const fotos=list(d.fotos||[],45).map((f,i)=>({campo:text(f.campo||"Foto "+(i+1),120,true),imagem:files.image(f.imagem)}));
  if(new Set(fotos.map(f=>f.campo)).size!==fotos.length)fail("Campos de foto repetidos.");
  return {...common,veiculoId:ref(d.veiculoId),clienteId:id(d.clienteId),tipo:text(d.tipo,30,true),data:day+" "+stamp.slice(11),km:odometro(d.km),combustivel:text(d.combustivel,20),responsavel:text(d.responsavel,150,true),observacoes:text(d.observacoes,65535),itens,fotos};
 }
 if(key==="faturas"){
  const natureza=d.natureza??"Receita";
  if(!["Receita","Despesa"].includes(natureza))fail("Selecione Receita ou Despesa.");
  const itensVeiculos=list(d.itensVeiculos||[],100).map(i=>({veiculoId:ref(i.veiculoId),valor:amount(i.valor)}));
  if(new Set(itensVeiculos.map(i=>i.veiculoId)).size!==itensVeiculos.length)fail("Veículo repetido na fatura.");
  const valorBase=amount(d.valorBase),valor=money.somar([valorBase,...itensVeiculos.map(i=>i.valor)]);
  if(valor<=0)fail("A fatura deve ter valor positivo.");
  const contratosIds=[...new Set(list(d.contratosIds||[d.contratoId].filter(Boolean),100).map(ref))];
  const tipo=text(d.tipo,40,true);
  if(tipo==="Locação"&&!contratosIds.length&&d.semContrato!==true)fail("Vincule o contrato de locação.");
  if(tipo==="Multa"&&!d.multaId)fail("Vincule o auto de infração.");
  const competencia=text(d.competencia,7)||null;if(competencia&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia))fail("Competência inválida.");
  if(d.semContrato===true&&contratosIds.length)fail("Desmarque a opção sem contrato para vincular contratos.");
  return {...common,semContrato:!contratosIds.length,numero:text(d.numero,60),tipo,natureza,clienteId:ref(d.clienteId),contratoId:contratosIds[0]||null,multaId:id(d.multaId),descricao:text(d.descricao,65535,true),competencia,vencimento:date(d.vencimento,true),valorBase,valor,dataPagamento:date(d.dataPagamento),automatica:Boolean(d.automatica),reutilizacaoAitCondutor:Boolean(d.reutilizacaoAitCondutor),justificativaAit:text(d.justificativaAit,65535),contratosIds,itensVeiculos};
 }
 fail("Conjunto desconhecido.");
}
module.exports={normalize,text,date,id,amount,fail};
