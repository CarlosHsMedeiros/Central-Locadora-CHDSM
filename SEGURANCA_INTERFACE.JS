(function(){
"use strict";
const policy=window.ArquivosSeguros;
const escape=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function html(value,whole=false){
 if(!window.DOMPurify)throw new Error("Não foi possível carregar a proteção de conteúdo. Atualize a página.");
  const text=String(value??"");
 const options={WHOLE_DOCUMENT:whole,FORBID_TAGS:["script","iframe","object","embed","base","meta","link"],FORBID_ATTR:["srcdoc","formaction"],ALLOW_DATA_ATTR:true};
 // Fragmentos de tabela precisam do contexto HTML correto para preservar c?lulas.
 const tag=/^\s*<(td|th|tr|tbody|thead|tfoot|caption|colgroup|col)(?:\s|>)/i.exec(text)?.[1].toLowerCase();
 if(!whole&&tag){
  const row=tag==="td"||tag==="th",rows=tag==="tr",column=tag==="col";
  const prefix=row?"<table><tbody><tr>":rows?"<table><tbody>":column?"<table><colgroup>":"<table>";
  const suffix=row?"</tr></tbody></table>":rows?"</tbody></table>":column?"</colgroup></table>":"</table>";
  const fragment=DOMPurify.sanitize(prefix+text+suffix,{...options,RETURN_DOM_FRAGMENT:true});
  return fragment.querySelector(row?"tr":rows?"tbody":column?"colgroup":"table")?.innerHTML||"";
 }
 return DOMPurify.sanitize(text,options);
}
function rich(value){return DOMPurify.sanitize(String(value??""),{ALLOWED_TAGS:["p","br","b","strong","i","em","u","h2","h3","h4","ul","ol","li","blockquote","span"],ALLOWED_ATTR:[],ALLOW_DATA_ATTR:false});}
const approved=new WeakSet();
let pending=0;
document.addEventListener("change",async event=>{
 const input=event.target;
 if(!(input instanceof HTMLInputElement)||input.type!=="file"||approved.has(event))return;
 if(input.id==='nfseCertificado'&&/LOCADORA_CONFIGURACOES\.HTML$/i.test(location.pathname)){
  const f=input.files?.[0];if(f&&(!/\.(pfx|p12)$/i.test(f.name)||f.size>512*1024)){event.stopImmediatePropagation();event.preventDefault();input.value='';alert('Use um certificado A1 .pfx/.p12 de ate 512 KB.');}return;
 }
 const selected=Array.from(input.files||[]);
 if(!selected.length)return;
 event.stopImmediatePropagation();event.preventDefault();input.value="";
 const imagesOnly=!["document","pdf"].includes(input.dataset.fileKind);
 pending++;input.disabled=true;
 try{
  const checked=[];
  for(const file of selected){const valid=await policy.validateFile(file,imagesOnly);if(input.dataset.fileKind==="pdf"&&valid.ext!=="pdf")throw Error("Este campo aceita somente PDF.");checked.push(new File([valid.bytes],file.name,{type:valid.mime,lastModified:file.lastModified}));}
  const transfer=new DataTransfer();checked.forEach(file=>transfer.items.add(file));input.files=transfer.files;
  input.disabled=false;
  const replay=new Event("change",{bubbles:true});approved.add(replay);input.dispatchEvent(replay);
 }catch(error){input.value="";alert(error.message||"Arquivo inválido.");}
 finally{pending--;input.disabled=false;}
},true);
document.addEventListener("submit",event=>{if(pending){event.preventDefault();event.stopImmediatePropagation();alert("Aguarde a verificação do arquivo.");}},true);
function fields(root=document){
 root.querySelectorAll('input[type="file"]').forEach(input=>{if(input.id==='nfseCertificado'&&/LOCADORA_CONFIGURACOES\.HTML$/i.test(location.pathname)){input.accept='.pfx,.p12';return;}input.accept=input.dataset.fileKind==="pdf"?".pdf":input.dataset.fileKind==="document"?policy.accept:".jpg,.jpeg,.png";});
 root.querySelectorAll('input:not([type]),input[type="text"],input[type="search"],input[type="email"],input[type="tel"],input[type="password"],textarea').forEach(input=>{
  if(!input.hasAttribute("maxlength"))input.maxLength=input.tagName==="TEXTAREA"?10000:input.type==="password"?72:255;
 });
}
document.addEventListener("DOMContentLoaded",()=>{fields();new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length))fields();}).observe(document.body,{childList:true,subtree:true});});
window.SegurancaInterface=Object.freeze({escape,html,rich,image:policy.imageUrl,get pending(){return pending;}});
}());

