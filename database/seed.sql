USE locadora;
START TRANSACTION;
INSERT INTO configuracoes(chave,valor,descricao) VALUES
('empresa',JSON_OBJECT('nome','CENTRAL LOCADORA','cnpj','','endereco','','textoContrato','','textoContratoHtml','','modeloCompletoContrato',TRUE,'modeloContratoVersao',2,'textoFaturaHtml','','imagemCabecalho',''),'Equivale a configuracoesEmpresa'),
('campos_foto_checklist',JSON_ARRAY('Frente','Traseira','Lateral esquerda','Lateral direita','Painel','Interior','Porta-malas','Motor'),'Equivale a camposFotoChecklist')
ON DUPLICATE KEY UPDATE valor=VALUES(valor),descricao=VALUES(descricao);
-- Gere senha_hash com Argon2id ou bcrypt na aplicação. Nenhuma senha é semeada em texto puro.
COMMIT;
