export interface SendEmailOtpRequest {
	email: string;
}

export interface VerifyEmailOtpRequest {
	email: string;
	code: string;
}

export interface RegisterEmailRequest {
	fullName: string;
	email: string;
	phone: string;
	password: string;
	accepted_terms: true;
}

export interface RegisterEmailDetails {
	fullName: string;
	phone: string;
	acceptedTerms: boolean;
}

export interface LoginEmailRequest {
	email: string;
	password: string;
}

export interface EmailAuthTokens {
	accessToken: string;
	refreshToken: string | null;
}

export type EmailAuthRequester = (path: string, init?: RequestInit) => Promise<Response>;

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function googleOAuthUrl(apiBaseUrl: string): string {
	return `${apiBaseUrl.replace(/\/+$/, '')}/auth/google`;
}

export function otpCooldownSeconds(sentAt: number, now = Date.now()): number {
	return Math.max(0, Math.ceil((sentAt + 60_000 - now) / 1000));
}

export function isUnverifiedEmailError(status: number, message: string): boolean {
	return status === 403 && /(email.*verif|verif.*email|unverified|not verified)/i.test(message);
}

function parseTokens(value: unknown): EmailAuthTokens {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new Error('Respons autentikasi dari backend tidak valid.');
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
	if (!accessToken) throw new Error('Backend tidak mengembalikan access token.');
	const refreshToken =
		typeof payload.refreshToken === 'string'
			? payload.refreshToken
			: typeof payload.refresh_token === 'string'
				? payload.refresh_token
				: null;

	return { accessToken, refreshToken };
}

export class EmailAuthFlow {
	private pendingEmail: string | null = null;
	private verifiedEmail: string | null = null;
	private readonly request: EmailAuthRequester;

	constructor(request: EmailAuthRequester) {
		this.request = request;
	}

	async sendCode(email: string): Promise<void> {
		const normalizedEmail = normalizeEmail(email);
		await this.request('auth/email-verification/send', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: normalizedEmail } satisfies SendEmailOtpRequest)
		});
		this.pendingEmail = normalizedEmail;
		this.verifiedEmail = null;
	}

	async verifyCode(email: string, code: string): Promise<void> {
		const normalizedEmail = normalizeEmail(email);
		if (this.pendingEmail !== normalizedEmail) {
			throw new Error('Minta kode verifikasi untuk alamat email ini terlebih dahulu.');
		}
		if (!/^\d{6}$/.test(code)) {
			throw new Error('Kode verifikasi harus terdiri dari 6 angka.');
		}

		const response = await this.request('auth/email-verification/verify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: normalizedEmail,
				code
			} satisfies VerifyEmailOtpRequest)
		});
		const result: unknown = await response.json();
		if (
			typeof result !== 'object' ||
			result === null ||
			!('verified' in result) ||
			result.verified !== true
		) {
			throw new Error('Kode belum berhasil diverifikasi. Periksa kembali atau minta kode baru.');
		}
		this.verifiedEmail = normalizedEmail;
	}

	async register(
		email: string,
		password: string,
		details: RegisterEmailDetails
	): Promise<EmailAuthTokens> {
		const normalizedEmail = normalizeEmail(email);
		if (this.verifiedEmail !== normalizedEmail) {
			throw new Error('Verifikasi email terlebih dahulu sebelum membuat akun.');
		}
		if (!details.acceptedTerms) {
			throw new Error('Setujui syarat dan ketentuan sebelum membuat akun.');
		}

		const response = await this.request('auth/register', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				fullName: details.fullName.trim(),
				email: normalizedEmail,
				phone: details.phone.trim(),
				password,
				accepted_terms: true
			} satisfies RegisterEmailRequest)
		});
		const tokens = parseTokens(await response.json());
		this.pendingEmail = null;
		this.verifiedEmail = null;
		return tokens;
	}

	async login(email: string, password: string): Promise<EmailAuthTokens> {
		const response = await this.request('auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: normalizeEmail(email), password } satisfies LoginEmailRequest)
		});
		return parseTokens(await response.json());
	}
}
