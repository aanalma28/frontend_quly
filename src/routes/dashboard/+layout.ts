import { redirect } from '@sveltejs/kit';
import { getUserRole, homePathForRole, isAdminRole } from '#lib/stores/auth.js';
import type { LayoutLoad } from './$types';

/**
 * Role guard for jobseeker pages: ADMIN/SUPER_ADMIN are sent to their own area.
 * `getUserRole()` is a no-op on the server (token lives in localStorage), so this
 * effectively runs client-side without needing `$app/environment`.
 */
export const load: LayoutLoad = () => {
	const role = getUserRole();
	if (isAdminRole(role)) {
		redirect(307, homePathForRole(role));
	}
};
