import { redirect } from '@sveltejs/kit';
import { getUserRole } from '#lib/stores/auth.js';
import type { LayoutLoad } from './$types';

/**
 * Only SUPER_ADMIN may access `/superadmin/...`.
 * - ADMIN → admin psychotest panel
 * - other roles → jobseeker dashboard
 * Unauthenticated visitors are handled by the layout (redirect to login).
 */
export const load: LayoutLoad = () => {
	const role = getUserRole();
	if (!role) return;
	if (role === 'SUPER_ADMIN') return;
	if (role === 'ADMIN') redirect(307, '/admin/psychotest/packages');
	redirect(307, '/dashboard');
};
