<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Ban,
		CheckCircle2,
		ChevronDown,
		ChevronLeft,
		ChevronRight,
		ExternalLink,
		Info,
		Pencil,
		Play,
		Plus,
		RefreshCw,
		Search,
		Trash2,
		X
	} from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/superadmin/Alert.svelte';
	import Modal from '#lib/components/superadmin/Modal.svelte';
	import TelegramScraperControl from '#lib/components/superadmin/TelegramScraperControl.svelte';
	import { formatDate } from '#lib/components/superadmin/format.js';
	import {
		ingestionPaginationLabel,
		ingestionSourceKindLabel,
		ingestionSourceKindTone
	} from '#lib/components/superadmin/status.js';
	import {
		bulkUpdateSourceStatusApi,
		createSourceApi,
		deleteSourceApi,
		getScraperRunApi,
		listSourcesApi,
		startScraperRunApi,
		toggleSourceApi,
		updateSourceApi,
		type BulkSourceStatusPayload,
		type IngestionPaginationType,
		type IngestionSource,
		type IngestionSourceInput,
		type IngestionSourceKind,
		type ScraperRun,
		type UpdateIngestionSourceInput
	} from '#lib/services/superadminApi.js';
	import { ApiError } from '#lib/utils/api.js';

	const inputClass =
		'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30';

	const sourceKinds: IngestionSourceKind[] = ['TELEGRAM', 'WEBSITE_HTML', 'WEBSITE_API'];
	const paginationTypes: IngestionPaginationType[] = [
		'DEFAULT',
		'LOKER_SEMAR',
		'LOKER_MURIA',
		'WORKDAY_JSON'
	];
	const PAGE_SIZE = 12;
	const searchInputClass =
		'h-10 w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-9 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50';
	const filterClass =
		'h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50 lg:w-36 lg:shrink-0';

	let sources = $state<IngestionSource[]>([]);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	let modalOpen = $state(false);
	let editing = $state<IngestionSource | null>(null);
	let formName = $state('');
	let formType = $state<IngestionSourceKind>('TELEGRAM');
	let formUrl = $state('');
	let formPagination = $state<IngestionPaginationType>('DEFAULT');
	let formMaxPages = $state('');
	let formListSelector = $state('');
	let formDetailSelector = $state('');
	let formActive = $state(true);
	let isSaving = $state(false);
	let formError = $state<string | null>(null);

	let runningId = $state<string | null>(null);
	let togglingId = $state<string | null>(null);
	let deleteTarget = $state<IngestionSource | null>(null);
	let isDeleting = $state(false);

	type SelectionMode = 'ids' | 'type' | 'all';
	let selectionMode = $state<SelectionMode>('ids');
	let selectedIds = $state<string[]>([]);
	let selectedType = $state<IngestionSourceKind>('TELEGRAM');
	let isBulkUpdating = $state(false);
	let bulkAction = $state<boolean | null>(null);
	let warningMessage = $state<string | null>(null);

	let query = $state('');
	let typeFilter = $state<'ALL' | IngestionSourceKind>('ALL');
	let statusFilter = $state<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
	let currentPage = $state(1);

	const filteredSources = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return sources.filter((source) => {
			if (typeFilter !== 'ALL' && source.type !== typeFilter) return false;
			if (statusFilter === 'ACTIVE' && !source.isActive) return false;
			if (statusFilter === 'INACTIVE' && source.isActive) return false;
			if (!q) return true;
			return (
				source.name.toLowerCase().includes(q) ||
				source.url.toLowerCase().includes(q) ||
				(source.statusMessage ?? '').toLowerCase().includes(q)
			);
		});
	});
	const totalPages = $derived(Math.max(1, Math.ceil(filteredSources.length / PAGE_SIZE)));
	const safePage = $derived(Math.min(currentPage, totalPages));
	const pagedSources = $derived(
		filteredSources.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
	);
	const pageStart = $derived(
		filteredSources.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
	);
	const pageEnd = $derived(Math.min(safePage * PAGE_SIZE, filteredSources.length));
	const hasFilters = $derived(
		query.trim().length > 0 || typeFilter !== 'ALL' || statusFilter !== 'ALL'
	);
	const activeCount = $derived(sources.filter((source) => source.isActive).length);
	const selectedCount = $derived.by(() => {
		if (selectionMode === 'all') return sources.length;
		if (selectionMode === 'type') {
			return sources.filter((source) => source.type === selectedType).length;
		}
		return selectedIds.length;
	});
	const allOnPageSelected = $derived(
		pagedSources.length > 0 && pagedSources.every((source) => isRowSelected(source))
	);
	const editTargetChanged = $derived(
		Boolean(editing && (formType !== editing.type || formUrl.trim() !== editing.url.trim()))
	);

	function backendMessage(error: unknown, fallback: string): string {
		if (error instanceof ApiError && error.status === 404) {
			return 'Endpoint ini belum tersedia di backend. UI sudah siap untuk kontrak sumber yang baru.';
		}
		return error instanceof Error ? error.message : fallback;
	}

	function isRowSelected(source: IngestionSource): boolean {
		if (selectionMode === 'all') return true;
		if (selectionMode === 'type') return source.type === selectedType;
		return selectedIds.includes(source.id);
	}

	function effectiveSelectedIds(): string[] {
		if (selectionMode === 'all') return sources.map((source) => source.id);
		if (selectionMode === 'type') {
			return sources
				.filter((source) => source.type === selectedType)
				.map((source) => source.id);
		}
		return [...selectedIds];
	}

	function toggleRow(source: IngestionSource, checked: boolean) {
		if (isBulkUpdating) return;
		if (selectionMode !== 'ids') {
			const effective = effectiveSelectedIds();
			selectedIds = checked
				? [...new Set([...effective, source.id])]
				: effective.filter((id) => id !== source.id);
			selectionMode = 'ids';
			return;
		}
		selectedIds = checked
			? [...new Set([...selectedIds, source.id])]
			: selectedIds.filter((id) => id !== source.id);
	}

	function toggleAllOnPage(checked: boolean) {
		if (isBulkUpdating) return;
		const pageIds = pagedSources.map((source) => source.id);
		if (selectionMode !== 'ids') {
			const effective = effectiveSelectedIds();
			selectedIds = checked
				? [...new Set([...effective, ...pageIds])]
				: effective.filter((id) => !pageIds.includes(id));
			selectionMode = 'ids';
			return;
		}
		selectedIds = checked
			? [...new Set([...selectedIds, ...pageIds])]
			: selectedIds.filter((id) => !pageIds.includes(id));
	}

	function resetFilters() {
		query = '';
		typeFilter = 'ALL';
		statusFilter = 'ALL';
		currentPage = 1;
	}

	function goToPage(page: number) {
		currentPage = Math.min(Math.max(1, page), totalPages);
	}

	function selectAllTelegram() {
		if (isBulkUpdating) return;
		selectionMode = 'type';
		selectedType = 'TELEGRAM';
		selectedIds = [];
	}

	function selectAllSources() {
		if (isBulkUpdating) return;
		selectionMode = 'all';
		selectedIds = [];
	}

	function clearSelection() {
		if (isBulkUpdating) return;
		selectionMode = 'ids';
		selectedIds = [];
	}

	function selectionScopeLabel(): string {
		if (selectionMode === 'all') return `semua ${selectedCount} source`;
		if (selectionMode === 'type') {
			return `semua ${selectedCount} source ${ingestionSourceKindLabel[selectedType]}`;
		}
		return `${selectedCount} source`;
	}

	async function applyBulk(isActive: boolean) {
		if (isBulkUpdating || selectedCount === 0) return;

		const count = selectedCount;
		const verb = isActive ? 'Aktifkan' : 'Nonaktifkan';
		if (
			typeof window !== 'undefined' &&
			!window.confirm(`${verb} ${selectionScopeLabel()}?`)
		) {
			return;
		}

		const payload: BulkSourceStatusPayload = { isActive };
		if (selectionMode === 'all') payload.all = true;
		else if (selectionMode === 'type') payload.type = selectedType;
		else payload.ids = [...selectedIds];

		isBulkUpdating = true;
		bulkAction = isActive;
		errorMessage = null;
		successMessage = null;
		warningMessage = null;
		try {
			const result = await bulkUpdateSourceStatusApi(payload);
			const verbPast = isActive ? 'diaktifkan' : 'dinonaktifkan';
			successMessage = `${result.updated} source ${verbPast}.`;
			if (result.updated < count) {
				warningMessage = `${result.updated} dari ${count} source diperbarui; ${count - result.updated} source mungkin sudah dihapus.`;
			}
			selectionMode = 'ids';
			selectedIds = [];
			await load();
		} catch (error) {
			errorMessage = backendMessage(error, 'Gagal memperbarui status source.');
		} finally {
			isBulkUpdating = false;
			bulkAction = null;
		}
	}

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
		if (isBulkUpdating) return;
		editing = null;
		formName = '';
		formType = 'TELEGRAM';
		formUrl = '';
		formPagination = 'DEFAULT';
		formMaxPages = '';
		formListSelector = '';
		formDetailSelector = '';
		formActive = true;
		formError = null;
		modalOpen = true;
	}

	function openEdit(source: IngestionSource) {
		if (isBulkUpdating) return;
		editing = source;
		formName = source.name;
		formType = source.type;
		formUrl = source.url;
		formPagination = source.paginationType;
		formMaxPages = source.maxPages != null ? String(source.maxPages) : '';
		formListSelector = source.listSelector ?? '';
		formDetailSelector = source.detailSelector ?? '';
		formActive = source.isActive;
		formError = null;
		modalOpen = true;
	}

	function closeModal() {
		if (isSaving) return;
		modalOpen = false;
	}

	function changeType(value: string) {
		formType = value as IngestionSourceKind;
		if (formType === 'TELEGRAM') {
			formPagination = 'DEFAULT';
			formMaxPages = '';
			formListSelector = '';
			formDetailSelector = '';
		} else if (formType === 'WEBSITE_API') {
			formListSelector = '';
			formDetailSelector = '';
			formPagination = 'WORKDAY_JSON';
		} else if (formType === 'WEBSITE_HTML' && formPagination === 'WORKDAY_JSON') {
			formPagination = 'DEFAULT';
		}
	}

	function sourceHref(source: IngestionSource): string {
		const url = source.url.trim();
		if (!url) return '#';
		if (source.type === 'TELEGRAM') {
			if (/^https?:\/\//i.test(url)) return url;
			const handle = url.startsWith('@') ? url.slice(1) : url;
			return `https://t.me/${handle}`;
		}
		return url;
	}

	function truncate(value: string, max = 48): string {
		return value.length > max ? `${value.slice(0, max - 1)}…` : value;
	}

	function buildUpdatePayload(full: IngestionSourceInput): UpdateIngestionSourceInput {
		if (!editing) return full;

		const update: UpdateIngestionSourceInput = {};
		if (full.name !== editing.name) update.name = full.name;
		if (full.type !== editing.type) update.type = full.type;
		if (full.url !== editing.url) update.url = full.url;
		if (full.paginationType !== editing.paginationType) {
			update.paginationType = full.paginationType;
		}
		if (full.type === 'TELEGRAM') {
			if (editing.maxPages !== null) update.maxPages = null;
		} else if ((full.maxPages ?? null) !== (editing.maxPages ?? null)) {
			update.maxPages = full.maxPages ?? null;
		}
		if (full.isActive !== editing.isActive) update.isActive = full.isActive;

		if (full.type === 'WEBSITE_HTML') {
			if ((full.listSelector ?? null) !== editing.listSelector) {
				update.listSelector = full.listSelector ?? null;
			}
			if ((full.detailSelector ?? null) !== editing.detailSelector) {
				update.detailSelector = full.detailSelector ?? null;
			}
		} else {
			// Clear selectors when switching away from WEBSITE_HTML.
			if (editing.listSelector !== null) update.listSelector = null;
			if (editing.detailSelector !== null) update.detailSelector = null;
		}

		return update;
	}

	async function saveSource() {
		if (isSaving) return;
		formError = null;

		const name = formName.trim();
		const url = formUrl.trim();
		if (!name) {
			formError = 'Nama sumber wajib diisi.';
			return;
		}
		if (!url) {
			formError = 'URL target / endpoint API wajib diisi.';
			return;
		}

		const isHtml = formType === 'WEBSITE_HTML';
		const isWeb = formType !== 'TELEGRAM';
		if (isHtml && !formListSelector.trim()) {
			formError = 'CSS Selector List wajib diisi untuk WEBSITE_HTML.';
			return;
		}

		let maxPages: number | null = null;
		if (isWeb && formMaxPages.trim()) {
			const parsed = Number(formMaxPages);
			if (!Number.isInteger(parsed) || parsed < 1 || parsed > 200) {
				formError = 'Max halaman harus bilangan bulat antara 1 dan 200.';
				return;
			}
			maxPages = parsed;
		}

		const payload: IngestionSourceInput = {
			name,
			type: formType,
			url,
			paginationType: formType === 'TELEGRAM' ? 'DEFAULT' : formPagination,
			maxPages: isWeb ? maxPages : null,
			listSelector: isHtml ? formListSelector.trim() : null,
			detailSelector: isHtml ? formDetailSelector.trim() || null : null,
			isActive: formActive
		};

		const targetChanged = Boolean(
			editing && (formType !== editing.type || url !== editing.url.trim())
		);

		isSaving = true;
		errorMessage = null;
		successMessage = null;
		try {
			if (editing) {
				await updateSourceApi(editing.id, buildUpdatePayload(payload));
				successMessage = `Sumber "${name}" berhasil diperbarui.${targetChanged ? ' Cursor source direset.' : ''}`;
			} else {
				await createSourceApi(payload);
				successMessage = `Sumber "${name}" berhasil ditambahkan.`;
			}
			modalOpen = false;
			await load();
		} catch (error) {
			formError = backendMessage(error, 'Sumber belum dapat disimpan.');
		} finally {
			isSaving = false;
		}
	}

	async function handleToggle(source: IngestionSource) {
		if (togglingId || isBulkUpdating) return;
		togglingId = source.id;
		errorMessage = null;
		successMessage = null;
		try {
			const updated = await toggleSourceApi(source.id);
			sources = sources.map((item) => (item.id === updated.id ? updated : item));
			successMessage = `Sumber "${updated.name}" ${updated.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`;
		} catch (error) {
			errorMessage = backendMessage(error, 'Status sumber gagal diubah.');
		} finally {
			togglingId = null;
		}
	}

	async function waitForScraperRun(runId: string): Promise<ScraperRun> {
		for (let attempt = 0; attempt < 120; attempt += 1) {
			const run = await getScraperRunApi(runId);
			if (run.status !== 'RUNNING' && run.status !== 'STOPPING') return run;
			await new Promise((resolve) => setTimeout(resolve, 2500));
		}
		throw new Error('Run masih berjalan atau menunggu stop. Silakan cek daftar run terakhir.');
	}

	async function runSource(source: IngestionSource) {
		if (runningId || isBulkUpdating || !source.isActive) return;
		if (source.type === 'TELEGRAM') {
			errorMessage =
				'Sumber Telegram dijalankan lewat kontrol Telegram Scraper di bawah daftar, bukan per sumber.';
			return;
		}
		runningId = source.id;
		errorMessage = null;
		successMessage = null;
		warningMessage = null;
		try {
			const run = await startScraperRunApi({ sourceId: source.id });
			const finished = await waitForScraperRun(run.runId);
			const result = finished.sources.find((item) => item.sourceId === source.id);
			if (finished.status === 'CANCELLED' || result?.status === 'CANCELLED') {
				warningMessage = `Scraper "${source.name}" dihentikan. ${result?.ingested ?? 0} job sempat masuk.`;
			} else if (result?.status === 'FAILED') {
				errorMessage = `Scraper "${source.name}" gagal: ${result.error ?? 'sumber tidak dapat diproses'}`;
			} else if (finished.status === 'FAILED') {
				errorMessage = `Run scraper gagal: ${finished.error ?? 'tidak ada sumber web aktif yang valid'}`;
			} else if (result) {
				successMessage = `Scraper "${source.name}" selesai: ${result.ingested} ingested, ${result.duplicates} duplikat, ${result.failed} gagal.`;
			} else {
				successMessage = `Run ${finished.status} selesai tanpa detail sumber.`;
			}
			await load();
		} catch (error) {
			errorMessage = backendMessage(error, 'Scraper gagal dijalankan.');
		} finally {
			runningId = null;
		}
	}

	async function removeSource() {
		if (!deleteTarget || isDeleting || isBulkUpdating) return;
		const target = deleteTarget;
		isDeleting = true;
		errorMessage = null;
		successMessage = null;
		warningMessage = null;
		try {
			const result = await deleteSourceApi(target.id);
			sources = sources.filter((item) => item.id !== target.id);
			selectedIds = selectedIds.filter((id) => id !== target.id);
			successMessage = `Source "${target.name}" dihapus. ${result.deletedJobs} job dan ${result.deletedImages} poster ikut dihapus.`;
			const failures = result.imageDeleteFailures ?? [];
			if (failures.length > 0) {
				warningMessage = `${failures.length} file poster gagal dihapus: ${failures
					.map((failure) => failure.path)
					.join(', ')}.`;
			}
			deleteTarget = null;
		} catch (error) {
			errorMessage = backendMessage(error, 'Sumber gagal dihapus.');
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
	<header class="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
		<div>
			<p class="text-sm font-semibold text-amber-300">Scraper Control</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight text-white">Ingestion Sources</h1>
			<p class="mt-2 text-sm text-slate-400">
				Kelola sumber Telegram, website HTML, dan endpoint API untuk scraping lowongan.
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				onclick={() => void load()}
				disabled={isLoading || isBulkUpdating}
				class="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
			>
				<RefreshCw size={15} /> Refresh
			</button>
			<button
				type="button"
				onclick={openCreate}
				disabled={isBulkUpdating}
				class="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
			>
				<Plus size={16} /> Tambah Sumber
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
	{#if warningMessage}
		<Alert
			type="warning"
			message={warningMessage}
			dismissible
			ondismiss={() => (warningMessage = null)}
		/>
	{/if}

	<details class="group overflow-hidden rounded-2xl border border-sky-500/20 bg-sky-500/5">
		<summary
			class="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden"
		>
			<span class="flex min-w-0 items-center gap-3">
				<span
					class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-300 ring-1 ring-inset ring-sky-500/30"
				>
					<Info size={16} />
				</span>
				<span class="min-w-0">
					<span class="block text-sm font-semibold text-white">Panduan singkat</span>
					<span class="mt-0.5 block text-[11px] text-slate-400">
						URL filter wilayah, selector, dan status source
					</span>
				</span>
			</span>
			<ChevronDown
				size={18}
				class="shrink-0 text-slate-400 transition group-open:rotate-180"
			/>
		</summary>
		<div class="border-t border-sky-500/10 px-5 py-4">
			<ul class="list-disc space-y-1.5 pl-4 text-xs leading-5 text-slate-300 marker:text-sky-400/60">
				<li>
					Gunakan URL hasil filter wilayah (mis. khusus kota Kudus/Semarang) agar token AI tidak
					boros.
				</li>
				<li>
					Untuk <strong class="text-white">WEBSITE_HTML</strong>, pastikan CSS Selector card list dan
					detail benar.
				</li>
				<li>
					Untuk <strong class="text-white">WEBSITE_API</strong> (seperti Workday), CSS selector
					dikosongkan karena langsung membaca JSON.
				</li>
				<li>
					Atur <strong class="text-white">maxPages</strong> 1–200 per source; kosong = default 10
					halaman.
				</li>
				<li>
					Khusus <strong class="text-white">Telegram</strong>, gunakan kontrol Telegram Scraper di
					bawah daftar; tombol Run per kartu dipakai untuk sumber web.
				</li>
				<li>
					Status <strong class="text-white">Active/Inactive</strong> hanya mengatur apakah source
					dipakai; ini bukan START/STOP listener Telegram atau web scraper.
				</li>
			</ul>
		</div>
	</details>

	<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
		<div
			class="flex flex-col gap-3 border-b border-slate-800 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between"
		>
			<div>
				<h2 class="text-sm font-semibold text-white">Daftar Sumber</h2>
				<p class="mt-1 text-xs text-slate-500">
					{#if hasFilters}
						{filteredSources.length} dari {sources.length} sumber
					{:else}
						{sources.length} sumber terdaftar
					{/if}
					· {activeCount} aktif ·
					<a
						href="#telegram-scraper"
						class="font-medium text-slate-400 underline-offset-2 transition hover:text-slate-200 hover:underline"
					>
						Kontrol Telegram
					</a>
				</p>
			</div>
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:items-center">
				<div class="relative min-w-0 sm:col-span-2 lg:col-span-1 lg:flex-1 lg:max-w-xs">
					<Search
						size={15}
						class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
					/>
					<input
						bind:value={query}
						oninput={() => (currentPage = 1)}
						disabled={isLoading}
						placeholder="Cari nama atau URL..."
						aria-label="Cari sumber"
						class={searchInputClass}
					/>
					{#if query}
						<button
							type="button"
							onclick={() => {
								query = '';
								currentPage = 1;
							}}
							class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
							aria-label="Hapus pencarian"
						>
							<X size={14} />
						</button>
					{/if}
				</div>
				<select
					value={typeFilter}
					onchange={(event) => {
						typeFilter = event.currentTarget.value as 'ALL' | IngestionSourceKind;
						currentPage = 1;
					}}
					disabled={isLoading}
					aria-label="Filter tipe sumber"
					class={filterClass}
				>
					<option value="ALL">Semua tipe</option>
					{#each sourceKinds as kind}
						<option value={kind}>{ingestionSourceKindLabel[kind]}</option>
					{/each}
				</select>
				<select
					value={statusFilter}
					onchange={(event) => {
						statusFilter = event.currentTarget.value as 'ALL' | 'ACTIVE' | 'INACTIVE';
						currentPage = 1;
					}}
					disabled={isLoading}
					aria-label="Filter status sumber"
					class={filterClass}
				>
					<option value="ALL">Semua status</option>
					<option value="ACTIVE">Active</option>
					<option value="INACTIVE">Inactive</option>
				</select>
			</div>
		</div>

		{#if isLoading}
			<div class="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
				<Spinner label="Memuat sumber" /> Memuat sumber...
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
		{:else if sources.length === 0}
			<div class="p-12 text-center">
				<h3 class="text-lg font-semibold text-white">Belum ada sumber</h3>
				<p class="mt-1 text-sm text-slate-400">
					Tambahkan sumber Telegram, website HTML, atau endpoint API untuk mulai scraping.
				</p>
				<button
					type="button"
					onclick={openCreate}
					disabled={isBulkUpdating}
					class="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
				>
					<Plus size={16} /> Tambah Sumber
				</button>
			</div>
		{:else}
			<div
				class="flex flex-col gap-3 border-b border-slate-800 bg-slate-950/30 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between"
			>
				<div class="flex flex-wrap items-center gap-2">
					<label
						class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
						title="Pilih semua source di halaman ini"
					>
						<input
							type="checkbox"
							checked={allOnPageSelected}
							onchange={(event) => toggleAllOnPage(event.currentTarget.checked)}
							disabled={isBulkUpdating}
							class="h-3.5 w-3.5 rounded border-slate-600 bg-slate-950 text-indigo-500"
						/>
						Halaman ini
					</label>
					<button
						type="button"
						onclick={selectAllTelegram}
						disabled={isBulkUpdating}
						class="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
					>
						Semua Telegram
					</button>
					<button
						type="button"
						onclick={selectAllSources}
						disabled={isBulkUpdating}
						class="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
					>
						Semua source
					</button>
					{#if selectedCount > 0}
						<span
							class="inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-1 text-[10px] font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-500/20"
						>
							{selectedCount} dipilih
						</span>
					{/if}
				</div>

				{#if selectedCount > 0}
					<div class="flex flex-wrap items-center gap-2">
						<button
							type="button"
							onclick={() => void applyBulk(true)}
							disabled={isBulkUpdating}
							class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
						>
							{#if isBulkUpdating && bulkAction === true}
								<Spinner label="Mengaktifkan source" />
							{:else}
								<CheckCircle2 size={14} />
							{/if}
							Aktifkan terpilih
						</button>
						<button
							type="button"
							onclick={() => void applyBulk(false)}
							disabled={isBulkUpdating}
							class="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-400 disabled:opacity-60"
						>
							{#if isBulkUpdating && bulkAction === false}
								<Spinner label="Menonaktifkan source" />
							{:else}
								<Ban size={14} />
							{/if}
							Nonaktifkan terpilih
						</button>
						<button
							type="button"
							onclick={clearSelection}
							disabled={isBulkUpdating}
							class="rounded-lg border border-slate-700 px-2.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
						>
							Reset
						</button>
					</div>
				{/if}
			</div>

			{#if pagedSources.length === 0}
				<div class="p-10 text-center">
					<h3 class="text-sm font-semibold text-white">Tidak ada sumber yang cocok</h3>
					<p class="mt-1 text-xs text-slate-400">Coba ubah kata kunci atau filter.</p>
					{#if hasFilters}
						<button
							type="button"
							onclick={resetFilters}
							class="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
						>
							<X size={14} /> Reset filter
						</button>
					{/if}
				</div>
			{:else}
				<div class="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
					{#each pagedSources as source (source.id)}
						<article
							class="flex flex-col rounded-xl border p-4 transition {isRowSelected(source)
								? 'border-indigo-500/40 bg-indigo-500/[0.04]'
								: 'border-slate-800 bg-slate-950/40 hover:border-slate-700'}"
						>
							<div class="flex items-start justify-between gap-3">
								<div class="flex min-w-0 items-start gap-3">
									<input
										type="checkbox"
										checked={isRowSelected(source)}
										onchange={(event) => toggleRow(source, event.currentTarget.checked)}
										disabled={isBulkUpdating}
										aria-label={`Pilih ${source.name}`}
										class="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-950 text-indigo-500"
									/>
									<div class="min-w-0">
										<h3 class="line-clamp-2 text-sm font-semibold leading-snug text-white" title={source.name}>
											{source.name}
										</h3>
										<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
											<span
												class="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset {ingestionSourceKindTone[
													source.type
												]}"
											>
												{ingestionSourceKindLabel[source.type]}
											</span>
										</div>
										{#if source.type !== 'TELEGRAM'}
											<p class="mt-1 text-[10px] text-slate-500">
												{ingestionPaginationLabel[source.paginationType]} · maks {source.maxPages ??
													10} halaman
											</p>
										{/if}
									</div>
								</div>
								<button
									type="button"
									role="switch"
									aria-checked={source.isActive}
									aria-label="Aktifkan/matikan {source.name}"
									title={source.isActive ? 'Nonaktifkan source' : 'Aktifkan source'}
									onclick={() => void handleToggle(source)}
									disabled={togglingId === source.id || isBulkUpdating}
									class="relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition {source.isActive
										? 'bg-emerald-500'
										: 'bg-slate-700'} disabled:opacity-60"
								>
									<span
										class="inline-block size-4 transform rounded-full bg-white transition {source.isActive
											? 'translate-x-4'
											: 'translate-x-0.5'}"
									></span>
								</button>
							</div>

							{#if source.url}
								<a
									href={sourceHref(source)}
									target="_blank"
									rel="noreferrer"
									class="mt-3 flex min-w-0 items-center gap-1.5 text-xs text-indigo-300 transition hover:text-indigo-200"
									title={source.url}
								>
									<ExternalLink size={12} class="shrink-0" />
									<span class="truncate">{truncate(source.url, 64)}</span>
								</a>
							{:else}
								<span class="mt-3 text-xs text-slate-500">—</span>
							{/if}

							{#if source.statusMessage}
								<p
									class="mt-1.5 line-clamp-2 text-[11px] leading-4 text-slate-500"
									title={source.statusMessage}
								>
									{source.statusMessage}
								</p>
							{/if}

							<div
								class="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-[11px]"
							>
								<div>
									<p class="text-slate-500">Status</p>
									<p
										class="mt-0.5 font-semibold {source.isActive
											? 'text-emerald-300'
											: 'text-slate-400'}"
									>
										{source.isActive ? 'Active' : 'Inactive'}
									</p>
								</div>
								<div>
									<p class="text-slate-500">Terakhir</p>
									<p class="mt-0.5 font-medium text-slate-300">{formatDate(source.lastScrapedAt)}</p>
								</div>
							</div>

							<div class="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-800 pt-3">
								<button
									type="button"
									onclick={() => void runSource(source)}
									disabled={runningId === source.id ||
										isBulkUpdating ||
										!source.isActive ||
										source.type === 'TELEGRAM'}
									title={source.type === 'TELEGRAM'
										? 'Telegram memakai kontrol Telegram Scraper di atas'
										: !source.isActive
											? 'Aktifkan sumber terlebih dahulu'
											: `Jalankan scraper sekarang (maks ${source.maxPages ?? 10} halaman)`}
									class="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-emerald-500/30 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40"
								>
									{#if runningId === source.id}
										<Spinner label="Menjalankan scraper" />
									{:else}
										<Play size={13} />
									{/if}
									Run
								</button>
								<button
									type="button"
									onclick={() => openEdit(source)}
									disabled={isBulkUpdating}
									class="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-40"
								>
									<Pencil size={13} /> Edit
								</button>
								<button
									type="button"
									onclick={() => (deleteTarget = source)}
									disabled={isBulkUpdating}
									title="Hapus permanen source beserta semua job dan poster"
									class="ml-auto inline-flex items-center gap-1 rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
								>
									<Trash2 size={13} /> Hapus
								</button>
							</div>
						</article>
					{/each}
				</div>

				{#if totalPages > 1}
					<div
						class="flex flex-col gap-3 border-t border-slate-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
					>
						<p class="text-xs text-slate-500">
							Menampilkan {pageStart}–{pageEnd} dari {filteredSources.length} sumber
						</p>
						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={() => goToPage(safePage - 1)}
								disabled={safePage <= 1 || isBulkUpdating}
								class="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-700 px-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
							>
								<ChevronLeft size={14} /> Sebelumnya
							</button>
							<span class="min-w-24 text-center text-xs font-medium text-slate-400">
								Halaman {safePage} / {totalPages}
							</span>
							<button
								type="button"
								onclick={() => goToPage(safePage + 1)}
								disabled={safePage >= totalPages || isBulkUpdating}
								class="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-700 px-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
							>
								Berikutnya <ChevronRight size={14} />
							</button>
						</div>
					</div>
				{/if}
			{/if}
		{/if}
	</div>

	<div id="telegram-scraper" class="scroll-mt-24">
		<TelegramScraperControl onchanged={() => void load()} />
	</div>
</div>

<Modal
	open={modalOpen}
	title={editing ? 'Edit Sumber Ingestion' : 'Tambah Sumber Ingestion'}
	description="Konfigurasi sumber scraping, URL target, pagination, dan batas halaman."
	size="lg"
	onclose={closeModal}
>
	<div class="space-y-4">
		<div class="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
			<p class="text-[11px] leading-5 text-sky-100/80">
				Gunakan URL filter wilayah agar token AI hemat. <strong>WEBSITE_HTML</strong> wajib CSS
				Selector List (Detail opsional); <strong>WEBSITE_API</strong> (Workday) kosongkan CSS
				selector.
			</p>
		</div>

		{#if formError}
			<Alert type="error" message={formError} />
		{/if}

		{#if editing && editTargetChanged}
			<Alert
				type="warning"
				message="Mengubah tipe atau URL akan mereset cursor source (lastMessageId dan statusMessage)."
			/>
		{/if}

		<label class="block space-y-1.5 text-sm font-medium text-slate-300">
			Nama Sumber <span class="text-rose-400">*</span>
			<input
				bind:value={formName}
				maxlength="160"
				placeholder="Contoh: Loker Muria Kudus"
				class={inputClass}
			/>
		</label>

		<div class={`grid gap-4 ${formType === 'TELEGRAM' ? '' : 'sm:grid-cols-3'}`}>
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Tipe Sumber
				<select
					value={formType}
					onchange={(event) => changeType(event.currentTarget.value)}
					class={inputClass}
				>
					{#each sourceKinds as kind}
						<option value={kind}>{ingestionSourceKindLabel[kind]}</option>
					{/each}
				</select>
			</label>

			{#if formType !== 'TELEGRAM'}
				<label class="block space-y-1.5 text-sm font-medium text-slate-300">
					Tipe Pagination
					<select
						value={formPagination}
						onchange={(event) =>
							(formPagination = event.currentTarget.value as IngestionPaginationType)}
						class={inputClass}
					>
						{#each paginationTypes as pagination}
							<option value={pagination}>{ingestionPaginationLabel[pagination]}</option>
						{/each}
					</select>
					{#if formType === 'WEBSITE_API'}
						<p class="text-[10px] font-normal text-slate-500">
							Workday CXS umumnya memakai WORKDAY_JSON.
						</p>
					{/if}
				</label>

				<label class="block space-y-1.5 text-sm font-medium text-slate-300">
					Max Halaman
					<input
						type="number"
						min="1"
						max="200"
						step="1"
						value={formMaxPages}
						oninput={(event) => (formMaxPages = event.currentTarget.value)}
						placeholder="Default 10"
						class={inputClass}
					/>
					<p class="text-[10px] font-normal text-slate-500">1–200; kosong = default 10.</p>
				</label>
			{/if}
		</div>

		<label class="block space-y-1.5 text-sm font-medium text-slate-300">
			URL Target / Endpoint API <span class="text-rose-400">*</span>
			<input
				bind:value={formUrl}
				maxlength="500"
				placeholder={formType === 'TELEGRAM'
					? 'https://t.me/lokerjogjaid atau @lokerjogjaid'
					: formType === 'WEBSITE_API'
						? 'https://.../wday/cxs/.../jobs'
						: 'https://contoh.com/lowongan'}
				class={inputClass}
			/>
		</label>

		{#if formType === 'WEBSITE_HTML'}
			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block space-y-1.5 text-sm font-medium text-slate-300">
					CSS Selector List <span class="text-rose-400">*</span>
					<input
						bind:value={formListSelector}
						maxlength="500"
						placeholder=".job-card, .loker-item"
						class={inputClass}
					/>
				</label>
				<label class="block space-y-1.5 text-sm font-medium text-slate-300">
					CSS Selector Detail
					<span class="text-[10px] font-normal text-slate-500">(opsional)</span>
					<input
						bind:value={formDetailSelector}
						maxlength="500"
						placeholder=".job-detail, .entry-content"
						class={inputClass}
					/>
				</label>
			</div>
			<p class="text-[11px] leading-5 text-slate-500">
				Selector list mengambil kartu lowongan; selector detail mengambil konten pada halaman detail.
			</p>
		{/if}

		<div
			class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 p-3"
		>
			<div>
				<p class="text-sm font-medium text-slate-300">Status Sumber</p>
				<p class="text-[11px] text-slate-500">
					{formActive ? 'Active — sumber akan diproses' : 'Inactive — sumber diabaikan'}
				</p>
			</div>
			<button
				type="button"
				role="switch"
				aria-checked={formActive}
				aria-label="Aktifkan atau nonaktifkan status sumber"
				onclick={() => (formActive = !formActive)}
				class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition {formActive
					? 'bg-emerald-500'
					: 'bg-slate-700'}"
			>
				<span
					class="inline-block size-4 transform rounded-full bg-white transition {formActive
						? 'translate-x-4'
						: 'translate-x-0.5'}"
				></span>
			</button>
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
			{editing ? 'Simpan Perubahan' : 'Tambah Sumber'}
		</button>
	{/snippet}
</Modal>

<Modal
	open={deleteTarget !== null}
	title="Hapus permanen source?"
	description="Tindakan ini tidak bisa dibatalkan."
	onclose={() => (isDeleting ? undefined : (deleteTarget = null))}
>
	{#if deleteTarget}
		<div class="space-y-3">
			<p class="text-sm leading-6 text-slate-300">
				Hapus source <strong class="text-white">{deleteTarget.name}</strong> beserta
				<strong class="text-white">semua job hasil scraping</strong> dan
				<strong class="text-white">file poster</strong>-nya?
			</p>
			<div class="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
				<p class="text-xs leading-5 text-rose-200">
					Semua job dengan sourceId ini akan dihapus permanen. Log biaya AI tetap disimpan.
					Tindakan ini tidak bisa dibatalkan.
				</p>
			</div>
		</div>
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
			Hapus Permanen
		</button>
	{/snippet}
</Modal>
