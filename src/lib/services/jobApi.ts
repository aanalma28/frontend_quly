import { apiRequest } from '#lib/utils/api.js';

export type JobWorkplaceType = 'REMOTE' | 'WFO' | 'HYBRID';
export type JobEmploymentType =
	| 'FULL_TIME'
	| 'PART_TIME'
	| 'CONTRACT'
	| 'FREELANCE'
	| 'INTERNSHIP';
export type JobSourceType =
	| 'TELEGRAM'
	| 'WEBSITE_HTML'
	| 'WEBSITE_API'
	| 'USER_EXTRACTION';
export type JobSort = 'newest' | 'oldest' | 'salary_desc' | 'salary_asc';

export interface JobRequirements {
	minExperienceYears?: number | null;
	education?: string | null;
	skills?: string[];
}

export interface JobMatchScore {
	score: number;
	summary: string | null;
	strengths: string[];
	weaknesses: string[];
	suggestions: string[];
	matchedSkills: string[];
	missingSkills: string[];
	updatedAt: string;
}

export interface JobListItem {
	id: string;
	jobTitle: string;
	companyName: string;
	location: string;
	workplaceType: JobWorkplaceType | string;
	employmentType: JobEmploymentType | string;
	salaryMin: number | null;
	salaryMax: number | null;
	salaryCurrency: string | null;
	isSalaryConfidential: boolean;
	requirements: JobRequirements | null;
	jobDescriptionSummary: string | null;
	subjectFormat?: string | null;
	applicationType: string;
	applicationDestination: string;
	sourceType: JobSourceType | string;
	createdById?: string | null;
	isUserExtracted?: boolean;
	isOwner?: boolean;
	canEdit?: boolean;
	sourceDetail: string | null;
	sourceUrl: string | null;
	localImagePath: string | null;
	scrapedAt: string;
	expiresAt: string | null;
	bookmarked: boolean;
	savedAt: string | null;
	matchScore: JobMatchScore | null;
}

export interface JobSource {
	id: string;
	name: string;
	url: string;
	type: JobSourceType | string;
}

export interface JobDetail extends JobListItem {
	applicationInstructions?: string | null;
	source?: JobSource | null;
}

export interface JobListMeta {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface JobListResponse {
	items: JobListItem[];
	meta: JobListMeta;
}

export interface ListJobsQuery {
	search?: string;
	location?: string;
	workplaceType?: JobWorkplaceType | '';
	employmentType?: JobEmploymentType | '';
	education?: string;
	minExperience?: number | '';
	skill?: string;
	minSalary?: number | '';
	maxSalary?: number | '';
	postedWithinDays?: number | '';
	bookmarked?: boolean;
	sourceType?: JobSourceType | '';
	sort?: JobSort;
	page?: number;
	limit?: number;
}

export interface JobScoreUsage {
	source: 'QUOTA' | 'CREDIT' | 'UNLIMITED' | string;
	creditsCharged: number;
	creditPriceIdr: number;
	costIdr: number;
}

export interface JobScoringResult {
	jobId: string;
	score: number;
	summary: string | null;
	strengths: string[];
	weaknesses: string[];
	suggestions: string[];
	matchedSkills: string[];
	missingSkills: string[];
	updatedAt: string;
	usage: JobScoreUsage;
}

export interface BookmarkResult {
	jobId: string;
	bookmarked: boolean;
	savedAt?: string;
}

export interface UpdateExtractedJobInput {
	jobTitle?: string;
	companyName?: string;
	location?: string;
	workplaceType?: JobWorkplaceType;
	employmentType?: JobEmploymentType;
	salaryMin?: number | null;
	salaryMax?: number | null;
	salaryCurrency?: string | null;
	isSalaryConfidential?: boolean;
	requirements?: JobRequirements;
	jobDescriptionSummary?: string;
	subjectFormat?: string | null;
	applicationType?: 'EMAIL' | 'WEBSITE_PORTAL' | 'WHATSAPP' | 'TELEGRAM';
	applicationDestination?: string;
	applicationInstructions?: string | null;
	expiresAt?: string | null;
}

function toQuery(query: ListJobsQuery): string {
	const params = new URLSearchParams();
	const values: Array<[string, string | number | boolean | undefined | null]> = [
		['search', query.search],
		['location', query.location],
		['workplaceType', query.workplaceType],
		['employmentType', query.employmentType],
		['education', query.education],
		['minExperience', query.minExperience],
		['skill', query.skill],
		['minSalary', query.minSalary],
		['maxSalary', query.maxSalary],
		['postedWithinDays', query.postedWithinDays],
		['bookmarked', query.bookmarked],
		['sourceType', query.sourceType],
		['sort', query.sort],
		['page', query.page],
		['limit', query.limit]
	];
	for (const [key, value] of values) {
		if (value === undefined || value === null || value === '') continue;
		params.set(key, String(value));
	}
	const text = params.toString();
	return text ? `?${text}` : '';
}

export async function listJobsApi(query: ListJobsQuery = {}): Promise<JobListResponse> {
	const response = await apiRequest(`jobs${toQuery(query)}`);
	return (await response.json()) as JobListResponse;
}

export async function getJobApi(id: string): Promise<JobDetail> {
	const response = await apiRequest(`jobs/${id}`);
	return (await response.json()) as JobDetail;
}

export async function updateExtractedJobApi(
	id: string,
	input: UpdateExtractedJobInput
): Promise<JobListItem> {
	const response = await apiRequest(`jobs/${id}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input)
	});
	return (await response.json()) as JobListItem;
}

export async function deleteExtractedJobApi(
	id: string
): Promise<{ success: boolean; id: string }> {
	const response = await apiRequest(`jobs/${id}`, { method: 'DELETE' });
	return (await response.json()) as { success: boolean; id: string };
}

export async function bookmarkJobApi(id: string): Promise<BookmarkResult> {
	const response = await apiRequest(`jobs/${id}/bookmark`, { method: 'POST' });
	return (await response.json()) as BookmarkResult;
}

export async function unbookmarkJobApi(id: string): Promise<BookmarkResult> {
	const response = await apiRequest(`jobs/${id}/bookmark`, { method: 'DELETE' });
	return (await response.json()) as BookmarkResult;
}

export async function scoreJobApi(id: string): Promise<JobScoringResult> {
	const response = await apiRequest(`jobs/${id}/score`, { method: 'POST' });
	return (await response.json()) as JobScoringResult;
}
