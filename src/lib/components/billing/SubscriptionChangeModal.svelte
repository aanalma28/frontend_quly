<script lang="ts">
	import { CalendarClock, Check, Info, ShieldCheck, Sparkles, X } from '@lucide/svelte';
	import type { PublicBillingPlan } from '#lib/services/billingApi.js';
	import type { SubscriptionChangeDetails } from '#lib/utils/subscription.js';
	import { formatDateShort } from '#lib/components/superadmin/format.js';
	import { formatNumber, formatRupiah, isUnlimitedQuota } from '#lib/utils/billing.js';

	interface Props {
		open: boolean;
		targetPlan: PublicBillingPlan | null;
		change: SubscriptionChangeDetails | null;
		processing?: boolean;
		error?: string | null;
		onclose: () => void;
		onconfirm: () => void;
	}

	let {
		open,
		targetPlan,
		change,
		processing = false,
		error = null,
		onclose,
		onconfirm
	}: Props = $props();

	let checked = $state(false);
	let lastOpenKey = '';

	const canConfirm = $derived(checked && !processing);

	const typeLabel = $derived(
		change?.type === 'RENEWAL'
			? 'Perpanjangan (RENEWAL)'
			: change?.type === 'UPGRADE'
				? 'Upgrade (UPGRADE)'
				: change?.type === 'DOWNGRADE'
					? 'Downgrade terjadwal (DOWNGRADE)'
					: change?.type === 'REACTIVATION'
						? 'Aktivasi ulang (REACTIVATION)'
						: 'Paket baru (NEW)'
	);

	const typeTone = $derived(
		change?.type === 'RENEWAL'
			? 'bg-sky-50 text-sky-700 ring-sky-200'
			: change?.type === 'UPGRADE'
				? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
				: change?.type === 'DOWNGRADE'
					? 'bg-amber-50 text-amber-700 ring-amber-200'
					: 'bg-indigo-50 text-indigo-700 ring-indigo-200'
	);

	const intro = $derived(
		change?.type === 'RENEWAL'
			? 'Anda memperpanjang paket yang sama.'
			: change?.type === 'UPGRADE'
				? 'Anda melakukan upgrade paket.'
				: change?.type === 'DOWNGRADE'
					? 'Anda melakukan downgrade paket.'
					: change?.type === 'REACTIVATION'
						? 'Anda mengaktifkan kembali paket berbayar.'
						: 'Anda mengaktifkan paket baru.'
	);

	const consequences = $derived.by(() => {
		if (!change) return [] as string[];
		switch (change.type) {
			case 'RENEWAL':
				return [
					'Tanggal expired akan diperpanjang sesuai durasi paket.',
					'Sisa kuota akan ditambahkan dengan kuota paket baru.',
					`Total kuota dibatasi maksimal ${change.quotaStackMultiplier}x kuota paket.`,
					'Kelebihan di atas batas maksimal akan hangus.',
					'Kredit tidak hangus.',
					'Lifetime free tidak di-reset.'
				];
			case 'UPGRADE':
				return [
					'Paket baru aktif segera setelah pembayaran berhasil.',
					'Benefit dan kuota paket lama akan diganti dengan paket baru.',
					'Sisa kuota paket lama hangus dan tidak dikonversi menjadi kredit.',
					'Tidak ada refund untuk sisa periode paket lama.',
					'Tanggal expired baru dihitung dari waktu upgrade.',
					'Kredit dan lifetime free tetap aman.'
				];
			case 'DOWNGRADE':
				return [
					'Paket saat ini tetap aktif sampai tanggal expired.',
					'Paket baru baru aktif setelah periode paket saat ini berakhir.',
					'Benefit paket saat ini tetap digunakan sampai expired.',
					'Sisa kuota paket lama tidak dikonversi menjadi kredit.',
					'Tidak ada refund.',
					'Kredit tidak hangus.',
					'Lifetime free tidak di-reset.'
				];
			default:
				return [
					'Paket aktif setelah pembayaran berhasil.',
					'Kuota dan benefit mengikuti paket yang dipilih.',
					'Tanggal expired dihitung dari waktu pembayaran berhasil.',
					'Kredit dan lifetime free tetap aman.'
				];
		}
	});

	const quotaConsequence = $derived.by(() => {
		if (!change) return '';
		switch (change.type) {
			case 'RENEWAL':
				return `Sisa kuota saat ini ditambahkan ke kuota paket baru, lalu dibatasi maksimal ${change.quotaStackMultiplier}x kuota paket. Kelebihan di atas batas akan hangus.`;
			case 'UPGRADE':
				return 'Sisa kuota paket lama hangus dan tidak dikonversi menjadi kredit. Kuota baru langsung mengikuti paket yang dipilih.';
			case 'DOWNGRADE':
				return 'Sisa kuota paket lama tetap dapat digunakan sampai paket saat ini expired. Setelah itu, kuota mengikuti paket baru tanpa konversi ke kredit.';
			default:
				return 'Kuota dan benefit mengikuti paket yang dipilih, dihitung sejak pembayaran berhasil.';
		}
	});

	function quotaText(value: number, unit: string): string {
		if (isUnlimitedQuota(value)) return 'Tanpa batas';
		return `${formatNumber(value)} ${unit}`;
	}

	$effect(() => {
		const key = `${open}:${change?.type ?? ''}:${targetPlan?.id ?? ''}`;
		if (key === lastOpenKey) return;
		lastOpenKey = key;
		checked = false;
	});

	$effect(() => {
		if (!open) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});
