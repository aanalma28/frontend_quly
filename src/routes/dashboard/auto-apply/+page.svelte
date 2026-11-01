<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import {
		AlertTriangle,
		CheckCircle2,
		Clock3,
		Coins,
		FileText,
		RefreshCw,
		Send,
		Sparkles,
		X
	} from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import ApplicationHistory from '#lib/components/auto-apply/ApplicationHistory.svelte';
	import DocumentSetup from '#lib/components/auto-apply/DocumentSetup.svelte';
	import EmailPreviewDrawer from '#lib/components/auto-apply/EmailPreviewDrawer.svelte';
	import ExtractJobModal from '#lib/components/auto-apply/ExtractJobModal.svelte';
	import GmailIntegrationCard from '#lib/components/auto-apply/GmailIntegrationCard.svelte';
	import JobChecklist from '#lib/components/auto-apply/JobChecklist.svelte';
	import {
		bookmarkToAutoApplyOption,
		disconnectGmailApi,
		getGmailConnectUrlApi,
		getGmailStatusApi,
		listAutoApplyApplicationsApi,
		prepareAutoApplyApi,
		previewEmailApi,
		type AutoApplyApplicationsResponse,
		type AutoApplyJobOption,
		type EmailDraftPreview
	} from '#lib/services/autoApplyApi.js';
	import {
		getMyBenefitsApi,
		type MyBenefitsResponse
	} from '#lib/services/billingApi.js';
	import {
		downloadCvApi,
		listCvsApi,
		uploadCvApi,
		type CvFileMetadata
	} from '#lib/services/cvApi.js';
	import { listJobsApi } from '#lib/services/jobApi.js';
	import {
		downloadCertificateApi,
		getSessionsApi,
		type SessionHistoryItem
	} from '#lib/services/psychotestApi.js';
	import { ApiError } from '#lib/utils/api.js';
	import { formatNumber, isUnlimitedQuota } from '#lib/utils/billing.js';
	import { auth } from '#lib/stores/auth.js';

	type Tab = 'prepare' | 'history';
	type Toast = { type: 'success' | 'error' | 'info'; message: string };

	let activeTab = $state<Tab>('prepare');
	let toast = $state<Toast | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | null = null;

	let gmailConnected = $state<boolean | null>(null);
	let gmailLoading = $state(true);
	let gmailConnecting = $state(false);
	let gmailDisconnecting = $state(false);
	let gmailError = $state<string | null>(null);

	let cvs = $state<CvFileMetadata[]>([]);
	let selectedCvId = $state('');
	let uploadedCvId = $state<string | null>(null);
	let cvPreviewUrl = $state<string | null>(null);
	let loadingCvs = $state(true);
	let uploadingCv = $state(false);
	let cvError = $state<string | null>(null);

	let psychotestSessions = $state<SessionHistoryItem[]>([]);
	let selectedPsychotestId = $state('');
	let loadingPsychotest = $state(true);
	let psychotestError = $state<string | null>(null);

	let jobOptions = $state<AutoApplyJobOption[]>([]);
	let loadingBookmarks = $state(true);
	let bookmarkError = $state<string | null>(null);
	let extractOpen = $state(false);

	let benefits = $state<MyBenefitsResponse | null>(null);
	let benefitsLoading = $state(true);
	let benefitsError = $state<string | null>(null);

	let previewOpen = $state(false);
	let previews = $state<Record<string, EmailDraftPreview>>({});
	let preparing = $state(false);

	let applications = $state<AutoApplyApplicationsResponse | null>(null);
	let applicationsLoading = $state(false);
	let applicationsError = $state<string | null>(null);
	let applicationsPage = $state(1);

	const emailBenefit = $derived(
		benefits?.benefits.find((benefit) => benefit.code === 'EMAIL_APPLICATION') ?? null
	);
	const selectedOptions = $derived(jobOptions.filter((option) => option.selected));
	const selectedCount = $derived(selectedOptions.length);
	const creditBalance = $derived(benefits?.creditBalance ?? 0);
	const quotaRemaining = $derived(
		emailBenefit
			? isUnlimitedQuota(emailBenefit.limit)
				? Number.MAX_SAFE_INTEGER
				: Math.max(emailBenefit.remaining, 0)
			: 0
	);
	const quotaCovered = $derived(
		emailBenefit && isUnlimitedQuota(emailBenefit.limit)
			? selectedCount
			: Math.min(selectedCount, quotaRemaining)
	);
	const creditsRequired = $derived(
		Math.max(0, selectedCount - quotaCovered) * (emailBenefit?.creditCost ?? 1)
	);
	const allSelectedEmailsValid = $derived(
		selectedOptions.every((option) => isEmail(option.recipientEmail))
	);
	const missingEmailCount = $derived(
		selectedOptions.filter((option) => !isEmail(option.recipientEmail)).length
	);
	const hasBenefit = $derived(Boolean(emailBenefit));
	const canAfford = $derived(
		hasBenefit && creditsRequired <= creditBalance
	);
	const canPrepare = $derived(
		gmailConnected === true &&
			Boolean(selectedCvId) &&
			selectedCount > 0 &&
			allSelectedEmailsValid &&
			canAfford &&
			!preparing
	);
	const blockedReason = $derived.by(() => {
		if (gmailConnected !== true) return 'Hubungkan Gmail terlebih dahulu.';
		if (!selectedCvId) return 'Pilih atau unggah CV utama.';
		if (benefitsLoading) return 'Memeriksa kuota email...';
		if (!hasBenefit) return 'Benefit Email Lamaran belum aktif di paketmu.';
		if (selectedCount === 0) return 'Centang minimal satu loker.';
		if (!allSelectedEmailsValid) return `Lengkapi ${missingEmailCount} email HRD yang kosong.`;
		if (!canAfford) return `Kredit kurang: butuh ${formatNumber(creditsRequired)} kredit, saldo ${formatNumber(creditBalance)}.`;
		return null;
	});

	function isEmail(value: string): boolean {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
	}

	function errorText(error: unknown, fallback: string): string {
		return error instanceof Error ? error.message : fallback;
	}

	function showToast(message: string, type: Toast['type'] = 'success') {
		toast = { message, type };
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = null), 5000);
	}

	async function loadGmailStatus() {
		gmailLoading = true;
		gmailError = null;
		try {
			const status = await getGmailStatusApi();
			gmailConnected = status.connected;
		} catch (error) {
			gmailConnected = null;
			gmailError = errorText(error, 'Status Gmail belum dapat dimuat.');
		} finally {
			gmailLoading = false;
		}
	}

	async function connectGmail() {
		if (gmailConnecting) return;
		gmailConnecting = true;
		gmailError = null;
		try {
			const response = await getGmailConnectUrlApi();
			if (!response.authUrl) throw new Error('URL koneksi Gmail tidak tersedia.');
			window.location.assign(response.authUrl);
		} catch (error) {
			gmailError = errorText(error, 'Gagal membuka koneksi Gmail.');
			gmailConnecting = false;
		}
	}

	async function disconnectGmail() {
		if (gmailDisconnecting) return;
		if (!window.confirm('Putuskan koneksi Gmail? Auto-apply tidak dapat mengirim email sampai kamu menghubungkannya kembali.')) return;
		gmailDisconnecting = true;
		gmailError = null;
		try {
			const response = await disconnectGmailApi();
			gmailConnected = response.connected;
			showToast('Gmail berhasil diputuskan.', 'info');
		} catch (error) {
			gmailError = errorText(error, 'Gmail belum dapat diputuskan.');
		} finally {
			gmailDisconnecting = false;
		}
	}

	async function loadCvs() {
		loadingCvs = true;
		cvError = null;
		try {
			cvs = await listCvsApi();
			const current = cvs.find((cv) => cv.id === selectedCvId);
			const primary = cvs.find((cv) => cv.isPrimary);
			selectedCvId = current?.id ?? primary?.id ?? cvs[0]?.id ?? '';
			if (selectedCvId !== uploadedCvId) {
				clearCvPreview();
			}
		} catch (error) {
			cvError = errorText(error, 'Daftar CV belum dapat dimuat.');
		} finally {
			loadingCvs = false;
		}
	}

	function clearCvPreview() {
		if (cvPreviewUrl) URL.revokeObjectURL(cvPreviewUrl);
		cvPreviewUrl = null;
	}

	function selectCv(id: string) {
		selectedCvId = id;
		if (id !== uploadedCvId) clearCvPreview();
	}

	async function uploadCv(file: File) {
		cvError = null;
		if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
			cvError = 'CV harus berupa PDF.';
			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			cvError = 'Ukuran CV maksimal 5 MB.';
			return;
		}
		uploadingCv = true;
		try {
			const uploaded = await uploadCvApi(file, true);
			uploadedCvId = uploaded.id;
			selectedCvId = uploaded.id;
			clearCvPreview();
			cvPreviewUrl = URL.createObjectURL(file);
			await loadCvs();
			showToast('CV berhasil diunggah dan dijadikan CV utama.');
		} catch (error) {
			cvError = errorText(error, 'CV belum dapat diunggah.');
		} finally {
			uploadingCv = false;
		}
	}

	async function previewCv() {
		if (!selectedCvId) {
			showToast('Pilih CV utama terlebih dahulu.', 'info');
			return;
		}
		const popup = window.open('', '_blank');
		try {
			let url = cvPreviewUrl;
			if (!url) {
				const blob = await downloadCvApi(selectedCvId);
				url = URL.createObjectURL(blob);
				setTimeout(() => URL.revokeObjectURL(url as string), 60_000);
			}
			if (popup) popup.location.href = url;
			else window.open(url, '_blank', 'noopener,noreferrer');
		} catch (error) {
			popup?.close();
			cvError = errorText(error, 'CV belum dapat dibuka.');
		}
	}

	async function loadPsychotestSessions() {
		loadingPsychotest = true;
		psychotestError = null;
		try {
			const response = await getSessionsApi();
			psychotestSessions = (response.items ?? []).filter(
				(session) => session.status === 'COMPLETED' && session.certificateAvailable
			);
			if (!psychotestSessions.some((session) => session.sessionId === selectedPsychotestId)) {
				selectedPsychotestId = '';
			}
		} catch (error) {
			psychotestError = errorText(error, 'Sertifikat psikotes belum dapat dimuat.');
		} finally {
			loadingPsychotest = false;
		}
	}

	async function previewPsychotest() {
		if (!selectedPsychotestId) return;
		const popup = window.open('', '_blank');
		try {
			const blob = await downloadCertificateApi(selectedPsychotestId);
			const url = URL.createObjectURL(blob);
			if (popup) {
				popup.location.href = url;
			} else {
				window.open(url, '_blank', 'noopener,noreferrer');
			}
			setTimeout(() => URL.revokeObjectURL(url), 60_000);
		} catch (error) {
			popup?.close();
			psychotestError = errorText(error, 'Sertifikat belum dapat dibuka.');
		}
	}

	async function loadBookmarks() {
		loadingBookmarks = true;
		bookmarkError = null;
		try {
			const response = await listJobsApi({ bookmarked: true, page: 1, limit: 100 });
			const existing = new Map(jobOptions.map((option) => [option.key, option]));
			const bookmarks = response.items.map((job) => {
				const next = bookmarkToAutoApplyOption(job);
				const previous = existing.get(next.key);
				if (!previous) return next;
				const email = previous.recipientEmail || next.recipientEmail;
				return {
					...next,
					recipientEmail: email,
					needsEmail: !isEmail(email),
					selected: previous.selected
				};
			});
			jobOptions = [...bookmarks, ...jobOptions.filter((option) => option.source === 'manual')];
		} catch (error) {
			bookmarkError = errorText(error, 'Daftar bookmark belum dapat dimuat.');
		} finally {
			loadingBookmarks = false;
		}
	}

	async function loadBenefits() {
		benefitsLoading = true;
		benefitsError = null;
		try {
			benefits = await getMyBenefitsApi();
			if (typeof window !== 'undefined') {
				window.dispatchEvent(
					new CustomEvent('benefits:updated', {
						detail: { creditBalance: benefits.creditBalance }
					})
				);
			}
		} catch (error) {
			benefitsError = errorText(error, 'Kuota email belum dapat dimuat.');
		} finally {
			benefitsLoading = false;
		}
	}

	function toggleOption(key: string) {
		jobOptions = jobOptions.map((option) =>
			option.key === key ? { ...option, selected: !option.selected } : option
		);
	}

	function updateEmail(key: string, value: string) {
		jobOptions = jobOptions.map((option) =>
			option.key === key
				? { ...option, recipientEmail: value, needsEmail: !isEmail(value) }
				: option
		);
	}

	function selectAll() {
		jobOptions = jobOptions.map((option) => ({ ...option, selected: true }));
	}

	function clearSelection() {
		jobOptions = jobOptions.map((option) => ({ ...option, selected: false }));
	}

	function addManualJob(job: AutoApplyJobOption) {
		jobOptions = [job, ...jobOptions];
		showToast('Loker berhasil ditambahkan ke daftar lamaran.');
	}

	function previewInput(option: AutoApplyJobOption) {
		if (option.jobId) return { jobId: option.jobId };
		return {
			jobTitle: option.jobTitle,
			companyName: option.companyName,
			description: option.description
		};
	}

	async function openPreview() {
		if (!canPrepare) {
			showToast(blockedReason ?? 'Lengkapi persiapan terlebih dahulu.', 'info');
			return;
		}
		previewOpen = true;
		const initial: Record<string, EmailDraftPreview> = {};
		for (const option of selectedOptions) {
			initial[option.key] = { subject: '', body: '', loading: true, error: null };
		}
		previews = initial;

		await Promise.all(
			selectedOptions.map(async (option) => {
				try {
					const response = await previewEmailApi(previewInput(option));
					previews = {
						...previews,
						[option.key]: {
							subject: response.subject,
							body: response.body,
							loading: false,
							error: null
						}
					};
				} catch (error) {
					previews = {
						...previews,
						[option.key]: {
							subject: '',
							body: '',
							loading: false,
							error: errorText(error, 'Draft email belum dapat dibuat.')
						}
					};
				}
			})
		);
	}

	function updatePreview(key: string, field: 'subject' | 'body', value: string) {
		const current = previews[key];
		if (!current) return;
		previews = { ...previews, [key]: { ...current, [field]: value } };
	}

	async function sendApplications() {
		if (!canPrepare || preparing) return;
		preparing = true;
		try {
			const response = await prepareAutoApplyApi({
				cvFileId: selectedCvId,
				...(selectedPsychotestId ? { psychotestSessionId: selectedPsychotestId } : {}),
				items: selectedOptions.map((option) => {
					const draft = previews[option.key];
					return {
						...(option.jobId
							? { jobId: option.jobId }
							: {
									jobTitle: option.jobTitle,
									companyName: option.companyName,
									description: option.description
								}),
						recipientEmail: option.recipientEmail.trim().toLowerCase(),
						...(draft?.subject.trim() ? { emailSubject: draft.subject.trim() } : {}),
						...(draft?.body.trim() ? { emailBody: draft.body.trim() } : {})
					};
				})
			});

			previewOpen = false;
			activeTab = 'history';
			applicationsPage = 1;
			clearSelection();
			await loadApplications(1);
			const queued = response.queued ?? response.items.filter((item) => item.status === 'PENDING').length;
			const failed = response.items.filter((item) => item.status === 'FAILED').length;
			showToast(
				failed > 0
					? `${queued} lamaran masuk antrean, ${failed} gagal dimasukkan. Periksa riwayat.`
					: `Lamaran sedang dikirim di background oleh worker. ${queued} lamaran masuk antrean.`,
				failed > 0 ? 'info' : 'success'
			);
			void loadBenefits();
		} catch (error) {
			if (error instanceof ApiError && error.code === 'BENEFIT_QUOTA_EXHAUSTED') {
				showToast(`${error.message} Top-up kredit terlebih dahulu.`, 'error');
			} else {
				showToast(errorText(error, 'Lamaran belum dapat dikirim.'), 'error');
			}
		} finally {
			preparing = false;
		}
	}

	async function loadApplications(page = 1) {
		applicationsLoading = true;
		applicationsError = null;
		try {
			applications = await listAutoApplyApplicationsApi(page, 20);
			applicationsPage = applications.meta.page;
		} catch (error) {
			applicationsError = errorText(error, 'Riwayat lamaran belum dapat dimuat.');
		} finally {
			applicationsLoading = false;
		}
	}

	function switchTab(tab: Tab) {
		activeTab = tab;
		if (tab === 'history') void loadApplications(applicationsPage);
	}

	function previewCountLabel(): string {
		if (!emailBenefit) return 'Email benefit belum aktif';
		if (creditsRequired === 0) return 'Tertutup kuota';
		return `${formatNumber(creditsRequired)} kredit`;
	}

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.get('tab') === 'history') activeTab = 'history';

		void Promise.all([
			loadGmailStatus(),
			loadCvs(),
			loadPsychotestSessions(),
			loadBookmarks(),
			loadBenefits()
		]);
		if (activeTab === 'history') void loadApplications(1);

		const focusHandler = () => void loadGmailStatus();
		window.addEventListener('focus', focusHandler);

		const poll = setInterval(() => {
			if (activeTab === 'history' && !applicationsLoading) {
				void loadApplications(applicationsPage);
			}
		}, 7000);

		return () => {
			window.removeEventListener('focus', focusHandler);
			clearInterval(poll);
		};
	});

	onDestroy(() => {
		if (toastTimer) clearTimeout(toastTimer);
		clearCvPreview();
	});
