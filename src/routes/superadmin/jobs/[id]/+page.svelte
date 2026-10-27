<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		ArrowLeft,
		Ban,
		CheckCircle2,
		Image as ImageIcon,
		Save,
		Send,
		X
	} from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/superadmin/Alert.svelte';
	import { formatDate, formatNumber, formatUsd } from '#lib/components/superadmin/format.js';
	import { getAssetUrl } from '#lib/utils/api.js';
	import {
		applicationTypeLabel,
		employmentTypeLabel,
		jobStatusLabel,
		jobStatusTone,
		sourceTypeLabel,
		workplaceTypeLabel
	} from '#lib/components/superadmin/status.js';
	import {
		getJobApi,
		updateJobApi,
		updateJobStatusApi,
		type ApplicationType,
		type EmploymentType,
		type JobRequirements,
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
	let formApplicationType = $state<ApplicationType>('EMAIL');
	let formApplicationDestination = $state('');
	let formApplicationInstructions = $state('');
	let formExpiresAt = $state('');
	let formConfidence = $state('');

	let isSaving = $state(false);
	let isPublishing = $state(false);
	let isDiscarding = $state(false);
	let lightboxOpen = $state(false);

	const workplaceTypes: WorkplaceType[] = ['REMOTE', 'WFO', 'HYBRID'];
	const employmentTypes: EmploymentType[] = ['FULL_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP'];
	const applicationTypes: ApplicationType[] = ['EMAIL', 'WEBSITE_PORTAL', 'WHATSAPP', 'TELEGRAM'];

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
		formApplicationType = data.applicationType;
		formApplicationDestination = data.applicationDestination;
		formApplicationInstructions = data.applicationInstructions ?? '';
		formExpiresAt = toDateInput(data.expiresAt);
		formConfidence = data.confidenceScore !== null ? String(data.confidenceScore) : '';
	}

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			const data = await getJobApi(jobId);
			detail = data;
			job = data.job;
			applyToForm(data.job);
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Lowongan belum dapat dimuat.';
		} finally {
			isLoading = false;
		}
	}

	function buildPayload(): UpdateScrapedJobInput {
		const requirements: JobRequirements = {
			minExperienceYears: formMinExperience.trim() ? Number(formMinExperience) : null,
			education: formEducation.trim() || null,
			skills: formSkills
				.split(',')
				.map((skill) => skill.trim())
				.filter(Boolean)
		};

		return {
			jobTitle: formJobTitle.trim(),
			companyName: formCompanyName.trim(),
			location: formLocation.trim(),
			workplaceType: formWorkplaceType,
			employmentType: formEmploymentType,
			salaryMin: formSalaryMin.trim() ? Number(formSalaryMin) : null,
			salaryMax: formSalaryMax.trim() ? Number(formSalaryMax) : null,
			salaryCurrency: formSalaryCurrency.trim() || null,
			isSalaryConfidential: formSalaryConfidential,
			requirements,
			jobDescriptionSummary: formDescription.trim(),
			applicationType: formApplicationType,
			applicationDestination: formApplicationDestination.trim(),
			applicationInstructions: formApplicationInstructions.trim() || null,
			expiresAt: formExpiresAt ? new Date(`${formExpiresAt}T23:59:59`).toISOString() : null,
			confidenceScore: formConfidence.trim() ? Number(formConfidence) : null
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
		isSaving = true;
		errorMessage = null;
		successMessage = null;
		try {
			const updated = await updateJobApi(jobId, payload);
			job = job ? { ...job, ...updated } : updated;
			successMessage = 'Perubahan data lowongan berhasil disimpan.';
			return true;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Perubahan gagal disimpan.';
			return false;
		} finally {
			isSaving = false;
		}
	}

	async function approveAndPublish() {
		if (isPublishing) return;
		const saved = await saveOnly();
		if (!saved) return;
		isPublishing = true;
		errorMessage = null;
		successMessage = null;
		try {
			await updateJobStatusApi(jobId, 'PUBLISHED');
			await goto('/superadmin/jobs');
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Publikasi gagal.';
		} finally {
			isPublishing = false;
		}
	}

	async function discard() {
		if (isDiscarding) return;
		if (typeof window !== 'undefined' && !window.confirm('Tolak dan buang lowongan ini?')) return;
		isDiscarding = true;
		errorMessage = null;
		successMessage = null;
		try {
			await updateJobStatusApi(jobId, 'REJECTED');
			await goto('/superadmin/jobs');
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Gagal membuang lowongan.';
			isDiscarding = false;
		}
	}

	onMount(() => {
		void load();
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
					<span>{sourceTypeLabel[job.sourceType]} · {job.sourceDetail}</span>
					<span>· Confidence {job.confidenceScore !== null ? `${Math.round(job.confidenceScore * 100)}%` : '—'}</span>
					<span>· Scraped {formatDate(job.scrapedAt)}</span>
				</div>
			</div>
		</header>

		{#if errorMessage}
			<Alert type="error" message={errorMessage} dismissible ondismiss={() => (errorMessage = null)} />
		{/if}
		{#if successMessage}
			<Alert type="success" message={successMessage} dismissible ondismiss={() => (successMessage = null)} />
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
						disabled={isSaving || isPublishing || isDiscarding}
						class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
					>
						{#if isSaving}<Spinner label="Menyimpan" />{:else}<Save size={15} />{/if}
						Save Changes
					</button>
					<button
						type="button"
						onclick={() => void approveAndPublish()}
						disabled={isSaving || isPublishing || isDiscarding}
						class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
					>
						{#if isPublishing}<Spinner label="Mempublikasikan" />{:else}<Send size={15} />{/if}
						Approve &amp; Publish
					</button>
					<button
						type="button"
						onclick={() => void discard()}
						disabled={isSaving || isPublishing || isDiscarding}
						class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-500/30 px-4 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-60"
					>
						{#if isDiscarding}<Spinner label="Membuang" />{:else}<Ban size={15} />{/if}
						Reject / Discard
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
