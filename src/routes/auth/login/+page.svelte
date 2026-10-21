<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { login } from '#lib/stores/auth.js';
	import { ApiError, getApiUrl } from '#lib/utils/api.js';
	import { isUnverifiedEmailError, normalizeEmail } from '#lib/utils/email-auth.js';
	import AuthShell from '$lib/components/auth/AuthShell.svelte';
	import GoogleButton from '$lib/components/auth/GoogleButton.svelte';
	import FormField from '$lib/components/ui/FormField.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	let email = $state(page.url.searchParams.get('email') ?? '');
	let password = $state('');
	let submitting = $state(false);
	let validationAttempted = $state(false);
	let statusMessage = $state<string | null>(
		page.url.searchParams.get('message') === 'onboarding_skipped'
			? 'Anda telah keluar. Login kembali dan selesaikan onboarding untuk membuka dashboard.'
			: page.url.searchParams.get('registered') === '1'
				? 'Pendaftaran berhasil. Silakan masuk dengan email dan kata sandi.'
				: page.url.searchParams.get('verified') === '1'
					? 'Email berhasil diverifikasi. Silakan masuk dengan kata sandi.'
					: null
	);
	let formError = $state<string | null>(
		page.url.searchParams.get('error') === 'OAuthFailed'
			? 'Masuk dengan Google belum berhasil. Silakan coba lagi.'
			: null
	);
	const fieldErrors = $derived(validationAttempted ? getFieldErrors() : {});

	const redirectTo = $derived(page.url.searchParams.get('redirectTo') || '/dashboard');

	function handleGoogleLogin() {
		window.location.href = getApiUrl('/auth/google');
	}

	function getFieldErrors(): { email?: string; password?: string } {
		const errors: { email?: string; password?: string } = {};

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
			errors.email = 'Enter a valid email address.';
		}
		if (password.length === 0) {
			errors.password = 'Password is required.';
		}

		return errors;
	}

	function validate(): boolean {
		validationAttempted = true;
		const errors = getFieldErrors();
		return Object.keys(errors).length === 0;
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		formError = null;
		statusMessage = null;

		if (!validate()) return;

		submitting = true;
		try {
			await login(normalizeEmail(email), password, redirectTo);
		} catch (error) {
			if (error instanceof ApiError && isUnverifiedEmailError(error.status, error.message)) {
				const params = new URLSearchParams({
					verifyEmail: '1',
					email: normalizeEmail(email)
				});
				await goto(`/auth/register?${params.toString()}`);
				return;
			}
			formError =
				error instanceof Error && error.message
					? error.message
					: 'Unable to sign in right now. Please try again.';
		} finally {
			submitting = false;
		}
	}
</script>

<AuthShell title="Welcome back" subtitle="Sign in to continue to your job hunt">
	<form
		class="space-y-4"
		onsubmit={handleSubmit}
		oninput={() => {
			formError = null;
			statusMessage = null;
		}}
		novalidate
	>
		{#if statusMessage}
			<div
				class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
				role="status"
			>
				{statusMessage}
			</div>
		{/if}
		{#if formError}
			<div
				class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
				role="alert"
			>
				{formError}
			</div>
		{/if}

		<FormField
			id="email"
			label="Email"
			type="email"
			bind:value={email}
			autocomplete="email"
			inputmode="email"
			placeholder="you@example.com"
			required
			error={fieldErrors.email}
		/>

		<FormField
			id="password"
			label="Password"
			type="password"
			bind:value={password}
			autocomplete="current-password"
			placeholder="Enter your password"
			required
			error={fieldErrors.password}
		/>

		<div class="flex justify-end">
			<a
				href="/auth/forgot-password"
				class="text-sm font-medium text-indigo-600 hover:text-indigo-700"
			>
				Forgot password?
			</a>
		</div>

		<button
			type="submit"
			disabled={submitting}
			class="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
		>
			{#if submitting}
				<Spinner label="Signing in" />
			{/if}
			Sign in
		</button>
	</form>

	<div class="my-6 flex items-center gap-3">
		<span class="h-px flex-1 bg-zinc-200"></span>
		<span class="text-xs font-medium uppercase tracking-wide text-zinc-400">or</span>
		<span class="h-px flex-1 bg-zinc-200"></span>
	</div>

	<GoogleButton
		disabled={submitting}
		label="Masuk dengan Google"
		onclick={handleGoogleLogin}
	/>

	{#snippet footer()}
		<p>
			Don't have an account?
			<a href="/auth/register" class="font-medium text-indigo-600 hover:text-indigo-700">
				Create one
			</a>
		</p>
	{/snippet}
</AuthShell>
