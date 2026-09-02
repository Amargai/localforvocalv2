const http = require('http');
const app = require('../server/src/server');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../server/src/config/env');
const { db } = require('../server/src/config/db');

let server;
let port;

function startServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      resolve(port);
    });
    server.on('error', reject);
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
}

function request(path, options = {}) {
  const { method = 'GET', body = null, token = null, headers = {} } = options;
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...headers
    };

    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: reqHeaders
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        let parsed = raw;
        try {
          parsed = JSON.parse(raw);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function loginDemoUser(role) {
  const res = await request('/api/auth/demo-login', {
    method: 'POST',
    body: { role }
  });
  if (!res.body || !res.body.token) {
    throw new Error(`Failed to login demo user for role ${role}: ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, user: res.body.user };
}

function createCustomToken(userId, role) {
  return jwt.sign({ sub: userId, role }, jwtSecret, { expiresIn: '1d' });
}

module.exports = {
  startServer,
  stopServer,
  request,
  loginDemoUser,
  createCustomToken,
  db
};
