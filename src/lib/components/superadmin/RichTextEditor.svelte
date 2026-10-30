<script lang="ts">
	import { Bold, Eraser, Italic, Strikethrough, Underline } from '@lucide/svelte';

	interface Props {
		value?: string;
		placeholder?: string;
		onchange?: (html: string) => void;
	}

	let { value = '', placeholder = 'Tulis fitur...', onchange }: Props = $props();

	let editor = $state<HTMLDivElement>();

	type Command = 'bold' | 'italic' | 'underline' | 'strikeThrough' | 'removeFormat';

	$effect(() => {
		if (!editor) return;
		if (editor.innerHTML === value) return;
		if (typeof document !== 'undefined' && document.activeElement === editor) return;
		editor.innerHTML = value;
	});

	function emit() {
		if (!editor) return;
		if (/^(<br\s*\/?>|<div><br\s*\/?><\/div>)$/i.test(editor.innerHTML)) {
			editor.innerHTML = '';
		}
		onchange?.(editor.innerHTML);
	}

	function exec(command: Command) {
		if (!editor) return;
		editor.focus();
		document.execCommand('styleWithCSS', false, 'false');
		document.execCommand(command, false);
		emit();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
		}
	}

	function handlePaste(event: ClipboardEvent) {
		event.preventDefault();
		const text = event.clipboardData?.getData('text/plain') ?? '';
		document.execCommand('insertText', false, text.replace(/\r?\n/g, ' '));
		emit();
	}
</script>

<div
	class="rounded-lg border border-slate-700 bg-slate-950 transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30"
>
	<div class="flex items-center gap-0.5 border-b border-slate-800 bg-slate-900/70 px-1 py-1">
		<button
			type="button"
			title="Tebal (Ctrl+B)"
			aria-label="Tebal"
			onmousedown={(event) => event.preventDefault()}
			onclick={() => exec('bold')}
			class="rounded p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
		>
			<Bold size={14} />
		</button>
		<button
			type="button"
			title="Miring (Ctrl+I)"
			aria-label="Miring"
			onmousedown={(event) => event.preventDefault()}
			onclick={() => exec('italic')}
			class="rounded p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
		>
			<Italic size={14} />
		</button>
		<button
			type="button"
			title="Garis bawah (Ctrl+U)"
			aria-label="Garis bawah"
			onmousedown={(event) => event.preventDefault()}
			onclick={() => exec('underline')}
			class="rounded p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
		>
			<Underline size={14} />
		</button>
		<button
			type="button"
			title="Coret"
			aria-label="Coret"
			onmousedown={(event) => event.preventDefault()}
			onclick={() => exec('strikeThrough')}
			class="rounded p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
		>
			<Strikethrough size={14} />
		</button>
		<span class="mx-1 h-4 w-px bg-slate-700"></span>
		<button
			type="button"
			title="Hapus format"
			aria-label="Hapus format"
			onmousedown={(event) => event.preventDefault()}
			onclick={() => exec('removeFormat')}
			class="rounded p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
		>
			<Eraser size={14} />
		</button>
	</div>
	<div
		bind:this={editor}
		contenteditable="true"
		role="textbox"
		aria-multiline="false"
		aria-label={placeholder}
		tabindex="0"
		spellcheck="true"
		data-placeholder={placeholder}
		oninput={emit}
		onblur={emit}
		onkeydown={handleKeydown}
		onpaste={handlePaste}
		class="rich-editor min-h-10 px-3 py-2 text-sm leading-5 text-white outline-none"
	></div>
</div>

<style>
	.rich-editor {
		overflow-wrap: anywhere;
		white-space: pre-wrap;
	}

	.rich-editor:empty::before {
		content: attr(data-placeholder);
		color: #64748b;
		pointer-events: none;
	}

	.rich-editor :global(b),
	.rich-editor :global(strong) {
		font-weight: 700;
	}

	.rich-editor :global(i),
	.rich-editor :global(em) {
		font-style: italic;
	}

	.rich-editor :global(u) {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.rich-editor :global(s),
	.rich-editor :global(strike) {
		text-decoration: line-through;
	}

	.rich-editor :global(code) {
		padding: 0 3px;
		border-radius: 3px;
		background: rgb(148 163 184 / 16%);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.92em;
	}
</style>
