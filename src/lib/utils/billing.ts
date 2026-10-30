import type { BillingPeriod } from '#lib/services/superadminApi.js';

export function formatRupiah(amount: number): string {
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		maximumFractionDigits: 0
	}).format(amount);
}

export function formatNumber(value: number): string {
	return new Intl.NumberFormat('id-ID').format(value);
}

export function billingPeriodLabel(period: BillingPeriod): string {
	if (period === 'FOREVER') return 'selamanya';
	if (period === 'YEARLY') return 'tahun';
	return 'bulan';
}

export const UNLIMITED_QUOTA = 2_147_483_647;

export function isUnlimitedQuota(value: number | null | undefined): boolean {
	return value === -1 || value === UNLIMITED_QUOTA;
}

export function quotaLabel(value: number, unit = ''): string {
	if (isUnlimitedQuota(value)) return 'Tanpa batas';
	if (unit === 'x') return `${formatNumber(value)}x`;
	return unit ? `${formatNumber(value)} ${unit}` : formatNumber(value);
}
