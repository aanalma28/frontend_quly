<script lang="ts">
	import { sanitizeRichText } from '#lib/utils/richText.js';

	let { html }: { html: string } = $props();
	const safe = $derived(sanitizeRichText(html));
</script>

<span class="rich-text">{@html safe}</span>

<style>
	.rich-text :global(b),
	.rich-text :global(strong) {
		font-weight: 700;
	}

	.rich-text :global(i),
	.rich-text :global(em) {
		font-style: italic;
	}

	.rich-text :global(u) {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.rich-text :global(s) {
		text-decoration: line-through;
	}

	.rich-text :global(code) {
		padding: 0 3px;
		border-radius: 3px;
		background: rgb(148 163 184 / 16%);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.92em;
	}
</style>
