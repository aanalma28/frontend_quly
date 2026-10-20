<script lang="ts">
	import { goto } from '$app/navigation';
	import { ApiError, apiRequest } from '$lib/utils/api';
	import FormField from '$lib/components/ui/FormField.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import CvDropzone from '$lib/components/onboarding/CvDropzone.svelte';
	import ConsentModal from '$lib/components/onboarding/ConsentModal.svelte';

	const steps = ['Personal details', 'Your CV', 'Review'] as const;

	const experienceOptions = [
		{ value: '0', label: 'Fresh graduate / less than 1 year' },
		{ value: '1', label: '1 year' },
		{ value: '2', label: '2 years' },
		{ value: '3', label: '3 years' },
		{ value: '4', label: '4 years' },
		{ value: '5', label: '5 years' },
		{ value: '6', label: 'More than 5 years' }
	];

	let step = $state(0);
	let fullName = $state('');
	let phone = $state('');
	let city = $state('');
	let targetPosition = $state('');
	let experienceYears = $state('0');

	let cvFile = $state<File | null>(null);

	let consentOpen = $state(false);
	let submitting = $state(false);
	let formError = $state<string | null>(null);
	let stepError = $state<string | null>(null);
	let fieldErrors = $state<Record<string, string>>({});

	function validateStep(index: number): boolean {
		const errors: Record<string, string> = {};

		if (index === 0) {
			if (fullName.trim().length < 2) errors.fullName = 'Enter your full name.';
			if (!/^\+?[0-9][0-9\s-]{7,15}$/.test(phone.trim())) {
				errors.phone = 'Enter a valid phone number, e.g. +6281234567890.';
			}
			if (city.trim().length < 2) errors.city = 'Enter your city.';
			if (targetPosition.trim().length < 2) {
				errors.targetPosition = 'Tell us which position you are targeting.';
			}
		}

		if (index === 1 && !cvFile) {
			errors.cv = 'Please upload your CV in PDF format.';
		}

		fieldErrors = errors;
		stepError = Object.keys(errors).length > 0 ? 'Please fix the highlighted fields.' : null;

		return Object.keys(errors).length === 0;
	}

	function goNext() {
		formError = null;
		if (!validateStep(step)) return;
		step = Math.min(steps.length - 1, step + 1);
	}

	function goBack() {
		stepError = null;
		formError = null;
		step = Math.max(0, step - 1);
	}

	function review() {
		formError = null;
		if (!validateStep(0)) {
			step = 0;
			return;
		}
		if (!validateStep(1)) {
			step = 1;
			return;
		}
		consentOpen = true;
	}

	async function submit() {
		const file = cvFile;
		if (!file) {
			consentOpen = false;
			step = 1;
			fieldErrors = { cv: 'Please upload your CV in PDF format.' };
			return;
		}

		consentOpen = false;
		submitting = true;
		formError = null;

		try {
			const body = new FormData();
			body.append('fullName', fullName.trim());
			body.append('phone', phone.trim());
			body.append('city', city.trim());
			body.append('target_position', targetPosition.trim());
			body.append('experience_years', experienceYears);
			body.append('consent_privacy', 'true');
			body.append('consent_email_automation', 'true');
			body.append('cv', file, file.name);

			await apiRequest('onboarding', { method: 'POST', body });
			await goto('/dashboard', { invalidateAll: true });
		} catch (error) {
			formError =
				error instanceof ApiError && error.status < 500
					? error.message
					: 'Could not save your profile. Please try again.';
		} finally {
			submitting = false;
		}
	}
</script>

