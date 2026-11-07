<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowRight, BriefcaseBusiness, Plus, Sparkles, WalletCards } from '@lucide/svelte';
	import { auth } from '#lib/stores/auth.js';
	import { getMyBenefitsApi, type MyBenefitsResponse } from '#lib/services/billingApi.js';
	import { formatNumber, isUnlimitedQuota } from '#lib/utils/billing.js';

	let benefits = $state<MyBenefitsResponse | null>(null);
	let benefitsLoading = $state(true);
	let creditBalance = $state<number | null>(null);

	const emailBenefit = $derived(
		benefits?.benefits.find((benefit) => benefit.code === 'EMAIL_APPLICATION') ?? null
	);
	const quotaPercent = $derived.by(() => {
		if (!emailBenefit) return null;
		if (isUnlimitedQuota(emailBenefit.limit)) return 100;
		if (emailBenefit.limit <= 0) return null;
		const remaining = Math.max(emailBenefit.remaining, 0);
		return Math.min(100, Math.round((remaining / emailBenefit.limit) * 100));
	});
	const quotaLabel = $derived.by(() => {
		if (benefitsLoading) return 'Memeriksa kuota lamaran...';
		if (!emailBenefit) return 'Informasi kuota belum tersedia';
		if (isUnlimitedQuota(emailBenefit.limit)) return 'Email lamaran tanpa batas';
		if (emailBenefit.limit <= 0) return 'Kuota email belum tersedia';
		return `${formatNumber(Math.max(emailBenefit.remaining, 0))} / ${formatNumber(emailBenefit.limit)} lamaran tersisa`;
	});
	const quotaPercentLabel = $derived(
		emailBenefit && isUnlimitedQuota(emailBenefit.limit)
			? 'Tanpa batas'
			: quotaPercent !== null
				? `${quotaPercent}%`
				: null
	);

	onMount(() => {
		void getMyBenefitsApi()
			.then((data) => {
				benefits = data;
				creditBalance = data.creditBalance;
			})
			.catch(() => {
				benefits = null;
				creditBalance = null;
			})
			.finally(() => {
				benefitsLoading = false;
			});
	});
</script>

<svelte:head>
	<title>Ringkasan | Quly</title>
	<meta
		name="description"
		content="Pantau paket, kuota lamaran, dan saldo Kredit Kilat akunmu."
	/>
</svelte:head>

<div class="space-y-7">
	<section class="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
		<div>
			<div class="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
				<Sparkles size={14} />
				Asisten karier AI
			</div>
			<h1 class="text-3xl font-semibold tracking-tight text-slate-950 sm:text-[34px]">
				Hai, {$auth.user?.fullName ?? $auth.user?.email}!
			</h1>
			<p class="mt-2 text-sm text-slate-500 sm:text-base">
				Lanjutkan langkahmu menuju peluang karier berikutnya.
			</p>
		</div>
		<a
			href="/dashboard/manual-hub"
			class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700"
		>
			<Plus size={17} />
			Jelajahi lowongan
		</a>
	</section>

	<section class="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]" aria-label="Status paket dan kredit">
		<article class="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm shadow-slate-100/70 sm:p-6">
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div class="flex items-start gap-3">
					<span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
						<Sparkles size={20} />
					</span>
					<div>
						<p class="text-xs font-medium text-slate-500">Paket aktif</p>
						<h2 class="mt-0.5 text-lg font-bold tracking-tight text-slate-950">
							{$auth.user?.subscriptionTier ?? 'Informasi paket belum tersedia'}
						</h2>
					</div>
				</div>
				<span class="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
					Akun terhubung
				</span>
			</div>

			<div class="mt-5 flex items-end justify-between gap-3">
				<div>
					<p class="text-sm font-semibold text-slate-800">{quotaLabel}</p>
					<p class="mt-1 text-xs text-slate-500">
						{#if emailBenefit}
							Data kuota diambil dari benefit Email Lamaran di backend.
						{:else}
							Kuota Email Lamaran belum dapat dimuat.
						{/if}
					</p>
				</div>
				{#if quotaPercentLabel}
					<span class="text-xs font-semibold text-indigo-700">{quotaPercentLabel}</span>
				{/if}
			</div>
			{#if quotaPercent !== null && emailBenefit}
				<div
					class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
					role="progressbar"
					aria-label="Sisa kuota email lamaran"
					aria-valuemin={0}
					aria-valuemax={isUnlimitedQuota(emailBenefit.limit) ? 100 : emailBenefit.limit}
					aria-valuenow={isUnlimitedQuota(emailBenefit.limit)
						? 100
						: Math.max(emailBenefit.remaining, 0)}
				>
					<div class="h-full rounded-full bg-indigo-500 transition-all" style:width="{quotaPercent}%"></div>
				</div>
			{/if}
			<div class="mt-5 flex flex-wrap gap-2">
				<a
					href="/billing#paket"
					class="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
				>
					Lihat paket <ArrowRight size={14} />
				</a>
				<a
					href="/billing#kredit-kilat"
					class="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3.5 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
				>
					Top-up Kredit <Plus size={14} />
				</a>
			</div>
		</article>

		<article class="flex flex-col justify-between rounded-2xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/60 p-5 shadow-sm shadow-slate-100/70 sm:p-6">
			<div>
				<div class="flex items-center justify-between gap-3">
					<div class="flex items-center gap-3">
						<span class="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
							<WalletCards size={19} />
						</span>
						<div>
							<p class="text-xs font-medium text-slate-500">Kredit AI</p>
							<p class="mt-0.5 text-xl font-bold tracking-tight text-slate-950">
								{#if creditBalance !== null}
									{formatNumber(creditBalance)} kredit
								{:else}
									—
								{/if}
							</p>
						</div>
					</div>
					<span class="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-100">
						Siap dipakai
					</span>
				</div>
				<p class="mt-4 text-xs leading-5 text-slate-500">
					Kredit dipakai otomatis saat kuota benefit bulanan habis.
				</p>
			</div>
			<a
				href="/billing#kredit-kilat"
				class="mt-5 inline-flex h-9 w-fit items-center justify-center gap-2 rounded-lg border border-violet-200 bg-white px-3.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
			>
				Top-up Kredit <ArrowRight size={14} />
			</a>
		</article>
	</section>

	<section class="grid gap-4 md:grid-cols-2" aria-label="Akses cepat">
		<a
			href="/dashboard/auto-apply"
			class="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/30"
		>
			<span class="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
				<BriefcaseBusiness size={20} />
			</span>
			<span class="min-w-0 flex-1">
				<span class="block text-sm font-semibold text-slate-900">Kelola lamaran otomatis</span>
				<span class="mt-1 block text-xs text-slate-500">Lihat aktivitas dan atur langkah melamar.</span>
			</span>
			<ArrowRight size={17} class="text-slate-400" />
		</a>
		<a
			href="/dashboard/psychotest"
			class="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/30"
		>
			<span class="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
				<Sparkles size={20} />
			</span>
			<span class="min-w-0 flex-1">
				<span class="block text-sm font-semibold text-slate-900">Tes psikotes</span>
				<span class="mt-1 block text-xs text-slate-500">Ikuti sesi resmi dan unduh laporan AI.</span>
			</span>
			<ArrowRight size={17} class="text-slate-400" />
		</a>
	</section>
</div>
