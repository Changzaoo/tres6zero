# SIX3 Offline-First Plan

## Current Project Map

- Stack: React 18, Vite, TypeScript, Tailwind, React Router, Zustand, Firebase Auth, custom Express API, Supabase Storage, Firestore via backend.
- Web entrypoints: `apps/web/src/main.tsx`, `apps/web/src/App.tsx`.
- App shell: `apps/web/src/components/layout/AppShell.tsx`.
- Main private routes: dashboard, events, events/new/edit, gravar/operator, videos, templates, leads, billing, settings, support, admin.
- API/auth facade: `apps/web/src/services/authService.ts`.
- Upload facade: `apps/web/src/services/serverMediaService.ts`.
- Critical entity services: `eventService.ts`, `videoService.ts`, `templateService.ts`, `musicService.ts`, `leadService.ts`, `engagementService.ts`.
- Existing PWA pieces: `apps/web/public/sw.js`, `apps/web/public/site.webmanifest`, `apps/web/src/services/pwaService.ts`.
- Important types: `apps/web/src/types/index.ts`.
- Existing offline behavior: cached auth user, localStorage GET cache, service-worker cache for shell/assets/cacheable GET APIs.

## Implementation Strategy

1. Keep current API contracts and UI routes.
2. Add a typed IndexedDB layer under `apps/web/src/offline`.
3. Move offline state, logs, cached responses, local records, files, conflicts and sync queue into IndexedDB.
4. Keep `apiRequest` as the main API facade, but add IndexedDB response caching and queue-friendly network behavior.
5. Make events and videos offline-first because they are the main user-created content surfaces.
6. Make uploads queueable with local Blob storage and placeholder URLs that are replaced after sync.
7. Add global offline UI in the app shell without changing the product layout.
8. Keep the existing manual service worker and improve shell/offline fallback.
9. Add docs and validation gates: typecheck, lint and build.

## Offline Scope In This Pass

- App opens after first online load.
- Navigation shell, static assets and key GET API responses are cached.
- User session falls back to the last cached profile when offline.
- Events can be listed, created, edited, archived/deleted locally and synced later.
- Videos can be listed, created, updated and deleted locally and synced later.
- Uploads can be stored locally as Blobs and retried when the connection returns.
- Templates/music generated catalog responses are cached for offline use.
- Local logs, queue status, retry/cancel and conflict placeholders are available.

## Conflict Policy

- Default: server confirmation wins when queued mutation succeeds.
- If a queued mutation receives a conflict-like response (`409`, `412` or version mismatch metadata), the item is marked as `conflict`.
- Local data is not silently deleted. Tombstones are kept until sync succeeds.
- User-facing resolution is exposed through `ConflictResolutionModal`.

## Safety Rules

- Do not store passwords.
- Do not persist auth tokens inside queue entries or logs.
- Queue entries store endpoint, method, payload and optional local file references only.
- Server remains the source of truth for subscription and permissions when online.
- Offline plan status uses the last verified user profile only as a temporary local allowance.

