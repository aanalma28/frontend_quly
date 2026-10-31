<script lang="ts">
	import { AlertTriangle, Coins, CreditCard, Sparkles, X } from '@lucide/svelte';
	import type { TopupPackage, UserBenefitQuota } from '#lib/services/billingApi.js';
	import { formatNumber, formatRupiah, isUnlimitedQuota } from '#lib/utils/billing.js';

	interface Props {
		open: boolean;
		title?: string;
		message?: string;
		benefit?: UserBenefitQuota | null;
		topupPackages?: TopupPackage[];
		creditBalance?: number | null;
		canContinue?: boolean;
		continueLabel?: string;
		onclose: () => void;
		oncontinue?: () => void;
	}

	let {
		open,
		title = 'Kuota habis',
		message = 'Kuota benefit Anda habis. Gunakan kredit yang tersedia atau top-up terlebih dahulu.',
		benefit = null,
		topupPackages = [],
		creditBalance = null,
		canContinue = false,
		continueLabel = 'Gunakan kredit',
		onclose,
		oncontinue
	}: Props = $props();
</script>

<svelte:window
	onkeydown={(event) => {
		if (open && event.key === 'Escape') {
			event.preventDefault();
			onclose();
		}
	}}
/>

{#if open}
	<div
		class="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="quota-modal-title"
	>
		<button
			type="button"
			class="absolute inset-0 h-full w-full cursor-default"
			aria-label="Tutup dialog"
			onclick={onclose}
		></button>

		<div class="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
			<div class="flex items-start gap-3">
				<span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
					{#if benefit}
						<Coins size={20} />
					{:else}
						<AlertTriangle size={20} />
					{/if}
				</span>
				<div class="min-w-0 flex-1">
					<h2 id="quota-modal-title" class="text-lg font-bold tracking-tight text-slate-950">{title}</h2>
					<p class="mt-1 text-sm leading-6 text-slate-600">{message}</p>
				</div>
				<button
					type="button"
					onclick={onclose}
					class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
					aria-label="Tutup"
				>
					<X size={18} />
				</button>
			</div>

			{#if benefit}
				<div class="mt-5 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
					<p class="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">{benefit.name}</p>
					<div class="mt-3 grid grid-cols-2 gap-3">
						<div class="rounded-lg bg-white/70 px-3 py-2">
							<p class="text-[10px] uppercase tracking-wide text-slate-500">Kuota tersisa</p>
							<p class="mt-0.5 text-sm font-bold text-slate-900">
								{isUnlimitedQuota(benefit.limit)
									? 'Tanpa batas'
									: `${formatNumber(Math.max(benefit.remaining, 0))} / ${formatNumber(benefit.limit)}`}
							</p>
						</div>
						<div class="rounded-lg bg-white/70 px-3 py-2">
							<p class="text-[10px] uppercase tracking-wide text-slate-500">Biaya per pakai</p>
							<p class="mt-0.5 text-sm font-bold text-slate-900">
								{formatNumber(benefit.creditCost)} kredit
							</p>
						</div>
						<div class="rounded-lg bg-white/70 px-3 py-2">
							<p class="text-[10px] uppercase tracking-wide text-slate-500">Saldo kredit</p>
							<p class="mt-0.5 text-sm font-bold text-slate-900">
								{creditBalance === null ? '—' : formatNumber(creditBalance)}
							</p>
						</div>
						<div class="rounded-lg bg-white/70 px-3 py-2">
							<p class="text-[10px] uppercase tracking-wide text-slate-500">Estimasi biaya</p>
							<p class="mt-0.5 text-sm font-bold text-slate-900">{formatRupiah(benefit.overageCostIdr)}</p>
						</div>
					</div>
				</div>
			{:else}
				<div class="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
					Fitur ini menggunakan benefit AI yang belum aktif di paket Anda. Pilih paket atau top-up
					kredit untuk melanjutkan.
				</div>
			{/if}

			{#if topupPackages.length > 0}
				<div class="mt-5">
					<p class="flex items-center gap-1.5 text-xs font-bold text-slate-800">
						<Sparkles size={14} class="text-violet-600" /> Pilihan top-up kredit
					</p>
					<div class="mt-2 grid gap-2 sm:grid-cols-2">
						{#each topupPackages as pack (pack.id)}
							<div class="rounded-xl border border-slate-200 bg-white p-3">
								{#if pack.badge || pack.isPopular}
									<span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[8px] font-bold text-emerald-700">
										{pack.badge ?? 'POPULER'}
									</span>
								{/if}
								<p class="mt-1 text-xs font-semibold text-slate-800">{pack.name}</p>
								<p class="mt-0.5 text-[10px] text-slate-500">
									{formatNumber(pack.totalCredits)} kredit
								</p>
								<p class="mt-1 text-sm font-bold text-slate-900">{formatRupiah(pack.priceIdr)}</p>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<button
					type="button"
					onclick={onclose}
					class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
				>
					Tutup
				</button>
				{#if canContinue && oncontinue}
					<button
						type="button"
						onclick={oncontinue}
						class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
					>
						<CreditCard size={15} /> {continueLabel}
					</button>
				{/if}
				<a
					href="/billing#kredit-kilat"
					class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
				>
					<Coins size={15} /> Top-up Kredit
				</a>
			</div>
		</div>
	</div>
{/if}
