const chaveChecklists="checklistsVeiculos";
const itensPadrao=(()=>{const padrao=["Documentos do veículo","Chave principal e reserva","Rádio / multimídia","Tapetes","Pneus e estepe","Lataria e para-choques","Faróis e lanternas","Retrovisores","Vidros e para-brisa","Acessórios e ferramentas"];try{const config=JSON.parse(Banco.getItem("configuracoesEmpresa")||"{}");const itens=config?.itensVerificacaoChecklist;return Array.isArray(itens)&&itens.length&&itens.every(item=>typeof item==="string"&&item.trim())?itens:padrao}catch{return padrao}})();
const camposFotoPadrao=["Frente","Traseira","Lateral esquerda","Lateral direita","Painel e interior","Porta-malas","Motor","Avarias e detalhes"];
const camposFoto=(()=>{try{const configurados=JSON.parse(Banco.getItem("camposFotoChecklist"));return Array.isArray(configurados)&&configurados.length?configurados.filter(campo=>typeof campo==="string"&&campo.trim()):camposFotoPadrao}catch{return camposFotoPadrao}})();
let fotosPendentes={},checklistEditandoId=null,itensFormulario=[...itensPadrao],fotosExistentes=[];
const camposFotoFormulario=()=>[...new Set([...camposFoto,...fotosExistentes.map(f=>f.campo)])];
const porId=id=>document.getElementById(id);
const ler=(chave,alternativa=[])=>{try{return JSON.parse(Banco.getItem(chave))||alternativa}catch{return alternativa}};
const salvar=(chave,valor)=>Banco.setItem(chave,JSON.stringify(valor));
const escapar=valor=>String(valor??"").replace(/[&<>"']/g,caractere=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[caractere]));
const formatarData=valor=>valor?new Date(valor).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"}):"-";
const fotosRegistro=item=>Array.isArray(item.fotos)?item.fotos.map(foto=>typeof foto==="string"?{campo:"Foto",imagem:foto}:foto).filter(foto=>(typeof foto?.imagem==="string"&&foto.imagem.trim())||(typeof foto?.driveFileId==="string"&&foto.driveFileId.trim())):[];
function veiculos(){return ler("veiculos")}
function numeroChecklist(item){
 const id=String(item._dbId||item.id||"");
 if(!/^[1-9][0-9]*$/.test(id))throw Error("Salve o check-list antes de gerar o documento.");
 return "CL-"+id.padStart(6,"0");
}
function nomeVeiculo(indice){const v=veiculos()[Number(indice)]||{};return [v.placa,[v.marca,v.modelo].filter(Boolean).join(" ")].filter(Boolean).join(" — ")||"Veículo não identificado"}
function carregarClientes(){
 const seletor=porId("clienteChecklist");seletor.replaceChildren(new Option("Sem cliente informado",""));
 ler("clientes").forEach(c=>seletor.add(new Option([c.razaoSocial||c.nome,c.documento].filter(Boolean).join(" — "),String(c.id))));
}
function htmlClienteChecklist(item){
 const c=item.clienteDados;if(!c)return "";
 const endereco=[c.endereco,c.numero,c.complemento,c.bairro,[c.cidade,c.estado].filter(Boolean).join(" / "),c.cep?"CEP "+c.cep:""].filter(Boolean).join(", ");
 const campo=(nome,valor)=>`<div><span>${nome}</span><strong>${escapar(valor||"Não informado")}</strong></div>`;
 return '<h3>Cliente · retirada / devolução</h3><div class="dados-documento dados-cliente">'+campo("Nome / Razão social",c.razaoSocial||c.nome)+campo("CPF / CNPJ",c.documento)+campo("Telefone",c.telefone||c.whatsapp)+campo("E-mail",c.email)+campo("Endereço",endereco)+'</div>';
}
function carregarVeiculos(){const seletor=porId("veiculoChecklist"),selecionado=seletor.value;seletor.innerHTML=SegurancaInterface.html('<option value="">Selecione o veículo</option>');veiculos().forEach((v,i)=>seletor.add(new Option(`${v.placa||"-"} — ${[v.marca,v.modelo].filter(Boolean).join(" ")}`,i)));seletor.value=selecionado}
function desenharItens(){porId("itensChecklist").innerHTML=SegurancaInterface.html(itensFormulario.map((item,i)=>`<div class="linha-item"><strong>${escapar(item)}</strong><select data-item-condicao="${i}"><option value="Conforme">Conforme</option><option value="Avaria">Avaria</option><option value="Não se aplica">Não se aplica</option><option value="Pendente">Pendente</option></select><input data-item-observacao="${i}" type="text" placeholder="Observação do item"></div>`).join(""))}
function renderFotos(){const alvo=porId("previsaoFotos");alvo.innerHTML=SegurancaInterface.html(camposFotoFormulario().map((campo,i)=>{const existente=fotosExistentes.find(f=>f.campo===campo),foto=fotosPendentes[campo]||(existente?.driveFileId?api.driveContentUrl(existente.driveFileId):existente?.imagem);return `<label class="campo-foto">${foto?`<img src="${SegurancaInterface.image(foto)}" alt="Foto: ${escapar(campo)}"><button type="button" data-remover-foto="${i}" aria-label="Remover foto">×</button>`:`<span class="placeholder-foto"><b>ï¼‹</b>Adicionar foto</span>`}<span class="rotulo-foto">${escapar(campo)}</span><input data-foto-campo="${i}" type="file" accept=".jpg,.jpeg,.png" capture="environment" hidden></label>`}).join(""));alvo.querySelectorAll("[data-foto-campo]").forEach(input=>input.addEventListener("change",adicionarFotoCampo));alvo.querySelectorAll("[data-remover-foto]").forEach(botao=>botao.onclick=()=>{const campo=camposFotoFormulario()[Number(botao.dataset.removerFoto)];delete fotosPendentes[campo];fotosExistentes=fotosExistentes.filter(f=>f.campo!==campo);renderFotos()})}
function arquivosParaBase64(arquivos){return Promise.all(Array.from(arquivos).map(arquivo=>new Promise((resolver,rejeitar)=>{const leitor=new FileReader();leitor.onload=()=>resolver(leitor.result);leitor.onerror=rejeitar;leitor.readAsDataURL(arquivo)})))}
async function adicionarFotoCampo(evento){const arquivo=evento.target.files?.[0];if(!arquivo)return;const campo=camposFotoFormulario()[Number(evento.target.dataset.fotoCampo)];fotosPendentes[campo]=(await arquivosParaBase64([arquivo]))[0];renderFotos()}
function limparFormulario(){checklistEditandoId=null;itensFormulario=[...itensPadrao];fotosExistentes=[];porId("areaFormulario").querySelector(".eyebrow").textContent="NOVA VISTORIA";porId("formChecklist").querySelector("[type=submit]").textContent="Salvar check-list";porId("formChecklist").reset();fotosPendentes={};renderFotos();porId("dataChecklist").value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);desenharItens()}
async function salvarChecklist(evento){evento.preventDefault();const veiculo=porId("veiculoChecklist").value;if(veiculo===""){alert("Selecione o veículo para salvar o check-list.");return}const itens=itensFormulario.map((nome,i)=>({nome,condicao:document.querySelector(`[data-item-condicao="${i}"]`).value,observacao:document.querySelector(`[data-item-observacao="${i}"]`).value.trim()}));const anterior=checklistEditandoId?ler(chaveChecklists).find(r=>String(r.id)===checklistEditandoId):null;if(checklistEditandoId&&!anterior){alert("Check-list não encontrado. Atualize a página.");return;}const registro={...anterior,id:anterior?.id||Date.now(),veiculo:Number(veiculo),clienteId:porId("clienteChecklist").value||null,tipo:porId("tipoChecklist").value,data:porId("dataChecklist").value,km:porId("kmChecklist").value.replace(/\./g,""),combustivel:porId("combustivelChecklist").value,responsavel:porId("responsavelChecklist").value.trim(),observacoes:porId("observacoesChecklist").value.trim(),itens,fotos:[...fotosExistentes.filter(f=>!Object.hasOwn(fotosPendentes,f.campo)),...Object.entries(fotosPendentes).map(([campo,imagem])=>({campo,imagem}))],criadoEm:anterior?.criadoEm||new Date().toISOString()};const lista=ler(chaveChecklists);if(anterior)lista[lista.findIndex(r=>String(r.id)===String(anterior.id))]=registro;else lista.unshift(registro);try{await salvar(chaveChecklists,lista);}catch{return;}limparFormulario();porId("areaFormulario").classList.add("recolhido");renderizar();alert("Check-list salvo com sucesso.")}
function editarChecklist(id){
 const item=ler(chaveChecklists).find(r=>String(r.id)===String(id));if(!item)return;
 limparFormulario();checklistEditandoId=String(item.id);
 if(item.clienteId&&!Array.from(porId("clienteChecklist").options).some(o=>o.value===String(item.clienteId)))porId("clienteChecklist").add(new Option(item.clienteDados?.razaoSocial||item.clienteDados?.nome||"Cliente da vistoria",String(item.clienteId)));
 for(const [campo,valor]of Object.entries({veiculoChecklist:item.veiculo,clienteChecklist:item.clienteId||"",tipoChecklist:item.tipo,dataChecklist:item.data?.slice(0,16),kmChecklist:item.km,combustivelChecklist:item.combustivel,responsavelChecklist:item.responsavel,observacoesChecklist:item.observacoes}))porId(campo).value=valor??"";
 itensFormulario=item.itens.map(i=>i.nome);desenharItens();
 item.itens.forEach((item,i)=>{document.querySelector(`[data-item-condicao="${i}"]`).value=item.condicao;document.querySelector(`[data-item-observacao="${i}"]`).value=item.observacao||"";});
 fotosExistentes=fotosRegistro(item).map(f=>({...f}));renderFotos();
 porId("areaFormulario").querySelector(".eyebrow").textContent="EDITANDO VISTORIA";
 porId("formChecklist").querySelector("[type=submit]").textContent="Salvar alterações";
 porId("areaFormulario").classList.remove("recolhido");porId("areaFormulario").scrollIntoView({behavior:"smooth",block:"start"});
}
function temPendencia(registro){return registro.itens.some(item=>["Avaria","Pendente"].includes(item.condicao))}
function renderizar(){const lista=ler(chaveChecklists),busca=porId("buscarChecklist").value.trim().toLocaleLowerCase("pt-BR"),filtrada=lista.filter(item=>`${numeroChecklist(item)} ${nomeVeiculo(item.veiculo)} ${item.responsavel}`.toLocaleLowerCase("pt-BR").includes(busca));porId("totalChecklists").textContent=lista.length;porId("totalEntradas").textContent=lista.filter(item=>item.tipo==="Entrada").length;porId("totalSaidas").textContent=lista.filter(item=>item.tipo==="Saída").length;porId("totalPendencias").textContent=lista.filter(temPendencia).length;const alvo=porId("listaChecklists");alvo.innerHTML=SegurancaInterface.html(filtrada.map(item=>`<article class="registro"><div class="registro-icone">${item.tipo==="Entrada"?"â†™":"â†—"}</div><div><h3>${numeroChecklist(item)} · ${escapar(nomeVeiculo(item.veiculo))} <small>• ${escapar(item.tipo)}</small></h3><p>${formatarData(item.data)} · ${escapar(item.responsavel||"Responsável não informado")} · ${item.fotos.length} foto(s)${temPendencia(item)?" · Com pendência":""}</p></div><div class="registro-acoes"><button class="mini-botao" data-ver="${item.id}">Ver</button><button class="mini-botao" data-editar="${item.id}">Editar</button><button class="mini-botao" data-imprimir="${item.id}">Imprimir</button><button class="mini-botao" data-excluir="${item.id}">Excluir</button></div></article>`).join(""));porId("semChecklists").hidden=filtrada.length>0;alvo.querySelectorAll("[data-ver]").forEach(botao=>botao.onclick=()=>abrirChecklist(String(botao.dataset.ver)));alvo.querySelectorAll("[data-editar]").forEach(botao=>botao.onclick=()=>editarChecklist(String(botao.dataset.editar)));alvo.querySelectorAll("[data-imprimir]").forEach(botao=>botao.onclick=()=>imprimirChecklist(String(botao.dataset.imprimir)));alvo.querySelectorAll("[data-excluir]").forEach(botao=>botao.onclick=async()=>{if(confirm("Excluir este check-list?")){await salvar(chaveChecklists,lista.filter(item=>String(item.id)!==String(botao.dataset.excluir)));renderizar()}})}
function htmlDocumento(item){const linhas=item.itens.map((linha,i)=>`<tr><td>${i+1}</td><td>${escapar(linha.nome)}</td><td>${escapar(linha.condicao)}</td><td>${escapar(linha.observacao||"-")}</td></tr>`).join("");const fotosVistoria=fotosRegistro(item);const fotos=fotosVistoria.length?`<h3>Registro fotográfico</h3><div class="foto-documento">${fotosVistoria.map(foto=>`<figure><img src="${foto.driveFileId?api.driveContentUrl(foto.driveFileId):SegurancaInterface.image(foto.imagem)}" alt="${escapar(foto.campo)}"><figcaption>${escapar(foto.campo)}</figcaption></figure>`).join("")}</div>`:"";return `<div class="documento"><h2>Check-list de vistoria · ${numeroChecklist(item)}</h2><p>${escapar(nomeVeiculo(item.veiculo))} · ${escapar(item.tipo)}</p><div class="dados-documento"><div><span>Data e hora</span><strong>${formatarData(item.data)}</strong></div><div><span>Quilometragem</span><strong>${escapar(item.km||"-")} km</strong></div><div><span>Combustível</span><strong>${escapar(item.combustivel||"-")}</strong></div><div><span>Responsável</span><strong>${escapar(item.responsavel||"-")}</strong></div><div><span>Observações</span><strong>${escapar(item.observacoes||"-")}</strong></div></div>${htmlClienteChecklist(item)}<table style="width:100%;border-collapse:collapse"><thead><tr><th>#</th><th>Item</th><th>Condição</th><th>Observação</th></tr></thead><tbody>${linhas}</tbody></table>${fotos}<div class="acoes-documento"><button class="botao secundario" type="button" data-sec-click="h1">Fechar</button><button class="botao primario" type="button" data-imprimir-documento>Imprimir</button></div></div>`}
function abrirChecklist(id){const item=ler(chaveChecklists).find(registro=>String(registro.id)===String(id));if(!item)return;porId("conteudoModalChecklist").innerHTML=SegurancaInterface.html(htmlDocumento(item));porId("conteudoModalChecklist").querySelector("[data-imprimir-documento]").onclick=()=>imprimirChecklist(id);porId("modalChecklist").showModal()}
async function imprimirChecklist(id){
 const item=ler(chaveChecklists).find(registro=>String(registro.id)===String(id));
 if(!item)return;
 const janela=window.open("","_blank");
 if(!janela){alert("Permita abrir a janela para imprimir o check-list.");return;}
 try{
  criarCabecalhoImpressao();
  const cabecalho=document.getElementById("cabecalhoImpressaoGlobal").cloneNode(true);
  const rodape=document.getElementById("rodapeImpressaoGlobal").cloneNode(true);
  cabecalho.removeAttribute("id");rodape.removeAttribute("id");
  cabecalho.querySelector("p").textContent="Vistoria de veículo";
  cabecalho.querySelector(".cabecalho-impressao-meta strong").textContent=numeroChecklist(item)+" · "+item.tipo;
  const conteudo=htmlDocumento(item).replace(/<div class="acoes-documento">[\s\S]*?<\/div>/,"");
  janela.document.write(SegurancaInterface.html('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Check-list_'+numeroChecklist(item)+'</title></head><body class="checklist-impressao">'+cabecalho.outerHTML+'<main>'+conteudo+'</main>'+rodape.outerHTML+'</body></html>',true));
  janela.document.close();
  await Promise.all(["LOCADORA_CHECKLISTS.CSS","LOCADORA_IMPRESSAO.CSS"].map(arquivo=>new Promise((resolve,reject)=>{
   const link=janela.document.createElement("link");link.rel="stylesheet";link.href=new URL(arquivo,location.href).href;
   link.onload=resolve;link.onerror=()=>reject(Error("Não foi possível carregar o padrão de impressão."));
   janela.document.head.appendChild(link);
  })));
  await Promise.all(Array.from(janela.document.images).map(img=>img.decode().catch(()=>{})));
  if(janela.document.fonts)await janela.document.fonts.ready;
  if(janela.closed)return;
  janela.focus();janela.print();
 }catch(error){alert(error.message||"Não foi possível preparar a impressão.");}
}

document.addEventListener("banco:pronto",()=>{carregarVeiculos();carregarClientes();desenharItens();limparFormulario();renderizar();porId("formChecklist").addEventListener("submit",salvarChecklist);porId("limparChecklist").onclick=limparFormulario;porId("novoChecklist").onclick=()=>{limparFormulario();porId("areaFormulario").classList.remove("recolhido");porId("areaFormulario").scrollIntoView({behavior:"smooth",block:"start"});porId("veiculoChecklist").focus()};porId("buscarChecklist").addEventListener("input",renderizar);document.querySelector(".fechar-modal").onclick=()=>porId("modalChecklist").close()});

