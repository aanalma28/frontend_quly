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
		location: string;
		startDate: string;
		endDate: string;
		isCurrent: boolean;
		description: string;
	}

	interface Education {
		institution: string;
		degree: string;
		fieldOfStudy: string;
		location: string;
		startDate: string;
		endDate: string;
		description: string;
	}

	interface Certification {
		name: string;
		issuingOrganization: string;
		issueDate: string;
		expirationDate: string;
		credentialId: string;
		credentialUrl: string;
	}

	interface Project {
		name: string;
		description: string;
		role: string;
		technologies: string[];
		projectUrl: string;
		startDate: string;
		endDate: string;
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
		if (isRecord(value.data)) return profileOf(value.data);
		if ('profile' in value) return isRecord(value.profile) ? value.profile : {};
		return value;
	}

	function dateValue(value: unknown): string {
		if (typeof value !== 'string' || value.length === 0) return '';
		return value.slice(0, 10);
	}

	function stringList(value: unknown): string[] {
		return Array.isArray(value)
			? value.filter((item): item is string => typeof item === 'string')
			: [];
	}

	function normalizeWork(value: unknown): WorkExperience[] {
		return listOfRecords(value).map((item) => ({
			position: textValue(item.position ?? item.title ?? item.role),
			company: textValue(item.company ?? item.organization ?? item.employer),
			location: textValue(item.location),
			startDate: dateValue(item.startDate ?? item.start_date),
			endDate: dateValue(item.endDate ?? item.end_date),
			isCurrent: item.isCurrent === true || item.is_current === true,
			description: textValue(item.description ?? item.summary)
		}));
	}

	function normalizeEducation(value: unknown): Education[] {
		return listOfRecords(value).map((item) => ({
			institution: textValue(item.institution ?? item.school ?? item.university),
			degree: textValue(item.degree),
			fieldOfStudy: textValue(item.fieldOfStudy ?? item.field_of_study ?? item.field ?? item.program),
			location: textValue(item.location),
			startDate: dateValue(item.startDate ?? item.start_date),
			endDate: dateValue(item.endDate ?? item.end_date),
			description: textValue(item.description)
		}));
	}

	function normalizeCertifications(value: unknown): Certification[] {
		return listOfRecords(value).map((item) => ({
			name: textValue(item.name),
			issuingOrganization: textValue(item.issuingOrganization ?? item.issuing_organization),
			issueDate: dateValue(item.issueDate ?? item.issue_date),
			expirationDate: dateValue(item.expirationDate ?? item.expiration_date),
			credentialId: textValue(item.credentialId ?? item.credential_id),
			credentialUrl: textValue(item.credentialUrl ?? item.credential_url)
		}));
	}

	function normalizeProjects(value: unknown): Project[] {
		return listOfRecords(value).map((item) => ({
			name: textValue(item.name ?? item.title),
			description: textValue(item.description),
			role: textValue(item.role),
			technologies: stringList(item.technologies),
			projectUrl: textValue(item.projectUrl ?? item.project_url ?? item.link ?? item.url),
			startDate: dateValue(item.startDate ?? item.start_date),
			endDate: dateValue(item.endDate ?? item.end_date)
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
	let phone = $state('');
	let address = $state('');
	let linkedinUrl = $state('');
	let portfolioUrl = $state('');
	let githubUrl = $state('');
	let summary = $state('');
	let yearsOfExperience = $state('');
	let workExperiences = $state<WorkExperience[]>([]);
	let education = $state<Education[]>([]);
	let certifications = $state<Certification[]>([]);
	let projects = $state<Project[]>([]);
	let skills = $state<string[]>([]);
	let skillInput = $state('');
	let languages = $state<string[]>([]);
	let languageInput = $state('');
	let aiTone = $state('professional');
	let customInstructions = $state('');
	let rawCvText = $state('');
	let cvFileUrl = $state('');
	let hasSavedProfile = $state(false);
	let isLoadingProfile = $state(true);
	let profileLoaded = $state(false);
	let cvFile = $state<File | null>(null);
	let isExtracting = $state(false);
	let isSaving = $state(false);
	let pageError = $state<string | null>(null);
	let manualEntryAvailable = $state(false);
	let showUpgradeModal = $state(false);

	let quotaRemaining = $state<number | null>(null);
	let quotaTotal = $state<number | null>(null);
	const quotaKnown = $derived(typeof quotaRemaining === 'number');
	const quotaExhausted = $derived(
		typeof quotaRemaining === 'number' && quotaRemaining !== -1 && quotaRemaining <= 0
	);
	const uploadDisabled = $derived(isExtracting || isLoadingProfile || !quotaKnown || quotaExhausted);

	function setQuota(value: unknown) {
		if (!isRecord(value)) throw new Error('Informasi kuota konversi CV tidak valid.');
		const limit = readFiniteNumber(value, 'limit');
		const remaining = readFiniteNumber(value, 'remaining');
		if (limit === undefined || remaining === undefined) {
			throw new Error('Informasi kuota konversi CV belum lengkap.');
		}
		quotaTotal = limit;
		quotaRemaining = remaining;
		auth.update((state) => ({
			...state,
			user: state.user
				? { ...state.user, atsConversionQuota: limit, atsConversionRemaining: remaining }
				: null
		}));
	}

	function applyProfile(profile: Record<string, unknown>) {
		const user = $auth.user;
		fullName = readString(profile, 'fullName') || user?.fullName || '';
		phone = readString(profile, 'phone');
		address = readString(profile, 'address');
		linkedinUrl = readString(profile, 'linkedinUrl');
		portfolioUrl = readString(profile, 'portfolioUrl');
		githubUrl = readString(profile, 'githubUrl');
		summary = readString(profile, 'professionalSummary');
		yearsOfExperience = readFiniteNumber(profile, 'yearsOfExperience')?.toString() ?? '';
		workExperiences = normalizeWork(profile.experiences);
		education = normalizeEducation(profile.educations);
		certifications = normalizeCertifications(profile.certifications);
		projects = normalizeProjects(profile.projects);
		skills = stringList(profile.skills);
		languages = stringList(profile.languages);
		aiTone = readString(profile, 'aiTonePreference') || 'professional';
		customInstructions = readString(profile, 'aiCustomInstructions');
		rawCvText = readString(profile, 'rawCvText');
		cvFileUrl = readString(profile, 'cvFileUrl');
	}

	async function loadOnboardingProfile(applySavedProfile = true) {
		const response = await apiRequest('onboarding/me');
		const payload: unknown = await response.json();
		const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
		if (!isRecord(data) || !isRecord(data.conversionQuota)) {
			throw new Error('Respons profil onboarding dari server tidak valid.');
		}
		setQuota(data.conversionQuota);

		const profile = isRecord(data.profile) ? data.profile : null;
		if (applySavedProfile) {
			hasSavedProfile = profile !== null;
			profileLoaded = true;
			if (profile) applyProfile(profile);
			else {
				const user = isRecord(data.user) ? data.user : null;
				fullName = user ? readString(user, 'fullName') : '';
			}
			auth.update((state) => ({
				...state,
				user: state.user
					? { ...state.user, isOnboardingCompleted: profile !== null }
					: null
			}));
		}
	}

	onMount(async () => {
		try {
			await loadOnboardingProfile();
		} catch (error) {
			pageError =
				error instanceof Error
					? error.message
					: 'Profil dan kuota belum dapat dimuat. Silakan coba lagi.';
		} finally {
			isLoadingProfile = false;
		}
	});

	function applyExtractedProfile(payload: unknown) {
		const profile = profileOf(payload);
		if (!Object.keys(profile).length) {
			throw new Error('Hasil ekstraksi CV belum memiliki data profil yang dapat digunakan.');
		}

		fullName = readString(profile, 'fullName', 'full_name', 'name') || fullName;
		phone = readString(profile, 'phone', 'phoneNumber', 'phone_number') || phone;
		address = readString(profile, 'address') || address;
		linkedinUrl = readString(profile, 'linkedinUrl') || linkedinUrl;
		portfolioUrl = readString(profile, 'portfolioUrl') || portfolioUrl;
		githubUrl = readString(profile, 'githubUrl') || githubUrl;
		summary = readString(profile, 'professionalSummary') || summary;
		const extractedYears = readFiniteNumber(profile, 'yearsOfExperience');
		if (extractedYears !== undefined) yearsOfExperience = extractedYears.toString();
		if (Array.isArray(profile.experiences)) workExperiences = normalizeWork(profile.experiences);
		if (Array.isArray(profile.educations)) education = normalizeEducation(profile.educations);
		if (Array.isArray(profile.certifications)) {
			certifications = normalizeCertifications(profile.certifications);
		}
		if (Array.isArray(profile.projects)) projects = normalizeProjects(profile.projects);
		if (Array.isArray(profile.skills)) skills = stringList(profile.skills);
		if (Array.isArray(profile.languages)) languages = stringList(profile.languages);
		if (typeof profile.rawCvText === 'string') rawCvText = profile.rawCvText;
	}

	async function extractCv(file: File) {
		isExtracting = true;
		pageError = null;
		manualEntryAvailable = false;
		try {
			const body = new FormData();
			body.append('file', file, file.name);
			const response = await apiRequest('onboarding/parse-cv', { method: 'POST', body });
			const payload: unknown = await response.json();
			applyExtractedProfile(payload);
			try {
				await loadOnboardingProfile(false);
			} catch (error) {
				pageError =
					error instanceof Error
						? `CV berhasil diproses, tetapi kuota belum dapat diperbarui: ${error.message}`
						: 'CV berhasil diproses, tetapi kuota belum dapat diperbarui.';
			}
		} catch (error) {
			manualEntryAvailable = true;
			if (error instanceof ApiError && error.status === 503) {
				pageError = 'Layanan AI sedang tidak tersedia. Silakan isi profil secara manual di bawah ini.';
			} else if (error instanceof ApiError && (error.status === 403 || error.status === 429)) {
				if (/kuota|quota/i.test(error.message)) quotaRemaining = 0;
				pageError = `${error.message} Anda tetap dapat mengisi profil secara manual di bawah ini.`;
			} else if (error instanceof ApiError && /kuota|quota/i.test(error.message)) {
				quotaRemaining = 0;
				pageError = `${error.message} Anda tetap dapat mengisi profil secara manual di bawah ini.`;
			} else if (error instanceof ApiError && error.status === 413) {
				pageError = 'Ukuran CV melebihi batas 5 MB. Silakan pilih file yang lebih kecil atau isi manual.';
			} else {
				pageError = `${error instanceof Error ? error.message : 'CV belum dapat diproses.'} Anda tetap dapat mengisi profil secara manual di bawah ini.`;
			}
		} finally {
			isExtracting = false;
		}
	}

	function addSkill(event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== ',') return;
		event.preventDefault();
		const skill = skillInput.trim().replace(/,$/, '');
		if (skill.length > 120) {
			pageError = 'Panjang setiap skill maksimal 120 karakter.';
			return;
		}
		if (skills.length >= 200 && skill) {
			pageError = 'Jumlah skill maksimal 200.';
			return;
		}
		if (skill && !skills.some((item) => item.toLowerCase() === skill.toLowerCase())) {
			skills = [...skills, skill];
		}
		skillInput = '';
	}

	function addWorkExperience() {
		if (workExperiences.length >= 100) {
			pageError = 'Jumlah pengalaman kerja maksimal 100.';
			return;
		}
		workExperiences = [
			...workExperiences,
			{
				position: '',
				company: '',
				location: '',
				startDate: '',
				endDate: '',
				isCurrent: false,
				description: ''
			}
		];
	}

	function addEducation() {
		if (education.length >= 100) {
			pageError = 'Jumlah data pendidikan maksimal 100.';
			return;
		}
		education = [
			...education,
			{
				institution: '',
				degree: '',
				fieldOfStudy: '',
				location: '',
				startDate: '',
				endDate: '',
				description: ''
			}
		];
	}

	function addCertification() {
		if (certifications.length >= 100) {
			pageError = 'Jumlah sertifikasi maksimal 100.';
			return;
		}
		certifications = [
			...certifications,
			{
				name: '',
				issuingOrganization: '',
				issueDate: '',
				expirationDate: '',
				credentialId: '',
				credentialUrl: ''
			}
		];
	}

	function addProject() {
		if (projects.length >= 100) {
			pageError = 'Jumlah proyek maksimal 100.';
			return;
		}
		projects = [
			...projects,
			{
				name: '',
				description: '',
				role: '',
				technologies: [],
				projectUrl: '',
				startDate: '',
				endDate: ''
			}
		];
	}

	function addLanguage(event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== ',') return;
		event.preventDefault();
		const language = languageInput.trim().replace(/,$/, '');
		if (language.length > 120) {
			pageError = 'Panjang setiap bahasa maksimal 120 karakter.';
			return;
		}
		if (languages.length >= 100 && language) {
			pageError = 'Jumlah bahasa maksimal 100.';
			return;
		}
		if (language && !languages.some((item) => item.toLowerCase() === language.toLowerCase())) {
			languages = [...languages, language];
		}
		languageInput = '';
	}

	async function saveProfile(event: SubmitEvent) {
		event.preventDefault();
		if (isSaving || isExtracting) return;

		isSaving = true;
		pageError = null;
		try {
			const assertLength = (value: string, field: string, maximum: number) => {
				if (value.length > maximum) {
					throw new Error(`${field} maksimal ${maximum.toLocaleString('id-ID')} karakter.`);
				}
			};
			const urlValue = (value: string, field: string) => {
				const url = value.trim();
				if (!url) return undefined;
				assertLength(url, field, 2048);
				try {
					const parsed = new URL(url);
					if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error();
				} catch {
					throw new Error(`${field} harus berupa URL lengkap yang diawali https:// atau http://.`);
				}
				return url;
			};

			assertLength(fullName.trim(), 'Nama lengkap', 120);
			assertLength(phone.trim(), 'Nomor telepon', 40);
			assertLength(address.trim(), 'Alamat', 1000);
			assertLength(summary.trim(), 'Professional summary', 10000);
			assertLength(rawCvText, 'Teks CV', 100000);
			assertLength(aiTone.trim(), 'Preferensi tone AI', 120);
			assertLength(customInstructions.trim(), 'Instruksi khusus AI', 5000);
			if (skills.length > 200 || languages.length > 100) {
				throw new Error('Jumlah skills maksimal 200 dan jumlah bahasa maksimal 100.');
			}
			if (
				[...skills, ...languages, ...projects.flatMap((project) => project.technologies)].some(
					(value) => value.trim().length > 120
				)
			) {
				throw new Error('Panjang setiap skill, bahasa, atau teknologi maksimal 120 karakter.');
			}
			const linkedin = urlValue(linkedinUrl, 'LinkedIn URL');
			const portfolio = urlValue(portfolioUrl, 'Portfolio URL');
			const github = urlValue(githubUrl, 'GitHub URL');

			if (
				workExperiences.length > 100 ||
				education.length > 100 ||
				certifications.length > 100 ||
				projects.length > 100
			) {
				throw new Error('Maksimal 100 data untuk setiap kategori pengalaman, pendidikan, sertifikasi, dan proyek.');
			}

			const experiencePayload = workExperiences.map((item, index) => {
				if (!item.company.trim() || !item.position.trim()) {
					throw new Error(`Lengkapi perusahaan dan posisi pada pengalaman kerja ${index + 1}.`);
				}
				assertLength(item.company.trim(), 'Nama perusahaan', 160);
				assertLength(item.position.trim(), 'Posisi', 160);
				assertLength(item.location.trim(), 'Lokasi pengalaman', 160);
				assertLength(item.description.trim(), 'Deskripsi pengalaman', 5000);
				return {
					company: item.company.trim(),
					position: item.position.trim(),
					...(item.location.trim() ? { location: item.location.trim() } : {}),
					...(item.startDate ? { startDate: item.startDate } : {}),
					...(item.endDate ? { endDate: item.endDate } : {}),
					isCurrent: item.isCurrent,
					...(item.description.trim() ? { description: item.description.trim() } : {})
				};
			});
			const educationPayload = education.map((item, index) => {
				if (!item.institution.trim()) {
					throw new Error(`Lengkapi institusi pada data pendidikan ${index + 1}.`);
				}
				assertLength(item.institution.trim(), 'Institusi pendidikan', 200);
				assertLength(item.degree.trim(), 'Gelar pendidikan', 160);
				assertLength(item.fieldOfStudy.trim(), 'Bidang studi', 160);
				assertLength(item.location.trim(), 'Lokasi pendidikan', 160);
				assertLength(item.description.trim(), 'Deskripsi pendidikan', 5000);
				return {
					institution: item.institution.trim(),
					...(item.degree.trim() ? { degree: item.degree.trim() } : {}),
					...(item.fieldOfStudy.trim() ? { fieldOfStudy: item.fieldOfStudy.trim() } : {}),
					...(item.location.trim() ? { location: item.location.trim() } : {}),
					...(item.startDate ? { startDate: item.startDate } : {}),
					...(item.endDate ? { endDate: item.endDate } : {}),
					...(item.description.trim() ? { description: item.description.trim() } : {})
				};
			});
			const certificationPayload = certifications.map((item, index) => {
				if (!item.name.trim()) {
					throw new Error(`Lengkapi nama sertifikasi pada data sertifikasi ${index + 1}.`);
				}
				assertLength(item.name.trim(), 'Nama sertifikasi', 200);
				assertLength(item.issuingOrganization.trim(), 'Organisasi penerbit', 200);
				assertLength(item.credentialId.trim(), 'ID kredensial', 200);
				const credentialUrl = urlValue(item.credentialUrl, 'URL kredensial');
				return {
					name: item.name.trim(),
					...(item.issuingOrganization.trim() ? { issuingOrganization: item.issuingOrganization.trim() } : {}),
					...(item.issueDate ? { issueDate: item.issueDate } : {}),
					...(item.expirationDate ? { expirationDate: item.expirationDate } : {}),
					...(item.credentialId.trim() ? { credentialId: item.credentialId.trim() } : {}),
					...(credentialUrl ? { credentialUrl } : {})
				};
			});
			const projectPayload = projects.map((item, index) => {
				if (!item.name.trim()) {
					throw new Error(`Lengkapi nama proyek pada data proyek ${index + 1}.`);
				}
				assertLength(item.name.trim(), 'Nama proyek', 200);
				assertLength(item.description.trim(), 'Deskripsi proyek', 5000);
				assertLength(item.role.trim(), 'Peran proyek', 160);
				if (item.technologies.length > 100) {
					throw new Error('Jumlah teknologi pada setiap proyek maksimal 100.');
				}
				const projectUrl = urlValue(item.projectUrl, 'URL proyek');
				return {
					name: item.name.trim(),
					...(item.description.trim() ? { description: item.description.trim() } : {}),
					...(item.role.trim() ? { role: item.role.trim() } : {}),
					...(item.technologies.length
						? { technologies: item.technologies.map((technology) => technology.trim()).filter(Boolean) }
						: {}),
					...(projectUrl ? { projectUrl } : {}),
					...(item.startDate ? { startDate: item.startDate } : {}),
					...(item.endDate ? { endDate: item.endDate } : {})
				};
			});
			const years = yearsOfExperience.trim() ? Number(yearsOfExperience) : undefined;
			if (
				years !== undefined &&
				(!Number.isInteger(years) || years < 0 || years > 80)
			) {
				throw new Error('Lama pengalaman kerja harus berupa bilangan bulat antara 0 dan 80.');
			}

			const profilePayload = {
				fullName: fullName.trim(),
				phone: phone.trim(),
				address: address.trim(),
				...(linkedin ? { linkedinUrl: linkedin } : {}),
				...(portfolio ? { portfolioUrl: portfolio } : {}),
				...(github ? { githubUrl: github } : {}),
				professionalSummary: summary.trim(),
				...(years === undefined ? {} : { yearsOfExperience: years }),
				rawCvText,
				...(cvFileUrl.trim() ? { cvFileUrl: cvFileUrl.trim() } : {}),
				aiTonePreference: aiTone.trim(),
				aiCustomInstructions: customInstructions.trim(),
				skills: skills.map((skill) => skill.trim()).filter(Boolean),
				languages: languages.map((language) => language.trim()).filter(Boolean),
				experiences: experiencePayload,
				educations: educationPayload,
				certifications: certificationPayload,
				projects: projectPayload
			};
			const response = await apiRequest(
				hasSavedProfile ? 'onboarding/update' : 'onboarding/submit',
				{
					method: hasSavedProfile ? 'PUT' : 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(profilePayload)
				}
			);
			await response.json();

			hasSavedProfile = true;
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
						Sisa Kuota Konversi CV:
						{quotaRemaining === -1 ? 'Tanpa batas' : `${quotaRemaining}/${quotaTotal}`}
					{:else}
						Kuota konversi CV belum tersedia
					{/if}
				</span>
			</div>

			<div class="mt-5">
				<CvDropzone
					bind:file={cvFile}
					disabled={uploadDisabled}
					onfilechange={extractCv}
					error={quotaKnown && quotaExhausted
						? 'Kuota konversi CV Anda telah habis.'
						: !quotaKnown
							? 'Kuota belum dapat diverifikasi. Muat ulang profil atau hubungi dukungan.'
							: undefined}
				/>
			</div>

			{#if isLoadingProfile}
				<p class="mt-3 text-sm text-slate-500" role="status">Memuat profil dan kuota konversi CV...</p>
			{:else if !profileLoaded}
				<button
					type="button"
					onclick={async () => {
						isLoadingProfile = true;
						pageError = null;
						try {
							await loadOnboardingProfile();
						} catch (error) {
							pageError = error instanceof Error ? error.message : 'Profil belum dapat dimuat.';
						} finally {
							isLoadingProfile = false;
						}
					}}
					class="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
				>
					Coba muat profil lagi
				</button>
			{/if}

			{#if manualEntryAvailable}
				<p class="mt-3 text-sm text-slate-600" role="status">
					Pengisian manual tersedia di formulir profil di bawah ini.
				</p>
			{/if}

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
					<input bind:value={fullName} maxlength="120" autocomplete="name" class="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
				</label>
				<label class="space-y-1.5 text-sm font-medium text-slate-700">
					Nomor telepon
					<input bind:value={phone} type="tel" maxlength="40" autocomplete="tel" class="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
				</label>
				<label class="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
					Alamat
					<input bind:value={address} maxlength="1000" autocomplete="street-address" class="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
				</label>
				<label class="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
					LinkedIn URL
					<input bind:value={linkedinUrl} type="url" maxlength="2048" placeholder="https://www.linkedin.com/in/..." class="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
				</label>
				<label class="space-y-1.5 text-sm font-medium text-slate-700">
					Portfolio URL
					<input bind:value={portfolioUrl} type="url" maxlength="2048" placeholder="https://" class="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
				</label>
				<label class="space-y-1.5 text-sm font-medium text-slate-700">
					GitHub URL
					<input bind:value={githubUrl} type="url" maxlength="2048" placeholder="https://github.com/..." class="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
				</label>
				<label class="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
					Lama pengalaman (tahun)
					<input bind:value={yearsOfExperience} type="number" min="0" max="80" step="1" class="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:max-w-xs" />
				</label>
				<label class="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
					Professional summary
					<textarea bind:value={summary} rows="4" maxlength="10000" class="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"></textarea>
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
						<input bind:value={experience.position} aria-label="Posisi" placeholder="Posisi" maxlength="160" class="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
						<input bind:value={experience.company} aria-label="Perusahaan" placeholder="Perusahaan" maxlength="160" class="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
						<input bind:value={experience.location} aria-label="Lokasi pengalaman" placeholder="Lokasi" maxlength="160" class="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
						<input bind:value={experience.startDate} type="date" aria-label="Tanggal mulai" class="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
						<label class="flex items-center gap-2 text-sm text-slate-700">
							<input bind:checked={experience.isCurrent} type="checkbox" class="rounded border-slate-300 text-indigo-600" />
							Masih bekerja di sini
						</label>
						{#if !experience.isCurrent}
							<input bind:value={experience.endDate} type="date" aria-label="Tanggal selesai" class="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
						{/if}
						<textarea bind:value={experience.description} aria-label="Deskripsi pengalaman" placeholder="Tanggung jawab dan pencapaian" maxlength="5000" rows="3" class="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none sm:col-span-2"></textarea>
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
						<input bind:value={item.institution} aria-label="Institusi pendidikan" placeholder="Universitas / sekolah" maxlength="200" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
						<input bind:value={item.degree} aria-label="Gelar" placeholder="Gelar" maxlength="160" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
						<input bind:value={item.fieldOfStudy} aria-label="Bidang studi" placeholder="Bidang studi" maxlength="160" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
						<input bind:value={item.location} aria-label="Lokasi pendidikan" placeholder="Lokasi" maxlength="160" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
						<input bind:value={item.startDate} type="date" aria-label="Mulai pendidikan" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
						<input bind:value={item.endDate} type="date" aria-label="Selesai pendidikan" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
						<textarea bind:value={item.description} aria-label="Deskripsi pendidikan" placeholder="Deskripsi (opsional)" maxlength="5000" rows="2" class="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"></textarea>
					</div>
				</article>
			{/each}
			{#if education.length === 0}<p class="text-sm text-slate-500">Belum ada data pendidikan.</p>{/if}
		</section>

		<section class="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 class="text-lg font-semibold text-slate-950">Sertifikasi</h2>
				<button type="button" onclick={addCertification} class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
					<Plus size={15} /> Tambah sertifikasi
				</button>
			</div>
			{#each certifications as item, index (index)}
				<article class="space-y-3 rounded-xl border border-slate-200 p-4">
					<div class="flex justify-end">
						<button type="button" aria-label="Hapus sertifikasi {index + 1}" onclick={() => (certifications = certifications.filter((_, itemIndex) => itemIndex !== index))} class="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
						<input bind:value={item.name} aria-label="Nama sertifikasi" placeholder="Nama sertifikasi" maxlength="200" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
						<input bind:value={item.issuingOrganization} aria-label="Organisasi penerbit" placeholder="Organisasi penerbit" maxlength="200" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
						<input bind:value={item.issueDate} type="date" aria-label="Tanggal terbit" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
						<input bind:value={item.expirationDate} type="date" aria-label="Tanggal kedaluwarsa" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
						<input bind:value={item.credentialId} aria-label="ID kredensial" placeholder="ID kredensial" maxlength="200" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
						<input bind:value={item.credentialUrl} type="url" maxlength="2048" aria-label="URL sertifikasi" placeholder="https://..." class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
					</div>
				</article>
			{/each}
			{#if certifications.length === 0}<p class="text-sm text-slate-500">Belum ada sertifikasi.</p>{/if}
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
					<input bind:value={project.name} aria-label="Nama proyek" placeholder="Nama proyek" maxlength="200" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
					<input bind:value={project.role} aria-label="Peran dalam proyek" placeholder="Peran" maxlength="160" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
					<input
						value={project.technologies.join(', ')}
						aria-label="Teknologi proyek"
						placeholder="Teknologi, pisahkan dengan koma"
						onchange={(event) => {
							project.technologies = event.currentTarget.value
								.split(',')
								.map((technology) => technology.trim())
								.filter(Boolean);
						}}
						class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
					/>
					<input bind:value={project.projectUrl} type="url" maxlength="2048" aria-label="Tautan proyek" placeholder="URL proyek (opsional)" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
					<div class="grid gap-3 sm:grid-cols-2">
						<input bind:value={project.startDate} type="date" aria-label="Tanggal mulai proyek" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
						<input bind:value={project.endDate} type="date" aria-label="Tanggal selesai proyek" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
					</div>
					<textarea bind:value={project.description} aria-label="Deskripsi proyek" placeholder="Deskripsi dan kontribusi" maxlength="5000" rows="3" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"></textarea>
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
				<h2 class="text-lg font-semibold text-slate-950">Bahasa</h2>
				<p class="mt-1 text-sm text-slate-500">Tekan Enter atau koma untuk menambahkan bahasa.</p>
			</div>
			<div class="flex flex-wrap gap-2">
				{#each languages as language, index (language)}
					<span class="inline-flex items-center gap-1 rounded-full bg-indigo-50 py-1 pl-3 pr-1 text-sm font-medium text-indigo-700">
						{language}
						<button type="button" aria-label="Hapus bahasa {language}" onclick={() => (languages = languages.filter((_, itemIndex) => itemIndex !== index))} class="rounded-full p-1 hover:bg-indigo-100">×</button>
					</span>
				{/each}
			</div>
			<input
				bind:value={languageInput}
				aria-label="Tambah bahasa"
				placeholder="Contoh: Bahasa Indonesia"
				maxlength="120"
				onkeydown={addLanguage}
				class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none sm:max-w-md"
			/>
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
				<textarea bind:value={customInstructions} rows="4" maxlength="5000" placeholder="Contoh: Tekankan pengalaman memimpin tim dan gunakan bahasa yang lugas." class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal"></textarea>
			</label>
		</section>

		{#if rawCvText}
			<details class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
				<summary class="cursor-pointer text-sm font-semibold text-slate-800">Tinjau teks CV yang diekstrak</summary>
				<textarea bind:value={rawCvText} maxlength="100000" aria-label="Teks CV mentah" rows="8" class="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></textarea>
			</details>
		{/if}

		<div class="flex justify-end pb-3">
			<button
				type="submit"
				disabled={isSaving || isExtracting || isLoadingProfile || !profileLoaded}
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
