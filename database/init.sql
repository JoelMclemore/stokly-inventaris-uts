CREATE TABLE IF NOT EXISTS items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sku VARCHAR(32) NOT NULL,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(30) NOT NULL,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_sku (sku),
  KEY idx_name (name),
  KEY idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO items (sku, name, category, stock, price) VALUES
  ('ELK-001', 'Keyboard Mechanical', 'Elektronik', 18, 450000.00),
  ('ELK-002', 'Mouse Wireless', 'Elektronik', 5, 185000.00),
  ('ATK-001', 'Buku Catatan A5', 'ATK', 32, 18000.00),
  ('PRL-001', 'Kursi Kantor Ergonomis', 'Peralatan', 8, 1250000.00),
  ('ATK-002', 'Pulpen Gel Hitam', 'ATK', 0, 6500.00),
  ('ELK-003', 'Flashdisk USB 64GB', 'Elektronik', 12, 95000.00);

