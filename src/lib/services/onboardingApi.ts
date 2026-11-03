import { apiRequest } from '#lib/utils/api.js';

/**
 * Shared type definitions for the onboarding module.
 *
 * These mirror the NestJS DTOs in `src/modules/onboarding/dto` so the
 * frontend and backend stay aligned (camelCase payloads).
 */

export interface WorkExperience {
	company: string;
	position: string;
	location?: string;
	startDate?: string;
	endDate?: string;
	isCurrent?: boolean;
	description?: string;
}

export interface Education {
	institution: string;
	degree?: string;
	fieldOfStudy?: string;
	location?: string;
	startDate?: string;
	endDate?: string;
	description?: string;
}

export interface Certification {
	name: string;
	issuingOrganization?: string;
	issueDate?: string;
	expirationDate?: string;
	credentialId?: string;
	credentialUrl?: string;
}

export interface Project {
	name: string;
	description?: string;
	role?: string;
	technologies?: string[];
	projectUrl?: string;
	startDate?: string;
	endDate?: string;
}

/** Normalized CV profile returned by `POST /onboarding/parse-cv`. */
export interface ParsedCvData {
	fullName?: string;
	phone?: string;
	address?: string;
	linkedinUrl?: string | null;
	portfolioUrl?: string | null;
	githubUrl?: string | null;
	professionalSummary?: string;
	yearsOfExperience?: number;
	rawCvText?: string;
	aiCustomInstructions?: string;
	skills?: string[];
	languages?: string[];
	experiences?: WorkExperience[];
	educations?: Education[];
	certifications?: Certification[];
	projects?: Project[];
	/** Extra fields returned by parse-cv (fileHash, cached, etc.). */
	[key: string]: unknown;
}

/** Extra user-provided onboarding inputs. */
export interface AdditionalFormData {
	targetDomicile: string;
	jobCategory: string;
	careerSummary: string;
	targetRole: string;
}

/** ATS CV generation style, mirroring the backend `AtsStyleEnum`. */
export type AtsStyle = 'PROFESSIONAL_CORPORATE' | 'TECH_STARTUP' | 'MINIMALIST_EXEC';

export interface SubmitOnboardingPayload {
	parsedCvData: ParsedCvData;
	additionalForm: AdditionalFormData;
	atsStyle: AtsStyle;
}

export interface QuotaSummary {
	limit: number;
	used: number;
	remaining: number;
}

export interface OnboardingProfileResponse {
	user: { id: string; email: string };
	profile: Record<string, unknown> | null;
	conversionQuota: QuotaSummary;
	atsQuota: QuotaSummary;
}

export interface CvScore {
	overallScore: number;
	summary?: string;
	strengths: string[];
	weaknesses: string[];
	suggestions: string[];
}

/** Result of `POST /onboarding/submit` (contains the generated ATS CV). */
export interface SubmitOnboardingResult {
	success?: boolean;
	message?: string;
	atsCv?: Record<string, unknown>;
	[key: string]: unknown;
}

/**
 * Upload a CV file and let the backend extract a structured profile.
 * The file is sent as multipart/form-data; no manual `Content-Type` is set
 * so the browser can add the multipart boundary.
 */
export async function parseCvApi(file: File): Promise<ParsedCvData> {
	const formData = new FormData();
	formData.append('file', file, file.name);

	const response = await apiRequest('onboarding/parse-cv', {
		method: 'POST',
		body: formData
	});

	return (await response.json()) as ParsedCvData;
}

/**
 * Submit the edited CV data plus the additional form inputs and receive the
 * final ATS-optimized CV.
 */
export async function submitOnboardingApi(
	payload: SubmitOnboardingPayload
): Promise<SubmitOnboardingResult> {
	const response = await apiRequest('onboarding/submit', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	});

	return (await response.json()) as SubmitOnboardingResult;
}

/** Fetch the current onboarding profile and quota summary. */
export async function getOnboardingProfileApi(): Promise<OnboardingProfileResponse> {
	const response = await apiRequest('onboarding/me');
	return (await response.json()) as OnboardingProfileResponse;
}

/** Persist an edited profile without regenerating the ATS CV. */
export async function updateOnboardingProfileApi(
	profile: ParsedCvData
): Promise<Record<string, unknown>> {
	const response = await apiRequest('onboarding/update', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(profile)
	});

	return (await response.json()) as Record<string, unknown>;
}
