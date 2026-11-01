<script lang="ts">
	import { Mail, Send, Sparkles, X } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import type { AutoApplyJobOption, EmailDraftPreview } from '#lib/services/autoApplyApi.js';
	import { formatNumber } from '#lib/utils/billing.js';

	interface Props {
		open: boolean;
		options: AutoApplyJobOption[];
		previews: Record<string, EmailDraftPreview>;
		sending: boolean;
		totalCredits: number;
		creditBalance: number;
		onclose: () => void;
		onupdate: (key: string, field: 'subject' | 'body', value: string) => void;
		onsend: () => void;
	}

	let {
		open,
		options,
		previews,
		sending,
		totalCredits,
		creditBalance,
		onclose,
		onupdate,
		onsend
	}: Props = $props();

	let activeKey = $state('');

	const active = $derived(options.find((option) => option.key === activeKey) ?? options[0] ?? null);
	const activePreview = $derived(active ? previews[active.key] ?? null : null);
	const loadingReviews = $derived(
		options.some((option) => previews[option.key]?.loading)
	);
	const hasDraftError = $derived(
		options.some((option) => previews[option.key]?.error)
	);

	$effect(() => {
		if (open && options.length > 0 && !options.some((option) => option.key === activeKey)) {
			activeKey = options[0].key;
		}
	});

	$effect(() => {
		if (typeof document === 'undefined' || !open) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});

	function close() {
		if (sending) return;
		onclose();
	}
</script>

{#if open}
	<div class="fixed inset-0 z-[70] flex justify-end bg-slate-950/45 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="email-preview-title">
		<button type="button" class="absolute inset-0 h-full w-full cursor-default" aria-label="Tutup pratinjau email" onclick={close}></button>
		<aside class="relative z-10 flex h-full w-full max-w-3xl flex-col overflow-hidden bg-slate-50 shadow-2xl sm:rounded-l-2xl">
			<header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
				<div>
					<p class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-600">
						<Sparkles size={13} /> Review sebelum kirim
					</p>
					<h2 id="email-preview-title" class="mt-1 text-xl font-bold tracking-tight text-slate-950">
						Preview email lamaran
					</h2>
					<p class="mt-1 text-xs text-slate-500">
						Draft ini dibuat AI. Kamu bisa mengedit subjek dan isi sebelum dikirim ke worker.
					</p>
				</div>
				<button type="button" onclick={close} disabled={sending} class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50" aria-label="Tutup">
					<X size={18} />
				</button>
			</header>

			<div class="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
				{#if options.length === 0}
					<p class="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
						Belum ada loker terpilih.
					</p>
				{:else}
					<div class="flex gap-1.5 overflow-x-auto pb-1">
						{#each options as option (option.key)}
							<button
								type="button"
								onclick={() => (activeKey = option.key)}
								class="shrink-0 rounded-lg border px-3 py-2 text-left transition {activeKey === option.key
									? 'border-indigo-200 bg-indigo-50 text-indigo-800'
									: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}"
							>
								<span class="block max-w-44 truncate text-[11px] font-bold">{option.jobTitle}</span>
								<span class="block max-w-44 truncate text-[9px] opacity-70">{option.companyName}</span>
								{#if previews[option.key]?.loading}
									<span class="mt-1 flex items-center gap-1 text-[8px] font-semibold"><Spinner size={10} label="Menyiapkan email" /> Menyiapkan...</span>
								{:else if previews[option.key]?.error}
									<span class="mt-1 block text-[8px] font-semibold text-rose-600">Draft gagal dimuat</span>
								{:else}
									<span class="mt-1 block text-[8px] font-semibold text-emerald-600">Draft siap</span>
								{/if}
							</button>
						{/each}
					</div>

					{#if active}
						<div class="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
							<div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
								<div>
									<p class="text-xs font-bold text-slate-900">{active.jobTitle}</p>
									<p class="text-[10px] text-slate-500">{active.companyName} · {active.recipientEmail || 'Email HRD belum diisi'}</p>
								</div>
								<span class="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-500">1 email</span>
							</div>

							{#if activePreview?.loading}
								<div class="mt-4 flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-5 text-xs text-indigo-700">
									<Spinner label="AI menulis email" /> AI sedang menulis subjek & body email...
								</div>
							{:else}
								{#if activePreview?.error}
									<div class="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
										{activePreview.error} Kamu tetap bisa menulis draft manual di bawah.
									</div>
								{/if}

								<label class="mt-4 block space-y-1">
									<span class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Subjek</span>
									<input
										value={activePreview?.subject ?? ''}
										maxlength="200"
										oninput={(event) => onupdate(active.key, 'subject', event.currentTarget.value)}
										placeholder="Lamaran {active.jobTitle} - Nama Kamu"
										class="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/40 px-3 text-xs font-medium text-slate-800 outline-none focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
									/>
								</label>

								<label class="mt-3 block space-y-1">
									<span class="flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-slate-400">
										<span>Body email</span>
										<span class="font-normal normal-case tracking-normal text-slate-400">{(activePreview?.body ?? '').length}/12.000</span>
									</span>
									<textarea
										rows="11"
										maxlength="12000"
										value={activePreview?.body ?? ''}
										oninput={(event) => onupdate(active.key, 'body', event.currentTarget.value)}
										placeholder="Tulis body email lamaran..."
										class="w-full resize-y rounded-lg border border-slate-200 bg-slate-50/40 px-3 py-2.5 text-xs leading-6 text-slate-800 outline-none focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
									></textarea>
								</label>

								<p class="mt-2 flex items-center gap-1 text-[9px] text-slate-400">
									<Mail size={11} /> CV dan sertifikat akan dilampirkan otomatis oleh worker.
								</p>
							{/if}
						</div>
					{/if}
				{/if}
			</div>

			<footer class="shrink-0 border-t border-slate-200 bg-white px-5 py-3.5 sm:px-6">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div class="text-[11px] text-slate-500">
						<p><strong class="text-slate-800">{formatNumber(options.length)} lamaran</strong> · estimasi {formatNumber(totalCredits)} kredit</p>
						<p class="text-[10px] text-slate-400">Saldo kredit saat ini: {formatNumber(creditBalance)}</p>
						{#if hasDraftError}
							<p class="text-[10px] text-amber-600">Sebagian draft gagal dimuat dan dapat diedit manual.</p>
						{/if}
					</div>
					<div class="flex flex-wrap justify-end gap-2">
						<button type="button" onclick={close} disabled={sending} class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60">
							Kembali
						</button>
						<button
							type="button"
							onclick={onsend}
							disabled={sending || loadingReviews || options.length === 0}
							class="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{#if sending}<Spinner label="Mengirim lamaran" />{:else}<Send size={15} />{/if}
							Kirim Lamaran Otomatis
						</button>
					</div>
				</div>
			</footer>
		</aside>
	</div>
{/if}
