<script lang="ts">
	import { Info } from '@lucide/svelte';
</script>

<section
	class="overflow-hidden rounded-2xl border border-sky-500/20 bg-sky-500/5"
	aria-labelledby="telegram-endpoint-notes-title"
>
	<header class="flex flex-wrap items-start justify-between gap-3 border-b border-sky-500/10 px-5 py-4">
		<div class="flex items-start gap-3">
			<span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-300 ring-1 ring-inset ring-sky-500/30">
				<Info size={17} />
			</span>
			<div>
				<h2 id="telegram-endpoint-notes-title" class="text-sm font-semibold text-white">
					Catatan Telegram Scraping
				</h2>
				<p class="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
					Listener dan scrape massal memakai endpoint berbeda, tetapi berbagi cursor
					<code class="rounded bg-slate-950 px-1 text-slate-300">lastMessageId</code> yang sama.
				</p>
			</div>
		</div>
		<span class="rounded-full bg-sky-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-300 ring-1 ring-inset ring-sky-500/30">
			SUPER_ADMIN
		</span>
	</header>

	<div class="grid gap-4 px-5 py-5 lg:grid-cols-3">
		<div class="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
			<p class="text-[10px] font-bold uppercase tracking-wide text-emerald-300">
				Listener continuous
			</p>
			<p class="mt-1 text-sm font-semibold text-white">START / STOP listener</p>
			<p class="mt-2 text-xs leading-5 text-slate-400">
				Menyalakan listener Telegram yang berjalan terus sampai di-STOP. Pesan baru diproses
				real-time, dan listener juga melakukan catch-up dari cursor terakhir.
			</p>
			<ul class="mt-3 space-y-1.5 text-[11px] leading-4 text-slate-400">
				<li>• Cursor kosong: ambil 1 pesan terbaru untuk seed cursor.</li>
				<li>• Cursor ada: catch-up pesan setelah cursor.</li>
				<li>• Catch-up listener maksimal ±1.000 pesan per source per siklus.</li>
				<li>• STOP listener tidak menghentikan scrape massal.</li>
			</ul>
			<code class="mt-3 block rounded-lg bg-slate-950 px-2.5 py-2 text-[10px] text-emerald-200">
				POST /api/superadmin/telegram/toggle
			</code>
		</div>

		<div class="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
			<p class="text-[10px] font-bold uppercase tracking-wide text-indigo-300">
				Scrape massal
			</p>
			<p class="mt-1 text-sm font-semibold text-white">CURSOR / TODAY</p>
			<p class="mt-2 text-xs leading-5 text-slate-400">
				Scrape run adalah proses sekali jalan, bukan listener. Jika listener sedang aktif,
				push/poll listener dijeda selama run dan kembali normal setelah run selesai.
			</p>
			<ul class="mt-3 space-y-1.5 text-[11px] leading-4 text-slate-400">
				<li>• <strong class="text-slate-200">CURSOR:</strong> melanjutkan dari pesan terakhir.</li>
				<li>• <strong class="text-slate-200">TODAY:</strong> mengambil pesan sejak 00:00 hari ini.</li>
				<li>• <code class="text-slate-300">maxMessagesPerSource</code> hanya membatasi mode TODAY.</li>
				<li>• CURSOR memakai batas internal ±10 batch × 100 pesan per source.</li>
				<li>• Stop run memakai <code class="text-slate-300">/telegram/run/stop</code>.</li>
			</ul>
			<code class="mt-3 block rounded-lg bg-slate-950 px-2.5 py-2 text-[10px] text-indigo-200">
				POST /api/superadmin/telegram/run
			</code>
		</div>

		<div class="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
			<p class="text-[10px] font-bold uppercase tracking-wide text-amber-300">
				Perbedaan singkat
			</p>
			<p class="mt-1 text-sm font-semibold text-white">START listener ≠ Scrape TODAY</p>
			<div class="mt-3 grid gap-2 text-[11px] leading-4">
				<div class="rounded-lg bg-emerald-500/5 px-2.5 py-2">
					<p class="font-semibold text-emerald-200">START listener</p>
					<p class="mt-0.5 text-slate-400">Berjalan terus, menunggu pesan baru real-time.</p>
				</div>
				<div class="rounded-lg bg-indigo-500/5 px-2.5 py-2">
					<p class="font-semibold text-indigo-200">Scrape TODAY</p>
					<p class="mt-0.5 text-slate-400">Sekali jalan, mengambil pesan hari ini, lalu berhenti.</p>
				</div>
			</div>
			<p class="mt-3 text-[11px] leading-4 text-slate-500">
				Status run: <strong class="text-slate-300">RUNNING</strong> →
				<strong class="text-slate-300">STOPPING</strong> →
				<strong class="text-slate-300">CANCELLED</strong>. Job dan cursor yang sudah selesai tetap tersimpan.
			</p>
			<div class="mt-3 flex flex-wrap gap-1.5">
				<code class="rounded bg-slate-950 px-2 py-1 text-[9px] text-slate-400">
					POST /telegram/run/stop
				</code>
				<code class="rounded bg-slate-950 px-2 py-1 text-[9px] text-slate-400">
					GET /telegram/status
				</code>
			</div>
		</div>
	</div>

	<footer class="border-t border-sky-500/10 px-5 py-3 text-[10px] leading-4 text-slate-500">
		Scrape massal berjalan di background. Saat <strong class="text-slate-400">RUNNING</strong> atau
		<strong class="text-slate-400">STOPPING</strong>, status dipoll setiap 2–3 detik. Dedupe
		<code class="rounded bg-slate-950 px-1 text-slate-400">sourceUrl</code> mencegah job yang sama
		masuk dua kali.
	</footer>
</section>
