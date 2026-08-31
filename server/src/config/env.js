require('dotenv').config();

const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'local_for_vocal_dev_secret_key_default',
  sqlitePath: process.env.SQLITE_PATH || 'server/data/localforvocal.db',
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:3000,http://localhost:5000').split(',').map(s => s.trim())
};

module.exports = config;
