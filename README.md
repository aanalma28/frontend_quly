# AI Job Hunter - Fronte

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
│   ├── stores/         # Svelte stores for user session & credit balance
│   └── utils/           # Helper functions & API connectors
├── routes/
│   ├── auth/            # Login, Register & Google OAuth callback
│   ├── onboardi
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
```

---

## 🛠️ Getting Started Locally

### Prerequisites
* Node.js (v18 or higher installed)
* npm or pnpm package manager

### Installation Steps
1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/ai-job-hunter-frontend.git
   cd ai-job-hunter-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup environment variables:
   Create a `.env` file in the root directory based on `.env.example`:
   ```env
   VITE_API_BASE_URL=http://localhost:3000/api
   ```

4. Run the development server:
   ```bash
   npm run dev -- --open
   ```

---

## 📦 Build & Production
To build the application for production:
```bash
npm run build
```
To preview the production build locally:
```bash
npm run preview
