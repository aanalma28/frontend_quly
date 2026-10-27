<script lang="ts">
	import { onMount } from 'svelte';
	import { Antenna, Plug, Plus, RefreshCw, Trash2 } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/superadmin/Alert.svelte';
	import Modal from '#lib/components/superadmin/Modal.svelte';
	import TelegramScraperControl from '#lib/components/superadmin/TelegramScraperControl.svelte';
	import { formatDate } from '#lib/components/superadmin/format.js';
	import { sourceTypeLabel, sourceTypeTone } from '#lib/components/superadmin/status.js';
	import {
		createSourceApi,
		deleteSourceApi,
		listSourcesApi,
		toggleSourceApi,
		type IngestionSource
	} from '#lib/services/superadminApi.js';

	let sources = $state<IngestionSource[]>([]);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	let modalOpen = $state(false);
	let formName = $state('');
	let formIdentifier = $state('');
	let isSaving = $state(false);
	let formError = $state<string | null>(null);

	let togglingId = $state<string | null>(null);
	let deleteTarget = $state<IngestionSource | null>(null);
	let isDeleting = $state(false);

	const telegramSources = $derived(
		sources.filter((source) => source.type === 'TELEGRAM_CHANNEL')
	);
	const activeCount = $derived(
		telegramSources.filter((source) => source.isActive).length
	);

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			sources = await listSourcesApi();
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Sumber belum dapat dimuat.';
		} finally {
			isLoading = false;
		}
	}

	function openCreate() {
		formName = '';
		formIdentifier = '';
		formError = null;
		modalOpen = true;
	}

	function closeModal() {
		if (isSaving) return;
		modalOpen = false;
	}

	function normalizeIdentifier(value: string): string {
		const trimmed = value.trim();
		if (!trimmed) return '';
		if (trimmed.startsWith('@') || /^-?\d+$/.test(trimmed)) return trimmed;
		if (trimmed.includes('t.me/')) {
			const handle = trimmed.split('t.me/')[1]?.replace(/\/+$/, '') ?? '';
			return handle ? (handle.startsWith('@') ? handle : `@${handle}`) : trimmed;
		}
		return `@${trimmed}`;
	}

	async function saveSource() {
		if (isSaving) return;
		formError = null;
		const name = formName.trim();
		const identifier = normalizeIdentifier(formIdentifier);
		if (!name) {
			formError = 'Nama channel wajib diisi.';
			return;
		}
		if (!identifier) {
			formError = 'Username / Channel ID Telegram wajib diisi.';
			return;
		}
		isSaving = true;
		errorMessage = null;
		successMessage = null;
		try {
			await createSourceApi({
				name,
				type: 'TELEGRAM_CHANNEL',
				identifier
			});
			successMessage = `Channel "${name}" berhasil ditambahkan dan siap didengarkan bot.`;
			modalOpen = false;
			await load();
		} catch (error) {
			formError = error instanceof Error ? error.message : 'Channel belum dapat ditambahkan.';
		} finally {
			isSaving = false;
		}
	}

	async function handleToggle(source: IngestionSource) {
		if (togglingId) return;
		togglingId = source.id;
		errorMessage = null;
		successMessage = null;
		try {
			const updated = await toggleSourceApi(source.id);
			sources = sources.map((item) => (item.id === updated.id ? updated : item));
			successMessage = `Channel "${updated.name}" ${updated.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Status channel gagal diubah.';
		} finally {
			togglingId = null;
		}
	}

	async function removeSource() {
		if (!deleteTarget || isDeleting) return;
		const target = deleteTarget;
		isDeleting = true;
		errorMessage = null;
		successMessage = null;
		try {
			await deleteSourceApi(target.id);
			sources = sources.filter((item) => item.id !== target.id);
			successMessage = `Channel "${target.name}" berhasil dihapus.`;
			deleteTarget = null;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Channel gagal dihapus.';
			deleteTarget = null;
		} finally {
			isDeleting = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>Ingestion Sources | Superadmin</title>
</svelte:head>

<div class="space-y-6">
	<header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
		<div>
			<p class="text-sm font-semibold text-amber-300">Telegram Scraper Control</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight text-white">Ingestion Sources</h1>
			<p class="mt-2 text-sm text-slate-400">
				Kendalikan worker Telegram dan kelola channel yang didengarkan bot secara real-time.
			</p>
		</div>
		<button
			type="button"
			onclick={openCreate}
			class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400"
		>
			<Plus size={16} /> Tambah Channel Telegram
		</button>
	</header>

	<TelegramScraperControl onchanged={() => void load()} />

	{#if errorMessage}
		<Alert type="error" message={errorMessage} dismissible ondismiss={() => (errorMessage = null)} />
	{/if}
	{#if successMessage}
		<Alert type="success" message={successMessage} dismissible ondismiss={() => (successMessage = null)} />
	{/if}

	<section class="grid gap-4 sm:grid-cols-3">
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Total sumber</p>
			<p class="mt-1 text-2xl font-bold text-white">{sources.length}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Channel aktif</p>
			<p class="mt-1 text-2xl font-bold text-emerald-300">{activeCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Channel Telegram</p>
			<p class="mt-1 text-2xl font-bold text-sky-300">{telegramSources.length}</p>
		</div>
	</section>

	{#if isLoading}
		<div class="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
			<Spinner label="Memuat sumber" /> Memuat channel...
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
	{:else if sources.length === 0}
		<div class="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center">
			<span class="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
				<Plug size={24} />
			</span>
			<h2 class="mt-4 text-lg font-semibold text-white">Belum ada channel</h2>
			<p class="mt-1 text-sm text-slate-400">
				Tambahkan channel Telegram agar bot mulai menangkap lowongan.
			</p>
			<button
				type="button"
				onclick={openCreate}
				class="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400"
			>
				<Plus size={16} /> Tambah Channel Telegram
			</button>
		</div>
	{:else}
		<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
			<div class="flex items-center justify-between border-b border-slate-800 px-5 py-3">
				<h2 class="text-sm font-semibold text-white">Daftar Channel</h2>
				<button
					type="button"
					onclick={() => void load()}
					class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-white"
				>
					<RefreshCw size={13} /> Refresh
				</button>
			</div>
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-slate-800 text-sm">
					<thead class="bg-slate-900 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
						<tr>
							<th class="px-5 py-3">Channel</th>
							<th class="px-5 py-3">Identifier</th>
							<th class="px-5 py-3">Status Aktif</th>
							<th class="px-5 py-3">Terakhir Dirayapi</th>
							<th class="px-5 py-3">Status Message</th>
							<th class="px-5 py-3 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-800/70">
						{#each sources as source (source.id)}
							<tr class="hover:bg-slate-900">
								<td class="px-5 py-4">
									<div class="flex items-center gap-2.5">
										<span class="flex size-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-300">
											<Antenna size={15} />
										</span>
										<div class="min-w-0">
											<p class="truncate font-semibold text-white">{source.name}</p>
											<span class="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset {sourceTypeTone[source.type]}">
												{sourceTypeLabel[source.type]}
											</span>
										</div>
									</div>
								</td>
								<td class="px-5 py-4">
									<code class="rounded bg-slate-950 px-2 py-1 text-[11px] text-slate-300">{source.identifier}</code>
								</td>
								<td class="px-5 py-4">
									<div class="flex items-center gap-2.5">
										<button
											type="button"
											role="switch"
											aria-checked={source.isActive}
											aria-label="Aktifkan/matikan {source.name}"
											onclick={() => void handleToggle(source)}
											disabled={togglingId === source.id}
											class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition {source.isActive
												? 'bg-emerald-500'
												: 'bg-slate-700'} disabled:opacity-60"
										>
											<span
												class="inline-block size-4 transform rounded-full bg-white transition {source.isActive
													? 'translate-x-4'
													: 'translate-x-0.5'}"
											></span>
										</button>
										<span
											class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset {source.isActive
												? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
												: 'bg-slate-800 text-slate-400 ring-slate-700'}"
										>
											{source.isActive ? 'Aktif' : 'Nonaktif'}
										</span>
									</div>
								</td>
								<td class="px-5 py-4 text-xs text-slate-400">{formatDate(source.lastScrapedAt)}</td>
								<td class="px-5 py-4 text-xs text-slate-400">{source.statusMessage ?? '—'}</td>
								<td class="px-5 py-4 text-right">
									<button
										type="button"
										onclick={() => (deleteTarget = source)}
										class="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10"
									>
										<Trash2 size={13} /> Hapus
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<Modal
	open={modalOpen}
	title="Tambah Channel Telegram"
	description="Channel baru langsung masuk ke database dan didengarkan oleh bot tanpa mengubah kode backend."
	onclose={closeModal}
>
	<div class="space-y-4">
		{#if formError}
			<Alert type="error" message={formError} />
		{/if}
		<label class="block space-y-1.5 text-sm font-medium text-slate-300">
			Nama channel <span class="text-rose-400">*</span>
			<input
				bind:value={formName}
				maxlength="160"
				placeholder="Contoh: Loker IT Jogja"
				class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
			/>
		</label>
		<label class="block space-y-1.5 text-sm font-medium text-slate-300">
			Username / Channel ID Telegram <span class="text-rose-400">*</span>
			<input
				bind:value={formIdentifier}
				maxlength="500"
				placeholder="@loker_it atau -1001234567890"
				class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
			/>
		</label>
		<div class="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
			<p class="text-[11px] leading-5 text-sky-200/80">
				Pastikan bot Telegram sudah ditambahkan sebagai admin/member channel. Jika username
				ditulis tanpa <code class="rounded bg-slate-950 px-1">@</code>, sistem akan menambahkannya
				otomatis.
			</p>
		</div>
	</div>

	{#snippet footer()}
		<button
			type="button"
			onclick={closeModal}
			disabled={isSaving}
			class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
		>
			Batal
		</button>
		<button
			type="button"
			onclick={() => void saveSource()}
			disabled={isSaving}
			class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
		>
			{#if isSaving}<Spinner label="Menyimpan" />{/if}
			Tambah Channel
		</button>
	{/snippet}
</Modal>

<Modal
	open={deleteTarget !== null}
	title="Hapus channel?"
	description="Channel ini akan berhenti didengarkan oleh bot."
	onclose={() => (isDeleting ? undefined : (deleteTarget = null))}
>
	{#if deleteTarget}
		<p class="text-sm text-slate-300">
			Hapus channel <strong class="text-white">{deleteTarget.name}</strong>
			(<code class="rounded bg-slate-950 px-1.5 py-0.5 text-xs">{deleteTarget.identifier}</code>)?
		</p>
	{/if}

	{#snippet footer()}
		<button
			type="button"
			onclick={() => (deleteTarget = null)}
			disabled={isDeleting}
			class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
		>
			Batal
		</button>
		<button
			type="button"
			onclick={() => void removeSource()}
			disabled={isDeleting}
			class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-60"
		>
			{#if isDeleting}<Spinner label="Menghapus" />{/if}
			Hapus
		</button>
	{/snippet}
</Modal>
