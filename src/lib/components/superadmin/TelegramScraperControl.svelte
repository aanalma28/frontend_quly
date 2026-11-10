<script lang="ts">
	import { onMount } from 'svelte';
	import {
		ArrowRight,
		CalendarClock,
		CheckCircle2,
		History,
		ListChecks,
		Play,
		Power,
		RefreshCw,
		Square,
		TriangleAlert
	} from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import { formatDate, formatNumber } from './format.js';
	import {
		getTelegramStatusApi,
		runTelegramScraperApi,
		stopTelegramScraperRunApi,
		toggleTelegramScraperApi,
		type IngestionSource,
		type TelegramScrapeMode,
		type TelegramScrapeRunStatus,
		type TelegramScraperStatus
	} from '#lib/services/superadminApi.js';

	interface Props {
		/** Called after the listener state changes so the parent can refresh data. */
		onchanged?: () => void;
		/** Full source list from the parent; the component filters active Telegram sources. */
		sources?: IngestionSource[];
	}

	let { onchanged, sources = [] }: Props = $props();

	let status = $state<TelegramScraperStatus | null>(null);
	let isLoading = $state(true);
	let isToggling = $state(false);
	let error = $state<string | null>(null);
	let pollTimer: ReturnType<typeof setTimeout> | null = null;
	let disposed = false;

	let selectedMode = $state<TelegramScrapeMode>('CURSOR');
	let selectedSourceIds = $state<string[]>([]);
	let maxMessagesInput = $state('1000');
	let isStartingRun = $state(false);
	let isStoppingRun = $state(false);
	let runError = $state<string | null>(null);
	let previousRunStatus = 'IDLE';

	const isRunning = $derived(Boolean(status?.enabled && status?.connected));
	const isEnabled = $derived(Boolean(status?.enabled));
	const configReady = $derived(
		Boolean(status?.apiConfigured && status?.sessionConfigured)
	);
	const statusLabel = $derived(
		isRunning ? 'Running' : isEnabled ? 'Connecting' : 'Stopped'
	);
	const statusTone = $derived(
		isRunning
			? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
			: isEnabled
				? 'bg-amber-500/10 text-amber-300 ring-amber-500/30'
				: 'bg-slate-800 text-slate-400 ring-slate-700'
	);

	const telegramSources = $derived(
		sources
			.filter((source) => source.type === 'TELEGRAM' && source.isActive)
			.slice()
			.sort((left, right) => left.name.localeCompare(right.name))
	);
	const scrapeRun = $derived(status?.scrapeRun ?? null);
	const isScrapeRunning = $derived(scrapeRun?.status === 'RUNNING');
	const isScrapeStopping = $derived(scrapeRun?.status === 'STOPPING');
	const isScrapeActive = $derived(isScrapeRunning || isScrapeStopping);
	const activeRunMode = $derived(scrapeRun?.mode ?? selectedMode);
	const canStopScraper = $derived(
		!isLoading &&
			!isToggling &&
			!isScrapeActive &&
			!isStartingRun &&
			!isStoppingRun &&
			isEnabled &&
			!status?.isDisconnecting
	);
	const canStopRun = $derived(
		isScrapeRunning && !isStoppingRun && !isScrapeStopping
	);
	const maxMessages = $derived.by(() => {
		const raw = String(maxMessagesInput ?? '').trim();
		if (!raw) return 1000;
		const parsed = Number(raw);
		if (!Number.isFinite(parsed)) return 1000;
		return Math.min(5000, Math.max(1, Math.trunc(parsed)));
	});
	const runProgress = $derived.by(() => {
		if (!scrapeRun || scrapeRun.totalSources <= 0) return 0;
		return Math.min(
			100,
			Math.max(0, Math.round((scrapeRun.processedSources / scrapeRun.totalSources) * 100))
		);
	});
	const canStartRun = $derived(
		Boolean(configReady) &&
			telegramSources.length > 0 &&
			!isLoading &&
			!isEnabled &&
			!isToggling &&
			!isScrapeActive &&
			!isStartingRun &&
			!isStoppingRun &&
			!status?.isConnecting &&
			!status?.isDisconnecting
	);
	const scrapeButtonDisabled = $derived(isScrapeActive ? !canStopRun : !canStartRun);
	const scrapeButtonLabel = $derived(
		isScrapeStopping || isStoppingRun
			? 'Menghentikan...'
			: isScrapeRunning
				? `Stop Scrape ${activeRunMode}`
				: `Mulai Scrape ${selectedMode}`
	);
	const modeNote = $derived(
		selectedMode === 'CURSOR'
			? 'Melanjutkan dari pesan terakhir yang sudah diproses. Gunakan untuk catch-up pesan baru.'
			: 'Mengambil seluruh pesan Telegram sejak 00:00 hari ini. Gunakan untuk scraping massal harian. Pesan yang sudah pernah masuk tidak diduplikasi.'
	);

	$effect(() => {
		const available = new Set(telegramSources.map((source) => source.id));
		if (selectedSourceIds.some((id) => !available.has(id))) {
			selectedSourceIds = selectedSourceIds.filter((id) => available.has(id));
		}
	});

	function runStatusLabel(value: TelegramScrapeRunStatus['status']): string {
		if (value === 'RUNNING') return 'Berjalan';
		if (value === 'STOPPING') return 'Menghentikan';
		if (value === 'COMPLETED') return 'Selesai';
		if (value === 'CANCELLED') return 'Dibatalkan';
		if (value === 'FAILED') return 'Gagal';
		return 'Belum ada run';
	}

	function runStatusTone(value: TelegramScrapeRunStatus['status']): string {
		if (value === 'RUNNING') return 'bg-sky-500/10 text-sky-300 ring-sky-500/30';
		if (value === 'STOPPING') return 'bg-amber-500/10 text-amber-300 ring-amber-500/30';
		if (value === 'COMPLETED') return 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30';
		if (value === 'CANCELLED') return 'bg-slate-800 text-slate-300 ring-slate-700';
		if (value === 'FAILED') return 'bg-rose-500/10 text-rose-300 ring-rose-500/30';
		return 'bg-slate-800 text-slate-400 ring-slate-700';
	}

	function toggleSource(sourceId: string, checked: boolean) {
		selectedSourceIds = checked
			? [...new Set([...selectedSourceIds, sourceId])]
			: selectedSourceIds.filter((id) => id !== sourceId);
	}

	function selectAllSources() {
		selectedSourceIds = telegramSources.map((source) => source.id);
	}

	function clearSourceSelection() {
		selectedSourceIds = [];
	}

	async function startScrapeRun(mode: TelegramScrapeMode) {
		if (!canStartRun) return;
		selectedMode = mode;
		isStartingRun = true;
		runError = null;
		try {
			status = await runTelegramScraperApi({
				mode,
				sourceIds: selectedSourceIds,
				maxMessagesPerSource: maxMessages
			});
			scheduleStatusPoll();
			onchanged?.();
		} catch (startError) {
			runError =
				startError instanceof Error
					? startError.message
					: 'Scraping Telegram belum dapat dijalankan.';
		} finally {
			isStartingRun = false;
		}
	}

	async function stopScraper() {
		if (!canStopScraper) return;
		await toggle('STOP');
	}

	async function stopScrapeRun() {
		if (!canStopRun) return;
		isStoppingRun = true;
		runError = null;
		try {
			status = await stopTelegramScraperRunApi();
			scheduleStatusPoll();
			onchanged?.();
		} catch (stopError) {
			runError =
				stopError instanceof Error
					? stopError.message
					: 'Scrape Telegram belum dapat dihentikan.';
		} finally {
			isStoppingRun = false;
		}
	}

	async function handleScrapeButton() {
		if (isScrapeActive) {
			await stopScrapeRun();
			return;
		}
		await startScrapeRun(selectedMode);
	}

	$effect(() => {
		const nextStatus = scrapeRun?.status ?? 'IDLE';
		if (nextStatus === previousRunStatus) return;
		const wasActive = previousRunStatus === 'RUNNING' || previousRunStatus === 'STOPPING';
		previousRunStatus = nextStatus;
		if ((nextStatus === 'RUNNING' || nextStatus === 'STOPPING') && scrapeRun?.mode) {
			selectedMode = scrapeRun.mode;
		}
		if (
			wasActive &&
			(nextStatus === 'COMPLETED' || nextStatus === 'CANCELLED' || nextStatus === 'FAILED')
		) {
			onchanged?.();
		}
	});

	async function load(silent = false) {
		if (!silent) isLoading = true;
		try {
			status = await getTelegramStatusApi();
			error = null;
		} catch (loadError) {
			if (!silent) {
				error =
					loadError instanceof Error
						? loadError.message
						: 'Status scraper belum dapat dimuat.';
			}
		} finally {
			if (!silent) isLoading = false;
		}
	}

	function scheduleStatusPoll() {
		if (disposed) return;
		if (pollTimer) {
			clearTimeout(pollTimer);
			pollTimer = null;
		}
		const delay = isScrapeRunning || isScrapeStopping ? 2500 : 5000;
		pollTimer = setTimeout(async () => {
			await load(true);
			scheduleStatusPoll();
		}, delay);
	}

	async function toggle(action: 'START' | 'STOP') {
		if (isToggling) return;
		isToggling = true;
		error = null;
		try {
			status = await toggleTelegramScraperApi(action);
			onchanged?.();
		} catch (toggleError) {
			error =
				toggleError instanceof Error
					? toggleError.message
					: 'Status scraper gagal diubah.';
		} finally {
			isToggling = false;
		}
	}

	onMount(() => {
		disposed = false;
		// Status-only on mount. Never call toggleTelegramScraperApi here:
		// the listener must only start/stop from an explicit START/STOP click.
		void load();
		scheduleStatusPoll();
		return () => {
			disposed = true;
			if (pollTimer) clearTimeout(pollTimer);
			pollTimer = null;
		};
	});
