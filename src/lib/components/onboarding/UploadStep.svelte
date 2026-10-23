<script lang="ts">
	import { ArrowRight, Sparkles } from '@lucide/svelte';
	import CvDropzone from '#lib/components/onboarding/CvDropzone.svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/onboarding/Alert.svelte';
	import {
		onboarding,
		clearError,
		parseCv,
		setStep,
		updateRawCvData
	} from '#lib/stores/onboardingStore.js';

	let cvFile = $state<File | null>(null);

	const quota = $derived($onboarding.conversionQuota);
	const quotaKnown = $derived(quota !== null);
	const quotaExhausted = $derived(
		quotaKnown && quota !== null && quota.remaining !== -1 && quota.remaining <= 0
	);

	const uploadDisabled = $derived(
		$onboarding.isParsing || $onboarding.isLoadingProfile || !quotaKnown || quotaExhausted
	);

	function handleFile(file: File) {
		void parseCv(file);
	}

	function continueManually() {
		if (!$onboarding.rawCvData) updateRawCvData({});
		setStep(2);
	}
</script>

<section class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div class="flex items-start gap-3">
			<span class="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
				<Sparkles size={20} />
			</span>
			<div>
				<h2 class="font-semibold text-slate-950">AI ATS CV Converter</h2>
				<p class="mt-1 text-sm text-slate-500">Normalisasi CV PDF menjadi profil terstruktur.</p>
			</div>
		</div>
		<span class="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
			Plan: {$onboarding.hasSavedProfile ? 'Profil tersimpan' : 'Onboarding baru'}
			<span class="mx-1 text-indigo-300">|</span>
			{#if quotaKnown && quota !== null}
				Sisa Kuota Konversi CV:
				{quota.remaining === -1 ? 'Tanpa batas' : `${quota.remaining}/${quota.limit}`}
			{:else}
				Kuota konversi CV belum tersedia
			{/if}
		</span>
	</div>

	<CvDropzone
		bind:file={cvFile}
		disabled={uploadDisabled}
		onfilechange={handleFile}
		error={quotaKnown && quotaExhausted
			? 'Kuota konversi CV Anda telah habis.'
			: !quotaKnown
				? 'Kuota belum dapat diverifikasi. Muat ulang profil atau hubungi dukungan.'
				: undefined}
	/>

	{#if $onboarding.isParsing}
		<div
			class="flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-800"
			role="status"
		>
			<Spinner label="AI sedang menormalisasi CV Anda" />
			AI sedang menormalisasi CV Anda...
		</div>
	{/if}

	{#if quotaExhausted}
		<a
			href="/billing#paket"
			class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
		>
			Upgrade kuota <ArrowRight size={16} />
		</a>
	{/if}

	<div class="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
		<p class="text-xs text-slate-500">
			Unggah CV agar profil terisi otomatis, atau lanjutkan untuk mengisi manual.
		</p>
		<button
			type="button"
			onclick={continueManually}
			class="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
		>
			Lanjut tanpa CV <ArrowRight size={16} />
		</button>
	</div>
</section>
