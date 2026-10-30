<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Boxes,
		Check,
		Pencil,
		Plus,
		RefreshCw,
		Sparkles,
		Star,
		Trash2,
		Users,
		Zap
	} from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/superadmin/Alert.svelte';
	import Modal from '#lib/components/superadmin/Modal.svelte';
	import { formatDateShort, formatNumber } from '#lib/components/superadmin/format.js';
	import RichText from '#lib/components/superadmin/RichText.svelte';
	import RichTextEditor from '#lib/components/superadmin/RichTextEditor.svelte';
	import { tierLabel, tierTone } from '#lib/components/superadmin/status.js';
	import {
		createPackageApi,
		deletePackageApi,
		listPackagesApi,
		togglePackageApi,
		updatePackageApi,
		type BillingPeriod,
		type PackageTier,
		type SubscriptionPackage,
		type SubscriptionPackageInput
	} from '#lib/services/superadminApi.js';
	import {
		billingPeriodLabel,
		formatRupiah,
		quotaLabel
	} from '#lib/utils/billing.js';
	import { isEmptyRichText, sanitizeRichText } from '#lib/utils/richText.js';

	const inputClass =
		'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30';
	const tiers: PackageTier[] = ['FREE', 'STARTER', 'PRO', 'UNLIMITED'];
	const billingPeriods: BillingPeriod[] = ['FOREVER', 'MONTHLY', 'YEARLY'];
	const MAX_QUOTA = 2_147_483_647;
	const tierDefaultPrice: Record<PackageTier, string> = {
		FREE: '0',
		STARTER: '15000',
		PRO: '39000',
		UNLIMITED: '79000'
	};

	let packages = $state<SubscriptionPackage[]>([]);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	let modalOpen = $state(false);
	let editing = $state<SubscriptionPackage | null>(null);
	let formName = $state('');
	let formTier = $state<PackageTier>('PRO');
	let formSubtitle = $state('');
	let formPrice = $state('39000');
	let formOriginalPrice = $state('');
	let formBillingPeriod = $state<BillingPeriod>('MONTHLY');
	let formDuration = $state('30');
	let formButtonLabel = $state('');
	let formBadge = $state('');
	let formIsPopular = $state(false);
	let formSortOrder = $state('0');
	let formAiTokenLimit = $state('0');
	let formCvExtraction = $state('0');
	let formPsychotest = $state('0');
	let formJobScoring = $state('0');
	let formExternalJob = $state('0');
	let formEmailApplications = $state('0');
	let formFeatureItems = $state<Array<{ id: string; html: string }>>([]);
	let formActive = $state(true);
	let isSaving = $state(false);
	let formError = $state<string | null>(null);

	let deleteTarget = $state<SubscriptionPackage | null>(null);
	let isDeleting = $state(false);
	let togglingId = $state<string | null>(null);

	function errorText(error: unknown, fallback: string): string {
		return error instanceof Error ? error.message : fallback;
	}

	function featureId(): string {
		if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
			return crypto.randomUUID();
		}
		return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
	}

	function addFeature() {
		formFeatureItems = [...formFeatureItems, { id: featureId(), html: '' }];
	}

	function updateFeature(id: string, html: string) {
		formFeatureItems = formFeatureItems.map((item) =>
			item.id === id ? { ...item, html } : item
		);
	}

	function removeFeature(id: string) {
		formFeatureItems = formFeatureItems.filter((item) => item.id !== id);
	}

	function integerValue(
		value: string,
		label: string,
		min: number,
		max = Number.MAX_SAFE_INTEGER
	): number | null {
		const parsed = Number(value);
		if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
			formError = `${label} harus bilangan bulat ${min}–${max}.`;
			return null;
		}
		return parsed;
	}

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			packages = await listPackagesApi();
		} catch (error) {
			loadError = errorText(error, 'Daftar paket belum dapat dimuat.');
		} finally {
			isLoading = false;
		}
	}

	function openCreate() {
		editing = null;
		formName = '';
		formTier = 'PRO';
		formSubtitle = '';
		formPrice = tierDefaultPrice.PRO;
		formOriginalPrice = '';
		formBillingPeriod = 'MONTHLY';
		formDuration = '30';
		formButtonLabel = '';
		formBadge = '';
		formIsPopular = false;
		formSortOrder = '0';
		formAiTokenLimit = '0';
		formCvExtraction = '0';
		formPsychotest = '0';
		formJobScoring = '0';
		formExternalJob = '0';
		formEmailApplications = '0';
		formFeatureItems = [{ id: featureId(), html: '' }];
		formActive = true;
		formError = null;
		modalOpen = true;
	}

	function openEdit(pkg: SubscriptionPackage) {
		editing = pkg;
		formName = pkg.name;
		formTier = pkg.tier;
		formSubtitle = pkg.subtitle ?? '';
		formPrice = String(pkg.price);
		formOriginalPrice = pkg.originalPrice != null ? String(pkg.originalPrice) : '';
		formBillingPeriod = pkg.billingPeriod;
		formDuration = String(pkg.durationDays);
		formButtonLabel = pkg.buttonLabel ?? '';
		formBadge = pkg.badge ?? '';
		formIsPopular = pkg.isPopular;
		formSortOrder = String(pkg.sortOrder);
		formAiTokenLimit = String(pkg.aiTokenLimit);
		formCvExtraction = String(pkg.quotas.cvExtraction);
		formPsychotest = String(pkg.quotas.psychotest);
		formJobScoring = String(pkg.quotas.jobScoring);
		formExternalJob = String(pkg.quotas.externalJobExtraction);
		formEmailApplications = String(pkg.quotas.emailApplications);
		formFeatureItems =
			pkg.features.length > 0
				? pkg.features.map((feature) => ({
						id: featureId(),
						html: sanitizeRichText(feature)
					}))
				: [{ id: featureId(), html: '' }];
		formActive = pkg.isActive;
		formError = null;
		modalOpen = true;
	}

	function closeModal() {
		if (isSaving) return;
		modalOpen = false;
	}

	function changeTier(value: string) {
		formTier = value as PackageTier;
		if (!editing) {
			formPrice = tierDefaultPrice[formTier];
			if (formTier === 'FREE') {
				formBillingPeriod = 'FOREVER';
				formDuration = '36500';
			} else if (formBillingPeriod === 'FOREVER') {
				formBillingPeriod = 'MONTHLY';
				formDuration = '30';
			}
		}
	}

	async function savePackage() {
		if (isSaving) return;
		formError = null;

		const name = formName.trim();
		const subtitle = formSubtitle.trim();
		const price = Number(formPrice);
		const originalPriceRaw = String(formOriginalPrice).trim();
		const originalPrice = originalPriceRaw ? Number(originalPriceRaw) : null;

		if (!name) {
			formError = 'Nama paket wajib diisi.';
			return;
		}
		if (name.length > 160) {
			formError = 'Nama paket maksimal 160 karakter.';
			return;
		}
		if (subtitle.length > 240) {
			formError = 'Subtitle maksimal 240 karakter.';
			return;
		}
		if (!Number.isFinite(price) || price < 0) {
			formError = 'Harga harus berupa angka ≥ 0.';
			return;
		}
		if (originalPrice !== null && (!Number.isFinite(originalPrice) || originalPrice < 0)) {
			formError = 'Harga coret harus berupa angka ≥ 0 atau dikosongkan.';
			return;
		}
		const durationDays = integerValue(formDuration, 'Durasi', 1, 36500);
		if (durationDays === null) return;
		const sortOrder = integerValue(formSortOrder, 'Urutan tampil', 0, 1000);
		if (sortOrder === null) return;
		const aiTokenLimit = integerValue(formAiTokenLimit, 'Limit token AI', -1, MAX_QUOTA);
		if (aiTokenLimit === null) return;
		const cvExtractionLimit = integerValue(formCvExtraction, 'Kuota CV', -1, MAX_QUOTA);
		if (cvExtractionLimit === null) return;
		const psychotestLimit = integerValue(formPsychotest, 'Kuota psikotes', -1, MAX_QUOTA);
		if (psychotestLimit === null) return;
		const jobScoringLimit = integerValue(formJobScoring, 'Kuota scoring', -1, MAX_QUOTA);
		if (jobScoringLimit === null) return;
		const externalJobExtractionLimit = integerValue(
			formExternalJob,
			'Kuota loker luar',
			-1,
			MAX_QUOTA
		);
		if (externalJobExtractionLimit === null) return;
		const emailApplicationLimit = integerValue(
			formEmailApplications,
			'Kuota email lamaran',
			-1,
			MAX_QUOTA
		);
		if (emailApplicationLimit === null) return;

		const buttonLabel = formButtonLabel.trim();
		const badge = formBadge.trim();
		if (buttonLabel.length > 80) {
			formError = 'Label tombol maksimal 80 karakter.';
			return;
		}
		if (badge.length > 80) {
			formError = 'Badge maksimal 80 karakter.';
			return;
		}

		const features = formFeatureItems
			.map((item) => sanitizeRichText(item.html))
			.filter((html) => !isEmptyRichText(html));

		const payload: SubscriptionPackageInput = {
			name,
			tier: formTier,
			subtitle: subtitle || null,
			price,
			originalPrice,
			billingPeriod: formBillingPeriod,
			durationDays,
			buttonLabel: buttonLabel || null,
			badge: badge || null,
			isPopular: formIsPopular,
			sortOrder,
			aiTokenLimit,
			cvExtractionLimit,
			psychotestLimit,
			jobScoringLimit,
			externalJobExtractionLimit,
			emailApplicationLimit,
			features,
			isActive: formActive
		};

		isSaving = true;
		errorMessage = null;
		successMessage = null;
		try {
			if (editing) {
				await updatePackageApi(editing.id, payload);
				successMessage = 'Paket berhasil diperbarui.';
			} else {
				await createPackageApi(payload);
				successMessage = 'Paket baru berhasil dibuat.';
			}
			modalOpen = false;
			await load();
		} catch (error) {
			formError = errorText(error, 'Paket belum dapat disimpan.');
		} finally {
			isSaving = false;
		}
	}

	async function handleToggle(pkg: SubscriptionPackage) {
		if (togglingId) return;
		togglingId = pkg.id;
		errorMessage = null;
		successMessage = null;
		try {
			const updated = await togglePackageApi(pkg.id);
			packages = packages.map((item) => (item.id === updated.id ? updated : item));
			successMessage = `Paket "${updated.name}" ${updated.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`;
		} catch (error) {
			errorMessage = errorText(error, 'Status paket belum dapat diubah.');
		} finally {
			togglingId = null;
		}
	}

	async function removePackage() {
		if (!deleteTarget || isDeleting) return;
		const target = deleteTarget;
		isDeleting = true;
		errorMessage = null;
		successMessage = null;
		try {
			await deletePackageApi(target.id);
			deleteTarget = null;
			successMessage = `Paket "${target.name}" berhasil dihapus.`;
			await load();
		} catch (error) {
			errorMessage = errorText(error, 'Paket belum dapat dihapus.');
			deleteTarget = null;
		} finally {
			isDeleting = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>Subscription Packages | Superadmin</title>
</svelte:head>

<div class="space-y-6">
	<header class="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
		<div>
			<p class="text-sm font-semibold text-amber-300">Monetization</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight text-white">Subscription Packages</h1>
			<p class="mt-2 text-sm text-slate-400">
				Kelola paket, metadata kartu landing page, kuota fitur, harga, dan status tampil.
			</p>
		</div>
		<button
			type="button"
			onclick={openCreate}
			class="inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400"
		>
			<Plus size={16} /> Buat Paket Baru
		</button>
	</header>

	{#if errorMessage}
		<Alert type="error" message={errorMessage} dismissible ondismiss={() => (errorMessage = null)} />
	{/if}
	{#if successMessage}
		<Alert type="success" message={successMessage} dismissible ondismiss={() => (successMessage = null)} />
	{/if}

	{#if isLoading}
		<div class="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
			<Spinner label="Memuat paket" /> Memuat paket...
		</div>
	{:else if loadError}
		<div class="mx-auto max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
			<p class="text-sm text-rose-300" role="alert">{loadError}</p>
			<button
				type="button"
				onclick={() => void load()}
				class="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
			>
				<RefreshCw size={15} /> Coba lagi
			</button>
		</div>
	{:else if packages.length === 0}
		<div class="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center">
			<span class="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
				<Boxes size={24} />
			</span>
			<h2 class="mt-4 text-lg font-semibold text-white">Belum ada paket</h2>
			<p class="mt-1 text-sm text-slate-400">Buat paket langganan pertama untuk mulai monetisasi.</p>
			<button
				type="button"
				onclick={openCreate}
				class="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400"
			>
				<Plus size={16} /> Buat Paket Baru
			</button>
		</div>
	{:else}
		<div class="grid gap-4 xl:grid-cols-2">
			{#each packages as pkg (pkg.id)}
				<article class="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5 {pkg.isPopular ? 'ring-1 ring-inset ring-indigo-500/40' : ''}">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-1.5">
								<span class="rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset {tierTone[pkg.tier]}">
									{tierLabel[pkg.tier]}
								</span>
								{#if pkg.isPopular}
									<span class="rounded-full bg-indigo-500/10 px-2.5 py-1 text-[10px] font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-500/20">
										<Star size={10} class="mr-1 inline" /> Popular
									</span>
								{/if}
								{#if pkg.badge}
									<span class="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-300 ring-1 ring-inset ring-amber-500/20">
										{pkg.badge}
									</span>
								{/if}
							</div>
							<h2 class="mt-2 text-lg font-bold text-white">{pkg.name}</h2>
							{#if pkg.subtitle}
								<p class="mt-1 text-xs leading-5 text-slate-400">{pkg.subtitle}</p>
							{/if}
						</div>
						<button
							type="button"
							role="switch"
							aria-checked={pkg.isActive}
							aria-label="Aktifkan/nonaktifkan {pkg.name}"
							onclick={() => void handleToggle(pkg)}
							disabled={togglingId === pkg.id}
							class="relative mt-1 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition {pkg.isActive
								? 'bg-emerald-500'
								: 'bg-slate-700'} disabled:opacity-60"
						>
							<span
								class="inline-block size-4 transform rounded-full bg-white transition {pkg.isActive
									? 'translate-x-4'
									: 'translate-x-0.5'}"
							></span>
						</button>
					</div>

					<div class="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
						{#if pkg.originalPrice != null && pkg.originalPrice > pkg.price}
							<span class="text-sm text-slate-500 line-through">{formatRupiah(pkg.originalPrice)}</span>
						{/if}
						<span class="text-2xl font-bold text-white">{formatRupiah(pkg.price)}</span>
						<span class="text-xs text-slate-500">/ {billingPeriodLabel(pkg.billingPeriod)}</span>
					</div>

					<div class="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
						<div class="rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2">
							<p class="text-[9px] uppercase tracking-wide text-slate-500">CV</p>
							<p class="mt-0.5 font-semibold text-slate-200">{quotaLabel(pkg.quotas.cvExtraction, 'x')}</p>
						</div>
						<div class="rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2">
							<p class="text-[9px] uppercase tracking-wide text-slate-500">Psikotes</p>
							<p class="mt-0.5 font-semibold text-slate-200">{quotaLabel(pkg.quotas.psychotest, 'x')}</p>
						</div>
						<div class="rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2">
							<p class="text-[9px] uppercase tracking-wide text-slate-500">Scoring</p>
							<p class="mt-0.5 font-semibold text-slate-200">{quotaLabel(pkg.quotas.jobScoring, 'x')}</p>
						</div>
						<div class="rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2">
							<p class="text-[9px] uppercase tracking-wide text-slate-500">Loker luar</p>
							<p class="mt-0.5 font-semibold text-slate-200">
								{quotaLabel(pkg.quotas.externalJobExtraction, 'x')}
							</p>
						</div>
						<div class="rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2">
							<p class="text-[9px] uppercase tracking-wide text-slate-500">Email lamaran</p>
							<p class="mt-0.5 font-semibold text-slate-200">
								{quotaLabel(pkg.quotas.emailApplications, 'x')}
							</p>
						</div>
						<div class="rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2">
							<p class="text-[9px] uppercase tracking-wide text-slate-500">Token AI</p>
							<p class="mt-0.5 font-semibold text-slate-200">{quotaLabel(pkg.aiTokenLimit, 'token')}</p>
						</div>
					</div>

					<div class="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
						<span class="inline-flex items-center gap-1">
							<Users size={11} /> {formatNumber(pkg.subscriberCount)} subscriber
						</span>
						<span class="text-slate-700">·</span>
						<span class="inline-flex items-center gap-1"><Zap size={11} /> urutan {pkg.sortOrder}</span>
						<span class="text-slate-700">·</span>
						<span>{pkg.features.length} fitur</span>
						{#if pkg.buttonLabel}
							<span class="text-slate-700">·</span>
							<span>CTA: {pkg.buttonLabel}</span>
						{/if}
					</div>

					{#if pkg.features.length > 0}
						<ul class="mt-3 space-y-1.5">
							{#each pkg.features.slice(0, 3) as feature}
								<li class="flex items-start gap-1.5 text-[11px] leading-4 text-slate-400">
									<Check size={11} class="mt-0.5 shrink-0 text-emerald-400" />
									<span class="min-w-0"><RichText html={feature} /></span>
								</li>
							{/each}
							{#if pkg.features.length > 3}
								<li class="text-[10px] text-slate-500">+{pkg.features.length - 3} fitur lainnya</li>
							{/if}
						</ul>
					{/if}

					<div class="mt-auto flex flex-wrap items-center gap-1.5 border-t border-slate-800 pt-3">
						<button
							type="button"
							onclick={() => openEdit(pkg)}
							class="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-200"
						>
							<Pencil size={13} /> Edit
						</button>
						<button
							type="button"
							onclick={() => (deleteTarget = pkg)}
							class="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10"
						>
							<Trash2 size={13} /> Hapus
						</button>
						<span class="ml-auto text-[10px] text-slate-500">
							Dibuat {formatDateShort(pkg.createdAt)}
						</span>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>

<Modal
	open={modalOpen}
	title={editing ? 'Edit Paket Langganan' : 'Buat Paket Baru'}
	description="Metadata landing page, harga, kuota fitur, dan status tampil."
	size="lg"
	onclose={closeModal}
>
	<div class="space-y-4">
		{#if formError}
			<Alert type="error" message={formError} />
		{/if}

		<div class="grid gap-4 sm:grid-cols-2">
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Nama paket <span class="text-rose-400">*</span>
				<input bind:value={formName} maxlength="160" placeholder="Contoh: Pro Plan" class={inputClass} />
			</label>
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Tier <span class="text-rose-400">*</span>
				<select value={formTier} onchange={(event) => changeTier(event.currentTarget.value)} class={inputClass}>
					{#each tiers as tier}
						<option value={tier}>{tierLabel[tier]}</option>
					{/each}
				</select>
			</label>
		</div>

		<label class="block space-y-1.5 text-sm font-medium text-slate-300">
			Subtitle
			<input
				bind:value={formSubtitle}
				maxlength="240"
				placeholder="Sub-teks singkat di bawah nama/harga"
				class={inputClass}
			/>
		</label>

		<div class="grid gap-4 sm:grid-cols-2">
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Harga (IDR) <span class="text-rose-400">*</span>
				<input bind:value={formPrice} type="number" min="0" class={inputClass} />
			</label>
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Harga coret (IDR)
				<input bind:value={formOriginalPrice} type="number" min="0" placeholder="Opsional" class={inputClass} />
			</label>
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Periode billing
				<select bind:value={formBillingPeriod} class={inputClass}>
					{#each billingPeriods as period}
						<option value={period}>{billingPeriodLabel(period)}</option>
					{/each}
				</select>
			</label>
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Durasi internal (hari) <span class="text-rose-400">*</span>
				<input bind:value={formDuration} type="number" min="1" max="36500" class={inputClass} />
				<p class="text-[10px] font-normal text-slate-500">Free Plan biasanya 36500 hari.</p>
			</label>
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Label tombol
				<input bind:value={formButtonLabel} maxlength="80" placeholder="Contoh: Ambil Paket Pro" class={inputClass} />
			</label>
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Badge
				<input bind:value={formBadge} maxlength="80" placeholder="Contoh: ⭐ Paling Direkomendasikan" class={inputClass} />
			</label>
			<label class="block space-y-1.5 text-sm font-medium text-slate-300">
				Urutan tampil
				<input bind:value={formSortOrder} type="number" min="0" max="1000" class={inputClass} />
			</label>
			<div class="flex flex-col justify-end gap-3">
				<label class="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300">
					<input type="checkbox" bind:checked={formIsPopular} class="h-4 w-4 rounded border-slate-600 bg-slate-950 text-indigo-500" />
					Tandai popular (highlight landing)
				</label>
				<label class="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300">
					<input type="checkbox" bind:checked={formActive} class="h-4 w-4 rounded border-slate-600 bg-slate-950 text-indigo-500" />
					Aktif / tampil di landing
				</label>
			</div>
		</div>

		<div>
			<p class="text-sm font-medium text-slate-300">Kuota fitur</p>
			<p class="mt-0.5 text-[11px] text-slate-500">
				Isi <strong class="text-slate-300">-1</strong> untuk unlimited. Nilai
				<strong class="text-slate-300">0</strong> dianggap belum dikonfigurasi dan memakai fallback tier saat assignment.
			</p>
			<div class="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<label class="block space-y-1.5 text-xs font-medium text-slate-400">
					Kuota CV
					<input bind:value={formCvExtraction} type="number" min="-1" class={inputClass} />
				</label>
				<label class="block space-y-1.5 text-xs font-medium text-slate-400">
					Kuota psikotes
					<input bind:value={formPsychotest} type="number" min="-1" class={inputClass} />
				</label>
				<label class="block space-y-1.5 text-xs font-medium text-slate-400">
					Kuota scoring
					<input bind:value={formJobScoring} type="number" min="-1" class={inputClass} />
				</label>
				<label class="block space-y-1.5 text-xs font-medium text-slate-400">
					Kuota ekstraksi loker luar
					<input bind:value={formExternalJob} type="number" min="-1" class={inputClass} />
				</label>
				<label class="block space-y-1.5 text-xs font-medium text-slate-400">
					Kuota email lamaran
					<input bind:value={formEmailApplications} type="number" min="-1" class={inputClass} />
				</label>
				<label class="block space-y-1.5 text-xs font-medium text-slate-400">
					Limit token AI
					<input bind:value={formAiTokenLimit} type="number" min="-1" class={inputClass} />
				</label>
			</div>
		</div>

		<div class="space-y-2">
			<div class="flex flex-wrap items-start justify-between gap-2">
				<div>
					<p class="text-sm font-medium text-slate-300">Fitur paket</p>
					<p class="mt-0.5 text-[11px] text-slate-500">
						Pilih teks lalu gunakan tombol <strong class="text-slate-300">B</strong>,
						<em class="text-slate-300">I</em>, <u class="text-slate-300">U</u>, atau coret.
					</p>
				</div>
				<button
					type="button"
					onclick={addFeature}
					class="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-slate-700 px-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
				>
					<Plus size={14} /> Tambah Fitur
				</button>
			</div>

			<div class="space-y-2">
				{#each formFeatureItems as item, index (item.id)}
					<div class="flex items-start gap-2">
						<div class="min-w-0 flex-1">
							<RichTextEditor
								value={item.html}
								onchange={(html) => updateFeature(item.id, html)}
								placeholder={`Fitur ${index + 1}`}
							/>
						</div>
						<button
							type="button"
							onclick={() => removeFeature(item.id)}
							aria-label="Hapus fitur"
							class="mt-1 rounded-lg p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
						>
							<Trash2 size={14} />
						</button>
					</div>
				{/each}
				{#if formFeatureItems.length === 0}
					<p
						class="rounded-lg border border-dashed border-slate-700 px-3 py-4 text-center text-xs text-slate-500"
					>
						Belum ada fitur. Klik "Tambah Fitur".
					</p>
				{/if}
			</div>
		</div>

		{#if formBadge}
			<div class="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-[11px] text-slate-400">
				<Sparkles size={14} class="text-amber-300" /> Preview badge:
				<span class="rounded-full bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-300 ring-1 ring-inset ring-amber-500/20">
					{formBadge}
				</span>
			</div>
		{/if}
	</div>

	{#snippet footer()}
		<button
			type="button"
			onclick={closeModal}
			disabled={isSaving}
			class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
		>
			Batal
		</button>
		<button
			type="button"
			onclick={() => void savePackage()}
			disabled={isSaving}
			class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
		>
			{#if isSaving}<Spinner label="Menyimpan" />{/if}
			{editing ? 'Simpan Perubahan' : 'Buat Paket'}
		</button>
	{/snippet}
</Modal>

<Modal
	open={deleteTarget !== null}
	title="Hapus paket langganan?"
	description="Paket akan dihapus permanen dari katalog."
	onclose={() => (isDeleting ? undefined : (deleteTarget = null))}
>
	{#if deleteTarget}
		<div class="space-y-3">
			<p class="text-sm text-slate-300">
				Apakah kamu yakin ingin menghapus <strong class="text-white">{deleteTarget.name}</strong>?
			</p>
			<p class="text-xs text-rose-300">
				Paket yang masih dipakai subscription user tidak dapat dihapus.
			</p>
		</div>
	{/if}

	{#snippet footer()}
		<button
			type="button"
			onclick={() => (deleteTarget = null)}
			disabled={isDeleting}
			class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
		>
			Batal
		</button>
		<button
			type="button"
			onclick={() => void removePackage()}
			disabled={isDeleting}
			class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-60"
		>
			{#if isDeleting}<Spinner label="Menghapus" />{/if}
			Hapus
		</button>
	{/snippet}
</Modal>
