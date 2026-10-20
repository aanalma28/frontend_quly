<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { register, requestEmailVerificationCode, verifyEmailVerificationCode } from '#lib/stores/auth.js';
	import { getApiUrl } from '#lib/utils/api.js';
	import { normalizeEmail, otpCooldownSeconds } from '#lib/utils/email-auth.js';
	import { savePendingRegistrationDetails } from '#lib/utils/pending-registration.js';
	import AuthShell from '$lib/components/auth/AuthShell.svelte';
	import GoogleButton from '$lib/components/auth/GoogleButton.svelte';
	import FormField from '$lib/components/ui/FormField.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	type RegistrationStep = 'details' | 'otp' | 'verified';

	let fullName = $state('');
	let email = $state(page.url.searchParams.get('email') ?? '');
	let phone = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let acceptedTerms = $state(false);
	let otp = $state('');
	let step = $state<RegistrationStep>('details');
	const verificationOnly = page.url.searchParams.get('verifyEmail') === '1';
	let submitting = $state(false);
	let validationAttempted = $state(false);
	let formError = $state<string | null>(null);
	let statusMessage = $state<string | null>(
		page.url.searchParams.get('verifyEmail') === '1'
			? 'Email perlu diverifikasi sebelum kamu bisa masuk. Kirim kode untuk melanjutkan.'
			: null
	);
	let cooldown = $state(0);
	let cooldownStartedAt = 0;
	let cooldownTimer: ReturnType<typeof setInterval> | undefined;
	const normalizedEmail = $derived(normalizeEmail(email));
	const fieldErrors = $derived(validationAttempted ? getFieldErrors() : {});

	function handleGoogleLogin() {
		window.location.href = getApiUrl('/auth/google');
	}

	function getFieldErrors(): {
		fullName?: string;
		email?: string;
		phone?: string;
		password?: string;
		confirmPassword?: string;
		terms?: string;
	} {
		const errors: ReturnType<typeof getFieldErrors> = {};
		if (!verificationOnly && fullName.trim().length < 2) {
			errors.fullName = 'Masukkan nama lengkap (minimal 2 karakter).';
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
			errors.email = 'Masukkan alamat email yang valid.';
		}
		if (!verificationOnly && !/^\+?[0-9][0-9\s-]{7,15}$/.test(phone.trim())) {
			errors.phone = 'Masukkan nomor telepon yang valid.';
		}
		if (!verificationOnly && password.length < 8) {
			errors.password = 'Kata sandi harus terdiri dari minimal 8 karakter.';
		}
		if (!verificationOnly && confirmPassword !== password) {
			errors.confirmPassword = 'Ulangi kata sandi dengan benar.';
		}
		if (!verificationOnly && !acceptedTerms) {
			errors.terms = 'Kamu perlu menyetujui syarat dan ketentuan.';
		}
		return errors;
	}

	function validateDetails(): boolean {
		validationAttempted = true;
		return Object.keys(getFieldErrors()).length === 0;
	}

	function startCooldown() {
		if (cooldownTimer) clearInterval(cooldownTimer);
		cooldownStartedAt = Date.now();
		cooldown = otpCooldownSeconds(cooldownStartedAt);
		cooldownTimer = setInterval(() => {
			cooldown = otpCooldownSeconds(cooldownStartedAt);
			if (cooldown === 0 && cooldownTimer) {
				clearInterval(cooldownTimer);
				cooldownTimer = undefined;
			}
		}, 250);
	}

	onMount(() => () => {
		if (cooldownTimer) clearInterval(cooldownTimer);
	});

	async function sendCode(resend = false) {
		if (submitting || (resend && cooldown > 0)) return;
		formError = null;
		statusMessage = null;
		if (!resend && !validateDetails()) return;

		submitting = true;
		try {
			if (!verificationOnly) savePendingRegistrationDetails({ fullName, phone });
			await requestEmailVerificationCode(normalizedEmail);
			otp = '';
			step = 'otp';
			startCooldown();
			statusMessage = 'Jika alamat email dapat menerima kode, kode verifikasi sudah dikirim.';
		} catch (error) {
			formError =
				error instanceof Error ? error.message : 'Kode verifikasi belum dapat dikirim. Coba lagi.';
		} finally {
			submitting = false;
		}
	}

	async function verifyCode() {
		formError = null;
		statusMessage = null;
		if (!/^\d{6}$/.test(otp)) {
			formError = 'Masukkan kode verifikasi yang terdiri dari 6 angka.';
			return;
		}

		submitting = true;
		try {
			await verifyEmailVerificationCode(normalizedEmail, otp);
			step = 'verified';
			statusMessage = 'Email berhasil diverifikasi. Selesaikan pendaftaran untuk membuat akun.';
		} catch (error) {
			formError =
				error instanceof Error
					? error.message
					: 'Kode salah atau kedaluwarsa. Periksa kode atau minta kode baru setelah cooldown.';
		} finally {
			submitting = false;
		}
	}

	async function finishRegistration() {
		if (submitting || step !== 'verified') return;
		formError = null;
		if (!validateDetails()) {
			step = 'details';
			return;
		}
		submitting = true;
		try {
			await register(normalizedEmail, password, {
				fullName,
				phone,
				acceptedTerms
			});
		} catch (error) {
			formError =
				error instanceof Error ? error.message : 'Pendaftaran belum berhasil. Silakan coba lagi.';
		} finally {
			submitting = false;
		}
	}

	async function continueToLogin() {
		const params = new URLSearchParams({ email: normalizedEmail, verified: '1' });
		await goto(`/auth/login?${params.toString()}`);
	}

	function editDetails() {
		step = 'details';
		otp = '';
		formError = null;
		statusMessage = null;
	}
