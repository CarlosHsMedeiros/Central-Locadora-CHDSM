USE locadora;
CREATE TABLE IF NOT EXISTS migracao_registros (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 origem VARCHAR(40) NOT NULL DEFAULT 'localStorage',
 entidade VARCHAR(40) NOT NULL,
 indice_legado INT UNSIGNED NOT NULL,
 id_legado VARCHAR(191) NULL,
 novo_id BIGINT UNSIGNED NOT NULL,
 payload_hash CHAR(64) NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_migracao_indice(origem,entidade,indice_legado),
 UNIQUE KEY uk_migracao_id(origem,entidade,id_legado),
 KEY idx_migracao_novo(entidade,novo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
