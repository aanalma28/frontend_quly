<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowLeft, BadgeCheck, CircleAlert, RefreshCw, ShieldCheck } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import { competencyLabel, formatDate, statusLabel } from '#lib/components/psychotest/labels.js';
	import {
		verifyPsychotestApi,
		type PsychotestVerification
	} from '#lib/services/psychotestApi.js';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	let result = $state<PsychotestVerification | null>(null);
	let isLoading = $state(true);
	let errorMessage = $state<string | null>(null);

	async function load() {
		isLoading = true;
		errorMessage = null;
		result = null;
		try {
			result = await verifyPsychotestApi(params.id);
		} catch (error) {
			errorMessage =
				error instanceof Error
					? error.message
					: 'Verifikasi sertifikat belum dapat dimuat. Coba lagi.';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>Verifikasi Sertifikat Psikotes | Quly</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main
	class="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 px-4 py-10"
>
	<a
		href="/"
		class="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-indigo-700"
	>
		<ArrowLeft size={16} /> Kembali ke Quly
	</a>

	<section
		class="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5"
		aria-live="polite"
	>
		<div class="border-b border-slate-100 bg-slate-50/70 px-6 py-5 sm:px-8">
			<div class="flex items-center gap-3">
				<span
					class="flex size-11 items-center justify-center rounded-2xl bg-indigo-600 text-white"
				>
					<ShieldCheck size={22} />
				</span>
				<div>
					<p class="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
						Verifikasi resmi
					</p>
					<h1 class="mt-0.5 text-xl font-bold tracking-tight text-slate-950">
						Sertifikat Psikotes
					</h1>
				</div>
			</div>
		</div>

		<div class="px-6 py-7 sm:px-8">
			{#if isLoading}
				<div class="flex flex-col items-center justify-center gap-3 py-12 text-sm text-slate-500">
					<Spinner label="Memverifikasi sertifikat" />
					Memeriksa keaslian sertifikat...
				</div>
			{:else if errorMessage}
				<div class="space-y-5 text-center">
					<span
						class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"
					>
						<CircleAlert size={28} />
					</span>
					<div>
						<h2 class="text-lg font-bold text-slate-950">Verifikasi gagal</h2>
						<p class="mt-1 text-sm leading-6 text-slate-600">{errorMessage}</p>
					</div>
					<button
						type="button"
						onclick={() => void load()}
						class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700"
					>
						<RefreshCw size={16} /> Coba lagi
					</button>
				</div>
			{:else if result?.valid}
				<div class="space-y-6">
					<div class="text-center">
						<span
							class="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60"
						>
							<BadgeCheck size={36} />
						</span>
						<h2 class="mt-4 text-xl font-bold tracking-tight text-slate-950">
							Sertifikat terverifikasi
						</h2>
						<p class="mt-1 text-sm leading-6 text-slate-600">
							Dokumen ini diterbitkan oleh Quly dan tercatat pada sistem kami.
						</p>
					</div>

					<div class="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
						<p class="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
							Nomor sertifikat
						</p>
						<p class="mt-1 break-all font-mono text-sm font-bold text-slate-900">
							{result.certificateNumber ?? '—'}
						</p>
					</div>

					<dl class="grid gap-3 sm:grid-cols-2">
						<div class="rounded-xl bg-slate-50 p-4">
							<dt class="text-[11px] font-medium text-slate-500">Nama kandidat</dt>
							<dd class="mt-1 text-sm font-semibold text-slate-900">
								{result.candidateName ?? '—'}
							</dd>
						</div>
						<div class="rounded-xl bg-slate-50 p-4">
							<dt class="text-[11px] font-medium text-slate-500">Tanggal terbit</dt>
							<dd class="mt-1 text-sm font-semibold text-slate-900">
								{formatDate(result.issuedAt)}
							</dd>
						</div>
						<div class="rounded-xl bg-slate-50 p-4">
							<dt class="text-[11px] font-medium text-slate-500">Skor keseluruhan</dt>
							<dd class="mt-1 text-sm font-semibold text-slate-900">
								{result.overallScore ?? '—'}
							</dd>
						</div>
						<div class="rounded-xl bg-slate-50 p-4">
							<dt class="text-[11px] font-medium text-slate-500">Level kompetensi</dt>
							<dd class="mt-1 text-sm font-semibold text-slate-900">
								{result.competencyLevel ? competencyLabel[result.competencyLevel] : '—'}
							</dd>
						</div>
					</dl>

					{#if result.status}
						<p class="text-center text-xs text-slate-400">
							Status sesi: {statusLabel[result.status]}
						</p>
					{/if}
				</div>
			{:else}
				<div class="space-y-5 text-center">
					<span
						class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"
					>
						<CircleAlert size={28} />
					</span>
					<div>
						<h2 class="text-lg font-bold text-slate-950">Sertifikat tidak ditemukan</h2>
						<p class="mt-1 text-sm leading-6 text-slate-600">
							Tautan verifikasi tidak valid, atau laporan psikotes belum dibuat. Pastikan QR
							code dipindai dari sertifikat resmi Quly.
						</p>
					</div>
				</div>
			{/if}
		</div>

		<div class="border-t border-slate-100 px-6 py-4 text-center sm:px-8">
			<p class="text-[11px] text-slate-400">
				Halaman verifikasi publik · Quly AI Job Hunter
			</p>
		</div>
	</section>
</main>
