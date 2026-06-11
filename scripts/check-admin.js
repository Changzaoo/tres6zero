#!/usr/bin/env node
const fetch = globalThis.fetch || require('node-fetch');
const token = process.env.RENDER_TOKEN;
if (!token) {
  console.error('RENDER_TOKEN is required');
  process.exit(1);
}
const serviceId = 'srv-d8l3fq9kh4rs73fnk3p0';
(async () => {
  const res = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const envList = await res.json();
  const envMap = {};
  for (const item of envList) {
    const ev = item.envVar || item;
    envMap[ev.key] = ev.value;
  }

  const adminEmail = envMap['ADMIN_EMAIL'];
  const adminUidConfigured = envMap['ADMIN_UID'] || null;
  const apiKey = envMap['FIREBASE_API_KEY'] || envMap['VITE_FIREBASE_API_KEY'] || envMap['VITE_FIREBASE_API_KEY'];

  if (!adminEmail) {
    console.log('NO_ADMIN_EMAIL_CONFIGURED');
    return;
  }
  if (!apiKey) {
    console.log('NO_API_KEY_FOUND');
    return;
  }

  const lookupRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: [adminEmail] }),
  });

  const lookup = await lookupRes.json();
  if (!lookup.users || !lookup.users.length) {
    console.log('NO_USER_FOUND');
    console.log(JSON.stringify(lookup));
    return;
  }

  const user = lookup.users[0];
  // output minimal safe info
  console.log(JSON.stringify({ email: user.email, localId: user.localId, emailVerified: user.emailVerified, configuredAdminUid: adminUidConfigured }));
})().catch((err) => { console.error('ERROR', err && err.message ? err.message : err); process.exit(1); });
