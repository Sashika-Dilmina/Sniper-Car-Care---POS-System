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

    // Smart Camera Overlay Extraction:
    // Hikvision ANPR cameras often overlay "Plate No.: XXXXX Vehicle Color:" on the image.
    // By removing all spaces, we can catch it even if it breaks across lines.
    const noSpaceText = text.replace(/\s+/g, '');
    const overlayMatch = noSpaceText.match(/PlateNo\.?[:\s]*([A-Za-z0-9\-]+?)(?:Vehicle|Uehicle|Color|Type|Country|Region|Direction|Validity|Size|Province|Category|Plate|Device|Capture|Time|Moving|Camera)/i);
    
    const isPlateCrop = path.basename(filePath).toLowerCase().includes('plate');

    if (overlayMatch && overlayMatch[1] && overlayMatch[1].length >= 3) {
      let extractedFromOverlay = overlayMatch[1].toUpperCase();
      
      // If the camera couldn't read the plate, it outputs "unknown" or "unknoun"
      if (extractedFromOverlay !== 'UNKNOWN' && extractedFromOverlay !== 'UNKNOUN') {
        console.log(`[OCR] 🎯 Successfully extracted plate from Camera AI Overlay: ${extractedFromOverlay}`);
        return extractedFromOverlay;
      } else {
        if (!isPlateCrop) {
          console.warn(`[OCR] Camera AI Overlay reports UNKNOWN on full vehicle picture. Skipping raw OCR fallback to avoid noise.`);
          return null;
        }
        console.warn(`[OCR] Camera AI Overlay reports UNKNOWN. Falling back to raw text extraction...`);
      }
    }

    if (confidence < (process.env.OCR_CONFIDENCE_THRESHOLD || 60)) {
        console.warn(`[OCR] Confidence too low (${confidence}% < ${process.env.OCR_CONFIDENCE_THRESHOLD || 60}%)`);
    }

    // Smart Overlay Boilerplate Filtering:
    // Cameras overlay IP, date, camera name, and labels which confuse Tesseract.
    // We clean the text by stripping these known noise patterns.
    let cleanText = text.toUpperCase();
    cleanText = cleanText.replace(/(?:CAMERA|CAM)\s*\d+/g, '');
    
    const words = cleanText.split(/[\s\n\r]+/).map(w => w.trim()).filter(Boolean);
    const filteredWords = words.filter(word => {
      // 1. Filter IP address
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(word)) return false;
      // 2. Filter date/time (e.g. 2026-07-15, 15:56:49)
      if (/^\d{4}-\d{2}-\d{2}$/.test(word) || /^\d{2}:\d{2}:\d{2}$/.test(word) || /^\d{2}:\d{2}$/.test(word)) return false;
      // 3. Filter other timestamps
      if (/^\d{8,14}$/.test(word)) return false;
      // 4. Filter camera labels
      const noise = [
        'PLATE', 'NO', 'NO.', 'UNKNOWN', 'UNKNONN', 'VEHICLE', 'COLOR', 
        'TYPE', 'CAMERA', 'DEVICE', 'CAM', 'DETECTION', 'PICTURE', 'OVERLAY'
      ];
      if (noise.includes(word) || noise.some(n => word.includes(n))) return false;
      return true;
    });

    let cleanedPlate = filteredWords.join(' ').replace(/[^A-Z0-9\s]/g, '').trim();
    cleanedPlate = cleanedPlate.replace(/\s+/g, ' '); // normalize spaces

    console.log(`[OCR] Cleaned OCR Candidate: "${cleanedPlate}"`);

    // A valid plate candidate should have at least the plate number (digits)
    const digitsCount = (cleanedPlate.match(/\d/g) || []).length;
    if (digitsCount < 3) {
      console.warn(`[OCR] Cleaned candidate does not look like a plate (less than 3 digits): ${cleanedPlate}`);
      return null;
    }

    if (cleanedPlate.length > 30) {
      console.warn(`[OCR] Cleaned candidate too long (noise): ${cleanedPlate.substring(0, 30)}...`);
      return null;
    }

    // Strict UAE Plate Format Validation to filter out random OCR gibberish noise
    const cleanedPlateNoSpace = cleanedPlate.replace(/\s+/g, '');
    const isValidFormat = /^(?:[A-Z]{1,3}|\d{1,2})?\d{3,6}$/.test(cleanedPlateNoSpace);
    if (!isValidFormat) {
      console.warn(`[OCR] Cleaned candidate does not match valid UAE plate format: ${cleanedPlate}`);
      return null;
    }

    console.log(`[OCR] Final Plate: ${cleanedPlate}`);
    return cleanedPlate;
  } catch (error) {
    console.error('[OCR] Error during processing:', error);
    return null;
  }
}

module.exports = { extractPlate };
