ALTER TABLE clientes
  ADD COLUMN tipo_pessoa VARCHAR(2) NOT NULL DEFAULT 'PF' AFTER id,
  ADD COLUMN razao_social VARCHAR(200) NULL AFTER nome,
  ADD COLUMN nome_fantasia VARCHAR(200) NULL AFTER razao_social,
  ADD COLUMN inscricao_estadual VARCHAR(30) NULL AFTER documento,
  ADD COLUMN responsavel VARCHAR(150) NULL AFTER inscricao_estadual,
  ADD KEY idx_clientes_razao_social (razao_social),
  ADD KEY idx_clientes_nome_fantasia (nome_fantasia),
  ADD KEY idx_clientes_inscricao_estadual (inscricao_estadual);

UPDATE clientes SET tipo_pessoa=CASE WHEN CHAR_LENGTH(documento)=14 THEN 'PJ' ELSE 'PF' END,
  razao_social=CASE WHEN CHAR_LENGTH(documento)=14 THEN nome ELSE NULL END;

ALTER TABLE contrato_historico_contratantes
  ADD COLUMN documento_snapshot VARCHAR(20) NULL AFTER nome_snapshot,
  ADD COLUMN telefone_snapshot VARCHAR(30) NULL AFTER documento_snapshot,
  ADD COLUMN whatsapp_snapshot VARCHAR(30) NULL AFTER telefone_snapshot,
  ADD COLUMN email_snapshot VARCHAR(254) NULL AFTER whatsapp_snapshot;
