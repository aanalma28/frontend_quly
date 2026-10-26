<script lang="ts">
	import type { Component } from 'svelte';

	interface Props {
		label: string;
		value: string;
		hint?: string;
		icon: Component;
		tone?: 'indigo' | 'emerald' | 'violet' | 'amber' | 'cyan' | 'rose';
	}

	let { label, value, hint, icon: Icon, tone = 'indigo' }: Props = $props();

	const toneClass: Record<string, string> = {
		indigo: 'bg-indigo-500/10 text-indigo-300 ring-indigo-500/20',
		emerald: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
		violet: 'bg-violet-500/10 text-violet-300 ring-violet-500/20',
		amber: 'bg-amber-500/10 text-amber-300 ring-amber-500/20',
		cyan: 'bg-cyan-500/10 text-cyan-300 ring-cyan-500/20',
		rose: 'bg-rose-500/10 text-rose-300 ring-rose-500/20'
	};
</script>

<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
	<div class="flex items-start justify-between gap-3">
		<p class="text-xs font-medium text-slate-400">{label}</p>
		<span class="flex size-9 items-center justify-center rounded-lg ring-1 {toneClass[tone]}">
			<Icon size={17} />
		</span>
	</div>
	<p class="mt-3 text-2xl font-bold tracking-tight text-white">{value}</p>
	{#if hint}
		<p class="mt-1 text-[11px] text-slate-500">{hint}</p>
	{/if}
</div>
