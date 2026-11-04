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
		date?: string;
		[key: string]: unknown;
	}

	interface AtsCv {
		basics?: AtsBasics;
		experiences?: AtsExperience[];
		education?: AtsEducation[];
		skills?: AtsSkills;
		certifications?: AtsCertification[];
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

	const contactItems = $derived(
		[basics.email, basics.phone, basics.location].filter(
			(value): value is string => typeof value === 'string' && value.length > 0
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

	function fmtDate(value?: string | null): string {
		if (!value) return '';
		return value.slice(0, 10);
	}

	function dateRange(start?: string | null, end?: string | null): string {
		return [fmtDate(start), fmtDate(end)].filter(Boolean).join(' – ');
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
		class="mx-auto max-w-3xl border border-slate-200 bg-white p-8 text-slate-900 shadow-lg sm:p-10"
	>
		<header class="border-b-2 border-slate-800 pb-5">
			<h1 class="text-3xl font-bold tracking-tight text-slate-900">
				{basics.fullName ?? 'Nama belum tersedia'}
			</h1>
			{#if basics.targetRole}
				<p class="mt-1 text-lg font-medium text-slate-600">{basics.targetRole}</p>
			{/if}

			<div class="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
				{#each contactItems as item}
					<span>{item}</span>
				{/each}
				{#if basics.linkedin}
					<a href={basics.linkedin} class="text-indigo-700 underline decoration-indigo-200">LinkedIn</a>
				{/if}
			</div>
		</header>

		{#if basics.summary}
			<section class="mt-7">
				<h2 class="text-xs font-bold uppercase tracking-[0.18em] text-slate-800">Ringkasan</h2>
				<p class="mt-2 text-sm leading-6 text-slate-700">{basics.summary}</p>
			</section>
		{/if}

		{#if skills.technical?.length || skills.tools?.length || skills.softSkills?.length}
			<section class="mt-7">
				<h2 class="text-xs font-bold uppercase tracking-[0.18em] text-slate-800">Keahlian</h2>
				<div class="mt-3 space-y-4">
					{#if skills.technical?.length}
						<div>
							<p class="text-xs font-semibold text-slate-500">Technical</p>
							<div class="mt-2 flex flex-wrap gap-2">
								{#each skills.technical as skill}
									<span class="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{skill}</span>
								{/each}
							</div>
						</div>
					{/if}
					{#if skills.tools?.length}
						<div>
							<p class="text-xs font-semibold text-slate-500">Tools</p>
							<div class="mt-2 flex flex-wrap gap-2">
								{#each skills.tools as tool}
									<span class="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{tool}</span>
								{/each}
							</div>
						</div>
					{/if}
					{#if skills.softSkills?.length}
						<div>
							<p class="text-xs font-semibold text-slate-500">Soft Skills</p>
							<div class="mt-2 flex flex-wrap gap-2">
								{#each skills.softSkills as skill}
									<span class="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{skill}</span>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</section>
		{/if}

		{#if experiences.length > 0}
			<section class="mt-7">
				<h2 class="text-xs font-bold uppercase tracking-[0.18em] text-slate-800">Pengalaman</h2>
				<div class="mt-3 space-y-5">
					{#each experiences as experience}
						{@const range = dateRange(experience.startDate, experience.endDate)}
						<article>
							<div class="flex flex-wrap items-baseline justify-between gap-x-4">
								<h3 class="text-sm font-semibold text-slate-900">{experience.position}</h3>
								<span class="text-sm text-slate-600">{experience.company}</span>
							</div>
							<div class="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
								{#if range}<span>{range}</span>{/if}
								{#if experience.location}<span>{experience.location}</span>{/if}
							</div>
							{#if experience.highlights?.length}
								<ul class="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
									{#each experience.highlights as highlight}
										<li>{highlight}</li>
									{/each}
								</ul>
							{/if}
						</article>
					{/each}
				</div>
			</section>
		{/if}

		{#if educations.length > 0}
			<section class="mt-7">
				<h2 class="text-xs font-bold uppercase tracking-[0.18em] text-slate-800">Pendidikan</h2>
				<div class="mt-3 space-y-4">
					{#each educations as education}
						{@const range = dateRange(education.startDate, education.endDate)}
						<article>
							<div class="flex flex-wrap items-baseline justify-between gap-x-4">
								<h3 class="text-sm font-semibold text-slate-900">{education.institution}</h3>
								<span class="text-sm text-slate-600">
									{[education.degree, education.fieldOfStudy].filter(Boolean).join(', ')}
								</span>
							</div>
							<div class="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
								{#if range}<span>{range}</span>{/if}
								{#if education.gpa}<span>GPA: {education.gpa}</span>{/if}
							</div>
						</article>
					{/each}
				</div>
			</section>
		{/if}

		{#if certifications.length > 0}
			<section class="mt-7">
				<h2 class="text-xs font-bold uppercase tracking-[0.18em] text-slate-800">Sertifikasi</h2>
				<ul class="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
					{#each certifications as certification}
						<li>
							<span class="font-semibold">{certification.name ?? 'Sertifikasi'}</span>
							{#if certification.issuer}
								<span class="text-slate-500"> — {certification.issuer}</span>
							{/if}
						</li>
					{/each}
				</ul>
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
