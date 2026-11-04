<script lang="ts">
	import { onMount } from 'svelte';
	import { beforeNavigate, goto } from '$app/navigation';
	import { AlertTriangle, ArrowLeft, ArrowRight, Clock, Send } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/onboarding/Alert.svelte';
	import { categoryLabel, categoryTone } from './labels.js';
	import {
		getQuestionsApi,
		submitAttemptApi,
		type PsychotestQuestion,
		type SessionAttempt,
		type SubmitAttemptResponse
	} from '#lib/services/psychotestApi.js';

	interface Props {
		sessionId: string;
		packageInfo: SessionAttempt;
		onsubmitted: (result: SubmitAttemptResponse) => void;
	}

	let { sessionId, packageInfo, onsubmitted }: Props = $props();

	let questions = $state<PsychotestQuestion[]>([]);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let isSubmitting = $state(false);

	let answers = $state<Record<string, string>>({});
	let answeredAt = $state<Record<string, number>>({});
	let currentIndex = $state(0);
	let remainingMs = $state(0);

	let timerId: ReturnType<typeof setInterval> | undefined;
	let deadline = 0;
	let sessionStartAt = 0;

	let leaveConfirmOpen = $state(false);
	let allowNavigation = $state(false);
	let pendingNavigation = $state<string | null>(null);

	beforeNavigate((navigation) => {
		if (allowNavigation || questions.length === 0) return;
		// Let the native beforeunload dialog handle tab close/refresh.
		if (navigation.willUnload) return;
		navigation.cancel();
		stopTimer();
		pendingNavigation = navigation.to?.url.href ?? null;
		leaveConfirmOpen = true;
	});

	const currentQuestion = $derived<PsychotestQuestion | null>(questions[currentIndex] ?? null);
	const answeredCount = $derived(questions.filter((q) => answers[q.id]).length);
	const totalCount = $derived(questions.length);
	const isLast = $derived(currentIndex === totalCount - 1);
	const timeDanger = $derived(remainingMs < 60_000);

	function formatClock(ms: number): string {
		const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}

	function stopTimer() {
		if (timerId) {
			clearInterval(timerId);
			timerId = undefined;
		}
	}

	function resumeTimer() {
		if (deadline <= Date.now()) return;
		stopTimer();
		timerId = setInterval(() => {
			remainingMs = Math.max(0, deadline - Date.now());
			if (remainingMs <= 0) void submit();
		}, 250);
	}

	function beginTimer() {
		sessionStartAt = Date.now();
		deadline = sessionStartAt + packageInfo.durationMin * 60_000;
		remainingMs = Math.max(0, deadline - Date.now());
		resumeTimer();
	}

	function selectOption(questionId: string, optionId: string) {
		answers = { ...answers, [questionId]: optionId };
		answeredAt = { ...answeredAt, [questionId]: Date.now() - sessionStartAt };
	}

	function goPrev() {
		if (currentIndex > 0) currentIndex -= 1;
	}

	function goNext() {
		if (currentIndex < totalCount - 1) currentIndex += 1;
	}

	function goTo(index: number) {
		if (index >= 0 && index < totalCount) currentIndex = index;
	}

	async function submit() {
		if (isSubmitting) return;
		stopTimer();
		isSubmitting = true;
		errorMessage = null;
		try {
			const result = await submitAttemptApi({
				sessionId,
				packageId: packageInfo.packageId,
				answers,
				timing: {
					durationMs: Math.max(0, Date.now() - sessionStartAt),
					elapsedPerQuestion: answeredAt
				}
			});
			onsubmitted(result);
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Jawaban belum dapat dikumpulkan. Coba lagi.';
			resumeTimer();
		} finally {
			isSubmitting = false;
		}
	}

	async function loadQuestions() {
		isLoading = true;
		loadError = null;
		try {
			const response = await getQuestionsApi(sessionId, packageInfo.packageId);
			questions = response.questions;
			currentIndex = 0;
			beginTimer();
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Soal belum dapat dimuat.';
		} finally {
			isLoading = false;
		}
	}

	function stayInTest() {
		leaveConfirmOpen = false;
		pendingNavigation = null;
		resumeTimer();
	}

	function leaveWithoutSaving() {
		allowNavigation = true;
		leaveConfirmOpen = false;
		const target = pendingNavigation;
		pendingNavigation = null;
		if (target) void goto(target);
	}

	onMount(() => {
		void loadQuestions();
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (allowNavigation || questions.length === 0) return;
			event.preventDefault();
			event.returnValue = '';
		};
		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => {
			stopTimer();
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
	});
</script>

