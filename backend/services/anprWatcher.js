const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const { extractPlate } = require('./ocrService');
const pool = require('../config/database');
const { sendReson8Message } = require('./reson8Service');
const { buildCustomerWebsiteUrl, formatPhoneNumber, parsePlateComponents, findMatchingCustomer } = require('../utils/customerLinkUtils');

/**
 * Main detection logic (reused from logic in anprController)
 */
async function handleDetection(plateNumber, imageUrl = null) {
  if (!plateNumber) return;

  try {
    // Check if plate has been scanned in the last 5 minutes (prevents duplicate camera triggers)
    const [recentScans] = await pool.query(`
      SELECT id FROM anpr_logs 
      WHERE (plate_number = ? OR REPLACE(plate_number, ' ', '') = REPLACE(?, ' ', '')) 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE) 
      LIMIT 1
    `, [plateNumber, plateNumber]);

    if (recentScans.length > 0) {
      console.log(`[ANPR Watcher] Plate ${plateNumber} already scanned within last 5 minutes. Ignoring duplicate trigger.`);
      return;
    }

    console.log(`[ANPR Processor] Processing plate: ${plateNumber}`);
    // Strict matching on full plate & plate components (Emirate + Code + Number)
    const customer = await findMatchingCustomer(pool, plateNumber);
    let customerId = customer ? customer.id : null;


    if (customer) {
      // Enforce one SMS/scan per customer account/vehicle per 24 hours
      const [recentCustScans] = await pool.query(`
        SELECT id FROM anpr_logs 
        WHERE customer_id = ? 
          AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) 
        LIMIT 1
      `, [customer.id]);

      // Update last seen
      await pool.query(
        'UPDATE customers SET last_seen = NOW() WHERE id = ?',
        [customerId]
      );

      if (recentCustScans.length > 0) {
        console.log(`[ANPR Processor] Customer account ID ${customer.id} already scanned in the last 24 hours. Logging scan but skipping SMS.`);
        const safePlateNumber = plateNumber ? plateNumber.substring(0, 100) : '';
        await pool.query(
          'INSERT INTO anpr_logs (plate_number, camera_id, confidence, image_url, customer_id) VALUES (?, ?, ?, ?, ?)',
          [safePlateNumber, 'FTP_CAM_01', 100, imageUrl, customerId]
        );
        return;
      }

      // To prevent race conditions, log the scan FIRST before starting the slow SMS API call
      const safePlateNumber = plateNumber ? plateNumber.substring(0, 100) : '';
      await pool.query(
        'INSERT INTO anpr_logs (plate_number, camera_id, confidence, image_url, customer_id) VALUES (?, ?, ?, ?, ?)',
        [safePlateNumber, 'FTP_CAM_01', 100, imageUrl, customerId]
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
      return; // Return early to avoid double logging
    } else {
      console.log(`[ANPR Processor] No matching customer for plate: ${plateNumber}`);
    }

    // 3. Log the detection for unmatched vehicles (New Vehicles)
    const safePlateNumber = plateNumber ? plateNumber.substring(0, 100) : '';
    await pool.query(
      'INSERT INTO anpr_logs (plate_number, camera_id, confidence, image_url, customer_id) VALUES (?, ?, ?, ?, ?)',
      [safePlateNumber, 'FTP_CAM_01', 100, imageUrl, customerId]
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
      stabilityThreshold: 300, // Instant trigger as soon as camera finishes image write (300ms)
      pollInterval: 100
    }
  });

  watcher.on('add', async (filePath) => {
    const fileName = path.basename(filePath);
    
    // Skip processed files or non-image files
    if (fileName.includes('_processed') || !/\.(jpg|jpeg|png)$/i.test(fileName)) {
      return;
    }

    // Skip service package configuration images
    if (fileName.startsWith('service_') || fileName.includes('-saloon') || fileName.includes('-4x4')) {
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