<main class="flex min-h-screen items-start justify-center bg-zinc-50 px-4 py-10">
	<div class="w-full max-w-xl">
		<header class="mb-8">
			<h1 class="text-2xl font-semibold tracking-tight text-zinc-900">Set up your profile</h1>
			<p class="mt-1 text-sm text-zinc-500">
				We use this to match you with job postings and to write your applications.
			</p>
		</header>

		<ol class="mb-6 flex items-center gap-2" aria-label="Onboarding progress">
			{#each steps as label, index (label)}
				<li class="flex flex-1 items-center gap-2">
					<span
						class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold {index <=
						step
							? 'bg-indigo-600 text-white'
							: 'bg-zinc-200 text-zinc-500'}"
						aria-current={index === step ? 'step' : undefined}
					>
						{index + 1}
					</span>
					<span
						class="hidden text-xs font-medium sm:block {index <= step
							? 'text-zinc-800'
							: 'text-zinc-400'}">{label}</span
					>
					{#if index < steps.length - 1}
						<span class="h-px flex-1 bg-zinc-200"></span>
					{/if}
				</li>
			{/each}
		</ol>

		<div class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
			{#if formError}
				<div
					class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
					role="alert"
				>
					{formError}
				</div>
			{/if}
			{#if stepError}
				<div
					class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
					role="alert"
				>
					{stepError}
				</div>
			{/if}

			{#if step === 0}
				<div class="space-y-4">
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
						id="phone"
						label="WhatsApp number"
						type="tel"
						bind:value={phone}
						autocomplete="tel"
						inputmode="tel"
						placeholder="+6281234567890"
						hint="Used for application and job recommendation notifications."
						required
						error={fieldErrors.phone}
					/>

					<FormField
						id="city"
						label="City"
						bind:value={city}
						autocomplete="address-level2"
						placeholder="Jakarta"
						required
						error={fieldErrors.city}
					/>

					<FormField
						id="targetPosition"
						label="Target position"
						bind:value={targetPosition}
						placeholder="Frontend Developer"
						required
						error={fieldErrors.targetPosition}
					/>

					<div class="space-y-1.5">
						<label for="experienceYears" class="block text-sm font-medium text-zinc-800">
							Years of experience
						</label>
						<select
							id="experienceYears"
							bind:value={experienceYears}
							class="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
						>
							{#each experienceOptions as option (option.value)}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
				</div>
			{:else if step === 1}
				<div class="space-y-2">
					<p class="text-sm text-zinc-600">
						Upload your most recent CV. Our AI parses it to build your profile and to generate
						tailored applications.
					</p>
					<CvDropzone bind:file={cvFile} error={fieldErrors.cv} />
				</div>
			{:else}
				<dl class="divide-y divide-zinc-100 text-sm">
					<div class="flex justify-between gap-4 py-2.5">
						<dt class="text-zinc-500">Full name</dt>
						<dd class="text-right font-medium text-zinc-900">{fullName || '—'}</dd>
					</div>
					<div class="flex justify-between gap-4 py-2.5">
						<dt class="text-zinc-500">WhatsApp</dt>
						<dd class="text-right font-medium text-zinc-900">{phone || '—'}</dd>
					</div>
					<div class="flex justify-between gap-4 py-2.5">
						<dt class="text-zinc-500">City</dt>
						<dd class="text-right font-medium text-zinc-900">{city || '—'}</dd>
					</div>
					<div class="flex justify-between gap-4 py-2.5">
						<dt class="text-zinc-500">Target position</dt>
						<dd class="text-right font-medium text-zinc-900">{targetPosition || '—'}</dd>
					</div>
					<div class="flex justify-between gap-4 py-2.5">
						<dt class="text-zinc-500">Experience</dt>
						<dd class="text-right font-medium text-zinc-900">
							{experienceOptions.find((option) => option.value === experienceYears)?.label ?? '—'}
						</dd>
					</div>
					<div class="flex justify-between gap-4 py-2.5">
						<dt class="text-zinc-500">CV</dt>
						<dd class="max-w-[60%] truncate text-right font-medium text-zinc-900">
							{cvFile?.name ?? '—'}
						</dd>
					</div>
				</dl>

				<p class="mt-4 text-xs text-zinc-500">
					When you continue, you will be asked to confirm how we may use your data and send
					applications on your behalf.
				</p>
			{/if}

			<div class="mt-6 flex items-center justify-between gap-3">
				<button
					type="button"
					onclick={goBack}
					disabled={step === 0 || submitting}
					class="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Back
				</button>

				{#if step < steps.length - 1}
					<button
						type="button"
						onclick={goNext}
						class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
					>
						Continue
					</button>
				{:else}
					<button
						type="button"
						onclick={review}
						disabled={submitting}
						class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
					>
						{#if submitting}
							<Spinner label="Saving profile" />
						{/if}
						Finish setup
					</button>
				{/if}
			</div>
		</div>
	</div>
</main>

<ConsentModal
	open={consentOpen}
	loading={submitting}
	onaccept={submit}
	ondecline={() => (consentOpen = false)}
/>
