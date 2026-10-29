<script lang="ts">
	import { onMount } from 'svelte';
	import { Activity, ListChecks, Play, RefreshCw, Square } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/superadmin/Alert.svelte';
	import Modal from '#lib/components/superadmin/Modal.svelte';
	import { formatDate, formatNumber } from '#lib/components/superadmin/format.js';
	import {
		ingestionPaginationLabel,
		sourceTypeLabel
	} from '#lib/components/superadmin/status.js';
	import {
		listScraperRunsApi,
		startScraperRunApi,
		stopAllScraperRunsApi,
		stopScraperRunApi,
		type ScraperRun
	} from '#lib/services/superadminApi.js';

	let runs = $state<ScraperRun[]>([]);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);
	let isStarting = $state(false);
	let isStoppingAll = $state(false);
	let stoppingRunId = $state<string | null>(null);
	let selectedRunId = $state<string | null>(null);
	let pollTimer: ReturnType<typeof setTimeout> | null = null;

	const selectedRun = $derived(
		selectedRunId ? (runs.find((run) => run.runId === selectedRunId) ?? null) : null
	);
	const runningCount = $derived(runs.filter((run) => run.status === 'RUNNING').length);
	const stoppingCount = $derived(runs.filter((run) => run.status === 'STOPPING').length);
	const totalIngested = $derived(
		runs.reduce((sum, run) => sum + (run.totals?.ingested ?? 0), 0)
	);
	const totalDuplicates = $derived(
		runs.reduce((sum, run) => sum + (run.totals?.duplicates ?? 0), 0)
	);

	function prettyStatus(status: string): string {
		return status.charAt(0) + status.slice(1).toLowerCase();
	}

	function statusTone(status: string): string {
		switch (status) {
			case 'COMPLETED':
				return 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30';
			case 'PARTIAL':
				return 'bg-amber-500/10 text-amber-300 ring-amber-500/30';
			case 'FAILED':
				return 'bg-rose-500/10 text-rose-300 ring-rose-500/30';
			case 'RUNNING':
				return 'bg-sky-500/10 text-sky-300 ring-sky-500/30';
			case 'STOPPING':
				return 'bg-amber-500/10 text-amber-300 ring-amber-500/30';
			case 'CANCELLED':
				return 'bg-slate-800 text-slate-400 ring-slate-700';
			default:
				return 'bg-slate-800 text-slate-400 ring-slate-700';
		}
	}

	function runSourceLabel(run: ScraperRun): string {
		if (!run.requestedSourceId) return 'Semua sumber web';
		const source = run.sources?.find((item) => item.sourceId === run.requestedSourceId);
		return source?.name ?? `Source ${run.requestedSourceId.slice(0, 8)}…`;
	}

	function runSourceMaxPages(run: ScraperRun): number | null {
		if (!run.requestedSourceId) return null;
		const source =
			run.sources?.find((item) => item.sourceId === run.requestedSourceId) ?? run.sources?.[0];
		return source?.maxPages ?? null;
	}

	function runMaxPagesLabel(run: ScraperRun): string {
		if (!run.requestedSourceId) return 'maks per source';
		return `maks ${runSourceMaxPages(run) ?? run.maxPages} halaman`;
	}

	function selectedRunMaxPagesLabel(run: ScraperRun): string {
		if (!run.requestedSourceId) return 'Sesuai source';
		return `${runSourceMaxPages(run) ?? run.maxPages} halaman`;
	}

	function displaySourceStatus(run: ScraperRun, sourceStatus: string): string {
		// A stop can interrupt a network request; the run is CANCELLED even if the
		// source result was marked FAILED by the timeout. Keep the run-level truth
		// visible while the error detail remains available in the Error column.
		if (run.status === 'CANCELLED' && sourceStatus === 'FAILED') return 'CANCELLED';
		return sourceStatus;
	}

	async function load(silent = false) {
		if (!silent) isLoading = true;
		try {
			runs = await listScraperRunsApi();
			loadError = null;
		} catch (error) {
			if (!silent) {
				loadError =
					error instanceof Error ? error.message : 'Riwayat run belum dapat dimuat.';
			}
		} finally {
			if (!silent) isLoading = false;
			schedulePoll();
		}
	}

	function schedulePoll() {
		if (pollTimer) {
			clearTimeout(pollTimer);
			pollTimer = null;
		}
		if (
			runs.some((run) => run.status === 'RUNNING' || run.status === 'STOPPING')
		) {
			pollTimer = setTimeout(() => {
				void load(true);
			}, 2500);
		}
	}

	async function startAll() {
		if (isStarting) return;
		if (
			typeof window !== 'undefined' &&
			!window.confirm(
				'Jalankan scraper untuk semua sumber web aktif? Setiap source memakai batas maxPages-nya.'
			)
		) {
			return;
		}
		isStarting = true;
		errorMessage = null;
		successMessage = null;
		try {
			const run = await startScraperRunApi({});
			successMessage = `Run ${run.runId.slice(0, 8)}… dimulai. Memantau progres...`;
			await load();
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Run scraper gagal dimulai.';
		} finally {
			isStarting = false;
		}
	}

	async function stopRun(run: ScraperRun) {
		if (stoppingRunId || run.status !== 'RUNNING') return;
		if (
			typeof window !== 'undefined' &&
			!window.confirm(
				`Hentikan run ${run.runId.slice(0, 8)}…? Item/halaman yang sedang diproses akan diselesaikan dulu.`
			)
		) {
			return;
		}
		stoppingRunId = run.runId;
		errorMessage = null;
		successMessage = null;
		try {
			const updated = await stopScraperRunApi(run.runId);
			runs = runs.map((item) => (item.runId === updated.runId ? updated : item));
			successMessage =
				updated.status === 'STOPPING'
					? `Permintaan stop untuk run ${run.runId.slice(0, 8)}… diterima. Menunggu item aktif selesai.`
					: `Run ${run.runId.slice(0, 8)}… sudah ${prettyStatus(updated.status).toLowerCase()}.`;
			schedulePoll();
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Run gagal dihentikan.';
		} finally {
			stoppingRunId = null;
		}
	}

	async function stopAll() {
		if (isStoppingAll || runningCount === 0) return;
		if (
			typeof window !== 'undefined' &&
			!window.confirm(
				`Hentikan ${runningCount} run yang sedang berjalan? Item/halaman aktif akan diselesaikan dulu.`
			)
		) {
			return;
		}
		isStoppingAll = true;
		errorMessage = null;
		successMessage = null;
		try {
			const result = await stopAllScraperRunsApi();
			successMessage =
				result.stopped > 0
					? `${result.stopped} run diminta berhenti. Menunggu item aktif selesai.`
					: 'Tidak ada run yang sedang berjalan.';
			await load();
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Run gagal dihentikan.';
		} finally {
			isStoppingAll = false;
		}
	}

	onMount(() => {
		void load();
		return () => {
			if (pollTimer) clearTimeout(pollTimer);
		};
	});
