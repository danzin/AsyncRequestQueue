import Queue from "./Queue";

// Without native queue:
export class AsyncRequestQueue {
	private concurrency: number;
	private activeCount: number = 0;
	private queue: Array<{
		resolve: (value: any) => void;
		reject: (reason: any) => void;
		task: () => Promise<any>;
	}> = [];
	private queueIndex: number = 0;

	constructor(concurrency: number = 3) {
		this.concurrency = concurrency;
	}

	async add<T>(task: () => Promise<T>): Promise<T> {
		if (this.activeCount < this.concurrency) {
			return this.executeTask(task);
		}

		return new Promise<T>((resolve, reject) => {
			this.queue.push({ resolve, reject, task });
		});
	}

	private async executeTask<T>(task: () => Promise<T>): Promise<T> {
		this.activeCount++;
		try {
			const result = await task();
			this.next();
			return result;
		} catch (err) {
			this.next();
			throw err;
		} finally {
			this.activeCount--;
		}
	}

	private next() {
		if (this.queueIndex < this.queue.length && this.activeCount < this.concurrency) {
			const { resolve, reject, task } = this.queue[this.queueIndex++];
			this.executeTask(task).then(resolve, reject);

			if (this.queueIndex > 1000) {
				this.queue.splice(0, this.queueIndex);
				this.queueIndex = 0;
			}
		}
	}
}

// With native queue:
export class AsyncRequestQueueNative {
	private concurrency: number;
	private activeCount: number = 0;
	private queue: Queue<{
		resolve: (value: any) => void;
		reject: (reason: any) => void;
		task: () => Promise<any>;
	}> = new Queue();

	constructor(concurrency: number = 3) {
		this.concurrency = concurrency;
	}

	async add<T>(task: () => Promise<T>): Promise<T> {
		if (this.activeCount < this.concurrency) {
			return this.executeTask(task);
		}

		return new Promise<T>((resolve, reject) => {
			this.queue.enqueue({ resolve, reject, task });
		});
	}

	private async executeTask<T>(task: () => Promise<T>): Promise<T> {
		this.activeCount++;
		try {
			const result = await task();
			this.next();
			return result;
		} catch (err) {
			this.next();
			throw err;
		} finally {
			this.activeCount--;
		}
	}

	private next() {
		if (this.queue.length > 0 && this.activeCount < this.concurrency) {
			const queueItem = this.queue.deque();
			if (queueItem) {
				const { resolve, reject, task } = queueItem;
				this.executeTask(task).then(resolve, reject);
			}
		}
	}
}
