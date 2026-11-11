<script lang="ts">
	import { ExternalLink } from '@lucide/svelte';
	import LegalPageShell from '#lib/components/legal/LegalPageShell.svelte';
</script>

<LegalPageShell
	title="Kebijakan Privasi"
	eyebrow="Privacy Policy"
	description="Quly menghargai privasi kamu. Halaman ini menjelaskan data apa yang kami kumpulkan, bagaimana data digunakan, dan hak-hak yang kamu miliki."
	updated="11 November 2026"
	active="privacy"
>
	<section class="border-b border-slate-100 py-7 first:pt-4">
		<h2 class="text-lg font-bold tracking-tight text-slate-950">1. Pendahuluan</h2>
		<div class="mt-3 space-y-3 text-sm leading-7 text-slate-600">
			<p>
				Quly berkomitmen untuk melindungi data pribadi dan informasi akun pengguna. Kebijakan
				Privasi ini berlaku untuk situs dan layanan Quly, termasuk fitur pencarian lowongan,
				penyusunan profil, psikotes, dan otomatisasi lamaran kerja.
			</p>
			<p>
				Dengan membuat akun atau menggunakan layanan Quly, kamu menyetujui praktik pengolahan
				data yang dijelaskan dalam kebijakan ini.
			</p>
		</div>
	</section>

	<section class="border-b border-slate-100 py-7">
		<h2 class="text-lg font-bold tracking-tight text-slate-950">2. Informasi yang Dikumpulkan</h2>
		<div class="mt-3 space-y-4 text-sm leading-7 text-slate-600">
			<p>Quly dapat mengumpulkan informasi berikut untuk menjalankan layanan:</p>

			<div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
				<h3 class="text-sm font-bold text-slate-900">Data Profil Google</h3>
				<p class="mt-1.5">
					Saat kamu masuk menggunakan Google OAuth 2.0, kami dapat menerima nama, alamat email,
					dan foto profil yang terkait dengan akun Google-mu. Data ini digunakan untuk membuat
					dan mengelola akun Quly.
				</p>
			</div>

			<div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
				<h3 class="text-sm font-bold text-slate-900">Akses Gmail API Terbatas</h3>
				<p class="mt-1.5">
					Jika kamu menghubungkan Gmail, Quly menyimpan access token dan refresh token Gmail
					yang diperlukan untuk:
				</p>
				<ul class="mt-2 list-disc space-y-1 pl-5">
					<li>membuat atau menyiapkan email lamaran kerja atas namamu;</li>
					<li>mengirim email lamaran beserta lampiran yang kamu pilih;</li>
					<li>mencatat status pengiriman dan memantau balasan pada thread lamaran terkait.</li>
				</ul>
				<p class="mt-2">
					Quly tidak menggunakan akses Gmail untuk membaca email pribadi yang tidak berkaitan
					dengan lamaran kerja, dan tidak menjual atau membagikan isi email kepada pihak lain.
				</p>
			</div>

			<div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
				<h3 class="text-sm font-bold text-slate-900">Data profil karier dan layanan</h3>
				<p class="mt-1.5">
					Kami juga memproses data yang kamu berikan atau hasilkan saat menggunakan Quly,
					seperti CV, pengalaman kerja, pendidikan, keterampilan, preferensi karier, hasil
					psikotes, lamaran yang dibuat, serta riwayat penggunaan kuota dan kredit.
				</p>
			</div>
		</div>
	</section>

	<section class="border-b border-slate-100 py-7">
		<h2 class="text-lg font-bold tracking-tight text-slate-950">3. Penggunaan Informasi</h2>
		<div class="mt-3 space-y-3 text-sm leading-7 text-slate-600">
			<p>
				Informasi digunakan hanya untuk fungsi inti Quly, termasuk menyusun profil karier,
				mencocokkan lowongan, menjalankan otomatisasi lamaran, menyimpan riwayat status
				lamaran, menghitung penggunaan kuota dan kredit, serta memberikan dukungan dan
				keamanan akun.
			</p>
			<p>
				Kami tidak menggunakan data pengguna untuk iklan pihak ketiga, tidak menjual data
				pribadi, dan tidak mempublikasikan data pengguna tanpa izin.
			</p>
		</div>
	</section>

	<section class="border-b border-slate-100 py-7">
		<h2 class="text-lg font-bold tracking-tight text-slate-950">
			4. Pernyataan Penggunaan Terbatas Google API
		</h2>
		<div class="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm leading-7 text-slate-700 sm:p-5">
			<p>
				Penggunaan dan transfer informasi yang diterima dari API Google oleh Quly ke aplikasi
				lain akan mematuhi Google API Services User Data Policy, termasuk persyaratan
				Penggunaan Terbatas (Limited Use).
			</p>
			<p class="mt-3">
				<strong class="text-slate-900">Limited Use Compliance Statement.</strong> The use of raw
				or derived user data received from Workspace APIs (Gmail API) will adhere to the Google
				User Data Policy, including the Limited Use requirements.
			</p>
			<p class="mt-3">
				Penggunaan data pengguna mentah maupun turunan yang diterima dari Workspace APIs (Gmail
				API) akan mematuhi Google User Data Policy, termasuk persyaratan Limited Use.
			</p>
		</div>
		<p class="mt-3 text-xs leading-6 text-slate-500">
			Kebijakan Google terkait dapat dibaca di
			<a
				href="https://developers.google.com/terms/api-services-user-data-policy"
				target="_blank"
				rel="noreferrer"
				class="inline-flex items-center gap-1 font-semibold text-indigo-700 underline decoration-indigo-200 underline-offset-2"
			>
				Google API Services User Data Policy <ExternalLink size={11} />
			</a>.
		</p>
	</section>

	<section class="border-b border-slate-100 py-7">
		<h2 class="text-lg font-bold tracking-tight text-slate-950">5. Keamanan Data</h2>
		<div class="mt-3 space-y-3 text-sm leading-7 text-slate-600">
			<p>
				Quly melindungi token Gmail dan kredensial akun dengan enkripsi di sisi server. Akses
				internal dibatasi hanya untuk proses yang diperlukan agar fitur layanan dapat berjalan.
			</p>
			<p>
				Kami tidak menjual, menyewakan, atau mempublikasikan data pengguna kepada pihak ketiga.
				Data hanya dapat dibagikan kepada penyedia layanan yang membantu operasional Quly,
				seperti penyedia infrastruktur dan pembayaran, dengan kewajiban menjaga kerahasiaan
				data.
			</p>
		</div>
	</section>

	<section class="border-b border-slate-100 py-7">
		<h2 class="text-lg font-bold tracking-tight text-slate-950">
			6. Hak Pengguna dan Penghapusan Akses
		</h2>
		<div class="mt-3 space-y-3 text-sm leading-7 text-slate-600">
			<p>
				Kamu dapat mencabut akses aplikasi Quly ke akun Google kapan saja melalui halaman
				keamanan akun Google:
				<a
					href="https://myaccount.google.com/permissions"
					target="_blank"
					rel="noreferrer"
					class="inline-flex items-center gap-1 font-semibold text-indigo-700 underline decoration-indigo-200 underline-offset-2"
				>
					Google Account Permissions <ExternalLink size={12} />
				</a>.
			</p>
			<p>
				Kamu juga dapat memutuskan koneksi Gmail melalui halaman Integrasi di dashboard Quly.
				Setelah akses dicabut, fitur pengiriman dan pemantauan lamaran otomatis tidak dapat
				berjalan sampai kamu menghubungkan ulang Gmail.
			</p>
			<p>
				Untuk pertanyaan tentang data pribadi atau permintaan penghapusan data, hubungi tim
				dukungan Quly melalui kanal bantuan yang tersedia di aplikasi.
			</p>
		</div>
	</section>

	<section class="py-7 last:pb-4">
		<h2 class="text-lg font-bold tracking-tight text-slate-950">7. Perubahan Kebijakan</h2>
		<p class="mt-3 text-sm leading-7 text-slate-600">
			Quly dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Versi terbaru akan
			ditampilkan di halaman ini beserta tanggal pembaruannya.
		</p>
	</section>
</LegalPageShell>
