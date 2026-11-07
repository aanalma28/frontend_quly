function normalizeApiBaseUrl(value: string | undefined): string {
	const trimmed = value?.trim().replace(/\/+$/, '');
	if (!trimmed) return 'http://localhost:3000/api';
	return /\/api$/i.test(trimmed) ? trimmed : `${trimmed}/api`;
}

const productionFlag = import.meta.env.IS_PRODUCTION?.trim().toLowerCase();
const isProduction = productionFlag ? productionFlag === 'true' : import.meta.env.PROD;
const configuredApiUrl = isProduction
	? import.meta.env.BACKEND_API_URL_PROD
	: import.meta.env.BACKEND_API_URL_DEV;
const API_BASE_URL = normalizeApiBaseUrl(configuredApiUrl);

export const ACCESS_TOKEN_KEY = 'auth_access_token';
export const REFRESH_TOKEN_KEY = 'auth_refresh_token';

const AUTH_PATH_PREFIX = /^auth\//;
const PROFILE_PATH = 'profile';

export class ApiError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly code?: string,
		public readonly payload?: unknown
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

function getStoredToken(key: string): string | null {
	if (typeof localStorage === 'undefined') return null;
	return localStorage.getItem(key);
}

function clearStoredTokens(): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(ACCESS_TOKEN_KEY);
	localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function buildHeaders(init: RequestInit, accessToken: string | null, force = false): Headers {
	const headers = new Headers(init.headers);
	if ((force || !headers.has('Authorization')) && accessToken) {
		headers.set('Authorization', `Bearer ${accessToken}`);
	}
	return headers;
}

function fetchWithToken(
	path: string,
	init: RequestInit,
	accessToken: string | null,
	force = false
): Promise<Response> {
	return fetch(getApiUrl(path), { ...init, headers: buildHeaders(init, accessToken, force) });
}

async function parseApiError(response: Response): Promise<ApiError> {
	let message = `Permintaan gagal (${response.status}).`;
	let code: string | undefined;
	let payload: unknown;
	try {
		const body: unknown = await response.clone().json();
		payload = body;
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
		payload = responseMessage || undefined;
	}
	return new ApiError(message, response.status, code, payload);
}

function extractTokens(value: unknown): {
	accessToken: string | null;
	refreshToken: string | null;
} {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return { accessToken: null, refreshToken: null };
	}

	const root = value as Record<string, unknown>;
	const payload =
		typeof root.data === 'object' && root.data !== null && !Array.isArray(root.data)
			? (root.data as Record<string, unknown>)
			: root;

	const accessToken =
		typeof payload.accessToken === 'string'
			? payload.accessToken
			: typeof payload.access_token === 'string'
				? payload.access_token
				: typeof payload.token === 'string'
					? payload.token
					: null;
	const refreshToken =
		typeof payload.refreshToken === 'string'
			? payload.refreshToken
			: typeof payload.refresh_token === 'string'
				? payload.refresh_token
				: null;

	return { accessToken, refreshToken };
}

type RefreshResult =
	| { status: 'refreshed'; accessToken: string }
	| { status: 'expired' }
	| { status: 'error' };

let refreshPromise: Promise<RefreshResult> | null = null;
let sessionExpiredNotified = false;

/**
 * Allow a fresh login/refresh cycle to emit `auth:unauthorized` again.
 */
export function resetSessionExpiredNotice(): void {
	sessionExpiredNotified = false;
}

function notifySessionExpired(): void {
	if (sessionExpiredNotified || typeof window === 'undefined') return;
	sessionExpiredNotified = true;
	window.dispatchEvent(new Event('auth:unauthorized'));
}

/**
 * Exchange the refresh token for a new access/refresh pair.
 *
 * The backend rotates the refresh token on every use, so this must be
 * single-flight: concurrent 401s share one request and all retry with the
 * same new access token. The old refresh token becomes invalid after use.
 */