</script>

<svelte:head>
	<title>Auto-Apply | AI Job Hunter</title>
	<meta
		name="description"
		content="Siapkan CV, pilih lowongan, tinjau email AI, dan kirim lamaran otomatis lewat Gmail."
	/>
</svelte:head>

<div class="space-y-6">
	<section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
		<div>
			<p class="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
				<Sparkles size={14} /> Auto-Apply
			</p>
			<h1 class="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
				Kirim lamaran tanpa ribet
			</h1>
			<p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
				Siapkan dokumen, pilih lowongan, tinjau email buatan AI, lalu biarkan worker mengirimkannya lewat Gmail-mu.
			</p>
		</div>
		<div class="inline-flex self-start rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
			<button
				type="button"
				onclick={() => switchTab('prepare')}
				class="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition {activeTab === 'prepare' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}"
			>
				<FileText size={14} /> Persiapan
			</button>
			<button
				type="button"
				onclick={() => switchTab('history')}
				class="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition {activeTab === 'history' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}"
			>
				<Clock3 size={14} /> Status Lamaran
			</button>
		</div>
	</section>

	{#if activeTab === 'prepare'}
		<GmailIntegrationCard
			connected={gmailConnected}
			loading={gmailLoading}
			connecting={gmailConnecting}
			disconnecting={gmailDisconnecting}
			email={$auth.user?.email}
			error={gmailError}
			onconnect={() => void connectGmail()}
			ondisconnect={() => void disconnectGmail()}
			onretry={() => void loadGmailStatus()}
		/>

		<DocumentSetup
			{cvs}
			{selectedCvId}
			{loadingCvs}
			{uploadingCv}
			{cvError}
			{psychotestSessions}
			{selectedPsychotestId}
			{loadingPsychotest}
			{psychotestError}
			onupload={(file) => void uploadCv(file)}
			onselectcv={selectCv}
			onselectpsychotest={(id) => (selectedPsychotestId = id)}
			onpreviewcv={() => void previewCv()}
			onpreviewpsychotest={() => void previewPsychotest()}
		/>

		{#if bookmarkError}
			<div class="flex items-start justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800" role="alert">
				<span>{bookmarkError}</span>
				<button type="button" onclick={() => void loadBookmarks()} class="shrink-0 font-semibold underline">Muat ulang</button>
			</div>
		{/if}
		{#if benefitsError}
			<div class="flex items-start justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800" role="alert">
				<span>{benefitsError}</span>
				<button type="button" onclick={() => void loadBenefits()} class="shrink-0 font-semibold underline">Muat ulang</button>
			</div>
		{/if}

		{#if loadingBookmarks && jobOptions.length === 0}
			<div class="rounded-2xl border border-slate-200 bg-white p-8 text-center">
				<div class="mx-auto flex items-center justify-center gap-2 text-xs text-slate-500"><Spinner label="Memuat loker" /> Memuat loker bookmark...</div>
			</div>
		{/if}

		<JobChecklist
			options={jobOptions}
			{selectedCount}
			{creditBalance}
			{emailBenefit}
			{quotaRemaining}
			{creditsRequired}
			onToggle={toggleOption}
			onEmailChange={updateEmail}
			onselectall={selectAll}
			onclear={clearSelection}
			onextract={() => (extractOpen = true)}
		/>

		<section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex items-start gap-3">
					<span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
						<Send size={20} />
					</span>
					<div>
						<h2 class="text-base font-bold tracking-tight text-slate-950">Siap mengirim?</h2>
						<p class="mt-1 text-xs leading-5 text-slate-500">
							{selectedCount > 0
								? `${formatNumber(selectedCount)} loker dipilih · ${previewCountLabel()}`
								: 'Centang loker pada daftar di atas untuk mulai.'}
						</p>
						{#if benefits}
							<p class="mt-1 text-[10px] text-slate-400">
								Saldo {formatNumber(creditBalance)} kredit
								{#if emailBenefit && !isUnlimitedQuota(emailBenefit.limit)}
									· kuota email tersisa {formatNumber(Math.max(emailBenefit.remaining, 0))}
								{/if}
							</p>
						{/if}
					</div>
				</div>
				<div class="flex flex-col items-stretch gap-2 sm:items-end">
					<button
						type="button"
						onclick={() => void openPreview()}
						disabled={!canPrepare}
						class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-45"
					>
						<Sparkles size={16} /> Tinjau Email & Kirim Lamaran
					</button>
					{#if blockedReason}
						<p class="flex flex-wrap items-center justify-end gap-1 text-[10px] text-amber-700">
							<AlertTriangle size={12} /> {blockedReason}
							{#if hasBenefit && !canAfford}
								<a href="/billing#kredit-kilat" class="font-semibold underline">Top-up kredit</a>
							{/if}
						</p>
					{:else}
						<p class="text-[10px] text-emerald-600"><CheckCircle2 size={12} class="mr-1 inline" /> Semua persiapan lengkap</p>
					{/if}
				</div>
			</div>
			{#if selectedCount > 0}
				<div class="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-indigo-50/60 px-3 py-2.5 text-[11px] text-indigo-700">
					<Coins size={14} />
					<span>Total terpilih: <strong>{formatNumber(selectedCount)} loker</strong></span>
					<span>·</span>
					<span>{formatNumber(selectedCount)} email × {formatNumber(emailBenefit?.creditCost ?? 1)} kredit</span>
					{#if creditsRequired > 0}
						<span>· perlu {formatNumber(creditsRequired)} kredit</span>
					{/if}
				</div>
			{/if}
		</section>
	{:else}
		<ApplicationHistory
			response={applications}
			loading={applicationsLoading}
			error={applicationsError}
			onrefresh={() => void loadApplications(applicationsPage)}
			onpage={(page) => void loadApplications(page)}
		/>
	{/if}
</div>

<ExtractJobModal
	open={extractOpen}
	benefit={benefits?.benefits.find((benefit) => benefit.code === 'EXTERNAL_JOB_EXTRACTION') ?? null}
	onclose={() => (extractOpen = false)}
	onadded={addManualJob}
	onusage={() => void loadBenefits()}
/>

<EmailPreviewDrawer
	open={previewOpen}
	options={selectedOptions}
	{previews}
	sending={preparing}
	totalCredits={creditsRequired}
	{creditBalance}
	onclose={() => (previewOpen = false)}
	onupdate={updatePreview}
	onsend={() => void sendApplications()}
/>

{#if toast}
	<div class="fixed bottom-5 left-1/2 z-[90] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 sm:left-auto sm:right-5 sm:translate-x-0">
		<div class="flex items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-xl {toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : toast.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-indigo-200 bg-indigo-50 text-indigo-800'}" role={toast.type === 'error' ? 'alert' : 'status'}>
			{#if toast.type === 'success'}<CheckCircle2 size={17} class="mt-0.5 shrink-0" />{:else if toast.type === 'error'}<AlertTriangle size={17} class="mt-0.5 shrink-0" />{:else}<RefreshCw size={17} class="mt-0.5 shrink-0" />{/if}
			<span class="flex-1 leading-5">{toast.message}</span>
			<button type="button" onclick={() => (toast = null)} class="shrink-0 rounded p-0.5 hover:bg-black/5" aria-label="Tutup notifikasi"><X size={14} /></button>
		</div>
	</div>
{/if}
