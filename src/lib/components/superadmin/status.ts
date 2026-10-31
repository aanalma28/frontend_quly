import type {
	ApplicationChargeType,
	ApplicationStatus,
	ApplicationType,
	BillingStatus,
	EmploymentType,
	IngestionPaginationType,
	IngestionSourceType,
	JobStatus,
	PackageTier,
	SubStatus,
	SubscriptionTier,
	UserRole,
	WorkplaceType
} from '#lib/services/superadminApi.js';

export const tierLabel: Record<PackageTier, string> = {
	FREE: 'Free',
	STARTER: 'Starter',
	PRO: 'Pro',
	UNLIMITED: 'Unlimited'
};

export const tierTone: Record<PackageTier, string> = {
	FREE: 'bg-slate-500/10 text-slate-300 ring-slate-500/20',
	STARTER: 'bg-sky-500/10 text-sky-300 ring-sky-500/20',
	PRO: 'bg-indigo-500/10 text-indigo-300 ring-indigo-500/20',
	UNLIMITED: 'bg-amber-500/10 text-amber-300 ring-amber-500/20'
};

export const subscriptionStatusLabel: Record<SubStatus, string> = {
	ACTIVE: 'Active',
	EXPIRED: 'Expired',
	CANCELLED: 'Cancelled'
};

export const subscriptionStatusTone: Record<SubStatus, string> = {
	ACTIVE: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
	EXPIRED: 'bg-amber-500/10 text-amber-300 ring-amber-500/20',
	CANCELLED: 'bg-rose-500/10 text-rose-300 ring-rose-500/20'
};

export const subscriptionTierLabel: Record<SubscriptionTier, string> = {
	FREE_PLAN: 'Free Plan',
	STARTER_PLAN: 'Starter Plan',
	PRO_PLAN: 'Pro Plan',
	UNLIMITED_PLAN: 'Unlimited Plan'
};

export const subscriptionTierTone: Record<SubscriptionTier, string> = {
	FREE_PLAN: 'bg-slate-500/10 text-slate-300 ring-slate-500/20',
	STARTER_PLAN: 'bg-sky-500/10 text-sky-300 ring-sky-500/20',
	PRO_PLAN: 'bg-indigo-500/10 text-indigo-300 ring-indigo-500/20',
	UNLIMITED_PLAN: 'bg-amber-500/10 text-amber-300 ring-amber-500/20'
};

export const billingStatusLabel: Record<BillingStatus, string> = {
	ACTIVE: 'Aktif',
	EXPIRED: 'Expired',
	CANCELLED: 'Dibatalkan',
	FREE: 'Free',
	NO_SUBSCRIPTION: 'Belum berlangganan'
};

export const billingStatusTone: Record<BillingStatus, string> = {
	ACTIVE: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
	EXPIRED: 'bg-amber-500/10 text-amber-300 ring-amber-500/20',
	CANCELLED: 'bg-rose-500/10 text-rose-300 ring-rose-500/20',
	FREE: 'bg-slate-500/10 text-slate-300 ring-slate-500/20',
	NO_SUBSCRIPTION: 'bg-slate-800 text-slate-400 ring-slate-700'
};

export const userRoleLabel: Record<UserRole, string> = {
	JOB_SEEKER: 'Job Seeker',
	ADMIN: 'Admin',
	SUPER_ADMIN: 'Super Admin'
};

export const userRoleTone: Record<UserRole, string> = {
	JOB_SEEKER: 'bg-sky-500/10 text-sky-300 ring-sky-500/20',
	ADMIN: 'bg-amber-500/10 text-amber-300 ring-amber-500/20',
	SUPER_ADMIN: 'bg-rose-500/10 text-rose-300 ring-rose-500/20'
};

export const applicationStatusLabel: Record<ApplicationStatus, string> = {
	PENDING: 'Menunggu',
	SENT: 'Terkirim',
	REPLIED: 'Dibalas',
	FAILED: 'Gagal'
};

