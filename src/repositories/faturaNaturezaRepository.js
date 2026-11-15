const pool=require('../config/database');
let column;
async function hasColumn(c=pool){if(column===undefined){const [rows]=await c.query("SHOW COLUMNS FROM faturas LIKE 'natureza'");column=rows.length>0;}return column;}
function spec(original,available){if(available)return original;const fields={...original.fields};delete fields.natureza;return {...original,fields};}
async function enrich(rows,c=pool){if(await hasColumn(c))return rows;const [stored]=await c.execute("SELECT chave,valor FROM configuracoes WHERE chave LIKE 'fatura:natureza:%'");const map=new Map(stored.map(r=>[r.chave,typeof r.valor==='string'?JSON.parse(r.valor):r.valor]));rows.forEach(r=>r.natureza=map.get('fatura:natureza:'+r.id)?.natureza||'Receita');return rows;}
async function save(id,natureza,user,c){if(await hasColumn(c))return;await c.execute('INSERT INTO configuracoes(chave,valor,updated_by_usuario_id) VALUES(?,?,?) ON DUPLICATE KEY UPDATE valor=VALUES(valor),updated_by_usuario_id=VALUES(updated_by_usuario_id)',['fatura:natureza:'+id,JSON.stringify({natureza:natureza||'Receita'}),user.id]);}
module.exports={hasColumn,spec,enrich,save};
