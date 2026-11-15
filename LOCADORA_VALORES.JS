(function(root,factory){const value=factory();if(typeof module==="object"&&module.exports)module.exports=value;else{root.Valores=value;root.valorMascaraParaNumero=value.numero;root.digitosMascara=v=>String(v??"").replace(/\D/g,"");}})(globalThis,function(){
"use strict";
function centavos(value){
 if(value===null||value===undefined||value==="")return 0;
 if(typeof value==="number"){if(!Number.isFinite(value))throw Error("Valor monetário inválido.");const result=Math.round((value+Math.sign(value)*Number.EPSILON)*100);if(!Number.isSafeInteger(result)||Math.abs(result)>999999999999999)throw Error("Valor monetário acima do limite.");return result;}
 let text=String(value).trim().replace(/^R\$\s*/,"").replace(/\s/g,"");
 if(text.includes(",")){if(!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(text))throw Error("Informe um valor monetário válido.");text=text.replace(/\./g,"").replace(",",".");}
 else if(/^-?\d{1,3}(?:\.\d{3})+$/.test(text))text=text.replace(/\./g,"");
 if(!/^-?\d+(?:\.\d{1,2})?$/.test(text))throw Error("Informe um valor monetário válido.");
 const negative=text.startsWith("-"),parts=text.replace(/^-/,"").split(".");
 const result=Number(parts[0])*100+Number((parts[1]||"").padEnd(2,"0"));
 if(!Number.isSafeInteger(result)||result>999999999999999)throw Error("Valor monetário acima do limite.");
 return negative?-result:result;
}
function numero(value){return centavos(value)/100;}
function moeda(value){return numero(value).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
function somar(values){const cents=values.reduce((sum,v)=>sum+centavos(v),0);if(!Number.isSafeInteger(cents))throw Error("Total acima do limite.");return cents/100;}
function ratear(value,count){if(!Number.isInteger(count)||count<1)throw Error("Quantidade inválida.");const total=centavos(value),base=Math.trunc(total/count),rest=total-base*count;return Array.from({length:count},(_,i)=>(base+(i<Math.abs(rest)?Math.sign(rest):0))/100);}
function hoje(){const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);}
function multaDaLocadora(multa){const normal=v=>String(v||"").trim().toLowerCase();return normal(multa.responsavel)==="locadora"&&!normal(multa.situacao||multa.status).includes("cancel");}
return Object.freeze({centavos,numero,moeda,somar,ratear,hoje,multaDaLocadora});
});
