<script lang="ts">
	import { onMount } from 'svelte';
	import { AlertTriangle, ArrowRight, CheckCircle2, Download } from '@lucide/svelte';
	import { beforeNavigate, goto } from '$app/navigation';
	import CvScoreCard from '#lib/components/onboarding/CvScoreCard.svelte';
	import { onboarding, backToUpload } from '#lib/stores/onboardingStore.js';
	import type { CvScore } from '#lib/services/onboardingApi.js';

	interface AtsBasics {
		fullName?: string;
		targetRole?: string;
		email?: string;
		phone?: string;
		linkedin?: string;
		portfolio?: string;
		github?: string;
		location?: string;
		summary?: string;
	}

	interface AtsExperience {
		company?: string;
		position?: string;
		startDate?: string;
		endDate?: string;
		location?: string;
		highlights?: string[];
	}

	interface AtsEducation {
		institution?: string;
		degree?: string;
		fieldOfStudy?: string;
		location?: string;
		startDate?: string;
		endDate?: string;
		gpa?: string;
	}

	interface AtsSkills {
		technical?: string[];
		tools?: string[];
		softSkills?: string[];
	}

	interface AtsCertification {
		name?: string;
		issuer?: string;
		year?: string;
		date?: string;
		issueDate?: string;
		expirationDate?: string | null;
		credentialId?: string;
		credentialUrl?: string;
	}

	interface AtsProject {
		name?: string;
		description?: string;
		role?: string;
		technologies?: string[];
		projectUrl?: string;
		startDate?: string;
		endDate?: string;
	}

	interface AtsCv {
		basics?: AtsBasics;
		experiences?: AtsExperience[];
		education?: AtsEducation[];
		skills?: AtsSkills;
		certifications?: AtsCertification[];
		projects?: AtsProject[];
		languages?: string[];
		score?: CvScore;
	}

	const result = $derived($onboarding.atsResult);
	const ats = $derived<AtsCv | null>(
		result && typeof result.atsCv === 'object' && result.atsCv !== null
			? (result.atsCv as AtsCv)
			: null
	);

	const score = $derived<CvScore | null>(
		ats?.score && typeof ats.score.overallScore === 'number' ? ats.score : null
	);
	const basics = $derived<AtsBasics>(ats?.basics ?? {});
	const experiences = $derived<AtsExperience[]>(ats?.experiences ?? []);
	const educations = $derived<AtsEducation[]>(ats?.education ?? []);
	const certifications = $derived<AtsCertification[]>(ats?.certifications ?? []);
	const skills = $derived<AtsSkills>(ats?.skills ?? {});
	const projects = $derived<AtsProject[]>(ats?.projects ?? []);
	const languages = $derived<string[]>(ats?.languages ?? []);
	const hasSkills = $derived(
		Boolean(skills.technical?.length || skills.tools?.length || skills.softSkills?.length)
	);

	const contactItems = $derived(
		[basics.email, basics.phone, basics.location].filter(
			(value): value is string => typeof value === 'string' && value.trim().length > 0
		)
	);

	let hasDownloaded = $state(false);
	let allowNavigation = $state(false);
	let pendingNavigation = $state<string | null>(null);
	let leaveConfirmOpen = $state(false);

	beforeNavigate((navigation) => {
		if (allowNavigation || hasDownloaded || !result) return;
		// Let the native beforeunload dialog handle tab close/refresh.
		if (navigation.willUnload) return;
		navigation.cancel();
		pendingNavigation = navigation.to?.url.href ?? null;
		leaveConfirmOpen = true;
	});

	onMount(() => {
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (allowNavigation || hasDownloaded || !result) return;
			event.preventDefault();
			event.returnValue = '';
		};
		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	});

	const monthFormatter = new Intl.DateTimeFormat('id-ID', {
		month: 'short',
		year: 'numeric'
	});

	function fmtDate(value?: string | null): string {
		if (!value) return '';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return value;
		return monthFormatter.format(date);
	}

	function dateRange(start?: string | null, end?: string | null): string {
		const from = fmtDate(start);
		const to = end ? fmtDate(end) : 'Sekarang';
		if (from && to) return `${from} – ${to}`;
		return from || (end ? to : '');
	}

	function displayLink(value?: string | null): string {
		if (!value) return '';
		return value.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
	}

	function certificationDate(certification: AtsCertification): string {
		const issue =
			fmtDate(certification.issueDate) ||
			certification.year ||
			fmtDate(certification.date) ||
			'';
		const expiration = certification.expirationDate
			? fmtDate(certification.expirationDate)
			: '';
		if (issue && expiration) return `${issue} – ${expiration}`;
		return issue || expiration;
	}

	function finish() {
		void goto('/dashboard', { invalidateAll: true });
	}

	function downloadPdf() {
		hasDownloaded = true;
		window.print();
	}

	function downloadFirst() {
		leaveConfirmOpen = false;
		downloadPdf();
	}

	function cancelLeave() {
		leaveConfirmOpen = false;
		pendingNavigation = null;
	}

	function leaveWithoutDownload() {
		allowNavigation = true;
		leaveConfirmOpen = false;
		const target = pendingNavigation;
		pendingNavigation = null;
		if (target) void goto(target);
	}
