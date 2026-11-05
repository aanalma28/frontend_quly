<script lang="ts">
	import type { Snippet } from 'svelte';
	import QulyLogo from '#lib/components/ui/QulyLogo.svelte';

	interface Props {
		title: string;
		subtitle?: string;
		children: Snippet;
		footer?: Snippet;
	}

	let { title, subtitle, children, footer }: Props = $props();
</script>

<main class="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
	<div class="w-full max-w-md">
		<div class="mb-8 flex flex-col items-center gap-3 text-center">
			<QulyLogo size={42} />
			<div>
				<h1 class="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
				{#if subtitle}
					<p class="mt-1 text-sm text-zinc-500">{subtitle}</p>
				{/if}
			</div>
		</div>

		<div class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
			{@render children()}
		</div>

		{#if footer}
			<div class="mt-6 text-center text-sm text-zinc-600">
				{@render footer()}
			</div>
		{/if}
	</div>
</main>
