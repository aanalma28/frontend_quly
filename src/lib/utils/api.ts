const API_BASE_URL = (import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000/api').replace(
	/\/+$/,
	''
);
const ACCESS_TOKEN_KEY = 'auth_access_token';

export class ApiError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly code?: string
	) {
		super(message);
		this.name = 'ApiError';
	}
}

export function getApiUrl(path: string): string {
	return `${API_BASE_URL}/${path.replace(/^\/+/, '')}`;
}

/**
 * Resolve a backend-served asset (e.g. `uploads/jobs/photo.jpg`) into an
 * absolute URL. Data/remote URLs are returned unchanged.
 */
export function getAssetUrl(path: string | null | undefined): string | null {
	if (!path) return null;
	if (/^(?:https?:|data:|blob:)/i.test(path)) return path;
	const origin = API_BASE_URL.replace(/\/api$/i, '');
	return `${origin}/${path.replace(/^\/+/, '')}`;
}

export async function apiRequest(path: string, init: RequestInit = {}): Promise<Response> {
	const headers = new Headers(init.headers);
	if (!headers.has('Authorization') && typeof localStorage !== 'undefined') {
		const token = localStorage.getItem(ACCESS_TOKEN_KEY);
		if (token) headers.set('Authorization', `Bearer ${token}`);
	}

	const response = await fetch(getApiUrl(path), { ...init, headers });
	if (
		response.status === 401 &&
		!/^auth\/(login|register)(?:\/|$)/.test(path.replace(/^\/+/, '')) &&
		path.replace(/^\/+/, '') !== 'profile' &&
		typeof window !== 'undefined'
	) {
		window.dispatchEvent(new Event('auth:unauthorized'));
	}
	if (!response.ok) {
		let message = `Permintaan gagal (${response.status}).`;
		let code: string | undefined;
		try {
			const body: unknown = await response.clone().json();
			if (typeof body === 'object' && body !== null) {
				const details = body as { message?: unknown; error?: unknown; code?: unknown };
				const serverMessage = details.message ?? details.error;
				if (typeof serverMessage === 'string') message = serverMessage;
				else if (Array.isArray(serverMessage)) message = serverMessage.join(', ');
				if (typeof details.code === 'string') code = details.code;
			}
		} catch {
			const responseMessage = await response.text();
			if (responseMessage) message = responseMessage;
		}
		throw new ApiError(message, response.status, code);
	}

	return response;
}
