# Security Guide - SIX3°

## Environment Variables

Never commit `.env`, service-account JSON, private keys, API secrets or provider tokens.

`VITE_*` variables are public by design because Vite embeds them in the browser bundle. Use them only for public client configuration:

- `VITE_API_URL`
- `VITE_FIREBASE_*` web app config

Backend-only secrets must be configured only in Render environment variables.

## Firebase

Firebase web config is not a server secret, but the Firebase API key should still be restricted in Google Cloud Console:

1. Restrict allowed HTTP referrers to your Vercel domains and localhost.
2. Enable only the APIs the app needs.
3. Keep Firestore/Storage rules locked down with authentication and ownership checks.

## Vercel

Vercel should deploy only the static frontend from `apps/web/dist`.

Do not add backend secrets to Vercel unless they are required by a serverless function. This project does not deploy the Express backend on Vercel.

## Render

Render hosts the Express backend at `https://six3-api.nexusholding.xyz`.

Configure these in Render:

- `PUBLIC_BACKEND_URL`
- `FRONTEND_URL`
- `CORS_ORIGINS`
- Any future private backend-only credentials

## Credential Rotation

If a real credential is exposed:

1. Revoke or rotate it in the provider dashboard.
2. Remove it from git history if it was committed.
3. Update `.env`, Vercel and Render with the new value.
4. Redeploy both services.
