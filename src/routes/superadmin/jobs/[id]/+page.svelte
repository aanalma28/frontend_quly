<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		ArrowLeft,
		ArrowRight,
		Ban,
		CheckCircle2,
		Image as ImageIcon,
		Save,
		Send,
		Trash2,
		X
	} from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/superadmin/Alert.svelte';
	import { formatDate, formatNumber, formatUsd } from '#lib/components/superadmin/format.js';
	import { getAssetUrl } from '#lib/utils/api.js';
	import {
		aiOutcomeLabel,
		aiOutcomeTone,
		applicationTypeLabel,
		employmentTypeLabel,
		jobStatusLabel,
		jobStatusTone,
		sourceTypeLabel,
		workplaceTypeLabel
	} from '#lib/components/superadmin/status.js';
	import {
		deleteJobApi,
		getJobApi,
		listJobsApi,
		reviewJobApi,
		updateJobApi,
		type ApplicationType,
		type EmploymentType,
		type JobRequirements,
		type JobStatus,
		type ScrapedJob,
		type ScrapedJobDetail,
		type UpdateScrapedJobInput,
		type WorkplaceType
	} from '#lib/services/superadminApi.js';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const jobId = $derived(params.id);

	let detail = $state<ScrapedJobDetail | null>(null);
	let job = $state<ScrapedJob | null>(null);
	const posterUrl = $derived(detail ? getAssetUrl(detail.raw.localImagePath) : null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);
	let infoMessage = $state<string | null>(null);

	let formJobTitle = $state('');
	let formCompanyName = $state('');
	let formLocation = $state('');
	let formWorkplaceType = $state<WorkplaceType>('WFO');
	let formEmploymentType = $state<EmploymentType>('FULL_TIME');
	let formSalaryMin = $state('');
	let formSalaryMax = $state('');
	let formSalaryCurrency = $state('IDR');
	let formSalaryConfidential = $state(false);
	let formMinExperience = $state('');
	let formEducation = $state('');
	let formSkills = $state('');
	let formDescription = $state('');
	let formSubjectFormat = $state('');
	let formApplicationType = $state<ApplicationType>('EMAIL');
	let formApplicationDestination = $state('');
	let formApplicationInstructions = $state('');
	let formExpiresAt = $state('');
	let formConfidence = $state('');

	let isSaving = $state(false);
	let isPublishing = $state(false);
	let isDiscarding = $state(false);
	let isFindingNext = $state(false);
	let lightboxOpen = $state(false);

	const workplaceTypes: WorkplaceType[] = ['REMOTE', 'WFO', 'HYBRID'];
	const employmentTypes: EmploymentType[] = [
		'FULL_TIME',
		'PART_TIME',
		'CONTRACT',
		'FREELANCE',
		'INTERNSHIP'
	];
	const applicationTypes: ApplicationType[] = ['EMAIL', 'WEBSITE_PORTAL', 'WHATSAPP', 'TELEGRAM'];
	const auditStatuses: JobStatus[] = [
		'RAW_PARSED',
		'PENDING_REVIEW',
		'APPROVED',
		'SAVED'
	];

	const inputClass =
		'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30';

	function toDateInput(value: string | null): string {
		return value ? value.slice(0, 10) : '';
	}

	function applyToForm(data: ScrapedJob) {
		formJobTitle = data.jobTitle;
		formCompanyName = data.companyName;
		formLocation = data.location;
		formWorkplaceType = (data.workplaceType as WorkplaceType) ?? 'WFO';
		formEmploymentType = (data.employmentType as EmploymentType) ?? 'FULL_TIME';
		formSalaryMin = data.salaryMin !== null ? String(data.salaryMin) : '';
		formSalaryMax = data.salaryMax !== null ? String(data.salaryMax) : '';
		formSalaryCurrency = data.salaryCurrency ?? 'IDR';
		formSalaryConfidential = data.isSalaryConfidential;
		formMinExperience =
			data.requirements?.minExperienceYears !== undefined &&
			data.requirements?.minExperienceYears !== null
				? String(data.requirements.minExperienceYears)
				: '';
		formEducation = data.requirements?.education ?? '';
		formSkills = (data.requirements?.skills ?? []).join(', ');
		formDescription = data.jobDescriptionSummary ?? '';
		formSubjectFormat = data.subjectFormat ?? '';
		formApplicationType = data.applicationType;
		formApplicationDestination = data.applicationDestination;
		formApplicationInstructions = data.applicationInstructions ?? '';
		formExpiresAt = toDateInput(data.expiresAt);
		formConfidence = data.confidenceScore !== null ? String(data.confidenceScore) : '';
	}

	async function load(id: string = jobId) {
		isLoading = true;
		loadError = null;
		errorMessage = null;
		successMessage = null;
		infoMessage = null;
		lightboxOpen = false;
		try {
			const data = await getJobApi(id);
			detail = data;
			job = data.job;
			applyToForm(data.job);
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Lowongan belum dapat dimuat.';
		} finally {
			isLoading = false;
		}
	}

	function textValue(value: unknown): string {
		if (typeof value === 'string') return value;
		if (value === null || value === undefined) return '';
		return String(value);
	}

	function nullableNumber(value: unknown): number | null {
		const raw = textValue(value).trim();
		if (!raw) return null;
		const parsed = Number(raw);
		return Number.isFinite(parsed) ? parsed : null;
	}

	function buildPayload(): UpdateScrapedJobInput {
		const minExperienceYears = nullableNumber(formMinExperience);
		const salaryMin = nullableNumber(formSalaryMin);
		const salaryMax = nullableNumber(formSalaryMax);
		const confidenceScore = nullableNumber(formConfidence);
		const expiresAt = textValue(formExpiresAt).trim();

		const requirements: JobRequirements = {
			minExperienceYears,
			education: textValue(formEducation).trim() || null,
			skills: textValue(formSkills)
				.split(',')
				.map((skill) => skill.trim())
				.filter(Boolean)
		};

		return {
			jobTitle: textValue(formJobTitle).trim(),
			companyName: textValue(formCompanyName).trim(),
			location: textValue(formLocation).trim(),
			workplaceType: formWorkplaceType,
			employmentType: formEmploymentType,
			salaryMin,
			salaryMax,
			salaryCurrency: textValue(formSalaryCurrency).trim() || null,
			isSalaryConfidential: formSalaryConfidential,
			requirements,
			jobDescriptionSummary: textValue(formDescription).trim(),
			subjectFormat: textValue(formSubjectFormat).trim() || null,
			applicationType: formApplicationType,
			applicationDestination: textValue(formApplicationDestination).trim(),
			applicationInstructions: textValue(formApplicationInstructions).trim() || null,
			expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
			confidenceScore
		};
	}

	function validate(payload: UpdateScrapedJobInput): string | null {
		if (!payload.jobTitle) return 'Job title wajib diisi.';
		if (!payload.companyName) return 'Company wajib diisi.';
		if (!payload.location) return 'Location wajib diisi.';
		if (!payload.applicationDestination) return 'Tujuan lamaran wajib diisi.';
		if (
			typeof payload.confidenceScore === 'number' &&
			(payload.confidenceScore < 0 || payload.confidenceScore > 1)
		) {
			return 'Confidence score harus antara 0 dan 1.';
		}
		return null;
	}

	async function saveOnly(): Promise<boolean> {
		const payload = buildPayload();
		const problem = validate(payload);
		if (problem) {
			errorMessage = problem;
			return false;
		}

		// Jobs still in the audit queue are marked SAVED. Jobs that are already
		// PUBLISHED/ARCHIVED/REJECTED keep their status while edits are saved.
		const markSaved = Boolean(job && auditStatuses.includes(job.status));

		isSaving = true;
		errorMessage = null;
		successMessage = null;
		try {
			const updated = markSaved
				? await reviewJobApi(jobId, { status: 'SAVED', data: payload })
				: await updateJobApi(jobId, payload);
			job = job ? { ...job, ...updated } : updated;
			successMessage = markSaved
				? 'Perubahan disimpan dan lowongan ditandai sebagai SAVED.'
				: 'Perubahan data lowongan berhasil disimpan.';
			if (markSaved) {
				await navigateAfterAction();
			}
			return true;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Perubahan gagal disimpan.';
			return false;
		} finally {
			isSaving = false;
		}
	}

	async function findFirstPendingJobId(): Promise<string | null> {
		const pageSize = 100;
		const maxPages = 10;
		let page = 1;
		let totalPages = 1;

		do {
			const response = await listJobsApi({ page, limit: pageSize });
			totalPages = response.meta.totalPages;
			const pending = response.items.find((item) => auditStatuses.includes(item.status));
			if (pending) return pending.id;
			page += 1;
		} while (page <= totalPages && page <= maxPages);

		return null;
	}

	async function findNextJobId(): Promise<string | null> {
		if (job && !auditStatuses.includes(job.status)) {
			return findFirstPendingJobId();
		}

		const pageSize = 100;
		const maxPages = 10;
		let page = 1;
		let totalPages = 1;
		let firstPendingId: string | null = null;
		let foundCurrent = false;

		do {
			const response = await listJobsApi({ page, limit: pageSize });
			totalPages = response.meta.totalPages;
			for (const item of response.items) {
				if (!auditStatuses.includes(item.status)) continue;
				if (!firstPendingId) firstPendingId = item.id;
				if (foundCurrent) return item.id;
				if (item.id === jobId) foundCurrent = true;
			}
			page += 1;
		} while (page <= totalPages && page <= maxPages);

		return foundCurrent ? null : firstPendingId;
	}

	async function goToNext() {
		if (isFindingNext) return;
		isFindingNext = true;
		errorMessage = null;
		successMessage = null;
		infoMessage = null;
		try {
			const nextId = await findNextJobId();
			if (!nextId) {
				infoMessage = 'Tidak ada lowongan lain yang menunggu audit.';
				return;
			}
			await goto(`/superadmin/jobs/${nextId}`);
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Gagal mencari lowongan berikutnya.';
		} finally {
			isFindingNext = false;
		}
	}

	async function navigateAfterAction() {
		try {
			const nextId = await findNextJobId();
			await goto(nextId ? `/superadmin/jobs/${nextId}` : '/superadmin/jobs');
		} catch {
			await goto('/superadmin/jobs');
		}
	}

	async function approveAndPublish() {
		if (isPublishing) return;
		const payload = buildPayload();
		const problem = validate(payload);
		if (problem) {
			errorMessage = problem;
			return;
		}

		isPublishing = true;
		errorMessage = null;
		successMessage = null;
		try {
			// One atomic call: apply edits and approve the job.
			const updated = await reviewJobApi(jobId, { status: 'APPROVED', data: payload });
			job = job ? { ...job, ...updated } : updated;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Approval gagal.';
			isPublishing = false;
			return;
		}
		try {
			await navigateAfterAction();
		} finally {
			isPublishing = false;
		}
	}

	async function rejectJob() {
		if (isDiscarding) return;
		if (
			typeof window !== 'undefined' &&
			!window.confirm('Tolak lowongan ini? Data tetap tersimpan dengan status REJECTED.')
		) {
			return;
		}
		isDiscarding = true;
		errorMessage = null;
		successMessage = null;
		try {
			const updated = await reviewJobApi(jobId, { status: 'REJECTED' });
			job = job ? { ...job, ...updated } : updated;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Gagal menolak lowongan.';
			isDiscarding = false;
			return;
		}
		try {
			await navigateAfterAction();
		} finally {
			isDiscarding = false;
		}
	}

	async function discardJob() {
		if (isDiscarding) return;
		if (
			typeof window !== 'undefined' &&
			!window.confirm(
				'Hapus permanen lowongan ini beserta poster dan data terkait? Tindakan ini tidak dapat dibatalkan.'
			)
		) {
			return;
		}
		isDiscarding = true;
		errorMessage = null;
		successMessage = null;
		try {
			await deleteJobApi(jobId);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Gagal menghapus lowongan.';
			isDiscarding = false;
			return;
		}
		try {
			await navigateAfterAction();
		} finally {
			isDiscarding = false;
		}
	}

	$effect(() => {
		void load(jobId);
	});
