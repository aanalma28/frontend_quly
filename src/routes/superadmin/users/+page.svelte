<script lang="ts">
	import { onMount } from 'svelte';
	import {
		ArrowRight,
		BriefcaseBusiness,
		CheckCircle2,
		ClipboardList,
		Mail,
		RefreshCw,
		Search,
		Shield,
		UserCheck,
		Users
	} from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/superadmin/Alert.svelte';
	import KpiCard from '#lib/components/superadmin/KpiCard.svelte';
	import Modal from '#lib/components/superadmin/Modal.svelte';
	import {
		formatDate,
		formatDateShort,
		formatNumber
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
		userRoleLabel,
		userRoleTone
	} from '#lib/components/superadmin/status.js';
	import {
		getUserDetailApi,
		getUserStatsApi,
		listPackagesApi,
		listUsersApi,
		updateUserRoleApi,
		type ApplicationStatus,
		type PaginationMeta,
		type SubStatus,
		type SubscriptionPackage,
		type SubscriptionTier,
		type UserDetail,
		type UserListItem,
		type UserRole,
		type UserStatsResponse
	} from '#lib/services/superadminApi.js';
	import { effectiveEmailQuota } from '#lib/utils/superadminQuota.js';
	import { isUnlimitedQuota } from '#lib/utils/billing.js';
	import { auth } from '#lib/stores/auth.js';

	const LIMIT = 12;
	const roles: UserRole[] = ['JOB_SEEKER', 'ADMIN', 'SUPER_ADMIN'];
	const roleOptions: Array<{ value: '' | UserRole; label: string }> = [
		{ value: '', label: 'Semua role' },
		{ value: 'JOB_SEEKER', label: 'Job Seeker' },
		{ value: 'ADMIN', label: 'Admin' },
		{ value: 'SUPER_ADMIN', label: 'Super Admin' }
	];
	const tierOptions: Array<{ value: '' | SubscriptionTier; label: string }> = [
		{ value: '', label: 'Semua tier' },
		{ value: 'FREE_PLAN', label: 'Free Plan' },
		{ value: 'STARTER_PLAN', label: 'Starter Plan' },
		{ value: 'PRO_PLAN', label: 'Pro Plan' },
		{ value: 'UNLIMITED_PLAN', label: 'Unlimited Plan' }
	];
	const tierOrder: SubscriptionTier[] = [
		'FREE_PLAN',
		'STARTER_PLAN',
		'PRO_PLAN',
		'UNLIMITED_PLAN'
	];
	const applicationStatusOrder: ApplicationStatus[] = ['PENDING', 'SENT', 'READ', 'REPLIED', 'FAILED'];

	const inputClass =
		'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30';

	let users = $state<UserListItem[]>([]);
	let meta = $state<PaginationMeta | null>(null);
	let stats = $state<UserStatsResponse | null>(null);
	let packages = $state<SubscriptionPackage[]>([]);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	let searchInput = $state('');
	let appliedSearch = $state('');
	let roleFilter = $state<'' | UserRole>('');
	let tierFilter = $state<'' | SubscriptionTier>('');
	let subscriptionStatusFilter = $state<'' | SubStatus>('');
	let emailVerifiedFilter = $state<'' | 'true' | 'false'>('');
	let onboardingFilter = $state<'' | 'true' | 'false'>('');
	let page = $state(1);

	let detailOpen = $state(false);
	let detailTarget = $state<UserListItem | null>(null);
	let detail = $state<UserDetail | null>(null);
	let detailLoading = $state(false);
	let detailError = $state<string | null>(null);
	let roleDraft = $state<UserRole>('JOB_SEEKER');
	let isSavingRole = $state(false);
	let roleError = $state<string | null>(null);
	let roleSuccess = $state<string | null>(null);

	const totalTierUsers = $derived(
		tierOrder.reduce((sum, tier) => sum + (stats?.tiers[tier] ?? 0), 0)
	);

	function formatRate(value: number): string {
		return `${new Intl.NumberFormat('id-ID', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(value)}%`;
	}

	function quotaValue(limit: number, remaining: number): string {
		if (isUnlimitedQuota(limit)) return 'Tanpa batas';
		return `${formatNumber(Math.max(remaining, 0))} / ${formatNumber(limit)}`;
	}

	function benefitQuotaValue(benefit: {
		limit: number;
		remaining: number;
		freeLifetimeLimit: number;
		freeLifetimeRemaining: number;
	}): string {
		if (benefit.limit <= 0 && benefit.freeLifetimeLimit > 0) {
			return `Lifetime ${formatNumber(Math.max(benefit.freeLifetimeRemaining, 0))} / ${formatNumber(benefit.freeLifetimeLimit)}`;
		}
		return quotaValue(benefit.limit, benefit.remaining);
	}

	function benefitUsed(benefit: {
		limit: number;
		used: number;
		freeLifetimeLimit: number;
		freeLifetimeUsed: number;
	}): number {
		return benefit.limit <= 0 && benefit.freeLifetimeLimit > 0
			? benefit.freeLifetimeUsed
			: benefit.used;
	}

	function benefitLabel(code: string): string {
		return code
			.toLowerCase()
			.split('_')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ');
	}

	function applicationSourceLabel(source?: string): string {
		return source === 'AUTO_APPLY' ? 'Auto-Apply' : 'Legacy';
	}

	function userInitial(user: UserListItem | UserDetail): string {
		const name = user.profile.fullName ?? user.email;
		return name.slice(0, 1).toUpperCase();
	}

	function userDisplayName(user: UserListItem | UserDetail): string {
		return user.profile.fullName ?? user.email;
	}

	function errorText(error: unknown, fallback: string): string {
		return error instanceof Error ? error.message : fallback;
	}

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			const [list, statsData, packageList] = await Promise.all([
				listUsersApi({
					search: appliedSearch || undefined,
					role: roleFilter || undefined,
					tier: tierFilter || undefined,
					subscriptionStatus: subscriptionStatusFilter || undefined,
					emailVerified:
						emailVerifiedFilter === '' ? undefined : emailVerifiedFilter === 'true',
					onboardingCompleted:
						onboardingFilter === '' ? undefined : onboardingFilter === 'true',
					page,
					limit: LIMIT
				}),
				getUserStatsApi(),
				listPackagesApi().catch(() => [] as SubscriptionPackage[])
			]);
			users = list.items;
			meta = list.meta;
			stats = statsData;
			packages = packageList;
		} catch (error) {
			loadError = errorText(error, 'Data user belum dapat dimuat.');
		} finally {
			isLoading = false;
		}
	}

	function applySearch() {
		appliedSearch = searchInput.trim();
		page = 1;
		void load();
	}

	function changeFilter() {
		page = 1;
		void load();
	}

	function resetFilters() {
		searchInput = '';
		appliedSearch = '';
		roleFilter = '';
		tierFilter = '';
		subscriptionStatusFilter = '';
		emailVerifiedFilter = '';
		onboardingFilter = '';
		page = 1;
		void load();
	}

	function goToPage(next: number) {
		if (!meta) return;
		if (next < 1 || next > meta.totalPages) return;
		page = next;
		void load();
	}

	async function openDetail(user: UserListItem) {
		detailOpen = true;
		detailTarget = user;
		detail = null;
		detailError = null;
		detailLoading = true;
		roleError = null;
		roleSuccess = null;
		try {
			const data = await getUserDetailApi(user.id);
			detail = data;
			roleDraft = data.role;
		} catch (error) {
			detailError = errorText(error, 'Detail user belum dapat dimuat.');
		} finally {
			detailLoading = false;
		}
	}

	function closeDetail() {
		if (isSavingRole) return;
		detailOpen = false;
		detailTarget = null;
		detail = null;
	}

	async function saveRole() {
		if (!detail || isSavingRole || roleDraft === detail.role) return;
		isSavingRole = true;
		roleError = null;
		roleSuccess = null;
		try {
			const updated = await updateUserRoleApi(detail.id, roleDraft);
			detail = { ...detail, role: updated.role };
			roleSuccess = `Role ${updated.email} diubah menjadi ${userRoleLabel[updated.role]}.`;
			successMessage = roleSuccess;
			await load();
		} catch (error) {
			roleError = errorText(error, 'Role user belum dapat diubah.');
		} finally {
			isSavingRole = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>User Management | Superadmin</title>
</svelte:head>

<div class="space-y-6">
	<header class="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
		<div>
			<p class="text-sm font-semibold text-amber-300">People</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight text-white">User Management</h1>
			<p class="mt-2 text-sm text-slate-400">
				Lihat profil, role, tier, langganan, kuota, dan aktivitas lamaran seluruh user.
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

	{#if isLoading}
		<div class="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
			<Spinner label="Memuat user" /> Memuat user...
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
	{:else}
		{#if stats}
			<section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
				<KpiCard
					label="Total User"
					value={formatNumber(stats.users.total)}
					hint={`${formatNumber(stats.users.onboardingCompleted)} onboarding selesai`}
					icon={Users}
					tone="indigo"
				/>
				<KpiCard
					label="Job Seeker"
					value={formatNumber(stats.users.jobSeekers)}
					hint="Pencari kerja"
					icon={BriefcaseBusiness}
					tone="emerald"
				/>
				<KpiCard
					label="Admin"
					value={formatNumber(stats.users.admins)}
					hint="Admin psikotes"
					icon={Shield}
					tone="amber"
				/>
				<KpiCard
					label="Super Admin"
					value={formatNumber(stats.users.superAdmins)}
					hint="Akses penuh"
					icon={UserCheck}
					tone="rose"
				/>
				<KpiCard
					label="Email Terverifikasi"
					value={formatNumber(stats.users.emailVerified)}
					hint={`dari ${formatNumber(stats.users.total)} user`}
					icon={Mail}
					tone="violet"
				/>
			</section>

			<section class="grid gap-4 lg:grid-cols-3">
				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-2">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div>
							<h2 class="text-sm font-semibold text-white">Auto-Apply Applications</h2>
							<p class="mt-1 text-xs text-slate-500">
								Statistik lamaran otomatis seluruh user. Sumber data:
								<code class="text-slate-400">users/stats</code>.
							</p>
						</div>
						<span class="rounded-full bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-300 ring-1 ring-inset ring-cyan-500/20">
							<ClipboardList size={11} class="mr-1 inline" /> Global
						</span>
					</div>

					<div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
						<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
							<p class="text-[10px] uppercase tracking-wide text-slate-500">Total</p>
							<p class="mt-1 text-lg font-bold text-white">
								{formatNumber(stats.applications.total)}
							</p>
						</div>
						{#each applicationStatusOrder as status}
							<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
								<p class="text-[10px] uppercase tracking-wide text-slate-500">
									{applicationStatusLabel[status]}
								</p>
								<p class="mt-1 text-lg font-bold text-white">
									{formatNumber(stats.applications.byStatus[status] ?? 0)}
								</p>
							</div>
						{/each}
					</div>

					<div class="mt-4 grid gap-3 sm:grid-cols-2">
						<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
							<p class="text-[10px] uppercase tracking-wide text-slate-500">Reply rate</p>
							<p class="mt-1 text-lg font-bold text-cyan-300">
								{formatRate(stats.applications.replyRate)}
							</p>
						</div>
						<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
							<p class="text-[10px] uppercase tracking-wide text-slate-500">
								User pernah melamar
							</p>
							<p class="mt-1 text-lg font-bold text-white">
								{formatNumber(stats.applications.usersWithApplications)}
							</p>
							<p class="mt-0.5 text-[10px] text-slate-500">
								Rata-rata {formatNumber(stats.applications.averagePerUser)} / user
							</p>
						</div>
					</div>

					<div class="mt-3 flex flex-wrap gap-2 text-[11px]">
						<span class="rounded-full border border-slate-700 px-2.5 py-1 text-slate-300">
							Kuota bulanan: {formatNumber(stats.applications.byChargeType.MONTHLY_QUOTA ?? 0)}
						</span>
						<span class="rounded-full border border-slate-700 px-2.5 py-1 text-slate-300">
							PAYG: {formatNumber(stats.applications.byChargeType.PAYG ?? 0)}
						</span>
						<span class="rounded-full border border-slate-700 px-2.5 py-1 text-slate-300">
							Tidak terklasifikasi:
							{formatNumber(stats.applications.byChargeType.UNCLASSIFIED ?? 0)}
						</span>
						<span class="rounded-full border border-slate-700 px-2.5 py-1 text-slate-500">
							Terakhir: {formatDate(stats.applications.lastApplicationAt)}
						</span>
					</div>
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
					<h2 class="text-sm font-semibold text-white">Distribusi Tier</h2>
					<p class="mt-1 text-xs text-slate-500">Jumlah user per tier langganan.</p>
					<ul class="mt-4 space-y-3">
						{#each tierOrder as tier}
							{@const count = stats.tiers[tier] ?? 0}
							{@const share = totalTierUsers > 0 ? (count / totalTierUsers) * 100 : 0}
							<li>
								<div class="flex items-center justify-between gap-2 text-xs">
									<span class="text-slate-400">{subscriptionTierLabel[tier]}</span>
									<span class="font-semibold text-white">{formatNumber(count)}</span>
								</div>
								<div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
									<div
										class="h-full rounded-full bg-indigo-500"
										style:width={`${share}%`}
									></div>
								</div>
							</li>
						{/each}
					</ul>
					<div class="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
						<p class="text-[10px] uppercase tracking-wide text-slate-500">Onboarding selesai</p>
						<p class="mt-1 text-lg font-bold text-emerald-300">
							{formatNumber(stats.users.onboardingCompleted)}
							<span class="text-xs font-medium text-slate-500">
								/ {formatNumber(stats.users.total)}
							</span>
						</p>
					</div>
				</div>
			</section>
		{/if}

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
						placeholder="Cari email, nama, atau nomor telepon..."
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
			<div class="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
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
					value={subscriptionStatusFilter}
					onchange={(event) => {
						subscriptionStatusFilter = event.currentTarget.value as '' | SubStatus;
						changeFilter();
					}}
					aria-label="Filter status subscription"
					class={inputClass}
				>
					<option value="">Semua status langganan</option>
					<option value="ACTIVE">Aktif</option>
					<option value="EXPIRED">Expired</option>
					<option value="CANCELLED">Dibatalkan</option>
				</select>
				<select
					value={emailVerifiedFilter}
					onchange={(event) => {
						emailVerifiedFilter = event.currentTarget.value as '' | 'true' | 'false';
						changeFilter();
					}}
					aria-label="Filter email terverifikasi"
					class={inputClass}
				>
					<option value="">Semua verifikasi email</option>
					<option value="true">Terverifikasi</option>
					<option value="false">Belum terverifikasi</option>
				</select>
				<select
					value={onboardingFilter}
					onchange={(event) => {
						onboardingFilter = event.currentTarget.value as '' | 'true' | 'false';
						changeFilter();
					}}
					aria-label="Filter onboarding"
					class={inputClass}
				>
					<option value="">Semua onboarding</option>
					<option value="true">Onboarding selesai</option>
					<option value="false">Belum onboarding</option>
				</select>
			</div>
		</div>

		{#if users.length === 0}
			<div class="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center">
				<span class="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
					<Users size={24} />
				</span>
				<h2 class="mt-4 text-lg font-semibold text-white">Tidak ada user</h2>
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
				{#each users as user (user.id)}
					{@const quota = effectiveEmailQuota(user, packages)}
					<article class="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
						<div class="flex items-start justify-between gap-3">
							<div class="flex min-w-0 items-start gap-3">
								<span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-sm font-bold text-indigo-300 ring-1 ring-inset ring-indigo-500/20">
									{userInitial(user)}
								</span>
								<div class="min-w-0">
									<h3 class="truncate text-sm font-semibold text-white" title={userDisplayName(user)}>
										{userDisplayName(user)}
									</h3>
									<p class="truncate text-xs text-slate-400" title={user.email}>{user.email}</p>
									<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
										<span class="rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset {userRoleTone[user.role]}">
											{userRoleLabel[user.role]}
										</span>
										<span class="rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset {subscriptionTierTone[user.tier]}">
											{subscriptionTierLabel[user.tier]}
										</span>
										<span class="rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset {billingStatusTone[user.billingStatus]}">
											{billingStatusLabel[user.billingStatus]}
										</span>
									</div>
								</div>
							</div>
							<button
								type="button"
								onclick={() => void openDetail(user)}
								class="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-200"
							>
								Detail <ArrowRight size={13} />
							</button>
						</div>

						<div class="mt-3 grid gap-2 sm:grid-cols-2">
							<div class="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
								<p class="text-[10px] uppercase tracking-wide text-slate-500">Langganan</p>
								{#if user.subscription}
									<p class="mt-1 truncate text-xs font-semibold text-slate-200">
										{user.subscription.package.name}
									</p>
									<p class="mt-0.5 text-[10px] text-slate-500">
										{subscriptionStatusLabel[user.subscription.status]} · s.d.
										{formatDateShort(user.subscription.endDate)} · {user.subscription.remainingDays}
										hari
									</p>
									{#if user.subscription.pendingPackage}
										<p class="mt-1 text-[10px] font-medium text-amber-300">
											Downgrade ke {user.subscription.pendingPackage.name} mulai
											{formatDateShort(user.subscription.pendingStartAt)}
										</p>
									{/if}
								{:else}
									<p class="mt-1 text-xs text-slate-400">Belum berlangganan</p>
								{/if}
							</div>
							<div class="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
								<p class="text-[10px] uppercase tracking-wide text-slate-500">Kuota & PAYG</p>
								<p class="mt-1 text-xs text-slate-200">
									{formatNumber(quota.remaining)} / {formatNumber(quota.limit)}
									<span class="text-slate-500">lamaran tersisa</span>
								</p>
								<p class="mt-0.5 text-[10px] text-slate-500">
									Terpakai {formatNumber(quota.used)} · PAYG
									{formatNumber(user.quotas.paygBalance)} · Kredit
									{formatNumber(user.quotas.creditBalance)} · tes
									{formatNumber(user.quotas.monthlyTestRemaining)} /
									{formatNumber(user.quotas.monthlyTestQuota)} tersisa
								</p>
							</div>
						</div>

						{#if user.benefitQuotas?.length}
							<div class="mt-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
								<p class="text-[10px] uppercase tracking-wide text-slate-500">Benefit</p>
								<div class="mt-1.5 flex flex-wrap gap-1.5">
									{#each user.benefitQuotas as benefit}
										<span
											class="rounded-full border border-slate-700 px-2 py-0.5 text-[9px] text-slate-300"
											title={benefit.name}
										>
											{benefitLabel(benefit.code)} {benefitQuotaValue(benefit)}
										</span>
									{/each}
								</div>
							</div>
						{/if}

						<div class="mt-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
							<div class="flex flex-wrap items-center justify-between gap-2">
								<p class="text-[10px] uppercase tracking-wide text-slate-500">Aplikasi</p>
								<p class="text-[11px] font-semibold text-slate-200">
									{formatNumber(user.applications.total)} total · reply
									{formatRate(user.applications.replyRate)}
								</p>
							</div>
							<div class="mt-2 flex flex-wrap gap-1.5">
								{#each applicationStatusOrder as status}
									<span class="rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset {applicationStatusTone[status]}">
										{applicationStatusLabel[status]}:
										{formatNumber(user.applications.byStatus[status] ?? 0)}
									</span>
								{/each}
							</div>
							<p class="mt-2 text-[10px] text-slate-500">
								Kuota bulanan {formatNumber(user.applications.byChargeType.MONTHLY_QUOTA ?? 0)} ·
								PAYG {formatNumber(user.applications.byChargeType.PAYG ?? 0)} · tidak
								terklasifikasi {formatNumber(user.applications.byChargeType.UNCLASSIFIED ?? 0)} ·
								terakhir {formatDate(user.applications.lastApplicationAt)}
							</p>
						</div>

						<div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500">
							<span>CV upload: {formatNumber(user.counts.cvFiles)}</span>
							<span>CV parsing: {formatNumber(user.counts.userCvs)}</span>
							<span>Psikotes: {formatNumber(user.counts.psychotestSessions)}</span>
							<span class="ml-auto inline-flex items-center gap-1">
								{#if user.account.emailVerified}
									<CheckCircle2 size={11} class="text-emerald-400" /> Email terverifikasi
								{:else}
									<Mail size={11} /> Email belum terverifikasi
								{/if}
							</span>
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
		{/if}
	{/if}
</div>

<Modal
	open={detailOpen}
	title={detail ? userDisplayName(detail) : (detailTarget ? userDisplayName(detailTarget) : 'Detail User')}
	description={detail?.email ?? detailTarget?.email ?? ''}
	size="lg"
	onclose={closeDetail}
>
	{#if detailLoading}
		<div class="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
			<Spinner label="Memuat detail user" /> Memuat detail user...
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
					<span class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
						<CheckCircle2 size={11} /> Email terverifikasi
					</span>
				{/if}
				{#if detail.account.onboardingCompleted}
					<span class="rounded-full bg-sky-500/10 px-2.5 py-1 text-[10px] font-semibold text-sky-300 ring-1 ring-inset ring-sky-500/20">
						Onboarding selesai
					</span>
				{/if}
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
					<h3 class="text-xs font-semibold uppercase tracking-wide text-slate-400">Profil</h3>
					<dl class="mt-3 space-y-2 text-xs">
						<div class="flex justify-between gap-3">
							<dt class="text-slate-500">Nama</dt>
							<dd class="text-right font-medium text-slate-200">{detail.profile.fullName ?? '—'}</dd>
						</div>
						<div class="flex justify-between gap-3">
							<dt class="text-slate-500">Telepon</dt>
							<dd class="text-right font-medium text-slate-200">{detail.profile.phone ?? '—'}</dd>
						</div>
						<div class="flex justify-between gap-3">
							<dt class="text-slate-500">Headline</dt>
							<dd class="text-right font-medium text-slate-200">{detail.profile.headline ?? '—'}</dd>
						</div>
						<div class="flex justify-between gap-3">
							<dt class="text-slate-500">Target role</dt>
							<dd class="text-right font-medium text-slate-200">{detail.profile.targetRole ?? '—'}</dd>
						</div>
						<div class="flex justify-between gap-3">
							<dt class="text-slate-500">Domisili target</dt>
							<dd class="text-right font-medium text-slate-200">{detail.profile.targetDomicile ?? '—'}</dd>
						</div>
						<div class="flex justify-between gap-3">
							<dt class="text-slate-500">Pengalaman</dt>
							<dd class="text-right font-medium text-slate-200">
								{detail.profile.yearsOfExperience != null
									? `${detail.profile.yearsOfExperience} tahun`
									: '—'}
							</dd>
						</div>
						<div class="flex justify-between gap-3">
							<dt class="text-slate-500">Terdaftar</dt>
							<dd class="text-right font-medium text-slate-200">{formatDate(detail.account.createdAt)}</dd>
						</div>
					</dl>
					{#if detail.profile.skills.length > 0}
						<div class="mt-3 flex flex-wrap gap-1.5">
							{#each detail.profile.skills as skill}
								<span class="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">{skill}</span>
							{/each}
						</div>
					{/if}
				</div>

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
							{#if detail.subscription.pendingPackage}
								<div class="flex justify-between gap-3 rounded-lg bg-amber-500/10 px-2 py-1.5 text-amber-200">
									<span>Downgrade terjadwal</span>
									<span class="text-right font-medium">
										{detail.subscription.pendingPackage.name} · mulai
										{formatDateShort(detail.subscription.pendingStartAt)}
									</span>
								</div>
							{/if}
						</div>
					{:else}
						<p class="mt-3 text-xs text-slate-400">Belum memiliki subscription.</p>
					{/if}
					<a
						href={`/superadmin/billing?search=${encodeURIComponent(detail.email)}`}
						class="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-300 transition hover:text-indigo-200"
					>
						Kelola billing <ArrowRight size={12} />
					</a>
				</div>
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
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

				<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
					<h3 class="text-xs font-semibold uppercase tracking-wide text-slate-400">Aktivitas</h3>
					<div class="mt-3 space-y-2 text-xs">
						<p class="flex justify-between gap-3">
							<span class="text-slate-500">Total aplikasi</span>
							<span class="font-medium text-slate-200">{formatNumber(detail.applications.total)}</span>
						</p>
						<p class="flex justify-between gap-3">
							<span class="text-slate-500">Reply rate</span>
							<span class="font-medium text-cyan-300">{formatRate(detail.applications.replyRate)}</span>
						</p>
						<p class="flex justify-between gap-3">
							<span class="text-slate-500">Kuota / PAYG / tidak terklasifikasi</span>
							<span class="font-medium text-slate-200">
								{formatNumber(detail.applications.byChargeType.MONTHLY_QUOTA ?? 0)} /
								{formatNumber(detail.applications.byChargeType.PAYG ?? 0)} /
								{formatNumber(detail.applications.byChargeType.UNCLASSIFIED ?? 0)}
							</span>
						</p>
						<p class="flex justify-between gap-3">
							<span class="text-slate-500">CV / parsing / psikotes</span>
							<span class="font-medium text-slate-200">
								{formatNumber(detail.counts.cvFiles)} / {formatNumber(detail.counts.userCvs)} /
								{formatNumber(detail.counts.psychotestSessions)}
							</span>
						</p>
					</div>
				</div>
			</div>

			{#if detail.benefitQuotas?.length}
				<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
					<h3 class="text-xs font-semibold uppercase tracking-wide text-slate-400">Kuota Benefit</h3>
					<div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
						{#each detail.benefitQuotas as benefit}
							<div class="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
								<p class="truncate text-[11px] font-semibold text-slate-200" title={benefit.name}>
									{benefit.name}
								</p>
								<p class="mt-0.5 text-[10px] text-slate-500">
									{benefitQuotaValue(benefit)} tersisa · terpakai
									{formatNumber(benefitUsed(benefit))}
								</p>
								{#if benefit.limit > 0 && benefit.freeLifetimeLimit > 0}
									<p class="mt-0.5 text-[10px] text-emerald-300">
										Lifetime {formatNumber(benefit.freeLifetimeRemaining)} /
										{formatNumber(benefit.freeLifetimeLimit)}
									</p>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}

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
											{#if application.recipientEmail}· {application.recipientEmail}{/if}
										</p>
									</div>
									<div class="flex shrink-0 items-center gap-1.5">
										<span class="rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset {applicationStatusTone[application.status]}">
											{applicationStatusLabel[application.status]}
										</span>
										<span class="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400">
											{applicationChargeTypeLabel[application.chargeType]}
										</span>
										<span class="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-500">
											{applicationSourceLabel(application.source)}
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

			<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
				<h3 class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
					<Shield size={14} /> Ubah Role
				</h3>
				{#if roleError}
					<p class="mt-2 text-xs text-rose-300" role="alert">{roleError}</p>
				{/if}
				{#if roleSuccess}
					<p class="mt-2 text-xs text-emerald-300" role="status">{roleSuccess}</p>
				{/if}
				{#if $auth.user?.id === detail.id}
					<p class="mt-2 text-xs text-amber-300">
						Kamu tidak dapat mengubah role akun sendiri.
					</p>
				{/if}
				<div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
					<select
						value={roleDraft}
						onchange={(event) => (roleDraft = event.currentTarget.value as UserRole)}
						disabled={isSavingRole || $auth.user?.id === detail.id}
						class="{inputClass} sm:max-w-xs"
					>
						{#each roles as role}
							<option value={role}>{userRoleLabel[role]}</option>
						{/each}
					</select>
					<button
						type="button"
						onclick={() => void saveRole()}
						disabled={isSavingRole || $auth.user?.id === detail.id || roleDraft === detail.role}
						class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
					>
						{#if isSavingRole}<Spinner label="Menyimpan role" />{/if}
						Simpan Role
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#snippet footer()}
		<button
			type="button"
			onclick={closeDetail}
			disabled={isSavingRole}
			class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
		>
			Tutup
		</button>
	{/snippet}
</Modal>