</script>

<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
	<div class="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
		<div class="flex items-start gap-4">
			<span
				class="flex size-11 shrink-0 items-center justify-center rounded-xl transition {isRunning
					? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30'
					: isEnabled
						? 'bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30'
						: 'bg-slate-800 text-slate-400 ring-1 ring-inset ring-slate-700'}"
			>
				{#if isLoading}
					<Spinner label="Memuat status scraper" />
				{:else}
					<Power size={20} />
				{/if}
			</span>

			<div class="min-w-0">
				<div class="flex flex-wrap items-center gap-2">
					<h2 class="text-base font-semibold text-white">Telegram Scraper Worker</h2>
					<span
						class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset {statusTone}"
					>
						<span
							class="size-1.5 rounded-full {isRunning
								? 'animate-pulse bg-emerald-400'
								: isEnabled
									? 'animate-pulse bg-amber-400'
									: 'bg-slate-500'}"
						></span>
						{isLoading ? 'Memeriksa' : statusLabel}
					</span>
				</div>
				<p class="mt-1 text-xs text-slate-400">
					Listener userbot menangkap pesan baru secara real-time dari channel Telegram yang aktif.
				</p>
				{#if isEnabled}
					<p class="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium {isRunning ? 'text-emerald-300' : 'text-amber-300'}">
						<CheckCircle2 size={12} />
						{isRunning ? 'Terhubung ke Telegram' : 'Menghubungkan ke Telegram...'}
					</p>
				{/if}
			</div>
		</div>

		<div class="flex shrink-0 flex-wrap items-center gap-2">
			<button
				type="button"
				onclick={() => void toggle('START')}
				disabled={isToggling || isLoading || isEnabled || !configReady || isScrapeActive || isStartingRun || isStoppingRun}
				title={!configReady
					? 'Lengkapi TELEGRAM_API_ID, TELEGRAM_API_HASH, dan TELEGRAM_SESSION_STRING di backend'
					: isScrapeActive
						? 'Tunggu scrape massal selesai sebelum menyalakan listener'
						: 'Mulai listener Telegram'}
				class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
			>
				{#if isToggling && !isEnabled}
					<Spinner label="Memulai scraper" />
				{:else}
					<Play size={15} />
				{/if}
				Start Scraper
			</button>
			<button
				type="button"
				onclick={() => void stopScraper()}
				disabled={!canStopScraper}
				title="Matikan listener Telegram"
				class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-40"
			>
				{#if isToggling}
					<Spinner label="Menghentikan scraper" />
				{:else}
					<Square size={14} />
				{/if}
				Stop Scraper
			</button>
			<button
				type="button"
				onclick={() => void load()}
				disabled={isLoading}
				aria-label="Refresh status scraper"
				class="inline-flex size-10 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
			>
				<RefreshCw size={15} />
			</button>
		</div>
	</div>

	<div class="grid gap-px border-t border-slate-800 bg-slate-800/60 sm:grid-cols-3">
		<div class="bg-slate-900/80 px-5 py-3">
			<p class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Koneksi</p>
			<p class="mt-1 text-sm font-medium {isRunning ? 'text-emerald-300' : isEnabled ? 'text-amber-300' : 'text-slate-300'}">
				{isRunning ? 'Connected' : isEnabled ? 'Connecting' : 'Disconnected'}
			</p>
		</div>
		<div class="bg-slate-900/80 px-5 py-3">
			<p class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Aktif sejak</p>
			<p class="mt-1 text-sm font-medium text-slate-200">{formatDate(status?.startedAt)}</p>
		</div>
		<div class="bg-slate-900/80 px-5 py-3">
			<p class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Konfigurasi</p>
			<div class="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-medium">
				<span
					class="rounded-full px-2 py-0.5 ring-1 ring-inset {!status
						? 'bg-slate-800 text-slate-400 ring-slate-700'
						: status.apiConfigured
							? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
							: 'bg-rose-500/10 text-rose-300 ring-rose-500/30'}"
				>
					API {status ? (status.apiConfigured ? 'OK' : '—') : '…'}
				</span>
				<span
					class="rounded-full px-2 py-0.5 ring-1 ring-inset {!status
						? 'bg-slate-800 text-slate-400 ring-slate-700'
						: status.sessionConfigured
							? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
							: 'bg-rose-500/10 text-rose-300 ring-rose-500/30'}"
				>
					Session {status ? (status.sessionConfigured ? 'OK' : '—') : '…'}
				</span>
			</div>
		</div>
	</div>

	<div class="border-t border-slate-800 bg-slate-950/30 px-5 py-5">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-300">
					Scraping massal
				</p>
				<h3 class="mt-1 text-sm font-semibold text-white">Jalankan scrape satu kali</h3>
				<p class="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
					START/STOP di atas untuk listener berkelanjutan. Scrape massal berjalan terpisah,
					menghasilkan satu run, dan bisa dipantau lewat progress di bawah.
				</p>
			</div>
			<span class="rounded-full bg-indigo-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
				{selectedMode}
			</span>
		</div>

		<div class="mt-4">
			<p class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Mode scraping</p>
			<div class="mt-2 inline-flex rounded-lg border border-slate-700 bg-slate-900 p-1">
				<button
					type="button"
					aria-pressed={selectedMode === 'CURSOR'}
					onclick={() => (selectedMode = 'CURSOR')}
					disabled={isEnabled || isScrapeActive || isStartingRun || isStoppingRun || isToggling}
					class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition {selectedMode ===
					'CURSOR'
						? 'bg-indigo-500 text-white'
						: 'text-slate-400 hover:text-white'} disabled:cursor-not-allowed disabled:opacity-50"
				>
					<History size={13} /> CURSOR
				</button>
				<button
					type="button"
					aria-pressed={selectedMode === 'TODAY'}
					onclick={() => (selectedMode = 'TODAY')}
					disabled={isEnabled || isScrapeActive || isStartingRun || isStoppingRun || isToggling}
					class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition {selectedMode ===
					'TODAY'
						? 'bg-indigo-500 text-white'
						: 'text-slate-400 hover:text-white'} disabled:cursor-not-allowed disabled:opacity-50"
				>
					<CalendarClock size={13} /> TODAY
				</button>
			</div>
			<p class="mt-2 text-xs leading-5 text-slate-400">{modeNote}</p>
		</div>

		<div class="mt-4 grid gap-3 lg:grid-cols-2">
			<div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
				<div class="flex items-center justify-between gap-2">
					<p class="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
						<ListChecks size={14} class="text-indigo-300" /> Source Telegram aktif
					</p>
					<span class="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
						{telegramSources.length}
					</span>
				</div>
				<div class="mt-3 max-h-44 space-y-1.5 overflow-y-auto pr-1">
					{#each telegramSources as source (source.id)}
						<label class="flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-xs text-slate-300 transition hover:border-slate-700 hover:bg-slate-800/60">
							<input
								type="checkbox"
								checked={selectedSourceIds.includes(source.id)}
								disabled={isScrapeActive || isStartingRun || isStoppingRun}
								onchange={(event) =>
									toggleSource(source.id, event.currentTarget.checked)}
								class="size-3.5 rounded border-slate-600 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
							/>
							<span class="truncate" title={source.name}>{source.name}</span>
						</label>
					{:else}
						<p class="rounded-lg border border-dashed border-slate-700 px-3 py-4 text-center text-xs text-slate-500">
							Belum ada source Telegram aktif.
						</p>
					{/each}
				</div>
				<div class="mt-2 flex flex-wrap items-center justify-between gap-2">
					<p class="text-[10px] text-slate-500">
						{selectedSourceIds.length === 0
							? `Semua ${telegramSources.length} source aktif`
							: `${selectedSourceIds.length} dari ${telegramSources.length} source dipilih`}
					</p>
					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={selectAllSources}
							disabled={telegramSources.length === 0 || isScrapeActive || isStartingRun || isStoppingRun}
							class="text-[10px] font-semibold text-indigo-300 transition hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-40"
						>
							Pilih semua
						</button>
						<button
							type="button"
							onclick={clearSourceSelection}
							disabled={selectedSourceIds.length === 0 || isScrapeActive || isStartingRun || isStoppingRun}
							class="text-[10px] font-semibold text-slate-400 transition hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
						>
							Kosongkan
						</button>
					</div>
				</div>
				<p class="mt-1 text-[10px] leading-4 text-slate-500">
					Kosong berarti semua source Telegram aktif. Pilih sebagian untuk membatasi source.
				</p>
			</div>

			<div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
				<label class="block text-xs font-semibold text-slate-200" for="max-messages-per-source">
					Max pesan per source
				</label>
				<input
					id="max-messages-per-source"
					type="number"
					min="1"
					max="5000"
					step="1"
					bind:value={maxMessagesInput}
					onblur={() => (maxMessagesInput = String(maxMessages))}
					disabled={isScrapeActive || isStartingRun || isStoppingRun}
					class="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50"
				/>
				<p class="mt-1.5 text-[10px] leading-4 text-slate-500">
					Default 1.000, maksimal 5.000. Nilai otomatis dibatasi saat scrape dijalankan.
				</p>

				<div class="mt-4">
					<button
						type="button"
						onclick={() => void handleScrapeButton()}
						disabled={scrapeButtonDisabled}
						title={isScrapeActive
							? isScrapeStopping || isStoppingRun
								? 'Sedang menghentikan scrape'
								: `Hentikan scrape ${activeRunMode}`
							: isEnabled
								? 'Stop listener terlebih dahulu sebelum menjalankan scrape'
								: `Mulai scrape ${selectedMode}`}
						class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 {isScrapeActive
							? 'bg-rose-500 hover:bg-rose-400'
							: 'bg-indigo-500 hover:bg-indigo-400'}"
					>
						{#if isStartingRun || isStoppingRun || isScrapeStopping}
							<Spinner
								label={isStartingRun ? `Memulai scrape ${selectedMode}` : 'Menghentikan scrape'}
							/>
						{:else if isScrapeRunning}
							<Square size={14} />
						{:else if selectedMode === 'CURSOR'}
							<History size={14} />
						{:else}
							<CalendarClock size={14} />
						{/if}
						{scrapeButtonLabel}
					</button>
				</div>

				{#if runError}
					<p class="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs leading-5 text-rose-300" role="alert">
						{runError}
					</p>
				{/if}
				{#if isScrapeActive || isStoppingRun}
					<p class="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium {isScrapeStopping || isStoppingRun ? 'text-amber-300' : 'text-sky-300'}">
						<Spinner label={isScrapeStopping || isStoppingRun ? 'Menghentikan scrape' : 'Scrape sedang berjalan'} />
						{isScrapeStopping || isStoppingRun ? 'Menghentikan scrape...' : 'Scrape sedang berjalan...'}
					</p>
				{/if}
			</div>
		</div>

		{#if scrapeRun && scrapeRun.status !== 'IDLE'}
			<div class="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<div class="flex flex-wrap items-center gap-2">
						<p class="text-xs font-semibold text-slate-200">Progress scrape</p>
						<span class="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset {runStatusTone(scrapeRun.status)}">
							{runStatusLabel(scrapeRun.status)}
						</span>
						{#if scrapeRun.mode}
							<span class="text-[10px] font-semibold text-slate-500">{scrapeRun.mode}</span>
						{/if}
					</div>
					<p class="text-[10px] text-slate-500">
						{scrapeRun.processedSources}/{scrapeRun.totalSources} source · {runProgress}%
					</p>
				</div>

				<div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
					<div
						class="h-full rounded-full transition-all {scrapeRun.status === 'FAILED'
							? 'bg-rose-500'
							: scrapeRun.status === 'COMPLETED'
								? 'bg-emerald-500'
								: scrapeRun.status === 'STOPPING'
									? 'bg-amber-500'
									: scrapeRun.status === 'CANCELLED'
										? 'bg-slate-500'
										: 'bg-sky-500'}"
						style:width={`${runProgress}%`}
					></div>
				</div>

				<div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
					<div class="rounded-lg bg-slate-950/60 px-2.5 py-2">
						<p class="text-[9px] uppercase tracking-wide text-slate-500">Pesan diproses</p>
						<p class="mt-0.5 text-sm font-bold text-slate-100">{formatNumber(scrapeRun.totalMessages)}</p>
					</div>
					<div class="rounded-lg bg-slate-950/60 px-2.5 py-2">
						<p class="text-[9px] uppercase tracking-wide text-slate-500">Job masuk</p>
						<p class="mt-0.5 text-sm font-bold text-emerald-300">{formatNumber(scrapeRun.ingestedJobs)}</p>
					</div>
					<div class="rounded-lg bg-slate-950/60 px-2.5 py-2">
						<p class="text-[9px] uppercase tracking-wide text-slate-500">Dilewati</p>
						<p class="mt-0.5 text-sm font-bold text-slate-100">{formatNumber(scrapeRun.skippedMessages)}</p>
					</div>
					<div class="rounded-lg bg-slate-950/60 px-2.5 py-2">
						<p class="text-[9px] uppercase tracking-wide text-slate-500">Gagal</p>
						<p class="mt-0.5 text-sm font-bold text-rose-300">{formatNumber(scrapeRun.failedMessages)}</p>
					</div>
				</div>

				<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500">
					{#if scrapeRun.currentSource}
						<span>Source aktif: <strong class="text-slate-300">{scrapeRun.currentSource}</strong></span>
					{/if}
					<span>Mulai: {formatDate(scrapeRun.startedAt)}</span>
					<span>Selesai: {formatDate(scrapeRun.finishedAt)}</span>
				</div>

				{#if scrapeRun.error}
					<p class="mt-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs leading-5 text-rose-300" role="alert">
						{scrapeRun.error}
					</p>
				{/if}

				{#if scrapeRun.status === 'COMPLETED' || scrapeRun.status === 'CANCELLED' || scrapeRun.status === 'FAILED'}
					<div class="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5">
						<p class="text-xs leading-5 text-slate-300">
							{#if scrapeRun.status === 'COMPLETED'}
								Scrape selesai. {formatNumber(scrapeRun.ingestedJobs)} job berhasil masuk dari
								{formatNumber(scrapeRun.totalMessages)} pesan yang diproses.
							{:else if scrapeRun.status === 'CANCELLED'}
								Scrape dibatalkan. {formatNumber(scrapeRun.ingestedJobs)} job sudah terlanjur masuk
								dari {formatNumber(scrapeRun.totalMessages)} pesan yang diproses.
							{:else}
								Scrape gagal. Periksa error di atas sebelum mencoba lagi.
							{/if}
						</p>
						<a
							href="/superadmin/jobs"
							class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-indigo-500 px-3 text-xs font-semibold text-white transition hover:bg-indigo-400"
						>
							<RefreshCw size={13} /> Refresh daftar job <ArrowRight size={13} />
						</a>
					</div>
				{/if}
			</div>
		{:else}
			<div class="mt-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 px-4 py-3 text-xs text-slate-500">
				Belum ada scrape run. Pilih mode dan source, lalu jalankan scrape.
			</div>
		{/if}
	</div>

	{#if !configReady && status && !isLoading}
		<div class="border-t border-amber-500/20 bg-amber-500/5 px-5 py-3">
			<p class="inline-flex items-start gap-2 text-xs text-amber-200/90">
				<TriangleAlert size={14} class="mt-0.5 shrink-0" />
				<span>
					Konfigurasi Telegram belum lengkap di backend. Isi
					<code class="rounded bg-slate-950 px-1">TELEGRAM_API_ID</code>,
					<code class="rounded bg-slate-950 px-1">TELEGRAM_API_HASH</code>, dan
					<code class="rounded bg-slate-950 px-1">TELEGRAM_SESSION_STRING</code>, lalu restart API.
				</span>
			</p>
		</div>
	{/if}

	{#if error || status?.lastError}
		<div class="border-t border-rose-500/20 bg-rose-500/5 px-5 py-3">
			<p class="text-xs text-rose-300" role="alert">
				{error ?? status?.lastError}
			</p>
		</div>
	{/if}
</div>
