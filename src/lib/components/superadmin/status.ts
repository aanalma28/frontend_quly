import type {
	ApplicationType,
	JobStatus,
	SourceType,
	SubscriptionStatus,
	SubscriptionTierName
} from '#lib/services/superadminApi.js';

export const jobStatusLabel: Record<JobStatus, string> = {
	RAW_PARSED: 'Raw Parsed',
	PUBLISHED: 'Published',
	REJECTED: 'Rejected'
};

export const jobStatusTone: Record<JobStatus, string> = {
	RAW_PARSED: 'bg-amber-500/10 text-amber-300 ring-amber-500/20',
	PUBLISHED: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
	REJECTED: 'bg-rose-500/10 text-rose-300 ring-rose-500/20'
};

export const subscriptionStatusLabel: Record<SubscriptionStatus, string> = {
	ACTIVE: 'Active',
	EXPIRED: 'Expired',
	CANCELLED: 'Cancelled'
};

export const subscriptionStatusTone: Record<SubscriptionStatus, string> = {
	ACTIVE: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
	EXPIRED: 'bg-amber-500/10 text-amber-300 ring-amber-500/20',
	CANCELLED: 'bg-rose-500/10 text-rose-300 ring-rose-500/20'
};

export const tierLabel: Record<SubscriptionTierName, string> = {
	FREE: 'Free',
	PRO: 'Pro',
	ENTERPRISE: 'Enterprise'
};

export const tierTone: Record<SubscriptionTierName, string> = {
	FREE: 'bg-slate-500/10 text-slate-300 ring-slate-500/20',
	PRO: 'bg-indigo-500/10 text-indigo-300 ring-indigo-500/20',
	ENTERPRISE: 'bg-amber-500/10 text-amber-300 ring-amber-500/20'
};

export const sourceTypeLabel: Record<SourceType, string> = {
	TELEGRAM: 'Telegram',
	WEB: 'Web'
};

export const applicationTypeLabel: Record<ApplicationType, string> = {
	EMAIL: 'Email',
	WEBSITE_PORTAL: 'Website Portal'
};