</script>

<svelte:head>
	<title>Scraper Runs | Superadmin</title>
</svelte:head>

<div class="space-y-6">
	<header class="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
		<div>
			<p class="text-sm font-semibold text-amber-300">Scraper</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight text-white">Scraper Runs</h1>
			<p class="mt-2 text-sm text-slate-400">
				Riwayat run dynamic web scraper dan progres ingest per sumber.
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<a
				href="/superadmin/sources"
				class="inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
			>
				Kelola sumber
			</a>
			<button
				type="button"
				onclick={() => void load()}
				disabled={isLoading}
				class="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
			>
				<RefreshCw size={15} /> Refresh
			</button>
			<button
				type="button"
				onclick={() => void startAll()}
				disabled={isStarting}
				class="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
			>
				{#if isStarting}<Spinner label="Memulai run" />{:else}<Play size={15} />{/if}
				Run Semua Sumber Web
			</button>
			<button
				type="button"
				onclick={() => void stopAll()}
				disabled={isStoppingAll || runningCount === 0}
				title={runningCount === 0 ? 'Tidak ada run yang sedang berjalan' : 'Hentikan semua run aktif'}
				class="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-rose-500 px-4 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-40"
			>
				{#if isStoppingAll}<Spinner label="Menghentikan run" />{:else}<Square size={14} />{/if}
				Stop Semua
				{#if runningCount > 0}
					<span class="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-bold">
						{runningCount}
					</span>
				{/if}
			</button>
		</div>
	</header>

	{#if errorMessage}
		<Alert type="error" message={errorMessage} dismissible ondismiss={() => (errorMessage = null)} />
	{/if}
	{#if successMessage}
		<Alert
			type="success"
			message={successMessage}
			dismissible
			ondismiss={() => (successMessage = null)}
		/>
	{/if}

	<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs leading-5 text-slate-400">
		<p>
			Riwayat run bersifat <span class="font-semibold text-slate-300">in-memory</span> dan akan
			hilang saat backend restart; data job tetap tersimpan. Run untuk satu sumber bisa dimulai dari
			halaman
			<a href="/superadmin/sources" class="font-semibold text-indigo-300 hover:text-indigo-200">
				Ingestion Sources
			</a>. Batas halaman mengikuti <span class="font-semibold text-slate-300">maxPages</span>
			tiap source (default 10).
		</p>
		<p class="mt-1">
			Stop bersifat <span class="font-semibold text-slate-300">cooperative</span>: item/halaman yang
			sedang diproses diselesaikan dulu. Status berubah ke
			<span class="font-semibold text-amber-300">STOPPING</span> lalu
			<span class="font-semibold text-slate-300">CANCELLED</span>.
		</p>
	</div>

	<section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Total Run</p>
			<p class="mt-1 text-2xl font-bold text-white">{formatNumber(runs.length)}</p>
			<p class="mt-1 text-[11px] text-slate-500">Maksimal 20 run terakhir</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Running</p>
			<p class="mt-1 text-2xl font-bold text-sky-300">{formatNumber(runningCount)}</p>
			<p class="mt-1 text-[11px] text-slate-500">
				{stoppingCount > 0 ? `${stoppingCount} sedang stopping` : 'Run yang masih diproses'}
			</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Total Ingested</p>
			<p class="mt-1 text-2xl font-bold text-emerald-300">{formatNumber(totalIngested)}</p>
			<p class="mt-1 text-[11px] text-slate-500">Dari run yang dimuat</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Total Duplikat</p>
			<p class="mt-1 text-2xl font-bold text-amber-300">{formatNumber(totalDuplicates)}</p>
			<p class="mt-1 text-[11px] text-slate-500">Deduplikasi sebelum OpenAI</p>
		</div>
	</section>

	<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
		<div
			class="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
		>
			<div>
				<h2 class="text-sm font-semibold text-white">Riwayat Run</h2>
				<p class="mt-1 text-xs text-slate-500">
					{runs.length} run terakhir · klik Detail untuk melihat counter per sumber.
				</p>
			</div>
			<span
				class="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-2.5 py-1 text-[10px] font-semibold text-sky-300 ring-1 ring-inset ring-sky-500/20"
			>
				<Activity size={12} /> {runningCount} running{#if stoppingCount > 0}
					· {stoppingCount} stopping{/if}
			</span>
		</div>

		{#if isLoading}
			<div class="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
				<Spinner label="Memuat riwayat run" /> Memuat riwayat run...
			</div>
		{:else if loadError}
			<div class="mx-auto max-w-lg p-8 text-center">
				<p class="text-sm text-rose-300" role="alert">{loadError}</p>
				<button
					type="button"
					onclick={() => void load()}
					class="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
				>
					<RefreshCw size={15} /> Coba lagi
				</button>
			</div>
		{:else if runs.length === 0}
			<div class="p-12 text-center">
				<span
					class="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300"
				>
					<ListChecks size={24} />
				</span>
				<h3 class="mt-4 text-lg font-semibold text-white">Belum ada run scraper</h3>
				<p class="mt-1 text-sm text-slate-400">
					Jalankan scraper dari halaman sumber atau mulai run semua sumber web.
				</p>
				<button
					type="button"
					onclick={() => void startAll()}
					disabled={isStarting}
					class="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
				>
					{#if isStarting}<Spinner label="Memulai run" />{:else}<Play size={15} />{/if}
					Run Semua Sumber Web
				</button>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-[1100px] divide-y divide-slate-800 text-sm">
					<thead class="bg-slate-900 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
						<tr>
							<th class="px-5 py-3">Run</th>
							<th class="px-5 py-3">Status</th>
							<th class="px-5 py-3">Sumber</th>
							<th class="px-5 py-3">Progress</th>
							<th class="px-5 py-3">Waktu</th>
							<th class="px-5 py-3 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-800/70">
						{#each runs as run (run.runId)}
							<tr class="hover:bg-slate-900">
								<td class="px-5 py-4">
									<p class="font-mono text-xs text-slate-300" title={run.runId}>
										{run.runId.slice(0, 8)}…
									</p>
									<p class="mt-0.5 text-[10px] text-slate-500">
										{runMaxPagesLabel(run)}
									</p>
								</td>
								<td class="px-5 py-4">
									<span
										class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset {statusTone(
											run.status
										)}"
									>
										{#if run.status === 'RUNNING'}
											<span class="size-1.5 animate-pulse rounded-full bg-sky-400"></span>
										{:else if run.status === 'STOPPING'}
											<span class="size-1.5 animate-pulse rounded-full bg-amber-400"></span>
										{/if}
										{prettyStatus(run.status)}
									</span>
								</td>
								<td class="px-5 py-4">
									<p class="max-w-[220px] truncate text-slate-200" title={runSourceLabel(run)}>
										{runSourceLabel(run)}
									</p>
								</td>
								<td class="px-5 py-4">
									<p class="text-[11px] text-slate-400">
										{formatNumber(run.totals.sources)} sumber ·
										{formatNumber(run.totals.pagesFetched)} halaman ·
										{formatNumber(run.totals.itemsFound)} item
									</p>
									<p class="mt-0.5 text-[10px] text-slate-500">
										{formatNumber(run.totals.duplicates)} duplikat ·
										{formatNumber(run.totals.ingested)} ingested ·
										{formatNumber(run.totals.failed)} gagal
									</p>
								</td>
								<td class="px-5 py-4 text-xs text-slate-400">
									<p>{formatDate(run.startedAt)}</p>
									<p class="mt-0.5 text-[10px] text-slate-500">
										{run.finishedAt ? formatDate(run.finishedAt) : 'Belum selesai'}
									</p>
								</td>
								<td class="px-5 py-4">
									<div class="flex items-center justify-end gap-1.5">
										{#if run.status === 'RUNNING'}
											<button
												type="button"
												onclick={() => void stopRun(run)}
												disabled={stoppingRunId === run.runId}
												title="Hentikan run ini"
												class="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
											>
												{#if stoppingRunId === run.runId}
													<Spinner label="Menghentikan run" />
												{:else}
													<Square size={12} />
												{/if}
												Stop
											</button>
										{:else if run.status === 'STOPPING'}
											<span
												class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-500/30 px-2.5 py-1.5 text-xs font-semibold text-amber-300"
											>
												<span class="size-1.5 animate-pulse rounded-full bg-amber-400"></span>
												Stopping
											</span>
										{/if}
										<button
											type="button"
											onclick={() => (selectedRunId = run.runId)}
											class="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-200"
										>
											Detail
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<Modal
	open={selectedRun !== null}
	title="Detail Scraper Run"
	description={selectedRun?.runId ?? ''}
	size="lg"
	onclose={() => (selectedRunId = null)}
>
	{#if selectedRun}
		<div class="space-y-4">
			<div class="grid gap-3 sm:grid-cols-3">
				<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
					<p class="text-[10px] uppercase tracking-wide text-slate-500">Status</p>
					<span
						class="mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset {statusTone(
							selectedRun.status
						)}"
					>
						{prettyStatus(selectedRun.status)}
					</span>
				</div>
				<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
					<p class="text-[10px] uppercase tracking-wide text-slate-500">Sumber</p>
					<p class="mt-1 truncate text-sm font-semibold text-white" title={runSourceLabel(selectedRun)}>
						{runSourceLabel(selectedRun)}
					</p>
				</div>
				<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
					<p class="text-[10px] uppercase tracking-wide text-slate-500">Max halaman</p>
					<p class="mt-1 text-sm font-semibold text-white">
						{selectedRunMaxPagesLabel(selectedRun)}
					</p>
				</div>
			</div>

			<div class="grid gap-3 sm:grid-cols-3">
				<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
					<p class="text-[10px] uppercase tracking-wide text-slate-500">Mulai</p>
					<p class="mt-1 text-xs text-slate-300">{formatDate(selectedRun.startedAt)}</p>
				</div>
				<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
					<p class="text-[10px] uppercase tracking-wide text-slate-500">Selesai</p>
					<p class="mt-1 text-xs text-slate-300">
						{selectedRun.finishedAt ? formatDate(selectedRun.finishedAt) : 'Belum selesai'}
					</p>
				</div>
				<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
					<p class="text-[10px] uppercase tracking-wide text-slate-500">Total</p>
					<p class="mt-1 text-xs text-slate-300">
						{formatNumber(selectedRun.totals.ingested)} ingested ·
						{formatNumber(selectedRun.totals.duplicates)} duplikat ·
						{formatNumber(selectedRun.totals.failed)} gagal
					</p>
				</div>
			</div>

			{#if selectedRun.sources.length === 0}
				<p class="rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-xs text-slate-400">
					{selectedRun.status === 'RUNNING'
						? 'Run masih berjalan; detail per sumber akan muncul setelah selesai.'
						: 'Tidak ada sumber web aktif yang dijalankan pada run ini.'}
				</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-slate-800 text-xs">
						<thead class="text-left text-[10px] uppercase tracking-wide text-slate-500">
							<tr>
								<th class="pb-2 pr-3 font-semibold">Sumber</th>
								<th class="pb-2 pr-3 font-semibold">Tipe</th>
								<th class="pb-2 pr-3 font-semibold">Pagination</th>
								<th class="pb-2 pr-3 font-semibold">Max</th>
								<th class="pb-2 pr-3 font-semibold">Status</th>
								<th class="pb-2 pr-3 font-semibold">Pages</th>
								<th class="pb-2 pr-3 font-semibold">Items</th>
								<th class="pb-2 pr-3 font-semibold">Duplikat</th>
								<th class="pb-2 pr-3 font-semibold">Ingested</th>
								<th class="pb-2 pr-3 font-semibold">Gagal</th>
								<th class="pb-2 font-semibold">Error</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-800/70">
							{#each selectedRun.sources as source (source.sourceId)}
								<tr>
									<td class="py-2 pr-3 font-medium text-slate-200">{source.name}</td>
									<td class="py-2 pr-3 text-slate-400">{sourceTypeLabel[source.type]}</td>
									<td class="py-2 pr-3 text-slate-400">
										{ingestionPaginationLabel[source.paginationType]}
									</td>
									<td class="py-2 pr-3 text-slate-300">
										{source.maxPages ?? selectedRun.maxPages}
									</td>
									<td class="py-2 pr-3">
										<span
											class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset {statusTone(
												displaySourceStatus(selectedRun, source.status)
											)}"
										>
											{prettyStatus(displaySourceStatus(selectedRun, source.status))}
										</span>
									</td>
									<td class="py-2 pr-3 text-slate-300">{source.pagesFetched}</td>
									<td class="py-2 pr-3 text-slate-300">{source.itemsFound}</td>
									<td class="py-2 pr-3 text-slate-300">{source.duplicates}</td>
									<td class="py-2 pr-3 text-slate-300">{source.ingested}</td>
									<td class="py-2 pr-3 text-slate-300">{source.failed}</td>
									<td class="py-2 text-slate-400">
										{#if source.error}
											<p class="max-w-[220px] truncate text-rose-300" title={source.error}>
												{source.error}
											</p>
										{:else}
											—
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}

	{#snippet footer()}
		{#if selectedRun?.status === 'RUNNING'}
			<button
				type="button"
				onclick={() => selectedRun && void stopRun(selectedRun)}
				disabled={stoppingRunId === selectedRun.runId}
				class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{#if stoppingRunId === selectedRun.runId}
					<Spinner label="Menghentikan run" />
				{:else}
					<Square size={14} />
				{/if}
				Stop Run
			</button>
		{/if}
		<button
			type="button"
			onclick={() => (selectedRunId = null)}
			class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
		>
			Tutup
		</button>
	{/snippet}
</Modal>
