<script lang="ts">
	import { ArrowUpRight, BriefcaseBusiness, GraduationCap, Plus, Sparkles, Trash2 } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import CvDropzone from '#lib/components/onboarding/CvDropzone.svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import { ApiError, apiRequest } from '#lib/utils/api.js';
	import { auth } from '#lib/stores/auth.js';

	interface WorkExperience {
		position: string;
		company: string;
		startDate: string;
		endDate: string;
		description: string;
	}

	interface Education {
		institution: string;
		degree: string;
		startDate: string;
		endDate: string;
		description: string;
	}

	interface Project {
		name: string;
		link: string;
		description: string;
	}

	function isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === 'object' && value !== null && !Array.isArray(value);
	}

	function textValue(value: unknown): string {
		return typeof value === 'string' ? value : '';
	}

	function listOfRecords(value: unknown): Record<string, unknown>[] {
		return Array.isArray(value) ? value.filter(isRecord) : [];
	}

	function profileOf(value: unknown): Record<string, unknown> {
		if (!isRecord(value)) return {};
		if (isRecord(value.profile)) return value.profile;
		if (isRecord(value.data)) return profileOf(value.data);
		return value;
	}

	function normalizeWork(value: unknown): WorkExperience[] {
		return listOfRecords(value).map((item) => ({
			position: textValue(item.position ?? item.title ?? item.role),
			company: textValue(item.company ?? item.organization ?? item.employer),
			startDate: textValue(item.startDate ?? item.start_date),
			endDate: textValue(item.endDate ?? item.end_date),
			description: textValue(item.description ?? item.summary)
		}));
	}

	function normalizeEducation(value: unknown): Education[] {
		return listOfRecords(value).map((item) => ({
			institution: textValue(item.institution ?? item.school ?? item.university),
			degree: textValue(item.degree ?? item.field ?? item.program),
			startDate: textValue(item.startDate ?? item.start_date),
			endDate: textValue(item.endDate ?? item.end_date),
			description: textValue(item.description)
		}));
	}

	function normalizeProjects(value: unknown): Project[] {
		return listOfRecords(value).map((item) => ({
			name: textValue(item.name ?? item.title),
			link: textValue(item.link ?? item.url),
			description: textValue(item.description)
		}));
	}

	function readString(record: Record<string, unknown>, ...keys: string[]): string {
		for (const key of keys) {
			const value = record[key];
			if (typeof value === 'string') return value;
		}
		return '';
	}

	function readFiniteNumber(record: Record<string, unknown>, ...keys: string[]): number | undefined {
		for (const key of keys) {
			const value = record[key];
			if (typeof value === 'number' && Number.isFinite(value)) return value;
		}
		return undefined;
	}

	let fullName = $state('');
	let email = $state('');
	let phone = $state('');
	let city = $state('');
	let targetPosition = $state('');
	let summary = $state('');
	let workExperiences = $state<WorkExperience[]>([]);
	let education = $state<Education[]>([]);
	let projects = $state<Project[]>([]);
	let skills = $state<string[]>([]);
	let skillInput = $state('');
	let aiTone = $state('professional');
	let customInstructions = $state('');
	let cvFile = $state<File | null>(null);
	let isExtracting = $state(false);
	let isSaving = $state(false);
	let pageError = $state<string | null>(null);
	let showUpgradeModal = $state(false);

	const quotaRemaining = $derived($auth.user?.atsConversionRemaining ?? null);
	const quotaTotal = $derived($auth.user?.atsConversionQuota ?? null);
	const quotaKnown = $derived(typeof quotaRemaining === 'number');
	const quotaExhausted = $derived(
		typeof quotaRemaining === 'number' && quotaRemaining <= 0
	);
	const uploadDisabled = $derived(isExtracting || !quotaKnown || quotaExhausted);

	onMount(() => {
		const user = $auth.user;
		if (!user) return;

		fullName = user.fullName;
		email = user.email;
		phone = readString(user, 'phone', 'phoneNumber', 'phone_number');
		city = readString(user, 'city', 'location');
		targetPosition = readString(user, 'targetPosition', 'target_position');
		summary = readString(user, 'summary', 'professionalSummary', 'professional_summary');
		workExperiences = normalizeWork(user.workExperiences ?? user.work_experiences ?? user.experience);
		education = normalizeEducation(user.education);
		projects = normalizeProjects(user.projects);
		const rawSkills = user.skills;
		skills = Array.isArray(rawSkills)
			? rawSkills.filter((skill): skill is string => typeof skill === 'string')
			: [];
		aiTone = readString(user, 'aiTone', 'ai_tone') || 'professional';
		customInstructions = readString(user, 'customInstructions', 'custom_instructions');
	});

	function setQuotaFromResponse(value: unknown) {
		if (!isRecord(value)) return;
		if (isRecord(value.data) && !isRecord(value.quota) && !isRecord(value.ats)) {
			setQuotaFromResponse(value.data);
			return;
		}
		const quota = isRecord(value.quota) ? value.quota : isRecord(value.ats) ? value.ats : value;
		const remaining = readFiniteNumber(
			quota,
			'atsConversionRemaining',
			'ats_conversion_remaining',
			'atsRemainingQuota',
			'ats_remaining_quota',
			'remaining',
			'remainingQuota',
			'remaining_quota'
		);
		const total = readFiniteNumber(
			quota,
			'atsConversionQuota',
			'ats_conversion_quota',
			'atsQuota',
			'ats_quota',
			'total',
			'quota',
			'limit'
		);
		if (remaining === undefined && total === undefined) return;
		auth.update((state) => ({
			...state,
			user: state.user
				? {
						...state.user,
						...(remaining === undefined ? {} : { atsConversionRemaining: remaining }),
						...(total === undefined ? {} : { atsConversionQuota: total })
					}
				: null
		}));
	}

	function applyExtractedProfile(payload: unknown) {
		const profile = profileOf(payload);
		if (!Object.keys(profile).length) {
			throw new Error('Hasil ekstraksi CV belum memiliki data profil yang dapat digunakan.');
		}

		fullName = readString(profile, 'fullName', 'full_name', 'name') || fullName;
		email = readString(profile, 'email') || email;
		phone = readString(profile, 'phone', 'phoneNumber', 'phone_number') || phone;
		city = readString(profile, 'city', 'location') || city;
		targetPosition =
			readString(profile, 'targetPosition', 'target_position', 'headline') || targetPosition;
		summary = readString(profile, 'summary', 'professionalSummary', 'professional_summary') || summary;

		const extractedWork = profile.workExperiences ?? profile.work_experiences ?? profile.experience;
		const extractedEducation = profile.education ?? profile.educations;
		const extractedProjects = profile.projects;
		if (Array.isArray(extractedWork)) workExperiences = normalizeWork(extractedWork);
		if (Array.isArray(extractedEducation)) education = normalizeEducation(extractedEducation);
		if (Array.isArray(extractedProjects)) projects = normalizeProjects(extractedProjects);
		if (Array.isArray(profile.skills)) {
			skills = profile.skills.filter((skill): skill is string => typeof skill === 'string');
		}
		setQuotaFromResponse(payload);
	}

	async function extractCv(file: File) {
		isExtracting = true;
		pageError = null;
		try {
			const body = new FormData();
			body.append('cv', file, file.name);
			const response = await apiRequest('onboarding/extract-cv', { method: 'POST', body });
			const payload: unknown = await response.json();
			applyExtractedProfile(payload);
		} catch (error) {
			pageError =
				error instanceof ApiError
					? error.message
					: error instanceof Error
						? error.message
						: 'CV belum dapat dinormalisasi. Silakan coba lagi.';
		} finally {
			isExtracting = false;
		}
	}

	function addSkill(event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== ',') return;
		event.preventDefault();
		const skill = skillInput.trim().replace(/,$/, '');
		if (skill && !skills.some((item) => item.toLowerCase() === skill.toLowerCase())) {
			skills = [...skills, skill];
		}
		skillInput = '';
	}

	function addWorkExperience() {
		workExperiences = [
			...workExperiences,
			{ position: '', company: '', startDate: '', endDate: '', description: '' }
		];
	}

	function addEducation() {
		education = [
			...education,
			{ institution: '', degree: '', startDate: '', endDate: '', description: '' }
		];
	}

	function addProject() {
		projects = [...projects, { name: '', link: '', description: '' }];
	}

	async function saveProfile(event: SubmitEvent) {
		event.preventDefault();
		if (isSaving || isExtracting) return;

		isSaving = true;
		pageError = null;
		try {
			await apiRequest('onboarding/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					profile: {
						fullName: fullName.trim(),
						email: email.trim(),
						phone: phone.trim(),
						city: city.trim(),
						targetPosition: targetPosition.trim(),
						summary: summary.trim(),
						workExperiences,
						education,
						projects,
						skills
					},
					aiPreferences: {
						tone: aiTone,
						customInstructions: customInstructions.trim()
					}
				})
			});

			auth.update((state) => ({
				...state,
				user: state.user ? { ...state.user, isOnboardingCompleted: true } : null
			}));
			await goto('/dashboard', { invalidateAll: true });
		} catch (error) {
			pageError =
				error instanceof ApiError
					? error.message
					: 'Profil belum dapat disimpan. Silakan periksa koneksi dan coba lagi.';
		} finally {
			isSaving = false;
		}
	}
