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
  
  // Find and remove Emirate name from the string
  for (const emirateObj of emiratesList) {
    let found = false;
    for (const keyword of emirateObj.keywords) {
      // 1. Try with word boundary or exact match
      const regexSpaced = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regexSpaced.test(tempStr)) {
        detectedEmirate = emirateObj.name;
        tempStr = tempStr.replace(regexSpaced, '').trim();
        found = true;
        break;
      }
      // 2. Try contiguous match (no spaces)
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
  
  if (tempStr.includes(' ')) {
    const parts = tempStr.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      plateCode = parts[0];
      plateNumber = parts[parts.length - 1];
    } else if (parts.length === 1) {
      tempStr = parts[0];
    }
  }
  
  if (!plateNumber && tempStr) {
    const matchLettersDigits = tempStr.match(/^([A-Z]+)([0-9]+)$/);
    if (matchLettersDigits) {
      plateCode = matchLettersDigits[1];
      plateNumber = matchLettersDigits[2];
    } else {
      if (tempStr.length > 5) {
        plateNumber = tempStr.slice(-5);
        plateCode = tempStr.slice(0, -5);
      } else {
        plateNumber = tempStr;
        plateCode = '';
      }
    }
  }
  
  return { 
    plateCode: plateCode.toUpperCase().trim(), 
    emirate: detectedEmirate, 
    plateNumber: plateNumber.trim() 
  };
}

module.exports = {
  buildCustomerWebsiteUrl,
  buildFeedbackUrl,
  buildPaymentUrl,
  formatPhoneNumber,
  isFourByFour,
  parsePlateComponents,
};


