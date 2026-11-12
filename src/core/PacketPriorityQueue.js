/**
 * Fixed-capacity array-based priority queue.
 * Lowest numerical priority is served first; ties are FIFO.
 * The search and manual left shift preserve the original DSA approach.
 */
export class PacketPriorityQueue {
  constructor(capacity = 3) {
    this.capacity = capacity;
    this.items = [];
  }

  isFull() {
    return this.items.length >= this.capacity;
  }

  isEmpty() {
    return this.items.length === 0;
  }

  enqueue(packet) {
    if (this.isFull()) return false;
    this.items.push(packet);
    return true;
  }

  dequeue() {
    if (this.isEmpty()) return null;

    let minIndex = 0;
    for (let i = 1; i < this.items.length; i += 1) {
      if (this.items[i].priority < this.items[minIndex].priority) {
        minIndex = i;
      }
    }

    const removed = this.items[minIndex];
    for (let i = minIndex; i < this.items.length - 1; i += 1) {
      this.items[i] = this.items[i + 1];
    }
    this.items.pop();
    return removed;
  }

  getPackets() {
    return this.items.map((packet) => ({ ...packet }));
  }
}
