/* Clientes: API REST. Os demais módulos continuam temporariamente no localStorage. */
const usuario = localStorage.getItem("usuarioLogado");
if (usuario && document.getElementById("nomeUsuario")) document.getElementById("nomeUsuario").textContent = usuario;

let clientes = [];
let clienteEditandoId = null;
let totalClientes = 0;
let pesquisaTimer = null;

const camposCliente = ["tipoPessoa","nome","razaoSocial","nomeFantasia","documento","inscricaoEstadual","responsavel","rg","nascimento","telefone","whatsapp","email","cep","estado","cidade","bairro","endereco","numero","complemento","cnh","categoria","validadeCnh","situacao","observacoes"];

function abrirFormulario() { document.getElementById("formulario").classList.add("mostrar"); atualizarTipoPessoa(); }
function fecharFormulario() { document.getElementById("formulario").classList.remove("mostrar"); limparFormulario(); clienteEditandoId=null; }
function limparFormulario() { camposCliente.forEach((id)=>{const campo=document.getElementById(id);if(campo)campo.value=id==="situacao"?"Ativo":id==="tipoPessoa"?"PF":"";}); atualizarTipoPessoa(); }

function atualizarTipoPessoa() {
  const pj=document.getElementById("tipoPessoa")?.value==="PJ";
  document.querySelectorAll(".campo-pessoa-juridica").forEach(campo=>campo.hidden=!pj);
  const nome=document.getElementById("campoNomePessoa"); if(nome)nome.hidden=pj;
  const label=document.getElementById("labelDocumento"); if(label)label.textContent=pj?"CNPJ *":"CPF *";
  const documento=document.getElementById("documento"); if(documento)documento.placeholder=pj?"Digite o CNPJ":"Digite o CPF";
}

function dadosFormulario() {
  return camposCliente.reduce((data,id)=>{data[id]=document.getElementById(id)?.value?.trim()||"";return data;},{});
}

function mostrarEstado(mensagem, erro=false) {
  const vazio=document.getElementById("mensagemVazia");
  vazio.textContent=mensagem;
  vazio.style.display="block";
  document.getElementById("tabelaClientes").innerHTML=SegurancaInterface.html("");
  document.getElementById("contador").textContent=erro?"Erro ao carregar":"Carregando...";
}

function mensagemErro(error) { return error?.message || "Ocorreu um erro inesperado."; }

async function carregarClientes(busca="") {
  mostrarEstado("Carregando clientes...");
  try {
    const result=await api.get(`/clientes?busca=${encodeURIComponent(busca)}&page=1&limit=100`);
    clientes=result.data; totalClientes=result.pagination.total; mostrarClientes(clientes,totalClientes);
    return result;
  } catch(error) { mostrarEstado(mensagemErro(error),true); return null; }
}

async function salvarCliente() {
  const cliente=dadosFormulario();
  if(cliente.tipoPessoa==="PJ")cliente.nome=cliente.razaoSocial;
  if(!cliente.nome){alert(cliente.tipoPessoa==="PJ"?"Informe a razão social.":"Informe o nome completo do cliente.");document.getElementById(cliente.tipoPessoa==="PJ"?"razaoSocial":"nome").focus();return;}
  if(!cliente.documento){alert("Informe o CPF/CNPJ do cliente.");document.getElementById("documento").focus();return;}
  const botao=document.querySelector(".btn-salvar"); const texto=botao.textContent; botao.disabled=true; botao.textContent="Salvando...";
  try {
    if(clienteEditandoId) await api.put(`/clientes/${clienteEditandoId}`,cliente); else await api.post("/clientes",cliente);
    alert(clienteEditandoId?"Cliente atualizado com sucesso!":"Cliente cadastrado com sucesso!");
    fecharFormulario(); await carregarClientes(document.getElementById("campoPesquisa").value.trim());
  } catch(error) { alert(mensagemErro(error)); }
  finally { botao.disabled=false; botao.textContent=texto; }
}

function mostrarClientes(lista=clientes,total=lista.length) {
  const tabela=document.getElementById("tabelaClientes"); const mensagem=document.getElementById("mensagemVazia"); tabela.innerHTML=SegurancaInterface.html("");
  mensagem.textContent="Nenhum cliente cadastrado."; mensagem.style.display=lista.length?"none":"block";
  lista.forEach((cliente)=>{
    const linha=document.createElement("tr"); const id=String(cliente.id);
    linha.innerHTML=SegurancaInterface.html(`<td><strong>${escaparHTML(cliente.nome)}</strong></td><td>${escaparHTML(cliente.documento)}</td><td>${escaparHTML(cliente.telefone||"-")}</td><td>${escaparHTML(cliente.cnh||"-")}</td><td>${formatarData(cliente.validadeCnh)}</td><td><span class="situacao ${classeSituacaoCliente(cliente.situacao)}">${escaparHTML(cliente.situacao||"Inativo")}</span></td><td><button class="btn-ficha" data-sec-click="h11" data-sec-arg="${SegurancaInterface.escape(id)}">Ficha</button><button class="btn-editar" data-sec-click="h12" data-sec-arg="${SegurancaInterface.escape(id)}">Editar</button><button class="btn-excluir" data-sec-click="h13" data-sec-arg="${SegurancaInterface.escape(id)}">Excluir</button></td>`);
    tabela.appendChild(linha);
  });
  document.getElementById("contador").textContent=`${total} cliente(s)`;
}

