<script lang="ts">
	import type { Snippet } from 'svelte';
	import { X } from '@lucide/svelte';

	interface Props {
		open: boolean;
		title: string;
		description?: string;
		size?: 'md' | 'lg';
		onclose: () => void;
		children: Snippet;
		footer?: Snippet;
	}

	let { open, title, description, size = 'md', onclose, children, footer }: Props = $props();

	function handleKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
		<button
			type="button"
			class="absolute inset-0 cursor-default bg-slate-900/50"
			aria-label="Tutup dialog"
			onclick={onclose}
		></button>
		<div
			class="relative w-full {size === 'lg' ? 'max-w-2xl' : 'max-w-lg'} rounded-2xl bg-white p-6 shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
		>
			<header class="flex items-start justify-between gap-4">
				<div>
					<h2 id="modal-title" class="text-lg font-semibold text-slate-950">{title}</h2>
					{#if description}
						<p class="mt-1 text-sm text-slate-500">{description}</p>
					{/if}
				</div>
				<button
					type="button"
					onclick={onclose}
					class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
					aria-label="Tutup"
				>
					<X size={18} />
				</button>
			</header>
			<div class="mt-5 max-h-[70vh] overflow-y-auto">{@render children()}</div>
			{#if footer}
				<div class="mt-6 flex flex-wrap justify-end gap-2">{@render footer()}</div>
			{/if}
		</div>
	</div>
{/if}