</script>

<svelte:head>
	<title>Profil &amp; Ekstraksi CV | Quly</title>
	<meta name="description" content="Kelola profil karier dan preferensi AI Quly." />
</svelte:head>

<div class="mx-auto max-w-5xl space-y-7">
	<header>
		<p class="text-sm font-semibold text-indigo-600">Profil karier</p>
		<h1 class="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
			Profil &amp; Ekstraksi CV
		</h1>
		<p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
			Unggah CV untuk mengisi profil secara otomatis. Tinjau dan sesuaikan semua data sebelum
			disimpan.
		</p>
	</header>

	{#if pageError}
		<div
			class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
			role="alert"
		>
			{pageError}
		</div>
	{/if}

	<form class="space-y-6" onsubmit={saveProfile}>
		<section class="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div class="flex items-start gap-3">
					<span class="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
						<Sparkles size={20} />
					</span>
					<div>
						<h2 class="font-semibold text-slate-950">AI ATS CV Converter</h2>
						<p class="mt-1 text-sm text-slate-500">Normalisasi CV PDF menjadi profil terstruktur.</p>
					</div>
				</div>
				<span class="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
					Plan: {$auth.user?.subscriptionTier ?? 'Informasi belum tersedia'}
					<span class="mx-1 text-indigo-300">|</span>
					{#if quotaKnown}
						Sisa Kuota Konversi ATS:
						{quotaRemaining}{quotaTotal === null ? '' : `/${quotaTotal}`}
					{:else}
						Kuota konversi ATS belum tersedia
					{/if}
				</span>
			</div>

			<div class="mt-5">
				<CvDropzone
					bind:file={cvFile}
					disabled={uploadDisabled}
					onfilechange={extractCv}
					error={quotaKnown && quotaExhausted
						? 'Kuota konversi ATS Anda telah habis.'
						: !quotaKnown
							? 'Kuota belum dapat diverifikasi. Muat ulang profil atau hubungi dukungan.'
							: undefined}
				/>
			</div>

			{#if isExtracting}
				<div class="mt-4 flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-800" role="status">
					<Spinner label="AI sedang menormalisasi CV Anda" />
					AI sedang menormalisasi CV Anda...
				</div>
			{/if}

			{#if quotaExhausted}
				<button
					type="button"
					onclick={() => (showUpgradeModal = true)}
					class="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
				>
					Upgrade ke Premium <ArrowUpRight size={16} />
				</button>
			{/if}
		</section>

		<section class="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
			<div>
				<h2 class="text-lg font-semibold text-slate-950">Data diri &amp; ringkasan</h2>
				<p class="mt-1 text-sm text-slate-500">Informasi dasar yang digunakan untuk personalisasi profil.</p>
			</div>
			<div class="grid gap-4 sm:grid-cols-2">
				<label class="space-y-1.5 text-sm font-medium text-slate-700">
					Nama lengkap
					<input bind:value={fullName} autocomplete="name" class="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
				</label>
				<label class="space-y-1.5 text-sm font-medium text-slate-700">
					Email
					<input bind:value={email} type="email" autocomplete="email" class="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
				</label>
				<label class="space-y-1.5 text-sm font-medium text-slate-700">
					Nomor telepon
					<input bind:value={phone} type="tel" autocomplete="tel" class="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
				</label>
				<label class="space-y-1.5 text-sm font-medium text-slate-700">
					Kota
					<input bind:value={city} autocomplete="address-level2" class="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
				</label>
				<label class="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
					Posisi yang dituju
					<input bind:value={targetPosition} class="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
				</label>
				<label class="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
					Professional summary
					<textarea bind:value={summary} rows="4" class="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"></textarea>
				</label>
			</div>
		</section>

		<section class="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="flex items-center gap-2">
					<BriefcaseBusiness size={19} class="text-indigo-600" />
					<h2 class="text-lg font-semibold text-slate-950">Pengalaman kerja</h2>
				</div>
				<button type="button" onclick={addWorkExperience} class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
					<Plus size={15} /> Tambah pengalaman
				</button>
			</div>
			{#if workExperiences.length === 0}
				<p class="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">Belum ada pengalaman kerja. Tambahkan secara manual atau ekstrak dari CV.</p>
			{/if}
			{#each workExperiences as experience, index (index)}
				<article class="space-y-4 rounded-xl border border-slate-200 p-4">
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-semibold text-slate-800">Pengalaman {index + 1}</h3>
						<button type="button" aria-label="Hapus pengalaman {index + 1}" onclick={() => (workExperiences = workExperiences.filter((_, itemIndex) => itemIndex !== index))} class="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
						<input bind:value={experience.position} aria-label="Posisi" placeholder="Posisi" class="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
						<input bind:value={experience.company} aria-label="Perusahaan" placeholder="Perusahaan" class="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
						<input bind:value={experience.startDate} aria-label="Tanggal mulai" placeholder="Tanggal mulai" class="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
						<input bind:value={experience.endDate} aria-label="Tanggal selesai" placeholder="Tanggal selesai / Sekarang" class="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
						<textarea bind:value={experience.description} aria-label="Deskripsi pengalaman" placeholder="Tanggung jawab dan pencapaian" rows="3" class="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none sm:col-span-2"></textarea>
					</div>
				</article>
			{/each}
		</section>

		<section class="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="flex items-center gap-2">
					<GraduationCap size={20} class="text-indigo-600" />
					<h2 class="text-lg font-semibold text-slate-950">Pendidikan</h2>
				</div>
				<button type="button" onclick={addEducation} class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
					<Plus size={15} /> Tambah pendidikan
				</button>
			</div>
			{#each education as item, index (index)}
				<article class="space-y-3 rounded-xl border border-slate-200 p-4">
					<div class="flex justify-end">
						<button type="button" aria-label="Hapus pendidikan {index + 1}" onclick={() => (education = education.filter((_, itemIndex) => itemIndex !== index))} class="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
						<input bind:value={item.institution} aria-label="Institusi pendidikan" placeholder="Universitas / sekolah" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
						<input bind:value={item.degree} aria-label="Gelar atau jurusan" placeholder="Gelar / jurusan" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
						<input bind:value={item.startDate} aria-label="Mulai pendidikan" placeholder="Tahun mulai" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
						<input bind:value={item.endDate} aria-label="Selesai pendidikan" placeholder="Tahun selesai" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
						<textarea bind:value={item.description} aria-label="Deskripsi pendidikan" placeholder="Deskripsi (opsional)" rows="2" class="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"></textarea>
					</div>
				</article>
			{/each}
			{#if education.length === 0}<p class="text-sm text-slate-500">Belum ada data pendidikan.</p>{/if}
		</section>

		<section class="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 class="text-lg font-semibold text-slate-950">Proyek</h2>
				<button type="button" onclick={addProject} class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
					<Plus size={15} /> Tambah proyek
				</button>
			</div>
			{#each projects as project, index (index)}
				<article class="space-y-3 rounded-xl border border-slate-200 p-4">
					<div class="flex justify-end">
						<button type="button" aria-label="Hapus proyek {index + 1}" onclick={() => (projects = projects.filter((_, itemIndex) => itemIndex !== index))} class="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>
					</div>
					<input bind:value={project.name} aria-label="Nama proyek" placeholder="Nama proyek" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
					<input bind:value={project.link} aria-label="Tautan proyek" placeholder="Tautan proyek (opsional)" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
					<textarea bind:value={project.description} aria-label="Deskripsi proyek" placeholder="Deskripsi dan kontribusi" rows="3" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"></textarea>
				</article>
			{/each}
			{#if projects.length === 0}<p class="text-sm text-slate-500">Belum ada proyek.</p>{/if}
		</section>

		<section class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
			<div>
				<h2 class="text-lg font-semibold text-slate-950">Skills</h2>
				<p class="mt-1 text-sm text-slate-500">Tekan Enter atau koma untuk menambahkan skill.</p>
			</div>
			<div class="flex flex-wrap gap-2">
				{#each skills as skill, index (skill)}
					<span class="inline-flex items-center gap-1 rounded-full bg-indigo-50 py-1 pl-3 pr-1 text-sm font-medium text-indigo-700">
						{skill}
						<button type="button" aria-label="Hapus skill {skill}" onclick={() => (skills = skills.filter((_, itemIndex) => itemIndex !== index))} class="rounded-full p-1 hover:bg-indigo-100">×</button>
					</span>
				{/each}
			</div>
			<input bind:value={skillInput} onkeydown={addSkill} aria-label="Tambah skill" placeholder="Contoh: TypeScript" class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none sm:max-w-md" />
		</section>

		<section class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
			<div>
				<h2 class="text-lg font-semibold text-slate-950">Pengaturan gaya AI</h2>
				<p class="mt-1 text-sm text-slate-500">Atur gaya bahasa dan instruksi tambahan untuk AI.</p>
			</div>
			<label class="block max-w-md space-y-1.5 text-sm font-medium text-slate-700">
				Tone AI
				<select bind:value={aiTone} class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal">
					<option value="professional">Profesional</option>
					<option value="confident">Percaya diri</option>
					<option value="friendly">Ramah</option>
					<option value="concise">Ringkas</option>
				</select>
			</label>
			<label class="block space-y-1.5 text-sm font-medium text-slate-700">
				Instruksi khusus
				<textarea bind:value={customInstructions} rows="4" placeholder="Contoh: Tekankan pengalaman memimpin tim dan gunakan bahasa yang lugas." class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal"></textarea>
			</label>
		</section>

		<div class="flex justify-end pb-3">
			<button
				type="submit"
				disabled={isSaving || isExtracting}
				class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{#if isSaving}<Spinner label="Menyimpan profil" />{/if}
				Simpan &amp; Buka Kunci Dashboard
			</button>
		</div>
	</form>
</div>

{#if showUpgradeModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
		<dialog open class="m-0 w-full max-w-md rounded-2xl border-0 bg-white p-6 shadow-xl" aria-modal="true" aria-labelledby="upgrade-title">
			<h2 id="upgrade-title" class="text-lg font-semibold text-slate-950">Upgrade ke Premium</h2>
			<p class="mt-2 text-sm leading-6 text-slate-600">Pilihan paket Premium dapat dilihat di halaman billing.</p>
			<div class="mt-5 flex justify-end gap-2">
				<button type="button" onclick={() => (showUpgradeModal = false)} class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Tutup</button>
				<button type="button" onclick={() => goto('/billing#paket')} class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Lihat paket</button>
			</div>
		</dialog>
	</div>
{/if}
