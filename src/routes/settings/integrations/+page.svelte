<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { ArrowLeft, CheckCircle2, Settings2, ShieldCheck } from '@lucide/svelte';
	import GmailIntegrationCard from '#lib/components/auto-apply/GmailIntegrationCard.svelte';
	import {
		disconnectGmailApi,
		getGmailConnectUrlApi,
		getGmailStatusApi
	} from '#lib/services/autoApplyApi.js';
	import { auth, initializeAuth } from '#lib/stores/auth.js';

	let gmailConnected = $state<boolean | null>(null);
	let loading = $state(true);
	let connecting = $state(false);
	let disconnecting = $state(false);
	let error = $state<string | null>(null);
	let notice = $state<string | null>(null);
	let authenticated = $state(false);

	const queryStatus = $derived(page.url.searchParams.get('gmail'));
	const userEmail = $derived($auth.user?.email ?? '');

	async function loadStatus() {
		loading = true;
		error = null;
		try {
			const status = await getGmailStatusApi();
			gmailConnected = status.connected;
			if (queryStatus === 'connected' && status.connected) {
				notice = 'Gmail berhasil terhubung. Auto-Apply siap digunakan.';
			} else if (queryStatus === 'error') {
				notice = null;
				error = 'Koneksi Gmail dibatalkan atau gagal. Silakan coba lagi.';
			}
		} catch (caught) {
			error = caught instanceof Error ? caught.message : 'Status Gmail belum dapat dimuat.';
		} finally {
			loading = false;
		}
	}

	async function connect() {
		if (connecting) return;
		connecting = true;
		error = null;
		try {
			const response = await getGmailConnectUrlApi();
			window.location.assign(response.authUrl);
		} catch (caught) {
			error = caught instanceof Error ? caught.message : 'Gagal membuka koneksi Gmail.';
			connecting = false;
		}
	}

	async function disconnect() {
		if (disconnecting) return;
		if (!window.confirm('Putuskan koneksi Gmail dari Quly?')) return;
		disconnecting = true;
		error = null;
		try {
			const response = await disconnectGmailApi();
			gmailConnected = response.connected;
			notice = 'Koneksi Gmail berhasil diputuskan.';
		} catch (caught) {
			error = caught instanceof Error ? caught.message : 'Gmail belum dapat diputuskan.';
		} finally {
			disconnecting = false;
		}
	}

	onMount(async () => {
		const ok = await initializeAuth();
		if (!ok) {
			await goto('/auth/login?redirectTo=%2Fsettings%2Fintegrations');
			return;
		}
		authenticated = true;
		await loadStatus();
	});
</script>

<svelte:head>
	<title>Integrasi Gmail | AI Job Hunter</title>
</svelte:head>

<div class="min-h-screen bg-[#f7f8fc] px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
	<div class="mx-auto max-w-3xl space-y-6">
		<a href="/dashboard/auto-apply" class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-indigo-700">
			<ArrowLeft size={14} /> Kembali ke Auto-Apply
		</a>

		<header>
			<p class="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-700">
				<Settings2 size={12} /> Integrasi akun
			</p>
			<h1 class="mt-2 text-2xl font-bold tracking-tight text-slate-950">Gmail Auto-Apply</h1>
			<p class="mt-1 max-w-xl text-sm leading-6 text-slate-500">
				Quly memakai izin <code class="rounded bg-slate-100 px-1 py-0.5 text-xs">gmail.send</code> hanya
				untuk mengirim lamaran atas namamu. Refresh token disimpan terenkripsi di server.
			</p>
		</header>

		{#if authenticated}
			{#if notice}
				<div class="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
					<CheckCircle2 size={17} class="mt-0.5 shrink-0" /> {notice}
				</div>
			{/if}
			<GmailIntegrationCard
				connected={gmailConnected}
				loading={loading}
				connecting={connecting}
				disconnecting={disconnecting}
				email={userEmail}
				error={error}
				onconnect={() => void connect()}
				ondisconnect={() => void disconnect()}
				onretry={() => void loadStatus()}
			/>

			<section class="rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-5 text-slate-500 shadow-sm">
				<p class="flex items-center gap-1.5 font-semibold text-slate-800"><ShieldCheck size={15} class="text-emerald-600" /> Keamanan koneksi</p>
				<ul class="mt-2 list-disc space-y-1 pl-5">
					<li>Token akses Gmail tidak pernah dikirim ke browser pengguna.</li>
					<li>Kamu dapat memutuskan koneksi kapan saja dari halaman ini.</li>
					<li>Email hanya dikirim ketika kamu menekan tombol kirim lamaran otomatis.</li>
				</ul>
			</section>
		{:else}
			<div class="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
				<div class="size-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600"></div>
				Memeriksa sesi...
			</div>
		{/if}
	</div>
</div>
