<script lang="ts">
	interface Props {
		labels: string[];
		values: number[];
		color?: string;
		height?: number;
		valueFormatter?: (value: number) => string;
	}

	let {
		labels,
		values,
		color = '#6366f1',
		height = 220,
		valueFormatter = (value: number) => String(value)
	}: Props = $props();

	const width = 760;
	const padL = 64;
	const padR = 16;
	const padT = 16;
	const padB = 40;

	const plotW = width - padL - padR;
	const plotH = $derived(height - padT - padB);
	const count = $derived(Math.max(1, values.length));
	const maxValue = $derived(Math.max(1, ...values));
	const step = $derived(plotW / count);
	const barWidth = $derived(Math.max(6, step * 0.55));

	function barX(index: number): number {
		return padL + index * step + (step - barWidth) / 2;
	}

	function barHeight(value: number): number {
		return (value / maxValue) * plotH;
	}

	const gridRatios = [0, 0.25, 0.5, 0.75, 1];
</script>

<svg viewBox={`0 0 ${width} ${height}`} class="h-auto w-full" role="img" aria-label="Grafik batang">
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

	{#each values as value, index}
		<rect
			x={barX(index)}
			y={padT + plotH - barHeight(value)}
			width={barWidth}
			height={barHeight(value)}
			rx="4"
			fill={color}
			opacity="0.85"
		>
			<title>{labels[index]}: {valueFormatter(value)}</title>
		</rect>
	{/each}

	{#each labels as label, index}
		<text
			x={barX(index) + barWidth / 2}
			y={height - 14}
			text-anchor="middle"
			fill="#64748b"
			font-size="10"
		>
			{label}
		</text>
	{/each}
</svg>
