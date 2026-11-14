<script lang="ts">
	import { AlertTriangle, ArrowRight, CheckCircle2, ShieldAlert, X } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import type {
		AutoApplyJobOption,
		EmailDraftPreview,
		RoleMatchSeverity
	} from '#lib/services/autoApplyApi.js';

	interface Props {
		open: boolean;
		option: AutoApplyJobOption | null;
		preview: EmailDraftPreview | null;
		loading: boolean;
		error: string | null;
		onapprove: () => void;
		ondecline: () => void;
	}

	let { open, option, preview, loading, error, onapprove, ondecline }: Props = $props();

	const severityLabel: Record<string, string> = {
		NONE: 'Sesuai',
		LOW: 'Risiko rendah',
		MEDIUM: 'Lintas bidang',
		HIGH: 'Tidak sesuai'
	};

	const severityTone: Record<string, string> = {
		NONE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
		LOW: 'bg-sky-50 text-sky-700 ring-sky-200',
		MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-200',
		HIGH: 'bg-rose-50 text-rose-700 ring-rose-200'
	};

	const suitability = $derived(preview?.suitability ?? null);
	const severity = $derived((suitability?.severity ?? 'MEDIUM') as RoleMatchSeverity);
	const matchedSkills = $derived(suitability?.matchedSkills ?? []);
	const transferableSkills = $derived(suitability?.transferableSkills ?? []);
	const missingSkills = $derived(suitability?.missingSkills ?? []);
	const hardBlockers = $derived(suitability?.hardBlockers ?? []);

	function close() {
		if (loading) return;
		ondecline();
	}
</script>

{#if open && option}
	<div
		class="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
		role="alertdialog"
		aria-modal="true"
		aria-labelledby="role-match-consent-title"
		aria-describedby="role-match-consent-description"
	>
		<button
			type="button"
			class="absolute inset-0 h-full w-full cursor-default"
			aria-label="Tutup persetujuan lintas bidang"
			onclick={close}
		></button>
		<div class="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
			<div class="flex items-start justify-between gap-3">
				<div class="flex items-start gap-3">
					<span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
						<ShieldAlert size={22} />
					</span>
					<div>
						<p class="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-600">
							Persetujuan diperlukan
						</p>
						<h2 id="role-match-consent-title" class="mt-1 text-lg font-bold tracking-tight text-slate-950">
							Lamaran lintas bidang
						</h2>
						<p id="role-match-consent-description" class="mt-1 text-xs leading-5 text-slate-500">
							AI menilai CV dan pengalamanmu lebih kuat di bidang lain. Kamu tetap bisa
							melamar, tetapi email akan ditulis secara jujur tentang kesediaan belajar dan
							skill yang bisa dialihkan.
						</p>
					</div>
				</div>
				<button
					type="button"
					onclick={close}
					disabled={loading}
					class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
					aria-label="Tutup"
				>
					<X size={17} />
				</button>
			</div>

			<div class="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
				<div class="flex flex-wrap items-start justify-between gap-2">
					<div>
						<p class="text-sm font-bold text-slate-900">{option.jobTitle}</p>
						<p class="text-[11px] text-slate-500">{option.companyName}</p>
					</div>
					<span class="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ring-1 ring-inset {severityTone[severity] ?? severityTone.MEDIUM}">
						{severityLabel[severity] ?? severity}
					</span>
				</div>
				{#if suitability?.reason}
					<p class="mt-2 text-[11px] leading-5 text-slate-600">{suitability.reason}</p>
				{/if}
				{#if suitability?.confidence != null}
					<p class="mt-1 text-[10px] text-slate-400">
						Keyakinan analisis: {Math.round(suitability.confidence * 100)}%
					</p>
				{/if}
			</div>

			{#if matchedSkills.length > 0 || transferableSkills.length > 0 || missingSkills.length > 0}
				<div class="mt-3 grid gap-2 sm:grid-cols-3">
					{#if matchedSkills.length > 0}
						<div class="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
							<p class="text-[9px] font-bold uppercase tracking-wide text-emerald-700">Skill cocok</p>
							<ul class="mt-1.5 space-y-1">
								{#each matchedSkills as item}
									<li class="flex items-start gap-1.5 text-[10px] leading-4 text-slate-600">
										<CheckCircle2 size={11} class="mt-0.5 shrink-0 text-emerald-600" />{item}
									</li>
								{/each}
							</ul>
						</div>
					{/if}
					{#if transferableSkills.length > 0}
						<div class="rounded-xl border border-sky-100 bg-sky-50/50 p-3">
							<p class="text-[9px] font-bold uppercase tracking-wide text-sky-700">Bisa dialihkan</p>
							<ul class="mt-1.5 space-y-1">
								{#each transferableSkills as item}
									<li class="flex items-start gap-1.5 text-[10px] leading-4 text-slate-600">
										<ArrowRight size={11} class="mt-0.5 shrink-0 text-sky-600" />{item}
									</li>
								{/each}
							</ul>
						</div>
					{/if}
					{#if missingSkills.length > 0}
						<div class="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
							<p class="text-[9px] font-bold uppercase tracking-wide text-amber-700">Perlu dipelajari</p>
							<ul class="mt-1.5 space-y-1">
								{#each missingSkills as item}
									<li class="flex items-start gap-1.5 text-[10px] leading-4 text-slate-600">
										<AlertTriangle size={11} class="mt-0.5 shrink-0 text-amber-600" />{item}
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			{/if}

			{#if hardBlockers.length > 0}
				<div class="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
					<p class="text-[9px] font-bold uppercase tracking-wide text-rose-700">Hard blocker</p>
					<ul class="mt-1.5 space-y-1">
						{#each hardBlockers as item}
							<li class="flex items-start gap-1.5 text-[10px] leading-4 text-rose-800">
								<AlertTriangle size={11} class="mt-0.5 shrink-0" />{item}
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if suitability?.suggestion}
				<div class="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5">
					<p class="text-[9px] font-bold uppercase tracking-wide text-indigo-700">Saran</p>
					<p class="mt-1 text-[11px] leading-5 text-indigo-800">{suitability.suggestion}</p>
				</div>
			{/if}

			{#if error}
				<div class="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] leading-5 text-rose-700" role="alert">
					{error}
				</div>
			{/if}

			<div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<button
					type="button"
					onclick={close}
					disabled={loading}
					class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
				>
					Batal
				</button>
				<button
					type="button"
					onclick={onapprove}
					disabled={loading}
					class="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-4 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{#if loading}
						<Spinner label="Membuat draft lintas bidang" /> Membuat draft...
					{:else}
						<CheckCircle2 size={14} /> Setujui &amp; buat draft
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
