(function (global) {
  "use strict";
  const apiOrigin = location.port === "5500" ? "http://127.0.0.1:3000" : "";
  async function request(path, options = {}) {
    const headers = { Accept: "application/json", ...(options.headers || {}) };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    let response;
    try { response = await fetch(`${apiOrigin}/api${path}`, { ...options, headers, credentials: "include" }); }
    catch (_) { const error = new Error("Não foi possível conectar ao servidor."); error.code = "NETWORK_ERROR"; throw error; }
    if (response.status === 204) return null;
    const body = await response.json().catch(() => null);
    if (response.status === 404 && !body) { const error = new Error("O servidor do sistema ainda nao esta disponivel nesta hospedagem. Contate o administrador."); error.code = "API_UNAVAILABLE"; error.status = 404; throw error; }
    if (!response.ok) { const error = new Error(body?.error?.message || "A solicitação não pôde ser concluída."); error.status = response.status; error.code = body?.error?.code; error.details = body?.error?.details; throw error; }
    return body;
  }
  global.api = {
    get: (path) => request(path),
    todos: async (path) => {
      const rows=[];let page=1,pages=1;
      do{const result=await request(path+(path.includes("?")?"&":"?")+"page="+page+"&limit=100");rows.push(...(result.data||[]));pages=Math.max(1,Number(result.pagination?.pages)||1);page++;}while(page<=pages);
      return rows;
    },
    post: (path, data, headers) => request(path, { method: "POST", body: JSON.stringify(data), headers }),
    put: (path, data) => request(path, { method: "PUT", body: JSON.stringify(data) }),
    driveConnectUrl: () => `${apiOrigin}/api/drive/oauth/connect`,
    driveFiles: (entityType, entityId) => request(`/drive/files?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`),
    driveUpload: async (entityType, entityId, category, file, label) => {
      const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error("Não foi possível ler o arquivo.")); reader.readAsDataURL(file); });
      return request("/drive/files", { method: "POST", body: JSON.stringify({ entityType, entityId: String(entityId), category, label, file: { name: file.name, type: file.type, data } }) });
    },
    driveContentUrl: (id) => `${apiOrigin}/api/drive/files/${encodeURIComponent(id)}/content`,
    driveDownloadUrl: (id) => `${apiOrigin}/api/drive/files/${encodeURIComponent(id)}/download`,
    driveDelete: (id) => request(`/drive/files/${encodeURIComponent(id)}`, { method: "DELETE" }),
    drivePanel: async (entityType, entityId, host) => {
      host.replaceChildren();
      const title=document.createElement("h3");title.textContent="Arquivos anexados";host.append(title);
      const status=document.createElement("p");status.setAttribute("role","status");host.append(status);
      const list=document.createElement("div");list.className="drive-attachment-list";list.style.cssText="display:grid;gap:10px;margin-top:12px";host.append(list);
      const roles={cliente:["administrador","atendimento"],contrato:["administrador","atendimento","financeiro"],administrativo:["administrador"],manutencao:["administrador","manutenção"]};
      const canWrite=roles[entityType]?.includes(global.usuarioAtual?.perfil);
      if(canWrite){
        const input=document.createElement("input");input.type="file";input.accept=".jpg,.jpeg,.png,.pdf,.mp4,.webm";input.multiple=true;
        const button=document.createElement("button");button.type="button";button.textContent="Enviar arquivos ao Drive";host.insertBefore(input,list);host.insertBefore(button,list);
        button.addEventListener("click",async()=>{if(!input.files.length)return;button.disabled=true;try{if(entityType==="manutencao"){const current=await global.api.driveFiles(entityType,entityId);if(current.data.length+input.files.length>5)throw Error("Cada manutenção pode ter no máximo 5 arquivos.");}for(const file of input.files){await global.ArquivosSeguros.validateFile(file,file.type.startsWith("image/"));await global.api.driveUpload(entityType,entityId,"documentos",file);}input.value="";await refresh();}catch(error){status.textContent=error.message;}finally{button.disabled=false;}});
      }
      const size=value=>{const n=Number(value)||0;return n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(1)} MB`;};
      async function refresh(){status.textContent="Carregando arquivos...";list.replaceChildren();try{const result=await global.api.driveFiles(entityType,entityId);status.textContent=result.data.length?"":"Nenhum arquivo anexado.";for(const file of result.data){const item=document.createElement("article"),icon=document.createElement("span"),details=document.createElement("div"),name=document.createElement("strong"),meta=document.createElement("p"),actions=document.createElement("div"),open=document.createElement("a");item.className="drive-attachment-item";item.style.cssText="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid #d6e2ea;border-radius:8px;background:#fff;min-width:0";icon.textContent=file.mimeType.startsWith("image/")?"IMG":file.mimeType==="application/pdf"?"PDF":"FILE";icon.setAttribute("aria-hidden","true");icon.style.cssText="flex:0 0 36px;width:36px;height:36px;display:grid;place-items:center;border-radius:8px;background:#eaf6fb;color:#078dcc;font-size:11px;font-weight:700";details.style.cssText="flex:1;min-width:0";name.textContent=file.name;name.style.cssText="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#18394d";meta.textContent=`${file.mimeType} | ${size(file.size)} | ${new Date(file.uploadedAt).toLocaleString("pt-BR")}`;meta.style.cssText="margin:4px 0 0;color:#607482;font-size:12px";open.href=global.api.driveContentUrl(file.id);open.target="_blank";open.rel="noopener";open.textContent=file.mimeType==="application/pdf"?"Abrir PDF":"Abrir arquivo";details.append(name,meta,open);item.append(icon,details);if(entityType==="checklist"&&file.mimeType.startsWith("image/")){const image=document.createElement("img");image.src=global.api.driveContentUrl(file.id);image.alt=file.label||file.name;image.loading="lazy";image.style.cssText="width:112px;height:76px;object-fit:cover;border-radius:6px";item.append(image);}actions.style.cssText="display:flex;align-items:center;gap:8px;flex:0 0 auto";const download=document.createElement("a");download.href=global.api.driveDownloadUrl(file.id);download.textContent="Baixar";download.style.cssText="font-size:13px;white-space:nowrap";actions.append(download);if(canWrite){const remove=document.createElement("button");remove.type="button";remove.textContent="Excluir";remove.style.cssText="appearance:none;clip-path:none;transform:none;border:1px solid #c83f4d;border-radius:6px;background:#fff;color:#a52b39;padding:7px 10px;line-height:1.2;font:600 13px Arial,sans-serif;cursor:pointer;white-space:nowrap";remove.addEventListener("click",async()=>{if(confirm(`Excluir ${file.name} do Drive?`)){remove.disabled=true;try{await global.api.driveDelete(file.id);await refresh();}catch(error){status.textContent=error.message;remove.disabled=false;}}});actions.append(remove);}item.append(actions);list.append(item);}}catch(error){status.textContent=error.message;}}
      await refresh();
      return host;
    },
    driveClearLegacy: (entityType, entityId, category) => request("/drive/legacy/clear", { method: "POST", body: JSON.stringify({ entityType, entityId: String(entityId), category }) }),
    delete: (path) => request(path, { method: "DELETE" }),
  };
}(window));



