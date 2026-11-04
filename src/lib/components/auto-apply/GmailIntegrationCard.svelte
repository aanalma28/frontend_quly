<script lang="ts">
	import { AlertTriangle, CheckCircle2, Link2, RefreshCw, Unplug } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import GmailIcon from '#lib/components/ui/GmailIcon.svelte';

	interface Props {
		connected: boolean | null;
		loading: boolean;
		connecting: boolean;
		disconnecting: boolean;
		email?: string;
		error?: string | null;
		onconnect: () => void;
		ondisconnect: () => void;
		onretry?: () => void;
	}

	let {
		connected,
		loading,
		connecting,
		disconnecting,
		email = '',
		error = null,
		onconnect,
		ondisconnect,
		onretry
	}: Props = $props();
</script>

<section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/60 sm:p-6" aria-labelledby="gmail-card-title">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex items-start gap-3">
			<span class="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white shadow-sm">
				<GmailIcon size={28} />
			</span>
			<div>
				<p class="text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-600">Integrasi pengiriman</p>
				<h2 id="gmail-card-title" class="mt-1 text-lg font-bold tracking-tight text-slate-950">
					Gmail untuk Auto-Apply
				</h2>
				<p class="mt-1 max-w-xl text-xs leading-5 text-slate-500">
					Hubungkan Gmail agar Quly dapat mengirim email lamaran beserta CV dan sertifikat
					psikotes langsung dari akunmu. Quly meminta izin
					<code class="rounded bg-slate-100 px-1 py-0.5 text-[10px]">gmail.send</code> dan
					<code class="rounded bg-slate-100 px-1 py-0.5 text-[10px]">gmail.readonly</code> agar
					balasan HRD dapat dideteksi otomatis.
				</p>
				<p class="mt-1.5 max-w-xl text-[10px] leading-4 text-amber-700">
					Jika Gmail sudah terhubung sebelum fitur balasan otomatis tersedia, putuskan lalu
					hubungkan ulang agar izin baca aktif.
				</p>
			</div>
		</div>

		{#if loading}
			<span class="inline-flex h-8 items-center gap-2 self-start rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-500">
				<Spinner label="Memeriksa Gmail" /> Memeriksa...
			</span>
		{:else if connected}
			<span class="inline-flex h-8 shrink-0 items-center gap-1.5 self-start rounded-full bg-emerald-50 px-3 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-100">
				<CheckCircle2 size={14} /> Gmail Terhubung
			</span>
		{:else}
			<span class="inline-flex h-8 shrink-0 items-center gap-1.5 self-start rounded-full bg-amber-50 px-3 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-100">
				<AlertTriangle size={14} /> Belum terhubung
			</span>
		{/if}
	</div>

	{#if error}
		<div class="mt-4 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs text-rose-700" role="alert">
			<AlertTriangle size={15} class="mt-0.5 shrink-0" />
			<span>{error}</span>
			{#if onretry}
				<button type="button" onclick={onretry} class="ml-auto inline-flex shrink-0 items-center gap-1 font-semibold underline">
					<RefreshCw size={12} /> Coba lagi
				</button>
			{/if}
		</div>
	{/if}

	<div class="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
		{#if connected}
			<p class="text-xs text-slate-500">
				Email akan dikirim dari akun Gmail yang terhubung{email ? `: ${email}` : ''}.
			</p>
			<button
				type="button"
				onclick={ondisconnect}
				disabled={disconnecting}
				class="ml-auto inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{#if disconnecting}<Spinner label="Memutuskan Gmail" />{:else}<Unplug size={14} />{/if}
				Putuskan
			</button>
		{:else}
			<p class="text-xs text-slate-500">Wajib terhubung sebelum mengirim lamaran.</p>
			<button
				type="button"
				onclick={onconnect}
				disabled={loading || connecting}
				class="ml-auto inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{#if connecting}<Spinner label="Menghubungkan Gmail" />{:else}<Link2 size={14} />{/if}
				Hubungkan Gmail untuk Auto-Apply
			</button>
		{/if}
	</div>
</section>
