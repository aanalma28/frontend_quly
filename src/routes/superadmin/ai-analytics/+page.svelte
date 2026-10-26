<script lang="ts">
	import { onMount } from 'svelte';
	import { Activity, Bot, CircleDollarSign, Cpu, RefreshCw } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/superadmin/Alert.svelte';
	import BarChart from '#lib/components/superadmin/BarChart.svelte';
	import DonutChart from '#lib/components/superadmin/DonutChart.svelte';
	import KpiCard from '#lib/components/superadmin/KpiCard.svelte';
	import {
		formatCompact,
		formatDate,
		formatNumber,
		formatRupiah,
		formatUsd
	} from '#lib/components/superadmin/format.js';
	import { getAiAnalytics, type AiAnalytics } from '#lib/services/superadminApi.js';

	let analytics = $state<AiAnalytics | null>(null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			analytics = await getAiAnalytics();
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Analitik AI belum dapat dimuat.';
		} finally {
			isLoading = false;
		}
	}

	const donutSegments = $derived(
		analytics
			? analytics.features.map((feature) => ({
					label: feature.label,
					value: feature.tokens,
					color: feature.color
				}))
			: []
	);

	const dailyLabels = $derived(analytics ? analytics.daily.map((item) => item.date) : []);
	const dailyTotals = $derived(
		analytics
			? analytics.daily.map((item) => item.jobExtraction + item.psychotest + item.resumeBuilder)
			: []
	);

	const costPerCall = $derived(
		analytics && analytics.totalCalls > 0 ? analytics.totalCostUsd / analytics.totalCalls : 0
	);

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>OpenAI Economics | Superadmin</title>
</svelte:head>

<div class="space-y-6">
	<header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
		<div>
			<p class="text-sm font-semibold text-amber-300">Unit Economics</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight text-white">OpenAI Cost &amp; Economics</h1>
			<p class="mt-2 text-sm text-slate-400">
				Breakdown biaya token per fitur, tren harian, dan proses paling mahal.
			</p>
		</div>
	</header>

	{#if isLoading}
		<div class="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
			<Spinner label="Memuat analitik" /> Memuat analitik AI...
		</div>
	{:else if loadError}
		<div class="mx-auto max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
			<p class="text-sm text-rose-300" role="alert">{loadError}</p>
			<button
				type="button"
				onclick={() => void load()}
				class="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
			>
				<RefreshCw size={15} /> Coba lagi
			</button>
		</div>
	{:else if analytics}
		<section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
			<KpiCard
				label="Total Token"
				value={formatCompact(analytics.totalTokens)}
				hint="Seluruh fitur AI"
				icon={Cpu}
				tone="indigo"
			/>
			<KpiCard
				label="Total Biaya"
				value={formatUsd(analytics.totalCostUsd)}
				hint={`≈ ${formatRupiah(analytics.totalCostIdr)}`}
				icon={CircleDollarSign}
				tone="rose"
			/>
			<KpiCard
				label="Total AI Calls"
				value={formatNumber(analytics.totalCalls)}
				hint="Request OpenAI"
				icon={Bot}
				tone="violet"
			/>
			<KpiCard
				label="Biaya / Call"
				value={formatUsd(costPerCall)}
				hint="Rata-rata per request"
				icon={Activity}
				tone="cyan"
			/>
		</section>

		<section class="grid gap-3 md:grid-cols-3">
			{#each analytics.features as feature (feature.feature)}
				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
					<div class="flex items-center justify-between">
						<p class="text-sm font-semibold text-white">{feature.label}</p>
						<span class="size-2.5 rounded-full" style:background={feature.color}></span>
					</div>
					<p class="mt-3 text-2xl font-bold text-white">{formatCompact(feature.tokens)}</p>
					<p class="text-[11px] text-slate-500">token</p>
					<div class="mt-3 flex items-center justify-between text-xs">
						<span class="text-slate-400">{formatNumber(feature.calls)} calls</span>
						<span class="font-semibold text-slate-200">{formatUsd(feature.costUsd)}</span>
					</div>
					<p class="mt-1 text-[11px] text-slate-500">≈ {formatRupiah(feature.costIdr)}</p>
				</div>
			{/each}
		</section>

		<section class="grid gap-4 lg:grid-cols-3">
			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
				<h2 class="text-sm font-semibold text-white">Proporsi Token</h2>
				<p class="mt-1 text-xs text-slate-500">Kontribusi tiap fitur terhadap total token.</p>
				<div class="mt-5 flex justify-center">
					<DonutChart
						segments={donutSegments}
						centerValue={formatCompact(analytics.totalTokens)}
						centerLabel="Total token"
					/>
				</div>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-2">
				<h2 class="text-sm font-semibold text-white">Pemakaian Token Harian</h2>
				<p class="mt-1 text-xs text-slate-500">Total token seluruh fitur per hari (14 hari terakhir).</p>
				<div class="mt-4">
					<BarChart
						labels={dailyLabels}
						values={dailyTotals}
						color="#6366f1"
						valueFormatter={(value) => formatCompact(value)}
					/>
				</div>
			</div>
		</section>

		<section class="rounded-2xl border border-slate-800 bg-slate-900/60">
			<div class="border-b border-slate-800 px-5 py-4">
				<h2 class="text-sm font-semibold text-white">Deteksi Proses Berbiaya Tinggi</h2>
				<p class="mt-1 text-xs text-slate-500">
					Proses dengan konsumsi token besar — kandidat untuk optimasi prompt/caching.
				</p>
			</div>
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-slate-800 text-sm">
					<thead class="bg-slate-900 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
						<tr>
							<th class="px-5 py-3">Proses</th>
							<th class="px-5 py-3">Fitur</th>
							<th class="px-5 py-3">Tokens</th>
							<th class="px-5 py-3">Biaya</th>
							<th class="px-5 py-3">Durasi</th>
							<th class="px-5 py-3">Waktu</th>
							<th class="px-5 py-3">Catatan</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-800/70">
						{#each analytics.highCost as process (process.id)}
							<tr class="hover:bg-slate-900">
								<td class="px-5 py-4 font-medium text-slate-200">{process.label}</td>
								<td class="px-5 py-4 text-xs text-slate-400">{process.feature}</td>
								<td class="px-5 py-4 text-slate-300">{formatCompact(process.tokens)}</td>
								<td class="px-5 py-4 font-semibold text-slate-200">{formatUsd(process.costUsd)}</td>
								<td class="px-5 py-4 text-xs text-slate-400">{(process.durationMs / 1000).toFixed(1)}s</td>
								<td class="px-5 py-4 text-xs text-slate-500">{formatDate(process.timestamp)}</td>
								<td class="px-5 py-4 text-xs text-slate-400">{process.note}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
</div>
