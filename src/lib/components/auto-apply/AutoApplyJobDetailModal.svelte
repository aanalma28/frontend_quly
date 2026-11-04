<script lang="ts">
	import {
		AlertTriangle,
		ArrowUpRight,
		Building2,
		CalendarDays,
		CheckCircle2,
		Coins,
		ExternalLink,
		FileText,
		Lightbulb,
		Mail,
		MapPin,
		Sparkles,
		X
	} from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import ScoreRing from '#lib/components/ui/ScoreRing.svelte';
	import { workplaceTypeLabel } from '#lib/components/superadmin/status.js';
	import type { AutoApplyJobOption } from '#lib/services/autoApplyApi.js';
	import type {
		JobDetail,
		JobMatchScore,
		JobScoringResult,
		JobScoreUsage
	} from '#lib/services/jobApi.js';

	interface Props {
		open: boolean;
		option: AutoApplyJobOption | null;
		jobDetail: JobDetail | null;
		loadingDetail: boolean;
		scoring: boolean;
		score: JobMatchScore | JobScoringResult | null;
		scoreUsage: JobScoreUsage | null;
		scoreMessage: string | null;
		errorMessage: string | null;
		onclose: () => void;
		onscore: () => void;
	}

	let {
		open,
		option,
		jobDetail,
		loadingDetail,
		scoring,
		score,
		scoreUsage,
		scoreMessage,
		errorMessage,
		onclose,
		onscore
	}: Props = $props();

	const title = $derived(jobDetail?.jobTitle ?? option?.jobTitle ?? 'Detail lowongan');
	const company = $derived(jobDetail?.companyName ?? option?.companyName ?? '—');
	const description = $derived(
		jobDetail?.jobDescriptionSummary ?? option?.description ?? null
	);
	const instructions = $derived(
		jobDetail?.applicationInstructions ?? option?.applicationInstructions ?? null
	);
	const subjectFormat = $derived(option?.subjectFormat ?? null);
	const requirements = $derived(jobDetail?.requirements ?? null);
	const source = $derived(jobDetail?.source ?? null);
	const canScore = $derived(Boolean(option?.jobId));
	const isManual = $derived(option?.source === 'manual');
	const strengths = $derived(score?.strengths ?? []);
	const weaknesses = $derived(score?.weaknesses ?? []);
	const suggestions = $derived(score?.suggestions ?? []);
	const matchedSkills = $derived(score?.matchedSkills ?? []);
	const missingSkills = $derived(score?.missingSkills ?? []);

	$effect(() => {
		if (typeof document === 'undefined' || !open) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});

	function salaryLabel(): string {
		if (!jobDetail) return 'Tidak tersedia';
		if (jobDetail.isSalaryConfidential) return 'Dirahasiakan';
		if (jobDetail.salaryMin === null && jobDetail.salaryMax === null) {
			return 'Tidak dicantumkan';
		}
		const formatter = new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: jobDetail.salaryCurrency ?? 'IDR',
			maximumFractionDigits: 0
		});
		if (jobDetail.salaryMin !== null && jobDetail.salaryMax !== null) {
			return jobDetail.salaryMin === jobDetail.salaryMax
				? formatter.format(jobDetail.salaryMin)
				: `${formatter.format(jobDetail.salaryMin)} – ${formatter.format(jobDetail.salaryMax)}`;
		}
		return formatter.format((jobDetail.salaryMin ?? jobDetail.salaryMax) as number);
	}

	function postedLabel(value: string | null | undefined): string {
		if (!value) return '—';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '—';
		return new Intl.DateTimeFormat('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		}).format(date);
	}

	function sourceHref(): string | null {
		return source?.url ?? jobDetail?.sourceUrl ?? null;
	}

	function usageLabel(): string {
		if (!scoreUsage) return '';
		if (scoreUsage.source === 'UNLIMITED') return 'Paket unlimited';
		if (scoreUsage.source === 'CREDIT') {
			return `${scoreUsage.creditsCharged} kredit (± ${new Intl.NumberFormat('id-ID', {
				style: 'currency',
				currency: 'IDR',
				maximumFractionDigits: 0
			}).format(scoreUsage.costIdr)})`;
		}
		return 'Kuota paket';
	}
</script>

{#if open && option}
	<div
		class="fixed inset-0 z-[70] flex justify-end bg-slate-950/45 backdrop-blur-[2px]"
		role="dialog"
		aria-modal="true"
		aria-labelledby="auto-apply-job-detail-title"
	>
		<button
			type="button"
			class="absolute inset-0 h-full w-full cursor-default"
			aria-label="Tutup detail lowongan"
			onclick={onclose}
		></button>

		<aside
			class="relative z-10 flex h-full w-full max-w-2xl flex-col overflow-hidden bg-slate-50 shadow-2xl sm:rounded-l-2xl"
		>
			<header
				class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:px-6"
			>
				<div class="min-w-0">
					<div class="flex flex-wrap items-center gap-1.5">
						<span class="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
							{isManual ? 'Loker tambahan' : 'Bookmark'}
						</span>
						{#if jobDetail}
							<span class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
								{workplaceTypeLabel[jobDetail.workplaceType as keyof typeof workplaceTypeLabel] ??
									jobDetail.workplaceType}
							</span>
						{/if}
					</div>
					<h2
						id="auto-apply-job-detail-title"
						class="mt-2 truncate text-xl font-bold tracking-tight text-slate-950"
					>
						{title}
					</h2>
					<p class="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
						<Building2 size={14} /> {company}
					</p>
				</div>
				<button
					type="button"
					onclick={onclose}
					class="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
					aria-label="Tutup"
				>
					<X size={18} />
				</button>
			</header>

			<div class="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
				{#if loadingDetail}
					<div class="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-3 text-xs text-indigo-700">
						<Spinner label="Memuat detail lowongan" /> Memuat detail lowongan...
					</div>
				{/if}

				{#if isManual}
					<div class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-800">
						<AlertTriangle size={15} class="mt-0.5 shrink-0" />
						<span>
							Data ini berasal dari ekstraksi AI. Periksa ulang email HRD, perusahaan, posisi,
							format subjek, dan deskripsi sebelum mengirim lamaran.
						</span>
					</div>
				{/if}

				<div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
					{#if jobDetail?.location}
						<span class="flex items-center gap-1.5"><MapPin size={14} /> {jobDetail.location}</span>
					{/if}
					<span class="flex items-center gap-1.5"><Mail size={14} /> {option.recipientEmail || 'Email HRD belum diisi'}</span>
					{#if jobDetail}
						<span class="flex items-center gap-1.5"><Coins size={14} /> {salaryLabel()}</span>
						<span class="flex items-center gap-1.5"><CalendarDays size={14} /> {postedLabel(jobDetail.scrapedAt)}</span>
					{/if}
				</div>

				{#if description}
					<section class="mt-5 rounded-xl border border-slate-200 bg-white p-4">
						<h3 class="flex items-center gap-1.5 text-sm font-bold text-slate-900">
							<FileText size={15} /> Deskripsi lowongan
						</h3>
						<p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{description}</p>
					</section>
				{/if}

				{#if requirements}
					<section class="mt-4 rounded-xl border border-slate-200 bg-white p-4">
						<h3 class="text-sm font-bold text-slate-900">Kualifikasi</h3>
						<div class="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
							{#if requirements.minExperienceYears !== undefined && requirements.minExperienceYears !== null}
								<span class="rounded-lg bg-slate-50 px-2.5 py-1 ring-1 ring-inset ring-slate-200">
									Min. {requirements.minExperienceYears} tahun
								</span>
							{/if}
							{#if requirements.education}
								<span class="rounded-lg bg-slate-50 px-2.5 py-1 ring-1 ring-inset ring-slate-200">
									{requirements.education}
								</span>
							{/if}
						</div>
						{#if (requirements.skills ?? []).length > 0}
							<div class="mt-3 flex flex-wrap gap-1.5">
								{#each requirements.skills ?? [] as skill}
									<span class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700">{skill}</span>
								{/each}
							</div>
						{/if}
					</section>
				{/if}

				{#if subjectFormat}
					<section class="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
						<h3 class="text-xs font-bold uppercase tracking-wide text-indigo-800">Format subjek</h3>
						<p class="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-indigo-950/80">{subjectFormat}</p>
					</section>
				{/if}

				{#if instructions}
					<section class="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
						<h3 class="text-xs font-bold uppercase tracking-wide text-amber-800">Cara melamar</h3>
						<p class="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-amber-950/80">{instructions}</p>
					</section>
				{/if}

				{#if sourceHref()}
					<a
						href={sourceHref()}
						target="_blank"
						rel="noreferrer"
						class="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
					>
						<ExternalLink size={14} /> Lihat sumber lowongan
					</a>
				{/if}

				<section class="mt-5 rounded-2xl border border-indigo-100 bg-white p-4">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div>
							<p class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-indigo-600">
								<Sparkles size={14} /> Kecocokan AI
							</p>
							<p class="mt-1 text-xs text-slate-500">
								Dinilai dari CV dan hasil psikotes terakhirmu.
							</p>
						</div>
						{#if canScore}
							<button
								type="button"
								onclick={onscore}
								disabled={scoring}
								class="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
							>
								{#if scoring}<Spinner label="Menghitung skor" />{/if}
								{score ? 'Hitung ulang' : 'Hitung kecocokan'}
							</button>
						{:else}
							<span class="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
								Khusus loker database
							</span>
						{/if}
					</div>

					{#if scoreMessage}
						<p class="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-800" role="status">
							{scoreMessage}
						</p>
					{/if}
					{#if errorMessage}
						<div class="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
							<p>{errorMessage}</p>
							{#if errorMessage.includes('CV atau hasil psikotes')}
								<p class="mt-1.5 flex flex-wrap gap-3">
									<a href="/dashboard/onboarding" class="font-semibold underline">Lengkapi CV</a>
									<a href="/dashboard/psychotest" class="font-semibold underline">Ikuti psikotes</a>
								</p>
							{:else if errorMessage.includes('kuota') || errorMessage.includes('kredit')}
								<a href="/billing#kredit-kilat" class="mt-1.5 inline-block font-semibold underline">Top-up kredit</a>
							{/if}
						</div>
					{/if}

					{#if score}
						<div class="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
							<ScoreRing score={score.score} size={116} label="Match" />
							<div class="min-w-0 flex-1">
								{#if score.summary}
									<p class="text-sm leading-6 text-slate-700">{score.summary}</p>
								{/if}
								<div class="mt-3 flex flex-wrap gap-1.5">
									{#each matchedSkills as skill}
										<span class="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">{skill}</span>
									{/each}
									{#each missingSkills as skill}
										<span class="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-700">{skill}</span>
									{/each}
								</div>
							</div>
						</div>

						<div class="mt-4 grid gap-3 sm:grid-cols-3">
							<div class="rounded-xl bg-emerald-50/70 p-3">
								<p class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
									<CheckCircle2 size={13} /> Kekuatan
								</p>
								<ul class="mt-2 space-y-1.5 text-[11px] leading-4 text-emerald-950/75">
									{#each strengths as item}<li>• {item}</li>{/each}
									{#if strengths.length === 0}<li>Belum ada catatan.</li>{/if}
								</ul>
							</div>
							<div class="rounded-xl bg-amber-50/70 p-3">
								<p class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
									<AlertTriangle size={13} /> Gap
								</p>
								<ul class="mt-2 space-y-1.5 text-[11px] leading-4 text-amber-950/75">
									{#each weaknesses as item}<li>• {item}</li>{/each}
									{#if weaknesses.length === 0}<li>Belum ada catatan.</li>{/if}
								</ul>
							</div>
							<div class="rounded-xl bg-indigo-50/70 p-3">
								<p class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
									<Lightbulb size={13} /> Saran
								</p>
								<ul class="mt-2 space-y-1.5 text-[11px] leading-4 text-indigo-950/75">
									{#each suggestions as item}<li>• {item}</li>{/each}
									{#if suggestions.length === 0}<li>Belum ada catatan.</li>{/if}
								</ul>
							</div>
						</div>
						{#if scoreUsage}
							<p class="mt-3 text-[10px] text-slate-500">Pemakaian terakhir: {usageLabel()}</p>
						{/if}
					{:else}
						<p class="mt-3 rounded-xl border border-dashed border-indigo-100 bg-indigo-50/30 px-3 py-4 text-center text-xs text-slate-500">
							{#if canScore}
								Belum ada skor untuk lowongan ini. Klik hitung kecocokan untuk melihat peluangmu.
							{:else}
								Scoring tersedia untuk loker dari database. Loker hasil ekstraksi manual belum
								tersimpan sebagai lowongan database.
							{/if}
						</p>
					{/if}
				</section>
			</div>

			<footer class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-5 py-3 sm:px-6">
				<a
					href="/billing#kredit-kilat"
					class="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
				>
					<Coins size={15} /> Top-up kredit
				</a>
				{#if sourceHref()}
					<a
						href={sourceHref()}
						target="_blank"
						rel="noreferrer"
						class="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800"
					>
						Lihat sumber <ArrowUpRight size={15} />
					</a>
				{:else}
					<span class="text-xs text-slate-400">Sumber lowongan tidak tersedia</span>
				{/if}
			</footer>
		</aside>
	</div>
{/if}
