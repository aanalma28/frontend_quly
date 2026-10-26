<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { ArrowRight, BookOpen, RefreshCw } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/onboarding/Alert.svelte';
	import { categoryLabel, categoryTone } from '#lib/components/psychotest/labels.js';
	import {
		listAdminPackagesApi,
		type AdminPackageListItem
	} from '#lib/services/adminPsychotestApi.js';

	let items = $state<AdminPackageListItem[]>([]);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			const response = await listAdminPackagesApi();
			items = response.items ?? [];
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Bank soal belum dapat dimuat.';
		} finally {
			isLoading = false;
		}
	}

	function manageQuestions(pkg: AdminPackageListItem) {
		void goto(`/admin/psychotest/packages/${pkg.id}/questions`);
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>Bank Soal | Admin Psikotes</title>
</svelte:head>

<div class="space-y-6">
	<header>
		<p class="text-sm font-semibold text-indigo-600">Admin Psikotes</p>
		<h1 class="mt-1 text-2xl font-bold tracking-tight text-slate-950">Bank Soal</h1>
		<p class="mt-2 text-sm text-slate-600">
			Pilih paket tes untuk mengelola soal, opsi jawaban, dan kunci jawabannya.
		</p>
	</header>

	{#if isLoading}
		<div class="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
			<Spinner label="Memuat bank soal" /> Memuat bank soal...
		</div>
	{:else if loadError}
		<div class="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
			<p class="text-sm text-rose-700" role="alert">{loadError}</p>
			<button
				type="button"
				onclick={() => void load()}
				class="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
			>
				<RefreshCw size={15} /> Coba lagi
			</button>
		</div>
	{:else if items.length === 0}
		<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
			<span class="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
				<BookOpen size={24} />
			</span>
			<h2 class="mt-4 text-lg font-semibold text-slate-900">Belum ada paket tes</h2>
			<p class="mt-1 text-sm text-slate-500">
				Buat paket tes terlebih dahulu sebelum menambahkan soal.
			</p>
			<a
				href="/admin/psychotest/packages"
				class="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
			>
				Ke daftar paket tes <ArrowRight size={16} />
			</a>
		</div>
	{:else}
		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			{#each items as pkg (pkg.id)}
				<article class="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					<div class="flex items-start justify-between gap-3">
						<span class="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
							<BookOpen size={21} />
						</span>
						<span class="rounded-full px-2.5 py-1 text-[11px] font-semibold {categoryTone[pkg.category]}">
							{categoryLabel[pkg.category]}
						</span>
					</div>
					<h2 class="mt-4 text-base font-bold text-slate-950">{pkg.title}</h2>
					<p class="mt-1 text-xs text-slate-500">{pkg.durationMin} menit</p>
					<div class="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
						<BookOpen size={15} class="text-slate-400" />
						{pkg.questionCount} soal
					</div>
					<button
						type="button"
						onclick={() => manageQuestions(pkg)}
						class="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
					>
						Kelola Soal <ArrowRight size={15} />
					</button>
				</article>
			{/each}
		</div>
	{/if}
</div>
