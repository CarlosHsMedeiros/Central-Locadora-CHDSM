const HttpError = require("../utils/httpError");
const limits = { nome:200, razaoSocial:200, nomeFantasia:200, inscricaoEstadual:30, responsavel:150, documento:20, rg:30, telefone:30, whatsapp:30, email:254, cep:10, estado:2, cidade:120, bairro:120, endereco:200, numero:20, complemento:120, cnh:30, categoria:10, situacao:30, observacoes:65535 };
const digits = (value) => String(value || "").replace(/\D/g, "");
const allEqual = (value) => /^(\d)\1+$/.test(value);

function validCpf(value) {
  if (value.length !== 11 || allEqual(value)) return false;
  for (let position=9; position<=10; position+=1) {
    let sum=0;
    for (let index=0; index<position; index+=1) sum += Number(value[index])*(position+1-index);
    let check=(sum*10)%11;
    if (check===10) check=0;
    if (check!==Number(value[position])) return false;
  }
  return true;
}

function validCnpj(value) {
  if (value.length !== 14 || allEqual(value)) return false;
  const calculate=(base,weights)=>{const sum=base.split("").reduce((total,digit,index)=>total+Number(digit)*weights[index],0);const rest=sum%11;return rest<2?0:11-rest;};
  const first=calculate(value.slice(0,12),[5,4,3,2,9,8,7,6,5,4,3,2]);
  const second=calculate(value.slice(0,12)+first,[6,5,4,3,2,9,8,7,6,5,4,3,2]);
  return value.endsWith(`${first}${second}`);
}

function nullableDate(value, field) {
  if (value===undefined || value===null || value==="") return null;
  const normalized=String(value).trim();
  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10)!==normalized) throw new HttpError(400,"VALIDATION_ERROR",`${field} deve estar no formato AAAA-MM-DD.`);
  return normalized;
}

function normalize(body) {
  if (!body || typeof body!=="object" || Array.isArray(body)) throw new HttpError(400,"VALIDATION_ERROR","Corpo JSON inválido.");
  const data={};
  for (const [field,max] of Object.entries(limits)) { const raw=body[field]; data[field]=raw===undefined||raw===null?"":String(raw).trim(); if(data[field].length>max) throw new HttpError(400,"VALIDATION_ERROR",`${field} excede ${max} caracteres.`); }
  data.nome=data.nome.replace(/\s+/g," "); data.documento=digits(data.documento); data.cep=digits(data.cep);
  data.tipoPessoa=String(body.tipoPessoa||body.tipo_pessoa||(data.documento.length===14?"PJ":"PF")).toUpperCase();
  data.razaoSocial=data.razaoSocial.replace(/\s+/g," "); data.nomeFantasia=data.nomeFantasia.replace(/\s+/g," ");
  if(!/^(PF|PJ)$/.test(data.tipoPessoa)) throw new HttpError(400,"VALIDATION_ERROR","tipoPessoa deve ser PF ou PJ.");
  if(data.tipoPessoa==="PJ"){data.razaoSocial=data.razaoSocial||data.nome;if(!data.razaoSocial)throw new HttpError(400,"VALIDATION_ERROR","razaoSocial é obrigatória para CNPJ.");data.nome=data.razaoSocial;}
  data.cnh=data.cnh.replace(/\s/g,"").toUpperCase(); data.estado=data.estado.toUpperCase(); data.categoria=data.categoria.toUpperCase();
  data.situacao=data.situacao||"Ativo"; data.email=data.email.toLowerCase(); data.nascimento=nullableDate(body.nascimento,"nascimento");
  data.validadeCnh=nullableDate(body.validadeCnh??body.validade_cnh,"validadeCnh");
  if(!data.nome) throw new HttpError(400,"VALIDATION_ERROR","nome é obrigatório.");
  if(!data.documento) throw new HttpError(400,"VALIDATION_ERROR","documento é obrigatório.");
  if(!validCpf(data.documento)&&!validCnpj(data.documento)) throw new HttpError(400,"INVALID_DOCUMENT","CPF/CNPJ inválido.");
  if((data.tipoPessoa==="PF"&&data.documento.length!==11)||(data.tipoPessoa==="PJ"&&data.documento.length!==14)) throw new HttpError(400,"INVALID_DOCUMENT","O documento não corresponde ao tipo de pessoa selecionado.");
  if(data.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new HttpError(400,"VALIDATION_ERROR","E-mail inválido.");
  if(data.estado&&!/^[A-Z]{2}$/.test(data.estado)) throw new HttpError(400,"VALIDATION_ERROR","estado deve conter uma UF válida.");
  if(!/^(Ativo|Inativo)$/.test(data.situacao)) throw new HttpError(400,"VALIDATION_ERROR","situacao deve ser Ativo ou Inativo.");
  return data;
}

function id(value) { if(!/^\d+$/.test(String(value))||(String(value).length>20||BigInt(value)<1n||BigInt(value)>18446744073709551615n)) throw new HttpError(400,"INVALID_ID","ID de cliente inválido."); return String(value); }
function query(input) { const busca=String(input.busca||"").trim().slice(0,200); const page=input.page===undefined?1:Number(input.page); const limit=input.limit===undefined?20:Number(input.limit); if(!Number.isSafeInteger(page)||page<1||page>1000000) throw new HttpError(400,"VALIDATION_ERROR","page deve ser um inteiro positivo."); if(!Number.isInteger(limit)||limit<1||limit>100) throw new HttpError(400,"VALIDATION_ERROR","limit deve estar entre 1 e 100."); return {busca,page,limit,offset:(page-1)*limit}; }
module.exports={normalize,id,query,validCpf,validCnpj};
