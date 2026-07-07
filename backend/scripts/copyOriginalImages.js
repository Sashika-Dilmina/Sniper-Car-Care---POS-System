const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function copyOriginalImages() {
  try {
    console.log('🚀 Copying original service images to backend uploads...\n');

    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Mapping of source paths to destination filenames
    const imageMapping = [
      {
        src: '../../customer-website-saloon/src/assets/full-service.jpg',
        dest: 'full-service-saloon.jpg',
        serviceName: 'Full Body Service',
        vehicleType: 'Saloon'
      },
      {
        src: '../../customer-website-saloon/src/assets/shampoo-wash.jpg',
        dest: 'shampoo-wash-saloon.jpg',
        serviceName: 'Double Soap', // maps to Double Soap on website
        vehicleType: 'Saloon'
      },
      {
        src: '../../customer-website-saloon/src/assets/shampoo-wash.jpg', // can also map to Ceramic Wash
        dest: 'ceramic-wash-saloon.jpg',
        serviceName: 'Ceramic Wash',
        vehicleType: 'Saloon'
      },
      {
        src: '../../customer-website-saloon/src/assets/shampoo-wash.jpg', // Fallback for body wash
        dest: 'body-wash-saloon.jpg',
        serviceName: 'Body Wash',
        vehicleType: 'Saloon'
      },
      {
        src: '../../customer-website-saloon/src/assets/water-wash.jpg',
        dest: 'water-wash-saloon.jpg',
        serviceName: 'Just Water',
        vehicleType: 'Saloon'
      },
      {
        src: '../../customer-website-4x4/src/assets/services/full-4x4.jpg',
        dest: 'full-service-4x4.jpg',
        serviceName: 'Full Body Service',
        vehicleType: '4x4'
      },
      {
        src: '../../customer-website-4x4/src/assets/services/off-road.jpg',
        dest: 'off-road-4x4.jpg',
        serviceName: 'Double Soap',
        vehicleType: '4x4'
      },
      {
        src: '../../customer-website-4x4/src/assets/services/off-road.jpg', // Fallback for ceramic
        dest: 'ceramic-wash-4x4.jpg',
        serviceName: 'Ceramic Wash',
        vehicleType: '4x4'
      },
      {
        src: '../../customer-website-4x4/src/assets/services/off-road.jpg', // Fallback for body wash
        dest: 'body-wash-4x4.jpg',
        serviceName: 'Body Wash',
        vehicleType: '4x4'
      },
      {
        src: '../../customer-website-4x4/src/assets/services/quick-wash.jpg',
        dest: 'quick-wash-4x4.jpg',
        serviceName: 'Just Water',
        vehicleType: '4x4'
      }
    ];

    for (const item of imageMapping) {
      const srcPath = path.resolve(__dirname, item.src);
      const destPath = path.join(uploadsDir, item.dest);

      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`✅ Copied: ${item.src} -> uploads/${item.dest}`);
        
        // Update the database record
        const imageUrl = `/uploads/${item.dest}`;
        await pool.query(
          'UPDATE products SET image_url = ? WHERE name = ? AND vehicle_type = ? AND category = "Services"',
          [imageUrl, item.serviceName, item.vehicleType]
        );
        console.log(`   Updated DB for service: "${item.serviceName}" (${item.vehicleType})`);
      } else {
        console.warn(`⚠️  Source file not found: ${srcPath}`);
      }
    }

    console.log('\n✨ Done updating default service images!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed copying images:', error);
    process.exit(1);
  }
}

copyOriginalImages();
