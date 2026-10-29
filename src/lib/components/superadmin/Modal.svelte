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

	$effect(() => {
		if (!open) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});

	function handleKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
		<button
			type="button"
			class="absolute inset-0 cursor-default bg-slate-950/70 backdrop-blur-sm"
			aria-label="Tutup dialog"
			onclick={onclose}
		></button>
		<div
			class="relative flex max-h-[calc(100dvh-2rem)] w-full {size === 'lg'
				? 'max-w-2xl'
				: 'max-w-lg'} flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-black/50 sm:p-6"
			role="dialog"
			aria-modal="true"
			aria-labelledby="superadmin-modal-title"
		>
			<header class="flex shrink-0 items-start justify-between gap-4">
				<div>
					<h2 id="superadmin-modal-title" class="text-lg font-semibold text-white">{title}</h2>
					{#if description}
						<p class="mt-1 text-sm text-slate-400">{description}</p>
					{/if}
				</div>
				<button
					type="button"
					onclick={onclose}
					class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
					aria-label="Tutup"
				>
					<X size={18} />
				</button>
			</header>
			<div class="scrollbar-slim mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
				{@render children()}
			</div>
			{#if footer}
				<div class="mt-4 flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-800 pt-4">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}
