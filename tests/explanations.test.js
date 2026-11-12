import assert from 'node:assert/strict';
import test from 'node:test';
import { Router } from '../src/core/Router.js';
import { getQueueIndex } from '../src/core/RoutingTable.js';
import { getRoutingExplanation, getSelectionExplanation } from '../src/core/explanations.js';
import { createDemoRouter, DEMO_EXPECTED_ORDER, DEMO_PACKETS } from '../src/core/demo.js';

function freezeSnapshot(snapshot) {
  snapshot.queues.forEach(queue => {
    queue.packets.forEach(Object.freeze);
    Object.freeze(queue.packets);
    Object.freeze(queue);
  });
  snapshot.events.forEach(Object.freeze);
  Object.freeze(snapshot.events);
  Object.freeze(snapshot.queues);
  if (snapshot.lastProcessed) Object.freeze(snapshot.lastProcessed);
  return Object.freeze(snapshot);
}

const packet = (id, destinationIP, priority) => ({
  id, sourceIP: '192.168.1.10', destinationIP, priority,
});

test('routing explanations use the real destination mapping, default, and strict validation', () => {
  for (const [destination, prefix] of [
    ['192.168.0.1', '192.*'], ['10.0.0.8', '10.*'], ['172.16.0.1', '172.*'], ['150.1.1.1', '150.*'],
  ]) {
    const explanation = getRoutingExplanation(destination);
    assert.equal(explanation.valid, true);
    assert.equal(explanation.queueIndex, getQueueIndex(destination));
    assert.equal(explanation.matchedPrefix, prefix);
    assert.equal(explanation.isDefault, false);
    assert.match(explanation.reason, /matches/);
  }
  const fallback = getRoutingExplanation(' 8.8.8.8 ');
  assert.equal(fallback.queueIndex, 0);
  assert.equal(fallback.matchedPrefix, null);
  assert.equal(fallback.isDefault, true);
  assert.match(fallback.reason, /default Queue 0/);

  for (const invalid of ['', null, '256.1.1.1', '01.2.3.4', '10.0.0', '10.0.0.1.2']) {
    const explanation = getRoutingExplanation(invalid);
    assert.equal(explanation.valid, false);
    assert.equal(explanation.queueIndex, null);
    assert.equal(explanation.matchedPrefix, null);
    assert.equal(explanation.isDefault, false);
  }
});

test('selection trace explains strict minimum search and FIFO without mutating the snapshot', () => {
  const router = new Router();
  router.addPacket(packet(1, '192.168.0.1', 8));
  router.addPacket(packet(2, '192.168.0.1', 2));
  router.addPacket(packet(3, '192.168.0.1', 2));
  router.addPacket(packet(4, '10.0.0.1', 0));
  const snapshot = freezeSnapshot(router.snapshot());
  const before = JSON.stringify(snapshot);
  const explanation = getSelectionExplanation(snapshot);

  assert.equal(explanation.queueIndex, 0);
  assert.equal(explanation.packet.id, 2);
  assert.equal(explanation.tieCount, 2);
  assert.deepEqual(explanation.skippedQueues, []);
  assert.deepEqual(explanation.scans, [
    { index: 0, packetId: 1, priority: 8, bestIndex: 0, comparison: 'initial', selected: false },
    { index: 1, packetId: 2, priority: 2, bestIndex: 1, comparison: 'lower', selected: true },
    { index: 2, packetId: 3, priority: 2, bestIndex: 1, comparison: 'equal', selected: false },
  ]);
  assert.match(explanation.reason, /Queue order takes precedence/);
  assert.match(explanation.reason, /FIFO/);
  assert.equal(JSON.stringify(snapshot), before);
  assert.deepEqual(explanation.packet, router.processPacket());
});

test('selection traces skip empty queues and reject higher priorities as candidates', () => {
  const router = new Router();
  router.addPacket(packet(0, '172.16.0.1', 0));
  router.addPacket(packet(1, '172.16.0.1', 4));
  const explanation = getSelectionExplanation(freezeSnapshot(router.snapshot()));
  assert.deepEqual(explanation.skippedQueues, [0, 1]);
  assert.equal(explanation.queueIndex, 2);
  assert.equal(explanation.packet.id, 0);
  assert.equal(explanation.tieCount, 1);
  assert.equal(explanation.scans[1].comparison, 'higher');
  assert.equal(explanation.scans[1].bestIndex, 0);
  assert.equal(explanation.scans[1].selected, false);
  assert.deepEqual(explanation.packet, router.processPacket());
});

test('selection trace remains authoritative after default routing and overflow', () => {
  const router = new Router();
  router.addPacket(packet(1, '8.8.8.8', 9));
  router.addPacket(packet(2, '192.168.0.1', 4));
  router.addPacket(packet(3, '192.168.0.1', 4));
  assert.equal(router.addPacket(packet(4, '192.168.0.1', 0)).accepted, false);
  router.addPacket(packet(5, '150.1.1.1', 0));

  while (router.snapshot().queuedCount) {
    const explanation = getSelectionExplanation(freezeSnapshot(router.snapshot()));
    assert.deepEqual(explanation.packet, router.processPacket());
    assert.equal(explanation.scans.filter(scan => scan.selected).length, 1);
    assert.equal(explanation.scans.find(scan => scan.selected).packetId, explanation.packet.id);
  }
  assert.deepEqual(getSelectionExplanation(freezeSnapshot(router.snapshot())), {
    packet: null,
    queueIndex: null,
    skippedQueues: [0, 1, 2, 3],
    scans: [],
    reason: 'All four queues are empty. Add a packet before processing.',
    tieCount: 0,
  });
});

test('demo starts with six real accepted packets and records its actual final addition', () => {
  const { router, lastAction } = createDemoRouter();
  const initial = router.snapshot();
  assert.equal(initial.queuedCount, 6);
  assert.equal(initial.addedCount, 6);
  assert.equal(initial.processedCount, 0);
  assert.equal(initial.droppedCount, 0);
  assert.equal(initial.lastProcessed, null);
  assert.equal(initial.events.length, 6);
  assert.ok(initial.events.every(event => event.type === 'added'));
  assert.deepEqual(initial.queues.map(queue => queue.packets.length), [3, 1, 1, 1]);
  assert.equal(lastAction.type, 'added');
  assert.equal(lastAction.packet.id, 206);
  assert.equal(lastAction.packet.queueIndex, 3);
  assert.equal(lastAction.before.queuedCount, 5);
  assert.equal(lastAction.before.queues[3].packets.length, 0);
  assert.deepEqual(lastAction.after, initial);
  assert.deepEqual(initial.queues.flatMap(queue => queue.packets.map(({ id }) => id)).sort(), DEMO_PACKETS.map(({ id }) => id).sort());
});

test('demo order follows the actual router and independent loads preserve original samples', () => {
  const { router } = createDemoRouter();
  const { router: independent } = createDemoRouter();
  const originalSamples = JSON.stringify(DEMO_PACKETS);
  const order = [];
  while (router.snapshot().queuedCount) {
    const explanation = getSelectionExplanation(freezeSnapshot(router.snapshot()));
    const processed = router.processPacket();
    assert.deepEqual(explanation.packet, processed);
    order.push(processed.id);
  }
  assert.deepEqual(order, [203, 204, 202, 201, 205, 206]);
  assert.deepEqual(order, DEMO_EXPECTED_ORDER);
  assert.equal(independent.snapshot().queuedCount, 6);
  assert.equal(independent.snapshot().processedCount, 0);
  assert.equal(JSON.stringify(DEMO_PACKETS), originalSamples);
});
