<script lang="ts">
	import {
		ArrowUpRight,
		BrainCircuit,
		BriefcaseBusiness,
		CircleHelp,
		LayoutDashboard,
		LogOut,
		MailCheck,
		Plug,
		Plus,
		UserRound,
		WalletCards
	} from '@lucide/svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { auth, getUserRole, homePathForRole, initializeAuth, isAdminRole, logout } from '#lib/stores/auth.js';
	import { psychotest, setPsychotestCompleted } from '#lib/stores/psychotestStore.js';
	import { getSessionsApi } from '#lib/services/psychotestApi.js';
	import { getMyBenefitsApi } from '#lib/services/billingApi.js';
	import { loadProfile, onboarding, step1Complete } from '#lib/stores/onboardingStore.js';
	import RequirementsStepsCard from '#lib/components/ui/RequirementsStepsCard.svelte';
	import QulyLogo from '#lib/components/ui/QulyLogo.svelte';
	import LogoutConfirmModal from '#lib/components/auth/LogoutConfirmModal.svelte';
	import { goto } from '$app/navigation';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	let isAdmin = $state(false);
	let creditBalance = $state<number | null>(null);
	let logoutOpen = $state(false);
	let loggingOut = $state(false);

	const navigation = [
		{ label: 'Ringkasan', href: '/dashboard', icon: LayoutDashboard },
		{ label: 'Lamaran otomatis', href: '/dashboard/auto-apply', icon: MailCheck },
		{ label: 'Pusat lowongan', href: '/dashboard/manual-hub', icon: BriefcaseBusiness },
		{ label: 'Psikotes', href: '/dashboard/psychotest', icon: BrainCircuit },
		{ label: 'Profil & Ekstraksi CV', href: '/dashboard/onboarding', icon: UserRound },
		{ label: 'Integrasi', href: '/dashboard/integrations', icon: Plug }
	];

	function isActive(href: string) {
		return href === '/dashboard'
			? page.url.pathname === href
			: page.url.pathname.startsWith(href);
	}

	async function retryAuthentication() {
		auth.update((state) => ({ ...state, error: null, isLoading: true }));
		const authenticated = await initializeAuth();
		if (!authenticated && !get(auth).error) {
			await goto('/auth/login?redirectTo=%2Fdashboard');
		}
	}

	function openLogoutConfirm() {
		logoutOpen = true;
	}

	function closeLogoutConfirm() {
		if (loggingOut) return;
		logoutOpen = false;
	}

	async function confirmLogout() {
		if (loggingOut) return;
		loggingOut = true;
		try {
			await logout();
		} finally {
			loggingOut = false;
			logoutOpen = false;
		}
	}

	onMount(() => {
		const handleBenefitsUpdated = (event: Event) => {
			const detail = (event as CustomEvent<{ creditBalance?: unknown }>).detail;
			if (typeof detail?.creditBalance === 'number') {
				creditBalance = detail.creditBalance;
			}
		};
		window.addEventListener('benefits:updated', handleBenefitsUpdated);
		return () => window.removeEventListener('benefits:updated', handleBenefitsUpdated);
	});

	onMount(async () => {
		const authenticated = await initializeAuth();
		if (!authenticated && !get(auth).error) {
			await goto('/auth/login?redirectTo=%2Fdashboard');
			return;
		}
		isAdmin = isAdminRole(getUserRole());
		if (isAdmin) {
			await goto(homePathForRole(getUserRole()), { replaceState: true });
			return;
		}
		await loadProfile();

		try {
			const benefits = await getMyBenefitsApi();
			creditBalance = benefits.creditBalance;
		} catch {
			creditBalance = null;
		}

		// Sinkronkan status Step 2 (psikotes) dari riwayat sesi.
		try {
			const history = await getSessionsApi();
			setPsychotestCompleted(
				(history.items ?? []).some((item) => item.status === 'COMPLETED')
			);
		} catch {
			// Non-fatal: pertahankan status yang ada.
		}
	});
</script>

<svelte:head>
	<title>Dashboard | Quly</title>
</svelte:head>

