import { writable } from 'svelte/store';

export interface UserSession {
	id: string;
	name: string;
	email: string;
	credits: number;
}

export const userSession = writable<UserSession | null>(null);
export const creditBalance = writable(0);
