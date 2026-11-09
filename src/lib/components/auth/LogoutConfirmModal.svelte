<script lang="ts">
	import { LogOut, X } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';

	interface Props {
		open: boolean;
		loading?: boolean;
		onconfirm: () => void;
		oncancel: () => void;
	}

	let { open, loading = false, onconfirm, oncancel }: Props = $props();

	$effect(() => {
		if (!open) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});

	function handleKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape' && !loading) oncancel();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-labelledby="logout-confirm-title"
		aria-describedby="logout-confirm-description"
	>
		<button
			type="button"
			class="absolute inset-0 h-full w-full cursor-default"
			aria-label="Tutup konfirmasi logout"
			tabindex="-1"
			onclick={() => !loading && oncancel()}
		></button>

		<div class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
			<div class="flex items-start gap-3">
				<span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
					<LogOut size={20} />
				</span>
				<div class="min-w-0 flex-1">
					<h2 id="logout-confirm-title" class="text-lg font-bold tracking-tight text-slate-950">
						Keluar dari akun?
					</h2>
					<p id="logout-confirm-description" class="mt-1 text-sm leading-6 text-slate-600">
						Kamu perlu masuk kembali untuk mengakses dashboard dan melanjutkan aktivitas.
					</p>
				</div>
				<button
					type="button"
					onclick={oncancel}
					disabled={loading}
					class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
					aria-label="Tutup"
				>
					<X size={18} />
				</button>
			</div>

			<div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<button
					type="button"
					onclick={oncancel}
					disabled={loading}
					class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
				>
					Batal
				</button>
				<button
					type="button"
					onclick={onconfirm}
					disabled={loading}
					class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{#if loading}
						<Spinner label="Keluar dari akun" /> Keluar...
					{:else}
						<LogOut size={15} /> Ya, keluar
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
