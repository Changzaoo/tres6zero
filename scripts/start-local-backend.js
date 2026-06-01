#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const token = process.env.NGROK_AUTHTOKEN;
const port = process.env.PORT || 3333;

if (!token || token === 'COLE_SEU_TOKEN_NGROK_AQUI') {
  console.warn('[ngrok] NGROK_AUTHTOKEN não configurado. Pulando ngrok.');
  console.log('[server] Para configurar: edite .env e defina NGROK_AUTHTOKEN');
}

// Start backend server
const server = spawn('npm', ['run', 'dev:server'], {
  stdio: 'inherit',
  shell: true,
  cwd: path.join(__dirname, '..'),
});

server.on('error', (e) => console.error('[server error]', e));

// Start ngrok if token is set
if (token && token !== 'COLE_SEU_TOKEN_NGROK_AQUI') {
  setTimeout(() => {
    const ngrok = spawn('npx', ['ngrok', 'http', String(port), '--authtoken', token], {
      stdio: 'inherit',
      shell: true,
    });
    ngrok.on('error', (e) => console.error('[ngrok error]', e));
  }, 3000);
}

process.on('SIGINT', () => process.exit(0));
