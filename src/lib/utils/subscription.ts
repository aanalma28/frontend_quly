import type { PackageTier } from '#lib/services/superadminApi.js';
import type {
	BillingSubscriptionSnapshot,
	PublicBillingPlan,
	SubscriptionPolicy
} from '#lib/services/billingApi.js';

export type SubscriptionChangeType =
	| 'NEW'
	| 'REACTIVATION'
	| 'RENEWAL'
	| 'UPGRADE'
	| 'DOWNGRADE';

const DAY_MS = 24 * 60 * 60 * 1000;

export const TIER_RANK: Record<PackageTier, number> = {
	FREE: 0,
	STARTER: 1,
	PRO: 2,
	UNLIMITED: 3
};

export interface SubscriptionChangeDetails {
	type: SubscriptionChangeType;
	currentPlanName: string;
	currentPackageName: string | null;
	currentTier: PackageTier;
	targetTier: PackageTier;
	currentEndDate: string | null;
	projectedEndDate: string | null;
	pendingStartAt: string | null;
	quotaStackMultiplier: number;
	isExpired: boolean;
}

export function subscriptionIsExpired(
	subscription: BillingSubscriptionSnapshot | null,
	now = new Date()
): boolean {
	if (!subscription) return false;
	if (subscription.status !== 'ACTIVE') return true;
	if (!subscription.endDate) return false;
	const endDate = new Date(subscription.endDate);
	return !Number.isNaN(endDate.getTime()) && endDate.getTime() <= now.getTime();
}

export function determineSubscriptionChangeType(
	subscription: BillingSubscriptionSnapshot | null,
	targetTier: PackageTier,
	now = new Date(),
	targetPackageId?: string
): SubscriptionChangeType {
	if (!subscription) return 'NEW';
	if (subscriptionIsExpired(subscription, now)) return 'REACTIVATION';

	const currentRank = TIER_RANK[subscription.package.tier];
	const targetRank = TIER_RANK[targetTier];
	if (targetRank > currentRank) return 'UPGRADE';
	if (targetRank < currentRank) return 'DOWNGRADE';
	// Same tier but a different package is an immediate replacement in the
	// backend, not a renewal with stacked quota.
	if (targetPackageId && subscription.package.id !== targetPackageId) return 'NEW';
	return 'RENEWAL';
}

export function addDays(date: Date, days: number): Date {
	return new Date(date.getTime() + Math.max(0, days) * DAY_MS);
}

export function projectSubscriptionEndDate(
	subscription: BillingSubscriptionSnapshot | null,
	targetPlan: PublicBillingPlan,
	type: SubscriptionChangeType,
	now = new Date()
): string {
	const durationDays = Number.isFinite(targetPlan.durationDays)
		? Math.max(0, targetPlan.durationDays)
		: 0;

	if ((type === 'RENEWAL' || type === 'DOWNGRADE') && subscription?.endDate) {
		const currentEndDate = new Date(subscription.endDate);
		if (!Number.isNaN(currentEndDate.getTime())) {
			return addDays(currentEndDate, durationDays).toISOString();
		}
	}

	return addDays(now, durationDays).toISOString();
}

export function buildSubscriptionChange(
	subscription: BillingSubscriptionSnapshot | null,
	targetPlan: PublicBillingPlan,
	policy: SubscriptionPolicy,
	now = new Date()
): SubscriptionChangeDetails {
	const type = determineSubscriptionChangeType(
		subscription,
		targetPlan.tier,
		now,
		targetPlan.id
	);
	const isExpired = subscriptionIsExpired(subscription, now);
	const currentTier = isExpired || !subscription ? 'FREE' : subscription.package.tier;

	return {
		type,
		currentPlanName: isExpired || !subscription ? 'Free Plan' : subscription.package.name,
		currentPackageName: subscription?.package.name ?? null,
		currentTier,
		targetTier: targetPlan.tier,
		currentEndDate: subscription?.endDate ?? null,
		projectedEndDate: projectSubscriptionEndDate(subscription, targetPlan, type, now),
		pendingStartAt: type === 'DOWNGRADE' ? (subscription?.endDate ?? null) : null,
		quotaStackMultiplier:
			Number.isFinite(policy.quotaStackMultiplier) && policy.quotaStackMultiplier >= 1
				? policy.quotaStackMultiplier
				: 2,
		isExpired
	};
}