/* Seletores pesquisaveis preservam o select original e seus eventos. */
(function(){
"use strict";
const states=new Map();let counter=0,active=null;
const normalize=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
function close(s){if(!s)return;if(s.panel.matches(":popover-open"))s.panel.hidePopover();s.panel.hidden=true;s.button.setAttribute("aria-expanded","false");if(active===s)active=null;}
function sync(s){
 const el=s.select;
 const visible=!el.hidden&&getComputedStyle(el).display!=="none";
 s.wrap.hidden=!visible;s.button.disabled=el.disabled;
 const values=Array.from(el.selectedOptions).filter(o=>!el.multiple||o.value!=="").map(o=>o.textContent.trim());
 const title=values.length?values.join(", "):"Selecione...";
 const text=el.multiple&&values.length>1?values.length+" selecionados — "+title:title;
 if(s.caption.textContent!==text)s.caption.textContent=text;s.button.title=title;
 if(active===s&&el.disabled)close(s);
 if(active===s&&s.signature!==Array.from(el.options).map(o=>[o.textContent,o.value,o.selected,o.disabled,o.hidden].join("|")).join(";"))render(s);
}
function position(s){
 const r=s.button.getBoundingClientRect(),width=Math.min(Math.max(r.width,260),innerWidth-24),below=innerHeight-r.bottom;
 s.panel.style.width=width+"px";s.panel.style.left=Math.max(12,Math.min(r.left,innerWidth-width-12))+"px";
 s.panel.style.top=(below>250?r.bottom+5:Math.max(8,r.top-Math.min(320,r.top-12)))+"px";
 s.panel.style.maxHeight=Math.max(150,Math.min(320,below>250?below-16:r.top-16))+"px";
}
function render(s){
 s.signature=Array.from(s.select.options).map(o=>[o.textContent,o.value,o.selected,o.disabled,o.hidden].join("|")).join(";");
 s.list.replaceChildren();s.options=[];
 const query=normalize(s.search.value);
 s.list.setAttribute("aria-multiselectable",String(s.select.multiple));
 for(const option of s.select.options){
  if(option.hidden||(s.select.multiple&&option.value==="")||!normalize(option.textContent).includes(query))continue;
  const row=document.createElement("div");row.className="escolha-opcao";row.id="escolha-opcao-"+(++counter);row.setAttribute("role","option");row.setAttribute("aria-selected",String(option.selected));row.textContent=(s.select.multiple?(option.selected?"☑ ":"☐ "):"")+option.textContent;
  row.setAttribute("aria-disabled",String(option.disabled||option.parentElement.disabled||false));
  row.addEventListener("mousedown",e=>e.preventDefault());
  row.onclick=()=>choose(s,option);s.list.append(row);s.options.push({row,option});
 }
 s.index=-1;s.search.removeAttribute("aria-activedescendant");
 if(!s.options.length){const empty=document.createElement("p");empty.textContent="Nenhuma opção encontrada.";s.list.append(empty);}
}
function choose(s,option){
 if(option.disabled||option.parentElement.disabled)return;
 if(s.select.multiple)option.selected=!option.selected;else s.select.value=option.value;
 s.select.dispatchEvent(new Event("input",{bubbles:true}));s.select.dispatchEvent(new Event("change",{bubbles:true}));
 sync(s);
 if(s.select.multiple){render(s);s.search.focus();}else{close(s);s.button.focus();}
}
function open(s){
 if(s.select.disabled)return;close(active);active=s;s.search.value="";sync(s);render(s);s.panel.hidden=false;position(s);s.panel.showPopover();s.button.setAttribute("aria-expanded","true");s.search.focus();
}
function enhance(el){
 if(states.has(el)||el.closest(".escolha-painel"))return;
 const wrap=document.createElement("div");wrap.className="escolha-campo";wrap.dataset.escolhaPara=el.id||el.name||"";
 const button=document.createElement("button");button.type="button";button.className="escolha-botao";
 const caption=document.createElement("span"),arrow=document.createElement("span");arrow.textContent="▾";arrow.setAttribute("aria-hidden","true");button.append(caption,arrow);
 const panel=document.createElement("div");panel.className="escolha-painel";panel.popover="manual";panel.hidden=true;panel.id="escolha-painel-"+(++counter);
 const search=document.createElement("input");search.type="search";search.className="escolha-busca";search.placeholder="Digite para pesquisar...";search.setAttribute("aria-label","Pesquisar opções");search.setAttribute("role","combobox");search.setAttribute("aria-autocomplete","list");search.setAttribute("aria-expanded","true");search.autocomplete="off";
 const list=document.createElement("div");list.className="escolha-lista";list.id="escolha-lista-"+counter;list.setAttribute("role","listbox");search.setAttribute("aria-controls",list.id);
 panel.append(search,list);wrap.append(button,panel);el.after(wrap);
 button.setAttribute("aria-haspopup","listbox");button.setAttribute("aria-expanded","false");button.setAttribute("aria-controls",list.id);
 const labels=Array.from(el.labels||[]);const name=el.getAttribute("aria-label")||labels.map(l=>l.textContent).join(" ").trim()||el.name||"Selecionar opção";button.setAttribute("aria-label",name);list.setAttribute("aria-label",name);
 el.classList.add("escolha-original");el.tabIndex=-1;
 const s={select:el,wrap,button,caption,panel,search,list,options:[],index:-1};states.set(el,s);
 button.onclick=()=>active===s?close(s):open(s);
 search.oninput=()=>render(s);
 search.onkeydown=e=>{
  if(e.key==="Escape"){e.preventDefault();close(s);button.focus();return;}
  if(e.key==="Tab"){close(s);button.focus();return;}
  if(["ArrowDown","ArrowUp"].includes(e.key)){
   e.preventDefault();const options=s.options.filter(o=>o.row.getAttribute("aria-disabled")!=="true");if(!options.length)return;
   s.index=(s.index+(e.key==="ArrowDown"?1:-1)+options.length)%options.length;
   s.options.forEach(o=>o.row.classList.remove("destacada"));const item=options[s.index];item.row.classList.add("destacada");search.setAttribute("aria-activedescendant",item.row.id);item.row.scrollIntoView({block:"nearest"});
  }
  if(e.key==="Enter"){e.preventDefault();const options=s.options.filter(o=>o.row.getAttribute("aria-disabled")!=="true");const item=options[s.index]||(options.length===1?options[0]:null);if(item)choose(s,item.option);}
 };
 el.addEventListener("change",()=>sync(s));el.addEventListener("invalid",event=>{event.preventDefault();open(s);},true);
 sync(s);
}
function scan(){document.querySelectorAll("select").forEach(enhance);for(const [el,s]of states){if(!el.isConnected){close(s);s.wrap.remove();states.delete(el);}else sync(s);}}
function start(){
 if(!HTMLElement.prototype.showPopover)return;
 const css=document.createElement("style");css.textContent=`
 select.escolha-original{position:absolute!important;opacity:0!important;width:1px!important;height:1px!important;min-height:0!important;padding:0!important;pointer-events:none!important;clip-path:inset(50%)!important}
 .escolha-campo{width:100%;min-width:0}
 .escolha-campo[hidden]{display:none!important}
 .escolha-campo .escolha-botao{display:flex!important;justify-content:space-between;align-items:center;gap:10px;width:100%;min-height:40px;padding:9px 12px!important;margin:0!important;border:1px solid #aac3d2!important;border-radius:6px!important;background:#fff!important;color:#18323e!important;clip-path:none!important;box-shadow:none!important;text-transform:none!important;font:14px/1.4 Arial!important;text-align:left;cursor:pointer}
 .escolha-campo .escolha-botao:before,.escolha-campo .escolha-botao:after{display:none!important}
 .escolha-botao span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .escolha-botao:focus-visible{outline:2px solid #008fd0;outline-offset:2px}
 .escolha-botao:disabled{opacity:.55;cursor:default}
 .escolha-painel{position:fixed;inset:auto;margin:0;padding:10px;border:1px solid #c5d9e5;border-radius:8px;background:#fff;color:#18323e;box-shadow:0 8px 30px #18323e30;box-sizing:border-box;overflow:auto;font:14px Arial;z-index:10000}
 .escolha-painel[hidden]{display:none}
 .escolha-painel .escolha-busca{width:100%!important;box-sizing:border-box;min-height:38px!important;height:38px!important;padding:8px 10px!important;margin:0 0 8px!important;border:1px solid #aac3d2!important;border-radius:5px!important;font:14px Arial!important}
 .escolha-opcao{padding:10px;border-radius:4px;cursor:pointer;line-height:1.4;overflow-wrap:anywhere}
 .escolha-opcao:hover,.escolha-opcao.destacada{background:#edf7fc}
 .escolha-opcao[aria-selected=true]{background:#e1f2fb;color:#006b96;font-weight:600}
 .escolha-opcao[aria-disabled=true]{opacity:.5;cursor:default}
 @media print{.escolha-painel{display:none!important}}
 `;document.head.append(css);scan();
 let pending=false;new MutationObserver(()=>{if(!pending){pending=true;queueMicrotask(()=>{pending=false;scan();});}}).observe(document.body,{childList:true,subtree:true});
 setInterval(()=>{if(!document.hidden)for(const s of states.values())sync(s);},500);
 document.addEventListener("pointerdown",e=>{if(active&&!active.wrap.contains(e.target))close(active);},true);
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&active){const s=active;close(s);s.button.focus();}},true);
 document.addEventListener("click",e=>{const label=e.target.closest("label");const s=label?.control&&states.get(label.control);if(s&&!s.wrap.contains(e.target)&&e.target===label){e.preventDefault();open(s);}});
 window.addEventListener("resize",()=>{if(active)position(active);});
 document.addEventListener("scroll",e=>{if(active&&!active.panel.contains(e.target))position(active);},true);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();

