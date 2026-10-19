interface SubscriptionPlan {
	id: string;
	name: string;
	tier: string;
	price: number;
	pricePeriod: 'selamanya' | 'bulan';
	quota: string;
	quotaValue: number | null;
	description: string;
	features: string[];
	recommended?: boolean;
}

export const subscriptionPlans: SubscriptionPlan[] = [
	{
		id: 'free',
		name: 'Pencari Pemula',
		tier: 'Free Plan',
		price: 0,
		pricePeriod: 'selamanya',
		quota: '20 email lamaran otomatis pertama',
		quotaValue: 20,
		description: 'Coba langkah pertamamu dan mulai membuka peluang baru.',
		features: [
			'20 email lamaran otomatis pertama (trial)',
			'1x simulasi tes psikotes Kraepelin/Pauli',
			'Notifikasi status via Bot Telegram',
			'Simpan 1 CV utama'
		]
	},
	{
		id: 'starter',
		name: 'Prajurit Rintis',
		tier: 'Starter',
		price: 39000,
		pricePeriod: 'bulan',
		quota: '75 lamaran otomatis tiap bulan',
		quotaValue: 75,
		description: 'Bangun ritme melamar yang konsisten dan makin percaya diri.',
		features: [
			'75 lamaran otomatis tiap bulan',
			'3x tes psikotes lengkap + unduh sertifikat PDF resmi',
			'Bonus 10 Token Kredit Kilat',
			'Simpan hingga 3 versi CV & akses AI Cover Letter standar'
		]
	},
	{
		id: 'pro',
		name: 'Panglima Karier',
		tier: 'Pro',
		price: 89000,
		pricePeriod: 'bulan',
		quota: '200 lamaran otomatis tiap bulan',
		quotaValue: 200,
		description: 'Kirim lebih cepat dan masif, biar peluangmu makin terbuka.',
		features: [
			'200 lamaran otomatis tiap bulan (kirim lebih cepat & masif)',
			'10x tes psikotes lengkap + unduh sertifikat PDF',
			'Bonus 25 Token Kredit Kilat',
			'Notifikasi instan via WhatsApp (50 pesan/bln) & Telegram',
			'AI Resume Optimizer untuk bantu CV-mu lolos ATS'
		],
		recommended: true
	},
	{
		id: 'unlimited',
		name: 'Titan Korporat',
		tier: 'Unlimited',
		price: 149000,
		pricePeriod: 'bulan',
		quota: 'Unlimited lamaran',
		quotaValue: null,
		description: 'Gas terus mengejar peluang dengan dukungan penuh.',
		features: [
			'Lamaran tanpa batas (Unlimited Apply)',
			'Tes psikotes & unduh sertifikat PDF tanpa batas',
			'Bonus 50 Token Kredit Kilat',
			'Notifikasi WhatsApp & Telegram tanpa batas',
			'Antrean prioritas utama & pilihan gaya bahasa surat lamaran khusus'
		]
	}
];

export const creditTopUpPackages = [
	{ id: 'starter-credit', amount: 10000, credits: 20, label: 'Paket Hemat', bonus: null },
	{ id: 'plus-credit', amount: 25000, credits: 50, label: 'Paket Pejuang', bonus: 'Lebih Hemat!' }
] as const;

export function formatRupiah(amount: number): string {
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		maximumFractionDigits: 0
	}).format(amount);
}
