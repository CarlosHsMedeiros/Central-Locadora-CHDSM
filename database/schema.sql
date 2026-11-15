-- Locadora Digital - MySQL 8.0+
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS locadora CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE locadora;

CREATE TABLE usuarios (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, nome VARCHAR(150) NOT NULL,
 usuario VARCHAR(80) NOT NULL, senha_hash VARCHAR(255) NOT NULL COMMENT 'Argon2id ou bcrypt; nunca texto puro',
 cargo VARCHAR(100) NOT NULL, perfil VARCHAR(30) NOT NULL DEFAULT 'consulta', ativo BOOLEAN NOT NULL DEFAULT TRUE,
 ultimo_login_em DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_usuarios_usuario(usuario), KEY idx_usuarios_perfil_ativo(perfil,ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE usuario_permissoes (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, usuario_id BIGINT UNSIGNED NOT NULL, permissao VARCHAR(80) NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_usuario_permissao(usuario_id,permissao),
 CONSTRAINT fk_up_usuario FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE sessoes (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, usuario_id BIGINT UNSIGNED NOT NULL, token_hash CHAR(64) NOT NULL,
 expires_at DATETIME NOT NULL, ultimo_uso_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, ip VARCHAR(45), user_agent VARCHAR(500),
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_sessoes_token(token_hash), KEY idx_sessoes_usuario(usuario_id), KEY idx_sessoes_expira(expires_at),
 CONSTRAINT fk_sessao_usuario FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE clientes (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, tipo_pessoa VARCHAR(2) NOT NULL DEFAULT 'PF', nome VARCHAR(200) NOT NULL,
 razao_social VARCHAR(200), nome_fantasia VARCHAR(200), documento VARCHAR(20) NOT NULL COMMENT 'CPF/CNPJ',
 inscricao_estadual VARCHAR(30), responsavel VARCHAR(150), rg VARCHAR(30), nascimento DATE, telefone VARCHAR(30), whatsapp VARCHAR(30), email VARCHAR(254), cep VARCHAR(10), estado CHAR(2),
 cidade VARCHAR(120), bairro VARCHAR(120), endereco VARCHAR(200), numero VARCHAR(20), complemento VARCHAR(120),
 cnh VARCHAR(30), categoria VARCHAR(10), validade_cnh DATE, situacao VARCHAR(30) NOT NULL DEFAULT 'Ativo', observacoes TEXT,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_clientes_documento(documento), UNIQUE KEY uk_clientes_cnh(cnh), KEY idx_clientes_nome(nome),
 KEY idx_clientes_situacao(situacao), KEY idx_clientes_validade_cnh(validade_cnh), KEY idx_clientes_razao_social(razao_social),
 KEY idx_clientes_nome_fantasia(nome_fantasia), KEY idx_clientes_inscricao_estadual(inscricao_estadual)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE veiculos (
 ano_licenciamento SMALLINT UNSIGNED NULL, uf_registro CHAR(2) NULL, grupo_licenciamento VARCHAR(16) NULL,
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, placa VARCHAR(10) NOT NULL, renavam VARCHAR(20), chassi VARCHAR(30),
 marca VARCHAR(80) NOT NULL, modelo VARCHAR(120) NOT NULL, ano SMALLINT UNSIGNED, cor VARCHAR(40), quilometragem INT UNSIGNED,
 situacao VARCHAR(40) NOT NULL DEFAULT 'Disponível', localizacao VARCHAR(150),
 foto LONGTEXT COMMENT 'Data URL legado; preferir URL de objeto', data_compra DATE, valor_compra DECIMAL(15,2),
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_veiculos_placa(placa), UNIQUE KEY uk_veiculos_renavam(renavam), UNIQUE KEY uk_veiculos_chassi(chassi),
 KEY idx_veiculos_situacao(situacao), KEY idx_veiculos_marca_modelo(marca,modelo),
 CONSTRAINT ck_veiculo_ano CHECK(ano IS NULL OR ano BETWEEN 1900 AND 2200),
 CONSTRAINT ck_veiculo_compra CHECK(valor_compra IS NULL OR valor_compra>=0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE veiculo_custos_anuais (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, veiculo_id BIGINT UNSIGNED NOT NULL, ano SMALLINT UNSIGNED NOT NULL,
 valor DECIMAL(15,2) NOT NULL DEFAULT 0, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_vca_ano(veiculo_id,ano), CONSTRAINT fk_vca_veiculo FOREIGN KEY(veiculo_id) REFERENCES veiculos(id) ON DELETE CASCADE ON UPDATE RESTRICT,
 CONSTRAINT ck_vca_valor CHECK(valor>=0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE contratos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, numero_contrato VARCHAR(60) NOT NULL, cliente_id BIGINT UNSIGNED NOT NULL,
 modalidade VARCHAR(60), data_inicio DATE NOT NULL, data_fim DATE NOT NULL, data_fim_prevista DATE, data_devolucao DATE,
 valor_locacao DECIMAL(15,2) NOT NULL, caucao DECIMAL(15,2) NOT NULL DEFAULT 0, quilometragem_inicial INT UNSIGNED,
 limite_quilometragem INT UNSIGNED, combustivel_retirada VARCHAR(20), combustivel_devolucao VARCHAR(20),
 quilometragem_final INT UNSIGNED, destino_devolucao VARCHAR(150), observacoes_devolucao TEXT,
 status VARCHAR(30) NOT NULL DEFAULT 'Ativo', observacoes TEXT, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_contratos_numero(numero_contrato), KEY idx_contratos_cliente(cliente_id),
 KEY idx_contratos_status_datas(status,data_inicio,data_fim), KEY idx_contratos_devolucao(data_devolucao),
 CONSTRAINT fk_contrato_cliente FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT ck_contrato_valores CHECK(valor_locacao>=0 AND caucao>=0), CONSTRAINT ck_contrato_datas CHECK(data_fim>=data_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE sequencias_documentos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, tipo VARCHAR(40) NOT NULL, ano SMALLINT UNSIGNED NOT NULL,
 ultimo_numero BIGINT UNSIGNED NOT NULL DEFAULT 0, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_sequencia_tipo_ano(tipo,ano)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE contrato_veiculos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, contrato_id BIGINT UNSIGNED NOT NULL, veiculo_id BIGINT UNSIGNED NOT NULL,
 valor_rateado DECIMAL(15,2), created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_cv(contrato_id,veiculo_id), KEY idx_cv_veiculo(veiculo_id),
 CONSTRAINT fk_cv_contrato FOREIGN KEY(contrato_id) REFERENCES contratos(id) ON DELETE CASCADE ON UPDATE RESTRICT,
 CONSTRAINT fk_cv_veiculo FOREIGN KEY(veiculo_id) REFERENCES veiculos(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE contrato_historico_contratantes (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, contrato_id BIGINT UNSIGNED NOT NULL, cliente_id BIGINT UNSIGNED NOT NULL,
 nome_snapshot VARCHAR(200) NOT NULL, documento_snapshot VARCHAR(20), telefone_snapshot VARCHAR(30),
 whatsapp_snapshot VARCHAR(30), email_snapshot VARCHAR(254), data_inicio DATE NOT NULL, data_fim DATE,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_chc_datas(contrato_id,data_inicio,data_fim), KEY idx_chc_cliente(cliente_id),
 CONSTRAINT fk_chc_contrato FOREIGN KEY(contrato_id) REFERENCES contratos(id) ON DELETE CASCADE ON UPDATE RESTRICT,
 CONSTRAINT fk_chc_cliente FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE multas (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, auto_infracao VARCHAR(80) NOT NULL, veiculo_id BIGINT UNSIGNED NOT NULL,
 cliente_id BIGINT UNSIGNED, contrato_id BIGINT UNSIGNED, placa_snapshot VARCHAR(10), orgao VARCHAR(120), codigo VARCHAR(40),
 descricao TEXT, data_infracao DATE NOT NULL, hora_infracao TIME, local_infracao VARCHAR(200), cidade VARCHAR(120), uf CHAR(2),
 valor DECIMAL(15,2) NOT NULL DEFAULT 0, valor_desconto DECIMAL(15,2) NOT NULL DEFAULT 0, vencimento DATE, prazo_condutor DATE,
 pontos TINYINT UNSIGNED NOT NULL DEFAULT 0, situacao VARCHAR(40) NOT NULL DEFAULT 'Pendente', responsavel VARCHAR(150),
 observacoes TEXT, data_cadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_multas_auto(auto_infracao), KEY idx_multas_veiculo(veiculo_id), KEY idx_multas_cliente(cliente_id),
 KEY idx_multas_contrato(contrato_id), KEY idx_multas_status_datas(situacao,data_infracao,vencimento),
 CONSTRAINT fk_multa_veiculo FOREIGN KEY(veiculo_id) REFERENCES veiculos(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT fk_multa_cliente FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE SET NULL ON UPDATE RESTRICT,
 CONSTRAINT fk_multa_contrato FOREIGN KEY(contrato_id) REFERENCES contratos(id) ON DELETE SET NULL ON UPDATE RESTRICT,
 CONSTRAINT ck_multa_valores CHECK(valor>=0 AND valor_desconto>=0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE multa_arquivos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, multa_id BIGINT UNSIGNED NOT NULL, nome VARCHAR(255) NOT NULL,
 tipo_mime VARCHAR(120) NOT NULL, tamanho_bytes BIGINT UNSIGNED, dados LONGTEXT COMMENT 'Data URL legado', url VARCHAR(2048),
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_ma_multa(multa_id), CONSTRAINT fk_ma_multa FOREIGN KEY(multa_id) REFERENCES multas(id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE manutencoes (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, veiculo_id BIGINT UNSIGNED NOT NULL, tipo VARCHAR(80) NOT NULL,
 oficina VARCHAR(150), data_entrada DATE NOT NULL, data_saida DATE, quilometragem INT UNSIGNED,
 valor_pecas DECIMAL(15,2) NOT NULL DEFAULT 0, valor_mao_obra DECIMAL(15,2) NOT NULL DEFAULT 0,
 valor_total DECIMAL(15,2) GENERATED ALWAYS AS(valor_pecas+valor_mao_obra) STORED,
 status VARCHAR(40) NOT NULL DEFAULT 'Agendada', proxima_data DATE, proxima_km INT UNSIGNED, pecas TEXT,
 descricao TEXT NOT NULL, observacoes TEXT, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_manutencao_veiculo(veiculo_id), KEY idx_manutencao_status_datas(status,data_entrada,data_saida),
 KEY idx_manutencao_proxima(proxima_data,proxima_km),
 CONSTRAINT fk_manutencao_veiculo FOREIGN KEY(veiculo_id) REFERENCES veiculos(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT ck_manutencao_valores CHECK(valor_pecas>=0 AND valor_mao_obra>=0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE faturas (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, numero VARCHAR(60) NOT NULL, tipo VARCHAR(40) NOT NULL, natureza ENUM('Receita','Despesa') NOT NULL DEFAULT 'Receita',
 cliente_id BIGINT UNSIGNED NOT NULL, contrato_id BIGINT UNSIGNED, multa_id BIGINT UNSIGNED, descricao TEXT NOT NULL,
 competencia CHAR(7), vencimento DATE NOT NULL, valor_base DECIMAL(15,2) NOT NULL DEFAULT 0, valor DECIMAL(15,2) NOT NULL,
 status VARCHAR(30) NOT NULL DEFAULT 'Pendente', automatica BOOLEAN NOT NULL DEFAULT FALSE,
 reutilizacao_ait_condutor BOOLEAN NOT NULL DEFAULT FALSE, justificativa_ait TEXT, emitido_por_usuario_id BIGINT UNSIGNED,
 emitido_por_snapshot JSON, data_cadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_faturas_numero(numero), KEY idx_faturas_cliente(cliente_id), KEY idx_faturas_contrato(contrato_id),
 KEY idx_faturas_multa(multa_id), KEY idx_faturas_status_vencimento(status,vencimento), KEY idx_faturas_competencia(competencia),
 CONSTRAINT fk_fatura_cliente FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT fk_fatura_contrato FOREIGN KEY(contrato_id) REFERENCES contratos(id) ON DELETE SET NULL ON UPDATE RESTRICT,
 CONSTRAINT fk_fatura_multa FOREIGN KEY(multa_id) REFERENCES multas(id) ON DELETE SET NULL ON UPDATE RESTRICT,
 CONSTRAINT fk_fatura_usuario FOREIGN KEY(emitido_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE RESTRICT,
 CONSTRAINT ck_fatura_valores CHECK(valor_base>=0 AND valor>=0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE fatura_contratos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, fatura_id BIGINT UNSIGNED NOT NULL, contrato_id BIGINT UNSIGNED NOT NULL,
 numero_contrato_snapshot VARCHAR(60), created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_fc(fatura_id,contrato_id), KEY idx_fc_contrato(contrato_id),
 CONSTRAINT fk_fc_fatura FOREIGN KEY(fatura_id) REFERENCES faturas(id) ON DELETE CASCADE ON UPDATE RESTRICT,
 CONSTRAINT fk_fc_contrato FOREIGN KEY(contrato_id) REFERENCES contratos(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE fatura_veiculos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, fatura_id BIGINT UNSIGNED NOT NULL, veiculo_id BIGINT UNSIGNED NOT NULL,
 placa_snapshot VARCHAR(10), modelo_snapshot VARCHAR(200), ano_snapshot SMALLINT UNSIGNED, cor_snapshot VARCHAR(40),
 renavam_snapshot VARCHAR(20), valor DECIMAL(15,2) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_fv(fatura_id,veiculo_id), KEY idx_fv_veiculo(veiculo_id),
 CONSTRAINT fk_fv_fatura FOREIGN KEY(fatura_id) REFERENCES faturas(id) ON DELETE CASCADE ON UPDATE RESTRICT,
 CONSTRAINT fk_fv_veiculo FOREIGN KEY(veiculo_id) REFERENCES veiculos(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT ck_fv_valor CHECK(valor>=0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE pagamentos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, fatura_id BIGINT UNSIGNED NOT NULL, data_pagamento DATE NOT NULL,
 valor DECIMAL(15,2) NOT NULL, forma_pagamento VARCHAR(40), referencia VARCHAR(120), observacoes TEXT,
 registrado_por_usuario_id BIGINT UNSIGNED, estornado BOOLEAN NOT NULL DEFAULT FALSE, estornado_em DATETIME,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_pagamentos_fatura_data(fatura_id,data_pagamento), KEY idx_pagamentos_data(data_pagamento), KEY idx_pagamentos_estornado(estornado),
 CONSTRAINT fk_pagamento_fatura FOREIGN KEY(fatura_id) REFERENCES faturas(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT fk_pagamento_usuario FOREIGN KEY(registrado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE RESTRICT,
 CONSTRAINT ck_pagamento_valor CHECK(valor>0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE checklists (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, veiculo_id BIGINT UNSIGNED NOT NULL, contrato_id BIGINT UNSIGNED,
 tipo VARCHAR(30) NOT NULL, data_checklist DATETIME NOT NULL, km INT UNSIGNED, combustivel VARCHAR(20),
 responsavel VARCHAR(150) NOT NULL, responsavel_usuario_id BIGINT UNSIGNED, observacoes TEXT,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_checklist_veiculo_data(veiculo_id,data_checklist), KEY idx_checklist_contrato(contrato_id), KEY idx_checklist_tipo_data(tipo,data_checklist),
 CONSTRAINT fk_checklist_veiculo FOREIGN KEY(veiculo_id) REFERENCES veiculos(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT fk_checklist_contrato FOREIGN KEY(contrato_id) REFERENCES contratos(id) ON DELETE SET NULL ON UPDATE RESTRICT,
 CONSTRAINT fk_checklist_usuario FOREIGN KEY(responsavel_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE checklist_itens (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, checklist_id BIGINT UNSIGNED NOT NULL, nome VARCHAR(120) NOT NULL,
 condicao VARCHAR(40) NOT NULL, observacao TEXT, ordem SMALLINT UNSIGNED NOT NULL DEFAULT 0,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_ci_ordem(checklist_id,ordem),
 CONSTRAINT fk_ci_checklist FOREIGN KEY(checklist_id) REFERENCES checklists(id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE checklist_fotos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, checklist_id BIGINT UNSIGNED NOT NULL, campo VARCHAR(120) NOT NULL,
 imagem LONGTEXT COMMENT 'Data URL legado', url VARCHAR(2048), ordem SMALLINT UNSIGNED NOT NULL DEFAULT 0,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_cf_campo(checklist_id,campo),
 CONSTRAINT fk_cf_checklist FOREIGN KEY(checklist_id) REFERENCES checklists(id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE configuracoes (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, chave VARCHAR(120) NOT NULL, valor JSON NOT NULL, descricao VARCHAR(255),
 updated_by_usuario_id BIGINT UNSIGNED, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_config_chave(chave), CONSTRAINT fk_config_usuario FOREIGN KEY(updated_by_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE logs_auditoria (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, usuario_id BIGINT UNSIGNED, acao VARCHAR(80) NOT NULL,
 entidade VARCHAR(80) NOT NULL, entidade_id BIGINT UNSIGNED, dados_anteriores JSON, dados_novos JSON,
 ip VARCHAR(45), user_agent VARCHAR(500), created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_logs_entidade(entidade,entidade_id), KEY idx_logs_usuario_data(usuario_id,created_at), KEY idx_logs_acao_data(acao,created_at),
 CONSTRAINT fk_log_usuario FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE historico_relatorios (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, relatorio VARCHAR(180) NOT NULL, emitido_em DATETIME NOT NULL,
 emitido_por_usuario_id BIGINT UNSIGNED, emitido_por_snapshot VARCHAR(150) NOT NULL, cargo_snapshot VARCHAR(100),
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_hr_emitido(emitido_em), CONSTRAINT fk_hr_usuario FOREIGN KEY(emitido_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE migracao_registros (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, origem VARCHAR(40) NOT NULL DEFAULT 'localStorage',
 entidade VARCHAR(40) NOT NULL, indice_legado INT UNSIGNED NOT NULL, id_legado VARCHAR(191),
 novo_id BIGINT UNSIGNED NOT NULL, payload_hash CHAR(64) NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_migracao_indice(origem,entidade,indice_legado), UNIQUE KEY uk_migracao_id(origem,entidade,id_legado),
 KEY idx_migracao_novo(entidade,novo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS google_drive_files (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 entity_type VARCHAR(40) NOT NULL,
 entity_id BIGINT UNSIGNED NOT NULL,
 category VARCHAR(40) NOT NULL,
 drive_file_id VARCHAR(128) NOT NULL,
 drive_folder_id VARCHAR(128),
 original_name VARCHAR(255) NOT NULL,
 display_name VARCHAR(255) NOT NULL,
 display_label VARCHAR(120),
 mime_type VARCHAR(120) NOT NULL,
 size_bytes BIGINT UNSIGNED NOT NULL,
 content_sha256 CHAR(64) NOT NULL,
 uploaded_by_usuario_id BIGINT UNSIGNED,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_gdf_drive_file(drive_file_id),
 UNIQUE KEY uk_gdf_content(entity_type,entity_id,category,content_sha256),
 KEY idx_gdf_entity_category(entity_type,entity_id,category,id),
 CONSTRAINT fk_gdf_uploader FOREIGN KEY(uploaded_by_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS google_drive_auth (
 id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
 authorized_email VARCHAR(254) NOT NULL,
 encrypted_refresh_token TEXT NOT NULL,
 drive_root_folder_id VARCHAR(128),
 authorized_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT ck_google_drive_auth_singleton CHECK(id=1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;





