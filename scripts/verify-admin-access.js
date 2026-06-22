#!/usr/bin/env node
const fs = require('fs');
const fetch = globalThis.fetch || require('node-fetch');
const admin = require('firebase-admin');

const serviceAccountPath = process.argv[2];
const uid = process.argv[3];

if (!serviceAccountPath || !uid) {
  console.error('Usage: node verify-admin-access.js <serviceAccountJsonPath> <uid>');
  process.exit(1);
}
if (!fs.existsSync(serviceAccountPath)) { console.error('Service account not found'); process.exit(1); }
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
(async () => {
  const customToken = await admin.auth().createCustomToken(uid);
  // get API key from Render env vars
  const token = process.env.RENDER_TOKEN;
  if (!token) { console.error('RENDER_TOKEN required to fetch API key'); process.exit(1); }
  const serviceId = 'srv-d8l3fq9kh4rs73fnk3p0';
  const res = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars`, { headers: { Authorization: `Bearer ${token}` } });
  const envList = await res.json();
  const envMap = {};
  for (const item of envList) { const ev = item.envVar || item; envMap[ev.key] = ev.value; }
  const apiKey = envMap['FIREBASE_API_KEY'] || envMap['VITE_FIREBASE_API_KEY'];
  if (!apiKey) { console.error('FIREBASE API KEY not found'); process.exit(1); }

  // Exchange custom token for idToken
  const exchange = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  const exchangeBody = await exchange.json();
  if (!exchange.ok) { console.error('Failed to exchange custom token', exchangeBody); process.exit(1); }
  const idToken = exchangeBody.idToken;
  // call admin session endpoint
  // Generate a device id similar to the client (64 hex chars)
  const crypto = require('crypto');
  const deviceId = crypto.randomBytes(32).toString('hex');
  // Call /api/auth/me to see server's view of the user
  const meResp = await fetch('https://six3-api.nexusholding.xyz/api/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}`, 'X-SIX3-Device-ID': deviceId, 'X-SIX3-Device-Name': 'script' },
  });
  const meBody = await meResp.json();
  console.log('meStatus', meResp.status);
  console.log(JSON.stringify(meBody, null, 2));

  const adminResp = await fetch('https://six3-api.nexusholding.xyz/api/auth/admin/session', {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}`, 'X-SIX3-Device-ID': deviceId, 'X-SIX3-Device-Name': 'script' },
  });
  const adminBody = await adminResp.json();
  console.log('adminSessionStatus', adminResp.status);
  console.log(JSON.stringify(adminBody, null, 2));
})();
