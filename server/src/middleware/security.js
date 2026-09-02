/**
 * Security & Protection Middleware
 * - Lightweight In-Memory Rate Limiting (Zero external Redis/cloud dependency)
 * - Security Headers (Protection against XSS, Clickjacking, MIME-sniffing)
 * - Request Body & Query Parameter Sanitization
 */

const { nodeEnv } = require('../config/env');

// Memory store for rate limiting
const rateLimitMap = new Map();

// Periodic cleanup of stale rate-limit buckets every 5 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (record.resetTime <= now) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);
if (cleanupInterval.unref) cleanupInterval.unref();

/**
 * Creates a rate-limiting middleware
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Max allowed requests per window
 * @param {string} options.message - Error message when rate limit is exceeded
 */
function createRateLimiter({ windowMs = 60 * 1000, max = 100, message = 'Too many requests. Please try again later.' } = {}) {
  return (req, res, next) => {
    // Determine client IP or Identifier
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
    const key = `${req.baseUrl || req.path}:${ip}`;
    const now = Date.now();

    let record = rateLimitMap.get(key);
    if (!record || record.resetTime <= now) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      rateLimitMap.set(key, record);
    } else {
      record.count += 1;
    }

    // Set RateLimit headers
    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (record.count > max) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message,
        retryAfterSeconds: resetSeconds
      });
    }

    next();
  };
}

// 1. General API Rate Limiter (600 req / 15 min)
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: 'API rate limit exceeded. Please slow down your requests.'
});

// 2. Strict Auth Rate Limiter (brute-force prevention in production, generous in dev/test)
const authLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: nodeEnv === 'production' ? 25 : 500,
  message: 'Too many authentication attempts. Please wait 10 minutes before trying again.'
});

// 3. Security Headers Middleware (Zero-dependency Helmet alternative)
function securityHeaders(req, res, next) {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent Clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Legacy XSS filter protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Strict Transport Security in production
  if (nodeEnv === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Hide server technology
  res.removeHeader('X-Powered-By');

  next();
}

// 4. Request Body & Query Parameter Sanitizer
function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }
  next();
}

function sanitizeObject(obj) {
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') {
      // Trim surrounding whitespace and remove null bytes / dangerous control characters
      obj[key] = val.trim().replace(/\0/g, '');
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      sanitizeObject(val);
    }
  }
}

module.exports = {
  apiLimiter,
  authLimiter,
  securityHeaders,
  sanitizeInput,
  createRateLimiter
};
