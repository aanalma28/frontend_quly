<script lang="ts">
	import { onDestroy } from 'svelte';
	import {
		AlertTriangle,
		CheckCircle2,
		ChevronLeft,
		ChevronRight,
		FileImage,
		FileText,
		Image as ImageIcon,
		Plus,
		Sparkles,
		X
	} from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import {
		extractExternalJobsApi,
		type ExternalJobExtractionResult,
		type ExtractedJob
	} from '#lib/services/autoApplyApi.js';
	import type { AutoApplyJobOption } from '#lib/services/autoApplyApi.js';
	import { updateExtractedJobApi } from '#lib/services/jobApi.js';
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

	type ImageUpload = { file: File; preview: string };

	let mode = $state<'text' | 'image'>('text');
	let text = $state('');
	let imageFiles = $state<ImageUpload[]>([]);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let result = $state<ExtractedJob | null>(null);
	let results = $state<ExtractedJob[]>([]);
	let resultIndex = $state(0);
	let invalidFiles = $state<string[]>([]);
	let progress = $state<{ done: number; total: number } | null>(null);
	let formError = $state<string | null>(null);
	let usageMessage = $state<string | null>(null);
	let reanalyseConfirmOpen = $state(false);

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

	function revokePreviews() {
		for (const image of imageFiles) URL.revokeObjectURL(image.preview);
	}

	function reset() {
		mode = 'text';
		text = '';
		const previousImages = imageFiles;
		imageFiles = [];
		for (const image of previousImages) URL.revokeObjectURL(image.preview);
		isLoading = false;
		error = null;
		result = null;
		results = [];
		resultIndex = 0;
		invalidFiles = [];
		progress = null;
		formError = null;
		usageMessage = null;
		reanalyseConfirmOpen = false;
	}

	function requestReanalyse() {
		if (isLoading) return;
		reanalyseConfirmOpen = true;
	}

	function confirmReanalyse() {
		reanalyseConfirmOpen = false;
		result = null;
		results = [];
		resultIndex = 0;
		invalidFiles = [];
		formError = null;
		usageMessage = null;
	}

	function close() {
		if (isLoading) return;
		reset();
		onclose();
	}

	function goResult(direction: -1 | 1) {
		if (!result || results.length < 2) return;
		const current = result;
		const nextIndex = resultIndex + direction;
		if (nextIndex < 0 || nextIndex >= results.length) return;
		results = results.map((item, index) => (index === resultIndex ? current : item));
		resultIndex = nextIndex;
		result = results[nextIndex] ?? null;
		formError = null;
	}

	function addFiles(files: File[]) {
		error = null;
		const rejected: string[] = [];
		const accepted: ImageUpload[] = [];
		for (const file of files) {
			if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
				rejected.push(`${file.name}: bukan gambar JPG/PNG`);
				continue;
			}
			if (file.size > 5 * 1024 * 1024) {
				rejected.push(`${file.name}: ukuran lebih dari 5 MB`);
				continue;
			}
			accepted.push({ file, preview: URL.createObjectURL(file) });
		}
		if (accepted.length > 0) {
			const combined = [...imageFiles, ...accepted];
			imageFiles = combined.slice(0, 10);
			if (combined.length > 10) {
				error = 'Maksimal 10 gambar dalam satu proses ekstraksi.';
			}
		}
		if (rejected.length > 0) {
			error = rejected.join(' · ');
		}
	}

	function handleFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		addFiles(Array.from(input.files ?? []));
		input.value = '';
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		if (isLoading || mode !== 'image') return;
		addFiles(Array.from(event.dataTransfer?.files ?? []));
	}

	function removeImage(index: number) {
		const image = imageFiles[index];
		if (!image) return;
		URL.revokeObjectURL(image.preview);
		imageFiles = imageFiles.filter((_, itemIndex) => itemIndex !== index);
	}

	function toExtractedJob(response: ExternalJobExtractionResult): ExtractedJob {
		return {
			id: response.job?.id ?? response.jobId ?? undefined,
			jobId: response.jobId ?? response.job?.id ?? undefined,
			companyName: response.job?.companyName ?? '',
			jobTitle: response.job?.jobTitle ?? '',
			recipientEmail: response.job?.recipientEmail ?? '',
			description: response.job?.description ?? '',
			subjectFormat: response.job?.subjectFormat ?? null,
			applicationInstructions: response.job?.applicationInstructions ?? null,
			location: response.job?.location ?? null,
			workplaceType: response.job?.workplaceType ?? null,
			employmentType: response.job?.employmentType ?? null,
			applicationType: response.job?.applicationType ?? null,
			applicationDestination: response.job?.applicationDestination ?? null,
			sourceType: response.job?.sourceType ?? null,
			createdById: response.job?.createdById ?? null,
			isOwner: response.job?.isOwner,
			canEdit: response.job?.canEdit
		};
	}

	async function analyse() {
		if (isLoading || blocked) return;
		error = null;
		formError = null;
		result = null;
		results = [];
		resultIndex = 0;
		invalidFiles = [];
		usageMessage = null;

		if (mode === 'text' && !text.trim()) {
			error = 'Tempel teks lowongan terlebih dahulu.';
			return;
		}
		if (mode === 'image' && imageFiles.length === 0) {
			error = 'Pilih minimal satu gambar poster lowongan terlebih dahulu.';
			return;
		}

		const files = mode === 'image' ? imageFiles.map((item) => item.file) : [];
		const total = mode === 'image' ? files.length : 1;
		const collected: ExtractedJob[] = [];
		const rejected: string[] = [];
		let creditsCharged = 0;
		let deduplicatedCount = 0;

		isLoading = true;
		progress = { done: 0, total };
		try {
			const response = await extractExternalJobsApi({
				text: mode === 'text' ? text : undefined,
				images: mode === 'image' ? files : undefined
			});
			onusage?.();

			response.items.forEach((item, index) => {
				const label = files[index]?.name ?? 'Teks loker';
				if (!item.valid || !item.job) {
					rejected.push(`${label}: ${item.reason || 'bukan lowongan kerja'}`);
					return;
				}
				collected.push(toExtractedJob(item));
				creditsCharged += item.usage?.creditsCharged ?? 0;
				if (item.deduplicated) deduplicatedCount += 1;
			});

			progress = { done: total, total };
			results = collected;
			resultIndex = 0;
			result = collected[0] ?? null;
			invalidFiles = rejected;
			if (collected.length > 0) {
				const deduplicatedCopy =
					deduplicatedCount > 0 ? ` · ${deduplicatedCount} duplikat tidak memakai kuota` : '';
				usageMessage = `${collected.length} loker berhasil diekstrak${creditsCharged > 0 ? ` · ${creditsCharged} kredit terpakai` : ' · menggunakan kuota paket'}${deduplicatedCopy}${rejected.length > 0 ? ` · ${rejected.length} gambar gagal` : ''}.`;
			} else if (!error) {
				error = 'Tidak ada gambar yang berhasil diekstrak sebagai lowongan kerja.';
			}
		} catch (caught) {
			if (caught instanceof ApiError && caught.code === 'BENEFIT_QUOTA_EXHAUSTED') {
				error = `${caught.message}. Top-up kredit untuk melanjutkan ekstraksi.`;
			} else {
				error = caught instanceof Error ? caught.message : 'Loker belum dapat dianalisis.';
			}
		} finally {
			isLoading = false;
			progress = null;
		}
	}

	async function addJob() {
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

		const jobId = result.jobId ?? result.id ?? undefined;
		if (jobId) {
			const workplaceType =
				result.workplaceType === 'REMOTE' ||
				result.workplaceType === 'WFO' ||
				result.workplaceType === 'HYBRID'
					? result.workplaceType
					: undefined;
			const employmentType =
				result.employmentType === 'FULL_TIME' ||
				result.employmentType === 'PART_TIME' ||
				result.employmentType === 'CONTRACT' ||
				result.employmentType === 'FREELANCE' ||
				result.employmentType === 'INTERNSHIP'
					? result.employmentType
					: undefined;
			const applicationType =
				result.applicationType === 'EMAIL' ||
				result.applicationType === 'WEBSITE_PORTAL' ||
				result.applicationType === 'WHATSAPP' ||
				result.applicationType === 'TELEGRAM'
					? result.applicationType
					: recipientEmail
						? 'EMAIL'
						: undefined;

			try {
				await updateExtractedJobApi(jobId, {
					jobTitle,
					companyName,
					...(result.location ? { location: result.location } : {}),
					...(workplaceType ? { workplaceType } : {}),
					...(employmentType ? { employmentType } : {}),
					...(result.description
						? { jobDescriptionSummary: result.description.trim() }
						: {}),
					subjectFormat: result.subjectFormat?.trim() || null,
					...(applicationType ? { applicationType } : {}),
					...(result.applicationDestination || recipientEmail
						? { applicationDestination: result.applicationDestination ?? recipientEmail }
						: {}),
					applicationInstructions: result.applicationInstructions?.trim() || null
				});
			} catch (error) {
				formError =
					error instanceof Error
						? error.message
						: 'Perubahan data loker belum dapat disimpan.';
				return;
			}
		}

		onadded({
			key: `manual:${crypto.randomUUID()}`,
			source: 'manual',
			jobId,
			jobTitle,
			companyName,
			recipientEmail,
			description: result.description?.trim() || undefined,
			subjectFormat: result.subjectFormat?.trim() || undefined,
			applicationInstructions: result.applicationInstructions?.trim() || undefined,
			location: result.location ?? undefined,
			workplaceType: result.workplaceType ?? undefined,
			employmentType: result.employmentType ?? undefined,
			applicationType: result.applicationType ?? (recipientEmail ? 'EMAIL' : undefined),
			applicationDestination: result.applicationDestination ?? recipientEmail,
			isUserExtracted: true,
			isOwner: result.isOwner ?? true,
			canEdit: result.canEdit ?? true,
			needsEmail: !recipientEmail,
			selected: true
		});

		if (results.length > 1) {
			const remaining = results.filter((_, index) => index !== resultIndex);
			results = remaining;
			const nextIndex = Math.min(resultIndex, remaining.length - 1);
			resultIndex = nextIndex;
			result = remaining[nextIndex] ?? null;
			usageMessage = `${remaining.length} hasil lain masih menunggu koreksi.`;
			formError = null;
		} else {
			reset();
			onclose();
		}
	}

	onDestroy(() => {
		revokePreviews();
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
							<label
								class="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-7 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40"
								ondragover={(event) => event.preventDefault()}
								ondrop={handleDrop}
							>
								<span class="flex size-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
									<ImageIcon size={22} />
								</span>
								<span class="mt-3 text-xs font-semibold text-slate-700">
									{imageFiles.length > 0
										? `${imageFiles.length} poster dipilih`
										: 'Pilih atau seret beberapa poster JPG/PNG'}
								</span>
								<span class="mt-1 text-[10px] text-slate-400">
									Bisa drag &amp; drop massal · maksimal 10 gambar · 5 MB per gambar
								</span>
								<input
									type="file"
									accept="image/jpeg,image/png"
									multiple
									onchange={handleFile}
									class="sr-only"
								/>
							</label>

							{#if imageFiles.length > 0}
								<div class="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
									{#each imageFiles as image, index (image.preview)}
										<div class="group relative overflow-hidden rounded-lg border border-slate-200 bg-white">
											<img
												src={image.preview}
												alt={`Poster ${index + 1}`}
												class="h-20 w-full object-cover"
											/>
											<button
												type="button"
												onclick={() => removeImage(index)}
												class="absolute right-1 top-1 inline-flex size-5 items-center justify-center rounded-full bg-slate-950/75 text-white opacity-90 transition hover:bg-rose-600"
												aria-label={`Hapus ${image.file.name}`}
											>
												<X size={12} />
											</button>
											<p class="truncate px-1.5 py-1 text-[8px] text-slate-500" title={image.file.name}>
												{image.file.name}
											</p>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/if}

					{#if error}
						<div class="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-700" role="alert">
							<p class="flex items-start gap-1.5"><AlertTriangle size={14} class="mt-0.5 shrink-0" /> {error}</p>
						</div>
					{/if}
					{#if invalidFiles.length > 0}
						<div class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-800" role="status">
							<p class="font-semibold">Sebagian gambar tidak dapat diproses:</p>
							<ul class="mt-1 list-inside list-disc">
								{#each invalidFiles.slice(0, 5) as item}
									<li>{item}</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if mode === 'image' && imageFiles.length > 1}
						<p class="text-[10px] text-slate-500">
							{imageFiles.length} gambar akan dianalisis satu per satu. Estimasi biaya:
							<strong>{imageFiles.length}× ekstraksi</strong>.
						</p>
					{/if}

					<button
						type="button"
						onclick={() => void analyse()}
						disabled={isLoading || blocked || (mode === 'image' && imageFiles.length === 0)}
						class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{#if isLoading}
							<Spinner label="Menganalisis loker" />
							{progress && progress.total > 1
								? `Memproses batch ${progress.total} poster...`
								: 'Menganalisis poster...'}
						{:else}
							<Sparkles size={16} />
							{mode === 'image' && imageFiles.length > 1
								? `Analisis ${imageFiles.length} Poster`
								: 'Analisis & Validasi Loker'}
						{/if}
					</button>
				{:else}
					<div class="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
						<CheckCircle2 size={15} /> Loker valid. Periksa dan sesuaikan hasil ekstraksi.
					</div>
					<div class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-800">
						<AlertTriangle size={15} class="mt-0.5 shrink-0" />
						<span>
							AI bisa salah membaca poster atau teks. Periksa ulang <strong>email HRD, perusahaan, posisi, format subjek, dan deskripsi</strong>. Subjek dan body email final tetap harus ditinjau sebelum dikirim.
						</span>
					</div>
					{#if usageMessage}
						<p class="text-[10px] text-slate-500">{usageMessage}</p>
					{/if}
					{#if invalidFiles.length > 0}
						<details class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-800">
							<summary class="cursor-pointer font-semibold">
								{invalidFiles.length} gambar gagal diproses
							</summary>
							<ul class="mt-1 list-inside list-disc space-y-1">
								{#each invalidFiles as item}
									<li>{item}</li>
								{/each}
							</ul>
						</details>
					{/if}

					{#if results.length > 1}
						<div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5">
							<button
								type="button"
								onclick={() => goResult(-1)}
								disabled={resultIndex === 0}
								class="inline-flex h-8 items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 text-[10px] font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
							>
								<ChevronLeft size={13} /> Sebelumnya
							</button>
							<span class="text-[10px] font-semibold text-indigo-700">
								Hasil {resultIndex + 1} / {results.length}
							</span>
							<button
								type="button"
								onclick={() => goResult(1)}
								disabled={resultIndex >= results.length - 1}
								class="inline-flex h-8 items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 text-[10px] font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
							>
								Selanjutnya <ChevronRight size={13} />
							</button>
						</div>
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
							Format subjek dari loker (opsional)
							<input
								value={result.subjectFormat ?? ''}
								oninput={(event) => {
									if (result) result.subjectFormat = event.currentTarget.value;
								}}
								placeholder="Contoh: Lamaran [Posisi] - [Nama]"
								class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-800 outline-none focus:border-indigo-300"
							/>
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
						<button type="button" onclick={requestReanalyse} class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50">
							Analisis ulang
						</button>
						<button type="button" onclick={() => void addJob()} class="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700">
							<Plus size={15} /> Tambahkan ke daftar
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>

	{#if reanalyseConfirmOpen}
		<div
			class="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="reanalyse-title"
			aria-describedby="reanalyse-description"
		>
			<div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
				<div class="flex items-start gap-3">
					<span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
						<AlertTriangle size={22} />
					</span>
					<div>
						<h3 id="reanalyse-title" class="text-lg font-bold tracking-tight text-slate-950">
							Analisis ulang loker?
						</h3>
						<p id="reanalyse-description" class="mt-1 text-sm leading-6 text-slate-600">
							Kuota atau kredit yang sudah terpakai untuk analisis sebelumnya
							<strong>tidak dapat dikembalikan</strong>. Kamu akan kembali ke input untuk
							menganalisis ulang.
						</p>
					</div>
				</div>
				<div class="mt-5 flex flex-wrap justify-end gap-2">
					<button
						type="button"
						onclick={() => (reanalyseConfirmOpen = false)}
						class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
					>
						Batal
					</button>
					<button
						type="button"
						onclick={confirmReanalyse}
						class="inline-flex h-10 items-center justify-center rounded-lg bg-amber-600 px-4 text-xs font-semibold text-white transition hover:bg-amber-700"
					>
						Ya, analisis ulang
					</button>
				</div>
			</div>
		</div>
	{/if}
{/if}
