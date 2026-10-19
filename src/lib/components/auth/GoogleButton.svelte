<script lang="ts">
	import { getApiUrl } from '#lib/utils/api.js';

	interface Props {
		href?: string;
		disabled?: boolean;
		label?: string;
		onclick?: () => void;
	}

	let {
		href = getApiUrl('auth/google'),
		disabled = false,
		label = 'Continue with Google',
		onclick
	}: Props = $props();
</script>

<a
	{href}
	onclick={(event) => {
		if (disabled) {
			event.preventDefault();
			return;
		}
		if (onclick) {
			event.preventDefault();
			onclick();
		}
	}}
	aria-disabled={disabled}
	class="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 {disabled
		? 'pointer-events-none opacity-60'
		: ''}"
>
	<svg class="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
		<path
			fill="#4285F4"
			d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.63h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.55Z"
		/>
		<path
			fill="#34A853"
			d="M12 24c3.11 0 5.72-1.03 7.62-2.8l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.02-6.45-4.74H1.7v2.98A12 12 0 0 0 12 24Z"
		/>
		<path
			fill="#FBBC05"
			d="M5.55 14.67a7.2 7.2 0 0 1 0-4.6V7.09H1.7a12 12 0 0 0 0 10.56l3.85-2.98Z"
		/>
		<path
			fill="#EA4335"
			d="M12 4.75c1.69 0 3.21.58 4.4 1.72l3.3-3.3A11.6 11.6 0 0 0 12 0 12 12 0 0 0 1.7 7.09l3.85 2.98C6.46 7.35 9 4.75 12 4.75Z"
		/>
	</svg>
	{label}
</a>
