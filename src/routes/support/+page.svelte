<script lang="ts">
	import { ArrowLeft, ChevronDown, CircleHelp, Mail, ShieldCheck } from '@lucide/svelte';
	import QulyLogo from '#lib/components/ui/QulyLogo.svelte';
	import WhatsAppIcon from '#lib/components/ui/WhatsAppIcon.svelte';
	import { auth } from '#lib/stores/auth.js';

	const faqs = [
		{
			question: 'Apa itu Quly?',
			answer:
				'Quly adalah platform AI Job Hunter yang membantu pencari kerja menemukan lowongan relevan, menyiapkan email lamaran dengan AI, dan mengirim lamaran secara otomatis.'
		},
		{
			question: 'Bagaimana cara mulai menggunakan Quly?',
			answer:
				'Buat akun gratis, lengkapi profil dan CV, lalu mulai jelajahi lowongan. Setelah profil siap, kamu bisa menggunakan fitur AI Job Hunter dan otomasi lamaran sesuai paket yang tersedia.'
		},
		{
			question: 'Apakah data CV dan profil saya aman?',
			answer:
				'Data kamu digunakan untuk menjalankan fitur Quly, seperti pencocokan lowongan dan pembuatan email lamaran. Kamu dapat membaca detailnya di halaman Kebijakan Privasi.'
		},
		{
			question: 'Apa perbedaan paket Free, Starter, Pro, dan Unlimited?',
			answer:
				'Setiap paket memiliki kuota email lamaran, ekstraksi CV, psikotes, scoring, dan ekstraksi loker luar yang berbeda. Rincian lengkap dapat dilihat di halaman Paket & Kredit.'
		},
		{
			question: 'Bagaimana cara top-up kredit?',
			answer:
				'Buka halaman Paket & Kredit, pilih Kredit Kilat, lalu selesaikan pembayaran melalui Midtrans. Kredit akan ditambahkan setelah pembayaran berhasil dikonfirmasi.'
		},
		{
			question: 'Bagaimana jika saya mengalami kendala teknis?',
			answer:
				'Hubungi tim Quly melalui WhatsApp atau email di bawah. Sertakan email akun dan penjelasan singkat kendala agar kami bisa membantu lebih cepat.'
		}
	];
</script>

<svelte:head>
	<title>Pusat Bantuan & Kontak | Quly</title>
	<meta
		name="description"
		content="Temukan jawaban pertanyaan umum dan hubungi tim Quly untuk bantuan seputar AI Job Hunter, otomasi lamaran kerja, paket, dan kredit."
	/>
	<meta name="robots" content="index, follow" />
</svelte:head>

<main class="min-h-screen bg-[#f6f8fd] text-slate-800">
	<header class="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
		<div class="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
			<a href="/" aria-label="Quly, beranda" class="shrink-0">
				<QulyLogo size={31} />
			</a>
			<a
				href={$auth.isAuthenticated ? '/dashboard' : '/'}
				class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
			>
				<ArrowLeft size={14} />
				{$auth.isAuthenticated ? 'Kembali ke Dashboard' : 'Kembali ke Beranda'}
			</a>
		</div>
	</header>

	<div class="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
		<header class="max-w-3xl">
			<p class="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-700">
				<CircleHelp size={13} /> Pusat bantuan
			</p>
			<h1 class="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
				Ada yang bisa kami bantu?
			</h1>
			<p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
				Temukan jawaban untuk pertanyaan umum seputar Quly, atau hubungi tim kami
				langsung jika kamu membutuhkan bantuan lebih lanjut.
			</p>
		</header>

		<section class="mt-8 grid gap-4 sm:grid-cols-2" aria-label="Kontak Quly">
			<a
				href="https://wa.me/628131894301"
				target="_blank"
				rel="noreferrer"
				class="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
			>
				<span class="flex size-10 items-center justify-center rounded-xl bg-emerald-50">
					<WhatsAppIcon size={19} />
				</span>
				<h2 class="mt-4 text-sm font-bold text-slate-950">WhatsApp</h2>
				<p class="mt-1 text-sm font-semibold text-emerald-700">08131894301</p>
				<p class="mt-1 text-xs leading-5 text-slate-500">
					Chat langsung dengan tim Quly melalui WhatsApp.
				</p>
			</a>

			<a
				href="mailto:adminquly51126@gmail.com"
				class="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
			>
				<span class="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
					<Mail size={19} />
				</span>
				<h2 class="mt-4 text-sm font-bold text-slate-950">Email</h2>
				<p class="mt-1 break-all text-sm font-semibold text-indigo-700">
					adminquly51126@gmail.com
				</p>
				<p class="mt-1 text-xs leading-5 text-slate-500">
					Kirim detail kendala dan email akunmu.
				</p>
			</a>
		</section>

		<section class="mt-10" aria-labelledby="faq-title">
			<div class="flex items-start gap-3">
				<span class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
					<ShieldCheck size={17} />
				</span>
				<div>
					<h2 id="faq-title" class="text-xl font-bold tracking-tight text-slate-950">
						Pertanyaan yang sering diajukan
					</h2>
					<p class="mt-1 text-sm text-slate-500">
						Jawaban singkat untuk hal yang paling sering ditanyakan pengguna Quly.
					</p>
				</div>
			</div>

			<div class="mt-5 space-y-3">
				{#each faqs as faq, index}
					<details class="group rounded-2xl border border-slate-200 bg-white shadow-sm" open={index === 0}>
						<summary
							class="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden"
						>
							<span>{faq.question}</span>
							<ChevronDown
								size={17}
								class="shrink-0 text-slate-400 transition group-open:rotate-180"
							/>
						</summary>
						<p class="border-t border-slate-100 px-5 py-4 text-sm leading-6 text-slate-600">
							{faq.answer}
						</p>
					</details>
				{/each}
			</div>
		</section>

		<section class="mt-10 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-5 py-6 sm:flex sm:items-center sm:justify-between sm:px-6">
			<div>
				<h2 class="text-base font-bold text-slate-950">Masih butuh bantuan?</h2>
				<p class="mt-1 text-sm leading-6 text-slate-600">
					Hubungi kami melalui WhatsApp atau email. Kami akan membantu menindaklanjuti
					kendala akun, paket, maupun proses lamaranmu.
				</p>
			</div>
			<div class="mt-4 flex flex-wrap gap-2 sm:mt-0 sm:shrink-0">
				<a
					href="https://wa.me/628131894301"
					target="_blank"
					rel="noreferrer"
					class="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white transition hover:bg-emerald-700"
				>
					<WhatsAppIcon size={15} /> WhatsApp
				</a>
				<a
					href="mailto:adminquly51126@gmail.com"
					class="inline-flex h-10 items-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
				>
					<Mail size={14} /> Email
				</a>
			</div>
		</section>

		<footer class="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
			<span>© 2026 Quly — AI Job Hunter</span>
			<nav aria-label="Tautan bantuan" class="flex flex-wrap gap-4 font-semibold">
				<a href="/privacy" class="hover:text-indigo-700">Kebijakan Privasi</a>
				<a href="/terms" class="hover:text-indigo-700">Syarat &amp; Ketentuan</a>
				<a href="/" class="hover:text-indigo-700">Beranda</a>
			</nav>
		</footer>
	</div>
</main>
