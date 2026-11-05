<script lang="ts">
	import { AlertTriangle, Save, X } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import {
		applicationTypeLabel,
		employmentTypeLabel,
		workplaceTypeLabel
	} from '#lib/components/superadmin/status.js';
	import type {
		JobEmploymentType,
		JobListItem,
		JobWorkplaceType,
		UpdateExtractedJobInput
	} from '#lib/services/jobApi.js';

	interface Props {
		open: boolean;
		job: JobListItem | null;
		saving: boolean;
		error: string | null;
		onclose: () => void;
		onsave: (input: UpdateExtractedJobInput) => void;
	}

	let { open, job, saving, error, onclose, onsave }: Props = $props();

	const workplaceTypes: JobWorkplaceType[] = ['REMOTE', 'WFO', 'HYBRID'];
	const employmentTypes: JobEmploymentType[] = [
		'FULL_TIME',
		'PART_TIME',
		'CONTRACT',
		'FREELANCE',
		'INTERNSHIP'
	];
	const applicationTypes = ['EMAIL', 'WEBSITE_PORTAL', 'WHATSAPP', 'TELEGRAM'] as const;
	const inputClass =
		'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100';

	let formJobTitle = $state('');
	let formCompanyName = $state('');
	let formLocation = $state('');
	let formWorkplaceType = $state<JobWorkplaceType>('WFO');
	let formEmploymentType = $state<JobEmploymentType>('FULL_TIME');
	let formSalaryMin = $state('');
	let formSalaryMax = $state('');
	let formSalaryCurrency = $state('IDR');
	let formSalaryConfidential = $state(false);
	let formMinExperience = $state('');
	let formEducation = $state('');
	let formSkills = $state('');
	let formDescription = $state('');
	let formSubjectFormat = $state('');
	let formApplicationType = $state<(typeof applicationTypes)[number]>('EMAIL');
	let formApplicationDestination = $state('');
	let formApplicationInstructions = $state('');
	let formExpiresAt = $state('');

	$effect(() => {
		if (!open || !job) return;
		formJobTitle = job.jobTitle;
		formCompanyName = job.companyName;
		formLocation = job.location ?? '';
		formWorkplaceType = (job.workplaceType as JobWorkplaceType) || 'WFO';
		formEmploymentType = (job.employmentType as JobEmploymentType) || 'FULL_TIME';
		formSalaryMin = job.salaryMin === null ? '' : String(job.salaryMin);
		formSalaryMax = job.salaryMax === null ? '' : String(job.salaryMax);
		formSalaryCurrency = job.salaryCurrency ?? 'IDR';
		formSalaryConfidential = job.isSalaryConfidential;
		formMinExperience =
			job.requirements?.minExperienceYears === null ||
			job.requirements?.minExperienceYears === undefined
				? ''
				: String(job.requirements.minExperienceYears);
		formEducation = job.requirements?.education ?? '';
		formSkills = (job.requirements?.skills ?? []).join(', ');
		formDescription = job.jobDescriptionSummary ?? '';
		formSubjectFormat = job.subjectFormat ?? '';
		formApplicationType =
			(applicationTypes.find((type) => type === job.applicationType) ?? 'EMAIL');
		formApplicationDestination = job.applicationDestination ?? '';
		formApplicationInstructions = '';
		formExpiresAt = job.expiresAt ? job.expiresAt.slice(0, 10) : '';
	});

	$effect(() => {
		if (typeof document === 'undefined' || !open) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});

	function nullableNumber(value: string): number | null {
		const text = value.trim();
		if (!text) return null;
		const parsed = Number(text);
		return Number.isFinite(parsed) ? parsed : null;
	}

	function submit() {
		if (saving) return;
		const input: UpdateExtractedJobInput = {
			jobTitle: formJobTitle.trim(),
			companyName: formCompanyName.trim(),
			location: formLocation.trim(),
			workplaceType: formWorkplaceType,
			employmentType: formEmploymentType,
			salaryMin: nullableNumber(formSalaryMin),
			salaryMax: nullableNumber(formSalaryMax),
			salaryCurrency: formSalaryCurrency.trim() || null,
			isSalaryConfidential: formSalaryConfidential,
			requirements: {
				minExperienceYears: nullableNumber(formMinExperience),
				education: formEducation.trim() || null,
				skills: formSkills
					.split(',')
					.map((skill) => skill.trim())
					.filter(Boolean)
			},
			jobDescriptionSummary: formDescription.trim(),
			subjectFormat: formSubjectFormat.trim() || null,
			applicationType: formApplicationType,
			applicationDestination: formApplicationDestination.trim(),
			applicationInstructions: formApplicationInstructions.trim() || null,
			expiresAt: formExpiresAt ? new Date(`${formExpiresAt}T23:59:59`).toISOString() : null
		};
		onsave(input);
	}
</script>

