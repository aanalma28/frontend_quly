<script lang="ts">
	import { onMount } from 'svelte';
	import { CalendarPlus, RefreshCw, Search, SlidersHorizontal, Users } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/superadmin/Alert.svelte';
	import Modal from '#lib/components/superadmin/Modal.svelte';
	import { formatDateShort } from '#lib/components/superadmin/format.js';
	import {
		subscriptionStatusLabel,
		subscriptionStatusTone,
		tierLabel,
		tierTone
	} from '#lib/components/superadmin/status.js';
	import {
		listSubscriptionsApi,
		overrideSubscriptionApi,
		type PaginationMeta,
		type SubStatus,
		type Subscription
	} from '#lib/services/superadminApi.js';

	let items = $state<Subscription[]>([]);
	let meta = $state<PaginationMeta | null>(null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	let statusFilter = $state<'' | SubStatus>('');
	let searchInput = $state('');
	let appliedSearch = $state('');
	let page = $state(1);

	let counts = $state({ active: 0, expired: 0, cancelled: 0 });

	let extendTarget = $state<Subscription | null>(null);
	let extendDays = $state('30');
	let isExtending = $state(false);

	let overrideTarget = $state<Subscription | null>(null);
	let overrideEndDate = $state('');
	let overrideStatus = $state<SubStatus>('ACTIVE');
	let isOverriding = $state(false);

	const statuses: SubStatus[] = ['ACTIVE', 'EXPIRED', 'CANCELLED'];

	function toDateInput(iso: string): string {
		return iso.slice(0, 10);
	}

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			const [list, active, expired, cancelled] = await Promise.all([
				listSubscriptionsApi({
					status: statusFilter || undefined,
					page,
					limit: 20,
					search: appliedSearch || undefined
				}),
				listSubscriptionsApi({ status: 'ACTIVE', limit: 1 }),
				listSubscriptionsApi({ status: 'EXPIRED', limit: 1 }),
				listSubscriptionsApi({ status: 'CANCELLED', limit: 1 })
			]);
			items = list.items;
			meta = list.meta;
			counts = {
				active: active.meta.total,
				expired: expired.meta.total,
				cancelled: cancelled.meta.total
			};
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Data pelanggan belum dapat dimuat.';
		} finally {
			isLoading = false;
		}
	}

	function applySearch() {
		appliedSearch = searchInput.trim();
		page = 1;
		void load();
	}

	function changeStatus(value: string) {
		statusFilter = value as '' | SubStatus;
		page = 1;
		void load();
	}

	function goToPage(next: number) {
		if (!meta) return;
		if (next < 1 || next > meta.totalPages) return;
		page = next;
		void load();
	}

	function openExtend(subscription: Subscription) {
		extendTarget = subscription;
		extendDays = '30';
	}

	function openOverride(subscription: Subscription) {
		overrideTarget = subscription;
		overrideEndDate = toDateInput(subscription.endDate);
		overrideStatus = subscription.status;
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
			const updated = await overrideSubscriptionApi(extendTarget.id, { extendDays: days });
			items = items.map((item) => (item.id === updated.id ? updated : item));
			successMessage = `Langganan ${updated.user.email} diperpanjang ${days} hari.`;
			extendTarget = null;
			await load();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Perpanjangan gagal.';
		} finally {
			isExtending = false;
		}
	}

	async function submitOverride() {
		if (!overrideTarget || isOverriding) return;
		if (!overrideEndDate) {
			errorMessage = 'Tanggal kedaluwarsa wajib diisi.';
			return;
		}
		isOverriding = true;
		errorMessage = null;
		successMessage = null;
		try {
			const expiresAt = new Date(`${overrideEndDate}T23:59:59`).toISOString();
			const updated = await overrideSubscriptionApi(overrideTarget.id, {
				endDate: expiresAt,
				status: overrideStatus
			});
			items = items.map((item) => (item.id === updated.id ? updated : item));
			successMessage = `Langganan ${updated.user.email} berhasil di-override.`;
			overrideTarget = null;
			await load();
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
			<p class="mt-1 text-2xl font-bold text-emerald-300">{counts.active}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Expired</p>
			<p class="mt-1 text-2xl font-bold text-amber-300">{counts.expired}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Cancelled</p>
			<p class="mt-1 text-2xl font-bold text-rose-300">{counts.cancelled}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Total (filter)</p>
			<p class="mt-1 text-2xl font-bold text-white">{meta?.total ?? 0}</p>
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
				placeholder="Cari email atau nama pelanggan..."
				maxlength="160"
				class="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
			/>
		</div>
		<div class="flex items-center gap-2">
			<SlidersHorizontal size={15} class="text-slate-500" />
			<select
				value={statusFilter}
				onchange={(event) => changeStatus(event.currentTarget.value)}
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
	{:else if items.length === 0}
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
							<th class="px-5 py-3">Sisa Hari</th>
							<th class="px-5 py-3">Status</th>
							<th class="px-5 py-3 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-800/70">
						{#each items as subscription (subscription.id)}
							<tr class="hover:bg-slate-900">
								<td class="px-5 py-4">
									<p class="font-semibold text-white">
										{subscription.user.fullName ?? subscription.user.email}
									</p>
									<p class="text-xs text-slate-400">{subscription.user.email}</p>
								</td>
								<td class="px-5 py-4">
									<p class="text-slate-200">{subscription.package.name}</p>
									<span class="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset {tierTone[subscription.package.tier]}">
										{tierLabel[subscription.package.tier]}
									</span>
								</td>
								<td class="px-5 py-4 text-xs text-slate-400">{formatDateShort(subscription.startDate)}</td>
								<td class="px-5 py-4 text-xs text-slate-400">{formatDateShort(subscription.endDate)}</td>
								<td class="px-5 py-4 text-slate-300">{subscription.remainingDays} hari</td>
								<td class="px-5 py-4">
									<span class="rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset {subscriptionStatusTone[subscription.status]}">
										{subscriptionStatusLabel[subscription.status]}
									</span>
								</td>
								<td class="px-5 py-4">
									<div class="flex flex-wrap justify-end gap-1.5">
										<button
											type="button"
											onclick={() => openExtend(subscription)}
											class="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/10"
										>
											<CalendarPlus size={13} /> Perpanjang
										</button>
										<button
											type="button"
											onclick={() => openOverride(subscription)}
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

			{#if meta}
				<div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-5 py-3">
					<p class="text-xs text-slate-500">
						Halaman {meta.page} dari {meta.totalPages} · {meta.total} langganan
					</p>
					<div class="flex gap-2">
						<button
							type="button"
							onclick={() => goToPage(page - 1)}
							disabled={meta.page <= 1}
							class="inline-flex h-8 items-center justify-center rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
						>
							Sebelumnya
						</button>
						<button
							type="button"
							onclick={() => goToPage(page + 1)}
							disabled={meta.page >= meta.totalPages}
							class="inline-flex h-8 items-center justify-center rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
						>
							Selanjutnya
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<Modal
	open={extendTarget !== null}
	title="Perpanjang Langganan"
	description={extendTarget ? `${extendTarget.user.fullName ?? extendTarget.user.email} · ${extendTarget.package.name}` : ''}
	onclose={() => (isExtending ? undefined : (extendTarget = null))}
>
	{#if extendTarget}
		<div class="space-y-4">
			<p class="text-sm text-slate-400">
				Kedaluwarsa saat ini: <span class="text-slate-200">{formatDateShort(extendTarget.endDate)}</span>
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
	description={overrideTarget ? `${overrideTarget.user.fullName ?? overrideTarget.user.email} · ${overrideTarget.package.name}` : ''}
	onclose={() => (isOverriding ? undefined : (overrideTarget = null))}
>
	{#if overrideTarget}
		<div class="space-y-4">
			<p class="text-sm text-slate-400">
				Paket saat ini: <span class="text-slate-200">{overrideTarget.package.name}</span> (paket tidak dapat diubah
				dari sini).
			</p>
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Tanggal kedaluwarsa
				<input
					bind:value={overrideEndDate}
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
