<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, initializeAuth, logout } from '#lib/stores/auth.js';
	import {
		ArrowDown,
		ArrowRight,
		BriefcaseBusiness,
		Check,
		Mail,
		Search,
		Sparkles,
		Target,
		X,
		Zap
	} from '@lucide/svelte';
	import {
		getPublicBillingPlansApi,
		type PublicBillingPlan,
		type TopupPackage
	} from '#lib/services/billingApi.js';
	import RichText from '#lib/components/superadmin/RichText.svelte';
	import QulyLogo from '#lib/components/ui/QulyLogo.svelte';
	import {
		billingPeriodLabel,
		formatNumber,
		formatRupiah,
		isUnlimitedQuota,
		quotaLabel
	} from '#lib/utils/billing.js';

	let plans = $state<PublicBillingPlan[]>([]);
	let topupPackages = $state<TopupPackage[]>([]);
	let paygPrice = $state(500);
	let plansLoading = $state(true);
	let plansError = $state<string | null>(null);
	let detailPlan = $state<PublicBillingPlan | null>(null);

	$effect(() => {
		if (!detailPlan) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});

	function openPlan(plan: PublicBillingPlan) {
		detailPlan = plan;
	}

	function closePlan() {
		detailPlan = null;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (detailPlan && event.key === 'Escape') closePlan();
	}

	const opportunities = [
		{ company: 'Nusa Teknologi', role: 'Frontend Developer', match: '92%', initials: 'N', tone: 'blue' },
		{ company: 'Kreasi Digital', role: 'Product Designer', match: '86%', initials: 'K', tone: 'orange' },
		{ company: 'Awan Data', role: 'Junior Data Analyst', match: '81%', initials: 'A', tone: 'green' }
	] as const;

	const features = [
		{
			icon: Search,
			label: 'Temukan peluang',
			title: 'Lowongan yang lebih relevan',
			description:
				'Jelajahi peluang kerja dan temukan posisi yang sesuai dengan profil serta tujuan kariermu.',
			tone: 'violet'
		},
		{
			icon: Mail,
			label: 'Lamaran lebih praktis',
			title: 'Kelola proses lamaran',
			description:
				'Susun langkah melamar dengan lebih rapi, dari menyiapkan dokumen hingga memantau progres.',
			tone: 'mint'
		},
		{
			icon: Target,
			label: 'Siapkan dirimu',
			title: 'Latihan psikotes interaktif',
			description:
				'Latih fokus dan kecepatanmu melalui tes Pauli dan Kraepelin, lalu lihat ringkasan hasilnya.',
			tone: 'peach'
		}
	] as const;

	function reveal(node: HTMLElement) {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		node.classList.add('reveal-ready');
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					node.classList.add('is-visible');
					observer.unobserve(node);
				}
			},
			{ threshold: 0.14 }
		);

		observer.observe(node);
		return {
			destroy() {
				observer.disconnect();
			}
		};
	}

	function planQuotaText(plan: PublicBillingPlan): string {
		if (isUnlimitedQuota(plan.quotas.emailApplications) || isUnlimitedQuota(plan.monthlyApplicationQuota)) {
			return 'Email lamaran tanpa batas';
		}
		const suffix = plan.billingPeriod === 'FOREVER' ? '' : ' / bulan';
		return `${formatNumber(plan.monthlyApplicationQuota)} email lamaran${suffix}`;
	}

	async function loadPlans() {
		plansLoading = true;
		plansError = null;
		try {
			const data = await getPublicBillingPlansApi();
			plans = data.plans;
			topupPackages = data.topupPackages;
			paygPrice = data.paygPricePerApplicationIdr;
		} catch (error) {
			plansError = error instanceof Error ? error.message : 'Paket belum dapat dimuat.';
		} finally {
			plansLoading = false;
		}
	}

	onMount(() => {
		void initializeAuth();
		void loadPlans();
		document.documentElement.classList.add('landing-page');
		return () => document.documentElement.classList.remove('landing-page');
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>Quly — Cari kerja, lebih terarah</title>
	<meta
		name="description"
		content="Temukan peluang kerja yang relevan, kelola lamaran, dan persiapkan dirimu bersama Quly."
	/>
</svelte:head>

<div class="landing">
	<header class="site-header">
		<nav class="nav-shell" aria-label="Navigasi utama">
			<a class="brand" href="/" aria-label="Quly, beranda">
				<QulyLogo size={34} />
			</a>

			<div class="nav-links">
				<a href="#fitur">Fitur</a>
				<a href="#cara-kerja">Cara kerja</a>
				<a href="#harga">Harga</a>
			</div>

			<div class="nav-actions">
				{#if $auth.isAuthenticated}
					<a
						class="login-link"
						href="/auth/login"
						onclick={(event) => {
							event.preventDefault();
							void logout();
						}}>Keluar</a
					>
					<a class="button button-small" href="/dashboard">
						Dashboard <ArrowRight size={15} />
					</a>
				{:else}
					<a class="login-link" href="/auth/login">Masuk</a>
					<a class="button button-small" href="/auth/register">
						Mulai gratis <ArrowRight size={15} />
					</a>
				{/if}
			</div>
		</nav>
	</header>

	<main>
		<section class="hero section-shell">
			<div class="hero-copy">
				<div class="eyebrow hero-eyebrow">
					<span class="eyebrow-sparkle"><Sparkles size={13} /></span>
					Langkah baru untuk kariermu
				</div>
				<h1>
					Cari kerja jadi<br />
					lebih <span class="headline-accent">terarah.</span>
				</h1>
				<p class="hero-description">
					Fokus pada peluang yang tepat. Quly membantumu menemukan lowongan, mengelola
					lamaran, dan mempersiapkan diri untuk langkah berikutnya.
				</p>
				<div class="hero-actions">
					<a class="button" href="/auth/register">
						Mulai perjalananmu <ArrowRight size={17} />
					</a>
					<a class="text-link" href="#fitur">Kenali fiturnya <ArrowDown size={15} /></a>
				</div>
				<div class="trust-note">
					<span class="trust-check"><Check size={13} strokeWidth={2.6} /></span>
					<span>Mulai gratis · Atur pencarian sesuai tujuanmu</span>
				</div>
			</div>

			<div class="hero-visual" aria-label="Pratinjau dashboard pencarian kerja">
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
								<h2>Hai, semangat cari kerja!</h2>
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

		<section class="feature-section section-shell" id="fitur">
			<div class="section-heading reveal" use:reveal>
				<span class="eyebrow">Pencarian kerja, satu ruang</span>
				<h2>Lebih sedikit yang tercecer.<br /><span>Lebih banyak yang bisa kamu fokuskan.</span></h2>
				<p>Alat yang kamu butuhkan untuk menjalani pencarian kerja dengan lebih percaya diri.</p>
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

		<section class="pricing-section section-shell" id="harga">
			<div class="section-heading reveal" use:reveal>
				<span class="eyebrow">Paket Pejuang Loker</span>
				<h2>Pilih Senjata Andalanmu untuk Menembus Gerbang Karier Impian</h2>
				<p>
					Mulai langkahmu secara gratis atau hajar ratusan lowongan sekaligus dengan fitur otomatisasi
					penuh.
				</p>
			</div>

			{#if plansLoading}
				<div class="pricing-state">Memuat paket langganan...</div>
			{:else if plansError}
				<div class="pricing-state" role="alert">
					<p>{plansError}</p>
					<button type="button" onclick={() => void loadPlans()}>Coba lagi</button>
				</div>
			{:else if plans.length === 0}
				<div class="pricing-state">Belum ada paket aktif.</div>
			{:else}
				<div class="pricing-grid">
					{#each plans as plan, index (plan.id)}
						<article
							class="pricing-card reveal {plan.isPopular ? 'pricing-card-featured' : ''}"
							use:reveal
							style:--reveal-delay="{index * 100}ms"
						>
							{#if plan.isPopular}
								<span class="pricing-badge">
									<Sparkles size={12} /> {plan.badge ?? 'Paling Populer'}
								</span>
							{:else if plan.badge}
								<span class="pricing-badge"><Sparkles size={12} /> {plan.badge}</span>
							{/if}
							<span class="pricing-tier">{plan.tier}</span>
							<h3>{plan.name}</h3>
							{#if plan.subtitle}
								<p class="pricing-description">{plan.subtitle}</p>
							{/if}
							<div class="pricing-amount">
								{#if plan.originalPriceIdr != null && plan.originalPriceIdr > plan.priceIdr}
									<span class="pricing-original">{formatRupiah(plan.originalPriceIdr)}</span>
								{/if}
								<strong>{formatRupiah(plan.priceIdr)}</strong><span>/{billingPeriodLabel(plan.billingPeriod)}</span>
							</div>
							<div class="pricing-quota"><Mail size={15} /> {planQuotaText(plan)}</div>
							<ul>
								{#each plan.features.slice(0, 3) as feature}
									<li><Check size={14} /> <RichText html={feature} /></li>
								{/each}
							</ul>
							<button type="button" class="pricing-more" onclick={() => openPlan(plan)}>
								Lihat selengkapnya
								{#if plan.features.length > 3}
									<span>+{plan.features.length - 3} benefit</span>
								{/if}
								<ArrowRight size={13} />
							</button>
							<a
								class="pricing-cta {plan.isPopular ? 'pricing-cta-featured' : ''}"
								href="/billing#paket"
							>
								{plan.buttonLabel ?? 'Pilih Paket Ini'} <ArrowRight size={15} />
							</a>
						</article>
					{/each}
				</div>
			{/if}

			<div class="payg-banner reveal" use:reveal>
				<div class="payg-icon"><Zap size={19} /></div>
				<div class="payg-copy">
					<strong>Kehabisan Kuota Bulanan di Tengah Jalan? Tenang, Pakai Kredit Kilat!</strong>
					<span>
						Cukup {formatRupiah(paygPrice)} per aksi kirim lamaran otomatis tanpa harus berlangganan
						bulanan.
						{#if topupPackages.length > 0}
							Pilihan top-up:
							{topupPackages
								.map(
									(pack) =>
										`${pack.name}: ${formatRupiah(pack.priceIdr)} (${pack.totalCredits} Kredit)`
								)
								.join(' atau ')}.
						{:else}
							Top-up belum tersedia.
						{/if}
					</span>
				</div>
				<a href="/billing#kredit-kilat">Top-up Kredit Kilat <ArrowRight size={15} /></a>
			</div>
		</section>

		<section class="workflow-section" id="cara-kerja">
			<div class="workflow-shell section-shell">
				<div class="workflow-intro reveal" use:reveal>
					<span class="eyebrow">Mulai dari langkah sederhana</span>
					<h2>Karier berikutnya<br />dimulai dari sini.</h2>
					<p>Bangun ritme pencarian kerja yang terasa lebih ringan, satu langkah dalam satu waktu.</p>
					<a class="text-link workflow-link" href="/auth/register">
						Buat akun gratis <ArrowRight size={16} />
					</a>
				</div>
				<div class="steps">
					<div class="step reveal" use:reveal style:--reveal-delay="0ms">
						<span class="step-number">01</span>
						<div>
							<h3>Kenali tujuanmu</h3>
							<p>Atur profil dan unggah CV agar pencarian dimulai dari ceritamu.</p>
						</div>
					</div>
					<div class="step reveal" use:reveal style:--reveal-delay="100ms">
						<span class="step-number">02</span>
						<div>
							<h3>Jelajahi peluang</h3>
							<p>Temukan posisi yang menarik dan simpan peluang yang ingin kamu kejar.</p>
						</div>
					</div>
					<div class="step reveal" use:reveal style:--reveal-delay="200ms">
						<span class="step-number">03</span>
						<div>
							<h3>Terus melangkah</h3>
							<p>Kelola progres lamaran dan siapkan dirimu untuk kesempatan berikutnya.</p>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section class="closing-section section-shell reveal" use:reveal>
			<div class="closing-glow"></div>
			<div class="closing-content">
				<div class="closing-icon"><Sparkles size={21} /></div>
				<span class="closing-kicker">Kesempatan berikutnya menantimu</span>
				<h2>Siap mengambil<br />langkah berikutnya?</h2>
				<p>Mulai perjalanan kariermu dengan lebih terarah bersama Quly.</p>
				<a class="button button-light" href="/auth/register">
					Buat akun gratis <ArrowRight size={16} />
				</a>
			</div>
		</section>
	</main>

	<footer class="site-footer section-shell">
		<a class="brand footer-brand" href="/" aria-label="Quly, beranda">
			<QulyLogo size={30} />
		</a>
		<p>Temani langkahmu menuju peluang berikutnya.</p>
		<div class="footer-links">
			<a href="#fitur">Fitur</a>
			<a href="#harga">Harga</a>
			<a href="/privacy">Kebijakan Privasi</a>
			<a href="/terms">Syarat &amp; Ketentuan</a>
			<a href="/auth/login">Masuk</a>
			<a href="/auth/register">Daftar</a>
		</div>
		<span class="copyright">© 2026 Quly</span>
	</footer>
</div>

{#if detailPlan}
	<div
		class="pricing-detail-overlay"
		role="presentation"
		onclick={(event) => {
			if (event.target === event.currentTarget) closePlan();
		}}
	>
		<div
			class="pricing-detail-panel"
			role="dialog"
			aria-modal="true"
			aria-labelledby="pricing-detail-title"
		>
			<button
				type="button"
				class="pricing-detail-close"
				aria-label="Tutup detail paket"
				onclick={closePlan}
			>
				<X size={18} />
			</button>

			<div class="pricing-detail-badges">
				<span class="pricing-detail-tier">{detailPlan.tier}</span>
				{#if detailPlan.badge}
					<span class="pricing-detail-badge">{detailPlan.badge}</span>
				{/if}
			</div>
			<h2 id="pricing-detail-title">{detailPlan.name}</h2>
			{#if detailPlan.subtitle}
				<p class="pricing-detail-subtitle">{detailPlan.subtitle}</p>
			{/if}

			<div class="pricing-detail-price">
				{#if detailPlan.originalPriceIdr != null && detailPlan.originalPriceIdr > detailPlan.priceIdr}
					<span class="pricing-detail-original">{formatRupiah(detailPlan.originalPriceIdr)}</span>
				{/if}
				<strong>{formatRupiah(detailPlan.priceIdr)}</strong>
				<span>/{billingPeriodLabel(detailPlan.billingPeriod)}</span>
			</div>

			<div class="pricing-detail-quotas">
				<div>
					<span>CV</span>
					<strong>{quotaLabel(detailPlan.quotas.cvExtraction, 'x')}</strong>
				</div>
				<div>
					<span>Psikotes</span>
					<strong>{quotaLabel(detailPlan.quotas.psychotest, 'x')}</strong>
				</div>
				<div>
					<span>Scoring</span>
					<strong>{quotaLabel(detailPlan.quotas.jobScoring, 'x')}</strong>
				</div>
				<div>
					<span>Loker luar</span>
					<strong>{quotaLabel(detailPlan.quotas.externalJobExtraction, 'x')}</strong>
				</div>
				<div>
					<span>Email lamaran</span>
					<strong>{quotaLabel(detailPlan.quotas.emailApplications, 'x')}</strong>
				</div>
				<div>
					<span>Token AI</span>
					<strong>{quotaLabel(detailPlan.quotas.aiTokenLimit, 'token')}</strong>
				</div>
			</div>

			<div class="pricing-detail-features">
				<h3>Benefit paket</h3>
				{#if detailPlan.features.length > 0}
					<ul>
						{#each detailPlan.features as feature}
							<li><Check size={14} /> <RichText html={feature} /></li>
						{/each}
					</ul>
				{:else}
					<p class="pricing-detail-empty">Belum ada rincian fitur.</p>
				{/if}
			</div>

			<a class="pricing-detail-cta" href="/billing#paket" onclick={closePlan}>
				{detailPlan.buttonLabel ?? 'Pilih Paket Ini'} <ArrowRight size={15} />
			</a>
		</div>
	</div>
{/if}

<style>
	:global(html.landing-page) {
		scroll-behavior: smooth;
	}

	:global(html.landing-page body) {
		margin: 0;
		background: #fcfbf8;
	}

	.landing {
		--ink: #20213b;
		--muted: #77798e;
		--purple: #1b4db1;
		--purple-dark: #153b8c;
		--line: #ecebf2;
		overflow: hidden;
		color: var(--ink);
		font-family:
			'inter', 'Avenir Next', Avenir, 'Segoe UI', sans-serif;
		-webkit-font-smoothing: antialiased;
	}

	.landing :global(*) {
		box-sizing: border-box;
	}

	.section-shell,
	.nav-shell {
		width: min(1120px, calc(100% - 64px));
		margin-inline: auto;
	}

	.site-header {
		position: relative;
		z-index: 5;
		border-bottom: 1px solid rgb(40 38 74 / 5%);
		background: rgb(252 251 248 / 82%);
		backdrop-filter: blur(14px);
		animation: fade-down 650ms ease both;
	}

	.nav-shell {
		display: flex;
		height: 78px;
		align-items: center;
		justify-content: space-between;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		color: #1b4db1;
		text-decoration: none;
	}

	.nav-links,
	.nav-actions,
	.hero-actions,
	.footer-links {
		display: flex;
		align-items: center;
	}

	.nav-links {
		gap: 38px;
		margin-left: 54px;
	}

	.nav-links a,
	.login-link,
	.footer-links a {
		color: #66687e;
		font-size: 13px;
		font-weight: 550;
		text-decoration: none;
		transition: color 180ms ease;
	}

	.nav-links a:hover,
	.login-link:hover,
	.footer-links a:hover {
		color: var(--purple);
	}

	.nav-actions {
		gap: 23px;
	}

	.button {
		display: inline-flex;
		min-height: 49px;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 0 21px;
		border: 1px solid transparent;
		border-radius: 12px;
		background: var(--purple);
		box-shadow: 0 8px 18px rgb(27 77 177 / 18%);
		color: white;
		font-size: 13px;
		font-weight: 650;
		text-decoration: none;
		transition:
			transform 180ms ease,
			background 180ms ease,
			box-shadow 180ms ease;
	}

	.button:hover {
		transform: translateY(-2px);
		background: var(--purple-dark);
		box-shadow: 0 11px 22px rgb(27 77 177 / 25%);
	}

	.button-small {
		min-height: 40px;
		gap: 7px;
		padding-inline: 15px;
		border-radius: 10px;
		font-size: 12px;
	}

	.hero {
		position: relative;
		display: grid;
		min-height: 635px;
		grid-template-columns: 0.93fr 1.07fr;
		align-items: center;
		gap: 36px;
		padding-top: 35px;
		padding-bottom: 48px;
	}

	.hero-copy {
		position: relative;
		z-index: 1;
		padding-bottom: 9px;
		animation: fade-up 750ms 80ms ease both;
	}

	.eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		color: #77738d;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 1.1px;
		text-transform: uppercase;
	}

	.hero-eyebrow {
		padding: 8px 12px;
		border: 1px solid #dce7f8;
		border-radius: 30px;
		background: #eef3fc;
		color: #1845a6;
		font-size: 10px;
		letter-spacing: 0.55px;
		text-transform: none;
	}

	.eyebrow-sparkle {
		display: grid;
		width: 21px;
		height: 21px;
		place-items: center;
		border-radius: 50%;
		background: white;
	}

	h1,
	h2,
	h3,
	p {
		margin-top: 0;
	}

	.hero h1 {
		margin: 24px 0 17px;
		color: var(--ink);
		font-size: clamp(48px, 5.3vw, 68px);
		font-weight: 760;
		letter-spacing: -4.8px;
		line-height: 1.04;
	}

	.headline-accent {
		position: relative;
		color: var(--purple);
	}

	.headline-accent::after {
		position: absolute;
		right: 2px;
		bottom: 0px;
		left: 2px;
		height: 9px;
		border-radius: 50%;
		background: #b9cef2;
		content: '';
		opacity: 0.68;
		transform: rotate(-2deg);
		z-index: -1;
	}

	.hero-description {
		max-width: 440px;
		margin-bottom: 25px;
		color: var(--muted);
		font-size: 15px;
		line-height: 1.8;
	}

	.hero-actions {
		flex-wrap: wrap;
		gap: 21px;
	}

	.text-link {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		color: #66677f;
		font-size: 12px;
		font-weight: 650;
		text-decoration: none;
		transition: color 180ms ease;
	}

	.text-link:hover {
		color: var(--purple);
	}

	.trust-note {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 24px;
		color: #89899a;
		font-size: 11px;
	}

	.trust-check {
		display: grid;
		width: 18px;
		height: 18px;
		place-items: center;
		border-radius: 50%;
		background: #e8f6ed;
		color: #438b64;
	}

	.hero-visual {
		position: relative;
		display: grid;
		min-height: 474px;
		place-items: center;
		animation: fade-up 850ms 200ms ease both;
	}

	.visual-orbit {
		position: absolute;
		border: 1px solid #dce7f8;
		border-radius: 50%;
		pointer-events: none;
	}

	.orbit-one {
		width: 480px;
		height: 480px;
		background: radial-gradient(circle, #eef3fc 0, rgb(238 243 252 / 0%) 69%);
		opacity: 0.82;
	}

	.orbit-two {
		width: 390px;
		height: 390px;
		border-color: #eef3fc;
	}

	.dashboard-preview {
		position: relative;
		z-index: 1;
		width: min(100%, 454px);
		overflow: hidden;
		border: 1px solid #e1eaf9;
		border-radius: 19px;
		background: white;
		box-shadow:
			0 27px 70px rgb(39 35 80 / 11%),
			0 4px 12px rgb(39 35 80 / 4%);
		transform: rotate(-1deg);
	}

	.preview-topbar {
		display: flex;
		height: 47px;
		align-items: center;
		justify-content: space-between;
		padding-inline: 17px;
		border-bottom: 1px solid #e1eaf9;
		color: #9a99a8;
		font-size: 9px;
		font-weight: 600;
	}

	.window-dots {
		display: flex;
		gap: 4px;
	}

	.window-dots i {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #dad8e1;
	}

	.window-dots i:first-child {
		background: #f1a99f;
	}

	.window-dots i:nth-child(2) {
		background: #f0ce81;
	}

	.window-dots i:nth-child(3) {
		background: #9dd4ae;
	}

	.preview-avatar {
		display: grid;
		width: 23px;
		height: 23px;
		place-items: center;
		border-radius: 8px;
		background: #eef3fc;
		color: #1b4db1;
		font-size: 9px;
		font-weight: 750;
	}

	.preview-content {
		padding: 23px 25px 22px;
	}

	.preview-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 17px;
	}

	.preview-kicker {
		color: #8d8ca1;
		font-size: 8px;
		font-weight: 700;
		letter-spacing: 1.15px;
	}

	.preview-heading h2 {
		margin: 5px 0 0;
		color: #282842;
		font-size: 16px;
		font-weight: 700;
		letter-spacing: -0.45px;
	}

	.preview-sparkle {
		display: grid;
		width: 31px;
		height: 31px;
		place-items: center;
		border-radius: 10px;
		background: #eef3fc;
		color: #1b4db1;
	}

	.preview-stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 11px;
		margin-bottom: 22px;
	}

	.stat-card {
		position: relative;
		display: grid;
		min-height: 109px;
		grid-template-columns: 25px 1fr;
		align-content: start;
		column-gap: 7px;
		padding: 12px;
		border: 1px solid #efedf4;
		border-radius: 12px;
	}

	.stat-icon {
		display: grid;
		width: 25px;
		height: 25px;
		grid-row: span 2;
		place-items: center;
		border-radius: 8px;
	}

	.stat-violet {
		background: #eef3fc;
		color: #1b4db1;
	}

	.stat-mint {
		background: #e9f7f0;
		color: #4a9a74;
	}

	.stat-label {
		align-self: center;
		color: #828196;
		font-size: 9px;
	}

	.stat-card strong {
		grid-column: 1 / -1;
		margin-top: 9px;
		color: #292941;
		font-size: 23px;
		font-weight: 720;
		letter-spacing: -0.7px;
		line-height: 1;
	}

	.stat-sub {
		grid-column: 1 / -1;
		margin-top: 4px;
		color: #a0a0ad;
		font-size: 8px;
	}

	.opportunity-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 9px;
	}

	.opportunity-heading > div {
		display: grid;
		gap: 3px;
	}

	.opportunity-heading strong {
		color: #34334d;
		font-size: 10px;
	}

	.opportunity-heading span {
		color: #9998a7;
		font-size: 8px;
	}

	.opportunity-heading a {
		display: grid;
		width: 25px;
		height: 25px;
		place-items: center;
		border-radius: 8px;
		background: #eef3fc;
		color: var(--purple);
	}

	.opportunity-list {
		display: grid;
	}

	.opportunity-row {
		display: flex;
		min-height: 53px;
		align-items: center;
		gap: 10px;
		border-top: 1px solid #f2f1f5;
	}

	.company-avatar {
		display: grid;
		width: 29px;
		height: 29px;
		flex: 0 0 auto;
		place-items: center;
		border-radius: 9px;
		font-size: 10px;
		font-weight: 750;
	}

	.avatar-blue {
		background: #edf3ff;
		color: #6282d5;
	}

	.avatar-orange {
		background: #fff1e7;
		color: #d58a4e;
	}

	.avatar-green {
		background: #eaf6ee;
		color: #5b9b73;
	}

	.opportunity-info {
		display: grid;
		min-width: 0;
		flex: 1;
		gap: 3px;
	}

	.opportunity-info strong {
		overflow: hidden;
		color: #45445b;
		font-size: 9px;
		font-weight: 650;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.opportunity-info small {
		color: #9998a7;
		font-size: 8px;
	}

	.match-score {
		display: flex;
		align-items: center;
		gap: 4px;
		color: #4d9b72;
		font-size: 9px;
		font-weight: 750;
	}

	.match-score small {
		color: #a1a0ac;
		font-size: 7px;
		font-weight: 500;
	}

	.floating-note {
		position: absolute;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 10px 13px;
		border: 1px solid #efedf5;
		border-radius: 12px;
		background: white;
		box-shadow: 0 10px 27px rgb(43 37 85 / 9%);
		animation: float 4.8s ease-in-out infinite;
	}

	.floating-note > span:last-child {
		display: grid;
		gap: 3px;
	}

	.floating-note strong {
		color: #3a3952;
		font-size: 9px;
		font-weight: 700;
	}

	.floating-note small {
		color: #9291a2;
		font-size: 8px;
	}

	.note-icon,
	.note-progress {
		display: grid;
		width: 29px;
		height: 29px;
		flex: 0 0 auto;
		place-items: center;
		border-radius: 9px;
		background: #eef3fc;
		color: #1b4db1;
	}

	.note-progress {
		background: #e9f7ee;
		color: #49966b;
	}

	.note-top {
		top: 48px;
		right: -2px;
	}

	.note-bottom {
		bottom: 55px;
		left: -10px;
		animation-delay: -2.4s;
	}

	.visual-caption {
		position: absolute;
		right: 20px;
		bottom: 19px;
		color: #a3a0b0;
		font-size: 8px;
	}

	.feature-section {
		padding-top: 52px;
		padding-bottom: 105px;
	}

	.section-heading {
		margin-bottom: 39px;
		text-align: center;
	}

	.section-heading h2,
	.workflow-intro h2,
	.closing-content h2 {
		margin: 15px 0 12px;
		color: var(--ink);
		font-size: clamp(29px, 3.3vw, 39px);
		font-weight: 740;
		letter-spacing: -1.8px;
		line-height: 1.17;
	}

	.pricing-section .section-heading h2 {
		max-width: 850px;
		margin-inline: auto;
	}

	.section-heading h2 span {
		color: #77768d;
	}

	.section-heading > p,
	.workflow-intro > p {
		margin-bottom: 0;
		color: var(--muted);
		font-size: 13px;
		line-height: 1.75;
	}

	.feature-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 17px;
	}

	.feature-card {
		min-height: 267px;
		padding: 25px 24px 23px;
		border: 1px solid #eeedf2;
		border-radius: 16px;
		background: white;
		box-shadow: 0 7px 23px rgb(44 39 81 / 3%);
		transition:
			transform 220ms ease,
			box-shadow 220ms ease,
			border-color 220ms ease;
	}

	.feature-card:hover {
		transform: translateY(-5px);
		border-color: #c3d6f3;
		box-shadow: 0 16px 35px rgb(44 39 81 / 8%);
	}

	.feature-icon {
		display: grid;
		width: 42px;
		height: 42px;
		margin-bottom: 19px;
		place-items: center;
		border-radius: 12px;
	}

	.icon-violet {
		background: #eef3fc;
		color: #1b4db1;
	}

	.icon-mint {
		background: #eaf7f0;
		color: #438f6b;
	}

	.icon-peach {
		background: #fff1e8;
		color: #cb8050;
	}

	.feature-label {
		color: #88869c;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.85px;
		text-transform: uppercase;
	}

	.feature-card h3 {
		margin: 7px 0 8px;
		color: #292941;
		font-size: 16px;
		font-weight: 700;
		letter-spacing: -0.35px;
	}

	.feature-card p {
		min-height: 60px;
		margin-bottom: 16px;
		color: #818196;
		font-size: 11px;
		line-height: 1.7;
	}

	.feature-card > a {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		color: #1b4db1;
		font-size: 10px;
		font-weight: 700;
		text-decoration: none;
	}

	.feature-card > a :global(svg) {
		transition: transform 180ms ease;
	}

	.feature-card > a:hover :global(svg) {
		transform: translateX(3px);
	}

	.pricing-section {
		padding-top: 10px;
		padding-bottom: 101px;
		scroll-margin-top: 30px;
	}

	.pricing-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		align-items: stretch;
		gap: 16px;
		padding: 12px 0 0;
	}

	.pricing-card {
		position: relative;
		display: flex;
		min-height: 410px;
		flex-direction: column;
		padding: 25px 23px 21px;
		border: 1px solid #eeedf2;
		border-radius: 16px;
		background: white;
		box-shadow: 0 7px 23px rgb(44 39 81 / 3%);
		transition:
			transform 220ms ease,
			box-shadow 220ms ease,
			border-color 220ms ease;
	}

	.pricing-card:hover {
		transform: translateY(-4px);
		border-color: #c3d6f3;
		box-shadow: 0 16px 35px rgb(44 39 81 / 8%);
	}

	.pricing-card-featured {
		border-color: #4d7dd3;
		box-shadow: 0 12px 33px rgb(27 77 177 / 12%);
	}

	.pricing-badge {
		position: absolute;
		top: -12px;
		left: 50%;
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 6px 11px;
		border-radius: 20px;
		background: #1b4db1;
		box-shadow: 0 4px 11px rgb(27 77 177 / 20%);
		color: white;
		font-size: 9px;
		font-weight: 700;
		white-space: nowrap;
		transform: translateX(-50%);
	}

	.pricing-tier {
		color: #1b4db1;
		font-size: 10px;
		font-weight: 750;
		letter-spacing: 0.7px;
		text-transform: uppercase;
	}

	.pricing-card h3 {
		margin: 6px 0 0;
		color: #292941;
		font-size: 18px;
		font-weight: 720;
		letter-spacing: -0.5px;
	}

	.pricing-description {
		min-height: 54px;
		margin: 7px 0 0;
		color: #737286;
		font-size: 12px;
		line-height: 1.55;
	}

	.pricing-amount {
		display: flex;
		align-items: baseline;
		gap: 5px;
		margin-top: 19px;
	}

	.pricing-amount strong {
		color: #292941;
		font-size: 24px;
		font-weight: 750;
		letter-spacing: -1px;
	}

	.pricing-amount span {
		color: #8a8999;
		font-size: 10px;
	}

	.pricing-amount .pricing-original {
		color: #a5a3b1;
		font-size: 10px;
		font-weight: 600;
		text-decoration: line-through;
	}

	.pricing-state {
		margin-top: 18px;
		padding: 38px 20px;
		border: 1px dashed #c3d6f3;
		border-radius: 16px;
		background: white;
		color: #858498;
		font-size: 12px;
		text-align: center;
	}

	.pricing-state p {
		margin: 0;
	}

	.pricing-state button {
		margin-top: 12px;
		padding: 8px 14px;
		border: 1px solid #c3d6f3;
		border-radius: 9px;
		background: white;
		color: #514d70;
		font-size: 11px;
		font-weight: 650;
		cursor: pointer;
	}

	.pricing-quota {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 14px;
		padding: 10px 11px;
		border-radius: 9px;
		background: #eef3fc;
		color: #514d70;
		font-size: 11px;
		font-weight: 650;
	}

	.pricing-card-featured .pricing-quota {
		background: #eef3fc;
		color: #1845a6;
	}

	.pricing-more {
		display: inline-flex;
		align-items: center;
		align-self: flex-start;
		gap: 5px;
		margin: -2px 0 16px;
		padding: 0;
		border: 0;
		background: none;
		color: #1b4db1;
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
	}

	.pricing-more span {
		color: #9a97aa;
		font-weight: 600;
	}

	.pricing-more:hover {
		text-decoration: underline;
	}

	.pricing-more:focus-visible {
		outline: 2px solid #4d7dd3;
		outline-offset: 3px;
		border-radius: 3px;
	}

	.pricing-card ul {
		display: grid;
		gap: 9px;
		margin: 17px 0 10px;
		padding: 0;
		list-style: none;
	}

	.pricing-card li {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		color: #5f5e73;
		font-size: 12px;
		line-height: 1.55;
	}

	.pricing-card li :global(svg) {
		flex: 0 0 auto;
		margin-top: 1px;
		color: #5a9a72;
	}

	.pricing-detail-overlay {
		position: fixed;
		inset: 0;
		z-index: 80;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		background: rgb(31 27 54 / 58%);
		backdrop-filter: blur(5px);
	}

	.pricing-detail-panel {
		position: relative;
		width: min(640px, 100%);
		max-height: calc(100dvh - 40px);
		overflow-y: auto;
		padding: 32px;
		border: 1px solid #dce7f8;
		border-radius: 22px;
		background: white;
		box-shadow: 0 28px 80px rgb(34 26 94 / 28%);
		color: #292941;
	}

	.pricing-detail-close {
		position: absolute;
		top: 16px;
		right: 16px;
		display: grid;
		width: 34px;
		height: 34px;
		place-items: center;
		border: 1px solid #dce7f8;
		border-radius: 10px;
		background: white;
		color: #777488;
		cursor: pointer;
		transition:
			background 160ms ease,
			color 160ms ease;
	}

	.pricing-detail-close:hover {
		background: #eef3fc;
		color: #1845a6;
	}

	.pricing-detail-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 7px;
		padding-right: 40px;
	}

	.pricing-detail-tier {
		padding: 5px 9px;
		border-radius: 20px;
		background: #eef3fc;
		color: #1b4db1;
		font-size: 9px;
		font-weight: 750;
		letter-spacing: 0.6px;
		text-transform: uppercase;
	}

	.pricing-detail-badge {
		padding: 5px 9px;
		border-radius: 20px;
		background: #fff3d9;
		color: #9a6b10;
		font-size: 9px;
		font-weight: 700;
	}

	.pricing-detail-panel h2 {
		margin: 13px 0 0;
		color: #292941;
		font-size: 26px;
		font-weight: 750;
		letter-spacing: -0.8px;
	}

	.pricing-detail-subtitle {
		margin: 7px 0 0;
		color: #737286;
		font-size: 12px;
		line-height: 1.6;
	}

	.pricing-detail-price {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 5px;
		margin-top: 18px;
	}

	.pricing-detail-price strong {
		color: #292941;
		font-size: 30px;
		font-weight: 780;
		letter-spacing: -1.1px;
	}

	.pricing-detail-price span {
		color: #8a8999;
		font-size: 11px;
	}

	.pricing-detail-price .pricing-detail-original {
		color: #a5a3b1;
		font-size: 11px;
		font-weight: 600;
		text-decoration: line-through;
	}

	.pricing-detail-quotas {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 8px;
		margin-top: 20px;
	}

	.pricing-detail-quotas > div {
		padding: 10px 11px;
		border: 1px solid #e1eaf9;
		border-radius: 10px;
		background: #faf9fd;
	}

	.pricing-detail-quotas span {
		display: block;
		color: #9290a0;
		font-size: 9px;
		font-weight: 650;
		letter-spacing: 0.45px;
		text-transform: uppercase;
	}

	.pricing-detail-quotas strong {
		display: block;
		margin-top: 3px;
		color: #4f4c65;
		font-size: 12px;
		font-weight: 700;
	}

	.pricing-detail-features {
		margin-top: 23px;
	}

	.pricing-detail-features h3 {
		margin: 0 0 12px;
		color: #292941;
		font-size: 14px;
		font-weight: 750;
	}

	.pricing-detail-features ul {
		display: grid;
		gap: 10px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.pricing-detail-features li {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		color: #5f5e73;
		font-size: 12px;
		line-height: 1.6;
	}

	.pricing-detail-features li :global(svg) {
		flex: 0 0 auto;
		margin-top: 2px;
		color: #5a9a72;
	}

	.pricing-detail-empty {
		color: #9290a0;
		font-size: 12px;
	}

	.pricing-detail-cta {
		display: flex;
		min-height: 44px;
		align-items: center;
		justify-content: center;
		gap: 7px;
		margin-top: 24px;
		border: 1px solid #1b4db1;
		border-radius: 11px;
		background: #1b4db1;
		color: white;
		font-size: 12px;
		font-weight: 700;
		text-decoration: none;
		transition:
			background 180ms ease,
			border-color 180ms ease;
	}

	.pricing-detail-cta:hover {
		border-color: #1845a6;
		background: #1845a6;
	}

	@media (max-width: 680px) {
		.pricing-detail-overlay {
			padding: 12px;
		}

		.pricing-detail-panel {
			max-height: calc(100dvh - 24px);
			padding: 24px 18px;
			border-radius: 18px;
		}

		.pricing-detail-panel h2 {
			font-size: 22px;
		}

		.pricing-detail-price strong {
			font-size: 26px;
		}
	}

	.pricing-cta {
		display: flex;
		min-height: 40px;
		align-items: center;
		justify-content: center;
		gap: 7px;
		margin-top: auto;
		border: 1px solid #dce7f8;
		border-radius: 10px;
		color: #55546b;
		font-size: 11px;
		font-weight: 700;
		text-decoration: none;
		transition:
			border-color 180ms ease,
			background 180ms ease,
			color 180ms ease;
	}

	.pricing-cta:hover {
		border-color: #c3d6f3;
		background: #eef3fc;
		color: #1b4db1;
	}

	.pricing-cta-featured {
		border-color: #1b4db1;
		background: #1b4db1;
		color: white;
	}

	.pricing-cta-featured:hover {
		border-color: #153b8c;
		background: #153b8c;
		color: white;
	}

	.payg-banner {
		display: flex;
		align-items: center;
		gap: 15px;
		margin-top: 20px;
		padding: 18px 21px;
		border: 1px solid #dce7f8;
		border-radius: 14px;
		background: linear-gradient(100deg, #eef3fc, #fff);
	}

	.payg-icon {
		display: grid;
		width: 39px;
		height: 39px;
		flex: 0 0 auto;
		place-items: center;
		border-radius: 12px;
		background: #e1eaf9;
		color: #1b4db1;
	}

	.payg-copy {
		display: grid;
		flex: 1;
		gap: 4px;
	}

	.payg-copy strong {
		color: #34314d;
		font-size: 12px;
		font-weight: 750;
	}

	.payg-copy span {
		color: #79778b;
		font-size: 10px;
		line-height: 1.6;
	}

	.payg-banner > a {
		display: inline-flex;
		flex: 0 0 auto;
		align-items: center;
		gap: 6px;
		color: #1b4db1;
		font-size: 10px;
		font-weight: 700;
		text-decoration: none;
	}

	.workflow-section {
		background: #eef3fc;
	}

	.workflow-shell {
		display: grid;
		grid-template-columns: 0.87fr 1.13fr;
		gap: 90px;
		padding-top: 91px;
		padding-bottom: 94px;
	}

	.workflow-intro h2 {
		margin-top: 17px;
		font-size: 35px;
	}

	.workflow-intro > p {
		max-width: 360px;
	}

	.workflow-link {
		margin-top: 24px;
		color: #1b4db1;
	}

	.steps {
		display: grid;
		align-content: center;
	}

	.step {
		display: grid;
		grid-template-columns: 43px 1fr;
		gap: 16px;
		padding: 19px 0;
		border-bottom: 1px solid #dce7f8;
	}

	.step:first-child {
		padding-top: 0;
	}

	.step:last-child {
		padding-bottom: 0;
		border-bottom: 0;
	}

	.step-number {
		display: grid;
		width: 37px;
		height: 37px;
		place-items: center;
		border: 1px solid #c3d6f3;
		border-radius: 12px;
		background: #fcfbff;
		color: #1b4db1;
		font-size: 10px;
		font-weight: 750;
	}

	.step h3 {
		margin: 1px 0 5px;
		color: #32314b;
		font-size: 13px;
		font-weight: 700;
	}

	.step p {
		max-width: 365px;
		margin: 0;
		color: #7d7b91;
		font-size: 11px;
		line-height: 1.7;
	}

	.closing-section {
		position: relative;
		display: grid;
		min-height: 351px;
		overflow: hidden;
		margin-top: 96px;
		margin-bottom: 76px;
		place-items: center;
		border-radius: 22px;
		background:
			radial-gradient(ellipse at 18% 110%, rgb(77 125 211 / 45%), transparent 41%),
			radial-gradient(ellipse at 86% 4%, rgb(139 174 232 / 33%), transparent 39%),
			linear-gradient(118deg, #112f73 0%, #1845a6 54%, #1b4db1 100%);
		color: white;
		text-align: center;
	}

	.closing-glow {
		position: absolute;
		top: -130px;
		left: calc(50% - 210px);
		width: 420px;
		height: 420px;
		border: 1px solid rgb(255 255 255 / 10%);
		border-radius: 50%;
		box-shadow:
			0 0 0 45px rgb(255 255 255 / 3%),
			0 0 0 95px rgb(255 255 255 / 2%);
	}

	.closing-content {
		position: relative;
		z-index: 1;
		padding: 40px 20px;
	}

	.closing-icon {
		display: grid;
		width: 39px;
		height: 39px;
		margin: 0 auto 13px;
		place-items: center;
		border: 1px solid rgb(255 255 255 / 21%);
		border-radius: 13px;
		background: rgb(255 255 255 / 12%);
		color: #fff3c9;
	}

	.closing-kicker {
		color: #b9cef2;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 1.15px;
		text-transform: uppercase;
	}

	.closing-content h2 {
		margin: 11px 0 9px;
		color: white;
		font-size: 34px;
	}

	.closing-content p {
		margin-bottom: 21px;
		color: #b9cef2;
		font-size: 11px;
	}

	.button-light {
		min-height: 43px;
		padding-inline: 17px;
		border-color: rgb(255 255 255 / 58%);
		background: white;
		box-shadow: 0 7px 16px rgb(34 26 94 / 16%);
		color: #1845a6;
		font-size: 11px;
	}

	.button-light:hover {
		background: #eef3fc;
		color: #153b8c;
	}

	.site-footer {
		display: flex;
		min-height: 80px;
		align-items: center;
		gap: 19px;
		border-top: 1px solid #eeedf1;
	}

	.footer-brand {
		gap: 7px;
	}

	.site-footer > p {
		margin: 0;
		color: #9291a0;
		font-size: 9px;
	}

	.footer-links {
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 12px 19px;
		margin-left: auto;
	}

	.footer-links a,
	.copyright {
		font-size: 9px;
	}

	.copyright {
		color: #a09fac;
	}

	.reveal-ready {
		opacity: 0;
		transform: translateY(25px);
		transition:
			opacity 700ms ease,
			transform 700ms cubic-bezier(0.2, 0.7, 0.2, 1);
		transition-delay: var(--reveal-delay, 0ms);
	}

	.reveal-ready.is-visible {
		opacity: 1;
		transform: translateY(0);
	}

	@keyframes fade-up {
		from {
			opacity: 0;
			transform: translateY(22px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes fade-down {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-7px);
		}
	}

	@media (max-width: 1150px) and (min-width: 901px) {
		.pricing-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 900px) {
		.section-shell,
		.nav-shell {
			width: min(100% - 48px, 760px);
		}

		.hero {
			min-height: 570px;
			grid-template-columns: 0.9fr 1.1fr;
			gap: 16px;
		}

		.hero h1 {
			font-size: clamp(44px, 6.5vw, 58px);
			letter-spacing: -3.8px;
		}

		.hero-description {
			font-size: 13px;
		}

		.hero-visual {
			min-height: 420px;
			transform: scale(0.92);
		}

		.workflow-shell {
			gap: 50px;
		}

		.pricing-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 16px;
		}

		.pricing-card {
			padding-inline: 17px;
		}

		.pricing-amount strong {
			font-size: 21px;
		}
	}

	@media (max-width: 680px) {
		.section-shell,
		.nav-shell {
			width: calc(100% - 40px);
		}

		.nav-shell {
			height: 68px;
		}

		.nav-links,
		.login-link {
			display: none;
		}

		.nav-actions {
			gap: 0;
		}

		.hero {
			min-height: initial;
			grid-template-columns: 1fr;
			gap: 6px;
			padding-top: 63px;
			padding-bottom: 32px;
		}

		.hero-copy {
			padding-bottom: 0;
		}

		.hero h1 {
			margin-top: 20px;
			font-size: clamp(48px, 11.5vw, 64px);
			letter-spacing: -4px;
		}

		.hero-description {
			max-width: 470px;
			font-size: 13px;
		}

		.hero-actions {
			gap: 17px;
		}

		.hero-visual {
			min-height: 395px;
			margin: 0 -15px;
			transform: scale(0.9);
		}

		.dashboard-preview {
			width: min(100%, 430px);
		}

		.orbit-one {
			width: 420px;
			height: 420px;
		}

		.orbit-two {
			width: 340px;
			height: 340px;
		}

		.note-top {
			top: 28px;
			right: -3px;
		}

		.note-bottom {
			bottom: 39px;
			left: -1px;
		}

		.feature-section {
			padding-top: 49px;
			padding-bottom: 70px;
		}

		.section-heading {
			margin-bottom: 27px;
			text-align: left;
		}

		.section-heading h2 {
			font-size: 31px;
			letter-spacing: -1.4px;
		}

		.section-heading h2 br {
			display: none;
		}

		.section-heading > p {
			max-width: 410px;
			font-size: 12px;
		}

		.feature-grid {
			grid-template-columns: 1fr;
			gap: 12px;
		}

		.pricing-section {
			padding-top: 0;
			padding-bottom: 70px;
		}

		.pricing-grid {
			grid-template-columns: 1fr;
			gap: 18px;
			padding-top: 12px;
		}

		.pricing-card {
			min-height: 0;
			padding: 24px 21px 20px;
		}

		.pricing-description {
			min-height: initial;
		}

		.payg-banner {
			align-items: flex-start;
			flex-wrap: wrap;
			gap: 12px;
			padding: 16px;
		}

		.payg-copy {
			min-width: calc(100% - 55px);
		}

		.payg-banner > a {
			margin-left: 51px;
		}

		.feature-card {
			min-height: initial;
			padding: 21px;
		}

		.feature-icon {
			margin-bottom: 14px;
		}

		.feature-card p {
			min-height: initial;
		}

		.workflow-shell {
			grid-template-columns: 1fr;
			gap: 33px;
			padding-top: 66px;
			padding-bottom: 66px;
		}

		.workflow-intro h2 {
			font-size: 32px;
		}

		.step {
			grid-template-columns: 39px 1fr;
			gap: 12px;
		}

		.closing-section {
			width: calc(100% - 28px);
			min-height: 330px;
			margin-top: 64px;
			margin-bottom: 48px;
			border-radius: 18px;
		}

		.closing-content h2 {
			font-size: 31px;
		}

		.closing-content p {
			max-width: 300px;
			line-height: 1.6;
		}

		.site-footer {
			display: grid;
			grid-template-columns: 1fr auto;
			gap: 9px;
			padding-top: 18px;
			padding-bottom: 18px;
		}

		.site-footer > p {
			grid-column: 1;
			grid-row: 2;
		}

		.footer-links {
			grid-column: 2;
			grid-row: 1 / 3;
			gap: 12px;
		}

		.copyright {
			display: none;
		}
	}

	@media (max-width: 390px) {
		.section-shell,
		.nav-shell {
			width: calc(100% - 32px);
		}

		.hero-visual {
			margin-inline: -28px;
			transform: scale(0.84);
		}

		.trust-note {
			font-size: 10px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(html.landing-page) {
			scroll-behavior: auto;
		}

		.landing *,
		.landing *::before,
		.landing *::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			scroll-behavior: auto !important;
			transition-duration: 0.01ms !important;
		}
	}
</style>
