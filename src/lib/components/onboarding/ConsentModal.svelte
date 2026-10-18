<script lang="ts">
	interface Props {
		open: boolean;
		loading?: boolean;
		onaccept: () => void;
		ondecline: () => void;
	}

	let { open, loading = false, onaccept, ondecline }: Props = $props();

	let checked = $state(false);

	const canAccept = $derived(checked && !loading);

	$effect(() => {
		if (!open) checked = false;
	});

	$effect(() => {
		if (!open) return;

		const original = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		return () => {
			document.body.style.overflow = original;
		};
	});

	function handleKeydown(event: KeyboardEvent) {
		if (!open) return;
		if (event.key === 'Escape' && !loading) ondecline();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
		<button
			type="button"
			class="absolute inset-0 cursor-default bg-zinc-900/50"
			aria-label="Close consent dialog"
			tabindex="-1"
			onclick={() => !loading && ondecline()}
		></button>

		<div
			class="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="consent-title"
			aria-describedby="consent-description"
		>
			<h2 id="consent-title" class="text-lg font-semibold text-zinc-900">
				Before we start, your consent
			</h2>

			<p id="consent-description" class="mt-2 text-sm text-zinc-600">
				AI Job Hunter works on your behalf. Please review what this means before continuing.
			</p>

			<ul class="mt-4 space-y-3 text-sm text-zinc-600">
				<li class="flex gap-2">
					<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" aria-hidden="true"></span>
					<span>
						Your CV and profile data are stored and sent to our AI provider to match you with job
						postings and to generate cover letters.
					</span>
				</li>
				<li class="flex gap-2">
					<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" aria-hidden="true"></span>
					<span>
						We may send job application emails to recruiters on your behalf, from your connected
						email address or from our platform subdomain, including your CV and psychotest
						certificate as attachments.
					</span>
				</li>
				<li class="flex gap-2">
					<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" aria-hidden="true"></span>
					<span>
						If you enable WhatsApp notifications, we will send you delivery confirmations and new
						job recommendations to the number you provide.
					</span>
				</li>
				<li class="flex gap-2">
					<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" aria-hidden="true"></span>
					<span>
						You can withdraw consent, disconnect your email, or delete your data at any time from
						your account settings.
					</span>
				</li>
			</ul>

			<label class="mt-5 flex items-start gap-2 text-sm text-zinc-700">
				<input
					type="checkbox"
					bind:checked
					class="mt-0.5 h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
				/>
				<span>
					I have read and agree to the Terms of Service and Privacy Policy, and I consent to
					automated job applications being sent on my behalf.
				</span>
			</label>

			<div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<button
					type="button"
					onclick={ondecline}
					disabled={loading}
					class="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
				>
					Not now
				</button>

				<button
					type="button"
					onclick={onaccept}
					disabled={!canAccept}
					class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{loading ? 'Saving…' : 'Agree and finish'}
				</button>
			</div>
		</div>
	</div>
{/if}
