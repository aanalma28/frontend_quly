<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Plug } from '@lucide/svelte';

	onMount(() => {
		const search = window.location.search;
		void goto(`/dashboard/integrations${search}`, { replaceState: true });
	});
</script>

<svelte:head>
	<title>Integrasi | AI Job Hunter</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-[#f7f8fc] px-4">
	<div class="flex items-center gap-2 text-sm text-slate-500">
		<Plug size={17} /> Membuka halaman integrasi...
	</div>
</main>
