const pool = require('../config/database');

async function seed() {
  try {
    const saloonVip = {
      name: 'Saloon VIP Service',
      description: 'Standard Saloon VIP package',
      category: 'VIP',
      price: 95.00,
      stock: 0,
      vehicle_type: 'Saloon',
      purchase_price: 0.00
    };
    const fourByFourVip = {
      name: '4x4 VIP Service',
      description: 'Standard 4x4 VIP package',
      category: 'VIP',
      price: 115.00,
      stock: 0,
      vehicle_type: '4x4',
      purchase_price: 0.00
    };

    const [existingSaloon] = await pool.query('SELECT id FROM products WHERE name = ?', [saloonVip.name]);
    if (existingSaloon.length === 0) {
      await pool.query(
        'INSERT INTO products (name, description, category, price, stock, vehicle_type, purchase_price) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [saloonVip.name, saloonVip.description, saloonVip.category, saloonVip.price, saloonVip.stock, saloonVip.vehicle_type, saloonVip.purchase_price]
      );
      console.log('Added Saloon VIP Service to products table');
    } else {
      console.log('Saloon VIP Service already exists in products table');
    }

    const [existing4x4] = await pool.query('SELECT id FROM products WHERE name = ?', [fourByFourVip.name]);
    if (existing4x4.length === 0) {
      await pool.query(
        'INSERT INTO products (name, description, category, price, stock, vehicle_type, purchase_price) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [fourByFourVip.name, fourByFourVip.description, fourByFourVip.category, fourByFourVip.price, fourByFourVip.stock, fourByFourVip.vehicle_type, fourByFourVip.purchase_price]
      );
      console.log('Added 4x4 VIP Service to products table');
    } else {
      console.log('4x4 VIP Service already exists in products table');
    }

    console.log('VIP products seeding check complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}
seed();