function classeSituacaoCliente(situacao) { return situacao==="Ativo"?"disponivel":"inativo"; }
function clienteLocal(id) { return clientes.find((item)=>String(item.id)===String(id)); }

async function obterCliente(id) {
  const local=clienteLocal(id); if(local)return local;
  const result=await api.get(`/clientes/${id}`); return result.data;
}

async function editarCliente(id) {
  try { const cliente=await obterCliente(id); camposCliente.forEach((campo)=>{const elemento=document.getElementById(campo);if(elemento)elemento.value=cliente[campo]||(campo==="tipoPessoa"?"PF":"");}); clienteEditandoId=String(cliente.id); abrirFormulario(); }
  catch(error){alert(mensagemErro(error));}
}

async function excluirCliente(id) {
  const cliente=clienteLocal(id); if(!cliente){alert("Cliente não encontrado.");return;}
  if(!confirm(`Deseja realmente excluir o cliente "${cliente.nome}"?`))return;
  try { await api.delete(`/clientes/${id}`); await carregarClientes(document.getElementById("campoPesquisa").value.trim()); alert("Cliente excluído com sucesso!"); }
  catch(error){alert(mensagemErro(error));}
}

function pesquisarClientes() {
  clearTimeout(pesquisaTimer);
  pesquisaTimer=setTimeout(()=>carregarClientes(document.getElementById("campoPesquisa").value.trim()),300);
}

async function abrirFicha(id) {
  try {
    const c=await obterCliente(id);
    const valores={fichaNome:c.nome||"Cliente",fichaNomeCompleto:c.nome,fichaDocumento:c.documento,fichaRg:c.rg,
      fichaNascimento:formatarData(c.nascimento),fichaTelefone:c.telefone,fichaWhatsapp:c.whatsapp,fichaEmail:c.email,
      fichaSituacao:c.situacao,fichaCep:c.cep,fichaEstado:c.estado,fichaCidade:c.cidade,fichaBairro:c.bairro,
      fichaEndereco:c.endereco,fichaNumero:c.numero,fichaComplemento:c.complemento,fichaCnh:c.cnh,
      fichaCategoria:c.categoria,fichaValidadeCnh:formatarData(c.validadeCnh),
      fichaObservacoes:c.observacoes||"Nenhuma observação registrada."};
    Object.entries(valores).forEach(([idCampo,valor])=>{document.getElementById(idCampo).textContent=valor||"-";});
    document.getElementById("modalFicha").classList.add("mostrar");
    let drivePanel=document.getElementById("driveDocsCliente");if(!drivePanel){drivePanel=document.createElement("section");drivePanel.id="driveDocsCliente";document.querySelector("#modalFicha .ficha").append(drivePanel);}api.drivePanel("cliente",c.id,drivePanel);
  } catch(error){alert(mensagemErro(error));}
}

function fecharFicha(){document.getElementById("modalFicha").classList.remove("mostrar");}
function formatarData(data){if(!data)return "-";const partes=String(data).slice(0,10).split("-");return partes.length===3?`${partes[2]}/${partes[1]}/${partes[0]}`:data;}
function escaparHTML(valor){return String(valor??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}
function sair(){localStorage.removeItem("usuarioLogado");window.location.href="LOCADORA_PAGINA_INICIAL.HTML";}

async function importarClientesAntigos() {
  let antigos=[]; try{antigos=JSON.parse(localStorage.getItem("clientes"))||[];}catch(_){return;}
  if(!antigos.length||localStorage.getItem("clientesImportacaoOferecida")==="1")return;
  localStorage.setItem("clientesImportacaoOferecida","1");
  if(!confirm(`Foram encontrados ${antigos.length} cliente(s) antigos neste navegador. Deseja importá-los para o banco agora?`))return;
  let importados=0,ignorados=0;
  for(const antigo of antigos){try{const payload={};camposCliente.forEach((campo)=>payload[campo]=antigo[campo]??"");await api.post("/clientes",payload);importados+=1;}catch(error){if(error.status===409)ignorados+=1;else{alert(`Importação interrompida: ${mensagemErro(error)}`);break;}}}
  alert(`${importados} cliente(s) importado(s). ${ignorados} duplicado(s) ignorado(s).`); await carregarClientes();
}
window.importarClientesAntigos=importarClientesAntigos;

document.addEventListener("click",(event)=>{if(event.target===document.getElementById("modalFicha"))fecharFicha();});
document.addEventListener("keydown",(event)=>{if(event.key==="Escape"&&document.getElementById("modalFicha").classList.contains("mostrar"))fecharFicha();});

carregarClientes();

