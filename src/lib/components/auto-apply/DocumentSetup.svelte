<script lang="ts">
	import {
		Award,
		CheckCircle2,
		Eye,
		FileText,
		RefreshCw,
		Sparkles,
		Upload
	} from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import { formatFileSize, type CvFileMetadata } from '#lib/services/cvApi.js';
	import type { SessionHistoryItem } from '#lib/services/psychotestApi.js';

	interface Props {
		cvs: CvFileMetadata[];
		selectedCvId: string;
		loadingCvs: boolean;
		uploadingCv: boolean;
		cvError: string | null;
		psychotestSessions: SessionHistoryItem[];
		selectedPsychotestId: string;
		loadingPsychotest: boolean;
		psychotestError: string | null;
		onupload: (file: File) => void;
		onselectcv: (id: string) => void;
		onselectpsychotest: (id: string) => void;
		onpreviewcv: () => void;
		onpreviewpsychotest: () => void;
	}

	let {
		cvs,
		selectedCvId,
		loadingCvs,
		uploadingCv,
		cvError,
		psychotestSessions,
		selectedPsychotestId,
		loadingPsychotest,
		psychotestError,
		onupload,
		onselectcv,
		onselectpsychotest,
		onpreviewcv,
		onpreviewpsychotest
	}: Props = $props();

	const selectedCv = $derived(cvs.find((cv) => cv.id === selectedCvId) ?? null);
	const selectedPsychotest = $derived(
		psychotestSessions.find((session) => session.sessionId === selectedPsychotestId) ?? null
	);

	function handleFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (file) onupload(file);
		input.value = '';
	}
</script>

