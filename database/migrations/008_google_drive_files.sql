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




