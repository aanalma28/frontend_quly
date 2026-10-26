<script lang="ts">
	import {
		Award,
		CheckCircle2,
		Download,
		QrCode,
		RefreshCw,
		Sparkles,
		XCircle
	} from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/onboarding/Alert.svelte';
	import WorkCurveChart from './WorkCurveChart.svelte';
	import { ApiError } from '#lib/utils/api.js';
	import { categoryLabel, categoryTone, competencyLabel, formatDate } from './labels.js';
	import {
		downloadCertificateApi,
		generateCertificateApi,
		type AccuracyScoreResult,
		type CognitiveScoreResult,
		type PackageScoreResult,
		type PersonalityScoreResult,
		type SessionDetail
	} from '#lib/services/psychotestApi.js';

	interface Props {
		session: SessionDetail;
	}

	let { session }: Props = $props();

	let generated = $state<SessionDetail | null>(null);
	let isGenerating = $state(false);
	let isDownloading = $state(false);
	let errorMessage = $state<string | null>(null);

	const current = $derived<SessionDetail>(generated ?? session);
	const aiAnalysis = $derived(current.aiAnalysis);
	const quota = $derived(current.quota.certificate);
	const quotaExhausted = $derived(quota.limit !== -1 && quota.remaining === 0);
	const completedCount = $derived(
		current.attempts.filter((attempt) => attempt.status === 'COMPLETED').length
	);

	function isCognitive(result: PackageScoreResult | null): result is CognitiveScoreResult {
		return !!result && result.category === 'COGNITIVE';
	}

	function isAccuracy(result: PackageScoreResult | null): result is AccuracyScoreResult {
		return !!result && result.category === 'ACCURACY';
	}

	function isPersonality(result: PackageScoreResult | null): result is PersonalityScoreResult {
		return !!result && result.category === 'PERSONALITY';
	}

	function completionRatio(result: PackageScoreResult): string {
		if (!result.totalQuestions) return '—';
		return `${Math.round((result.answered / result.totalQuestions) * 100)}%`;
	}

	function avgTimeLabel(result: CognitiveScoreResult): string {
		if (result.averageMsPerQuestion === null) return '—';
		return `${(result.averageMsPerQuestion / 1000).toFixed(1)}s/soal`;
	}

	function workCurveCorrect(result: AccuracyScoreResult): number[] {
		return (result.workCurve ?? []).map((point) => point.correct);
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
			generated = await generateCertificateApi(current.sessionId);
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
			const blob = await downloadCertificateApi(current.sessionId);
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `laporan-psikotes-${current.sessionId}.pdf`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
		} catch (error) {
			errorMessage =
				error instanceof ApiError
					? error.message
					: 'Laporan belum dapat diunduh. Silakan coba lagi.';
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
				{completedCount}/{current.attempts.length} paket selesai
			</span>
		</div>
	</section>

	<section class="space-y-4">
		<h2 class="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">Hasil per paket</h2>
		{#each current.attempts as attempt (attempt.attemptId)}
			<article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<span class="rounded-full px-2.5 py-1 text-[11px] font-semibold {categoryTone[attempt.category]}">
							{categoryLabel[attempt.category]}
						</span>
						<h3 class="mt-2 text-base font-semibold text-slate-950">{attempt.title}</h3>
					</div>
					{#if attempt.status === 'IN_PROGRESS'}
						<span class="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
							Belum selesai
						</span>
					{/if}
				</div>

				{#if isCognitive(attempt.scoreResult)}
					<dl class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
						<div class="rounded-xl bg-slate-50 p-3">
							<dt class="text-[11px] font-medium text-slate-500">Akurasi</dt>
							<dd class="mt-0.5 text-lg font-bold text-slate-900">{attempt.scoreResult.accuracy}%</dd>
						</div>
						<div class="rounded-xl bg-slate-50 p-3">
							<dt class="text-[11px] font-medium text-slate-500">Rasio Penyelesaian</dt>
							<dd class="mt-0.5 text-lg font-bold text-slate-900">{completionRatio(attempt.scoreResult)}</dd>
						</div>
						<div class="rounded-xl bg-slate-50 p-3">
							<dt class="text-[11px] font-medium text-slate-500">Efisiensi Waktu</dt>
							<dd class="mt-0.5 text-lg font-bold text-slate-900">{avgTimeLabel(attempt.scoreResult)}</dd>
						</div>
						<div class="rounded-xl bg-slate-50 p-3">
							<dt class="text-[11px] font-medium text-slate-500">Benar</dt>
							<dd class="mt-0.5 text-lg font-bold text-slate-900">{attempt.scoreResult.correct}</dd>
						</div>
						<div class="rounded-xl bg-slate-50 p-3">
							<dt class="text-[11px] font-medium text-slate-500">Salah</dt>
							<dd class="mt-0.5 text-lg font-bold text-slate-900">{attempt.scoreResult.incorrect}</dd>
						</div>
					</dl>
				{:else if isAccuracy(attempt.scoreResult)}
					<dl class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
						<div class="rounded-xl bg-slate-50 p-3">
							<dt class="text-[11px] font-medium text-slate-500">Akurasi</dt>
							<dd class="mt-0.5 text-lg font-bold text-slate-900">{attempt.scoreResult.accuracy}%</dd>
						</div>
						<div class="rounded-xl bg-slate-50 p-3">
							<dt class="text-[11px] font-medium text-slate-500">Rasio Penyelesaian</dt>
							<dd class="mt-0.5 text-lg font-bold text-slate-900">{completionRatio(attempt.scoreResult)}</dd>
						</div>
						<div class="rounded-xl bg-slate-50 p-3">
							<dt class="text-[11px] font-medium text-slate-500">Benar</dt>
							<dd class="mt-0.5 text-lg font-bold text-slate-900">{attempt.scoreResult.correct}</dd>
						</div>
						<div class="rounded-xl bg-slate-50 p-3">
							<dt class="text-[11px] font-medium text-slate-500">Salah</dt>
							<dd class="mt-0.5 text-lg font-bold text-slate-900">{attempt.scoreResult.incorrect}</dd>
						</div>
					</dl>

					{@const curve = workCurveCorrect(attempt.scoreResult)}
					<div class="mt-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
						<h4 class="text-sm font-semibold text-slate-900">Kurva Kerja &amp; Stabilitas</h4>
						{#if curve.length > 1}
							<div class="mt-3">
								<WorkCurveChart values={curve} />
							</div>
						{:else}
							<p class="mt-2 text-xs text-slate-400">
								Data kurva kerja interval waktu belum tersedia.
							</p>
						{/if}
					</div>
				{:else if isPersonality(attempt.scoreResult)}
					<div class="mt-4 space-y-4">
						{#if attempt.scoreResult.personalityType}
							<span class="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
								<Sparkles size={13} /> {attempt.scoreResult.personalityType}
							</span>
						{/if}
						<p class="text-sm leading-6 text-slate-700">{attempt.scoreResult.summary}</p>

						{#if attempt.scoreResult.workStyle.length > 0}
							<div>
								<p class="text-[11px] font-medium text-slate-500">Gaya kerja</p>
								<div class="mt-2 flex flex-wrap gap-2">
									{#each attempt.scoreResult.workStyle as item (item)}
										<span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">{item}</span>
									{/each}
								</div>
							</div>
						{/if}

						<div class="grid gap-4 sm:grid-cols-2">
							{#if attempt.scoreResult.strengths.length > 0}
								<div>
									<h4 class="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
										<CheckCircle2 size={14} class="text-emerald-600" /> Kekuatan
									</h4>
									<ul class="mt-2 space-y-1.5">
										{#each attempt.scoreResult.strengths as item (item)}
											<li class="flex items-start gap-2 text-sm leading-6 text-slate-600">
												<span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"></span>{item}
											</li>
										{/each}
									</ul>
								</div>
							{/if}
							{#if attempt.scoreResult.areasForImprovement.length > 0}
								<div>
									<h4 class="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
										<Award size={14} class="text-amber-600" /> Area pengembangan
									</h4>
									<ul class="mt-2 space-y-1.5">
										{#each attempt.scoreResult.areasForImprovement as item (item)}
											<li class="flex items-start gap-2 text-sm leading-6 text-slate-600">
												<span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"></span>{item}
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						</div>

						{#if attempt.scoreResult.communicationStyle}
							<p class="text-sm leading-6 text-slate-600">
								<span class="font-semibold text-slate-900">Gaya komunikasi:</span>{' '}
								{attempt.scoreResult.communicationStyle}
							</p>
						{/if}
					</div>
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
		{#if current.aggregateScore.personality?.summary}
			<p class="mt-4 text-sm leading-6 text-slate-600">
				<span class="font-semibold text-slate-900">Profil kepribadian:</span>{' '}
				{current.aggregateScore.personality.personalityType
					? `${current.aggregateScore.personality.personalityType} — `
					: ''}
				{current.aggregateScore.personality.summary}
			</p>
		{/if}
	</section>

	<section class="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/60 to-white p-5 shadow-sm sm:p-6">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex items-center gap-2">
				<Sparkles size={18} class="text-violet-600" />
				<h2 class="text-lg font-semibold text-slate-950">Laporan &amp; Analisis AI</h2>
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

			<div class="mt-6 rounded-xl border border-violet-100 bg-white/70 p-4">
				<div class="flex items-start gap-3">
					<QrCode size={20} class="mt-0.5 shrink-0 text-violet-600" />
					<div>
						<p class="text-sm font-semibold text-slate-900">Laporan resmi dengan QR Code validasi</p>
						<p class="mt-1 text-xs leading-5 text-slate-600">
							Dokumen PDF dilengkapi QR Code validasi resmi dan nomor registrasi terverifikasi
							<span class="font-semibold text-slate-900">{aiAnalysis.certificateNumber}</span>
							yang dapat dicek keasliannya oleh HRD perusahaan.
						</p>
					</div>
				</div>
			</div>

			<div class="mt-4 flex flex-wrap items-center gap-3">
				<button
					type="button"
					onclick={() => void download()}
					disabled={isDownloading || !current.certificate.available}
					class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{#if isDownloading}
						<Spinner label="Mengunduh laporan" /> Mengunduh...
					{:else}
						<Download size={16} /> Unduh Laporan Resmi &amp; Sertifikat PDF
					{/if}
				</button>
				<span class="text-xs text-slate-500">Diterbitkan {formatDate(aiAnalysis.issuedAt)}</span>
			</div>
		{:else}
			<p class="mt-3 text-sm leading-6 text-slate-600">
				Buat analisis AI dan laporan resmi berdasarkan hasil seluruh paket tes.
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
						<Sparkles size={16} /> Generate Laporan &amp; Analisis AI
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
