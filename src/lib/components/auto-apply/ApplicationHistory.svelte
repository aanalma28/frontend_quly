<script lang="ts">
	import {
		AlertTriangle,
		CheckCircle2,
		ChevronLeft,
		ChevronRight,
		Clock3,
		MailCheck,
		RefreshCw,
		Send
	} from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import type {
		AutoApplyApplication,
		AutoApplyApplicationsResponse
	} from '#lib/services/autoApplyApi.js';

	interface Props {
		response: AutoApplyApplicationsResponse | null;
		loading: boolean;
		error: string | null;
		onrefresh: () => void;
		onpage: (page: number) => void;
	}

	let { response, loading, error, onrefresh, onpage }: Props = $props();

	const statusLabel: Record<AutoApplyApplication['status'], string> = {
		PENDING: 'Dalam antrean',
		SENT: 'Terkirim',
		READ: 'Dibaca',
		REPLIED: 'Dibalas',
		FAILED: 'Gagal'
	};

	const statusTone: Record<AutoApplyApplication['status'], string> = {
		PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
		SENT: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
		READ: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
		REPLIED: 'bg-violet-50 text-violet-700 ring-violet-200',
		FAILED: 'bg-rose-50 text-rose-700 ring-rose-200'
	};

	const statusIcon: Record<AutoApplyApplication['status'], typeof Clock3> = {
		PENDING: Clock3,
		SENT: Send,
		READ: CheckCircle2,
		REPLIED: MailCheck,
		FAILED: AlertTriangle
	};

	function dateLabel(value: string | null): string {
		if (!value) return '—';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '—';
		return new Intl.DateTimeFormat('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}
</script>

<section class="space-y-4">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<p class="text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-600">Status lamaran</p>
			<h2 class="mt-1 text-xl font-bold tracking-tight text-slate-950">Riwayat pengiriman</h2>
			<p class="mt-1 text-xs text-slate-500">
				Worker mengirim email di background. Status akan diperbarui otomatis.
			</p>
		</div>
		<button
			type="button"
			onclick={onrefresh}
			disabled={loading}
			class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
		>
			{#if loading}<Spinner label="Memuat riwayat" />{:else}<RefreshCw size={14} />{/if}
			Refresh
		</button>
	</div>

	{#if error}
		<div class="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</div>
	{:else if loading && !response}
		<div class="flex items-center justify-center gap-2 py-14 text-sm text-slate-500">
			<Spinner label="Memuat lamaran" /> Memuat riwayat lamaran...
		</div>
	{:else if !response || response.items.length === 0}
		<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
			<span class="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><MailCheck size={24} /></span>
			<h3 class="mt-3 text-sm font-bold text-slate-900">Belum ada lamaran</h3>
			<p class="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
				Setelah kamu mengirim lamaran otomatis, progres email akan muncul di sini.
			</p>
		</div>
	{:else}
		<div class="space-y-2.5">
			{#each response.items as application (application.id)}
				{@const Icon = statusIcon[application.status]}
				<article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
					<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div class="flex min-w-0 gap-3">
							<span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
								<Icon size={18} />
							</span>
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-2">
									<h3 class="truncate text-sm font-bold text-slate-900">{application.jobTitle}</h3>
									<span class="rounded-full px-2 py-0.5 text-[9px] font-bold ring-1 ring-inset {statusTone[application.status]}">
										{statusLabel[application.status]}
									</span>
								</div>
								<p class="mt-0.5 text-xs text-slate-500">{application.companyName}</p>
								<p class="mt-1 truncate text-[10px] text-slate-400">{application.subject}</p>
								<p class="mt-1 text-[10px] text-slate-400">HRD: {application.recipientEmail}</p>
								{#if application.failureReason}
									<p class="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[10px] leading-4 text-rose-700">{application.failureReason}</p>
								{/if}
							</div>
						</div>
						<div class="shrink-0 text-left text-[10px] text-slate-400 sm:text-right">
							<p>Dibuat {dateLabel(application.createdAt)}</p>
							{#if application.sentAt}<p class="text-indigo-500">Terkirim {dateLabel(application.sentAt)}</p>{/if}
							{#if application.readAt}<p class="text-emerald-600">Dibaca {dateLabel(application.readAt)}</p>{/if}
						</div>
					</div>
				</article>
			{/each}
		</div>

		{#if response.meta.totalPages > 1}
			<div class="flex items-center justify-center gap-3 pt-2">
				<button
					type="button"
					onclick={() => onpage(response.meta.page - 1)}
					disabled={response.meta.page <= 1 || loading}
					class="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
				>
					<ChevronLeft size={14} /> Sebelumnya
				</button>
				<span class="text-xs text-slate-500">Halaman {response.meta.page} / {response.meta.totalPages}</span>
				<button
					type="button"
					onclick={() => onpage(response.meta.page + 1)}
					disabled={response.meta.page >= response.meta.totalPages || loading}
					class="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
				>
					Berikutnya <ChevronRight size={14} />
				</button>
			</div>
		{/if}
	{/if}
</section>
