import { apiRequest } from '#lib/utils/api.js';

/**
 * Superadmin API client (`/api/superadmin/...`).
 *
 * All endpoints require a SUPER_ADMIN access token; `apiRequest` injects the
 * Bearer token and throws `ApiError` (status/code/message) on failure.
 */

export type PackageTier = 'FREE' | 'STARTER' | 'PRO' | 'UNLIMITED';
export type BillingPeriod = 'FOREVER' | 'MONTHLY' | 'YEARLY';
export type SubStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type UserRole = 'JOB_SEEKER' | 'ADMIN' | 'SUPER_ADMIN';
export type SubscriptionTier =
	| 'FREE_PLAN'
	| 'STARTER_PLAN'
	| 'PRO_PLAN'
	| 'UNLIMITED_PLAN';
export type BillingStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'FREE' | 'NO_SUBSCRIPTION';
export type ApplicationStatus = 'PENDING' | 'SENT' | 'REPLIED' | 'FAILED';
export type ApplicationChargeType = 'MONTHLY_QUOTA' | 'PAYG';
export type JobStatus =
	| 'RAW_PARSED'
	| 'PENDING_REVIEW'
	| 'APPROVED'
	| 'SAVED'
	| 'PUBLISHED'
	| 'ARCHIVED'
	| 'REJECTED';
export type IngestionSourceType =
	| 'TELEGRAM'
	| 'WEBSITE_HTML'
	| 'WEBSITE_API'
	| 'USER_EXTRACTION';
export type IngestionSourceKind = IngestionSourceType;
export type IngestionPaginationType =
	| 'LOKER_SEMAR'
	| 'LOKER_MURIA'
	| 'WORKDAY_JSON'
	| 'DEFAULT';
export type ApplicationType = 'EMAIL' | 'WEBSITE_PORTAL' | 'WHATSAPP' | 'TELEGRAM';
export type WorkplaceType = 'REMOTE' | 'WFO' | 'HYBRID';
export type EmploymentType =
	| 'FULL_TIME'
	| 'PART_TIME'
	| 'CONTRACT'
	| 'FREELANCE'
	| 'INTERNSHIP';

export interface PackageQuotas {
	cvExtraction: number;
	psychotest: number;
	jobScoring: number;
	externalJobExtraction: number;
	emailApplications: number;
	aiTokenLimit: number;
}

export interface PackageBenefitDetail {
	id: string;
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
	sortOrder: number;
	isActive: boolean;
}

export interface PackageBenefitDetailInput {
	benefitId: string;
	usageLimit: number;
	sortOrder?: number;
	isActive?: boolean;
}

