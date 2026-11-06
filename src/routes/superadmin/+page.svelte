<script lang="ts">
	import { onMount } from 'svelte';
	import {
		ArrowRight,
		Bot,
		BriefcaseBusiness,
		ChevronDown,
		CircleDollarSign,
		RefreshCw,
		TrendingUp,
		Users
	} from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import KpiCard from '#lib/components/superadmin/KpiCard.svelte';
	import TelegramScraperControl from '#lib/components/superadmin/TelegramScraperControl.svelte';
	import {
		formatDate,
		formatNumber,
		formatRupiah,
		formatUsd
	} from '#lib/components/superadmin/format.js';
	import {
		jobStatusLabel,
		jobStatusTone,
		tierLabel,
		tierTone
	} from '#lib/components/superadmin/status.js';
	import {
		getAiCostsApi,
		getOverviewApi,
		listJobsApi,
		listPackagesApi,
		listSourcesApi,
		type AiCostsResponse,
		type IngestionSource,
		type OverviewResponse,
		type ScrapedJob,
		type SubscriptionPackage
	} from '#lib/services/superadminApi.js';

	let overview = $state<OverviewResponse | null>(null);
	let jobs = $state<ScrapedJob[]>([]);
	let packages = $state<SubscriptionPackage[]>([]);
	let aiCosts = $state<AiCostsResponse | null>(null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let telegramSources = $state<IngestionSource[]>([]);

	async function loadTelegramSources() {
		try {
			telegramSources = await listSourcesApi();
		} catch {
			// Keep the previous source list and let the scraper control show its
			// own status/error state.
		}
	}

	async function refreshLatestJobs() {
		try {
			const jobList = await listJobsApi({ limit: 5 });
			jobs = jobList.items ?? [];
		} catch {
			// Best-effort dashboard refresh.
		}
	}

	function refreshAfterTelegramChange() {
		void loadTelegramSources();
		void refreshLatestJobs();
	}

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			const [overviewData, jobList, packageList, aiCostData] = await Promise.all([
				getOverviewApi(),
				listJobsApi({ limit: 5 }),
				listPackagesApi(),
				getAiCostsApi().catch(() => null)
			]);
			overview = overviewData;
			jobs = jobList.items ?? [];
			packages = packageList;
			aiCosts = aiCostData;
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Data cockpit belum dapat dimuat.';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		void load();
		void loadTelegramSources();
	});

	const publishedJobs = $derived(overview?.jobs.byStatus?.PUBLISHED ?? 0);
	const aiSuccessRate = $derived(
		aiCosts && aiCosts.totals.requests > 0
			? ((aiCosts.byOutcome?.find((item) => item.outcome === 'SUCCESS')?.requests ?? 0) /
					aiCosts.totals.requests) *
					100
			: null
	);
	const costShare = $derived(
		overview && overview.revenue.totalIdr > 0
			? (overview.ai.totalCostIdr / overview.revenue.totalIdr) * 100
			: 0
	);
	const jobStatusEntries = $derived(
		overview ? Object.entries(overview.jobs.byStatus) : []
	);
	const maxJobStatus = $derived(
		jobStatusEntries.reduce((max, [, value]) => (value > max ? value : max), 1)
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
		<button
			type="button"
			onclick={() => void load()}
			disabled={isLoading}
			class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
		>
			<RefreshCw size={15} /> Refresh
		</button>
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
				value={formatRupiah(overview.revenue.totalIdr)}
				hint="Dari langganan aktif"
				icon={CircleDollarSign}
				tone="emerald"
			/>
			<KpiCard
				label="Active Subscribers"
				value={formatNumber(overview.revenue.activeSubscribers)}
				hint="Langganan aktif"
				icon={Users}
				tone="indigo"
			/>
			<KpiCard
				label="OpenAI Token Cost"
				value={formatUsd(overview.ai.totalCostUsd)}
				hint={aiSuccessRate !== null
					? `≈ ${formatRupiah(overview.ai.totalCostIdr)} · ${aiSuccessRate.toFixed(1)}% sukses`
					: `≈ ${formatRupiah(overview.ai.totalCostIdr)}`}
				icon={Bot}
				tone="violet"
			/>
			<KpiCard
				label="Net Margin"
				value={overview.ai.marginPercentage !== null ? `${overview.ai.marginPercentage}%` : '—'}
				hint="Setelah biaya AI"
				icon={TrendingUp}
				tone="cyan"
			/>
			<KpiCard
				label="Total Published Jobs"
				value={formatNumber(publishedJobs)}
				hint={`${formatNumber(overview.jobs.total)} total lowongan`}
				icon={BriefcaseBusiness}
				tone="amber"
			/>
		</section>

		<section aria-labelledby="dashboard-telegram-scraping-title">
			<details class="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
				<summary
					class="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden"
				>
					<span class="flex min-w-0 items-center gap-3">
						<span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
							<Bot size={17} />
						</span>
						<span class="min-w-0">
							<span id="dashboard-telegram-scraping-title" class="block text-sm font-semibold text-white">
								Telegram Scraping
							</span>
							<span class="mt-0.5 block text-[11px] text-slate-400">
								Mode CURSOR/TODAY, pilih source, atur batas pesan, dan pantau progress scraping massal.
							</span>
						</span>
					</span>
					<ChevronDown
						size={18}
						class="shrink-0 text-slate-400 transition group-open:rotate-180"
					/>
				</summary>
				<div class="border-t border-slate-800">
					<TelegramScraperControl
						sources={telegramSources}
						onchanged={refreshAfterTelegramChange}
					/>
				</div>
			</details>
		</section>

		<section class="grid gap-4 lg:grid-cols-3">
			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-2">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h2 class="text-sm font-semibold text-white">Revenue vs OpenAI Infrastructure Cost</h2>
						<p class="mt-1 text-xs text-slate-500">Perbandingan pendapatan langganan aktif dan biaya AI.</p>
					</div>
					<span class="rounded-full bg-indigo-500/10 px-2.5 py-1 text-[10px] font-semibold text-indigo-300 ring-1 ring-indigo-500/20">
						OpenAI
					</span>
				</div>

				<div class="mt-5 space-y-4">
					<div>
						<div class="flex items-center justify-between text-xs">
							<span class="text-slate-400">Revenue</span>
							<span class="font-semibold text-white">{formatRupiah(overview.revenue.totalIdr)}</span>
						</div>
						<div class="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-800">
							<div class="h-full rounded-full bg-indigo-500" style:width="100%"></div>
						</div>
					</div>
					<div>
						<div class="flex items-center justify-between text-xs">
							<span class="text-slate-400">OpenAI Cost</span>
							<span class="font-semibold text-white">{formatRupiah(overview.ai.totalCostIdr)}</span>
						</div>
						<div class="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-800">
							<div class="h-full rounded-full bg-rose-500" style:width="{Math.max(costShare, 1)}%"></div>
						</div>
						<p class="mt-1 text-[11px] text-slate-500">
							{costShare.toFixed(2)}% dari revenue
						</p>
					</div>
				</div>

				<dl class="mt-5 grid gap-3 sm:grid-cols-3">
					<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
						<dt class="text-[11px] text-slate-500">Margin (IDR)</dt>
						<dd class="mt-1 text-sm font-bold text-white">{formatRupiah(overview.ai.marginIdr)}</dd>
					</div>
					<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
						<dt class="text-[11px] text-slate-500">Revenue / pelanggan</dt>
						<dd class="mt-1 text-sm font-bold text-white">
							{formatRupiah(overview.revenue.averageRevenuePerSubscriberIdr)}
						</dd>
					</div>
					<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
						<dt class="text-[11px] text-slate-500">AI requests</dt>
						<dd class="mt-1 text-sm font-bold text-white">{formatNumber(overview.ai.totalRequests)}</dd>
					</div>
				</dl>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
				<h2 class="text-sm font-semibold text-white">Jobs by Status</h2>
				<p class="mt-1 text-xs text-slate-500">Distribusi lowongan pada pipeline ingestion.</p>
				{#if jobStatusEntries.length === 0}
					<p class="mt-4 text-sm text-slate-500">Belum ada data lowongan.</p>
				{:else}
					<ul class="mt-4 space-y-3">
						{#each jobStatusEntries as [status, count] (status)}
							<li>
								<div class="flex items-center justify-between text-xs">
									<span class="text-slate-400">{jobStatusLabel[status as keyof typeof jobStatusLabel] ?? status}</span>
									<span class="font-semibold text-white">{formatNumber(count)}</span>
								</div>
								<div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
									<div
										class="h-full rounded-full bg-indigo-500"
										style:width="{(count / maxJobStatus) * 100}%"
									></div>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
				<a
					href="/superadmin/jobs"
					class="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 transition hover:text-indigo-200"
				>
					Kelola lowongan <ArrowRight size={14} />
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
				{#if jobs.length === 0}
					<p class="mt-4 text-sm text-slate-500">Belum ada lowongan yang di-ingest.</p>
				{:else}
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
												{job.jobTitle}
											</a>
											<p class="text-[11px] text-slate-500">{job.companyName}</p>
										</td>
										<td class="py-3 pr-4 text-xs text-slate-400">{job.sourceDetail}</td>
										<td class="py-3 pr-4">
											<span class="rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset {jobStatusTone[job.status]}">
												{jobStatusLabel[job.status]}
											</span>
										</td>
										<td class="py-3 text-xs text-slate-500">{formatDate(job.scrapedAt)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
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
				{#if packages.length === 0}
					<p class="mt-4 text-sm text-slate-500">Belum ada paket langganan.</p>
				{:else}
					<ul class="mt-4 space-y-2.5">
						{#each packages as pkg (pkg.id)}
							<li class="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5">
								<div class="min-w-0">
									<p class="truncate text-sm font-medium text-slate-200">{pkg.name}</p>
									<p class="mt-0.5 text-[11px] text-slate-500">
										{formatRupiah(pkg.price)} · {pkg.durationDays} hari · {formatNumber(pkg.subscriberCount)} subscriber
									</p>
								</div>
								<span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset {tierTone[pkg.tier]}">
									{tierLabel[pkg.tier]}
								</span>
							</li>
						{/each}
					</ul>
				{/if}
				<p class="mt-3 text-[11px] text-slate-500">{activePackages.length} paket aktif</p>
			</div>
		</section>
	{/if}
</div>
