<script lang="ts">
	import { ExternalLink } from '@lucide/svelte';
	import LegalPageShell from '#lib/components/legal/LegalPageShell.svelte';
</script>

<LegalPageShell
	title="Syarat & Ketentuan"
	eyebrow="Terms of Service"
	description="Ketentuan ini mengatur penggunaan layanan Quly. Dengan mendaftar atau menggunakan Quly, kamu menyetujui syarat dan ketentuan di bawah ini."
	updated="5 November 2026"
	active="terms"
>
	<section class="border-b border-slate-100 py-7 first:pt-4">
		<h2 class="text-lg font-bold tracking-tight text-slate-950">1. Ketentuan Penggunaan</h2>
		<div class="mt-3 space-y-3 text-sm leading-7 text-slate-600">
			<p>
				Dengan membuat akun, mengakses, atau menggunakan layanan Quly, kamu menyatakan telah
				membaca, memahami, dan menyetujui Syarat &amp; Ketentuan ini. Jika kamu tidak setuju,
				mohon berhenti menggunakan layanan Quly.
			</p>
			<p>
				Kamu bertanggung jawab menjaga kerahasiaan kredensial akun dan seluruh aktivitas yang
				dilakukan melalui akunmu.
			</p>
		</div>
	</section>

	<section class="border-b border-slate-100 py-7">
		<h2 class="text-lg font-bold tracking-tight text-slate-950">2. Deskripsi Layanan</h2>
		<div class="mt-3 space-y-3 text-sm leading-7 text-slate-600">
			<p>
				Quly adalah alat bantu produktivitas berbasis AI untuk membantu pencari kerja
				menemukan lowongan, menyiapkan profil dan CV, menilai kecocokan lowongan, serta
				mengotomatiskan pengiriman dan pelacakan status lamaran kerja.
			</p>
			<p>
				Quly bukan perusahaan rekrutmen, agen tenaga kerja, atau perwakilan pemberi kerja.
				Keputusan akhir mengenai proses seleksi dan penerimaan kerja tetap berada pada
				perusahaan tujuan.
			</p>
		</div>
	</section>

	<section class="border-b border-slate-100 py-7">
		<h2 class="text-lg font-bold tracking-tight text-slate-950">3. Sistem Kredit &amp; Pembayaran</h2>
		<div class="mt-3 space-y-3 text-sm leading-7 text-slate-600">
			<p>
				Quly menggunakan sistem kredit untuk beberapa fitur AI. Pembelian paket kredit atau
				top-up diproses secara aman melalui mitra pembayaran resmi kami, <strong>Midtrans</strong>.
				Kami tidak menyimpan data kartu pembayaran secara langsung.
			</p>
			<p>
				Saldo kredit bersifat <strong>non-refundable</strong>. Kredit yang telah dibeli tidak
				dapat diuangkan kembali, dipindahtangankan, atau dikembalikan dalam bentuk uang tunai,
				kecuali diwajibkan oleh hukum yang berlaku.
			</p>
			<p>
				Harga, komposisi paket, dan biaya fitur dapat berubah dari waktu ke waktu. Perubahan
				akan ditampilkan pada halaman paket dan kredit sebelum transaksi dilakukan.
			</p>
			<p>
				Informasi lebih lanjut mengenai kebijakan pembayaran Midtrans dapat dilihat di
				<a
					href="https://midtrans.com"
					target="_blank"
					rel="noreferrer"
					class="inline-flex items-center gap-1 font-semibold text-indigo-700 underline decoration-indigo-200 underline-offset-2"
				>
					situs resmi Midtrans <ExternalLink size={12} />
				</a>.
			</p>
		</div>
	</section>

	<section class="border-b border-slate-100 py-7">
		<h2 class="text-lg font-bold tracking-tight text-slate-950">4. Larangan Penyalahgunaan</h2>
		<div class="mt-3 space-y-3 text-sm leading-7 text-slate-600">
			<p>Kamu dilarang menggunakan Quly untuk:</p>
			<ul class="list-disc space-y-1.5 pl-5">
				<li>mengirim spam atau email massal yang tidak relevan dan tidak diminta;</li>
				<li>melakukan penipuan, pemalsuan identitas, atau menyampaikan informasi yang menyesatkan;</li>
				<li>menyebarkan malware, virus, atau kode berbahaya lainnya;</li>
				<li>melanggar hukum yang berlaku, hak pihak lain, atau kebijakan penyedia email seperti Google Gmail;</li>
				<li>mengakali sistem kuota, kredit, keamanan, atau pembatasan layanan Quly.</li>
			</ul>
			<p>
				Quly berhak menangguhkan atau menghentikan akses akun yang melanggar ketentuan ini.
			</p>
		</div>
	</section>

	<section class="border-b border-slate-100 py-7">
		<h2 class="text-lg font-bold tracking-tight text-slate-950">
			5. Batasan Tanggung Jawab (Disclaimer)
		</h2>
		<div class="mt-3 space-y-3 text-sm leading-7 text-slate-600">
			<p>
				Quly bertindak sebagai alat bantu efisiensi pengiriman lamaran dan pengelolaan proses
				karier. Quly tidak menjamin bahwa pengguna akan mendapatkan panggilan wawancara,
				respons dari perusahaan, atau pekerjaan.
			</p>
			<p>
				Kamu bertanggung jawab memeriksa kebenaran CV, email, subjek, isi pesan, alamat
				penerima, dan dokumen yang dikirim. Quly tidak bertanggung jawab atas keputusan
				perusahaan tujuan, gangguan layanan pihak ketiga, atau kerugian yang timbul dari
				informasi yang tidak akurat.
			</p>
		</div>
	</section>

	<section class="border-b border-slate-100 py-7">
		<h2 class="text-lg font-bold tracking-tight text-slate-950">6. Perubahan Ketentuan</h2>
		<div class="mt-3 space-y-3 text-sm leading-7 text-slate-600">
			<p>
				Quly berhak memperbarui Syarat &amp; Ketentuan ini sewaktu-waktu untuk menyesuaikan
				layanan, fitur, atau kewajiban hukum. Versi terbaru akan ditampilkan di halaman ini
				beserta tanggal pembaruannya.
			</p>
			<p>
				Penggunaan layanan Quly setelah pembaruan berlaku berarti kamu menyetujui ketentuan
				yang diperbarui.
			</p>
		</div>
	</section>

	<section class="py-7 last:pb-4">
		<h2 class="text-lg font-bold tracking-tight text-slate-950">7. Hubungi Kami</h2>
		<p class="mt-3 text-sm leading-7 text-slate-600">
			Jika kamu memiliki pertanyaan tentang Syarat &amp; Ketentuan ini, silakan hubungi tim
			dukungan Quly melalui kanal bantuan yang tersedia di aplikasi.
		</p>
	</section>
</LegalPageShell>
