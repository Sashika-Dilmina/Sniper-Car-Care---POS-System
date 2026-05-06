const axios = require('axios');

const DEFAULT_BASE_URL = 'https://www.reson8.ae/rest-api/v1';
const DEFAULT_TIMEOUT = 10000;

function buildClientConfig() {
  const baseUrl = (process.env.RESON8_API_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
  const timeout = Number(process.env.RESON8_TIMEOUT_MS) || DEFAULT_TIMEOUT;
  const apiKey = process.env.RESON8_API_KEY;
  const reson8Id = process.env.RESON8_ID;
  const reson8Token = process.env.RESON8_TOKEN;

  return { baseUrl, timeout, apiKey, reson8Id, reson8Token };
}

async function sendReson8Message({ to, message, sender, campaignName, metadata }) {
  const { baseUrl, timeout, apiKey, reson8Id, reson8Token } = buildClientConfig();

  // Check required authentication headers (Reson8 requires THREE headers)
  if (!apiKey) {
    console.warn('[Reson8] API key is missing. Skipping outbound SMS.');
    return { skipped: true, reason: 'missing_api_key' };
  }

  if (!reson8Id) {
    console.warn('[Reson8] X-Reson8-ID is missing. Skipping outbound SMS.');
    return { skipped: true, reason: 'missing_reson8_id' };
  }

  if (!reson8Token) {
    console.warn('[Reson8] X-Reson8-Token is missing. Skipping outbound SMS.');
    return { skipped: true, reason: 'missing_reson8_token' };
  }

  if (!to) {
    throw new Error('Recipient phone number (to) is required for Reson8 messages.');
  }

  if (!message) {
    throw new Error('Message body is required for Reson8 messages.');
  }

  // Build payload according to Reson8 API documentation
  // Note: "from" address must be pre-registered with Reson8
  // Phone numbers should be in international format without + prefix
  const fromAddress = sender || process.env.RESON8_SENDER_ID || 'SniperCarCare';

  const payload = {
    to: [to.replace(/^\+/, '')], // Reson8 /message/campaign expects an array of recipients
    text: message, // Reson8 uses "text" not "message"
    from: fromAddress,
  };

  // Campaign name is required for /message/campaign endpoint
  payload.name = campaignName || `Campaign_${Date.now()}`; // Reson8 uses "name" for campaign name

  // Campaign type is required (default to Operational)
  payload.type = 'Operational'; // Can be "Marketing" or "Operational"

  // Optional: Enable response tracking for 2-way messaging
  if (process.env.RESON8_ENABLE_RESPONSE_TRACKING === 'true') {
    payload.enableResponseTracking = 'Y';
  }

  // Optional: Enable URL shortening
  if (process.env.RESON8_ENABLE_URL_SHORTENING === 'true') {
    payload.enableURLShortening = 'Y';
  }

  // Use /message/campaign endpoint (as per Reson8 documentation)
  // This endpoint supports both single and bulk messages
  const url = `${baseUrl}/message/campaign`;

  // Reson8 requires THREE security headers for authentication
  // According to Reson8 documentation:
  // 1. X-Reson8-ID: Identifies the API sub-product/connection
  // 2. X-Reson8-Token: Static token associated with the sub-product
  // 3. api-key: Your private API key retrieved from the Reson8 dashboard
  const headers = {
    'Content-Type': 'application/json',
    'X-Reson8-ID': reson8Id,
    'X-Reson8-Token': reson8Token,
    'api-key': apiKey
  };

  try {
    console.log('[Reson8] Sending message:', {
      to: payload.to,
      from: payload.from,
      messageLength: message.length,
      url
    });

    // Debug: Log request details (without exposing full tokens)
    console.log('[Reson8] Request details:', {
      url,
      'X-Reson8-ID': headers['X-Reson8-ID'],
      'X-Reson8-Token': headers['X-Reson8-Token'] ? headers['X-Reson8-Token'].substring(0, 10) + '...' : 'missing',
      'api-key': headers['api-key'] ? headers['api-key'].substring(0, 10) + '...' : 'missing',
      'Content-Type': headers['Content-Type'],
      payload: { ...payload, text: payload.text ? payload.text.substring(0, 50) + '...' : 'missing' }
    });

    const response = await axios.post(url, payload, { headers, timeout });

    // Check errorLevel in response (Reson8 error handling)
    // errorLevel 0 = Success, 9000+ = Various errors
    if (response.data && response.data.errorLevel !== undefined) {
      if (response.data.errorLevel === 0) {
        console.log('[Reson8] ✅ Message sent successfully!');
        console.log('[Reson8] Response:', {
          requestID: response.data.requestID,
          campaignID: response.data.campaignID,
          errorLevel: response.data.errorLevel,
          procResponse: response.data.procResponse
        });
        return response.data;
      } else {
        // Reson8 returned an error
        const errorMsg = response.data.procResponse || `Error level: ${response.data.errorLevel}`;
        console.error('[Reson8] ❌ API returned error:', {
          errorLevel: response.data.errorLevel,
          procResponse: errorMsg,
          requestID: response.data.requestID
        });

        // Check for common errors
        if (errorMsg.includes('Unregistered from-address') || errorMsg.includes('464')) {
          throw new Error('Reson8 Error: Sender ID/from address is not registered. Please register "' + payload.from + '" in Reson8 dashboard first.');
        }

        throw new Error(`Reson8 API error (${response.data.errorLevel}): ${errorMsg}`);
      }
    }

    // If no errorLevel field, assume success
    console.log('[Reson8] ✅ Message sent successfully!');
    console.log('[Reson8] Response:', response.data);
    return response.data;

  } catch (error) {
    const errorData = error.response?.data;
    const errorDetails = {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: errorData,
      message: error.message
    };

    console.error('[Reson8] ❌ Message send failed:', errorDetails);

    // Handle specific Reson8 error codes
    if (errorData && errorData.errorLevel !== undefined) {
      const errorMsg = errorData.procResponse || `Error level: ${errorData.errorLevel}`;

      // Check for common errors
      if (errorData.procResponse && (
        errorData.procResponse.includes('Unregistered from-address') ||
        errorData.procResponse.includes('464'))) {
        throw new Error('Reson8 Error: Sender ID/from address is not registered. Please register it in Reson8 dashboard first.');
      }

      // Handle rate limiting (HTTP 429)
      if (error.response?.status === 429) {
        throw new Error('Reson8 Error: Rate limit exceeded. Please retry with exponential backoff.');
      }

      throw new Error(`Reson8 API error (${errorData.errorLevel}): ${errorMsg}`);
    }

    // Handle HTTP errors
    if (error.response?.status === 401) {
      throw new Error('Reson8 Authentication failed. Please check RESON8_ID, RESON8_TOKEN, and RESON8_API_KEY in .env file.');
    }

    if (error.response?.status === 429) {
      throw new Error('Reson8 Error: Rate limit exceeded. Please retry later.');
    }

    // Fallback mode: If RESON8_FALLBACK_MODE is enabled, log instead of throwing
    if (process.env.RESON8_FALLBACK_MODE === 'true' || process.env.RESON8_FALLBACK_MODE === '1') {
      console.warn('[Reson8] ⚠️  FALLBACK MODE: Logging message instead of sending');
      console.log('[Reson8] 📱 Message that would be sent:');
      console.log(`   To: ${to}`);
      console.log(`   Message: ${message}`);
      console.log(`   From: ${payload.from}`);
      return {
        success: false,
        fallback: true,
        message: 'Message logged (Reson8 error)',
        logged: {
          to,
          message,
          from: payload.from,
          timestamp: new Date().toISOString()
        }
      };
    }

    const errorMsg = errorData?.procResponse ||
      errorData?.message ||
      error.message ||
      'Failed to send message via Reson8.';

    throw new Error(errorMsg);
  }
}

module.exports = {
  sendReson8Message,
};
