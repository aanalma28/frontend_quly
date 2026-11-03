<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Bookmark,
		BookmarkCheck,
		Building2,
		BriefcaseBusiness,
		ChevronLeft,
		ChevronRight,
		Coins,
		MapPin,
		RefreshCw,
		Search,
		SlidersHorizontal,
		Sparkles,
		WalletCards,
		X
	} from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import JobDetailDrawer from '#lib/components/jobs/JobDetailDrawer.svelte';
	import QuotaTopupModal from '#lib/components/jobs/QuotaTopupModal.svelte';
	import {
		employmentTypeLabel,
		sourceTypeLabel,
		workplaceTypeLabel
	} from '#lib/components/superadmin/status.js';
	import {
		getMyBenefitsApi,
		getPublicBillingPlansApi,
		type MyBenefitsResponse,
		type TopupPackage,
		type UserBenefitQuota
	} from '#lib/services/billingApi.js';
	import {
		bookmarkJobApi,
		getJobApi,
		listJobsApi,
		scoreJobApi,
		unbookmarkJobApi,
		type JobDetail,
		type JobEmploymentType,
		type JobListItem,
		type JobListMeta,
		type JobMatchScore,
		type JobScoreUsage,
		type JobSort,
		type JobSourceType,
		type JobWorkplaceType
	} from '#lib/services/jobApi.js';
	import { ApiError } from '#lib/utils/api.js';
	import { benefitAccessMode, freeLifetimeRemaining } from '#lib/utils/benefitAccess.js';
	import { formatNumber, formatRupiah, isUnlimitedQuota } from '#lib/utils/billing.js';

	const limit = 20;
	const workplaceTypes: Array<{ value: JobWorkplaceType | ''; label: string }> = [
		{ value: '', label: 'Semua tipe kerja' },
		{ value: 'REMOTE', label: 'Remote' },
		{ value: 'WFO', label: 'WFO' },
		{ value: 'HYBRID', label: 'Hybrid' }
	];
	const employmentTypes: Array<{ value: JobEmploymentType | ''; label: string }> = [
		{ value: '', label: 'Semua jenis' },
		{ value: 'FULL_TIME', label: 'Full Time' },
		{ value: 'PART_TIME', label: 'Part Time' },
		{ value: 'CONTRACT', label: 'Contract' },
		{ value: 'FREELANCE', label: 'Freelance' },
		{ value: 'INTERNSHIP', label: 'Internship' }
	];
	const sourceTypes: Array<{ value: JobSourceType | ''; label: string }> = [
		{ value: '', label: 'Semua sumber' },
		{ value: 'TELEGRAM', label: 'Telegram' },
		{ value: 'WEBSITE_HTML', label: 'Website HTML' },
		{ value: 'WEBSITE_API', label: 'Website API' }
	];
	const sortOptions: Array<{ value: JobSort; label: string }> = [
		{ value: 'newest', label: 'Terbaru' },
		{ value: 'oldest', label: 'Terlama' },
		{ value: 'salary_desc', label: 'Gaji tertinggi' },
		{ value: 'salary_asc', label: 'Gaji terendah' }
	];
	const postedOptions = [
		{ value: '', label: 'Kapan saja' },
		{ value: 1, label: '1 hari terakhir' },
		{ value: 3, label: '3 hari terakhir' },
		{ value: 7, label: '7 hari terakhir' },
		{ value: 30, label: '30 hari terakhir' }
	];

	let search = $state('');
	let location = $state('');
	let workplaceType = $state<JobWorkplaceType | ''>('');
	let employmentType = $state<JobEmploymentType | ''>('');
	let education = $state('');
	let minExperience = $state('');
	let skill = $state('');
	let minSalary = $state('');
	let maxSalary = $state('');
	let postedWithinDays = $state<number | ''>('');
	let sourceType = $state<JobSourceType | ''>('');
	let sort = $state<JobSort>('newest');
	let bookmarkedOnly = $state(false);
	let advancedOpen = $state(false);
	let page = $state(1);

	let jobs = $state<JobListItem[]>([]);
	let meta = $state<JobListMeta | null>(null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let actionError = $state<string | null>(null);

	let selectedJob = $state<JobListItem | null>(null);
	let selectedDetail = $state<JobDetail | null>(null);
	let loadingDetail = $state(false);
	let detailError = $state<string | null>(null);
	let bookmarkingId = $state<string | null>(null);

	let myBenefits = $state<MyBenefitsResponse | null>(null);
	let topupPackages = $state<TopupPackage[]>([]);

	let scoring = $state(false);
	let preparingScore = $state(false);
	let scoreUsage = $state<JobScoreUsage | null>(null);
	let scoreNotice = $state<string | null>(null);
	let scoreError = $state<string | null>(null);

	interface QuotaDialogState {
		open: boolean;
		title: string;
		message: string;
		benefit: UserBenefitQuota | null;
		creditBalance: number | null;
		canContinue: boolean;
	}

	const emptyQuotaDialog: QuotaDialogState = {
		open: false,
		title: '',
		message: '',
		benefit: null,
		creditBalance: null,
		canContinue: false
	};
	let quotaDialog = $state<QuotaDialogState>(emptyQuotaDialog);

	const scoringBenefit = $derived(
		myBenefits?.benefits.find((benefit) => benefit.code === 'JOB_SCORING') ?? null
	);
	const scoringAccessMode = $derived(
		scoringBenefit
			? benefitAccessMode(scoringBenefit, myBenefits?.creditBalance ?? 0)
			: null
	);
	const scoringBusy = $derived(scoring || preparingScore);
	const advancedFilterCount = $derived(
		[
			location,
			workplaceType,
			employmentType,
			education,
			minExperience,
			skill,
			minSalary,
			maxSalary,
			postedWithinDays,
			sourceType
		].filter((value) => value !== '' && value !== null && value !== undefined).length
	);
	const activeFilterLabels = $derived(
		[
			location ? `Lokasi: ${location}` : '',
			workplaceType ? `Tipe: ${workplaceTypeLabel[workplaceType]}` : '',
			employmentType ? `Jenis: ${employmentTypeLabel[employmentType]}` : '',
			education ? `Pendidikan: ${education}` : '',
			minExperience ? `Min. ${minExperience} tahun` : '',
			skill ? `Skill: ${skill}` : '',
			minSalary ? `Gaji min. ${formatRupiah(Number(minSalary))}` : '',
			maxSalary ? `Gaji maks. ${formatRupiah(Number(maxSalary))}` : '',
			postedWithinDays ? `${postedWithinDays} hari terakhir` : '',
			sourceType ? `Sumber: ${sourceTypeLabel[sourceType]}` : '',
			bookmarkedOnly ? 'Loker tersimpan' : ''
		].filter(Boolean)
	);

	function numberOrUndefined(value: string): number | undefined {
		const text = value.trim();
		if (!text) return undefined;
		const parsed = Number(text);
		return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
	}

	function errorText(error: unknown, fallback: string): string {
		return error instanceof Error ? error.message : fallback;
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
			month: 'short'
		}).format(date);
	}

	function locationLabel(value: string | null | undefined): string {
		const text = value?.trim() ?? '';
		return !text || text.toLowerCase() === 'null' ? 'Lokasi tidak dicantumkan' : text;
	}

	function salaryLabel(job: JobListItem): string {
		if (job.isSalaryConfidential) return 'Gaji dirahasiakan';
		if (job.salaryMin === null && job.salaryMax === null) return 'Gaji tidak dicantumkan';
		const currency = job.salaryCurrency ?? 'IDR';
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
		if (job.salaryMin !== null && job.salaryMax !== null) {
			return job.salaryMin === job.salaryMax
				? formatter(job.salaryMin)
				: `${formatter(job.salaryMin)} – ${formatter(job.salaryMax)}`;
		}
		return formatter((job.salaryMin ?? job.salaryMax) as number);
	}

	async function loadJobs(nextPage = page) {
		isLoading = true;
		loadError = null;
		try {
			const response = await listJobsApi({
				search: search.trim() || undefined,
				location: location.trim() || undefined,
				workplaceType: workplaceType || undefined,
				employmentType: employmentType || undefined,
				education: education.trim() || undefined,
				minExperience: numberOrUndefined(minExperience),
				skill: skill.trim() || undefined,
				minSalary: numberOrUndefined(minSalary),
				maxSalary: numberOrUndefined(maxSalary),
				postedWithinDays: postedWithinDays === '' ? undefined : postedWithinDays,
				bookmarked: bookmarkedOnly ? true : undefined,
				sourceType: sourceType || undefined,
				sort,
				page: nextPage,
				limit
			});
			jobs = response.items;
			meta = response.meta;
			page = response.meta.page;
		} catch (error) {
			loadError = errorText(error, 'Daftar lowongan belum dapat dimuat.');
		} finally {
			isLoading = false;
		}
	}

	async function loadBenefits() {
		try {
			myBenefits = await getMyBenefitsApi();
		} catch {
			myBenefits = null;
		}
	}

	async function loadTopupPackages() {
		try {
			const data = await getPublicBillingPlansApi();
			topupPackages = data.topupPackages;
		} catch {
			topupPackages = [];
		}
	}

	function applyFilters() {
		page = 1;
		void loadJobs(1);
	}

	function resetFilters() {
		search = '';
		location = '';
		workplaceType = '';
		employmentType = '';
		education = '';
		minExperience = '';
		skill = '';
		minSalary = '';
		maxSalary = '';
		postedWithinDays = '';
		sourceType = '';
		sort = 'newest';
		bookmarkedOnly = false;
		applyFilters();
	}

	function toggleBookmarkedFilter() {
		bookmarkedOnly = !bookmarkedOnly;
		applyFilters();
	}

	async function openJob(job: JobListItem) {
		selectedJob = job;
		selectedDetail = null;
		detailError = null;
		scoreNotice = null;
		scoreError = null;
		scoreUsage = null;
		quotaDialog = emptyQuotaDialog;
		loadingDetail = true;
		try {
			const detail = await getJobApi(job.id);
			if (selectedJob?.id === job.id) {
				selectedDetail = detail;
				selectedJob = detail;
			}
		} catch (error) {
			detailError = errorText(error, 'Detail lowongan belum dapat dimuat.');
		} finally {
			loadingDetail = false;
		}
	}

	function closeJob() {
		selectedJob = null;
		selectedDetail = null;
		detailError = null;
		scoreNotice = null;
		scoreError = null;
		scoreUsage = null;
		quotaDialog = emptyQuotaDialog;
	}

	async function toggleBookmark(job: JobListItem) {
		if (bookmarkingId) return;
		bookmarkingId = job.id;
		actionError = null;
		try {
			const result = job.bookmarked
				? await unbookmarkJobApi(job.id)
				: await bookmarkJobApi(job.id);
			const savedAt = result.savedAt ?? null;
			const update = (item: JobListItem): JobListItem => ({
				...item,
				bookmarked: result.bookmarked,
				savedAt
			});
			jobs = jobs.map((item) => (item.id === job.id ? update(item) : item));
			if (selectedJob?.id === job.id) selectedJob = update(selectedJob);
			if (selectedDetail?.id === job.id) selectedDetail = update(selectedDetail);
			if (bookmarkedOnly && !result.bookmarked) {
				await loadJobs(page);
			}
		} catch (error) {
			actionError = errorText(error, 'Lowongan belum dapat disimpan.');
		} finally {
			bookmarkingId = null;
		}
	}

	function openQuotaDialog(
		benefit: UserBenefitQuota | null,
		title: string,
		message: string,
		canContinue: boolean
	) {
		quotaDialog = {
			open: true,
			title,
			message,
			benefit,
			creditBalance: myBenefits?.creditBalance ?? null,
			canContinue
		};
	}

	function openTopupForScoring() {
		const benefit = scoringBenefit;
		openQuotaDialog(
			benefit,
			'Top-up kredit',
			benefit
				? `Skor AI memakai benefit ${benefit.name}. Saldo kreditmu dapat dipakai saat kuota habis.`
				: 'Skor AI belum aktif di paketmu. Pilih paket atau top-up kredit untuk melanjutkan.',
			false
		);
	}

	async function requestScore() {
		if (!selectedJob || scoringBusy) return;
		preparingScore = true;
		scoreError = null;
		scoreNotice = null;
		try {
			const benefits = await getMyBenefitsApi();
			myBenefits = benefits;
			const benefit = benefits.benefits.find((item) => item.code === 'JOB_SCORING') ?? null;

			if (!benefit) {
				openQuotaDialog(
					null,
					'Scoring belum tersedia',
					'Benefit JOB_SCORING belum aktif di paketmu. Pilih paket atau top-up kredit untuk melanjutkan.',
					false
				);
				return;
			}

			const accessMode = benefitAccessMode(benefit, benefits.creditBalance);
			if (accessMode === 'credit') {
				openQuotaDialog(
					benefit,
					'Kuota habis — lanjut dengan kredit?',
					`Kuota scoring habis. Lanjutkan memakai ${benefit.creditCost} kredit (± ${formatRupiah(benefit.overageCostIdr)})? Skor tidak dibuat sebelum kamu memilih.`,
					true
				);
				return;
			}
			if (accessMode === 'none') {
				openQuotaDialog(
					benefit,
					'Kuota dan kredit habis',
					'Kuota scoring habis dan saldo kredit tidak cukup. Top-up kredit terlebih dahulu untuk menghitung kecocokan.',
					false
				);
				return;
			}

			await performScore();
		} catch (error) {
			scoreError = errorText(error, 'Kuota scoring belum dapat diperiksa.');
		} finally {
			preparingScore = false;
		}
	}

	async function performScore() {
		if (!selectedJob || scoring) return;
		const jobId = selectedJob.id;
		scoring = true;
		scoreError = null;
		scoreNotice = null;
		scoreUsage = null;
		try {
			const result = await scoreJobApi(jobId);
			const matchScore: JobMatchScore = {
				score: result.score,
				summary: result.summary,
				strengths: result.strengths,
				weaknesses: result.weaknesses,
				suggestions: result.suggestions,
				matchedSkills: result.matchedSkills,
				missingSkills: result.missingSkills,
				updatedAt: result.updatedAt
			};
			const update = (item: JobListItem): JobListItem =>
				item.id === jobId ? { ...item, matchScore } : item;
			jobs = jobs.map(update);
			if (selectedJob?.id === jobId) selectedJob = update(selectedJob);
			if (selectedDetail?.id === jobId) selectedDetail = update(selectedDetail);
			scoreUsage = result.usage;
			scoreNotice =
				result.usage.source === 'CREDIT'
					? `Skor berhasil dibuat dengan ${result.usage.creditsCharged} kredit (± ${formatRupiah(result.usage.costIdr)}).`
					: result.usage.source === 'UNLIMITED'
						? 'Skor berhasil dibuat dengan paket unlimited.'
						: 'Skor kecocokan berhasil dibuat.';
			try {
				myBenefits = await getMyBenefitsApi();
				if (typeof window !== 'undefined' && myBenefits) {
					window.dispatchEvent(
						new CustomEvent('benefits:updated', {
							detail: { creditBalance: myBenefits.creditBalance }
						})
					);
				}
			} catch {
				// The score result remains valid even if quota refresh fails.
			}
		} catch (error) {
			if (error instanceof ApiError && error.code === 'BENEFIT_QUOTA_EXHAUSTED') {
				const payload =
					typeof error.payload === 'object' && error.payload !== null
						? (error.payload as Record<string, unknown>)
						: {};
				const benefit = scoringBenefit;
				await loadBenefits();
				openQuotaDialog(
					scoringBenefit ?? benefit,
					'Kuota dan kredit habis',
					error.message,
					false
				);
				const balance = payload.creditBalance;
				quotaDialog = {
					...quotaDialog,
					creditBalance: typeof balance === 'number' ? balance : myBenefits?.creditBalance ?? null
				};
			} else if (
				error instanceof ApiError &&
				error.code === 'JOB_SCORING_QUOTA_NOT_CONFIGURED'
			) {
				openQuotaDialog(
					null,
					'Scoring belum tersedia',
					error.message,
					false
				);
			} else if (error instanceof ApiError && error.status === 400) {
				scoreError = `${error.message} Lengkapi CV di Profil & Ekstraksi CV atau selesaikan psikotes terlebih dahulu.`;
			} else {
				scoreError = errorText(error, 'Skor kecocokan belum dapat dihitung.');
			}
		} finally {
			scoring = false;
		}
	}

	function continueWithCredit() {
		quotaDialog = { ...quotaDialog, open: false };
		void performScore();
	}

	function closeQuotaDialog() {
		quotaDialog = { ...quotaDialog, open: false };
	}

	onMount(() => {
		void Promise.all([loadJobs(1), loadBenefits(), loadTopupPackages()]);
	});
