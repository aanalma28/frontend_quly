# AI Job Hunter - Frontend

Frontend application for **AI Job Hunter**, built with **SvelteKit** and **Tailwind CSS**. This platform enables job seekers to automate their job search, take automated psychotest modules (Pauli & Kraepelin), manage automated email applications, and track application progress via a modern dashboard.

---

## 🚀 Tech Stack
* **Framework:** SvelteKit (TypeScript)
* **Styling:** Tailwind CSS
* **Icons:** Lucide Icons / Tabler Icons
* **State Management:** Svelte Stores
* **HTTP Client:** Fetch API / Axios

---

## 📁 Project Structure

```text
src/
├── lib/
│   ├── components/      # Reusable UI components (Modals, Cards, Buttons)
│   ├── stores/          # Svelte stores for user session & credit balance
│   └── utils/           # Helper functions & API connectors
├── routes/
│   ├── auth/            # Login, Register & Google OAuth callback
│   ├── onboarding/      # CV upload & Privacy consent terms
│   ├── psychotest/      # Interactive Pauli & Kraepelin test module
│   ├── dashboard/       # Main user dashboard
│   │   ├── auto-apply/  # Tab 1: Automated Email Application History
│   │   ├── manual-hub/  # Tab 2: Non-Email Jobs & Direct Apply Links
│   │   └── psychotest/  # Tab 3: Psychotest Results & Charts
│   └── billing/         # PAYG Credit Top-up & Token Packages
└── app.html
