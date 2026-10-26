<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		ArrowLeft,
		Ban,
		CheckCircle2,
		Image as ImageIcon,
		Save,
		Send
	} from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/superadmin/Alert.svelte';
	import { formatDate } from '#lib/components/superadmin/format.js';
	import {
		applicationTypeLabel,
		jobStatusLabel,
		jobStatusTone,
		sourceTypeLabel
	} from '#lib/components/superadmin/status.js';
	import {
		getJob,
		publishJob,
		rejectJob,
		updateJob,
		type ApplicationType,
		type IngestedJob,
		type ParsedJob
	} from '#lib/services/superadminApi.js';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const jobId = $derived(params.id);

	let job = $state<IngestedJob | null>(null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	let formTitle = $state('');
	let formCompany = $state('');
	let formLocation = $state('');
	let formSalary = $state('');
	let formSkills = $state('');
	let formApplicationType = $state<ApplicationType>('EMAIL');
	let formDestination = $state('');
	let formDescription = $state('');

	let isSaving = $state(false);
	let isPublishing = $state(false);
	let isDiscarding = $state(false);

	const applicationTypes: ApplicationType[] = ['EMAIL', 'WEBSITE_PORTAL'];
	const inputClass =
		'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30';

	function applyToForm(parsed: ParsedJob) {
		formTitle = parsed.title;
		formCompany = parsed.company;
		formLocation = parsed.location;
		formSalary = parsed.salaryRange;
		formSkills = parsed.skills.join(', ');
		formApplicationType = parsed.applicationType;
		formDestination = parsed.applicationDestination;
		formDescription = parsed.description;
	}

	function buildParsed(): ParsedJob {
		return {
			title: formTitle.trim(),
			company: formCompany.trim(),
			location: formLocation.trim(),
			salaryRange: formSalary.trim(),
			skills: formSkills
				.split(',')
				.map((skill) => skill.trim())
				.filter(Boolean),
			applicationType: formApplicationType,
			applicationDestination: formDestination.trim(),
			description: formDescription.trim()
		};
	}

	function validate(parsed: ParsedJob): string | null {
		if (!parsed.title) return 'Job title wajib diisi.';
		if (!parsed.company) return 'Company wajib diisi.';
		if (!parsed.applicationDestination) return 'Tujuan lamaran wajib diisi.';
		return null;
	}

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			const data = await getJob(jobId);
			job = data;
			applyToForm(data.parsed);
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Lowongan belum dapat dimuat.';
		} finally {
			isLoading = false;
		}
	}

	async function saveOnly(): Promise<boolean> {
		const parsed = buildParsed();
		const problem = validate(parsed);
		if (problem) {
			errorMessage = problem;
			return false;
		}
		isSaving = true;
		errorMessage = null;
		successMessage = null;
		try {
			const updated = await updateJob(jobId, parsed);
			job = updated;
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
			const updated = await publishJob(jobId);
			job = updated;
			successMessage = 'Lowongan berhasil dipublikasikan.';
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
			await rejectJob(jobId);
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
{:else if job}
	<div class="space-y-6">
		<header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
			<div>
				<a
					href="/superadmin/jobs"
					class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-white"
				>
					<ArrowLeft size={15} /> Live Job Ingestion
				</a>
				<h1 class="mt-2 text-2xl font-bold tracking-tight text-white">{job.parsed.title}</h1>
				<div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
					<span class="rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset {jobStatusTone[job.status]}">
						{jobStatusLabel[job.status]}
					</span>
					<span>{sourceTypeLabel[job.sourceType]} · {job.source}</span>
					<span>· Match {job.matchScore}%</span>
					<span>· Masuk {formatDate(job.ingestedAt)}</span>
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
					{#if job.posterUrl}
						<div class="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
							<img src={job.posterUrl} alt="Poster lowongan {job.parsed.title}" class="mx-auto max-h-[520px] w-auto object-contain" />
						</div>
					{:else}
						<div class="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
							<p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Teks mentah</p>
							<pre class="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-300">{job.rawText}</pre>
						</div>
					{/if}
				</div>

				{#if job.posterUrl}
					<details class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
						<summary class="cursor-pointer text-sm font-semibold text-white">Lihat teks mentah</summary>
						<pre class="mt-3 whitespace-pre-wrap text-xs leading-6 text-slate-300">{job.rawText}</pre>
					</details>
				{/if}
			</section>

			<section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
				<h2 class="text-sm font-semibold text-white">Hasil Parsing JSON (GPT-4o)</h2>
				<p class="mt-1 text-xs text-slate-500">Tinjau dan koreksi data sebelum dipublikasikan.</p>

				<div class="mt-4 space-y-4">
					<div class="grid gap-4 sm:grid-cols-2">
						<label class="block space-y-1.5 text-sm font-medium text-slate-300">
							Job Title <span class="text-rose-400">*</span>
							<input bind:value={formTitle} maxlength="200" class={inputClass} />
						</label>
						<label class="block space-y-1.5 text-sm font-medium text-slate-300">
							Company <span class="text-rose-400">*</span>
							<input bind:value={formCompany} maxlength="200" class={inputClass} />
						</label>
						<label class="block space-y-1.5 text-sm font-medium text-slate-300">
							Location
							<input bind:value={formLocation} maxlength="200" class={inputClass} />
						</label>
						<label class="block space-y-1.5 text-sm font-medium text-slate-300">
							Salary Range
							<input bind:value={formSalary} maxlength="200" class={inputClass} />
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
							{formApplicationType === 'EMAIL' ? 'Email Tujuan' : 'URL Lamaran'} <span class="text-rose-400">*</span>
							<input bind:value={formDestination} maxlength="2048" class={inputClass} />
						</label>
					</div>

					<label class="block space-y-1.5 text-sm font-medium text-slate-300">
						Description
						<textarea bind:value={formDescription} rows="4" maxlength="5000" class={inputClass}></textarea>
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
						Edit Data
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
						Discard
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
{/if}
