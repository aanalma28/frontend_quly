<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page as appPage } from '$app/state';
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
		listJobsApi,
		type IngestionSourceType,
		type JobStatus,
		type PaginationMeta,
		type ScrapedJob
	} from '#lib/services/superadminApi.js';

	const statuses: Array<JobStatus | 'ALL'> = [
		'ALL',
		'RAW_PARSED',
		'PENDING_REVIEW',
		'APPROVED',
		'SAVED',
		'PUBLISHED',
		'ARCHIVED',
		'REJECTED'
	];
	const sourceTypes: Array<IngestionSourceType | 'ALL'> = [
		'ALL',
		'TELEGRAM_CHANNEL',
		'CORPORATE_WEBSITE'
	];

	const initialStatus = appPage.url.searchParams.get('status');
	const initialSourceId = appPage.url.searchParams.get('sourceId') ?? '';
	const initialSourceName = appPage.url.searchParams.get('sourceName') ?? '';

	let items = $state<ScrapedJob[]>([]);
	let meta = $state<PaginationMeta | null>(null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	let statusFilter = $state<JobStatus | 'ALL'>(
		initialStatus && statuses.includes(initialStatus as JobStatus)
			? (initialStatus as JobStatus)
			: 'ALL'
	);
	let sourceTypeFilter = $state<IngestionSourceType | 'ALL'>('ALL');
	let sourceIdFilter = $state(initialSourceId);
	let sourceNameFilter = $state(initialSourceName);
	let searchInput = $state('');
	let appliedSearch = $state('');
	let page = $state(1);

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			const response = await listJobsApi({
				status: statusFilter === 'ALL' ? undefined : statusFilter,
				sourceType: sourceTypeFilter === 'ALL' ? undefined : sourceTypeFilter,
				sourceId: sourceIdFilter || undefined,
				page,
				limit: 20,
				search: appliedSearch || undefined
			});
			items = response.items;
			meta = response.meta;
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Feed lowongan belum dapat dimuat.';
		} finally {
			isLoading = false;
		}
	}

	function applySearch() {
		appliedSearch = searchInput.trim();
		page = 1;
		void load();
	}

	function changeStatus(value: JobStatus | 'ALL') {
		statusFilter = value;
		page = 1;
		void load();
	}

	function changeSourceType(value: string) {
		sourceTypeFilter = value as IngestionSourceType | 'ALL';
		page = 1;
		void load();
	}

	function clearSourceFilter() {
		const params = new URLSearchParams();
		if (statusFilter !== 'ALL') params.set('status', statusFilter);
		const query = params.toString();
		sourceIdFilter = '';
		sourceNameFilter = '';
		page = 1;
		void goto(`/superadmin/jobs${query ? `?${query}` : ''}`, { replaceState: true });
		void load();
	}

	function goToPage(next: number) {
		if (!meta) return;
		if (next < 1 || next > meta.totalPages) return;
		page = next;
		void load();
	}

	function confidenceLabel(value: number | null): string {
		return value === null ? '—' : `${Math.round(value * 100)}%`;
	}

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
			<p class="text-sm font-semibold text-amber-300">Telegram Scraper</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight text-white">Live Job Ingestion &amp; Audit</h1>
			<p class="mt-2 text-sm text-slate-400">
				Feed lowongan hasil scrape Telegram, siap direview dan diaudit sebelum dipublikasikan.
			</p>
		</div>
		<a
			href="/superadmin/sources"
			class="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
		>
			Kontrol Scraper <ArrowRight size={16} />
		</a>
	</header>

	{#if sourceIdFilter}
		<div
			class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3"
		>
			<p class="text-xs font-medium text-indigo-200">
				Filter grup:
				<span class="font-semibold text-white">{sourceNameFilter || sourceIdFilter}</span>
			</p>
			<button
				type="button"
				onclick={clearSourceFilter}
				class="rounded-lg border border-indigo-400/30 px-2.5 py-1.5 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-500/20"
			>
				Hapus filter grup
			</button>
		</div>
	{/if}

	<div class="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex flex-wrap gap-1.5">
				{#each statuses as status}
					<button
						type="button"
						onclick={() => changeStatus(status)}
						class="rounded-lg px-3 py-1.5 text-xs font-semibold transition {statusFilter === status
							? 'bg-indigo-500 text-white'
							: 'border border-slate-700 text-slate-300 hover:bg-slate-800'}"
					>
						{status === 'ALL' ? 'Semua' : jobStatusLabel[status]}
					</button>
				{/each}
			</div>
			<div class="flex items-center gap-2">
				<select
					value={sourceTypeFilter}
					onchange={(event) => changeSourceType(event.currentTarget.value)}
					class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
				>
					{#each sourceTypes as type}
						<option value={type}>
							{type === 'ALL' ? 'Semua sumber' : sourceTypeLabel[type]}
						</option>
					{/each}
				</select>
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
		{#if meta}
			<p class="text-[11px] text-slate-500">{meta.total} lowongan pada filter ini</p>
		{/if}
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
	{:else if items.length === 0}
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
							<th class="px-5 py-3">Source Channel</th>
							<th class="px-5 py-3">Tipe Lamaran</th>
							<th class="px-5 py-3">Confidence</th>
							<th class="px-5 py-3">Status</th>
							<th class="px-5 py-3">Waktu Masuk</th>
							<th class="px-5 py-3 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-800/70">
						{#each items as job (job.id)}
							<tr class="hover:bg-slate-900">
								<td class="px-5 py-4">
									<p class="font-semibold text-white">{job.jobTitle}</p>
									<p class="text-xs text-slate-400">{job.companyName} · {job.location}</p>
								</td>
								<td class="px-5 py-4">
									<span class="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
										{sourceTypeLabel[job.sourceType]}
									</span>
									<p class="mt-1 text-[11px] text-slate-500">
										{job.source?.name ?? job.sourceDetail}
									</p>
								</td>
								<td class="px-5 py-4 text-xs text-slate-300">{applicationTypeLabel[job.applicationType]}</td>
								<td class="px-5 py-4">
									<span class="text-sm font-semibold text-white">{confidenceLabel(job.confidenceScore)}</span>
								</td>
								<td class="px-5 py-4">
									<span class="rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset {jobStatusTone[job.status]}">
										{jobStatusLabel[job.status]}
									</span>
								</td>
								<td class="px-5 py-4 text-xs text-slate-500">{formatDate(job.scrapedAt)}</td>
								<td class="px-5 py-4 text-right">
									<a
										href={`/superadmin/jobs/${job.id}`}
										class="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-200"
									>
										<Eye size={13} /> Review &amp; Audit
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if meta}
				<div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-5 py-3">
					<p class="text-xs text-slate-500">
						Halaman {meta.page} dari {meta.totalPages} · {meta.total} lowongan
					</p>
					<div class="flex gap-2">
						<button
							type="button"
							onclick={() => goToPage(page - 1)}
							disabled={meta.page <= 1}
							class="inline-flex h-8 items-center justify-center rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
						>
							Sebelumnya
						</button>
						<button
							type="button"
							onclick={() => goToPage(page + 1)}
							disabled={meta.page >= meta.totalPages}
							class="inline-flex h-8 items-center justify-center rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
						>
							Selanjutnya
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
