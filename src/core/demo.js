import { Router } from './Router.js';

/** A small deterministic experiment; every sample goes through Router.addPacket. */
export const DEMO_PACKETS = Object.freeze([
  { id: 201, sourceIP: '192.168.1.10', destinationIP: '10.0.0.8', priority: 0 },
  { id: 202, sourceIP: '192.168.1.10', destinationIP: '192.168.1.20', priority: 8 },
  { id: 203, sourceIP: '192.168.1.10', destinationIP: '192.168.1.30', priority: 2 },
  { id: 204, sourceIP: '192.168.1.10', destinationIP: '192.168.1.40', priority: 2 },
  { id: 205, sourceIP: '192.168.1.10', destinationIP: '172.16.0.8', priority: 1 },
  { id: 206, sourceIP: '192.168.1.10', destinationIP: '150.1.1.8', priority: 0 },
].map(Object.freeze));

export const DEMO_EXPECTED_ORDER = Object.freeze([203, 204, 202, 201, 205, 206]);

/** Build independently so a failed sample can never partly replace a live session. */
export function createDemoRouter() {
  const router = new Router();
  let lastAction = null;
  for (const packet of DEMO_PACKETS) {
    const before = router.snapshot();
    const outcome = router.addPacket(packet);
    if (!outcome.accepted) throw new Error('The sample packets exceeded their queue capacity.');
    lastAction = {
      type: 'added',
      packet: { ...outcome.packet, queueIndex: outcome.queueIndex },
      before,
      after: router.snapshot(),
    };
  }
  return { router, lastAction };
}
