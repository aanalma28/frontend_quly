import { ApiError, apiRequest, getApiUrl } from '#lib/utils/api.js';
import type {
	BillingPeriod,
	PackageQuotas,
	PackageTier
} from '#lib/services/superadminApi.js';

export type PlanId = 'FREE_PLAN' | 'STARTER_PLAN' | 'PRO_PLAN' | 'UNLIMITED_PLAN';

export interface PublicBillingPlan {
	id: string;
	planId: PlanId;
	tier: PackageTier;
	name: string;
	subtitle: string | null;
	priceIdr: number;
	originalPriceIdr: number | null;
	billingPeriod: BillingPeriod;
	durationDays: number;
	buttonLabel: string | null;
	badge: string | null;
	isPopular: boolean;
	sortOrder: number;
	monthlyApplicationQuota: number;
	monthlyTestQuota: number;
	bonusPaygTokens: number;
	benefits: string[];
	features: string[];
	quotas: PackageQuotas;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface TopupPackage {
	amountIdr: number;
	tokens: number;
}

export interface PublicBillingPlansResponse {
	plans: PublicBillingPlan[];
	topupPackages: TopupPackage[];
	paygPricePerApplicationIdr: number;
}

export async function getPublicBillingPlansApi(): Promise<PublicBillingPlansResponse> {
	const response = await fetch(getApiUrl('billing/plans'));
	if (!response.ok) {
		let message = `Paket belum dapat dimuat (${response.status}).`;
		try {
			const body = (await response.json()) as { message?: string | string[] };
			if (typeof body.message === 'string') message = body.message;
			else if (Array.isArray(body.message)) message = body.message.join(', ');
		} catch {
			// Keep the default message.
		}
		throw new ApiError(message, response.status);
	}
	return (await response.json()) as PublicBillingPlansResponse;
}

export async function subscribePlanApi(plan: PlanId): Promise<unknown> {
	const response = await apiRequest('billing/subscribe', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ plan })
	});
	return response.json();
}
