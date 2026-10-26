import { redirect } from '@sveltejs/kit';
import { getUserRole, isAdminRole } from '#lib/stores/auth.js';
import type { LayoutLoad } from './$types';

/**
 * Role guard for admin pages: non-admin accounts (e.g. JOB_SEEKER) are sent
 * back to the user dashboard. Unauthenticated visitors (no role) are handled
 * by the admin layout (redirect to login).
 */
export const load: LayoutLoad = () => {
	const role = getUserRole();
	if (role && !isAdminRole(role)) {
		redirect(307, '/dashboard');
	}
};
