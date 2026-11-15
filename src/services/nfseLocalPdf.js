"use strict";
const PDFDocument=require('pdfkit'),{DOMParser}=require('@xmldom/xmldom');
function render(state){return new Promise((resolve,reject)=>{
 const doc=new DOMParser({onError:()=>{throw Error('INVALID_XML');}}).parseFromString(state.nfseXml,'text/xml');
 const get=(n,root=doc)=>root?.getElementsByTagNameNS('http://www.sped.fazenda.gov.br/nfse',n)[0];
 const text=(n,root=doc)=>get(n,root)?.textContent||'-';const prest=get('emit')||get('prest'),toma=get('toma');
 const pdf=new PDFDocument({size:'A4',margin:45,info:{Title:'Consulta NFS-e '+state.numeroNfse}}),chunks=[];pdf.on('data',x=>chunks.push(x));pdf.on('error',reject);pdf.on('end',()=>resolve(Buffer.concat(chunks)));
 pdf.fontSize(19).text('NFS-e '+state.numeroNfse+' - '+(state.status==='cancelada'?'CANCELADA':'CONSULTA'));
 pdf.moveDown().fontSize(10).text('Representa\u00e7\u00e3o de consulta gerada pelo sistema a partir do XML e dos eventos oficiais. N\u00e3o \u00e9 o DANFSe produzido pelo portal nacional.');
 if(state.config.ambiente!=='1')pdf.moveDown().text('HOMOLOGA\u00c7\u00c3O - SEM VALIDADE FISCAL');
 const row=(label,value)=>{pdf.moveDown(.7).font('Helvetica-Bold').text(label).font('Helvetica').text(String(value));};
 row('Chave de acesso',state.chave);row('Situa\u00e7\u00e3o consultada',state.status==='cancelada'?'CANCELADA':'Autorizada - conforme \u00faltima consulta de eventos');
 if(state.cancelamento){row('Cancelamento confirmado pelo Sistema Nacional',state.cancelamento.data);row('Motivo',state.cancelamento.motivo);}
 row('Prestador',text('xNome',prest)+' | CNPJ '+state.config.cnpj);row('Tomador',text('xNome',toma)+' | '+(text('CNPJ',toma)!=='-'?text('CNPJ',toma):text('CPF',toma)));
 row('Compet\u00eancia',text('dCompet'));row('Descri\u00e7\u00e3o do servi\u00e7o',text('xDescServ'));row('Valor do servi\u00e7o',Number(text('vServ')).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}));
 row('Consulta nacional','https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave='+state.chave);row('Gerado em',new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}));pdf.end();
});}
module.exports={render};
