const { parsePlateComponents } = require('../utils/customerLinkUtils');

const testCases = [
  // Spaced formats
  { input: "20 Abu Dhabi 10234", expected: { plateCode: "20", emirate: "Abu Dhabi", plateNumber: "10234" } },
  { input: "Abu Dhabi 4 66184", expected: { plateCode: "4", emirate: "Abu Dhabi", plateNumber: "66184" } },
  { input: "A Dubai 92868", expected: { plateCode: "A", emirate: "Dubai", plateNumber: "92868" } },
  
  // Contiguous spaceless OCR formats
  { input: "20ABUDHABI10234", expected: { plateCode: "20", emirate: "Abu Dhabi", plateNumber: "10234" } },
  { input: "ABUDHABI466184", expected: { plateCode: "4", emirate: "Abu Dhabi", plateNumber: "66184" } },
  { input: "ADUBAI92868", expected: { plateCode: "A", emirate: "Dubai", plateNumber: "92868" } },

  // Double-line layout / reversed plate number layout with OCR noise
  { input: "34332 1 ISD S", expected: { plateCode: "1", emirate: "Abu Dhabi", plateNumber: "34332" } }
];

console.log('🏁 Running UAE Plate Parser Tests...\n');

let passed = true;

for (let tc of testCases) {
  const result = parsePlateComponents(tc.input);
  const match = result.plateCode === tc.expected.plateCode &&
                result.emirate === tc.expected.emirate &&
                result.plateNumber === tc.expected.plateNumber;
                
  if (match) {
    console.log(`✅ PASSED: "${tc.input}"`);
    console.log(`   -> Code: "${result.plateCode}", Emirate: "${result.emirate}", Number: "${result.plateNumber}"\n`);
  } else {
    console.log(`❌ FAILED: "${tc.input}"`);
    console.log(`   Expected:`, tc.expected);
    console.log(`   Got:     `, result);
    console.log();
    passed = false;
  }
}

if (passed) {
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
} else {
  console.log('❌ SOME TESTS FAILED. PLEASE REVIEW LOGS.');
}
