<script lang="ts">
	interface Props {
		file?: File | null;
		disabled?: boolean;
		maxMb?: number;
		error?: string;
	}

	let { file = $bindable(null), disabled = false, maxMb = 5, error }: Props = $props();

	let dragDepth = $state(0);
	let inputEl = $state<HTMLInputElement | undefined>(undefined);
	let localError = $state<string | null>(null);

	const visibleError = $derived(localError ?? error ?? null);
	const isDragging = $derived(dragDepth > 0);

	function validate(candidate: File): string | null {
		const isPdf =
			candidate.type === 'application/pdf' || candidate.name.toLowerCase().endsWith('.pdf');

		if (!isPdf) return 'Only PDF files are accepted.';
		if (candidate.size === 0) return 'That file appears to be empty.';
		if (candidate.size > maxMb * 1024 * 1024) {
			return `File is too large. Maximum size is ${maxMb} MB.`;
		}
		return null;
	}

	function accept(candidate: File | undefined | null) {
		if (!candidate || disabled) return;

		const problem = validate(candidate);
		if (problem) {
			localError = problem;
			return;
		}

		localError = null;
		file = candidate;
	}

	function handleInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		accept(input.files?.[0]);
		input.value = '';
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragDepth = 0;
		accept(event.dataTransfer?.files?.[0]);
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	function handleDragEnter(event: DragEvent) {
		event.preventDefault();
		if (!disabled) dragDepth += 1;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		dragDepth = Math.max(0, dragDepth - 1);
	}

	function remove() {
		file = null;
		localError = null;
	}

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

<div class="space-y-2">
	<input
		bind:this={inputEl}
		type="file"
		accept="application/pdf,.pdf"
		class="sr-only"
		{disabled}
		onchange={handleInput}
		tabindex="-1"
		aria-hidden="true"
	/>

	{#if file}
		<div class="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4">
			<div
				class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"
				aria-hidden="true"
			>
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
					<path d="M14 3v5h5" stroke-linecap="round" stroke-linejoin="round" />
					<path
						d="M19 8.5V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5.5Z"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</div>

			<div class="min-w-0 flex-1">
				<p class="truncate text-sm font-medium text-zinc-900">{file.name}</p>
				<p class="text-xs text-zinc-500">{formatSize(file.size)} · PDF</p>
			</div>

			<button
				type="button"
				onclick={remove}
				disabled={disabled}
				class="rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-50"
			>
				Remove
			</button>
		</div>
	{:else}
		<div
			class="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition {isDragging
				? 'border-indigo-500 bg-indigo-50'
				: 'border-zinc-300 bg-white'}"
			ondragenter={handleDragEnter}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
		>
			<div
				class="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
				aria-hidden="true"
			>
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
					<path d="M12 16V4" stroke-linecap="round" stroke-linejoin="round" />
					<path d="m7 9 5-5 5 5" stroke-linecap="round" stroke-linejoin="round" />
					<path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</div>

			<p class="text-sm font-medium text-zinc-800">Drag and drop your CV here</p>
			<p class="text-xs text-zinc-500">PDF only, up to {maxMb} MB</p>

			<button
				type="button"
				onclick={() => inputEl?.click()}
				{disabled}
				class="mt-2 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
			>
				Choose file
			</button>
		</div>
	{/if}

	{#if visibleError}
		<p class="text-xs text-red-600" role="alert">{visibleError}</p>
	{/if}
</div>
