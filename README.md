# AsyncRequestQueue

A TypeScript/Node.js implementation of an **asynchronous request queue** with configurable concurrency in two flavors:

1. **Array-based queue**: simple, uses native JavaScript arrays.
2. **Linked-list-based queue**: uses a custom `Queue<T>` implementation for O(1) enqueue/dequeue.

Includes performance comparison tests to see how each approach scales from small to very large workloads.

## Features

- **Concurrency control**: limit how many async tasks run at once.
- **Two queue backends**: native array vs. linked list.
- **Performance benchmarks**: compare execution times for different queue sizes.

## Results 

Native JS Arrays `[]` significantly reduce performance even on small amount of tasks. The perfomance difference becomes more pronounced as more workload is introduced. 
**In the native JS array implementation, `shift`/`unshift` operations aren't even used. Ony `push` and `splice`**, and yet there's quite a noticeable performance hit. 

```bash
    Array-based queue (10 tasks): 0.11 ms                                                                                                                        
    Linked-list queue (10 tasks): 0.31 ms

    Array-based queue (100 tasks): 0.10 ms                                                                                                                       
    Linked-list queue (100 tasks): 0.05 ms                                                                                                                       

    Array-based queue (1,000 tasks): 0.47 ms
    Linked-list queue (1,000 tasks): 0.24 ms                                                                                                                     

    Array-based queue (100,000 tasks): 101.80 ms
    Linked-list queue (100,000 tasks): 72.06 ms

    Array-based queue (500,000 tasks): 492.34 ms
    Linked-list queue (500,000 tasks): 428.05 ms
    ----------------------------------------------------
    Array-based queue (10,000,000 tasks in batches): 8358.01 ms
    Linked-list queue (10,000,000 tasks in batches): 7853.66 ms
```

## Why? 

In the classic queue implementation, `enqueue`/`dequeue` are both O(1), whereas even though `shift` and `unshift` aren't used in the native `[]` implementation, `splice` at the front is still O(n). 
Introducing even 1 linear growth operation can massively hinder performance. 
