import { goto } from '$app/navigation';
import { writable } from 'svelte/store';
import { ApiError, apiRequest, getApiUrl } from '#lib/utils/api.js';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

export interface AuthUser {
	id: string;
	email: string;
	fullName: string;
	subscriptionTier?: string | null;
	monthlyQuota?: number | null;
	remainingApplications?: number | null;
	paygBalance?: number | null;
	paygCredits?: number | null;
	[key: string]: unknown;
}

export interface AuthState {
	user: AuthUser | null;
	isAuthenticated: boolean;
	token: string | null;
	isLoading: boolean;
	error: string | null;
}

export const auth = writable<AuthState>({
	user: null,
	isAuthenticated: false,
	token: null,
	isLoading: true,
	error: null
});

let initialization: Promise<boolean> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, ...keys: string[]): string | undefined {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === 'string' && value.length > 0) return value;
	}
	return undefined;
}

function readNumber(record: Record<string, unknown>, ...keys: string[]): number | undefined {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === 'number' && Number.isFinite(value)) return value;
	}
	return undefined;
}

function unwrapUser(value: unknown): Record<string, unknown> | null {
	if (!isRecord(value)) return null;
	if (isRecord(value.user)) return value.user;
	if (isRecord(value.data)) return unwrapUser(value.data);
	return value;
}

function normalizeUser(value: unknown): AuthUser {
	const profile = unwrapUser(value);
	if (!profile) throw new Error('Backend tidak mengembalikan profil pengguna yang valid.');

	const email = readString(profile, 'email');
	if (!email) throw new Error('Profil pengguna dari backend tidak memiliki email.');
	const subscription = isRecord(profile.subscription) ? profile.subscription : {};
	const wallet = isRecord(profile.wallet) ? profile.wallet : {};
	const monthlyQuota =
		readNumber(profile, 'monthlyQuota', 'monthly_quota') ??
		readNumber(subscription, 'monthlyQuota', 'monthly_quota', 'quota');
	const remainingApplications =
		readNumber(
			profile,
			'remainingApplications',
			'remaining_applications',
			'applicationsRemaining',
			'quotaRemaining',
			'quota_remaining'
		) ??
		(typeof monthlyQuota === 'number'
			? Math.max(
					0,
					monthlyQuota -
				(readNumber(profile, 'usedApplications', 'used_applications', 'applicationsUsed') ?? 0)
				)
			: undefined);

	return {
		...profile,
		id: readString(profile, 'id', 'userId', 'user_id') ?? email,
		email,
		fullName: readString(profile, 'fullName', 'full_name', 'name') ?? email,
		subscriptionTier:
			readString(profile, 'subscriptionTier', 'subscription_tier', 'planName', 'plan_name') ??
			readString(subscription, 'tier', 'name', 'plan') ??
			null,
		monthlyQuota,
		remainingApplications,
		paygBalance:
			readNumber(profile, 'paygBalance', 'payg_balance', 'creditBalance') ??
			readNumber(wallet, 'paygBalance', 'balance', 'amount'),
		paygCredits:
			readNumber(profile, 'paygCredits', 'payg_credits', 'credits') ??
			readNumber(wallet, 'paygCredits', 'credits', 'tokens')
	};
}

function extractTokenResponse(value: unknown): {
	accessToken: string;
	refreshToken: string | null;
} {
	if (!isRecord(value)) throw new Error('Respons autentikasi dari backend tidak valid.');
	const nested = isRecord(value.data) ? value.data : value;
	const accessToken = readString(nested, 'accessToken', 'access_token', 'token');
	if (!accessToken) throw new Error('Backend tidak mengembalikan access token.');

	const refreshToken = readString(nested, 'refreshToken', 'refresh_token') ?? null;
	return {
		accessToken,
		refreshToken
	};
}

function persistTokens(accessToken: string, refreshToken: string | null) {
	localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
	if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
	else localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function clearSession() {
	localStorage.removeItem(ACCESS_TOKEN_KEY);
	localStorage.removeItem(REFRESH_TOKEN_KEY);
	auth.set({
		user: null,
		isAuthenticated: false,
		token: null,
		isLoading: false,
		error: null
	});
}

async function requestUserProfile(): Promise<AuthUser> {
	const response = await apiRequest('profile');
	return normalizeUser(await response.json());
}

export async function fetchUserProfile(): Promise<AuthUser> {
	auth.update((state) => ({ ...state, isLoading: true, error: null }));
	try {
		const user = await requestUserProfile();
		auth.update((state) => ({ ...state, user, isAuthenticated: true, isLoading: false }));
		return user;
	} catch (error) {
		if (error instanceof ApiError && error.status === 401) clearSession();
		else auth.update((state) => ({ ...state, isLoading: false, error: errorMessage(error) }));
		throw error;
	}
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Terjadi kesalahan. Silakan coba lagi.';
}

export async function login(
	email: string,
	password: string,
	redirectTo = '/dashboard'
): Promise<void> {
	auth.update((state) => ({ ...state, isLoading: true, error: null }));
	try {
		const response = await apiRequest('auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password })
		});
		const result = extractTokenResponse(await response.json());
		persistTokens(result.accessToken, result.refreshToken);
		auth.set({
			user: null,
			isAuthenticated: true,
			token: result.accessToken,
			isLoading: false,
			error: null
		});
		await fetchUserProfile();
		const safeRedirect = redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/dashboard';
		await goto(safeRedirect, { invalidateAll: true });
	} catch (error) {
		auth.update((state) => ({ ...state, isLoading: false, error: errorMessage(error) }));
		throw error;
	}
}

export async function register(
	email: string,
	password: string,
	options: { fullName?: string; acceptedTerms?: boolean; redirectTo?: string } = {}
): Promise<void> {
	await apiRequest('auth/register', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			email,
			password,
			...(options.fullName ? { full_name: options.fullName } : {}),
			...(options.acceptedTerms ? { accepted_terms: true } : {})
		})
	});
	await login(email, password, options.redirectTo ?? '/onboarding');
}

export function loginWithGoogle(): void {
	window.location.assign(getApiUrl('auth/google'));
}

export async function completeOAuthLogin(accessToken: string, refreshToken: string | null = null) {
	persistTokens(accessToken, refreshToken);
	auth.set({
		user: null,
		isAuthenticated: true,
		token: accessToken,
		isLoading: true,
		error: null
	});
	await fetchUserProfile();
	await goto('/dashboard', { invalidateAll: true });
}

export async function initializeAuth(): Promise<boolean> {
	if (initialization) return initialization;
	initialization = (async () => {
		const token = localStorage.getItem(ACCESS_TOKEN_KEY);
		if (!token) {
			auth.set({ user: null, isAuthenticated: false, token: null, isLoading: false, error: null });
			return false;
		}

		auth.set({ user: null, isAuthenticated: true, token, isLoading: true, error: null });
		try {
			await fetchUserProfile();
			return true;
		} catch (error) {
			if (!(error instanceof ApiError && error.status === 401)) {
				auth.update((state) => ({ ...state, error: errorMessage(error) }));
			}
			return false;
		}
	})().finally(() => {
		initialization = null;
	});
	return initialization;
}

export async function logout(): Promise<void> {
	clearSession();
	await goto('/auth/login', { invalidateAll: true });
}
