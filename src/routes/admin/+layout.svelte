<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { get } from 'svelte/store';
	import {
		Activity,
		ArrowLeft,
		BookOpen,
		LayoutList,
		LogOut,
		ShieldAlert
	} from '@lucide/svelte';
	import { auth, getUserRole, initializeAuth, isAdminRole, logout } from '#lib/stores/auth.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	let checking = $state(true);

	const navigation = [
		{ label: 'Daftar Paket Tes', href: '/admin/psychotest/packages', icon: LayoutList },
		{ label: 'Bank Soal', href: '/admin/psychotest/questions', icon: BookOpen },
		{ label: 'Monitoring Kandidat', href: '/admin/psychotest/attempts', icon: Activity }
	];

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}

	onMount(async () => {
		const authenticated = await initializeAuth();
		if (!authenticated && !get(auth).error) {
			await goto('/auth/login?redirectTo=%2Fadmin%2Fpsychotest%2Fpackages');
			return;
		}
		if (!isAdminRole(getUserRole())) {
			await goto('/dashboard', { replaceState: true });
			return;
		}
		checking = false;
	});
</script>

<svelte:head>
	<title>Admin Psikotes | AI Job Hunter</title>
</svelte:head>

{#if checking}
	<div class="flex min-h-screen items-center justify-center bg-slate-50 px-4">
		<p class="text-sm text-slate-500">Memeriksa akses admin...</p>
	</div>
{:else}
	<div class="min-h-screen bg-slate-50 text-slate-900">
		<aside
			class="border-b border-slate-800 bg-slate-950 px-5 py-4 text-white md:fixed md:inset-y-0 md:left-0 md:z-20 md:flex md:w-64 md:flex-col md:border-b-0 md:px-4 md:py-6"
		>
			<a href="/admin/psychotest/packages" class="flex items-center gap-3 px-2">
				<span class="flex size-10 items-center justify-center rounded-xl bg-indigo-500 text-white">
					<ShieldAlert size={20} strokeWidth={1.9} />
				</span>
				<span>
					<span class="block text-sm font-bold tracking-tight">Admin Panel</span>
					<span class="block text-xs text-slate-400">Manajemen psikotes</span>
				</span>
			</a>

			<p class="mt-7 px-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500 md:mt-10">
				Menu
			</p>
			<nav aria-label="Menu admin" class="mt-3 flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-1">
				{#each navigation as item}
					<a
						href={item.href}
						aria-current={isActive(item.href) ? 'page' : undefined}
						class="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition md:w-full {isActive(
							item.href
						)
							? 'bg-indigo-500/15 text-indigo-200'
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
				class="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur sm:px-8"
			>
				<div>
					<p class="text-xs text-slate-500">Admin / <span class="text-slate-800">Psikotes</span></p>
				</div>
				<div class="flex items-center gap-3">
					<span class="hidden text-xs text-slate-500 sm:block">{$auth.user?.email}</span>
					<span class="flex size-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
						{($auth.user?.fullName ?? $auth.user?.email ?? 'A').slice(0, 1).toUpperCase()}
					</span>
				</div>
			</header>

			<main class="mx-auto max-w-[1280px] px-5 py-7 sm:px-8 sm:py-9">
				{@render children()}
			</main>
		</div>
	</div>
{/if}
