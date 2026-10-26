<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { BrainCircuit, Clock, History, Play, RefreshCw, Sparkles } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/onboarding/Alert.svelte';
	import { setPsychotestCompleted } from '#lib/stores/psychotestStore.js';
	import { categoryLabel, categoryTone } from '#lib/components/psychotest/labels.js';
	import {
		getPackagesApi,
		getSessionsApi,
		startSessionApi,
		type PsychotestPackage,
		type SessionHistoryItem
	} from '#lib/services/psychotestApi.js';

	let packages = $state<PsychotestPackage[]>([]);
	let sessions = $state<SessionHistoryItem[]>([]);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let isStarting = $state(false);

	const inProgress = $derived(sessions.find((item) => item.status === 'IN_PROGRESS') ?? null);

	function formatDuration(minutes: number): string {
		if (minutes < 60) return `${minutes} menit`;
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return mins ? `${hours} jam ${mins} menit` : `${hours} jam`;
	}

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			const [packageList, history] = await Promise.all([getPackagesApi(), getSessionsApi()]);
			packages = Array.isArray(packageList) ? packageList : [];
			sessions = history.items ?? [];
			setPsychotestCompleted(sessions.some((item) => item.status === 'COMPLETED'));
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Data psikotes belum dapat dimuat.';
		} finally {
			isLoading = false;
		}
	}

	async function startSession() {
		if (isStarting) return;
		isStarting = true;
		errorMessage = null;
		try {
			const session = await startSessionApi();
			await goto(`/dashboard/psychotest/session/${session.sessionId}`);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Tes belum dapat dimulai.';
			isStarting = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>Psikotes | AI Job Hunter</title>
	<meta name="description" content="Ikuti tes psikotes untuk melengkapi profil kariermu." />
</svelte:head>

<div class="space-y-7">
	<header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
		<div>
			<p class="text-sm font-semibold text-indigo-600">Psikotes</p>
			<h1 class="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
				Ukur potensi dirimu
			</h1>
			<p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
				Satu sesi tes mencakup seluruh paket psikotes. Setelah semua paket selesai, kamu bisa
				membuat laporan resmi dan analisis AI.
			</p>
		</div>
		<a
			href="/dashboard/psychotest/history"
			class="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
		>
			<History size={16} /> Riwayat psikotes
		</a>
	</header>

	{#if errorMessage}
		<Alert type="error" message={errorMessage} dismissible ondismiss={() => (errorMessage = null)} />
	{/if}

	{#if inProgress}
		<div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
			<div>
				<p class="text-sm font-semibold text-amber-800">Ada sesi tes yang belum selesai</p>
				<p class="mt-1 text-xs text-amber-700">
					Lanjutkan sesi sebelumnya agar semua paket terselesaikan.
				</p>
			</div>
			<a
				href={`/dashboard/psychotest/session/${inProgress.sessionId}`}
				class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700"
			>
				Lanjutkan <Play size={15} />
			</a>
		</div>
	{/if}

	<div class="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
		<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
			<div class="flex items-start gap-3">
				<span class="flex size-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
					<Sparkles size={20} />
				</span>
				<div>
					<h2 class="text-base font-semibold text-slate-950">Mulai tes psikotes</h2>
					<p class="mt-1 text-sm text-slate-600">
						Semua paket berikut akan dikerjakan dalam satu sesi.
					</p>
				</div>
			</div>
			<button
				type="button"
				onclick={() => void startSession()}
				disabled={isStarting || isLoading || packages.length === 0}
				class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{#if isStarting}
					<Spinner label="Menyiapkan tes" /> Menyiapkan...
				{:else}
					<Play size={16} /> Mulai Tes Psikotes
				{/if}
			</button>
		</div>
	</div>

	{#if isLoading}
		<div class="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
			<Spinner label="Memuat daftar tes" /> Memuat daftar tes...
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
	{:else}
		<section class="space-y-4">
			<h2 class="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">
				Paket dalam sesi tes
			</h2>
			{#if packages.length === 0}
				<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
					<span class="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
						<BrainCircuit size={24} />
					</span>
					<h3 class="mt-4 text-lg font-semibold text-slate-900">Belum ada paket tes</h3>
					<p class="mt-1 text-sm text-slate-500">Paket psikotes akan muncul di sini setelah tersedia.</p>
				</div>
			{:else}
				<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{#each packages as pack (pack.id)}
						<article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
							<div class="flex items-start justify-between gap-3">
								<span class="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
									<BrainCircuit size={22} />
								</span>
								<span class="rounded-full px-2.5 py-1 text-[11px] font-semibold {categoryTone[pack.category]}">
									{categoryLabel[pack.category]}
								</span>
							</div>
							<h3 class="mt-4 text-base font-bold text-slate-950">{pack.title}</h3>
							{#if pack.description}
								<p class="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{pack.description}</p>
							{/if}
							<div class="mt-4 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
								<span class="inline-flex items-center gap-1.5"><Clock size={14} /> {formatDuration(pack.durationMin)}</span>
								<span>{pack.questionCount} soal</span>
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</div>