</script>

<svelte:head>
	<title>Audit Lowongan | Superadmin</title>
</svelte:head>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape') lightboxOpen = false;
	}}
/>

{#if isLoading}
	<div class="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
		<Spinner label="Memuat lowongan" /> Memuat lowongan...
	</div>
{:else if loadError}
	<div class="mx-auto max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
		<p class="text-sm text-rose-300" role="alert">{loadError}</p>
		<a
			href="/superadmin/jobs"
			class="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
		>
			<ArrowLeft size={15} /> Kembali ke feed
		</a>
	</div>
{:else if job && detail}
	<div class="space-y-6">
		<header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
			<div>
				<a
					href="/superadmin/jobs"
					class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-white"
				>
					<ArrowLeft size={15} /> Live Job Ingestion
				</a>
				<h1 class="mt-2 text-2xl font-bold tracking-tight text-white">{job.jobTitle}</h1>
				<div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
					<span class="rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset {jobStatusTone[job.status]}">
						{jobStatusLabel[job.status]}
					</span>
					<span>{sourceTypeLabel[job.sourceType]} · {job.source?.name ?? job.sourceDetail}</span>
					{#if job.createdBy}
						<span>· User: {job.createdBy.email}</span>
					{/if}
					<span>· Confidence {job.confidenceScore !== null ? `${Math.round(job.confidenceScore * 100)}%` : '—'}</span>
					<span>· Scraped {formatDate(job.scrapedAt)}</span>
				</div>
			</div>
			<button
				type="button"
				onclick={() => void goToNext()}
				disabled={isSaving || isPublishing || isDiscarding || isFindingNext}
				class="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if isFindingNext}
					<Spinner label="Mencari lowongan berikutnya" />
				{:else}
					<ArrowRight size={16} />
				{/if}
				Next Job
			</button>
		</header>

		{#if errorMessage}
			<Alert type="error" message={errorMessage} dismissible ondismiss={() => (errorMessage = null)} />
		{/if}
		{#if successMessage}
			<Alert type="success" message={successMessage} dismissible ondismiss={() => (successMessage = null)} />
		{/if}
		{#if infoMessage}
			<Alert type="info" message={infoMessage} dismissible ondismiss={() => (infoMessage = null)} />
		{/if}

		<div class="grid gap-5 lg:grid-cols-2">
			<section class="space-y-4">
				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
					<div class="flex items-center gap-2">
						<ImageIcon size={16} class="text-indigo-300" />
						<h2 class="text-sm font-semibold text-white">Poster Asli / Teks Mentah</h2>
					</div>
					{#if posterUrl}
						<div class="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
							<button
								type="button"
								onclick={() => (lightboxOpen = true)}
								class="group relative block w-full cursor-zoom-in"
								aria-label="Perbesar poster lowongan"
							>
								<img
									src={posterUrl}
									alt="Poster lowongan {job.jobTitle}"
									class="mx-auto max-h-[520px] w-auto object-contain transition group-hover:opacity-95"
								/>
								<span
									class="absolute bottom-3 right-3 rounded-full bg-slate-950/85 px-2.5 py-1 text-[10px] font-semibold text-slate-200 ring-1 ring-slate-700"
								>
									Klik untuk zoom
								</span>
							</button>
						</div>
					{:else}
						<div class="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
							<p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Teks mentah</p>
							<pre class="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-300">{detail.raw.rawContent ?? 'Tidak ada teks mentah.'}</pre>
						</div>
					{/if}
					<p class="mt-3 text-[11px] text-slate-500">
						Sumber: {sourceTypeLabel[detail.raw.sourceType]} · {detail.raw.sourceDetail} ·
						{formatDate(detail.raw.scrapedAt)}
					</p>
				</div>

				{#if posterUrl && detail.raw.rawContent}
					<details class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
						<summary class="cursor-pointer text-sm font-semibold text-white">Lihat teks mentah</summary>
						<pre class="mt-3 whitespace-pre-wrap text-xs leading-6 text-slate-300">{detail.raw.rawContent}</pre>
					</details>
				{/if}

				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
					<h2 class="text-sm font-semibold text-white">AI Usage Log</h2>
					{#if detail.aiUsageLogs.length === 0}
						<p class="mt-2 text-xs text-slate-500">Belum ada log penggunaan AI untuk lowongan ini.</p>
					{:else}
						<div class="mt-3 overflow-x-auto">
							<table class="min-w-full text-xs">
								<thead class="text-left text-[10px] uppercase tracking-wide text-slate-500">
									<tr>
										<th class="pb-2 pr-3 font-semibold">Fitur</th>
										<th class="pb-2 pr-3 font-semibold">Model</th>
										<th class="pb-2 pr-3 font-semibold">Outcome</th>
										<th class="pb-2 pr-3 font-semibold">Tokens</th>
										<th class="pb-2 pr-3 font-semibold">Biaya</th>
										<th class="pb-2 font-semibold">Waktu</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-800/70">
									{#each detail.aiUsageLogs as log (log.id)}
										<tr>
											<td class="py-2 pr-3 text-slate-300">{log.featureName}</td>
											<td class="py-2 pr-3 text-slate-400">{log.modelName}</td>
											<td class="py-2 pr-3">
												<span class="rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset {aiOutcomeTone(log.outcome)}">
													{aiOutcomeLabel(log.outcome)}
												</span>
												{#if log.errorMessage}
													<p
														class="mt-1 max-w-[180px] truncate text-[10px] text-rose-300/80"
														title={log.errorMessage}
													>
														{log.errorMessage}
													</p>
												{/if}
											</td>
											<td class="py-2 pr-3 text-slate-300">
												{formatNumber(log.promptTokens + log.completionTokens)}
											</td>
											<td class="py-2 pr-3 text-slate-300">{formatUsd(log.estimatedCostUsd)}</td>
											<td class="py-2 text-slate-500">{formatDate(log.createdAt)}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</section>

			<section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
				<h2 class="text-sm font-semibold text-white">Hasil Ekstraksi AI (OpenAI)</h2>
				<p class="mt-1 text-xs text-slate-500">Tinjau dan koreksi data sebelum dipublikasikan.</p>

				<div class="mt-4 space-y-4">
					<div class="grid gap-4 sm:grid-cols-2">
						<label class="block space-y-1.5 text-sm font-medium text-slate-300">
							Job Title <span class="text-rose-400">*</span>
							<input bind:value={formJobTitle} maxlength="200" class={inputClass} />
						</label>
						<label class="block space-y-1.5 text-sm font-medium text-slate-300">
							Company <span class="text-rose-400">*</span>
							<input bind:value={formCompanyName} maxlength="200" class={inputClass} />
						</label>
						<label class="block space-y-1.5 text-sm font-medium text-slate-300">
							Location <span class="text-rose-400">*</span>
							<input bind:value={formLocation} maxlength="200" class={inputClass} />
						</label>
						<label class="block space-y-1.5 text-sm font-medium text-slate-300">
							Workplace Type
							<select bind:value={formWorkplaceType} class={inputClass}>
								{#each workplaceTypes as type}
									<option value={type}>{workplaceTypeLabel[type]}</option>
								{/each}
							</select>
						</label>
						<label class="block space-y-1.5 text-sm font-medium text-slate-300">
							Employment Type
							<select bind:value={formEmploymentType} class={inputClass}>
								{#each employmentTypes as type}
									<option value={type}>{employmentTypeLabel[type]}</option>
								{/each}
							</select>
						</label>
						<label class="block space-y-1.5 text-sm font-medium text-slate-300">
							Confidence Score (0–1)
							<input bind:value={formConfidence} type="number" min="0" max="1" step="0.01" class={inputClass} />
						</label>
					</div>

					<div class="grid gap-4 sm:grid-cols-3">
						<label class="block space-y-1.5 text-sm font-medium text-slate-300">
							Salary Min
							<input bind:value={formSalaryMin} type="number" min="0" class={inputClass} />
						</label>
						<label class="block space-y-1.5 text-sm font-medium text-slate-300">
							Salary Max
							<input bind:value={formSalaryMax} type="number" min="0" class={inputClass} />
						</label>
						<label class="block space-y-1.5 text-sm font-medium text-slate-300">
							Currency
							<input bind:value={formSalaryCurrency} maxlength="10" class={inputClass} />
						</label>
					</div>

					<label class="flex items-center gap-2 text-sm text-slate-300">
						<input bind:checked={formSalaryConfidential} type="checkbox" class="h-4 w-4 rounded border-slate-600 bg-slate-950 text-indigo-500" />
						Gaji dirahasiakan
					</label>

					<div class="border-t border-slate-800 pt-4">
						<p class="text-[11px] font-bold uppercase tracking-wide text-slate-500">Requirements List</p>
					</div>

					<div class="grid gap-4 sm:grid-cols-3">
						<label class="block space-y-1.5 text-sm font-medium text-slate-300">
							Min. Pengalaman (tahun)
							<input bind:value={formMinExperience} type="number" min="0" class={inputClass} />
						</label>
						<label class="block space-y-1.5 text-sm font-medium text-slate-300 sm:col-span-2">
							Pendidikan
							<input bind:value={formEducation} maxlength="160" class={inputClass} />
						</label>
					</div>

					<label class="block space-y-1.5 text-sm font-medium text-slate-300">
						Skills (pisahkan dengan koma)
						<input bind:value={formSkills} maxlength="2000" class={inputClass} />
					</label>

					<div class="grid gap-4 sm:grid-cols-2">
						<label class="block space-y-1.5 text-sm font-medium text-slate-300">
							Application Type
							<select bind:value={formApplicationType} class={inputClass}>
								{#each applicationTypes as type}
									<option value={type}>{applicationTypeLabel[type]}</option>
								{/each}
							</select>
						</label>
						<label class="block space-y-1.5 text-sm font-medium text-slate-300">
							Tujuan Lamaran <span class="text-rose-400">*</span>
							<input bind:value={formApplicationDestination} maxlength="1000" class={inputClass} />
						</label>
					</div>

					<label class="block space-y-1.5 text-sm font-medium text-slate-300">
						Format Subjek Email
						<input bind:value={formSubjectFormat} maxlength="500" class={inputClass} />
					</label>

					<label class="block space-y-1.5 text-sm font-medium text-slate-300">
						Instruksi Lamaran
						<textarea bind:value={formApplicationInstructions} rows="2" maxlength="5000" class={inputClass}></textarea>
					</label>

					<label class="block space-y-1.5 text-sm font-medium text-slate-300">
						Ringkasan Pekerjaan
						<textarea bind:value={formDescription} rows="4" maxlength="10000" class={inputClass}></textarea>
					</label>

					<label class="block space-y-1.5 text-sm font-medium text-slate-300 sm:max-w-xs">
						Berlaku Sampai
						<input bind:value={formExpiresAt} type="date" class={inputClass} />
					</label>
				</div>

				<div class="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-5">
					<button
						type="button"
						onclick={() => void saveOnly()}
						disabled={isSaving || isPublishing || isDiscarding || isFindingNext}
						class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
					>
						{#if isSaving}<Spinner label="Menyimpan" />{:else}<Save size={15} />{/if}
						Save Changes
					</button>
					<button
						type="button"
						onclick={() => void approveAndPublish()}
						disabled={isSaving || isPublishing || isDiscarding || isFindingNext}
						class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
					>
						{#if isPublishing}<Spinner label="Menyetujui" />{:else}<Send size={15} />{/if}
						Approve
					</button>
					<button
						type="button"
						onclick={() => void rejectJob()}
						disabled={isSaving || isPublishing || isDiscarding || isFindingNext}
						class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-amber-500/30 px-4 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/10 disabled:opacity-60"
					>
						{#if isDiscarding}<Spinner label="Menolak" />{:else}<Ban size={15} />{/if}
						Reject
					</button>
					<button
						type="button"
						onclick={() => void discardJob()}
						disabled={isSaving || isPublishing || isDiscarding || isFindingNext}
						class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-500/30 px-4 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-60"
					>
						{#if isDiscarding}<Spinner label="Menghapus" />{:else}<Trash2 size={15} />{/if}
						Discard
					</button>
					<button
						type="button"
						onclick={() => void goToNext()}
						disabled={isSaving || isPublishing || isDiscarding || isFindingNext}
						class="ml-auto inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if isFindingNext}
							<Spinner label="Mencari lowongan berikutnya" />
						{:else}
							<ArrowRight size={15} />
						{/if}
						Next Job
					</button>
				</div>

				{#if job.status === 'PUBLISHED'}
					<p class="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-300">
						<CheckCircle2 size={14} /> Lowongan ini sudah dipublikasikan.
					</p>
				{/if}
			</section>
		</div>
	</div>

	{#if lightboxOpen && posterUrl}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			aria-label="Pratinjau poster lowongan"
			tabindex="-1"
		>
			<button
				type="button"
				class="absolute inset-0 h-full w-full cursor-zoom-out"
				aria-label="Tutup pratinjau"
				onclick={() => (lightboxOpen = false)}
			></button>
			<img
				src={posterUrl}
				alt="Poster lowongan {job.jobTitle}"
				class="relative z-10 max-h-[90vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
			/>
			<button
				type="button"
				onclick={() => (lightboxOpen = false)}
				class="absolute right-4 top-4 z-20 inline-flex size-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-200 transition hover:bg-slate-800"
				aria-label="Tutup pratinjau"
			>
				<X size={20} />
			</button>
			<p class="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-slate-950/80 px-3 py-1 text-[11px] text-slate-300 ring-1 ring-slate-700">
				Klik di luar gambar untuk menutup
			</p>
		</div>
	{/if}
{/if}
