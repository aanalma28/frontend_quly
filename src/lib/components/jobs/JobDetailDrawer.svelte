<script lang="ts">
	import {
		AlertTriangle,
		ArrowUpRight,
		Bookmark,
		BookmarkCheck,
		BriefcaseBusiness,
		Building2,
		CalendarDays,
		CheckCircle2,
		Coins,
		ExternalLink,
		GraduationCap,
		Image as ImageIcon,
		Lightbulb,
		MapPin,
		Sparkles,
		X
	} from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import ScoreRing from '#lib/components/ui/ScoreRing.svelte';
	import { employmentTypeLabel, sourceTypeLabel, workplaceTypeLabel } from '#lib/components/superadmin/status.js';
	import type { JobDetail, JobListItem, JobScoreUsage } from '#lib/services/jobApi.js';
	import { getAssetUrl } from '#lib/utils/api.js';

	interface Props {
		job: JobListItem | null;
		detail: JobDetail | null;
		loadingDetail: boolean;
		bookmarking: boolean;
		scoring: boolean;
		scoreUsage: JobScoreUsage | null;
		scoreMessage: string | null;
		errorMessage: string | null;
		onclose: () => void;
		onbookmark: () => void;
		onscore: () => void;
		ontopup: () => void;
	}

	let {
		job,
		detail,
		loadingDetail,
		bookmarking,
		scoring,
		scoreUsage,
		scoreMessage,
		errorMessage,
		onclose,
		onbookmark,
		onscore,
		ontopup
	}: Props = $props();

	const display = $derived(detail ?? job);
	const source = $derived(detail?.source ?? null);
	const instructions = $derived(detail?.applicationInstructions ?? null);
	const posterUrl = $derived(getAssetUrl(display?.localImagePath));
	const matchScore = $derived(display?.matchScore ?? null);
	const strengths = $derived(matchScore?.strengths ?? []);
	const weaknesses = $derived(matchScore?.weaknesses ?? []);
	const suggestions = $derived(matchScore?.suggestions ?? []);
	const matchedSkills = $derived(matchScore?.matchedSkills ?? []);
	const missingSkills = $derived(matchScore?.missingSkills ?? []);

	let posterOpen = $state(false);

	$effect(() => {
		if (typeof document === 'undefined' || !job) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});

	function salaryLabel(): string {
		if (!display) return 'Gaji tidak dicantumkan';
		if (display.isSalaryConfidential) return 'Gaji dirahasiakan';
		const min = display.salaryMin;
		const max = display.salaryMax;
		if (min === null && max === null) return 'Gaji tidak dicantumkan';
		const currency = display.salaryCurrency ?? 'IDR';
		const formatter = (value: number) => {
			try {
				return new Intl.NumberFormat('id-ID', {
					style: 'currency',
					currency,
					maximumFractionDigits: 0
				}).format(value);
			} catch {
				return `${currency} ${new Intl.NumberFormat('id-ID').format(value)}`;
			}
		};
		if (min !== null && max !== null) {
			return min === max ? formatter(min) : `${formatter(min)} – ${formatter(max)}`;
		}
		return formatter((min ?? max) as number);
	}

	function destinationHref(): string | null {
		if (!display?.applicationDestination) return null;
		const value = display.applicationDestination.trim();
		if (!value) return null;
		if (/^(?:https?:|mailto:|tel:)/i.test(value)) return value;
		if (display.applicationType === 'EMAIL') return `mailto:${value}`;
		return `https://${value.replace(/^\/+/, '')}`;
	}

	function postedLabel(value: string): string {
		if (!value) return '—';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '—';
		const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
		if (diffDays <= 0) return 'Hari ini';
		if (diffDays === 1) return 'Kemarin';
		if (diffDays < 7) return `${diffDays} hari lalu`;
		return new Intl.DateTimeFormat('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		}).format(date);
	}

	function locationLabel(value: string | null | undefined): string {
		const text = value?.trim() ?? '';
		return !text || text.toLowerCase() === 'null' ? 'Lokasi tidak dicantumkan' : text;
	}

	function scoreTone(score: number): string {
		if (score >= 80) return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
		if (score >= 60) return 'bg-indigo-50 text-indigo-700 ring-indigo-200';
		if (score >= 40) return 'bg-amber-50 text-amber-700 ring-amber-200';
		return 'bg-rose-50 text-rose-700 ring-rose-200';
	}
</script>

{#if display}
	<div
		class="fixed inset-0 z-[60] flex justify-end bg-slate-950/45 backdrop-blur-[2px]"
		role="dialog"
		aria-modal="true"
		aria-labelledby="job-detail-title"
	>
		<button
			type="button"
			class="absolute inset-0 h-full w-full cursor-default"
			aria-label="Tutup detail lowongan"
			onclick={onclose}
		></button>

		<aside class="relative z-10 flex h-full w-full max-w-2xl flex-col overflow-hidden bg-slate-50 shadow-2xl sm:rounded-l-2xl">
			<header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
				<div class="min-w-0">
					<div class="flex flex-wrap items-center gap-1.5">
						<span class="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
							{workplaceTypeLabel[display.workplaceType as keyof typeof workplaceTypeLabel] ?? display.workplaceType}
						</span>
						<span class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
							{employmentTypeLabel[display.employmentType as keyof typeof employmentTypeLabel] ?? display.employmentType}
						</span>
						{#if matchScore}
							<span class="rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset {scoreTone(matchScore.score)}">
								Skor {matchScore.score}
							</span>
						{/if}
					</div>
					<h2 id="job-detail-title" class="mt-2 truncate text-xl font-bold tracking-tight text-slate-950">
						{display.jobTitle}
					</h2>
					<p class="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
						<Building2 size={14} /> {display.companyName}
					</p>
				</div>
				<div class="flex shrink-0 gap-1.5">
					<button
						type="button"
						onclick={onbookmark}
						disabled={bookmarking}
						aria-pressed={display.bookmarked}
						class="inline-flex size-9 items-center justify-center rounded-lg border transition {display.bookmarked
							? 'border-indigo-200 bg-indigo-50 text-indigo-700'
							: 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'} disabled:opacity-50"
						aria-label={display.bookmarked ? 'Hapus simpanan' : 'Simpan lowongan'}
					>
						{#if bookmarking}
							<Spinner label="Menyimpan" />
						{:else if display.bookmarked}
							<BookmarkCheck size={17} />
						{:else}
							<Bookmark size={17} />
						{/if}
					</button>
					<button
						type="button"
						onclick={onclose}
						class="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
						aria-label="Tutup"
					>
						<X size={18} />
					</button>
				</div>
			</header>

			<div class="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
				<div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
					<span class="flex items-center gap-1.5"><MapPin size={14} /> {locationLabel(display.location)}</span>
					<span class="flex items-center gap-1.5"><Coins size={14} /> {salaryLabel()}</span>
					<span class="flex items-center gap-1.5"><CalendarDays size={14} /> {postedLabel(display.scrapedAt)}</span>
					{#if loadingDetail}
						<span class="inline-flex items-center gap-1 text-indigo-600"><Spinner label="Memuat detail" /> Memuat detail...</span>
					{/if}
				</div>

				{#if scoreMessage}
					<p class="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-800" role="status">
						{scoreMessage}
					</p>
				{/if}
				{#if errorMessage}
					<div class="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
						<p>{errorMessage}</p>
						{#if errorMessage.includes('CV atau hasil psikotes')}
							<p class="mt-1.5 flex flex-wrap gap-3">
								<a href="/dashboard/onboarding" class="font-semibold underline">Lengkapi CV</a>
								<a href="/dashboard/psychotest" class="font-semibold underline">Ikuti psikotes</a>
							</p>
						{/if}
					</div>
				{/if}

				<div class="mt-5 grid gap-3 sm:grid-cols-2">
					<div class="rounded-xl border border-slate-200 bg-white p-4">
						<p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Tipe kerja</p>
						<p class="mt-1 text-sm font-semibold text-slate-800">
							{workplaceTypeLabel[display.workplaceType as keyof typeof workplaceTypeLabel] ?? display.workplaceType}
							· {employmentTypeLabel[display.employmentType as keyof typeof employmentTypeLabel] ?? display.employmentType}
						</p>
					</div>
					<div class="rounded-xl border border-slate-200 bg-white p-4">
						<p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Sumber</p>
						<p class="mt-1 text-sm font-semibold text-slate-800">
							{sourceTypeLabel[display.sourceType as keyof typeof sourceTypeLabel] ?? display.sourceType}
						</p>
						<p class="mt-0.5 truncate text-xs text-slate-500">{source?.name ?? display.sourceDetail ?? '—'}</p>
					</div>
				</div>

				{#if display.jobDescriptionSummary}
					<section class="mt-5">
						<h3 class="text-sm font-bold text-slate-900">Deskripsi lowongan</h3>
						<p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{display.jobDescriptionSummary}</p>
					</section>
				{/if}

				{#if display.requirements}
					<section class="mt-5">
						<h3 class="text-sm font-bold text-slate-900">Kualifikasi</h3>
						<div class="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
							{#if display.requirements.minExperienceYears !== undefined && display.requirements.minExperienceYears !== null}
								<span class="rounded-lg bg-white px-2.5 py-1 ring-1 ring-inset ring-slate-200">
									<BriefcaseBusiness size={12} class="mr-1 inline" />
									Min. {display.requirements.minExperienceYears} tahun
								</span>
							{/if}
							{#if display.requirements.education}
								<span class="rounded-lg bg-white px-2.5 py-1 ring-1 ring-inset ring-slate-200">
									<GraduationCap size={12} class="mr-1 inline" />
									{display.requirements.education}
								</span>
							{/if}
						</div>
						{#if (display.requirements.skills ?? []).length > 0}
							<div class="mt-3 flex flex-wrap gap-1.5">
								{#each display.requirements.skills ?? [] as skill}
									<span class="rounded-full bg-slate-200/70 px-2.5 py-1 text-[10px] font-semibold text-slate-700">{skill}</span>
								{/each}
							</div>
						{/if}
					</section>
				{/if}

				{#if instructions}
					<section class="mt-5 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
						<h3 class="text-xs font-bold uppercase tracking-wide text-amber-800">Cara melamar</h3>
						<p class="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-amber-950/80">{instructions}</p>
					</section>
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
						<button
							type="button"
							onclick={onscore}
							disabled={scoring}
							class="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{#if scoring}<Spinner label="Menghitung skor" />{/if}
							{matchScore ? 'Hitung ulang' : 'Hitung kecocokan'}
						</button>
					</div>

					{#if matchScore}
						<div class="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
							<ScoreRing score={matchScore.score} size={116} label="Match" />
							<div class="min-w-0 flex-1">
								{#if matchScore.summary}
									<p class="text-sm leading-6 text-slate-700">{matchScore.summary}</p>
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
									{#each strengths as item}
										<li>• {item}</li>
									{/each}
									{#if strengths.length === 0}<li>Belum ada catatan.</li>{/if}
								</ul>
							</div>
							<div class="rounded-xl bg-amber-50/70 p-3">
								<p class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
									<AlertTriangle size={13} /> Gap
								</p>
								<ul class="mt-2 space-y-1.5 text-[11px] leading-4 text-amber-950/75">
									{#each weaknesses as item}
										<li>• {item}</li>
									{/each}
									{#if weaknesses.length === 0}<li>Belum ada catatan.</li>{/if}
								</ul>
							</div>
							<div class="rounded-xl bg-indigo-50/70 p-3">
								<p class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
									<Lightbulb size={13} /> Saran
								</p>
								<ul class="mt-2 space-y-1.5 text-[11px] leading-4 text-indigo-950/75">
									{#each suggestions as item}
										<li>• {item}</li>
									{/each}
									{#if suggestions.length === 0}<li>Belum ada catatan.</li>{/if}
								</ul>
							</div>
						</div>
						{#if scoreUsage}
							<p class="mt-3 text-[10px] text-slate-500">
								Pemakaian terakhir:
								{#if scoreUsage.source === 'UNLIMITED'}
									Paket unlimited
								{:else if scoreUsage.source === 'CREDIT'}
									{scoreUsage.creditsCharged} kredit
									(± Rp {new Intl.NumberFormat('id-ID').format(scoreUsage.costIdr)})
								{:else}
									Kuota paket
								{/if}
							</p>
						{/if}
					{:else}
						<p class="mt-3 rounded-xl border border-dashed border-indigo-100 bg-indigo-50/30 px-3 py-4 text-center text-xs text-slate-500">
							Belum ada skor untuk lowongan ini. Klik hitung kecocokan untuk melihat peluangmu.
						</p>
					{/if}
				</section>

				{#if posterUrl}
					<section class="mt-5">
						<h3 class="flex items-center gap-1.5 text-sm font-bold text-slate-900"><ImageIcon size={15} /> Poster lowongan</h3>
						<button
							type="button"
							onclick={() => (posterOpen = true)}
							class="mt-2 block w-full overflow-hidden rounded-xl border border-slate-200 bg-white"
							aria-label="Perbesar poster lowongan"
						>
							<img src={posterUrl} alt="Poster {display.jobTitle}" class="max-h-72 w-full object-contain" />
						</button>
					</section>
				{/if}

				{#if display.sourceUrl || source?.url}
					<a
						href={source?.url ?? display.sourceUrl}
						target="_blank"
						rel="noreferrer"
						class="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
					>
						<ExternalLink size={14} /> Lihat sumber lowongan
					</a>
				{/if}
			</div>

			<footer class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-5 py-3 sm:px-6">
				<button
					type="button"
					onclick={ontopup}
					class="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
				>
					<Coins size={15} /> Top-up kredit
				</button>
				{#if destinationHref()}
					<a
						href={destinationHref()}
						target="_blank"
						rel="noreferrer"
						class="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800"
					>
						Lamar sekarang <ArrowUpRight size={15} />
					</a>
				{:else}
					<span class="text-xs text-slate-400">Tautan lamaran belum tersedia</span>
				{/if}
			</footer>
		</aside>
	</div>

	{#if posterOpen && posterUrl}
		<div class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/90 p-4" role="dialog" aria-modal="true" aria-label="Poster lowongan">
			<button type="button" class="absolute inset-0 h-full w-full" aria-label="Tutup poster" onclick={() => (posterOpen = false)}></button>
			<img src={posterUrl} alt="Poster {display.jobTitle}" class="relative z-10 max-h-[90vh] max-w-[92vw] rounded-xl object-contain shadow-2xl" />
			<button type="button" onclick={() => (posterOpen = false)} class="absolute right-4 top-4 z-20 rounded-full bg-slate-900 p-2 text-white" aria-label="Tutup poster">
				<X size={20} />
			</button>
		</div>
	{/if}
{/if}
