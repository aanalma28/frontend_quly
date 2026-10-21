<script lang="ts">
	import {
		ArrowUpRight,
		BrainCircuit,
		BriefcaseBusiness,
		CircleHelp,
		LayoutDashboard,
		LogOut,
		MailCheck,
		Plus,
		UserRound,
		WalletCards
	} from '@lucide/svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { auth, initializeAuth, logout } from '#lib/stores/auth.js';
	import { goto } from '$app/navigation';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const navigation = [
		{ label: 'Ringkasan', href: '/dashboard', icon: LayoutDashboard },
		{ label: 'Lamaran otomatis', href: '/dashboard/auto-apply', icon: MailCheck },
		{ label: 'Pusat lowongan', href: '/dashboard/manual-hub', icon: BriefcaseBusiness },
		{ label: 'Hasil psikotes', href: '/dashboard/psychotest', icon: BrainCircuit },
		{ label: 'Profil & Ekstraksi CV', href: '/dashboard/onboarding', icon: UserRound }
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

	onMount(async () => {
		const authenticated = await initializeAuth();
		if (!authenticated && !get(auth).error) {
			await goto('/auth/login?redirectTo=%2Fdashboard');
		}
	});
</script>

<svelte:head>
	<title>Dashboard | AI Job Hunter</title>
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
				onclick={logout}
				class="ml-2 mt-5 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
			>
				Masuk ulang
			</button>
		</main>
	{:else if $auth.user}
	<aside
		class="border-b border-slate-200 bg-white px-5 py-4 md:fixed md:inset-y-0 md:left-0 md:z-20 md:flex md:w-64 md:flex-col md:border-b-0 md:border-r md:px-4 md:py-6"
	>
		<a href="/dashboard" class="flex items-center gap-3 px-2">
			<span class="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
				<BriefcaseBusiness size={21} strokeWidth={1.9} />
			</span>
			<span>
				<span class="block text-sm font-bold tracking-tight text-slate-950">jobhunter</span>
				<span class="block text-xs text-slate-500">AI career workspace</span>
			</span>
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

		<div class="mt-6 hidden rounded-2xl bg-slate-950 p-4 text-white md:mt-auto md:block">
			<div class="mb-3 flex size-9 items-center justify-center rounded-xl bg-white/10 text-indigo-200">
				<CircleHelp size={18} />
			</div>
			<p class="text-sm font-semibold">Butuh bantuan?</p>
			<p class="mt-1 text-xs leading-5 text-slate-300">
				Lanjutkan mengelola lamaranmu dan pantau progres di ruang kerja ini.
			</p>
			<a href="/dashboard/auto-apply" class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-200">
				Lihat lamaran <ArrowUpRight size={13} />
			</a>
		</div>
	</aside>

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
					<span>{$auth.user.paygCredits ?? '—'} kredit</span>
					<Plus size={14} class="text-indigo-600" />
				</a>
				<button
					type="button"
					onclick={logout}
					class="flex items-center gap-2 rounded-full p-1.5 pr-2 text-slate-600 transition hover:bg-slate-50 hover:text-indigo-700"
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
					<span class="hidden text-left sm:block">
						<span class="block max-w-36 truncate text-xs font-semibold leading-4">{$auth.user.fullName}</span>
						<span class="block max-w-36 truncate text-[11px] text-slate-500">{$auth.user.email}</span>
					</span>
					<LogOut size={14} class="hidden sm:block" />
				</button>
			</div>
		</header>

		<main class="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9">
			{#if $auth.user.isOnboardingCompleted ||
				page.url.pathname === '/dashboard' ||
				page.url.pathname === '/dashboard/onboarding'}
				{@render children()}
			{:else}
				<section class="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
					<p class="text-sm font-semibold text-amber-700">Lengkapi onboarding untuk melanjutkan</p>
					<h1 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
						Fitur ini tersedia setelah profilmu lengkap.
					</h1>
					<p class="mt-3 text-sm leading-6 text-slate-600">
						Lengkapi profil dan ekstraksi CV terlebih dahulu agar fitur ini bisa disesuaikan dengan
						informasi kariermu.
					</p>
					<a
						href="/dashboard/onboarding"
						class="mt-5 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
					>
						Lengkapi profil
					</a>
				</section>
			{/if}
		</main>
	</div>
	{/if}
</div>
