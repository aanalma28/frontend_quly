<script lang="ts">
	import { onMount } from 'svelte';
	import {
		ArrowRight,
		Bot,
		BriefcaseBusiness,
		CircleDollarSign,
		RefreshCw,
		TrendingUp,
		Users
	} from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import KpiCard from '#lib/components/superadmin/KpiCard.svelte';
	import LineChart from '#lib/components/superadmin/LineChart.svelte';
	import {
		formatCompact,
		formatDate,
		formatNumber,
		formatRupiah,
		formatUsd
	} from '#lib/components/superadmin/format.js';
	import { jobStatusLabel, jobStatusTone, tierLabel, tierTone } from '#lib/components/superadmin/status.js';
	import {
		getOverview,
		listJobs,
		listPackages,
		type ExecutiveOverview,
		type IngestedJob,
		type RevenueCostPoint,
		type SubscriptionPackage
	} from '#lib/services/superadminApi.js';

	let overview = $state<ExecutiveOverview | null>(null);
	let series = $state<RevenueCostPoint[]>([]);
	let jobs = $state<IngestedJob[]>([]);
	let packages = $state<SubscriptionPackage[]>([]);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			const [overviewData, jobList, packageList] = await Promise.all([
				getOverview(),
				listJobs(),
				listPackages()
			]);
			overview = overviewData.overview;
			series = overviewData.series;
			jobs = jobList.slice(0, 5);
			packages = packageList;
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Data cockpit belum dapat dimuat.';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		void load();
	});

	const chartLabels = $derived(series.map((point) => point.month));
	const chartSeries = $derived([
		{ name: 'Revenue', color: '#6366f1', values: series.map((point) => point.revenue) },
		{ name: 'OpenAI Cost', color: '#f43f5e', values: series.map((point) => point.cost) }
	]);

	const revenuePerSubscriber = $derived(
		overview && overview.activeSubscribers > 0
			? overview.grossRevenue / overview.activeSubscribers
			: 0
	);
	const aiCostShare = $derived(
		overview && overview.grossRevenue > 0
			? (overview.openaiCostIdr / overview.grossRevenue) * 100
			: 0
	);
	const activePackages = $derived(packages.filter((item) => item.isActive));
</script>

<svelte:head>
	<title>Executive Overview | Superadmin</title>
</svelte:head>

