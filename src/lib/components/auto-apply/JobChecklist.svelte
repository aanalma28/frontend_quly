<script lang="ts">
	import {
		AlertCircle,
		Bookmark,
		BriefcaseBusiness,
		Eye,
		MapPin,
		Plus,
		Sparkles
	} from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import type { AutoApplyJobOption } from '#lib/services/autoApplyApi.js';
	import type { UserBenefitQuota } from '#lib/services/billingApi.js';
	import { formatNumber, isUnlimitedQuota } from '#lib/utils/billing.js';

	interface Props {
		options: AutoApplyJobOption[];
		selectedCount: number;
		creditBalance: number;
		emailBenefit: UserBenefitQuota | null;
		quotaRemaining: number;
		creditsRequired: number;
		scoringKey: string | null;
		onToggle: (key: string) => void;
		onEmailChange: (key: string, value: string) => void;
		ondetail: (option: AutoApplyJobOption) => void;
		onscore: (option: AutoApplyJobOption) => void;
		onselectall: () => void;
		onclear: () => void;
		onextract: () => void;
	}

	let {
		options,
		selectedCount,
		creditBalance,
		emailBenefit,
		quotaRemaining,
		creditsRequired,
		scoringKey,
		onToggle,
		onEmailChange,
		ondetail,
		onscore,
		onselectall,
		onclear,
		onextract
	}: Props = $props();

	const bookmarks = $derived(options.filter((option) => option.source === 'bookmark'));
	const manualJobs = $derived(options.filter((option) => option.source === 'manual'));
	const needsEmailCount = $derived(
		options.filter((option) => option.selected && option.needsEmail).length
	);

	function optionLabel(option: AutoApplyJobOption): string {
		return option.source === 'bookmark' ? 'Bookmark' : 'Loker tambahan';
	}

	function creditCopy(): string {
		if (!emailBenefit) return 'Benefit Email Lamaran belum aktif di paketmu.';
		if (isUnlimitedQuota(emailBenefit.limit)) return 'Kuota email unlimited.';
		if (creditsRequired === 0) {
			return `Tertutup kuota (${formatNumber(Math.max(quotaRemaining, 0))} tersisa).`;
		}
		return `${formatNumber(creditsRequired)} kredit akan dipakai dari saldo ${formatNumber(creditBalance)}.`;
	}
</script>

