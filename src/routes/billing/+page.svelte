<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import {
		ArrowLeft,
		ArrowRight,
		Check,
		Clock3,
		CreditCard,
		Crown,
		ExternalLink,
		History,
		Mail,
		RefreshCw,
		Sparkles,
		Wallet,
		XCircle,
		Zap
	} from '@lucide/svelte';
	import { auth, getUserRole, initializeAuth } from '#lib/stores/auth.js';
	import {
		getMidtransConfigApi,
		getMyBenefitsApi,
		getPaymentApi,
		getPublicBillingPlansApi,
		listPaymentsApi,
		subscribePackageApi,
		subscribePlanApi,
		topupCreditApi,
		type BillingPayment,
		type MidtransConfigResponse,
		type MyBenefitsResponse,
		type PaymentListResponse,
		type PaymentStatus,
		type PublicBillingPlan,
		type TopupPackage
	} from '#lib/services/billingApi.js';
	import { tierLabel } from '#lib/components/superadmin/status.js';
	import { formatDate } from '#lib/components/superadmin/format.js';
	import RichText from '#lib/components/superadmin/RichText.svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import { freeLifetimeRemaining } from '#lib/utils/benefitAccess.js';
	import {
		clearPendingPaymentId,
		loadSnapScript,
		savePendingPaymentId
	} from '#lib/utils/midtrans.js';
	import {
		billingPeriodLabel,
		formatNumber,
		formatRupiah,
		isUnlimitedQuota,
		quotaLabel
	} from '#lib/utils/billing.js';

	let plans = $state<PublicBillingPlan[]>([]);
	let topupPackages = $state<TopupPackage[]>([]);
	let paygPrice = $state(200);
	let plansLoading = $state(true);
	let plansError = $state<string | null>(null);

	let myBenefits = $state<MyBenefitsResponse | null>(null);
	let benefitsLoading = $state(true);
	let benefitsError = $state<string | null>(null);

	let selectedPlanId = $state<string | null>(null);
	let selectedTopUpId = $state<string | null>(null);
	let isSubscribing = $state(false);
	let processingPayment = $state(false);
	let subscribeMessage = $state<string | null>(null);
	let subscribeError = $state(false);

	let midtransConfig = $state<MidtransConfigResponse | null>(null);
	let midtransLoading = $state(true);
	let snapReady = $state(false);
	let paymentNotice = $state<string | null>(null);
	let paymentError = $state<string | null>(null);

	let payments = $state<PaymentListResponse | null>(null);
	let paymentsLoading = $state(true);
	let paymentsError = $state<string | null>(null);

	function userTier(): string {
		return (get(auth).user?.subscriptionTier ?? '').toLowerCase();
	}

	function isPlanActive(plan: PublicBillingPlan): boolean {
		const tier = userTier();
		return [plan.planId, plan.tier, plan.name].some(
			(value) => tier === value.toLowerCase()
		);
	}

	function planQuotaText(plan: PublicBillingPlan): string {
		if (
			isUnlimitedQuota(plan.quotas.emailApplications) ||
			isUnlimitedQuota(plan.monthlyApplicationQuota)
		) {
			return 'Email lamaran tanpa batas';
		}
		const suffix = plan.billingPeriod === 'FOREVER' ? '' : ' / bulan';
		return `${formatNumber(plan.monthlyApplicationQuota)} email lamaran${suffix}`;
	}

	function benefitProgress(limit: number, remaining: number): number {
		if (limit <= 0 || remaining < 0) return 0;
		return Math.min(100, Math.max(0, (remaining / limit) * 100));
	}

	function benefitQuotaLabel(limit: number, used: number, remaining: number): string {
		if (isUnlimitedQuota(limit) || remaining === -1) return 'Unlimited';
		return `${formatNumber(Math.max(remaining, 0))} / ${formatNumber(limit)} tersisa`;
	}

	function benefitResetLabel(resetAt: string | null): string {
		if (!resetAt) return 'Tidak direset otomatis';
		return `Reset ${formatDate(resetAt)}`;
	}

	async function loadBenefits() {
		benefitsLoading = true;
		benefitsError = null;
		try {
			myBenefits = await getMyBenefitsApi();
		} catch (error) {
			benefitsError =
				error instanceof Error ? error.message : 'Kuota benefit belum dapat dimuat.';
		} finally {
			benefitsLoading = false;
		}
	}

	async function loadPlans() {
		plansLoading = true;
		plansError = null;
		try {
			const data = await getPublicBillingPlansApi();
			plans = data.plans;
			topupPackages = data.topupPackages;
			paygPrice = data.paygPricePerApplicationIdr;
		} catch (error) {
			plansError = error instanceof Error ? error.message : 'Paket belum dapat dimuat.';
		} finally {
			plansLoading = false;
		}
	}

	async function loadMidtrans() {
		midtransLoading = true;
		try {
			midtransConfig = await getMidtransConfigApi();
			if (midtransConfig.configured) {
				snapReady = await loadSnapScript(midtransConfig);
			}
		} catch (error) {
			midtransConfig = null;
			paymentError =
				error instanceof Error ? error.message : 'Konfigurasi pembayaran belum dapat dimuat.';
		} finally {
			midtransLoading = false;
		}
	}

	async function loadPayments() {
		paymentsLoading = true;
		paymentsError = null;
		try {
			payments = await listPaymentsApi(1, 10);
		} catch (error) {
			paymentsError =
				error instanceof Error ? error.message : 'Riwayat pembayaran belum dapat dimuat.';
		} finally {
			paymentsLoading = false;
		}
	}

	function isTerminalPayment(status: PaymentStatus): boolean {
		return ['PAID', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED'].includes(status);
	}

	function paymentStatusLabel(status: PaymentStatus): string {
		switch (status) {
			case 'PENDING':
				return 'Menunggu';
			case 'PAID':
				return 'Berhasil';
			case 'FAILED':
				return 'Gagal';
			case 'EXPIRED':
				return 'Kedaluwarsa';
			case 'CANCELLED':
				return 'Dibatalkan';
			case 'REFUNDED':
				return 'Dikembalikan';
		}
	}

	function paymentStatusClass(status: PaymentStatus): string {
		if (status === 'PAID') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
		if (status === 'PENDING') return 'bg-amber-50 text-amber-700 ring-amber-200';
		return 'bg-rose-50 text-rose-700 ring-rose-200';
	}

	function paymentTypeLabel(type: string): string {
		return type === 'SUBSCRIPTION' ? 'Paket langganan' : 'Top-up kredit';
	}

	async function refreshAfterPayment() {
		await initializeAuth();
		await Promise.all([loadBenefits(), loadPlans(), loadPayments()]);
	}

	async function pollPayment(paymentId: string) {
		for (let attempt = 0; attempt < 15; attempt += 1) {
			try {
				const updated = await getPaymentApi(paymentId);
				if (updated.status === 'PAID') {
					paymentNotice = 'Pembayaran berhasil dikonfirmasi. Paket/kredit kamu sudah diperbarui.';
					paymentError = null;
					clearPendingPaymentId();
					await refreshAfterPayment();
					return;
				}
				if (isTerminalPayment(updated.status)) {
					paymentError =
						updated.status === 'FAILED'
							? 'Pembayaran gagal. Silakan coba lagi.'
							: updated.status === 'EXPIRED'
								? 'Pembayaran kedaluwarsa. Silakan buat transaksi baru.'
								: updated.status === 'CANCELLED'
									? 'Pembayaran dibatalkan.'
									: 'Pembayaran dikembalikan.';
					clearPendingPaymentId();
					await loadPayments();
					return;
				}
				paymentNotice = 'Menunggu konfirmasi pembayaran dari Midtrans...';
			} catch {
				// The webhook may still be processing; retry briefly.
			}
			await new Promise((resolve) => setTimeout(resolve, 2000));
		}
		paymentNotice = 'Pembayaran masih diproses. Cek riwayat pembayaran beberapa saat lagi.';
	}

	async function openPayment(payment: BillingPayment) {
		savePendingPaymentId(payment.id);
		selectedPlanId = null;
		selectedTopUpId = null;
		setTimeout(() => {
			void pollPayment(payment.id);
		}, 1500);

		if (snapReady && window.snap && payment.snapToken) {
			window.snap.pay(payment.snapToken, {
				onSuccess: () => void pollPayment(payment.id),
				onPending: () => {
					paymentNotice = 'Pembayaran berstatus menunggu. Selesaikan pembayaran di Midtrans.';
					void loadPayments();
				},
				onError: () => {
					paymentError = 'Pembayaran gagal atau dibatalkan di Midtrans.';
					void loadPayments();
				},
				onClose: () => {
					paymentNotice ??= 'Jendela pembayaran ditutup. Cek status di riwayat pembayaran.';
					void loadPayments();
				}
			});
			return;
		}

		if (payment.redirectUrl) {
			window.location.assign(payment.redirectUrl);
			return;
		}
		throw new Error('Link pembayaran Midtrans tidak tersedia.');
	}

	async function checkoutPackage(plan: PublicBillingPlan) {
		if (processingPayment) return;
		if (!midtransConfig?.configured) {
			paymentError = 'Pembayaran Midtrans belum dikonfigurasi oleh admin.';
			return;
		}
		selectedPlanId = plan.id;
		processingPayment = true;
		paymentError = null;
		paymentNotice = 'Membuat transaksi pembayaran...';
		try {
			const payment = await subscribePackageApi(plan.id);
			await openPayment(payment);
		} catch (error) {
			paymentError =
				error instanceof Error ? error.message : 'Transaksi paket belum dapat dibuat.';
			paymentNotice = null;
		} finally {
			processingPayment = false;
		}
	}

	async function checkoutTopup() {
		if (!selectedTopUpId || processingPayment) return;
		if (!midtransConfig?.configured) {
			paymentError = 'Pembayaran Midtrans belum dikonfigurasi oleh admin.';
			return;
		}
		processingPayment = true;
		paymentError = null;
		paymentNotice = 'Membuat transaksi top-up...';
		try {
			const payment = await topupCreditApi(selectedTopUpId);
			await openPayment(payment);
		} catch (error) {
			paymentError =
				error instanceof Error ? error.message : 'Transaksi top-up belum dapat dibuat.';
			paymentNotice = null;
		} finally {
			processingPayment = false;
		}
	}

	async function subscribeFree(plan: PublicBillingPlan) {
		if (isSubscribing || plan.planId !== 'FREE_PLAN') return;
		isSubscribing = true;
		subscribeMessage = null;
		subscribeError = false;
		try {
			await subscribePlanApi(plan.planId);
			await initializeAuth();
			await loadBenefits();
			await loadPayments();
			subscribeMessage = `Paket ${plan.name} berhasil diaktifkan.`;
			await loadPlans();
		} catch (error) {
			subscribeError = true;
			subscribeMessage =
				error instanceof Error ? error.message : 'Paket gratis belum dapat diaktifkan.';
		} finally {
			isSubscribing = false;
		}
	}

	onMount(async () => {
		const [, authenticated] = await Promise.all([
			loadPlans(),
			initializeAuth(),
			loadMidtrans()
		]);
		if (!authenticated && !get(auth).error) {
			await goto('/auth/login?redirectTo=%2Fbilling');
			return;
		}
		if (authenticated) {
			void loadPayments();
			if (getUserRole() === 'JOB_SEEKER') {
				await loadBenefits();
			} else {
				benefitsLoading = false;
			}
		}
	});
</script>

<svelte:head>
	<title>Paket & Kredit | Quly</title>
	<meta
		name="description"
		content="Pilih paket Pejuang Loker atau tambahkan Kredit Kilat untuk melanjutkan lamaran otomatis."
	/>
</svelte:head>

{#if $auth.isLoading}
	<main class="flex min-h-screen items-center justify-center bg-[#f8f8fc] px-4 text-slate-500">
		<p>Memuat data akun...</p>
	</main>
{:else if $auth.error}
	<main class="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f8f8fc] px-4 text-center">
		<p class="text-sm text-red-700" role="alert">{$auth.error}</p>
		<button
			type="button"
			onclick={() => {
				auth.update((state) => ({ ...state, error: null, isLoading: true }));
				void initializeAuth();
			}}
			class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
		>
			Coba lagi
		</button>
	</main>
{:else if $auth.user}
<main class="min-h-screen bg-[#f8f8fc] px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
	<div class="mx-auto max-w-7xl">
		<a
			href="/"
			class="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-700"
		>
			<ArrowLeft size={16} /> Kembali ke beranda
		</a>

		<header class="mx-auto mt-9 max-w-4xl text-center">
			<span
				class="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700"
			>
				<Sparkles size={14} /> Paket Pejuang Loker
			</span>
			<h1 class="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
				Pilih Senjata Andalanmu untuk Menembus Gerbang Karier Impian
			</h1>
			<p class="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
				Mulai langkahmu secara gratis atau hajar ratusan lowongan sekaligus dengan fitur otomatisasi
				penuh.
			</p>
		</header>

		<div
			class="mx-auto mt-6 flex max-w-2xl items-center justify-center gap-2 rounded-xl border px-4 py-3 text-left text-xs leading-5 {midtransConfig?.configured
				? 'border-emerald-200 bg-emerald-50 text-emerald-900'
				: 'border-amber-200 bg-amber-50 text-amber-900'}"
			role="note"
		>
			<span class="shrink-0 rounded-md {midtransConfig?.configured ? 'bg-emerald-100' : 'bg-amber-100'} px-2 py-0.5 font-bold">
				{midtransConfig?.configured ? 'PEMBAYARAN' : 'INFO'}
			</span>
			<span>
				{#if midtransLoading}
					Memeriksa konfigurasi pembayaran...
				{:else if midtransConfig?.configured}
					Pembayaran paket berbayar dan top-up diproses aman melalui Midtrans Snap.
				{:else}
					Free Plan tetap bisa diaktifkan langsung. Pembayaran Midtrans belum dikonfigurasi oleh admin.
				{/if}
			</span>
		</div>
		{#if paymentNotice}
			<div class="mx-auto mt-3 flex max-w-2xl items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs leading-5 text-indigo-800" role="status">
				<Clock3 size={15} class="shrink-0" /> {paymentNotice}
			</div>
		{:else if paymentError}
			<div class="mx-auto mt-3 flex max-w-2xl items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-800" role="alert">
				<XCircle size={15} class="shrink-0" /> {paymentError}
			</div>
		{/if}
		<div class="mx-auto mt-3 flex max-w-2xl flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
			<span>{$auth.user.fullName} · {$auth.user.email}</span>
			<span>Kredit AI:
				{#if myBenefits}
					{formatNumber(myBenefits.creditBalance)} kredit
				{:else}
					—
				{/if}
			</span>
		</div>

		<section id="paket" class="mt-10 scroll-mt-8" aria-labelledby="plans-title">
			<div class="mb-5 flex items-end justify-between gap-4">
				<div>
					<p class="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">Pilihan paket</p>
					<h2 id="plans-title" class="mt-1 text-xl font-bold tracking-tight text-slate-950">
						Pilih paket perjuanganmu
					</h2>
				</div>
				<span class="hidden text-xs text-slate-500 sm:block">Tanpa biaya tersembunyi</span>
			</div>

			{#if plansLoading}
				<div class="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
					Memuat paket langganan...
				</div>
			{:else if plansError}
				<div class="rounded-2xl border border-dashed border-rose-200 bg-white px-4 py-10 text-center">
					<p class="text-sm text-rose-700" role="alert">{plansError}</p>
					<button
						type="button"
						onclick={() => void loadPlans()}
						class="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
					>
						Coba lagi
					</button>
				</div>
			{:else if plans.length === 0}
				<div class="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
					Belum ada paket aktif.
				</div>
			{:else}
				<div class="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-4">
					{#each plans as plan}
						{@const isActive = isPlanActive(plan)}
						<article
							class="relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition sm:p-6 {plan.isPopular
								? 'border-indigo-500 shadow-indigo-100/80 lg:-translate-y-2'
								: 'border-slate-200'}"
						>
							{#if plan.isPopular || plan.badge}
								<div
									class="absolute -top-3 left-1/2 inline-flex max-w-[90%] -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-bold text-white shadow-sm"
								>
									<Crown size={12} /> {plan.badge ?? 'PALING POPULER'}
								</div>
							{/if}

							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="text-xs font-semibold text-indigo-600">{tierLabel[plan.tier]}</p>
									<h3 class="mt-1 text-lg font-bold text-slate-950">{plan.name}</h3>
								</div>
								<span
									class="flex size-10 shrink-0 items-center justify-center rounded-xl {plan.isPopular
										? 'bg-indigo-50 text-indigo-600'
										: 'bg-slate-100 text-slate-500'}"
								>
									{#if plan.isPopular}
										<Crown size={19} />
									{:else if plan.tier === 'UNLIMITED'}
										<Sparkles size={19} />
									{:else}
										<Mail size={19} />
									{/if}
								</span>
							</div>
							{#if plan.subtitle}
								<p class="mt-3 min-h-10 text-xs leading-5 text-slate-500">{plan.subtitle}</p>
							{/if}

							<div class="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
								{#if plan.originalPriceIdr != null && plan.originalPriceIdr > plan.priceIdr}
									<span class="text-xs font-medium text-slate-400 line-through">
										{formatRupiah(plan.originalPriceIdr)}
									</span>
								{/if}
								<strong class="text-3xl font-bold tracking-tight text-slate-950">
									{formatRupiah(plan.priceIdr)}
								</strong>
								<span class="text-xs text-slate-500">/{billingPeriodLabel(plan.billingPeriod)}</span>
							</div>

							<div class="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
								<span
									class="flex size-7 items-center justify-center rounded-lg {plan.isPopular
										? 'bg-indigo-100 text-indigo-700'
										: 'bg-white text-slate-600'}"
								>
									<Mail size={14} />
								</span>
								<span class="text-xs font-semibold text-slate-700">{planQuotaText(plan)}</span>
							</div>
							<div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
								<span>CV {quotaLabel(plan.quotas.cvExtraction, 'x')}</span>
								<span>Psikotes {quotaLabel(plan.quotas.psychotest, 'x')}</span>
								<span>Scoring {quotaLabel(plan.quotas.jobScoring, 'x')}</span>
								<span>Loker luar {quotaLabel(plan.quotas.externalJobExtraction, 'x')}</span>
								<span class="col-span-2">Token AI {quotaLabel(plan.quotas.aiTokenLimit, 'token')}</span>
							</div>

							<ul class="mt-5 grid gap-3">
								{#each plan.features as feature}
									<li class="flex items-start gap-2.5 text-xs leading-5 text-slate-600">
										<span
											class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full {plan.isPopular
												? 'bg-indigo-100 text-indigo-700'
												: 'bg-emerald-50 text-emerald-600'}"
										>
											<Check size={11} strokeWidth={2.8} />
										</span>
										<RichText html={feature} />
									</li>
								{/each}
							</ul>

							<div class="mt-auto pt-6">
								{#if isActive}
									<button
										type="button"
										disabled
										class="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 text-sm font-semibold text-indigo-700"
									>
										<Check size={16} /> Paket aktif
									</button>
								{:else}
									<button
										type="button"
										onclick={() => {
											if (plan.planId === 'FREE_PLAN') {
												void subscribeFree(plan);
											} else {
												void checkoutPackage(plan);
											}
										}}
										disabled={isSubscribing || processingPayment || !midtransConfig?.configured}
										class="flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition {plan.isPopular
											? 'border-indigo-600 bg-indigo-600 text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700'
											: 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'} disabled:cursor-not-allowed disabled:opacity-60"
									>
										{processingPayment && plan.id === selectedPlanId
											? 'Membuat pembayaran...'
											: isSubscribing && plan.planId === 'FREE_PLAN'
												? 'Mengaktifkan...'
												: (plan.buttonLabel ?? 'Pilih Paket Ini')}
										<ArrowRight size={15} />
									</button>
								{/if}
							</div>
						</article>
					{/each}
				</div>
			{/if}

			{#if subscribeMessage}
				<p
					class="mt-4 text-center text-xs {subscribeError ? 'text-rose-700' : 'text-indigo-700'}"
					role={subscribeError ? 'alert' : 'status'}
				>
					{subscribeMessage}
				</p>
			{/if}
		</section>

		<section id="kuota-kredit" class="mt-10 scroll-mt-8" aria-labelledby="quota-title">
			<div class="mb-5 flex flex-wrap items-end justify-between gap-4">
				<div>
					<p class="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">Kuota AI</p>
					<h2 id="quota-title" class="mt-1 text-xl font-bold tracking-tight text-slate-950">
						Pemakaian benefit & kredit
					</h2>
				</div>
				<span class="text-xs text-slate-500">Kuota otomatis memakai kredit jika habis</span>
			</div>

			{#if benefitsLoading}
				<div class="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
					Memuat kuota benefit...
				</div>
			{:else if benefitsError}
				<div class="rounded-2xl border border-dashed border-rose-200 bg-white px-4 py-8 text-center">
					<p class="text-sm text-rose-700" role="alert">{benefitsError}</p>
					<button
						type="button"
						onclick={() => void loadBenefits()}
						class="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
					>
						Coba lagi
					</button>
				</div>
			{:else if myBenefits}
				<div class="grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
					<div class="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow-sm">
						<p class="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-200">
							Saldo Kredit AI
						</p>
						<p class="mt-2 text-4xl font-bold tracking-tight">
							{formatNumber(myBenefits.creditBalance)}
						</p>
						<p class="mt-1 text-xs text-indigo-100">kredit tersedia</p>
						<p class="mt-4 text-[11px] leading-5 text-indigo-100/85">
							Kredit dipakai otomatis ketika kuota benefit bulanan habis. Harga per kredit
							ditentukan oleh masing-masing benefit.
						</p>
						<a
							href="#kredit-kilat"
							class="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/25"
						>
							<Zap size={14} /> Top-up Kredit
						</a>
					</div>

					<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
						<h3 class="text-sm font-bold text-slate-950">Kuota benefit</h3>
						{#if myBenefits.benefits.length === 0}
							<p class="mt-4 text-xs text-slate-500">
								Belum ada benefit aktif untuk akun ini.
							</p>
						{:else}
							<div class="mt-4 grid gap-3 sm:grid-cols-2">
								{#each myBenefits.benefits as benefit}
									{@const unlimited = isUnlimitedQuota(benefit.limit)}
									{@const progress = unlimited ? 100 : benefitProgress(benefit.limit, benefit.remaining)}
									<div class="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
										<div class="flex items-start justify-between gap-2">
											<div class="min-w-0">
												<p class="truncate text-xs font-bold text-slate-800" title={benefit.name}>
													{benefit.name}
												</p>
												<p class="mt-0.5 font-mono text-[9px] text-slate-400">{benefit.code}</p>
											</div>
											{#if benefit.canUseWithCredit}
												<span class="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
													Kredit siap
												</span>
											{/if}
										</div>

										<div class="mt-3 flex items-baseline justify-between gap-2">
											<p class="text-sm font-bold text-slate-900">
												{benefitQuotaLabel(benefit.limit, benefit.used, benefit.remaining)}
											</p>
											{#if !unlimited}
												<span class="text-[10px] text-slate-500">
													{formatNumber(benefit.used)} terpakai
												</span>
											{/if}
										</div>
										{#if !unlimited}
											<div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
												<div
													class="h-full rounded-full {progress >= 60
														? 'bg-emerald-500'
														: progress >= 30
															? 'bg-amber-500'
															: 'bg-rose-500'}"
													style:width={`${progress}%`}
												></div>
											</div>
										{:else}
											<div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-emerald-100">
												<div class="h-full w-full rounded-full bg-emerald-500"></div>
											</div>
										{/if}

										{#if (benefit.freeLifetimeLimit ?? 0) > 0}
											<p class="mt-1 text-[10px] font-semibold {freeLifetimeRemaining(benefit) > 0 ? 'text-emerald-600' : 'text-slate-400'}">
												Gratis lifetime: {formatNumber(freeLifetimeRemaining(benefit))}/{formatNumber(benefit.freeLifetimeLimit ?? 0)}
											</p>
										{/if}
										<p class="mt-2 text-[10px] leading-4 text-slate-500">
											{benefitResetLabel(benefit.resetAt)}
										</p>
										<p class="mt-1 text-[10px] leading-4 text-slate-500">
											{#if benefit.creditCost > 0}
												Habis → {benefit.creditCost} kredit (~{formatRupiah(benefit.overageCostIdr)})
											{:else}
												Tidak tersedia via kredit
											{/if}
										</p>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{:else}
				<div class="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
					Data kuota belum tersedia.
				</div>
			{/if}
		</section>

		<section
			id="kredit-kilat"
			class="mt-12 scroll-mt-8 overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm sm:mt-16"
			aria-labelledby="credits-title"
		>
			<div class="grid lg:grid-cols-[0.85fr_1.15fr]">
				<div class="relative overflow-hidden bg-[#282343] p-6 text-white sm:p-8">
					<div
						class="absolute -right-16 -top-20 size-56 rounded-full border border-white/10 shadow-[0_0_0_25px_rgba(255,255,255,0.025),0_0_0_55px_rgba(255,255,255,0.02)]"
					></div>
					<div class="relative">
						<span
							class="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-100"
						>
							<Zap size={13} /> Pay-As-You-Go
						</span>
						<h2 id="credits-title" class="mt-4 text-2xl font-bold tracking-tight">
							Kehabisan Kuota Bulanan di Tengah Jalan? Tenang, Pakai Kredit Kilat!
						</h2>
						<p class="mt-2 max-w-sm text-xs leading-5 text-slate-300">
							Cukup {formatRupiah(paygPrice)} per aksi kirim lamaran otomatis tanpa harus berlangganan
							bulanan.
						</p>
						<div class="mt-6 flex items-end gap-2">
							<strong class="text-3xl font-bold">{formatRupiah(paygPrice)}</strong>
							<span class="pb-1 text-xs text-slate-300">/ 1 aksi kirim lamaran</span>
						</div>
						<div class="mt-5 flex items-center gap-2 text-[11px] text-slate-300">
							<Check size={14} class="text-emerald-300" />
							Tetap bisa berjuang tanpa paket bulanan
						</div>
					</div>
				</div>

				<div class="p-6 sm:p-8">
					<div class="flex items-start justify-between gap-3">
						<div>
							<p class="text-xs font-bold uppercase tracking-[0.13em] text-violet-600">Isi saldo</p>
							<h3 class="mt-1 text-lg font-bold text-slate-950">Pilih paket kredit</h3>
							<p class="mt-1 text-xs text-slate-500">
								Kredit dipakai untuk benefit AI dan PAYG.
							</p>
						</div>
						<span class="hidden size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 sm:flex">
							<Wallet size={19} />
						</span>
					</div>

					{#if topupPackages.length === 0}
						<p class="mt-5 rounded-xl border border-dashed border-slate-200 px-3 py-4 text-xs text-slate-500">
							Top-up Kredit Kilat belum tersedia.
						</p>
					{:else}
						<div class="mt-5 grid gap-3 sm:grid-cols-2">
							{#each topupPackages as pack (pack.id)}
								{@const isSelected = selectedTopUpId === pack.id}
								<button
									type="button"
									aria-pressed={isSelected}
									onclick={() => {
										selectedTopUpId = pack.id;
									}}
									class="relative rounded-xl border p-3 text-left transition {isSelected
										? 'border-violet-500 bg-violet-50 ring-2 ring-violet-100'
										: pack.isPopular
											? 'border-violet-300 bg-violet-50/40 hover:border-violet-400'
											: 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/50'}"
								>
									{#if pack.badge || pack.isPopular}
										<span class="absolute -top-2 right-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[8px] font-bold text-emerald-700">
											{pack.badge ?? 'POPULER'}
										</span>
									{/if}
									<span class="block pr-16 text-[10px] font-semibold text-slate-500">{pack.name}</span>
									{#if pack.description}
										<span class="mt-1 line-clamp-2 block text-[10px] leading-4 text-slate-400">
											{pack.description}
										</span>
									{/if}
									<strong class="mt-1.5 block text-base font-bold text-slate-900">
										{formatRupiah(pack.priceIdr)}
									</strong>
									<span class="mt-1 block text-[10px] text-slate-500">
										{pack.credits} kredit{#if pack.bonusCredits > 0}
											+ {pack.bonusCredits} bonus = {pack.totalCredits} kredit{/if}
									</span>
									<span class="mt-0.5 block text-[10px] text-slate-400">
										± {formatRupiah(pack.pricePerCreditIdr)} / kredit
									</span>
								</button>
							{/each}
						</div>
					{/if}

					<div class="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
						<button
							type="button"
							disabled={!selectedTopUpId || processingPayment || !midtransConfig?.configured}
							onclick={() => void checkoutTopup()}
							class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-xs font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
						>
							{#if processingPayment}
								<Clock3 size={15} /> Membuat pembayaran...
							{:else}
								<CreditCard size={15} />
								{selectedTopUpId ? 'Bayar Top-up Kredit' : 'Pilih paket kredit'}
							{/if}
						</button>
						{#if selectedTopUpId}
							<span class="text-xs text-slate-500" role="status">
								Saldo kredit baru ditambahkan setelah pembayaran Midtrans dikonfirmasi.
							</span>
						{:else}
							<span class="text-[10px] leading-4 text-slate-400">
								Pilih paket kredit untuk melanjutkan pembayaran.
							</span>
						{/if}
					</div>
				</div>
			</div>
		</section>

		<section id="riwayat-pembayaran" class="mt-12 scroll-mt-8" aria-labelledby="payments-title">
			<div class="mb-5 flex flex-wrap items-end justify-between gap-3">
				<div>
					<p class="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">Transaksi</p>
					<h2 id="payments-title" class="mt-1 text-xl font-bold tracking-tight text-slate-950">
						Riwayat pembayaran
					</h2>
				</div>
				<button
					type="button"
					onclick={() => void loadPayments()}
					disabled={paymentsLoading}
					class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
				>
					{#if paymentsLoading}<Spinner label="Memuat pembayaran" />{:else}<RefreshCw size={14} />{/if}
					Refresh
				</button>
			</div>

			{#if paymentsLoading && !payments}
				<div class="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
					Memuat riwayat pembayaran...
				</div>
			{:else if paymentsError}
				<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700" role="alert">
					{paymentsError}
				</div>
			{:else if !payments || payments.items.length === 0}
				<div class="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
					Belum ada transaksi pembayaran.
				</div>
			{:else}
				<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
					{#each payments.items as item (item.id)}
						<div class="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:px-5">
							<div class="flex items-start gap-3">
								<span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
									{#if item.type === 'SUBSCRIPTION'}<Crown size={16} />{:else}<Wallet size={16} />{/if}
								</span>
								<div>
									<p class="text-sm font-bold text-slate-900">
										{item.package?.name ?? item.topupPackage?.name ?? paymentTypeLabel(item.type)}
									</p>
									<p class="mt-0.5 text-[10px] text-slate-400">
										{paymentTypeLabel(item.type)} · {item.orderId}
									</p>
									<p class="mt-0.5 text-[10px] text-slate-400">
										{formatDate(item.createdAt)}
										{#if item.credits}· {formatNumber(item.credits)} kredit{/if}
									</p>
								</div>
							</div>
							<div class="flex flex-wrap items-center gap-3 sm:justify-end">
								<span class="text-sm font-bold text-slate-900">{formatRupiah(item.amountIdr)}</span>
								<span class="rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset {paymentStatusClass(item.status)}">
									{paymentStatusLabel(item.status)}
								</span>
								{#if item.status === 'PENDING' && item.redirectUrl}
									<a
										href={item.redirectUrl}
										target="_blank"
										rel="noreferrer"
										class="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 underline"
									>
										Lanjutkan <ExternalLink size={11} />
									</a>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<footer class="mt-8 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-5 text-xs text-slate-500 sm:flex-row">
			<span>Harga dan saldo ditampilkan dalam Rupiah.</span>
			<a href="/dashboard" class="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:text-indigo-900">
				Lihat status paket <ArrowRight size={14} />
			</a>
		</footer>
	</div>
</main>
{:else}
	<main class="flex min-h-screen items-center justify-center bg-[#f8f8fc] px-4 text-slate-500">
		<p>Mengalihkan ke halaman login...</p>
	</main>
{/if}