<div class="space-y-6">
	<header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
		<div>
			<p class="text-sm font-semibold text-amber-300">Superadmin</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight text-white">Executive Overview</h1>
			<p class="mt-2 text-sm text-slate-400">
				Ringkasan revenue, pelanggan aktif, biaya OpenAI, dan kesehatan operasional.
			</p>
		</div>
		<span class="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300">
			Periode: 6 bulan terakhir
		</span>
	</header>

	{#if isLoading}
		<div class="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
			<Spinner label="Memuat cockpit" /> Memuat data cockpit...
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
	{:else if overview}
		<section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
			<KpiCard
				label="Total Gross Revenue"
				value={formatRupiah(overview.grossRevenue)}
				hint="Bulan ini"
				icon={CircleDollarSign}
				tone="emerald"
			/>
			<KpiCard
				label="Active Subscribers"
				value={formatNumber(overview.activeSubscribers)}
				hint="Langganan aktif"
				icon={Users}
				tone="indigo"
			/>
			<KpiCard
				label="OpenAI Token Cost"
				value={formatUsd(overview.openaiCostUsd)}
				hint={`≈ ${formatRupiah(overview.openaiCostIdr)}`}
				icon={Bot}
				tone="violet"
			/>
			<KpiCard
				label="Net Margin"
				value={`${overview.netMarginPct}%`}
				hint="Setelah biaya AI"
				icon={TrendingUp}
				tone="cyan"
			/>
			<KpiCard
				label="Total Published Jobs"
				value={formatNumber(overview.publishedJobs)}
				hint="Lowongan tayang"
				icon={BriefcaseBusiness}
				tone="amber"
			/>
		</section>

		<section class="grid gap-4 lg:grid-cols-3">
			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-2">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h2 class="text-sm font-semibold text-white">Revenue vs OpenAI Infrastructure Cost</h2>
						<p class="mt-1 text-xs text-slate-500">Perbandingan pendapatan dan biaya AI per bulan.</p>
					</div>
					<span class="rounded-full bg-indigo-500/10 px-2.5 py-1 text-[10px] font-semibold text-indigo-300 ring-1 ring-indigo-500/20">
						ChatGPT / GPT-4o
					</span>
				</div>
				<div class="mt-4">
					<LineChart labels={chartLabels} series={chartSeries} valueFormatter={(value) => formatCompact(value)} />
				</div>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
				<h2 class="text-sm font-semibold text-white">Unit Economics</h2>
				<p class="mt-1 text-xs text-slate-500">Efisiensi per pelanggan & biaya AI.</p>
				<dl class="mt-4 space-y-3">
					<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
						<dt class="text-[11px] text-slate-500">Revenue / pelanggan aktif</dt>
						<dd class="mt-1 text-lg font-bold text-white">{formatRupiah(revenuePerSubscriber)}</dd>
					</div>
					<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
						<dt class="text-[11px] text-slate-500">Porsi biaya AI dari revenue</dt>
						<dd class="mt-1 text-lg font-bold text-white">{aiCostShare.toFixed(2)}%</dd>
					</div>
					<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
						<dt class="text-[11px] text-slate-500">Paket aktif</dt>
						<dd class="mt-1 text-lg font-bold text-white">{activePackages.length} paket</dd>
					</div>
				</dl>
				<a
					href="/superadmin/ai-analytics"
					class="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 transition hover:text-indigo-200"
				>
					Lihat analitik biaya <ArrowRight size={14} />
				</a>
			</div>
		</section>

		<section class="grid gap-4 lg:grid-cols-3">
			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-2">
				<div class="flex items-center justify-between">
					<h2 class="text-sm font-semibold text-white">Latest Ingestion</h2>
					<a
						href="/superadmin/jobs"
						class="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 transition hover:text-indigo-200"
					>
						Semua lowongan <ArrowRight size={14} />
					</a>
				</div>
				<div class="mt-4 overflow-x-auto">
					<table class="min-w-full text-sm">
						<thead class="text-left text-[11px] uppercase tracking-wide text-slate-500">
							<tr>
								<th class="pb-2 pr-4 font-semibold">Lowongan</th>
								<th class="pb-2 pr-4 font-semibold">Sumber</th>
								<th class="pb-2 pr-4 font-semibold">Status</th>
								<th class="pb-2 font-semibold">Masuk</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-800/70">
							{#each jobs as job (job.id)}
								<tr>
									<td class="py-3 pr-4">
										<a href={`/superadmin/jobs/${job.id}`} class="font-medium text-slate-200 hover:text-white">
											{job.parsed.title}
										</a>
										<p class="text-[11px] text-slate-500">{job.parsed.company}</p>
									</td>
									<td class="py-3 pr-4 text-xs text-slate-400">{job.source}</td>
									<td class="py-3 pr-4">
										<span class="rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset {jobStatusTone[job.status]}">
											{jobStatusLabel[job.status]}
										</span>
									</td>
									<td class="py-3 text-xs text-slate-500">{formatDate(job.ingestedAt)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
				<div class="flex items-center justify-between">
					<h2 class="text-sm font-semibold text-white">Subscription Packages</h2>
					<a
						href="/superadmin/packages"
						class="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 transition hover:text-indigo-200"
					>
						Kelola <ArrowRight size={14} />
					</a>
				</div>
				<ul class="mt-4 space-y-2.5">
					{#each packages as pkg (pkg.id)}
						<li class="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5">
							<div class="min-w-0">
								<p class="truncate text-sm font-medium text-slate-200">{pkg.name}</p>
								<p class="mt-0.5 text-[11px] text-slate-500">
									{formatRupiah(pkg.price)} · {pkg.durationDays} hari
								</p>
							</div>
							<span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset {tierTone[pkg.tier]}">
								{tierLabel[pkg.tier]}
							</span>
						</li>
					{/each}
				</ul>
			</div>
		</section>
	{/if}
</div>
