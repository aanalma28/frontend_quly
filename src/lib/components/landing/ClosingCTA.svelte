<script lang="ts">
	import { ArrowRight, Sparkles } from '@lucide/svelte';
	import { reveal } from './reveal.js';
</script>

<section class="closing-section section-shell reveal" use:reveal aria-labelledby="closing-title">
	<div class="closing-glow"></div>
	<div class="closing-content">
		<div class="closing-icon"><Sparkles size={21} /></div>
		<span class="closing-kicker">Peluang berikutnya menantimu</span>
		<h2 id="closing-title">Siap berhenti<br />mengirim lamaran manual?</h2>
		<p>
			Mulai gratis, temukan lowongan yang relevan, dan biarkan Quly membantu proses
			lamaran kerjamu lebih cepat.
		</p>
		<a class="button button-light" href="/auth/register">
			Buat akun gratis <ArrowRight size={16} />
		</a>
	</div>
</section>
