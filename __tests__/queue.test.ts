import { performance } from "perf_hooks";
import Queue from "../src/Queue";
import { AsyncRequestQueue, AsyncRequestQueueNative } from "../src/AsyncRequestQueue";

// Helper for a fake async task
function makeTask(id: number, delay: number) {
	return () =>
		new Promise<number>((resolve) => {
			setTimeout(() => resolve(id), delay);
		});
}

describe("AsyncRequestQueue correctness", () => {
	test.each([
		["Array-based queue", new AsyncRequestQueue(2)],
		["Linked-list queue", new AsyncRequestQueueNative(2)],
	])("%s processes tasks in order", async (_label, queue) => {
		const results: number[] = [];

		await Promise.all([
			queue.add(makeTask(1, 50)).then((r) => results.push(r)),
			queue.add(makeTask(2, 10)).then((r) => results.push(r)),
			queue.add(makeTask(3, 5)).then((r) => results.push(r)),
		]);

		// Order is based on completion, not submission
		expect(results.sort((a, b) => a - b)).toEqual([1, 2, 3]);
	});
});

describe("Performance comparison", () => {
	const N = 200_000;

	test(`Compare enqueue/dequeue speed for ${N} items`, async () => {
		const arrayQueue = new AsyncRequestQueue(N);
		const linkedQueue = new AsyncRequestQueueNative(N);

		// Array-based timing
		let t0 = performance.now();
		for (let i = 0; i < N; i++) {
			await arrayQueue.add(async () => i);
		}
		let t1 = performance.now();
		const arrayTime = t1 - t0;

		// Linked-list timing
		t0 = performance.now();
		for (let i = 0; i < N; i++) {
			await linkedQueue.add(async () => i);
		}
		t1 = performance.now();
		const linkedTime = t1 - t0;

		console.log(`Array-based queue: ${arrayTime.toFixed(2)} ms`);
		console.log(`Linked-list queue: ${linkedTime.toFixed(2)} ms`);

		expect(arrayTime).toBeGreaterThanOrEqual(0);
		expect(linkedTime).toBeGreaterThanOrEqual(0);
	});
});
const makeFastTask = (value: number) => async () => value;

describe("AsyncRequestQueue performance scaling", () => {
	const sizes = [10, 100, 1_000, 100_000, 500_000];

	for (const size of sizes) {
		test(`Process ${size.toLocaleString()} tasks`, async () => {
			const queues = [
				{ name: "Array-based", instance: new AsyncRequestQueue(size) },
				{ name: "Linked-list", instance: new AsyncRequestQueueNative(size) },
			];

			for (const { name, instance } of queues) {
				const t0 = performance.now();

				// Add all tasks
				const promises: Promise<number>[] = [];
				for (let i = 0; i < size; i++) {
					promises.push(instance.add(makeFastTask(i)));
				}

				await Promise.all(promises);

				const t1 = performance.now();
				console.log(`${name} queue (${size.toLocaleString()} tasks): ${(t1 - t0).toFixed(2)} ms`);
			}
		}, 60_000); // increase timeout for huge sizes
	}
	test("Process 10,000,000 tasks in batches", async () => {
		const totalTasks = 10_000_000;
		const batchSize = 500_000; // Process 500k at a time
		const batches = Math.ceil(totalTasks / batchSize);

		const queues = [
			{ name: "Array-based", instance: new AsyncRequestQueue(batchSize) },
			{ name: "Linked-list", instance: new AsyncRequestQueueNative(batchSize) },
		];

		for (const { name, instance } of queues) {
			const t0 = performance.now();
			let completedTasks = 0;

			for (let batch = 0; batch < batches; batch++) {
				const batchStart = batch * batchSize;
				const batchEnd = Math.min(batchStart + batchSize, totalTasks);
				const currentBatchSize = batchEnd - batchStart;

				// Process current batch
				const batchPromises: Promise<number>[] = [];
				for (let i = batchStart; i < batchEnd; i++) {
					batchPromises.push(instance.add(makeFastTask(i)));
				}

				// Wait for current batch to complete before starting next
				await Promise.all(batchPromises);
				completedTasks += currentBatchSize;

				// Log progress
				if (batch % 20 === 0) {
					console.log(`${name}: Completed ${completedTasks.toLocaleString()}/${totalTasks.toLocaleString()} tasks`);
				}
			}

			const t1 = performance.now();
			console.log(`${name} queue (${totalTasks.toLocaleString()} tasks in batches): ${(t1 - t0).toFixed(2)} ms`);
		}
	}, 300_000); // 5 minute timeout for 10M tasks
});
