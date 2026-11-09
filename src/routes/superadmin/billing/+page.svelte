<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import {
		ArrowRight,
		CalendarClock,
		CreditCard,
		Package,
		Receipt,
		RefreshCw,
		Search,
		TrendingUp,
		Users,
		Wallet
	} from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/superadmin/Alert.svelte';
	import KpiCard from '#lib/components/superadmin/KpiCard.svelte';
	import Modal from '#lib/components/superadmin/Modal.svelte';
	import {
		formatDate,
		formatDateShort,
		formatNumber,
		formatRupiah
	} from '#lib/components/superadmin/format.js';
	import {
		applicationChargeTypeLabel,
		applicationStatusLabel,
		applicationStatusTone,
		billingStatusLabel,
		billingStatusTone,
		subscriptionStatusLabel,
		subscriptionTierLabel,
		subscriptionTierTone,
		tierLabel,
		tierTone,
		userRoleLabel,
		userRoleTone
	} from '#lib/components/superadmin/status.js';
	import {
		assignUserSubscriptionApi,
		getBillingOverviewApi,
		getBillingUserDetailApi,
		listBillingUsersApi,
		listPackagesApi,
		updateUserQuotasApi,
		type ApplicationStatus,
		type AssignUserSubscriptionInput,
		type BillingOverviewResponse,
		type BillingStatus,
		type BillingUserDetail,
		type BillingUserItem,
		type PaginationMeta,
		type SubStatus,
		type SubscriptionPackage,
		type SubscriptionTier,
		type UpdateUserQuotasInput,
		type UserRole
	} from '#lib/services/superadminApi.js';
	import { effectiveEmailQuota } from '#lib/utils/superadminQuota.js';

	const LIMIT = 12;
	const applicationStatusOrder: ApplicationStatus[] = ['PENDING', 'SENT', 'REPLIED', 'FAILED'];
	const subscriptionStatuses: SubStatus[] = ['ACTIVE', 'EXPIRED', 'CANCELLED'];
	const billingStatusOptions: Array<{ value: '' | BillingStatus; label: string }> = [
		{ value: '', label: 'Semua billing status' },
		{ value: 'ACTIVE', label: 'Aktif' },
		{ value: 'EXPIRED', label: 'Expired' },
		{ value: 'CANCELLED', label: 'Dibatalkan' },
		{ value: 'FREE', label: 'Free' },
		{ value: 'NO_SUBSCRIPTION', label: 'Belum berlangganan' }
	];
	const tierOptions: Array<{ value: '' | SubscriptionTier; label: string }> = [
		{ value: '', label: 'Semua tier' },
		{ value: 'FREE_PLAN', label: 'Free Plan' },
		{ value: 'STARTER_PLAN', label: 'Starter Plan' },
		{ value: 'PRO_PLAN', label: 'Pro Plan' },
		{ value: 'UNLIMITED_PLAN', label: 'Unlimited Plan' }
	];
	const roleOptions: Array<{ value: '' | UserRole; label: string }> = [
		{ value: '', label: 'Semua role' },
		{ value: 'JOB_SEEKER', label: 'Job Seeker' },
		{ value: 'ADMIN', label: 'Admin' },
		{ value: 'SUPER_ADMIN', label: 'Super Admin' }
	];

	const inputClass =
		'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50';

	const initialSearch = page.url.searchParams.get('search') ?? '';

	let overview = $state<BillingOverviewResponse | null>(null);
	let users = $state<BillingUserItem[]>([]);
	let meta = $state<PaginationMeta | null>(null);
	let packages = $state<SubscriptionPackage[]>([]);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	let searchInput = $state(initialSearch);
	let appliedSearch = $state(initialSearch);
	let billingStatusFilter = $state<'' | BillingStatus>('');
	let tierFilter = $state<'' | SubscriptionTier>('');
	let roleFilter = $state<'' | UserRole>('');
	let packageFilter = $state('');
	let pageNumber = $state(1);

	let detailOpen = $state(false);
	let detailTarget = $state<BillingUserItem | null>(null);
	let detail = $state<BillingUserDetail | null>(null);
	let detailLoading = $state(false);
	let detailError = $state<string | null>(null);

	let quotaTarget = $state<BillingUserItem | null>(null);
	let quotaMonthlyQuota = $state('');
	let quotaMonthlyUsed = $state('');
	let quotaTestQuota = $state('');
	let quotaTestUsed = $state('');
	let quotaPaygBalance = $state('');
	let quotaCreditBalance = $state('');
	let quotaResetAt = $state('');
	let quotaTestResetAt = $state('');
	let isSavingQuota = $state(false);
	let quotaError = $state<string | null>(null);

	let subscriptionTarget = $state<BillingUserItem | null>(null);
	let subPackageId = $state('');
	let subStartDate = $state('');
	let subEndDate = $state('');
	let subStatus = $state<SubStatus>('ACTIVE');
	let subExtendDays = $state('');
	let subResetUsage = $state(true);
	let isSavingSubscription = $state(false);
	let subscriptionError = $state<string | null>(null);

	function errorText(error: unknown, fallback: string): string {
		return error instanceof Error ? error.message : fallback;
	}

	function formatRate(value: number): string {
		return `${new Intl.NumberFormat('id-ID', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(value)}%`;
	}

	function userName(item: BillingUserItem | BillingUserDetail): string {
		return item.fullName ?? item.email;
	}

	function userInitial(item: BillingUserItem | BillingUserDetail): string {
		return userName(item).slice(0, 1).toUpperCase();
	}

	function todayDate(): string {
		return new Date().toISOString().slice(0, 10);
	}

	function toDateInput(value: string | null | undefined): string {
		if (!value) return '';
		return value.slice(0, 10);
	}

	function toDatetimeLocal(value: string | null | undefined): string {
		if (!value) return '';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';
		const pad = (part: number) => String(part).padStart(2, '0');
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
			date.getHours()
		)}:${pad(date.getMinutes())}`;
	}

	function quotaPercent(used: number, quota: number): number {
		if (quota <= 0) return 0;
		return Math.min(100, Math.max(0, (used / quota) * 100));
	}

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			const [overviewData, list, packageList] = await Promise.all([
				getBillingOverviewApi(),
				listBillingUsersApi({
					search: appliedSearch || undefined,
					billingStatus: billingStatusFilter || undefined,
					tier: tierFilter || undefined,
					role: roleFilter || undefined,
					packageId: packageFilter || undefined,
					page: pageNumber,
					limit: LIMIT
				}),
				listPackagesApi()
			]);
			overview = overviewData;
			users = list.items;
			meta = list.meta;
			packages = packageList;
		} catch (error) {
			loadError = errorText(error, 'Data billing belum dapat dimuat.');
		} finally {
			isLoading = false;
		}
	}

	function applySearch() {
		appliedSearch = searchInput.trim();
		pageNumber = 1;
		void load();
	}

	function changeFilter() {
		pageNumber = 1;
		void load();
	}

	function resetFilters() {
		searchInput = '';
		appliedSearch = '';
		billingStatusFilter = '';
		tierFilter = '';
		roleFilter = '';
		packageFilter = '';
		pageNumber = 1;
		void load();
	}

	function goToPage(next: number) {
		if (!meta) return;
		if (next < 1 || next > meta.totalPages) return;
		pageNumber = next;
		void load();
	}

	async function openDetail(item: BillingUserItem) {
		detailOpen = true;
		detailTarget = item;
		detail = null;
		detailError = null;
		detailLoading = true;
		try {
			detail = await getBillingUserDetailApi(item.userId);
		} catch (error) {
			detailError = errorText(error, 'Detail billing user belum dapat dimuat.');
		} finally {
			detailLoading = false;
		}
	}

	function closeDetail() {
		detailOpen = false;
		detailTarget = null;
		detail = null;
	}

	function openQuota(item: BillingUserItem | null) {
		if (!item) return;
		quotaTarget = item;
		quotaMonthlyQuota = String(effectiveEmailQuota(item, packages).limit);
		quotaMonthlyUsed = String(item.quotas.monthlyUsed);
		quotaTestQuota = String(item.quotas.monthlyTestQuota);
		quotaTestUsed = String(item.quotas.monthlyTestUsed);
		quotaPaygBalance = String(item.quotas.paygBalance);
		quotaCreditBalance = String(item.quotas.creditBalance);
		quotaResetAt = toDatetimeLocal(item.quotas.quotaResetAt);
		quotaTestResetAt = toDatetimeLocal(item.quotas.testQuotaResetAt);
		quotaError = null;
		detailOpen = false;
		detail = null;
	}

	function openSubscription(item: BillingUserItem | null) {
		if (!item) return;
		subscriptionTarget = item;
		subPackageId = item.subscription?.package.id ?? packages[0]?.id ?? '';
		subStartDate = toDateInput(item.subscription?.startDate) || todayDate();
		subEndDate = '';
		subStatus = item.subscription?.status ?? 'ACTIVE';
		subExtendDays = '';
		subResetUsage = true;
		subscriptionError = null;
		detailOpen = false;
		detail = null;
	}

	function numberField(value: string, label: string, minimum = 0): number | null {
		const parsed = Number(value);
		if (!Number.isInteger(parsed) || parsed < minimum) {
			quotaError = `${label} harus bilangan bulat ≥ ${minimum}.`;
			return null;
		}
		return parsed;
	}

	async function saveQuota() {
		if (!quotaTarget || isSavingQuota) return;
		quotaError = null;

		const monthlyQuota = numberField(quotaMonthlyQuota, 'Kuota bulanan');
		if (monthlyQuota === null) return;
		const monthlyUsed = numberField(quotaMonthlyUsed, 'Pemakaian bulanan');
		if (monthlyUsed === null) return;
		const monthlyTestQuota = numberField(quotaTestQuota, 'Kuota tes');
		if (monthlyTestQuota === null) return;
		const monthlyTestUsed = numberField(quotaTestUsed, 'Pemakaian tes');
		if (monthlyTestUsed === null) return;
		const paygBalance = numberField(quotaPaygBalance, 'Saldo PAYG');
		if (paygBalance === null) return;
		const creditBalance = numberField(quotaCreditBalance, 'Saldo kredit');
		if (creditBalance === null) return;

		if (monthlyUsed > monthlyQuota) {
			quotaError = 'Pemakaian bulanan tidak boleh lebih besar dari kuota bulanan.';
			return;
		}
		if (monthlyTestUsed > monthlyTestQuota) {
			quotaError = 'Pemakaian tes tidak boleh lebih besar dari kuota tes.';
			return;
		}

		const payload: UpdateUserQuotasInput = {
			monthlyQuota,
			monthlyUsed,
			monthlyTestQuota,
			monthlyTestUsed,
			paygBalance,
			creditBalance
		};
		if (quotaResetAt) {
			const reset = new Date(quotaResetAt);
			if (Number.isNaN(reset.getTime())) {
				quotaError = 'Tanggal reset kuota tidak valid.';
				return;
			}
			payload.quotaResetAt = reset.toISOString();
		}
		if (quotaTestResetAt) {
			const reset = new Date(quotaTestResetAt);
			if (Number.isNaN(reset.getTime())) {
				quotaError = 'Tanggal reset kuota tes tidak valid.';
				return;
			}
			payload.testQuotaResetAt = reset.toISOString();
		}

		isSavingQuota = true;
		try {
			await updateUserQuotasApi(quotaTarget.userId, payload);
			successMessage = `Kuota ${quotaTarget.email} berhasil diperbarui.`;
			quotaTarget = null;
			await load();
		} catch (error) {
			quotaError = errorText(error, 'Kuota user belum dapat disimpan.');
		} finally {
			isSavingQuota = false;
		}
	}

	async function saveSubscription() {
		if (!subscriptionTarget || isSavingSubscription) return;
		subscriptionError = null;
		if (!subPackageId) {
			subscriptionError = 'Paket langganan wajib dipilih.';
			return;
		}

		const payload: AssignUserSubscriptionInput = {
			packageId: subPackageId,
			status: subStatus,
			resetUsage: subResetUsage
		};
		if (subStartDate) {
			const start = new Date(`${subStartDate}T00:00:00`);
			if (Number.isNaN(start.getTime())) {
				subscriptionError = 'Tanggal mulai tidak valid.';
				return;
			}
			payload.startDate = start.toISOString();
		}
		if (subEndDate) {
			const end = new Date(`${subEndDate}T23:59:59`);
			if (Number.isNaN(end.getTime())) {
				subscriptionError = 'Tanggal berakhir tidak valid.';
				return;
			}
			if (subStartDate && new Date(`${subStartDate}T00:00:00`) > end) {
				subscriptionError = 'Tanggal berakhir harus setelah tanggal mulai.';
				return;
			}
			payload.endDate = end.toISOString();
		}
		if (!subEndDate && String(subExtendDays).trim()) {
			const extendDays = Number(subExtendDays);
			if (!Number.isInteger(extendDays) || extendDays < 1) {
				subscriptionError = 'Tambah hari harus bilangan bulat ≥ 1.';
				return;
			}
			payload.extendDays = extendDays;
		}

		isSavingSubscription = true;
		try {
			await assignUserSubscriptionApi(subscriptionTarget.userId, payload);
			successMessage = `Langganan ${subscriptionTarget.email} berhasil diperbarui.`;
			subscriptionTarget = null;
			await load();
		} catch (error) {
			subscriptionError = errorText(error, 'Langganan user belum dapat disimpan.');
		} finally {
			isSavingSubscription = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>Billing Management | Superadmin</title>
</svelte:head>

<div class="space-y-6">
	<header class="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
		<div>
			<p class="text-sm font-semibold text-amber-300">Monetization</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight text-white">Billing Management</h1>
			<p class="mt-2 text-sm text-slate-400">
				Pantau langganan, estimasi nilai billing, kuota, PAYG, dan aktivitas lamaran user.
			</p>
		</div>
		<button
			type="button"
			onclick={() => void load()}
			disabled={isLoading}
			class="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
		>
			<RefreshCw size={15} /> Refresh
		</button>
	</header>

	{#if successMessage}
		<Alert
			type="success"
			message={successMessage}
			dismissible
			ondismiss={() => (successMessage = null)}
		/>
	{/if}

	<div class="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-[11px] leading-5 text-sky-100/80">
		Nilai billing adalah <strong class="text-white">estimasi</strong> dari subscription aktif dan
		estimasi pemakaian PAYG. Backend belum memiliki riwayat pembayaran/invoice, jadi angka ini bukan
		laporan pembayaran aktual.
	</div>

	{#if isLoading}
		<div class="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
			<Spinner label="Memuat billing" /> Memuat billing...
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
	{:else if overview}
		<section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
			<KpiCard
				label="Subscriber Aktif"
				value={formatNumber(overview.users.activeSubscribers)}
				hint={`${formatNumber(overview.users.total)} total user`}
				icon={Users}
				tone="emerald"
			/>
			<KpiCard
				label="Total Subscription"
				value={formatNumber(overview.subscriptions.total)}
				hint={`${formatNumber(overview.subscriptions.expired)} expired · ${formatNumber(overview.subscriptions.cancelled)} dibatalkan`}
				icon={CreditCard}
				tone="indigo"
			/>
			<KpiCard
				label="Expired ≤ 7 Hari"
				value={formatNumber(overview.subscriptions.expiring7Days)}
				hint="Perlu perpanjangan"
				icon={CalendarClock}
				tone="amber"
			/>
			<KpiCard
				label="Expired ≤ 30 Hari"
				value={formatNumber(overview.subscriptions.expiring30Days)}
				hint="Dalam 30 hari"
				icon={CalendarClock}
				tone="cyan"
			/>
		</section>

		<section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
			<KpiCard
				label="Nilai Subscription Aktif"
				value={formatRupiah(overview.revenue.activeSubscriptionValueIdr)}
				hint="Dari paket aktif"
				icon={TrendingUp}
				tone="emerald"
			/>
			<KpiCard
				label="Rata-rata Nilai"
				value={formatRupiah(overview.revenue.averageActiveSubscriptionValueIdr)}
				hint="Per subscriber aktif"
				icon={TrendingUp}
				tone="violet"
			/>
			<KpiCard
				label="Estimasi Nilai PAYG"
				value={formatRupiah(overview.revenue.paygConsumedValueIdr)}
				hint={`${formatNumber(overview.revenue.paygApplications)} lamaran × ${formatRupiah(overview.revenue.paygPricePerApplicationIdr)}`}
				icon={Wallet}
				tone="cyan"
			/>
			<KpiCard
				label="Total Estimasi Billing"
				value={formatRupiah(overview.revenue.estimatedBillingValueIdr)}
				hint="Subscription aktif + PAYG"
				icon={Receipt}
				tone="amber"
			/>
		</section>

		<section class="grid gap-4 lg:grid-cols-3">
			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-2">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h2 class="text-sm font-semibold text-white">Status &amp; Billing Aplikasi</h2>
						<p class="mt-1 text-xs text-slate-500">
							Breakdown status lamaran, tipe biaya, dan pemakaian kuota bulanan.
						</p>
					</div>
					<span class="rounded-full bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-300 ring-1 ring-inset ring-cyan-500/20">
						Global
					</span>
				</div>

				<div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
					{#each applicationStatusOrder as status}
						{@const count = overview.applications.byStatus[status]}
						<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
							<p class="text-[10px] uppercase tracking-wide text-slate-500">
								{applicationStatusLabel[status]}
							</p>
							<p class="mt-1 text-lg font-bold text-white">{formatNumber(count)}</p>
							<div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
								<div
									class="h-full rounded-full {applicationStatusTone[status].includes('emerald') ? 'bg-emerald-500' : applicationStatusTone[status].includes('amber') ? 'bg-amber-500' : applicationStatusTone[status].includes('cyan') ? 'bg-cyan-500' : 'bg-rose-500'}"
									style:width={`${overview.applications.total > 0 ? (count / overview.applications.total) * 100 : 0}%`}
								></div>
							</div>
						</div>
					{/each}
				</div>

				<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
						<p class="text-[10px] uppercase tracking-wide text-slate-500">Reply rate</p>
						<p class="mt-1 text-lg font-bold text-cyan-300">
							{formatRate(overview.applications.replyRate)}
						</p>
					</div>
					<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
						<p class="text-[10px] uppercase tracking-wide text-slate-500">Kuota bulanan terpakai</p>
						<p class="mt-1 text-lg font-bold text-white">
							{formatNumber(overview.quotas.monthlyApplicationsUsed)}
						</p>
					</div>
					<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
						<p class="text-[10px] uppercase tracking-wide text-slate-500">Total saldo PAYG</p>
						<p class="mt-1 text-lg font-bold text-white">
							{formatNumber(overview.quotas.totalPaygBalance)}
						</p>
					</div>
					<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
						<p class="text-[10px] uppercase tracking-wide text-slate-500">Total kredit AI</p>
						<p class="mt-1 text-lg font-bold text-violet-300">
							{formatNumber(overview.quotas.totalCreditBalance)}
						</p>
					</div>
				</div>

				<div class="mt-3 flex flex-wrap gap-2 text-[11px]">
					<span class="rounded-full border border-slate-700 px-2.5 py-1 text-slate-300">
						Kuota bulanan: {formatNumber(overview.applications.byChargeType.MONTHLY_QUOTA)}
					</span>
					<span class="rounded-full border border-slate-700 px-2.5 py-1 text-slate-300">
						PAYG: {formatNumber(overview.applications.byChargeType.PAYG)}
					</span>
					<span class="rounded-full border border-slate-700 px-2.5 py-1 text-slate-500">
						Lamaran terakhir: {formatDate(overview.applications.lastApplicationAt)}
					</span>
				</div>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
				<h2 class="text-sm font-semibold text-white">Subscription per Paket</h2>
				<p class="mt-1 text-xs text-slate-500">Nilai dari subscriber aktif.</p>
				{#if overview.subscriptions.byPackage.length === 0}
					<p class="mt-4 text-xs text-slate-400">Belum ada subscription aktif.</p>
				{:else}
					<ul class="mt-4 space-y-2.5">
						{#each overview.subscriptions.byPackage as pkg (pkg.packageId)}
							<li class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0">
										<p class="truncate text-xs font-semibold text-slate-200">{pkg.name}</p>
										<p class="mt-0.5 text-[10px] text-slate-500">
											{formatNumber(pkg.activeSubscribers)} subscriber ·
											{formatRupiah(pkg.price)}
										</p>
									</div>
									<span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset {tierTone[pkg.tier]}">
										{tierLabel[pkg.tier]}
									</span>
								</div>
								<p class="mt-1.5 text-[11px] font-semibold text-emerald-300">
									{formatRupiah(pkg.activeValueIdr)}
								</p>
							</li>
						{/each}
					</ul>
				{/if}
				<div class="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
					<p class="text-[10px] uppercase tracking-wide text-slate-500">Tier user</p>
					<div class="mt-2 flex flex-wrap gap-1.5">
						{#each Object.entries(overview.users.byTier) as [tier, count] (tier)}
							<span class="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300">
								{subscriptionTierLabel[tier as SubscriptionTier]}: {formatNumber(count)}
							</span>
						{/each}
					</div>
				</div>
			</div>
		</section>

		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
			<div class="flex flex-col gap-2 sm:flex-row">
				<div class="relative flex-1">
					<Search
						size={16}
						class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
					/>
					<input
						bind:value={searchInput}
						onkeydown={(event) => {
							if (event.key === 'Enter') applySearch();
						}}
						maxlength="160"
						placeholder="Cari email atau nama user..."
						class="{inputClass} pl-9"
					/>
				</div>
				<button
					type="button"
					onclick={applySearch}
					class="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400"
				>
					<Search size={15} /> Cari
				</button>
				<button
					type="button"
					onclick={resetFilters}
					class="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
				>
					Reset
				</button>
			</div>
			<div class="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
				<select
					value={billingStatusFilter}
					onchange={(event) => {
						billingStatusFilter = event.currentTarget.value as '' | BillingStatus;
						changeFilter();
					}}
					aria-label="Filter billing status"
					class={inputClass}
				>
					{#each billingStatusOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
				<select
					value={tierFilter}
					onchange={(event) => {
						tierFilter = event.currentTarget.value as '' | SubscriptionTier;
						changeFilter();
					}}
					aria-label="Filter tier"
					class={inputClass}
				>
					{#each tierOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
				<select
					value={roleFilter}
					onchange={(event) => {
						roleFilter = event.currentTarget.value as '' | UserRole;
						changeFilter();
					}}
					aria-label="Filter role"
					class={inputClass}
				>
					{#each roleOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
				<select
					value={packageFilter}
					onchange={(event) => {
						packageFilter = event.currentTarget.value;
						changeFilter();
					}}
					aria-label="Filter paket"
					class={inputClass}
				>
					<option value="">Semua paket</option>
					{#each packages as pkg}
						<option value={pkg.id}>{pkg.name}</option>
					{/each}
				</select>
			</div>
		</div>

		{#if users.length === 0}
			<div class="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center">
				<span class="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
					<CreditCard size={24} />
				</span>
				<h2 class="mt-4 text-lg font-semibold text-white">Tidak ada user billing</h2>
				<p class="mt-1 text-sm text-slate-400">Tidak ada data yang cocok dengan filter saat ini.</p>
			</div>
		{:else}
			<div class="flex flex-wrap items-center justify-between gap-2">
				<p class="text-xs text-slate-500">
					Menampilkan {users.length} user
					{#if meta}· total {formatNumber(meta.total)} user{/if}
				</p>
				{#if meta}
					<p class="text-xs text-slate-500">Halaman {meta.page} / {meta.totalPages}</p>
				{/if}
			</div>

			<div class="grid gap-4 xl:grid-cols-2">
				{#each users as item (item.userId)}
					{@const quota = effectiveEmailQuota(item, packages)}
					<article class="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<div class="flex items-start justify-between gap-3">
							<div class="flex min-w-0 items-start gap-3">
								<span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-sm font-bold text-indigo-300 ring-1 ring-inset ring-indigo-500/20">
									{userInitial(item)}
								</span>
								<div class="min-w-0">
									<h3 class="truncate text-sm font-semibold text-white" title={userName(item)}>
										{userName(item)}
									</h3>
									<p class="truncate text-xs text-slate-400" title={item.email}>{item.email}</p>
									<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
										<span class="rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset {userRoleTone[item.role]}">
											{userRoleLabel[item.role]}
										</span>
										<span class="rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset {subscriptionTierTone[item.tier]}">
											{subscriptionTierLabel[item.tier]}
										</span>
										<span class="rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset {billingStatusTone[item.billingStatus]}">
											{billingStatusLabel[item.billingStatus]}
										</span>
									</div>
								</div>
							</div>
							<button
								type="button"
								onclick={() => void openDetail(item)}
								class="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-200"
							>
								Detail <ArrowRight size={13} />
							</button>
						</div>

						<div class="mt-3 grid gap-2 sm:grid-cols-2">
							<div class="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
								<p class="text-[10px] uppercase tracking-wide text-slate-500">Langganan</p>
								{#if item.subscription}
									<p class="mt-1 truncate text-xs font-semibold text-slate-200">
										{item.subscription.package.name}
									</p>
									<p class="mt-0.5 text-[10px] text-slate-500">
										{subscriptionStatusLabel[item.subscription.status]} · s.d.
										{formatDateShort(item.subscription.endDate)} · {item.subscription.remainingDays}
										hari
									</p>
								{:else}
									<p class="mt-1 text-xs text-slate-400">Belum berlangganan</p>
								{/if}
							</div>
							<div class="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
								<div class="flex items-center justify-between gap-2 text-[10px] text-slate-500">
									<span>Kuota bulanan</span>
									<span>
										{formatNumber(quota.remaining)} / {formatNumber(quota.limit)} tersisa
									</span>
								</div>
								<div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
									<div
										class="h-full rounded-full bg-indigo-500"
										style:width={`${quotaPercent(quota.remaining, quota.limit)}%`}
									></div>
								</div>
								<p class="mt-1 text-[10px] text-slate-500">
									Terpakai {formatNumber(quota.used)} · PAYG
									{formatNumber(item.quotas.paygBalance)} · Kredit
									{formatNumber(item.quotas.creditBalance)} · tes
									{formatNumber(item.quotas.monthlyTestRemaining)} /
									{formatNumber(item.quotas.monthlyTestQuota)} tersisa
								</p>
							</div>
						</div>

						<div class="mt-2 grid gap-2 sm:grid-cols-2">
							<div class="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
								<div class="flex items-center justify-between gap-2">
									<p class="text-[10px] uppercase tracking-wide text-slate-500">Aplikasi</p>
									<p class="text-[11px] font-semibold text-slate-200">
										{formatNumber(item.applications.total)} · reply
										{formatRate(item.applications.replyRate)}
									</p>
								</div>
								<div class="mt-1.5 flex flex-wrap gap-1">
									{#each applicationStatusOrder as status}
										<span class="rounded-full px-1.5 py-0.5 text-[9px] font-medium ring-1 ring-inset {applicationStatusTone[status]}">
											{applicationStatusLabel[status]} {formatNumber(item.applications.byStatus[status])}
										</span>
									{/each}
								</div>
								<p class="mt-1 text-[10px] text-slate-500">
									Kuota {formatNumber(item.applications.byChargeType.MONTHLY_QUOTA)} · PAYG
									{formatNumber(item.applications.byChargeType.PAYG)}
								</p>
							</div>
							<div class="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
								<p class="text-[10px] uppercase tracking-wide text-slate-500">Estimasi Billing</p>
								<p class="mt-1 text-sm font-bold text-emerald-300">
									{formatRupiah(item.billing.estimatedBillingValueIdr)}
								</p>
								<p class="mt-0.5 text-[10px] text-slate-500">
									Subs {formatRupiah(item.billing.activeSubscriptionValueIdr)} · PAYG
									{formatRupiah(item.billing.paygConsumedValueIdr)}
								</p>
							</div>
						</div>

						<div class="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-800 pt-3">
							<button
								type="button"
								onclick={() => openQuota(item)}
								class="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
							>
								<Wallet size={12} /> Kuota
							</button>
							<button
								type="button"
								onclick={() => openSubscription(item)}
								class="inline-flex items-center gap-1 rounded-lg border border-indigo-500/30 px-2.5 py-1.5 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/10"
							>
								<Package size={12} /> Langganan
							</button>
						</div>
					</article>
				{/each}
			</div>

			{#if meta && meta.totalPages > 1}
				<div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
					<p class="text-xs text-slate-500">
						Halaman {meta.page} dari {meta.totalPages} · {formatNumber(meta.total)} user
					</p>
					<div class="flex gap-2">
						<button
							type="button"
							onclick={() => goToPage(pageNumber - 1)}
							disabled={meta.page <= 1}
							class="inline-flex h-8 items-center justify-center rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
						>
							Sebelumnya
						</button>
						<button
							type="button"
							onclick={() => goToPage(pageNumber + 1)}
							disabled={meta.page >= meta.totalPages}
							class="inline-flex h-8 items-center justify-center rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
						>
							Selanjutnya
						</button>
					</div>
				</div>
			{/if}
		{/if}
	{/if}
</div>

<Modal
	open={detailOpen}
	title={detail ? userName(detail) : (detailTarget ? userName(detailTarget) : 'Detail Billing User')}
	description={detail?.email ?? detailTarget?.email ?? ''}
	size="lg"
	onclose={closeDetail}
>
	{#if detailLoading}
		<div class="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
			<Spinner label="Memuat detail billing" /> Memuat detail billing...
		</div>
	{:else if detailError}
		<div class="p-6 text-center">
			<p class="text-sm text-rose-300" role="alert">{detailError}</p>
			<button
				type="button"
				onclick={() => detailTarget && void openDetail(detailTarget)}
				class="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-3 text-xs font-semibold text-white transition hover:bg-indigo-400"
			>
				<RefreshCw size={14} /> Coba lagi
			</button>
		</div>
	{:else if detail}
		{@const detailQuota = effectiveEmailQuota(detail, packages)}
		<div class="space-y-4">
			<div class="flex flex-wrap items-center gap-1.5">
				<span class="rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset {userRoleTone[detail.role]}">
					{userRoleLabel[detail.role]}
				</span>
				<span class="rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset {subscriptionTierTone[detail.tier]}">
					{subscriptionTierLabel[detail.tier]}
				</span>
				<span class="rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset {billingStatusTone[detail.billingStatus]}">
					{billingStatusLabel[detail.billingStatus]}
				</span>
				{#if detail.account.emailVerified}
					<span class="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
						Email terverifikasi
					</span>
				{/if}
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
					<h3 class="text-xs font-semibold uppercase tracking-wide text-slate-400">Langganan</h3>
					{#if detail.subscription}
						<div class="mt-3 space-y-2 text-xs">
							<div class="flex justify-between gap-3">
								<span class="text-slate-500">Paket</span>
								<span class="text-right font-medium text-slate-200">{detail.subscription.package.name}</span>
							</div>
							<div class="flex justify-between gap-3">
								<span class="text-slate-500">Tier paket</span>
								<span class="text-right font-medium text-slate-200">{tierLabel[detail.subscription.package.tier]}</span>
							</div>
							<div class="flex justify-between gap-3">
								<span class="text-slate-500">Status</span>
								<span class="text-right font-medium text-slate-200">{subscriptionStatusLabel[detail.subscription.status]}</span>
							</div>
							<div class="flex justify-between gap-3">
								<span class="text-slate-500">Harga paket</span>
								<span class="text-right font-medium text-slate-200">{formatRupiah(detail.subscription.package.price)}</span>
							</div>
							<div class="flex justify-between gap-3">
								<span class="text-slate-500">Mulai</span>
								<span class="text-right font-medium text-slate-200">{formatDateShort(detail.subscription.startDate)}</span>
							</div>
							<div class="flex justify-between gap-3">
								<span class="text-slate-500">Berakhir</span>
								<span class="text-right font-medium text-slate-200">{formatDateShort(detail.subscription.endDate)}</span>
							</div>
							<div class="flex justify-between gap-3">
								<span class="text-slate-500">Sisa hari</span>
								<span class="text-right font-medium text-slate-200">{detail.subscription.remainingDays} hari</span>
							</div>
						</div>
					{:else}
						<p class="mt-3 text-xs text-slate-400">Belum memiliki subscription.</p>
					{/if}
				</div>

				<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
					<h3 class="text-xs font-semibold uppercase tracking-wide text-slate-400">Kuota</h3>
					<div class="mt-3 space-y-2 text-xs">
						<p class="flex justify-between gap-3">
							<span class="text-slate-500">Kuota bulanan</span>
							<span class="font-medium text-slate-200">
								{formatNumber(detailQuota.remaining)} / {formatNumber(detailQuota.limit)} tersisa
								({formatNumber(detailQuota.used)} terpakai)
							</span>
						</p>
						<p class="flex justify-between gap-3">
							<span class="text-slate-500">Kuota tes</span>
							<span class="font-medium text-slate-200">
								{formatNumber(detail.quotas.monthlyTestRemaining)} /
								{formatNumber(detail.quotas.monthlyTestQuota)} tersisa
							</span>
						</p>
						<p class="flex justify-between gap-3">
							<span class="text-slate-500">Saldo PAYG</span>
							<span class="font-medium text-slate-200">{formatNumber(detail.quotas.paygBalance)}</span>
						</p>
						<p class="flex justify-between gap-3">
							<span class="text-slate-500">Saldo kredit AI</span>
							<span class="font-medium text-slate-200">{formatNumber(detail.quotas.creditBalance)}</span>
						</p>
						<p class="flex justify-between gap-3">
							<span class="text-slate-500">Reset kuota</span>
							<span class="text-right font-medium text-slate-200">{formatDate(detail.quotas.quotaResetAt)}</span>
						</p>
					</div>
				</div>
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
					<h3 class="text-xs font-semibold uppercase tracking-wide text-slate-400">Billing</h3>
					<div class="mt-3 space-y-2 text-xs">
						<p class="flex justify-between gap-3">
							<span class="text-slate-500">Subscription aktif</span>
							<span class="font-medium text-slate-200">{formatRupiah(detail.billing.activeSubscriptionValueIdr)}</span>
						</p>
						<p class="flex justify-between gap-3">
							<span class="text-slate-500">PAYG</span>
							<span class="font-medium text-slate-200">
								{formatNumber(detail.billing.paygApplications)} lamaran ·
								{formatRupiah(detail.billing.paygConsumedValueIdr)}
							</span>
						</p>
						<p class="flex justify-between gap-3">
							<span class="text-slate-500">Estimasi billing</span>
							<span class="font-semibold text-emerald-300">{formatRupiah(detail.billing.estimatedBillingValueIdr)}</span>
						</p>
						<p class="flex justify-between gap-3">
							<span class="text-slate-500">Terdaftar</span>
							<span class="font-medium text-slate-200">{formatDate(detail.account.createdAt)}</span>
						</p>
					</div>
				</div>

				<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
					<h3 class="text-xs font-semibold uppercase tracking-wide text-slate-400">Aplikasi</h3>
					<div class="mt-3 space-y-2 text-xs">
						<p class="flex justify-between gap-3">
							<span class="text-slate-500">Total</span>
							<span class="font-medium text-slate-200">{formatNumber(detail.applications.total)}</span>
						</p>
						<p class="flex justify-between gap-3">
							<span class="text-slate-500">Reply rate</span>
							<span class="font-medium text-cyan-300">{formatRate(detail.applications.replyRate)}</span>
						</p>
						<p class="flex justify-between gap-3">
							<span class="text-slate-500">Kuota / PAYG</span>
							<span class="font-medium text-slate-200">
								{formatNumber(detail.applications.byChargeType.MONTHLY_QUOTA)} /
								{formatNumber(detail.applications.byChargeType.PAYG)}
							</span>
						</p>
						<p class="flex justify-between gap-3">
							<span class="text-slate-500">Terakhir</span>
							<span class="text-right font-medium text-slate-200">{formatDate(detail.applications.lastApplicationAt)}</span>
						</p>
					</div>
				</div>
			</div>

			<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
				<h3 class="text-xs font-semibold uppercase tracking-wide text-slate-400">
					Lamaran Terbaru
				</h3>
				{#if detail.recentApplications.length === 0}
					<p class="mt-3 text-xs text-slate-400">Belum ada lamaran.</p>
				{:else}
					<ul class="mt-3 divide-y divide-slate-800/70">
						{#each detail.recentApplications as application (application.id)}
							<li class="py-2.5 first:pt-0 last:pb-0">
								<div class="flex flex-wrap items-start justify-between gap-2">
									<div class="min-w-0">
										<p class="truncate text-xs font-medium text-slate-200" title={application.jobTitle}>
											{application.jobTitle}
										</p>
										<p class="truncate text-[10px] text-slate-500" title={application.companyName}>
											{application.companyName}
										</p>
									</div>
									<div class="flex shrink-0 items-center gap-1.5">
										<span class="rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset {applicationStatusTone[application.status]}">
											{applicationStatusLabel[application.status]}
										</span>
										<span class="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400">
											{applicationChargeTypeLabel[application.chargeType]}
										</span>
									</div>
								</div>
								<p class="mt-1 text-[10px] text-slate-500">
									Dikirim {formatDate(application.sentAt)} · dibuat {formatDate(application.createdAt)}
									{#if application.repliedAt}· dibalas {formatDate(application.repliedAt)}{/if}
								</p>
								{#if application.failureReason}
									<p class="mt-1 text-[10px] text-rose-300">{application.failureReason}</p>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	{/if}

	{#snippet footer()}
		{#if detail}
			<button
				type="button"
				onclick={() => openQuota(detail)}
				class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
			>
				<Wallet size={14} /> Atur Kuota
			</button>
			<button
				type="button"
				onclick={() => openSubscription(detail)}
				class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400"
			>
				<Package size={14} /> Assign / Renew
			</button>
		{/if}
		<button
			type="button"
			onclick={closeDetail}
			class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
		>
			Tutup
		</button>
	{/snippet}
</Modal>

<Modal
	open={quotaTarget !== null}
	title="Atur Kuota, PAYG & Kredit"
	description={quotaTarget?.email ?? ''}
	size="lg"
	onclose={() => (isSavingQuota ? undefined : (quotaTarget = null))}
>
	{#if quotaTarget}
		<div class="space-y-4">
			{#if quotaError}
				<Alert type="error" message={quotaError} />
			{/if}
			<div class="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-[11px] leading-5 text-sky-100/80">
				Pemakaian tidak boleh melebihi kuota. Kosongkan tanggal reset jika tidak ingin mengubahnya.
			</div>
			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block space-y-1.5 text-sm font-medium text-slate-300">
					Kuota bulanan
					<input type="number" min="0" bind:value={quotaMonthlyQuota} class={inputClass} />
				</label>
				<label class="block space-y-1.5 text-sm font-medium text-slate-300">
					Pemakaian bulanan
					<input type="number" min="0" bind:value={quotaMonthlyUsed} class={inputClass} />
				</label>
				<label class="block space-y-1.5 text-sm font-medium text-slate-300">
					Kuota tes
					<input type="number" min="0" bind:value={quotaTestQuota} class={inputClass} />
				</label>
				<label class="block space-y-1.5 text-sm font-medium text-slate-300">
					Pemakaian tes
					<input type="number" min="0" bind:value={quotaTestUsed} class={inputClass} />
				</label>
				<label class="block space-y-1.5 text-sm font-medium text-slate-300">
					Saldo PAYG
					<input type="number" min="0" bind:value={quotaPaygBalance} class={inputClass} />
				</label>
				<label class="block space-y-1.5 text-sm font-medium text-slate-300">
					Saldo kredit AI
					<input type="number" min="0" bind:value={quotaCreditBalance} class={inputClass} />
				</label>
				<label class="block space-y-1.5 text-sm font-medium text-slate-300">
					Reset kuota bulanan
					<input type="datetime-local" bind:value={quotaResetAt} class={inputClass} />
				</label>
				<label class="block space-y-1.5 text-sm font-medium text-slate-300 sm:col-span-2">
					Reset kuota tes
					<input type="datetime-local" bind:value={quotaTestResetAt} class={inputClass} />
				</label>
			</div>
		</div>
	{/if}

	{#snippet footer()}
		<button
			type="button"
			onclick={() => (quotaTarget = null)}
			disabled={isSavingQuota}
			class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
		>
			Batal
		</button>
		<button
			type="button"
			onclick={() => void saveQuota()}
			disabled={isSavingQuota}
			class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
		>
			{#if isSavingQuota}<Spinner label="Menyimpan kuota" />{/if}
			Simpan Kuota
		</button>
	{/snippet}
</Modal>

<Modal
	open={subscriptionTarget !== null}
	title="Assign / Renew Langganan"
	description={subscriptionTarget?.email ?? ''}
	size="lg"
	onclose={() => (isSavingSubscription ? undefined : (subscriptionTarget = null))}
>
	{#if subscriptionTarget}
		<div class="space-y-4">
			{#if subscriptionError}
				<Alert type="error" message={subscriptionError} />
			{/if}
			{#if packages.length === 0}
				<Alert
					type="warning"
					message="Belum ada paket langganan. Buat paket terlebih dahulu di halaman Subscription Packages."
				/>
				<a
					href="/superadmin/packages"
					class="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 transition hover:text-indigo-200"
				>
					Buka Subscription Packages <ArrowRight size={13} />
				</a>
			{/if}
			{#if subscriptionTarget.subscription}
				<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-[11px] leading-5 text-slate-400">
					Saat ini: <span class="text-slate-200">{subscriptionTarget.subscription.package.name}</span>
					· {subscriptionStatusLabel[subscriptionTarget.subscription.status]} · berakhir
					{formatDateShort(subscriptionTarget.subscription.endDate)}
				</div>
			{/if}
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Paket <span class="text-rose-400">*</span>
				<select bind:value={subPackageId} class={inputClass}>
					<option value="">Pilih paket</option>
					{#each packages as pkg}
						<option value={pkg.id}>
							{pkg.name} · {tierLabel[pkg.tier]} · {formatRupiah(pkg.price)} · {pkg.durationDays} hari{pkg.isActive ? '' : ' (nonaktif)'}
						</option>
					{/each}
				</select>
			</label>
			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block space-y-1.5 text-sm font-medium text-slate-300">
					Mulai
					<input type="date" bind:value={subStartDate} class={inputClass} />
				</label>
				<label class="block space-y-1.5 text-sm font-medium text-slate-300">
					Berakhir
					<input type="date" bind:value={subEndDate} class={inputClass} />
					<p class="text-[10px] font-normal text-slate-500">
						Kosong = end date lama atau durasi paket.
					</p>
				</label>
				<label class="block space-y-1.5 text-sm font-medium text-slate-300">
					Tambah hari
					<input
						type="number"
						min="1"
						bind:value={subExtendDays}
						disabled={Boolean(subEndDate)}
						placeholder="Opsional"
						class={inputClass}
					/>
					<p class="text-[10px] font-normal text-slate-500">
						Dipakai jika tanggal berakhir kosong.
					</p>
				</label>
				<label class="block space-y-1.5 text-sm font-medium text-slate-300">
					Status
					<select bind:value={subStatus} class={inputClass}>
						{#each subscriptionStatuses as status}
							<option value={status}>{subscriptionStatusLabel[status]}</option>
						{/each}
					</select>
				</label>
			</div>
			<label class="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300">
				<input type="checkbox" bind:checked={subResetUsage} class="h-4 w-4 rounded border-slate-600 bg-slate-950 text-indigo-500" />
				Reset pemakaian bulanan dan tes
			</label>
			<p class="text-[11px] leading-5 text-slate-500">
				Assign/renew akan menyamakan tier user, kuota AI, kuota lamaran, dan kuota tes dengan paket
				yang dipilih.
			</p>
		</div>
	{/if}

	{#snippet footer()}
		<button
			type="button"
			onclick={() => (subscriptionTarget = null)}
			disabled={isSavingSubscription}
			class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
		>
			Batal
		</button>
		<button
			type="button"
			onclick={() => void saveSubscription()}
			disabled={isSavingSubscription || packages.length === 0}
			class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
		>
			{#if isSavingSubscription}<Spinner label="Menyimpan langganan" />{/if}
			Simpan Langganan
		</button>
	{/snippet}
</Modal>
