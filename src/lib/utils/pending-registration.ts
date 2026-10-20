export interface PendingRegistrationDetails {
	fullName: string;
	phone: string;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const PENDING_REGISTRATION_KEY = 'pending_registration_details';

export function savePendingRegistrationDetails(
	details: PendingRegistrationDetails,
	storage: StorageLike = sessionStorage
): void {
	storage.setItem(
		PENDING_REGISTRATION_KEY,
		JSON.stringify({ fullName: details.fullName.trim(), phone: details.phone.trim() })
	);
}

export function getPendingRegistrationDetails(
	storage: StorageLike = sessionStorage
): PendingRegistrationDetails | null {
	const value = storage.getItem(PENDING_REGISTRATION_KEY);
	if (value === null) return null;

	let details: unknown;
	try {
		details = JSON.parse(value);
	} catch {
		throw new Error('Data pendaftaran tersimpan tidak dapat dibaca.');
	}

	if (
		typeof details !== 'object' ||
		details === null ||
		!('fullName' in details) ||
		typeof details.fullName !== 'string' ||
		!('phone' in details) ||
		typeof details.phone !== 'string'
	) {
		throw new Error('Data pendaftaran tersimpan tidak valid.');
	}

	return { fullName: details.fullName, phone: details.phone };
}

export function clearPendingRegistrationDetails(storage: StorageLike = sessionStorage): void {
	storage.removeItem(PENDING_REGISTRATION_KEY);
}
