import assert from 'node:assert/strict';
import test from 'node:test';
import { PacketPriorityQueue } from '../src/core/PacketPriorityQueue.js';
import { getQueueIndex } from '../src/core/RoutingTable.js';
import { Router } from '../src/core/Router.js';
import { isValidIPv4 } from '../src/core/validation.js';

function form(id, dest = '10.0.0.2', priority = 1) {
  return { id: String(id), sourceIP: '192.168.0.1', destinationIP: dest, priority: String(priority) };
}

test('routing table preserves destination-prefix mapping and default', () => {
  assert.deepEqual(['192.1.1.1', '10.1.1.1', '172.1.1.1', '150.1.1.1', '8.8.8.8'].map(getQueueIndex), [0, 1, 2, 3, 0]);
});

test('IPv4 validation accepts proper addresses and rejects bad formats', () => {
  for (const ip of ['0.0.0.0', '255.255.255.255', '192.168.1.10']) assert.equal(isValidIPv4(ip), true);
  for (const ip of ['256.1.1.1', '10.1.1', 'abc.1.1.2', '01.2.3.4', '10.10.10.10.5']) assert.equal(isValidIPv4(ip), false);
});

test('priority queue selects lowest number first and FIFO for ties', () => {
  const q = new PacketPriorityQueue(4);
  q.enqueue({ id: 1, priority: 3 });
  q.enqueue({ id: 2, priority: 1 });
  q.enqueue({ id: 3, priority: 1 });
  q.enqueue({ id: 4, priority: 2 });
  assert.deepEqual([q.dequeue().id, q.dequeue().id, q.dequeue().id, q.dequeue().id], [2, 3, 4, 1]);
  assert.equal(q.dequeue(), null);
});

test('queue overflow rejects extra packet without changing contents', () => {
  const q = new PacketPriorityQueue(1);
  assert.equal(q.enqueue({ id: 1, priority: 1 }), true);
  assert.equal(q.enqueue({ id: 2, priority: 0 }), false);
  assert.deepEqual(q.getPackets().map(p => p.id), [1]);
});

test('router checks queue 0 before queue 1 even if priority differs', () => {
  const router = new Router();
  router.addPacket(form(1, '10.0.0.2', 0));
  router.addPacket(form(2, '192.1.1.1', 9));
  assert.equal(router.processPacket().id, 2);
  assert.equal(router.processPacket().id, 1);
});

test('router prevents active duplicate IDs and permits reuse after processing', () => {
  const router = new Router();
  router.addPacket(form(5));
  assert.throws(() => router.addPacket(form(5)), /already in a queue/);
  router.processPacket();
  assert.equal(router.addPacket(form(5)).accepted, true);
});

test('dropped packet ID is not reserved and statistics are accurate', () => {
  const router = new Router();
  router.addPacket(form(1));
  router.addPacket(form(2));
  router.addPacket(form(3));
  const result = router.addPacket(form(4));
  assert.equal(result.accepted, false);
  assert.equal(router.snapshot().droppedCount, 1);
  assert.equal(router.snapshot().queuedCount, 3);
  router.processPacket();
  assert.equal(router.addPacket(form(4)).accepted, true);
  assert.equal(router.snapshot().addedCount, 4);
});

test('empty router processing safely returns null', () => {
  const router = new Router();
  assert.equal(router.processPacket(), null);
  assert.equal(router.snapshot().processedCount, 0);
});

test('rejects invalid fields before accepting packets', () => {
  const router = new Router();
  assert.throws(() => router.addPacket(form('abc')), /Packet ID/);
  assert.throws(() => router.addPacket(form(1, '999.0.0.1')), /destination IPv4/);
  assert.throws(() => router.addPacket(form(1, '10.0.0.2', '-1')), /Priority/);
  assert.equal(router.snapshot().queuedCount, 0);
});
