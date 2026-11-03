import type { UserBenefitQuota } from '#lib/services/billingApi.js';
import { isUnlimitedQuota } from '#lib/utils/billing.js';

export type BenefitAccessMode = 'free' | 'unlimited' | 'quota' | 'credit' | 'none';

export function freeLifetimeRemaining(benefit: UserBenefitQuota | null): number {
	if (!benefit) return 0;
	return Math.max(benefit.freeLifetimeRemaining ?? 0, 0);
}

/**
 * Mirrors the backend reservation order:
 * free lifetime -> package quota -> credit balance.
 */
export function benefitAccessMode(
	benefit: UserBenefitQuota | null,
	creditBalance: number
): BenefitAccessMode {
	if (!benefit) return 'none';
	if (freeLifetimeRemaining(benefit) > 0) return 'free';
	if (isUnlimitedQuota(benefit.limit)) return 'unlimited';
	if (benefit.remaining > 0) return 'quota';
	if (benefit.creditCost > 0 && creditBalance >= benefit.creditCost) return 'credit';
	return 'none';
}

export function benefitHasAccess(
	benefit: UserBenefitQuota | null,
	creditBalance: number
): boolean {
	return benefitAccessMode(benefit, creditBalance) !== 'none';
}

export function benefitSourceLabel(mode: BenefitAccessMode): string {
	switch (mode) {
		case 'free':
			return 'Gratis lifetime';
		case 'unlimited':
			return 'Tanpa batas';
		case 'quota':
			return 'Kuota paket';
		case 'credit':
			return 'Kredit';
		default:
			return 'Tidak tersedia';
	}
}
