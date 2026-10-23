import { get, writable, type Writable } from 'svelte/store';
import { ApiError } from '#lib/utils/api.js';
import { auth } from '#lib/stores/auth.js';
import {
	getOnboardingProfileApi,
	parseCvApi,
	submitOnboardingApi,
	type AdditionalFormData,
	type Certification,
	type Education,
	type ParsedCvData,
	type Project,
	type QuotaSummary,
	type SubmitOnboardingResult,
	type WorkExperience
} from '#lib/services/onboardingApi.js';

export type OnboardingStep = 1 | 2 | 3;

export interface OnboardingState {
	currentStep: OnboardingStep;
	rawCvData: ParsedCvData | null;
	additionalFormData: AdditionalFormData;
	atsResult: SubmitOnboardingResult | null;
	isParsing: boolean;
	isSubmitting: boolean;
	isLoadingProfile: boolean;
	errorMessage: string | null;
	conversionQuota: QuotaSummary | null;
	atsQuota: QuotaSummary | null;
	hasSavedProfile: boolean;
}

const emptyAdditionalForm = (): AdditionalFormData => ({
	targetDomicile: '',
	jobCategory: '',
	careerSummary: '',
	targetRole: ''
});

const initialState: OnboardingState = {
	currentStep: 1,
	rawCvData: null,
	additionalFormData: emptyAdditionalForm(),
	atsResult: null,
	isParsing: false,
	isSubmitting: false,
	isLoadingProfile: true,
	errorMessage: null,
	conversionQuota: null,
	atsQuota: null,
	hasSavedProfile: false
};

export const onboarding: Writable<OnboardingState> = writable(initialState);

function patch(partial: Partial<OnboardingState>) {
	onboarding.update((state) => ({ ...state, ...partial }));
}

function errorMessage(error: unknown): string {
	if (error instanceof ApiError) return error.message;
	return error instanceof Error ? error.message : 'Terjadi kesalahan. Silakan coba lagi.';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textValue(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

function dateValue(value: unknown): string {
	if (typeof value !== 'string' || value.length === 0) return '';
	return value.slice(0, 10);
}

function stringList(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function listOfRecords(value: unknown): Record<string, unknown>[] {
	return Array.isArray(value) ? value.filter(isRecord) : [];
}

function normalizeWork(value: unknown): WorkExperience[] {
	return listOfRecords(value).map((item) => ({
		company: textValue(item.company),
		position: textValue(item.position ?? item.title ?? item.role),
		location: textValue(item.location),
		startDate: dateValue(item.startDate),
		endDate: dateValue(item.endDate),
		isCurrent: item.isCurrent === true,
		description: textValue(item.description ?? item.summary)
	}));
}

function normalizeEducation(value: unknown): Education[] {
	return listOfRecords(value).map((item) => ({
		institution: textValue(item.institution ?? item.school ?? item.university),
		degree: textValue(item.degree),
		fieldOfStudy: textValue(item.fieldOfStudy ?? item.field_of_study ?? item.field ?? item.program),
		location: textValue(item.location),
		startDate: dateValue(item.startDate),
		endDate: dateValue(item.endDate),
		description: textValue(item.description)
	}));
}

function normalizeCertifications(value: unknown): Certification[] {
	return listOfRecords(value).map((item) => ({
		name: textValue(item.name),
		issuingOrganization: textValue(item.issuingOrganization ?? item.issuing_organization),
		issueDate: dateValue(item.issueDate ?? item.issue_date),
		expirationDate: dateValue(item.expirationDate ?? item.expiration_date),
		credentialId: textValue(item.credentialId ?? item.credential_id),
		credentialUrl: textValue(item.credentialUrl ?? item.credential_url)
	}));
}

function normalizeProjects(value: unknown): Project[] {
	return listOfRecords(value).map((item) => ({
		name: textValue(item.name ?? item.title),
		description: textValue(item.description),
		role: textValue(item.role),
		technologies: stringList(item.technologies),
		projectUrl: textValue(item.projectUrl ?? item.project_url ?? item.link ?? item.url),
		startDate: dateValue(item.startDate),
		endDate: dateValue(item.endDate)
	}));
}

function readString(record: Record<string, unknown>, ...keys: string[]): string {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === 'string') return value;
	}
	return '';
}

function readFiniteNumber(record: Record<string, unknown>, ...keys: string[]): number | undefined {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === 'number' && Number.isFinite(value)) return value;
	}
	return undefined;
}

