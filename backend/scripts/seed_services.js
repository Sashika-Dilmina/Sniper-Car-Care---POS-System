const pool = require('../config/database');

const seedServices = async () => {
  try {
    const services = [
      // Saloon Services
      { name: 'Body Wash', description: 'Basic exterior wash for saloon cars.', category: 'Services', price: 50, stock: 0, image_url: '/uploads/body-wash-saloon.jpg', vehicle_type: 'Saloon' },
      { name: 'Ceramic Wash', description: 'Premium ceramic coating wash for long-lasting shine.', category: 'Services', price: 150, stock: 0, image_url: '/uploads/ceramic-wash-saloon.jpg', vehicle_type: 'Saloon' },
      { name: 'Full Service', description: 'Comprehensive interior and exterior cleaning.', category: 'Services', price: 200, stock: 0, image_url: '/uploads/full-service-saloon.jpg', vehicle_type: 'Saloon' },
      { name: 'Water Wash', description: 'Standard water pressure wash.', category: 'Services', price: 40, stock: 0, image_url: '/uploads/water-wash-saloon.jpg', vehicle_type: 'Saloon' },
      { name: 'Shampoo Wash', description: 'Deep shampoo wash for exterior.', category: 'Services', price: 70, stock: 0, image_url: '/uploads/shampoo-wash-saloon.jpg', vehicle_type: 'Saloon' },
      // 4x4 Services
      { name: 'Body Wash', description: 'Basic exterior wash for 4x4 vehicles.', category: 'Services', price: 60, stock: 0, image_url: '/uploads/body-wash-4x4.jpg', vehicle_type: '4x4' },
      { name: 'Ceramic Wash', description: 'Premium ceramic wash tailored for larger vehicles.', category: 'Services', price: 180, stock: 0, image_url: '/uploads/ceramic-wash-4x4.jpg', vehicle_type: '4x4' },
      { name: 'Full Service', description: 'Complete detail for 4x4 vehicles.', category: 'Services', price: 250, stock: 0, image_url: '/uploads/full-service-4x4.jpg', vehicle_type: '4x4' },
      { name: 'Quick Wash', description: 'Fast exterior cleaning.', category: 'Services', price: 45, stock: 0, image_url: '/uploads/quick-wash-4x4.jpg', vehicle_type: '4x4' },
      { name: 'Off-Road Wash', description: 'Heavy duty mud and dirt removal.', category: 'Services', price: 100, stock: 0, image_url: '/uploads/off-road-4x4.jpg', vehicle_type: '4x4' }
    ];

    for (const s of services) {
      // Check if exists
      const [rows] = await pool.query('SELECT id FROM products WHERE name = ? AND vehicle_type = ? AND category = "Services"', [s.name, s.vehicle_type]);
      if (rows.length === 0) {
        await pool.query(
          'INSERT INTO products (name, description, category, price, stock, image_url, vehicle_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [s.name, s.description, s.category, s.price, s.stock, s.image_url, s.vehicle_type]
        );
        console.log(`Inserted ${s.name} (${s.vehicle_type})`);
      } else {
        // update image url if it was wrong
        await pool.query('UPDATE products SET image_url = ? WHERE id = ?', [s.image_url, rows[0].id]);
        console.log(`Updated image for ${s.name} (${s.vehicle_type})`);
      }
    }
    console.log('Seeding completed.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding services:', error);
    process.exit(1);
  }
};

seedServices();