</script>

<svelte:window
	onkeydown={(event) => {
		if (open && event.key === 'Escape' && !processing) {
			event.preventDefault();
			onclose();
		}
	}}
/>

{#if open && change && targetPlan}
	<div class="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
		<button
			type="button"
			class="absolute inset-0 h-full w-full cursor-default"
			aria-label="Tutup ketentuan perubahan langganan"
			onclick={() => !processing && onclose()}
			tabindex="-1"
		></button>

		<div
			class="relative z-10 flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="subscription-change-title"
			aria-describedby="subscription-change-description"
		>
			<header class="flex shrink-0 items-start gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
				<span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
					<Sparkles size={20} />
				</span>
				<div class="min-w-0 flex-1">
					<h2 id="subscription-change-title" class="text-lg font-bold tracking-tight text-slate-950">
						Ketentuan Perubahan Langganan
					</h2>
					<p id="subscription-change-description" class="mt-1 text-xs leading-5 text-slate-500">
						Baca ringkasan berikut sebelum melanjutkan ke pembayaran.
					</p>
				</div>
				<button
					type="button"
					onclick={onclose}
					disabled={processing}
					class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
					aria-label="Tutup"
				>
					<X size={18} />
				</button>
			</header>

			<div class="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
				<div class="flex flex-wrap items-center gap-2">
					<span class="rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset {typeTone}">
						{typeLabel}
					</span>
					<span class="text-xs text-slate-500">
						{intro}
					</span>
				</div>

				{#if change.isExpired}
					<div class="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs leading-5 text-rose-900">
						<p class="font-bold">Langganan Anda sudah berakhir.</p>
						<ul class="mt-2 space-y-1.5">
							<li>• Kuota dan benefit paket berbayar tidak dapat digunakan lagi.</li>
							<li>• Akun kembali ke Free Plan.</li>
							<li>• Kredit yang sudah dibeli tetap tersimpan.</li>
							<li>• Lifetime free yang sudah terpakai tidak di-reset.</li>
						</ul>
					</div>
				{/if}

				<div class="mt-4 grid gap-3 sm:grid-cols-2">
					<div class="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
						<p class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Paket saat ini</p>
						<p class="mt-1 text-sm font-bold text-slate-900">{change.currentPlanName}</p>
						{#if change.isExpired && change.currentPackageName}
							<p class="mt-0.5 text-[10px] text-rose-600">
								Sebelumnya {change.currentPackageName} · sudah berakhir
							</p>
						{/if}
						<p class="mt-2 text-[10px] text-slate-500">
							Expired saat ini:
							<span class="font-semibold text-slate-700">
								{change.currentEndDate ? formatDateShort(change.currentEndDate) : 'Belum ada'}
							</span>
						</p>
					</div>

					<div class="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5">
						<p class="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Paket yang dipilih</p>
						<p class="mt-1 text-sm font-bold text-slate-900">{targetPlan.name}</p>
						<p class="mt-0.5 text-[10px] text-slate-500">
							{formatRupiah(targetPlan.priceIdr)} / {targetPlan.durationDays} hari
						</p>
						<p class="mt-2 text-[10px] text-slate-500">
							Expired setelah transaksi:
							<span class="font-semibold text-slate-700">
								{change.projectedEndDate ? formatDateShort(change.projectedEndDate) : '—'}
							</span>
						</p>
					</div>
				</div>

				{#if change.type === 'DOWNGRADE'}
					<div class="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-900">
						<CalendarClock size={16} class="mt-0.5 shrink-0" />
						<span>
							Paket <strong>{targetPlan.name}</strong> baru aktif mulai
							<strong>{change.pendingStartAt ? formatDateShort(change.pendingStartAt) : 'tanggal expired paket saat ini'}</strong>.
							Paket <strong>{change.currentPlanName}</strong> tetap aktif sampai tanggal tersebut.
						</span>
					</div>
				{/if}

				<div class="mt-4">
					<p class="flex items-center gap-1.5 text-xs font-bold text-slate-800">
						<Info size={14} class="text-indigo-600" /> Ringkasan kuota/benefit paket yang dipilih
					</p>
					<div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
						<div class="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
							<p class="text-[9px] uppercase tracking-wide text-slate-400">Email lamaran</p>
							<p class="mt-0.5 text-xs font-bold text-slate-800">
								{quotaText(targetPlan.quotas.emailApplications, 'email')}
							</p>
						</div>
						<div class="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
							<p class="text-[9px] uppercase tracking-wide text-slate-400">CV</p>
							<p class="mt-0.5 text-xs font-bold text-slate-800">
								{quotaText(targetPlan.quotas.cvExtraction, 'x')}
							</p>
						</div>
						<div class="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
							<p class="text-[9px] uppercase tracking-wide text-slate-400">Psikotes</p>
							<p class="mt-0.5 text-xs font-bold text-slate-800">
								{quotaText(targetPlan.quotas.psychotest, 'x')}
							</p>
						</div>
						<div class="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
							<p class="text-[9px] uppercase tracking-wide text-slate-400">Scoring</p>
							<p class="mt-0.5 text-xs font-bold text-slate-800">
								{quotaText(targetPlan.quotas.jobScoring, 'x')}
							</p>
						</div>
						<div class="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
							<p class="text-[9px] uppercase tracking-wide text-slate-400">Loker luar</p>
							<p class="mt-0.5 text-xs font-bold text-slate-800">
								{quotaText(targetPlan.quotas.externalJobExtraction, 'x')}
							</p>
						</div>
						<div class="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
							<p class="text-[9px] uppercase tracking-wide text-slate-400">Token AI</p>
							<p class="mt-0.5 text-xs font-bold text-slate-800">
								{quotaText(targetPlan.quotas.aiTokenLimit, 'token')}
							</p>
						</div>
					</div>
				</div>

				<div class="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5">
					<p class="text-[10px] font-bold uppercase tracking-wide text-indigo-700">
						Konsekuensi sisa kuota
					</p>
					<p class="mt-1 text-xs leading-5 text-slate-700">{quotaConsequence}</p>
				</div>

				<ul class="mt-4 space-y-2 text-xs leading-5 text-slate-600">
					{#each consequences as consequence}
						<li class="flex items-start gap-2">
							<Check size={14} class="mt-0.5 shrink-0 text-emerald-600" />
							<span>{consequence}</span>
						</li>
					{/each}
				</ul>

				<div class="mt-4 grid gap-2 sm:grid-cols-2">
					<div class="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">
						<ShieldCheck size={14} /> Kredit tidak hangus
					</div>
					<div class="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">
						<ShieldCheck size={14} /> Lifetime free tidak di-reset
					</div>
				</div>

				{#if error}
					<div class="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs leading-5 text-rose-800" role="alert">
						{error}
					</div>
				{/if}

				<label class="mt-5 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs leading-5 text-slate-700">
					<input
						type="checkbox"
						bind:checked
						disabled={processing}
						class="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
					/>
					<span>Saya sudah membaca dan memahami ketentuan perubahan langganan Fase 1.</span>
				</label>
			</div>

			<footer class="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
				<button
					type="button"
					onclick={onclose}
					disabled={processing}
					class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
				>
					Batal
				</button>
				<button
					type="button"
					onclick={onconfirm}
					disabled={!canConfirm}
					class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{#if processing}
						<CalendarClock size={15} class="animate-pulse" /> Memproses...
					{:else}
						<Check size={15} /> Setuju &amp; Lanjutkan
					{/if}
				</button>
			</footer>
		</div>
	</div>
{/if}
