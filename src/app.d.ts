// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	interface ImportMetaEnv {
		readonly PUBLIC_API_URL?: string;
		readonly IS_PRODUCTION?: string;
		readonly BACKEND_API_URL_DEV?: string;
		readonly BACKEND_API_URL_PROD?: string;
	}

	interface ImportMeta {
		readonly env: ImportMetaEnv;
	}

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
