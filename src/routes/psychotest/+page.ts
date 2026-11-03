import { redirect } from '@sveltejs/kit';

// Legacy practice route. The session-centric flow lives under the dashboard.
export function load() {
	throw redirect(307, '/dashboard/psychotest');
}
