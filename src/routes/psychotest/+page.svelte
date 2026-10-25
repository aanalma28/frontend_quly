<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { auth, initializeAuth } from '#lib/stores/auth.js';
	import { loadProfile, onboarding, step1Complete } from '#lib/stores/onboardingStore.js';
	import RequirementsStepsCard from '#lib/components/ui/RequirementsStepsCard.svelte';
	import { ApiError, apiRequest } from '$lib/utils/api';
	import TestRunner from '$lib/components/psychotest/TestRunner.svelte';
	import ResultsView from '$lib/components/psychotest/ResultsView.svelte';
	import {
		computeMetrics,
		type Attempt,
		type PsychotestMetrics
	} from '$lib/components/psychotest/scoring';

	type Phase = 'intro' | 'running' | 'result';

	const durationOptions = [
		{ value: 60_000, label: '1 minute' },
		{ value: 120_000, label: '2 minutes' },
		{ value: 300_000, label: '5 minutes' }
	];

	let phase = $state<Phase>('intro');
	let selectedDuration = $state(60_000);
	let completedDuration = $state(60_000);
	let attempts = $state<Attempt[]>([]);
	let metrics = $state<PsychotestMetrics | null>(null);
	let saving = $state(false);
	let saved = $state(false);
	let saveError = $state<string | null>(null);
	let certificateUrl = $state<string | null>(null);

	async function retryAuthentication() {
		auth.update((state) => ({ ...state, error: null, isLoading: true }));
		const authenticated = await initializeAuth();
		if (!authenticated && !get(auth).error) {
			await goto('/auth/login?redirectTo=%2Fpsychotest');
		}
	}

	onMount(async () => {
		const authenticated = await initializeAuth();
		if (!authenticated && !get(auth).error) {
			await goto('/auth/login?redirectTo=%2Fpsychotest');
			return;
		}
		await loadProfile();
	});

	function reset() {
		attempts = [];
		metrics = null;
		saved = false;
		saveError = null;
		certificateUrl = null;
	}

	function start() {
		reset();
		phase = 'running';
	}

	function handleFinish(result: { attempts: Attempt[]; durationMs: number }) {
		attempts = result.attempts;
		completedDuration = result.durationMs;
		metrics = computeMetrics(result.attempts, result.durationMs);
		phase = 'result';
	}

	async function save() {
		if (!metrics) return;

		saving = true;
		saveError = null;

		try {
			const payload = {
				test_type: 'KRAEPELIN',
				duration_ms: completedDuration,
				answers: attempts.map((attempt) => ({
					index: attempt.index,
					expected: attempt.expected,
					given: attempt.given,
					correct: attempt.correct,
					at_ms: attempt.atMs
				})),
				metrics: {
					answered: metrics.answered,
					correct: metrics.correct,
					incorrect: metrics.incorrect,
					accuracy_pct: Number(metrics.accuracyPct.toFixed(2)),
					speed_per_minute: Number(metrics.speedPerMinute.toFixed(2)),
					peak: metrics.peak,
					stability: Number(metrics.stability.toFixed(2))
				}
			};

			const response = await apiRequest('psychotest/attempts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const body = (await response.json().catch(() => null)) as
				| { certificate_url?: string; data?: { certificate_url?: string } }
				| null;

			certificateUrl = body?.certificate_url ?? body?.data?.certificate_url ?? null;
			saved = true;
		} catch (error) {
			saveError =
				error instanceof ApiError && error.status < 500
					? error.message
					: 'Could not save your result. Please try again.';
		} finally {
			saving = false;
		}
	}
</script>

{#if $auth.isLoading || $onboarding.isLoadingProfile}
	<main class="flex min-h-screen items-center justify-center px-4 text-zinc-500" aria-label="Memuat akun">
		<p>Memuat data akun...</p>
	</main>
{:else if $auth.error}
	<main class="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
		<p class="text-sm text-red-700" role="alert">{$auth.error}</p>
		<button
			type="button"
			onclick={retryAuthentication}
			class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
		>
			Coba lagi
		</button>
	</main>
{:else if $auth.user && !$step1Complete}
	<main class="flex min-h-screen items-center justify-center px-4 py-10">
		<RequirementsStepsCard
			title="Tes psikotes tersedia setelah profil lengkap"
			description="Lengkapi profil dan ekstraksi CV terlebih dahulu sebelum mengikuti tes Pauli/Kraepelin."
			steps={[
				{
					number: 1,
					title: 'Lengkapi Profil & Ekstraksi CV',
					description: 'Unggah CV dan tinjau data profilmu agar hasil tes bisa tersimpan dengan benar.',
					completed: false,
					href: '/dashboard/onboarding'
				}
			]}
		/>
	</main>
{:else if $auth.user}
<main class="mx-auto w-full max-w-2xl px-4 py-10">
	<header class="mb-6">
		<a
			href="/dashboard"
			class="text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
		>
			← Back to dashboard
		</a>
		<h1 class="mt-3 text-2xl font-semibold tracking-tight text-zinc-900">
			Pauli &amp; Kraepelin speed test
		</h1>
		<p class="mt-1 text-sm text-zinc-500">
			Measure your speed, accuracy, peak capacity and stability under time pressure.
		</p>
	</header>

	{#if phase === 'intro'}
		<div class="space-y-5">
			<div class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
				<h2 class="text-sm font-semibold text-zinc-900">How it works</h2>
				<ul class="mt-3 space-y-2 text-sm text-zinc-600">
					<li class="flex gap-2">
						<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" aria-hidden="true"></span>
						<span>Two highlighted numbers are shown at the bottom of the column.</span>
					</li>
					<li class="flex gap-2">
						<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" aria-hidden="true"></span>
						<span>
							Add the lower number to the one directly above it and answer with the last digit
							only (0–9).
						</span>
					</li>
					<li class="flex gap-2">
						<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" aria-hidden="true"></span>
						<span>Answer as many as you can before the timer runs out. Each answer is final.</span>
					</li>
					<li class="flex gap-2">
						<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" aria-hidden="true"></span>
						<span>Use your keyboard number row, numpad, or the on-screen keypad.</span>
					</li>
				</ul>

				<fieldset class="mt-5">
					<legend class="text-sm font-medium text-zinc-800">Duration</legend>
					<div class="mt-2 grid grid-cols-3 gap-2">
						{#each durationOptions as option (option.value)}
							<button
								type="button"
								onclick={() => (selectedDuration = option.value)}
								aria-pressed={selectedDuration === option.value}
								class="rounded-lg border px-3 py-2 text-sm font-medium transition {selectedDuration ===
								option.value
									? 'border-indigo-500 bg-indigo-50 text-indigo-700'
									: 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'}"
							>
								{option.label}
							</button>
						{/each}
					</div>
				</fieldset>

				<button
					type="button"
					onclick={start}
					class="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
				>
					Start test
				</button>
			</div>

			<p class="text-xs text-zinc-400">
				Your answers are timed from the moment the test starts. Keep the tab focused — you cannot
				pause once started.
			</p>
		</div>
	{:else if phase === 'running'}
		<TestRunner durationMs={selectedDuration} onfinish={handleFinish} />
	{:else if metrics}
		<ResultsView
			{metrics}
			{saving}
			{saved}
			error={saveError}
			{certificateUrl}
			onsave={save}
			onrestart={() => {
				reset();
				phase = 'intro';
			}}
		/>
	{/if}
</main>
{/if}
