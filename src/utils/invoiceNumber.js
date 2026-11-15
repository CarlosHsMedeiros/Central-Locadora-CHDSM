// Sequência global, sem reinício anual. Deve ser chamada dentro da transação da fatura.
async function next(connection){
 await connection.execute("INSERT IGNORE INTO sequencias_documentos(tipo,ano,ultimo_numero) VALUES('fatura_numerica',0,2999)");
 const [[sequence]]=await connection.execute("SELECT ultimo_numero FROM sequencias_documentos WHERE tipo='fatura_numerica' AND ano=0 FOR UPDATE");
 const [[existing]]=await connection.execute("SELECT COALESCE(MAX(CAST(numero AS UNSIGNED)),0) AS maior FROM faturas WHERE numero REGEXP '^[0-9]{1,15}$'");
 const previous=[2999n,BigInt(sequence.ultimo_numero),BigInt(existing.maior)].reduce((a,b)=>a>b?a:b);
 const value=String(previous+1n);
 await connection.execute("UPDATE sequencias_documentos SET ultimo_numero=? WHERE tipo='fatura_numerica' AND ano=0",[value]);
 return value;
}
module.exports={next};
