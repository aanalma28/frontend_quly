<script lang="ts">
	import { ArrowRight, Check, Mail, Sparkles, Zap } from '@lucide/svelte';
	import RichText from '#lib/components/superadmin/RichText.svelte';
	import type { PublicBillingPlan, TopupPackage } from '#lib/services/billingApi.js';
	import {
		billingPeriodLabel,
		formatNumber,
		formatRupiah,
		isUnlimitedQuota
	} from '#lib/utils/billing.js';
	import PricingDetailModal from './PricingDetailModal.svelte';
	import { reveal } from './reveal.js';

	interface Props {
		plans: PublicBillingPlan[];
		topupPackages: TopupPackage[];
		paygPrice: number;
		loading: boolean;
		error: string | null;
		onretry: () => void | Promise<void>;
	}

	let { plans, topupPackages, paygPrice, loading, error, onretry }: Props = $props();

	let detailPlan = $state<PublicBillingPlan | null>(null);

	function planQuotaText(plan: PublicBillingPlan): string {
		if (
			isUnlimitedQuota(plan.quotas.emailApplications) ||
			isUnlimitedQuota(plan.monthlyApplicationQuota)
		) {
			return 'Email lamaran tanpa batas';
		}
		const suffix = plan.billingPeriod === 'FOREVER' ? '' : ' / bulan';
		return `${formatNumber(plan.monthlyApplicationQuota)} email lamaran${suffix}`;
	}

	function openPlan(plan: PublicBillingPlan) {
		detailPlan = plan;
	}

	function closePlan() {
		detailPlan = null;
	}
</script>

<section class="pricing-section section-shell" id="harga" aria-labelledby="pricing-title">
	<div class="section-heading reveal" use:reveal>
		<span class="eyebrow">Paket AI Job Hunter</span>
		<h2 id="pricing-title">Pilih paket sesuai intensitas pencarian kerjamu</h2>
		<p>
			Mulai gratis untuk mencoba alur AI Job Hunter, atau pilih paket yang lebih intensif
			untuk otomasi lamaran kerja dan ekstraksi CV tanpa ribet.
		</p>
	</div>

	{#if loading}
		<div class="pricing-state">Memuat paket langganan...</div>
	{:else if error}
		<div class="pricing-state" role="alert">
			<p>{error}</p>
			<button type="button" onclick={() => void onretry()}>Coba lagi</button>
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
			<strong>Kuota habis di tengah proses melamar? Pakai Kredit Kilat.</strong>
			<span>
				Cukup {formatRupiah(paygPrice)} per aksi kirim lamaran otomatis tanpa harus
				berlangganan bulanan.
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

	<PricingDetailModal plan={detailPlan} onclose={closePlan} />
</section>
