<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import {
		ArrowRight,
		CheckCircle2,
		Clock3,
		ExternalLink,
		RefreshCw,
		XCircle
	} from '@lucide/svelte';
	import QulyLogo from '#lib/components/ui/QulyLogo.svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import { auth, initializeAuth } from '#lib/stores/auth.js';
	import {
		getPaymentApi,
		getSubscriptionApi,
		listPaymentsApi,
		syncPaymentApi,
		type BillingPayment,
		type BillingSubscriptionSnapshot,
		type PaymentStatus
	} from '#lib/services/billingApi.js';
	import {
		clearPendingPaymentId,
		getPendingPaymentId
	} from '#lib/utils/midtrans.js';
	import { formatDateShort } from '#lib/components/superadmin/format.js';
	import { formatRupiah } from '#lib/utils/billing.js';

	interface Props {
		mode: 'finish' | 'unfinish' | 'error';
	}

	let { mode }: Props = $props();

	let payment = $state<BillingPayment | null>(null);
	let subscription = $state<BillingSubscriptionSnapshot | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let polling = $state(false);
	let attempts = $state(0);

	const title = $derived(
		mode === 'unfinish'
			? 'Pembayaran Belum Selesai'
			: mode === 'error'
				? 'Pembayaran Tidak Berhasil'
				: 'Status Pembayaran'
	);
	const paymentId = $derived(page.url.searchParams.get('paymentId'));
	const orderId = $derived(page.url.searchParams.get('order_id'));

	function statusLabel(status: PaymentStatus): string {
		switch (status) {
			case 'PAID':
				return 'Pembayaran berhasil';
			case 'PENDING':
				return 'Menunggu pembayaran';
			case 'FAILED':
				return 'Pembayaran gagal';
			case 'EXPIRED':
				return 'Pembayaran kedaluwarsa';
			case 'CANCELLED':
				return 'Pembayaran dibatalkan';
			case 'REFUNDED':
				return 'Pembayaran dikembalikan';
		}
	}

	function isTerminal(status: PaymentStatus): boolean {
		return ['PAID', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED'].includes(status);
	}

	async function findPayment(): Promise<BillingPayment | null> {
		const id = paymentId || getPendingPaymentId();
		if (id) {
			try {
				await syncPaymentApi(id).catch(() => undefined);
				return await getPaymentApi(id);
			} catch {
				clearPendingPaymentId();
			}
		}

		if (!orderId) return null;
		const list = await listPaymentsApi(1, 20);
		return list.items.find((item) => item.orderId === orderId) ?? null;
	}

	async function loadSubscriptionSummary() {
		try {
			const data = await getSubscriptionApi();
			subscription = data.subscription;
		} catch {
			subscription = null;
		}
	}

	async function refresh() {
		error = null;
		isLoading = true;
		try {
			const found = await findPayment();
			if (!found) {
				error =
					'Data pembayaran tidak ditemukan. Buka kembali halaman paket untuk melihat riwayat pembayaran.';
				return;
			}
			payment = found;
			if (isTerminal(found.status)) clearPendingPaymentId();
			if (found.status === 'PAID' && found.type === 'SUBSCRIPTION') {
				void loadSubscriptionSummary();
			}
		} catch (caught) {
			error = caught instanceof Error ? caught.message : 'Status pembayaran belum dapat dimuat.';
		} finally {
			isLoading = false;
		}
	}

	async function pollPayment() {
		if (!payment || polling || isTerminal(payment.status)) return;
		polling = true;
		attempts = 0;
		try {
			while (payment && !isTerminal(payment.status) && attempts < 15) {
				attempts += 1;
				await new Promise((resolve) => setTimeout(resolve, 2000));
				payment = await getPaymentApi(payment.id);
			}
			if (payment && isTerminal(payment.status)) {
				clearPendingPaymentId();
				if (payment.status === 'PAID' && payment.type === 'SUBSCRIPTION') {
					await loadSubscriptionSummary();
				}
			}
		} catch (caught) {
			error = caught instanceof Error ? caught.message : 'Polling pembayaran terhenti.';
		} finally {
			polling = false;
		}
	}

	onMount(async () => {
		const authenticated = await initializeAuth();
		if (!authenticated && !get(auth).error) {
			// Return to this status page after login, not to the purchase page.
			const returnTo = `${page.url.pathname}${page.url.search}`;
			await goto(`/auth/login?redirectTo=${encodeURIComponent(returnTo)}`, {
				replaceState: true
			});
			return;
		}
		await refresh();
		if (payment?.status === 'PENDING') void pollPayment();
	});
</script>

<svelte:head>
	<title>{title} | Quly</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="flex min-h-screen flex-col items-center justify-center bg-[#f6f8fd] px-4 py-10">
	<a href="/" aria-label="Quly, beranda" class="mb-8">
		<QulyLogo size={34} />
	</a>

	<section class="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
		{#if isLoading}
			<div class="flex flex-col items-center gap-3 py-10 text-sm text-slate-500">
				<Spinner label="Memeriksa pembayaran" /> Memeriksa status pembayaran...
			</div>
		{:else if error}
			<div class="space-y-4 text-center">
				<span class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
					<XCircle size={28} />
				</span>
				<div>
					<h1 class="text-lg font-bold text-slate-950">Status belum tersedia</h1>
					<p class="mt-1 text-sm leading-6 text-slate-600">{error}</p>
				</div>
				<div class="flex flex-wrap justify-center gap-2">
					<button
						type="button"
						onclick={() => void refresh()}
						class="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
					>
						<RefreshCw size={14} /> Coba lagi
					</button>
					<a href="/billing" class="inline-flex h-10 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white">
						Kembali ke Paket <ArrowRight size={14} />
					</a>
				</div>
			</div>
		{:else if payment}
			<div class="text-center">
				<span
					class="mx-auto flex size-16 items-center justify-center rounded-full {payment.status === 'PAID'
						? 'bg-emerald-50 text-emerald-600'
						: payment.status === 'PENDING'
							? 'bg-amber-50 text-amber-600'
							: 'bg-rose-50 text-rose-600'}"
				>
					{#if payment.status === 'PAID'}
						<CheckCircle2 size={34} />
					{:else if payment.status === 'PENDING'}
						<Clock3 size={34} />
					{:else}
						<XCircle size={34} />
					{/if}
				</span>
				<h1 class="mt-4 text-xl font-bold tracking-tight text-slate-950">
					{statusLabel(payment.status)}
				</h1>
				<p class="mt-1 text-sm text-slate-500">
					{payment.type === 'SUBSCRIPTION'
						? payment.package?.name ?? 'Paket langganan'
						: payment.topupPackage?.name ?? 'Top-up kredit'}
					· {formatRupiah(payment.amountIdr)}
				</p>
			</div>

			{#if payment.status === 'PENDING' && polling}
				<div class="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500">
					<Spinner label="Menunggu pembayaran" /> Menunggu konfirmasi pembayaran...
				</div>
			{/if}

			{#if payment.status === 'PAID'}
				<div class="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center text-xs leading-5 text-emerald-800">
					{#if payment.type === 'SUBSCRIPTION'}
						Paket langganan dan kuota kamu sudah diperbarui.
					{:else}
						Kredit kamu sudah ditambahkan ke saldo Quly.
					{/if}
				</div>
				{#if payment.type === 'SUBSCRIPTION' && subscription}
					<div class="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-[11px] leading-5 text-slate-600">
						{#if subscription.pendingPackage}
							Downgrade ke <strong>{subscription.pendingPackage.name}</strong> dijadwalkan mulai
							<strong>{subscription.pendingStartAt ? formatDateShort(subscription.pendingStartAt) : '—'}</strong>.
							Paket <strong>{subscription.package.name}</strong> tetap aktif sampai tanggal tersebut.
						{:else if subscription.endDate}
							Paket aktif: <strong>{subscription.package.name}</strong> sampai
							<strong>{formatDateShort(subscription.endDate)}</strong>.
						{/if}
					</div>
				{/if}
			{:else if payment.status === 'PENDING'}
				<div class="mt-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-center text-xs leading-5 text-amber-800">
					Pembayaran belum selesai. Selesaikan pembayaran di Midtrans atau cek kembali statusnya.
				</div>
			{:else}
				<div class="mt-5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-center text-xs leading-5 text-rose-800">
					Pembayaran tidak berhasil. Kamu dapat mencoba membuat transaksi baru dari halaman paket.
				</div>
			{/if}

			<div class="mt-6 flex flex-wrap justify-center gap-2">
				{#if payment.status === 'PENDING' && payment.redirectUrl}
					<a
						href={payment.redirectUrl}
						target="_blank"
						rel="noreferrer"
						class="inline-flex h-10 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white"
					>
						Lanjutkan Pembayaran <ExternalLink size={13} />
					</a>
				{/if}
				<button
					type="button"
					onclick={() => void refresh()}
					disabled={polling}
					class="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
				>
					<RefreshCw size={14} /> Perbarui status
				</button>
				<a href="/billing" class="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700">
					Kembali ke Paket <ArrowRight size={14} />
				</a>
			</div>
		{/if}
	</section>
</main>
