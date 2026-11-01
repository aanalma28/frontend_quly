<script lang="ts">
	import { Clock3, MessageCircle } from '@lucide/svelte';
	import WhatsAppIcon from '#lib/components/ui/WhatsAppIcon.svelte';
</script>

<section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/60 sm:p-6" aria-labelledby="whatsapp-card-title">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex items-start gap-3">
			<span class="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white shadow-sm">
				<WhatsAppIcon size={28} />
			</span>
			<div>
				<p class="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-600">Integrasi pesan</p>
				<h2 id="whatsapp-card-title" class="mt-1 text-lg font-bold tracking-tight text-slate-950">
					WhatsApp Business
				</h2>
				<p class="mt-1 max-w-xl text-xs leading-5 text-slate-500">
					Hubungkan WhatsApp untuk mengirim pesan lamaran ke HRD yang mencantumkan kontak WhatsApp.
					Integrasi ini disiapkan untuk alur yang akan datang.
				</p>
			</div>
		</div>
		<span class="inline-flex h-8 shrink-0 items-center gap-1.5 self-start rounded-full bg-slate-100 px-3 text-xs font-bold text-slate-500 ring-1 ring-inset ring-slate-200">
			<Clock3 size={14} /> Segera hadir
		</span>
	</div>

	<div class="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
		<p class="flex items-center gap-1.5 text-xs text-slate-500">
			<MessageCircle size={14} /> Endpoint koneksi WhatsApp belum tersedia di backend.
		</p>
		<button
			type="button"
			disabled
			class="ml-auto inline-flex h-9 cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-400"
			title="Integrasi WhatsApp belum tersedia"
		>
			<WhatsAppIcon size={18} /> Hubungkan WhatsApp
		</button>
	</div>
</section>
