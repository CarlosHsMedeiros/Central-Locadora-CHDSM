const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../SEGURANCA_INTERFACE.JS'),'utf8').split('/* CALENDARIO_COMPARTILHADO_INICIO */')[1];
const ctx=vm.createContext({module:{exports:{}}});vm.runInContext(source,ctx);const c=ctx.module.exports;
test('calendario usa datas locais e valida anos bissextos',()=>{assert.equal(c.dataLocal('2026-02-30'),null);assert.equal(c.iso(c.dataLocal('2024-02-29')),'2024-02-29');assert.equal(c.iso(c.dataLocal('2026-10-14T15:30')),'2026-10-14');});
test('grade tem seis semanas completas com virada de ano',()=>{const d=c.diasMes(2026,0);assert.equal(d.length,42);assert.equal(d[0],'2025-12-28');assert.equal(d[41],'2026-02-07');assert.equal(c.diasMes(2024,1).filter(d=>d==='2024-02-29').length,1);});
test('limites de data e data/hora sao inclusivos',()=>{assert.equal(c.permitido('2026-10-14','2026-10-14T15:30','2026-10-15T12:00'),true);assert.equal(c.permitido('2026-10-13','2026-10-14',''),false);assert.equal(c.permitido('2026-10-16','','2026-10-15'),false);});
