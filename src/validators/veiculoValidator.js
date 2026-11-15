const HttpError=require("../utils/httpError");
const money=require("../../LOCADORA_VALORES.JS");
const clean=(v,max)=>{if(v!=null&&!["string","number"].includes(typeof v))throw new HttpError(400,"VALIDATION_ERROR","Tipo de campo inválido.");const text=String(v??"").trim();if(text.length>max)throw new HttpError(400,"VALIDATION_ERROR","Campo acima do tamanho permitido.");return text;};
function date(value){if(value==null||value==="")return null;const text=String(value),d=new Date(text+"T00:00:00Z");if(!/^\d{4}-\d{2}-\d{2}$/.test(text)||Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==text)throw new HttpError(400,"VALIDATION_ERROR","Data da compra inválida.");return text;}
function amount(value){if(value==null||value==="")return null;try{const result=money.numero(value);if(result<0)throw Error();return result;}catch{throw new HttpError(400,"VALIDATION_ERROR","Informe um valor não negativo, com até duas casas decimais.");}}
function normalize(body){
 if(!body||typeof body!=="object"||Array.isArray(body))throw new HttpError(400,"VALIDATION_ERROR","Corpo JSON inválido.");
 const data={placa:clean(body.placa,10).toUpperCase().replace(/[-\s]/g,""),renavam:clean(body.renavam,20).replace(/\D/g,""),chassi:clean(body.chassi,30).toUpperCase().replace(/\s/g,""),marca:clean(body.marca,80),modelo:clean(body.modelo,120),ano:body.ano===""||body.ano==null?null:Number(body.ano),cor:clean(body.cor,40),quilometragem:body.quilometragem===""||body.quilometragem==null?null:Number(String(body.quilometragem).replace(/\./g,"")),situacao:clean(body.situacao,40)||"Disponível",localizacao:clean(body.localizacao,150),foto:require("./arquivoValidator").image(body.foto),dataCompra:date(body.dataCompra),valorCompra:amount(body.valorCompra)};
 if(!/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(data.placa)||!data.marca||!data.modelo)throw new HttpError(400,"VALIDATION_ERROR","Informe placa completa, marca e modelo.");
 if(data.ano!==null&&(!Number.isInteger(data.ano)||data.ano<1900||data.ano>2200))throw new HttpError(400,"VALIDATION_ERROR","Ano inválido.");
 if(data.quilometragem!==null&&(!Number.isSafeInteger(data.quilometragem)||data.quilometragem<0||data.quilometragem>4294967295))throw new HttpError(400,"VALIDATION_ERROR","Quilometragem inválida.");
 data.anoLicenciamento=body.anoLicenciamento==null||body.anoLicenciamento===""?null:Number(body.anoLicenciamento);
 data.ufRegistro=clean(body.ufRegistro,2).toUpperCase()||null;
 data.grupoLicenciamento=clean(body.grupoLicenciamento,16)||null;
 if(data.anoLicenciamento!==null&&(!/^\d{4}$/.test(String(body.anoLicenciamento))||data.anoLicenciamento<1900||data.anoLicenciamento>2200))throw new HttpError(400,"VALIDATION_ERROR","Ano do último CRLV inválido.");
 if(data.ufRegistro&&!["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].includes(data.ufRegistro))throw new HttpError(400,"VALIDATION_ERROR","UF inválida.");
 if(data.grupoLicenciamento&&!["geral","caminhao"].includes(data.grupoLicenciamento))throw new HttpError(400,"VALIDATION_ERROR","Grupo de licenciamento inválido.");
 data.custosPorAno={};
 if(body.custosPorAno!=null){
  if(typeof body.custosPorAno!=="object"||Array.isArray(body.custosPorAno)||Object.keys(body.custosPorAno).length>301)throw new HttpError(400,"VALIDATION_ERROR","Custos anuais inválidos.");
  for(const [year,value]of Object.entries(body.custosPorAno)){
   if(!/^\d{4}$/.test(year)||Number(year)<1900||Number(year)>2200)throw new HttpError(400,"VALIDATION_ERROR","Ano de custo inválido.");
   data.custosPorAno[year]=amount(value)??0;
  }
 }
 if(body.licenciamentoPdf!=null){
  const file=require("./arquivoValidator").attachment(body.licenciamentoPdf);
  if(file.tipo!=="application/pdf"||!file.nome.toLowerCase().endsWith(".pdf"))throw new HttpError(400,"INVALID_FILE","O licenciamento deve ser um arquivo PDF.");
  if(!data.anoLicenciamento)throw new HttpError(400,"VALIDATION_ERROR","Informe o ano do CRLV para anexar o PDF.");
  data.licenciamentoPdf=file;
 }
 return data;
}
function id(v){if(!/^\d{1,20}$/.test(String(v))||BigInt(v)<1n||BigInt(v)>18446744073709551615n)throw new HttpError(400,"INVALID_ID","ID de veículo inválido.");return String(v);}
function query(q){const busca=clean(q.busca,200),page=q.page===undefined?1:Number(q.page),limit=q.limit===undefined?20:Number(q.limit);if(!Number.isSafeInteger(page)||page<1||page>1000000||!Number.isInteger(limit)||limit<1||limit>100)throw new HttpError(400,"VALIDATION_ERROR","Paginação inválida.");return{busca,page,limit,offset:(page-1)*limit};}
module.exports={normalize,id,query};
