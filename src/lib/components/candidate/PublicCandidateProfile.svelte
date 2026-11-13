<script lang="ts">
	import {
		ArrowLeft,
		Award,
		BadgeCheck,
		BrainCircuit,
		BriefcaseBusiness,
		CalendarDays,
		CheckCircle2,
		Clock3,
		Download,
		ExternalLink,
		FileText,
		FolderGit2,
		GraduationCap,
		Languages,
		Link2Off,
		Mail,
		MapPin,
		RefreshCw,
		ShieldCheck,
		Sparkles
	} from '@lucide/svelte';
	import QulyLogo from '#lib/components/ui/QulyLogo.svelte';
	import {
		getPublicProfileApi,
		resolvePublicAssetUrl,
		type PublicPsychotestCategory,
		type PublicPsychotestCompetencyLevel,
		type PublicProfileResult
	} from '#lib/services/publicProfileApi.js';

	interface Props {
		token: string | null;
	}

	let { token }: Props = $props();

	type ViewState = { kind: 'loading' } | PublicProfileResult;

	let profileState = $state<ViewState>({ kind: 'loading' });
	let reloadNonce = $state(0);

	const monthYearFormatter = new Intl.DateTimeFormat('id-ID', {
		month: 'short',
		year: 'numeric'
	});
	const dateFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' });
	const competencyLabel: Record<PublicPsychotestCompetencyLevel, string> = {
		BASIC: 'Dasar',
		INTERMEDIATE: 'Menengah',
		ADVANCED: 'Mahir',
		EXPERT: 'Ahli'
	};
	const psychotestCategoryLabel: Record<PublicPsychotestCategory, string> = {
		PERSONALITY: 'Kepribadian',
		COGNITIVE: 'Kognitif',
		ACCURACY: 'Ketelitian'
	};

	$effect(() => {
		const currentToken = token?.trim() ?? '';
		void reloadNonce;

		if (!currentToken) {
			profileState = {
				kind: 'invalid',
				message: 'Tautan profil tidak lengkap. Silakan buka tautan terbaru dari email lamaran.'
			};
			return;
		}

		const controller = new AbortController();
		profileState = { kind: 'loading' };

		void (async () => {
			try {
				const result = await getPublicProfileApi(currentToken, controller.signal);
				if (!controller.signal.aborted) profileState = result;
			} catch (error) {
				if (controller.signal.aborted) return;
				profileState = {
					kind: 'error',
					message:
						error instanceof Error
							? error.message
							: 'Profil kandidat belum dapat dimuat. Silakan coba lagi.'
				};
			}
		})();

		return () => controller.abort();
	});

	function retry() {
		reloadNonce += 1;
	}

	function formatMonth(value: string | null): string {
		if (!value) return '';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';
		return monthYearFormatter.format(date);
	}

	function formatDate(value: string | null): string {
		if (!value) return '';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';
		return dateFormatter.format(date);
	}

	function formatRange(start: string | null, end: string | null, isCurrent: boolean): string {
		const from = formatMonth(start);
		const to = isCurrent ? 'Sekarang' : formatMonth(end);
		if (from && to) return `${from} – ${to}`;
		return from || to;
	}

	function formatFileSize(bytes: number | null): string {
		if (!Number.isFinite(bytes) || !bytes || bytes <= 0) return '';
		if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function initials(name: string | null, email: string): string {
		const source = name?.trim() || email.split('@')[0] || 'K';
		return source
			.split(/\s+/)
			.map((part) => part[0])
			.slice(0, 2)
			.join('')
			.toUpperCase();
	}

	function contactMailto(email: string, name: string | null): string {
		const subject = name ? `Terkait lamaran kandidat ${name}` : 'Terkait lamaran kandidat';
		return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
	}

	function formatPercent(value: number | null): string {
		if (value == null || !Number.isFinite(value)) return '—';
		return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value)}%`;
	}

	function formatScore(value: number | null): string {
		if (value == null || !Number.isFinite(value)) return '—';
		return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value);
	}
</script>

<svelte:head>
	<title>Profil Kandidat | Quly</title>
	<meta
		name="description"
		content="Profil profesional kandidat yang dibagikan melalui Quly untuk kebutuhan proses rekrutmen."
	/>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<main class="min-h-screen bg-[#f5f7fb] text-slate-800">
	<header class="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
		<div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
			<a href="/" aria-label="Quly, beranda" class="shrink-0">
				<QulyLogo size={30} />
			</a>
			<div class="flex items-center gap-2">
				<span class="hidden items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-700 sm:inline-flex">
					<ShieldCheck size={12} /> Profil kandidat
				</span>
				<a
					href="/"
					class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-500 transition hover:border-indigo-200 hover:text-indigo-700"
				>
					<ArrowLeft size={13} /> Quly
				</a>
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
		{#if profileState.kind === 'loading'}
			<div class="mx-auto max-w-3xl space-y-4" aria-label="Memuat profil kandidat">
				<div class="h-56 animate-pulse rounded-3xl bg-white shadow-sm"></div>
				<div class="h-48 animate-pulse rounded-3xl bg-white shadow-sm"></div>
				<div class="h-36 animate-pulse rounded-3xl bg-white shadow-sm"></div>
			</div>
		{:else if profileState.kind === 'ok'}
			{@const candidate = profileState.data.candidate}
			{@const application = profileState.data.application}
			{@const cv = profileState.data.cv}
			{@const psychotest = profileState.data.psychotest}
			<div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
				<div class="space-y-5">
					<section class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
						<div class="relative overflow-hidden bg-gradient-to-br from-[#1B4DB1] via-[#1845A6] to-[#153B8C] px-5 py-7 text-white sm:px-8 sm:py-9">
							<div class="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-white/10"></div>
							<div class="pointer-events-none absolute -bottom-24 right-16 size-40 rounded-full bg-white/5"></div>
							<p class="relative text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100">
								{application.jobTitle
									? `Lamaran untuk ${application.jobTitle}${application.companyName ? ` di ${application.companyName}` : ''}`
									: 'Profil profesional kandidat'}
							</p>
							<div class="relative mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
								<span class="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-xl font-bold tracking-wide text-white backdrop-blur">
									{initials(candidate.fullName, candidate.email)}
								</span>
								<div class="min-w-0">
									<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">
										{candidate.fullName || 'Kandidat Quly'}
									</h1>
									{#if candidate.headline || candidate.targetRole}
										<p class="mt-1 text-sm font-medium text-blue-100">
											{candidate.headline || candidate.targetRole}
										</p>
									{/if}
								</div>
							</div>
							<div class="relative mt-5 flex flex-wrap gap-2 text-[11px] font-medium">
								{#if candidate.location}
									<span class="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1.5">
										<MapPin size={12} /> {candidate.location}
									</span>
								{/if}
								{#if candidate.yearsOfExperience != null}
									<span class="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1.5">
										<BriefcaseBusiness size={12} />
										{candidate.yearsOfExperience > 0
											? `${candidate.yearsOfExperience} tahun pengalaman`
											: 'Kurang dari 1 tahun pengalaman'}
									</span>
								{/if}
								{#if candidate.email}
									<a
										href={contactMailto(candidate.email, candidate.fullName)}
										class="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1.5 transition hover:bg-white/20"
									>
										<Mail size={12} /> Email kandidat
									</a>
								{/if}
							</div>
						</div>

						<div class="px-5 py-6 sm:px-8">
							{#if candidate.summary}
								<p class="whitespace-pre-line text-sm leading-7 text-slate-600">{candidate.summary}</p>
							{:else}
								<p class="text-sm leading-7 text-slate-500">
									Kandidat belum menambahkan ringkasan profesional.
								</p>
							{/if}

							{#if candidate.skills.length > 0}
								<div class="mt-6 border-t border-slate-100 pt-5">
									<h2 class="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
										Keahlian
									</h2>
									<div class="mt-3 flex flex-wrap gap-2">
										{#each candidate.skills as skill}
											<span class="rounded-lg border border-indigo-100 bg-indigo-50/70 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
												{skill}
											</span>
										{/each}
									</div>
								</div>
							{/if}

							{#if candidate.languages.length > 0}
								<div class="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
									<span class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
										<Languages size={13} /> Bahasa:
									</span>
									{#each candidate.languages as language}
										<span class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600">
											{language}
										</span>
									{/each}
								</div>
							{/if}
						</div>
					</section>

					{#if psychotest}
						<section class="overflow-hidden rounded-3xl border border-violet-200 bg-white shadow-sm shadow-violet-100/60">
							<div class="border-b border-violet-100 bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/40 px-5 py-5 sm:px-7">
								<div class="flex flex-wrap items-center justify-between gap-3">
									<div class="flex items-center gap-2.5">
										<span class="flex size-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
											<BrainCircuit size={18} />
										</span>
										<div>
											<h2 class="text-base font-bold text-slate-950">Hasil Psikotes</h2>
											<p class="text-[11px] text-slate-500">Dilampirkan kandidat pada lamaran ini</p>
										</div>
									</div>
									<span class="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 ring-1 ring-violet-200">
										<BadgeCheck size={12} /> Terintegrasi
									</span>
								</div>
							</div>

							<div class="px-5 py-6 sm:px-7">
								<div class="grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
									<div class="rounded-2xl bg-slate-950 px-4 py-4 text-white">
										<p class="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
											Skor keseluruhan
										</p>
										<div class="mt-1 flex items-end gap-2">
											<p class="text-4xl font-bold tracking-tight">{formatScore(psychotest.overallScore)}</p>
											<span class="mb-1 text-xs text-slate-400">/ 100</span>
										</div>
										<p class="mt-2 text-[11px] text-slate-400">
											{psychotest.certificateNumber
												? `Sertifikat ${psychotest.certificateNumber}`
												: 'Laporan psikotes kandidat'}
										</p>
									</div>
									<div class="rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-4">
										<p class="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-500">
											Tingkat kompetensi
										</p>
										<p class="mt-1 text-xl font-bold text-violet-800">
											{psychotest.competencyLevel
												? competencyLabel[psychotest.competencyLevel]
												: '—'}
										</p>
										<p class="mt-1 text-[11px] leading-5 text-violet-700/70">
											Berdasarkan hasil seluruh paket tes dan analisis AI.
										</p>
										{#if psychotest.issuedAt}
											<p class="mt-2 inline-flex items-center gap-1 text-[10px] text-violet-600/70">
												<CalendarDays size={11} /> Diterbitkan {formatDate(psychotest.issuedAt)}
											</p>
										{/if}
									</div>
								</div>

								{#if psychotest.summary}
									<p class="mt-5 whitespace-pre-line text-sm leading-7 text-slate-600">
										{psychotest.summary}
									</p>
								{/if}

								{#if psychotest.aggregateScore}
									<dl class="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
										<div class="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
											<dt class="text-[10px] font-medium text-slate-500">Rata-rata akurasi</dt>
											<dd class="mt-0.5 text-lg font-bold text-slate-900">
												{formatPercent(psychotest.aggregateScore.averageAccuracy)}
											</dd>
										</div>
										<div class="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
											<dt class="text-[10px] font-medium text-slate-500">Total benar</dt>
											<dd class="mt-0.5 text-lg font-bold text-emerald-700">
												{psychotest.aggregateScore.totalCorrect}
											</dd>
										</div>
										<div class="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
											<dt class="text-[10px] font-medium text-slate-500">Total salah</dt>
											<dd class="mt-0.5 text-lg font-bold text-rose-700">
												{psychotest.aggregateScore.totalIncorrect}
											</dd>
										</div>
										<div class="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
											<dt class="text-[10px] font-medium text-slate-500">Dilewati</dt>
											<dd class="mt-0.5 text-lg font-bold text-slate-500">
												{psychotest.aggregateScore.totalSkipped}
											</dd>
										</div>
									</dl>
								{/if}

								{#if psychotest.personality?.summary}
									<div class="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
										<div class="flex flex-wrap items-center gap-2">
											<Sparkles size={15} class="text-indigo-600" />
											<p class="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">
												Profil kepribadian
											</p>
											{#if psychotest.personality.personalityType}
												<span class="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-100">
													{psychotest.personality.personalityType}
												</span>
											{/if}
										</div>
										<p class="mt-2 text-xs leading-6 text-slate-600">
											{psychotest.personality.summary}
										</p>
										{#if psychotest.personality.workStyle.length > 0}
											<div class="mt-3 flex flex-wrap gap-1.5">
												{#each psychotest.personality.workStyle as item}
													<span class="rounded-full bg-white px-2 py-1 text-[10px] font-medium text-indigo-700 ring-1 ring-indigo-100">
														{item}
													</span>
												{/each}
											</div>
										{/if}
									</div>
								{/if}

								{#if psychotest.strengths.length > 0 || psychotest.areasForImprovement.length > 0}
									<div class="mt-4 grid gap-3 sm:grid-cols-2">
										{#if psychotest.strengths.length > 0}
											<div class="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
												<h3 class="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
													<CheckCircle2 size={14} /> Kekuatan
												</h3>
												<ul class="mt-2 space-y-1.5">
													{#each psychotest.strengths as item}
														<li class="flex items-start gap-2 text-xs leading-5 text-slate-600">
															<span class="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-500"></span>{item}
														</li>
													{/each}
												</ul>
											</div>
										{/if}
										{#if psychotest.areasForImprovement.length > 0}
											<div class="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
												<h3 class="flex items-center gap-1.5 text-xs font-bold text-amber-800">
													<Award size={14} /> Area pengembangan
												</h3>
												<ul class="mt-2 space-y-1.5">
													{#each psychotest.areasForImprovement as item}
														<li class="flex items-start gap-2 text-xs leading-5 text-slate-600">
															<span class="mt-2 size-1.5 shrink-0 rounded-full bg-amber-500"></span>{item}
														</li>
													{/each}
												</ul>
											</div>
										{/if}
									</div>
								{/if}

								{#if psychotest.recommendedRoles.length > 0}
									<div class="mt-4">
										<h3 class="text-xs font-bold text-slate-700">Role yang direkomendasikan</h3>
										<div class="mt-2 flex flex-wrap gap-1.5">
											{#each psychotest.recommendedRoles as role}
												<span class="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
													{role}
												</span>
											{/each}
										</div>
									</div>
								{/if}

								{#if psychotest.aggregateScore && psychotest.aggregateScore.packages.length > 0}
									<div class="mt-4">
										<h3 class="text-xs font-bold text-slate-700">Rincian paket tes</h3>
										<div class="mt-2 grid gap-2 sm:grid-cols-2">
											{#each psychotest.aggregateScore.packages as packageResult}
												<div class="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
													<div class="flex items-start justify-between gap-2">
														<p class="text-xs font-semibold text-slate-800">{packageResult.title}</p>
														<span class="shrink-0 rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold text-slate-500 ring-1 ring-slate-100">
															{psychotestCategoryLabel[packageResult.category]}
														</span>
													</div>
													{#if packageResult.category === 'PERSONALITY'}
														<p class="mt-1.5 text-[11px] font-medium text-indigo-700">
															{packageResult.personalityType || 'Profil kepribadian'}
														</p>
														{#if packageResult.summary}
															<p class="mt-1 text-[10px] leading-4 text-slate-500">
																{packageResult.summary}
															</p>
														{/if}
													{:else}
														<p class="mt-1.5 text-[11px] text-slate-500">
															Akurasi <strong class="text-slate-800">{formatPercent(packageResult.accuracy)}</strong>
															{#if packageResult.correct != null && packageResult.totalQuestions != null}
																· {packageResult.correct}/{packageResult.totalQuestions} benar
															{/if}
														</p>
													{/if}
												</div>
											{/each}
										</div>
									</div>
								{/if}

								<div class="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
									{#if psychotest.certificate.available && psychotest.certificate.downloadUrl}
										<a
											href={resolvePublicAssetUrl(psychotest.certificate.downloadUrl)}
											target="_blank"
											rel="noreferrer noopener"
											class="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-semibold text-white transition hover:bg-violet-700"
										>
											<Download size={14} /> Unduh Laporan Psikotes
										</a>
									{/if}
									<a
										href={`/verify/psychotest/${psychotest.sessionId}`}
										target="_blank"
										rel="noreferrer noopener"
										class="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
									>
										<BadgeCheck size={14} /> Verifikasi Sertifikat
									</a>
									{#if psychotest.certificateNumber}
										<span class="text-[10px] text-slate-400">{psychotest.certificateNumber}</span>
									{/if}
								</div>
							</div>
						</section>
					{/if}

					{#if candidate.experiences.length > 0}
						<section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-7">
							<div class="flex items-center gap-2">
								<span class="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
									<BriefcaseBusiness size={16} />
								</span>
								<h2 class="text-base font-bold text-slate-950">Pengalaman Kerja</h2>
							</div>
							<div class="mt-5 space-y-5">
								{#each candidate.experiences as experience}
									<div class="relative border-l border-slate-200 pl-5 last:pb-0">
										<span class="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-indigo-500 ring-4 ring-white"></span>
										<div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
											<div>
												<h3 class="text-sm font-bold text-slate-900">{experience.position}</h3>
												<p class="mt-0.5 text-xs font-medium text-slate-600">
													{experience.company}
													{#if experience.location}
														<span class="text-slate-400">·</span>
														{experience.location}
													{/if}
												</p>
											</div>
											<p class="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
												{formatRange(experience.startDate, experience.endDate, experience.isCurrent)}
											</p>
										</div>
										{#if experience.description}
											<p class="mt-2 whitespace-pre-line text-xs leading-6 text-slate-600">
												{experience.description}
											</p>
										{/if}
									</div>
								{/each}
							</div>
						</section>
					{/if}

					{#if candidate.educations.length > 0}
						<section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-7">
							<div class="flex items-center gap-2">
								<span class="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
									<GraduationCap size={16} />
								</span>
								<h2 class="text-base font-bold text-slate-950">Pendidikan</h2>
							</div>
							<div class="mt-5 grid gap-3 sm:grid-cols-2">
								{#each candidate.educations as education}
									<div class="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
										<p class="text-sm font-bold text-slate-900">{education.institution}</p>
										{#if education.degree || education.fieldOfStudy}
											<p class="mt-1 text-xs font-medium text-slate-600">
												{[education.degree, education.fieldOfStudy].filter(Boolean).join(' · ')}
											</p>
										{/if}
										<p class="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
											{formatRange(education.startDate, education.endDate, false)}
										</p>
										{#if education.description}
											<p class="mt-2 text-xs leading-5 text-slate-500">{education.description}</p>
										{/if}
									</div>
								{/each}
							</div>
						</section>
					{/if}

					{#if candidate.certifications.length > 0}
						<section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-7">
							<div class="flex items-center gap-2">
								<span class="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
									<Award size={16} />
								</span>
								<h2 class="text-base font-bold text-slate-950">Sertifikasi</h2>
							</div>
							<div class="mt-5 grid gap-3 sm:grid-cols-2">
								{#each candidate.certifications as certification}
									<div class="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
										<p class="text-sm font-bold text-slate-900">{certification.name}</p>
										{#if certification.issuingOrganization}
											<p class="mt-1 text-xs font-medium text-slate-600">
												{certification.issuingOrganization}
											</p>
										{/if}
										{#if certification.issueDate}
											<p class="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
												Terbit {formatMonth(certification.issueDate)}
											</p>
										{/if}
										{#if certification.credentialUrl}
											<a
												href={certification.credentialUrl}
												target="_blank"
												rel="noreferrer noopener"
												class="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline"
											>
												Lihat kredensial <ExternalLink size={11} />
											</a>
										{/if}
									</div>
								{/each}
							</div>
						</section>
					{/if}

					{#if candidate.projects.length > 0}
						<section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-7">
							<div class="flex items-center gap-2">
								<span class="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
									<FolderGit2 size={16} />
								</span>
								<h2 class="text-base font-bold text-slate-950">Proyek</h2>
							</div>
							<div class="mt-5 space-y-3">
								{#each candidate.projects as project}
									<div class="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
										<div class="flex flex-wrap items-start justify-between gap-2">
											<div>
												<p class="text-sm font-bold text-slate-900">{project.name}</p>
												{#if project.role}
													<p class="mt-0.5 text-xs font-medium text-slate-600">{project.role}</p>
												{/if}
											</div>
											{#if project.projectUrl}
												<a
													href={project.projectUrl}
													target="_blank"
													rel="noreferrer noopener"
													class="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline"
												>
													Lihat proyek <ExternalLink size={11} />
												</a>
											{/if}
										</div>
										{#if project.description}
											<p class="mt-2 text-xs leading-5 text-slate-600">{project.description}</p>
										{/if}
										{#if project.technologies}
											<p class="mt-2 text-[10px] font-semibold text-slate-400">{project.technologies}</p>
										{/if}
									</div>
								{/each}
							</div>
						</section>
					{/if}
				</div>

				<aside class="space-y-4 lg:sticky lg:top-24">
					<section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
						<div class="flex items-center gap-2">
							<span class="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
								<FileText size={16} />
							</span>
							<h2 class="text-sm font-bold text-slate-950">CV Kandidat</h2>
						</div>
						{#if cv?.downloadUrl}
							<a
								href={resolvePublicAssetUrl(cv.downloadUrl)}
								target="_blank"
								rel="noreferrer noopener"
								class="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
							>
								<Download size={16} /> Unduh CV
							</a>
							<p class="mt-2 truncate text-center text-[10px] text-slate-400" title={cv.fileName}>
								{cv.fileName}
								{#if cv.fileSize}
									· {formatFileSize(cv.fileSize)}
								{/if}
							</p>
						{:else}
							<p class="mt-3 text-xs leading-6 text-slate-500">
								CV kandidat tersedia pada lampiran email lamaran yang Anda terima.
							</p>
						{/if}
					</section>

					<a
						href={contactMailto(candidate.email, candidate.fullName)}
						class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50"
					>
						<Mail size={16} /> Hubungi Kandidat
					</a>

					<section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
						<h2 class="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
							Konteks lamaran
						</h2>
						{#if application.jobTitle}
							<p class="mt-2 text-sm font-semibold text-slate-800">{application.jobTitle}</p>
						{/if}
						{#if application.companyName}
							<p class="mt-0.5 text-xs text-slate-500">{application.companyName}</p>
						{/if}
						{#if application.sentAt}
							<p class="mt-3 inline-flex items-center gap-1.5 text-[10px] text-slate-400">
								<CalendarDays size={12} /> Dikirim {formatDate(application.sentAt)}
							</p>
						{/if}
						{#if profileState.data.expiresAt}
							<p class="mt-3 border-t border-slate-100 pt-3 text-[10px] leading-5 text-slate-400">
								Tautan profil ini berlaku hingga {formatDate(profileState.data.expiresAt)}.
							</p>
						{/if}
					</section>

					{#if candidate.links.linkedin || candidate.links.portfolio || candidate.links.github}
						<section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
							<h2 class="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
								Tautan profesional
							</h2>
							<div class="mt-3 space-y-2">
								{#if candidate.links.linkedin}
									<a
										href={candidate.links.linkedin}
										target="_blank"
										rel="noreferrer noopener"
										class="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-100 hover:bg-indigo-50/50 hover:text-indigo-700"
									>
										LinkedIn <ExternalLink size={12} />
									</a>
								{/if}
								{#if candidate.links.portfolio}
									<a
										href={candidate.links.portfolio}
										target="_blank"
										rel="noreferrer noopener"
										class="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-100 hover:bg-indigo-50/50 hover:text-indigo-700"
									>
										Portfolio <ExternalLink size={12} />
									</a>
								{/if}
								{#if candidate.links.github}
									<a
										href={candidate.links.github}
										target="_blank"
										rel="noreferrer noopener"
										class="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-100 hover:bg-indigo-50/50 hover:text-indigo-700"
									>
										GitHub <ExternalLink size={12} />
									</a>
								{/if}
							</div>
						</section>
					{/if}
				</aside>
			</div>
		{:else if profileState.kind === 'expired' || profileState.kind === 'invalid'}
			{@const expired = profileState.kind === 'expired' ? profileState : null}
			<section class="mx-auto max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
				<div class="border-b border-slate-100 bg-slate-50/70 px-6 py-7 text-center sm:px-8">
					<span
						class="mx-auto flex size-14 items-center justify-center rounded-2xl {expired
							? 'bg-amber-50 text-amber-600'
							: 'bg-rose-50 text-rose-600'}"
					>
						{#if expired}
							<Clock3 size={26} />
						{:else}
							<Link2Off size={26} />
						{/if}
					</span>
					<p class="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
						Akses profil
					</p>
					<h1 class="mt-2 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
						{expired ? 'Tautan akses telah kedaluwarsa' : 'Tautan profil tidak valid'}
					</h1>
					<p class="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
						{expired
							? 'Demi menjaga privasi kandidat, tautan akses ini hanya berlaku dalam masa yang ditentukan.'
							: profileState.message}
					</p>
				</div>
				<div class="px-6 py-6 sm:px-8">
					{#if expired && expired.expiredAt}
						<p class="mb-4 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2 text-center text-[11px] text-amber-700">
							Masa berlaku berakhir pada {formatDate(expired.expiredAt)}.
						</p>
					{:else}
						<p class="mb-4 text-center text-xs leading-6 text-slate-500">
							Silakan buka tautan terbaru dari email lamaran kandidat.
						</p>
					{/if}

					{#if expired && expired.candidateEmail}
						<a
							href={contactMailto(expired.candidateEmail, expired.candidateName)}
							class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
						>
							<Mail size={16} /> Hubungi Kandidat
						</a>
					{/if}

					<div class="{expired && expired.candidateEmail ? 'mt-3' : ''} rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
						<p class="text-xs leading-6 text-slate-500">
							Alternatif lain: balas email lamaran yang Anda terima untuk menghubungi kandidat
							secara langsung.
						</p>
					</div>

					<div class="mt-5 flex flex-wrap items-center justify-center gap-3">
						<a
							href="/support"
							class="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700"
						>
							Buka pusat bantuan
						</a>
						<a href="/" class="text-xs font-semibold text-indigo-700 hover:underline">
							Kembali ke Quly
						</a>
					</div>
				</div>
			</section>
		{:else}
			<section class="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl shadow-slate-200/50 sm:p-9">
				<span class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
					<Link2Off size={26} />
				</span>
				<h1 class="mt-4 text-xl font-bold text-slate-950">Profil belum dapat dimuat</h1>
				<p class="mt-2 text-sm leading-6 text-slate-500">{profileState.message}</p>
				<button
					type="button"
					onclick={retry}
					class="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
				>
					<RefreshCw size={15} /> Coba lagi
				</button>
				<p class="mt-4 text-xs text-slate-400">
					Jika masalah berlanjut, buka <a href="/support" class="font-semibold text-indigo-700 hover:underline">pusat bantuan Quly</a>.
				</p>
			</section>
		{/if}

		<footer class="mt-8 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-5 text-center sm:flex-row sm:text-left">
			<p class="inline-flex items-center gap-2 text-[11px] text-slate-400">
				<ShieldCheck size={13} /> Profil ini dibagikan melalui Quly untuk proses rekrutmen.
			</p>
			<a href="/privacy" class="text-[11px] font-semibold text-slate-400 hover:text-indigo-700">
				Kebijakan Privasi
			</a>
		</footer>
	</div>
</main>
