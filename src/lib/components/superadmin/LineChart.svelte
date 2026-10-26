<script lang="ts">
	interface Series {
		name: string;
		color: string;
		values: number[];
	}

	interface Props {
		labels: string[];
		series: Series[];
		height?: number;
		valueFormatter?: (value: number) => string;
	}

	let {
		labels,
		series,
		height = 280,
		valueFormatter = (value: number) => String(value)
	}: Props = $props();

	const width = 760;
	const padL = 64;
	const padR = 20;
	const padT = 20;
	const padB = 40;

	const plotW = width - padL - padR;
	const plotH = $derived(height - padT - padB);

	const maxValue = $derived(Math.max(1, ...series.flatMap((item) => item.values)));

	function x(index: number): number {
		if (labels.length <= 1) return padL + plotW / 2;
		return padL + (index / (labels.length - 1)) * plotW;
	}

	function y(value: number): number {
		return padT + plotH - (value / maxValue) * plotH;
	}

	function points(values: number[]): string {
		return values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
	}

	const gridRatios = [0, 0.25, 0.5, 0.75, 1];
</script>

<svg viewBox={`0 0 ${width} ${height}`} class="h-auto w-full" role="img" aria-label="Grafik garis">
	{#each gridRatios as ratio}
		<line
			x1={padL}
			y1={padT + plotH - ratio * plotH}
			x2={width - padR}
			y2={padT + plotH - ratio * plotH}
			stroke="#1e293b"
			stroke-width="1"
			stroke-dasharray="4 4"
		/>
		<text
			x={padL - 10}
			y={padT + plotH - ratio * plotH + 4}
			text-anchor="end"
			fill="#64748b"
			font-size="11"
		>
			{valueFormatter(maxValue * ratio)}
		</text>
	{/each}

	{#each labels as label, index}
		<text x={x(index)} y={height - 14} text-anchor="middle" fill="#64748b" font-size="11">
			{label}
		</text>
	{/each}

	{#each series as item}
		<polyline
			points={points(item.values)}
			fill="none"
			stroke={item.color}
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		{#each item.values as value, index}
			<circle cx={x(index)} cy={y(value)} r="3.2" fill={item.color} />
		{/each}
	{/each}
</svg>

<div class="mt-2 flex flex-wrap gap-4">
	{#each series as item}
		<span class="inline-flex items-center gap-2 text-xs text-slate-400">
			<span class="size-2.5 rounded-full" style:background={item.color}></span>
			{item.name}
		</span>
	{/each}
</div>
