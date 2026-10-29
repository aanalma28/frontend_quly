<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { get } from 'svelte/store';
	import {
		Bot,
		Boxes,
		ChartColumn,
		Crown,
		LayoutDashboard,
		ListChecks,
		LogOut,
		Plug,
		Rss
	} from '@lucide/svelte';
	import { auth, getUserRole, initializeAuth, logout } from '#lib/stores/auth.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	let checking = $state(true);

	const navigation = [
		{ label: 'Executive Overview', href: '/superadmin', icon: LayoutDashboard, exact: true },
		{ label: 'Live Job Ingestion & Audit', href: '/superadmin/jobs', icon: Rss },
		{ label: 'Job Statistics', href: '/superadmin/job-statistics', icon: ChartColumn },
		{ label: 'Ingestion Sources', href: '/superadmin/sources', icon: Plug },
		{ label: 'Scraper Runs', href: '/superadmin/scraper-runs', icon: ListChecks },
		{ label: 'Subscription Packages', href: '/superadmin/packages', icon: Boxes },
		{ label: 'AI Cost & Token Analytics', href: '/superadmin/ai-analytics', icon: Bot }
	];

	function isActive(href: string, exact = false) {
		return exact
			? page.url.pathname === href
			: page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}

	onMount(async () => {
		const authenticated = await initializeAuth();
		if (!authenticated && !get(auth).error) {
			await goto('/auth/login?redirectTo=%2Fsuperadmin');
			return;
		}
		const role = getUserRole();
		if (role !== 'SUPER_ADMIN') {
			await goto(role === 'ADMIN' ? '/admin/psychotest/packages' : '/dashboard', {
				replaceState: true
			});
			return;
		}
		checking = false;
	});
</script>

<svelte:head>
	<title>Superadmin | AI Job Hunter</title>
</svelte:head>

{#if checking}
	<div class="flex min-h-screen items-center justify-center bg-slate-950 px-4">
		<div class="text-center">
			<div class="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400"></div>
			<p class="mt-3 text-sm text-slate-400">Memeriksa akses superadmin...</p>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-slate-950 text-slate-200">
		<aside
			class="border-b border-slate-800 bg-slate-950 px-5 py-4 md:fixed md:inset-y-0 md:left-0 md:z-20 md:flex md:w-64 md:flex-col md:border-b-0 md:border-r md:px-4 md:py-6"
		>
			<a href="/superadmin" class="flex items-center gap-3 px-2">
				<span class="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950">
					<Crown size={20} strokeWidth={2} />
				</span>
				<span>
					<span class="block text-sm font-bold tracking-tight text-white">Quly Executive</span>
					<span class="block text-xs text-slate-500">Superadmin Cockpit</span>
				</span>
			</a>

			<p class="mt-7 px-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-600 md:mt-9">
				Control Center
			</p>
			<nav
				aria-label="Menu superadmin"
				class="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-1"
			>
				{#each navigation as item}
					<a
						href={item.href}
						aria-current={isActive(item.href, item.exact) ? 'page' : undefined}
						class="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium leading-snug transition md:w-full {isActive(
							item.href,
							item.exact
						)
							? 'bg-indigo-500/15 text-indigo-200 ring-1 ring-inset ring-indigo-500/20'
							: 'text-slate-400 hover:bg-white/5 hover:text-white'}"
					>
						<item.icon size={18} strokeWidth={1.8} />
						{item.label}
					</a>
				{/each}
			</nav>

			<div class="mt-6 hidden space-y-2 md:mt-auto md:block">
				<button
					type="button"
					onclick={logout}
					class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
				>
					<LogOut size={16} /> Keluar
				</button>
			</div>
		</aside>

		<div class="min-h-screen md:pl-64">
			<header
				class="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-slate-800 bg-slate-950/90 px-5 backdrop-blur sm:px-8"
			>
				<div>
					<p class="text-xs text-slate-500">
						Superadmin / <span class="text-slate-300">Executive Cockpit</span>
					</p>
				</div>
				<div class="flex items-center gap-3">
					<span class="hidden rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-300 sm:block">
						Super Admin
					</span>
					<span class="hidden text-xs text-slate-400 sm:block">{$auth.user?.email}</span>
					<span class="flex size-8 items-center justify-center rounded-full bg-amber-500/15 text-xs font-bold text-amber-300">
						{($auth.user?.fullName ?? $auth.user?.email ?? 'S').slice(0, 1).toUpperCase()}
					</span>
				</div>
			</header>

			<main class="mx-auto max-w-[1400px] px-5 py-7 sm:px-8 sm:py-9">
				{@render children()}
			</main>
		</div>
	</div>
{/if}
