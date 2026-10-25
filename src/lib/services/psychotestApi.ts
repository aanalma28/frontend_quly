import { apiRequest } from '#lib/utils/api.js';

/**
 * Psychotest (user-side) API client — attempt-centric.
 *
 * All requests go through `apiRequest`, which prepends the configured API base
 * URL and injects the Bearer token, so these resolve to `/api/psychotest/...`.
 */

export type PsychotestCategory = 'PERSONALITY' | 'COGNITIVE' | 'ACCURACY';
export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED';
export type AttemptStatus = 'IN_PROGRESS' | 'COMPLETED';
export type CompetencyLevel = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export interface PsychotestPackage {
	id: string;
	title: string;
	category: PsychotestCategory;
	description: string | null;
	durationMin: number;
	questionCount: number;
	createdAt: string;
}

export interface AttemptPackage {
	packageId: string;
	sessionId: string;
	title: string;
	category: PsychotestCategory;
	durationMin: number;
	questionCount?: number;
	status: SessionStatus;
}

export interface StartAttemptResponse {
	attemptId: string;
	status: AttemptStatus;
	startedAt: string;
	packages: AttemptPackage[];
}

export interface QuestionOption {
	id: string;
	text: string;
}

export interface PsychotestQuestion {
	id: string;
	questionText: string;
	options: QuestionOption[];
	order: number;
}

export interface QuestionsResponse {
	attemptId: string;
	packageId: string;
	sessionId: string;
	title: string;
	category: PsychotestCategory;
	durationMin: number;
	status: SessionStatus;
	startedAt: string;
	questions: PsychotestQuestion[];
}

export interface ScoredPackageResult {
	category: 'COGNITIVE' | 'ACCURACY';
	totalQuestions: number;
	answered: number;
	skipped: number;
	correct: number;
	incorrect: number;
	accuracy: number;
	passed: boolean;
	summary: string;
}

export interface PersonalityPackageResult {
	category: 'PERSONALITY';
	totalQuestions: number;
	answered: number;
	skipped: number;
	dominantOption: string | null;
	dominantTrait: string | null;
	distribution: Record<string, number>;
	summary: string;
}

export type PackageScoreResult = ScoredPackageResult | PersonalityPackageResult;

export interface SubmitPackageResponse {
	attemptId: string;
	packageId: string;
	sessionId: string;
	packageStatus: SessionStatus;
	attemptStatus: AttemptStatus;
	allPackagesCompleted: boolean;
	completedPackages: number;
	totalPackages: number;
	nextPackageId: string | null;
	scoreResult: PackageScoreResult;
}

export interface AggregateScore {
	averageAccuracy: number | null;
	totalCorrect: number;
	totalIncorrect: number;
	totalSkipped: number;
	personality: {
		dominantOption: string | null;
		dominantTrait: string | null;
		distribution: Record<string, number>;
	} | null;
	packages: Array<{
		packageId: string;
		title: string;
		category: PsychotestCategory;
		scoreResult: PackageScoreResult | null;
	}>;
}

export interface AiAnalysis {
	overallScore: number;
	competencyLevel: CompetencyLevel;
	summary: string;
	strengths: string[];
	areasForImprovement: string[];
	recommendedRoles: string[];
	candidateName: string;
	certificateNumber: string;
	issuedAt: string;
	packages: Array<{
		packageId: string;
		title: string;
		category: PsychotestCategory;
		scoreResult: PackageScoreResult | null;
	}>;
	aggregateScore: AggregateScore;
}

export interface AttemptDetailPackage {
	packageId: string;
	sessionId: string;
	title: string;
	category: PsychotestCategory;
	durationMin: number;
	status: SessionStatus;
	startedAt: string;
	completedAt: string | null;
	scoreResult: PackageScoreResult | null;
}

export interface CertificateQuota {
	limit: number;
	used: number;
	remaining: number;
}

export interface AttemptDetail {
	attemptId: string;
	status: AttemptStatus;
	startedAt: string;
	completedAt: string | null;
	candidate: {
		fullName: string;
		email: string;
	};
	packages: AttemptDetailPackage[];
	aggregateScore: AggregateScore;
	aiAnalysis: AiAnalysis | null;
	certificate: {
		available: boolean;
		generatedAt: string | null;
		downloadUrl: string | null;
	};
	quota: {
		certificate: CertificateQuota;
	};
}

export interface AttemptHistoryItem {
	attemptId: string;
	status: AttemptStatus;
	startedAt: string;
	completedAt: string | null;
	certificateAvailable: boolean;
	certificateGeneratedAt: string | null;
	overallScore: number | null;
	competencyLevel: CompetencyLevel | null;
	packages: Array<{
		packageId: string;
		title: string;
		category: PsychotestCategory;
		status: SessionStatus;
	}>;
}

export interface AttemptHistoryResponse {
	items: AttemptHistoryItem[];
}

/** Available psychotest packages (array, not wrapped in `{ items }`). */
export async function getPackagesApi(): Promise<PsychotestPackage[]> {
	const response = await apiRequest('psychotest/packages');
	return (await response.json()) as PsychotestPackage[];
}

/** Start one attempt covering all packages (or `packageIds` if provided). */
export async function startAttemptApi(packageIds?: string[]): Promise<StartAttemptResponse> {
	const response = await apiRequest('psychotest/attempts', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(packageIds && packageIds.length > 0 ? { packageIds } : {})
	});
	return (await response.json()) as StartAttemptResponse;
}

/** Attempt history (newest first). */
export async function getAttemptsApi(): Promise<AttemptHistoryResponse> {
	const response = await apiRequest('psychotest/attempts');
	return (await response.json()) as AttemptHistoryResponse;
}

/** Full attempt detail: progress, per-package results, aggregate, AI, certificate. */
export async function getAttemptApi(attemptId: string): Promise<AttemptDetail> {
	const response = await apiRequest(`psychotest/attempts/${attemptId}`);
	return (await response.json()) as AttemptDetail;
}

/** Questions for one package of an attempt (no `correctKey` is returned). */
export async function getQuestionsApi(
	attemptId: string,
	packageId: string
): Promise<QuestionsResponse> {
	const response = await apiRequest(
		`psychotest/attempts/${attemptId}/packages/${packageId}/questions`
	);
	return (await response.json()) as QuestionsResponse;
}

/** Submit answers for a single package. */
export async function submitPackageApi(
	attemptId: string,
	packageId: string,
	answers: Record<string, string>
): Promise<SubmitPackageResponse> {
	const response = await apiRequest(
		`psychotest/attempts/${attemptId}/packages/${packageId}/submit`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ answers })
		}
	);
	return (await response.json()) as SubmitPackageResponse;
}

/** Generate the AI analysis + certificate (idempotent on the backend). */
export async function generateCertificateApi(attemptId: string): Promise<AttemptDetail> {
	const response = await apiRequest(`psychotest/attempts/${attemptId}/certificate`, {
		method: 'POST'
	});
	return (await response.json()) as AttemptDetail;
}

/** Download the certificate PDF as a Blob (Authorization header is injected). */
export async function downloadCertificateApi(attemptId: string): Promise<Blob> {
	const response = await apiRequest(`psychotest/attempts/${attemptId}/certificate`);
	return await response.blob();
}
