(function(){
"use strict";
const etapas=["clientes","veiculos","contratos","multas","manutencoes","faturas","checklistsVeiculos","configuracoesEmpresa","camposFotoChecklist","historicoRelatoriosEmitidos"];
const rotulos={clientes:"Clientes",veiculos:"Veículos",contratos:"Contratos",multas:"Multas",manutencoes:"Manutenções",faturas:"Faturas",checklistsVeiculos:"Checklists",configuracoesEmpresa:"Empresa",camposFotoChecklist:"Campos de fotos",historicoRelatoriosEmitidos:"Histórico"};
const status=()=>document.getElementById("statusMigracao"),resumo=()=>document.getElementById("resumoMigracao");
function ler(chave){const text=localStorage.getItem(chave);return text===null?null:JSON.parse(text);}
function baixar(nome,conteudo){const url=URL.createObjectURL(new Blob([JSON.stringify(conteudo,null,2)],{type:"application/json"})),link=document.createElement("a");link.href=url;link.download=nome;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function registros(etapa){
 const valor=ler(etapa);if(valor===null)return [];
 const lista=etapa==="configuracoesEmpresa"?[valor]:etapa==="camposFotoChecklist"?[{campos:valor}]:valor;
 if(!Array.isArray(lista))throw Error("Formato inválido em "+rotulos[etapa]+". Os dados originais foram preservados.");
 return lista.map((dados,indice)=>({indice,idLegado:dados?.id??null,dados}));
}
async function iniciar(){
 const botao=document.getElementById("btnMigrarDados");if(botao.disabled)return;botao.disabled=true;
 try{
  const sessao=await api.get("/auth/me");if(sessao.data.user.perfil!=="administrador")throw Error("Somente administradores podem importar dados.");
  let origem=localStorage.getItem("origemImportacaoBanco");if(!origem){origem="local:"+crypto.randomUUID().replace(/-/g,"");localStorage.setItem("origemImportacaoBanco",origem); }
  const dados=Object.fromEntries(etapas.map(k=>[k,ler(k)]));
  const marca=new Date().toISOString().replace(/[:.]/g,"-");
  baixar("locadora-backup-"+marca+".json",{formato:"locadora-localStorage-backup",versao:2,origem:location.origin,criadoEm:new Date().toISOString(),dados});
  if(!confirm("O backup foi baixado. Importar os dados antigos deste navegador para o banco? Os originais serão preservados.")){status().textContent="Importação cancelada.";return;}
  const relatorio={etapas:[],erros:[]};let total=0;
  for(const etapa of etapas){
   const lista=registros(etapa);
   for(let i=0;i<lista.length;){
    const lote=[];let bytes=0;
    while(i<lista.length&&lote.length<100){const size=new Blob([JSON.stringify(lista[i])]).size;if(size>20*1024*1024)throw Error("Registro muito grande em "+rotulos[etapa]);if(lote.length&&bytes+size>20*1024*1024)break;lote.push(lista[i++]);bytes+=size;}
    status().textContent="Importando "+rotulos[etapa]+" ("+i+"/"+lista.length+")…";
    const r=await api.post("/operacao/importar/"+etapa,{registros:lote,origem});
    relatorio.etapas.push(r.data);relatorio.erros.push(...r.data.erros);total+=r.data.importados;
    resumo().hidden=false;resumo().textContent="Importados: "+total+"\nErros: "+relatorio.erros.length;
   }
  }
  baixar("locadora-importacao-"+marca+".json",relatorio);if(!relatorio.erros.length)localStorage.setItem("migracaoBancoConcluida","1");
  status().textContent=relatorio.erros.length?"Importação com pendências. Consulte o relatório baixado. Os originais foram preservados.":"Importação concluída. Atualize a página para consultar os dados do banco. Os originais foram preservados.";
 }catch(error){status().textContent=error.message;alert(error.message);}
 finally{botao.disabled=false;}
}
function categoria(){
 const grade=document.querySelector(".grade-categorias"),secao=document.getElementById("secaoMigracao");if(!grade||!secao)return;
 secao.hidden=true;const botao=document.createElement("button");botao.type="button";botao.textContent="Migração de dados antigos";
 botao.onclick=()=>{document.querySelectorAll("main > section").forEach(s=>s.hidden=s!==secao);const salvar=document.querySelector("main > .salvar");if(salvar)salvar.hidden=true;secao.scrollIntoView({behavior:"smooth"});};grade.appendChild(botao);
}
window.iniciarMigracaoLocal=iniciar;categoria();
})();
