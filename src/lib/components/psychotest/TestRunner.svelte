<script lang="ts">
	import { onMount } from 'svelte';
	import NumberPad from './NumberPad.svelte';
	import { expectedAnswer, generateDigits, type Attempt } from './scoring';

	interface Props {
		durationMs?: number;
		onfinish: (result: { attempts: Attempt[]; durationMs: number }) => void;
	}

	let { durationMs = 60_000, onfinish }: Props = $props();

	const CHUNK = 120;
	const VISIBLE_HISTORY = 6;

	let digits = $state<number[]>(generateDigits(CHUNK));
	let cursor = $state(1);
	let attempts = $state<Attempt[]>([]);
	let elapsedMs = $state(0);
	let feedback = $state<'correct' | 'wrong' | null>(null);
	let lastAnswer = $state<number | null>(null);
	let finished = $state(false);

	let startedAt = 0;
	let timerId: ReturnType<typeof setInterval> | undefined;
	let feedbackId: ReturnType<typeof setTimeout> | undefined;

	const expected = $derived(expectedAnswer(digitAt(cursor - 1), digitAt(cursor)));
	const answered = $derived(attempts.length);
	const correctCount = $derived(attempts.reduce((total, a) => total + (a.correct ? 1 : 0), 0));
	const accuracyPct = $derived(answered === 0 ? 0 : (correctCount / answered) * 100);
	const remainingMs = $derived(Math.max(0, durationMs - elapsedMs));
	const progressPct = $derived(Math.min(100, (elapsedMs / durationMs) * 100));
	const windowStart = $derived(Math.max(0, cursor - VISIBLE_HISTORY));
	const visibleDigits = $derived(digits.slice(windowStart, cursor + 1));

	function digitAt(index: number): number {
		return digits[index] ?? 0;
	}

	function formatClock(ms: number): string {
		const totalSeconds = Math.ceil(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	}

	function tick() {
		elapsedMs = performance.now() - startedAt;
		if (elapsedMs >= durationMs) finish();
	}

	function finish() {
		if (finished) return;

		finished = true;
		if (timerId) clearInterval(timerId);
		if (feedbackId) clearTimeout(feedbackId);
		elapsedMs = Math.min(elapsedMs, durationMs);

		onfinish({ attempts, durationMs });
	}

	function answer(value: number) {
		if (finished || value < 0 || value > 9) return;

		const top = digitAt(cursor - 1);
		const bottom = digitAt(cursor);
		const expectedValue = expectedAnswer(top, bottom);
		const isCorrect = value === expectedValue;

		attempts = [
			...attempts,
			{
				index: attempts.length,
				expected: expectedValue,
				given: value,
				correct: isCorrect,
				atMs: Math.round(elapsedMs)
			}
		];

		lastAnswer = value;
		feedback = isCorrect ? 'correct' : 'wrong';

		if (feedbackId) clearTimeout(feedbackId);
		feedbackId = setTimeout(() => {
			feedback = null;
			lastAnswer = null;
		}, 220);

		cursor += 1;
		if (cursor >= digits.length - 1) {
			digits = [...digits, ...generateDigits(CHUNK)];
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (finished) return;

		if (/^[0-9]$/.test(event.key)) {
			event.preventDefault();
			answer(Number(event.key));
			return;
		}

		if (event.key === ' ' || event.key === 'Backspace') {
			event.preventDefault();
		}
	}

	onMount(() => {
		startedAt = performance.now();
		timerId = setInterval(tick, 100);

		return () => {
			if (timerId) clearInterval(timerId);
			if (feedbackId) clearTimeout(feedbackId);
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex flex-col gap-5">
	<div class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
		<div class="flex items-center justify-between text-sm font-medium text-zinc-700">
			<span>Time left</span>
			<span class="font-mono tabular-nums">{formatClock(remainingMs)}</span>
		</div>

		<div
			class="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100"
			role="progressbar"
			aria-valuemin="0"
			aria-valuemax="100"
			aria-valuenow={Math.round(progressPct)}
			aria-label="Test progress"
		>
			<div class="h-full rounded-full bg-indigo-500 transition-all duration-100" style="width: {progressPct}%"></div>
		</div>

		<div class="mt-4 grid grid-cols-3 gap-3 text-center">
			<div>
				<p class="text-xl font-semibold tabular-nums text-zinc-900">{answered}</p>
				<p class="text-xs text-zinc-500">Answered</p>
			</div>
			<div>
				<p class="text-xl font-semibold tabular-nums text-emerald-600">{correctCount}</p>
				<p class="text-xs text-zinc-500">Correct</p>
			</div>
			<div>
				<p class="text-xl font-semibold tabular-nums text-zinc-900">{accuracyPct.toFixed(0)}%</p>
				<p class="text-xs text-zinc-500">Accuracy</p>
			</div>
		</div>
	</div>

	<div class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
		<p class="text-center text-sm text-zinc-500">
			Add each number to the one directly above it. Answer with the last digit only.
		</p>

		<div class="mt-5 flex flex-col items-center gap-2">
			{#each visibleDigits as digit, i (windowStart + i)}
				{@const absoluteIndex = windowStart + i}
				{@const isActive = absoluteIndex >= cursor - 1}
				<div
					class="flex h-11 w-16 items-center justify-center rounded-lg border text-2xl font-semibold tabular-nums {isActive
						? 'border-indigo-500 bg-indigo-50 text-indigo-700'
						: 'border-zinc-200 bg-white text-zinc-400'}"
				>
					{digit}
				</div>
			{/each}

			<div
				class="mt-1 flex h-12 w-16 items-center justify-center rounded-lg border-2 border-dashed text-2xl font-semibold tabular-nums {feedback ===
				'correct'
					? 'border-emerald-500 bg-emerald-50 text-emerald-700'
					: feedback === 'wrong'
						? 'border-red-500 bg-red-50 text-red-700'
						: 'border-zinc-300 bg-zinc-50 text-zinc-400'}"
				aria-hidden="true"
			>
				{lastAnswer ?? '–'}
			</div>
		</div>
	</div>

	<NumberPad onpress={answer} disabled={finished} />

	<p class="text-center text-xs text-zinc-400">
		Type digits 0–9 on your keyboard or tap the keypad. Answers are checked instantly.
	</p>
</div>
