<script lang="ts">
	interface Props {
		score: number;
		size?: number;
		label?: string;
		caption?: string;
	}

	let { score, size = 132, label = 'Skor', caption = '' }: Props = $props();

	const normalized = $derived(Math.min(100, Math.max(0, Math.round(Number(score) || 0))));
	const circumference = 2 * Math.PI * 48;
	const offset = $derived(circumference - (circumference * normalized) / 100);
	const tone = $derived(
		normalized >= 80
			? { progress: 'stroke-emerald-500', text: 'text-emerald-600' }
			: normalized >= 60
				? { progress: 'stroke-indigo-500', text: 'text-indigo-600' }
				: normalized >= 40
					? { progress: 'stroke-amber-500', text: 'text-amber-600' }
					: { progress: 'stroke-rose-500', text: 'text-rose-600' }
	);
</script>

<div class="relative inline-flex shrink-0 items-center justify-center" style:width={`${size}px`} style:height={`${size}px`}>
	<svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
		<circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" stroke-width="8" class="text-slate-100" />
		<circle
			cx="60"
			cy="60"
			r="48"
			fill="none"
			stroke-width="8"
			stroke-linecap="round"
			stroke-dasharray={circumference}
			stroke-dashoffset={offset}
			transform="rotate(-90 60 60)"
			class={tone.progress}
		/>
	</svg>
	<div class="absolute inset-0 flex flex-col items-center justify-center text-center">
		<strong class="text-2xl font-bold tracking-tight {tone.text}">{normalized}</strong>
		<span class="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">/100</span>
		<span class="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
	</div>
</div>
{#if caption}
	<p class="mt-2 text-center text-xs text-slate-500">{caption}</p>
{/if}
