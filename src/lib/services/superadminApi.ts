import { apiRequest } from '#lib/utils/api.js';

/**
 * Superadmin API client (`/api/superadmin/...`).
 *
 * All endpoints require a SUPER_ADMIN access token; `apiRequest` injects the
 * Bearer token and throws `ApiError` (status/code/message) on failure.
 */

export type PackageTier = 'FREE' | 'PRO' | 'ENTERPRISE';
export type SubStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type JobStatus =
	| 'RAW_PARSED'
	| 'PENDING_REVIEW'
	| 'PUBLISHED'
	| 'ARCHIVED'
	| 'REJECTED';
export type IngestionSourceType = 'TELEGRAM_CHANNEL' | 'CORPORATE_WEBSITE';
export type ApplicationType = 'EMAIL' | 'WEBSITE_PORTAL' | 'WHATSAPP' | 'TELEGRAM';
export type WorkplaceType = 'REMOTE' | 'WFO' | 'HYBRID';
export type EmploymentType = 'FULL_TIME' | 'CONTRACT' | 'FREELANCE' | 'INTERNSHIP';

export interface SubscriptionPackage {
	id: string;
	name: string;
	tier: PackageTier;
	price: number;
	durationDays: number;
	aiTokenLimit: number;
	features: string[];
	isActive: boolean;
	subscriberCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface SubscriptionPackageInput {
	name: string;
	tier: PackageTier;
	price: number;
	durationDays: number;
	aiTokenLimit: number;
	features: string[];
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
	applicationType: ApplicationType;
	applicationDestination: string;
	sourceType: IngestionSourceType;
	sourceDetail: string;
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
	applicationType?: ApplicationType;
	applicationDestination?: string;
	applicationInstructions?: string | null;
	expiresAt?: string | null;
	confidenceScore?: number | null;
}

export interface IngestionSource {
	id: string;
	name: string;
	type: IngestionSourceType;
	identifier: string;
	isActive: boolean;
	lastScrapedAt: string | null;
	statusMessage: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface IngestionSourceInput {
	name: string;
	type: IngestionSourceType;
	identifier: string;
	isActive?: boolean;
}

export interface AiUsageLog {
	id: string;
	featureName: string;
	provider: string;
	modelName: string;
	promptTokens: number;
	completionTokens: number;
	estimatedCostUsd: number;
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

export interface AiCostsQuery {
	from?: string;
	to?: string;
}

export interface AiCostsResponse {
	items: AiCostItem[];
	byFeature: AiCostByFeature[];
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

export async function listPackagesApi(): Promise<SubscriptionPackage[]> {
	const response = await apiRequest('superadmin/packages');
	const body = (await response.json()) as { items: SubscriptionPackage[] };
	return body.items ?? [];
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

export async function listJobsApi(query: ScrapedJobsQuery = {}): Promise<ScrapedJobsResponse> {
	const response = await apiRequest(
		`superadmin/jobs${toQuery({
			status: query.status,
			sourceType: query.sourceType,
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

export async function listSourcesApi(): Promise<IngestionSource[]> {
	const response = await apiRequest('superadmin/sources');
	const body = (await response.json()) as { items: IngestionSource[] };
	return body.items ?? [];
}

export async function createSourceApi(input: IngestionSourceInput): Promise<IngestionSource> {
	const response = await apiRequest('superadmin/sources', jsonInit('POST', input));
	return (await response.json()) as IngestionSource;
}

export async function toggleSourceApi(id: string): Promise<IngestionSource> {
	const response = await apiRequest(`superadmin/sources/${id}/toggle`, { method: 'PATCH' });
	return (await response.json()) as IngestionSource;
}

export async function deleteSourceApi(id: string): Promise<{ id: string; deleted: boolean }> {
	const response = await apiRequest(`superadmin/sources/${id}`, { method: 'DELETE' });
	return (await response.json()) as { id: string; deleted: boolean };
}

export type TelegramScraperAction = 'START' | 'STOP';

export interface TelegramScraperStatus {
	enabled: boolean;
	connected: boolean;
	startedAt: string | null;
	lastError: string | null;
	apiConfigured: boolean;
	sessionConfigured: boolean;
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
