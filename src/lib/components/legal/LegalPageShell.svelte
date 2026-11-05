<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ArrowLeft, CalendarDays, FileText, ShieldCheck } from '@lucide/svelte';
	import QulyLogo from '#lib/components/ui/QulyLogo.svelte';

	interface Props {
		title: string;
		description: string;
		updated: string;
		eyebrow: string;
		active: 'privacy' | 'terms';
		children: Snippet;
	}

	let { title, description, updated, eyebrow, active, children }: Props = $props();
</script>

<svelte:head>
	<title>{title} | Quly</title>
	<meta name="description" content={description} />
	<meta name="robots" content="index,follow" />
</svelte:head>

<main class="min-h-screen bg-[#f6f8fd] text-slate-800">
	<header class="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
		<div class="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
			<a href="/" aria-label="Quly, beranda" class="shrink-0">
				<QulyLogo size={31} />
			</a>
			<a
				href="/"
				class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
			>
				<ArrowLeft size={14} /> Kembali ke Beranda
			</a>
		</div>
	</header>

	<div class="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
		<header class="max-w-3xl">
			<p class="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-700">
				{#if active === 'privacy'}
					<ShieldCheck size={13} />
				{:else}
					<FileText size={13} />
				{/if}
				{eyebrow}
			</p>
			<h1 class="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
				{title}
			</h1>
			<p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
				{description}
			</p>
			<p class="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
				<CalendarDays size={14} /> Terakhir Diperbarui: {updated}
			</p>
		</header>

		<article
			class="mt-8 rounded-3xl border border-slate-200/90 bg-white px-5 py-2 shadow-sm shadow-slate-200/40 sm:px-9 sm:py-3"
		>
			{@render children()}
		</article>

		<footer class="mt-8 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
			<div class="flex items-center gap-3">
				<QulyLogo size={26} />
				<p class="text-xs text-slate-500">Quly — AI Job Hunter</p>
			</div>
			<nav aria-label="Dokumen legal" class="flex flex-wrap items-center gap-4 text-xs font-semibold">
				<a
					href="/privacy"
					class={active === 'privacy' ? 'text-indigo-700' : 'text-slate-500 hover:text-indigo-700'}
				>
					Kebijakan Privasi
				</a>
				<a
					href="/terms"
					class={active === 'terms' ? 'text-indigo-700' : 'text-slate-500 hover:text-indigo-700'}
				>
					Syarat &amp; Ketentuan
				</a>
				<a href="/" class="text-slate-500 hover:text-indigo-700">Beranda</a>
			</nav>
		</footer>
	</div>
</main>
