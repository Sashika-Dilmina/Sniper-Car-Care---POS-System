function isFourByFour(vehicleType = '') {
  const safeType = vehicleType || '';
  const normalized = safeType.toLowerCase();
  return normalized.includes('4x4') || normalized.includes('4-wheel') || normalized.includes('4wheel');
}

function buildCustomerWebsiteUrl(vehicleType = 'Saloon', plateNumber) {
  const saloonBase =
    process.env.CUSTOMER_WEBSITE_SALOON_URL ||
    process.env.CUSTOMER_WEBSITE_URL ||
    'http://localhost:5174';

  const fourByFourBase =
    process.env.CUSTOMER_WEBSITE_4X4_URL ||
    process.env.CUSTOMER_WEBSITE_URL_4X4 ||
    process.env.CUSTOMER_WEBSITE_URL ||
    'http://localhost:4000';

  const baseUrl = isFourByFour(vehicleType) ? fourByFourBase : saloonBase;
  if (!plateNumber) {
    return baseUrl;
  }

  const cleanPlate = plateNumber.replace(/\s+/g, '');
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}plate=${encodeURIComponent(cleanPlate)}`;
}

function buildFeedbackUrl({ vehicleType = 'Saloon', customerId, plate, orderId }) {
  const saloonBase =
    process.env.CUSTOMER_FEEDBACK_SALOON_URL ||
    (process.env.CUSTOMER_WEBSITE_SALOON_URL || process.env.CUSTOMER_WEBSITE_URL || 'http://localhost:5174') + '/feedback';

  const fourByFourBase =
    process.env.CUSTOMER_FEEDBACK_4X4_URL ||
    (process.env.CUSTOMER_WEBSITE_4X4_URL ||
      process.env.CUSTOMER_WEBSITE_URL_4X4 ||
      process.env.CUSTOMER_WEBSITE_URL ||
      'http://localhost:4000') + '/feedback';

  const baseUrl = isFourByFour(vehicleType) ? fourByFourBase : saloonBase;
  const params = new URLSearchParams();

  if (customerId) params.append('customer_id', customerId);
  if (plate) params.append('plate', plate.replace(/\s+/g, ''));
  if (orderId) params.append('order_id', orderId);

  return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
}

function buildPaymentUrl({ vehicleType = 'Saloon', plate, orderId }) {
  const saloonBase =
    process.env.CUSTOMER_WEBSITE_SALOON_URL ||
    process.env.CUSTOMER_WEBSITE_URL ||
    'http://localhost:5174';

  const fourByFourBase =
    process.env.CUSTOMER_WEBSITE_4X4_URL ||
    process.env.CUSTOMER_WEBSITE_URL_4X4 ||
    process.env.CUSTOMER_WEBSITE_URL ||
    'http://localhost:4000';

  const baseUrl = (isFourByFour(vehicleType) ? fourByFourBase : saloonBase) + '/payment';

  const params = new URLSearchParams();
  if (plate) params.append('plate', plate.replace(/\s+/g, ''));
  if (orderId) params.append('order_id', orderId);

  return `${baseUrl}?${params.toString()}`;
}

function formatPhoneNumber(rawPhone) {
  if (!rawPhone) return null;

  const trimmed = rawPhone.toString().trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('+')) {
    return trimmed.replace(/\s+/g, '');
  }

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('00')) {
    return `+${digits.slice(2)}`;
  }

  const defaultCode = process.env.RESON8_DEFAULT_COUNTRY_CODE || '+971';
  const defaultCodeDigits = defaultCode.replace(/\D/g, '');

  if (digits.startsWith(defaultCodeDigits)) {
    return `+${digits}`;
  }

  if (digits.startsWith('0')) {
    return `${defaultCode}${digits.slice(1)}`;
  }

  return `${defaultCode}${digits}`;
}

function parsePlateComponents(plateStr) {
  if (!plateStr) return { plateCode: '', emirate: '', plateNumber: '' };
  
  // Clean string: uppercase, remove special chars, normalize multiple spaces to single space
  const cleanStr = plateStr.trim().toUpperCase().replace(/\s+/g, ' ');
  
  const emiratesList = [
    { name: 'Abu Dhabi', keywords: ['ABUDHABI', 'ABU DHABI', 'AUH'] },
    { name: 'Dubai', keywords: ['DUBAI', 'DXB'] },
    { name: 'Sharjah', keywords: ['SHARJAH', 'SHJ'] },
    { name: 'Ajman', keywords: ['AJMAN', 'AJM'] },
    { name: 'Umm Al Quwain', keywords: ['UMMALQUWAIN', 'UMM AL QUWAIN', 'UAQ'] },
    { name: 'Ras Al Khaimah', keywords: ['RASALKHAIMAH', 'RAS AL KHAIMAH', 'RAK'] },
    { name: 'Fujairah', keywords: ['FUJAIRAH', 'FUJ'] }
  ];
  
  let detectedEmirate = '';
  let tempStr = cleanStr;
  
  // 1. Find and remove Emirate name from the string
  for (const emirateObj of emiratesList) {
    let found = false;
    for (const keyword of emirateObj.keywords) {
      // Try with word boundary or exact match
      const regexSpaced = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regexSpaced.test(tempStr)) {
        detectedEmirate = emirateObj.name;
        tempStr = tempStr.replace(regexSpaced, '').trim();
        found = true;
        break;
      }
      // Try contiguous match (no spaces)
      const cleanTempStr = tempStr.replace(/\s+/g, '');
      if (cleanTempStr.includes(keyword)) {
        detectedEmirate = emirateObj.name;
        const idx = cleanTempStr.indexOf(keyword);
        const partBefore = cleanTempStr.substring(0, idx);
        const partAfter = cleanTempStr.substring(idx + keyword.length);
        tempStr = (partBefore + ' ' + partAfter).trim();
        found = true;
        break;
      }
    }
    if (found) break;
  }
  
  tempStr = tempStr.replace(/\s+/g, ' ').trim();
  
  let plateCode = '';
  let plateNumber = '';

  // 2. Parse remaining string to isolate Plate Number and Plate Code
  // Split remaining string into words
  const words = tempStr.split(' ').filter(Boolean);
  
  if (words.length === 1) {
    const singleWord = words[0];
    const matchLettersDigits = singleWord.match(/^([A-Z]+)([0-9]+)$/);
    if (matchLettersDigits) {
      plateCode = matchLettersDigits[1];
      plateNumber = matchLettersDigits[2];
    } else {
      if (singleWord.length > 5) {
        plateNumber = singleWord.slice(-5);
        plateCode = singleWord.slice(0, -5);
      } else {
        plateNumber = singleWord;
        plateCode = '';
      }
    }
  } else if (words.length >= 2) {
    const numericWords = words.filter(w => /^[0-9]+$/.test(w));
    const alphaWords = words.filter(w => /^[A-Z]+$/.test(w));
    
    if (numericWords.length >= 1) {
      // Sort numeric words by length descending (longest represents plate number, shorter represents plate code)
      numericWords.sort((a, b) => b.length - a.length);
      
      plateNumber = numericWords[0];
      
      if (numericWords.length >= 2) {
        plateCode = numericWords[1];
      } else if (alphaWords.length >= 1) {
        plateCode = alphaWords[0];
      }
    }
  }
  
  // Heuristic: Default Emirate if not matched yet
  if (!detectedEmirate) {
    if (plateCode && /^[0-9]+$/.test(plateCode)) {
      detectedEmirate = 'Abu Dhabi';
    } else if (plateCode && /^[A-Z]+$/.test(plateCode)) {
      detectedEmirate = 'Dubai';
    }
  }
  
  return { 
    plateCode: plateCode.toUpperCase().trim(), 
    emirate: detectedEmirate, 
    plateNumber: plateNumber.trim() 
  };
}

async function findMatchingCustomer(pool, plateStr) {
  if (!plateStr) return null;

  const cleanPlateStr = plateStr.trim().replace(/\s+/g, ' ');
  const spaceLessPlateStr = cleanPlateStr.replace(/\s+/g, '').toUpperCase();

  // 1. Direct exact match on vehicle_plate or VehicleRegistrationNumber (space-insensitive)
  const [exactMatches] = await pool.query(`
    SELECT DISTINCT c.* FROM customers c
    LEFT JOIN vehicles v ON c.id = v.CustomerId
    WHERE c.vehicle_plate = ? 
       OR UPPER(REPLACE(c.vehicle_plate, ' ', '')) = ?
       OR v.VehicleRegistrationNumber = ?
       OR UPPER(REPLACE(v.VehicleRegistrationNumber, ' ', '')) = ?
    LIMIT 1
  `, [cleanPlateStr, spaceLessPlateStr, cleanPlateStr, spaceLessPlateStr]);

  if (exactMatches.length > 0) {
    return exactMatches[0];
  }

  // 2. Component-level Match
  const { plateCode, emirate, plateNumber } = parsePlateComponents(cleanPlateStr);
  if (!plateNumber) return null;

  // Query candidate vehicles matching numeric plate number from vehicles table
  const [vehicles] = await pool.query(`
    SELECT v.*, c.id as cust_id, c.vehicle_plate as cust_vehicle_plate, c.province as cust_province
    FROM vehicles v
    JOIN customers c ON v.CustomerId = c.id
    WHERE v.PlateNumber = ? 
       OR v.VehicleRegistrationNumber = ?
       OR UPPER(REPLACE(v.VehicleRegistrationNumber, ' ', '')) = ?
  `, [plateNumber, cleanPlateStr, spaceLessPlateStr]);

  // Filter candidates strictly by PlateCode and Emirate
  const matchedVehicles = vehicles.filter(v => {
    const vCode = (v.PlateCode || '').toString().trim().toUpperCase();
    const vEmirate = (v.Emirate || v.cust_province || '').toString().trim().toUpperCase();

    // If input has plateCode, candidate's PlateCode must strictly match
    if (plateCode) {
      if (!vCode || vCode !== plateCode.toUpperCase()) {
        // Also check if cust_vehicle_plate has matching plateCode
        const parsedCust = parsePlateComponents(v.cust_vehicle_plate);
        if (!parsedCust.plateCode || parsedCust.plateCode !== plateCode.toUpperCase()) {
          return false;
        }
      }
    }

    // If input has emirate, candidate's Emirate must match
    if (emirate) {
      const inputEmirate = emirate.toUpperCase();
      if (!vEmirate || (!vEmirate.includes(inputEmirate) && !inputEmirate.includes(vEmirate))) {
        const parsedCust = parsePlateComponents(v.cust_vehicle_plate);
        if (!parsedCust.emirate || (!parsedCust.emirate.toUpperCase().includes(inputEmirate) && !inputEmirate.includes(parsedCust.emirate.toUpperCase()))) {
          return false;
        }
      }
    }

    return true;
  });

  if (matchedVehicles.length === 1) {
    const matchedCustId = matchedVehicles[0].cust_id;
    const [custRows] = await pool.query('SELECT * FROM customers WHERE id = ?', [matchedCustId]);
    return custRows[0] || null;
  }

  // 3. Fallback: Search customers table directly by parsing customers.vehicle_plate
  const [allCustomers] = await pool.query(`
    SELECT * FROM customers 
    WHERE vehicle_plate LIKE ? OR vehicle_plate LIKE ?
  `, [`%${plateNumber}%`, `%${spaceLessPlateStr}%`]);

  const candidateCustomers = allCustomers.filter(c => {
    const parsed = parsePlateComponents(c.vehicle_plate || '');
    if (parsed.plateNumber !== plateNumber) return false;
    if (plateCode && parsed.plateCode && parsed.plateCode !== plateCode.toUpperCase()) return false;
    if (emirate && parsed.emirate) {
      const inputEmirate = emirate.toUpperCase();
      const cEmirate = (parsed.emirate || c.province || '').toUpperCase();
      if (!cEmirate.includes(inputEmirate) && !inputEmirate.includes(cEmirate)) return false;
    }
    return true;
  });

  if (candidateCustomers.length === 1) {
    return candidateCustomers[0];
  }

  return null;
}

module.exports = {
  buildCustomerWebsiteUrl,
  buildFeedbackUrl,
  buildPaymentUrl,
  formatPhoneNumber,
  isFourByFour,
  parsePlateComponents,
  findMatchingCustomer,
};



