<script lang="ts">
	import { AlertCircle, CheckCircle2, Info, X } from '@lucide/svelte';

	interface Props {
		message: string;
		type?: 'error' | 'success' | 'info';
		dismissible?: boolean;
		ondismiss?: () => void;
	}

	let { message, type = 'info', dismissible = false, ondismiss }: Props = $props();

	const tone: Record<string, string> = {
		error: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
		success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
		info: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-200'
	};
</script>

{#if message}
	<div class="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm {tone[type]}" role={type === 'error' ? 'alert' : 'status'}>
		<span class="mt-0.5 shrink-0">
			{#if type === 'error'}
				<AlertCircle size={18} />
			{:else if type === 'success'}
				<CheckCircle2 size={18} />
			{:else}
				<Info size={18} />
			{/if}
		</span>
		<span class="min-w-0 flex-1 leading-6">{message}</span>
		{#if dismissible}
			<button
				type="button"
				onclick={ondismiss}
				class="shrink-0 rounded-lg p-1 opacity-70 transition hover:bg-white/10 hover:opacity-100"
				aria-label="Tutup notifikasi"
			>
				<X size={15} />
			</button>
		{/if}
	</div>
{/if}
