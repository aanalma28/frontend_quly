/**
 * Superadmin API service — MOCK implementation.
 *
 * Backend `/api/superadmin/...` belum tersedia, jadi modul ini menyimpan data
 * in-memory dan mengekspos fungsi async yang meniru kontrak API yang direncanakan.
 * Saat backend siap, cukup ganti isi tiap fungsi dengan `apiRequest(...)`.
 */

export type SubscriptionTierName = 'FREE' | 'PRO' | 'ENTERPRISE';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type JobStatus = 'RAW_PARSED' | 'PUBLISHED' | 'REJECTED';
export type ApplicationType = 'EMAIL' | 'WEBSITE_PORTAL';
export type SourceType = 'TELEGRAM' | 'WEB';
export type AiFeature = 'JOB_EXTRACTION' | 'PSYCHOTEST_AI' | 'RESUME_BUILDER';

export interface SubscriptionPackage {
	id: string;
	name: string;
	tier: SubscriptionTierName;
	price: number;
	durationDays: number;
	aiTokenQuota: number;
	isActive: boolean;
	features: string[];
	createdAt: string;
}

export interface SubscriptionPackageInput {
	name: string;
	tier: SubscriptionTierName;
	price: number;
	durationDays: number;
	aiTokenQuota: number;
	features: string[];
}

export interface Subscriber {
	id: string;
	email: string;
	fullName: string;
	packageId: string;
	packageName: string;
	tier: SubscriptionTierName;
	startedAt: string;
	expiresAt: string;
	status: SubscriptionStatus;
	revenue: number;
}

export interface ParsedJob {
	title: string;
	company: string;
	location: string;
	salaryRange: string;
	skills: string[];
	applicationType: ApplicationType;
	applicationDestination: string;
	description: string;
}

export interface IngestedJob {
	id: string;
	status: JobStatus;
	source: string;
	sourceType: SourceType;
	posterUrl: string | null;
	rawText: string;
	ingestedAt: string;
	matchScore: number;
	parsed: ParsedJob;
}

export interface IngestionSource {
	id: string;
	name: string;
	type: SourceType;
	target: string;
	isActive: boolean;
	lastSyncedAt: string | null;
	totalJobs: number;
}

export interface IngestionSourceInput {
	name: string;
	type: SourceType;
	target: string;
}

export interface ExecutiveOverview {
	grossRevenue: number;
	activeSubscribers: number;
	openaiCostUsd: number;
	openaiCostIdr: number;
	netMarginPct: number;
	publishedJobs: number;
}

export interface RevenueCostPoint {
	month: string;
	revenue: number;
	cost: number;
}

export interface AiFeatureUsage {
	feature: AiFeature;
	label: string;
	tokens: number;
	costUsd: number;
	costIdr: number;
	calls: number;
	color: string;
}

export interface AiDailyUsage {
	date: string;
	jobExtraction: number;
	psychotest: number;
	resumeBuilder: number;
}

export interface HighCostProcess {
	id: string;
	feature: AiFeature;
	label: string;
	tokens: number;
	costUsd: number;
	durationMs: number;
	timestamp: string;
	note: string;
}

export interface AiAnalytics {
	features: AiFeatureUsage[];
	daily: AiDailyUsage[];
	highCost: HighCostProcess[];
	totalTokens: number;
	totalCostUsd: number;
	totalCostIdr: number;
	totalCalls: number;
}

const USD_TO_IDR = 16_000;
const DAY_MS = 24 * 60 * 60 * 1000;

const delay = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));
const round = (value: number, digits = 2) => Number(value.toFixed(digits));

function isoDaysFromNow(days: number): string {
	return new Date(Date.now() + days * DAY_MS).toISOString();
}

function isoDaysAgo(days: number): string {
	return new Date(Date.now() - days * DAY_MS).toISOString();
}

