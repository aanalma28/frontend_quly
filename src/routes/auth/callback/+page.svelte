<script lang="ts">
	import { onMount } from 'svelte';
	import { completeOAuthLogin } from '#lib/stores/auth.js';
	import Spinner from '#lib/components/ui/Spinner.svelte';

	let errorMessage = $state<string | null>(null);

	onMount(async () => {
		const url = new URL(window.location.href);
		const accessToken =
			url.searchParams.get('access_token') ??
			url.searchParams.get('accessToken') ??
			url.searchParams.get('token');
		const refreshToken =
			url.searchParams.get('refresh_token') ?? url.searchParams.get('refreshToken');
		const oauthError = url.searchParams.get('error_description') ?? url.searchParams.get('error');

		window.history.replaceState(window.history.state, '', `${url.pathname}${url.hash}`);

		if (oauthError) {
			errorMessage = oauthError;
			return;
		}
		if (!accessToken) {
			errorMessage = 'Backend tidak mengirim token setelah proses masuk Google.';
			return;
		}

		try {
			await completeOAuthLogin(accessToken, refreshToken);
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Gagal menyelesaikan proses masuk dengan Google.';
		}
	});
</script>

<svelte:head>
	<title>Menyelesaikan login | AI Job Hunter</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
	<div class="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
		{#if errorMessage}
			<h1 class="text-lg font-semibold text-zinc-900">Login Google belum berhasil</h1>
			<p class="mt-2 text-sm text-zinc-600" role="alert">{errorMessage}</p>
			<a
				href="/auth/login"
				class="mt-5 inline-flex rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
			>
				Kembali ke login
			</a>
		{:else}
			<Spinner label="Menyelesaikan login Google" />
			<p class="mt-3 text-sm text-zinc-600">Sebentar, kami sedang menyiapkan akunmu.</p>
		{/if}
	</div>
</main>