/* CALENDARIO_COMPARTILHADO_INICIO */
(function () {
    'use strict';
    const pad = n => String(n).padStart(2, '0');
    const iso = d => `${String(d.getFullYear()).padStart(4, '0')}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    function dataLocal(valor) {
        const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || '');
        if (!partes) return null;
        const d = new Date(2000, 0, 1, 12);
        d.setFullYear(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
        return iso(d) === partes[0] ? d : null;
    }
    function diasMes(ano, mes) {
        const primeiro = new Date(2000, 0, 1, 12); primeiro.setFullYear(ano, mes, 1);
        const inicio = new Date(primeiro); inicio.setDate(1 - primeiro.getDay());
        return Array.from({length: 42}, (_, i) => { const d = new Date(inicio); d.setDate(inicio.getDate() + i); return iso(d); });
    }
    function permitido(dia, min, max) { return (!min || dia >= min.slice(0,10)) && (!max || dia <= max.slice(0,10)); }
    if (typeof document === 'undefined') { module.exports = {dataLocal, diasMes, permitido, iso}; return; }
    let painel, campo, exibido, escolhido, grade, mes, ano, hora, erro, resumo;
    const meses = Array.from({length:12}, (_, i) => new Date(2026,i,1).toLocaleDateString('pt-BR',{month:'long'}));
    function elemento(tag, classe, texto) { const e = document.createElement(tag); if(classe)e.className=classe; if(texto)e.textContent=texto; return e; }
    function botao(texto, acao, rotulo) { const b=elemento('button','',texto); b.type='button'; if(rotulo)b.setAttribute('aria-label',rotulo); b.addEventListener('click',acao); return b; }
    function fechar() { painel.close(); campo?.focus({preventScroll:true}); }
    function gravar(valor) {
        if (!campo || campo.disabled || campo.readOnly) return;
        const antigo=campo.value; campo.value=valor;
        if (valor && (!campo.value || !campo.validity.valid)) { campo.value=antigo; erro.textContent='Escolha uma data e um hor\u00e1rio dentro do intervalo permitido.'; return; }
        campo.dispatchEvent(new Event('input',{bubbles:true})); campo.dispatchEvent(new Event('change',{bubbles:true})); fechar();
    }
    function selecionar(dia) {
        escolhido=dia;
        if(campo.type==='datetime-local'){ renderizar(); hora.focus(); }
        else gravar(dia);
    }
    function navegar(delta) { exibido.setDate(1); exibido.setMonth(exibido.getMonth()+delta); renderizar(); }
    function renderizar(foco) {
        mes.value=String(exibido.getMonth()); ano.value=exibido.getFullYear(); grade.replaceChildren(); erro.textContent='';
        resumo.textContent=(dataLocal(escolhido)||new Date()).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
        const hoje=iso(new Date());
        const dias=diasMes(exibido.getFullYear(),exibido.getMonth());
        const habilitados=dias.filter(d=>permitido(d,campo.min,campo.max));
        const alvo=foco|| (habilitados.includes(escolhido)?escolhido:habilitados.find(d=>dataLocal(d).getMonth()===exibido.getMonth())||habilitados[0]);
        dias.forEach(dia=>{
            const d=dataLocal(dia),b=botao(String(d.getDate()),()=>selecionar(dia),d.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}));
            b.dataset.dia=dia; b.disabled=!permitido(dia,campo.min,campo.max); b.tabIndex=dia===alvo?0:-1;
            b.classList.toggle('fora-mes',d.getMonth()!==exibido.getMonth()); b.classList.toggle('selecionado',dia===escolhido);
            b.setAttribute('aria-pressed',String(dia===escolhido)); if(dia===hoje)b.setAttribute('aria-current','date');
            grade.append(b);
        });
        if(foco)grade.querySelector(`[data-dia="${foco}"]`)?.focus();
    }
    function construir() {
        const estilo=elemento('style'); estilo.textContent=`
        #calendarioLocadora{position:fixed;inset:auto;margin:0;padding:18px;width:340px;max-width:calc(100vw - 24px);max-height:calc(100dvh - 24px);overflow:auto;box-sizing:border-box;background:#f7fafcf5;backdrop-filter:blur(18px);color:#24343d;border:1px solid #d6e0e6;border-radius:14px;box-shadow:0 14px 45px #18374730;font:14px/1.5 'Segoe UI',Arial,sans-serif;z-index:2147483647}
        #calendarioLocadora::backdrop{background:transparent}
        #calendarioLocadora *{box-sizing:border-box}
        #calendarioLocadora .cal-resumo{padding-bottom:14px;margin-bottom:14px;border-bottom:1px solid #dfe6ea;font-size:12px}
        #calendarioLocadora .cal-topo{display:grid;grid-template-columns:1fr 74px 30px 30px;gap:6px;align-items:center;margin-bottom:12px}
        #calendarioLocadora select,#calendarioLocadora input{width:100%;min-width:0;height:34px;min-height:0;padding:4px 6px;margin:0;border:1px solid #ccd9e1;border-radius:6px;background:#fff;color:#24343d;font:13px 'Segoe UI',Arial,sans-serif}
        #calendarioLocadora button{display:inline-flex;align-items:center;justify-content:center;width:auto;min-width:0;min-height:0;height:36px;padding:4px;margin:0;border:1px solid transparent!important;border-radius:50%!important;background:transparent!important;color:#24343d!important;font:13px 'Segoe UI',Arial,sans-serif!important;clip-path:none!important;transform:none!important;text-transform:none!important;letter-spacing:normal!important;box-shadow:none;cursor:pointer;overflow:visible}
        #calendarioLocadora button::before,#calendarioLocadora button::after{display:none!important}
        #calendarioLocadora button:hover{background:#e1edf3!important}
        #calendarioLocadora button:focus-visible,#calendarioLocadora input:focus-visible,#calendarioLocadora select:focus-visible{outline:2px solid #0085b0;outline-offset:2px}
        #calendarioLocadora button:disabled{opacity:.3;cursor:not-allowed}
        #calendarioLocadora .cal-semana,#calendarioLocadora .cal-grade{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
        #calendarioLocadora .cal-semana span{text-align:center;font-size:11px;color:#667985;padding:6px 0}
        #calendarioLocadora .cal-grade button{width:100%;height:36px}
        #calendarioLocadora button.fora-mes{color:#8c9aa2!important}
        #calendarioLocadora button[aria-current=date]{border-color:#1b7889!important;font-weight:700!important}
        #calendarioLocadora button.selecionado{background:#1b7889!important;color:white!important}
        #calendarioLocadora .cal-rodape{display:flex;gap:8px;justify-content:space-between;border-top:1px solid #dfe6ea;padding-top:12px;margin-top:12px}
        #calendarioLocadora .cal-rodape button,#calendarioLocadora .cal-hora button{border-radius:6px!important;padding:6px 10px;border-color:#ccd9e1!important;background:#fff!important}
        #calendarioLocadora .cal-hora{display:flex;align-items:center;gap:8px;margin-top:12px}
        #calendarioLocadora [hidden]{display:none!important}
        #calendarioLocadora .cal-erro{color:#a52b25;font-size:12px;margin-top:8px}
        @media print{#calendarioLocadora{display:none!important}}
        `; document.head.append(estilo);
        painel=elemento('dialog');painel.id='calendarioLocadora';painel.setAttribute('aria-label','Escolher data');
        resumo=elemento('div','cal-resumo');resumo.setAttribute('aria-live','polite');painel.append(resumo);
        const topo=elemento('div','cal-topo');mes=elemento('select');mes.setAttribute('aria-label','M\u00eas');
        meses.forEach((nome,i)=>mes.add(new Option(nome,i)));ano=elemento('input');ano.type='number';ano.min='1';ano.max='9999';ano.setAttribute('aria-label','Ano');
        mes.addEventListener('change',()=>{exibido.setDate(1);exibido.setMonth(Number(mes.value));renderizar();});
        ano.addEventListener('change',()=>{const n=Number(ano.value);if(Number.isInteger(n)&&n>=1&&n<=9999){exibido.setDate(1);exibido.setFullYear(n);renderizar();}});
        topo.append(mes,ano,botao('\u2039',()=>navegar(-1),'M\u00eas anterior'),botao('\u203a',()=>navegar(1),'Pr\u00f3ximo m\u00eas'));painel.append(topo);
        const semana=elemento('div','cal-semana');['Dom','Seg','Ter','Qua','Qui','Sex','S\u00e1b'].forEach(n=>semana.append(elemento('span','',n)));painel.append(semana);
        grade=elemento('div','cal-grade');painel.append(grade);
        grade.addEventListener('keydown',event=>{
            const dia=event.target.dataset.dia;if(!dia)return;
            const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key];const d=dataLocal(dia);
            if(delta!==undefined)d.setDate(d.getDate()+delta);
            else if(event.key==='Home')d.setDate(d.getDate()-d.getDay());
            else if(event.key==='End')d.setDate(d.getDate()+6-d.getDay());
            else if(event.key==='PageUp'||event.key==='PageDown'){d.setDate(1);d.setMonth(d.getMonth()+(event.key==='PageUp'?-1:1));}
            else return;
            event.preventDefault();if(!permitido(iso(d),campo.min,campo.max))return;exibido=d;renderizar(iso(d));
        });
        const linha=elemento('div','cal-hora');hora=elemento('input');hora.type='time';hora.setAttribute('aria-label','Hor\u00e1rio');linha.append(hora,botao('Confirmar',()=>{if(!escolhido||!hora.value){erro.textContent='Selecione a data e o hor\u00e1rio.';return;}gravar(`${escolhido}T${hora.value}`);}));painel.append(linha);
        erro=elemento('div','cal-erro');erro.setAttribute('role','alert');painel.append(erro);
        const rodape=elemento('div','cal-rodape');rodape.append(botao('Hoje',()=>{const hoje=iso(new Date());if(permitido(hoje,campo.min,campo.max)){exibido=new Date();selecionar(hoje);}else erro.textContent='Hoje est\u00e1 fora do intervalo permitido.';}),botao('Limpar',()=>gravar('')),botao('Fechar',fechar));painel.append(rodape);
        painel.addEventListener('click',event=>{if(event.target!==painel)return;const r=painel.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)fechar();});
        document.body.append(painel);
    }
    function abrir(input) {
        if(input.disabled||input.readOnly)return;if(!painel)construir();campo=input;escolhido=input.value.slice(0,10);
        exibido=dataLocal(escolhido)||new Date();if(!escolhido){if(input.min&&iso(exibido)<input.min.slice(0,10))exibido=dataLocal(input.min);if(input.max&&iso(exibido)>input.max.slice(0,10))exibido=dataLocal(input.max);}
        hora.parentElement.hidden=input.type!=='datetime-local';hora.value=input.value.split('T')[1]||'12:00';hora.step=input.step||'60';renderizar();
        painel.showModal();const r=input.getBoundingClientRect(),w=painel.offsetWidth,h=painel.offsetHeight;
        painel.style.left=Math.max(12,Math.min(r.left,window.innerWidth-w-12))+'px';
        painel.style.top=Math.max(12,Math.min(r.bottom+8,window.innerHeight-h-12))+'px';
        (grade.querySelector('[tabindex="0"]')||mes).focus({preventScroll:true});
    }
    const campoData=e=>e instanceof HTMLInputElement&&['date','datetime-local'].includes(e.type)&&!e.closest('#calendarioLocadora');
    function clicouNoCalendario(event) {
        if (!campoData(event.target) || event.target.disabled || event.target.readOnly) return false;
        const r = event.target.getBoundingClientRect();
        return event.clientX >= r.right - 36 && event.clientX <= r.right;
    }
    document.addEventListener('pointerdown', event => {
        if (clicouNoCalendario(event)) event.preventDefault();
    }, true);
    document.addEventListener('click', event => {
        if (clicouNoCalendario(event)) { event.preventDefault(); abrir(event.target); }
    }, true);
    document.addEventListener('keydown', event => {
        if (campoData(event.target) && event.altKey && event.key === 'ArrowDown') {
            event.preventDefault(); abrir(event.target);
        }
    }, true);
    window.addEventListener('resize',()=>{if(painel?.open)fechar();});
}());
