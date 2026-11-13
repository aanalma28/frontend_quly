import { getApiUrl } from '#lib/utils/api.js';

export interface PublicProfileLinks {
	linkedin: string | null;
	portfolio: string | null;
	github: string | null;
}

export interface PublicProfileExperience {
	company: string;
	position: string;
	location: string | null;
	startDate: string | null;
	endDate: string | null;
	isCurrent: boolean;
	description: string | null;
}

export interface PublicProfileEducation {
	institution: string;
	degree: string | null;
	fieldOfStudy: string | null;
	location: string | null;
	startDate: string | null;
	endDate: string | null;
	description: string | null;
}

export interface PublicProfileCertification {
	name: string;
	issuingOrganization: string | null;
	issueDate: string | null;
	expirationDate: string | null;
	credentialId: string | null;
	credentialUrl: string | null;
}

export interface PublicProfileProject {
	name: string;
	description: string | null;
	role: string | null;
	technologies: string | null;
	projectUrl: string | null;
	startDate: string | null;
	endDate: string | null;
}

export interface PublicProfileCandidate {
	fullName: string | null;
	email: string;
	headline: string | null;
	summary: string | null;
	targetRole: string | null;
	location: string | null;
	yearsOfExperience: number | null;
	skills: string[];
	languages: string[];
	links: PublicProfileLinks;
	experiences: PublicProfileExperience[];
	educations: PublicProfileEducation[];
	certifications: PublicProfileCertification[];
	projects: PublicProfileProject[];
}

export interface PublicProfileApplication {
	jobTitle: string | null;
	companyName: string | null;
	sentAt: string | null;
}

export interface PublicProfileCv {
	fileName: string;
	mimeType: string | null;
	fileSize: number | null;
	/** Absolute URL preferred. Relative values are resolved against the API base. */
	downloadUrl: string;
}

export type PublicPsychotestCategory = 'PERSONALITY' | 'COGNITIVE' | 'ACCURACY';
export type PublicPsychotestCompetencyLevel = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export interface PublicPsychotestPackageResult {
	packageId: string;
	title: string;
	category: PublicPsychotestCategory;
	accuracy: number | null;
	totalQuestions: number | null;
	answered: number | null;
	correct: number | null;
	incorrect: number | null;
	personalityType: string | null;
	summary: string | null;
}

export interface PublicPsychotestPersonality {
	personalityType: string | null;
	summary: string | null;
	workStyle: string[];
	strengths: string[];
	areasForImprovement: string[];
	communicationStyle: string | null;
}

export interface PublicPsychotest {
	sessionId: string;
	status: string;
	completedAt: string | null;
	certificateNumber: string | null;
	issuedAt: string | null;
	overallScore: number | null;
	competencyLevel: PublicPsychotestCompetencyLevel | null;
	summary: string | null;
	strengths: string[];
	areasForImprovement: string[];
	recommendedRoles: string[];
	personality?: PublicPsychotestPersonality | null;
	aggregateScore: {
		averageAccuracy: number | null;
		totalCorrect: number;
		totalIncorrect: number;
		totalSkipped: number;
		packages: PublicPsychotestPackageResult[];
	} | null;
	certificate: {
		available: boolean;
		fileName: string | null;
		mimeType: string | null;
		fileSize: number | null;
		downloadUrl: string | null;
		verificationUrl: string | null;
	};
}

export interface PublicProfileResponse {
	valid: true;
	expiresAt: string | null;
	candidate: PublicProfileCandidate;
	application: PublicProfileApplication;
	cv?: PublicProfileCv | null;
	psychotest?: PublicPsychotest | null;
}

export interface PublicProfileErrorDetails {
	code?: string;
	message?: string;
	expiredAt?: string | null;
	candidateName?: string | null;
	candidateEmail?: string | null;
}

export interface PublicProfileErrorPayload extends Omit<PublicProfileErrorDetails, 'message'> {
	/** NestJS may wrap the details in a `message` object. */
	message?: string | PublicProfileErrorDetails;
	error?: string;
	statusCode?: number;
}

export type PublicProfileResult =
	| { kind: 'ok'; data: PublicProfileResponse }
	| {
			kind: 'expired';
			message: string;
			expiredAt: string | null;
			candidateName: string | null;
			candidateEmail: string | null;
	  }
	| { kind: 'invalid'; message: string }
	| { kind: 'error'; message: string };

function normalizeErrorDetails(
	payload: PublicProfileErrorPayload | null
): PublicProfileErrorDetails {
	if (!payload) return {};
	if (typeof payload.message === 'object' && payload.message !== null) {
		return payload.message;
	}
	return {
		code: payload.code,
		message: typeof payload.message === 'string' ? payload.message : undefined,
		expiredAt: payload.expiredAt,
		candidateName: payload.candidateName,
		candidateEmail: payload.candidateEmail
	};
}

function messageFromPayload(
	payload: PublicProfileErrorDetails | null,
	fallback: string
): string {
	return typeof payload?.message === 'string' && payload.message.trim()
		? payload.message
		: fallback;
}

export async function getPublicProfileApi(
	token: string,
	signal?: AbortSignal
): Promise<PublicProfileResult> {
	let response: Response;
	try {
		response = await fetch(getApiUrl(`public/profile/${encodeURIComponent(token)}`), {
			headers: { Accept: 'application/json' },
			credentials: 'omit',
			signal
		});
	} catch (error) {
		if (signal?.aborted) throw error;
		return {
			kind: 'error',
			message: 'Profil kandidat belum dapat dimuat. Periksa koneksi lalu coba lagi.'
		};
	}

	let payload: unknown = null;
	try {
		payload = await response.json();
	} catch {
		// The fallback below covers empty or non-JSON responses.
	}

	const errorPayload = (payload ?? null) as PublicProfileErrorPayload | null;
	const errorDetails = normalizeErrorDetails(errorPayload);

	if (response.ok) {
		return { kind: 'ok', data: payload as PublicProfileResponse };
	}

	if (response.status === 410) {
		return {
			kind: 'expired',
			message: messageFromPayload(
				errorDetails,
				'Tautan akses telah kedaluwarsa demi menjaga privasi kandidat.'
			),
			expiredAt: errorDetails.expiredAt ?? null,
			candidateName: errorDetails.candidateName ?? null,
			candidateEmail: errorDetails.candidateEmail ?? null
		};
	}

	if (response.status === 404) {
		const friendlyMessage =
			errorDetails.code === 'PROFILE_TOKEN_INVALID' &&
			typeof errorDetails.message === 'string' &&
			errorDetails.message.trim()
				? errorDetails.message
				: 'Tautan profil tidak valid atau sudah tidak tersedia. Silakan buka tautan terbaru dari email lamaran.';
		return {
			kind: 'invalid',
			message: friendlyMessage
		};
	}

	return {
		kind: 'error',
		message: messageFromPayload(errorDetails, 'Profil kandidat belum dapat dimuat. Silakan coba lagi.')
	};
}

export function resolvePublicAssetUrl(downloadUrl: string): string {
	if (/^https?:\/\//i.test(downloadUrl)) return downloadUrl;
	const apiBase = getApiUrl('');
	if (downloadUrl.startsWith('/')) {
		try {
			return new URL(downloadUrl, apiBase).toString();
		} catch {
			return downloadUrl;
		}
	}
	return new URL(downloadUrl, apiBase).toString();
}

/** @deprecated Use resolvePublicAssetUrl. Kept for existing imports. */
export function resolvePublicCvUrl(downloadUrl: string): string {
	return resolvePublicAssetUrl(downloadUrl);
}
