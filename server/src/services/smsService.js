/**
 * Real-World SMS Gateway Service
 * Supports:
 *  1. Fast2SMS (India Quick SMS)
 *  2. 2Factor.in (India Dedicated OTP)
 *  3. Twilio (Global SMS)
 *  4. Local Fallback (for offline testing)
 */

const https = require('https');
const http = require('http');

/**
 * Send real SMS to mobile phone
 * @param {string} phone - 10-digit mobile number
 * @param {string} otpCode - 6-digit OTP
 */
async function sendRealSMS(phone, otpCode) {
  const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
  const message = `Your Local4Vocal login OTP is ${otpCode}. Valid for 5 minutes. Do not share it with anyone.`;

  // 1. Check Fast2SMS Gateway (India)
  const fast2SmsKey = process.env.FAST2SMS_API_KEY;
  if (fast2SmsKey) {
    try {
      console.log(`📡 [SMS GATEWAY: Fast2SMS] Dispatching OTP to +91-${cleanPhone}...`);
      const result = await sendViaFast2SMS(fast2SmsKey, cleanPhone, otpCode);
      console.log(`✅ [SMS GATEWAY: Fast2SMS] Successfully delivered to +91-${cleanPhone}`);
      return { success: true, provider: 'Fast2SMS', result };
    } catch (err) {
      console.error(`❌ [SMS GATEWAY: Fast2SMS] Error:`, err.message);
    }
  }

  // 2. Check 2Factor.in Gateway (India)
  const twoFactorKey = process.env.TWO_FACTOR_API_KEY;
  if (twoFactorKey) {
    try {
      console.log(`📡 [SMS GATEWAY: 2Factor] Dispatching OTP to +91-${cleanPhone}...`);
      const result = await sendVia2Factor(twoFactorKey, cleanPhone, otpCode);
      console.log(`✅ [SMS GATEWAY: 2Factor] Successfully delivered to +91-${cleanPhone}`);
      return { success: true, provider: '2Factor', result };
    } catch (err) {
      console.error(`❌ [SMS GATEWAY: 2Factor] Error:`, err.message);
    }
  }

  // 3. Check Twilio Gateway (Global)
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
  if (twilioSid && twilioAuth && twilioFrom) {
    try {
      console.log(`📡 [SMS GATEWAY: Twilio] Dispatching SMS to +91${cleanPhone}...`);
      const result = await sendViaTwilio(twilioSid, twilioAuth, twilioFrom, `+91${cleanPhone}`, message);
      console.log(`✅ [SMS GATEWAY: Twilio] Successfully delivered to +91${cleanPhone}`);
      return { success: true, provider: 'Twilio', result };
    } catch (err) {
      console.error(`❌ [SMS GATEWAY: Twilio] Error:`, err.message);
    }
  }

  // 4. Default / Local Terminal Log Mode (When no external API key is in .env)
  console.log(`\n======================================================`);
  console.log(`📲 [LOCAL OTP SERVICE - SERVER TERMINAL]`);
  console.log(`📞 Recipient : +91-${cleanPhone}`);
  console.log(`🔑 OTP CODE  : >>>  ${otpCode}  <<<`);
  console.log(`⏰ Validity  : 5 Minutes`);
  console.log(`💡 (Add FAST2SMS_API_KEY to .env to deliver real SMS to mobile)`);
  console.log(`======================================================\n`);

  return { success: true, provider: 'local', simulated: true };
}

function callFast2SmsRaw(apiKey, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const options = {
      hostname: 'www.fast2sms.com',
      port: 443,
      path: '/dev/bulkV2',
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          if (json.return === true || res.statusCode === 200) {
            resolve(json);
          } else {
            reject(new Error(Array.isArray(json.message) ? json.message.join(', ') : (json.message || 'Fast2SMS error')));
          }
        } catch (e) {
          resolve(raw);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Fast2SMS API integration:
// Automatically tries dedicated 20-paise OTP route (~₹0.20) first;
// If website verification is pending on Fast2SMS, seamlessly uses Quick SMS route 'q'.
async function sendViaFast2SMS(apiKey, phone, otp) {
  // 1. Try cheap dedicated OTP route (~20 paise per SMS)
  try {
    const otpResult = await callFast2SmsRaw(apiKey, {
      route: 'otp',
      variables_values: otp,
      numbers: phone
    });
    if (otpResult && otpResult.return === true) {
      console.log(`💰 [Fast2SMS] Delivered via dedicated OTP route (~₹0.20 per SMS)`);
      return otpResult;
    }
  } catch (err) {
    // Falls back seamlessly if site verification is pending on Fast2SMS
  }

  // 2. Fallback to Quick SMS route 'q'
  return await callFast2SmsRaw(apiKey, {
    route: 'q',
    message: `Your LocalForVocal verification code is ${otp}. Valid for 5 minutes. Do not share it with anyone.`,
    language: 'english',
    flash: 0,
    numbers: phone
  });
}

// 2Factor.in API integration
function sendVia2Factor(apiKey, phone, otp) {
  return new Promise((resolve, reject) => {
    const url = `https://2factor.in/API/V1/${apiKey}/SMS/${phone}/${otp}/Local4Vocal_OTP`;
    https.get(url, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          if (json.Status === 'Success') resolve(json);
          else reject(new Error(json.Details || '2Factor delivery error'));
        } catch (e) {
          resolve(raw);
        }
      });
    }).on('error', reject);
  });
}

// Twilio SMS API integration
function sendViaTwilio(accountSid, authToken, from, to, body) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      From: from,
      To: to,
      Body: body
    }).toString();

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const options = {
      hostname: 'api.twilio.com',
      port: 443,
      path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(json);
          else reject(new Error(json.message || 'Twilio SMS failed'));
        } catch (e) {
          resolve(raw);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

module.exports = { sendRealSMS };
