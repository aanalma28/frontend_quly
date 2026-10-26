<script lang="ts">
	interface Segment {
		label: string;
		value: number;
		color: string;
	}

	interface Props {
		segments: Segment[];
		size?: number;
		thickness?: number;
		centerLabel?: string;
		centerValue?: string;
	}

	let { segments, size = 180, thickness = 16, centerLabel, centerValue }: Props = $props();

	const radius = $derived(50 - thickness / 2);
	const circumference = $derived(2 * Math.PI * radius);
	const total = $derived(segments.reduce((sum, segment) => sum + segment.value, 0) || 1);

	const arcs = $derived.by(() => {
		let offset = 0;
		return segments.map((segment) => {
			const length = (segment.value / total) * circumference;
			const arc = {
				...segment,
				percentage: Math.round((segment.value / total) * 100),
				dash: `${Math.max(length - 1.5, 0)} ${circumference - Math.max(length - 1.5, 0)}`,
				offset: -offset
			};
			offset += length;
			return arc;
		});
	});
</script>

<div class="relative inline-flex items-center justify-center" style:width="{size}px" style:height="{size}px">
	<svg viewBox="0 0 100 100" class="h-full w-full -rotate-90" role="img" aria-label="Grafik donat proporsi">
		<circle cx="50" cy="50" r={radius} fill="none" stroke="#1e293b" stroke-width={thickness} />
		{#each arcs as arc}
			<circle
				cx="50"
				cy="50"
				r={radius}
				fill="none"
				stroke={arc.color}
				stroke-width={thickness}
				stroke-dasharray={arc.dash}
				stroke-dashoffset={arc.offset}
			/>
		{/each}
	</svg>
	{#if centerValue || centerLabel}
		<div class="absolute inset-0 flex flex-col items-center justify-center text-center">
			{#if centerValue}
				<span class="text-lg font-bold text-white">{centerValue}</span>
			{/if}
			{#if centerLabel}
				<span class="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">{centerLabel}</span>
			{/if}
		</div>
	{/if}
</div>

<ul class="mt-4 space-y-2">
	{#each arcs as arc}
		<li class="flex items-center justify-between gap-3 text-xs">
			<span class="inline-flex items-center gap-2 text-slate-400">
				<span class="size-2.5 rounded-full" style:background={arc.color}></span>
				{arc.label}
			</span>
			<span class="font-semibold text-slate-200">{arc.percentage}%</span>
		</li>
	{/each}
</ul>
