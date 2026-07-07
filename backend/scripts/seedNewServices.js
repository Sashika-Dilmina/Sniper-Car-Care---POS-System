const pool = require('../config/database');
require('dotenv').config();

async function seedNewServices() {
  try {
    console.log('🚀 Starting to seed new service offerings...\n');

    // 1. Delete all existing products of category 'Services'
    console.log('🗑️  Deleting existing services from products table...');
    await pool.query("DELETE FROM products WHERE category = 'Services'");
    console.log('✅ Deleted.');

    // 2. Delete all existing dummy templates in services table (those with customer_id = NULL)
    console.log('🗑️  Deleting dummy service templates from services table...');
    await pool.query("DELETE FROM services WHERE customer_id IS NULL");
    console.log('✅ Deleted.\n');

    // 3. Define Saloon Services
    const saloonServices = [
      {
        name: 'Full Body Service',
        description: 'Complete interior and exterior detailing.',
        category: 'Services',
        price: 20.00,
        stock: 0,
        vehicle_type: 'Saloon'
      },
      {
        name: 'Double Soap',
        description: 'Double soap foam wash for deep exterior cleaning.',
        category: 'Services',
        price: 25.00,
        stock: 0,
        vehicle_type: 'Saloon'
      },
      {
        name: 'Ceramic Wash',
        description: 'Ceramic infused wash for extra shine and protection.',
        category: 'Services',
        price: 25.00,
        stock: 0,
        vehicle_type: 'Saloon'
      },
      {
        name: 'Body Wash',
        description: 'Standard exterior wash.',
        category: 'Services',
        price: 15.00,
        stock: 0,
        vehicle_type: 'Saloon'
      },
      {
        name: 'Just Water',
        description: 'Quick exterior rinse with water.',
        category: 'Services',
        price: 5.00,
        stock: 0,
        vehicle_type: 'Saloon'
      }
    ];

    // 4. Define 4x4 Services
    const fourByFourServices = [
      {
        name: 'Full Body Service',
        description: 'Complete interior and exterior detailing for your 4x4.',
        category: 'Services',
        price: 25.00,
        stock: 0,
        vehicle_type: '4x4'
      },
      {
        name: 'Double Soap',
        description: 'Double soap foam wash for heavy mud and dirt removal.',
        category: 'Services',
        price: 30.00,
        stock: 0,
        vehicle_type: '4x4'
      },
      {
        name: 'Ceramic Wash',
        description: 'Ceramic infused wash for extra shine and protection.',
        category: 'Services',
        price: 30.00,
        stock: 0,
        vehicle_type: '4x4'
      },
      {
        name: 'Body Wash',
        description: 'Standard exterior wash.',
        category: 'Services',
        price: 20.00,
        stock: 0,
        vehicle_type: '4x4'
      },
      {
        name: 'Just Water',
        description: 'Quick exterior wash with pure water.',
        category: 'Services',
        price: 5.00,
        stock: 0,
        vehicle_type: '4x4'
      }
    ];

    const allServices = [...saloonServices, ...fourByFourServices];

    // 5. Insert services
    console.log('➕ Inserting new services into products table...');
    for (const service of allServices) {
      await pool.query(
        'INSERT INTO products (name, description, category, price, stock, vehicle_type) VALUES (?, ?, ?, ?, ?, ?)',
        [service.name, service.description, service.category, service.price, service.stock, service.vehicle_type]
      );
      console.log(`✅ Seeded: ${service.name} (${service.vehicle_type}) - ${service.price} AED`);
    }

    console.log(`\n✨ Successfully seeded ${allServices.length} service packages!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedNewServices();
