<script lang="ts">
	import { onMount } from 'svelte';
	import { Antenna, Plug, Plus, RefreshCw, Trash2 } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/superadmin/Alert.svelte';
	import Modal from '#lib/components/superadmin/Modal.svelte';
	import { formatDate, formatNumber } from '#lib/components/superadmin/format.js';
	import { sourceTypeLabel } from '#lib/components/superadmin/status.js';
	import {
		createSource,
		deleteSource,
		listSources,
		toggleSource,
		type IngestionSource,
		type SourceType
	} from '#lib/services/superadminApi.js';

	let sources = $state<IngestionSource[]>([]);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	let modalOpen = $state(false);
	let formName = $state('');
	let formType = $state<SourceType>('TELEGRAM');
	let formTarget = $state('');
	let isSaving = $state(false);
	let formError = $state<string | null>(null);
	let togglingId = $state<string | null>(null);

	let deleteTarget = $state<IngestionSource | null>(null);
	let isDeleting = $state(false);

	const types: SourceType[] = ['TELEGRAM', 'WEB'];

	const activeCount = $derived(sources.filter((item) => item.isActive).length);
	const telegramCount = $derived(sources.filter((item) => item.type === 'TELEGRAM').length);
	const webCount = $derived(sources.filter((item) => item.type === 'WEB').length);

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			sources = await listSources();
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Sumber belum dapat dimuat.';
		} finally {
			isLoading = false;
		}
	}

	function openCreate() {
		formName = '';
		formType = 'TELEGRAM';
		formTarget = '';
		formError = null;
		modalOpen = true;
	}

	function closeModal() {
		if (isSaving) return;
		modalOpen = false;
	}

	async function saveSource() {
		if (isSaving) return;
		formError = null;
		const name = formName.trim();
		const target = formTarget.trim();
		if (!name) {
			formError = 'Nama sumber wajib diisi.';
			return;
		}
		if (!target) {
			formError = formType === 'TELEGRAM' ? 'Channel ID / username wajib diisi.' : 'URL wajib diisi.';
			return;
		}
		isSaving = true;
		errorMessage = null;
		successMessage = null;
		try {
			const created = await createSource({ name, type: formType, target });
			sources = [...sources, created];
			successMessage = `Sumber "${created.name}" berhasil ditambahkan.`;
			modalOpen = false;
		} catch (error) {
			formError = error instanceof Error ? error.message : 'Sumber belum dapat ditambahkan.';
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
			const updated = await toggleSource(source.id);
			sources = sources.map((item) => (item.id === updated.id ? updated : item));
			successMessage = `Bot listening "${updated.name}" ${updated.isActive ? 'diaktifkan' : 'dimatikan'}.`;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Status sumber gagal diubah.';
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
			await deleteSource(target.id);
			sources = sources.filter((item) => item.id !== target.id);
			successMessage = `Sumber "${target.name}" berhasil dihapus.`;
			deleteTarget = null;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Sumber gagal dihapus.';
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
			<p class="text-sm font-semibold text-amber-300">Ingestion</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight text-white">Ingestion Sources</h1>
			<p class="mt-2 text-sm text-slate-400">
				Kelola channel Telegram dan URL web scraping, serta nyalakan/matikan bot listening.
			</p>
		</div>
		<button
			type="button"
			onclick={openCreate}
			class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400"
		>
			<Plus size={16} /> Tambah Sumber
		</button>
	</header>

	{#if errorMessage}
		<Alert type="error" message={errorMessage} dismissible ondismiss={() => (errorMessage = null)} />
	{/if}
	{#if successMessage}
		<Alert type="success" message={successMessage} dismissible ondismiss={() => (successMessage = null)} />
	{/if}

	<section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Total sumber</p>
			<p class="mt-1 text-2xl font-bold text-white">{sources.length}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Listening aktif</p>
			<p class="mt-1 text-2xl font-bold text-emerald-300">{activeCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Telegram</p>
			<p class="mt-1 text-2xl font-bold text-indigo-300">{telegramCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Web scraping</p>
			<p class="mt-1 text-2xl font-bold text-violet-300">{webCount}</p>
		</div>
	</section>

	{#if isLoading}
		<div class="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
			<Spinner label="Memuat sumber" /> Memuat sumber...
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
			<h2 class="mt-4 text-lg font-semibold text-white">Belum ada sumber</h2>
			<p class="mt-1 text-sm text-slate-400">Tambahkan channel Telegram atau URL web untuk mulai scraping.</p>
			<button
				type="button"
				onclick={openCreate}
				class="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400"
			>
				<Plus size={16} /> Tambah Sumber
			</button>
		</div>
	{:else}
		<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-slate-800 text-sm">
					<thead class="bg-slate-900 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
						<tr>
							<th class="px-5 py-3">Sumber</th>
							<th class="px-5 py-3">Tipe</th>
							<th class="px-5 py-3">Target</th>
							<th class="px-5 py-3">Bot Listening</th>
							<th class="px-5 py-3">Sinkron Terakhir</th>
							<th class="px-5 py-3">Total Jobs</th>
							<th class="px-5 py-3 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-800/70">
						{#each sources as source (source.id)}
							<tr class="hover:bg-slate-900">
								<td class="px-5 py-4">
									<div class="flex items-center gap-2">
										<span class="flex size-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-300">
											<Antenna size={15} />
										</span>
										<p class="font-semibold text-white">{source.name}</p>
									</div>
								</td>
								<td class="px-5 py-4">
									<span class="rounded-md border border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
										{sourceTypeLabel[source.type]}
									</span>
								</td>
								<td class="px-5 py-4">
									<code class="rounded bg-slate-950 px-2 py-1 text-[11px] text-slate-300">{source.target}</code>
								</td>
								<td class="px-5 py-4">
									<div class="flex items-center gap-2">
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
										<span class="text-[11px] font-medium {source.isActive ? 'text-emerald-300' : 'text-slate-500'}">
											{source.isActive ? 'Listening' : 'Non-aktif'}
										</span>
									</div>
								</td>
								<td class="px-5 py-4 text-xs text-slate-400">{formatDate(source.lastSyncedAt)}</td>
								<td class="px-5 py-4 text-slate-300">{formatNumber(source.totalJobs)}</td>
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
	title="Tambah Sumber Baru"
	description="Tambahkan channel Telegram atau URL web untuk scraping."
	onclose={closeModal}
>
	<div class="space-y-4">
		{#if formError}
			<Alert type="error" message={formError} />
		{/if}
		<label class="block space-y-1.5 text-sm font-medium text-slate-300">
			Nama sumber <span class="text-rose-400">*</span>
			<input
				bind:value={formName}
				maxlength="160"
				placeholder="Contoh: Loker Jogja"
				class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
			/>
		</label>
		<label class="block space-y-1.5 text-sm font-medium text-slate-300">
			Tipe
			<select
				bind:value={formType}
				class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
			>
				{#each types as type}
					<option value={type}>{sourceTypeLabel[type]}</option>
				{/each}
			</select>
		</label>
		<label class="block space-y-1.5 text-sm font-medium text-slate-300">
			{formType === 'TELEGRAM' ? 'Channel ID / Username' : 'URL Web'} <span class="text-rose-400">*</span>
			<input
				bind:value={formTarget}
				maxlength="2048"
				placeholder={formType === 'TELEGRAM' ? '@lokerjogja atau -100...' : 'https://...'}
				class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
			/>
		</label>
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
			Tambah Sumber
		</button>
	{/snippet}
</Modal>

<Modal
	open={deleteTarget !== null}
	title="Hapus sumber?"
	description="Bot listening untuk sumber ini akan dihentikan."
	onclose={() => (isDeleting ? undefined : (deleteTarget = null))}
>
	{#if deleteTarget}
		<p class="text-sm text-slate-300">
			Hapus sumber <strong class="text-white">{deleteTarget.name}</strong>?
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
