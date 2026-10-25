import type {
	AttemptStatus,
	CompetencyLevel,
	PsychotestCategory
} from '#lib/services/psychotestApi.js';

export const categoryLabel: Record<PsychotestCategory, string> = {
	PERSONALITY: 'Kepribadian',
	COGNITIVE: 'Kognitif & Logika',
	ACCURACY: 'Ketelitian'
};

export const competencyLabel: Record<CompetencyLevel, string> = {
	BASIC: 'Dasar',
	INTERMEDIATE: 'Menengah',
	ADVANCED: 'Mahir',
	EXPERT: 'Ahli'
};

export const statusLabel: Record<AttemptStatus, string> = {
	IN_PROGRESS: 'Sedang Dikerjakan',
	COMPLETED: 'Selesai'
};

export const categoryTone: Record<PsychotestCategory, string> = {
	PERSONALITY: 'bg-violet-50 text-violet-700',
	COGNITIVE: 'bg-indigo-50 text-indigo-700',
	ACCURACY: 'bg-emerald-50 text-emerald-700'
};

export function formatDate(value: string | null | undefined): string {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
