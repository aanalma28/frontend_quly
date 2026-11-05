import type { MidtransConfigResponse } from '#lib/services/billingApi.js';

export const PENDING_PAYMENT_KEY = 'quly_pending_payment_id';

declare global {
	interface Window {
		snap?: {
			pay: (
				token: string,
				options?: {
					onSuccess?: () => void;
					onPending?: () => void;
					onError?: () => void;
					onClose?: () => void;
				}
			) => void;
		};
	}
}

let loadedForClientKey: string | null = null;
let loadPromise: Promise<boolean> | null = null;

/** Load Snap.js once, using the client key returned by the backend. */
export function loadSnapScript(config: MidtransConfigResponse): Promise<boolean> {
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return Promise.resolve(false);
	}
	if (window.snap) return Promise.resolve(true);
	if (!config.configured || !config.clientKey || !config.snapScriptUrl) {
		return Promise.resolve(false);
	}
	if (loadPromise && loadedForClientKey === config.clientKey) return loadPromise;

	loadedForClientKey = config.clientKey;
	loadPromise = new Promise<boolean>((resolve) => {
		const existing = document.querySelector<HTMLScriptElement>('script[data-quly-snap]');
		if (existing) {
			existing.addEventListener('load', () => resolve(Boolean(window.snap)));
			existing.addEventListener('error', () => resolve(false));
			return;
		}

		const script = document.createElement('script');
		script.src = config.snapScriptUrl as string;
		script.async = true;
		script.dataset.clientKey = config.clientKey as string;
		script.dataset.qulySnap = 'true';
		script.onload = () => resolve(Boolean(window.snap));
		script.onerror = () => resolve(false);
		document.head.appendChild(script);
	});

	return loadPromise;
}

export function savePendingPaymentId(id: string): void {
	if (typeof localStorage !== 'undefined') localStorage.setItem(PENDING_PAYMENT_KEY, id);
}

export function getPendingPaymentId(): string | null {
	if (typeof localStorage === 'undefined') return null;
	return localStorage.getItem(PENDING_PAYMENT_KEY);
}

export function clearPendingPaymentId(): void {
	if (typeof localStorage !== 'undefined') localStorage.removeItem(PENDING_PAYMENT_KEY);
}
