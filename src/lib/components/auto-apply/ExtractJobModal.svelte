<script lang="ts">
	import { onDestroy } from 'svelte';
	import {
		AlertTriangle,
		CheckCircle2,
		FileImage,
		FileText,
		Image as ImageIcon,
		Plus,
		Sparkles,
		X
	} from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import { extractExternalJobApi, type ExtractedJob } from '#lib/services/autoApplyApi.js';
	import type { AutoApplyJobOption } from '#lib/services/autoApplyApi.js';
	import type { UserBenefitQuota } from '#lib/services/billingApi.js';
	import { ApiError } from '#lib/utils/api.js';
	import { benefitAccessMode, freeLifetimeRemaining } from '#lib/utils/benefitAccess.js';
	import { formatNumber, formatRupiah, isUnlimitedQuota } from '#lib/utils/billing.js';

	interface Props {
		open: boolean;
		benefit?: UserBenefitQuota | null;
		creditBalance?: number;
		onclose: () => void;
		onadded: (job: AutoApplyJobOption) => void;
		onusage?: () => void;
	}

	let { open, benefit = null, creditBalance = 0, onclose, onadded, onusage }: Props = $props();

	let mode = $state<'text' | 'image'>('text');
	let text = $state('');
	let imageFile = $state<File | null>(null);
	let imagePreview = $state<string | null>(null);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let result = $state<ExtractedJob | null>(null);
	let formError = $state<string | null>(null);
	let usageMessage = $state<string | null>(null);

	const cost = $derived(benefit?.creditCost ?? 2);
	const accessMode = $derived(
		benefit ? benefitAccessMode(benefit, creditBalance) : null
	);
	const blocked = $derived(benefit !== null && accessMode === 'none');

	$effect(() => {
		if (typeof document === 'undefined' || !open) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});

	function revokePreview() {
		if (imagePreview) {
			URL.revokeObjectURL(imagePreview);
			imagePreview = null;
		}
	}

	function reset() {
		mode = 'text';
		text = '';
		imageFile = null;
		revokePreview();
		isLoading = false;
		error = null;
		result = null;
		formError = null;
		usageMessage = null;
	}

	function close() {
		if (isLoading) return;
		reset();
		onclose();
	}

	function selectFile(file: File | undefined) {
		error = null;
		if (!file) return;
		if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
			error = 'Poster harus berupa gambar JPG atau PNG.';
			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			error = 'Ukuran poster maksimal 5 MB.';
			return;
		}
		revokePreview();
		imageFile = file;
		imagePreview = URL.createObjectURL(file);
	}

	function handleFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		selectFile(input.files?.[0]);
		input.value = '';
	}

	async function analyse() {
		if (isLoading || blocked) return;
		error = null;
		formError = null;
		result = null;
		usageMessage = null;

		if (mode === 'text' && !text.trim()) {
			error = 'Tempel teks lowongan terlebih dahulu.';
			return;
		}
		if (mode === 'image' && !imageFile) {
			error = 'Pilih gambar poster lowongan terlebih dahulu.';
			return;
		}

		isLoading = true;
		try {
			const response = await extractExternalJobApi({
				text: mode === 'text' ? text : undefined,
				image: mode === 'image' ? imageFile : null
			});
			onusage?.();
			if (!response.valid) {
				error = response.reason || 'Konten yang dikirim bukan lowongan kerja.';
				return;
			}
			result = {
				companyName: response.job?.companyName ?? '',
				jobTitle: response.job?.jobTitle ?? '',
				recipientEmail: response.job?.recipientEmail ?? '',
				description: response.job?.description ?? ''
			};
			usageMessage = response.charged
				? `Ekstraksi selesai. ${response.usage.creditsCharged > 0 ? `${response.usage.creditsCharged} kredit terpakai.` : 'Menggunakan kuota paket.'}`
				: 'Konten tidak valid; kuota/kredit dikembalikan.';
		} catch (caught) {
			if (caught instanceof ApiError && caught.code === 'BENEFIT_QUOTA_EXHAUSTED') {
				error = `${caught.message}. Top-up kredit untuk melanjutkan ekstraksi.`;
			} else {
				error = caught instanceof Error ? caught.message : 'Loker belum dapat dianalisis.';
			}
		} finally {
			isLoading = false;
		}
	}

	function addJob() {
		if (!result) return;
		formError = null;
		const jobTitle = result.jobTitle?.trim() ?? '';
		const companyName = result.companyName?.trim() ?? '';
		const recipientEmail = result.recipientEmail?.trim().toLowerCase() ?? '';
		if (!jobTitle || !companyName) {
			formError = 'Nama perusahaan dan posisi wajib diisi.';
			return;
		}
		if (recipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
			formError = 'Format email HRD tidak valid.';
			return;
		}
		onadded({
			key: `manual:${crypto.randomUUID()}`,
			source: 'manual',
			jobTitle,
			companyName,
			recipientEmail,
			description: result.description?.trim() || undefined,
			needsEmail: !recipientEmail,
			selected: true
		});
		reset();
		onclose();
	}

	onDestroy(() => {
		revokePreview();
	});
</script>

