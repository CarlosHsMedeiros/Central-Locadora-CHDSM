/* Política única para navegador e servidor. Não executa conteúdo de documentos. */
(function(root,factory){const policy=factory();if(typeof module==="object"&&module.exports)module.exports=policy;else root.ArquivosSeguros=policy;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const types=Object.freeze({
jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",pdf:"application/pdf",
mp4:"video/mp4",webm:"video/webm"
});
const MAX=5*1024*1024, IMAGE_MAX=650*1024;
function fail(message){throw new Error(message);}
function extension(name){
 if(typeof name!=="string"||name.length>180||/[\x00-\x1f\x7f<>:"/\\|?*\u202a-\u202e\u2066-\u2069]/.test(name)||/[. ]$/.test(name)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name))fail("Nome de arquivo inválido.");
 const ext=name.split(".").pop().toLowerCase();
 if(!Object.hasOwn(types,ext)||/\.(exe|dll|com|bat|cmd|ps1|js|mjs|html?|svg|php|asp|aspx|scr|vbs|jar|msi|hta)(?:\.|$)/i.test(name))fail("Formato não permitido. Use PDF, JPG, PNG ou vídeo MP4/WebM.");
 return ext;
}
function validateMeta(file,imagesOnly=false){
 const ext=extension(file.name),limit=imagesOnly?IMAGE_MAX:MAX;
 if(imagesOnly&&!["jpg","jpeg","png"].includes(ext))fail("Este campo aceita somente JPG ou PNG.");
 if(!Number.isSafeInteger(file.size)||file.size<=0||file.size>limit)fail(imagesOnly?"A imagem deve ter até 650 KB.":"O arquivo deve ter até 5 MB.");
 const mime=String(file.type||"").toLowerCase();
 if(mime&&mime!=="application/octet-stream"&&mime!==types[ext]&&!(ext==="xml"&&mime==="text/xml"))fail("O tipo do arquivo não corresponde à extensão.");
 return ext;
}
const starts=(b,a)=>a.every((v,i)=>b[i]===v);
function validateBytes(bytes,ext){
 if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>MAX)fail("Tamanho de arquivo inválido.");
 if(!Object.hasOwn(types,ext))fail("Formato não permitido.");
 let valid=false;
 if(ext==="mp4")valid=validMp4(bytes);
 if(ext==="webm")valid=validWebm(bytes);
 if(ext==="jpg"||ext==="jpeg")valid=bytes.length>16&&starts(bytes,[255,216,255])&&bytes[bytes.length-2]===255&&bytes[bytes.length-1]===217;
 if(ext==="png")valid=bytes.length>=45&&starts(bytes,[137,80,78,71,13,10,26,10])&&new TextDecoder().decode(bytes.slice(12,16))==="IHDR"&&new TextDecoder().decode(bytes.slice(-8,-4))==="IEND";
 if(ext==="pdf"){
  const text=new TextDecoder("latin1").decode(bytes);
  valid=/^%PDF-1\.[0-7]|^%PDF-2\.0/.test(text)&&/%%EOF\s*$/.test(text);
  // Escapes hexadecimais também podem representar nomes de ações PDF.
  const normalized=text.replace(/#([0-9a-f]{2})/gi,(_,h)=>String.fromCharCode(parseInt(h,16)));
  if(/\/(?:JavaScript|JS|Launch|OpenAction|AA|EmbeddedFile|RichMedia|XFA)\b/i.test(normalized))fail("PDF com ações ou conteúdo ativo não é permitido.");
 }
 if(ext==="xml"){
  let text;try{text=new TextDecoder("utf-8",{fatal:true}).decode(bytes);}catch{fail("O XML deve usar UTF-8.");}
  if(/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(text))fail("XML com entidades, DTD ou folhas externas não é permitido.");
  valid=/^\s*(?:<\?xml[^?]*\?>\s*)?(?:<!--[\s\S]*?-->\s*)*<[A-Za-z_][\w:.-]*(?:\s|>|\/)/.test(text);
  if(typeof DOMParser!=="undefined")valid=valid&&!new DOMParser().parseFromString(text,"application/xml").querySelector("parsererror");
 }
 if(ext==="doc"||ext==="xls"){
  valid=bytes.length>=512&&starts(bytes,[208,207,17,224,161,177,26,225]);
  const names=new TextDecoder("utf-16le").decode(bytes);
  valid=valid&&(ext==="doc"?names.includes("WordDocument"):names.includes("Workbook")||names.includes("Book"));
  if(/VBA|_VBA_PROJECT|Macros|ObjectPool/i.test(names))fail("Documentos com macros ou objetos incorporados não são permitidos.");
 }
 if(ext==="docx"||ext==="xlsx"){
  valid=starts(bytes,[80,75,3,4]);
  if(valid){
   const entries=zipEntries(bytes),names=entries.map(e=>e.name);
   valid=names.includes("[Content_Types].xml")&&names.includes(ext==="docx"?"word/document.xml":"xl/workbook.xml");
   if(names.some(n=>/vbaProject|macrosheets|activeX|embeddings|externalLinks|\.bin$/i.test(n)))fail("Documento Office com macros, objetos ou vínculos ativos não é permitido.");
  }
 }
 if(!valid)fail("O conteúdo do arquivo não corresponde ao formato informado.");
 return types[ext];
}
function validMp4(b){
 const view=new DataView(b.buffer,b.byteOffset,b.byteLength),text=(a,z)=>new TextDecoder().decode(b.slice(a,z));
 let pos=0,ftyp=false,moov=false,mdat=false;
 while(pos<b.length){
  if(pos+8>b.length)return false;
  let size=view.getUint32(pos),head=8;const kind=text(pos+4,pos+8);
  if(size===1){if(pos+16>b.length)return false;const n=view.getBigUint64(pos+8);if(n>BigInt(b.length))return false;size=Number(n);head=16;}
  if(size===0)size=b.length-pos;
  if(size<head||pos+size>b.length)return false;
  if(pos===0&&kind!=="ftyp")return false;
  if(kind==="ftyp"){if(size<head+8)return false;const brands=text(pos+head,pos+size);ftyp=/isom|iso[2-9]|mp4[12]|avc1|M4V /.test(brands);}
  if(kind==="moov")moov=size>head+8;
  if(kind==="mdat")mdat=size>head;
  // Only media container boxes; reject unexpected appended payloads.
  if(!["ftyp","moov","mdat","free","skip","wide","moof","mfra","sidx","styp"].includes(kind))return false;
  pos+=size;
 }
 return ftyp&&moov&&mdat;
}
function validWebm(b){
 function element(pos,end){
  const start=pos;let n=1,mask=128;
  while(n<=4&&!(b[pos]&mask)){n++;mask>>=1;}
  if(n>4||pos+n>=end)return null;
  let id=0;for(let i=0;i<n;i++)id=id*256+b[pos++];
  n=1;mask=128;while(n<=8&&!(b[pos]&mask)){n++;mask>>=1;}
  if(n>8||pos+n>end)return null;
  let size=BigInt(b[pos++]&(mask-1));for(let i=1;i<n;i++)size=size*256n+BigInt(b[pos++]);
  const unknown=size===(1n<<BigInt(7*n))-1n;
  const stop=unknown?end:pos+Number(size);
  if(stop>end||stop<pos||stop<=start)return null;
  return {id,start:pos,end:stop};
 }
 const header=element(0,b.length);if(!header||header.id!==0x1a45dfa3)return false;
 let pos=header.start,doctype=false;
 while(pos<header.end){const e=element(pos,header.end);if(!e)return false;if(e.id===0x4282)doctype=new TextDecoder().decode(b.slice(e.start,e.end))==="webm";pos=e.end;}
 const segment=element(header.end,b.length);if(!doctype||!segment||segment.id!==0x18538067||segment.end!==b.length)return false;
 pos=segment.start;let tracks=false,cluster=false;
 while(pos<segment.end){const e=element(pos,segment.end);if(!e)return false;if(e.id===0x1654ae6b)tracks=e.end>e.start;if(e.id===0x1f43b675)cluster=e.end>e.start;
 if(![0x114d9b74,0x1549a966,0x1654ae6b,0x1f43b675,0x1c53bb6b,0xec,0xbf].includes(e.id))return false;pos=e.end;}
 return tracks&&cluster;
}
function zipEntries(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(view.getUint32(i,true)===0x06054b50){end=i;break;}}
 if(end<0||view.getUint16(end+4,true)||view.getUint16(end+6,true))fail("Documento Office inválido.");
 const count=view.getUint16(end+10,true),size=view.getUint32(end+12,true),offset=view.getUint32(end+16,true);
 if(!count||count>1000||offset+size!==end||end+22+view.getUint16(end+20,true)!==bytes.length)fail("Estrutura Office inválida.");
 const entries=[],seen=new Set();let pos=offset,total=0;
 for(let i=0;i<count;i++){
  if(pos+46>end||view.getUint32(pos,true)!==0x02014b50)fail("Estrutura Office inválida.");
  const flags=view.getUint16(pos+8,true),method=view.getUint16(pos+10,true),compressed=view.getUint32(pos+20,true),uncompressed=view.getUint32(pos+24,true),len=view.getUint16(pos+28,true),extra=view.getUint16(pos+30,true),comment=view.getUint16(pos+32,true),local=view.getUint32(pos+42,true);
  if(pos+46+len+extra+comment>end)fail("Estrutura Office inválida.");
  const name=new TextDecoder("utf-8",{fatal:true}).decode(bytes.slice(pos+46,pos+46+len));
  total+=uncompressed;
  if(flags&1||![0,8].includes(method)||total>20*1024*1024||uncompressed>5*1024*1024||uncompressed>Math.max(1024,compressed*200)||/\\|(^|\/)\.\.?\/|^\/|:/.test(name)||seen.has(name)||local+30>offset)fail("Documento Office protegido, excessivo ou inválido.");
  if(view.getUint32(local,true)!==0x04034b50||view.getUint16(local+6,true)!==flags||view.getUint16(local+8,true)!==method)fail("Estrutura Office inválida.");
  const localLen=view.getUint16(local+26,true),localExtra=view.getUint16(local+28,true),start=local+30+localLen+localExtra;
  if(start+compressed>offset||new TextDecoder().decode(bytes.slice(local+30,local+30+localLen))!==name)fail("Estrutura Office inválida.");
  entries.push({name,method,uncompressed,data:bytes.slice(start,start+compressed)});seen.add(name);pos+=46+len+extra+comment;
 }
 if(pos!==end)fail("Estrutura Office inválida.");
 return entries;
}

function inspectOfficePart(entry,bytes){
 if(bytes.length!==entry.uncompressed)fail("Tamanho interno do documento Office inválido.");
 if(/\.xml$|\.rels$/i.test(entry.name)){
  const xml=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
  if(/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet|TargetMode\s*=\s*["']External|macroEnabled|vbaProject/i.test(xml))fail("Documento Office com conteúdo ativo ou referências externas não é permitido.");
  if(entry.name==="[Content_Types].xml"&&!/application\/vnd\.openxmlformats-officedocument\.(?:wordprocessingml\.document|spreadsheetml\.sheet)\.main\+xml/.test(xml))fail("Tipo interno do documento Office inválido.");
 }
}
function inspectOfficeSync(bytes){
 const zlib=require("node:zlib");
 for(const entry of zipEntries(bytes)){
  const decoded=entry.method===0?entry.data:zlib.inflateRawSync(entry.data,{maxOutputLength:Math.max(1,entry.uncompressed+1)});
  inspectOfficePart(entry,decoded);
 }
}
async function inspectOffice(bytes){
 for(const entry of zipEntries(bytes)){
  let decoded=entry.data;
  if(entry.method===8){
   if(typeof DecompressionStream==="undefined")fail("Este navegador não permite verificar o documento Office.");
   const reader=new Blob([entry.data]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();
   const chunks=[];let size=0;
   try{while(true){const result=await reader.read();if(result.done)break;size+=result.value.length;if(size>entry.uncompressed||size>5*1024*1024)fail("Documento Office descompactado excede o limite.");chunks.push(result.value);}}finally{await reader.cancel();}
   decoded=new Uint8Array(size);let offset=0;for(const chunk of chunks){decoded.set(chunk,offset);offset+=chunk.length;}
  }
  inspectOfficePart(entry,decoded);
 }
}
async function validateStoredFile(value,name){
 const result=validateDataUrl(value,name);
 if(["docx","xlsx"].includes(result.ext)&&typeof module==="undefined")await inspectOffice(result.bytes);
 return result;
}

async function validateFile(file,imagesOnly=false){
 const ext=validateMeta(file,imagesOnly),bytes=new Uint8Array(await file.arrayBuffer());
 validateBytes(bytes,ext);
 if(["docx","xlsx"].includes(ext)){if(typeof module==="object"&&module.exports)inspectOfficeSync(bytes);else await inspectOffice(bytes);}
 return {ext,mime:types[ext],bytes};
}
function decodeDataUrl(value){
 if(typeof value!=="string"||value.length>Math.ceil(MAX/3)*4+150)fail("Anexo excessivo ou inválido.");
 const match=/^data:([a-z0-9.+/-]+);base64,([A-Za-z0-9+/]*={0,2})$/i.exec(value);
 if(!match||match[2].length%4)fail("Anexo inválido.");
 const bytes=typeof Buffer!=="undefined"?new Uint8Array(Buffer.from(match[2],"base64")):Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));
 return {mime:match[1].toLowerCase(),bytes};
}
function validateDataUrl(value,name,imagesOnly=false){
 const decoded=decodeDataUrl(value),ext=validateMeta({name,size:decoded.bytes.length,type:decoded.mime},imagesOnly);
 validateBytes(decoded.bytes,ext);
 if(["docx","xlsx"].includes(ext)&&typeof module==="object"&&module.exports)inspectOfficeSync(decoded.bytes);
 return {...decoded,ext};
}
function imageUrl(value){
 if(!value)return "";
 try{const d=decodeDataUrl(value),ext=d.mime==="image/png"?"png":d.mime==="image/jpeg"?"jpg":"";if(!ext)return "";validateDataUrl(value,"imagem."+ext,true);return value;}catch{return "";}
}
return Object.freeze({types,MAX,IMAGE_MAX,extension,validateMeta,validateBytes,validateFile,validateDataUrl,validateStoredFile,imageUrl,zipEntries,accept:Object.keys(types).map(e=>"."+e).join(",")});
});
