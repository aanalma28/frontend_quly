<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import {
		ArrowLeft,
		ArrowRight,
		Check,
		CreditCard,
		Crown,
		Mail,
		Sparkles,
		Wallet,
		Zap
	} from '@lucide/svelte';
	import { auth, initializeAuth } from '#lib/stores/auth.js';
	import {
		creditTopUpPackages,
		formatRupiah,
		subscriptionPlans
	} from '#lib/data/billing.js';

	let selectedPlanId = $state<string | null>(null);
	let selectedTopUpId = $state<string | null>(null);
	let topUpRequested = $state(false);

	onMount(async () => {
		const authenticated = await initializeAuth();
		if (!authenticated && !get(auth).error) {
			await goto('/auth/login?redirectTo=%2Fbilling');
		}
	});
</script>

<svelte:head>
	<title>Paket & Kredit | AI Job Hunter</title>
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
{:else if $auth.user && !$auth.user.isOnboardingCompleted}
	<main class="flex min-h-screen items-center justify-center bg-[#f8f8fc] px-4 py-10">
		<section class="w-full max-w-xl rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm sm:p-8">
			<p class="text-sm font-semibold text-amber-700">Lengkapi onboarding untuk melanjutkan</p>
			<h1 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
				Paket dan kredit tersedia setelah profilmu lengkap.
			</h1>
			<p class="mt-3 text-sm leading-6 text-slate-600">
				Lengkapi profil dan ekstraksi CV terlebih dahulu untuk melanjutkan ke fitur ini.
			</p>
			<a
				href="/dashboard/onboarding"
				class="mt-5 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
			>
				Lengkapi profil
			</a>
		</section>
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
			class="mx-auto mt-6 flex max-w-2xl items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-xs leading-5 text-amber-900"
			role="note"
		>
			<span class="shrink-0 rounded-md bg-amber-100 px-2 py-0.5 font-bold">INFO</span>
			<span>Pembayaran paket dan top-up belum terhubung ke backend.</span>
		</div>
		<div class="mx-auto mt-3 flex max-w-2xl flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
			<span>{$auth.user.fullName} · {$auth.user.email}</span>
			<span>Saldo Kredit Kilat:
				{#if typeof $auth.user.paygBalance === 'number'}
					{formatRupiah($auth.user.paygBalance)}
				{:else}
					—
				{/if}
				({$auth.user.paygCredits ?? '—'} token)
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

			<div class="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-4">
				{#each subscriptionPlans as plan}
					{@const userTier = ($auth.user.subscriptionTier ?? '').toLowerCase()}
					{@const isActive = [plan.id, plan.tier, plan.name].some((tier) => userTier === tier.toLowerCase())}
					{@const isSelected = selectedPlanId === plan.id}
					<article
						class="relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition sm:p-6 {plan.recommended
							? 'border-indigo-500 shadow-indigo-100/80 lg:-translate-y-2'
							: 'border-slate-200'}"
					>
						{#if plan.recommended}
							<div
								class="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-bold text-white shadow-sm"
							>
								<Crown size={12} /> BEST SELLER
							</div>
						{/if}

						<div class="flex items-start justify-between gap-3">
							<div>
								<p class="text-xs font-semibold text-indigo-600">{plan.tier}</p>
								<h3 class="mt-1 text-lg font-bold text-slate-950">{plan.name}</h3>
							</div>
							<span
								class="flex size-10 shrink-0 items-center justify-center rounded-xl {plan.recommended
									? 'bg-indigo-50 text-indigo-600'
									: 'bg-slate-100 text-slate-500'}"
							>
								{#if plan.recommended}
									<Crown size={19} />
								{:else if plan.id === 'unlimited'}
									<Sparkles size={19} />
								{:else}
									<Mail size={19} />
								{/if}
							</span>
						</div>
						<p class="mt-3 min-h-10 text-xs leading-5 text-slate-500">{plan.description}</p>

						<div class="mt-5 flex items-baseline gap-1">
							<strong class="text-3xl font-bold tracking-tight text-slate-950">
								{formatRupiah(plan.price)}
							</strong>
							<span class="text-xs text-slate-500">/{plan.pricePeriod}</span>
						</div>

						<div class="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
							<span
								class="flex size-7 items-center justify-center rounded-lg {plan.recommended
									? 'bg-indigo-100 text-indigo-700'
									: 'bg-white text-slate-600'}"
							>
								<Mail size={14} />
							</span>
							<span class="text-xs font-semibold text-slate-700">{plan.quota}</span>
						</div>

						<ul class="mt-5 grid gap-3">
							{#each plan.features as feature}
								<li class="flex items-start gap-2.5 text-xs leading-5 text-slate-600">
									<span
										class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full {plan.recommended
											? 'bg-indigo-100 text-indigo-700'
											: 'bg-emerald-50 text-emerald-600'}"
									>
										<Check size={11} strokeWidth={2.8} />
									</span>
									{feature}
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
									onclick={() => (selectedPlanId = plan.id)}
									class="flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition {plan.recommended
										? 'border-indigo-600 bg-indigo-600 text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700'
										: 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'}"
								>
									{isSelected
										? 'Dipilih untuk upgrade'
										: plan.id === 'free'
											? 'Mulai Berjuang'
											: 'Pilih Paket Ini'}
									<ArrowRight size={15} />
								</button>
							{/if}
						</div>
					</article>
				{/each}
			</div>
			{#if selectedPlanId}
				<p class="mt-4 text-center text-xs text-indigo-700" role="status">
					Paket dipilih. Aktivasi akan tersedia setelah integrasi pembayaran.
				</p>
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
							Cukup {formatRupiah(500)} per aksi kirim lamaran otomatis tanpa harus berlangganan
							bulanan.
						</p>
						<div class="mt-6 flex items-end gap-2">
							<strong class="text-3xl font-bold">{formatRupiah(500)}</strong>
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
							<p class="mt-1 text-xs text-slate-500">1 token = 1 aksi kirim lamaran otomatis</p>
						</div>
						<span class="hidden size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 sm:flex">
							<Wallet size={19} />
						</span>
					</div>

					<div class="mt-5 grid gap-3 sm:grid-cols-2">
						{#each creditTopUpPackages as pack}
							{@const isSelected = selectedTopUpId === pack.id}
							<button
								type="button"
								aria-pressed={isSelected}
								onclick={() => {
									selectedTopUpId = pack.id;
									topUpRequested = false;
								}}
								class="relative rounded-xl border p-3 text-left transition {isSelected
									? 'border-violet-500 bg-violet-50 ring-2 ring-violet-100'
									: 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/50'}"
							>
								{#if pack.bonus}
									<span
										class="absolute -top-2 right-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[8px] font-bold text-emerald-700"
									>
										{pack.bonus}
									</span>
								{/if}
								<span class="block text-[10px] font-semibold text-slate-500">{pack.label}</span>
								<strong class="mt-1 block text-sm font-bold text-slate-900">
									{formatRupiah(pack.amount)}
								</strong>
								<span class="mt-1 block text-[10px] text-slate-500">{pack.credits} Token</span>
							</button>
						{/each}
					</div>

					<div class="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
						<button
							type="button"
							disabled={!selectedTopUpId}
							onclick={() => (topUpRequested = true)}
							class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-xs font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
						>
							<CreditCard size={15} />
							{selectedTopUpId ? 'Top-up Kredit' : 'Pilih paket kredit'}
						</button>
						{#if topUpRequested}
							<span class="text-xs text-amber-700" role="status">
								Pembayaran belum aktif. Saldo akun belum berubah.
							</span>
						{:else if selectedTopUpId}
							<span class="text-xs text-slate-500" role="status">
								Paket dipilih. Pembayaran belum tersedia.
							</span>
						{:else}
							<span class="text-[10px] leading-4 text-slate-400">
								Pilih nominal untuk melihat ringkasan top-up.
							</span>
						{/if}
					</div>
				</div>
			</div>
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
