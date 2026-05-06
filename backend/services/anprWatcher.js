const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const { extractPlate } = require('./ocrService');
const pool = require('../config/database');
const { sendReson8Message } = require('./reson8Service');
const { buildCustomerWebsiteUrl, formatPhoneNumber } = require('../utils/customerLinkUtils');

/**
 * Main detection logic (reused from logic in anprController)
 */
async function handleDetection(plateNumber, imageUrl = null) {
  if (!plateNumber) return;

  console.log(`[ANPR Processor] Processing plate: ${plateNumber}`);

  try {
    // 1. Match with existing customer
    const [customers] = await pool.query(
      'SELECT * FROM customers WHERE vehicle_plate = ?',
      [plateNumber]
    );

    let customerId = null;
    let customer = null;

    if (customers.length > 0) {
      customer = customers[0];
      customerId = customer.id;
      console.log(`[ANPR Processor] Match FOUND: ${customer.name}`);

      // Update last seen
      await pool.query(
        'UPDATE customers SET last_seen = NOW() WHERE id = ?',
        [customerId]
      );

      // 2. Send SMS ONLY if customer exists
      if (customer.phone) {
        try {
          const targetVehicleType = customer.vehicle_type || 'Saloon';
          const formattedPhone = formatPhoneNumber(customer.phone);
          
          if (formattedPhone) {
            const portalUrl = buildCustomerWebsiteUrl(targetVehicleType, plateNumber);
            const firstName = customer.name ? customer.name.split(' ')[0] : 'there';
            const message = `Welcome ${firstName}! Select your service with one tap: ${portalUrl}`;

            await sendReson8Message({
              to: formattedPhone,
              message,
              campaignName: 'ANPR_FTP_AUTO',
              metadata: {
                type: 'welcome',
                plate: plateNumber,
                vehicleType: targetVehicleType
              }
            });
            console.log(`[ANPR Processor] SMS sent to ${customer.name}`);
          }
        } catch (smsError) {
          console.error('[ANPR Processor] SMS sending failed:', smsError.message);
        }
      }
    } else {
      console.log(`[ANPR Processor] No matching customer for plate: ${plateNumber}`);
    }

    // 3. Log the detection (Always save to anpr_logs)
    await pool.query(
      'INSERT INTO anpr_logs (plate_number, camera_id, confidence, image_url, customer_id) VALUES (?, ?, ?, ?, ?)',
      [plateNumber, 'FTP_CAM_01', 100, imageUrl, customerId]
    );

  } catch (error) {
    console.error('[ANPR Processor] Database error:', error);
  }
}

function startFileWatcher() {
  const watchPath = path.resolve(process.cwd(), process.env.FTP_ROOT || './uploads');
  
  // Ensure directory exists
  if (!fs.existsSync(watchPath)) {
    fs.mkdirSync(watchPath, { recursive: true });
  }

  console.log(`[Watcher] Monitoring directory: ${watchPath}`);

  const watcher = chokidar.watch(watchPath, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 3000, // Wait for file to be fully written (3s)
      pollInterval: 100
    }
  });

  watcher.on('add', async (filePath) => {
    const fileName = path.basename(filePath);
    
    // Skip processed files or non-image files
    if (fileName.includes('_processed') || !/\.(jpg|jpeg|png)$/i.test(fileName)) {
      return;
    }

    console.log(`[Watcher] New image detected: ${fileName}`);
    
    try {
      // 1. OCR Extract Plate
      const plateNumber = await extractPlate(filePath);
      
      if (plateNumber) {
        // 2. Process Detection (Match DB -> Send SMS)
        await handleDetection(plateNumber, `/uploads/${fileName}`);
      } else {
        console.warn(`[Watcher] Could not extract plate from ${fileName}`);
      }
    } catch (err) {
      console.error(`[Watcher] Error processing ${fileName}:`, err);
    }
  });

  watcher.on('error', error => console.error(`[Watcher] Watcher error: ${error}`));
}

module.exports = { startFileWatcher };
