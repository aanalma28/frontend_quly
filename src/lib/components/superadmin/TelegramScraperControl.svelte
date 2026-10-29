<script lang="ts">
	import { onMount } from 'svelte';
	import { CheckCircle2, Play, Power, RefreshCw, Square, TriangleAlert } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import { formatDate } from './format.js';
	import {
		getTelegramStatusApi,
		toggleTelegramScraperApi,
		type TelegramScraperStatus
	} from '#lib/services/superadminApi.js';

	interface Props {
		/** Called after the listener state changes so the parent can refresh data. */
		onchanged?: () => void;
	}

	let { onchanged }: Props = $props();

	let status = $state<TelegramScraperStatus | null>(null);
	let isLoading = $state(true);
	let isToggling = $state(false);
	let error = $state<string | null>(null);
	let pollTimer: ReturnType<typeof setInterval> | null = null;

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
		// Status-only on mount. Never call toggleTelegramScraperApi here:
		// the listener must only start/stop from an explicit START/STOP click.
		void load();
		pollTimer = setInterval(() => void load(true), 5000);
		return () => {
			if (pollTimer) clearInterval(pollTimer);
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
				disabled={isToggling || isLoading || isEnabled || !configReady}
				title={!configReady
					? 'Lengkapi TELEGRAM_API_ID, TELEGRAM_API_HASH, dan TELEGRAM_SESSION_STRING di backend'
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
				onclick={() => void toggle('STOP')}
				disabled={isToggling || isLoading || !isEnabled}
				class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-40"
			>
				{#if isToggling && isEnabled}
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
