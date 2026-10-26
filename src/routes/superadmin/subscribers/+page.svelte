<script lang="ts">
	import { onMount } from 'svelte';
	import { CalendarPlus, RefreshCw, Search, SlidersHorizontal, Users } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/superadmin/Alert.svelte';
	import Modal from '#lib/components/superadmin/Modal.svelte';
	import { formatDateShort, formatNumber, formatRupiah } from '#lib/components/superadmin/format.js';
	import {
		subscriptionStatusLabel,
		subscriptionStatusTone,
		tierLabel,
		tierTone
	} from '#lib/components/superadmin/status.js';
	import {
		extendSubscription,
		listPackages,
		listSubscribers,
		overrideSubscription,
		type Subscriber,
		type SubscriptionPackage,
		type SubscriptionStatus
	} from '#lib/services/superadminApi.js';

	let subscribers = $state<Subscriber[]>([]);
	let packages = $state<SubscriptionPackage[]>([]);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	let statusFilter = $state<'' | SubscriptionStatus>('');
	let searchInput = $state('');
	let appliedSearch = $state('');

	let extendTarget = $state<Subscriber | null>(null);
	let extendDays = $state('30');
	let isExtending = $state(false);

	let overrideTarget = $state<Subscriber | null>(null);
	let overridePackageId = $state('');
	let overrideExpiresAt = $state('');
	let overrideStatus = $state<SubscriptionStatus>('ACTIVE');
	let isOverriding = $state(false);

	const statuses: SubscriptionStatus[] = ['ACTIVE', 'EXPIRED', 'CANCELLED'];

	const filtered = $derived(
		subscribers.filter((item) => {
			if (statusFilter && item.status !== statusFilter) return false;
			const query = appliedSearch.toLowerCase();
			if (!query) return true;
			return (
				item.email.toLowerCase().includes(query) ||
				item.fullName.toLowerCase().includes(query) ||
				item.packageName.toLowerCase().includes(query)
			);
		})
	);

	const activeCount = $derived(subscribers.filter((item) => item.status === 'ACTIVE').length);
	const expiredCount = $derived(subscribers.filter((item) => item.status === 'EXPIRED').length);
	const cancelledCount = $derived(subscribers.filter((item) => item.status === 'CANCELLED').length);
	const activeRevenue = $derived(
		subscribers
			.filter((item) => item.status === 'ACTIVE')
			.reduce((sum, item) => sum + item.revenue, 0)
	);

	function toDateInput(iso: string): string {
		return iso.slice(0, 10);
	}

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			const [subs, pkgs] = await Promise.all([listSubscribers(), listPackages()]);
			subscribers = subs;
			packages = pkgs;
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Data pelanggan belum dapat dimuat.';
		} finally {
			isLoading = false;
		}
	}

	function applySearch() {
		appliedSearch = searchInput.trim();
	}

	function openExtend(subscriber: Subscriber) {
		extendTarget = subscriber;
		extendDays = '30';
	}

	function openOverride(subscriber: Subscriber) {
		overrideTarget = subscriber;
		overridePackageId = subscriber.packageId;
		overrideExpiresAt = toDateInput(subscriber.expiresAt);
		overrideStatus = subscriber.status;
	}

	async function submitExtend() {
		if (!extendTarget || isExtending) return;
		const days = Number(extendDays);
		if (!Number.isInteger(days) || days < 1) {
			errorMessage = 'Jumlah hari harus bilangan bulat ≥ 1.';
			return;
		}
		isExtending = true;
		errorMessage = null;
		successMessage = null;
		try {
			const updated = await extendSubscription(extendTarget.id, days);
			subscribers = subscribers.map((item) => (item.id === updated.id ? updated : item));
			successMessage = `Langganan ${updated.email} diperpanjang ${days} hari.`;
			extendTarget = null;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Perpanjangan gagal.';
		} finally {
			isExtending = false;
		}
	}

	async function submitOverride() {
		if (!overrideTarget || isOverriding) return;
		if (!overridePackageId || !overrideExpiresAt) {
			errorMessage = 'Paket dan tanggal kedaluwarsa wajib diisi.';
			return;
		}
		isOverriding = true;
		errorMessage = null;
		successMessage = null;
		try {
			const expiresAt = new Date(`${overrideExpiresAt}T23:59:59`).toISOString();
			const updated = await overrideSubscription(overrideTarget.id, {
				packageId: overridePackageId,
				expiresAt,
				status: overrideStatus
			});
			subscribers = subscribers.map((item) => (item.id === updated.id ? updated : item));
			successMessage = `Langganan ${updated.email} berhasil di-override.`;
			overrideTarget = null;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Override gagal.';
		} finally {
			isOverriding = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>Subscribers | Superadmin</title>
</svelte:head>

<div class="space-y-6">
	<header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
		<div>
			<p class="text-sm font-semibold text-amber-300">Billing</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight text-white">Subscribers Management</h1>
			<p class="mt-2 text-sm text-slate-400">
				Pantau langganan pelanggan dan lakukan override atau perpanjangan manual.
			</p>
		</div>
	</header>

	{#if errorMessage}
		<Alert type="error" message={errorMessage} dismissible ondismiss={() => (errorMessage = null)} />
	{/if}
	{#if successMessage}
		<Alert type="success" message={successMessage} dismissible ondismiss={() => (successMessage = null)} />
	{/if}

	<section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Active</p>
			<p class="mt-1 text-2xl font-bold text-emerald-300">{activeCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Expired</p>
			<p class="mt-1 text-2xl font-bold text-amber-300">{expiredCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Cancelled</p>
			<p class="mt-1 text-2xl font-bold text-rose-300">{cancelledCount}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Active Revenue</p>
			<p class="mt-1 text-xl font-bold text-white">{formatRupiah(activeRevenue)}</p>
		</div>
	</section>

	<div class="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center">
		<div class="relative flex-1">
			<Search size={16} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
			<input
				bind:value={searchInput}
				onkeydown={(event) => {
					if (event.key === 'Enter') applySearch();
				}}
				placeholder="Cari email, nama, atau paket..."
				maxlength="160"
				class="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
			/>
		</div>
		<div class="flex items-center gap-2">
			<SlidersHorizontal size={15} class="text-slate-500" />
			<select
				value={statusFilter}
				onchange={(event) => (statusFilter = event.currentTarget.value as '' | SubscriptionStatus)}
				class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
			>
				<option value="">Semua status</option>
				{#each statuses as status}
					<option value={status}>{subscriptionStatusLabel[status]}</option>
				{/each}
			</select>
			<button
				type="button"
				onclick={applySearch}
				class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400"
			>
				<Search size={15} /> Cari
			</button>
		</div>
	</div>

	{#if isLoading}
		<div class="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
			<Spinner label="Memuat pelanggan" /> Memuat pelanggan...
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
	{:else if filtered.length === 0}
		<div class="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center">
			<span class="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
				<Users size={24} />
			</span>
			<h2 class="mt-4 text-lg font-semibold text-white">Tidak ada pelanggan</h2>
			<p class="mt-1 text-sm text-slate-400">Tidak ada data yang cocok dengan filter saat ini.</p>
		</div>
	{:else}
		<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-slate-800 text-sm">
					<thead class="bg-slate-900 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
						<tr>
							<th class="px-5 py-3">Pelanggan</th>
							<th class="px-5 py-3">Paket</th>
							<th class="px-5 py-3">Mulai</th>
							<th class="px-5 py-3">Kedaluwarsa</th>
							<th class="px-5 py-3">Status</th>
							<th class="px-5 py-3 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-800/70">
						{#each filtered as subscriber (subscriber.id)}
							<tr class="hover:bg-slate-900">
								<td class="px-5 py-4">
									<p class="font-semibold text-white">{subscriber.fullName}</p>
									<p class="text-xs text-slate-400">{subscriber.email}</p>
								</td>
								<td class="px-5 py-4">
									<p class="text-slate-200">{subscriber.packageName}</p>
									<span class="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset {tierTone[subscriber.tier]}">
										{tierLabel[subscriber.tier]}
									</span>
								</td>
								<td class="px-5 py-4 text-xs text-slate-400">{formatDateShort(subscriber.startedAt)}</td>
								<td class="px-5 py-4 text-xs text-slate-400">{formatDateShort(subscriber.expiresAt)}</td>
								<td class="px-5 py-4">
									<span class="rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset {subscriptionStatusTone[subscriber.status]}">
										{subscriptionStatusLabel[subscriber.status]}
									</span>
								</td>
								<td class="px-5 py-4">
									<div class="flex flex-wrap justify-end gap-1.5">
										<button
											type="button"
											onclick={() => openExtend(subscriber)}
											class="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/10"
										>
											<CalendarPlus size={13} /> Perpanjang
										</button>
										<button
											type="button"
											onclick={() => openOverride(subscriber)}
											class="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-200"
										>
											<SlidersHorizontal size={13} /> Override
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
	open={extendTarget !== null}
	title="Perpanjang Langganan"
	description={extendTarget ? `${extendTarget.fullName} · ${extendTarget.packageName}` : ''}
	onclose={() => (isExtending ? undefined : (extendTarget = null))}
>
	{#if extendTarget}
		<div class="space-y-4">
			<p class="text-sm text-slate-400">
				Kedaluwarsa saat ini: <span class="text-slate-200">{formatDateShort(extendTarget.expiresAt)}</span>
			</p>
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Tambah berapa hari?
				<input
					bind:value={extendDays}
					type="number"
					min="1"
					class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
				/>
			</label>
		</div>
	{/if}

	{#snippet footer()}
		<button
			type="button"
			onclick={() => (extendTarget = null)}
			disabled={isExtending}
			class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
		>
			Batal
		</button>
		<button
			type="button"
			onclick={() => void submitExtend()}
			disabled={isExtending}
			class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
		>
			{#if isExtending}<Spinner label="Memproses" />{/if}
			Perpanjang
		</button>
	{/snippet}
</Modal>

<Modal
	open={overrideTarget !== null}
	title="Override Langganan"
	description={overrideTarget ? `${overrideTarget.fullName} · ${overrideTarget.email}` : ''}
	onclose={() => (isOverriding ? undefined : (overrideTarget = null))}
>
	{#if overrideTarget}
		<div class="space-y-4">
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Paket
				<select
					bind:value={overridePackageId}
					class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
				>
					{#each packages as pkg (pkg.id)}
						<option value={pkg.id}>{pkg.name} — {formatRupiah(pkg.price)}</option>
					{/each}
				</select>
			</label>
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Tanggal kedaluwarsa
				<input
					bind:value={overrideExpiresAt}
					type="date"
					class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
				/>
			</label>
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Status
				<select
					bind:value={overrideStatus}
					class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
				>
					{#each statuses as status}
						<option value={status}>{subscriptionStatusLabel[status]}</option>
					{/each}
				</select>
			</label>
		</div>
	{/if}

	{#snippet footer()}
		<button
			type="button"
			onclick={() => (overrideTarget = null)}
			disabled={isOverriding}
			class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
		>
			Batal
		</button>
		<button
			type="button"
			onclick={() => void submitOverride()}
			disabled={isOverriding}
			class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
		>
			{#if isOverriding}<Spinner label="Menyimpan" />{/if}
			Simpan Override
		</button>
	{/snippet}
</Modal>
