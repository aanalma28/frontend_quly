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
	| 'APPROVED'
	| 'SAVED'
	| 'PUBLISHED'
	| 'ARCHIVED'
	| 'REJECTED';
export type IngestionSourceType = 'TELEGRAM' | 'WEBSITE_HTML' | 'WEBSITE_API';
export type IngestionSourceKind = IngestionSourceType;
export type IngestionPaginationType =
	| 'LOKER_SEMAR'
	| 'LOKER_MURIA'
	| 'WORKDAY_JSON'
	| 'DEFAULT';
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
	sourceId?: string | null;
	source?: {
		id: string;
		name: string;
		url: string;
		type: IngestionSourceType;
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

function normalizeIngestionSourceType(value: unknown): IngestionSourceKind {
	if (value === 'TELEGRAM' || value === 'TELEGRAM_CHANNEL') return 'TELEGRAM';
	if (value === 'WEBSITE_HTML' || value === 'CORPORATE_WEBSITE') return 'WEBSITE_HTML';
	if (value === 'WEBSITE_API') return 'WEBSITE_API';
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
