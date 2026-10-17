<script lang="ts">
	import {
		ArrowDownRight,
		ArrowRight,
		ArrowUpRight,
		BriefcaseBusiness,
		Check,
		Clock3,
		Mail,
		MoreHorizontal,
		Plus,
		Sparkles,
		Target
	} from '@lucide/svelte';

	const metrics = [
		{
			label: 'Lamaran terkirim',
			value: '24',
			delta: '+18%',
			direction: 'up',
			icon: Mail,
			tone: 'indigo'
		},
		{
			label: 'Menunggu respons',
			value: '12',
			delta: '4 baru',
			direction: 'flat',
			icon: Clock3,
			tone: 'amber'
		},
		{
			label: 'Peluang tersimpan',
			value: '38',
			delta: '+6 minggu ini',
			direction: 'up',
			icon: BriefcaseBusiness,
			tone: 'emerald'
		},
		{
			label: 'Skor kesiapan',
			value: '82%',
			delta: '+8%',
			direction: 'up',
			icon: Target,
			tone: 'violet'
		}
	] as const;

	const applications = [
		{
			company: 'Nusa Teknologi',
			role: 'Frontend Developer',
			date: 'Hari ini, 09:42',
			status: 'Terkirim',
			initials: 'NT',
			color: 'bg-blue-100 text-blue-700'
		},
		{
			company: 'Kreasi Digital',
			role: 'Product Designer',
			date: 'Kemarin, 15:18',
			status: 'Ditinjau',
			initials: 'KD',
			color: 'bg-orange-100 text-orange-700'
		},
		{
			company: 'Awan Data',
			role: 'Junior Data Analyst',
			date: '14 Okt 2026, 11:06',
			status: 'Terkirim',
			initials: 'AD',
			color: 'bg-emerald-100 text-emerald-700'
		}
	];
</script>

<svelte:head>
	<title>Ringkasan | AI Job Hunter</title>
	<meta
		name="description"
		content="Pantau lamaran kerja, temukan peluang baru, dan kelola persiapan karier."
	/>
</svelte:head>

<div class="space-y-7">
	<section class="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
		<div>
			<div class="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
				<Sparkles size={14} />
				Asisten karier AI
			</div>
			<h1 class="text-3xl font-semibold tracking-tight text-slate-950 sm:text-[34px]">
				Selamat datang kembali!
			</h1>
			<p class="mt-2 text-sm text-slate-500 sm:text-base">
				Ini ringkasan progres pencarian kerjamu minggu ini.
			</p>
		</div>
		<a
			href="/dashboard/manual-hub"
			class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700"
		>
			<Plus size={17} />
			Jelajahi lowongan
		</a>
	</section>

	<div class="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
		<span class="shrink-0 rounded-md bg-amber-100 px-2 py-0.5 font-bold">DATA DEMO</span>
		<span>Angka dan riwayat di halaman ini adalah contoh tampilan, belum berasal dari backend.</span>
	</div>

	<section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan metrik">
		{#each metrics as metric}
			<article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/70">
				<div class="flex items-start justify-between">
					<div class="flex size-10 items-center justify-center rounded-xl {metric.tone === 'indigo'
						? 'bg-indigo-50 text-indigo-600'
						: metric.tone === 'amber'
							? 'bg-amber-50 text-amber-600'
							: metric.tone === 'emerald'
								? 'bg-emerald-50 text-emerald-600'
								: 'bg-violet-50 text-violet-600'}">
						<metric.icon size={19} strokeWidth={1.8} />
					</div>
					<button type="button" aria-label="Opsi {metric.label}" class="text-slate-400 hover:text-slate-700">
						<MoreHorizontal size={20} />
					</button>
				</div>
				<p class="mt-5 text-sm text-slate-500">{metric.label}</p>
				<div class="mt-1 flex items-end justify-between gap-2">
					<p class="text-3xl font-semibold tracking-tight text-slate-950">{metric.value}</p>
					<span class="mb-1 inline-flex items-center gap-1 text-xs font-semibold {metric.direction === 'up'
						? 'text-emerald-600'
						: 'text-amber-600'}">
						{#if metric.direction === 'up'}
							<ArrowUpRight size={14} />
						{:else}
							<ArrowDownRight size={14} />
						{/if}
						{metric.delta}
					</span>
				</div>
			</article>
		{/each}
	</section>

	<section class="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
		<article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100/70">
			<div class="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
				<div>
					<h2 class="text-base font-semibold text-slate-950">Aktivitas lamaran</h2>
					<p class="mt-1 text-xs text-slate-500">Pantau status lamaran terakhirmu</p>
				</div>
				<a href="/dashboard/auto-apply" class="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800">
					Lihat semua <ArrowRight size={14} />
				</a>
			</div>
			<div class="divide-y divide-slate-100">
				{#each applications as application}
					<div class="flex items-center gap-3 px-5 py-4 sm:gap-4 sm:px-6">
						<div class="flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold {application.color}">
							{application.initials}
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-semibold text-slate-900">{application.role}</p>
							<p class="mt-1 truncate text-xs text-slate-500">{application.company} · {application.date}</p>
						</div>
						<span class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
							<Check size={12} />
							{application.status}
						</span>
					</div>
				{/each}
			</div>
		</article>

		<article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/70 sm:p-6">
			<div class="flex items-start justify-between">
				<div>
					<h2 class="text-base font-semibold text-slate-950">Langkah berikutnya</h2>
					<p class="mt-1 text-xs text-slate-500">Tingkatkan kesiapan kariermu</p>
				</div>
				<div class="flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
					<Sparkles size={18} />
				</div>
			</div>

			<div class="mt-5 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white">
				<p class="text-xs font-medium text-indigo-100">Profil karier</p>
				<p class="mt-1 text-2xl font-semibold">Lengkapi profilmu</p>
				<p class="mt-2 text-xs leading-5 text-indigo-100">
					Unggah CV agar rekomendasi lowongan lebih sesuai dengan pengalamanmu.
				</p>
				<a href="/onboarding" class="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50">
					Lengkapi profil <ArrowRight size={14} />
				</a>
			</div>

			<a
				href="/psychotest"
				class="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/40"
			>
				<span class="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
					<Target size={18} />
				</span>
				<span class="min-w-0 flex-1">
					<span class="block text-sm font-semibold text-slate-800">Coba tes kesiapan kerja</span>
					<span class="mt-1 block text-xs text-slate-500">Pauli &amp; Kraepelin</span>
				</span>
				<ArrowRight size={16} class="text-slate-400" />
			</a>
		</article>
	</section>
</div>
