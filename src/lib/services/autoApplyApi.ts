import { apiRequest } from '#lib/utils/api.js';
import type { JobListItem } from '#lib/services/jobApi.js';
import type { UserBenefitQuota } from '#lib/services/billingApi.js';

export interface GmailStatusResponse {
	connected: boolean;
}

export interface GmailConnectResponse {
	authUrl: string;
}

export interface GmailCallbackUrlResponse {
	callbackUrl: string;
}

export async function getGmailStatusApi(): Promise<GmailStatusResponse> {
	const response = await apiRequest('auth/gmail/status');
	return (await response.json()) as GmailStatusResponse;
}

export async function getGmailConnectUrlApi(): Promise<GmailConnectResponse> {
	const response = await apiRequest('auth/gmail/connect');
	return (await response.json()) as GmailConnectResponse;
}

export async function getGmailCallbackUrlApi(): Promise<GmailCallbackUrlResponse> {
	const response = await apiRequest('auth/gmail/callback-url');
	return (await response.json()) as GmailCallbackUrlResponse;
}

export async function disconnectGmailApi(): Promise<GmailStatusResponse> {
	const response = await apiRequest('auth/gmail/disconnect', { method: 'DELETE' });
	return (await response.json()) as GmailStatusResponse;
}

export interface ExtractionUsage {
	source: 'QUOTA' | 'CREDIT' | 'UNLIMITED' | string;
	creditsCharged: number;
	creditPriceIdr: number;
	costIdr: number;
}

export interface ExtractedJob {
	id?: string | null;
	jobId?: string | null;
	companyName: string | null;
	jobTitle: string | null;
	recipientEmail: string | null;
	description: string | null;
	subjectFormat?: string | null;
	applicationInstructions?: string | null;
	location?: string | null;
	workplaceType?: string | null;
	employmentType?: string | null;
	applicationType?: string | null;
	applicationDestination?: string | null;
	sourceType?: string | null;
	createdById?: string | null;
	isOwner?: boolean;
	canEdit?: boolean;
}

export interface ExternalJobExtractionResult {
	valid: boolean;
	reason: string | null;
	charged: boolean;
	deduplicated?: boolean;
	jobId?: string | null;
	job?: ExtractedJob | null;
	usage: ExtractionUsage | null;
}

export interface ExternalJobExtractionBatchResponse {
	items: ExternalJobExtractionResult[];
}

/** Extract one text or up to ten poster images in a single backend request. */
export async function extractExternalJobsApi(input: {
	text?: string;
	images?: File[];
}): Promise<ExternalJobExtractionBatchResponse> {
	const formData = new FormData();
	if (input.text?.trim()) formData.append('text', input.text.trim());
	for (const image of input.images ?? []) {
		formData.append('images', image, image.name);
	}

	const response = await apiRequest('auto-apply/extract-job', {
		method: 'POST',
		body: formData
	});
	const body = (await response.json()) as
		| ExternalJobExtractionBatchResponse
		| ExternalJobExtractionResult;

	// Compatibility with an older backend which returned one item directly.
	return 'items' in body ? body : { items: [body] };
}

/** Legacy single-image helper kept for callers outside the bulk modal. */
export async function extractExternalJobApi(input: {
	text?: string;
	image?: File | null;
}): Promise<ExternalJobExtractionResult> {
	const response = await extractExternalJobsApi({
		text: input.text,
		images: input.image ? [input.image] : []
	});
	return (
		response.items[0] ?? {
			valid: false,
			reason: 'Tidak ada hasil ekstraksi.',
			charged: false,
			jobId: null,
			job: null,
			usage: null
		}
	);
}

export interface EmailPreviewInput {
	jobId?: string;
	jobTitle?: string;
	companyName?: string;
	description?: string;
	subjectFormat?: string;
	applicationInstructions?: string;
}

export interface EmailPreviewResponse {
	subject: string;
	body: string;
}

export interface EmailDraftPreview {
	subject: string;
	body: string;
	loading: boolean;
	error: string | null;
}

export async function previewEmailApi(input: EmailPreviewInput): Promise<EmailPreviewResponse> {
	const response = await apiRequest('auto-apply/preview-email', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input)
	});
	return (await response.json()) as EmailPreviewResponse;
}

