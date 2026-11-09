<script lang="ts">
	import { ArrowRight, Check, X } from '@lucide/svelte';
	import RichText from '#lib/components/superadmin/RichText.svelte';
	import type { PublicBillingPlan } from '#lib/services/billingApi.js';
	import {
		billingPeriodLabel,
		formatRupiah,
		quotaLabel
	} from '#lib/utils/billing.js';

	interface Props {
		plan: PublicBillingPlan | null;
		onclose: () => void;
	}

	let { plan, onclose }: Props = $props();

	$effect(() => {
		if (!plan) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});

	function handleKeydown(event: KeyboardEvent) {
		if (plan && event.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if plan}
	<div
		class="pricing-detail-overlay"
		role="presentation"
		onclick={(event) => {
			if (event.target === event.currentTarget) onclose();
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
				onclick={onclose}
			>
				<X size={18} />
			</button>

			<div class="pricing-detail-badges">
				<span class="pricing-detail-tier">{plan.tier}</span>
				{#if plan.badge}
					<span class="pricing-detail-badge">{plan.badge}</span>
				{/if}
			</div>
			<h2 id="pricing-detail-title">{plan.name}</h2>
			{#if plan.subtitle}
				<p class="pricing-detail-subtitle">{plan.subtitle}</p>
			{/if}

			<div class="pricing-detail-price">
				{#if plan.originalPriceIdr != null && plan.originalPriceIdr > plan.priceIdr}
					<span class="pricing-detail-original">{formatRupiah(plan.originalPriceIdr)}</span>
				{/if}
				<strong>{formatRupiah(plan.priceIdr)}</strong>
				<span>/{billingPeriodLabel(plan.billingPeriod)}</span>
			</div>

			<div class="pricing-detail-quotas">
				<div>
					<span>CV</span>
					<strong>{quotaLabel(plan.quotas.cvExtraction, 'x')}</strong>
				</div>
				<div>
					<span>Psikotes</span>
					<strong>{quotaLabel(plan.quotas.psychotest, 'x')}</strong>
				</div>
				<div>
					<span>Scoring</span>
					<strong>{quotaLabel(plan.quotas.jobScoring, 'x')}</strong>
				</div>
				<div>
					<span>Loker luar</span>
					<strong>{quotaLabel(plan.quotas.externalJobExtraction, 'x')}</strong>
				</div>
				<div>
					<span>Email lamaran</span>
					<strong>{quotaLabel(plan.quotas.emailApplications, 'x')}</strong>
				</div>
				<div>
					<span>Token AI</span>
					<strong>{quotaLabel(plan.quotas.aiTokenLimit, 'token')}</strong>
				</div>
			</div>

			<div class="pricing-detail-features">
				<h3>Benefit paket</h3>
				{#if plan.features.length > 0}
					<ul>
						{#each plan.features as feature}
							<li><Check size={14} /> <RichText html={feature} /></li>
						{/each}
					</ul>
				{:else}
					<p class="pricing-detail-empty">Belum ada rincian fitur.</p>
				{/if}
			</div>

			<a class="pricing-detail-cta" href="/billing#paket" onclick={onclose}>
				{plan.buttonLabel ?? 'Pilih Paket Ini'} <ArrowRight size={15} />
			</a>
		</div>
	</div>
{/if}
