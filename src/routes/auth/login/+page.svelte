<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ApiError, apiRequest } from '$lib/utils/api';
	import AuthShell from '$lib/components/auth/AuthShell.svelte';
	import GoogleButton from '$lib/components/auth/GoogleButton.svelte';
	import FormField from '$lib/components/ui/FormField.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	let email = $state('');
	let password = $state('');
	let submitting = $state(false);
	let formError = $state<string | null>(null);
	let fieldErrors = $state<{ email?: string; password?: string }>({});

	const redirectTo = $derived(page.url.searchParams.get('redirectTo') || '/dashboard');

	function validate(): boolean {
		const errors: { email?: string; password?: string } = {};

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
			errors.email = 'Enter a valid email address.';
		}
		if (password.length === 0) {
			errors.password = 'Password is required.';
		}

		fieldErrors = errors;
		return Object.keys(errors).length === 0;
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		formError = null;

		if (!validate()) return;

		submitting = true;
		try {
			await apiRequest('auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: email.trim(), password })
			});
			await goto(redirectTo, { invalidateAll: true });
		} catch (error) {
			formError =
				error instanceof ApiError && error.status < 500
					? error.message
					: 'Unable to sign in right now. Please try again.';
			fieldErrors = {};
		} finally {
			submitting = false;
		}
	}
</script>

<AuthShell title="Welcome back" subtitle="Sign in to continue to your job hunt">
	<form class="space-y-4" onsubmit={handleSubmit} novalidate>
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

	<GoogleButton disabled={submitting} />

	{#snippet footer()}
		<p>
			Don't have an account?
			<a href="/auth/register" class="font-medium text-indigo-600 hover:text-indigo-700">
				Create one
			</a>
		</p>
	{/snippet}
</AuthShell>
