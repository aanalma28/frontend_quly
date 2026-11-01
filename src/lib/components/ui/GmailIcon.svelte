<script lang="ts">
	interface Props {
		size?: number;
	}

	let { size = 24 }: Props = $props();
</script>

<img
	src="/logos/gmail.svg"
	alt="Gmail"
	width={size}
	height={size}
	draggable="false"
	class="object-contain"
	style:width={`${size}px`}
	style:height={`${size}px`}
/>
