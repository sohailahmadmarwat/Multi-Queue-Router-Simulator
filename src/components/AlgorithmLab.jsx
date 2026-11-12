import { useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, CheckCheck, Code2, GitBranch, Play, RotateCcw, Search, SkipForward } from 'lucide-react';
import { PacketPriorityQueue } from '../core/PacketPriorityQueue.js';
import { getRoutingExplanation, getSelectionExplanation } from '../core/explanations.js';
import '../pages/algorithm-lab.css';

function makePacket(id, priority) {
  return { id, priority, sourceIP: '192.168.1.10', destinationIP: '10.0.0.8' };
}

function createPracticeQueue() {
  const queue = new PacketPriorityQueue(3);
  for (const [id, priority] of [[12, 3], [13, 1], [14, 1]]) queue.enqueue(makePacket(id, priority));
  return queue;
}

function describeScan(scan, scans, packets) {
  const packet = packets[scan.index];
  if (scan.comparison === 'initial') {
    return `Start at index 0. Packet #${packet.id}, with priority ${packet.priority}, is the current minimum.`;
  }
  const previousBest = packets[scans[scan.index - 1].bestIndex];
  if (scan.comparison === 'lower') {
    return `Compare index ${scan.index}: priority ${packet.priority} is lower than ${previousBest.priority}. Packet #${packet.id} becomes the current minimum.`;
  }
  if (scan.comparison === 'equal') {
    return `Compare index ${scan.index}: both priorities are ${packet.priority}. Keep Packet #${previousBest.id}; it arrived before #${packet.id}. FIFO breaks the tie.`;
  }
  return `Compare index ${scan.index}: priority ${packet.priority} is higher than ${previousBest.priority}. Keep Packet #${previousBest.id} as the current minimum.`;
}

