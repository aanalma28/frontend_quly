<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowLeft, ArrowRight, BriefcaseBusiness, GraduationCap, Plus, Trash2 } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import { getMyBenefitsApi, type UserBenefitQuota } from '#lib/services/billingApi.js';
	import { formatRupiah, isUnlimitedQuota } from '#lib/utils/billing.js';
	import {
		onboarding,
		backToUpload,
		submit,
		updateAdditionalFormData,
		updateRawCvData,
		setAtsStyle
	} from '#lib/stores/onboardingStore.js';
	import type {
		AdditionalFormData,
		AtsStyle,
		Certification,
		Education,
		ParsedCvData,
		Project,
		WorkExperience
	} from '#lib/services/onboardingApi.js';

	const profile = $derived<ParsedCvData>($onboarding.rawCvData ?? {});
	const additional = $derived<AdditionalFormData>($onboarding.additionalFormData);
	const atsQuota = $derived($onboarding.atsQuota);
	const atsQuotaExhausted = $derived(atsQuota !== null && atsQuota.remaining === 0);

	let cvBenefit = $state<UserBenefitQuota | null>(null);
	let benefitQuotaLoading = $state(true);

	onMount(async () => {
		try {
			const data = await getMyBenefitsApi();
			cvBenefit = data.benefits.find((benefit) => benefit.code === 'CV_EXTRACTION') ?? null;
		} catch {
			cvBenefit = null;
		} finally {
			benefitQuotaLoading = false;
		}
	});

	const benefitQuotaExhausted = $derived(
		cvBenefit !== null && !isUnlimitedQuota(cvBenefit.limit) && cvBenefit.remaining <= 0
	);
	const usingCredit = $derived(
		benefitQuotaExhausted &&
			(cvBenefit?.creditCost ?? 0) > 0 &&
			Boolean(cvBenefit?.canUseWithCredit)
	);
	const quotaBlocked = $derived(
		cvBenefit ? benefitQuotaExhausted && !usingCredit : atsQuotaExhausted
	);

	const atsStyleOptions: { value: AtsStyle; label: string; description: string }[] = [
		{
			value: 'PROFESSIONAL_CORPORATE',
			label: 'Professional Corporate',
			description: 'Gaya formal, berfokus pada kepemimpinan, kepatuhan proses, dan stabilitas organisasi.'
		},
		{
			value: 'TECH_STARTUP',
			label: 'Tech Startup',
			description: 'Gaya dinamis, berfokus pada eksekusi cepat, metrik kuantitatif, dan tech stack modern.'
		},
		{
			value: 'MINIMALIST_EXEC',
			label: 'Minimalist Executive',
			description: 'Gaya ringkas, padat, berfokus pada dampak keputusan berlevel tinggi.'
		}
	];

	const experiences = $derived<WorkExperience[]>(profile.experiences ?? []);
	const educations = $derived<Education[]>(profile.educations ?? []);
	const certifications = $derived<Certification[]>(profile.certifications ?? []);
	const projects = $derived<Project[]>(profile.projects ?? []);
	const skills = $derived<string[]>(profile.skills ?? []);
	const languages = $derived<string[]>(profile.languages ?? []);

	let skillInput = $state('');
	let languageInput = $state('');

	function patchProfile(partial: ParsedCvData) {
		updateRawCvData(partial);
	}

	function patchAdditional(partial: Partial<AdditionalFormData>) {
		updateAdditionalFormData(partial);
	}

	function patchExperience(index: number, partial: Partial<WorkExperience>) {
		patchProfile({
			experiences: experiences.map((item, i) => (i === index ? { ...item, ...partial } : item))
		});
	}

	function patchEducation(index: number, partial: Partial<Education>) {
		patchProfile({
			educations: educations.map((item, i) => (i === index ? { ...item, ...partial } : item))
		});
	}

	function patchCertification(index: number, partial: Partial<Certification>) {
		patchProfile({
			certifications: certifications.map((item, i) => (i === index ? { ...item, ...partial } : item))
		});
	}

	function patchProject(index: number, partial: Partial<Project>) {
		patchProfile({
			projects: projects.map((item, i) => (i === index ? { ...item, ...partial } : item))
		});
	}

	function addWorkExperience() {
		if (experiences.length >= 100) return;
		patchProfile({
			experiences: [
				...experiences,
				{ company: '', position: '', location: '', startDate: '', endDate: '', isCurrent: false, description: '' }
			]
		});
	}

	function addEducation() {
		if (educations.length >= 100) return;
		patchProfile({
			educations: [...educations, { institution: '', degree: '', fieldOfStudy: '', location: '', startDate: '', endDate: '', description: '' }]
		});
	}

	function addCertification() {
		if (certifications.length >= 100) return;
		patchProfile({
			certifications: [
				...certifications,
				{ name: '', issuingOrganization: '', issueDate: '', expirationDate: '', credentialId: '', credentialUrl: '' }
			]
		});
	}

	function addProject() {
		if (projects.length >= 100) return;
		patchProfile({
			projects: [
				...projects,
				{ name: '', description: '', role: '', technologies: [], projectUrl: '', startDate: '', endDate: '' }
			]
		});
	}

	function addSkill(event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== ',') return;
		event.preventDefault();
		const value = skillInput.trim().replace(/,$/, '');
		if (value && !skills.some((item) => item.toLowerCase() === value.toLowerCase())) {
			patchProfile({ skills: [...skills, value] });
		}
		skillInput = '';
	}

	function addLanguage(event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== ',') return;
		event.preventDefault();
		const value = languageInput.trim().replace(/,$/, '');
		if (value && !languages.some((item) => item.toLowerCase() === value.toLowerCase())) {
			patchProfile({ languages: [...languages, value] });
		}
		languageInput = '';
	}

	function removeSkill(index: number) {
		patchProfile({ skills: skills.filter((_, i) => i !== index) });
	}

	function removeLanguage(index: number) {
		patchProfile({ languages: languages.filter((_, i) => i !== index) });
	}

	function techString(project: Project): string {
		return (project.technologies ?? []).join(', ');
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		validationAttempted = true;
		if (fullNameError || phoneError || quotaBlocked) return;
		void submit();
	}

	let validationAttempted = $state(false);

	const fullNameError = $derived(
		validationAttempted && !(profile.fullName ?? '').trim() ? 'Nama lengkap wajib diisi.' : ''
	);
	const phoneError = $derived(
		validationAttempted && !(profile.phone ?? '').trim() ? 'Nomor telepon wajib diisi.' : ''
	);

	function fieldClass(hasError: boolean): string {
		return hasError
			? 'w-full rounded-lg border border-rose-400 bg-white px-3 py-2.5 text-sm font-normal focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100'
			: 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100';
	}

	const inputClass =
		'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100';
