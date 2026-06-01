# Security Guide – Tres6Zero

## Environment Variables

Never commit `.env` to git. Copy `.env.example` to `.env` and fill in your values.

Required variables:
- `NGROK_AUTHTOKEN` – your ngrok token from https://dashboard.ngrok.com
- `VITE_FIREBASE_*` – Firebase web config (safe to expose in client code)

## Firebase

1. Enable **Email/Password** authentication in Firebase Console → Authentication → Sign-in methods
2. Enable **Firestore** in Firebase Console → Firestore Database
3. Enable **Storage** in Firebase Console → Storage
4. Copy `firebase.rules.example` → apply rules in Firebase Console
5. Restrict API key in Google Cloud Console → APIs & Services → Credentials

## Storage Rules

Set storage rules to require authentication for uploads and allow public reads.

## Backend

The backend runs locally and is exposed via ngrok. The ngrok URL changes on each restart unless you have a paid plan with a static domain.

Update `PUBLIC_BACKEND_URL` in `.env` when the ngrok URL changes.

## Rotating Credentials

If you accidentally expose any credential:
1. Regenerate the Firebase API key in Google Cloud Console
2. Regenerate ngrok token at https://dashboard.ngrok.com
3. Update `.env` locally
