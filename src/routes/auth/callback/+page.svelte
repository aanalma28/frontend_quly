<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { authStore, getUserRole, homePathForRole, saveAuthTokens } from '#lib/stores/auth.js';
	import Spinner from '#lib/components/ui/Spinner.svelte';

	onMount(async () => {
		const accessToken = page.url.searchParams.get('accessToken');
		const refreshToken = page.url.searchParams.get('refreshToken');

		if (!accessToken) {
			await goto('/auth/login?error=OAuthFailed', { replaceState: true });
			return;
		}

		try {
			saveAuthTokens(accessToken, refreshToken);
			await authStore.fetchUserProfile();
			await goto(homePathForRole(getUserRole()), { replaceState: true, invalidateAll: true });
		} catch {
			await goto('/auth/login?error=OAuthFailed', { replaceState: true });
		}
	});
</script>

<svelte:head>
	<title>Menghubungkan akun Google | Quly</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
	<div
		class="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm"
		role="status"
		aria-live="polite"
	>
		<span
			class="mx-auto flex size-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600"
		>
			<Spinner label="Menghubungkan akun Google Anda..." />
		</span>
		<h1 class="mt-5 text-lg font-semibold text-zinc-900">Menghubungkan akun Google Anda...</h1>
		<p class="mt-2 text-sm text-zinc-500">Mohon tunggu, kami sedang memverifikasi akun Anda.</p>
	</div>
</main>
