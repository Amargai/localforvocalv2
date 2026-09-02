/**
 * Form Input Validation & Sanitization Helpers
 * Enforces strict, user-friendly field filling across all pages
 */

/**
 * Sanitizes input to pure digits, max 10 characters (Indian mobile standard)
 */
export function cleanPhone(value) {
  if (!value) return '';
  return String(value).replace(/\D/g, '').slice(0, 10);
}

/**
 * Validates if phone number is an exact 10-digit number starting with 6, 7, 8, or 9
 */
export function isValidPhone(phone) {
  const digits = cleanPhone(phone);
  return /^[6-9]\d{9}$/.test(digits);
}

/**
 * Sanitizes postal PIN code to pure digits, max 6 characters
 */
export function cleanPin(value) {
  if (!value) return '';
  return String(value).replace(/\D/g, '').slice(0, 6);
}

/**
 * Validates if PIN is an exact 6-digit number
 */
export function isValidPin(pin) {
  const digits = cleanPin(pin);
  return /^\d{6}$/.test(digits);
}

/**
 * Validates standard email address format
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Sanitizes price or numeric input to non-negative numbers
 */
export function cleanPositiveNumber(value) {
  if (value === '' || value === null || value === undefined) return '';
  const num = String(value).replace(/[^0-9.]/g, '');
  // Prevent multiple decimal points
  const parts = num.split('.');
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }
  return num;
}

/**
 * Validates non-empty string with minimum character requirement
 */
export function isValidText(text, minLength = 2) {
  if (!text || typeof text !== 'string') return false;
  return text.trim().length >= minLength;
}

/**
 * Formats a 10-digit number into clean spaced format: "98200 11111"
 */
export function formatPhoneDisplay(phone) {
  const digits = cleanPhone(phone);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}
