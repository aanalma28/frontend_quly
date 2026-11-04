<script lang="ts">
	import { page } from '$app/state';
	import { ArrowLeft, FileText, ShieldCheck } from '@lucide/svelte';

	const applicationId = $derived(page.url.searchParams.get('applicationId'));
	const candidateId = $derived(page.url.searchParams.get('candidateId'));
	const hasLink = $derived(Boolean(applicationId && candidateId));
</script>

<svelte:head>
	<title>Profil Kandidat | Quly</title>
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
	>
		<div class="border-b border-slate-100 bg-slate-50/70 px-6 py-5 sm:px-8">
			<div class="flex items-center gap-3">
				<span class="flex size-11 items-center justify-center rounded-2xl bg-indigo-600 text-white">
					<FileText size={22} />
				</span>
				<div>
					<p class="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
						Halaman publik
					</p>
					<h1 class="mt-0.5 text-xl font-bold tracking-tight text-slate-950">
						Profil Kandidat
					</h1>
				</div>
			</div>
		</div>

		<div class="px-6 py-8 sm:px-8">
			<div class="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
				<span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
					<ShieldCheck size={20} />
				</span>
				<div>
					<p class="text-sm font-semibold text-slate-900">
						{hasLink ? 'Tautan lamaran dari Quly' : 'Tautan profil tidak lengkap'}
					</p>
					<p class="mt-1 text-xs leading-5 text-slate-600">
						{hasLink
							? 'Halaman ini dibuka dari tautan yang disisipkan pada email lamaran kandidat.'
							: 'Tautan ini tidak memiliki informasi lamaran yang valid. Silakan buka tautan langsung dari email lamaran.'}
					</p>
				</div>
			</div>

			<p class="mt-5 text-sm leading-6 text-slate-600">
				Demi menjaga privasi kandidat, halaman publik ini tidak menampilkan data pribadi secara
				bebas. Silakan gunakan CV, sertifikat, dan dokumen yang dilampirkan pada email lamaran
				untuk meninjau profil kandidat.
			</p>

			<p class="mt-4 text-xs leading-5 text-slate-400">
				Quly tidak menampilkan alamat email, nomor telepon, atau dokumen pribadi pada halaman
				ini.
			</p>
		</div>

		<div class="border-t border-slate-100 px-6 py-4 text-center sm:px-8">
			<p class="text-[11px] text-slate-400">Quly AI Job Hunter</p>
		</div>
	</section>
</main>