function escapeXml(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function posterDataUrl(title: string, company: string, tone: string, bullets: string[]): string {
	const lines = bullets
		.slice(0, 4)
		.map((line, index) => `<text x="80" y="${560 + index * 44}" fill="#f8fafc" font-family="Arial" font-size="22">• ${escapeXml(line)}</text>`)
		.join('');
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="860" viewBox="0 0 640 860">
		<rect width="640" height="860" fill="${tone}"/>
		<rect x="36" y="36" width="568" height="788" rx="28" fill="rgba(15,23,42,0.35)" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
		<text x="80" y="150" fill="#e2e8f0" font-family="Arial" font-size="22" font-weight="700" letter-spacing="4">LOWONGAN KERJA</text>
		<text x="80" y="230" fill="#ffffff" font-family="Arial" font-size="46" font-weight="800">${escapeXml(title.slice(0, 22))}</text>
		<text x="80" y="286" fill="#e2e8f0" font-family="Arial" font-size="28" font-weight="700">${escapeXml(company)}</text>
		<line x1="80" y1="330" x2="560" y2="330" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>
		${lines}
	</svg>`;
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

let packageSeq = 100;
const nextPackageId = () => `pkg-${++packageSeq}`;
let sourceSeq = 100;
const nextSourceId = () => `src-${++sourceSeq}`;

let packages: SubscriptionPackage[] = [
	{
		id: 'pkg-free',
		name: 'Pencari Pemula',
		tier: 'FREE',
		price: 0,
		durationDays: 365,
		aiTokenQuota: 20_000,
		isActive: true,
		features: ['20 email lamaran otomatis', '1x simulasi psikotes', 'Notifikasi Telegram'],
		createdAt: isoDaysAgo(180)
	},
	{
		id: 'pkg-pro',
		name: 'Panglima Karier',
		tier: 'PRO',
		price: 89_000,
		durationDays: 30,
		aiTokenQuota: 500_000,
		isActive: true,
		features: [
			'200 lamaran otomatis/bulan',
			'10x psikotes + sertifikat PDF',
			'AI Resume Optimizer',
			'Notifikasi WhatsApp & Telegram'
		],
		createdAt: isoDaysAgo(120)
	},
	{
		id: 'pkg-enterprise',
		name: 'Titan Korporat',
		tier: 'ENTERPRISE',
		price: 149_000,
		durationDays: 30,
		aiTokenQuota: 2_000_000,
		isActive: true,
		features: [
			'Lamaran tanpa batas',
			'Sertifikat psikotes unlimited',
			'Antrean prioritas utama',
			'Dedicated account support'
		],
		createdAt: isoDaysAgo(90)
	},
	{
		id: 'pkg-legacy',
		name: 'Starter Lama',
		tier: 'PRO',
		price: 39_000,
		durationDays: 30,
		aiTokenQuota: 150_000,
		isActive: false,
		features: ['75 lamaran otomatis', '3x psikotes lengkap'],
		createdAt: isoDaysAgo(240)
	}
];

let subscribers: Subscriber[] = [
	{
		id: 'sub-1',
		email: 'ayu.putri@example.com',
		fullName: 'Ayu Putri',
		packageId: 'pkg-pro',
		packageName: 'Panglima Karier',
		tier: 'PRO',
		startedAt: isoDaysAgo(12),
		expiresAt: isoDaysFromNow(18),
		status: 'ACTIVE',
		revenue: 89_000
	},
	{
		id: 'sub-2',
		email: 'budi.santoso@example.com',
		fullName: 'Budi Santoso',
		packageId: 'pkg-enterprise',
		packageName: 'Titan Korporat',
		tier: 'ENTERPRISE',
		startedAt: isoDaysAgo(4),
		expiresAt: isoDaysFromNow(26),
		status: 'ACTIVE',
		revenue: 149_000
	},
	{
		id: 'sub-3',
		email: 'citra.dewi@example.com',
		fullName: 'Citra Dewi',
		packageId: 'pkg-pro',
		packageName: 'Panglima Karier',
		tier: 'PRO',
		startedAt: isoDaysAgo(41),
		expiresAt: isoDaysAgo(11),
		status: 'EXPIRED',
		revenue: 89_000
	},
	{
		id: 'sub-4',
		email: 'dimas.pratama@example.com',
		fullName: 'Dimas Pratama',
		packageId: 'pkg-pro',
		packageName: 'Panglima Karier',
		tier: 'PRO',
		startedAt: isoDaysAgo(7),
		expiresAt: isoDaysFromNow(23),
		status: 'ACTIVE',
		revenue: 89_000
	},
	{
		id: 'sub-5',
		email: 'eka.lestari@example.com',
		fullName: 'Eka Lestari',
		packageId: 'pkg-free',
		packageName: 'Pencari Pemula',
		tier: 'FREE',
		startedAt: isoDaysAgo(60),
		expiresAt: isoDaysFromNow(305),
		status: 'ACTIVE',
		revenue: 0
	},
	{
		id: 'sub-6',
		email: 'fajar.nugroho@example.com',
		fullName: 'Fajar Nugroho',
		packageId: 'pkg-enterprise',
		packageName: 'Titan Korporat',
		tier: 'ENTERPRISE',
		startedAt: isoDaysAgo(30),
		expiresAt: isoDaysAgo(0),
		status: 'CANCELLED',
		revenue: 149_000
	},
	{
		id: 'sub-7',
		email: 'gita.maharani@example.com',
		fullName: 'Gita Maharani',
		packageId: 'pkg-enterprise',
		packageName: 'Titan Korporat',
		tier: 'ENTERPRISE',
		startedAt: isoDaysAgo(2),
		expiresAt: isoDaysFromNow(28),
		status: 'ACTIVE',
		revenue: 149_000
	}
];

let sources: IngestionSource[] = [
	{
		id: 'src-1',
		name: 'Loker Jogja',
		type: 'TELEGRAM',
		target: '@lokerjogja',
		isActive: true,
		lastSyncedAt: isoDaysAgo(0.02),
		totalJobs: 842
	},
	{
		id: 'src-2',
		name: 'Info Kerja Remote',
		type: 'TELEGRAM',
		target: '@infokerjaremote',
		isActive: true,
		lastSyncedAt: isoDaysAgo(0.01),
		totalJobs: 1_204
	},
	{
		id: 'src-3',
		name: 'Karir Tech Indonesia',
		type: 'TELEGRAM',
		target: '-1002987654321',
		isActive: false,
		lastSyncedAt: isoDaysAgo(4),
		totalJobs: 318
	},
	{
		id: 'src-4',
		name: 'Glints Career Feed',
		type: 'WEB',
		target: 'https://glints.com/id/opportunities/jobs',
		isActive: true,
		lastSyncedAt: isoDaysAgo(0.05),
		totalJobs: 2_930
	},
	{
		id: 'src-5',
		name: 'Kalibrr Indonesia',
		type: 'WEB',
		target: 'https://www.kalibrr.com/job-board',
		isActive: true,
		lastSyncedAt: isoDaysAgo(0.03),
		totalJobs: 1_671
	}
];

function makeJob(
	id: string,
	status: JobStatus,
	source: string,
	sourceType: SourceType,
	parsed: ParsedJob,
	matchScore: number,
	ingestedAt: string,
	withPoster = true
): IngestedJob {
	const tone = sourceType === 'TELEGRAM' ? '#1d4ed8' : '#7c3aed';
	return {
		id,
		status,
		source,
		sourceType,
		posterUrl: withPoster
			? posterDataUrl(parsed.title, parsed.company, tone, parsed.skills)
			: null,
		rawText: `[${source}]\n${parsed.title} — ${parsed.company}\n${parsed.location}\nGaji: ${parsed.salaryRange}\n\nKualifikasi:\n${parsed.skills.map((skill) => `- ${skill}`).join('\n')}\n\n${parsed.description}\n\nKirim lamaran ke: ${parsed.applicationDestination}`,
		ingestedAt,
		matchScore,
		parsed
	};
}

let jobs: IngestedJob[] = [
	makeJob(
		'job-1001',
		'RAW_PARSED',
		'@lokerjogja',
		'TELEGRAM',
		{
			title: 'Backend Engineer',
			company: 'Nusa Teknologi',
			location: 'Yogyakarta (Hybrid)',
			salaryRange: 'Rp9.000.000 – Rp14.000.000',
			skills: ['NestJS', 'PostgreSQL', 'Docker', 'REST API'],
			applicationType: 'EMAIL',
			applicationDestination: 'hrd@nusatek.co.id',
			description:
				'Membangun dan memelihara layanan backend untuk platform rekrutmen. Minimal 2 tahun pengalaman dengan Node.js/NestJS.'
		},
		92,
		isoDaysAgo(0.04)
	),
	makeJob(
		'job-1002',
		'PUBLISHED',
		'Info Kerja Remote',
		'TELEGRAM',
		{
			title: 'Frontend Developer (SvelteKit)',
			company: 'Awan Data',
			location: 'Remote (Indonesia)',
			salaryRange: 'Rp12.000.000 – Rp18.000.000',
			skills: ['SvelteKit', 'TypeScript', 'Tailwind CSS'],
			applicationType: 'WEBSITE_PORTAL',
			applicationDestination: 'https://awandata.id/careers/frontend',
			description:
				'Mengembangkan antarmuka dashboard analitik dengan fokus performa dan aksesibilitas.'
		},
		88,
		isoDaysAgo(0.2)
	),
	makeJob(
		'job-1003',
		'RAW_PARSED',
		'Glints Career Feed',
		'WEB',
		{
			title: 'Data Analyst',
			company: 'Kreasi Digital',
			location: 'Jakarta Selatan',
			salaryRange: 'Rp8.500.000 – Rp11.000.000',
			skills: ['SQL', 'Python', 'Looker Studio'],
			applicationType: 'WEBSITE_PORTAL',
			applicationDestination: 'https://glints.com/id/opportunities/jobs/data-analyst',
			description:
				'Menyusun laporan performa produk dan membangun dashboard metrik mingguan.'
		},
		76,
		isoDaysAgo(0.4),
		false
	),
	makeJob(
		'job-1004',
		'PUBLISHED',
		'@infokerjaremote',
		'TELEGRAM',
		{
			title: 'Product Designer',
			company: 'Aster Studio',
			location: 'Bandung (On-site)',
			salaryRange: 'Rp10.000.000 – Rp15.000.000',
			skills: ['Figma', 'Design System', 'User Research'],
			applicationType: 'EMAIL',
			applicationDestination: 'talent@asterstudio.id',
			description:
				'Merancang pengalaman produk B2B dan menjaga konsistensi design system perusahaan.'
		},
		81,
		isoDaysAgo(0.9)
	),
	makeJob(
		'job-1005',
		'REJECTED',
		'Karir Tech Indonesia',
		'TELEGRAM',
		{
			title: 'Lowongan Tidak Jelas',
			company: 'PT Tanpa Nama',
			location: 'Tidak disebutkan',
			salaryRange: 'Kompetitif',
			skills: [],
			applicationType: 'EMAIL',
			applicationDestination: 'tidakvalid',
			description: 'Poster tidak memuat informasi perusahaan dan kualifikasi yang memadai.'
		},
		34,
		isoDaysAgo(1.2),
		false
	),
	makeJob(
		'job-1006',
		'RAW_PARSED',
		'Kalibrr Indonesia',
		'WEB',
		{
			title: 'DevOps Engineer',
			company: 'Bumi Cloud',
			location: 'Jakarta (Hybrid)',
			salaryRange: 'Rp14.000.000 – Rp20.000.000',
			skills: ['Kubernetes', 'Terraform', 'AWS', 'CI/CD'],
			applicationType: 'WEBSITE_PORTAL',
			applicationDestination: 'https://kalibrr.com/jobs/bumi-cloud-devops',
			description: 'Mengelola infrastruktur cloud multi-tenant dan pipeline deployment.'
		},
		90,
		isoDaysAgo(1.6)
	),
	makeJob(
		'job-1007',
		'PUBLISHED',
		'@lokerjogja',
		'TELEGRAM',
		{
			title: 'UI/UX Designer Intern',
			company: 'Ruang Karya',
			location: 'Yogyakarta (On-site)',
			salaryRange: 'Rp3.500.000 – Rp4.500.000',
			skills: ['Figma', 'Prototyping', 'Visual Design'],
			applicationType: 'EMAIL',
			applicationDestination: 'intern@ruangkarya.id',
			description: 'Program magang 6 bulan dengan mentoring desain produk digital.'
		},
		72,
		isoDaysAgo(2.1)
	),
	makeJob(
		'job-1008',
		'RAW_PARSED',
		'@infokerjaremote',
		'TELEGRAM',
		{
			title: 'Machine Learning Engineer',
			company: 'Cerdas AI',
			location: 'Remote',
			salaryRange: 'Rp18.000.000 – Rp26.000.000',
			skills: ['Python', 'PyTorch', 'LLM', 'MLOps'],
			applicationType: 'EMAIL',
			applicationDestination: 'jobs@cerdas.ai',
			description: 'Mengembangkan pipeline evaluasi model bahasa dan sistem rekomendasi.'
		},
		95,
		isoDaysAgo(2.8)
	)
];

const revenueCostSeries: RevenueCostPoint[] = [
	{ month: 'Mei', revenue: 92_400_000, cost: 3_820_000 },
	{ month: 'Jun', revenue: 108_900_000, cost: 4_210_000 },
	{ month: 'Jul', revenue: 121_500_000, cost: 4_980_000 },
	{ month: 'Agu', revenue: 139_750_000, cost: 5_460_000 },
	{ month: 'Sep', revenue: 162_300_000, cost: 6_020_000 },
	{ month: 'Okt', revenue: 184_750_000, cost: 6_598_000 }
];

const aiFeatures: AiFeatureUsage[] = [
	{
		feature: 'JOB_EXTRACTION',
		label: 'Job Extraction',
		tokens: 148_200_000,
		costUsd: 322.4,
		costIdr: 5_158_400,
		calls: 18_420,
		color: '#6366f1'
	},
	{
		feature: 'PSYCHOTEST_AI',
		label: 'Psychotest AI',
		tokens: 22_600_000,
		costUsd: 58.9,
		costIdr: 942_400,
		calls: 3_120,
		color: '#a855f7'
	},
	{
		feature: 'RESUME_BUILDER',
		label: 'Resume Builder',
		tokens: 14_100_000,
		costUsd: 31.08,
		costIdr: 497_280,
		calls: 2_040,
		color: '#22d3ee'
	}
];

const aiDaily: AiDailyUsage[] = Array.from({ length: 14 }, (_, index) => {
	const base = 1_200_000 + Math.round(Math.sin(index) * 180_000) + index * 46_000;
	return {
		date: `${14 - index} Okt`,
		jobExtraction: base,
		psychotest: Math.round(base * 0.16),
		resumeBuilder: Math.round(base * 0.1)
	};
}).reverse();

const highCostProcesses: HighCostProcess[] = [
	{
		id: 'proc-1',
		feature: 'JOB_EXTRACTION',
		label: 'Ekstraksi poster batch #4821',
		tokens: 1_840_000,
		costUsd: 4.2,
		durationMs: 18_400,
		timestamp: isoDaysAgo(0.12),
		note: 'Poster 4 gambar digabung dalam satu prompt multimodal.'
	},
	{
		id: 'proc-2',
		feature: 'JOB_EXTRACTION',
		label: 'Re-parse lowongan ambigu',
		tokens: 1_260_000,
		costUsd: 2.87,
		durationMs: 12_900,
		timestamp: isoDaysAgo(0.4),
		note: 'Dua kali retry karena JSON tidak valid pada percobaan pertama.'
	},
	{
		id: 'proc-3',
		feature: 'PSYCHOTEST_AI',
		label: 'Analisis kepribadian batch',
		tokens: 920_000,
		costUsd: 2.31,
		durationMs: 9_600,
		timestamp: isoDaysAgo(0.7),
		note: 'Prompt memuat 8 jawaban naratif per kandidat.'
	},
	{
		id: 'proc-4',
		feature: 'RESUME_BUILDER',
		label: 'ATS rewrite CV panjang',
		tokens: 780_000,
		costUsd: 1.94,
		durationMs: 7_100,
		timestamp: isoDaysAgo(1.1),
		note: 'CV 3 halaman dengan riwayat proyek yang sangat detail.'
	},
	{
		id: 'proc-5',
		feature: 'JOB_EXTRACTION',
		label: 'Scrape web portal 120 halaman',
		tokens: 640_000,
		costUsd: 1.62,
		durationMs: 22_800,
		timestamp: isoDaysAgo(1.6),
		note: 'Domain target lambat merespons; pipeline menunggu lebih lama.'
	}
];

function findPackage(id: string): SubscriptionPackage | undefined {
	return packages.find((item) => item.id === id);
}

export async function getOverview(): Promise<{ overview: ExecutiveOverview; series: RevenueCostPoint[] }> {
	await delay();
	const latest = revenueCostSeries[revenueCostSeries.length - 1];
	const activeSubscribers = subscribers.filter((item) => item.status === 'ACTIVE').length;
	const openaiCostIdr = latest.cost;
	const netMarginPct = round(((latest.revenue - openaiCostIdr) / latest.revenue) * 100);
	return {
		overview: {
			grossRevenue: latest.revenue,
			activeSubscribers,
			openaiCostUsd: round(openaiCostIdr / USD_TO_IDR),
			openaiCostIdr,
			netMarginPct,
			publishedJobs: 1_248
		},
		series: [...revenueCostSeries]
	};
}

export async function listPackages(): Promise<SubscriptionPackage[]> {
	await delay();
	return packages.map((item) => ({ ...item, features: [...item.features] }));
}

export async function createPackage(input: SubscriptionPackageInput): Promise<SubscriptionPackage> {
	await delay();
	const created: SubscriptionPackage = {
		id: nextPackageId(),
		name: input.name,
		tier: input.tier,
		price: input.price,
		durationDays: input.durationDays,
		aiTokenQuota: input.aiTokenQuota,
		isActive: true,
		features: [...input.features],
		createdAt: new Date().toISOString()
	};
	packages = [...packages, created];
	return { ...created, features: [...created.features] };
}

export async function updatePackage(
	id: string,
	input: SubscriptionPackageInput
): Promise<SubscriptionPackage> {
	await delay();
	const existing = findPackage(id);
	if (!existing) throw new Error('Paket tidak ditemukan.');
	packages = packages.map((item) =>
		item.id === id
			? {
					...item,
					name: input.name,
					tier: input.tier,
					price: input.price,
					durationDays: input.durationDays,
					aiTokenQuota: input.aiTokenQuota,
					features: [...input.features]
				}
			: item
	);
	const updated = findPackage(id)!;
	return { ...updated, features: [...updated.features] };
}

export async function togglePackage(id: string): Promise<SubscriptionPackage> {
	await delay(150);
	const existing = findPackage(id);
	if (!existing) throw new Error('Paket tidak ditemukan.');
	packages = packages.map((item) =>
		item.id === id ? { ...item, isActive: !item.isActive } : item
	);
	const updated = findPackage(id)!;
	return { ...updated, features: [...updated.features] };
}

export async function deletePackage(id: string): Promise<{ id: string; deleted: boolean }> {
	await delay();
	packages = packages.filter((item) => item.id !== id);
	return { id, deleted: true };
}

export async function listSubscribers(): Promise<Subscriber[]> {
	await delay();
	return subscribers.map((item) => ({ ...item }));
}

export async function extendSubscription(id: string, days: number): Promise<Subscriber> {
	await delay();
	const existing = subscribers.find((item) => item.id === id);
	if (!existing) throw new Error('Pelanggan tidak ditemukan.');
	const base = new Date(existing.expiresAt).getTime() > Date.now() ? new Date(existing.expiresAt) : new Date();
	const next = new Date(base.getTime() + days * DAY_MS);
	subscribers = subscribers.map((item) =>
		item.id === id ? { ...item, expiresAt: next.toISOString(), status: 'ACTIVE' } : item
	);
	return { ...subscribers.find((item) => item.id === id)! };
}

export async function overrideSubscription(
	id: string,
	payload: { packageId: string; expiresAt: string; status: SubscriptionStatus }
): Promise<Subscriber> {
	await delay();
	const pkg = findPackage(payload.packageId);
	if (!pkg) throw new Error('Paket tidak ditemukan.');
	subscribers = subscribers.map((item) =>
		item.id === id
			? {
					...item,
					packageId: pkg.id,
					packageName: pkg.name,
					tier: pkg.tier,
					expiresAt: payload.expiresAt,
					status: payload.status
				}
			: item
	);
	return { ...subscribers.find((item) => item.id === id)! };
}

export async function listJobs(filters: { status?: JobStatus | 'ALL'; search?: string } = {}): Promise<IngestedJob[]> {
	await delay();
	const search = filters.search?.trim().toLowerCase() ?? '';
	return jobs
		.filter((job) => {
			if (filters.status && filters.status !== 'ALL' && job.status !== filters.status) return false;
			if (!search) return true;
			return (
				job.parsed.title.toLowerCase().includes(search) ||
				job.parsed.company.toLowerCase().includes(search) ||
				job.source.toLowerCase().includes(search)
			);
		})
		.map((job) => ({ ...job, parsed: { ...job.parsed, skills: [...job.parsed.skills] } }));
}

export async function getJob(id: string): Promise<IngestedJob> {
	await delay();
	const job = jobs.find((item) => item.id === id);
	if (!job) throw new Error('Lowongan tidak ditemukan.');
	return { ...job, parsed: { ...job.parsed, skills: [...job.parsed.skills] } };
}

export async function updateJob(id: string, parsed: ParsedJob): Promise<IngestedJob> {
	await delay();
	const existing = jobs.find((item) => item.id === id);
	if (!existing) throw new Error('Lowongan tidak ditemukan.');
	jobs = jobs.map((item) =>
		item.id === id ? { ...item, parsed: { ...parsed, skills: [...parsed.skills] } } : item
	);
	return { ...jobs.find((item) => item.id === id)! };
}

export async function publishJob(id: string): Promise<IngestedJob> {
	await delay(180);
	jobs = jobs.map((item) => (item.id === id ? { ...item, status: 'PUBLISHED' } : item));
	return { ...jobs.find((item) => item.id === id)! };
}

export async function rejectJob(id: string): Promise<IngestedJob> {
	await delay(180);
	jobs = jobs.map((item) => (item.id === id ? { ...item, status: 'REJECTED' } : item));
	return { ...jobs.find((item) => item.id === id)! };
}

export async function listSources(): Promise<IngestionSource[]> {
	await delay();
	return sources.map((item) => ({ ...item }));
}

export async function createSource(input: IngestionSourceInput): Promise<IngestionSource> {
	await delay();
	const created: IngestionSource = {
		id: nextSourceId(),
		name: input.name,
		type: input.type,
		target: input.target,
		isActive: true,
		lastSyncedAt: null,
		totalJobs: 0
	};
	sources = [...sources, created];
	return { ...created };
}

export async function toggleSource(id: string): Promise<IngestionSource> {
	await delay(150);
	sources = sources.map((item) =>
		item.id === id ? { ...item, isActive: !item.isActive } : item
	);
	return { ...sources.find((item) => item.id === id)! };
}

export async function deleteSource(id: string): Promise<{ id: string; deleted: boolean }> {
	await delay();
	sources = sources.filter((item) => item.id !== id);
	return { id, deleted: true };
}

export async function getAiAnalytics(): Promise<AiAnalytics> {
	await delay();
	const totalTokens = aiFeatures.reduce((sum, item) => sum + item.tokens, 0);
	const totalCostUsd = round(aiFeatures.reduce((sum, item) => sum + item.costUsd, 0));
	const totalCostIdr = aiFeatures.reduce((sum, item) => sum + item.costIdr, 0);
	const totalCalls = aiFeatures.reduce((sum, item) => sum + item.calls, 0);
	return {
		features: aiFeatures.map((item) => ({ ...item })),
		daily: aiDaily.map((item) => ({ ...item })),
		highCost: highCostProcesses.map((item) => ({ ...item })),
		totalTokens,
		totalCostUsd,
		totalCostIdr,
		totalCalls
	};
}