/** Normalize a parsed-CV or persisted-profile payload into a form-friendly shape. */
export function normalizeCvData(value: unknown): ParsedCvData {
	const record = isRecord(value) ? value : {};
	return {
		fullName: readString(record, 'fullName', 'full_name', 'name'),
		phone: readString(record, 'phone', 'phoneNumber', 'phone_number'),
		address: readString(record, 'address'),
		linkedinUrl: readString(record, 'linkedinUrl', 'linkedin_url'),
		portfolioUrl: readString(record, 'portfolioUrl', 'portfolio_url'),
		githubUrl: readString(record, 'githubUrl', 'github_url'),
		professionalSummary: readString(record, 'professionalSummary', 'professional_summary', 'summary'),
		yearsOfExperience: readFiniteNumber(record, 'yearsOfExperience', 'years_of_experience'),
		rawCvText: readString(record, 'rawCvText', 'raw_cv_text'),
		aiTonePreference: readString(record, 'aiTonePreference', 'ai_tone_preference'),
		aiCustomInstructions: readString(record, 'aiCustomInstructions', 'ai_custom_instructions'),
		skills: stringList(record.skills),
		languages: stringList(record.languages),
		experiences: normalizeWork(record.experiences),
		educations: normalizeEducation(record.educations),
		certifications: normalizeCertifications(record.certifications),
		projects: normalizeProjects(record.projects)
	};
}

function markOnboardingCompleted() {
	auth.update((state) => ({
		...state,
		user: state.user ? { ...state.user, isOnboardingCompleted: true } : null
	}));
}

function updateAuthQuota(conversionQuota: QuotaSummary, atsQuota: QuotaSummary) {
	auth.update((state) => ({
		...state,
		user: state.user
			? {
					...state.user,
					atsConversionQuota: conversionQuota.limit,
					atsConversionRemaining: conversionQuota.remaining
				}
			: null
	}));
}

/** Load the current profile + quota from the backend. */
export async function loadProfile(): Promise<void> {
	patch({ isLoadingProfile: true, errorMessage: null });
	try {
		const response = await getOnboardingProfileApi();
		const profile = response.profile;
		const conversionQuota = response.conversionQuota;
		const atsQuota = response.atsQuota;

		const hasSavedProfile = profile !== null && isRecord(profile) && Object.keys(profile).length > 0;
		const rawCvData = hasSavedProfile ? normalizeCvData(profile) : null;

		const profileRecord = isRecord(profile) ? profile : {};
		const additionalFormData: AdditionalFormData = {
			targetDomicile: readString(profileRecord, 'targetDomicile', 'target_domicile', 'address'),
			jobCategory: readString(profileRecord, 'jobCategory', 'job_category'),
			careerSummary: '',
			targetRole: readString(profileRecord, 'targetRole', 'target_role')
		};

		patch({
			isLoadingProfile: false,
			hasSavedProfile,
			rawCvData,
			additionalFormData,
			conversionQuota,
			atsQuota,
			currentStep: hasSavedProfile ? 2 : 1
		});
		updateAuthQuota(conversionQuota, atsQuota);
	} catch (error) {
		patch({
			isLoadingProfile: false,
			errorMessage:
				errorMessage(error) ?? 'Profil dan kuota belum dapat dimuat. Silakan coba lagi.'
		});
	}
}

