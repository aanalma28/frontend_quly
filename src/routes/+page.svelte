<script lang="ts">
	import { onMount } from 'svelte';
	import { initializeAuth } from '#lib/stores/auth.js';
	import {
		getPublicBillingPlansApi,
		type PublicBillingPlan,
		type TopupPackage
	} from '#lib/services/billingApi.js';
	import Navbar from '#lib/components/landing/Navbar.svelte';
	import HeroSection from '#lib/components/landing/HeroSection.svelte';
	import FeatureSection from '#lib/components/landing/FeatureSection.svelte';
	import PricingSection from '#lib/components/landing/PricingSection.svelte';
	import WorkflowSection from '#lib/components/landing/WorkflowSection.svelte';
	import ClosingCTA from '#lib/components/landing/ClosingCTA.svelte';
	import Footer from '#lib/components/landing/Footer.svelte';
	import '#lib/components/landing/landing.css';

	let plans = $state<PublicBillingPlan[]>([]);
	let topupPackages = $state<TopupPackage[]>([]);
	let paygPrice = $state(500);
	let plansLoading = $state(true);
	let plansError = $state<string | null>(null);

	const structuredData = {
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: 'Quly',
		url: 'https://quly.web.id',
		description:
			'Platform AI Job Hunter dan otomasi lamaran kerja di Indonesia untuk mencari lowongan, menyiapkan email lamaran, dan mengirim lamaran secara otomatis.',
		applicationCategory: 'BusinessApplication',
		operatingSystem: 'All',
		inLanguage: 'id-ID',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'IDR'
		},
		publisher: {
			'@type': 'Organization',
			name: 'Quly',
			url: 'https://quly.web.id',
			logo: 'https://quly.web.id/icon-512.png'
		}
	};

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

<svelte:head>
	<title>Quly — AI Job Hunter & Otomasi Lamaran Kerja di Indonesia</title>
	<meta
		name="description"
		content="Quly adalah platform AI Job Hunter untuk mencari lowongan kerja, kustomisasi email lamaran dengan AI, dan mengirim lamaran secara otomatis ke HRD di Indonesia."
	/>
	<meta
		name="keywords"
		content="AI job hunter, otomasi lamaran kerja, kirim email lamaran otomatis, cari lowongan kerja Indonesia, auto apply kerja"
	/>
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href="https://quly.web.id/" />

	<meta property="og:type" content="website" />
	<meta property="og:locale" content="id_ID" />
	<meta property="og:site_name" content="Quly" />
	<meta property="og:title" content="Quly — AI Job Hunter & Otomasi Lamaran Kerja di Indonesia" />
	<meta
		property="og:description"
		content="Cari lowongan kerja, kustomisasi email lamaran dengan AI, dan kirim lamaran secara otomatis tanpa ribet."
	/>
	<meta property="og:url" content="https://quly.web.id/" />
	<meta property="og:image" content="https://quly.web.id/icon-512.png" />
	<meta property="og:image:alt" content="Quly — AI Job Hunter Indonesia" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Quly — AI Job Hunter & Otomasi Lamaran Kerja di Indonesia" />
	<meta
		name="twitter:description"
		content="Cari lowongan kerja, kustomisasi email lamaran dengan AI, dan kirim lamaran secara otomatis tanpa ribet."
	/>
	<meta name="twitter:image" content="https://quly.web.id/icon-512.png" />

	{@html `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>`}
</svelte:head>

<div class="landing">
	<Navbar />
	<main>
		<HeroSection />
		<FeatureSection />
		<PricingSection
			{plans}
			{topupPackages}
			{paygPrice}
			loading={plansLoading}
			error={plansError}
			onretry={loadPlans}
		/>
		<WorkflowSection />
		<ClosingCTA />
	</main>
	<Footer />
</div>