</script>

<svelte:head>
	<title>Pusat Lowongan | AI Job Hunter</title>
	<meta
		name="description"
		content="Temukan lowongan kerja, simpan favorit, dan hitung skor kecocokan dengan CV serta hasil psikotesmu."
	/>
</svelte:head>

<div class="space-y-6">
	<section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
		<div>
			<p class="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
				<BriefcaseBusiness size={14} /> Pusat lowongan
			</p>
			<h1 class="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
				Temukan peluang berikutnya
			</h1>
			<p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
				Jelajahi lowongan terkurasi, simpan yang menarik, lalu lihat seberapa cocok lowongan itu dengan CV dan hasil psikotesmu.
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			{#if scoringBenefit}
				<span class="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
					<Sparkles size={12} class="mr-1 inline" />
					{#if freeLifetimeRemaining(scoringBenefit) > 0}
						Skor AI gratis tersisa {formatNumber(freeLifetimeRemaining(scoringBenefit))}×
					{:else if isUnlimitedQuota(scoringBenefit.limit)}
						Skor AI tanpa batas
					{:else if scoringAccessMode === 'credit'}
						Skor AI memakai kredit
					{:else}
						{formatNumber(Math.max(scoringBenefit.remaining, 0))} skor tersisa
					{/if}
				</span>
			{:else if myBenefits}
				<span class="rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700">
					Benefit scoring belum aktif
				</span>
			{/if}
			<a
				href="/billing#kredit-kilat"
				class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
			>
				<WalletCards size={14} /> Kredit
			</a>
		</div>
	</section>

	{#if actionError}
		<div class="flex items-start justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
			<span>{actionError}</span>
			<button type="button" onclick={() => (actionError = null)} aria-label="Tutup pesan" class="shrink-0 rounded p-0.5 hover:bg-rose-100">
				<X size={15} />
			</button>
		</div>
	{/if}

	<form
		class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
		onsubmit={(event) => {
			event.preventDefault();
			applyFilters();
		}}
	>
		<div class="flex flex-col gap-2 sm:flex-row">
			<label class="relative min-w-0 flex-1">
				<span class="sr-only">Cari lowongan</span>
				<Search size={17} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
				<input
					bind:value={search}
					placeholder="Cari posisi, perusahaan, lokasi, atau sumber..."
					class="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
				/>
			</label>
			<div class="flex gap-2">
				<button
					type="submit"
					class="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white transition hover:bg-indigo-700"
				>
					<Search size={15} /> Cari
				</button>
				<button
					type="button"
					onclick={() => (advancedOpen = !advancedOpen)}
					class="relative inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition {advancedOpen
						? 'border-indigo-200 bg-indigo-50 text-indigo-700'
						: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}"
					aria-expanded={advancedOpen}
				>
					<SlidersHorizontal size={15} /> Filter
					{#if advancedFilterCount > 0}
						<span class="inline-flex size-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white">
							{advancedFilterCount}
						</span>
					{/if}
				</button>
			</div>
		</div>

		<div class="mt-3 flex flex-wrap items-center gap-2">
			<button
				type="button"
				onclick={toggleBookmarkedFilter}
				aria-pressed={bookmarkedOnly}
				class="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition {bookmarkedOnly
					? 'border-indigo-200 bg-indigo-50 text-indigo-700'
					: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}"
			>
				{#if bookmarkedOnly}<BookmarkCheck size={13} />{:else}<Bookmark size={13} />{/if}
				Tersimpan
			</button>
			<label class="ml-auto flex items-center gap-1.5 text-[11px] text-slate-500">
				Urutkan
				<select
					bind:value={sort}
					onchange={applyFilters}
					class="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 outline-none focus:border-indigo-300"
				>
					{#each sortOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>
			<button
				type="button"
				onclick={resetFilters}
				class="h-8 rounded-lg px-2 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
			>
				Reset
			</button>
		</div>

		{#if advancedOpen}
			<div class="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
				<label class="space-y-1 text-[11px] font-semibold text-slate-500">
					Lokasi
					<input bind:value={location} placeholder="Jakarta" class="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-800 outline-none focus:border-indigo-300" />
				</label>
				<label class="space-y-1 text-[11px] font-semibold text-slate-500">
					Tipe kerja
					<select bind:value={workplaceType} class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-indigo-300">
						{#each workplaceTypes as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</label>
				<label class="space-y-1 text-[11px] font-semibold text-slate-500">
					Jenis kerja
					<select bind:value={employmentType} class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-indigo-300">
						{#each employmentTypes as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</label>
				<label class="space-y-1 text-[11px] font-semibold text-slate-500">
					Sumber
					<select bind:value={sourceType} class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-indigo-300">
						{#each sourceTypes as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</label>
				<label class="space-y-1 text-[11px] font-semibold text-slate-500">
					Pendidikan
					<input bind:value={education} placeholder="S1" class="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-800 outline-none focus:border-indigo-300" />
				</label>
				<label class="space-y-1 text-[11px] font-semibold text-slate-500">
					Min. pengalaman (tahun)
					<input bind:value={minExperience} type="number" min="0" max="50" class="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-800 outline-none focus:border-indigo-300" />
				</label>
				<label class="space-y-1 text-[11px] font-semibold text-slate-500">
					Skill
					<input bind:value={skill} placeholder="TypeScript" class="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-800 outline-none focus:border-indigo-300" />
				</label>
				<label class="space-y-1 text-[11px] font-semibold text-slate-500">
					Diposting
					<select bind:value={postedWithinDays} class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-indigo-300">
						{#each postedOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</label>
				<label class="space-y-1 text-[11px] font-semibold text-slate-500">
					Gaji minimum
					<input bind:value={minSalary} type="number" min="0" placeholder="8000000" class="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-800 outline-none focus:border-indigo-300" />
				</label>
				<label class="space-y-1 text-[11px] font-semibold text-slate-500">
					Gaji maksimum
					<input bind:value={maxSalary} type="number" min="0" placeholder="12000000" class="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-800 outline-none focus:border-indigo-300" />
				</label>
				<div class="flex items-end sm:col-span-2">
					<button type="submit" class="h-9 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800">
						Terapkan filter
					</button>
				</div>
			</div>
		{/if}
	</form>

	{#if activeFilterLabels.length > 0}
		<div class="flex flex-wrap items-center gap-1.5">
			<span class="text-[11px] font-semibold text-slate-400">Filter aktif:</span>
			{#each activeFilterLabels as label}
				<span class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{label}</span>
			{/each}
		</div>
	{/if}

	{#if isLoading}
		<div class="grid gap-4 lg:grid-cols-2">
			{#each Array(4) as _}
				<div class="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
					<div class="h-4 w-2/3 rounded bg-slate-100"></div>
					<div class="mt-3 h-3 w-1/2 rounded bg-slate-100"></div>
					<div class="mt-8 h-3 w-full rounded bg-slate-100"></div>
					<div class="mt-2 h-3 w-4/5 rounded bg-slate-100"></div>
				</div>
			{/each}
		</div>
	{:else if loadError}
		<div class="rounded-2xl border border-rose-100 bg-white p-8 text-center">
			<p class="text-sm text-rose-700" role="alert">{loadError}</p>
			<button
				type="button"
				onclick={() => void loadJobs(page)}
				class="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
			>
				<RefreshCw size={15} /> Coba lagi
			</button>
		</div>
	{:else if jobs.length === 0}
		<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
			<span class="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
				<BriefcaseBusiness size={24} />
			</span>
			<h2 class="mt-4 text-lg font-semibold text-slate-900">
				{bookmarkedOnly ? 'Belum ada loker tersimpan' : 'Lowongan tidak ditemukan'}
			</h2>
			<p class="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
				{bookmarkedOnly
					? 'Simpan lowongan yang menarik agar mudah kamu temukan lagi nanti.'
					: 'Coba kata kunci atau filter lain untuk menemukan lowongan yang sesuai.'}
			</p>
			{#if activeFilterLabels.length > 0 || bookmarkedOnly}
				<button type="button" onclick={resetFilters} class="mt-5 text-xs font-semibold text-indigo-700 hover:text-indigo-900">
					Reset semua filter
				</button>
			{/if}
		</div>
	{:else}
		<div class="flex flex-wrap items-end justify-between gap-2">
			<p class="text-xs text-slate-500">
				Menampilkan <strong class="text-slate-700">{meta?.total ?? jobs.length}</strong> lowongan
				{#if bookmarkedOnly}tersimpan{/if}
			</p>
			{#if meta && meta.totalPages > 1}
				<p class="text-[11px] text-slate-400">Halaman {meta.page} dari {meta.totalPages}</p>
			{/if}
		</div>

		<div class="grid gap-4 lg:grid-cols-2">
			{#each jobs as job (job.id)}
				<article class="relative flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
					<button
						type="button"
						onclick={() => void openJob(job)}
						class="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
					>
						<div class="flex items-start gap-3 pr-9">
							<span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
								<Building2 size={18} />
							</span>
							<div class="min-w-0">
								<h2 class="truncate text-base font-bold tracking-tight text-slate-950">{job.jobTitle}</h2>
								<p class="mt-0.5 truncate text-sm text-slate-600">{job.companyName}</p>
							</div>
						</div>

						<div class="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
							<span class="rounded-full bg-indigo-50 px-2 py-1 text-indigo-700">
								{workplaceTypeLabel[job.workplaceType as keyof typeof workplaceTypeLabel] ?? job.workplaceType}
							</span>
							<span class="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
								{employmentTypeLabel[job.employmentType as keyof typeof employmentTypeLabel] ?? job.employmentType}
							</span>
							{#if job.matchScore}
								<span class="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Skor {job.matchScore.score}</span>
							{/if}
						</div>

						<div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
							<span class="inline-flex items-center gap-1"><MapPin size={12} /> {locationLabel(job.location)}</span>
							<span class="inline-flex items-center gap-1 font-semibold text-slate-700"><Coins size={12} /> {salaryLabel(job)}</span>
						</div>

						{#if job.jobDescriptionSummary}
							<p class="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">{job.jobDescriptionSummary}</p>
						{/if}

						{#if (job.requirements?.skills ?? []).length > 0}
							<div class="mt-3 flex flex-wrap gap-1">
								{#each (job.requirements?.skills ?? []).slice(0, 4) as item}
									<span class="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-medium text-slate-600">{item}</span>
								{/each}
								{#if (job.requirements?.skills ?? []).length > 4}
									<span class="px-1 py-0.5 text-[9px] text-slate-400">+{(job.requirements?.skills ?? []).length - 4}</span>
								{/if}
							</div>
						{/if}

						<div class="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-[10px] text-slate-400">
							<span>{postedLabel(job.scrapedAt)}</span>
							<span>·</span>
							<span>{sourceTypeLabel[job.sourceType as keyof typeof sourceTypeLabel] ?? job.sourceType}</span>
							<span class="ml-auto font-semibold text-indigo-600">Lihat detail →</span>
						</div>
					</button>

					<button
						type="button"
						onclick={() => void toggleBookmark(job)}
						disabled={bookmarkingId === job.id}
						aria-pressed={job.bookmarked}
						aria-label={job.bookmarked ? 'Hapus dari tersimpan' : 'Simpan lowongan'}
						class="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-lg border transition {job.bookmarked
							? 'border-indigo-200 bg-indigo-50 text-indigo-700'
							: 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-700'} disabled:opacity-50"
					>
						{#if bookmarkingId === job.id}
							<Spinner label="Menyimpan" />
						{:else if job.bookmarked}
							<BookmarkCheck size={15} />
						{:else}
							<Bookmark size={15} />
						{/if}
					</button>
				</article>
			{/each}
		</div>

		{#if meta && meta.totalPages > 1}
			<div class="flex items-center justify-center gap-3 pt-1">
				<button
					type="button"
					onclick={() => void loadJobs(page - 1)}
					disabled={page <= 1 || isLoading}
					class="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
				>
					<ChevronLeft size={15} /> Sebelumnya
				</button>
				<span class="text-xs text-slate-500">Halaman {meta.page} / {meta.totalPages}</span>
				<button
					type="button"
					onclick={() => void loadJobs(page + 1)}
					disabled={page >= meta.totalPages || isLoading}
					class="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
				>
					Berikutnya <ChevronRight size={15} />
				</button>
			</div>
		{/if}
	{/if}
</div>

<JobDetailDrawer
	job={selectedJob}
	detail={selectedDetail}
	loadingDetail={loadingDetail}
	bookmarking={selectedJob !== null && bookmarkingId === selectedJob.id}
	scoring={scoringBusy}
	scoreUsage={scoreUsage}
	scoreMessage={scoreNotice}
	errorMessage={scoreError ?? detailError}
	onclose={closeJob}
	onbookmark={() => {
		if (selectedJob) void toggleBookmark(selectedJob);
	}}
	onscore={() => void requestScore()}
	ontopup={openTopupForScoring}
/>

<QuotaTopupModal
	open={quotaDialog.open}
	title={quotaDialog.title}
	message={quotaDialog.message}
	benefit={quotaDialog.benefit}
	topupPackages={topupPackages}
	creditBalance={quotaDialog.creditBalance}
	canContinue={quotaDialog.canContinue}
	onclose={closeQuotaDialog}
	oncontinue={continueWithCredit}
/>