/** Move between onboarding steps (1: upload, 2: review, 3: ATS preview). */
export function setStep(step: OnboardingStep) {
	patch({ currentStep: step, errorMessage: null });
}

/** Patch the editable parsed-CV data held in the store. */
export function updateRawCvData(partial: ParsedCvData) {
	onboarding.update((state) => ({
		...state,
		rawCvData: { ...(state.rawCvData ?? {}), ...partial }
	}));
}

/** Patch the additional form inputs held in the store. */
export function updateAdditionalFormData(partial: Partial<AdditionalFormData>) {
	onboarding.update((state) => ({
		...state,
		additionalFormData: { ...state.additionalFormData, ...partial }
	}));
}

/** Clear the current error message. */
export function clearError() {
	patch({ errorMessage: null });
}

/**
 * Upload + parse a CV file, store the result, then advance to the review step.
 */
export async function parseCv(file: File): Promise<void> {
	const state = get(onboarding);
	if (state.isParsing) return;

	patch({ isParsing: true, errorMessage: null });
	try {
		const parsed = await parseCvApi(file);
		patch({ rawCvData: normalizeCvData(parsed), currentStep: 2 });

		// Refresh quotas: a successful parse consumes one conversion credit.
		try {
			const response = await getOnboardingProfileApi();
			patch({ conversionQuota: response.conversionQuota, atsQuota: response.atsQuota });
			updateAuthQuota(response.conversionQuota, response.atsQuota);
		} catch {
			// Non-fatal: the parsed data is already available for review.
		}
	} catch (error) {
		const message = errorMessage(error);
		const quotaExhausted =
			error instanceof ApiError && (error.status === 403 || /kuota|quota/i.test(message));
		patch({
			errorMessage: message,
			conversionQuota: quotaExhausted
				? {
						limit: state.conversionQuota?.limit ?? 0,
						used: state.conversionQuota?.limit ?? 0,
						remaining: 0
					}
				: state.conversionQuota
		});
	} finally {
		patch({ isParsing: false });
	}
}

function assertLength(value: string, field: string, maximum: number) {
	if (value.length > maximum) {
		throw new Error(`${field} maksimal ${maximum.toLocaleString('id-ID')} karakter.`);
	}
}

function urlValue(value: string, field: string): string | undefined {
	const url = value.trim();
	if (!url) return undefined;
	assertLength(url, field, 2048);
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error();
	} catch {
		throw new Error(`${field} harus berupa URL lengkap yang diawali https:// atau http://.`);
	}
	return url;
}

