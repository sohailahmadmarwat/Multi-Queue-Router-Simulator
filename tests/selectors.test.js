import assert from 'node:assert/strict';
import test from 'node:test';
import { Router } from '../src/core/Router.js';
import { getNextPacket } from '../src/core/selectors.js';

const packet = (id, destinationIP, priority) => ({
  id: String(id), sourceIP: '192.168.0.1', destinationIP, priority: String(priority),
});

test('next-packet preview returns null for an empty router', () => {
  assert.equal(getNextPacket(new Router().snapshot()), null);
});

test('preview respects queue order, minimum priority, and FIFO ties without changing arrival order', () => {
  const router = new Router();
  router.addPacket(packet(1, '10.0.0.1', 0));
  router.addPacket(packet(2, '192.168.0.2', 9));
  router.addPacket(packet(3, '192.168.0.2', 3));
  router.addPacket(packet(4, '192.168.0.2', 3));

  const snapshot = router.snapshot();
  for (const queue of snapshot.queues) {
    queue.packets.forEach(Object.freeze);
    Object.freeze(queue.packets);
    Object.freeze(queue);
  }
  Object.freeze(snapshot.queues);
  Object.freeze(snapshot);

  assert.equal(getNextPacket(snapshot).id, 3);
  assert.equal(getNextPacket(snapshot).queueIndex, 0);
  assert.deepEqual(snapshot.queues[0].packets.map(({ id }) => id), [2, 3, 4]);

  const preview = getNextPacket(snapshot);
  preview.priority = 100;
  assert.equal(router.processPacket().id, 3);
  assert.equal(getNextPacket(router.snapshot()).id, 4);
});

test('preview predicts every dequeue across all queues and overflow', () => {
  const router = new Router();
  const destinations = ['192.168.0.2', '10.0.0.1', '172.16.0.1', '150.1.1.1'];
  destinations.forEach((destination, queueIndex) => {
    router.addPacket(packet(queueIndex * 10 + 1, destination, 8));
    router.addPacket(packet(queueIndex * 10 + 2, destination, 2));
    router.addPacket(packet(queueIndex * 10 + 3, destination, 2));
    assert.equal(router.addPacket(packet(queueIndex * 10 + 4, destination, 0)).accepted, false);
  });

  const order = [];
  while (router.snapshot().queuedCount > 0) {
    const preview = getNextPacket(router.snapshot());
    const processed = router.processPacket();
    assert.deepEqual(preview, processed);
    order.push(processed.id);
  }
  assert.deepEqual(order, [2, 3, 1, 12, 13, 11, 22, 23, 21, 32, 33, 31]);
  assert.equal(getNextPacket(router.snapshot()), null);
});

test('invalid submissions leave queue contents, history, and statistics unchanged', () => {
  const router = new Router();
  router.addPacket(packet(0, '8.8.8.8', 0));
  const before = router.snapshot();
  assert.throws(() => router.addPacket(packet(0, '10.0.0.1', 1)), /already in a queue/);
  assert.throws(() => router.addPacket(packet(1, '256.1.1.1', 1)), /destination IPv4/);
  assert.throws(() => router.addPacket(packet(1, '10.0.0.1', Number.MAX_SAFE_INTEGER + 1)), /too large/);
  assert.deepEqual(router.snapshot(), before);
  assert.equal(getNextPacket(before).id, 0);
});
