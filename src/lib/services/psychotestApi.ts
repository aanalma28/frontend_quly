import { apiRequest } from '#lib/utils/api.js';

/**
 * Psychotest (user-side) API client — session-centric.
 *
 * A `PsychotestSession` covers all packages; each package is a
 * `PsychotestAttempt`. All requests go through `apiRequest`, which prepends
 * the configured API base URL and injects the Bearer token.
 */

export type PsychotestCategory = 'PERSONALITY' | 'COGNITIVE' | 'ACCURACY';
export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED';
export type AttemptStatus = SessionStatus;
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

export interface StartSessionPackage {
	packageId: string;
	attemptId: string;
	title: string;
	category: PsychotestCategory;
	durationMin: number;
	questionCount: number;
	status: SessionStatus;
}

export interface StartSessionResponse {
	sessionId: string;
	status: AttemptStatus;
	startedAt: string;
	packages: StartSessionPackage[];
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
	sessionId: string;
	packageId: string;
	attemptId: string;
	title: string;
	category: PsychotestCategory;
	durationMin: number;
	status: SessionStatus;
	startedAt: string;
	questions: PsychotestQuestion[];
}

export interface WorkCurvePoint {
	interval: number;
	answered: number;
	correct: number;
}

export interface CognitiveScoreResult {
	category: 'COGNITIVE';
	totalQuestions: number;
	answered: number;
	correct: number;
	incorrect: number;
	accuracy: number;
	durationMs: number;
	averageMsPerQuestion: number | null;
}

export interface AccuracyScoreResult {
	category: 'ACCURACY';
	totalQuestions: number;
	answered: number;
	correct: number;
	incorrect: number;
	accuracy: number;
	durationMs: number;
	workCurve: WorkCurvePoint[];
}

export interface PersonalityScoreResult {
	category: 'PERSONALITY';
	totalQuestions: number;
	answered: number;
	personalityType?: string;
	summary?: string;
	workStyle?: string[];
	strengths?: string[];
	areasForImprovement?: string[];
	communicationStyle?: string;
	items?: Array<{
		questionText: string;
		selectedOption: string;
	}>;
}

export type PackageScoreResult =
	| CognitiveScoreResult
	| AccuracyScoreResult
	| PersonalityScoreResult;

export interface AttemptTiming {
	durationMs: number;
	elapsedPerQuestion?: Record<string, number>;
}

export interface SubmitAttemptPayload {
	sessionId: string;
	packageId: string;
	answers: Record<string, string>;
	timing?: AttemptTiming;
}

export interface SubmitAttemptResponse {
	sessionId: string;
	attemptId: string;
	packageId: string;
	packageStatus: SessionStatus;
	sessionStatus: AttemptStatus;
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
		personalityType: string | null;
		summary: string | null;
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
	personality?: {
		personalityType: string | null;
		summary: string | null;
		workStyle: string[];
		strengths: string[];
		areasForImprovement: string[];
		communicationStyle: string | null;
	};
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

export interface SessionAttempt {
	attemptId: string;
	packageId: string;
	title: string;
	category: PsychotestCategory;
	durationMin: number;
	status: SessionStatus;
	startedAt: string;
	completedAt: string | null;
	scoreResult: PackageScoreResult | null;
}

export interface QuotaSummary {
	limit: number;
	used: number;
	remaining: number;
}

export interface SessionDetail {
	sessionId: string;
	status: AttemptStatus;
	startedAt: string;
	completedAt: string | null;
	candidate: {
		fullName: string;
		email: string;
	};
	attempts: SessionAttempt[];
	aggregateScore: AggregateScore;
	aiAnalysis: AiAnalysis | null;
	certificate: {
		available: boolean;
		generatedAt: string | null;
		downloadUrl: string | null;
		verificationUrl: string | null;
	};
	quota: {
		certificate: QuotaSummary;
		personality: QuotaSummary;
	};
}

export interface SessionHistoryItem {
	sessionId: string;
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

export interface SessionHistoryResponse {
	items: SessionHistoryItem[];
}

/** Available psychotest packages (array, not wrapped). */
export async function getPackagesApi(): Promise<PsychotestPackage[]> {
	const response = await apiRequest('psychotest/packages');
	return (await response.json()) as PsychotestPackage[];
}

/** Start one session covering all packages (or `packageIds` if provided). */
export async function startSessionApi(packageIds?: string[]): Promise<StartSessionResponse> {
	const response = await apiRequest('psychotest/session/start', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(packageIds && packageIds.length > 0 ? { packageIds } : {})
	});
	return (await response.json()) as StartSessionResponse;
}

/** Session history (newest first). */
export async function getSessionsApi(): Promise<SessionHistoryResponse> {
	const response = await apiRequest('psychotest/sessions');
	return (await response.json()) as SessionHistoryResponse;
}

/** Full session detail: per-package attempts, aggregate, AI, certificate. */
export async function getSessionApi(sessionId: string): Promise<SessionDetail> {
	const response = await apiRequest(`psychotest/session/${sessionId}`);
	return (await response.json()) as SessionDetail;
}

/** Questions for one package of a session (no `correctKey` is returned). */
export async function getQuestionsApi(
	sessionId: string,
	packageId: string
): Promise<QuestionsResponse> {
	const response = await apiRequest(
		`psychotest/session/${sessionId}/package/${packageId}/questions`
	);
	return (await response.json()) as QuestionsResponse;
}

/** Submit answers for a single package attempt. */
export async function submitAttemptApi(
	payload: SubmitAttemptPayload
): Promise<SubmitAttemptResponse> {
	const response = await apiRequest('psychotest/attempt/submit', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	});
	return (await response.json()) as SubmitAttemptResponse;
}

/** Generate the AI analysis + report (idempotent on the backend). */
export async function generateCertificateApi(sessionId: string): Promise<SessionDetail> {
	const response = await apiRequest(`psychotest/session/${sessionId}/certificate`, {
		method: 'POST'
	});
	return (await response.json()) as SessionDetail;
}

/** Download the report PDF as a Blob (Authorization header is injected). */
export async function downloadCertificateApi(sessionId: string): Promise<Blob> {
	const response = await apiRequest(`psychotest/session/${sessionId}/certificate`);
	return await response.blob();
}
