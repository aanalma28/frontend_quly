<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { ArrowRight, CheckCircle2, Clock, Play, RefreshCw } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/onboarding/Alert.svelte';
	import SessionResults from '#lib/components/psychotest/SessionResults.svelte';
	import PackageExam from '#lib/components/psychotest/PackageExam.svelte';
	import { categoryLabel, categoryTone } from '#lib/components/psychotest/labels.js';
	import { setPsychotestCompleted } from '#lib/stores/psychotestStore.js';
	import {
		getSessionApi,
		type PackageScoreResult,
		type SessionAttempt,
		type SessionDetail,
		type SubmitAttemptResponse
	} from '#lib/services/psychotestApi.js';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const sessionId = $derived(params.sessionId);

	let session = $state<SessionDetail | null>(null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	let phase = $state<'intro' | 'exam' | 'packageResult'>('intro');
	let currentPackage = $state<SessionAttempt | null>(null);
	let packageResult = $state<PackageScoreResult | null>(null);
	let nextPackageId = $state<string | null>(null);
	let allCompleted = $state(false);
	let completedPackages = $state(0);
	let totalPackages = $state(0);

	async function loadSession() {
		isLoading = true;
		loadError = null;
		try {
			const detail = await getSessionApi(sessionId);
			session = detail;
			totalPackages = detail.attempts.length;
			completedPackages = detail.attempts.filter((attempt) => attempt.status === 'COMPLETED').length;

			if (detail.status === 'COMPLETED') {
				setPsychotestCompleted(true);
				nextPackageId = null;
				allCompleted = true;
				return;
			}

			const next = detail.attempts.find((attempt) => attempt.status === 'IN_PROGRESS') ?? null;
			currentPackage = next;
			packageResult = null;
			nextPackageId = null;
			allCompleted = false;
			phase = 'intro';
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Sesi belum dapat dimuat.';
		} finally {
			isLoading = false;
		}
	}

	function startPackage() {
		if (!currentPackage) return;
		phase = 'exam';
	}

	function handleSubmitted(result: SubmitAttemptResponse) {
		packageResult = result.scoreResult;
		completedPackages = result.completedPackages;
		totalPackages = result.totalPackages;
		nextPackageId = result.nextPackageId;
		allCompleted = result.allPackagesCompleted;

		if (session) {
			session = {
				...session,
				status: result.sessionStatus,
				attempts: session.attempts.map((attempt) =>
					attempt.packageId === result.packageId
						? { ...attempt, status: 'COMPLETED', scoreResult: result.scoreResult }
						: attempt
				)
			};
		}

		if (result.sessionStatus === 'COMPLETED') {
			setPsychotestCompleted(true);
		}

		phase = 'packageResult';
	}

	async function continueToNext() {
		if (allCompleted) {
			await loadSession();
			return;
		}
		const targetId = nextPackageId;
		if (!targetId || !session) return;
		const target = session.attempts.find((attempt) => attempt.packageId === targetId) ?? null;
		if (!target) return;
		currentPackage = target;
		packageResult = null;
		nextPackageId = null;
		phase = 'intro';
	}

	onMount(() => {
		void loadSession();
	});
</script>

<svelte:head>
	<title>Pengerjaan Psikotes | Quly</title>
</svelte:head>

{#if isLoading}
	<div class="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
		<Spinner label="Memuat sesi" /> Memuat sesi...
	</div>
{:else if loadError}
	<div class="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
		<p class="text-sm text-rose-700" role="alert">{loadError}</p>
		<div class="mt-4 flex flex-wrap justify-center gap-2">
			<button
				type="button"
				onclick={() => void loadSession()}
				class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
			>
				<RefreshCw size={15} /> Coba lagi
			</button>
			<a
				href="/dashboard/psychotest"
				class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
			>
				Kembali
			</a>
		</div>
	</div>
{:else if session && session.status === 'COMPLETED'}
	<SessionResults session={session} />
{:else if session}
	<div class="mx-auto max-w-3xl space-y-6">
		<header class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p class="text-sm font-semibold text-indigo-600">Sesi psikotes</p>
				<h1 class="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
					Pengerjaan paket tes
				</h1>
			</div>
			<span class="text-sm font-semibold text-slate-600">
				{completedPackages}/{totalPackages} paket selesai
			</span>
		</header>

		<div class="h-2 overflow-hidden rounded-full bg-slate-100">
			<div
				class="h-full rounded-full bg-indigo-500 transition-all"
				style:width="{(totalPackages ? (completedPackages / totalPackages) * 100 : 0)}%"
			></div>
		</div>

		<section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
			<p class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Status paket</p>
			<ul class="space-y-2">
				{#each session.attempts as attempt (attempt.attemptId)}
					<li class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2.5">
						<div class="flex items-center gap-2">
							<span class="rounded-full px-2 py-0.5 text-[10px] font-semibold {categoryTone[attempt.category]}">
								{categoryLabel[attempt.category]}
							</span>
							<span class="text-sm font-medium text-slate-800">{attempt.title}</span>
						</div>
						{#if attempt.status === 'COMPLETED'}
							<span class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
								<CheckCircle2 size={13} /> Selesai
							</span>
						{:else if currentPackage?.packageId === attempt.packageId && phase !== 'intro'}
							<span class="text-xs font-semibold text-indigo-600">Sedang dikerjakan</span>
						{:else}
							<span class="text-xs text-slate-400">Belum</span>
						{/if}
					</li>
				{/each}
			</ul>
		</section>

		{#if phase === 'exam' && currentPackage}
			<PackageExam
				sessionId={session.sessionId}
				packageInfo={currentPackage}
				onsubmitted={handleSubmitted}
			/>
		{:else if phase === 'packageResult' && packageResult}
			<section class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
				<div class="flex items-center gap-2 text-emerald-700">
					<CheckCircle2 size={20} />
					<h2 class="text-base font-semibold">Paket selesai dikumpulkan</h2>
				</div>
				<div class="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
					Progres: <span class="font-semibold text-slate-900">{completedPackages}/{totalPackages}</span> paket
					selesai.
				</div>
				<button
					type="button"
					onclick={() => void continueToNext()}
					class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700"
				>
					{#if allCompleted}
						Lihat hasil <ArrowRight size={16} />
					{:else}
						Lanjut ke Paket Berikutnya <ArrowRight size={16} />
					{/if}
				</button>
			</section>
		{:else if currentPackage}
			<section class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<span class="rounded-full px-2.5 py-1 text-[11px] font-semibold {categoryTone[currentPackage.category]}">
						{categoryLabel[currentPackage.category]}
					</span>
					<span class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
						<Clock size={14} /> {currentPackage.durationMin} menit
					</span>
				</div>
				<h2 class="text-lg font-bold tracking-tight text-slate-950">{currentPackage.title}</h2>
				<p class="text-sm leading-6 text-slate-600">
					Waktu akan berjalan setelah kamu menekan tombol mulai. Jawaban dikumpulkan di akhir paket.
				</p>
				<button
					type="button"
					onclick={startPackage}
					class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700"
				>
					<Play size={16} />
					{completedPackages > 0 ? 'Lanjutkan Paket' : 'Mulai Paket'}
				</button>
			</section>
		{:else}
			<Alert type="info" message="Semua paket sudah selesai. Memuat hasil..." />
		{/if}
	</div>
{/if}
