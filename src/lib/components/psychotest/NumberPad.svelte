<script lang="ts">
	interface Props {
		onpress: (value: number) => void;
		disabled?: boolean;
	}

	let { onpress, disabled = false }: Props = $props();

	const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
</script>

<div class="grid grid-cols-5 gap-2" role="group" aria-label="Answer keypad">
	{#each keys as key (key)}
		<button
			type="button"
			{disabled}
			onclick={() => onpress(key)}
			aria-label="Answer {key}"
			class="rounded-lg border border-zinc-200 bg-white py-3 text-lg font-semibold tabular-nums text-zinc-900 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
		>
			{key}
		</button>
	{/each}
</div>
