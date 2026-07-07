const pool = require('../config/database');

async function runMigration() {
  try {
    console.log('Running cash registers table migration...');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS cash_registers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        opened_by INT NOT NULL,
        closed_by INT DEFAULT NULL,
        opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP NULL DEFAULT NULL,
        status ENUM('open', 'closed') DEFAULT 'open',
        opening_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        closing_balance DECIMAL(10, 2) DEFAULT NULL,
        closed_amount DECIMAL(10, 2) DEFAULT NULL,
        notes TEXT,
        FOREIGN KEY (opened_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(createTableQuery);
    console.log('✅ cash_registers table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
