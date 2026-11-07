<script lang="ts">
	import { onMount } from 'svelte';
	import { initializeAuth, logout } from '#lib/stores/auth.js';
	import './layout.css';
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
	<link rel="icon" href="/favicon.ico?v=20261105-2" sizes="any" />
	<link rel="icon" href="/favicon-32.png?v=20261105-2" type="image/png" sizes="32x32" />
	<link rel="icon" href="/favicon-48.png?v=20261105-2" type="image/png" sizes="48x48" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20261105-2" />
	<link rel="manifest" href="/site.webmanifest" />
	<meta name="theme-color" content="#1b4db1" />
	<title>Quly — AI Job Hunter</title>
</svelte:head>

{@render children()}
