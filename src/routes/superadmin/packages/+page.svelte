<script lang="ts">
	import { onMount } from 'svelte';
	import { Boxes, Pencil, Plus, RefreshCw, Trash2, X } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/superadmin/Alert.svelte';
	import Modal from '#lib/components/superadmin/Modal.svelte';
	import { formatDateShort, formatNumber, formatRupiah } from '#lib/components/superadmin/format.js';
	import { tierLabel, tierTone } from '#lib/components/superadmin/status.js';
	import {
		createPackageApi,
		deletePackageApi,
		listPackagesApi,
		togglePackageApi,
		updatePackageApi,
		type PackageTier,
		type SubscriptionPackage
	} from '#lib/services/superadminApi.js';

	let packages = $state<SubscriptionPackage[]>([]);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	let modalOpen = $state(false);
	let editing = $state<SubscriptionPackage | null>(null);
	let formName = $state('');
	let formTier = $state<PackageTier>('PRO');
	let formPrice = $state('89000');
	let formDuration = $state('30');
	let formTokenLimit = $state('500000');
	let formFeatures = $state<string[]>([]);
	let featureInput = $state('');
	let isSaving = $state(false);
	let formError = $state<string | null>(null);

	let deleteTarget = $state<SubscriptionPackage | null>(null);
	let isDeleting = $state(false);
	let togglingId = $state<string | null>(null);

	const tiers: PackageTier[] = ['FREE', 'PRO', 'ENTERPRISE'];
	const tierDefaultPrice: Record<PackageTier, string> = {
		FREE: '0',
		PRO: '89000',
		ENTERPRISE: '149000'
	};

	function errorText(error: unknown, fallback: string): string {
		return error instanceof Error ? error.message : fallback;
	}

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			packages = await listPackagesApi();
		} catch (error) {
			loadError = errorText(error, 'Daftar paket belum dapat dimuat.');
		} finally {
			isLoading = false;
		}
	}

	function openCreate() {
		editing = null;
		formName = '';
		formTier = 'PRO';
		formPrice = tierDefaultPrice.PRO;
		formDuration = '30';
		formTokenLimit = '500000';
		formFeatures = [];
		featureInput = '';
		formError = null;
		modalOpen = true;
	}

	function openEdit(pkg: SubscriptionPackage) {
		editing = pkg;
		formName = pkg.name;
		formTier = pkg.tier;
		formPrice = String(pkg.price);
		formDuration = String(pkg.durationDays);
		formTokenLimit = String(pkg.aiTokenLimit);
		formFeatures = [...pkg.features];
		featureInput = '';
		formError = null;
		modalOpen = true;
	}

	function closeModal() {
		if (isSaving) return;
		modalOpen = false;
	}

	function changeTier(value: string) {
		formTier = value as PackageTier;
		if (!editing) formPrice = tierDefaultPrice[formTier];
	}

	function addFeature() {
		const value = featureInput.trim();
		if (!value) return;
		if (!formFeatures.some((item) => item.toLowerCase() === value.toLowerCase())) {
			formFeatures = [...formFeatures, value];
		}
		featureInput = '';
	}

	function removeFeature(index: number) {
		formFeatures = formFeatures.filter((_, itemIndex) => itemIndex !== index);
	}

	async function savePackage() {
		if (isSaving) return;
		formError = null;

		const name = formName.trim();
		const price = Number(formPrice);
		const durationDays = Number(formDuration);
		const aiTokenLimit = Number(formTokenLimit);

		if (!name) {
			formError = 'Nama paket wajib diisi.';
			return;
		}
		if (!Number.isFinite(price) || price < 0) {
			formError = 'Harga harus berupa angka ≥ 0.';
			return;
		}
		if (!Number.isInteger(durationDays) || durationDays < 1) {
			formError = 'Durasi harus bilangan bulat ≥ 1 hari.';
			return;
		}
		if (!Number.isInteger(aiTokenLimit) || aiTokenLimit < 0) {
			formError = 'Kuota token AI harus bilangan bulat ≥ 0.';
			return;
		}

		isSaving = true;
		errorMessage = null;
		successMessage = null;
		try {
			const payload = {
				name,
				tier: formTier,
				price,
				durationDays,
				aiTokenLimit,
				features: formFeatures
			};
			if (editing) {
				await updatePackageApi(editing.id, payload);
				successMessage = 'Paket berhasil diperbarui.';
			} else {
				await createPackageApi(payload);
				successMessage = 'Paket baru berhasil dibuat.';
			}
			modalOpen = false;
			await load();
		} catch (error) {
			formError = errorText(error, 'Paket belum dapat disimpan.');
		} finally {
			isSaving = false;
		}
	}

	async function handleToggle(pkg: SubscriptionPackage) {
		if (togglingId) return;
		togglingId = pkg.id;
		errorMessage = null;
		successMessage = null;
		try {
			const updated = await togglePackageApi(pkg.id);
			packages = packages.map((item) => (item.id === updated.id ? updated : item));
			successMessage = `Paket "${updated.name}" ${updated.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`;
		} catch (error) {
			errorMessage = errorText(error, 'Status paket belum dapat diubah.');
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
			await deletePackageApi(target.id);
			deleteTarget = null;
			successMessage = `Paket "${target.name}" berhasil dihapus.`;
			await load();
		} catch (error) {
			errorMessage = errorText(error, 'Paket belum dapat dihapus.');
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
	<title>Subscription Packages | Superadmin</title>
</svelte:head>

<div class="space-y-6">
	<header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
		<div>
			<p class="text-sm font-semibold text-amber-300">Monetization</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight text-white">Subscription Packages</h1>
			<p class="mt-2 text-sm text-slate-400">
				Kelola paket langganan, harga, kuota token AI, dan fitur yang ditawarkan.
			</p>
		</div>
		<button
			type="button"
			onclick={openCreate}
			class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400"
		>
			<Plus size={16} /> Buat Paket Baru
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
			<Spinner label="Memuat paket" /> Memuat paket...
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
				<Boxes size={24} />
			</span>
			<h2 class="mt-4 text-lg font-semibold text-white">Belum ada paket</h2>
			<p class="mt-1 text-sm text-slate-400">Buat paket langganan pertama untuk mulai monetisasi.</p>
			<button
				type="button"
				onclick={openCreate}
				class="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400"
			>
				<Plus size={16} /> Buat Paket Baru
			</button>
		</div>
	{:else}
		<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-slate-800 text-sm">
					<thead class="bg-slate-900 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
						<tr>
							<th class="px-5 py-3">Paket</th>
							<th class="px-5 py-3">Tier</th>
							<th class="px-5 py-3">Harga</th>
							<th class="px-5 py-3">Durasi</th>
							<th class="px-5 py-3">Kuota Token AI</th>
							<th class="px-5 py-3">Subscriber</th>
							<th class="px-5 py-3">Status</th>
							<th class="px-5 py-3 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-800/70">
						{#each packages as pkg (pkg.id)}
							<tr class="hover:bg-slate-900">
								<td class="px-5 py-4">
									<p class="font-semibold text-white">{pkg.name}</p>
									<p class="mt-0.5 text-[11px] text-slate-500">Dibuat {formatDateShort(pkg.createdAt)}</p>
								</td>
								<td class="px-5 py-4">
									<span class="rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset {tierTone[pkg.tier]}">
										{tierLabel[pkg.tier]}
									</span>
								</td>
								<td class="px-5 py-4 text-slate-200">{formatRupiah(pkg.price)}</td>
								<td class="px-5 py-4 text-slate-300">{pkg.durationDays} hari</td>
								<td class="px-5 py-4 text-slate-300">{formatNumber(pkg.aiTokenLimit)} token</td>
								<td class="px-5 py-4 text-slate-300">{formatNumber(pkg.subscriberCount)}</td>
								<td class="px-5 py-4">
									<div class="flex items-center gap-2">
										<button
											type="button"
											role="switch"
											aria-checked={pkg.isActive}
											aria-label="Aktifkan/nonaktifkan {pkg.name}"
											onclick={() => void handleToggle(pkg)}
											disabled={togglingId === pkg.id}
											class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition {pkg.isActive
												? 'bg-emerald-500'
												: 'bg-slate-700'} disabled:opacity-60"
										>
											<span
												class="inline-block size-4 transform rounded-full bg-white transition {pkg.isActive
													? 'translate-x-4'
													: 'translate-x-0.5'}"
											></span>
										</button>
										<span class="text-[11px] font-medium {pkg.isActive ? 'text-emerald-300' : 'text-slate-500'}">
											{pkg.isActive ? 'Aktif' : 'Non-aktif'}
										</span>
									</div>
								</td>
								<td class="px-5 py-4">
									<div class="flex flex-wrap justify-end gap-1.5">
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
	title={editing ? 'Edit Paket Langganan' : 'Buat Paket Baru'}
	description="Atur harga, durasi, kuota token AI, dan fitur paket."
	size="lg"
	onclose={closeModal}
>
	<div class="space-y-4">
		{#if formError}
			<Alert type="error" message={formError} />
		{/if}

		<label class="block space-y-1.5 text-sm font-medium text-slate-300">
			Nama paket <span class="text-rose-400">*</span>
			<input
				bind:value={formName}
				maxlength="120"
				placeholder="Contoh: Panglima Karier"
				class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
			/>
		</label>

		<div class="grid gap-4 sm:grid-cols-2">
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Tier <span class="text-rose-400">*</span>
				<select
					value={formTier}
					onchange={(event) => changeTier(event.currentTarget.value)}
					class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
				>
					{#each tiers as tier}
						<option value={tier}>{tierLabel[tier]}</option>
					{/each}
				</select>
			</label>
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Harga (IDR) <span class="text-rose-400">*</span>
				<input
					bind:value={formPrice}
					type="number"
					min="0"
					class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
				/>
			</label>
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Durasi (hari) <span class="text-rose-400">*</span>
				<input
					bind:value={formDuration}
					type="number"
					min="1"
					class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
				/>
			</label>
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Kuota Token AI <span class="text-rose-400">*</span>
				<input
					bind:value={formTokenLimit}
					type="number"
					min="0"
					class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
				/>
			</label>
		</div>

		<div>
			<p class="text-sm font-medium text-slate-300">Fitur paket</p>
			<div class="mt-2 flex flex-wrap gap-2">
				{#each formFeatures as feature, index (feature)}
					<span class="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 py-1 pl-3 pr-1 text-xs font-medium text-indigo-200 ring-1 ring-inset ring-indigo-500/20">
						{feature}
						<button
							type="button"
							onclick={() => removeFeature(index)}
							class="rounded-full p-1 transition hover:bg-indigo-500/20"
							aria-label="Hapus fitur {feature}"
						>
							<X size={12} />
						</button>
					</span>
				{/each}
				{#if formFeatures.length === 0}
					<span class="text-xs text-slate-500">Belum ada fitur ditambahkan.</span>
				{/if}
			</div>
			<div class="mt-2 flex gap-2">
				<input
					bind:value={featureInput}
					onkeydown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							addFeature();
						}
					}}
					placeholder="Tambah fitur, lalu Enter"
					maxlength="160"
					class="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
				/>
				<button
					type="button"
					onclick={addFeature}
					class="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
				>
					<Plus size={15} /> Tambah
				</button>
			</div>
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
			{#if isSaving}<Spinner label="Menyimpan" />{/if}
			{editing ? 'Simpan Perubahan' : 'Buat Paket'}
		</button>
	{/snippet}
</Modal>

<Modal
	open={deleteTarget !== null}
	title="Hapus paket langganan?"
	description="Paket akan dihapus permanen dari katalog."
	onclose={() => (isDeleting ? undefined : (deleteTarget = null))}
>
	{#if deleteTarget}
		<p class="text-sm text-slate-300">
			Apakah kamu yakin ingin menghapus <strong class="text-white">{deleteTarget.name}</strong>?
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
			{#if isDeleting}<Spinner label="Menghapus" />{/if}
			Hapus
		</button>
	{/snippet}
</Modal>