<section class="space-y-4">
	<div class="flex flex-wrap items-end justify-between gap-2">
		<div>
			<p class="text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-600">Langkah 1</p>
			<h2 class="mt-1 text-lg font-bold tracking-tight text-slate-950">Dokumen pendukung</h2>
			<p class="mt-1 text-xs text-slate-500">CV wajib. Sertifikat psikotes opsional.</p>
		</div>
		<span class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
			CV + Sertifikat
		</span>
	</div>

	<div class="grid gap-4 lg:grid-cols-2">
		<article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<div class="flex items-start justify-between gap-3">
				<div class="flex items-center gap-3">
					<span class="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
						<FileText size={19} />
					</span>
					<div>
						<h3 class="text-sm font-bold text-slate-900">CV Utama</h3>
						<p class="text-[11px] text-slate-500">PDF · maksimal 5 MB</p>
					</div>
				</div>
				<span class="rounded-full bg-rose-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-rose-600">
					Wajib
				</span>
			</div>

			{#if loadingCvs}
				<div class="mt-5 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-4 text-xs text-slate-500">
					<Spinner label="Memuat CV" /> Memuat daftar CV...
				</div>
			{:else if cvs.length > 0}
				<div class="mt-4 space-y-2">
					{#each cvs as cv (cv.id)}
						<label class="flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition {selectedCvId === cv.id ? 'border-indigo-300 bg-indigo-50/60 ring-1 ring-inset ring-indigo-100' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}">
							<input
								type="radio"
								name="cvFile"
								value={cv.id}
								checked={selectedCvId === cv.id}
								onchange={() => onselectcv(cv.id)}
								class="mt-1 h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
							/>
							<span class="min-w-0 flex-1">
								<span class="flex items-center gap-1.5">
									<span class="truncate text-xs font-semibold text-slate-800">{cv.fileName}</span>
									{#if cv.isPrimary}
										<span class="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">Utama</span>
									{/if}
								</span>
								<span class="mt-0.5 block text-[10px] text-slate-400">
									{formatFileSize(cv.fileSize)} · {new Date(cv.createdAt).toLocaleDateString('id-ID')}
								</span>
							</span>
							{#if selectedCvId === cv.id}
								<CheckCircle2 size={16} class="mt-0.5 shrink-0 text-indigo-600" />
							{/if}
						</label>
					{/each}
				</div>
			{:else}
				<div class="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-5 text-center">
					<p class="text-xs font-semibold text-slate-700">Belum ada CV utama</p>
					<p class="mt-1 text-[11px] leading-4 text-slate-500">Unggah CV PDF pertamamu untuk melanjutkan.</p>
				</div>
			{/if}

			<div class="mt-3 flex flex-wrap items-center gap-2">
				<label class="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100">
					{#if uploadingCv}<Spinner label="Mengunggah CV" />{:else}<Upload size={14} />{/if}
					{uploadingCv ? 'Mengunggah...' : cvs.length > 0 ? 'Ganti / unggah CV' : 'Unggah CV'}
					<input
						type="file"
						accept="application/pdf,.pdf"
						onchange={handleFile}
						disabled={uploadingCv}
						class="sr-only"
					/>
				</label>
				<button
					type="button"
					onclick={onpreviewcv}
					disabled={!selectedCv}
					class="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
				>
					<Eye size={14} /> Pratinjau
				</button>
			</div>

			{#if selectedCv}
				<p class="mt-2 truncate text-[10px] text-slate-400">Dipilih: {selectedCv.fileName}</p>
			{/if}

			{#if cvError}
				<p class="mt-2 rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-2 text-[11px] text-rose-700" role="alert">{cvError}</p>
			{/if}
		</article>

		<article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<div class="flex items-start justify-between gap-3">
				<div class="flex items-center gap-3">
					<span class="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
						<Award size={19} />
					</span>
					<div>
						<h3 class="text-sm font-bold text-slate-900">Sertifikat Psikotes</h3>
						<p class="text-[11px] text-slate-500">Opsional · PDF</p>
					</div>
				</div>
				<span class="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">
					Opsional
				</span>
			</div>

			{#if loadingPsychotest}
				<div class="mt-5 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-4 text-xs text-slate-500">
					<Spinner label="Memuat sertifikat" /> Memuat sertifikat...
				</div>
			{:else if psychotestSessions.length > 0}
				<label class="mt-4 block text-[11px] font-semibold text-slate-500">
					Pilih sertifikat
					<select
						value={selectedPsychotestId}
						onchange={(event) => onselectpsychotest(event.currentTarget.value)}
						class="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 text-xs font-medium text-slate-800 outline-none focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
					>
						<option value="">Tidak melampirkan sertifikat</option>
						{#each psychotestSessions as session (session.sessionId)}
							<option value={session.sessionId}>
								{session.completedAt ? new Date(session.completedAt).toLocaleDateString('id-ID') : 'Sertifikat'} · Skor {session.overallScore ?? '—'}
							</option>
						{/each}
					</select>
				</label>

				{#if selectedPsychotest}
					<div class="mt-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3">
						<p class="flex items-center gap-1.5 text-[11px] font-bold text-violet-800">
							<Sparkles size={13} /> Sertifikat siap dilampirkan
						</p>
						<p class="mt-1 text-[10px] leading-4 text-violet-700/70">
							Skor {selectedPsychotest.overallScore ?? '—'} · {selectedPsychotest.competencyLevel ?? '—'} · diterbitkan
							{selectedPsychotest.certificateGeneratedAt
								? new Date(selectedPsychotest.certificateGeneratedAt).toLocaleDateString('id-ID')
								: 'baru'}
						</p>
					</div>
				{/if}
			{:else}
				<div class="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-5 text-center">
					<p class="text-xs font-semibold text-slate-700">Belum ada sertifikat</p>
					<p class="mt-1 text-[11px] leading-4 text-slate-500">
						Sertifikat opsional. Kamu bisa menyelesaikan psikotes terlebih dahulu.
					</p>
					<a href="/dashboard/psychotest/history" class="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 hover:text-violet-900">
						<RefreshCw size={12} /> Lihat riwayat psikotes
					</a>
				</div>
			{/if}

			<div class="mt-3">
				<button
					type="button"
					onclick={onpreviewpsychotest}
					disabled={!selectedPsychotest}
					class="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
				>
					<Eye size={14} /> Pratinjau sertifikat
				</button>
			</div>

			{#if psychotestError}
				<p class="mt-2 rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-2 text-[11px] text-rose-700" role="alert">{psychotestError}</p>
			{/if}
		</article>
	</div>
</section>
