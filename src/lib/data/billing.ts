interface SubscriptionPlan {
	id: string;
	name: string;
	tier: string;
	price: number;
	quota: string;
	quotaValue: number | null;
	description: string;
	features: string[];
	recommended?: boolean;
}

export const subscriptionPlans: SubscriptionPlan[] = [
	{
		id: 'starter',
		name: 'Prajurit Rintis',
		tier: 'Starter',
		price: 29000,
		quota: '30 lamaran/bulan',
		quotaValue: 30,
		description: 'Untuk mulai melangkah dan membangun ritme melamar.',
		features: ['30 lamaran otomatis per bulan', 'Rekomendasi lowongan relevan', 'Pelacakan progres lamaran']
	},
	{
		id: 'pro',
		name: 'Panglima Karier',
		tier: 'Pro',
		price: 79000,
		quota: '150 lamaran/bulan',
		quotaValue: 150,
		description: 'Lebih banyak ruang untuk mengejar peluang terbaikmu.',
		features: ['150 lamaran otomatis per bulan', 'Semua fitur Prajurit Rintis', 'Latihan psikotes interaktif'],
		recommended: true
	},
	{
		id: 'unlimited',
		name: 'Titan Korporat',
		tier: 'Unlimited',
		price: 149000,
		quota: 'Unlimited lamaran',
		quotaValue: null,
		description: 'Untuk pencarian kerja dengan tempo tanpa batas.',
		features: ['Lamaran otomatis tanpa batas', 'Semua fitur Panglima Karier', 'Prioritas untuk perjalanan kariermu']
	}
];

export const creditTopUpPackages = [
	{ id: 'starter-credit', amount: 10000, credits: 20, label: 'Pemanasan', bonus: null },
	{ id: 'plus-credit', amount: 25000, credits: 50, label: 'Paling fleksibel', bonus: null },
	{ id: 'max-credit', amount: 50000, credits: 100, label: 'Lebih hemat', bonus: 'Nilai terbaik' }
] as const;

export const demoSubscription = {
	planId: 'pro',
	planName: 'Panglima Karier',
	remainingApplications: 120,
	monthlyQuota: 150,
	paygBalance: 15000,
	paygCredits: 30
} as const;

export function formatRupiah(amount: number): string {
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		maximumFractionDigits: 0
	}).format(amount);
}
