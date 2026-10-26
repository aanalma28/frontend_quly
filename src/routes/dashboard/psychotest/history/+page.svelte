<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowRight, CheckCircle2, Clock, Download, History, Play, RefreshCw } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/onboarding/Alert.svelte';
	import { setPsychotestCompleted } from '#lib/stores/psychotestStore.js';
	import {
		categoryLabel,
		competencyLabel,
		formatDate,
		statusLabel
	} from '#lib/components/psychotest/labels.js';
	import {
		downloadCertificateApi,
		getSessionsApi,
		type SessionHistoryItem
	} from '#lib/services/psychotestApi.js';

	let sessions = $state<SessionHistoryItem[]>([]);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let downloadingId = $state<string | null>(null);

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			const response = await getSessionsApi();
			sessions = response.items ?? [];
			setPsychotestCompleted(sessions.some((item) => item.status === 'COMPLETED'));
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Riwayat belum dapat dimuat.';
		} finally {
			isLoading = false;
		}
	}

	async function download(sessionId: string) {
		if (downloadingId) return;
		downloadingId = sessionId;
		errorMessage = null;
		try {
			const blob = await downloadCertificateApi(sessionId);
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `laporan-psikotes-${sessionId}.pdf`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Laporan belum dapat diunduh.';
		} finally {
			downloadingId = null;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>Riwayat Psikotes | AI Job Hunter</title>
</svelte:head>

<div class="space-y-7">
	<header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
		<div>
			<p class="text-sm font-semibold text-indigo-600">Psikotes</p>
			<h1 class="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Riwayat psikotes</h1>
			<p class="mt-2 text-sm text-slate-600">Lihat seluruh sesi tes, skor, dan laporan resmi.</p>
		</div>
		<a
			href="/dashboard/psychotest"
			class="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
		>
			<History size={16} /> Halaman psikotes
		</a>
	</header>

	{#if errorMessage}
		<Alert type="error" message={errorMessage} dismissible ondismiss={() => (errorMessage = null)} />
	{/if}

	{#if isLoading}
		<div class="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
			<Spinner label="Memuat riwayat" /> Memuat riwayat...
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
	{:else if sessions.length === 0}
		<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
			<span class="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
				<History size={24} />
			</span>
			<h2 class="mt-4 text-lg font-semibold text-slate-900">Belum ada riwayat</h2>
			<p class="mt-1 text-sm text-slate-500">Mulai tes psikotes pertamamu untuk melihat riwayat di sini.</p>
			<a
				href="/dashboard/psychotest"
				class="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
			>
				Mulai tes <ArrowRight size={16} />
			</a>
		</div>
	{:else}
		<div class="space-y-4">
			{#each sessions as item (item.sessionId)}
				<article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div>
							<div class="flex flex-wrap items-center gap-2">
								<span
									class="rounded-full px-2.5 py-1 text-[11px] font-semibold {item.status === 'COMPLETED'
										? 'bg-emerald-50 text-emerald-700'
										: 'bg-amber-50 text-amber-700'}"
								>
									{statusLabel[item.status]}
								</span>
								{#if item.certificateAvailable}
									<span class="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
										<CheckCircle2 size={12} /> Sertifikat tersedia
									</span>
								{/if}
							</div>
							<p class="mt-2 text-sm font-semibold text-slate-900">
								Mulai {formatDate(item.startedAt)}
							</p>
							<p class="text-xs text-slate-500">
								{item.completedAt ? `Selesai ${formatDate(item.completedAt)}` : 'Belum selesai'}
							</p>
						</div>

						<div class="text-right">
							{#if item.overallScore !== null}
								<p class="text-2xl font-bold text-slate-950">{item.overallScore}</p>
								<p class="text-[11px] font-medium text-slate-500">
									{item.competencyLevel ? competencyLabel[item.competencyLevel] : 'Skor keseluruhan'}
								</p>
							{:else}
								<p class="text-xs text-slate-400">Skor belum tersedia</p>
							{/if}
						</div>
					</div>

					<div class="mt-4 flex flex-wrap gap-2">
						{#each item.packages as pkg (pkg.packageId)}
							<span class="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
								{#if pkg.status === 'COMPLETED'}
									<CheckCircle2 size={12} class="text-emerald-500" />
								{:else}
									<Clock size={12} class="text-amber-500" />
								{/if}
								{categoryLabel[pkg.category]}: {pkg.title}
							</span>
						{/each}
					</div>

					<div class="mt-5 flex flex-wrap items-center gap-2">
						<a
							href={`/dashboard/psychotest/session/${item.sessionId}`}
							class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
						>
							{#if item.status === 'IN_PROGRESS'}
								<Play size={15} /> Lanjutkan
							{:else}
								<ArrowRight size={15} /> Lihat Detail
							{/if}
						</a>
						{#if item.certificateAvailable}
							<button
								type="button"
								onclick={() => void download(item.sessionId)}
								disabled={downloadingId === item.sessionId}
								class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
							>
								{#if downloadingId === item.sessionId}
									<Spinner label="Mengunduh laporan" /> Mengunduh...
								{:else}
									<Download size={15} /> Download Laporan
								{/if}
							</button>
						{/if}
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>
