import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	envPrefix: ['BACKEND_API_URL_', 'IS_PRODUCTION'],
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			// Menambahkan kembali alias $lib langsung di dalam plugin sveltekit
			alias: {
				'$lib': 'src/lib',
				'$lib/*': 'src/lib/*'
			}
		})
	]
});
