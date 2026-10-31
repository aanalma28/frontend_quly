<script lang="ts">
	import { AlertTriangle, CheckCircle2, Lightbulb, Sparkles } from '@lucide/svelte';
	import ScoreRing from '#lib/components/ui/ScoreRing.svelte';
	import type { CvScore } from '#lib/services/onboardingApi.js';

	interface Props {
		score: CvScore;
	}

	let { score }: Props = $props();

	const strengths = $derived(Array.isArray(score.strengths) ? score.strengths : []);
	const weaknesses = $derived(Array.isArray(score.weaknesses) ? score.weaknesses : []);
	const suggestions = $derived(Array.isArray(score.suggestions) ? score.suggestions : []);
</script>

<section class="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm shadow-slate-100/70 sm:p-6" aria-labelledby="cv-score-title">
	<div class="flex flex-col gap-5 sm:flex-row sm:items-center">
		<ScoreRing score={score.overallScore} label="CV Score" />
		<div class="min-w-0">
			<p class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">
				<Sparkles size={13} /> Review CV ATS
			</p>
			<h2 id="cv-score-title" class="mt-1 text-xl font-bold tracking-tight text-slate-950">
				Skor CV {Math.round(score.overallScore)}/100
			</h2>
			{#if score.summary}
				<p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{score.summary}</p>
			{:else}
				<p class="mt-2 text-sm leading-6 text-slate-600">
					Penilaian ini membantu melihat kekuatan dan bagian CV yang masih bisa ditingkatkan.
				</p>
			{/if}
		</div>
	</div>

	<div class="mt-5 grid gap-3 lg:grid-cols-3">
		<div class="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
			<h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-800">
				<CheckCircle2 size={15} /> Kelebihan
			</h3>
			{#if strengths.length > 0}
				<ul class="mt-3 space-y-2 text-xs leading-5 text-emerald-950/80">
					{#each strengths as item}
						<li class="flex gap-2">
							<span class="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-500"></span>
							<span>{item}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-3 text-xs text-emerald-900/60">Belum ada catatan kelebihan.</p>
			{/if}
		</div>

		<div class="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
			<h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-800">
				<AlertTriangle size={15} /> Kekurangan
			</h3>
			{#if weaknesses.length > 0}
				<ul class="mt-3 space-y-2 text-xs leading-5 text-amber-950/80">
					{#each weaknesses as item}
						<li class="flex gap-2">
							<span class="mt-2 size-1.5 shrink-0 rounded-full bg-amber-500"></span>
							<span>{item}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-3 text-xs text-amber-900/60">Belum ada catatan kekurangan.</p>
			{/if}
		</div>

		<div class="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
			<h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-indigo-800">
				<Lightbulb size={15} /> Saran
			</h3>
			{#if suggestions.length > 0}
				<ul class="mt-3 space-y-2 text-xs leading-5 text-indigo-950/80">
					{#each suggestions as item}
						<li class="flex gap-2">
							<span class="mt-2 size-1.5 shrink-0 rounded-full bg-indigo-500"></span>
							<span>{item}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-3 text-xs text-indigo-900/60">Belum ada saran tambahan.</p>
			{/if}
		</div>
	</div>
</section>
