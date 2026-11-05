import { ApiError, apiRequest, getApiUrl } from '#lib/utils/api.js';
import type {
	BillingPeriod,
	PackageQuotas,
	PackageTier
} from '#lib/services/superadminApi.js';

export type PlanId = 'FREE_PLAN' | 'STARTER_PLAN' | 'PRO_PLAN' | 'UNLIMITED_PLAN';

export interface PublicPlanBenefitDetail {
	benefitId: string;
	code: string;
	name: string;
	description: string | null;
	unit: string;
	usageLimit: number;
	creditCost: number;
	creditPriceIdr: number;
	freeLifetimeUses: number;
	overageCostIdr: number;
}

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
	details: PublicPlanBenefitDetail[];
	quotas: PackageQuotas;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface TopupPackage {
	id: string;
	name: string;
	description: string | null;
	credits: number;
	bonusCredits: number;
	totalCredits: number;
	priceIdr: number;
	pricePerCreditIdr: number;
	badge: string | null;
	isPopular: boolean;
	sortOrder: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	/** Backward-compatible fields from older billing responses. */
	amountIdr?: number;
	tokens?: number;
}

export interface UserBenefitQuota {
	benefitId: string;
	code: string;
	name: string;
	description: string | null;
	unit: string;
	limit: number;
	used: number;
	remaining: number;
	freeLifetimeLimit: number;
	freeLifetimeUsed: number;
	freeLifetimeRemaining: number;
	resetAt: string | null;
	creditCost: number;
	creditPriceIdr: number;
	overageCostIdr: number;
	canUseWithCredit: boolean;
}

export interface MyBenefitsResponse {
	userId: string;
	creditBalance: number;
	benefits: UserBenefitQuota[];
}

export async function getMyBenefitsApi(): Promise<MyBenefitsResponse> {
	const response = await apiRequest('benefits/me');
	return (await response.json()) as MyBenefitsResponse;
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

export interface MidtransConfigResponse {
	configured: boolean;
	isProduction: boolean;
	clientKey: string | null;
	snapScriptUrl: string | null;
	finishUrl: string | null;
}

export type PaymentStatus =
	| 'PENDING'
	| 'PAID'
	| 'FAILED'
	| 'EXPIRED'
	| 'CANCELLED'
	| 'REFUNDED';

export type PaymentType = 'SUBSCRIPTION' | 'CREDIT_TOPUP';

export interface BillingPaymentPackage {
	id: string;
	name: string;
	tier: string;
}

export interface BillingPaymentTopupPackage {
	id: string;
	name: string;
	credits: number;
}

export interface BillingPayment {
	id: string;
	orderId: string;
	type: PaymentType;
	status: PaymentStatus;
	amountIdr: number;
	packageId: string | null;
	topupPackageId: string | null;
	credits: number | null;
	package: BillingPaymentPackage | null;
	topupPackage: BillingPaymentTopupPackage | null;
	snapToken: string | null;
	redirectUrl: string | null;
	paidAt: string | null;
	expiresAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface PaymentListResponse {
	items: BillingPayment[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export async function getMidtransConfigApi(): Promise<MidtransConfigResponse> {
	const response = await fetch(getApiUrl('billing/midtrans/config'));
	if (!response.ok) {
		throw new ApiError(`Konfigurasi pembayaran gagal dimuat (${response.status}).`, response.status);
	}
	return (await response.json()) as MidtransConfigResponse;
}

export async function subscribePackageApi(packageId: string): Promise<BillingPayment> {
	const response = await apiRequest('billing/subscribe', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ packageId })
	});
	return (await response.json()) as BillingPayment;
}

export async function topupCreditApi(packageId: string): Promise<BillingPayment> {
	const response = await apiRequest('billing/topup-credit', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ packageId })
	});
	return (await response.json()) as BillingPayment;
}

export async function listPaymentsApi(page = 1, limit = 20): Promise<PaymentListResponse> {
	const response = await apiRequest(`billing/payments?page=${page}&limit=${limit}`);
	return (await response.json()) as PaymentListResponse;
}

export async function getPaymentApi(id: string): Promise<BillingPayment> {
	const response = await apiRequest(`billing/payments/${id}`);
	return (await response.json()) as BillingPayment;
}
