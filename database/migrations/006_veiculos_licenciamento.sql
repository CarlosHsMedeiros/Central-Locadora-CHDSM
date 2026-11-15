ALTER TABLE veiculos
 ADD COLUMN ano_licenciamento SMALLINT UNSIGNED NULL,
 ADD COLUMN uf_registro CHAR(2) NULL,
 ADD COLUMN grupo_licenciamento VARCHAR(16) NULL,
 ADD CONSTRAINT ck_veiculo_licenciamento CHECK (ano_licenciamento IS NULL OR ano_licenciamento BETWEEN 1900 AND 2200),
 ADD CONSTRAINT ck_veiculo_grupo_licenciamento CHECK (grupo_licenciamento IS NULL OR grupo_licenciamento IN ('geral','caminhao'));
