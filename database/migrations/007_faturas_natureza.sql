ALTER TABLE faturas ADD COLUMN natureza ENUM('Receita','Despesa') NOT NULL DEFAULT 'Receita' AFTER tipo;
