# AI Job Hunter - Frontend

Frontend application for **AI Job Hunter**, built with **SvelteKit**, **TypeScript**, and **Tailwind CSS**. It provides the foundation for automated job applications, Pauli and Kraepelin psychotests, and application tracking.

## Tech stack

- SvelteKit with TypeScript
- Tailwind CSS v4
- Lucide icons (`@lucide/svelte`)
- Svelte stores for authentication and user profile state
- Fetch API for backend requests

## Project structure

```text
src/
├── lib/
│   ├── components/       # Reusable UI components
│   ├── stores/           # Authentication and user stores
│   └── utils/            # API helpers
└── routes/
    ├── auth/             # Login, register, and OAuth callback
    ├── onboarding/       # Onboarding entry and skip confirmation
    ├── psychotest/       # Pauli and Kraepelin test
    ├── dashboard/
    │   ├── onboarding/   # Editable career profile and CV extraction
    │   ├── auto-apply/   # Automated email application history
    │   ├── manual-hub/   # Non-email jobs and direct apply links
    │   └── psychotest/   # Psychotest results
    └── billing/          # Credit top-up and token packages
```

Email/password authentication, Google OAuth, callback handling, and profile loading are connected to the
NestJS REST API. Other backend-dependent workflows may still require their own API integration.
Dashboard routes require a completed onboarding profile; profile extraction and submission use the
`GET onboarding/me`, `POST onboarding/parse-cv`, `POST onboarding/submit`, and
`PUT onboarding/update` API endpoints. CV parsing is requested from the backend; no AI provider key
is sent to or used by the frontend. The onboarding profile endpoint also supplies the user's CV
conversion quota.

## Requirements

- Node.js 24.22.1 (LTS). Versi ini tersimpan di `.nvmrc`, jalankan `nvm use` bila memakai nvm.
- npm 11 (bawaan Node.js 24.22.1)

## Run locally

```bash
npm install
cp .env.example .env
npm run dev -- --open
```

Frontend API URL is selected from `.env` using `IS_PRODUCTION`:

```env
IS_PRODUCTION=false
BACKEND_API_URL_DEV=http://localhost:3000
BACKEND_API_URL_PROD=https://api.example.com
```

The frontend adds `/api` automatically when the configured URL does not already end with it.
When `IS_PRODUCTION=false`, `BACKEND_API_URL_DEV` is used. When `IS_PRODUCTION=true`,
`BACKEND_API_URL_PROD` is used. `PUBLIC_API_URL` is still supported as a fallback for older
deployments.

The backend must allow requests from the frontend origin and redirect Google OAuth back to
`/auth/callback` with an access token in the query string.

## Validate and build

```bash
npm run check
npm test
npm run build
npm run preview
```

The authentication flow tests use Node.js 24's built-in TypeScript support, so no
`--experimental-strip-types` flag is needed.
