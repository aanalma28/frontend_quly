<script lang="ts">
	interface Props {
		values: number[];
		labels?: string[];
	}

	let { values, labels = [] }: Props = $props();

	const width = 640;
	const height = 200;
	const paddingX = 40;
	const paddingY = 24;

	const max = $derived(Math.max(...values, 1));

	const stepX = $derived(
		values.length > 1 ? (width - paddingX * 2) / (values.length - 1) : 0
	);

	const linePoints = $derived(
		values
			.map((value, index) => {
				const x = paddingX + index * stepX;
				const y = height - paddingY - (value / max) * (height - paddingY * 2);
				return `${x},${y}`;
			})
			.join(' ')
	);

	const areaPoints = $derived.by(() => {
		if (values.length === 0) return '';
		const baseline = height - paddingY;
		const rightX = paddingX + (values.length - 1) * stepX;
		return [
			`${paddingX},${baseline}`,
			...values.map((value, index) => {
				const x = paddingX + index * stepX;
				const y = height - paddingY - (value / max) * (height - paddingY * 2);
				return `${x},${y}`;
			}),
			`${rightX},${baseline}`
		].join(' ');
	});

	const dots = $derived(
		values.map((value, index) => ({
			x: paddingX + index * stepX,
			y: height - paddingY - (value / max) * (height - paddingY * 2),
			value,
			label: labels[index] ?? String(index + 1)
		}))
	);
</script>

<svg viewBox={`0 0 ${width} ${height}`} class="h-auto w-full" role="img" aria-label="Kurva kerja per interval waktu">
	<line
		x1={paddingX}
		y1={height - paddingY}
		x2={width - paddingX}
		y2={height - paddingY}
		stroke="#e2e8f0"
		stroke-width="1"
	/>

	{#if areaPoints}
		<polygon points={areaPoints} fill="rgba(99, 102, 241, 0.12)" />
	{/if}

	{#if linePoints}
		<polyline
			points={linePoints}
			fill="none"
			stroke="#1b4db1"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{/if}

	{#each dots as dot}
		<circle cx={dot.x} cy={dot.y} r="3.5" fill="#1b4db1" />
	{/each}
</svg>

{#if values.length > 0}
	<div class="mt-1 flex justify-between px-2 text-[10px] text-slate-400">
		{#each dots as dot}
			<span>{dot.label}</span>
		{/each}
	</div>
{/if}
