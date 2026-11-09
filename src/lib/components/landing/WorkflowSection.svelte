<script lang="ts">
	import { ArrowRight } from '@lucide/svelte';
	import { reveal } from './reveal.js';
</script>

<section class="workflow-section" id="cara-kerja" aria-labelledby="workflow-title">
	<div class="workflow-shell section-shell">
		<div class="workflow-intro reveal" use:reveal>
			<span class="eyebrow">Dari CV sampai lamaran terkirim</span>
			<h2 id="workflow-title">Cari kerja lebih cepat,<br />tanpa kirim email manual.</h2>
			<p>
				Berhenti menghabiskan waktu menulis dan mengirim email lamaran satu per satu.
				Quly membantu merapikan alur pencarian kerja agar kamu bisa fokus pada persiapan
				interview.
			</p>
			<a class="text-link workflow-link" href="/auth/register">
				Buat akun gratis <ArrowRight size={16} />
			</a>
		</div>
		<div class="steps">
			<div class="step reveal" use:reveal style:--reveal-delay="0ms">
				<span class="step-number">01</span>
				<div>
					<h3>Ceritakan tujuan kariermu</h3>
					<p>Atur profil dan unggah CV. AI memahami skill, pengalaman, dan posisi yang kamu incar.</p>
				</div>
			</div>
			<div class="step reveal" use:reveal style:--reveal-delay="100ms">
				<span class="step-number">02</span>
				<div>
					<h3>Biarkan Quly mencari dan menyiapkan</h3>
					<p>
						Dapatkan rekomendasi lowongan relevan, skor kecocokan, dan draft email
						lamaran yang dipersonalisasi dengan AI.
					</p>
				</div>
			</div>
			<div class="step reveal" use:reveal style:--reveal-delay="200ms">
				<span class="step-number">03</span>
				<div>
					<h3>Tinjau, kirim, dan pantau</h3>
					<p>
						Setujui lamaran, kirim otomatis ke HRD, lalu pantau status dibaca dan dibalas
						dalam satu dashboard.
					</p>
				</div>
			</div>
		</div>
	</div>
</section>
