<script lang="ts">
	import { onMount } from 'svelte';
	import { Coins, Pencil, Plus, RefreshCw, Star, Trash2 } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/superadmin/Alert.svelte';
	import Modal from '#lib/components/superadmin/Modal.svelte';
	import { formatNumber, formatRupiah } from '#lib/utils/billing.js';
	import {
		createTopupPackageApi,
		deleteTopupPackageApi,
		listTopupPackagesApi,
		toggleTopupPackageApi,
		updateTopupPackageApi,
		type CreditTopupPackage
	} from '#lib/services/superadminApi.js';

	const inputClass =
		'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30';

	let packages = $state<CreditTopupPackage[]>([]);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	let modalOpen = $state(false);
	let editing = $state<CreditTopupPackage | null>(null);
	let formName = $state('');
	let formDescription = $state('');
	let formCredits = $state('20');
	let formBonusCredits = $state('0');
	let formPrice = $state('10000');
	let formBadge = $state('');
	let formIsPopular = $state(false);
	let formSortOrder = $state('0');
	let formActive = $state(true);
	let isSaving = $state(false);
	let formError = $state<string | null>(null);

	let deleteTarget = $state<CreditTopupPackage | null>(null);
	let isDeleting = $state(false);
	let togglingId = $state<string | null>(null);

	const previewTotalCredits = $derived(
		Math.max(0, Number(formCredits) || 0) + Math.max(0, Number(formBonusCredits) || 0)
	);
	const previewPricePerCredit = $derived(
		previewTotalCredits > 0 ? Math.max(0, Number(formPrice) || 0) / previewTotalCredits : 0
	);

	function errorText(error: unknown, fallback: string): string {
		return error instanceof Error ? error.message : fallback;
	}

	function openCreate() {
		editing = null;
		formName = '';
		formDescription = '';
		formCredits = '20';
		formBonusCredits = '0';
		formPrice = '10000';
		formBadge = '';
		formIsPopular = false;
		formSortOrder = '0';
		formActive = true;
		formError = null;
		modalOpen = true;
	}

	function openEdit(pkg: CreditTopupPackage) {
		editing = pkg;
		formName = pkg.name;
		formDescription = pkg.description ?? '';
		formCredits = String(pkg.credits);
		formBonusCredits = String(pkg.bonusCredits);
		formPrice = String(pkg.priceIdr);
		formBadge = pkg.badge ?? '';
		formIsPopular = pkg.isPopular;
		formSortOrder = String(pkg.sortOrder);
		formActive = pkg.isActive;
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

		const name = formName.trim();
		const description = formDescription.trim();
		const credits = Number(formCredits);
		const bonusCredits = Number(formBonusCredits);
		const priceIdr = Number(formPrice);
		const badge = formBadge.trim();
		const sortOrder = Number(formSortOrder);

		if (!name) {
			formError = 'Nama bundle wajib diisi.';
			return;
		}
		if (name.length > 160) {
			formError = 'Nama bundle maksimal 160 karakter.';
			return;
		}
		if (description.length > 1000) {
			formError = 'Deskripsi maksimal 1000 karakter.';
			return;
		}
		if (!Number.isInteger(credits) || credits < 1) {
			formError = 'Kredit dasar harus bilangan bulat ≥ 1.';
			return;
		}
		if (!Number.isInteger(bonusCredits) || bonusCredits < 0) {
			formError = 'Bonus kredit harus bilangan bulat ≥ 0.';
			return;
		}
		if (!Number.isFinite(priceIdr) || priceIdr < 0) {
			formError = 'Harga harus angka ≥ 0.';
			return;
		}
		if (badge.length > 80) {
			formError = 'Badge maksimal 80 karakter.';
			return;
		}
		if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 1000) {
			formError = 'Urutan tampil harus bilangan bulat 0–1000.';
			return;
		}

		isSaving = true;
		errorMessage = null;
		successMessage = null;
		try {
			const payload = {
				name,
				description: description || null,
				credits,
				bonusCredits,
				priceIdr,
				badge: badge || null,
				isPopular: formIsPopular,
				sortOrder,
				isActive: formActive
			};
			if (editing) {
				await updateTopupPackageApi(editing.id, payload);
				successMessage = 'Paket top-up berhasil diperbarui.';
			} else {
				await createTopupPackageApi(payload);
				successMessage = 'Paket top-up baru berhasil dibuat.';
			}
			modalOpen = false;
			await load();
		} catch (error) {
			formError = errorText(error, 'Paket top-up belum dapat disimpan.');
		} finally {
			isSaving = false;
		}
	}

	async function handleToggle(pkg: CreditTopupPackage) {
		if (togglingId) return;
		togglingId = pkg.id;
		errorMessage = null;
		successMessage = null;
		try {
			const updated = await toggleTopupPackageApi(pkg.id);
			packages = packages.map((item) => (item.id === updated.id ? updated : item));
			successMessage = `Paket "${updated.name}" ${updated.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`;
		} catch (error) {
			errorMessage = errorText(error, 'Status paket top-up belum dapat diubah.');
		} finally {
			togglingId = null;
		}
	}

	async function removePackage() {
		if (!deleteTarget || isDeleting) return;
		const target = deleteTarget;
		isDeleting = true;
		errorMessage = null;
		successMessage = null;
		try {
			await deleteTopupPackageApi(target.id);
			deleteTarget = null;
			successMessage = `Paket "${target.name}" berhasil dihapus.`;
			await load();
		} catch (error) {
			errorMessage = errorText(error, 'Paket top-up belum dapat dihapus.');
			deleteTarget = null;
		} finally {
			isDeleting = false;
		}
	}

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			packages = await listTopupPackagesApi();
		} catch (error) {
			loadError = errorText(error, 'Daftar paket top-up belum dapat dimuat.');
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>Top-up Packages | Superadmin</title>
</svelte:head>

<div class="space-y-6">
	<header class="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
		<div>
			<p class="text-sm font-semibold text-amber-300">Monetization</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight text-white">Credit Top-up Packages</h1>
			<p class="mt-2 text-sm text-slate-400">
				Kelola bundle kredit AI yang tampil di halaman top-up user.
			</p>
		</div>
		<button
			type="button"
			onclick={openCreate}
			class="inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400"
		>
			<Plus size={16} /> Tambah Bundle
		</button>
	</header>

	{#if errorMessage}
		<Alert type="error" message={errorMessage} dismissible ondismiss={() => (errorMessage = null)} />
	{/if}
	{#if successMessage}
		<Alert type="success" message={successMessage} dismissible ondismiss={() => (successMessage = null)} />
	{/if}

	{#if isLoading}
		<div class="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
			<Spinner label="Memuat paket top-up" /> Memuat paket top-up...
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
	{:else if packages.length === 0}
		<div class="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center">
			<span class="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
				<Coins size={24} />
			</span>
			<h2 class="mt-4 text-lg font-semibold text-white">Belum ada paket top-up</h2>
			<p class="mt-1 text-sm text-slate-400">Tambahkan bundle kredit pertama untuk user.</p>
			<button
				type="button"
				onclick={openCreate}
				class="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400"
			>
				<Plus size={16} /> Tambah Bundle
			</button>
		</div>
	{:else}
		<div class="grid gap-4 xl:grid-cols-2">
			{#each packages as pkg (pkg.id)}
				<article class="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5 {pkg.isPopular ? 'ring-1 ring-inset ring-violet-500/40' : ''}">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-1.5">
								{#if pkg.isPopular}
									<span class="rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold text-violet-300 ring-1 ring-inset ring-violet-500/20">
										<Star size={10} class="mr-1 inline" /> Popular
									</span>
								{/if}
								{#if pkg.badge}
									<span class="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-300 ring-1 ring-inset ring-amber-500/20">
										{pkg.badge}
									</span>
								{/if}
							</div>
							<h2 class="mt-2 text-lg font-bold text-white">{pkg.name}</h2>
							{#if pkg.description}
								<p class="mt-1 text-xs leading-5 text-slate-400">{pkg.description}</p>
							{/if}
						</div>
						<button
							type="button"
							role="switch"
							aria-checked={pkg.isActive}
							aria-label="Aktifkan/nonaktifkan {pkg.name}"
							onclick={() => void handleToggle(pkg)}
							disabled={togglingId === pkg.id}
							class="relative mt-1 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition {pkg.isActive
								? 'bg-emerald-500'
								: 'bg-slate-700'} disabled:opacity-60"
						>
							<span
								class="inline-block size-4 transform rounded-full bg-white transition {pkg.isActive
									? 'translate-x-4'
									: 'translate-x-0.5'}"
							></span>
						</button>
					</div>

					<div class="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
						<span class="text-2xl font-bold text-white">{formatRupiah(pkg.priceIdr)}</span>
						<span class="text-xs text-slate-500">
							{formatNumber(pkg.totalCredits)} kredit · ± {formatRupiah(pkg.pricePerCreditIdr)}/kredit
						</span>
					</div>

					<div class="mt-3 grid grid-cols-3 gap-2">
						<div class="rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2">
							<p class="text-[9px] uppercase tracking-wide text-slate-500">Kredit dasar</p>
							<p class="mt-0.5 font-semibold text-slate-200">{formatNumber(pkg.credits)}</p>
						</div>
						<div class="rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2">
							<p class="text-[9px] uppercase tracking-wide text-slate-500">Bonus</p>
							<p class="mt-0.5 font-semibold text-emerald-300">{formatNumber(pkg.bonusCredits)}</p>
						</div>
						<div class="rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2">
							<p class="text-[9px] uppercase tracking-wide text-slate-500">Total</p>
							<p class="mt-0.5 font-semibold text-slate-200">{formatNumber(pkg.totalCredits)}</p>
						</div>
					</div>

					<div class="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
						<span class="text-[10px] text-slate-500">Urutan {pkg.sortOrder}</span>
						<div class="ml-auto flex gap-1.5">
							<button
								type="button"
								onclick={() => openEdit(pkg)}
								class="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-200"
							>
								<Pencil size={13} /> Edit
							</button>
							<button
								type="button"
								onclick={() => (deleteTarget = pkg)}
								class="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10"
							>
								<Trash2 size={13} /> Hapus
							</button>
						</div>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>

<Modal
	open={modalOpen}
	title={editing ? 'Edit Paket Top-up' : 'Tambah Paket Top-up'}
	description="Bundle kredit yang tampil di halaman top-up user."
	size="lg"
	onclose={closeModal}
>
	<div class="space-y-4">
		{#if formError}
			<Alert type="error" message={formError} />
		{/if}

		<label class="block space-y-1.5 text-sm font-medium text-slate-300">
			Nama bundle <span class="text-rose-400">*</span>
			<input bind:value={formName} maxlength="160" placeholder="Contoh: Top Up 50 Kredit" class={inputClass} />
		</label>

		<label class="block space-y-1.5 text-sm font-medium text-slate-300">
			Deskripsi
			<textarea
				bind:value={formDescription}
				maxlength="1000"
				rows="3"
				placeholder="Deskripsi singkat bundle"
				class="{inputClass} resize-y"
			></textarea>
		</label>

		<div class="grid gap-4 sm:grid-cols-2">
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Kredit dasar <span class="text-rose-400">*</span>
				<input bind:value={formCredits} type="number" min="1" class={inputClass} />
			</label>
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Bonus kredit
				<input bind:value={formBonusCredits} type="number" min="0" class={inputClass} />
			</label>
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Harga (IDR) <span class="text-rose-400">*</span>
				<input bind:value={formPrice} type="number" min="0" class={inputClass} />
			</label>
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Badge
				<input bind:value={formBadge} maxlength="80" placeholder="Contoh: Paling Hemat" class={inputClass} />
			</label>
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Urutan tampil
				<input bind:value={formSortOrder} type="number" min="0" max="1000" class={inputClass} />
			</label>
			<div class="flex flex-col justify-end gap-3">
				<label class="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300">
					<input type="checkbox" bind:checked={formIsPopular} class="h-4 w-4 rounded border-slate-600 bg-slate-950 text-indigo-500" />
					Tandai popular
				</label>
				<label class="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300">
					<input type="checkbox" bind:checked={formActive} class="h-4 w-4 rounded border-slate-600 bg-slate-950 text-indigo-500" />
					Aktif / tampil ke user
				</label>
			</div>
		</div>

		<div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
			<div>
				<p class="text-xs font-medium text-slate-300">Preview bundle</p>
				<p class="text-[11px] text-slate-500">
					{formatNumber(previewTotalCredits)} kredit · ±
					{formatRupiah(previewPricePerCredit)} / kredit
				</p>
			</div>
			<p class="text-lg font-bold text-emerald-300">{formatRupiah(Number(formPrice) || 0)}</p>
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
			onclick={() => void savePackage()}
			disabled={isSaving}
			class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
		>
			{#if isSaving}<Spinner label="Menyimpan paket top-up" />{/if}
			{editing ? 'Simpan Perubahan' : 'Tambah Bundle'}
		</button>
	{/snippet}
</Modal>

<Modal
	open={deleteTarget !== null}
	title="Hapus paket top-up?"
	description="Paket akan dihapus dari halaman user."
	onclose={() => (isDeleting ? undefined : (deleteTarget = null))}
>
	{#if deleteTarget}
		<p class="text-sm text-slate-300">
			Hapus <strong class="text-white">{deleteTarget.name}</strong>?
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
			onclick={() => void removePackage()}
			disabled={isDeleting}
			class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-60"
		>
			{#if isDeleting}<Spinner label="Menghapus paket top-up" />{/if}
			Hapus
		</button>
	{/snippet}
</Modal>