function refreshAccessToken(): Promise<RefreshResult> {
	if (refreshPromise) return refreshPromise;

	const refreshToken = getStoredToken(REFRESH_TOKEN_KEY);
	if (!refreshToken) {
		return Promise.resolve({ status: 'expired' });
	}

	refreshPromise = (async (): Promise<RefreshResult> => {
		try {
			const response = await fetch(getApiUrl('auth/refresh'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ refreshToken })
			});

			if (response.status === 400 || response.status === 401 || response.status === 403) {
				// Another tab may have rotated the refresh token while this request
				// was in flight. In that case reuse its fresh access token instead
				// of wiping the shared session.
				const currentRefreshToken = getStoredToken(REFRESH_TOKEN_KEY);
				if (currentRefreshToken && currentRefreshToken !== refreshToken) {
					const currentAccessToken = getStoredToken(ACCESS_TOKEN_KEY);
					if (currentAccessToken) {
						return { status: 'refreshed', accessToken: currentAccessToken };
					}
				}
				clearStoredTokens();
				return { status: 'expired' };
			}
			if (!response.ok) {
				return { status: 'error' };
			}

			let payload: unknown;
			try {
				payload = await response.json();
			} catch {
				clearStoredTokens();
				return { status: 'expired' };
			}

			const tokens = extractTokens(payload);
			if (!tokens.accessToken) {
				clearStoredTokens();
				return { status: 'expired' };
			}

			localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
			if (tokens.refreshToken) {
				localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
			} else {
				localStorage.removeItem(REFRESH_TOKEN_KEY);
			}
			sessionExpiredNotified = false;

			if (typeof window !== 'undefined') {
				window.dispatchEvent(
					new CustomEvent('auth:tokens-refreshed', {
						detail: { accessToken: tokens.accessToken }
					})
				);
			}

			return { status: 'refreshed', accessToken: tokens.accessToken };
		} catch {
			return { status: 'error' };
		} finally {
			refreshPromise = null;
		}
	})();

	return refreshPromise;
}

export async function apiRequest(path: string, init: RequestInit = {}): Promise<Response> {
	const normalizedPath = path.replace(/^\/+/, '');
	const accessTokenUsed = getStoredToken(ACCESS_TOKEN_KEY);
	let response = await fetchWithToken(normalizedPath, init, accessTokenUsed);

	if (
		response.status === 401 &&
		typeof window !== 'undefined' &&
		!AUTH_PATH_PREFIX.test(normalizedPath)
	) {
		const hasRefreshToken = Boolean(getStoredToken(REFRESH_TOKEN_KEY));

		if (!hasRefreshToken) {
			// Cannot recover. `profile` is handled by the auth store during
			// initialization, so do not force a redirect for it.
			if (normalizedPath !== PROFILE_PATH) notifySessionExpired();
		} else {
			// Another concurrent request may already have rotated the token.
			let nextToken = getStoredToken(ACCESS_TOKEN_KEY);
			if (!nextToken || nextToken === accessTokenUsed) {
				const result = await refreshAccessToken();
				if (result.status === 'expired') {
					if (normalizedPath !== PROFILE_PATH) notifySessionExpired();
					throw new ApiError('Sesi Anda telah berakhir. Silakan masuk kembali.', 401);
				}
				if (result.status === 'error') {
					throw new ApiError(
						'Gagal menyegarkan sesi. Silakan coba lagi.',
						503,
						'REFRESH_FAILED'
					);
				}
				nextToken = result.accessToken;
			}

			if (nextToken) {
				response = await fetchWithToken(normalizedPath, init, nextToken, true);
			}

			if (response.status === 401) {
				clearStoredTokens();
				if (normalizedPath !== PROFILE_PATH) notifySessionExpired();
				throw new ApiError('Sesi Anda telah berakhir. Silakan masuk kembali.', 401);
			}
		}
	}

	if (!response.ok) {
		throw await parseApiError(response);
	}

	return response;
}
