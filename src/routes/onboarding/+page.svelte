<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth, initializeAuth, logoutToOnboardingLogin } from '#lib/stores/auth.js';
	import QulyLogo from '#lib/components/ui/QulyLogo.svelte';

	let isLoading = $state(true);
	let showSkipConfirmation = $state(false);

	onMount(async () => {
		const authenticated = await initializeAuth();
		if (!authenticated) {
			await goto('/auth/login?redirectTo=%2Fonboarding', { replaceState: true });
			return;
		}

		if ($auth.user?.isOnboardingCompleted) {
			await goto('/dashboard', { replaceState: true });
			return;
		}

		isLoading = false;
	});
</script>

<svelte:head>
	<title>Lengkapi Profil | Quly</title>
</svelte:head>

<main class="min-h-screen bg-[#f7f8fc] px-5 py-8 text-slate-900 sm:px-8">
	<div class="mx-auto max-w-5xl">
		<header class="flex items-center justify-between gap-4">
			<a href="/" aria-label="Quly, beranda">
				<QulyLogo size={32} />
			</a>
			<button
				type="button"
				onclick={() => (showSkipConfirmation = true)}
				class="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
			>
				Skip Onboarding
			</button>
		</header>

		{#if isLoading}
			<div class="mx-auto mt-20 max-w-2xl animate-pulse rounded-3xl bg-white p-10">
				<div class="h-8 w-2/3 rounded bg-slate-200"></div>
				<div class="mt-4 h-4 w-full rounded bg-slate-100"></div>
				<div class="mt-2 h-4 w-4/5 rounded bg-slate-100"></div>
			</div>
		{:else}
			<section class="mx-auto mt-14 max-w-2xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:mt-20 sm:p-10">
				<p class="text-sm font-semibold text-indigo-600">Selamat datang di Quly</p>
				<h1 class="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
					Buat profil kariermu lebih siap untuk peluang berikutnya.
				</h1>
				<p class="mt-4 leading-7 text-slate-600">
					Unggah CV untuk membantu AI menyusun profil terstruktur, lalu tinjau pengalaman, pendidikan,
					proyek, keterampilan, dan cara AI menulis untukmu. Kamu bisa mengedit semua hasilnya sebelum
					disimpan.
				</p>
				<a
					href="/dashboard/onboarding"
					class="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700"
				>
					Mulai isi profil
				</a>
			</section>
		{/if}
	</div>
</main>

{#if showSkipConfirmation}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
		<dialog
			open
			class="m-0 w-full max-w-lg rounded-2xl border-0 bg-white p-6 shadow-xl sm:p-7"
			aria-modal="true"
			aria-labelledby="skip-onboarding-title"
			aria-describedby="skip-onboarding-description"
		>
			<h2 id="skip-onboarding-title" class="text-lg font-semibold text-slate-950">
				Lewati onboarding?
			</h2>
			<p id="skip-onboarding-description" class="mt-3 text-sm leading-6 text-slate-600">
				Apakah Anda yakin ingin melewati langkah ini? Akun Anda akan disimpan, namun Anda harus login
				kembali dan mengisi onboarding untuk membuka fitur dashboard.
			</p>
			<div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<button
					type="button"
					onclick={() => (showSkipConfirmation = false)}
					class="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
				>
					Lanjutkan Isi
				</button>
				<button
					type="button"
					onclick={logoutToOnboardingLogin}
					class="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
				>
					Ya, Lewati &amp; Logout ke Login
				</button>
			</div>
		</dialog>
	</div>
{/if}
