<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowRight, Eye, RefreshCw, Rss, Search } from '@lucide/svelte';
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
		listJobs,
		type IngestedJob,
		type JobStatus
	} from '#lib/services/superadminApi.js';

	let jobs = $state<IngestedJob[]>([]);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let statusFilter = $state<JobStatus | 'ALL'>('ALL');
	let searchInput = $state('');
	let appliedSearch = $state('');

	const filtered = $derived(
		jobs.filter((job) => {
			if (statusFilter !== 'ALL' && job.status !== statusFilter) return false;
			const query = appliedSearch.toLowerCase();
			if (!query) return true;
			return (
				job.parsed.title.toLowerCase().includes(query) ||
				job.parsed.company.toLowerCase().includes(query) ||
				job.source.toLowerCase().includes(query)
			);
		})
	);

	const counts = $derived({
		total: jobs.length,
		raw: jobs.filter((job) => job.status === 'RAW_PARSED').length,
		published: jobs.filter((job) => job.status === 'PUBLISHED').length,
		rejected: jobs.filter((job) => job.status === 'REJECTED').length
	});

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			jobs = await listJobs();
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Feed lowongan belum dapat dimuat.';
		} finally {
			isLoading = false;
		}
	}

	function applySearch() {
		appliedSearch = searchInput.trim();
	}

	const filters: Array<{ value: JobStatus | 'ALL'; label: string }> = [
		{ value: 'ALL', label: 'Semua' },
		{ value: 'RAW_PARSED', label: 'Raw Parsed' },
		{ value: 'PUBLISHED', label: 'Published' },
		{ value: 'REJECTED', label: 'Rejected' }
	];

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>Live Job Ingestion | Superadmin</title>
</svelte:head>

<div class="space-y-6">
	<header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
		<div>
			<p class="text-sm font-semibold text-amber-300">Ingestion</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight text-white">Live Job Ingestion</h1>
			<p class="mt-2 text-sm text-slate-400">
				Feed lowongan hasil scrape Telegram & web, siap diaudit sebelum dipublikasikan.
			</p>
		</div>
		<a
			href="/superadmin/sources"
			class="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
		>
			Kelola sumber <ArrowRight size={16} />
		</a>
	</header>

	<section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Total feed</p>
			<p class="mt-1 text-2xl font-bold text-white">{counts.total}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Perlu audit</p>
			<p class="mt-1 text-2xl font-bold text-amber-300">{counts.raw}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Published</p>
			<p class="mt-1 text-2xl font-bold text-emerald-300">{counts.published}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Rejected</p>
			<p class="mt-1 text-2xl font-bold text-rose-300">{counts.rejected}</p>
		</div>
	</section>

	<div class="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex flex-wrap gap-1.5">
			{#each filters as filter}
				<button
					type="button"
					onclick={() => (statusFilter = filter.value)}
					class="rounded-lg px-3 py-1.5 text-xs font-semibold transition {statusFilter === filter.value
						? 'bg-indigo-500 text-white'
						: 'border border-slate-700 text-slate-300 hover:bg-slate-800'}"
				>
					{filter.label}
				</button>
			{/each}
		</div>
		<div class="flex items-center gap-2">
			<div class="relative">
				<Search size={15} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
				<input
					bind:value={searchInput}
					onkeydown={(event) => {
						if (event.key === 'Enter') applySearch();
					}}
					placeholder="Cari lowongan/perusahaan..."
					maxlength="160"
					class="w-56 rounded-lg border border-slate-700 bg-slate-950 py-2 pl-8 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
				/>
			</div>
			<button
				type="button"
				onclick={applySearch}
				class="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-indigo-500 px-3 text-xs font-semibold text-white transition hover:bg-indigo-400"
			>
				Cari
			</button>
		</div>
	</div>

	{#if isLoading}
		<div class="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
			<Spinner label="Memuat feed" /> Memuat feed lowongan...
		</div>
	{:else if loadError}
		<div class="mx-auto max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
			<p class="text-sm text-rose-300" role="alert">{loadError}</p>
			<button
				type="button"
				onclick={() => void load()}
				class="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
			>
				<RefreshCw size={15} /> Coba lagi
			</button>
		</div>
	{:else if filtered.length === 0}
		<div class="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center">
			<span class="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
				<Rss size={24} />
			</span>
			<h2 class="mt-4 text-lg font-semibold text-white">Tidak ada lowongan</h2>
			<p class="mt-1 text-sm text-slate-400">Tidak ada feed yang cocok dengan filter saat ini.</p>
		</div>
	{:else}
		<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-slate-800 text-sm">
					<thead class="bg-slate-900 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
						<tr>
							<th class="px-5 py-3">Lowongan</th>
							<th class="px-5 py-3">Sumber</th>
							<th class="px-5 py-3">Tipe Lamaran</th>
							<th class="px-5 py-3">Match</th>
							<th class="px-5 py-3">Status</th>
							<th class="px-5 py-3">Masuk</th>
							<th class="px-5 py-3 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-800/70">
						{#each filtered as job (job.id)}
							<tr class="hover:bg-slate-900">
								<td class="px-5 py-4">
									<p class="font-semibold text-white">{job.parsed.title}</p>
									<p class="text-xs text-slate-400">{job.parsed.company} · {job.parsed.location}</p>
								</td>
								<td class="px-5 py-4">
									<span class="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
										{sourceTypeLabel[job.sourceType]}
									</span>
									<p class="mt-1 text-[11px] text-slate-500">{job.source}</p>
								</td>
								<td class="px-5 py-4 text-xs text-slate-300">{applicationTypeLabel[job.parsed.applicationType]}</td>
								<td class="px-5 py-4">
									<span class="text-sm font-semibold text-white">{job.matchScore}%</span>
								</td>
								<td class="px-5 py-4">
									<span class="rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset {jobStatusTone[job.status]}">
										{jobStatusLabel[job.status]}
									</span>
								</td>
								<td class="px-5 py-4 text-xs text-slate-500">{formatDate(job.ingestedAt)}</td>
								<td class="px-5 py-4 text-right">
									<a
										href={`/superadmin/jobs/${job.id}`}
										class="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-200"
									>
										<Eye size={13} /> Audit
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
