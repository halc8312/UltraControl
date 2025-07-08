/**
 * Priority Queue Implementation
 * 
 * A min-heap based priority queue for efficient task scheduling
 */

export class PriorityQueue<T> {
  private heap: T[] = [];
  private compareFn: (a: T, b: T) => number;
  
  constructor(compareFn: (a: T, b: T) => number) {
    this.compareFn = compareFn;
  }
  
  /**
   * Add an item to the queue
   */
  enqueue(item: T): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }
  
  /**
   * Remove and return the highest priority item
   */
  dequeue(): T | undefined {
    if (this.heap.length === 0) return undefined;
    
    if (this.heap.length === 1) {
      return this.heap.pop();
    }
    
    const item = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.bubbleDown(0);
    
    return item;
  }
  
  /**
   * Return the highest priority item without removing it
   */
  peek(): T | undefined {
    return this.heap[0];
  }
  
  /**
   * Get the number of items in the queue
   */
  size(): number {
    return this.heap.length;
  }
  
  /**
   * Check if the queue is empty
   */
  isEmpty(): boolean {
    return this.heap.length === 0;
  }
  
  /**
   * Clear all items from the queue
   */
  clear(): void {
    this.heap = [];
  }
  
  /**
   * Get all items in the queue (does not preserve order)
   */
  toArray(): T[] {
    return [...this.heap];
  }
  
  /**
   * Internal method to maintain heap property when adding
   */
  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      
      if (this.compareFn(this.heap[index], this.heap[parentIndex]) >= 0) {
        break;
      }
      
      // Swap with parent
      [this.heap[index], this.heap[parentIndex]] = 
        [this.heap[parentIndex], this.heap[index]];
      
      index = parentIndex;
    }
  }
  
  /**
   * Internal method to maintain heap property when removing
   */
  private bubbleDown(index: number): void {
    while (true) {
      let minIndex = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      
      if (leftChild < this.heap.length && 
          this.compareFn(this.heap[leftChild], this.heap[minIndex]) < 0) {
        minIndex = leftChild;
      }
      
      if (rightChild < this.heap.length && 
          this.compareFn(this.heap[rightChild], this.heap[minIndex]) < 0) {
        minIndex = rightChild;
      }
      
      if (minIndex === index) break;
      
      // Swap with smaller child
      [this.heap[index], this.heap[minIndex]] = 
        [this.heap[minIndex], this.heap[index]];
      
      index = minIndex;
    }
  }
}

/**
 * Create a max priority queue (higher values have higher priority)
 */
export function createMaxPriorityQueue<T>(
  getValue: (item: T) => number
): PriorityQueue<T> {
  return new PriorityQueue<T>((a, b) => getValue(b) - getValue(a));
}

/**
 * Create a min priority queue (lower values have higher priority)
 */
export function createMinPriorityQueue<T>(
  getValue: (item: T) => number
): PriorityQueue<T> {
  return new PriorityQueue<T>((a, b) => getValue(a) - getValue(b));
}

/**
 * Priority Queue with update capability
 */
export class IndexedPriorityQueue<T> {
  private queue: PriorityQueue<{ item: T; id: string }>;
  private indexMap: Map<string, { item: T; id: string }> = new Map();
  
  constructor(
    private getId: (item: T) => string,
    private compareFn: (a: T, b: T) => number
  ) {
    this.queue = new PriorityQueue((a, b) => 
      this.compareFn(a.item, b.item)
    );
  }
  
  enqueue(item: T): void {
    const id = this.getId(item);
    const entry = { item, id };
    
    // Remove existing entry if present
    if (this.indexMap.has(id)) {
      this.remove(id);
    }
    
    this.queue.enqueue(entry);
    this.indexMap.set(id, entry);
  }
  
  dequeue(): T | undefined {
    const entry = this.queue.dequeue();
    if (entry) {
      this.indexMap.delete(entry.id);
      return entry.item;
    }
    return undefined;
  }
  
  peek(): T | undefined {
    const entry = this.queue.peek();
    return entry?.item;
  }
  
  remove(id: string): boolean {
    if (!this.indexMap.has(id)) return false;
    
    this.indexMap.delete(id);
    
    // Rebuild queue without the item
    const items = this.queue.toArray().filter(entry => entry.id !== id);
    this.queue.clear();
    items.forEach(entry => this.queue.enqueue(entry));
    
    return true;
  }
  
  update(item: T): void {
    this.enqueue(item); // Will replace existing
  }
  
  has(id: string): boolean {
    return this.indexMap.has(id);
  }
  
  size(): number {
    return this.queue.size();
  }
  
  isEmpty(): boolean {
    return this.queue.isEmpty();
  }
  
  clear(): void {
    this.queue.clear();
    this.indexMap.clear();
  }
}