export interface SubscriptionPackage {
	id: string;
	name: string;
	tier: PackageTier;
	subtitle: string | null;
	price: number;
	originalPrice: number | null;
	billingPeriod: BillingPeriod;
	durationDays: number;
	buttonLabel: string | null;
	badge: string | null;
	isPopular: boolean;
	sortOrder: number;
	aiTokenLimit: number;
	quotas: PackageQuotas;
	details: PackageBenefitDetail[];
	features: string[];
	isActive: boolean;
	subscriberCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface SubscriptionPackageInput {
	name: string;
	tier: PackageTier;
	subtitle?: string | null;
	price: number;
	originalPrice?: number | null;
	billingPeriod?: BillingPeriod;
	durationDays: number;
	buttonLabel?: string | null;
	badge?: string | null;
	isPopular?: boolean;
	sortOrder?: number;
	aiTokenLimit: number;
	cvExtractionLimit?: number;
	psychotestLimit?: number;
	jobScoringLimit?: number;
	externalJobExtractionLimit?: number;
	emailApplicationLimit?: number;
	details?: PackageBenefitDetailInput[];
	features: string[];
	isActive?: boolean;
}

export interface Benefit {
	id: string;
	code: string;
	name: string;
	description: string | null;
	unit: string;
	creditCost: number;
	creditPriceIdr: number;
	freeLifetimeUses: number;
	overageCostIdr: number;
	isActive: boolean;
	packageCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface BenefitInput {
	code?: string;
	name: string;
	description?: string | null;
	unit?: string;
	creditCost: number;
	creditPriceIdr: number;
	freeLifetimeUses?: number;
	isActive?: boolean;
}

export interface CreditTopupPackage {
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
}

export interface CreditTopupPackageInput {
	name: string;
	description?: string | null;
	credits: number;
	bonusCredits?: number;
	priceIdr: number;
	badge?: string | null;
	isPopular?: boolean;
	sortOrder?: number;
	isActive?: boolean;
}

export interface SubscriptionPackageSummary {
	id: string;
	name: string;
	tier: PackageTier;
	price: number;
	durationDays: number;
	aiTokenLimit: number;
	features: string[];
}

export interface Subscription {
	id: string;
	userId: string;
	user: {
		id: string;
		email: string;
		role: string;
		fullName: string | null;
	};
	package: SubscriptionPackageSummary;
	startDate: string;
	endDate: string;
	status: SubStatus;
	remainingDays: number;
	createdAt: string;
	updatedAt: string;
}

export interface PaginationMeta {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface SubscriptionListResponse {
	items: Subscription[];
	meta: PaginationMeta;
}

export interface SubscriptionsQuery {
	status?: SubStatus;
	page?: number;
	limit?: number;
	search?: string;
}

export interface UserSubscriptionPackage {
	id: string;
	name: string;
	tier: PackageTier;
	price: number;
	durationDays: number;
	aiTokenLimit: number;
}

export interface UserSubscriptionSnapshot {
	id: string;
	status: SubStatus;
	package: UserSubscriptionPackage;
	startDate: string;
	endDate: string;
	remainingDays: number;
}

export interface UserProfile {
	fullName: string | null;
	phone: string | null;
	headline: string | null;
	targetRole: string | null;
	targetDomicile: string | null;
	yearsOfExperience: number | null;
	skills: string[];
}

export interface UserAccount {
	emailVerified: boolean;
	onboardingCompleted: boolean;
	acceptedTerms: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface UserApplicationMetrics {
	total: number;
	byStatus: ApplicationStatusCounts;
	byChargeType: ApplicationChargeCounts;
	replyRate: number;
	lastApplicationAt: string | null;
}

export interface UserQuotas {
	monthlyQuota: number;
	monthlyUsed: number;
	monthlyRemaining: number;
	quotaResetAt: string | null;
	paygBalance: number;
	creditBalance: number;
	monthlyTestQuota: number;
	monthlyTestUsed: number;
	monthlyTestRemaining: number;
	testQuotaResetAt: string | null;
}

export interface UserCounts {
	cvFiles: number;
	userCvs: number;
	psychotestSessions: number;
}

export interface UserListItem {
	id: string;
	email: string;
	role: UserRole;
	tier: SubscriptionTier;
	billingStatus: BillingStatus;
	profile: UserProfile;
	account: UserAccount;
	subscription: UserSubscriptionSnapshot | null;
	applications: UserApplicationMetrics;
	quotas: UserQuotas;
	counts: UserCounts;
}

export interface UserListResponse {
	items: UserListItem[];
	meta: PaginationMeta;
}

export interface UserListQuery {
	search?: string;
	role?: UserRole;
	tier?: SubscriptionTier;
	subscriptionStatus?: SubStatus;
	emailVerified?: boolean;
	onboardingCompleted?: boolean;
	page?: number;
	limit?: number;
}

export interface UserStatsResponse {
	users: {
		total: number;
		jobSeekers: number;
		admins: number;
		superAdmins: number;
		emailVerified: number;
		onboardingCompleted: number;
	};
	tiers: Record<SubscriptionTier, number>;
	applications: {
		total: number;
		byStatus: ApplicationStatusCounts;
		byChargeType: ApplicationChargeCounts;
		replyRate: number;
		usersWithApplications: number;
		averagePerUser: number;
		lastApplicationAt: string | null;
	};
}

export interface RecentApplication {
	id: string;
	companyName: string;
	jobTitle: string;
	recipientEmail?: string | null;
	status: ApplicationStatus;
	chargeType: ApplicationChargeType;
	sentAt: string | null;
	repliedAt: string | null;
	failureReason: string | null;
	createdAt: string;
	updatedAt?: string;
}

export interface UserDetail extends UserListItem {
	recentApplications: RecentApplication[];
}

export interface UpdateUserRoleResponse {
	id: string;
	email: string;
	role: UserRole;
	updatedAt: string;
}

export interface BillingSubscriptionPackage extends UserSubscriptionPackage {
	features: string[];
}

export interface BillingSubscription {
	id: string;
	status: SubStatus;
	package: BillingSubscriptionPackage;
	startDate: string;
	endDate: string;
	remainingDays: number;
}

export interface BillingBreakdown {
	activeSubscriptionValueIdr: number;
	paygApplications: number;
	paygConsumedValueIdr: number;
	estimatedBillingValueIdr: number;
}

export interface BillingAccount {
	emailVerified: boolean;
	onboardingCompleted: boolean;
	createdAt: string;
}

export interface BillingUserItem {
	userId: string;
	email: string;
	role: UserRole;
	fullName: string | null;
	tier: SubscriptionTier;
	billingStatus: BillingStatus;
	subscription: BillingSubscription | null;
	quotas: UserQuotas;
	applications: UserApplicationMetrics;
	billing: BillingBreakdown;
	account: BillingAccount;
}

export interface BillingUsersResponse {
	items: BillingUserItem[];
	meta: PaginationMeta;
}

export interface BillingUserDetail extends BillingUserItem {
	recentApplications: RecentApplication[];
}

export interface BillingUsersQuery {
	search?: string;
	billingStatus?: BillingStatus;
	tier?: SubscriptionTier;
	role?: UserRole;
	packageId?: string;
	page?: number;
	limit?: number;
}

export interface BillingOverviewResponse {
	generatedAt: string;
	users: {
		total: number;
		jobSeekers: number;
		withSubscription: number;
		withoutSubscription: number;
		freeTier: number;
		paidTier: number;
		activeSubscribers: number;
		expiredSubscribers: number;
		cancelledSubscribers: number;
		byTier: Record<SubscriptionTier, number>;
	};
	subscriptions: {
		total: number;
		active: number;
		expired: number;
		cancelled: number;
		expiring7Days: number;
		expiring30Days: number;
		byStatus: Record<SubStatus, number>;
		byPackage: Array<{
			packageId: string;
			name: string;
			tier: PackageTier;
			price: number;
			activeSubscribers: number;
			activeValueIdr: number;
		}>;
	};
	revenue: {
		activeSubscriptionValueIdr: number;
		averageActiveSubscriptionValueIdr: number;
		paygPricePerApplicationIdr: number;
		paygApplications: number;
		paygConsumedValueIdr: number;
		estimatedBillingValueIdr: number;
	};
	quotas: {
		monthlyApplicationsUsed: number;
		totalPaygBalance: number;
		totalCreditBalance: number;
	};
	applications: {
		total: number;
		byStatus: ApplicationStatusCounts;
		byChargeType: ApplicationChargeCounts;
		replyRate: number;
		lastApplicationAt: string | null;
	};
}

export interface UpdateUserQuotasInput {
	monthlyQuota?: number;
	monthlyUsed?: number;
	monthlyTestQuota?: number;
	monthlyTestUsed?: number;
	paygBalance?: number;
	creditBalance?: number;
	quotaResetAt?: string;
	testQuotaResetAt?: string;
}

export interface AssignUserSubscriptionInput {
	packageId: string;
	startDate?: string;
	endDate?: string;
	status?: SubStatus;
	extendDays?: number;
	resetUsage?: boolean;
}

export interface OverrideSubscriptionInput {
	extendDays?: number;
	endDate?: string;
	status?: SubStatus;
}

export interface JobRequirements {
	minExperienceYears?: number | null;
	education?: string | null;
	skills?: string[];
}

export interface ScrapedJob {
	id: string;
	jobTitle: string;
	companyName: string;
	location: string;
	workplaceType: WorkplaceType | string;
	employmentType: EmploymentType | string;
	salaryMin: number | null;
	salaryMax: number | null;
	salaryCurrency: string | null;
	isSalaryConfidential: boolean;
	requirements: JobRequirements | null;
	subjectFormat?: string | null;
	applicationType: ApplicationType;
	applicationDestination: string;
	sourceType: IngestionSourceType;
	sourceDetail: string;
	sourceId?: string | null;
	source?: {
		id: string;
		name: string;
		url: string;
		type: IngestionSourceType;
	} | null;
	createdById?: string | null;
	createdBy?: {
		id: string;
		email: string;
		role: string;
	} | null;
	localImagePath?: string | null;
	status: JobStatus;
	confidenceScore: number | null;
	scrapedAt: string;
	expiresAt: string | null;
	updatedAt: string;
	jobDescriptionSummary?: string;
	applicationInstructions?: string | null;
}

export interface ScrapedJobDetail {
	job: ScrapedJob;
	raw: {
		rawContent: string | null;
		localImagePath: string | null;
		sourceType: IngestionSourceType;
		sourceDetail: string;
		scrapedAt: string;
	};
	aiUsageLogs: AiUsageLog[];
}

export interface ScrapedJobsQuery {
	status?: JobStatus;
	sourceType?: IngestionSourceType;
	sourceId?: string;
	page?: number;
	limit?: number;
	search?: string;
}

export interface ScrapedJobsResponse {
	items: ScrapedJob[];
	meta: PaginationMeta;
}

export interface UpdateScrapedJobInput {
	jobTitle?: string;
	companyName?: string;
	location?: string;
	workplaceType?: WorkplaceType | string;
	employmentType?: EmploymentType | string;
	salaryMin?: number | null;
	salaryMax?: number | null;
	salaryCurrency?: string | null;
	isSalaryConfidential?: boolean;
	requirements?: JobRequirements;
	jobDescriptionSummary?: string;
	subjectFormat?: string | null;
	applicationType?: ApplicationType;
	applicationDestination?: string;
	applicationInstructions?: string | null;
	expiresAt?: string | null;
	confidenceScore?: number | null;
}

export interface ReviewScrapedJobInput {
	status: JobStatus;
	data?: UpdateScrapedJobInput;
}

export interface IngestionSource {
	id: string;
	name: string;
	type: IngestionSourceKind;
	url: string;
	paginationType: IngestionPaginationType;
	maxPages: number | null;
	listSelector: string | null;
	detailSelector: string | null;
	isActive: boolean;
	lastScrapedAt: string | null;
	statusMessage: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface IngestionSourceInput {
	name: string;
	type: IngestionSourceKind;
	url: string;
	paginationType: IngestionPaginationType;
	maxPages?: number | null;
	listSelector?: string | null;
	detailSelector?: string | null;
	isActive?: boolean;
}

export type UpdateIngestionSourceInput = Partial<IngestionSourceInput>;

export interface DeleteSourceImageFailure {
	jobId: string;
	path: string;
	error: string;
}

export interface DeleteSourceResult {
	id: string;
	deleted: boolean;
	deletedJobs: number;
	deletedImages: number;
	imageDeleteFailures: DeleteSourceImageFailure[];
}

export interface BulkSourceStatusPayload {
	ids?: string[];
	type?: IngestionSourceType;
	all?: boolean;
	isActive: boolean;
}

export interface BulkSourceStatusResult {
	updated: number;
	isActive: boolean;
	scope: {
		ids: string[] | null;
		type: IngestionSourceType | null;
		all: boolean;
	};
}

export interface ScraperRunSourceResult {
	sourceId: string;
	name: string;
	type: IngestionSourceType;
	paginationType: IngestionPaginationType;
	maxPages?: number;
	status: string;
	pagesFetched: number;
	itemsFound: number;
	duplicates: number;
	ingested: number;
	failed: number;
	error?: string;
	startedAt: string;
	finishedAt: string | null;
}

export interface ScraperRunTotals {
	sources: number;
	pagesFetched: number;
	itemsFound: number;
	duplicates: number;
	ingested: number;
	failed: number;
}

export interface ScraperRun {
	runId: string;
	status: string;
	requestedSourceId: string | null;
	maxPages: number;
	startedAt: string;
	finishedAt: string | null;
	cancelRequested?: boolean;
	error?: string;
	sources: ScraperRunSourceResult[];
	totals: ScraperRunTotals;
}

export interface StopAllScraperRunsResult {
	stopped: number;
	runIds: string[];
}

export interface StartScraperRunInput {
	sourceId?: string;
	maxPages?: number;
}

export interface StartScraperRunResponse {
	runId: string;
	status: string;
	startedAt: string;
	requestedSourceId: string | null;
	maxPages: number;
}

export interface AiUsageLog {
	id: string;
	featureName: string;
	provider: string;
	modelName: string;
	promptTokens: number;
	completionTokens: number;
	estimatedCostUsd: number;
	outcome: string;
	errorMessage: string | null;
	scrapedJobId: string | null;
	createdAt: string;
}

export interface OverviewResponse {
	revenue: {
		totalIdr: number;
		activeSubscribers: number;
		averageRevenuePerSubscriberIdr: number;
	};
	ai: {
		totalCostUsd: number;
		totalCostIdr: number;
		totalPromptTokens: number;
		totalCompletionTokens: number;
		totalRequests: number;
		idrPerUsd: number;
		marginIdr: number;
		marginPercentage: number | null;
	};
	packages: {
		total: number;
		active: number;
	};
	jobs: {
		total: number;
		byStatus: Record<string, number>;
	};
	sources: {
		total: number;
		active: number;
	};
}

export interface AiCostItem {
	featureName: string;
	modelName: string;
	requests: number;
	promptTokens: number;
	completionTokens: number;
	estimatedCostUsd: number;
}

export interface AiCostByFeature {
	featureName: string;
	requests: number;
	promptTokens: number;
	completionTokens: number;
	estimatedCostUsd: number;
}

export interface AiCostByOutcome {
	outcome: string;
	requests: number;
	promptTokens: number;
	completionTokens: number;
	estimatedCostUsd: number;
}

export interface AiCostsQuery {
	from?: string;
	to?: string;
}

export interface AiCostsResponse {
	items: AiCostItem[];
	byFeature: AiCostByFeature[];
	byOutcome: AiCostByOutcome[];
	totals: {
		requests: number;
		promptTokens: number;
		completionTokens: number;
		estimatedCostUsd: number;
	};
	range: {
		from: string | null;
		to: string | null;
	};
}

export interface JobStatusCounts {
	RAW_PARSED: number;
	PENDING_REVIEW: number;
	APPROVED: number;
	SAVED: number;
	PUBLISHED: number;
	ARCHIVED: number;
	REJECTED: number;
}

export interface ApplicationMethods {
	EMAIL: number;
	WEBSITE_PORTAL: number;
	WHATSAPP: number;
	TELEGRAM: number;
	emailShare: number;
}

export interface ApplicationStatusCounts {
	PENDING: number;
	SENT: number;
	REPLIED: number;
	FAILED: number;
}

export interface ApplicationChargeCounts {
	MONTHLY_QUOTA: number;
	PAYG: number;
}

export interface JobStatisticsSource {
	sourceId: string;
	name: string;
	url: string;
	type: IngestionSourceType;
	isActive: boolean;
	lastScrapedAt: string | null;
	statusMessage: string | null;
	jobs: {
		total: number;
		byStatus: JobStatusCounts;
		applicationMethods: ApplicationMethods;
		lastJobAt: string | null;
	};
}

export interface JobStatisticsResponse {
	range: { from: string | null; to: string | null };
	jobs: {
		total: number;
		byStatus: JobStatusCounts;
		applicationMethods: ApplicationMethods;
	};
	sources: JobStatisticsSource[];
	unattributedJobs: {
		total: number;
		byStatus: JobStatusCounts;
		applicationMethods: ApplicationMethods;
	};
	applications: {
		total: number;
		byStatus: ApplicationStatusCounts;
		byChargeType: ApplicationChargeCounts;
		sent: number;
		replied: number;
		failed: number;
		deliveryRate: number;
		deliveryChannel: string;
	};
}

export interface JobStatisticsQuery {
	from?: string;
	to?: string;
}

function toQuery(params: Record<string, string | number | undefined>): string {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== '') search.set(key, String(value));
	}
	const query = search.toString();
	return query ? `?${query}` : '';
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
	method,
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify(body)
});

export async function getOverviewApi(): Promise<OverviewResponse> {
	const response = await apiRequest('superadmin/analytics/overview');
	return (await response.json()) as OverviewResponse;
}

export async function getAiCostsApi(query: AiCostsQuery = {}): Promise<AiCostsResponse> {
	const response = await apiRequest(
		`superadmin/analytics/ai-costs${toQuery({ from: query.from, to: query.to })}`
	);
	return (await response.json()) as AiCostsResponse;
}

export async function getJobStatisticsApi(
	query: JobStatisticsQuery = {}
): Promise<JobStatisticsResponse> {
	const response = await apiRequest(
		`superadmin/analytics/jobs${toQuery({ from: query.from, to: query.to })}`
	);
	return (await response.json()) as JobStatisticsResponse;
}

export async function listPackagesApi(): Promise<SubscriptionPackage[]> {
	const response = await apiRequest('superadmin/packages');
	const body = (await response.json()) as { items: SubscriptionPackage[] };
	return body.items ?? [];
}

export async function getPackageApi(id: string): Promise<SubscriptionPackage> {
	const response = await apiRequest(`superadmin/packages/${id}`);
	return (await response.json()) as SubscriptionPackage;
}

export async function createPackageApi(
	input: SubscriptionPackageInput
): Promise<SubscriptionPackage> {
	const response = await apiRequest('superadmin/packages', jsonInit('POST', input));
	return (await response.json()) as SubscriptionPackage;
}

export async function updatePackageApi(
	id: string,
	input: Partial<SubscriptionPackageInput>
): Promise<SubscriptionPackage> {
	const response = await apiRequest(`superadmin/packages/${id}`, jsonInit('PUT', input));
	return (await response.json()) as SubscriptionPackage;
}

export async function togglePackageApi(id: string): Promise<SubscriptionPackage> {
	const response = await apiRequest(`superadmin/packages/${id}/toggle`, { method: 'PATCH' });
	return (await response.json()) as SubscriptionPackage;
}

export async function deletePackageApi(
	id: string
): Promise<{ id: string; deleted: boolean }> {
	const response = await apiRequest(`superadmin/packages/${id}`, { method: 'DELETE' });
	return (await response.json()) as { id: string; deleted: boolean };
}

export async function listBenefitsApi(): Promise<Benefit[]> {
	const response = await apiRequest('superadmin/benefits');
	const body = (await response.json()) as { items: Benefit[] };
	return body.items ?? [];
}

export async function createBenefitApi(input: BenefitInput): Promise<Benefit> {
	const response = await apiRequest('superadmin/benefits', jsonInit('POST', input));
	return (await response.json()) as Benefit;
}

export async function updateBenefitApi(
	id: string,
	input: Omit<Partial<BenefitInput>, 'code'>
): Promise<Benefit> {
	const response = await apiRequest(`superadmin/benefits/${id}`, jsonInit('PUT', input));
	return (await response.json()) as Benefit;
}

export async function toggleBenefitApi(id: string): Promise<Benefit> {
	const response = await apiRequest(`superadmin/benefits/${id}/toggle`, { method: 'PATCH' });
	return (await response.json()) as Benefit;
}

export async function deleteBenefitApi(
	id: string
): Promise<{ id: string; deleted: boolean }> {
	const response = await apiRequest(`superadmin/benefits/${id}`, { method: 'DELETE' });
	return (await response.json()) as { id: string; deleted: boolean };
}

export async function listTopupPackagesApi(): Promise<CreditTopupPackage[]> {
	const response = await apiRequest('superadmin/topup-packages');
	const body = (await response.json()) as { items: CreditTopupPackage[] };
	return body.items ?? [];
}

export async function getTopupPackageApi(id: string): Promise<CreditTopupPackage> {
	const response = await apiRequest(`superadmin/topup-packages/${id}`);
	return (await response.json()) as CreditTopupPackage;
}

export async function createTopupPackageApi(
	input: CreditTopupPackageInput
): Promise<CreditTopupPackage> {
	const response = await apiRequest(
		'superadmin/topup-packages',
		jsonInit('POST', input)
	);
	return (await response.json()) as CreditTopupPackage;
}

export async function updateTopupPackageApi(
	id: string,
	input: Partial<CreditTopupPackageInput>
): Promise<CreditTopupPackage> {
	const response = await apiRequest(
		`superadmin/topup-packages/${id}`,
		jsonInit('PUT', input)
	);
	return (await response.json()) as CreditTopupPackage;
}

export async function toggleTopupPackageApi(id: string): Promise<CreditTopupPackage> {
	const response = await apiRequest(`superadmin/topup-packages/${id}/toggle`, {
		method: 'PATCH'
	});
	return (await response.json()) as CreditTopupPackage;
}

export async function deleteTopupPackageApi(
	id: string
): Promise<{ id: string; deleted: boolean }> {
	const response = await apiRequest(`superadmin/topup-packages/${id}`, {
		method: 'DELETE'
	});
	return (await response.json()) as { id: string; deleted: boolean };
}

export async function listSubscriptionsApi(
	query: SubscriptionsQuery = {}
): Promise<SubscriptionListResponse> {
	const response = await apiRequest(
		`superadmin/subscriptions${toQuery({
			status: query.status,
			page: query.page,
			limit: query.limit,
			search: query.search
		})}`
	);
	return (await response.json()) as SubscriptionListResponse;
}

export async function overrideSubscriptionApi(
	id: string,
	input: OverrideSubscriptionInput
): Promise<Subscription> {
	const response = await apiRequest(
		`superadmin/subscriptions/${id}/override`,
		jsonInit('PATCH', input)
	);
	return (await response.json()) as Subscription;
}

export async function listUsersApi(query: UserListQuery = {}): Promise<UserListResponse> {
	const response = await apiRequest(
		`superadmin/users${toQuery({
			search: query.search,
			role: query.role,
			tier: query.tier,
			subscriptionStatus: query.subscriptionStatus,
			emailVerified:
				query.emailVerified === undefined ? undefined : String(query.emailVerified),
			onboardingCompleted:
				query.onboardingCompleted === undefined
					? undefined
					: String(query.onboardingCompleted),
			page: query.page,
			limit: query.limit
		})}`
	);
	return (await response.json()) as UserListResponse;
}

export async function getUserStatsApi(): Promise<UserStatsResponse> {
	const response = await apiRequest('superadmin/users/stats');
	return (await response.json()) as UserStatsResponse;
}

export async function getUserDetailApi(userId: string): Promise<UserDetail> {
	const response = await apiRequest(`superadmin/users/${userId}`);
	return (await response.json()) as UserDetail;
}

export async function updateUserRoleApi(
	userId: string,
	role: UserRole
): Promise<UpdateUserRoleResponse> {
	const response = await apiRequest(
		`superadmin/users/${userId}/role`,
		jsonInit('PATCH', { role })
	);
	return (await response.json()) as UpdateUserRoleResponse;
}

export async function getBillingOverviewApi(): Promise<BillingOverviewResponse> {
	const response = await apiRequest('superadmin/billing/overview');
	return (await response.json()) as BillingOverviewResponse;
}

export async function listBillingUsersApi(
	query: BillingUsersQuery = {}
): Promise<BillingUsersResponse> {
	const response = await apiRequest(
		`superadmin/billing/users${toQuery({
			search: query.search,
			billingStatus: query.billingStatus,
			tier: query.tier,
			role: query.role,
			packageId: query.packageId,
			page: query.page,
			limit: query.limit
		})}`
	);
	return (await response.json()) as BillingUsersResponse;
}

export async function getBillingUserDetailApi(userId: string): Promise<BillingUserDetail> {
	const response = await apiRequest(`superadmin/billing/users/${userId}`);
	return (await response.json()) as BillingUserDetail;
}

export async function updateUserQuotasApi(
	userId: string,
	input: UpdateUserQuotasInput
): Promise<BillingUserDetail> {
	const response = await apiRequest(
		`superadmin/billing/users/${userId}/quotas`,
		jsonInit('PATCH', input)
	);
	return (await response.json()) as BillingUserDetail;
}

export async function assignUserSubscriptionApi(
	userId: string,
	input: AssignUserSubscriptionInput
): Promise<BillingUserDetail> {
	const response = await apiRequest(
		`superadmin/billing/users/${userId}/subscription`,
		jsonInit('PUT', input)
	);
	return (await response.json()) as BillingUserDetail;
}

export async function listJobsApi(query: ScrapedJobsQuery = {}): Promise<ScrapedJobsResponse> {
	const response = await apiRequest(
		`superadmin/jobs${toQuery({
			status: query.status,
			sourceType: query.sourceType,
			sourceId: query.sourceId,
			page: query.page,
			limit: query.limit,
			search: query.search
		})}`
	);
	return (await response.json()) as ScrapedJobsResponse;
}

export async function getJobApi(id: string): Promise<ScrapedJobDetail> {
	const response = await apiRequest(`superadmin/jobs/${id}`);
	return (await response.json()) as ScrapedJobDetail;
}

export async function updateJobApi(
	id: string,
	input: UpdateScrapedJobInput
): Promise<ScrapedJob> {
	const response = await apiRequest(`superadmin/jobs/${id}`, jsonInit('PUT', input));
	return (await response.json()) as ScrapedJob;
}

export async function updateJobStatusApi(id: string, status: JobStatus): Promise<ScrapedJob> {
	const response = await apiRequest(
		`superadmin/jobs/${id}/status`,
		jsonInit('PATCH', { status })
	);
	return (await response.json()) as ScrapedJob;
}

/**
 * One-shot audit action: update status and optional edits atomically.
 * Backend route: PATCH /api/superadmin/jobs/:id/review
 */
export async function reviewJobApi(
	id: string,
	input: ReviewScrapedJobInput
): Promise<ScrapedJob> {
	const response = await apiRequest(`superadmin/jobs/${id}/review`, jsonInit('PATCH', input));
	return (await response.json()) as ScrapedJob;
}

export async function deleteJobApi(
	id: string
): Promise<{ success: boolean; id: string }> {
	const response = await apiRequest(`superadmin/jobs/${id}`, { method: 'DELETE' });
	return (await response.json()) as { success: boolean; id: string };
}

function normalizeIngestionSourceType(value: unknown): IngestionSourceKind {
	if (value === 'TELEGRAM' || value === 'TELEGRAM_CHANNEL') return 'TELEGRAM';
	if (value === 'WEBSITE_HTML' || value === 'CORPORATE_WEBSITE') return 'WEBSITE_HTML';
	if (value === 'WEBSITE_API') return 'WEBSITE_API';
	if (value === 'USER_EXTRACTION') return 'USER_EXTRACTION';
	return 'TELEGRAM';
}

function normalizeIngestionPaginationType(value: unknown): IngestionPaginationType {
	if (
		value === 'LOKER_SEMAR' ||
		value === 'LOKER_MURIA' ||
		value === 'WORKDAY_JSON' ||
		value === 'DEFAULT'
	) {
		return value;
	}
	return 'DEFAULT';
}

/**
 * The backend is being migrated to the URL/pagination/selector contract.
 * This adapter keeps legacy rows (`TELEGRAM_CHANNEL`/`CORPORATE_WEBSITE` +
 * `identifier`) renderable while the new endpoints are being implemented.
 */
function normalizeIngestionSource(value: unknown): IngestionSource {
	const raw =
		typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

	return {
		id: typeof raw.id === 'string' ? raw.id : '',
		name: typeof raw.name === 'string' ? raw.name : '',
		type: normalizeIngestionSourceType(raw.type),
		url:
			typeof raw.url === 'string'
				? raw.url
				: typeof raw.identifier === 'string'
					? raw.identifier
					: '',
		paginationType: normalizeIngestionPaginationType(raw.paginationType),
		maxPages:
			typeof raw.maxPages === 'number' && Number.isFinite(raw.maxPages)
				? raw.maxPages
				: null,
		listSelector: typeof raw.listSelector === 'string' ? raw.listSelector : null,
		detailSelector: typeof raw.detailSelector === 'string' ? raw.detailSelector : null,
		isActive: raw.isActive !== false,
		lastScrapedAt: typeof raw.lastScrapedAt === 'string' ? raw.lastScrapedAt : null,
		statusMessage: typeof raw.statusMessage === 'string' ? raw.statusMessage : null,
		createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
		updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : ''
	};
}

export async function listSourcesApi(): Promise<IngestionSource[]> {
	const response = await apiRequest('superadmin/sources');
	const body = (await response.json()) as { items?: unknown[] };
	return (body.items ?? []).map(normalizeIngestionSource);
}

export async function createSourceApi(input: IngestionSourceInput): Promise<IngestionSource> {
	const response = await apiRequest('superadmin/sources', jsonInit('POST', input));
	return normalizeIngestionSource(await response.json());
}

export async function updateSourceApi(
	id: string,
	input: UpdateIngestionSourceInput
): Promise<IngestionSource> {
	const response = await apiRequest(`superadmin/sources/${id}`, jsonInit('PUT', input));
	return normalizeIngestionSource(await response.json());
}

export async function toggleSourceApi(id: string): Promise<IngestionSource> {
	const response = await apiRequest(`superadmin/sources/${id}/toggle`, { method: 'PATCH' });
	return normalizeIngestionSource(await response.json());
}

export async function bulkUpdateSourceStatusApi(
	payload: BulkSourceStatusPayload
): Promise<BulkSourceStatusResult> {
	const response = await apiRequest(
		'superadmin/sources/bulk-status',
		jsonInit('PATCH', payload)
	);
	return (await response.json()) as BulkSourceStatusResult;
}

export async function startScraperRunApi(
	input: StartScraperRunInput
): Promise<StartScraperRunResponse> {
	const response = await apiRequest('superadmin/scraper/run', jsonInit('POST', input));
	return (await response.json()) as StartScraperRunResponse;
}

export async function getScraperRunApi(runId: string): Promise<ScraperRun> {
	const response = await apiRequest(`superadmin/scraper/runs/${runId}`);
	return (await response.json()) as ScraperRun;
}

export async function stopScraperRunApi(runId: string): Promise<ScraperRun> {
	const response = await apiRequest(`superadmin/scraper/runs/${runId}/stop`, {
		method: 'POST'
	});
	return (await response.json()) as ScraperRun;
}

export async function stopAllScraperRunsApi(): Promise<StopAllScraperRunsResult> {
	const response = await apiRequest('superadmin/scraper/stop', { method: 'POST' });
	return (await response.json()) as StopAllScraperRunsResult;
}

export async function listScraperRunsApi(): Promise<ScraperRun[]> {
	const response = await apiRequest('superadmin/scraper/runs');
	const body = (await response.json()) as { items?: ScraperRun[] };
	return body.items ?? [];
}

export async function deleteSourceApi(id: string): Promise<DeleteSourceResult> {
	const response = await apiRequest(`superadmin/sources/${id}`, { method: 'DELETE' });
	return (await response.json()) as DeleteSourceResult;
}

export type TelegramScraperAction = 'START' | 'STOP';
export type TelegramScrapeMode = 'CURSOR' | 'TODAY';
export type TelegramScrapeRunLifecycle =
	| 'IDLE'
	| 'RUNNING'
	| 'STOPPING'
	| 'COMPLETED'
	| 'CANCELLED'
	| 'FAILED';

export interface TelegramScrapeRunStatus {
	status: TelegramScrapeRunLifecycle;
	mode: TelegramScrapeMode | null;
	startedAt: string | null;
	finishedAt: string | null;
	totalSources: number;
	processedSources: number;
	totalMessages: number;
	ingestedJobs: number;
	skippedMessages: number;
	failedMessages: number;
	currentSource: string | null;
	error: string | null;
}

export interface TelegramScraperStatus {
	status?: string;
	enabled: boolean;
	isRunning?: boolean;
	isConnecting?: boolean;
	isDisconnecting?: boolean;
	connected: boolean;
	startedAt: string | null;
	lastError: string | null;
	apiConfigured: boolean;
	sessionConfigured: boolean;
	messagesSeen?: number;
	jobsIngested?: number;
	scrapeRun?: TelegramScrapeRunStatus | null;
}

export interface TelegramRunInput {
	mode: TelegramScrapeMode;
	sourceIds?: string[];
	maxMessagesPerSource?: number;
}

export interface TelegramRunResponse extends TelegramScraperStatus {
	result: 'STARTED';
}

export interface TelegramStopRunResponse extends TelegramScraperStatus {
	result: 'STOPPED' | 'ALREADY_STOPPING' | 'ALREADY_STOPPED';
}

export async function getTelegramStatusApi(): Promise<TelegramScraperStatus> {
	const response = await apiRequest('superadmin/telegram/status');
	return (await response.json()) as TelegramScraperStatus;
}

export async function toggleTelegramScraperApi(
	action: TelegramScraperAction
): Promise<TelegramScraperStatus> {
	const response = await apiRequest('superadmin/telegram/toggle', jsonInit('POST', { action }));
	return (await response.json()) as TelegramScraperStatus;
}

export async function runTelegramScraperApi(
	input: TelegramRunInput
): Promise<TelegramRunResponse> {
	const response = await apiRequest(
		'superadmin/telegram/run',
		jsonInit('POST', input)
	);
	return (await response.json()) as TelegramRunResponse;
}

export async function stopTelegramScraperRunApi(): Promise<TelegramStopRunResponse> {
	const response = await apiRequest('superadmin/telegram/run/stop', {
		method: 'POST'
	});
	return (await response.json()) as TelegramStopRunResponse;
}
