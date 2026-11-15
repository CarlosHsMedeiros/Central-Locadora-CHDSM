veiculos=[];
let pdfLicenciamentoPendente=null;
const arquivosDocumentaisVeiculo=Object.create(null);
let veiculoEditandoId=null,veiculoFichaId=null,pesquisaVeiculoTimer=null,driveFotoId=null;
const idsVeiculo=["placa","renavam","chassi","marca","modelo","ano","cor","quilometragem","situacao","localizacao","anoLicenciamento","ufRegistro","grupoLicenciamento"];
function escaparVeiculo(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
const camposLicenciamento=document.createElement('div');camposLicenciamento.className='campo';
camposLicenciamento.innerHTML=SegurancaInterface.html('<label for="anoLicenciamento">Ano do último CRLV emitido</label><input id="anoLicenciamento" type="number" min="1900" max="2200" placeholder="Ex.: 2026"><label for="ufRegistro">UF de registro</label><select id="ufRegistro"><option value="">Não informada</option>'+['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf=>'<option>'+uf+'</option>').join('')+'</select><label for="grupoLicenciamento">Calendário de licenciamento</label><select id="grupoLicenciamento"><option value="">Não informado</option><option value="geral">Veículos em geral, reboques e semirreboques</option><option value="caminhao">Caminhão / caminhão-trator</option></select><small>Informe o exercício do CRLV emitido, não apenas o ano do pagamento.</small>');
document.getElementById('localizacao').parentElement.after(camposLicenciamento);
function abrirFormulario(){document.getElementById("formulario").classList.add("mostrar");}
function limparFormulario(){pdfLicenciamentoPendente=null;document.getElementById("pdfLicenciamento").value="";document.getElementById("pdfLicenciamentoEstado").textContent="";for(const {key} of camposDocumentoVeiculo){arquivosDocumentaisVeiculo[key]=null;document.getElementById("arquivo_"+key).value="";document.getElementById("estado_"+key).textContent="";}idsVeiculo.forEach(id=>document.getElementById(id).value=id==="situacao"?"Disponível":"");}
function fecharFormulario(){document.getElementById("formulario").classList.remove("mostrar");limparFormulario();veiculoEditandoId=null;}
function dadosVeiculo(){
 const d={};idsVeiculo.forEach(id=>d[id]=document.getElementById(id).value.trim());
 const atual=veiculos.find(v=>String(v.id)===String(veiculoEditandoId));
 d.foto=atual?.foto||"";d.dataCompra=document.getElementById("dataCompra")?.value||null;
 d.valorCompra=Valores.numero(document.getElementById("valorCompra")?.value||0);
 if(document.getElementById("pdfLicenciamento").files.length&&!pdfLicenciamentoPendente)throw Error("Aguarde a leitura do PDF antes de salvar.");
 
 return d;
}
async function carregarVeiculos(busca=""){const tabela=document.getElementById("tabelaVeiculos"),vazio=document.getElementById("mensagemVazia");tabela.innerHTML=SegurancaInterface.html("");vazio.textContent="Carregando veículos...";vazio.style.display="block";try{veiculos=await api.todos(`/veiculos?busca=${encodeURIComponent(busca)}`);mostrarVeiculos(veiculos,veiculos.length);}catch(e){vazio.textContent=e.message;document.getElementById("contador").textContent="Erro ao carregar";}}
async function salvarVeiculo(){
    let d;try{d=dadosVeiculo();}catch(error){alert(error.message);return;}
    if(!d.placa||!d.marca||!d.modelo){alert("Preencha os campos obrigatórios.");return;}
    const novoCadastro=!veiculoEditandoId;
    try{
        const result=novoCadastro?await api.post("/veiculos",d):await api.put(`/veiculos/${veiculoEditandoId}`,d);
        const salvo=result?.data;
        if(novoCadastro&&salvo?.id)veiculoEditandoId=String(salvo.id);
        if(pdfLicenciamentoPendente){
            if(!salvo?.id)throw Error("Veículo salvo, mas não foi possível identificar o cadastro para anexar o PDF.");
            const ano=String(d.anoLicenciamento||"");
            await api.driveUpload("veiculo",salvo.id,`crlv_${ano}`,pdfLicenciamentoPendente);
        }
        for(const {key,label} of camposDocumentoVeiculo){
            const file=arquivosDocumentaisVeiculo[key];if(!file)continue;
            if(!salvo?.id)throw Error("Veículo salvo, mas não foi possível identificar o cadastro para anexar os documentos.");
            const existing=await api.driveFiles("veiculo",salvo.id);
            const uploaded=await api.driveUpload("veiculo",salvo.id,key,file,label);
            for(const previous of existing.data.filter(item=>item.category===key&&item.id!==uploaded.data.id))await api.driveDelete(previous.id);
        }
        fecharFormulario();
        await carregarVeiculos(document.getElementById("campoPesquisa").value);
        alert(novoCadastro
            ? "Veículo cadastrado com sucesso.\n\nLembrete de IPVA: verifique se o imposto deste veículo já foi pago e providencie o pagamento se estiver pendente."
            : "Veículo salvo com sucesso.");
    }catch(e){alert(e.message);}
}
function mostrarVeiculos(lista=veiculos,total=lista.length){const tabela=document.getElementById("tabelaVeiculos"),vazio=document.getElementById("mensagemVazia");tabela.innerHTML=SegurancaInterface.html("");vazio.textContent="Nenhum veículo cadastrado.";vazio.style.display=lista.length?"none":"block";lista.forEach(v=>{const linha=document.createElement("tr"),id=String(v.id);linha.innerHTML=SegurancaInterface.html(`<td><strong>${escaparVeiculo(v.placa)}</strong></td><td>${escaparVeiculo(v.marca)}</td><td>${escaparVeiculo(v.modelo)}</td><td>${escaparVeiculo(v.ano||"-")}</td><td>${escaparVeiculo(v.quilometragem||"0")} km</td><td><span class="situacao ${classeSituacao(v.situacao)}">${escaparVeiculo(v.situacao)}</span></td><td><button class="btn-ficha" data-sec-click="h11" data-sec-arg="${SegurancaInterface.escape(id)}">Ficha</button><button class="btn-editar" data-sec-click="h84" data-sec-arg="${SegurancaInterface.escape(id)}">Editar</button><button class="btn-excluir" data-sec-click="h85" data-sec-arg="${SegurancaInterface.escape(id)}">Excluir</button></td>`);tabela.appendChild(linha);});document.getElementById("contador").textContent=`${total} veículo(s)`;}
function classeSituacao(s){return s==="Disponível"?"disponivel":s==="Alugado"?"alugado":s==="Manutenção"||s==="Na Oficina"?"manutencao":"inativo";}
function acharVeiculo(id){return veiculos.find(v=>String(v.id)===String(id));}
function editarVeiculo(id){pdfLicenciamentoPendente=null;document.getElementById("pdfLicenciamento").value="";document.getElementById("pdfLicenciamentoEstado").textContent="";const v=acharVeiculo(id);if(!v)return alert("Veículo não encontrado.");idsVeiculo.forEach(c=>document.getElementById(c).value=v[c]??"");veiculoEditandoId=String(v.id);abrirFormulario();}
async function excluirVeiculo(id){const v=acharVeiculo(id);if(!v)return;const pergunta=v.situacao==="Inativo"?`Excluir permanentemente o veículo ${v.placa}?`:`O veículo ${v.placa} ainda não está Inativo. Ele será marcado como Inativo; depois você poderá tentar excluí-lo permanentemente. Continuar?`;if(!confirm(pergunta))return;try{const r=await api.delete(`/veiculos/${id}`);await carregarVeiculos();alert(r?.data?.status==="inactivated"?"Veículo marcado como Inativo. Clique em Excluir novamente para removê-lo definitivamente, se não houver vínculos históricos.":"Veículo excluído.");}catch(e){alert(e.message);}}
function pesquisarVeiculos(){clearTimeout(pesquisaVeiculoTimer);pesquisaVeiculoTimer=setTimeout(()=>carregarVeiculos(document.getElementById("campoPesquisa").value.trim()),300);}
function mostrarFoto(foto){foto=SegurancaInterface.image(foto);const area=document.getElementById("fotoVeiculo");if(area){area.replaceChildren();if(foto){const img=document.createElement("img");img.src=foto;img.alt="Foto do veículo";area.appendChild(img);}else{area.textContent="Sem foto";}}const b=document.getElementById("btnRemoverFoto");if(b)b.style.display=foto||driveFotoId?"inline-block":"none";}
function mostrarFotoDrive(id){driveFotoId=id;const area=document.getElementById("fotoVeiculo");if(!area)return;area.textContent="Carregando foto…";const img=document.createElement("img");img.alt="Foto do veículo";img.onload=()=>{area.replaceChildren(img);};img.onerror=()=>{area.textContent="Não foi possível carregar a foto.";};img.src=api.driveContentUrl(id);}
async function carregarFotoDrive(id){driveFotoId=null;try{const result=await api.driveFiles("veiculo",id);if(String(veiculoFichaId)!==String(id))return;const photo=result.data.find(file=>file.category==="fotos");if(photo)mostrarFotoDrive(photo.id);else mostrarFoto(acharVeiculo(id)?.foto);}catch(_){mostrarFoto(acharVeiculo(id)?.foto);}}
function abrirFicha(id){const v=acharVeiculo(id);if(!v)return;veiculoFichaId=String(id);carregarFotoDrive(id);carregarPdfsLicenciamento(id);document.getElementById("fichaSubtitulo").textContent=`${v.marca} ${v.modelo} • ${v.placa}`;const map={fichaPlaca:v.placa,fichaRenavam:v.renavam,fichaMarca:v.marca,fichaModelo:v.modelo,fichaAno:v.ano,fichaCor:v.cor,fichaQuilometragem:v.quilometragem?`${v.quilometragem} km`:"-",fichaSituacao:v.situacao};Object.entries(map).forEach(([i,x])=>document.getElementById(i).textContent=x||"-");document.getElementById('fichaLicenciamento').textContent=LicenciamentoSP.avaliar(v).rotulo+(v.anoLicenciamento?' • CRLV '+v.anoLicenciamento:'');mostrarFoto(v.foto);document.getElementById("modalFicha").classList.add("mostrar");}
function fecharFicha(){document.getElementById("modalFicha").classList.remove("mostrar");}
function editarDaFicha(){const id=veiculoFichaId;fecharFicha();editarVeiculo(id);}
function selecionarFoto(){document.getElementById("inputFoto").click();}
document.getElementById("inputFoto")?.removeAttribute("data-sec-change");
document.getElementById("inputFoto")?.addEventListener("change",async e=>{const file=e.target.files?.[0],v=acharVeiculo(veiculoFichaId);if(!file||!v)return;try{await ArquivosSeguros.validateFile(file,true);const existentes=await api.driveFiles("veiculo",v.id);const anterior=existentes.data.find(f=>f.category==="fotos");const enviado=await api.driveUpload("veiculo",v.id,"fotos",file);if(v.foto){const atualizado=await api.put(`/veiculos/${v.id}`,{...v,foto:""});Object.assign(v,atualizado.data);}if(anterior)await api.driveDelete(anterior.id);mostrarFotoDrive(enviado.data.id);}catch(error){alert(error.message);}finally{e.target.value="";}});
async function removerFoto(){const v=acharVeiculo(veiculoFichaId);if(!v||!confirm("Remover a foto?"))return;try{if(driveFotoId){await api.driveDelete(driveFotoId);driveFotoId=null;}if(v.foto){const r=await api.put(`/veiculos/${v.id}`,{...v,foto:""});Object.assign(v,r.data);}mostrarFoto("");}catch(e){alert(e.message);}}
function sair(){localStorage.removeItem("usuarioLogado");location.href="LOCADORA_PAGINA_INICIAL.HTML";}
carregarVeiculos();

const pdfCampo=document.createElement("div");pdfCampo.className="campo campo-grande";
pdfCampo.innerHTML=SegurancaInterface.html('<label for="pdfLicenciamento">Licenciamento anual</label><input id="pdfLicenciamento" data-file-kind="pdf" type="file" accept=".pdf,application/pdf"><span id="pdfLicenciamentoEstado" role="status"></span>');
camposLicenciamento.after(pdfCampo);
document.getElementById("pdfLicenciamento").addEventListener("change",async event=>{
 pdfLicenciamentoPendente=null;
 const file=event.target.files[0],state=document.getElementById("pdfLicenciamentoEstado");state.textContent="";
 if(!file)return;
 try{
  if(!file.name.toLowerCase().endsWith(".pdf")||file.size>5*1024*1024)throw Error("Selecione um PDF de até 5 MB.");
  await ArquivosSeguros.validateFile(file);
  if(event.target.files[0]!==file)return;
  pdfLicenciamentoPendente=file;state.textContent="PDF selecionado. Salve o veículo para enviá-lo ao Google Drive.";
 }catch(error){event.target.value="";state.textContent=error.message;}
});
const camposDocumentoVeiculo=[
 {key:"nota_fiscal_compra",label:"Nota fiscal de compra do veículo"},
 {key:"codigo_tag",label:"Código TAG do veículo"},
 {key:"seguro_veiculo",label:"Seguro do veículo"},
 {key:"documento_adicional",label:"Documento adicional"},
];
let campoAnteriorDocumento=pdfCampo;
for(const {key,label} of camposDocumentoVeiculo){
 const field=document.createElement("div");field.className="campo campo-grande";
 field.innerHTML=SegurancaInterface.html(`<label for="arquivo_${key}">${label}</label><input id="arquivo_${key}" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"><span id="estado_${key}" role="status"></span>`);
 campoAnteriorDocumento.after(field);campoAnteriorDocumento=field;arquivosDocumentaisVeiculo[key]=null;
 field.querySelector("input").addEventListener("change",async event=>{const file=event.target.files[0],state=document.getElementById("estado_"+key);arquivosDocumentaisVeiculo[key]=null;state.textContent="";if(!file)return;try{await ArquivosSeguros.validateFile(file,file.type.startsWith("image/"));if(event.target.files[0]!==file)return;arquivosDocumentaisVeiculo[key]=file;state.textContent="Arquivo selecionado. Salve o veículo para enviar ao Google Drive.";}catch(error){event.target.value="";state.textContent=error.message;}});
}
const pdfFicha=document.createElement("section");pdfFicha.className="licenciamento-documentos";
 pdfFicha.innerHTML=SegurancaInterface.html('<h3>Documentos do veículo</h3><div id="listaPdfsLicenciamento"></div>');
document.getElementById("fichaLicenciamento").parentElement.after(pdfFicha);
async function carregarPdfsLicenciamento(id){
 const list=document.getElementById("listaPdfsLicenciamento");list.textContent="Carregando documentos…";
 try{
  const [legacy,drive]=await Promise.allSettled([api.get("/veiculos/"+encodeURIComponent(id)+"/licenciamentos"),api.driveFiles("veiculo",id)]);
  if(String(veiculoFichaId)!==String(id))return;list.replaceChildren();let count=0;
  if(drive.status==="fulfilled")for(const file of drive.value.data.filter(f=>/^crlv_\d{4}$/.test(f.category))){
   const details=document.createElement("details"),summary=document.createElement("summary");summary.textContent="Visualizar CRLV "+file.category.slice(5)+" — "+file.name;const frame=document.createElement("iframe");frame.src=api.driveContentUrl(file.id);frame.title=summary.textContent;frame.loading="lazy";frame.style.cssText="width:100%;height:70vh;border:0";details.append(summary,frame);list.append(details);
   const link=document.createElement("a");link.href=api.driveDownloadUrl(file.id);link.textContent="Baixar PDF "+file.category.slice(5);link.style.display="block";list.append(link);const remove=document.createElement("button");remove.type="button";remove.textContent="Excluir PDF";remove.addEventListener("click",()=>removerDocumentoDriveVeiculo(file.id,id,file.name));list.append(remove);count++;
  }
  if(drive.status==="fulfilled")for(const file of drive.value.data.filter(f=>camposDocumentoVeiculo.some(field=>field.key===f.category))){
   const field=camposDocumentoVeiculo.find(item=>item.key===file.category),row=document.createElement("p"),icon=document.createElement("span"),link=document.createElement("a"),remove=document.createElement("button");icon.textContent=file.mimeType.startsWith("image/")?"IMG":"PDF";icon.setAttribute("aria-hidden","true");icon.style.cssText="display:inline-grid;place-items:center;width:34px;height:28px;margin-right:8px;border-radius:5px;background:#eaf6fb;color:#078dcc;font-size:10px;font-weight:700";link.href=api.driveDownloadUrl(file.id);link.textContent=field.label+" — "+file.name;remove.type="button";remove.textContent="Excluir";remove.addEventListener("click",()=>removerDocumentoDriveVeiculo(file.id,id,file.name));row.append(icon,link,remove);list.append(row);count++;
  }
  if(legacy.status==="fulfilled")for(const file of legacy.value.data){const link=document.createElement("a");link.href="/api/veiculos/"+encodeURIComponent(id)+"/licenciamentos/"+file.ano;link.textContent="Baixar CRLV legado "+file.ano+" — "+file.nome;link.style.display="block";list.append(link);count++;}
  if(!count)list.textContent="Nenhum PDF anexado. Use Editar veículo para adicionar.";
  if(drive.status==="rejected"&&legacy.status==="rejected")list.textContent=drive.reason.message||"Não foi possível carregar os documentos.";
 }catch(error){list.textContent=error.message;}
}
async function removerDocumentoDriveVeiculo(fileId,veiculoId,nome){if(!confirm(`Excluir o arquivo ${nome} do Google Drive?`))return;try{await api.driveDelete(fileId);await carregarPdfsLicenciamento(veiculoId);}catch(error){alert(error.message);}}

