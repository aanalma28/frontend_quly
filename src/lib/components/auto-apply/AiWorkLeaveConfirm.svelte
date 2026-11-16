<script lang="ts">
	import { AlertTriangle, X } from '@lucide/svelte';

	interface Props {
		open: boolean;
		title: string;
		description: string;
		confirmLabel?: string;
		cancelLabel?: string;
		onconfirm: () => void;
		oncancel: () => void;
	}

	let {
		open,
		title,
		description,
		confirmLabel = 'Keluar',
		cancelLabel = 'Tetap di sini',
		onconfirm,
		oncancel
	}: Props = $props();
</script>

{#if open}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
		role="alertdialog"
		aria-modal="true"
		aria-labelledby="ai-work-leave-title"
		aria-describedby="ai-work-leave-description"
	>
		<div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
			<div class="flex items-start justify-between gap-3">
				<div class="flex items-start gap-3">
					<span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
						<AlertTriangle size={22} />
					</span>
					<div>
						<h3 id="ai-work-leave-title" class="text-lg font-bold tracking-tight text-slate-950">
							{title}
						</h3>
						<p id="ai-work-leave-description" class="mt-1 text-sm leading-6 text-slate-600">
							{description}
						</p>
					</div>
				</div>
				<button
					type="button"
					onclick={oncancel}
					class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
					aria-label="Tutup"
				>
					<X size={17} />
				</button>
			</div>
			<div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<button
					type="button"
					onclick={oncancel}
					class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
				>
					{cancelLabel}
				</button>
				<button
					type="button"
					onclick={onconfirm}
					class="inline-flex h-10 items-center justify-center rounded-lg bg-rose-600 px-4 text-xs font-semibold text-white transition hover:bg-rose-700"
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
