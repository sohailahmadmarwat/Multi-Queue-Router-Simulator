/** Intentionally mirrors the fixed-prefix rules of the Java simulator. */
export function getQueueIndex(destinationIP) {
  if (destinationIP.startsWith('192.')) return 0;
  if (destinationIP.startsWith('10.')) return 1;
  if (destinationIP.startsWith('172.')) return 2;
  if (destinationIP.startsWith('150.')) return 3;
  return 0;
}

export const QUEUE_INFO = [
  { index: 0, title: 'Queue 0', prefix: '192.* / Default', color: 'cyan', type: 'Primary lane' },
  { index: 1, title: 'Queue 1', prefix: '10.*', color: 'violet', type: 'Private lane' },
  { index: 2, title: 'Queue 2', prefix: '172.*', color: 'blue', type: 'Private lane' },
  { index: 3, title: 'Queue 3', prefix: '150.*', color: 'amber', type: 'External lane' },
];
