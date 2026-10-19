<script lang="ts">
	import { loginWithGoogle, register } from '#lib/stores/auth.js';
	import AuthShell from '$lib/components/auth/AuthShell.svelte';
	import GoogleButton from '$lib/components/auth/GoogleButton.svelte';
	import FormField from '$lib/components/ui/FormField.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	let fullName = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let acceptedTerms = $state(false);
	let submitting = $state(false);
	let formError = $state<string | null>(null);
	let fieldErrors = $state<{
		fullName?: string;
		email?: string;
		password?: string;
		confirmPassword?: string;
		terms?: string;
	}>({});

	function validate(): boolean {
		const errors: typeof fieldErrors = {};

		if (fullName.trim().length < 2) {
			errors.fullName = 'Enter your full name.';
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
			errors.email = 'Enter a valid email address.';
		}
		if (password.length < 8) {
			errors.password = 'Use at least 8 characters.';
		}
		if (confirmPassword !== password) {
			errors.confirmPassword = 'Passwords do not match.';
		}
		if (!acceptedTerms) {
			errors.terms = 'You must accept the terms and privacy policy.';
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
			await register(email.trim(), password, {
				fullName: fullName.trim(),
				acceptedTerms: true
			});
		} catch (error) {
			formError =
				error instanceof Error && error.message
					? error.message
					: 'Unable to create your account right now. Please try again.';
			fieldErrors = {};
		} finally {
			submitting = false;
		}
	}
</script>

<AuthShell title="Create your account" subtitle="Start automating your job applications in minutes">
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
			id="fullName"
			label="Full name"
			bind:value={fullName}
			autocomplete="name"
			placeholder="Budi Santoso"
			required
			error={fieldErrors.fullName}
		/>

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
			autocomplete="new-password"
			placeholder="At least 8 characters"
			required
			error={fieldErrors.password}
		/>

		<FormField
			id="confirmPassword"
			label="Confirm password"
			type="password"
			bind:value={confirmPassword}
			autocomplete="new-password"
			placeholder="Repeat your password"
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
					I agree to the Terms of Service and Privacy Policy, including the use of my data to
					search and apply for jobs on my behalf.
				</span>
			</label>
			{#if fieldErrors.terms}
				<p class="text-xs text-red-600">{fieldErrors.terms}</p>
			{/if}
		</div>

		<button
			type="submit"
			disabled={submitting}
			class="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
		>
			{#if submitting}
				<Spinner label="Creating account" />
			{/if}
			Create account
		</button>
	</form>

	<div class="my-6 flex items-center gap-3">
		<span class="h-px flex-1 bg-zinc-200"></span>
		<span class="text-xs font-medium uppercase tracking-wide text-zinc-400">or</span>
		<span class="h-px flex-1 bg-zinc-200"></span>
	</div>

	<GoogleButton disabled={submitting} label="Sign up with Google" onclick={loginWithGoogle} />

	{#snippet footer()}
		<p>
			Already have an account?
			<a href="/auth/login" class="font-medium text-indigo-600 hover:text-indigo-700">Sign in</a>
		</p>
	{/snippet}
</AuthShell>
