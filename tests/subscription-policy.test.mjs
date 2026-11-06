import assert from 'node:assert/strict';
import test from 'node:test';
import {
	buildSubscriptionChange,
	determineSubscriptionChangeType,
	projectSubscriptionEndDate,
	subscriptionIsExpired
} from '../src/lib/utils/subscription.ts';

const NOW = new Date('2026-11-06T00:00:00.000Z');
const POLICY = {
	quotaStackMultiplier: 2,
	renewalQuotaPolicy: 'REMAINING_PLUS_NEW_CAPPED',
	upgradePolicy: 'IMMEDIATE_REPLACE_NO_CONVERSION',
	downgradePolicy: 'SCHEDULED_AT_PERIOD_END',
	expiryPolicy: 'DOWNGRADE_TO_FREE_KEEP_CREDITS'
};

function subscription({
	tier = 'PRO',
	status = 'ACTIVE',
	endDate = '2026-11-20T00:00:00.000Z'
} = {}) {
	return {
		id: 'subscription-1',
		status,
		package: { id: `${tier.toLowerCase()}-id`, name: `${tier} Plan`, tier },
		pendingPackage: null,
		pendingStartAt: null,
		startDate: '2026-10-21T00:00:00.000Z',
		endDate,
		remainingDays: 14,
		expiredAt: null
	};
}

function plan(tier = 'PRO', durationDays = 30) {
	return {
		id: `${tier.toLowerCase()}-id`,
		tier,
		durationDays
	};
}

test('transaction type follows the tier order and active/expired state', () => {
	assert.equal(determineSubscriptionChangeType(null, 'STARTER', NOW), 'NEW');
	assert.equal(
		determineSubscriptionChangeType(subscription(), 'PRO', NOW, 'pro-id'),
		'RENEWAL'
	);
	assert.equal(
		determineSubscriptionChangeType(subscription(), 'PRO', NOW, 'pro-yearly-id'),
		'NEW'
	);
	assert.equal(determineSubscriptionChangeType(subscription(), 'UNLIMITED', NOW), 'UPGRADE');
	assert.equal(determineSubscriptionChangeType(subscription(), 'STARTER', NOW), 'DOWNGRADE');
	assert.equal(
		determineSubscriptionChangeType(
			subscription({ status: 'EXPIRED', endDate: '2026-10-01T00:00:00.000Z' }),
			'STARTER',
			NOW
		),
		'REACTIVATION'
	);
	assert.equal(subscriptionIsExpired(subscription(), NOW), false);
	assert.equal(
		subscriptionIsExpired(subscription({ endDate: '2026-11-01T00:00:00.000Z' }), NOW),
		true
	);
});

test('renewal and downgrade project dates from the current period end', () => {
	assert.equal(
		projectSubscriptionEndDate(subscription(), plan('PRO'), 'RENEWAL', NOW),
		'2026-12-20T00:00:00.000Z'
	);
	assert.equal(
		projectSubscriptionEndDate(subscription(), plan('STARTER'), 'DOWNGRADE', NOW),
		'2026-12-20T00:00:00.000Z'
	);
});

test('upgrade and reactivation start a fresh period from now', () => {
	assert.equal(
		projectSubscriptionEndDate(subscription(), plan('UNLIMITED'), 'UPGRADE', NOW),
		'2026-12-06T00:00:00.000Z'
	);
	assert.equal(
		projectSubscriptionEndDate(null, plan('STARTER'), 'NEW', NOW),
		'2026-12-06T00:00:00.000Z'
	);
});

test('downgrade exposes pendingStartAt and keeps the current plan active', () => {
	const change = buildSubscriptionChange(subscription(), plan('STARTER'), POLICY, NOW);

	assert.equal(change.type, 'DOWNGRADE');
	assert.equal(change.currentPlanName, 'PRO Plan');
	assert.equal(change.pendingStartAt, '2026-11-20T00:00:00.000Z');
	assert.equal(change.projectedEndDate, '2026-12-20T00:00:00.000Z');
	assert.equal(change.quotaStackMultiplier, 2);
});

test('expired subscriptions are shown as Free Plan with reactivation policy', () => {
	const change = buildSubscriptionChange(
		subscription({ status: 'EXPIRED', endDate: '2026-10-01T00:00:00.000Z' }),
		plan('STARTER'),
		POLICY,
		NOW
	);

	assert.equal(change.type, 'REACTIVATION');
	assert.equal(change.currentPlanName, 'Free Plan');
	assert.equal(change.isExpired, true);
	assert.equal(change.currentEndDate, '2026-10-01T00:00:00.000Z');
	assert.equal(change.projectedEndDate, '2026-12-06T00:00:00.000Z');
});