</script>

<AuthShell
	title="Buat akun Quly"
	subtitle="Verifikasi email untuk mulai melangkah menuju peluang karier baru."
>
	<div class="mb-5 grid grid-cols-3 gap-2" aria-label="Tahap pendaftaran">
		{#each [{ id: 'details', label: 'Akun' }, { id: 'otp', label: 'Verifikasi' }, { id: 'verified', label: 'Selesai' }] as item, index}
			<div
				class="rounded-lg px-2 py-2 text-center text-xs font-semibold {['details', 'otp', 'verified'].indexOf(step) >= index
					? 'bg-indigo-50 text-indigo-700'
					: 'bg-zinc-100 text-zinc-400'}"
				aria-current={step === item.id ? 'step' : undefined}
			>
				{index + 1}. {item.label}
			</div>
		{/each}
	</div>

	{#if statusMessage}
		<div
			class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
			role="status"
		>
			{statusMessage}
		</div>
	{/if}
	{#if formError}
		<div
			class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
			role="alert"
		>
			{formError}
		</div>
	{/if}

	{#if step === 'details'}
		<form
			class="space-y-4"
			onsubmit={(event) => {
				event.preventDefault();
				void sendCode();
			}}
			oninput={() => {
				formError = null;
				statusMessage = null;
			}}
			novalidate
		>
			{#if !verificationOnly}
				<FormField
					id="fullName"
					label="Nama lengkap"
					bind:value={fullName}
					autocomplete="name"
					placeholder="Budi Santoso"
					required
					error={fieldErrors.fullName}
				/>
			{/if}
			<FormField
				id="email"
				label="Email"
				type="email"
				bind:value={email}
				autocomplete="email"
				inputmode="email"
				placeholder="kamu@example.com"
				required
				error={fieldErrors.email}
			/>
			{#if !verificationOnly}
				<FormField
					id="phone"
					label="Nomor WhatsApp"
					type="tel"
					bind:value={phone}
					autocomplete="tel"
					inputmode="tel"
					placeholder="+6281234567890"
					required
					error={fieldErrors.phone}
				/>
				<FormField
					id="password"
					label="Kata sandi"
					type="password"
					bind:value={password}
					autocomplete="new-password"
					placeholder="Minimal 8 karakter"
					required
					error={fieldErrors.password}
				/>
				<FormField
					id="confirmPassword"
					label="Ulangi kata sandi"
					type="password"
					bind:value={confirmPassword}
					autocomplete="new-password"
					placeholder="Masukkan kembali kata sandi"
					required
					error={fieldErrors.confirmPassword}
				/>
				<div class="space-y-1">
					<label class="flex items-start gap-2 text-sm text-zinc-600">
						<input
							type="checkbox"
							bind:checked={acceptedTerms}
							class="mt-0.5 h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
						/>
						<span>
							Saya menyetujui syarat dan ketentuan serta kebijakan privasi, termasuk penggunaan
							data saya untuk mencari dan mengirim lamaran kerja atas nama saya.
						</span>
					</label>
					{#if fieldErrors.terms}
						<p class="text-xs text-red-600" role="alert">{fieldErrors.terms}</p>
					{/if}
				</div>
			{/if}
			<button
				type="submit"
				disabled={submitting}
				class="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
			>
				{#if submitting}<Spinner label="Mengirim kode verifikasi" />{/if}
				Kirim kode verifikasi
			</button>
		</form>
	{:else if step === 'otp'}
		<div class="space-y-4">
			<p class="text-sm leading-6 text-zinc-600">
				Masukkan 6 angka yang dikirim ke <strong class="break-all text-zinc-800">{normalizedEmail}</strong>.
				Kode berlaku selama 10 menit.
			</p>
			<label for="otp" class="block text-sm font-medium text-zinc-800">Kode OTP</label>
			<input
				id="otp"
				type="text"
				inputmode="numeric"
				autocomplete="one-time-code"
				maxlength="6"
				pattern="[0-9]{6}"
				placeholder="123456"
				value={otp}
				oninput={(event) => {
					otp = event.currentTarget.value.replace(/\D/g, '').slice(0, 6);
					formError = null;
					statusMessage = null;
				}}
				aria-label="Kode verifikasi enam angka"
				class="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-center text-lg font-semibold tracking-[0.4em] text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
			/>
			<button
				type="button"
				onclick={verifyCode}
				disabled={submitting || otp.length !== 6}
				class="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{#if submitting}<Spinner label="Memverifikasi kode" />{/if}
				Verifikasi email
			</button>
			<div class="flex flex-col items-center gap-3 text-sm sm:flex-row sm:justify-between">
				<button
					type="button"
					onclick={editDetails}
					disabled={submitting}
					class="font-medium text-zinc-600 hover:text-indigo-700 disabled:opacity-60"
				>
					Ganti email
				</button>
				<button
					type="button"
					onclick={() => sendCode(true)}
					disabled={submitting || cooldown > 0}
					class="font-semibold text-indigo-600 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-zinc-400"
				>
					{#if submitting}Mengirim...{:else if cooldown > 0}Kirim ulang kode ({cooldown} dtk){:else}Kirim ulang kode{/if}
				</button>
			</div>
		</div>
	{:else}
		<div class="space-y-4">
			<p class="text-sm leading-6 text-zinc-600">
				Email <strong class="break-all text-zinc-800">{normalizedEmail}</strong> sudah terverifikasi.
				{verificationOnly
					? 'Kamu bisa melanjutkan masuk ke akunmu.'
					: 'Selesaikan pendaftaran untuk membuat akun Quly.'}
			</p>
			<button
				type="button"
				onclick={verificationOnly ? continueToLogin : finishRegistration}
				disabled={submitting}
				class="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
			>
				{#if submitting}<Spinner label={verificationOnly ? 'Kembali ke login' : 'Membuat akun'} />{/if}
				{verificationOnly ? 'Lanjut ke login' : 'Selesaikan pendaftaran'}
			</button>
			<button
				type="button"
				onclick={editDetails}
				disabled={submitting}
				class="w-full text-sm font-medium text-zinc-600 hover:text-indigo-700"
			>
				Kembali ke data akun
			</button>
		</div>
	{/if}

	<div class="my-6 flex items-center gap-3">
		<span class="h-px flex-1 bg-zinc-200"></span>
		<span class="text-xs font-medium uppercase tracking-wide text-zinc-400">atau</span>
		<span class="h-px flex-1 bg-zinc-200"></span>
	</div>

	<GoogleButton disabled={submitting} label="Daftar dengan Google" onclick={handleGoogleLogin} />

	{#snippet footer()}
		<p>
			Sudah punya akun?
			<a href="/auth/login" class="font-medium text-indigo-600 hover:text-indigo-700">Masuk</a>
		</p>
	{/snippet}
</AuthShell>
