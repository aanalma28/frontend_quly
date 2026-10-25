<script lang="ts">
	import { Award, CheckCircle2, Download, RefreshCw, Sparkles, XCircle } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/onboarding/Alert.svelte';
	import { ApiError } from '#lib/utils/api.js';
	import {
		categoryLabel,
		categoryTone,
		competencyLabel,
		formatDate
	} from './labels.js';
	import {
		downloadCertificateApi,
		generateCertificateApi,
		type AttemptDetail,
		type AttemptDetailPackage,
		type PackageScoreResult,
		type PersonalityPackageResult,
		type ScoredPackageResult
	} from '#lib/services/psychotestApi.js';

	interface Props {
		attempt: AttemptDetail;
	}

	let { attempt }: Props = $props();

	let generated = $state<AttemptDetail | null>(null);
	let isGenerating = $state(false);
	let isDownloading = $state(false);
	let errorMessage = $state<string | null>(null);

	const current = $derived<AttemptDetail>(generated ?? attempt);
	const aiAnalysis = $derived(current.aiAnalysis);
	const quota = $derived(current.quota.certificate);
	const quotaExhausted = $derived(quota.limit !== -1 && quota.remaining === 0);
	const completedCount = $derived(
		current.packages.filter((pkg) => pkg.status === 'COMPLETED').length
	);

	function isScored(result: PackageScoreResult | null): result is ScoredPackageResult {
		return !!result && (result.category === 'COGNITIVE' || result.category === 'ACCURACY');
	}

	function isPersonality(result: PackageScoreResult | null): result is PersonalityPackageResult {
		return !!result && result.category === 'PERSONALITY';
	}

	function quotaLabel(): string {
		if (quota.limit === -1) return 'Unlimited';
		return `${quota.remaining} / ${quota.limit}`;
	}

	async function generate() {
		if (isGenerating || quotaExhausted) return;
		isGenerating = true;
		errorMessage = null;
		try {
			generated = await generateCertificateApi(current.attemptId);
		} catch (error) {
			if (error instanceof ApiError) {
				if (error.status === 503) {
					errorMessage = 'Layanan AI sedang tidak tersedia. Silakan coba lagi nanti.';
				} else if (error.status === 502) {
					errorMessage = 'Gagal membuat analisis AI. Silakan coba lagi.';
				} else {
					errorMessage = error.message;
				}
			} else {
				errorMessage = 'Gagal membuat analisis & sertifikat. Silakan coba lagi.';
			}
		} finally {
			isGenerating = false;
		}
	}

	async function download() {
		if (isDownloading) return;
		isDownloading = true;
		errorMessage = null;
		try {
			const blob = await downloadCertificateApi(current.attemptId);
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `sertifikat-psikotes-${current.attemptId}.pdf`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
		} catch (error) {
			errorMessage =
				error instanceof ApiError
					? error.message
					: 'Sertifikat belum dapat diunduh. Silakan coba lagi.';
		} finally {
			isDownloading = false;
		}
	}
</script>

