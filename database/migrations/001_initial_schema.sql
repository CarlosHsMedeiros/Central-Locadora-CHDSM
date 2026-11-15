-- Baseline da modelagem. Para uma instalação nova, schema.sql é a fonte canônica:
-- mysql --default-character-set=utf8mb4 -u root -p < database/schema.sql
-- Migrações futuras devem ser 002_..., 003_... e conter apenas alterações incrementais.
CREATE DATABASE IF NOT EXISTS locadora CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
