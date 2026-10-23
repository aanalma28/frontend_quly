<script lang="ts">
	import { onMount } from 'svelte';
	import Alert from '#lib/components/onboarding/Alert.svelte';
	import AtsPreviewStep from '#lib/components/onboarding/AtsPreviewStep.svelte';
	import ReviewStep from '#lib/components/onboarding/ReviewStep.svelte';
	import UploadStep from '#lib/components/onboarding/UploadStep.svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import { clearError, loadProfile, onboarding } from '#lib/stores/onboardingStore.js';

	onMount(() => {
		void loadProfile();
	});

	const steps = [
		{ id: 1, label: 'Unggah CV' },
		{ id: 2, label: 'Tinjau & lengkapi' },
		{ id: 3, label: 'Pratinjau ATS' }
	] as const;
</script>

<svelte:head>
	<title>Profil &amp; Ekstraksi CV | Quly</title>
	<meta name="description" content="Kelola profil karier dan preferensi AI Quly." />
</svelte:head>

<div class="mx-auto max-w-5xl space-y-7">
	<header>
		<p class="text-sm font-semibold text-indigo-600">Profil karier</p>
		<h1 class="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
			Profil &amp; Ekstraksi CV
		</h1>
		<p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
			Unggah CV untuk mengisi profil secara otomatis, tinjau dan sesuaikan data, lalu buat CV ATS
			yang siap digunakan.
		</p>
	</header>

	{#if $onboarding.errorMessage}
		<Alert type="error" message={$onboarding.errorMessage} dismissible ondismiss={clearError} />
	{/if}

	<nav aria-label="Tahap onboarding" class="grid grid-cols-3 gap-2">
		{#each steps as step}
			{@const active = $onboarding.currentStep === step.id}
			{@const done = $onboarding.currentStep > step.id}
			<div
				class="rounded-xl px-3 py-2.5 text-center text-xs font-semibold {active
					? 'bg-indigo-50 text-indigo-700'
					: done
						? 'bg-emerald-50 text-emerald-700'
						: 'bg-slate-100 text-slate-400'}"
				aria-current={active ? 'step' : undefined}
			>
				<span
					class="mr-1.5 inline-flex size-5 items-center justify-center rounded-full {active
						? 'bg-indigo-600 text-white'
						: done
							? 'bg-emerald-500 text-white'
							: 'bg-slate-300 text-slate-600'} text-[10px] font-bold"
				>
					{step.id}
				</span>
				{step.label}
			</div>
		{/each}
	</nav>

	{#if $onboarding.isLoadingProfile}
		<section class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm" aria-live="polite">
			<div class="flex items-center gap-3 text-sm text-slate-500">
				<Spinner label="Memuat profil" />
				Memuat profil dan kuota konversi CV...
			</div>
		</section>
	{:else if $onboarding.currentStep === 1}
		<UploadStep />
	{:else if $onboarding.currentStep === 2}
		<ReviewStep />
	{:else}
		<AtsPreviewStep />
	{/if}
</div>
