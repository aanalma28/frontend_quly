<script lang="ts">
	import { onMount } from 'svelte';
	import { Activity, Bot, CircleDollarSign, Cpu, RefreshCw } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import BarChart from '#lib/components/superadmin/BarChart.svelte';
	import DonutChart from '#lib/components/superadmin/DonutChart.svelte';
	import KpiCard from '#lib/components/superadmin/KpiCard.svelte';
	import { formatCompact, formatNumber, formatRupiah, formatUsd } from '#lib/components/superadmin/format.js';
	import {
		getAiCostsApi,
		getOverviewApi,
		type AiCostsResponse,
		type OverviewResponse
	} from '#lib/services/superadminApi.js';

	let data = $state<AiCostsResponse | null>(null);
	let overview = $state<OverviewResponse | null>(null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	let fromInput = $state('');
	let toInput = $state('');
	let appliedFrom = $state('');
	let appliedTo = $state('');

	const palette = ['#6366f1', '#a855f7', '#22d3ee', '#f59e0b', '#f43f5e', '#10b981'];

	const featureLabels: Record<string, string> = {
		JOB_EXTRACTION: 'Job Extraction',
		PSYCHOTEST_AI: 'Psychotest AI',
		RESUME_BUILDER: 'Resume Builder'
	};

	function featureLabel(name: string): string {
		if (featureLabels[name]) return featureLabels[name];
		return name
			.split('_')
			.map((part) => part.charAt(0) + part.slice(1).toLowerCase())
			.join(' ');
	}

	function featureTokens(feature: { promptTokens: number; completionTokens: number }): number {
		return feature.promptTokens + feature.completionTokens;
	}

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			const [costs, overviewData] = await Promise.all([
				getAiCostsApi({
					from: appliedFrom || undefined,
					to: appliedTo || undefined
				}),
				getOverviewApi()
			]);
			data = costs;
			overview = overviewData;
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Analitik AI belum dapat dimuat.';
		} finally {
			isLoading = false;
		}
	}

	function applyRange() {
		appliedFrom = fromInput;
		appliedTo = toInput;
		void load();
	}

	function resetRange() {
		fromInput = '';
		toInput = '';
		appliedFrom = '';
		appliedTo = '';
		void load();
	}

	onMount(() => {
		void load();
	});

	const idrPerUsd = $derived(overview?.ai.idrPerUsd ?? 16_000);
	const totalTokens = $derived(
		data ? data.totals.promptTokens + data.totals.completionTokens : 0
	);
	const costPerRequest = $derived(
		data && data.totals.requests > 0 ? data.totals.estimatedCostUsd / data.totals.requests : 0
	);

	const featureSegments = $derived(
		data
			? data.byFeature.map((feature, index) => ({
					label: featureLabel(feature.featureName),
					value: featureTokens(feature),
					color: palette[index % palette.length]
				}))
			: []
	);

	const featureLabelsList = $derived(
		data ? data.byFeature.map((feature) => featureLabel(feature.featureName)) : []
	);
	const featureValues = $derived(
		data ? data.byFeature.map((feature) => featureTokens(feature)) : []
	);
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
				Breakdown biaya token per fitur dari log penggunaan OpenAI.
			</p>
		</div>
		<button
			type="button"
			onclick={() => void load()}
			disabled={isLoading}
			class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
		>
			<RefreshCw size={15} /> Refresh
		</button>
	</header>

	<div class="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-end">
		<label class="block space-y-1.5 text-sm font-medium text-slate-300">
			Dari tanggal
			<input
				bind:value={fromInput}
				type="date"
				class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
			/>
		</label>
		<label class="block space-y-1.5 text-sm font-medium text-slate-300">
			Sampai tanggal
			<input
				bind:value={toInput}
				type="date"
				class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
			/>
		</label>
		<button
			type="button"
			onclick={applyRange}
			class="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400"
		>
			Terapkan
		</button>
		<button
			type="button"
			onclick={resetRange}
			class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
		>
			Reset
		</button>
	</div>

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
	{:else if data}
		<section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
			<KpiCard
				label="Total Requests"
				value={formatNumber(data.totals.requests)}
				hint="Request OpenAI"
				icon={Activity}
				tone="indigo"
			/>
			<KpiCard
				label="Total Token"
				value={formatCompact(totalTokens)}
				hint={`Prompt ${formatCompact(data.totals.promptTokens)} · Completion ${formatCompact(data.totals.completionTokens)}`}
				icon={Cpu}
				tone="violet"
			/>
			<KpiCard
				label="Total Biaya"
				value={formatUsd(data.totals.estimatedCostUsd)}
				hint={`≈ ${formatRupiah(data.totals.estimatedCostUsd * idrPerUsd)}`}
				icon={CircleDollarSign}
				tone="rose"
			/>
			<KpiCard
				label="Biaya / Request"
				value={formatUsd(costPerRequest)}
				hint="Rata-rata per request"
				icon={Bot}
				tone="cyan"
			/>
		</section>

		{#if data.byFeature.length === 0}
			<div class="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center">
				<p class="text-sm text-slate-400">
					Belum ada data penggunaan token AI untuk periode ini.
				</p>
			</div>
		{:else}
			<section class="grid gap-3 md:grid-cols-3">
				{#each data.byFeature as feature, index (feature.featureName)}
					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
						<div class="flex items-center justify-between">
							<p class="text-sm font-semibold text-white">{featureLabel(feature.featureName)}</p>
							<span class="size-2.5 rounded-full" style:background={palette[index % palette.length]}></span>
						</div>
						<p class="mt-3 text-2xl font-bold text-white">{formatCompact(featureTokens(feature))}</p>
						<p class="text-[11px] text-slate-500">token</p>
						<div class="mt-3 flex items-center justify-between text-xs">
							<span class="text-slate-400">{formatNumber(feature.requests)} requests</span>
							<span class="font-semibold text-slate-200">{formatUsd(feature.estimatedCostUsd)}</span>
						</div>
						<p class="mt-1 text-[11px] text-slate-500">
							≈ {formatRupiah(feature.estimatedCostUsd * idrPerUsd)}
						</p>
					</div>
				{/each}
			</section>

			<section class="grid gap-4 lg:grid-cols-3">
				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
					<h2 class="text-sm font-semibold text-white">Proporsi Token</h2>
					<p class="mt-1 text-xs text-slate-500">Kontribusi tiap fitur terhadap total token.</p>
					<div class="mt-5 flex justify-center">
						<DonutChart
							segments={featureSegments}
							centerValue={formatCompact(totalTokens)}
							centerLabel="Total token"
						/>
					</div>
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-2">
					<h2 class="text-sm font-semibold text-white">Token per Fitur</h2>
					<p class="mt-1 text-xs text-slate-500">Perbandingan pemakaian token antar fitur.</p>
					<div class="mt-4">
						<BarChart
							labels={featureLabelsList}
							values={featureValues}
							color="#6366f1"
							valueFormatter={(value) => formatCompact(value)}
						/>
					</div>
				</div>
			</section>

			<section class="rounded-2xl border border-slate-800 bg-slate-900/60">
				<div class="border-b border-slate-800 px-5 py-4">
					<h2 class="text-sm font-semibold text-white">Breakdown per Fitur &amp; Model</h2>
					<p class="mt-1 text-xs text-slate-500">
						Detail penggunaan token dan estimasi biaya dari log OpenAI.
					</p>
				</div>
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-slate-800 text-sm">
						<thead class="bg-slate-900 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
							<tr>
								<th class="px-5 py-3">Fitur</th>
								<th class="px-5 py-3">Model</th>
								<th class="px-5 py-3">Requests</th>
								<th class="px-5 py-3">Prompt</th>
								<th class="px-5 py-3">Completion</th>
								<th class="px-5 py-3">Biaya</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-800/70">
							{#each data.items as item (item.featureName + ':' + item.modelName)}
								<tr class="hover:bg-slate-900">
									<td class="px-5 py-4 font-medium text-slate-200">{featureLabel(item.featureName)}</td>
									<td class="px-5 py-4 text-xs text-slate-400">{item.modelName}</td>
									<td class="px-5 py-4 text-slate-300">{formatNumber(item.requests)}</td>
									<td class="px-5 py-4 text-slate-300">{formatNumber(item.promptTokens)}</td>
									<td class="px-5 py-4 text-slate-300">{formatNumber(item.completionTokens)}</td>
									<td class="px-5 py-4 font-semibold text-slate-200">{formatUsd(item.estimatedCostUsd)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/if}
	{/if}
</div>
