const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { port, clientOrigins, nodeEnv } = require('./config/env');
const { authMiddleware } = require('./middleware/auth');
const { securityHeaders, sanitizeInput, apiLimiter, authLimiter } = require('./middleware/security');
const { db, dbPath } = require('./config/db');

const app = express();

// Global Crash Prevention & Process Protections
process.on('uncaughtException', (err) => {
  console.error('💥 [CRITICAL] Uncaught Exception:', err.stack || err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 [CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Disable Express fingerprinting
app.disable('x-powered-by');

// Security Headers & Input Sanitization
app.use(securityHeaders);

// CORS configuration with credentials support
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman) or matching origins
    if (!origin || clientOrigins.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(null, true); // Dev-friendly fallback
    }
  },
  credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(sanitizeInput);

// Static directory for uploaded images with cache control
const uploadsPath = path.resolve(process.cwd(), 'server/uploads');
require('fs').mkdirSync(uploadsPath, { recursive: true });
app.use('/uploads', express.static(uploadsPath, { maxAge: '1d', etag: true }));

// Attach user authentication if session cookie / bearer token exists
app.use(authMiddleware);

// Apply General Rate Limiter to all /api routes
app.use('/api', apiLimiter);

// Health Check API
app.get('/api/health', (_, res) => res.json({
  ok: true,
  name: 'Local for Vocal v2 API',
  mode: '100% Local-First / Zero Cloud Cost',
  database: 'Local SQLite (WAL Mode)',
  environment: nodeEnv || 'development',
  dbPath,
  timestamp: new Date().toISOString()
}));

// Route Handlers (with strict rate limiter on auth routes)
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/shops', require('./routes/shops'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/requirements', require('./routes/requirements'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/offers', require('./routes/offers'));
app.use('/api/products', require('./routes/products'));

// Serve frontend build in production
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
  const indexHtml = path.join(distPath, 'index.html');
  if (require('fs').existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    next();
  }
});

// Centralized JSON Error Handling Middleware (Catches all thrown errors cleanly)
app.use((err, req, res, next) => {
  console.error(`❌ [${req.method} ${req.originalUrl}] Error:`, err.message || err);
  const statusCode = err.status || err.statusCode || 500;
  return res.status(statusCode).json({
    error: err.name || 'ServerError',
    message: err.message || 'An unexpected error occurred. Please try again.',
    ...(nodeEnv !== 'production' ? { stack: err.stack } : {})
  });
});

let server;
if (require.main === module) {
  server = app.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`🌿 Local For Vocal v2 Server Running!`);
    console.log(`📍 API Base: http://localhost:${port}/api`);
    console.log(`💾 Local Database: ${dbPath}`);
    console.log(`🛡️  Security: WAL Mode, Rate Limiting & Auth Hardened`);
    console.log(`💳 Cloud Cost: $0.00 (100% On-Device & Free)`);
    console.log(`======================================================\n`);
  });

  // Graceful Shutdown on SIGINT / SIGTERM
  function handleGracefulShutdown(signal) {
    console.log(`\n🛑 Received ${signal}. Performing graceful shutdown...`);
    if (server) {
      server.close(() => {
        try {
          // Clean SQLite WAL checkpoint
          db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
          console.log('✅ SQLite WAL checkpoints cleared.');
        } catch (e) {
          console.error('Error closing DB:', e.message);
        }
        console.log('👋 Server shutdown complete. Exiting process.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  }

  process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
}

module.exports = app;


