<script lang="ts">
	import { ArrowRight, Mail, Search, Target } from '@lucide/svelte';
	import { reveal } from './reveal.js';

	const features = [
		{
			icon: Search,
			label: 'AI Job Hunter',
			title: 'Temukan lowongan yang benar-benar relevan',
			description:
				'Quly memindai dan menyaring lowongan berdasarkan profil, skill, dan preferensi kariermu. Tidak perlu scroll dan cek satu per satu.',
			tone: 'violet'
		},
		{
			icon: Mail,
			label: 'Otomasi lamaran',
			title: 'Berhenti kirim email lamaran manual',
			description:
				'Kustomisasi email lamaran dengan AI lalu kirim ke HRD secara otomatis. Lepas dari copy-paste email dan kirim satu per satu.',
			tone: 'mint'
		},
		{
			icon: Target,
			label: 'Siap interview',
			title: 'CV, psikotes, dan progres dalam satu tempat',
			description:
				'Optimalkan CV, latihan psikotes, dan pantau status lamaran. Semua langkah kariermu lebih rapi dan terukur.',
			tone: 'peach'
		}
	] as const;
</script>

<section class="feature-section section-shell" id="fitur" aria-labelledby="feature-title">
	<div class="section-heading reveal" use:reveal>
		<span class="eyebrow">Dari pencarian sampai lamaran terkirim</span>
		<h2 id="feature-title">
			Lebih sedikit kerja manual.<br /><span>Lebih banyak peluang yang bisa dikejar.</span>
		</h2>
		<p>
			Quly merangkum proses mencari kerja yang melelahkan—dari menemukan lowongan,
			menyiapkan email, sampai memantau lamaran—dalam satu alur yang lebih efisien.
		</p>
	</div>

	<div class="feature-grid">
		{#each features as feature, index}
			<article class="feature-card reveal" use:reveal style:--reveal-delay="{index * 100}ms">
				<div class="feature-icon icon-{feature.tone}"><feature.icon size={21} strokeWidth={1.8} /></div>
				<span class="feature-label">{feature.label}</span>
				<h3>{feature.title}</h3>
				<p>{feature.description}</p>
				<a href="/auth/register" aria-label="Mulai: {feature.title}">
					Jelajahi fitur <ArrowRight size={15} />
				</a>
			</article>
		{/each}
	</div>
</section>
