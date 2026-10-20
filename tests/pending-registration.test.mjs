import assert from 'node:assert/strict';
import test from 'node:test';
import {
	clearPendingRegistrationDetails,
	getPendingRegistrationDetails,
	savePendingRegistrationDetails
} from '../src/lib/utils/pending-registration.ts';

function createStorage() {
	const values = new Map();
	return {
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => values.set(key, value),
		removeItem: (key) => values.delete(key)
	};
}

test('pending registration details are trimmed, reusable, and cleared after onboarding', () => {
	const storage = createStorage();

	savePendingRegistrationDetails({ fullName: ' Budi Santoso ', phone: ' +6281234567890 ' }, storage);
	assert.deepEqual(getPendingRegistrationDetails(storage), {
		fullName: 'Budi Santoso',
		phone: '+6281234567890'
	});

	clearPendingRegistrationDetails(storage);
	assert.equal(getPendingRegistrationDetails(storage), null);
});

test('invalid pending registration data is reported', () => {
	const storage = createStorage();
	storage.setItem('pending_registration_details', '{');

	assert.throws(
		() => getPendingRegistrationDetails(storage),
		/Data pendaftaran tersimpan tidak dapat dibaca/
	);
});