{#if open && job}
	<div
		class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-labelledby="extracted-job-edit-title"
	>
		<div class="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
			<header class="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
				<div>
					<p class="text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-600">
						Loker hasil ekstraksi
					</p>
					<h2 id="extracted-job-edit-title" class="mt-1 text-xl font-bold tracking-tight text-slate-950">
						Edit data lowongan
					</h2>
					<p class="mt-1 text-xs text-slate-500">
						Perubahan hanya tersedia untuk loker milikmu sendiri.
					</p>
				</div>
				<button
					type="button"
					onclick={onclose}
					disabled={saving}
					class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
					aria-label="Tutup"
				>
					<X size={18} />
				</button>
			</header>

			<div class="space-y-4 px-5 py-5">
				{#if error}
					<div class="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700" role="alert">
						<AlertTriangle size={15} class="mt-0.5 shrink-0" />
						<span>{error}</span>
					</div>
				{/if}

				<div class="grid gap-3 sm:grid-cols-2">
					<label class="space-y-1 text-[11px] font-semibold text-slate-600">
						Posisi *
						<input bind:value={formJobTitle} maxlength="200" class={inputClass} />
					</label>
					<label class="space-y-1 text-[11px] font-semibold text-slate-600">
						Perusahaan *
						<input bind:value={formCompanyName} maxlength="200" class={inputClass} />
					</label>
					<label class="space-y-1 text-[11px] font-semibold text-slate-600">
						Lokasi
						<input bind:value={formLocation} maxlength="200" class={inputClass} />
					</label>
					<label class="space-y-1 text-[11px] font-semibold text-slate-600">
						Tipe kerja
						<select bind:value={formWorkplaceType} class={inputClass}>
							{#each workplaceTypes as type}
								<option value={type}>{workplaceTypeLabel[type]}</option>
							{/each}
						</select>
					</label>
					<label class="space-y-1 text-[11px] font-semibold text-slate-600">
						Jenis kerja
						<select bind:value={formEmploymentType} class={inputClass}>
							{#each employmentTypes as type}
								<option value={type}>{employmentTypeLabel[type]}</option>
							{/each}
						</select>
					</label>
					<label class="space-y-1 text-[11px] font-semibold text-slate-600">
						Tipe lamaran
						<select bind:value={formApplicationType} class={inputClass}>
							{#each applicationTypes as type}
								<option value={type}>{applicationTypeLabel[type]}</option>
							{/each}
						</select>
					</label>
					<label class="space-y-1 text-[11px] font-semibold text-slate-600">
						Email / tujuan lamaran
						<input bind:value={formApplicationDestination} maxlength="1000" class={inputClass} />
					</label>
					<label class="space-y-1 text-[11px] font-semibold text-slate-600">
						Berlaku sampai
						<input bind:value={formExpiresAt} type="date" class={inputClass} />
					</label>
				</div>

				<div class="grid gap-3 sm:grid-cols-3">
					<label class="space-y-1 text-[11px] font-semibold text-slate-600">
						Gaji min.
						<input bind:value={formSalaryMin} type="number" min="0" class={inputClass} />
					</label>
					<label class="space-y-1 text-[11px] font-semibold text-slate-600">
						Gaji maks.
						<input bind:value={formSalaryMax} type="number" min="0" class={inputClass} />
					</label>
					<label class="space-y-1 text-[11px] font-semibold text-slate-600">
						Mata uang
						<input bind:value={formSalaryCurrency} maxlength="10" class={inputClass} />
					</label>
				</div>

				<label class="flex items-center gap-2 text-xs text-slate-600">
					<input bind:checked={formSalaryConfidential} type="checkbox" class="size-4 rounded border-slate-300 text-indigo-600" />
					Gaji dirahasiakan
				</label>

				<div class="grid gap-3 sm:grid-cols-3">
					<label class="space-y-1 text-[11px] font-semibold text-slate-600">
						Min. pengalaman
						<input bind:value={formMinExperience} type="number" min="0" class={inputClass} />
					</label>
					<label class="space-y-1 text-[11px] font-semibold text-slate-600 sm:col-span-2">
						Pendidikan
						<input bind:value={formEducation} maxlength="160" class={inputClass} />
					</label>
				</div>

				<label class="space-y-1 text-[11px] font-semibold text-slate-600">
					Skills <span class="font-normal text-slate-400">(pisahkan dengan koma)</span>
					<input bind:value={formSkills} maxlength="2000" class={inputClass} />
				</label>

				<label class="space-y-1 text-[11px] font-semibold text-slate-600">
					Deskripsi
					<textarea bind:value={formDescription} rows="4" maxlength="10000" class={inputClass}></textarea>
				</label>

				<label class="space-y-1 text-[11px] font-semibold text-slate-600">
					Format subjek email
					<input bind:value={formSubjectFormat} maxlength="1000" class={inputClass} />
				</label>

				<label class="space-y-1 text-[11px] font-semibold text-slate-600">
					Instruksi lamaran
					<textarea bind:value={formApplicationInstructions} rows="2" maxlength="5000" class={inputClass}></textarea>
				</label>
			</div>

			<footer class="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
				<button
					type="button"
					onclick={onclose}
					disabled={saving}
					class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
				>
					Batal
				</button>
				<button
					type="button"
					onclick={submit}
					disabled={saving || !formJobTitle.trim() || !formCompanyName.trim()}
					class="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{#if saving}<Spinner label="Menyimpan" />{:else}<Save size={14} />{/if}
					Simpan perubahan
				</button>
			</footer>
		</div>
	</div>
{/if}
