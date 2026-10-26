import { apiRequest } from '#lib/utils/api.js';

/**
 * Admin psychotest API client (`/api/admin/psychotest/...`).
 *
 * All endpoints require an ADMIN/SUPER_ADMIN access token; `apiRequest`
 * injects the Bearer token and throws `ApiError` (with status/code) on failure.
 */

export type PsychotestCategory = 'PERSONALITY' | 'COGNITIVE' | 'ACCURACY';
export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface PackageSummary {
	totalPackages: number;
	totalQuestions: number;
	totalAttempts: number;
	totalCompletedAttempts: number;
	averageAccuracy: number | null;
}

export interface AdminPackageListItem {
	id: string;
	title: string;
	category: PsychotestCategory;
	description: string | null;
	durationMin: number;
	questionCount: number;
	attemptCount: number;
	completedAttemptCount: number;
	averageAccuracy: number | null;
	lastAttemptAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface AdminPackagesResponse {
	items: AdminPackageListItem[];
	summary: PackageSummary;
}

export interface QuestionOption {
	id: string;
	text: string;
}

export interface AdminQuestion {
	id: string;
	packageId: string;
	questionText: string;
	options: QuestionOption[];
	correctKey: string | null;
	order: number;
	createdAt: string;
	updatedAt: string;
}

export interface AdminPackage {
	id: string;
	title: string;
	category: PsychotestCategory;
	description: string | null;
	durationMin: number;
	createdAt?: string;
	updatedAt?: string;
}

export interface AdminPackageDetail extends AdminPackage {
	questions: AdminQuestion[];
}

export interface AdminPackageQuestionsResponse {
	package: {
		id: string;
		title: string;
		category: PsychotestCategory;
		description: string | null;
		durationMin: number;
		questionCount: number;
	};
	questions: AdminQuestion[];
}

export interface CreatePackageInput {
	title: string;
	category: PsychotestCategory;
	description?: string;
	durationMin: number;
}

export type UpdatePackageInput = Partial<CreatePackageInput>;

export interface CreateQuestionInput {
	questionText: string;
	options: QuestionOption[];
	correctKey?: string;
	order: number;
}

export interface UpdateQuestionInput {
	questionText?: string;
	options?: QuestionOption[];
	correctKey?: string | null;
	order?: number;
}

export interface AdminAttemptItem {
	attemptId: string;
	sessionId: string;
	candidate: {
		id: string;
		email: string;
		fullName: string | null;
	};
	package: {
		id: string;
		title: string;
		category: PsychotestCategory;
	};
	status: SessionStatus;
	scoreResult: Record<string, unknown> | null;
	startedAt: string;
	completedAt: string | null;
	session: {
		status: string;
		startedAt: string;
		completedAt: string | null;
		aggregateScore: unknown;
	};
}

export interface AdminAttemptsResponse {
	items: AdminAttemptItem[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface AdminAttemptsQuery {
	page?: number;
	limit?: number;
	status?: SessionStatus;
	packageId?: string;
	sessionId?: string;
	search?: string;
}

export async function listAdminPackagesApi(): Promise<AdminPackagesResponse> {
	const response = await apiRequest('admin/psychotest/packages');
	return (await response.json()) as AdminPackagesResponse;
}

export async function createAdminPackageApi(input: CreatePackageInput): Promise<AdminPackage> {
	const response = await apiRequest('admin/psychotest/packages', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input)
	});
	return (await response.json()) as AdminPackage;
}

export async function getAdminPackageApi(packageId: string): Promise<AdminPackageDetail> {
	const response = await apiRequest(`admin/psychotest/packages/${packageId}`);
	return (await response.json()) as AdminPackageDetail;
}

export async function updateAdminPackageApi(
	packageId: string,
	input: UpdatePackageInput
): Promise<AdminPackage> {
	const response = await apiRequest(`admin/psychotest/packages/${packageId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input)
	});
	return (await response.json()) as AdminPackage;
}

export async function deleteAdminPackageApi(packageId: string): Promise<{ id: string; deleted: boolean }> {
	const response = await apiRequest(`admin/psychotest/packages/${packageId}`, {
		method: 'DELETE'
	});
	return (await response.json()) as { id: string; deleted: boolean };
}

export async function getAdminPackageQuestionsApi(
	packageId: string
): Promise<AdminPackageQuestionsResponse> {
	const response = await apiRequest(`admin/psychotest/packages/${packageId}/questions`);
	return (await response.json()) as AdminPackageQuestionsResponse;
}

export async function addAdminQuestionApi(
	packageId: string,
	input: CreateQuestionInput
): Promise<AdminQuestion> {
	const response = await apiRequest(`admin/psychotest/packages/${packageId}/questions`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input)
	});
	return (await response.json()) as AdminQuestion;
}

export async function updateAdminQuestionApi(
	questionId: string,
	input: UpdateQuestionInput
): Promise<AdminQuestion> {
	const response = await apiRequest(`admin/psychotest/questions/${questionId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input)
	});
	return (await response.json()) as AdminQuestion;
}

export async function deleteAdminQuestionApi(
	questionId: string
): Promise<{ id: string; deleted: boolean }> {
	const response = await apiRequest(`admin/psychotest/questions/${questionId}`, {
		method: 'DELETE'
	});
	return (await response.json()) as { id: string; deleted: boolean };
}

export async function listAdminAttemptsApi(
	query: AdminAttemptsQuery = {}
): Promise<AdminAttemptsResponse> {
	const params = new URLSearchParams();
	if (query.page) params.set('page', String(query.page));
	if (query.limit) params.set('limit', String(query.limit));
	if (query.status) params.set('status', query.status);
	if (query.packageId) params.set('packageId', query.packageId);
	if (query.sessionId) params.set('sessionId', query.sessionId);
	if (query.search?.trim()) params.set('search', query.search.trim());

	const suffix = params.toString();
	const response = await apiRequest(`admin/psychotest/attempts${suffix ? `?${suffix}` : ''}`);
	return (await response.json()) as AdminAttemptsResponse;
}
