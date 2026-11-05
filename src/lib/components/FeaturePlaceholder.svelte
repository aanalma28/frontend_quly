<script lang="ts">
	import { ArrowLeft, Construction } from '@lucide/svelte';
	import { goto } from '$app/navigation';

	interface Props {
		title: string;
		description: string;
		nextStep: string;
	}

	let { title, description, nextStep }: Props = $props();
</script>

<svelte:head>
	<title>{title} | Quly</title>
	<meta name="description" content={description} />
</svelte:head>

<section class="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
	<div class="mb-8 flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
		<Construction size={26} strokeWidth={1.8} />
	</div>
	<p class="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
		Bagian dari Quly
	</p>
	<h1 class="text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
	<p class="mt-4 max-w-2xl text-base leading-7 text-slate-600">{description}</p>
	<div class="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
		<p class="text-sm font-semibold text-slate-800">Langkah integrasi berikutnya</p>
		<p class="mt-2 text-sm leading-6 text-slate-600">{nextStep}</p>
	</div>
	<button
		class="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
		onclick={() => goto('/dashboard')}
	>
		<ArrowLeft size={16} />
		Kembali ke dashboard
	</button>
</section>
