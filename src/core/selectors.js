/** Preview the router's next dequeue without sorting or changing its arrays. */
export function getNextPacket(snapshot) {
  for (let queueIndex = 0; queueIndex < snapshot.queues.length; queueIndex += 1) {
    const packets = snapshot.queues[queueIndex].packets;
    if (packets.length === 0) continue;

    let next = packets[0];
    for (let index = 1; index < packets.length; index += 1) {
      if (packets[index].priority < next.priority) next = packets[index];
    }
    return { ...next, queueIndex };
  }
  return null;
}
