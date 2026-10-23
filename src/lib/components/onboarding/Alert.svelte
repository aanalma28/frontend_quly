<script lang="ts">
	import { AlertCircle, CheckCircle2, Info, X } from '@lucide/svelte';

	interface Props {
		message: string;
		type?: 'error' | 'success' | 'info';
		dismissible?: boolean;
		ondismiss?: () => void;
	}

	let { message, type = 'info', dismissible = false, ondismiss }: Props = $props();

	const styles = $derived(
		type === 'error'
			? {
					wrap: 'border-rose-200 bg-rose-50 text-rose-800',
					icon: 'text-rose-600'
				}
			: type === 'success'
				? {
						wrap: 'border-emerald-200 bg-emerald-50 text-emerald-800',
						icon: 'text-emerald-600'
					}
				: {
						wrap: 'border-indigo-200 bg-indigo-50 text-indigo-800',
						icon: 'text-indigo-600'
					}
	);
</script>

{#if message}
	<div
		class="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm {styles.wrap}"
		role={type === 'error' ? 'alert' : 'status'}
	>
		<span class="mt-0.5 shrink-0 {styles.icon}">
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
				class="shrink-0 rounded-lg p-1 text-current opacity-70 transition hover:bg-black/5 hover:opacity-100"
				aria-label="Tutup notifikasi"
			>
				<X size={16} />
			</button>
		{/if}
	</div>
{/if}
