const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Extract plate number from image file using OCR
 * Includes pre-processing with sharp to improve accuracy
 * @param {string} filePath - Path to the image file
 * @returns {Promise<string|null>} - Extracted plate number
 */
async function extractPlate(filePath) {
  try {
    console.log(`[OCR] Processing file: ${filePath}`);
    
    // Create a temporary path for the processed image
    const processedPath = filePath.replace(/(\.[\w\d]+)$/, '_processed$1');
    
    // Pre-process image to improve OCR accuracy
    // 1. Convert to grayscale 
    // 2. Resize to be larger (helps Tesseract)
    // 3. Normalize contrast
    // 4. Threshold to make it black and white
    await sharp(filePath)
      .grayscale()
      .resize(1000) // Increase size for better character recognition
      .normalize()
      .threshold(150) // Adjust threshold as needed for your specific camera output
      .toFile(processedPath);

    const result = await Tesseract.recognize(
      processedPath,
      process.env.OCR_LANG || 'eng',
      { 
        logger: m => {
          if (m.status === 'recognizing text') {
            // Only log at 25% increments to reduce console spam
            const progress = Math.round(m.progress * 100);
            if (progress % 25 === 0) {
              console.log(`[OCR Progress] ${progress}%`);
            }
          }
        }
      }
    );

    // Cleanup processed file
    if (fs.existsSync(processedPath)) {
      fs.unlinkSync(processedPath);
    }

    const text = result.data.text;
    const confidence = result.data.confidence;

    console.log(`[OCR] Raw text: "${text.trim()}" (Confidence: ${confidence}%)`);

    if (confidence < (process.env.OCR_CONFIDENCE_THRESHOLD || 60)) {
        console.warn(`[OCR] Confidence too low (${confidence}% < ${process.env.OCR_CONFIDENCE_THRESHOLD || 60}%)`);
        // We still try to clean it up and see if it looks like a plate
    }

    // Clean up the text - keep only alphanumeric and remove whitespace
    // Plates usually have letters and numbers
    let plateNumber = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    // Basic validation
    if (plateNumber.length < 3) {
      console.warn(`[OCR] Extracted plate too short: ${plateNumber}`);
      return null;
    }

    // Common OCR mistakes (e.g., '0' for 'O', '1' for 'I') could be handled here if needed
    // But for now, we returning the cleaned string
    
    console.log(`[OCR] Final Plate: ${plateNumber}`);
    return plateNumber;
  } catch (error) {
    console.error('[OCR] Error during processing:', error);
    return null;
  }
}

module.exports = { extractPlate };
