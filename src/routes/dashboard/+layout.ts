import { redirect } from '@sveltejs/kit';
import { getUserRole, isAdminRole } from '#lib/stores/auth.js';
import type { LayoutLoad } from './$types';

/**
 * Role guard for jobseeker pages: ADMIN/SUPER_ADMIN are sent to the admin panel.
 * `getUserRole()` is a no-op on the server (token lives in localStorage), so this
 * effectively runs client-side without needing `$app/environment`.
 */
export const load: LayoutLoad = () => {
	if (isAdminRole(getUserRole())) {
		redirect(307, '/admin/psychotest/packages');
	}
};