export default function AlgorithmLab() {
  const queueRef = useRef(null);
  if (!queueRef.current) queueRef.current = createPracticeQueue();
  const [packets, setPackets] = useState(() => queueRef.current.getPackets());
  const [nextId, setNextId] = useState(15);
  const [scanIndex, setScanIndex] = useState(-1);
  const [moves, setMoves] = useState([]);
  const [removed, setRemoved] = useState(null);
  const [notice, setNotice] = useState({ type: 'info', text: 'Start the scan to compare each packet, or try enqueueing into this full array.' });
  const [destinationIP, setDestinationIP] = useState('10.0.0.8');
  const route = getRoutingExplanation(destinationIP);

  // Narrate the shared selector; the original queue class enacts every mutation.
  const explanation = getSelectionExplanation({ queues: [{ capacity: 3, packets }] });
  const currentScan = scanIndex >= 0 ? explanation.scans[scanIndex] : null;
  const currentBest = currentScan ? packets[currentScan.bestIndex] : null;
  const scanComplete = currentScan && scanIndex === explanation.scans.length - 1;
  const status = currentScan ? describeScan(currentScan, explanation.scans, packets) : notice.text;

  function startScan() {
    if (queueRef.current.isEmpty()) return;
    setScanIndex(0);
    setMoves([]);
    setRemoved(null);
  }

  function enqueueExample() {
    const accepted = queueRef.current.enqueue(makePacket(nextId, 2));
    setPackets(queueRef.current.getPackets());
    setScanIndex(-1);
    setMoves([]);
    setRemoved(null);
    setNotice(accepted
      ? { type: 'success', text: `Enqueued Packet #${nextId} with priority 2 at index ${queueRef.current.items.length - 1}. The new packet is appended to the end of the array.` }
      : { type: 'warning', text: `Overflow: all 3 slots are occupied. Packet #${nextId} was rejected; the array is unchanged. Dequeue a packet to make room.` });
    if (accepted) setNextId(id => id + 1);
  }

  function dequeueSelected() {
    if (!scanComplete) return;
    const before = queueRef.current.getPackets();
    const packet = queueRef.current.dequeue();
    const after = queueRef.current.getPackets();
    const shifts = after.map((item, to) => ({ id: item.id, from: before.findIndex(previous => previous.id === item.id), to })).filter(move => move.from !== move.to);
    const shiftText = shifts.length
      ? `Manual shift: ${shifts.map(move => `Packet #${move.id} moved from index ${move.from} to ${move.to}`).join('; ')}. The duplicated last slot was then popped.`
      : 'No packets needed to shift left. The last array slot was popped.';
    setPackets(after);
    setScanIndex(-1);
    setMoves(shifts);
    setRemoved(packet);
    setNotice({ type: 'success', text: `Dequeued Packet #${packet.id} (priority ${packet.priority}). ${shiftText}` });
  }

  function resetExample() {
    queueRef.current = createPracticeQueue();
    setPackets(queueRef.current.getPackets());
    setNextId(15);
    setScanIndex(-1);
    setMoves([]);
    setRemoved(null);
    setNotice({ type: 'info', text: 'Practice array reset. Start at index 0, then compare each remaining priority in arrival order.' });
  }

  return <section className="panel algorithm-lab" data-testid="algorithm-lab" aria-labelledby="algorithm-lab-heading">
    <div className="lab-heading">
      <span className="lab-heading-icon"><Code2 size={21} aria-hidden="true" /></span>
      <div><p className="eyebrow">TRY IT, ONE STEP AT A TIME</p><h2 id="algorithm-lab-heading">See each decision happen</h2><p className="lab-description">Practice with the same routing rules and array queue implementation used by the simulator.</p></div>
    </div>

    <section className="lab-routing" aria-labelledby="lab-routing-heading">
      <div className="lab-section-heading"><span>01</span><div><h3 id="lab-routing-heading">Where would this packet go?</h3><p>Change the destination to see the prefix rule in action.</p></div></div>
      <div className="lab-routing-grid">
        <div className="lab-route-field">
          <label htmlFor="lab-destination">Destination IPv4 address</label>
          <div className="lab-input-wrap"><GitBranch size={17} aria-hidden="true" /><input id="lab-destination" data-testid="lab-route-input" value={destinationIP} onChange={event => setDestinationIP(event.target.value)} type="text" inputMode="decimal" autoComplete="off" spellCheck={false} aria-invalid={Boolean(destinationIP.trim()) && !route.valid} aria-describedby="lab-destination-help" /></div>
          <p id="lab-destination-help">Four numbers from 0 to 255. No leading zeros.</p>
          <div className="lab-route-examples" role="group" aria-label="Try a destination example">{['192.168.1.8', '10.0.0.8', '8.8.8.8'].map(ip => <button type="button" key={ip} onClick={() => setDestinationIP(ip)}>{ip}{ip === '8.8.8.8' && <span>default</span>}</button>)}</div>
        </div>
        <div className={`lab-route-result ${route.valid ? 'is-valid' : 'is-invalid'}`} data-testid="lab-route-result" role="status" aria-live="polite">
          {route.valid ? <><div className="lab-routing-decision"><span>{route.isDefault ? 'No prefix match' : `Matches ${route.matchedPrefix}`}</span><ArrowRight size={17} aria-hidden="true" /><strong>Queue {route.queueIndex}</strong></div><p>{route.reason}</p></> : <><strong>Enter a valid IPv4 address</strong><p>Use an address such as 172.16.0.8 to find its queue. Invalid addresses cannot be routed.</p></>}
        </div>
      </div>
    </section>

    <section className="lab-practice" aria-labelledby="lab-practice-heading">
      <div className="lab-practice-top"><div className="lab-section-heading"><span>02</span><div><h3 id="lab-practice-heading">Follow a priority queue through its array</h3><p>Practice array · uses the same queue implementation. Your simulation stays unchanged.</p></div></div><button className="button button-secondary lab-reset" type="button" data-testid="lab-reset" onClick={resetExample}><RotateCcw size={15} aria-hidden="true" />Reset example</button></div>
      <div className="lab-array-heading"><span>ARRAY IN ARRIVAL ORDER <ArrowRight size={13} aria-hidden="true" /></span><span>{packets.length} / 3 slots occupied</span></div>
      <ol className="lab-array" data-testid="lab-array" aria-label="Practice queue array in arrival order">
        {Array.from({ length: 3 }, (_, index) => {
          const packet = packets[index];
          const isBest = currentScan?.bestIndex === index;
          const comparing = currentScan?.index === index;
          const move = moves.find(item => item.to === index);
          return <li key={index} data-index={index} data-packet-id={packet?.id ?? ''} data-selected={isBest ? 'true' : 'false'} className={`lab-array-cell ${packet ? '' : 'is-empty'} ${isBest ? 'is-minimum' : ''} ${comparing ? 'is-comparing' : ''} ${move ? 'was-shifted' : ''}`}>
            <span className="lab-index">Index {index}</span>
            {packet ? <><strong>Packet #{packet.id}</strong><span className="lab-priority">Priority <b>{packet.priority}</b></span><span className={`lab-cell-note ${isBest || comparing || move ? 'has-note' : ''}`}>{isBest ? scanComplete ? 'Selected to dequeue' : 'Current minimum' : comparing ? 'Comparing now' : move ? `Shifted ${move.from} → ${move.to}` : 'Waiting in array'}</span></> : <><strong>Empty slot</strong><span className="lab-empty-mark" aria-hidden="true">—</span><span className="lab-cell-note">Ready for enqueue</span></>}
          </li>;
        })}
      </ol>
      <div className="lab-scan-summary"><span><Search size={15} aria-hidden="true" />Current minimum <strong data-testid="lab-candidate">{currentBest ? `#${currentBest.id}` : 'Not scanned'}</strong></span><span>{currentScan ? `Compared ${scanIndex} of ${Math.max(0, packets.length - 1)} remaining slots` : 'Lower priority number goes first'}</span></div>
      <div className={`lab-status ${currentScan ? 'is-info' : `is-${notice.type}`}`} data-testid="lab-status" role="status" aria-live="polite"><span className="lab-status-icon">{removed ? <CheckCheck size={18} aria-hidden="true" /> : <Code2 size={18} aria-hidden="true" />}</span><p>{status}</p></div>
      {currentScan && <ol className="lab-scan-trail" aria-label="Revealed search steps">{explanation.scans.slice(0, scanIndex + 1).map(scan => <li key={scan.index}><span>{scan.index + 1}</span><p>{describeScan(scan, explanation.scans, packets)}</p></li>)}</ol>}
      <div className="lab-controls">
        {scanIndex < 0 ? <button type="button" className="button button-primary" data-testid="lab-start" onClick={startScan} disabled={packets.length === 0}><Play size={15} aria-hidden="true" />Start linear search</button>
          : !scanComplete ? <button type="button" className="button button-primary" data-testid="lab-compare" onClick={() => setScanIndex(index => index + 1)}><SkipForward size={16} aria-hidden="true" />Compare next slot</button>
            : <button type="button" className="button button-primary" data-testid="lab-dequeue" onClick={dequeueSelected}><CheckCheck size={16} aria-hidden="true" />Dequeue #{explanation.packet.id}</button>}
        <button type="button" className="button button-secondary" data-testid="lab-enqueue" onClick={enqueueExample}><ArrowDownToLine size={16} aria-hidden="true" />Enqueue #{nextId}<span className="lab-enqueue-priority">P2</span></button>
      </div>
      <p className="lab-operation-note">Enqueue appends to the array. Dequeue uses a strict <code>&lt;</code> comparison, so equal priorities keep their arrival order. Operations run only when you choose a step.</p>
    </section>
  </section>;
}
