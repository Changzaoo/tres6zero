#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

const serviceAccountPath = process.argv[2];
const email = process.argv[3];

if (!serviceAccountPath || !email) {
  console.error('Usage: node get-firebase-user.js <serviceAccountJsonPath> <email>');
  process.exit(1);
}

if (!fs.existsSync(serviceAccountPath)) {
  console.error('Service account file not found at:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

admin.auth().getUserByEmail(email)
  .then((userRecord) => {
    console.log(JSON.stringify({ email: userRecord.email, uid: userRecord.uid, emailVerified: userRecord.emailVerified }));
    process.exit(0);
  })
  .catch((err) => {
    if (err && err.code === 'auth/user-not-found') {
      console.log('NO_USER_FOUND');
      process.exit(0);
    }
    console.error('ERROR', err && err.message ? err.message : err);
    process.exit(1);
  });