export interface PrepareApplicationItem {
	jobId?: string;
	jobTitle?: string;
	companyName?: string;
	recipientEmail: string;
	description?: string;
	subjectFormat?: string;
	applicationInstructions?: string;
	emailSubject?: string;
	emailBody?: string;
}

export interface PrepareAutoApplyInput {
	cvFileId?: string;
	psychotestSessionId?: string;
	items: PrepareApplicationItem[];
}

export interface PreparedApplication {
	id: string;
	jobTitle: string;
	companyName: string;
	recipientEmail: string;
	status: string;
	scheduledAt?: string | null;
	error?: string;
}

export interface PrepareAutoApplyResponse {
	items: PreparedApplication[];
	queued: number;
}

export async function prepareAutoApplyApi(
	input: PrepareAutoApplyInput
): Promise<PrepareAutoApplyResponse> {
	const response = await apiRequest('auto-apply/prepare', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input)
	});
	return (await response.json()) as PrepareAutoApplyResponse;
}

export type AutoApplyApplicationStatus =
	| 'PENDING'
	| 'SENT'
	| 'READ'
	| 'REPLIED'
	| 'FAILED';

export interface AutoApplyApplication {
	id: string;
	jobId: string | null;
	jobTitle: string;
	companyName: string;
	recipientEmail: string;
	subject: string;
	status: AutoApplyApplicationStatus;
	scheduledAt: string | null;
	sentAt: string | null;
	readAt: string | null;
	repliedAt: string | null;
	failureReason: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface AutoApplyApplicationsResponse {
	items: AutoApplyApplication[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export async function listAutoApplyApplicationsApi(
	page = 1,
	limit = 20
): Promise<AutoApplyApplicationsResponse> {
	const response = await apiRequest(`auto-apply/applications?page=${page}&limit=${limit}`);
	return (await response.json()) as AutoApplyApplicationsResponse;
}

export async function getAutoApplyApplicationApi(id: string): Promise<AutoApplyApplication> {
	const response = await apiRequest(`auto-apply/applications/${id}`);
	return (await response.json()) as AutoApplyApplication;
}

/** Manually mark an application as READ or REPLIED. */
export async function updateAutoApplyApplicationStatusApi(
	id: string,
	status: 'READ' | 'REPLIED'
): Promise<AutoApplyApplication> {
	const response = await apiRequest(`auto-apply/applications/${id}/status`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ status })
	});
	return (await response.json()) as AutoApplyApplication;
}

export interface AutoApplyJobOption {
	key: string;
	source: 'bookmark' | 'manual';
	jobId?: string;
	jobTitle: string;
	companyName: string;
	recipientEmail: string;
	description?: string;
	subjectFormat?: string;
	applicationInstructions?: string;
	location?: string;
	workplaceType?: string;
	employmentType?: string;
	applicationType?: string;
	applicationDestination?: string;
	isUserExtracted?: boolean;
	isOwner?: boolean;
	canEdit?: boolean;
	matchScore?: number | null;
	needsEmail: boolean;
	selected: boolean;
}

export function bookmarkToAutoApplyOption(job: JobListItem): AutoApplyJobOption {
	const destination = job.applicationDestination?.trim() ?? '';
	const destinationIsEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination);
	const recipientEmail =
		job.applicationType === 'EMAIL' && destinationIsEmail ? destination : '';

	return {
		key: `bookmark:${job.id}`,
		source: 'bookmark',
		jobId: job.id,
		jobTitle: job.jobTitle,
		companyName: job.companyName,
		recipientEmail,
		description: job.jobDescriptionSummary ?? undefined,
		location: job.location,
		workplaceType: job.workplaceType,
		employmentType: job.employmentType,
		applicationType: job.applicationType,
		applicationDestination: job.applicationDestination,
		isUserExtracted: job.isUserExtracted,
		isOwner: job.isOwner,
		canEdit: job.canEdit,
		matchScore: job.matchScore?.score ?? null,
		needsEmail: !recipientEmail,
		selected: false
	};
}

export interface EmailApplicationBenefitState {
	benefit: UserBenefitQuota | null;
	creditBalance: number;
}
