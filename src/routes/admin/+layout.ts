import { redirect } from '@sveltejs/kit';
import { getUserRole, homePathForRole } from '#lib/stores/auth.js';
import type { LayoutLoad } from './$types';

/**
 * `/admin/...` is reserved for the ADMIN role only.
 * - SUPER_ADMIN → superadmin cockpit
 * - other roles → jobseeker dashboard
 * Unauthenticated visitors are handled by the layout (redirect to login).
 */
export const load: LayoutLoad = () => {
	const role = getUserRole();
	if (!role || role === 'ADMIN') return;
	redirect(307, homePathForRole(role));
};
