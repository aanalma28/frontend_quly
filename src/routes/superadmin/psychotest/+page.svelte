<script lang="ts">
	import { onMount } from 'svelte';
	import {
		ArrowRight,
		BookOpen,
		BrainCircuit,
		ClipboardList,
		LayoutList,
		RefreshCw
	} from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import {
		listAdminPackagesApi,
		type AdminPackagesResponse
	} from '#lib/services/adminPsychotestApi.js';

	let data = $state<AdminPackagesResponse | null>(null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	const modules = [
		{
			label: 'Daftar Paket Tes',
			description: 'Buat, edit, aktifkan, dan hapus paket psikotes.',
			href: '/admin/psychotest/packages',
			icon: LayoutList
		},
		{
			label: 'Bank Soal',
			description: 'Kelola soal, opsi jawaban, kunci, dan urutan.',
			href: '/admin/psychotest/questions',
			icon: BookOpen
		},
		{
			label: 'Monitoring Kandidat',
			description: 'Pantau attempt dan hasil asesmen kandidat.',
			href: '/admin/psychotest/attempts',
			icon: ClipboardList
		}
	];

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			data = await listAdminPackagesApi();
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Statistik psikotes belum dapat dimuat.';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>Psychotest Control | Superadmin</title>
</svelte:head>

<div class="space-y-6">
	<header>
		<p class="text-sm font-semibold text-amber-300">Module</p>
		<h1 class="mt-1 text-2xl font-bold tracking-tight text-white">Psychotest Module Control</h1>
		<p class="mt-2 text-sm text-slate-400">
			Pintu masuk ke pengelolaan paket, bank soal, dan monitoring attempt psikotes.
		</p>
	</header>

	<section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Total paket</p>
			<p class="mt-1 text-2xl font-bold text-white">{data?.summary.totalPackages ?? '—'}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Total soal</p>
			<p class="mt-1 text-2xl font-bold text-white">{data?.summary.totalQuestions ?? '—'}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Attempt selesai</p>
			<p class="mt-1 text-2xl font-bold text-white">
				{data ? `${data.summary.totalCompletedAttempts}/${data.summary.totalAttempts}` : '—'}
			</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<p class="text-xs font-medium text-slate-400">Rata-rata akurasi</p>
			<p class="mt-1 text-2xl font-bold text-white">
				{data?.summary.averageAccuracy ?? '—'}{data?.summary.averageAccuracy !== null &&
				data?.summary.averageAccuracy !== undefined
					? '%'
					: ''}
			</p>
		</div>
	</section>

	{#if isLoading}
		<div class="flex items-center justify-center gap-3 py-10 text-sm text-slate-500">
			<Spinner label="Memuat statistik" /> Memuat statistik psikotes...
		</div>
	{:else if loadError}
		<div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
			<span>Statistik real-time belum dapat dimuat: {loadError}</span>
			<button
				type="button"
				onclick={() => void load()}
				class="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 px-3 py-1.5 text-xs font-semibold transition hover:bg-amber-500/10"
			>
				<RefreshCw size={13} /> Coba lagi
			</button>
		</div>
	{/if}

	<section class="grid gap-4 md:grid-cols-3">
		{#each modules as module (module.href)}
			<a
				href={module.href}
				class="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-indigo-500/40 hover:bg-slate-900"
			>
				<span class="flex size-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
					<module.icon size={21} />
				</span>
				<h2 class="mt-4 text-base font-semibold text-white">{module.label}</h2>
				<p class="mt-1 text-sm leading-6 text-slate-400">{module.description}</p>
				<span class="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 transition group-hover:text-indigo-200">
					Buka modul <ArrowRight size={14} />
				</span>
			</a>
		{/each}
	</section>

	<div class="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
		<div class="flex items-start gap-3">
			<span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
				<BrainCircuit size={18} />
			</span>
			<div>
				<p class="text-sm font-semibold text-white">Tentang modul ini</p>
				<p class="mt-1 text-sm leading-6 text-slate-400">
					Statistik di atas diambil dari API admin psikotes yang sudah aktif
					(<code class="rounded bg-slate-950 px-1.5 py-0.5 text-[11px] text-slate-300">/api/admin/psychotest/...</code>).
					Aksi CRUD paket dan soal dilakukan di halaman admin terkait.
				</p>
			</div>
		</div>
	</div>
</div>
