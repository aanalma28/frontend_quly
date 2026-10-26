<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		BookOpen,
		Plus,
		Pencil,
		RefreshCw,
		Trash2
	} from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/onboarding/Alert.svelte';
	import Modal from '#lib/components/admin/Modal.svelte';
	import { ApiError } from '#lib/utils/api.js';
	import { categoryLabel, categoryTone, formatDate } from '#lib/components/psychotest/labels.js';
	import {
		createAdminPackageApi,
		deleteAdminPackageApi,
		listAdminPackagesApi,
		updateAdminPackageApi,
		type AdminPackageListItem,
		type AdminPackagesResponse,
		type PsychotestCategory
	} from '#lib/services/adminPsychotestApi.js';

	let data = $state<AdminPackagesResponse | null>(null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	let modalOpen = $state(false);
	let editing = $state<AdminPackageListItem | null>(null);
	let formTitle = $state('');
	let formCategory = $state<PsychotestCategory>('PERSONALITY');
	let formDescription = $state('');
	let formDuration = $state('30');
	let isSaving = $state(false);
	let formError = $state<string | null>(null);

	let deleteTarget = $state<AdminPackageListItem | null>(null);
	let isDeleting = $state(false);

	const categories: PsychotestCategory[] = ['PERSONALITY', 'COGNITIVE', 'ACCURACY'];

	function errorText(error: unknown, fallback: string): string {
		if (error instanceof ApiError) {
			if (error.status === 403) return 'Akses admin diperlukan untuk melakukan aksi ini.';
			return error.message;
		}
		return error instanceof Error ? error.message : fallback;
	}

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			data = await listAdminPackagesApi();
		} catch (error) {
			loadError = errorText(error, 'Daftar paket belum dapat dimuat.');
		} finally {
			isLoading = false;
		}
	}

	function openCreate() {
		editing = null;
		formTitle = '';
		formCategory = 'PERSONALITY';
		formDescription = '';
		formDuration = '30';
		formError = null;
		modalOpen = true;
	}

	function openEdit(pkg: AdminPackageListItem) {
		editing = pkg;
		formTitle = pkg.title;
		formCategory = pkg.category;
		formDescription = pkg.description ?? '';
		formDuration = String(pkg.durationMin);
		formError = null;
		modalOpen = true;
	}

	function closeModal() {
		if (isSaving) return;
		modalOpen = false;
	}

	async function savePackage() {
		if (isSaving) return;
		formError = null;

		const title = formTitle.trim();
		const duration = Number(formDuration);
		if (!title) {
			formError = 'Judul paket wajib diisi.';
			return;
		}
		if (!Number.isInteger(duration) || duration < 1 || duration > 480) {
			formError = 'Durasi harus bilangan bulat antara 1 dan 480 menit.';
			return;
		}

		isSaving = true;
		successMessage = null;
		errorMessage = null;
		try {
			const payload = {
				title,
				category: formCategory,
				description: formDescription.trim() || undefined,
				durationMin: duration
			};
			if (editing) {
				await updateAdminPackageApi(editing.id, payload);
				successMessage = 'Paket tes berhasil diperbarui.';
			} else {
				await createAdminPackageApi(payload);
				successMessage = 'Paket tes baru berhasil dibuat.';
			}
			modalOpen = false;
			await load();
		} catch (error) {
			formError = errorText(error, 'Paket tes belum dapat disimpan.');
		} finally {
			isSaving = false;
		}
	}

	function confirmDelete(pkg: AdminPackageListItem) {
		deleteTarget = pkg;
	}

	async function removePackage() {
		if (!deleteTarget || isDeleting) return;
		isDeleting = true;
		errorMessage = null;
		successMessage = null;
		const target = deleteTarget;
		try {
			await deleteAdminPackageApi(target.id);
			deleteTarget = null;
			successMessage = `Paket "${target.title}" berhasil dihapus.`;
			await load();
		} catch (error) {
			errorMessage = errorText(error, 'Paket tes belum dapat dihapus.');
			deleteTarget = null;
		} finally {
			isDeleting = false;
		}
	}

	function manageQuestions(pkg: AdminPackageListItem) {
		void goto(`/admin/psychotest/packages/${pkg.id}/questions`);
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>Daftar Paket Tes | Admin Psikotes</title>
</svelte:head>

<div class="space-y-6">
	<header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
		<div>
			<p class="text-sm font-semibold text-indigo-600">Admin Psikotes</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight text-slate-950">Daftar Paket Tes</h1>
			<p class="mt-2 text-sm text-slate-600">
				Kelola paket psikotes, soal, dan pantau performa kandidat.
			</p>
		</div>
		<button
			type="button"
			onclick={openCreate}
			class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
		>
			<Plus size={16} /> Tambah Paket Tes Baru
		</button>
	</header>

	{#if errorMessage}
		<Alert type="error" message={errorMessage} dismissible ondismiss={() => (errorMessage = null)} />
	{/if}
	{#if successMessage}
		<Alert type="success" message={successMessage} dismissible ondismiss={() => (successMessage = null)} />
	{/if}

	{#if data}
		<section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
			<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<p class="text-xs font-medium text-slate-500">Total paket</p>
				<p class="mt-1 text-2xl font-bold text-slate-950">{data.summary.totalPackages}</p>
			</div>
			<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<p class="text-xs font-medium text-slate-500">Total soal</p>
				<p class="mt-1 text-2xl font-bold text-slate-950">{data.summary.totalQuestions}</p>
			</div>
			<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<p class="text-xs font-medium text-slate-500">Attempt selesai</p>
				<p class="mt-1 text-2xl font-bold text-slate-950">
					{data.summary.totalCompletedAttempts}/{data.summary.totalAttempts}
				</p>
			</div>
			<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<p class="text-xs font-medium text-slate-500">Rata-rata akurasi</p>
				<p class="mt-1 text-2xl font-bold text-slate-950">
					{data.summary.averageAccuracy ?? '—'}{data.summary.averageAccuracy !== null ? '%' : ''}
				</p>
			</div>
		</section>
	{/if}

	{#if isLoading}
		<div class="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
			<Spinner label="Memuat paket" /> Memuat paket tes...
		</div>
	{:else if loadError}
		<div class="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
			<p class="text-sm text-rose-700" role="alert">{loadError}</p>
			<button
				type="button"
				onclick={() => void load()}
				class="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
			>
				<RefreshCw size={15} /> Coba lagi
			</button>
		</div>
	{:else if data && data.items.length === 0}
		<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
			<span class="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
				<BookOpen size={24} />
			</span>
			<h2 class="mt-4 text-lg font-semibold text-slate-900">Belum ada paket tes</h2>
			<p class="mt-1 text-sm text-slate-500">Buat paket tes pertama untuk mulai menambahkan soal.</p>
			<button
				type="button"
				onclick={openCreate}
				class="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
			>
				<Plus size={16} /> Tambah Paket Tes Baru
			</button>
		</div>
	{:else if data}
		<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-slate-200 text-sm">
					<thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
						<tr>
							<th class="px-5 py-3">Paket</th>
							<th class="px-5 py-3">Kategori</th>
							<th class="px-5 py-3">Durasi</th>
							<th class="px-5 py-3">Soal</th>
							<th class="px-5 py-3">Attempt</th>
							<th class="px-5 py-3">Akurasi</th>
							<th class="px-5 py-3 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#each data.items as pkg (pkg.id)}
							<tr class="hover:bg-slate-50/60">
								<td class="px-5 py-4">
									<p class="font-semibold text-slate-900">{pkg.title}</p>
									{#if pkg.description}
										<p class="mt-0.5 line-clamp-1 max-w-xs text-xs text-slate-500">{pkg.description}</p>
									{/if}
									<p class="mt-0.5 text-[11px] text-slate-400">
										Dibuat {formatDate(pkg.createdAt)}
									</p>
								</td>
								<td class="px-5 py-4">
									<span class="rounded-full px-2.5 py-1 text-[11px] font-semibold {categoryTone[pkg.category]}">
										{categoryLabel[pkg.category]}
									</span>
								</td>
								<td class="px-5 py-4 text-slate-700">{pkg.durationMin} menit</td>
								<td class="px-5 py-4 text-slate-700">{pkg.questionCount}</td>
								<td class="px-5 py-4 text-slate-700">
									{pkg.completedAttemptCount}/{pkg.attemptCount}
								</td>
								<td class="px-5 py-4 text-slate-700">
									{pkg.averageAccuracy ?? '—'}{pkg.averageAccuracy !== null ? '%' : ''}
								</td>
								<td class="px-5 py-4">
									<div class="flex flex-wrap justify-end gap-1.5">
										<button
											type="button"
											onclick={() => manageQuestions(pkg)}
											class="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
										>
											<BookOpen size={13} /> Soal
										</button>
										<button
											type="button"
											onclick={() => openEdit(pkg)}
											class="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
										>
											<Pencil size={13} /> Edit
										</button>
										<button
											type="button"
											onclick={() => confirmDelete(pkg)}
											class="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
										>
											<Trash2 size={13} /> Hapus
										</button>
									</div>
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
	title={editing ? 'Edit Paket Tes' : 'Tambah Paket Tes Baru'}
	description="Isi detail paket tes psikotes."
	onclose={closeModal}
>
	<div class="space-y-4">
		{#if formError}
			<Alert type="error" message={formError} />
		{/if}
		<label class="block space-y-1.5 text-sm font-medium text-slate-700">
			Judul paket <span class="text-rose-600">*</span>
			<input
				bind:value={formTitle}
				maxlength="160"
				placeholder="Contoh: Tes Kepribadian DISC"
				class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
			/>
		</label>
		<div class="grid gap-4 sm:grid-cols-2">
			<label class="block space-y-1.5 text-sm font-medium text-slate-700">
				Kategori <span class="text-rose-600">*</span>
				<select
					bind:value={formCategory}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
				>
					{#each categories as category}
						<option value={category}>{categoryLabel[category]}</option>
					{/each}
				</select>
			</label>
			<label class="block space-y-1.5 text-sm font-medium text-slate-700">
				Durasi (menit) <span class="text-rose-600">*</span>
				<input
					bind:value={formDuration}
					type="number"
					min="1"
					max="480"
					class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
				/>
			</label>
		</div>
		<label class="block space-y-1.5 text-sm font-medium text-slate-700">
			Deskripsi
			<textarea
				bind:value={formDescription}
				rows="3"
				maxlength="2000"
				placeholder="Deskripsi singkat paket tes (opsional)"
				class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
			></textarea>
		</label>
	</div>

	{#snippet footer()}
		<button
			type="button"
			onclick={closeModal}
			disabled={isSaving}
			class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
		>
			Batal
		</button>
		<button
			type="button"
			onclick={() => void savePackage()}
			disabled={isSaving}
			class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
		>
			{#if isSaving}<Spinner label="Menyimpan" />{/if}
			{editing ? 'Simpan Perubahan' : 'Buat Paket'}
		</button>
	{/snippet}
</Modal>

<Modal
	open={deleteTarget !== null}
	title="Hapus paket tes?"
	description="Soal dan data attempt terkait paket ini juga akan terhapus."
	onclose={() => (isDeleting ? undefined : (deleteTarget = null))}
>
	{#if deleteTarget}
		<p class="text-sm text-slate-600">
			Apakah kamu yakin ingin menghapus <strong>{deleteTarget.title}</strong>? Tindakan ini tidak
			dapat dibatalkan.
		</p>
	{/if}

	{#snippet footer()}
		<button
			type="button"
			onclick={() => (deleteTarget = null)}
			disabled={isDeleting}
			class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
		>
			Batal
		</button>
		<button
			type="button"
			onclick={() => void removePackage()}
			disabled={isDeleting}
			class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
		>
			{#if isDeleting}<Spinner label="Menghapus" />{/if}
			Hapus
		</button>
	{/snippet}
</Modal>