<div class="min-h-screen bg-[#f7f8fc] text-slate-900">
	{#if $auth.isLoading}
		<main class="mx-auto max-w-5xl space-y-5 px-5 py-10 sm:px-8" aria-label="Memuat akun">
			<div class="h-8 w-56 animate-pulse rounded-lg bg-slate-200"></div>
			<div class="h-40 animate-pulse rounded-2xl bg-white"></div>
			<div class="h-64 animate-pulse rounded-2xl bg-white"></div>
		</main>
	{:else if $auth.error}
		<main class="mx-auto max-w-lg px-5 py-24 text-center">
			<h1 class="text-xl font-semibold text-slate-950">Profil belum dapat dimuat</h1>
			<p class="mt-2 text-sm text-slate-600" role="alert">{$auth.error}</p>
			<button
				type="button"
				onclick={retryAuthentication}
				class="mt-5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
			>
				Coba lagi
			</button>
			<button
				type="button"
				onclick={openLogoutConfirm}
				class="ml-2 mt-5 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
			>
				Masuk ulang
			</button>
		</main>
	{:else if isAdmin}
		<main class="flex min-h-screen items-center justify-center px-5 py-24 text-center">
			<div>
				<div class="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"></div>
				<p class="mt-3 text-sm text-slate-600">Mengalihkan ke panel admin...</p>
			</div>
		</main>
	{:else if $auth.user}
	<aside
		class="border-b border-slate-200 bg-white px-5 py-4 md:fixed md:inset-y-0 md:left-0 md:z-20 md:flex md:w-64 md:flex-col md:border-b-0 md:border-r md:px-4 md:py-6"
	>
		<a href="/dashboard" class="flex flex-col items-start gap-1 px-2">
			<QulyLogo size={32} />
			<span class="text-xs text-slate-500">AI career workspace</span>
		</a>

		<div class="mt-7 flex items-center justify-between md:mt-10">
			<p class="px-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
				Menu utama
			</p>
		</div>
		<nav aria-label="Menu utama" class="mt-3 flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-1">
			{#each navigation as item}
				<a
					href={item.href}
					aria-current={isActive(item.href) ? 'page' : undefined}
					class="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition md:w-full {isActive(
						item.href
					)
						? 'bg-indigo-50 text-indigo-700'
						: 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}"
				>
					<item.icon size={18} strokeWidth={1.8} />
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="mt-4 hidden rounded-2xl bg-slate-950 p-4 text-white md:mt-auto md:block">
			<div class="mb-3 flex size-9 items-center justify-center rounded-xl bg-white/10 text-indigo-200">
				<CircleHelp size={18} />
			</div>
			<p class="text-sm font-semibold">Butuh bantuan?</p>
			<p class="mt-1 text-xs leading-5 text-slate-300">
				Temukan jawaban umum atau hubungi tim Quly untuk kendala akun, paket, dan proses lamaran.
			</p>
			<a href="/support" class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-200">
				Buka pusat bantuan <ArrowUpRight size={13} />
			</a>
		</div>
	</aside>

	<a
		href="/support"
		aria-label="Buka pusat bantuan"
		class="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-10 items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/95 px-3.5 text-[11px] font-semibold text-white shadow-lg shadow-slate-950/25 backdrop-blur transition hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f8fc] active:scale-95 md:hidden"
	>
		<CircleHelp size={15} class="text-indigo-200" />
		Bantuan
	</a>

	<div class="min-h-screen md:pl-64">
		<header
			class="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur sm:px-8"
		>
			<div>
				<p class="text-xs text-slate-500">Ruang kerja / <span class="text-slate-800">Dashboard</span></p>
			</div>
			<div class="flex items-center gap-3 sm:gap-5">
				<a
					href="/billing"
					class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700 sm:text-sm"
				>
					<WalletCards size={16} />
					<span>{creditBalance ?? '—'} kredit</span>
					<Plus size={14} class="text-indigo-600" />
				</a>
				<button
					type="button"
					onclick={openLogoutConfirm}
					class="flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 sm:hidden"
					aria-label="Keluar dari akun"
				>
					<LogOut size={16} />
				</button>
				<button
					type="button"
					onclick={openLogoutConfirm}
					class="hidden items-center gap-2 rounded-full p-1.5 pr-2 text-slate-600 transition hover:bg-slate-50 hover:text-indigo-700 sm:flex"
					aria-label="Keluar dari akun"
				>
					<span class="flex size-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
						{$auth.user.fullName
							.split(/\s+/)
							.map((part) => part[0])
							.slice(0, 2)
							.join('')
							.toUpperCase()}
					</span>
					<span class="block text-left">
						<span class="block max-w-36 truncate text-xs font-semibold leading-4">{$auth.user.fullName}</span>
						<span class="block max-w-36 truncate text-[11px] text-slate-500">{$auth.user.email}</span>
					</span>
					<LogOut size={14} />
				</button>
			</div>
		</header>

		<main class="mx-auto max-w-[1440px] px-5 pb-24 pt-7 sm:px-8 sm:pt-9 md:pb-9">
			{#if page.url.pathname === '/dashboard' || page.url.pathname === '/dashboard/onboarding' || page.url.pathname === '/dashboard/integrations'}
				{@render children()}
			{:else if $onboarding.isLoadingProfile}
				<div class="flex items-center justify-center gap-3 py-16 text-sm text-slate-500" aria-label="Memuat status akses">
					<div class="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"></div>
					Memuat status akses...
				</div>
			{:else if page.url.pathname.startsWith('/dashboard/psychotest')}
				{#if $step1Complete}
					{@render children()}
				{:else}
					<RequirementsStepsCard
						title="Lengkapi profil untuk mulai tes psikotes"
						description="Sebelum mengikuti tes, lengkapi profil dan ekstraksi CV terlebih dahulu."
						steps={[
							{
								number: 1,
								title: 'Lengkapi Profil & Ekstraksi CV',
								description: 'Unggah CV dan tinjau data profilmu agar hasil tes bisa tersimpan dengan benar.',
								completed: $step1Complete,
								href: '/dashboard/onboarding'
							}
						]}
					/>
				{/if}
			{:else if $step1Complete && $psychotest.hasCompleted}
				{@render children()}
			{:else}
				<RequirementsStepsCard
					title="Selesaikan 2 langkah untuk membuka fitur ini"
					description="Fitur ini membutuhkan profil karier dan hasil tes psikotes agar bisa disesuaikan dengan kebutuhanmu."
					steps={[
						{
							number: 1,
							title: 'Lengkapi Profil & Ekstraksi CV',
							description: 'Unggah CV, tinjau data profil, dan buat CV ATS-mu.',
							completed: $step1Complete,
							href: '/dashboard/onboarding'
						},
						{
							number: 2,
							title: 'Selesaikan Tes Psikotes',
							description: 'Ikuti tes psikotes agar hasilnya bisa dilampirkan ke lamaran.',
							completed: $psychotest.hasCompleted,
							href: '/dashboard/psychotest'
						}
					]}
				/>
			{/if}
		</main>
	</div>
	{/if}

	<LogoutConfirmModal
		open={logoutOpen}
		loading={loggingOut}
		onconfirm={() => void confirmLogout()}
		oncancel={closeLogoutConfirm}
	/>
</div>
