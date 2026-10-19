<script lang="ts">
	import { page } from '$app/state';
	import { ArrowLeft, House, RefreshCw, TriangleAlert } from '@lucide/svelte';

	const errorDetails = $derived.by(() => {
		switch (page.status) {
			case 401:
				return {
					title: 'Sesi kamu sudah berakhir',
					description: 'Masuk kembali untuk melanjutkan perjalananmu.',
					actionLabel: 'Masuk kembali',
					actionHref: '/auth/login'
				};
			case 403:
				return {
					title: 'Kamu belum punya akses',
					description: 'Halaman ini hanya tersedia untuk akun dengan izin yang sesuai.',
					actionLabel: 'Kembali ke beranda',
					actionHref: '/'
				};
			case 404:
				return {
					title: 'Halaman tidak ditemukan',
					description: 'Sepertinya halaman yang kamu cari sudah pindah atau tidak tersedia.',
					actionLabel: 'Ke beranda',
					actionHref: '/'
				};
			case 500:
				return {
					title: 'Ada kendala di sisi kami',
					description: 'Terjadi gangguan saat memproses permintaanmu. Coba lagi sebentar lagi.',
					actionLabel: 'Coba lagi',
					actionHref: null
				};
			default:
				return {
					title: 'Halaman belum bisa dibuka',
					description: 'Terjadi kendala saat memuat halaman ini. Silakan coba lagi.',
					actionLabel: 'Coba lagi',
					actionHref: null
				};
		}
	});

	const detailMessage = $derived(
		page.error?.message && page.error.message !== 'Internal Error' ? page.error.message : null
	);

	function retry() {
		window.location.reload();
	}
</script>

<svelte:head>
	<title>{page.status} — {errorDetails.title} | AI Job Hunter</title>
	<meta
		name="description"
		content="Informasi kendala saat membuka halaman AI Job Hunter."
	/>
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
	<section
		class="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl shadow-slate-200/60 sm:p-10"
		aria-labelledby="error-title"
	>
		<div
			class="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"
			aria-hidden="true"
		>
			<TriangleAlert size={30} strokeWidth={1.8} />
		</div>

		<p class="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
			Kode error {page.status}
		</p>
		<h1 id="error-title" class="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
			{errorDetails.title}
		</h1>
		<p class="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">
			{detailMessage ?? errorDetails.description}
		</p>

		<div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
			{#if errorDetails.actionHref}
				<a
					href={errorDetails.actionHref}
					class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
				>
					{#if errorDetails.actionHref === '/'}
						<House size={16} />
					{:else}
						<ArrowLeft size={16} />
					{/if}
					{errorDetails.actionLabel}
				</a>
			{:else}
				<button
					type="button"
					onclick={retry}
					class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
				>
					<RefreshCw size={16} />
					{errorDetails.actionLabel}
				</button>
			{/if}

			<a
				href="/"
				class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
			>
				<House size={16} />
				Beranda
			</a>
		</div>
	</section>
</main>
