const fs = require('fs');
const path = require('path');
const { extractPlate } = require('./services/ocrService');
require('dotenv').config();

/**
 * This script allows you to test the OCR and DB matching logic manually
 * without needing a real camera or FTP client.
 * 
 * Usage: 
 * 1. Place a car plate image in the backend directory named 'test_plate.jpg'
 * 2. Run: node test-ftp-flow.js
 */

async function testFlow() {
  const testImagePath = path.join(__dirname, 'test_plate.jpg');
  const dummyImagePath = path.join(__dirname, 'uploads', 'manual_test_' + Date.now() + '.jpg');

  if (!fs.existsSync(testImagePath)) {
    console.error('❌ Error: Please place a car plate image at "backend/test_plate.jpg" to run this test.');
    process.exit(1);
  }

  // Ensure uploads directory exists
  if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'uploads'));
  }

  console.log('--- Phase 1: OCR Extraction ---');
  const plateNumber = await extractPlate(testImagePath);

  if (!plateNumber) {
    console.error('❌ Failed to extract plate number from image.');
    return;
  }

  console.log(`✅ Extracted Plate: ${plateNumber}`);

  console.log('\n--- Phase 2: Triggering Watcher Logic ---');
  console.log(`Copying image to uploads folder to simulate FTP upload...`);
  fs.copyFileSync(testImagePath, dummyImagePath);
  
  console.log(`✅ File copied to: ${dummyImagePath}`);
  console.log(`The server (if running) or the file watcher should now detect this file and process it.`);
  console.log(`Check your console output where the backend is running to see the matching and SMS logic in action.`);
}

testFlow().catch(console.error);
