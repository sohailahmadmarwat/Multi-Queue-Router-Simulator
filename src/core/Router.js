import { PacketPriorityQueue } from './PacketPriorityQueue.js';
import { getQueueIndex } from './RoutingTable.js';
import { validatePacket } from './validation.js';

/** Simulation is intentionally local and ephemeral; no server/database needed. */
export class Router {
  constructor() {
    this.queues = Array.from({ length: 4 }, () => new PacketPriorityQueue(3));
    this.usedIDs = new Set();
    this.addedCount = 0;
    this.processedCount = 0;
    this.droppedCount = 0;
    this.lastProcessed = null;
    this.events = [];
    this.nextEventId = 1;
  }

  log(type, description, packet = null, queueIndex = null) {
    this.events.unshift({
      eventId: this.nextEventId++,
      type,
      description,
      packetId: packet?.id ?? null,
      queueIndex,
      at: new Date().toISOString(),
    });
    this.events = this.events.slice(0, 40);
  }

  /** Returns outcome rather than throwing for normal queue overflow. */
  addPacket(form) {
    const packet = validatePacket(form);
    if (this.usedIDs.has(packet.id)) {
      throw new Error(`Packet ID #${packet.id} is already in a queue.`);
    }

    const queueIndex = getQueueIndex(packet.destinationIP);
    if (!this.queues[queueIndex].enqueue(packet)) {
      this.droppedCount += 1;
      this.log('dropped', `Queue ${queueIndex} is full. Packet #${packet.id} dropped.`, packet, queueIndex);
      // Critical fix: do NOT reserve dropped IDs.
      return { accepted: false, packet, queueIndex };
    }

    this.usedIDs.add(packet.id);
    this.addedCount += 1;
    this.log('added', `Packet #${packet.id} routed into Queue ${queueIndex}.`, packet, queueIndex);
    return { accepted: true, packet, queueIndex };
  }

  processPacket() {
    // Preserve fixed queue order (0 -> 1 -> 2 -> 3), NOT global priority.
    for (let queueIndex = 0; queueIndex < this.queues.length; queueIndex += 1) {
      const packet = this.queues[queueIndex].dequeue();
      if (packet) {
        this.usedIDs.delete(packet.id);
        this.processedCount += 1;
        this.lastProcessed = { ...packet, queueIndex };
        this.log('processed', `Packet #${packet.id} processed from Queue ${queueIndex}.`, packet, queueIndex);
        return this.lastProcessed;
      }
    }
    return null;
  }

  snapshot() {
    return {
      queues: this.queues.map((queue) => ({
        capacity: queue.capacity,
        packets: queue.getPackets(),
      })),
      queuedCount: this.queues.reduce((sum, queue) => sum + queue.items.length, 0),
      addedCount: this.addedCount,
      processedCount: this.processedCount,
      droppedCount: this.droppedCount,
      lastProcessed: this.lastProcessed ? { ...this.lastProcessed } : null,
      events: this.events.map((event) => ({ ...event })),
    };
  }
}