/** Validate the edited profile and build a clean, backend-ready payload. */
function buildProfilePayload(rawCvData: ParsedCvData): ParsedCvData {
	const fullName = (rawCvData.fullName ?? '').trim();
	const phone = (rawCvData.phone ?? '').trim();
	const address = (rawCvData.address ?? '').trim();
	const summary = (rawCvData.professionalSummary ?? '').trim();
	const rawCvText = (rawCvData.rawCvText ?? '').trim();
	const aiTone = (rawCvData.aiTonePreference ?? 'professional').trim();
	const customInstructions = (rawCvData.aiCustomInstructions ?? '').trim();
	const skills = (rawCvData.skills ?? []).map((skill) => skill.trim()).filter(Boolean);
	const languages = (rawCvData.languages ?? []).map((lang) => lang.trim()).filter(Boolean);
	const experiences = rawCvData.experiences ?? [];
	const educations = rawCvData.educations ?? [];
	const certifications = rawCvData.certifications ?? [];
	const projects = rawCvData.projects ?? [];

	if (!fullName) throw new Error('Nama lengkap wajib diisi.');
	if (!phone) throw new Error('Nomor telepon wajib diisi.');

	assertLength(fullName, 'Nama lengkap', 120);
	assertLength(phone, 'Nomor telepon', 40);
	assertLength(address, 'Alamat', 1000);
	assertLength(summary, 'Professional summary', 10000);
	assertLength(rawCvText, 'Teks CV', 100000);
	assertLength(aiTone, 'Preferensi tone AI', 120);
	assertLength(customInstructions, 'Instruksi khusus AI', 5000);

	if (
		skills.length > 200 ||
		languages.length > 100 ||
		[...skills, ...languages, ...projects.flatMap((project) => project.technologies ?? [])].some(
			(value) => value.length > 120
		)
	) {
		throw new Error('Jumlah skills maksimal 200, jumlah bahasa maksimal 100, dan panjang tiap item maksimal 120 karakter.');
	}

	const linkedin = urlValue(rawCvData.linkedinUrl ?? '', 'LinkedIn URL');
	const portfolio = urlValue(rawCvData.portfolioUrl ?? '', 'Portfolio URL');
	const github = urlValue(rawCvData.githubUrl ?? '', 'GitHub URL');

	if (experiences.length > 100 || educations.length > 100 || certifications.length > 100 || projects.length > 100) {
		throw new Error('Maksimal 100 data untuk setiap kategori pengalaman, pendidikan, sertifikasi, dan proyek.');
	}

	const experiencePayload = experiences.map((item, index) => {
		const company = item.company.trim();
		const position = item.position.trim();
		if (!company || !position) {
			throw new Error(`Lengkapi perusahaan dan posisi pada pengalaman kerja ${index + 1}.`);
		}
		assertLength(company, 'Nama perusahaan', 160);
		assertLength(position, 'Posisi', 160);
		assertLength(item.location?.trim() ?? '', 'Lokasi pengalaman', 160);
		assertLength(item.description?.trim() ?? '', 'Deskripsi pengalaman', 5000);
		return {
			company,
			position,
			...(item.location?.trim() ? { location: item.location.trim() } : {}),
			...(item.startDate ? { startDate: item.startDate } : {}),
			...(item.endDate ? { endDate: item.endDate } : {}),
			isCurrent: item.isCurrent ?? false,
			...(item.description?.trim() ? { description: item.description.trim() } : {})
		};
	});

	const educationPayload = educations.map((item, index) => {
		const institution = item.institution.trim();
		if (!institution) {
			throw new Error(`Lengkapi institusi pada data pendidikan ${index + 1}.`);
		}
		assertLength(institution, 'Institusi pendidikan', 200);
		assertLength(item.degree?.trim() ?? '', 'Gelar pendidikan', 160);
		assertLength(item.fieldOfStudy?.trim() ?? '', 'Bidang studi', 160);
		assertLength(item.location?.trim() ?? '', 'Lokasi pendidikan', 160);
		assertLength(item.description?.trim() ?? '', 'Deskripsi pendidikan', 5000);
		return {
			institution,
			...(item.degree?.trim() ? { degree: item.degree.trim() } : {}),
			...(item.fieldOfStudy?.trim() ? { fieldOfStudy: item.fieldOfStudy.trim() } : {}),
			...(item.location?.trim() ? { location: item.location.trim() } : {}),
			...(item.startDate ? { startDate: item.startDate } : {}),
			...(item.endDate ? { endDate: item.endDate } : {}),
			...(item.description?.trim() ? { description: item.description.trim() } : {})
		};
	});

	const certificationPayload = certifications.map((item, index) => {
		const name = item.name.trim();
		if (!name) {
			throw new Error(`Lengkapi nama sertifikasi pada data sertifikasi ${index + 1}.`);
		}
		assertLength(name, 'Nama sertifikasi', 200);
		assertLength(item.issuingOrganization?.trim() ?? '', 'Organisasi penerbit', 200);
		assertLength(item.credentialId?.trim() ?? '', 'ID kredensial', 200);
		const credentialUrl = urlValue(item.credentialUrl ?? '', 'URL kredensial');
		return {
			name,
			...(item.issuingOrganization?.trim() ? { issuingOrganization: item.issuingOrganization.trim() } : {}),
			...(item.issueDate ? { issueDate: item.issueDate } : {}),
			...(item.expirationDate ? { expirationDate: item.expirationDate } : {}),
			...(item.credentialId?.trim() ? { credentialId: item.credentialId.trim() } : {}),
			...(credentialUrl ? { credentialUrl } : {})
		};
	});

	const projectPayload = projects.map((item, index) => {
		const name = item.name.trim();
		if (!name) {
			throw new Error(`Lengkapi nama proyek pada data proyek ${index + 1}.`);
		}
		assertLength(name, 'Nama proyek', 200);
		assertLength(item.description?.trim() ?? '', 'Deskripsi proyek', 5000);
		assertLength(item.role?.trim() ?? '', 'Peran proyek', 160);
		const technologies = (item.technologies ?? []).map((tech) => tech.trim()).filter(Boolean);
		if (technologies.length > 100) {
			throw new Error('Jumlah teknologi pada setiap proyek maksimal 100.');
		}
		const projectUrl = urlValue(item.projectUrl ?? '', 'URL proyek');
		return {
			name,
			...(item.description?.trim() ? { description: item.description.trim() } : {}),
			...(item.role?.trim() ? { role: item.role.trim() } : {}),
			...(technologies.length ? { technologies } : {}),
			...(projectUrl ? { projectUrl } : {}),
			...(item.startDate ? { startDate: item.startDate } : {}),
			...(item.endDate ? { endDate: item.endDate } : {})
		};
	});

	const yearsValue = rawCvData.yearsOfExperience;
	if (
		yearsValue !== undefined &&
		yearsValue !== null &&
		(!Number.isInteger(yearsValue) || yearsValue < 0 || yearsValue > 80)
	) {
		throw new Error('Lama pengalaman kerja harus berupa bilangan bulat antara 0 dan 80.');
	}

	return {
		fullName,
		phone,
		address,
		...(linkedin ? { linkedinUrl: linkedin } : {}),
		...(portfolio ? { portfolioUrl: portfolio } : {}),
		...(github ? { githubUrl: github } : {}),
		professionalSummary: summary,
		...(yearsValue !== undefined && yearsValue !== null ? { yearsOfExperience: yearsValue } : {}),
		rawCvText,
		aiTonePreference: aiTone,
		aiCustomInstructions: customInstructions,
		skills,
		languages,
		experiences: experiencePayload,
		educations: educationPayload,
		certifications: certificationPayload,
		projects: projectPayload
	};
}

