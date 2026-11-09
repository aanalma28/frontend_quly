import type {
	PackageTier,
	SubscriptionPackage,
	SubscriptionTier
} from '#lib/services/superadminApi.js';

interface QuotaUser {
	tier: SubscriptionTier;
	subscription: { package: { id: string; tier: PackageTier } } | null;
	quotas: {
		monthlyQuota: number;
		monthlyUsed: number;
		monthlyRemaining: number;
		monthlyTestQuota: number;
		monthlyTestUsed: number;
		monthlyTestRemaining: number;
	};
}

export interface EffectiveQuota {
	limit: number;
	used: number;
	remaining: number;
}

const tierBySubscriptionTier: Record<SubscriptionTier, PackageTier> = {
	FREE_PLAN: 'FREE',
	STARTER_PLAN: 'STARTER',
	PRO_PLAN: 'PRO',
	UNLIMITED_PLAN: 'UNLIMITED'
};

function findPackage(user: QuotaUser, packages: SubscriptionPackage[]): SubscriptionPackage | undefined {
	if (user.subscription) {
		const byId = packages.find((pkg) => pkg.id === user.subscription?.package.id);
		if (byId) return byId;
	}
	const tier = tierBySubscriptionTier[user.tier];
	return packages.find((pkg) => pkg.tier === tier);
}

/**
 * The Free Plan profile is seeded with the generic monthlyQuota default (20),
 * while the actual Free Plan package quota is 5. Superadmin dashboards should
 * show the package quota for free accounts, while still using the backend
 * usage counter and respecting explicit paid/custom quotas.
 */
export function effectiveEmailQuota(
	user: QuotaUser,
	packages: SubscriptionPackage[]
): EffectiveQuota {
	const base: EffectiveQuota = {
		limit: user.quotas.monthlyQuota,
		used: user.quotas.monthlyUsed,
		remaining: user.quotas.monthlyRemaining
	};
	if (user.tier !== 'FREE_PLAN' || user.subscription) return base;

	const plan = findPackage(user, packages);
	const planLimit = plan?.quotas.emailApplications;
	if (planLimit === undefined) return base;
	if (!(base.limit === 20 || base.limit <= 0)) return base;

	return {
		limit: planLimit,
		used: base.used,
		remaining: planLimit < 0 ? -1 : Math.max(planLimit - base.used, 0)
	};
}
