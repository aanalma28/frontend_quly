import { goto } from '$app/navigation';
import { writable } from 'svelte/store';
import {
	ACCESS_TOKEN_KEY,
	ApiError,
	REFRESH_TOKEN_KEY,
	apiRequest,
	getApiUrl,
	resetSessionExpiredNotice
} from '#lib/utils/api.js';
import {
	EmailAuthFlow,
	googleOAuthUrl,
	normalizeEmail,
	type RegisterEmailDetails
} from '#lib/utils/email-auth.js';

export interface AuthUser {
	id: string;
	email: string;
	fullName: string;
	subscriptionTier?: string | null;
	monthlyQuota?: number | null;
	remainingApplications?: number | null;
	atsConversionQuota?: number | null;
	atsConversionRemaining?: number | null;
	isOnboardingCompleted: boolean;
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

// Keep the in-memory token in sync when apiRequest silently refreshes it.
if (typeof window !== 'undefined') {
	window.addEventListener('auth:tokens-refreshed', (event) => {
		const detail = (event as CustomEvent<{ accessToken?: string }>).detail;
		const accessToken = detail?.accessToken;
		if (typeof accessToken !== 'string') return;
		auth.update((state) => ({
			...state,
			token: accessToken,
			isAuthenticated: true
		}));
	});
}

let initialization: Promise<boolean> | null = null;
const emailAuthFlow = new EmailAuthFlow(apiRequest);

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
	const onboarding = isRecord(profile.onboarding) ? profile.onboarding : {};
	const ats = isRecord(profile.ats) ? profile.ats : {};
	const monthlyQuota =
		readNumber(profile, 'monthlyQuota', 'monthly_quota') ??
		readNumber(subscription, 'monthlyQuota', 'monthly_quota', 'quota');
	const atsConversionQuota =
		readNumber(
			profile,
			'atsConversionQuota',
			'ats_conversion_quota',
			'atsQuota',
			'ats_quota',
			'cvConversionQuota',
			'cv_conversion_quota'
		) ?? readNumber(ats, 'quota', 'total', 'limit');
	const atsConversionRemaining =
		readNumber(
			profile,
			'atsConversionRemaining',
			'ats_conversion_remaining',
			'atsRemainingQuota',
			'ats_remaining_quota',
			'cvConversionRemaining',
			'cv_conversion_remaining'
		) ??
		readNumber(ats, 'remaining', 'remainingQuota', 'remaining_quota') ??
		(typeof atsConversionQuota === 'number'
			? Math.max(
					0,
					atsConversionQuota -
						(readNumber(profile, 'atsConversionUsed', 'ats_conversion_used') ??
							readNumber(ats, 'used', 'consumed') ??
							0)
				)
			: undefined);
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
		atsConversionQuota,
		atsConversionRemaining,
		isOnboardingCompleted:
			typeof profile.isOnboardingCompleted === 'boolean'
				? profile.isOnboardingCompleted
				: typeof profile.is_onboarding_completed === 'boolean'
					? profile.is_onboarding_completed
					: typeof onboarding.isCompleted === 'boolean'
						? onboarding.isCompleted
						: typeof onboarding.is_completed === 'boolean'
							? onboarding.is_completed
							: false,
		paygBalance:
			readNumber(profile, 'paygBalance', 'payg_balance', 'creditBalance') ??
			readNumber(wallet, 'paygBalance', 'balance', 'amount'),
		paygCredits:
			readNumber(profile, 'paygCredits', 'payg_credits', 'credits') ??
			readNumber(wallet, 'paygCredits', 'credits', 'tokens')
	};
}

