<script lang="ts">
	import { onMount } from 'svelte';
	import { Activity, ArrowLeft, ArrowRight, RefreshCw, Search } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/onboarding/Alert.svelte';
	import { categoryLabel, categoryTone, formatDate, statusLabel } from '#lib/components/psychotest/labels.js';
	import {
		listAdminAttemptsApi,
		type AdminAttemptItem,
		type AdminAttemptsResponse,
		type SessionStatus
	} from '#lib/services/adminPsychotestApi.js';

	let data = $state<AdminAttemptsResponse | null>(null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	let page = $state(1);
	let statusFilter = $state<'' | SessionStatus>('');
	let searchInput = $state('');
	let appliedSearch = $state('');

	function scoreSummary(attempt: AdminAttemptItem): string {
		const result = attempt.scoreResult;
		if (!result) return '—';
		if (typeof result.accuracy === 'number') return `Akurasi ${result.accuracy}%`;
		if (typeof result.personalityType === 'string' && result.personalityType.trim()) {
			return result.personalityType;
		}
		if (typeof result.summary === 'string' && result.summary.trim()) {
			const text = result.summary.trim();
			return text.length > 64 ? `${text.slice(0, 64)}…` : text;
		}
		return '—';
	}

	function shortId(value: string): string {
		return value.length > 8 ? value.slice(0, 8) : value;
	}

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			data = await listAdminAttemptsApi({
				page,
				limit: 20,
				status: statusFilter || undefined,
				search: appliedSearch || undefined
			});
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Data monitoring belum dapat dimuat.';
		} finally {
			isLoading = false;
		}
	}

	function applySearch() {
		appliedSearch = searchInput.trim();
		page = 1;
		void load();
	}

	function changeStatus(value: string) {
		statusFilter = value as '' | SessionStatus;
		page = 1;
		void load();
	}

	function goToPage(next: number) {
		if (!data) return;
		if (next < 1 || next > data.meta.totalPages) return;
		page = next;
		void load();
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>Monitoring Kandidat | Admin Psikotes</title>
</svelte:head>

<div class="space-y-6">
	<header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
		<div>
			<p class="text-sm font-semibold text-indigo-600">Admin Psikotes</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight text-slate-950">
				Monitoring Attempt Kandidat
			</h1>
			<p class="mt-2 text-sm text-slate-600">
				Rekap pengerjaan asesmen psikotes oleh kandidat.
			</p>
		</div>
		{#if data}
			<span class="text-sm font-semibold text-slate-600">{data.meta.total} attempt</span>
		{/if}
	</header>

	<div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
		<div class="relative flex-1">
			<Search size={16} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
			<input
				bind:value={searchInput}
				onkeydown={(event) => {
					if (event.key === 'Enter') applySearch();
				}}
				placeholder="Cari nama atau email kandidat..."
				maxlength="160"
				class="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
			/>
		</div>
		<select
			value={statusFilter}
			onchange={(event) => changeStatus(event.currentTarget.value)}
			class="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
		>
			<option value="">Semua status</option>
			<option value="COMPLETED">Selesai</option>
			<option value="IN_PROGRESS">Sedang dikerjakan</option>
		</select>
		<button
			type="button"
			onclick={applySearch}
			class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
		>
			<Search size={15} /> Cari
		</button>
	</div>

	{#if isLoading}
		<div class="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
			<Spinner label="Memuat attempt" /> Memuat attempt kandidat...
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
	{:else if data && data.items.length === 0}
		<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
			<span class="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
				<Activity size={24} />
			</span>
			<h2 class="mt-4 text-lg font-semibold text-slate-900">Belum ada attempt</h2>
			<p class="mt-1 text-sm text-slate-500">
				Belum ada kandidat yang mengerjakan psikotes untuk filter ini.
			</p>
		</div>
	{:else if data}
		<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-slate-200 text-sm">
					<thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
						<tr>
							<th class="px-5 py-3">Kandidat</th>
							<th class="px-5 py-3">Paket</th>
							<th class="px-5 py-3">Status</th>
							<th class="px-5 py-3">Skor / Analisis</th>
							<th class="px-5 py-3">Waktu</th>
							<th class="px-5 py-3">Sesi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#each data.items as attempt (attempt.attemptId)}
							<tr class="hover:bg-slate-50/60">
								<td class="px-5 py-4">
									<p class="font-semibold text-slate-900">
										{attempt.candidate.fullName ?? attempt.candidate.email}
									</p>
									<p class="text-xs text-slate-500">{attempt.candidate.email}</p>
									<p class="mt-0.5 text-[11px] text-slate-400">ID: {shortId(attempt.candidate.id)}</p>
								</td>
								<td class="px-5 py-4">
									<p class="font-medium text-slate-800">{attempt.package.title}</p>
									<span class="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold {categoryTone[attempt.package.category]}">
										{categoryLabel[attempt.package.category]}
									</span>
								</td>
								<td class="px-5 py-4">
									<span
										class="rounded-full px-2.5 py-1 text-[11px] font-semibold {attempt.status === 'COMPLETED'
											? 'bg-emerald-50 text-emerald-700'
											: 'bg-amber-50 text-amber-700'}"
									>
										{statusLabel[attempt.status]}
									</span>
								</td>
								<td class="px-5 py-4 text-slate-700">{scoreSummary(attempt)}</td>
								<td class="px-5 py-4">
									<p class="text-xs text-slate-600">Mulai {formatDate(attempt.startedAt)}</p>
									<p class="text-[11px] text-slate-400">
										{attempt.completedAt ? `Selesai ${formatDate(attempt.completedAt)}` : '—'}
									</p>
								</td>
								<td class="px-5 py-4">
									<p class="text-xs text-slate-600">Sesi {shortId(attempt.sessionId)}</p>
									<p class="text-[11px] text-slate-400">{attempt.session.status}</p>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
				<p class="text-xs text-slate-500">
					Halaman {data.meta.page} dari {data.meta.totalPages} · {data.meta.total} attempt
				</p>
				<div class="flex gap-2">
					<button
						type="button"
						onclick={() => goToPage(page - 1)}
						disabled={data.meta.page <= 1}
						class="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
					>
						<ArrowLeft size={14} /> Sebelumnya
					</button>
					<button
						type="button"
						onclick={() => goToPage(page + 1)}
						disabled={data.meta.page >= data.meta.totalPages}
						class="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
					>
						Selanjutnya <ArrowRight size={14} />
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
