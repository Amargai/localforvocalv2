/**
 * Server-Side Input Validation & Sanitization Helpers
 */

function cleanPhone(value) {
  if (!value) return '';
  return String(value).replace(/\D/g, '').slice(-10);
}

function isValidPhone(phone) {
  const digits = cleanPhone(phone);
  return /^[6-9]\d{9}$/.test(digits);
}

function cleanPin(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, '').slice(0, 6);
  return digits.length === 6 ? digits : null;
}

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

module.exports = {
  cleanPhone,
  isValidPhone,
  cleanPin,
  isValidEmail
};
