<script lang="ts">
	interface Props {
		id: string;
		label: string;
		type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'url';
		value?: string;
		placeholder?: string;
		autocomplete?: string;
		inputmode?: 'text' | 'numeric' | 'tel' | 'email';
		required?: boolean;
		disabled?: boolean;
		error?: string;
		hint?: string;
	}

	let {
		id,
		label,
		type = 'text',
		value = $bindable(''),
		placeholder = '',
		autocomplete,
		inputmode,
		required = false,
		disabled = false,
		error,
		hint
	}: Props = $props();

	const describedBy = $derived(error ? `${id}-error` : hint ? `${id}-hint` : undefined);
</script>

<div class="space-y-1.5">
	<label for={id} class="block text-sm font-medium text-zinc-800">
		{label}{#if required}<span class="ml-0.5 text-red-600" aria-hidden="true">*</span>{/if}
	</label>

	<input
		{id}
		{type}
		{placeholder}
		{autocomplete}
		{inputmode}
		{required}
		{disabled}
		bind:value
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={describedBy}
		class="block w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm transition placeholder:text-zinc-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100 {error
			? 'border-red-400 focus:border-red-500 focus:ring-red-200'
			: 'border-zinc-300 focus:border-indigo-500 focus:ring-indigo-200'}"
	/>

	{#if error}
		<p id="{id}-error" class="text-xs text-red-600">{error}</p>
	{:else if hint}
		<p id="{id}-hint" class="text-xs text-zinc-500">{hint}</p>
	{/if}
</div>