<div class="space-y-6">
	{#if errorMessage}
		<Alert type="error" message={errorMessage} dismissible ondismiss={() => (errorMessage = null)} />
	{/if}

	<section class="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="flex items-start gap-4">
				<span class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
					<CheckCircle2 size={24} />
				</span>
				<div>
					<h1 class="text-xl font-bold tracking-tight text-slate-950">Psikotes selesai</h1>
					<p class="mt-1 text-sm leading-6 text-slate-600">
						{current.candidate.fullName} · {current.candidate.email}
					</p>
					<p class="mt-1 text-xs text-slate-500">
						Mulai {formatDate(current.startedAt)} · Selesai {formatDate(current.completedAt)}
					</p>
				</div>
			</div>
			<span class="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
				{completedCount}/{current.packages.length} paket selesai
			</span>
		</div>
	</section>

	<section class="space-y-4">
		<h2 class="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">Hasil per paket</h2>
		{#each current.packages as pkg (pkg.packageId)}
			<article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<span class="rounded-full px-2.5 py-1 text-[11px] font-semibold {categoryTone[pkg.category]}">
							{categoryLabel[pkg.category]}
						</span>
						<h3 class="mt-2 text-base font-semibold text-slate-950">{pkg.title}</h3>
					</div>
					{#if pkg.scoreResult && isScored(pkg.scoreResult)}
						<span
							class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold {pkg
								.scoreResult.passed
								? 'bg-emerald-50 text-emerald-700'
								: 'bg-rose-50 text-rose-700'}"
						>
							{#if pkg.scoreResult.passed}
								<CheckCircle2 size={13} /> Lulus
							{:else}
								<XCircle size={13} /> Belum lulus
							{/if}
						</span>
					{:else if pkg.status === 'IN_PROGRESS'}
						<span class="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
							Belum selesai
						</span>
					{/if}
				</div>

				{#if pkg.scoreResult}
					{#if isScored(pkg.scoreResult)}
						<dl class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
							<div class="rounded-xl bg-slate-50 p-3">
								<dt class="text-[11px] font-medium text-slate-500">Benar</dt>
								<dd class="mt-0.5 text-lg font-bold text-slate-900">{pkg.scoreResult.correct}</dd>
							</div>
							<div class="rounded-xl bg-slate-50 p-3">
								<dt class="text-[11px] font-medium text-slate-500">Salah</dt>
								<dd class="mt-0.5 text-lg font-bold text-slate-900">{pkg.scoreResult.incorrect}</dd>
							</div>
							<div class="rounded-xl bg-slate-50 p-3">
								<dt class="text-[11px] font-medium text-slate-500">Akurasi</dt>
								<dd class="mt-0.5 text-lg font-bold text-slate-900">{pkg.scoreResult.accuracy}%</dd>
							</div>
							<div class="rounded-xl bg-slate-50 p-3">
								<dt class="text-[11px] font-medium text-slate-500">Dilewati</dt>
								<dd class="mt-0.5 text-lg font-bold text-slate-900">{pkg.scoreResult.skipped}</dd>
							</div>
						</dl>
					{:else if isPersonality(pkg.scoreResult)}
						<div class="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
							<p class="text-[11px] font-medium text-indigo-600">Profil dominan</p>
							<p class="mt-0.5 text-sm font-semibold text-slate-900">
								{pkg.scoreResult.dominantTrait ?? pkg.scoreResult.dominantOption ?? '—'}
							</p>
							{#if Object.keys(pkg.scoreResult.distribution).length > 0}
								<div class="mt-2 flex flex-wrap gap-2">
									{#each Object.entries(pkg.scoreResult.distribution) as [key, count] (key)}
										<span class="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-slate-600">
											{key}: {count}
										</span>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
					<p class="mt-3 text-sm leading-6 text-slate-600">{pkg.scoreResult.summary}</p>
				{:else}
					<p class="mt-3 text-sm text-slate-500">Paket ini belum dikerjakan.</p>
				{/if}
			</article>
		{/each}
	</section>

	<section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
		<h2 class="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">Skor agregat</h2>
		<dl class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
			<div class="rounded-xl bg-slate-50 p-3">
				<dt class="text-[11px] font-medium text-slate-500">Rata-rata akurasi</dt>
				<dd class="mt-0.5 text-lg font-bold text-slate-900">
					{current.aggregateScore.averageAccuracy ?? '—'}{current.aggregateScore.averageAccuracy !== null
						? '%'
						: ''}
				</dd>
			</div>
			<div class="rounded-xl bg-slate-50 p-3">
				<dt class="text-[11px] font-medium text-slate-500">Total benar</dt>
				<dd class="mt-0.5 text-lg font-bold text-slate-900">{current.aggregateScore.totalCorrect}</dd>
			</div>
			<div class="rounded-xl bg-slate-50 p-3">
				<dt class="text-[11px] font-medium text-slate-500">Total salah</dt>
				<dd class="mt-0.5 text-lg font-bold text-slate-900">{current.aggregateScore.totalIncorrect}</dd>
			</div>
			<div class="rounded-xl bg-slate-50 p-3">
				<dt class="text-[11px] font-medium text-slate-500">Total dilewati</dt>
				<dd class="mt-0.5 text-lg font-bold text-slate-900">{current.aggregateScore.totalSkipped}</dd>
			</div>
		</dl>
		{#if current.aggregateScore.personality?.dominantTrait}
			<p class="mt-4 text-sm text-slate-600">
				Profil kepribadian dominan:
				<span class="font-semibold text-slate-900">{current.aggregateScore.personality.dominantTrait}</span>
			</p>
		{/if}
	</section>

	<section class="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/60 to-white p-5 shadow-sm sm:p-6">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex items-center gap-2">
				<Sparkles size={18} class="text-violet-600" />
				<h2 class="text-lg font-semibold text-slate-950">Sertifikat &amp; Analisis AI</h2>
			</div>
			<span class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
				Kuota: {quotaLabel()}
			</span>
		</div>

		{#if aiAnalysis}
			<div class="mt-5 flex flex-wrap items-center gap-3">
				<span class="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white">
					Skor {aiAnalysis.overallScore}
				</span>
				<span class="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-200">
					{competencyLabel[aiAnalysis.competencyLevel]}
				</span>
				<span class="text-xs text-slate-500">No. {aiAnalysis.certificateNumber}</span>
			</div>

			<p class="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{aiAnalysis.summary}</p>

			<div class="mt-5 grid gap-4 sm:grid-cols-2">
				<div>
					<h3 class="flex items-center gap-2 text-sm font-semibold text-slate-900">
						<CheckCircle2 size={15} class="text-emerald-600" /> Kekuatan
					</h3>
					<ul class="mt-2 space-y-1.5">
						{#each aiAnalysis.strengths as item (item)}
							<li class="flex items-start gap-2 text-sm leading-6 text-slate-600">
								<span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"></span>{item}
							</li>
						{/each}
					</ul>
				</div>
				<div>
					<h3 class="flex items-center gap-2 text-sm font-semibold text-slate-900">
						<Award size={15} class="text-amber-600" /> Area pengembangan
					</h3>
					<ul class="mt-2 space-y-1.5">
						{#each aiAnalysis.areasForImprovement as item (item)}
							<li class="flex items-start gap-2 text-sm leading-6 text-slate-600">
								<span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"></span>{item}
							</li>
						{/each}
					</ul>
				</div>
			</div>

			{#if aiAnalysis.recommendedRoles.length > 0}
				<div class="mt-5">
					<h3 class="text-sm font-semibold text-slate-900">Role yang direkomendasikan</h3>
					<div class="mt-2 flex flex-wrap gap-2">
						{#each aiAnalysis.recommendedRoles as role (role)}
							<span class="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">{role}</span>
						{/each}
					</div>
				</div>
			{/if}

			<div class="mt-6 flex flex-wrap items-center gap-3">
				<button
					type="button"
					onclick={() => void download()}
					disabled={isDownloading || !current.certificate.available}
					class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{#if isDownloading}
						<Spinner label="Mengunduh sertifikat" /> Mengunduh...
					{:else}
						<Download size={16} /> Download Sertifikat PDF
					{/if}
				</button>
				<span class="text-xs text-slate-500">Diterbitkan {formatDate(aiAnalysis.issuedAt)}</span>
			</div>
		{:else}
			<p class="mt-3 text-sm leading-6 text-slate-600">
				Buat analisis AI dan sertifikat kompetensi berdasarkan hasil seluruh paket tes.
			</p>

			{#if quotaExhausted}
				<div class="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
					Kuota Generate Sertifikat Anda habis.
				</div>
			{/if}

			<div class="mt-5">
				<button
					type="button"
					onclick={() => void generate()}
					disabled={isGenerating || quotaExhausted}
					class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{#if isGenerating}
						<Spinner label="Membuat analisis AI" /> Membuat analisis AI...
					{:else}
						<Sparkles size={16} /> Generate Sertifikat &amp; Analisis AI
					{/if}
				</button>
			</div>
		{/if}
	</section>

	<div class="flex flex-wrap items-center justify-between gap-3 pb-4">
		<a
			href="/dashboard/psychotest/history"
			class="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
		>
			<RefreshCw size={16} /> Riwayat psikotes
		</a>
		<a
			href="/dashboard/psychotest"
			class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
		>
			Kembali ke psikotes
		</a>
	</div>
</div>
