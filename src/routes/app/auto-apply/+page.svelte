<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		void goto('/dashboard/auto-apply', { replaceState: true });
	});
</script>

<svelte:head>
	<title>Auto-Apply | AI Job Hunter</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-[#f7f8fc] px-4">
	<p class="text-sm text-slate-500">Membuka Auto-Apply...</p>
</main>
