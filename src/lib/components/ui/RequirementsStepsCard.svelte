<script lang="ts">
	import { ArrowRight, Check, Lock, ShieldCheck } from '@lucide/svelte';

	interface RequirementStep {
		number: number;
		title: string;
		description: string;
		completed: boolean;
		href: string;
	}

	interface Props {
		title: string;
		description?: string;
		steps: RequirementStep[];
	}

	let { title, description, steps }: Props = $props();

	const completedCount = $derived(steps.filter((step) => step.completed).length);
	const nextStep = $derived(steps.find((step) => !step.completed) ?? null);
	const progressPct = $derived(
		steps.length === 0 ? 0 : Math.round((completedCount / steps.length) * 100)
	);
	const ctaLabel = $derived(
		nextStep ? (nextStep.number === 1 ? 'Lengkapi Profil' : 'Mulai Tes Psikotes') : 'Lanjutkan'
	);
</script>

<section class="mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
	<header class="border-b border-slate-100 bg-gradient-to-br from-indigo-50 to-white px-6 py-6 sm:px-8">
		<div class="flex items-start gap-4">
			<span
				class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200"
			>
				<ShieldCheck size={22} />
			</span>
			<div>
				<p class="text-xs font-bold uppercase tracking-[0.15em] text-indigo-600">Akses fitur</p>
				<h1 class="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{title}</h1>
				{#if description}
					<p class="mt-1.5 text-sm leading-6 text-slate-600">{description}</p>
				{/if}
			</div>
		</div>

		<div class="mt-5">
			<div class="flex items-center justify-between text-xs text-slate-500">
				<span>{completedCount} dari {steps.length} langkah selesai</span>
				<span class="font-semibold text-slate-700">{progressPct}%</span>
			</div>
			<div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
				<div
					class="h-full rounded-full bg-indigo-500 transition-all duration-500"
					style:width="{progressPct}%"
				></div>
			</div>
		</div>
	</header>

	<ol class="px-6 py-6 sm:px-8">
		{#each steps as step, index (step.number)}
			<li class="relative flex gap-4 {index < steps.length - 1 ? 'pb-9' : ''}">
				{#if index < steps.length - 1}
					<span
						class="absolute left-5 top-11 bottom-1 w-px -translate-x-1/2 bg-slate-200"
						aria-hidden="true"
					></span>
				{/if}

				<span
					class="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold {step.completed
						? 'bg-emerald-500 text-white'
						: nextStep?.number === step.number
							? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
							: 'bg-slate-100 text-slate-400'}"
				>
					{#if step.completed}
						<Check size={18} strokeWidth={2.6} />
					{:else}
						{step.number}
					{/if}
				</span>

				<div class="min-w-0 flex-1 pt-0.5">
					<div class="flex flex-wrap items-center gap-2">
						<h2 class="text-sm font-semibold text-slate-900">{step.title}</h2>
						{#if step.completed}
							<span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
								Selesai
							</span>
						{:else if nextStep?.number === step.number}
							<span class="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
								Langkah berikutnya
							</span>
						{:else}
							<span
								class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500"
							>
								<Lock size={10} /> Terkunci
							</span>
						{/if}
					</div>
					<p class="mt-1 text-sm leading-6 text-slate-500">{step.description}</p>
					{#if nextStep?.number === step.number}
						<a
							href={step.href}
							class="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
						>
							{step.number === 1 ? 'Lengkapi sekarang' : 'Mulai sekarang'}
							<ArrowRight size={14} />
						</a>
					{/if}
				</div>
			</li>
		{/each}
	</ol>

	{#if nextStep}
		<footer class="border-t border-slate-100 bg-slate-50/60 px-6 py-5 sm:px-8">
			<a
				href={nextStep.href}
				class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 sm:w-auto"
			>
				{ctaLabel} <ArrowRight size={16} />
			</a>
		</footer>
	{/if}
</section>
