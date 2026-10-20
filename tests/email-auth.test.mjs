import assert from 'node:assert/strict';
import test from 'node:test';
import {
	EmailAuthFlow,
	googleOAuthUrl,
	isUnverifiedEmailError,
	normalizeEmail,
	otpCooldownSeconds
} from '../src/lib/utils/email-auth.ts';

function jsonResponse(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

function createRequester(responses, requests = []) {
	return async (path, init = {}) => {
		requests.push({
			path,
			method: init.method ?? 'GET',
			body: init.body ? JSON.parse(init.body) : undefined
		});
		const response = responses.shift();
		if (response instanceof Error) throw response;
		return response;
	};
}

test('register requires OTP and calls send, verify, then register in order', async () => {
	const requests = [];
	const flow = new EmailAuthFlow(
		createRequester(
			[
				jsonResponse({ message: 'If the email can receive a code, it was sent.' }, 202),
				jsonResponse({ verified: true }),
				jsonResponse({ accessToken: 'access', refreshToken: 'refresh', user: { email: 'user@example.com' } })
			],
			requests
		)
	);

	await assert.rejects(flow.register(' USER@Example.com ', 'password-123'), /Verifikasi email/);
	assert.equal(requests.length, 0);

	await flow.sendCode(' USER@Example.com ');
	await flow.verifyCode('user@example.com', '123456');
	await assert.rejects(
		flow.register(' USER@Example.com ', 'password-123', {
			fullName: 'Budi Santoso',
			phone: '+6281234567890',
			acceptedTerms: false
		}),
		/syarat dan ketentuan/i
	);
	assert.equal(requests.length, 2);

	const tokens = await flow.register(' USER@Example.com ', 'password-123', {
		fullName: ' Budi Santoso ',
		phone: ' +6281234567890 ',
		acceptedTerms: true
	});

	assert.deepEqual(
		requests.map(({ path }) => path),
		[
			'auth/email-verification/send',
			'auth/email-verification/verify',
			'auth/register'
		]
	);
	assert.deepEqual(requests[0].body, { email: 'user@example.com' });
	assert.deepEqual(requests[1].body, { email: 'user@example.com', code: '123456' });
	assert.deepEqual(requests[2].body, {
		fullName: 'Budi Santoso',
		email: 'user@example.com',
		phone: '+6281234567890',
		password: 'password-123',
		accepted_terms: true
	});
	assert.deepEqual(tokens, { accessToken: 'access', refreshToken: 'refresh' });
});

test('wrong or expired OTP is rejected and resend can begin a fresh verification', async () => {
	const requests = [];
	const expired = Object.assign(new Error('Kode verifikasi kedaluwarsa.'), { status: 400 });
	const flow = new EmailAuthFlow(
		createRequester(
			[
				jsonResponse({ message: 'Kode dikirim.' }, 202),
				expired,
				jsonResponse({ message: 'Kode dikirim.' }, 202),
				jsonResponse({ verified: true })
			],
			requests
		)
	);

	await flow.sendCode('user@example.com');
	await assert.rejects(flow.verifyCode('user@example.com', '123456'), /kedaluwarsa/);
	await flow.sendCode('user@example.com');
	await flow.verifyCode('user@example.com', '654321');

	assert.deepEqual(
		requests.map(({ path }) => path),
		[
			'auth/email-verification/send',
			'auth/email-verification/verify',
			'auth/email-verification/send',
			'auth/email-verification/verify'
		]
	);
});

test('OTP format is validated and no verification request is made for invalid input', async () => {
	const requests = [];
	const flow = new EmailAuthFlow(createRequester([jsonResponse({ message: 'sent' }, 202)], requests));

	await flow.sendCode('user@example.com');
	await assert.rejects(flow.verifyCode('user@example.com', '12345'), /6 angka/);
	assert.equal(requests.length, 1);
});

test('login normalizes email, sends the credentials, and parses the session tokens', async () => {
	const requests = [];
	const flow = new EmailAuthFlow(
		createRequester(
			[jsonResponse({ accessToken: 'access', refreshToken: 'refresh', user: { email: 'user@example.com' } })],
			requests
		)
	);

	const tokens = await flow.login(' USER@Example.com ', 'password-123');

	assert.deepEqual(requests[0], {
		path: 'auth/login',
		method: 'POST',
		body: { email: 'user@example.com', password: 'password-123' }
	});
	assert.deepEqual(tokens, { accessToken: 'access', refreshToken: 'refresh' });
	assert.equal(isUnverifiedEmailError(403, 'Email belum terverifikasi'), true);
	assert.equal(isUnverifiedEmailError(403, 'Akses ditolak'), false);
	assert.equal(isUnverifiedEmailError(401, 'Email belum terverifikasi'), false);
});

test('Google OAuth URL and OTP resend cooldown remain consistent', () => {
	assert.equal(googleOAuthUrl('https://api.example.com/api/'), 'https://api.example.com/api/auth/google');
	assert.equal(normalizeEmail('  USER@Example.com  '), 'user@example.com');
	assert.equal(otpCooldownSeconds(1_000, 1_000), 60);
	assert.equal(otpCooldownSeconds(1_000, 60_001), 1);
	assert.equal(otpCooldownSeconds(1_000, 61_000), 0);
});