</script>

<form class="space-y-6" onsubmit={handleSubmit}>
	<section class="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
		<div>
			<h2 class="text-lg font-semibold text-slate-950">Data diri &amp; ringkasan</h2>
			<p class="mt-1 text-sm text-slate-500">Informasi dasar yang digunakan untuk personalisasi profil.</p>
		</div>
		<div class="grid gap-4 sm:grid-cols-2">
			<label class="space-y-1.5 text-sm font-medium text-slate-700">
				Nama lengkap<span class="ml-0.5 text-rose-600" aria-hidden="true">*</span>
				<input
					value={profile.fullName ?? ''}
					maxlength="120"
					autocomplete="name"
					aria-invalid={fullNameError ? 'true' : undefined}
					aria-describedby={fullNameError ? 'fullName-error' : undefined}
					oninput={(e) => patchProfile({ fullName: e.currentTarget.value })}
					class={fieldClass(!!fullNameError)}
				/>
				{#if fullNameError}
					<p id="fullName-error" class="text-xs font-normal text-rose-600">{fullNameError}</p>
				{/if}
			</label>
			<label class="space-y-1.5 text-sm font-medium text-slate-700">
				Nomor telepon<span class="ml-0.5 text-rose-600" aria-hidden="true">*</span>
				<input
					value={profile.phone ?? ''}
					type="tel"
					maxlength="40"
					autocomplete="tel"
					aria-invalid={phoneError ? 'true' : undefined}
					aria-describedby={phoneError ? 'phone-error' : undefined}
					oninput={(e) => patchProfile({ phone: e.currentTarget.value })}
					class={fieldClass(!!phoneError)}
				/>
				{#if phoneError}
					<p id="phone-error" class="text-xs font-normal text-rose-600">{phoneError}</p>
				{/if}
			</label>
			<label class="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
				Alamat
				<input value={profile.address ?? ''} maxlength="1000" autocomplete="street-address" oninput={(e) => patchProfile({ address: e.currentTarget.value })} class={inputClass} />
			</label>
			<label class="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
				LinkedIn URL
				<input value={profile.linkedinUrl ?? ''} type="url" maxlength="2048" placeholder="https://www.linkedin.com/in/..." oninput={(e) => patchProfile({ linkedinUrl: e.currentTarget.value })} class={inputClass} />
			</label>
			<label class="space-y-1.5 text-sm font-medium text-slate-700">
				Portfolio URL
				<input value={profile.portfolioUrl ?? ''} type="url" maxlength="2048" placeholder="https://" oninput={(e) => patchProfile({ portfolioUrl: e.currentTarget.value })} class={inputClass} />
			</label>
			<label class="space-y-1.5 text-sm font-medium text-slate-700">
				GitHub URL
				<input value={profile.githubUrl ?? ''} type="url" maxlength="2048" placeholder="https://github.com/..." oninput={(e) => patchProfile({ githubUrl: e.currentTarget.value })} class={inputClass} />
			</label>
			<label class="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
				Lama pengalaman (tahun)
				<input
					type="number"
					min="0"
					max="80"
					step="1"
					value={profile.yearsOfExperience ?? ''}
					oninput={(e) => {
						const raw = e.currentTarget.value;
						patchProfile({ yearsOfExperience: raw === '' ? undefined : Number(raw) });
					}}
					class="{inputClass} sm:max-w-xs"
				/>
			</label>
			<label class="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
				Professional summary
				<textarea value={profile.professionalSummary ?? ''} rows="4" maxlength="10000" oninput={(e) => patchProfile({ professionalSummary: e.currentTarget.value })} class={inputClass}></textarea>
			</label>
		</div>
	</section>

	<section class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
		<div>
			<h2 class="text-lg font-semibold text-slate-950">Target &amp; fokus karier</h2>
			<p class="mt-1 text-sm text-slate-500">Informasi tambahan untuk menyusun CV ATS yang lebih tepat sasaran.</p>
		</div>
		<div class="grid gap-4 sm:grid-cols-2">
			<label class="space-y-1.5 text-sm font-medium text-slate-700">
				Domisili target
				<input value={additional.targetDomicile} maxlength="1000" placeholder="Contoh: Jakarta" oninput={(e) => patchAdditional({ targetDomicile: e.currentTarget.value })} class={inputClass} />
			</label>
			<label class="space-y-1.5 text-sm font-medium text-slate-700">
				Target role
				<input value={additional.targetRole} maxlength="160" placeholder="Contoh: Backend Engineer" oninput={(e) => patchAdditional({ targetRole: e.currentTarget.value })} class={inputClass} />
			</label>
			<label class="space-y-1.5 text-sm font-medium text-slate-700">
				Kategori pekerjaan
				<input value={additional.jobCategory} maxlength="160" placeholder="Contoh: Technology" oninput={(e) => patchAdditional({ jobCategory: e.currentTarget.value })} class={inputClass} />
			</label>
			<label class="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
				Fokus deskripsi
				<textarea value={additional.careerSummary} rows="3" maxlength="10000" placeholder="Contoh: Fokus pada backend engineering dan arsitektur API." oninput={(e) => patchAdditional({ careerSummary: e.currentTarget.value })} class={inputClass}></textarea>
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
		{#if experiences.length === 0}
			<p class="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">Belum ada pengalaman kerja. Tambahkan secara manual atau ekstrak dari CV.</p>
		{/if}
		{#each experiences as experience, index (index)}
			<article class="space-y-4 rounded-xl border border-slate-200 p-4">
				<div class="flex items-center justify-between">
					<h3 class="text-sm font-semibold text-slate-800">Pengalaman {index + 1}</h3>
					<button type="button" aria-label="Hapus pengalaman {index + 1}" onclick={() => patchProfile({ experiences: experiences.filter((_, i) => i !== index) })} class="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>
				</div>
				<div class="grid gap-3 sm:grid-cols-2">
					<input value={experience.position} aria-label="Posisi" placeholder="Posisi" maxlength="160" oninput={(e) => patchExperience(index, { position: e.currentTarget.value })} class="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
					<input value={experience.company} aria-label="Perusahaan" placeholder="Perusahaan" maxlength="160" oninput={(e) => patchExperience(index, { company: e.currentTarget.value })} class="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
					<input value={experience.location ?? ''} aria-label="Lokasi pengalaman" placeholder="Lokasi" maxlength="160" oninput={(e) => patchExperience(index, { location: e.currentTarget.value })} class="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
					<input value={experience.startDate ?? ''} type="date" aria-label="Tanggal mulai" oninput={(e) => patchExperience(index, { startDate: e.currentTarget.value })} class="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
					<label class="flex items-center gap-2 text-sm text-slate-700">
						<input checked={experience.isCurrent ?? false} type="checkbox" onchange={(e) => patchExperience(index, { isCurrent: e.currentTarget.checked })} class="rounded border-slate-300 text-indigo-600" />
						Masih bekerja di sini
					</label>
					{#if !experience.isCurrent}
						<input value={experience.endDate ?? ''} type="date" aria-label="Tanggal selesai" oninput={(e) => patchExperience(index, { endDate: e.currentTarget.value })} class="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
					{/if}
					<textarea value={experience.description ?? ''} aria-label="Deskripsi pengalaman" placeholder="Tanggung jawab dan pencapaian" maxlength="5000" rows="3" oninput={(e) => patchExperience(index, { description: e.currentTarget.value })} class="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none sm:col-span-2"></textarea>
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
		{#each educations as item, index (index)}
			<article class="space-y-3 rounded-xl border border-slate-200 p-4">
				<div class="flex justify-end">
					<button type="button" aria-label="Hapus pendidikan {index + 1}" onclick={() => patchProfile({ educations: educations.filter((_, i) => i !== index) })} class="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>
				</div>
				<div class="grid gap-3 sm:grid-cols-2">
					<input value={item.institution} aria-label="Institusi pendidikan" placeholder="Universitas / sekolah" maxlength="200" oninput={(e) => patchEducation(index, { institution: e.currentTarget.value })} class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
					<input value={item.degree ?? ''} aria-label="Gelar" placeholder="Gelar" maxlength="160" oninput={(e) => patchEducation(index, { degree: e.currentTarget.value })} class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
					<input value={item.fieldOfStudy ?? ''} aria-label="Bidang studi" placeholder="Bidang studi" maxlength="160" oninput={(e) => patchEducation(index, { fieldOfStudy: e.currentTarget.value })} class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
					<input value={item.location ?? ''} aria-label="Lokasi pendidikan" placeholder="Lokasi" maxlength="160" oninput={(e) => patchEducation(index, { location: e.currentTarget.value })} class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
					<input value={item.startDate ?? ''} type="date" aria-label="Mulai pendidikan" oninput={(e) => patchEducation(index, { startDate: e.currentTarget.value })} class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
					<input value={item.endDate ?? ''} type="date" aria-label="Selesai pendidikan" oninput={(e) => patchEducation(index, { endDate: e.currentTarget.value })} class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
					<textarea value={item.description ?? ''} aria-label="Deskripsi pendidikan" placeholder="Deskripsi (opsional)" maxlength="5000" rows="2" oninput={(e) => patchEducation(index, { description: e.currentTarget.value })} class="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"></textarea>
				</div>
			</article>
		{/each}
		{#if educations.length === 0}<p class="text-sm text-slate-500">Belum ada data pendidikan.</p>{/if}
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
					<button type="button" aria-label="Hapus sertifikasi {index + 1}" onclick={() => patchProfile({ certifications: certifications.filter((_, i) => i !== index) })} class="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>
				</div>
				<div class="grid gap-3 sm:grid-cols-2">
					<input value={item.name} aria-label="Nama sertifikasi" placeholder="Nama sertifikasi" maxlength="200" oninput={(e) => patchCertification(index, { name: e.currentTarget.value })} class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
					<input value={item.issuingOrganization ?? ''} aria-label="Organisasi penerbit" placeholder="Organisasi penerbit" maxlength="200" oninput={(e) => patchCertification(index, { issuingOrganization: e.currentTarget.value })} class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
					<input value={item.issueDate ?? ''} type="date" aria-label="Tanggal terbit" oninput={(e) => patchCertification(index, { issueDate: e.currentTarget.value })} class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
					<input value={item.expirationDate ?? ''} type="date" aria-label="Tanggal kedaluwarsa" oninput={(e) => patchCertification(index, { expirationDate: e.currentTarget.value })} class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
					<input value={item.credentialId ?? ''} aria-label="ID kredensial" placeholder="ID kredensial" maxlength="200" oninput={(e) => patchCertification(index, { credentialId: e.currentTarget.value })} class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
					<input value={item.credentialUrl ?? ''} type="url" maxlength="2048" aria-label="URL sertifikasi" placeholder="https://..." oninput={(e) => patchCertification(index, { credentialUrl: e.currentTarget.value })} class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
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
					<button type="button" aria-label="Hapus proyek {index + 1}" onclick={() => patchProfile({ projects: projects.filter((_, i) => i !== index) })} class="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>
				</div>
				<input value={project.name} aria-label="Nama proyek" placeholder="Nama proyek" maxlength="200" oninput={(e) => patchProject(index, { name: e.currentTarget.value })} class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
				<input value={project.role ?? ''} aria-label="Peran dalam proyek" placeholder="Peran" maxlength="160" oninput={(e) => patchProject(index, { role: e.currentTarget.value })} class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
				<input
					value={techString(project)}
					aria-label="Teknologi proyek"
					placeholder="Teknologi, pisahkan dengan koma"
					onchange={(e) => patchProject(index, { technologies: e.currentTarget.value.split(',').map((t) => t.trim()).filter(Boolean) })}
					class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
				/>
				<input value={project.projectUrl ?? ''} type="url" maxlength="2048" aria-label="Tautan proyek" placeholder="URL proyek (opsional)" oninput={(e) => patchProject(index, { projectUrl: e.currentTarget.value })} class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
				<div class="grid gap-3 sm:grid-cols-2">
					<input value={project.startDate ?? ''} type="date" aria-label="Tanggal mulai proyek" oninput={(e) => patchProject(index, { startDate: e.currentTarget.value })} class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
					<input value={project.endDate ?? ''} type="date" aria-label="Tanggal selesai proyek" oninput={(e) => patchProject(index, { endDate: e.currentTarget.value })} class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
				</div>
				<textarea value={project.description ?? ''} aria-label="Deskripsi proyek" placeholder="Deskripsi dan kontribusi" maxlength="5000" rows="3" oninput={(e) => patchProject(index, { description: e.currentTarget.value })} class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"></textarea>
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
					<button type="button" aria-label="Hapus skill {skill}" onclick={() => removeSkill(index)} class="rounded-full p-1 hover:bg-indigo-100">×</button>
				</span>
			{/each}
		</div>
		<input bind:value={skillInput} onkeydown={addSkill} aria-label="Tambah skill" placeholder="Contoh: TypeScript" class="{inputClass} sm:max-w-md" />
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
					<button type="button" aria-label="Hapus bahasa {language}" onclick={() => removeLanguage(index)} class="rounded-full p-1 hover:bg-indigo-100">×</button>
				</span>
			{/each}
		</div>
		<input bind:value={languageInput} aria-label="Tambah bahasa" placeholder="Contoh: Bahasa Indonesia" maxlength="120" onkeydown={addLanguage} class="{inputClass} sm:max-w-md" />
	</section>

	<section class="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
		<div>
			<h2 class="text-lg font-semibold text-slate-950">Gaya CV ATS &amp; Instruksi AI</h2>
			<p class="mt-1 text-sm text-slate-500">Pilih gaya penulisan CV ATS, lalu tambahkan instruksi khusus jika diperlukan.</p>
		</div>
		<div class="grid gap-3 sm:grid-cols-3">
			{#each atsStyleOptions as option (option.value)}
				{@const selected = $onboarding.atsStyle === option.value}
				<button
					type="button"
					aria-pressed={selected}
					onclick={() => setAtsStyle(option.value)}
					class="flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition {selected
						? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100'
						: 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40'}"
				>
					<span class="text-sm font-semibold text-slate-900">{option.label}</span>
					<span class="text-xs leading-5 text-slate-500">{option.description}</span>
				</button>
			{/each}
		</div>
		<div class="border-t border-slate-100 pt-5">
			<label class="block space-y-1.5 text-sm font-medium text-slate-700">
				Instruksi khusus <span class="text-xs font-normal text-slate-400">(opsional)</span>
				<textarea value={profile.aiCustomInstructions ?? ''} rows="4" maxlength="5000" placeholder="Contoh: Tekankan pengalaman memimpin tim dan gunakan bahasa yang lugas." oninput={(e) => patchProfile({ aiCustomInstructions: e.currentTarget.value })} class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"></textarea>
				<span class="text-[11px] font-normal leading-5 text-slate-400">Instruksi ini akan diikuti AI saat menyusun CV ATS-mu.</span>
			</label>
		</div>
	</section>

	{#if profile.rawCvText}
		<details class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
			<summary class="cursor-pointer text-sm font-semibold text-slate-800">Tinjau teks CV yang diekstrak</summary>
			<textarea value={profile.rawCvText} maxlength="100000" aria-label="Teks CV mentah" rows="8" oninput={(e) => patchProfile({ rawCvText: e.currentTarget.value })} class="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"></textarea>
		</details>
	{/if}

	{#if !benefitQuotaLoading}
		{#if usingCredit && cvBenefit}
			<div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
				Kuota Generate CV habis. Generate ini akan memakai
				<strong>{cvBenefit.creditCost} kredit</strong>
				(± {formatRupiah(cvBenefit.overageCostIdr)}). Anda tetap bisa melanjutkan atau
				<a href="/billing#kredit-kilat" class="font-semibold underline">top-up kredit</a>.
			</div>
		{:else if quotaBlocked}
			<div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
				Kuota Generate CV habis dan saldo kredit tidak mencukupi. Silakan
				<a href="/billing#kredit-kilat" class="font-semibold underline">top-up kredit</a>
				terlebih dahulu.
			</div>
		{:else if cvBenefit === null && atsQuotaExhausted}
			<div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
				Kuota Generate ATS Anda habis. Silakan
				<a href="/billing#paket" class="font-semibold underline">upgrade</a>
				untuk melanjutkan.
			</div>
		{/if}
	{/if}

	<div class="flex flex-wrap items-center justify-between gap-3 pb-3">
		<button
			type="button"
			onclick={backToUpload}
			class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
		>
			<ArrowLeft size={16} />
			Kembali
		</button>
		<div class="flex items-center gap-3">
			{#if cvBenefit}
				<p class="text-xs text-slate-500">
					Kuota Generate CV:
					<span class="font-semibold text-slate-700">
						{isUnlimitedQuota(cvBenefit.limit)
							? 'Tanpa batas'
							: `${Math.max(cvBenefit.remaining, 0)}/${cvBenefit.limit}`}
					</span>
				</p>
			{:else if atsQuota}
				<p class="text-xs text-slate-500">
					Kuota Generate ATS:
					<span class="font-semibold text-slate-700">
						{atsQuota.remaining === -1 ? 'Tanpa batas' : `${atsQuota.remaining}/${atsQuota.limit}`}
					</span>
				</p>
			{/if}
			<button
				type="submit"
				disabled={$onboarding.isSubmitting || $onboarding.isParsing || quotaBlocked}
				class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{#if $onboarding.isSubmitting}<Spinner label="Menyimpan profil" />{/if}
				Simpan &amp; Lanjut <ArrowRight size={16} />
			</button>
		</div>
	</div>
</form>
