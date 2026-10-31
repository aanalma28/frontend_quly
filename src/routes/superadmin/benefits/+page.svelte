<script lang="ts">
	import { onMount } from 'svelte';
	import { Award, Pencil, Plus, RefreshCw, Trash2 } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/superadmin/Alert.svelte';
	import Modal from '#lib/components/superadmin/Modal.svelte';
	import { formatNumber, formatRupiah } from '#lib/utils/billing.js';
	import {
		createBenefitApi,
		deleteBenefitApi,
		listBenefitsApi,
		toggleBenefitApi,
		updateBenefitApi,
		type Benefit
	} from '#lib/services/superadminApi.js';

	const inputClass =
		'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30';

	let benefits = $state<Benefit[]>([]);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	let modalOpen = $state(false);
	let editing = $state<Benefit | null>(null);
	let formCode = $state('');
	let formName = $state('');
	let formDescription = $state('');
	let formUnit = $state('usage');
	let formCreditCost = $state('0');
	let formCreditPrice = $state('200');
	let formActive = $state(true);
	let isSaving = $state(false);
	let formError = $state<string | null>(null);

	let deleteTarget = $state<Benefit | null>(null);
	let isDeleting = $state(false);
	let togglingId = $state<string | null>(null);

	function errorText(error: unknown, fallback: string): string {
		return error instanceof Error ? error.message : fallback;
	}

	function openCreate() {
		editing = null;
		formCode = '';
		formName = '';
		formDescription = '';
		formUnit = 'usage';
		formCreditCost = '0';
		formCreditPrice = '200';
		formActive = true;
		formError = null;
		modalOpen = true;
	}

	function openEdit(benefit: Benefit) {
		editing = benefit;
		formCode = benefit.code;
		formName = benefit.name;
		formDescription = benefit.description ?? '';
		formUnit = benefit.unit;
		formCreditCost = String(benefit.creditCost);
		formCreditPrice = String(benefit.creditPriceIdr);
		formActive = benefit.isActive;
		formError = null;
		modalOpen = true;
	}

	function closeModal() {
		if (isSaving) return;
		modalOpen = false;
	}

	async function saveBenefit() {
		if (isSaving) return;
		formError = null;

		const code = formCode.trim().toUpperCase();
		const name = formName.trim();
		const description = formDescription.trim();
		const unit = formUnit.trim() || 'usage';
		const creditCost = Number(formCreditCost);
		const creditPrice = Number(formCreditPrice);

		if (!editing) {
			if (!code) {
				formError = 'Kode benefit wajib diisi.';
				return;
			}
			if (!/^[A-Z0-9_]+$/.test(code)) {
				formError = 'Kode benefit hanya boleh huruf, angka, dan underscore.';
				return;
			}
			if (code.length > 80) {
				formError = 'Kode benefit maksimal 80 karakter.';
				return;
			}
		}
		if (!name) {
			formError = 'Nama benefit wajib diisi.';
			return;
		}
		if (name.length > 160) {
			formError = 'Nama benefit maksimal 160 karakter.';
			return;
		}
		if (description.length > 1000) {
			formError = 'Deskripsi maksimal 1000 karakter.';
			return;
		}
		if (unit.length > 40) {
			formError = 'Unit maksimal 40 karakter.';
			return;
		}
		if (!Number.isInteger(creditCost) || creditCost < 0) {
			formError = 'Kredit per pemakaian harus bilangan bulat ≥ 0.';
			return;
		}
		if (!Number.isFinite(creditPrice) || creditPrice < 0) {
			formError = 'Harga per kredit harus angka ≥ 0.';
			return;
		}

		isSaving = true;
		errorMessage = null;
		successMessage = null;
		try {
			if (editing) {
				await updateBenefitApi(editing.id, {
					name,
					description: description || null,
					unit,
					creditCost,
					creditPriceIdr: creditPrice,
					isActive: formActive
				});
				successMessage = 'Benefit berhasil diperbarui.';
			} else {
				await createBenefitApi({
					code,
					name,
					description: description || null,
					unit,
					creditCost,
					creditPriceIdr: creditPrice,
					isActive: formActive
				});
				successMessage = 'Benefit baru berhasil dibuat.';
			}
			modalOpen = false;
			await load();
		} catch (error) {
			formError = errorText(error, 'Benefit belum dapat disimpan.');
		} finally {
			isSaving = false;
		}
	}

	async function handleToggle(benefit: Benefit) {
		if (togglingId) return;
		togglingId = benefit.id;
		errorMessage = null;
		successMessage = null;
		try {
			const updated = await toggleBenefitApi(benefit.id);
			await load();
			successMessage = `Benefit "${updated.name}" ${updated.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`;
		} catch (error) {
			errorMessage = errorText(error, 'Status benefit belum dapat diubah.');
		} finally {
			togglingId = null;
		}
	}

	async function removeBenefit() {
		if (!deleteTarget || isDeleting) return;
		const target = deleteTarget;
		isDeleting = true;
		errorMessage = null;
		successMessage = null;
		try {
			await deleteBenefitApi(target.id);
			deleteTarget = null;
			successMessage = `Benefit "${target.name}" berhasil dihapus.`;
			await load();
		} catch (error) {
			errorMessage = errorText(error, 'Benefit belum dapat dihapus.');
			deleteTarget = null;
		} finally {
			isDeleting = false;
		}
	}

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			benefits = await listBenefitsApi();
		} catch (error) {
			loadError = errorText(error, 'Daftar benefit belum dapat dimuat.');
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>Benefits | Superadmin</title>
</svelte:head>

<div class="space-y-6">
	<header class="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
		<div>
			<p class="text-sm font-semibold text-amber-300">Monetization</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight text-white">Benefits & Credit Pricing</h1>
			<p class="mt-2 text-sm text-slate-400">
				Master benefit AI, kuota paket, dan harga kredit saat kuota benefit habis.
			</p>
		</div>
		<button
			type="button"
			onclick={openCreate}
			class="inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400"
		>
			<Plus size={16} /> Tambah Benefit
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
			<Spinner label="Memuat benefit" /> Memuat benefit...
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
	{:else if benefits.length === 0}
		<div class="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center">
			<span class="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
				<Award size={24} />
			</span>
			<h2 class="mt-4 text-lg font-semibold text-white">Belum ada benefit</h2>
			<p class="mt-1 text-sm text-slate-400">Tambahkan benefit pertama untuk mengatur kuota dan kredit.</p>
			<button
				type="button"
				onclick={openCreate}
				class="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400"
			>
				<Plus size={16} /> Tambah Benefit
			</button>
		</div>
	{:else}
		<div class="grid gap-4 xl:grid-cols-2">
			{#each benefits as benefit (benefit.id)}
				<article class="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-1.5">
								<span class="rounded-full bg-slate-800 px-2.5 py-1 font-mono text-[10px] font-semibold text-slate-300">
									{benefit.code}
								</span>
								{#if !benefit.isActive}
									<span class="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
										Nonaktif
									</span>
								{/if}
							</div>
							<h2 class="mt-2 text-lg font-bold text-white">{benefit.name}</h2>
							{#if benefit.description}
								<p class="mt-1 text-xs leading-5 text-slate-400">{benefit.description}</p>
							{/if}
						</div>
						<button
							type="button"
							role="switch"
							aria-checked={benefit.isActive}
							aria-label="Aktifkan/nonaktifkan {benefit.name}"
							onclick={() => void handleToggle(benefit)}
							disabled={togglingId === benefit.id}
							class="relative mt-1 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition {benefit.isActive
								? 'bg-emerald-500'
								: 'bg-slate-700'} disabled:opacity-60"
						>
							<span
								class="inline-block size-4 transform rounded-full bg-white transition {benefit.isActive
									? 'translate-x-4'
									: 'translate-x-0.5'}"
							></span>
						</button>
					</div>

					<div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
						<div class="rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2">
							<p class="text-[9px] uppercase tracking-wide text-slate-500">Kredit/pakai</p>
							<p class="mt-0.5 font-semibold text-slate-200">{formatNumber(benefit.creditCost)}</p>
						</div>
						<div class="rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2">
							<p class="text-[9px] uppercase tracking-wide text-slate-500">Harga/kredit</p>
							<p class="mt-0.5 font-semibold text-slate-200">{formatRupiah(benefit.creditPriceIdr)}</p>
						</div>
						<div class="rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2">
							<p class="text-[9px] uppercase tracking-wide text-slate-500">Overage</p>
							<p class="mt-0.5 font-semibold text-slate-200">{formatRupiah(benefit.overageCostIdr)}</p>
						</div>
					</div>

					<div class="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
						<span class="text-[10px] text-slate-500">
							Unit {benefit.unit} · dipakai di {formatNumber(benefit.packageCount)} paket
						</span>
						<div class="ml-auto flex gap-1.5">
							<button
								type="button"
								onclick={() => openEdit(benefit)}
								class="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-200"
							>
								<Pencil size={13} /> Edit
							</button>
							<button
								type="button"
								onclick={() => (deleteTarget = benefit)}
								disabled={benefit.packageCount > 0}
								title={benefit.packageCount > 0 ? 'Masih dipakai paket subscription' : 'Hapus benefit'}
								class="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
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
	title={editing ? 'Edit Benefit' : 'Tambah Benefit'}
	description="Benefit dipakai sebagai kuota fleksibel di paket subscription."
	size="lg"
	onclose={closeModal}
>
	<div class="space-y-4">
		{#if formError}
			<Alert type="error" message={formError} />
		{/if}

		<div class="grid gap-4 sm:grid-cols-2">
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Kode benefit {#if !editing}<span class="text-rose-400">*</span>{/if}
				<input
					bind:value={formCode}
					disabled={Boolean(editing)}
					maxlength="80"
					placeholder="CV_EXTRACTION"
					class="{inputClass} font-mono uppercase disabled:opacity-60"
				/>
				{#if editing}
					<p class="text-[10px] font-normal text-slate-500">Kode tidak dapat diubah.</p>
				{/if}
			</label>
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Unit
				<input bind:value={formUnit} maxlength="40" placeholder="usage" class={inputClass} />
			</label>
		</div>

		<label class="block space-y-1.5 text-sm font-medium text-slate-300">
			Nama benefit <span class="text-rose-400">*</span>
			<input bind:value={formName} maxlength="160" placeholder="Contoh: Ekstraksi & Generate CV" class={inputClass} />
		</label>

		<label class="block space-y-1.5 text-sm font-medium text-slate-300">
			Deskripsi
			<textarea
				bind:value={formDescription}
				maxlength="1000"
				rows="3"
				placeholder="Deskripsi singkat benefit"
				class="{inputClass} resize-y"
			></textarea>
		</label>

		<div class="grid gap-4 sm:grid-cols-2">
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Kredit per pemakaian <span class="text-rose-400">*</span>
				<input bind:value={formCreditCost} type="number" min="0" class={inputClass} />
			</label>
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Harga per kredit (IDR) <span class="text-rose-400">*</span>
				<input bind:value={formCreditPrice} type="number" min="0" class={inputClass} />
			</label>
		</div>

		<div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
			<div>
				<p class="text-xs font-medium text-slate-300">Overage cost</p>
				<p class="text-[11px] text-slate-500">Kredit/pakai × harga/kredit</p>
			</div>
			<p class="text-lg font-bold text-emerald-300">
				{formatRupiah(Math.max(Number(formCreditCost) || 0, 0) * Math.max(Number(formCreditPrice) || 0, 0))}
			</p>
		</div>

		<label class="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300">
			<input type="checkbox" bind:checked={formActive} class="h-4 w-4 rounded border-slate-600 bg-slate-950 text-indigo-500" />
			Aktif
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
			onclick={() => void saveBenefit()}
			disabled={isSaving}
			class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
		>
			{#if isSaving}<Spinner label="Menyimpan benefit" />{/if}
			{editing ? 'Simpan Perubahan' : 'Tambah Benefit'}
		</button>
	{/snippet}
</Modal>

<Modal
	open={deleteTarget !== null}
	title="Hapus benefit?"
	description="Benefit hanya bisa dihapus jika tidak dipakai paket."
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
			onclick={() => void removeBenefit()}
			disabled={isDeleting}
			class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-60"
		>
			{#if isDeleting}<Spinner label="Menghapus benefit" />{/if}
			Hapus
		</button>
	{/snippet}
</Modal>
