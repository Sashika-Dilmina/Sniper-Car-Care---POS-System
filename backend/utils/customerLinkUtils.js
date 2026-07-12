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
  
  const cleanStr = plateStr.trim().replace(/\s+/g, ' ');
  const emiratesList = [
    'dubai',
    'abu dhabi',
    'sharjah',
    'ajman',
    'umm al quwain',
    'ras al khaimah',
    'fujairah'
  ];
  
  let detectedEmirate = '';
  let remainingStr = cleanStr;
  
  for (const emirate of emiratesList) {
    const regex = new RegExp(`\\b${emirate}\\b`, 'i');
    if (regex.test(cleanStr)) {
      detectedEmirate = emirate.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      remainingStr = cleanStr.replace(regex, '').trim().replace(/\s+/g, ' ');
      break;
    }
  }
  
  const parts = remainingStr.split(' ').filter(Boolean);
  let plateCode = '';
  let plateNumber = '';
  
  if (parts.length >= 2) {
    plateCode = parts[0];
    plateNumber = parts[parts.length - 1];
  } else if (parts.length === 1) {
    const part = parts[0];
    const match = part.match(/^([A-Za-z]+)?([0-9]+)$/);
    if (match) {
      plateCode = match[1] || '';
      plateNumber = match[2];
    } else {
      plateNumber = part;
    }
  }
  
  return { plateCode, emirate: detectedEmirate, plateNumber };
}

module.exports = {
  buildCustomerWebsiteUrl,
  buildFeedbackUrl,
  buildPaymentUrl,
  formatPhoneNumber,
  isFourByFour,
  parsePlateComponents,
};


