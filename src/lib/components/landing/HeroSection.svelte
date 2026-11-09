<script lang="ts">
	import {
		ArrowDown,
		ArrowRight,
		BriefcaseBusiness,
		Check,
		Mail,
		Sparkles
	} from '@lucide/svelte';

	const opportunities = [
		{ company: 'Nusa Teknologi', role: 'Frontend Developer', match: '92%', initials: 'N', tone: 'blue' },
		{ company: 'Kreasi Digital', role: 'Product Designer', match: '86%', initials: 'K', tone: 'orange' },
		{ company: 'Awan Data', role: 'Junior Data Analyst', match: '81%', initials: 'A', tone: 'green' }
	] as const;
</script>

<section class="hero section-shell" aria-labelledby="hero-title">
	<div class="hero-copy">
		<div class="eyebrow hero-eyebrow">
			<span class="eyebrow-sparkle"><Sparkles size={13} /></span>
			AI Job Hunter untuk karier di Indonesia
		</div>
		<h1 id="hero-title">
			Platform <span class="headline-accent">AI Job Hunter</span> &amp; Otomasi Lamaran Kerja
			di Indonesia
		</h1>
		<p class="hero-description">
			Cari lowongan kerja, kustomisasi email lamaran dengan AI, dan kirim lamaran secara
			otomatis tanpa ribet.
		</p>
		<div class="hero-actions">
			<a class="button" href="/auth/register">
				Mulai cari kerja lebih cepat <ArrowRight size={17} />
			</a>
			<a class="text-link" href="#fitur">Kenali fiturnya <ArrowDown size={15} /></a>
		</div>
		<div class="trust-note">
			<span class="trust-check"><Check size={13} strokeWidth={2.6} /></span>
			<span>Mulai gratis · Atur pencarian sesuai tujuan kariermu</span>
		</div>
	</div>

	<div class="hero-visual" aria-label="Pratinjau dashboard pencarian kerja Quly">
		<div class="visual-orbit orbit-one"></div>
		<div class="visual-orbit orbit-two"></div>
		<div class="floating-note note-top">
			<span class="note-icon"><Sparkles size={15} /></span>
			<span><strong>Lebih terarah</strong><small>Selangkah demi selangkah</small></span>
		</div>

		<div class="dashboard-preview">
			<div class="preview-topbar">
				<div class="window-dots"><i></i><i></i><i></i></div>
				<span>Ruang kariermu</span>
				<span class="preview-avatar">A</span>
			</div>
			<div class="preview-content">
				<div class="preview-heading">
					<div>
						<span class="preview-kicker">RINGKASAN</span>
						<p class="preview-title">Hai, semangat cari kerja!</p>
					</div>
					<span class="preview-sparkle"><Sparkles size={16} /></span>
				</div>

				<div class="preview-stats">
					<div class="stat-card">
						<span class="stat-icon stat-violet"><BriefcaseBusiness size={15} /></span>
						<span class="stat-label">Peluang ditemukan</span>
						<strong>24</strong>
						<span class="stat-sub">untuk ditinjau</span>
					</div>
					<div class="stat-card">
						<span class="stat-icon stat-mint"><Mail size={15} /></span>
						<span class="stat-label">Lamaran aktif</span>
						<strong>08</strong>
						<span class="stat-sub">tetap terpantau</span>
					</div>
				</div>

				<div class="opportunity-heading">
					<div>
						<strong>Peluang untukmu</strong>
						<span>Contoh rekomendasi lowongan</span>
					</div>
					<a href="/auth/register" aria-label="Lihat peluang"><ArrowRight size={16} /></a>
				</div>
				<div class="opportunity-list">
					{#each opportunities as opportunity}
						<div class="opportunity-row">
							<span class="company-avatar avatar-{opportunity.tone}">{opportunity.initials}</span>
							<span class="opportunity-info">
								<strong>{opportunity.role}</strong>
								<small>{opportunity.company}</small>
							</span>
							<span class="match-score">{opportunity.match}<small>cocok</small></span>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div class="floating-note note-bottom">
			<span class="note-progress"><Check size={13} /></span>
			<span><strong>Progres terpantau</strong><small>Semua dalam satu tempat</small></span>
		</div>
		<div class="visual-caption">Pratinjau ilustratif · Data bukan data pengguna</div>
	</div>
</section>
