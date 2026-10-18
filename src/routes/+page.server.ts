import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Must match the cookie name your login endpoint sets.
// If auth is stored in localStorage instead, delete this file.
const SESSION_COOKIE = 'session';

export const load: PageServerLoad = ({ cookies }) => {
	if (cookies.get(SESSION_COOKIE)) {
		throw redirect(307, '/dashboard');
	}

	return {};
};