export const applicationStatusTone: Record<ApplicationStatus, string> = {
	PENDING: 'bg-amber-500/10 text-amber-300 ring-amber-500/20',
	SENT: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
	REPLIED: 'bg-cyan-500/10 text-cyan-300 ring-cyan-500/20',
	FAILED: 'bg-rose-500/10 text-rose-300 ring-rose-500/20'
};

export const applicationChargeTypeLabel: Record<ApplicationChargeType, string> = {
	MONTHLY_QUOTA: 'Kuota bulanan',
	PAYG: 'PAYG'
};

export const jobStatusLabel: Record<JobStatus, string> = {
	RAW_PARSED: 'Raw Parsed',
	PENDING_REVIEW: 'Pending Review',
	APPROVED: 'Approved',
	SAVED: 'Saved',
	PUBLISHED: 'Published',
	ARCHIVED: 'Archived',
	REJECTED: 'Rejected'
};

export const jobStatusTone: Record<JobStatus, string> = {
	RAW_PARSED: 'bg-slate-500/10 text-slate-300 ring-slate-500/20',
	PENDING_REVIEW: 'bg-amber-500/10 text-amber-300 ring-amber-500/20',
	APPROVED: 'bg-teal-500/10 text-teal-300 ring-teal-500/20',
	SAVED: 'bg-indigo-500/10 text-indigo-300 ring-indigo-500/20',
	PUBLISHED: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
	ARCHIVED: 'bg-sky-500/10 text-sky-300 ring-sky-500/20',
	REJECTED: 'bg-rose-500/10 text-rose-300 ring-rose-500/20'
};

export const sourceTypeLabel: Record<IngestionSourceType, string> = {
	TELEGRAM: 'Telegram',
	WEBSITE_HTML: 'Website HTML',
	WEBSITE_API: 'Website API'
};

export const sourceTypeTone: Record<IngestionSourceType, string> = {
	TELEGRAM: 'bg-sky-500/10 text-sky-300 ring-sky-500/20',
	WEBSITE_HTML: 'bg-violet-500/10 text-violet-300 ring-violet-500/20',
	WEBSITE_API: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20'
};

export const applicationTypeLabel: Record<ApplicationType, string> = {
	EMAIL: 'Email',
	WEBSITE_PORTAL: 'Website Portal',
	WHATSAPP: 'WhatsApp',
	TELEGRAM: 'Telegram'
};

export const workplaceTypeLabel: Record<WorkplaceType, string> = {
	REMOTE: 'Remote',
	WFO: 'WFO',
	HYBRID: 'Hybrid'
};

export const employmentTypeLabel: Record<EmploymentType, string> = {
	FULL_TIME: 'Full Time',
	PART_TIME: 'Part Time',
	CONTRACT: 'Contract',
	FREELANCE: 'Freelance',
	INTERNSHIP: 'Internship'
};

/** Human-readable label for an OpenAI usage `outcome`. */
export function aiOutcomeLabel(outcome: string): string {
	if (outcome === 'SUCCESS') return 'Success';
	if (outcome === 'INVALID_RESPONSE') return 'Invalid Response';
	return outcome
		.split('_')
		.map((part) => part.charAt(0) + part.slice(1).toLowerCase())
		.join(' ');
}

/** Badge tone for an OpenAI usage `outcome`. */
export function aiOutcomeTone(outcome: string): string {
	return outcome === 'SUCCESS'
		? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20'
		: 'bg-rose-500/10 text-rose-300 ring-rose-500/20';
}

export const ingestionSourceKindLabel = sourceTypeLabel;
export const ingestionSourceKindTone = sourceTypeTone;

export const ingestionPaginationLabel: Record<IngestionPaginationType, string> = {
	LOKER_SEMAR: 'Loker Semar',
	LOKER_MURIA: 'Loker Muria',
	WORKDAY_JSON: 'Workday JSON',
	DEFAULT: 'Default'
};
