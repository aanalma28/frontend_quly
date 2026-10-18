export interface Attempt {
	index: number;
	expected: number;
	given: number;
	correct: boolean;
	atMs: number;
}

export interface Bucket {
	index: number;
	startMs: number;
	endMs: number;
	count: number;
	correct: number;
}

export interface PsychotestMetrics {
	answered: number;
	correct: number;
	incorrect: number;
	accuracyPct: number;
	durationMs: number;
	speedPerMinute: number;
	peak: number;
	stability: number;
	buckets: Bucket[];
}

export const MIN_ANSWER = 0;
export const MAX_ANSWER = 9;
export const DEFAULT_BUCKET_MS = 10_000;

export function expectedAnswer(top: number, bottom: number): number {
	return (top + bottom) % 10;
}

export function generateDigits(count: number): number[] {
	const digits: number[] = [];
	for (let i = 0; i < count; i += 1) {
		digits.push(Math.floor(Math.random() * 10));
	}
	return digits;
}

export function computeMetrics(
	attempts: Attempt[],
	durationMs: number,
	bucketMs: number = DEFAULT_BUCKET_MS
): PsychotestMetrics {
	const safeDuration = Math.max(durationMs, 1);
	const safeBucketMs = Math.max(bucketMs, 1);
	const answered = attempts.length;
	const correct = attempts.reduce((total, attempt) => total + (attempt.correct ? 1 : 0), 0);

	const bucketCount = Math.max(1, Math.ceil(safeDuration / safeBucketMs));
	const buckets: Bucket[] = [];

	for (let i = 0; i < bucketCount; i += 1) {
		buckets.push({
			index: i,
			startMs: i * safeBucketMs,
			endMs: Math.min((i + 1) * safeBucketMs, safeDuration),
			count: 0,
			correct: 0
		});
	}

	for (const attempt of attempts) {
		const rawIndex = Math.floor(attempt.atMs / safeBucketMs);
		const index = Math.min(bucketCount - 1, Math.max(0, rawIndex));
		buckets[index].count += 1;
		if (attempt.correct) buckets[index].correct += 1;
	}

	const counts = buckets.map((bucket) => bucket.count);
	const peak = counts.reduce((max, value) => (value > max ? value : max), 0);
	const mean = counts.reduce((total, value) => total + value, 0) / counts.length;
	const variance =
		counts.reduce((total, value) => total + (value - mean) * (value - mean), 0) / counts.length;
	const stability = Math.sqrt(variance);

	return {
		answered,
		correct,
		incorrect: answered - correct,
		accuracyPct: answered === 0 ? 0 : (correct / answered) * 100,
		durationMs: safeDuration,
		speedPerMinute: answered / (safeDuration / 60_000),
		peak,
		stability,
		buckets
	};
}