<section class="space-y-4">
	<div class="flex flex-wrap items-end justify-between gap-2">
		<div>
			<p class="text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-600">Langkah 3</p>
			<h2 class="mt-1 text-lg font-bold tracking-tight text-slate-950">Pilih loker yang dilamar</h2>
			<p class="mt-1 text-xs text-slate-500">Centang satu atau beberapa loker. Setiap email lamaran memakai 1 kredit.</p>
		</div>
		<div class="flex flex-wrap gap-1.5">
			<button type="button" onclick={onextract} class="inline-flex h-8 items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 text-[11px] font-semibold text-indigo-700 transition hover:bg-indigo-100">
				<Plus size={13} /> Tambah loker
			</button>
			{#if options.length > 0}
				<button type="button" onclick={onselectall} class="h-8 rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50">
					Pilih semua
				</button>
				{#if selectedCount > 0}
					<button type="button" onclick={onclear} class="h-8 rounded-lg px-2.5 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100">
						Hapus pilihan
					</button>
				{/if}
			{/if}
		</div>
	</div>

	<div class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-800">
		<AlertCircle size={14} class="mt-0.5 shrink-0" />
		<span>
			Data lowongan dan email HRD bisa berasal dari ekstraksi AI. Periksa ulang <strong>email, subjek, dan body</strong> sebelum mengirim lamaran.
		</span>
	</div>

	<div class="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5 text-[11px]">
		<span class="font-semibold text-indigo-800">
			{formatNumber(selectedCount)} dipilih × {formatNumber(emailBenefit?.creditCost ?? 1)} kredit
		</span>
		<span class="text-indigo-700/60">·</span>
		<span class="text-indigo-700/80">{creditCopy()}</span>
		{#if emailBenefit && !isUnlimitedQuota(emailBenefit.limit)}
			<span class="text-indigo-700/60">·</span>
			<span class="text-indigo-700/70">Kuota tersisa {formatNumber(Math.max(quotaRemaining, 0))}</span>
		{/if}
	</div>

	{#if needsEmailCount > 0}
		<div class="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-800" role="status">
			<AlertCircle size={14} class="mt-0.5 shrink-0" />
			<span>{needsEmailCount} loker terpilih belum punya email HRD. Isi email sebelum mengirim.</span>
		</div>
	{/if}

	{#if options.length === 0}
		<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-9 text-center">
			<span class="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
				<Bookmark size={23} />
			</span>
			<h3 class="mt-3 text-sm font-bold text-slate-900">Belum ada loker di daftar</h3>
			<p class="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
				Simpan loker dari Pusat Lowongan atau tambahkan loker mandiri dari poster/teks.
			</p>
			<div class="mt-4 flex flex-wrap justify-center gap-2">
				<a href="/dashboard/manual-hub" class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
					<BriefcaseBusiness size={14} /> Buka Pusat Lowongan
				</a>
				<button type="button" onclick={onextract} class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700">
					<Plus size={14} /> Tambah loker manual
				</button>
			</div>
		</div>
	{:else}
		<div class="space-y-2">
			{#if bookmarks.length > 0}
				<p class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
					<Bookmark size={12} /> Dari bookmark
				</p>
				{#each bookmarks as option (option.key)}
					{@render jobRow(option)}
				{/each}
			{/if}
			{#if manualJobs.length > 0}
				<p class="mt-4 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
					<Sparkles size={12} /> Loker tambahan
				</p>
				{#each manualJobs as option (option.key)}
					{@render jobRow(option)}
				{/each}
			{/if}
		</div>
	{/if}
</section>

{#snippet jobRow(option: AutoApplyJobOption)}
	<article class="rounded-xl border bg-white p-3.5 shadow-sm transition {option.selected ? 'border-indigo-200 ring-1 ring-inset ring-indigo-100' : 'border-slate-200'}">
		<div class="flex items-start gap-3">
			<button
				type="button"
				onclick={() => onToggle(option.key)}
				aria-pressed={option.selected}
				aria-label={option.selected ? `Batalkan pilihan ${option.jobTitle}` : `Pilih ${option.jobTitle}`}
				class="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded border transition {option.selected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-transparent hover:border-indigo-400'}"
			>
				<svg viewBox="0 0 16 16" class="size-3.5" fill="none" stroke="currentColor" stroke-width="2">
					<path d="m3 8 3 3 7-7" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</button>

			<div class="min-w-0 flex-1">
				<div class="flex flex-wrap items-start justify-between gap-2">
					<div class="min-w-0">
						<h3 class="truncate text-sm font-bold text-slate-900">{option.jobTitle}</h3>
						<p class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
							<span>{option.companyName}</span>
							{#if option.location}<span class="inline-flex items-center gap-0.5"><MapPin size={11} /> {option.location}</span>{/if}
						</p>
					</div>
					<div class="flex shrink-0 flex-wrap items-center gap-1">
						<span class="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-500">{optionLabel(option)}</span>
						{#if option.matchScore !== null && option.matchScore !== undefined}
							<span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[8px] font-bold text-emerald-700">Skor {option.matchScore}</span>
						{/if}
					</div>
				</div>

				{#if option.selected}
					<label class="mt-2.5 block">
						<span class="text-[9px] font-bold uppercase tracking-wide text-slate-400">Email HRD</span>
						<div class="mt-1 flex items-center gap-1.5">
							<input
								type="email"
								value={option.recipientEmail}
								oninput={(event) => onEmailChange(option.key, event.currentTarget.value)}
								placeholder="hrd@perusahaan.com"
								class="h-8 min-w-0 flex-1 rounded-lg border px-2.5 text-[11px] text-slate-800 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 {option.needsEmail ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 bg-slate-50/40'}"
							/>
							{#if option.needsEmail}
								<span class="shrink-0 rounded bg-amber-50 px-1.5 py-1 text-[8px] font-bold text-amber-700">Wajib</span>
							{:else}
								<span class="shrink-0 text-[9px] text-emerald-600">✓</span>
							{/if}
						</div>
					</label>
				{/if}

				<div class="mt-2.5 flex flex-wrap gap-1.5">
					<button
						type="button"
						onclick={() => ondetail(option)}
						class="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50"
					>
						<Eye size={12} /> Detail
					</button>
					<button
						type="button"
						onclick={() => onscore(option)}
						disabled={!option.jobId || scoringKey === option.key}
						title={!option.jobId ? 'Scoring tersedia untuk loker dari database' : 'Hitung kecocokan dengan profilmu'}
						class="inline-flex h-8 items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 text-[10px] font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if scoringKey === option.key}
							<Spinner size={12} label="Menghitung skor" /> Menghitung...
						{:else}
							<Sparkles size={12} />
							{option.matchScore !== null && option.matchScore !== undefined
								? `Skor ${option.matchScore}`
								: 'Scoring'}
						{/if}
					</button>
				</div>
			</div>
		</div>
	</article>
{/snippet}
