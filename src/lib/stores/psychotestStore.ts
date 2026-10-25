import { writable } from 'svelte/store';

/**
 * Shared psychotest state used by the dashboard access gate.
 *
 * Attempt/exam state lives in the attempt page (loaded from the URL + API), so
 * that refreshing the page can resume an `IN_PROGRESS` attempt.
 */
export interface PsychotestState {
	hasCompleted: boolean;
}

export const psychotest = writable<PsychotestState>({
	hasCompleted: false
});

/** Mark the psychotest step as completed (used by the dashboard access gate). */
export function setPsychotestCompleted(completed: boolean) {
	psychotest.update((state) => ({ ...state, hasCompleted: completed }));
}

export const psychotestStore = {
	subscribe: psychotest.subscribe,
	setPsychotestCompleted
};
