<script lang="ts">
	interface Props {
		size?: number;
		word?: boolean;
		tone?: 'brand' | 'white' | 'ink';
		label?: string;
		class?: string;
	}

	let {
		size = 32,
		word = true,
		tone = 'brand',
		label = 'Quly',
		class: className = ''
	}: Props = $props();

	const source = $derived(word ? '/brand/quly-wordmark.png' : '/brand/quly-icon.png');
	const filter = $derived(
		tone === 'white'
			? 'brightness(0) invert(1)'
			: tone === 'ink'
				? 'brightness(0)'
				: 'none'
	);
</script>

<img
	src={source}
	alt={label}
	class="block w-auto select-none {className}"
	style={`height: ${size}px; filter: ${filter};`}
	draggable="false"
/>
