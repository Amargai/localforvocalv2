const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { port, clientOrigins } = require('./config/env');
const { authMiddleware } = require('./middleware/auth');
const { dbPath } = require('./config/db');

const app = express();

// Security & Parsing Middlewares
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static directory for uploaded images
const uploadsPath = path.resolve(process.cwd(), 'server/uploads');
app.use('/uploads', express.static(uploadsPath));

// Attach user authentication if session cookie / bearer token exists
app.use(authMiddleware);

// Health Check API
app.get('/api/health', (_, res) => res.json({
  ok: true,
  name: 'Local for Vocal v2 API',
  mode: '100% Local-First / Zero Cloud Cost',
  database: 'Local SQLite',
  dbPath,
  timestamp: new Date().toISOString()
}));

// Route Handlers
app.use('/api/auth', require('./routes/auth'));
app.use('/api/shops', require('./routes/shops'));
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`\n======================================================`);
  console.log(`🌿 Local For Vocal v2 Server Running!`);
  console.log(`📍 API Base: http://localhost:${port}/api`);
  console.log(`💾 Local Database: ${dbPath}`);
  console.log(`💳 Cloud Cost: $0.00 (100% On-Device & Free)`);
  console.log(`======================================================\n`);
});