{#if open}
	<div class="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="extract-title">
		<button type="button" class="absolute inset-0 h-full w-full cursor-default" aria-label="Tutup" onclick={close}></button>
		<div class="relative z-10 max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
			<header class="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
				<div>
					<p class="text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-600">Loker mandiri</p>
					<h2 id="extract-title" class="mt-1 text-xl font-bold tracking-tight text-slate-950">
						Ekstrak loker dengan AI
					</h2>
					<p class="mt-1 text-xs text-slate-500">
						Tempel teks atau unggah poster. AI memvalidasi dan mengekstrak data HRD.
					</p>
				</div>
				<button type="button" onclick={close} disabled={isLoading} class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50" aria-label="Tutup">
					<X size={18} />
				</button>
			</header>

			<div class="space-y-4 px-5 py-5 sm:px-6">
				<div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5">
					<p class="flex items-center gap-1.5 text-xs text-amber-800">
						<Sparkles size={14} />
						{#if benefit}
							{#if freeLifetimeRemaining(benefit) > 0}
								Ekstraksi gratis tersisa <strong>{formatNumber(freeLifetimeRemaining(benefit))}×</strong>
							{:else if isUnlimitedQuota(benefit.limit)}
								Kuota ekstraksi: <strong>tanpa batas</strong>
							{:else if benefit.remaining > 0}
								Sisa kuota ekstraksi: <strong>{formatNumber(benefit.remaining)}/{formatNumber(benefit.limit)}</strong>
							{:else if accessMode === 'credit'}
								Kuota habis · akan memakai <strong>{cost} kredit</strong>
								<span class="text-amber-700/70">(± {formatRupiah(benefit.overageCostIdr)})</span>
							{:else}
								<strong>Kuota &amp; kredit tidak cukup</strong>
							{/if}
						{:else}
							Biaya ekstraksi: <strong>{cost} kredit</strong>
						{/if}
					</p>
					<a href="/billing#kredit-kilat" class="text-[11px] font-semibold text-amber-800 underline">Top-up kredit</a>
				</div>

				<div class="flex rounded-xl bg-slate-100 p-1">
					<button
						type="button"
						onclick={() => { mode = 'text'; error = null; }}
						class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition {mode === 'text' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}"
					>
						<FileText size={14} /> Teks loker
					</button>
					<button
						type="button"
						onclick={() => { mode = 'image'; error = null; }}
						class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition {mode === 'image' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}"
					>
						<FileImage size={14} /> Poster gambar
					</button>
				</div>

				{#if !result}
					{#if mode === 'text'}
						<label class="block space-y-1.5 text-xs font-semibold text-slate-600">
							Teks lowongan
							<textarea
								bind:value={text}
								rows="8"
								maxlength="20000"
								placeholder="Tempel caption lowongan, email HRD, kualifikasi, dan deskripsi..."
								class="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 text-sm font-normal leading-6 text-slate-800 outline-none focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
							></textarea>
							<span class="text-[10px] font-normal text-slate-400">{text.length}/20.000 karakter</span>
						</label>
					{:else}
						<div>
							<label class="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-8 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40">
								{#if imagePreview}
									<span class="flex size-16 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
										<img src={imagePreview} alt="Pratinjau poster" class="max-h-16 w-full object-contain" />
									</span>
								{:else}
									<span class="flex size-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><ImageIcon size={22} /></span>
								{/if}
								<span class="mt-3 text-xs font-semibold text-slate-700">
									{imageFile ? imageFile.name : 'Pilih poster JPG/PNG'}
								</span>
								<span class="mt-1 text-[10px] text-slate-400">Maksimal 5 MB</span>
								<input type="file" accept="image/jpeg,image/png" onchange={handleFile} class="sr-only" />
							</label>
							{#if imageFile}
								<button type="button" onclick={() => { imageFile = null; revokePreview(); }} class="mt-2 text-[10px] font-semibold text-rose-600 hover:text-rose-800">
									Hapus gambar
								</button>
							{/if}
						</div>
					{/if}

					{#if error}
						<div class="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-700" role="alert">
							<p class="flex items-start gap-1.5"><AlertTriangle size={14} class="mt-0.5 shrink-0" /> {error}</p>
						</div>
					{/if}

					<button
						type="button"
						onclick={() => void analyse()}
						disabled={isLoading || blocked}
						class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{#if isLoading}
							<Spinner label="Menganalisis loker" /> Menganalisis & Memvalidasi Loker via AI...
						{:else}
							<Sparkles size={16} /> Analisis & Validasi Loker
						{/if}
					</button>
				{:else}
					<div class="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
						<CheckCircle2 size={15} /> Loker valid. Periksa dan sesuaikan hasil ekstraksi.
					</div>
					{#if usageMessage}
						<p class="text-[10px] text-slate-500">{usageMessage}</p>
					{/if}

					<div class="grid gap-3 sm:grid-cols-2">
						<label class="space-y-1 text-[11px] font-semibold text-slate-500">
							Perusahaan
							<input bind:value={result.companyName} class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-800 outline-none focus:border-indigo-300" />
						</label>
						<label class="space-y-1 text-[11px] font-semibold text-slate-500">
							Posisi
							<input bind:value={result.jobTitle} class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-800 outline-none focus:border-indigo-300" />
						</label>
						<label class="space-y-1 text-[11px] font-semibold text-slate-500 sm:col-span-2">
							Email HRD
							<input bind:value={result.recipientEmail} type="email" placeholder="hrd@perusahaan.com" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-800 outline-none focus:border-indigo-300" />
							<span class="text-[10px] font-normal text-slate-400">Jika kosong, isi email sebelum mengirim lamaran.</span>
						</label>
						<label class="space-y-1 text-[11px] font-semibold text-slate-500 sm:col-span-2">
							Deskripsi
							<textarea bind:value={result.description} rows="4" class="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-xs leading-5 text-slate-800 outline-none focus:border-indigo-300"></textarea>
						</label>
					</div>

					{#if formError}
						<p class="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">{formError}</p>
					{/if}

					<div class="flex flex-wrap justify-end gap-2">
						<button type="button" onclick={() => { result = null; error = null; }} class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50">
							Analisis ulang
						</button>
						<button type="button" onclick={addJob} class="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700">
							<Plus size={15} /> Tambahkan ke daftar
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
