<script lang="ts">
	import { ArrowRight, CheckCircle2, Sparkles } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { onboarding, backToUpload } from '#lib/stores/onboardingStore.js';
	import type { ParsedCvData } from '#lib/services/onboardingApi.js';

	const result = $derived($onboarding.atsResult);
	const ats = $derived<ParsedCvData | null>(
		result && typeof result.atsCv === 'object' && result.atsCv !== null
			? (result.atsCv as ParsedCvData)
			: null
	);

	const skills = $derived<string[]>(ats?.skills ?? []);
	const languages = $derived<string[]>(ats?.languages ?? []);
	const experiences = $derived(ats?.experiences ?? []);

	function finish() {
		void goto('/dashboard', { invalidateAll: true });
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
					CV ATS berhasil dibuat. Berikut pratinjau data yang akan digunakan untuk lamaran otomatis.
				</p>
			</div>
		</div>
	</div>

	<article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
		<header class="border-b border-slate-100 px-5 py-4 sm:px-6">
			<div class="flex items-center gap-2">
				<Sparkles size={16} class="text-indigo-600" />
				<h3 class="text-sm font-semibold text-slate-900">Pratinjau CV ATS</h3>
			</div>
		</header>

		<div class="space-y-5 p-5 sm:p-6">
			<div class="grid gap-4 sm:grid-cols-3">
				<div>
					<p class="text-xs font-medium uppercase tracking-wide text-slate-400">Nama</p>
					<p class="mt-1 text-sm font-semibold text-slate-900">{ats?.fullName ?? '—'}</p>
				</div>
				<div>
					<p class="text-xs font-medium uppercase tracking-wide text-slate-400">Target role</p>
					<p class="mt-1 text-sm font-semibold text-slate-900">{ats?.targetRole ?? '—'}</p>
				</div>
				<div>
					<p class="text-xs font-medium uppercase tracking-wide text-slate-400">Kategori</p>
					<p class="mt-1 text-sm font-semibold text-slate-900">{ats?.jobCategory ?? '—'}</p>
				</div>
			</div>

			<div>
				<p class="text-xs font-medium uppercase tracking-wide text-slate-400">Domisili target</p>
				<p class="mt-1 text-sm text-slate-700">{ats?.targetDomicile ?? '—'}</p>
			</div>

			<div>
				<p class="text-xs font-medium uppercase tracking-wide text-slate-400">Ringkasan</p>
				<p class="mt-1 text-sm leading-6 text-slate-700">{ats?.professionalSummary ?? '—'}</p>
			</div>

			{#if skills.length > 0}
				<div>
					<p class="text-xs font-medium uppercase tracking-wide text-slate-400">Skills</p>
					<div class="mt-2 flex flex-wrap gap-2">
						{#each skills as skill}
							<span class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">{skill}</span>
						{/each}
					</div>
				</div>
			{/if}

			{#if languages.length > 0}
				<div>
					<p class="text-xs font-medium uppercase tracking-wide text-slate-400">Bahasa</p>
					<div class="mt-2 flex flex-wrap gap-2">
						{#each languages as language}
							<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{language}</span>
						{/each}
					</div>
				</div>
			{/if}

			{#if experiences.length > 0}
				<div>
					<p class="text-xs font-medium uppercase tracking-wide text-slate-400">Pengalaman</p>
					<ul class="mt-2 space-y-2">
						{#each experiences as experience}
							<li class="text-sm text-slate-700">
								<span class="font-semibold">{experience.position}</span>
								<span class="text-slate-500"> — {experience.company}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	</article>

	<div class="flex items-center justify-between gap-3 pb-3">
		<button
			type="button"
			onclick={backToUpload}
			class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
		>
			Ulangi
		</button>
		<button
			type="button"
			onclick={finish}
			class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
		>
			Ke dashboard <ArrowRight size={16} />
		</button>
	</div>
</section>
