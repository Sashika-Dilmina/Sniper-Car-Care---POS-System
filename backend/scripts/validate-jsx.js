const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'OrderDetail.jsx');
const content = fs.readFileSync(filePath, 'utf8');

// A simple stack-based parser to track nesting
const lines = content.split('\n');
let openDivs = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Find all opening <div and closing </div tags
  const openMatches = [...line.matchAll(/<div\b/g)];
  const closeMatches = [...line.matchAll(/<\/div>/g)];
  
  openMatches.forEach(() => {
    openDivs.push(i + 1);
  });
  
  closeMatches.forEach(() => {
    if (openDivs.length > 0) {
      openDivs.pop();
    } else {
      console.log(`Extra closing </div> at line ${i + 1}`);
    }
  });
}

console.log(`Unclosed <div> count: ${openDivs.length}`);
if (openDivs.length > 0) {
  console.log('Unclosed <div> lines:', openDivs);
}
