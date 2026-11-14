<script lang="ts">
	import { AlertTriangle, CheckCircle2, ShieldAlert, X } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import type { RoleMatchErrorPayload } from '#lib/services/autoApplyApi.js';

	interface Props {
		open: boolean;
		payload: RoleMatchErrorPayload | null;
		approving: boolean;
		onclose: () => void;
		onapprove: () => void;
	}

	let { open, payload, approving, onclose, onapprove }: Props = $props();

	const isConsentRequired = $derived(payload?.code === 'CROSS_FIELD_CONSENT_REQUIRED');
	const items = $derived(payload?.items ?? []);
</script>

{#if open && payload}
	<div
		class="fixed inset-0 z-[96] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
		role="alertdialog"
		aria-modal="true"
		aria-labelledby="role-match-error-title"
	>
		<div class="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
			<div class="flex items-start justify-between gap-3">
				<div class="flex items-start gap-3">
					<span
						class="flex size-11 shrink-0 items-center justify-center rounded-xl {isConsentRequired
							? 'bg-amber-50 text-amber-600'
							: 'bg-rose-50 text-rose-600'}"
					>
						{#if isConsentRequired}
							<ShieldAlert size={22} />
						{:else}
							<AlertTriangle size={22} />
						{/if}
					</span>
					<div>
						<p
							class="text-[10px] font-bold uppercase tracking-[0.15em] {isConsentRequired
								? 'text-amber-600'
								: 'text-rose-600'}"
						>
							{isConsentRequired ? 'Persetujuan lintas bidang' : 'Lamaran tidak dapat diproses'}
						</p>
						<h2 id="role-match-error-title" class="mt-1 text-lg font-bold tracking-tight text-slate-950">
							{isConsentRequired
								? 'Beberapa loker memerlukan persetujuan'
								: 'Ada lowongan yang tidak sesuai'}
						</h2>
						<p class="mt-1 text-xs leading-5 text-slate-500">
							{payload.message ??
								'Backend menolak sebagian atau seluruh item sebelum email dibuat.'}
						</p>
					</div>
				</div>
				<button
					type="button"
					onclick={onclose}
					disabled={approving}
					class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
					aria-label="Tutup"
				>
					<X size={17} />
				</button>
			</div>

			<div class="mt-4 space-y-2">
				{#each items as item, index (item.jobId ?? index)}
					<div class="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
						<div class="flex flex-wrap items-start justify-between gap-2">
							<div>
								<p class="text-xs font-bold text-slate-900">
									{item.jobTitle ?? 'Lowongan'}
								</p>
								{#if item.companyName}
									<p class="text-[10px] text-slate-500">{item.companyName}</p>
								{/if}
							</div>
							{#if item.severity}
								<span class="rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold text-slate-500 ring-1 ring-slate-200">
									{item.severity}
								</span>
							{/if}
						</div>
						{#if item.reason}
							<p class="mt-2 text-[11px] leading-5 text-slate-600">{item.reason}</p>
						{/if}
						{#if (item.hardBlockers ?? []).length > 0}
							<div class="mt-2 rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-2">
								<p class="text-[9px] font-bold uppercase tracking-wide text-rose-700">Hard blocker</p>
								<ul class="mt-1 list-disc space-y-0.5 pl-4 text-[10px] leading-4 text-rose-800">
									{#each item.hardBlockers ?? [] as blocker}
										<li>{blocker}</li>
									{/each}
								</ul>
							</div>
						{/if}
						{#if (item.missingSkills ?? []).length > 0}
							<p class="mt-2 text-[10px] leading-4 text-slate-500">
								<strong class="text-slate-700">Perlu dipelajari:</strong>
								{(item.missingSkills ?? []).join(', ')}
							</p>
						{/if}
						{#if item.suggestion}
							<p class="mt-2 text-[10px] leading-4 text-indigo-700">
								<strong>Saran:</strong> {item.suggestion}
							</p>
						{/if}
					</div>
				{/each}
			</div>

			<div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<button
					type="button"
					onclick={onclose}
					disabled={approving}
					class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
				>
					{isConsentRequired ? 'Batal' : 'Tutup & pilih loker lain'}
				</button>
				{#if isConsentRequired}
					<button
						type="button"
						onclick={onapprove}
						disabled={approving}
						class="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-4 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{#if approving}
							<Spinner label="Mengirim ulang lamaran" /> Memproses...
						{:else}
							<CheckCircle2 size={14} /> Setujui &amp; kirim ulang
						{/if}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
