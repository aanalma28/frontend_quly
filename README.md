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
    ├── onboarding/       # CV upload and privacy consent
    ├── psychotest/       # Pauli and Kraepelin test
    ├── dashboard/
    │   ├── auto-apply/   # Automated email application history
    │   ├── manual-hub/   # Non-email jobs and direct apply links
    │   └── psychotest/   # Psychotest results
    └── billing/          # Credit top-up and token packages
```

Email/password authentication, Google OAuth, callback handling, and profile loading are connected to the
NestJS REST API. Other backend-dependent workflows may still require their own API integration.

## Requirements

- Node.js 18 or newer
- npm

## Run locally

```bash
npm install
cp .env.example .env
npm run dev -- --open
```

Set `PUBLIC_API_URL` in `.env` to the backend API base URL (for example,
`http://localhost:3000/api`). The frontend uses this URL for authentication and API requests.
The backend must allow requests from the frontend origin and redirect Google OAuth back to
`/auth/callback` with an access token in the query string.

## Validate and build

```bash
npm run check
npm run build
npm run preview
```
