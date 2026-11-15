(function(){
"use strict";
const digitos=v=>String(v||"").replace(/\D/g,"");
window.valorMascaraParaNumero=Valores.numero;
window.digitosMascara=digitos;
const cpfCnpj=(v,tipo)=>{const d=digitos(v).slice(0,tipo==="PF"?11:14);return(tipo==="PJ"||d.length>11)?d.replace(/^(\d{2})(\d)/,"$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/,"$1.$2.$3").replace(/\.(\d{3})(\d)/,".$1/$2").replace(/(\d{4})(\d)/,"$1-$2"):d.replace(/^(\d{3})(\d)/,"$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/,"$1.$2.$3").replace(/(\d{3})(\d{1,2})$/,"$1-$2")};
const cep=v=>digitos(v).slice(0,8).replace(/^(\d{5})(\d)/,"$1-$2");
const telefone=v=>{const d=digitos(v).slice(0,11);return d.length<=10?d.replace(/^(\d{2})(\d)/,"($1) $2").replace(/(\d{4})(\d)/,"$1-$2"):d.replace(/^(\d{2})(\d)/,"($1) $2").replace(/(\d{5})(\d)/,"$1-$2")};
const moeda=v=>{const d=digitos(v).replace(/^0+(?=\d)/,"").slice(0,17);return d?(Number(d)/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}):""};
const milhar=v=>{const d=digitos(v).slice(0,12);return d?Number(d).toLocaleString("pt-BR"):""};
const placa=v=>{const s=String(v||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,7);return s.length>3?`${s.slice(0,3)}-${s.slice(3)}`:s};
const ie=v=>/^I/i.test(String(v||""))?String(v).toUpperCase().replace(/[^A-Z]/g,"").slice(0,6):digitos(v).slice(0,12).replace(/^(\d{3})(\d)/,"$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/,"$1.$2.$3").replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/,"$1.$2.$3.$4");
const rg=v=>digitos(v).slice(0,9).replace(/^(\d{2})(\d)/,"$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/,"$1.$2.$3").replace(/(\d{3})(\d)$/,"$1-$2");
function formatador(input){if(input.id==="documento")return v=>cpfCnpj(v,document.getElementById("tipoPessoa")?.value|| (digitos(v).length>11?"PJ":"PF"));if(input.id==="empresaCnpj")return v=>cpfCnpj(v,"PJ");if(input.id==="cep")return cep;if(input.id==="rg")return rg;if(["telefone","whatsapp"].includes(input.id))return telefone;if(input.id==="inscricaoEstadual")return ie;if(input.id==="placa")return placa;if(input.matches(".campo-moeda,.valor-veiculo-item,.custo-ano-valor")||/^(valor|valorLocacao|valorPecas|valorMaoObra|valorCompra|valorBaseFatura|valorFatura|valorDesconto)$/i.test(input.id))return moeda;if(/quilometragem|limiteQuilometragem|proximaKm|kmChecklist/i.test(input.id))return milhar;return null}
function instalar(input){
 if(input.dataset.mascaraInstalada||input.readOnly||input.type==="number")return;
 const fn=formatador(input);if(!fn)return;
 input.dataset.mascaraInstalada="1";
 const limits={placa:8,documento:18,empresaCnpj:18,cep:9,telefone:15,whatsapp:15,rg:12,inscricaoEstadual:18};
 if(limits[input.id])input.maxLength=limits[input.id];
 if(fn===moeda)input.maxLength=24;
 input.inputMode=input.id==="placa"?"text":"numeric";
 const aplicar=()=>{
  const before=input.value,caret=input.selectionStart??before.length,atEnd=caret===before.length;
  const significant=input.id==="placa"?/[A-Z0-9]/gi:/\d/g;
  const count=(before.slice(0,caret).match(significant)||[]).length;
  const next=fn(before);
  if(next!==before){input.value=next;let position=next.length;if(!atEnd){position=0;let seen=0;while(position<next.length&&seen<count){if(/[0-9]/.test(next[position])||(input.id==="placa"&&/[A-Z]/.test(next[position])))seen++;position++;}}try{input.setSelectionRange(position,position);}catch{}}
 };
 input.addEventListener("input",aplicar,true);
 input.addEventListener("blur",()=>{
  if(fn===moeda&&input.value){try{input.value=Valores.moeda(input.value);input.setCustomValidity("");}catch{input.setCustomValidity("Informe um valor válido.");}}
  else aplicar();
 });
 if(fn===moeda){
  input.addEventListener("focus",()=>{if(input.value){try{input.value=Valores.moeda(input.value);}catch{}}});
  input.addEventListener("paste",event=>{
   const text=event.clipboardData?.getData("text");if(!text)return;
   try{const value=Valores.numero(text);if(value<0)return;event.preventDefault();input.value=Valores.moeda(value);input.setCustomValidity("");input.dispatchEvent(new Event("input",{bubbles:true}));}catch{}
  });
 }
}
function preparar(){document.querySelectorAll("input").forEach(instalar)}
document.addEventListener("change",e=>{if(e.target.id==="tipoPessoa"){const campo=document.getElementById("documento");if(campo)campo.value=cpfCnpj(campo.value,e.target.value)}});
preparar();new MutationObserver(preparar).observe(document.body,{childList:true,subtree:true});
})();
