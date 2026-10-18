<script lang="ts">
	import type { PsychotestMetrics } from './scoring';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	interface Props {
		metrics: PsychotestMetrics;
		saving?: boolean;
		saved?: boolean;
		error?: string | null;
		certificateUrl?: string | null;
		onsave: () => void;
		onrestart: () => void;
	}

	let {
		metrics,
		saving = false,
		saved = false,
		error = null,
		certificateUrl = null,
		onsave,
		onrestart
	}: Props = $props();

	const cards = $derived([
		{
			label: 'Peak capacity',
			value: String(metrics.peak),
			unit: 'answers / 10s',
			hint: 'Best output in a single interval'
		},
		{
			label: 'Speed',
			value: metrics.speedPerMinute.toFixed(1),
			unit: 'answers / minute',
			hint: 'Average throughput'
		},
		{
			label: 'Accuracy',
			value: `${metrics.accuracyPct.toFixed(1)}%`,
			unit: `${metrics.correct} of ${metrics.answered} correct`,
			hint: 'Higher is more careful'
		},
		{
			label: 'Stability',
			value: metrics.stability.toFixed(2),
			unit: 'σ per interval',
			hint: 'Lower means more consistent'
		}
	]);

	const maxBucketCount = $derived(
		Math.max(1, ...metrics.buckets.map((bucket) => bucket.count))
	);

	function bucketLabel(startMs: number, endMs: number): string {
		const start = (startMs / 1000).toFixed(0);
		const end = (endMs / 1000).toFixed(0);
		return `${start}–${end}s`;
	}
</script>

<div class="space-y-5">
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		{#each cards as card (card.label)}
			<div class="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
				<p class="text-xs font-medium text-zinc-500">{card.label}</p>
				<p class="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">{card.value}</p>
				<p class="mt-0.5 text-xs text-zinc-500">{card.unit}</p>
				<p class="mt-2 text-[11px] leading-tight text-zinc-400">{card.hint}</p>
			</div>
		{/each}
	</div>

	<div class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
		<div class="flex items-baseline justify-between">
			<h2 class="text-sm font-semibold text-zinc-900">Work pace over time</h2>
			<span class="text-xs text-zinc-400">answers per 10s</span>
		</div>

		<div class="mt-4 flex h-40 items-end gap-1.5">
			{#each metrics.buckets as bucket (bucket.index)}
				<div class="flex h-full flex-1 flex-col justify-end" title="{bucketLabel(
					bucket.startMs,
					bucket.endMs
				)}: {bucket.count} answers, {bucket.correct} correct">
					<div
						class="w-full rounded-t bg-indigo-500"
						style="height: {(bucket.count / maxBucketCount) * 100}%"
					></div>
				</div>
			{/each}
		</div>

		<div class="mt-2 flex justify-between text-xs text-zinc-400">
			<span>0s</span>
			<span>{(metrics.durationMs / 1000).toFixed(0)}s</span>
		</div>
	</div>

	{#if error}
		<div class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
			{error}
		</div>
	{/if}

	<div class="flex flex-col gap-2 sm:flex-row">
		<button
			type="button"
			onclick={onsave}
			disabled={saving || saved}
			class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
		>
			{#if saving}
				<Spinner label="Saving result" />
			{/if}
			{saved ? 'Result saved' : 'Save result'}
		</button>

		{#if certificateUrl}
			<a
				href={certificateUrl}
				class="flex flex-1 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
			>
				Download certificate (PDF)
			</a>
		{/if}

		<button
			type="button"
			onclick={onrestart}
			class="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
		>
			Take the test again
		</button>
	</div>

	<p class="text-xs text-zinc-400">
		This is a practice simulation of the Pauli/Kraepelin speed test. It is not an official
		psychological assessment.
	</p>
</div>
