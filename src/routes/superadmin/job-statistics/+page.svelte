<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Antenna,
		ArrowRight,
		BriefcaseBusiness,
		Mail,
		RefreshCw,
		TriangleAlert
	} from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import BarChart from '#lib/components/superadmin/BarChart.svelte';
	import DonutChart from '#lib/components/superadmin/DonutChart.svelte';
	import KpiCard from '#lib/components/superadmin/KpiCard.svelte';
	import { formatDate, formatNumber, formatPercent } from '#lib/components/superadmin/format.js';
	import {
		jobStatusLabel,
		sourceTypeLabel,
		sourceTypeTone
	} from '#lib/components/superadmin/status.js';
	import {
		getJobStatisticsApi,
		type JobStatisticsResponse,
		type JobStatisticsSource,
		type JobStatus
	} from '#lib/services/superadminApi.js';

	const statusOrder: JobStatus[] = [
		'RAW_PARSED',
		'PENDING_REVIEW',
		'APPROVED',
		'SAVED',
		'PUBLISHED',
		'ARCHIVED',
		'REJECTED'
	];
	const statusColors: Record<JobStatus, string> = {
		RAW_PARSED: '#64748b',
		PENDING_REVIEW: '#f59e0b',
		APPROVED: '#14b8a6',
		SAVED: '#1b4db1',
		PUBLISHED: '#10b981',
		ARCHIVED: '#0ea5e9',
		REJECTED: '#f43f5e'
	};
	const methodColors = {
		EMAIL: '#1b4db1',
		WEBSITE_PORTAL: '#4d7dd3',
		WHATSAPP: '#22d3ee',
		TELEGRAM: '#f59e0b'
	} as const;
	const recommendationTone: Record<string, string> = {
		rose: 'bg-rose-500/10 text-rose-300 ring-rose-500/20',
		amber: 'bg-amber-500/10 text-amber-300 ring-amber-500/20',
		emerald: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20'
	};

	function isoDate(date: Date): string {
		return date.toISOString().slice(0, 10);
	}

	function defaultRange(): { from: string; to: string } {
		const to = new Date();
		const from = new Date(to);
		from.setUTCDate(from.getUTCDate() - 29);
		return { from: isoDate(from), to: isoDate(to) };
	}

	const initialRange = defaultRange();

	let data = $state<JobStatisticsResponse | null>(null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	let fromInput = $state(initialRange.from);
	let toInput = $state(initialRange.to);
	let appliedFrom = $state(initialRange.from);
	let appliedTo = $state(initialRange.to);

	let activeFilter = $state<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
	let sortKey = $state<'total' | 'emailShare' | 'lastJobAt' | 'name'>('total');
	let sortDirection = $state<'asc' | 'desc'>('desc');

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			data = await getJobStatisticsApi({
				from: appliedFrom || undefined,
				to: appliedTo || undefined
			});
		} catch (error) {
			loadError =
				error instanceof Error ? error.message : 'Statistik loker belum dapat dimuat.';
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
		const range = defaultRange();
		fromInput = range.from;
		toInput = range.to;
		appliedFrom = range.from;
		appliedTo = range.to;
		void load();
	}

	function changeActiveFilter(value: string) {
		activeFilter = value as 'ALL' | 'ACTIVE' | 'INACTIVE';
	}

	function changeSortKey(value: string) {
		sortKey = value as 'total' | 'emailShare' | 'lastJobAt' | 'name';
	}

	function toggleSortDirection() {
		sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
	}

	function staleDays(value: string | null): number | null {
		if (!value) return null;
		const diff = Date.now() - new Date(value).getTime();
		return Number.isFinite(diff) ? Math.floor(diff / 86_400_000) : null;
	}

	function recommendation(source: JobStatisticsSource): { label: string; tone: string } {
		const total = source.jobs.total;
		const rejected = source.jobs.byStatus.REJECTED;
		const emailShare = source.jobs.applicationMethods.emailShare;
		const stale = staleDays(source.jobs.lastJobAt);
		if (total === 0) return { label: '0 job di rentang', tone: 'amber' };
		if (rejected / total >= 0.3) return { label: 'Rejection tinggi', tone: 'rose' };
		if (emailShare < 0.25) return { label: 'Email share rendah', tone: 'amber' };
		if (stale !== null && stale > 30) return { label: 'Lama tanpa job', tone: 'amber' };
		return { label: 'Sehat', tone: 'emerald' };
	}

	function statusShare(count: number, total: number): number {
		return total > 0 ? (count / total) * 100 : 0;
	}

	onMount(() => {
		void load();
	});

	const sources = $derived(data?.sources ?? []);
	const activeSources = $derived(sources.filter((source) => source.isActive).length);
	const emailShare = $derived(data?.jobs.applicationMethods.emailShare ?? 0);

	const filteredSources = $derived.by(() => {
		const list = sources.filter((source) => {
			if (activeFilter === 'ALL') return true;
			return activeFilter === 'ACTIVE' ? source.isActive : !source.isActive;
		});
		const direction = sortDirection === 'asc' ? 1 : -1;
		return [...list].sort((a, b) => {
			if (sortKey === 'name') return a.name.localeCompare(b.name) * direction;
			if (sortKey === 'emailShare') {
				return (
					(a.jobs.applicationMethods.emailShare -
						b.jobs.applicationMethods.emailShare) *
					direction
				);
			}
			if (sortKey === 'lastJobAt') {
				const aTime = a.jobs.lastJobAt ? new Date(a.jobs.lastJobAt).getTime() : 0;
				const bTime = b.jobs.lastJobAt ? new Date(b.jobs.lastJobAt).getTime() : 0;
				return (aTime - bTime) * direction;
			}
			return (a.jobs.total - b.jobs.total) * direction;
		});
	});

	const chartSources = $derived(
		[...sources].sort((a, b) => b.jobs.total - a.jobs.total).slice(0, 6)
	);
	const chartLabels = $derived(
		chartSources.map((source) =>
			source.name.length > 14 ? `${source.name.slice(0, 13)}…` : source.name
		)
	);
	const chartValues = $derived(chartSources.map((source) => source.jobs.total));

	const methodSegments = $derived(
		data
			? [
					{
						label: 'Email',
						value: data.jobs.applicationMethods.EMAIL,
						color: methodColors.EMAIL
					},
					{
						label: 'Website Portal',
						value: data.jobs.applicationMethods.WEBSITE_PORTAL,
						color: methodColors.WEBSITE_PORTAL
					},
					{
						label: 'WhatsApp',
						value: data.jobs.applicationMethods.WHATSAPP,
						color: methodColors.WHATSAPP
					},
					{
						label: 'Telegram',
						value: data.jobs.applicationMethods.TELEGRAM,
						color: methodColors.TELEGRAM
					}
				].filter((segment) => segment.value > 0)
			: []
	);
