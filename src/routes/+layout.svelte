<script lang="ts">
	import { onMount } from 'svelte';
	import { initializeAuth, logout } from '#lib/stores/auth.js';
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	onMount(() => {
		void initializeAuth();
		const handleUnauthorized = () => void logout();
		window.addEventListener('auth:unauthorized', handleUnauthorized);
		return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>AI Job Hunter</title>
</svelte:head>

{@render children()}