</script>

<section class="space-y-6">
	<div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
		<div class="flex items-start gap-3">
			<span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
				<CheckCircle2 size={20} />
			</span>
			<div>
				<h2 class="text-lg font-semibold text-slate-950">Onboarding selesai</h2>
				<p class="mt-1 text-sm leading-6 text-slate-600">
					CV ATS berhasil dibuat. Tinjau hasilnya dan unduh sebagai PDF untuk dilampirkan ke
					lamaran.
				</p>
			</div>
		</div>
	</div>

	{#if score}
		<CvScoreCard {score} />
	{/if}

	<!-- Dokumen CV ATS (yang akan dicetak / diunduh sebagai PDF) -->
	<article
		id="ats-cv-document"
		class="mx-auto max-w-3xl border border-slate-200 bg-white px-8 py-9 text-slate-900 shadow-lg sm:px-12 sm:py-12"
	>
		<header class="border-b border-slate-300 pb-5">
			<h1 class="text-[28px] font-bold leading-tight tracking-tight text-slate-950">
				{basics.fullName ?? 'Nama belum tersedia'}
			</h1>
			{#if basics.targetRole}
				<p class="mt-1 text-[15px] font-medium text-slate-600">{basics.targetRole}</p>
			{/if}

			<div class="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-slate-600">
				{#each contactItems as item}
					<span>{item}</span>
				{/each}
			</div>

			{#if basics.linkedin || basics.portfolio || basics.github}
				<div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
					{#if basics.linkedin}
						<a
							href={basics.linkedin}
							target="_blank"
							rel="noreferrer"
							class="underline decoration-slate-300 underline-offset-2"
						>
							{displayLink(basics.linkedin)}
						</a>
					{/if}
					{#if basics.portfolio}
						<a
							href={basics.portfolio}
							target="_blank"
							rel="noreferrer"
							class="underline decoration-slate-300 underline-offset-2"
						>
							{displayLink(basics.portfolio)}
						</a>
					{/if}
					{#if basics.github}
						<a
							href={basics.github}
							target="_blank"
							rel="noreferrer"
							class="underline decoration-slate-300 underline-offset-2"
						>
							{displayLink(basics.github)}
						</a>
					{/if}
				</div>
			{/if}
		</header>

		{#if basics.summary}
			<section class="mt-6">
				<h2 class="border-b border-slate-300 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-700">
					Ringkasan Profesional
				</h2>
				<p class="mt-2 text-[12px] leading-5 text-slate-700">{basics.summary}</p>
			</section>
		{/if}

		{#if hasSkills}
			<section class="mt-6">
				<h2 class="border-b border-slate-300 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-700">
					Keahlian
				</h2>
				<div class="mt-2.5 space-y-1 text-[12px] leading-5 text-slate-700">
					{#if skills.technical?.length}
						<p><span class="font-semibold text-slate-900">Technical:</span> {skills.technical.join(', ')}</p>
					{/if}
					{#if skills.tools?.length}
						<p><span class="font-semibold text-slate-900">Tools:</span> {skills.tools.join(', ')}</p>
					{/if}
					{#if skills.softSkills?.length}
						<p><span class="font-semibold text-slate-900">Soft Skills:</span> {skills.softSkills.join(', ')}</p>
					{/if}
				</div>
			</section>
		{/if}

		{#if experiences.length > 0}
			<section class="mt-6">
				<h2 class="border-b border-slate-300 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-700">
					Pengalaman Kerja
				</h2>
				<div class="mt-2.5 space-y-4">
					{#each experiences as experience}
						<div>
							<div class="flex flex-wrap items-baseline justify-between gap-x-4">
								<h3 class="text-[13px] font-bold text-slate-900">{experience.position}</h3>
								<span class="text-[11px] text-slate-500">
									{dateRange(experience.startDate, experience.endDate)}
								</span>
							</div>
							<p class="text-[12px] text-slate-600">
								{experience.company}
								{#if experience.location}
									<span class="text-slate-400"> · </span>{experience.location}
								{/if}
							</p>
							{#if experience.highlights?.length}
								<ul class="mt-1.5 list-disc space-y-1 pl-4 text-[12px] leading-5 text-slate-700">
									{#each experience.highlights as highlight}
										<li>{highlight}</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		{/if}

		{#if projects.length > 0}
			<section class="mt-6">
				<h2 class="border-b border-slate-300 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-700">
					Proyek
				</h2>
				<div class="mt-2.5 space-y-3">
					{#each projects as project}
						<div>
							<div class="flex flex-wrap items-baseline justify-between gap-x-4">
								<h3 class="text-[13px] font-bold text-slate-900">{project.name}</h3>
								<span class="text-[11px] text-slate-500">
									{dateRange(project.startDate, project.endDate)}
								</span>
							</div>
							{#if project.role}
								<p class="text-[12px] text-slate-600">{project.role}</p>
							{/if}
							{#if project.description}
								<p class="mt-1 text-[12px] leading-5 text-slate-700">{project.description}</p>
							{/if}
							{#if project.technologies?.length}
								<p class="mt-1 text-[11px] text-slate-600">
									<span class="font-semibold text-slate-800">Teknologi:</span>
									{project.technologies.join(', ')}
								</p>
							{/if}
							{#if project.projectUrl}
								<a
									href={project.projectUrl}
									target="_blank"
									rel="noreferrer"
									class="mt-1 inline-block text-[11px] text-slate-500 underline decoration-slate-300 underline-offset-2"
								>
									{displayLink(project.projectUrl)}
								</a>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		{/if}

		{#if educations.length > 0}
			<section class="mt-6">
				<h2 class="border-b border-slate-300 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-700">
					Pendidikan
				</h2>
				<div class="mt-2.5 space-y-3">
					{#each educations as education}
						<div>
							<div class="flex flex-wrap items-baseline justify-between gap-x-4">
								<h3 class="text-[13px] font-bold text-slate-900">{education.institution}</h3>
								<span class="text-[11px] text-slate-500">
									{dateRange(education.startDate, education.endDate)}
								</span>
							</div>
							<p class="text-[12px] text-slate-600">
								{[education.degree, education.fieldOfStudy].filter(Boolean).join(' · ')}
								{#if education.location}
									<span class="text-slate-400"> · </span>{education.location}
								{/if}
							</p>
							{#if education.gpa}
								<p class="text-[11px] text-slate-500">GPA: {education.gpa}</p>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		{/if}

		{#if certifications.length > 0}
			<section class="mt-6">
				<h2 class="border-b border-slate-300 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-700">
					Sertifikasi
				</h2>
				<ul class="mt-2.5 list-disc space-y-1.5 pl-4 text-[12px] leading-5 text-slate-700">
					{#each certifications as certification}
						<li>
							<span class="font-semibold text-slate-900">{certification.name ?? 'Sertifikasi'}</span>
							{#if certification.issuer}
								<span class="text-slate-500"> — {certification.issuer}</span>
							{/if}
							{#if certificationDate(certification)}
								<span class="text-slate-500"> · {certificationDate(certification)}</span>
							{/if}
							{#if certification.credentialId}
								<span class="text-slate-500"> · ID: {certification.credentialId}</span>
							{/if}
							{#if certification.credentialUrl}
								<a
									href={certification.credentialUrl}
									target="_blank"
									rel="noreferrer"
									class="ml-1 text-slate-500 underline decoration-slate-300 underline-offset-2"
								>
									{displayLink(certification.credentialUrl)}
								</a>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if languages.length > 0}
			<section class="mt-6">
				<h2 class="border-b border-slate-300 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-700">
					Bahasa
				</h2>
				<p class="mt-2 text-[12px] leading-5 text-slate-700">{languages.join(', ')}</p>
			</section>
		{/if}
	</article>

	<div class="flex flex-wrap items-center justify-between gap-3 pb-3">
		<button
			type="button"
			onclick={backToUpload}
			class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
		>
			Ulangi
		</button>
		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				onclick={finish}
				class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
			>
				Ke dashboard <ArrowRight size={16} />
			</button>
			<button
				type="button"
				onclick={downloadPdf}
				class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
			>
				<Download size={16} />
				Download PDF
			</button>
		</div>
	</div>
</section>

{#if leaveConfirmOpen}
	<div
		class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
		role="alertdialog"
		aria-modal="true"
		aria-labelledby="ats-leave-title"
		aria-describedby="ats-leave-description"
	>
		<div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
			<div class="flex items-start gap-3">
				<span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
					<AlertTriangle size={22} />
				</span>
				<div>
					<h3 id="ats-leave-title" class="text-lg font-bold tracking-tight text-slate-950">
						CV ATS belum diunduh
					</h3>
					<p id="ats-leave-description" class="mt-1 text-sm leading-6 text-slate-600">
						Kamu sudah memiliki pratinjau CV ATS hasil AI, tetapi belum mengunduhnya sebagai
						PDF. Unduh terlebih dahulu agar hasilnya tidak hilang sebelum berpindah halaman.
					</p>
				</div>
			</div>
			<div class="mt-5 flex flex-wrap justify-end gap-2">
				<button
					type="button"
					onclick={cancelLeave}
					class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
				>
					Tetap di halaman
				</button>
				<button
					type="button"
					onclick={leaveWithoutDownload}
					class="inline-flex h-10 items-center justify-center rounded-lg px-4 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
				>
					Keluar tanpa unduh
				</button>
				<button
					type="button"
					onclick={downloadFirst}
					class="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white transition hover:bg-indigo-700"
				>
					<Download size={14} /> Unduh PDF dulu
				</button>
			</div>
		</div>
	</div>
{/if}
