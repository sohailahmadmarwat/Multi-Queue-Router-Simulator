import { getQueueIndex } from './RoutingTable.js';
import { getNextPacket } from './selectors.js';
import { isValidIPv4 } from './validation.js';

/** Describe the existing routing rule without relaxing its IPv4 validation. */
export function getRoutingExplanation(destinationIP) {
  if (!isValidIPv4(destinationIP)) {
    return {
      valid: false,
      queueIndex: null,
      matchedPrefix: null,
      isDefault: false,
      reason: 'Enter a valid destination IPv4 address to find its queue.',
    };
  }

  const destination = destinationIP.trim();
  const queueIndex = getQueueIndex(destination);
  const prefix = ['192.', '10.', '172.', '150.'].find(value => destination.startsWith(value));
  const matchedPrefix = prefix ? `${prefix}*` : null;
  const isDefault = !prefix;
  return {
    valid: true,
    queueIndex,
    matchedPrefix,
    isDefault,
    reason: isDefault
      ? `${destination} has no matching destination prefix, so it uses the default Queue 0.`
      : `${destination} matches ${matchedPrefix}, so the packet goes to Queue ${queueIndex}.`,
  };
}

/**
 * Trace the same strict-less-than scan as the array queue. The selector remains
 * authoritative for the chosen packet; this helper only explains that choice.
 * `selected` identifies the final winner, while `bestIndex` records each step.
 */
export function getSelectionExplanation(snapshot) {
  const packet = getNextPacket(snapshot);
  if (!packet) {
    return {
      packet: null,
      queueIndex: null,
      skippedQueues: snapshot.queues.map((_, index) => index),
      scans: [],
      reason: 'All four queues are empty. Add a packet before processing.',
      tieCount: 0,
    };
  }

  const { queueIndex } = packet;
  const packets = snapshot.queues[queueIndex].packets;
  let bestIndex = 0;
  const scans = packets.map((candidate, index) => {
    let comparison = 'initial';
    if (index > 0) {
      const bestPriority = packets[bestIndex].priority;
      comparison = candidate.priority < bestPriority ? 'lower'
        : candidate.priority === bestPriority ? 'equal' : 'higher';
      if (candidate.priority < bestPriority) bestIndex = index;
    }
    return {
      index,
      packetId: candidate.id,
      priority: candidate.priority,
      bestIndex,
      comparison,
      selected: candidate.id === packet.id,
    };
  });
  const tieCount = packets.filter(candidate => candidate.priority === packet.priority).length;
  const skippedQueues = Array.from({ length: queueIndex }, (_, index) => index);
  const preceding = queueIndex === 0 ? 'Queue 0 is the first nonempty queue.'
    : `${skippedQueues.map(index => `Queue ${index}`).join(', ')} ${queueIndex === 1 ? 'is' : 'are'} empty, so Queue ${queueIndex} is checked next.`;
  const tieReason = tieCount > 1
    ? ` ${tieCount} packets share that priority; Packet #${packet.id} arrived first, so FIFO breaks the tie.` : '';

  return {
    packet,
    queueIndex,
    skippedQueues,
    scans,
    reason: `${preceding} Queue order takes precedence over priorities in later queues. Packet #${packet.id} has its lowest priority number (${packet.priority}).${tieReason}`,
    tieCount,
  };
}
