function isFourByFour(vehicleType = '') {
  const normalized = vehicleType.toLowerCase();
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

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}plate=${encodeURIComponent(plateNumber)}`;
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
  if (plate) params.append('plate', plate);
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
  if (plate) params.append('plate', plate);
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

  const defaultCode = process.env.RESON8_DEFAULT_COUNTRY_CODE || '+94';
  if (digits.startsWith('0')) {
    return `${defaultCode}${digits.slice(1)}`;
  }

  return `${defaultCode}${digits}`;
}

module.exports = {
  buildCustomerWebsiteUrl,
  buildFeedbackUrl,
  buildPaymentUrl,
  formatPhoneNumber,
  isFourByFour,
};


