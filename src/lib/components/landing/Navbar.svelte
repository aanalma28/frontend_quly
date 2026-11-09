<script lang="ts">
	import { ArrowRight, Menu, X } from '@lucide/svelte';
	import QulyLogo from '#lib/components/ui/QulyLogo.svelte';
	import LogoutConfirmModal from '#lib/components/auth/LogoutConfirmModal.svelte';
	import { auth, logout } from '#lib/stores/auth.js';

	let menuOpen = $state(false);
	let logoutOpen = $state(false);
	let loggingOut = $state(false);

	function closeMenu() {
		menuOpen = false;
	}

	function openLogoutConfirm() {
		menuOpen = false;
		logoutOpen = true;
	}

	function closeLogoutConfirm() {
		if (loggingOut) return;
		logoutOpen = false;
	}

	async function confirmLogout() {
		if (loggingOut) return;
		loggingOut = true;
		try {
			await logout();
		} finally {
			loggingOut = false;
			logoutOpen = false;
		}
	}
</script>

<svelte:window
	onkeydown={(event) => {
		if (menuOpen && event.key === 'Escape') menuOpen = false;
	}}
/>

<header class="site-header">
	<nav class="nav-shell" aria-label="Navigasi utama">
		<a class="brand" href="/" aria-label="Quly, beranda" onclick={closeMenu}>
			<QulyLogo size={34} />
		</a>

		<div class="nav-links">
			<a href="#fitur">Fitur</a>
			<a href="#cara-kerja">Cara kerja</a>
			<a href="#harga">Harga</a>
		</div>

		<div class="nav-actions">
			{#if $auth.isAuthenticated}
				<a
					class="login-link"
					href="/auth/login"
					onclick={(event) => {
						event.preventDefault();
						openLogoutConfirm();
					}}>Keluar</a
				>
				<a class="button button-small" href="/dashboard">
					Dashboard <ArrowRight size={15} />
				</a>
			{:else}
				<a class="login-link" href="/auth/login">Masuk</a>
				<a class="button button-small" href="/auth/register">
					Mulai gratis <ArrowRight size={15} />
				</a>
			{/if}
			<button
				type="button"
				class="nav-toggle"
				aria-expanded={menuOpen}
				aria-controls="landing-mobile-menu"
				aria-label={menuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
				onclick={() => (menuOpen = !menuOpen)}
			>
				{#if menuOpen}
					<X size={19} />
				{:else}
					<Menu size={19} />
				{/if}
			</button>
		</div>
	</nav>

	{#if menuOpen}
		<nav id="landing-mobile-menu" class="nav-mobile" aria-label="Navigasi mobile">
			<a href="#fitur" onclick={closeMenu}>Fitur</a>
			<a href="#cara-kerja" onclick={closeMenu}>Cara kerja</a>
			<a href="#harga" onclick={closeMenu}>Harga</a>
			{#if $auth.isAuthenticated}
				<a href="/dashboard" onclick={closeMenu}>Dashboard</a>
			{:else}
				<a href="/auth/login" onclick={closeMenu}>Masuk</a>
			{/if}
		</nav>
	{/if}
</header>

<LogoutConfirmModal
	open={logoutOpen}
	loading={loggingOut}
	onconfirm={() => void confirmLogout()}
	oncancel={closeLogoutConfirm}
/>
