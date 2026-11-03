<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowRight, Coins, Sparkles } from '@lucide/svelte';
	import CvDropzone from '#lib/components/onboarding/CvDropzone.svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import { getMyBenefitsApi, type UserBenefitQuota } from '#lib/services/billingApi.js';
	import { onboarding, parseCv, setStep, updateRawCvData } from '#lib/stores/onboardingStore.js';
	import { benefitAccessMode, freeLifetimeRemaining } from '#lib/utils/benefitAccess.js';
	import { formatNumber, formatRupiah, isUnlimitedQuota } from '#lib/utils/billing.js';

	let cvFile = $state<File | null>(null);
	let cvBenefit = $state<UserBenefitQuota | null>(null);
	let creditBalance = $state(0);
	let benefitLoading = $state(true);
	let benefitError = $state<string | null>(null);

	const legacyQuota = $derived($onboarding.conversionQuota);
	const legacyQuotaKnown = $derived(legacyQuota !== null);
	const legacyQuotaExhausted = $derived(
		legacyQuotaKnown && legacyQuota !== null && legacyQuota.remaining !== -1 && legacyQuota.remaining <= 0
	);
	const accessMode = $derived(
		cvBenefit ? benefitAccessMode(cvBenefit, creditBalance) : null
	);
	const hasAccess = $derived(
		cvBenefit
			? accessMode !== null && accessMode !== 'none'
			: legacyQuotaKnown && !legacyQuotaExhausted
	);
	const uploadDisabled = $derived(
		$onboarding.isParsing ||
			$onboarding.isLoadingProfile ||
			benefitLoading ||
			!hasAccess
	);

	onMount(async () => {
		try {
			const data = await getMyBenefitsApi();
			cvBenefit = data.benefits.find((benefit) => benefit.code === 'CV_EXTRACTION') ?? null;
			creditBalance = data.creditBalance;
			if (!cvBenefit) {
				benefitError = 'Benefit Ekstraksi CV belum aktif di paketmu.';
			}
		} catch (error) {
			benefitError =
				error instanceof Error ? error.message : 'Kuota ekstraksi CV belum dapat dimuat.';
		} finally {
			benefitLoading = false;
		}
	});

	function handleFile(file: File) {
		void parseCv(file);
	}

	function continueManually() {
		if (!$onboarding.rawCvData) updateRawCvData({});
		setStep(2);
	}

	function quotaSummary(): string {
		if (benefitLoading) return 'Memeriksa kuota ekstraksi...';
		if (cvBenefit) {
			const freeLeft = freeLifetimeRemaining(cvBenefit);
			if (freeLeft > 0) {
				return `Ekstraksi gratis tersisa ${formatNumber(freeLeft)}×`;
			}
			if (isUnlimitedQuota(cvBenefit.limit)) return 'Kuota ekstraksi: tanpa batas';
			if (cvBenefit.remaining > 0) {
				return `Sisa kuota ${formatNumber(cvBenefit.remaining)}/${formatNumber(cvBenefit.limit)}`;
			}
			if (accessMode === 'credit') {
				return `Kuota habis · ${formatNumber(cvBenefit.creditCost)} kredit (${formatRupiah(cvBenefit.overageCostIdr)})`;
			}
			return 'Kuota & kredit tidak cukup';
		}
		if (legacyQuotaKnown && legacyQuota) {
			return legacyQuota.remaining === -1
				? 'Kuota konversi: tanpa batas'
				: `Sisa kuota ${legacyQuota.remaining}/${legacyQuota.limit}`;
		}
		return 'Kuota belum tersedia';
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
			{quotaSummary()}
		</span>
	</div>

	<CvDropzone
		bind:file={cvFile}
		disabled={uploadDisabled}
		onfilechange={handleFile}
		error={!benefitLoading && !hasAccess
			? 'Kuota ekstraksi CV habis dan saldo kredit tidak mencukupi.'
			: benefitError && !cvBenefit
				? benefitError
				: undefined}
	/>

	{#if accessMode === 'credit' && cvBenefit}
		<div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
			<p class="flex items-center gap-2">
				<Coins size={16} />
				Kuota habis. Ekstraksi ini akan memakai <strong>{cvBenefit.creditCost} kredit</strong>
				(± {formatRupiah(cvBenefit.overageCostIdr)}).
			</p>
			<a href="/billing#kredit-kilat" class="text-xs font-semibold underline">Top-up kredit</a>
		</div>
	{:else if !benefitLoading && !hasAccess}
		<div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
			<p>Kuota ekstraksi CV habis dan saldo kredit tidak cukup.</p>
			<div class="flex gap-3">
				<a href="/billing#kredit-kilat" class="text-xs font-semibold underline">Top-up kredit</a>
				<a href="/billing#paket" class="text-xs font-semibold underline">Lihat paket</a>
			</div>
		</div>
	{/if}

	{#if $onboarding.isParsing}
		<div
			class="flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-800"
			role="status"
		>
			<Spinner label="AI sedang menormalisasi CV Anda" />
			AI sedang menormalisasi CV Anda...
		</div>
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