{#if isLoading}
	<div class="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
		<Spinner label="Memuat soal" /> Memuat soal...
	</div>
{:else if loadError}
	<div class="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
		<p class="text-sm text-rose-700" role="alert">{loadError}</p>
	</div>
{:else}
	<div class="space-y-5">
		<header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<span class="rounded-full px-2.5 py-1 text-[11px] font-semibold {categoryTone[packageInfo.category]}">
					{categoryLabel[packageInfo.category]}
				</span>
				<h2 class="mt-2 text-lg font-semibold tracking-tight text-slate-950">{packageInfo.title}</h2>
			</div>
			<div
				class="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold tabular-nums {timeDanger
					? 'bg-rose-50 text-rose-700'
					: 'bg-slate-100 text-slate-800'}"
			>
				<Clock size={16} /> {formatClock(remainingMs)}
			</div>
		</header>

		{#if errorMessage}
			<Alert type="error" message={errorMessage} dismissible ondismiss={() => (errorMessage = null)} />
		{/if}

		<div class="flex items-center justify-between text-xs text-slate-500">
			<span>{answeredCount} dari {totalCount} soal terjawab</span>
			<span>Soal {currentIndex + 1} / {totalCount}</span>
		</div>
		<div class="h-1.5 overflow-hidden rounded-full bg-slate-100">
			<div
				class="h-full rounded-full bg-indigo-500 transition-all"
				style:width="{(totalCount ? (answeredCount / totalCount) * 100 : 0)}%"
			></div>
		</div>

		{#if currentQuestion}
			<section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
				<h3 class="text-base font-semibold leading-7 text-slate-900">
					{currentIndex + 1}. {currentQuestion.questionText}
				</h3>
				<fieldset class="mt-5 space-y-3">
					<legend class="sr-only">Pilihan jawaban</legend>
					{#each currentQuestion.options as option (option.id)}
						{@const selected = answers[currentQuestion.id] === option.id}
						<label
							class="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition {selected
								? 'border-indigo-500 bg-indigo-50'
								: 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'}"
						>
							<input
								type="radio"
								name="answer-{currentQuestion.id}"
								value={option.id}
								checked={selected}
								onchange={() => selectOption(currentQuestion.id, option.id)}
								class="mt-1 h-4 w-4 shrink-0 border-slate-300 text-indigo-600 focus:ring-indigo-500"
							/>
							<span class="text-sm leading-6 text-slate-700">{option.text}</span>
						</label>
					{/each}
				</fieldset>
			</section>
		{/if}

		<section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
			<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Navigasi soal</p>
			<div class="flex flex-wrap gap-2">
				{#each questions as question, index (question.id)}
					{@const answered = !!answers[question.id]}
					<button
						type="button"
						onclick={() => goTo(index)}
						aria-label="Ke soal {index + 1}"
						class="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold transition {index ===
						currentIndex
							? 'bg-indigo-600 text-white'
							: answered
								? 'bg-emerald-100 text-emerald-700'
								: 'bg-slate-100 text-slate-500 hover:bg-slate-200'}"
					>
						{index + 1}
					</button>
				{/each}
			</div>
		</section>

		<div class="flex flex-wrap items-center justify-between gap-3 pb-4">
			<button
				type="button"
				onclick={goPrev}
				disabled={currentIndex === 0}
				class="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
			>
				<ArrowLeft size={16} /> Sebelumnya
			</button>

			<div class="flex flex-wrap items-center gap-2">
				{#if !isLast}
					<button
						type="button"
						onclick={goNext}
						class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
					>
						Selanjutnya <ArrowRight size={16} />
					</button>
				{/if}
				<button
					type="button"
					onclick={() => void submit()}
					disabled={isSubmitting}
					class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{#if isSubmitting}
						<Spinner label="Mengumpulkan jawaban" /> Mengumpulkan...
					{:else}
						<Send size={16} /> Kumpulkan Paket
					{/if}
				</button>
			</div>
		</div>

		{#if answeredCount < totalCount}
			<p class="pb-2 text-xs text-slate-500">
				Masih ada {totalCount - answeredCount} soal yang belum terjawab (akan dihitung sebagai dilewati).
			</p>
		{/if}
	</div>
{/if}

{#if leaveConfirmOpen}
	<div
		class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
		role="alertdialog"
		aria-modal="true"
		aria-labelledby="psychotest-leave-title"
		aria-describedby="psychotest-leave-description"
	>
		<div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
			<div class="flex items-start gap-3">
				<span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
					<AlertTriangle size={22} />
				</span>
				<div>
					<h3 id="psychotest-leave-title" class="text-lg font-bold tracking-tight text-slate-950">
						Progres psikotes belum tersimpan
					</h3>
					<p id="psychotest-leave-description" class="mt-1 text-sm leading-6 text-slate-600">
						Jawaban dan timer paket ini tidak akan tersimpan jika kamu keluar sekarang.
						Selesaikan paket terlebih dahulu agar progresmu aman.
					</p>
				</div>
			</div>
			<div class="mt-5 flex flex-wrap justify-end gap-2">
				<button
					type="button"
					onclick={leaveWithoutSaving}
					class="inline-flex h-10 items-center justify-center rounded-lg px-4 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
				>
					Keluar tanpa menyimpan
				</button>
				<button
					type="button"
					onclick={stayInTest}
					class="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white transition hover:bg-indigo-700"
				>
					Lanjutkan tes
				</button>
			</div>
		</div>
	</div>
{/if}
