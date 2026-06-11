#!/usr/bin/env node
const fetch = globalThis.fetch || require('node-fetch');
const token = process.env.RENDER_TOKEN;
if (!token) { console.error('RENDER_TOKEN required'); process.exit(1); }
const serviceId = 'srv-d8l3fq9kh4rs73fnk3p0';
function mask(s) { if (!s) return null; if (s.length <= 8) return s; return s.slice(0,4) + '…' + s.slice(-4); }
(async () => {
  const res = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars`, { headers: { Authorization: `Bearer ${token}` } });
  const envList = await res.json();
  const envMap = {};
  for (const item of envList) { const ev = item.envVar || item; envMap[ev.key] = ev.value; }
  const keys = ['ADMIN_EMAIL','ADMIN_UID','FIREBASE_API_KEY','VITE_FIREBASE_API_KEY','VITE_FIREBASE_PROJECT_ID','VITE_FIREBASE_AUTH_DOMAIN'];
  const out = {};
  for (const k of keys) { out[k] = mask(envMap[k]); }
  console.log(JSON.stringify(out, null, 2));
})();