/**
 * Submit the reviewed data via `POST /onboarding/submit` (generates the ATS CV,
 * consuming one ATS generation credit) and advance to the ATS preview step.
 */
export async function submit(): Promise<void> {
	const state = get(onboarding);
	if (state.isSubmitting || !state.rawCvData) return;

	patch({ isSubmitting: true, errorMessage: null });
	try {
		const profile = buildProfilePayload(state.rawCvData);
		const result = await submitOnboardingApi({
			parsedCvData: profile,
			additionalForm: {
				targetDomicile: state.additionalFormData.targetDomicile.trim(),
				jobCategory: state.additionalFormData.jobCategory.trim(),
				careerSummary: state.additionalFormData.careerSummary.trim(),
				targetRole: state.additionalFormData.targetRole.trim()
			}
		});
		patch({ atsResult: result, currentStep: 3, hasSavedProfile: true });
		markOnboardingCompleted();
	} catch (error) {
		patch({ errorMessage: errorMessage(error) });
	} finally {
		patch({ isSubmitting: false });
	}
}

/** Return to the upload step (keeps the already-parsed data). */
export function backToUpload() {
	patch({ currentStep: 1, errorMessage: null, atsResult: null });
}

export const onboardingStore = {
	subscribe: onboarding.subscribe,
	loadProfile,
	parseCv,
	submit,
	setStep,
	backToUpload,
	updateRawCvData,
	updateAdditionalFormData,
	clearError
};
