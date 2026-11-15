(function(root) {
  'use strict';
  // Fonte: https://servicos.sp.gov.br/fcarta/1DD2C9F8-815F-49D4-9D47-F09885256ECE
  // Calend?rio conferido em 17/09/2026. Revisar antes de habilitar outro exerc?cio.
  function hoje() { return new Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
  function avaliar(v, exercicio=2026, referencia=hoje()) {
    const placa=String(v.placa||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
    const final=/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placa)?placa.slice(-1):null;
    const base={final,prazo:null,status:'sem_informacao',rotulo:'Sem informação'};
    if(Number(exercicio)!==2026) return {...base,rotulo:'Calendário não validado para este exercício'};
    if(v.ufRegistro && v.ufRegistro!=='SP') return {...base,status:'fora_sp',rotulo:'Fora do calendário SP'};
    if(v.ufRegistro!=='SP'||final===null||!['geral','caminhao'].includes(v.grupoLicenciamento)) return base;
    const meses=v.grupoLicenciamento==='caminhao'?[12,9,9,10,10,10,11,11,11,12]:[12,7,7,8,8,9,9,10,10,11];
    const mes=meses[Number(final)],dia=new Date(Date.UTC(exercicio,mes,0)).getUTCDate();
    base.prazo=exercicio+'-'+String(mes).padStart(2,'0')+'-'+dia;
    const ultimo=Number(v.anoLicenciamento);
    if(!Number.isInteger(ultimo)||ultimo<1900||ultimo>2200) return base;
    if(ultimo>=exercicio) return {...base,status:'licenciado',rotulo:'Licenciado'};
    if(ultimo<exercicio-1) return {...base,status:'vencido',rotulo:'Vencido — exercício anterior pendente'};
    if(referencia>base.prazo) return {...base,status:'vencido',rotulo:'Vencido'};
    return {...base,status:'a_vencer',rotulo:'Pendente dentro do prazo'};
  }
  const api={avaliar,hoje};
  if(typeof module==='object'&&module.exports) module.exports=api; else root.LicenciamentoSP=api;
})(typeof window==='undefined'?globalThis:window);