</script>

<svelte:head>
	<title>Job Statistics | Superadmin</title>
</svelte:head>

<div class="space-y-6">
	<header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
		<div>
			<p class="text-sm font-semibold text-amber-300">Job &amp; Ingestion</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight text-white">Job Statistics</h1>
			<p class="mt-2 text-sm text-slate-400">
				Statistik lowongan per grup Telegram, kualitas sumber, dan performa ingestion.
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<a
				href="/superadmin/sources"
				class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
			>
				Kelola sumber
			</a>
			<a
				href="/superadmin/jobs"
				class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
			>
				Lihat feed <ArrowRight size={15} />
			</a>
			<button
				type="button"
				onclick={() => void load()}
				disabled={isLoading}
				class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
			>
				<RefreshCw size={15} /> Refresh
			</button>
		</div>
	</header>

	<div
		class="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-end"
	>
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
			Reset (30 hari)
		</button>
		<p class="text-xs text-slate-500 sm:ml-auto">
			Rentang aktif: {appliedFrom || 'awal'} – {appliedTo || 'sekarang'}
		</p>
	</div>

	{#if isLoading}
		<div class="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
			<Spinner label="Memuat statistik" /> Memuat statistik loker...
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
		<section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			<KpiCard
				label="Total Jobs"
				value={formatNumber(data.jobs.total)}
				hint={`${sources.length} grup terdaftar`}
				icon={BriefcaseBusiness}
				tone="indigo"
			/>
			<KpiCard
				label="Grup Aktif"
				value={formatNumber(activeSources)}
				hint={`${sources.length - activeSources} nonaktif`}
				icon={Antenna}
				tone="emerald"
			/>
			<KpiCard
				label="Email Share"
				value={formatPercent(emailShare)}
				hint={`${formatNumber(data.jobs.applicationMethods.EMAIL)} job via email`}
				icon={Mail}
				tone="violet"
			/>
		</section>

		<section class="grid gap-4 lg:grid-cols-3">
			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-2">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h2 class="text-sm font-semibold text-white">Job per Grup</h2>
						<p class="mt-1 text-xs text-slate-500">
							Top 6 grup berdasarkan jumlah job pada rentang ini.
						</p>
					</div>
					<span class="rounded-full bg-indigo-500/10 px-2.5 py-1 text-[10px] font-semibold text-indigo-300 ring-1 ring-indigo-500/20">
						{sources.length} grup
					</span>
				</div>
				{#if chartSources.length > 0 && data.jobs.total > 0}
					<div class="mt-4">
						<BarChart
							labels={chartLabels}
							values={chartValues}
							color="#1b4db1"
							valueFormatter={(value) => formatNumber(value)}
						/>
					</div>
				{:else}
					<p class="mt-4 text-sm text-slate-500">Belum ada job pada rentang ini.</p>
				{/if}
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
				<h2 class="text-sm font-semibold text-white">Metode Lamaran</h2>
				<p class="mt-1 text-xs text-slate-500">
					Distribusi lowongan berdasarkan metode lamaran.
				</p>
				{#if methodSegments.length > 0}
					<div class="mt-5 flex justify-center">
						<DonutChart
							segments={methodSegments}
							centerValue={formatNumber(data.jobs.total)}
							centerLabel="Jobs"
						/>
					</div>
				{:else}
					<p class="mt-4 text-sm text-slate-500">Belum ada data metode lamaran.</p>
				{/if}
			</div>
		</section>

		<section class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
			<div
				class="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
			>
				<div>
					<h2 class="text-sm font-semibold text-white">Statistik per Grup</h2>
					<p class="mt-1 text-xs text-slate-500">
						Klik “Lihat job” untuk drill-down ke feed grup tersebut.
					</p>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<select
						value={activeFilter}
						onchange={(event) => changeActiveFilter(event.currentTarget.value)}
						class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
					>
						<option value="ALL">Semua grup</option>
						<option value="ACTIVE">Aktif</option>
						<option value="INACTIVE">Nonaktif</option>
					</select>
					<select
						value={sortKey}
						onchange={(event) => changeSortKey(event.currentTarget.value)}
						class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
					>
						<option value="total">Urut: Total job</option>
						<option value="emailShare">Urut: % Email</option>
						<option value="lastJobAt">Urut: Job terakhir</option>
						<option value="name">Urut: Nama</option>
					</select>
					<button
						type="button"
						onclick={toggleSortDirection}
						class="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
					>
						{sortDirection === 'asc' ? '↑ Asc' : '↓ Desc'}
					</button>
					<span class="text-xs text-slate-500">{filteredSources.length} grup</span>
				</div>
			</div>

			<div class="flex flex-wrap gap-3 border-b border-slate-800 px-5 py-3 text-[10px] text-slate-400">
				{#each statusOrder as status}
					<span class="inline-flex items-center gap-1.5">
						<span class="size-2 rounded-full" style:background={statusColors[status]}></span>
						{jobStatusLabel[status]}
						<span class="font-semibold text-slate-300">
							{formatNumber(data.jobs.byStatus[status])}
						</span>
					</span>
				{/each}
			</div>

			{#if filteredSources.length === 0}
				<div class="p-10 text-center">
					<p class="text-sm text-slate-500">Tidak ada grup yang cocok dengan filter.</p>
					<a
						href="/superadmin/sources"
						class="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 transition hover:text-indigo-200"
					>
						Tambah atau kelola grup <ArrowRight size={13} />
					</a>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="min-w-[1100px] divide-y divide-slate-800 text-sm">
						<thead class="bg-slate-900 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
							<tr>
								<th class="px-5 py-3">Grup</th>
								<th class="px-5 py-3">Status</th>
								<th class="px-5 py-3">Total Job</th>
								<th class="px-5 py-3">% Email</th>
								<th class="px-5 py-3">Audit</th>
								<th class="px-5 py-3">Rekomendasi</th>
								<th class="px-5 py-3">Job Terakhir</th>
								<th class="px-5 py-3">Scrape Terakhir</th>
								<th class="px-5 py-3">Listener</th>
								<th class="px-5 py-3 text-right">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-800/70">
							{#each filteredSources as source (source.sourceId)}
								{@const rec = recommendation(source)}
								<tr class="hover:bg-slate-900">
									<td class="px-5 py-4">
										<div class="min-w-0">
											<p class="font-semibold text-white">{source.name}</p>
											<p class="mt-0.5 text-[11px] text-slate-500">{source.url}</p>
											<span
												class="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset {sourceTypeTone[source.type]}"
											>
												{sourceTypeLabel[source.type]}
											</span>
										</div>
									</td>
									<td class="px-5 py-4">
										<span
											class="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset {source.isActive
												? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
												: 'bg-slate-800 text-slate-400 ring-slate-700'}"
										>
											{source.isActive ? 'Aktif' : 'Nonaktif'}
										</span>
									</td>
									<td class="px-5 py-4 text-slate-200">{formatNumber(source.jobs.total)}</td>
									<td class="px-5 py-4">
										<p class="font-medium text-slate-200">
											{formatPercent(source.jobs.applicationMethods.emailShare)}
										</p>
										<p class="text-[10px] text-slate-500">
											{formatNumber(source.jobs.applicationMethods.EMAIL)} email
										</p>
									</td>
									<td class="px-5 py-4">
										<div class="flex flex-wrap gap-2 text-[10px] font-medium">
											<a
												href={`/superadmin/jobs?sourceId=${source.sourceId}&sourceName=${encodeURIComponent(source.name)}&status=APPROVED`}
												class="text-teal-300 hover:underline"
												title="Lihat job Approved dari grup ini"
											>
												A {source.jobs.byStatus.APPROVED}
											</a>
											<a
												href={`/superadmin/jobs?sourceId=${source.sourceId}&sourceName=${encodeURIComponent(source.name)}&status=SAVED`}
												class="text-indigo-300 hover:underline"
												title="Lihat job Saved dari grup ini"
											>
												S {source.jobs.byStatus.SAVED}
											</a>
											<a
												href={`/superadmin/jobs?sourceId=${source.sourceId}&sourceName=${encodeURIComponent(source.name)}&status=REJECTED`}
												class="text-rose-300 hover:underline"
												title="Lihat job Rejected dari grup ini"
											>
												R {source.jobs.byStatus.REJECTED}
											</a>
										</div>
										<div class="mt-1.5 flex h-2 w-40 overflow-hidden rounded-full bg-slate-800">
											{#each statusOrder as status}
												{@const count = source.jobs.byStatus[status]}
												{#if count > 0}
													<span
														class="h-full"
														style:width={`${statusShare(count, source.jobs.total)}%`}
														style:background={statusColors[status]}
														title={`${jobStatusLabel[status]}: ${count}`}
													></span>
												{/if}
											{/each}
										</div>
									</td>
									<td class="px-5 py-4">
										<span
											class="rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset {recommendationTone[
												rec.tone
											]}"
										>
											{rec.label}
										</span>
									</td>
									<td class="px-5 py-4 text-xs text-slate-400">
										{formatDate(source.jobs.lastJobAt)}
									</td>
									<td class="px-5 py-4 text-xs text-slate-400">
										{formatDate(source.lastScrapedAt)}
									</td>
									<td class="px-5 py-4">
										<p
											class="max-w-[160px] truncate text-xs text-slate-400"
											title={source.statusMessage ?? ''}
										>
											{source.statusMessage ?? '—'}
										</p>
									</td>
									<td class="px-5 py-4">
										<div class="flex flex-col items-end gap-1.5">
											<a
												href={`/superadmin/jobs?sourceId=${source.sourceId}&sourceName=${encodeURIComponent(source.name)}`}
												class="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-200"
											>
												Lihat job
											</a>
											<a
												href="/superadmin/sources"
												class="text-[11px] text-slate-500 transition hover:text-slate-300"
											>
												Kelola grup
											</a>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<div class="space-y-1 border-t border-slate-800 px-5 py-3 text-[11px] text-slate-500">
				<p>
					Tanpa sumber:
					<span class="font-semibold text-slate-300">
						{formatNumber(data.unattributedJobs.total)}
					</span>
					job (data lama, tidak dihitung sebagai grup).
				</p>
				<p>
					Rekomendasi bersifat indikatif. Tidak ada penghapusan otomatis; nonaktifkan atau hapus
					grup secara manual di halaman Ingestion Sources.
				</p>
			</div>
		</section>

		{#if data.unattributedJobs.total > 0}
			{@const methods = data.unattributedJobs.applicationMethods}
			<section class="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
				<div class="flex items-start gap-3">
					<span
						class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300 ring-1 ring-inset ring-amber-500/30"
					>
						<TriangleAlert size={18} />
					</span>
					<div>
						<h2 class="text-sm font-semibold text-white">Lowongan Tanpa Sumber (Data Lama)</h2>
						<p class="mt-1 text-xs text-slate-400">
							{formatNumber(data.unattributedJobs.total)} job belum terhubung ke grup. Angka ini
							ditampilkan terpisah dan tidak dihitung sebagai grup.
						</p>
					</div>
				</div>
				<div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
						<p class="text-[10px] uppercase tracking-wide text-slate-500">Total job</p>
						<p class="mt-1 text-lg font-bold text-white">
							{formatNumber(data.unattributedJobs.total)}
						</p>
					</div>
					<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
						<p class="text-[10px] uppercase tracking-wide text-slate-500">% Email</p>
						<p class="mt-1 text-lg font-bold text-white">
							{formatPercent(data.unattributedJobs.applicationMethods.emailShare)}
						</p>
					</div>
					<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
						<p class="text-[10px] uppercase tracking-wide text-slate-500">
							Approved / Saved / Rejected
						</p>
						<p class="mt-1 text-sm font-semibold text-white">
							{data.unattributedJobs.byStatus.APPROVED} / {data.unattributedJobs.byStatus.SAVED}
							/ {data.unattributedJobs.byStatus.REJECTED}
						</p>
					</div>
					<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
						<p class="text-[10px] uppercase tracking-wide text-slate-500">Metode lamaran</p>
						<p class="mt-1 text-[11px] leading-5 text-slate-300">
							Email {methods.EMAIL} · Portal {methods.WEBSITE_PORTAL} · WA {methods.WHATSAPP} · TG
							{methods.TELEGRAM}
						</p>
					</div>
				</div>
				<p class="mt-3 text-[11px] text-slate-500">
					Jumlah ini akan turun seiring job baru otomatis memiliki sourceId.
				</p>
			</section>
		{/if}

	{/if}
</div>
