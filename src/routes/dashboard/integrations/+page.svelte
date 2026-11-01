<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { ArrowLeft, CheckCircle2, Plug, ShieldCheck } from '@lucide/svelte';
	import GmailIntegrationCard from '#lib/components/auto-apply/GmailIntegrationCard.svelte';
	import WhatsAppIntegrationCard from '#lib/components/auto-apply/WhatsAppIntegrationCard.svelte';
	import {
		disconnectGmailApi,
		getGmailConnectUrlApi,
		getGmailStatusApi
	} from '#lib/services/autoApplyApi.js';
	import { auth } from '#lib/stores/auth.js';

	let gmailConnected = $state<boolean | null>(null);
	let loading = $state(true);
	let connecting = $state(false);
	let disconnecting = $state(false);
	let error = $state<string | null>(null);
	let notice = $state<string | null>(null);

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

	async function connectGmail() {
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

	async function disconnectGmail() {
		if (disconnecting) return;
		if (!window.confirm('Putuskan koneksi Gmail? Auto-apply tidak dapat mengirim email sampai kamu menghubungkannya kembali.')) return;
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

	onMount(() => {
		void loadStatus();
	});
</script>

<svelte:head>
	<title>Integrasi & Koneksi | AI Job Hunter</title>
	<meta
		name="description"
		content="Hubungkan Gmail dan WhatsApp untuk mendukung pengiriman lamaran otomatis."
	/>
</svelte:head>

<div class="space-y-6">
	<header>
		<a href="/dashboard/auto-apply" class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-indigo-700">
			<ArrowLeft size={14} /> Kembali ke Auto-Apply
		</a>
		<div class="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
			<div>
				<p class="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
					<Plug size={14} /> Integrasi akun
				</p>
				<h1 class="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
					Koneksi & Integrasi
				</h1>
				<p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
					Kelola kanal pengiriman lamaranmu. Integrasi Gmail aktif; WhatsApp akan tersedia setelah endpoint backend disiapkan.
				</p>
			</div>
		</div>
	</header>

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
		onconnect={() => void connectGmail()}
		ondisconnect={() => void disconnectGmail()}
		onretry={() => void loadStatus()}
	/>

	<WhatsAppIntegrationCard />

	<section class="rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-5 text-slate-500 shadow-sm">
		<p class="flex items-center gap-1.5 font-semibold text-slate-800">
			<ShieldCheck size={15} class="text-emerald-600" /> Keamanan koneksi
		</p>
		<ul class="mt-2 list-disc space-y-1 pl-5">
			<li>Token Gmail disimpan terenkripsi di server dan tidak dikirim ke browser.</li>
			<li>Kamu dapat memutuskan Gmail kapan saja dari halaman ini.</li>
			<li>WhatsApp belum terhubung karena endpoint backend belum tersedia.</li>
		</ul>
	</section>
</div>
