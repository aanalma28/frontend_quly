# AI Job Hunter - Frontend

Frontend application for **AI Job Hunter**, built with **SvelteKit**, **TypeScript**, and **Tailwind CSS**. It provides the foundation for automated job applications, Pauli and Kraepelin psychotests, and application tracking.

## Tech stack

- SvelteKit with TypeScript
- Tailwind CSS v4
- Lucide icons (`@lucide/svelte`)
- Svelte stores for session and credit state
- Fetch API for backend requests

## Project structure

```text
src/
├── lib/
│   ├── components/       # Reusable UI components
│   ├── stores/           # Session and credit stores
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

The routes establish the application structure. Backend-dependent workflows are marked as pending integration.

## Requirements

- Node.js 18 or newer
- npm

## Run locally

```bash
npm install
cp .env.example .env
npm run dev -- --open
```

Set `VITE_API_BASE_URL` in `.env` to the backend API URL. The default is `http://localhost:3000/api`.

## Validate and build

```bash
npm run check
npm run build
npm run preview
```
