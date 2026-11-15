function parse(header="") {
  const result=Object.create(null);
  for(const item of header.split(";")){
    const index=item.indexOf("=");if(index<=0)continue;
    try{const key=decodeURIComponent(item.slice(0,index).trim());if(!Object.hasOwn(result,key))result[key]=decodeURIComponent(item.slice(index+1).trim());}catch{/* Ignora cookie malformado sem expor detalhes. */}
  }
  return result;
}
module.exports={parse};
