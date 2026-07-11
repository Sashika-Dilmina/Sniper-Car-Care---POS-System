const Tesseract = require('tesseract.js');
const path = require('path');

const images = [
  'media__1783438703866.png',
  'media__1783438703902.png',
  'media__1783438704077.png',
  'media__1783438704166.png',
  'media__1783438704207.png'
];

async function run() {
  for (const img of images) {
    const fullPath = path.join('C:/Users/ravin/.gemini/antigravity-ide/brain/7d26d999-48be-4551-8a40-c8e26fec6719', img);
    console.log(`\n==================================================`);
    console.log(`Processing: ${img}`);
    console.log(`==================================================`);
    
    // Attempt with both English and Arabic
    try {
      const { data: { text } } = await Tesseract.recognize(
        fullPath,
        'eng+ara',
        { 
          logger: m => {} 
        }
      );
      console.log(text);
    } catch (err) {
      console.log(`OCR error with eng+ara: ${err.message}. Trying 'eng' only...`);
      try {
        const { data: { text } } = await Tesseract.recognize(
          fullPath,
          'eng',
          { 
            logger: m => {} 
          }
        );
        console.log(text);
      } catch (err2) {
        console.error(`OCR failed completely: ${err2.message}`);
      }
    }
  }
}

run();
