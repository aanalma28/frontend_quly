<script lang="ts">
	import { page } from '$app/state';
	import PublicCandidateProfile from '#lib/components/candidate/PublicCandidateProfile.svelte';

	const token = $derived(page.params.token ?? null);
</script>

<PublicCandidateProfile {token} />
