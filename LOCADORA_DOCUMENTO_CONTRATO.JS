(function(){
"use strict";
let dados=null,contratoId=null,ocupado=false;
const extras=["horaInicio","horaFim","formaPagamento","primeiroPagamento","fiadores","avalistas","testemunhas"];
const $=id=>document.getElementById(id);
const estilo=document.createElement("link");estilo.rel="stylesheet";estilo.href="LOCADORA_DOCUMENTO_CONTRATO.CSS";document.head.appendChild(estilo);
const dialog=document.createElement("dialog");dialog.id="revisaoContrato";
dialog.innerHTML=SegurancaInterface.html(`<div class="doc-cabecalho"><div><h2>Revisar contrato e checklist</h2><p id="docIdentificacao"></p></div><button type="button" id="docFechar">Fechar</button></div>
<div class="doc-corpo"><p id="docEstado" role="status"></p>
<section><h3>Checklists vinculados</h3><p>Selecione as vistorias que farão parte deste contrato. São exibidos apenas os checklists dos veículos contratados que estão disponíveis para vínculo.</p><div id="docChecklists"></div></section>
<details><summary>Horários, pagamento e assinaturas adicionais</summary><div class="doc-campos">
<label>Horário de início<input id="docHoraInicio" type="time"></label><label>Horário de término<input id="docHoraFim" type="time"></label>
<label>Forma de pagamento<input id="docFormaPagamento" maxlength="4000"></label><label>Primeiro pagamento<input id="docPrimeiroPagamento" maxlength="4000" placeholder="Data e condições combinadas"></label>
<label>Fiadores<textarea id="docFiadores" rows="3" placeholder="Nome, documento e espaço para assinatura"></textarea></label><label>Avalistas<textarea id="docAvalistas" rows="3"></textarea></label><label>Testemunhas<textarea id="docTestemunhas" rows="3"></textarea></label></div></details>
<div class="doc-acoes-modelo"><label>Texto padrão<select id="docModelo"><option value="enviado">Modelo enviado</option><option value="empresa">Modelo salvo nas configurações</option></select></label><button type="button" id="docPreencher">Preencher novamente com os dados</button></div>
<p>Revise o texto abaixo. Campos sem cadastro aparecem como “Não informado”. Os complementos acima entram no texto ao clicar em “Preencher novamente”. Suas edições serão salvas somente neste contrato.</p>
<label for="docTexto"><strong>Texto do contrato</strong></label><textarea id="docTexto" rows="24" maxlength="60000"></textarea>
<div id="docPrevia" hidden></div></div>
<div class="doc-rodape"><button type="button" id="docVisualizar">Visualizar</button><button type="button" id="docSalvar">Salvar revisão</button><button type="button" id="docImprimir">Salvar e gerar PDF</button></div>`);
document.body.appendChild(dialog);
function lerExtras(){return Object.fromEntries(extras.map(key=>[key,$("doc"+key[0].toUpperCase()+key.slice(1)).value]));}
function escolhidos(){return [...$("docChecklists").querySelectorAll("input:checked")].map(i=>i.value);}
function preencher(perguntar=true){
 if(perguntar&&$("docTexto").value&&!confirm("Substituir o texto editado pelos dados atuais do cadastro?"))return;
 const modelo=$("docModelo").value==="empresa"?(dados.empresa.textoContrato||ModeloContrato.padrao):ModeloContrato.padrao;
 $("docTexto").value=ModeloContrato.preencher(dados,lerExtras(),modelo);$("docPrevia").hidden=true;
}
function aviso(text){$("docEstado").textContent=text;}
function montarDocumento(container){
 container.replaceChildren();
 criarCabecalhoImpressao();
 const cabecalho=document.getElementById("cabecalhoImpressaoGlobal").cloneNode(true);
 const rodape=document.getElementById("rodapeImpressaoGlobal").cloneNode(true);
 cabecalho.removeAttribute("id");rodape.removeAttribute("id");
 const titulo="Contrato "+dados.contrato.numeroContrato;
 cabecalho.querySelector("p").textContent="Contrato de locacao de veiculos";
 cabecalho.querySelector(".cabecalho-impressao-meta strong").textContent=titulo;
 container.appendChild(cabecalho);

 const texto=document.createElement("div");texto.className="doc-texto-impresso";texto.textContent=$("docTexto").value;container.appendChild(texto);
 const checks=dados.checklists.filter(c=>escolhidos().includes(String(c.id)));
 if(checks.length){
  const annex=document.createElement("section");annex.className="doc-anexo";
  const title=document.createElement("h2");title.textContent="ANEXO II — CHECKLISTS VINCULADOS";annex.appendChild(title);
  for(const c of checks){
   const head=document.createElement("h3");head.textContent="Checklist "+c.id+" • "+c.placa+" • "+c.tipo;annex.appendChild(head);
   const body=document.createElement("div");body.className="doc-texto-impresso";body.textContent=[
    "Data: "+String(c.data||"").replace("T"," ")+" | Quilometragem: "+(c.km??"Não informada")+" km | Combustível: "+(c.combustivel||"Não informado"),
    "Responsável: "+(c.responsavel||"Não informado"),
    ...(c.itens||[]).map(i=>i.nome+": "+i.condicao+(i.observacao?" — "+i.observacao:"")),
    "Observações: "+(c.observacoes||"Sem observações.")
   ].join("\n");annex.appendChild(body);
   const fotos=document.createElement("div");fotos.className="doc-fotos";
   for(const foto of c.fotos||[]){const src=SegurancaInterface.image(foto.imagem);if(!src)continue;const figura=document.createElement("figure"),img=document.createElement("img"),legenda=document.createElement("figcaption");img.src=src;img.alt=foto.campo||"Foto da vistoria";legenda.textContent=foto.campo||"Foto da vistoria";figura.append(img,legenda);fotos.appendChild(figura);}annex.appendChild(fotos);
  }container.appendChild(annex);
 }
 container.appendChild(rodape);
}
async function salvar(){
 if(ocupado||!dados)return false;
 if(!$("docTexto").value.trim()){aviso("Preencha o texto do contrato.");return false;}
 ocupado=true;for(const id of ["docSalvar","docImprimir","docPreencher"])$(id).disabled=true;
 try{
  const r=await api.put("/contratos/"+contratoId+"/documento",{texto:$("docTexto").value,checklistIds:escolhidos(),version:dados.version,...lerExtras()});
  dados=r.data;aviso("Revisão e vínculos salvos no banco.");return true;
 }catch(error){aviso(error.message);return false;}
 finally{ocupado=false;for(const id of ["docSalvar","docImprimir","docPreencher"])$(id).disabled=false;}
}
window.gerarPdfContrato=async function(){
 const contrato=typeof contratos!=="undefined"?contratos[indiceFicha]:null;if(!contrato)return;
 dados=null;contratoId=String(contrato.id);for(const id of ["docSalvar","docImprimir","docPreencher","docVisualizar"])$(id).disabled=true;aviso("Carregando revisão…");if(!dialog.open)dialog.showModal();
 try{
  dados=(await api.get("/contratos/"+contratoId+"/documento")).data;
  $("docIdentificacao").textContent=(dados.contrato.numeroContrato||"")+" • "+(dados.cliente.nome||"");
  const target=$("docChecklists");target.replaceChildren();
  if(!dados.checklists.length)target.textContent="Nenhum checklist disponível. Cadastre a vistoria na aba Check-lists e reabra esta revisão.";
  for(const c of dados.checklists){const label=document.createElement("label"),input=document.createElement("input");input.type="checkbox";input.value=String(c.id);input.checked=dados.checklistIds.includes(String(c.id));label.className="doc-checkitem";label.append(input,document.createTextNode(" "+c.placa+" — "+c.tipo+" — "+String(c.data).replace("T"," ")+" (checklist "+c.id+")"));target.appendChild(label);}
  for(const key of extras)$("doc"+key[0].toUpperCase()+key.slice(1)).value=dados.documento?.complementos?.[key]||"";
  $("docTexto").value=dados.documento?.texto||"";if(!$("docTexto").value)preencher(false);
  $("docPrevia").hidden=true;for(const id of ["docSalvar","docImprimir","docPreencher","docVisualizar"])$(id).disabled=false;aviso(dados.documento?"Revisão salva carregada. Você pode editar antes de gerar o PDF.":"Texto preenchido. Confira os dados e selecione os checklists.");
 }catch(error){aviso(error.message);}
};
$("docFechar").onclick=()=>dialog.close();
$("docPreencher").onclick=()=>preencher();
$("docSalvar").onclick=salvar;
$("docVisualizar").onclick=()=>{montarDocumento($("docPrevia"));$("docPrevia").hidden=false;$("docPrevia").scrollIntoView({behavior:"smooth",block:"start"});};
$("docImprimir").onclick=async()=>{
 // Abre a janela pelo clique do usuário; somente preenche após confirmar a gravação.
 const janela=window.open("","_blank");if(!janela){aviso("Permita a abertura da janela de impressão.");return;}
 janela.document.body.textContent="Salvando a revisão…";
 if(!await salvar()){janela.close();return;}
 const doc=janela.document;doc.title="Contrato "+dados.contrato.numeroContrato;doc.body.replaceChildren();
 const css=doc.createElement("link");css.rel="stylesheet";css.href=new URL("LOCADORA_DOCUMENTO_CONTRATO.CSS",location.href).href;doc.head.appendChild(css);
 const conteudo=doc.createElement("main");conteudo.className="doc-impressao";doc.body.appendChild(conteudo);montarDocumento(conteudo);
 const botao=doc.createElement("button");botao.type="button";botao.className="doc-nao-imprimir";botao.textContent="Imprimir / salvar como PDF";botao.onclick=()=>janela.print();doc.body.prepend(botao);
 css.onload=async()=>{await Promise.all(Array.from(conteudo.querySelectorAll("img"),img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;})));janela.print();};
};
for(const button of document.querySelectorAll('[data-sec-click="h34"]'))button.textContent="Revisar texto e gerar contrato";
})();
