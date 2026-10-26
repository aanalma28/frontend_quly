<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowLeft, CheckCircle2, Pencil, Plus, RefreshCw, Trash2 } from '@lucide/svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Alert from '#lib/components/onboarding/Alert.svelte';
	import Modal from '#lib/components/admin/Modal.svelte';
	import { ApiError } from '#lib/utils/api.js';
	import { categoryLabel, categoryTone } from '#lib/components/psychotest/labels.js';
	import {
		addAdminQuestionApi,
		deleteAdminQuestionApi,
		getAdminPackageQuestionsApi,
		updateAdminQuestionApi,
		type AdminPackageQuestionsResponse,
		type AdminQuestion,
		type QuestionOption
	} from '#lib/services/adminPsychotestApi.js';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const packageId = $derived(params.id);

	let data = $state<AdminPackageQuestionsResponse | null>(null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	let modalOpen = $state(false);
	let editing = $state<AdminQuestion | null>(null);
	let formQuestionText = $state('');
	let formOptions = $state<QuestionOption[]>([]);
	let formCorrectKey = $state('');
	let formOrder = $state('1');
	let isSaving = $state(false);
	let formError = $state<string | null>(null);

	let deleteTarget = $state<AdminQuestion | null>(null);
	let isDeleting = $state(false);

	function errorText(error: unknown, fallback: string): string {
		if (error instanceof ApiError) {
			if (error.status === 403) return 'Akses admin diperlukan untuk melakukan aksi ini.';
			return error.message;
		}
		return error instanceof Error ? error.message : fallback;
	}

	function defaultOptions(): QuestionOption[] {
		return [
			{ id: 'A', text: '' },
			{ id: 'B', text: '' },
			{ id: 'C', text: '' },
			{ id: 'D', text: '' }
		];
	}

	function nextOptionId(options: QuestionOption[]): string {
		const used = new Set(options.map((option) => option.id));
		const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		for (const char of alphabet) {
			if (!used.has(char)) return char;
		}
		return `OPSI${options.length + 1}`;
	}

	async function load() {
		isLoading = true;
		loadError = null;
		try {
			data = await getAdminPackageQuestionsApi(packageId);
		} catch (error) {
			loadError = errorText(error, 'Soal paket belum dapat dimuat.');
		} finally {
			isLoading = false;
		}
	}

	function openCreate() {
		editing = null;
		formQuestionText = '';
		formOptions = defaultOptions();
		formCorrectKey = '';
		formOrder = String((data?.questions.length ?? 0) + 1);
		formError = null;
		modalOpen = true;
	}

	function openEdit(question: AdminQuestion) {
		editing = question;
		formQuestionText = question.questionText;
		formOptions = question.options.map((option) => ({ ...option }));
		formCorrectKey = question.correctKey ?? '';
		formOrder = String(question.order);
		formError = null;
		modalOpen = true;
	}

	function closeModal() {
		if (isSaving) return;
		modalOpen = false;
	}

	function addOption() {
		formOptions = [...formOptions, { id: nextOptionId(formOptions), text: '' }];
	}

	function removeOption(index: number) {
		if (formOptions.length <= 2) return;
		formOptions = formOptions.filter((_, itemIndex) => itemIndex !== index);
		if (!formOptions.some((option) => option.id === formCorrectKey)) {
			formCorrectKey = '';
		}
	}

	async function saveQuestion() {
		if (isSaving) return;
		formError = null;

		const questionText = formQuestionText.trim();
		if (!questionText) {
			formError = 'Teks soal wajib diisi.';
			return;
		}
		if (formOptions.length < 2) {
			formError = 'Minimal harus ada 2 pilihan opsi.';
			return;
		}
		const options = formOptions.map((option) => ({
			id: option.id.trim(),
			text: option.text.trim()
		}));
		if (options.some((option) => !option.id || !option.text)) {
			formError = 'Setiap opsi harus memiliki kode dan teks.';
			return;
		}
		if (new Set(options.map((option) => option.id)).size !== options.length) {
			formError = 'Kode opsi tidak boleh duplikat.';
			return;
		}
		const order = Number(formOrder);
		if (!Number.isInteger(order) || order < 0) {
			formError = 'Nomor urut harus bilangan bulat ≥ 0.';
			return;
		}
		const correctKey = formCorrectKey.trim();
		if (correctKey && !options.some((option) => option.id === correctKey)) {
			formError = 'Kunci jawaban harus salah satu kode opsi.';
			return;
		}

		isSaving = true;
		successMessage = null;
		errorMessage = null;
		try {
			if (editing) {
				await updateAdminQuestionApi(editing.id, {
					questionText,
					options,
					correctKey: correctKey || null,
					order
				});
				successMessage = 'Soal berhasil diperbarui.';
			} else {
				await addAdminQuestionApi(packageId, {
					questionText,
					options,
					correctKey: correctKey || undefined,
					order
				});
				successMessage = 'Soal baru berhasil ditambahkan.';
			}
			modalOpen = false;
			await load();
		} catch (error) {
			formError = errorText(error, 'Soal belum dapat disimpan.');
		} finally {
			isSaving = false;
		}
	}

	async function removeQuestion() {
		if (!deleteTarget || isDeleting) return;
		isDeleting = true;
		errorMessage = null;
		successMessage = null;
		const target = deleteTarget;
		try {
			await deleteAdminQuestionApi(target.id);
			deleteTarget = null;
			successMessage = 'Soal berhasil dihapus.';
			await load();
		} catch (error) {
			errorMessage = errorText(error, 'Soal belum dapat dihapus.');
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
	<title>Bank Soal | Admin Psikotes</title>
</svelte:head>

<div class="space-y-6">
	<header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
		<div>
			<a
				href="/admin/psychotest/packages"
				class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-indigo-700"
			>
				<ArrowLeft size={15} /> Daftar paket tes
			</a>
			<h1 class="mt-2 text-2xl font-bold tracking-tight text-slate-950">
				{data?.package.title ?? 'Editor Soal'}
			</h1>
			{#if data}
				<div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
					<span class="rounded-full px-2.5 py-1 text-[11px] font-semibold {categoryTone[data.package.category]}">
						{categoryLabel[data.package.category]}
					</span>
					<span>{data.package.durationMin} menit</span>
					<span>·</span>
					<span>{data.questions.length} soal</span>
				</div>
			{/if}
		</div>
		<button
			type="button"
			onclick={openCreate}
			disabled={!data}
			class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
		>
			<Plus size={16} /> Tambah Soal
		</button>
	</header>

	{#if errorMessage}
		<Alert type="error" message={errorMessage} dismissible ondismiss={() => (errorMessage = null)} />
	{/if}
	{#if successMessage}
		<Alert type="success" message={successMessage} dismissible ondismiss={() => (successMessage = null)} />
	{/if}

	{#if isLoading}
		<div class="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
			<Spinner label="Memuat soal" /> Memuat soal...
		</div>
	{:else if loadError}
		<div class="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
			<p class="text-sm text-rose-700" role="alert">{loadError}</p>
			<button
				type="button"
				onclick={() => void load()}
				class="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
			>
				<RefreshCw size={15} /> Coba lagi
			</button>
		</div>
	{:else if data}
		{#if data.questions.length === 0}
			<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
				<h2 class="text-lg font-semibold text-slate-900">Belum ada soal</h2>
				<p class="mt-1 text-sm text-slate-500">Tambahkan soal pertama untuk paket ini.</p>
				<button
					type="button"
					onclick={openCreate}
					class="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
				>
					<Plus size={16} /> Tambah Soal
				</button>
			</div>
		{:else}
			<div class="space-y-4">
				{#each data.questions as question (question.id)}
					<article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="flex items-start gap-3">
								<span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
									{question.order}
								</span>
								<div>
									<p class="text-sm font-semibold leading-6 text-slate-900">{question.questionText}</p>
									<p class="mt-0.5 text-[11px] text-slate-400">
										{question.options.length} opsi
										{#if question.correctKey}
											· kunci: <span class="font-semibold text-emerald-600">{question.correctKey}</span>
										{:else}
											· tanpa kunci jawaban
										{/if}
									</p>
								</div>
							</div>
							<div class="flex gap-1.5">
								<button
									type="button"
									onclick={() => openEdit(question)}
									class="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
								>
									<Pencil size={13} /> Edit
								</button>
								<button
									type="button"
									onclick={() => (deleteTarget = question)}
									class="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
								>
									<Trash2 size={13} /> Hapus
								</button>
							</div>
						</div>

						<ul class="mt-4 grid gap-2 sm:grid-cols-2">
							{#each question.options as option (option.id)}
								<li
									class="flex items-start gap-2 rounded-xl border px-3 py-2 text-sm {question.correctKey ===
									option.id
										? 'border-emerald-200 bg-emerald-50 text-emerald-800'
										: 'border-slate-100 bg-slate-50 text-slate-700'}"
								>
									<span class="flex size-5 shrink-0 items-center justify-center rounded-md bg-white text-[10px] font-bold text-slate-600">
										{option.id}
									</span>
									<span class="leading-5">{option.text}</span>
									{#if question.correctKey === option.id}
										<CheckCircle2 size={14} class="ml-auto shrink-0 text-emerald-600" />
									{/if}
								</li>
							{/each}
						</ul>
					</article>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<Modal
	open={modalOpen}
	title={editing ? 'Edit Soal' : 'Tambah Soal Baru'}
	description="Isi teks soal, opsi jawaban, kunci, dan nomor urut."
	size="lg"
	onclose={closeModal}
>
	<div class="space-y-4">
		{#if formError}
			<Alert type="error" message={formError} />
		{/if}

		<label class="block space-y-1.5 text-sm font-medium text-slate-700">
			Teks soal <span class="text-rose-600">*</span>
			<textarea
				bind:value={formQuestionText}
				rows="3"
				maxlength="5000"
				placeholder="Tulis pertanyaan di sini..."
				class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
			></textarea>
		</label>

		<div>
			<div class="flex items-center justify-between">
				<p class="text-sm font-medium text-slate-700">Pilihan opsi <span class="text-rose-600">*</span></p>
				<button
					type="button"
					onclick={addOption}
					class="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
				>
					<Plus size={13} /> Tambah opsi
				</button>
			</div>
			<div class="mt-2 space-y-2">
				{#each formOptions as option, index (index)}
					<div class="flex items-center gap-2">
						<input
							bind:value={option.id}
							maxlength="20"
							aria-label="Kode opsi {index + 1}"
							class="w-16 rounded-lg border border-slate-300 px-2 py-2 text-center text-xs font-semibold focus:border-indigo-500 focus:outline-none"
						/>
						<input
							bind:value={option.text}
							maxlength="2000"
							aria-label="Teks opsi {index + 1}"
							placeholder="Teks opsi {index + 1}"
							class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
						/>
						<button
							type="button"
							onclick={() => removeOption(index)}
							disabled={formOptions.length <= 2}
							class="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
							aria-label="Hapus opsi {index + 1}"
						>
							<Trash2 size={15} />
						</button>
					</div>
				{/each}
			</div>
		</div>

		<div class="grid gap-4 sm:grid-cols-2">
			<label class="block space-y-1.5 text-sm font-medium text-slate-700">
				Kunci jawaban
				<select
					bind:value={formCorrectKey}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
				>
					<option value="">— Tanpa kunci (mis. kepribadian)</option>
					{#each formOptions as option}
						<option value={option.id}>{option.id}</option>
					{/each}
				</select>
			</label>
			<label class="block space-y-1.5 text-sm font-medium text-slate-700">
				Nomor urut <span class="text-rose-600">*</span>
				<input
					bind:value={formOrder}
					type="number"
					min="0"
					class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
				/>
			</label>
		</div>
	</div>

	{#snippet footer()}
		<button
			type="button"
			onclick={closeModal}
			disabled={isSaving}
			class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
		>
			Batal
		</button>
		<button
			type="button"
			onclick={() => void saveQuestion()}
			disabled={isSaving}
			class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
		>
			{#if isSaving}<Spinner label="Menyimpan" />{/if}
			{editing ? 'Simpan Perubahan' : 'Tambah Soal'}
		</button>
	{/snippet}
</Modal>

<Modal
	open={deleteTarget !== null}
	title="Hapus soal?"
	description="Soal akan dihapus permanen dari paket ini."
	onclose={() => (isDeleting ? undefined : (deleteTarget = null))}
>
	{#if deleteTarget}
		<p class="text-sm text-slate-600">
			Apakah kamu yakin ingin menghapus soal <strong>#{deleteTarget.order}</strong>?
		</p>
	{/if}

	{#snippet footer()}
		<button
			type="button"
			onclick={() => (deleteTarget = null)}
			disabled={isDeleting}
			class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
		>
			Batal
		</button>
		<button
			type="button"
			onclick={() => void removeQuestion()}
			disabled={isDeleting}
			class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
		>
			{#if isDeleting}<Spinner label="Menghapus" />{/if}
			Hapus
		</button>
	{/snippet}
</Modal>