export function saveAuthTokens(accessToken: string, refreshToken: string | null) {
	localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
	if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
	else localStorage.removeItem(REFRESH_TOKEN_KEY);
	resetSessionExpiredNotice();
	auth.update((state) => ({
		...state,
		isAuthenticated: true,
		token: accessToken,
		isLoading: true,
		error: null
	}));
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
	redirectTo?: string
): Promise<void> {
	auth.update((state) => ({ ...state, isLoading: true, error: null }));
	try {
		const result = await emailAuthFlow.login(email, password);
		saveAuthTokens(result.accessToken, result.refreshToken);
		auth.set({
			user: null,
			isAuthenticated: true,
			token: result.accessToken,
			isLoading: false,
			error: null
		});
		await fetchUserProfile();
		const role = result.role ?? getUserRole();
		const home = homePathForRole(role);
		const allowedPrefix =
			role === 'SUPER_ADMIN' ? '/superadmin' : role === 'ADMIN' ? '/admin' : '/dashboard';
		let target = redirectTo && redirectTo.trim() ? redirectTo : home;
		// Role menentukan area aplikasi yang boleh diakses setelah login.
		if (!target.startsWith(allowedPrefix)) {
			target = home;
		}
		const safeRedirect =
			target.startsWith('/') && !target.startsWith('//') ? target : home;
		await goto(safeRedirect, { invalidateAll: true });
	} catch (error) {
		auth.update((state) => ({ ...state, isLoading: false, error: errorMessage(error) }));
		throw error;
	}
}

export async function requestEmailVerificationCode(email: string): Promise<void> {
	await emailAuthFlow.sendCode(email);
}

export async function verifyEmailVerificationCode(email: string, code: string): Promise<void> {
	await emailAuthFlow.verifyCode(email, code);
}

export async function register(
	email: string,
	password: string,
	details: RegisterEmailDetails
): Promise<void> {
	auth.update((state) => ({ ...state, isLoading: true, error: null }));
	try {
		await emailAuthFlow.register(email, password, details);
		clearSession();
		const params = new URLSearchParams({ registered: '1', email });
		await goto(`/auth/login?${params.toString()}`, { invalidateAll: true });
	} catch (error) {
		auth.update((state) => ({ ...state, isLoading: false, error: errorMessage(error) }));
		throw error;
	}
}

export function loginWithGoogle(): void {
	window.location.assign(googleOAuthUrl(getApiUrl('')));
}

export async function completeOAuthLogin(accessToken: string, refreshToken: string | null = null) {
	saveAuthTokens(accessToken, refreshToken);
	await fetchUserProfile();
	await goto(homePathForRole(getUserRole()), { invalidateAll: true });
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
	const refreshToken =
		typeof localStorage !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
	clearSession();
	if (refreshToken) {
		try {
			await apiRequest('auth/logout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ refreshToken }),
				signal: AbortSignal.timeout(3000)
			});
		} catch {
			// Revoking the backend session is best-effort; local session is already cleared.
		}
	}
	await goto('/auth/login', { invalidateAll: true });
}

export function logoutToOnboardingLogin(): void {
	clearSession();
	window.location.assign('/login?message=onboarding_skipped');
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
	const parts = token.split('.');
	if (parts.length < 2 || typeof atob === 'undefined') return null;

	try {
		const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
		const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
		const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
		const json: unknown = JSON.parse(new TextDecoder().decode(bytes));
		return isRecord(json) ? json : null;
	} catch {
		return null;
	}
}

/**
 * Read the current user's role from the (already signed) access token payload.
 * Used for UI gating only — the backend still enforces admin authorization.
 */
export function getUserRole(): string | null {
	if (typeof localStorage === 'undefined') return null;
	const token = localStorage.getItem(ACCESS_TOKEN_KEY);
	if (!token) return null;

	const payload = decodeJwtPayload(token);
	const role = payload?.role;
	return typeof role === 'string' ? role : null;
}

export function isAdminRole(role: string | null): boolean {
	return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

/** Landing page for a role after login. */
export function homePathForRole(role: string | null): string {
	if (role === 'SUPER_ADMIN') return '/superadmin';
	if (role === 'ADMIN') return '/admin/psychotest/packages';
	return '/dashboard';
}

export const authStore = {
	subscribe: auth.subscribe,
	login,
	register,
	requestEmailVerificationCode,
	verifyEmailVerificationCode,
	loginWithGoogle,
	fetchUserProfile,
	getUserRole,
	homePathForRole,
	logout
};
