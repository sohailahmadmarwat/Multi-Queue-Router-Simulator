import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCheck, GitBranch, Info, Layers3, Package, Play, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSimulation } from '../context/SimulationContext.jsx';
import { getRoutingExplanation, getSelectionExplanation } from '../core/explanations.js';

const stages = [
  { title: 'Packet creation', icon: Package, description: 'Validated details' },
  { title: 'Routing decision', icon: GitBranch, description: 'Match the destination' },
  { title: 'Priority queue', icon: Layers3, description: 'Append in arrival order' },
  { title: 'Packet processing', icon: CheckCheck, description: 'Select, remove, shift' },
];

export default function PacketJourney() {
  const { state, lastAction } = useSimulation();
  // Reviewing steps only changes the explanation; router actions remain explicit.
  const [review, setReview] = useState(null);
  const current = lastAction?.type === 'processed' ? 3 : lastAction ? 2 : 0;
  const step = review?.action === lastAction ? review.step : current;
  const packet = lastAction?.packet;
  const routing = packet ? getRoutingExplanation(packet.destinationIP) : null;
  const selection = getSelectionExplanation(lastAction?.type === 'processed' ? lastAction.before : state);
  const afterQueue = packet ? lastAction.after.queues[packet.queueIndex] : null;
  const arrivalIndex = packet ? lastAction.after.queues[packet.queueIndex].packets.findIndex(item => item.id === packet.id) : -1;
  const dropped = lastAction?.type === 'dropped';
  function chooseStep(value) { setReview({ action: lastAction, step: value }); }

  return <section className="panel packet-journey" aria-labelledby="packet-journey-title" data-testid="packet-journey">
    <div className="panel-header"><div><p className="eyebrow">FOLLOW THE ACTUAL ALGORITHM</p><h2 id="packet-journey-title">A packet’s journey</h2><p className="section-description">Explore the latest action, step by step. Reviewing a step keeps your queues as they are.</p></div><span className={`badge ${dropped ? 'journey-dropped' : 'badge-cyan'}`}>{packet ? `Packet #${packet.id}${dropped ? ' · Dropped' : lastAction.type === 'processed' ? ' · Processed' : ' · Accepted'}` : 'Waiting for a packet'}</span></div>
    <ol className="journey-stages" aria-label="Packet journey steps">{stages.map(({ title, icon: Icon, description }, index) => <li key={title}><button type="button" className={`journey-stage ${index === step ? 'is-current' : ''} ${index < current ? 'is-complete' : ''}`} aria-current={index === step ? 'step' : undefined} aria-controls="journey-detail" onClick={() => chooseStep(index)}><span className="journey-stage-icon"><Icon size={19}/></span><span><strong><span className="journey-step-number">0{index + 1}</span>{title}</strong><small>{description}</small></span></button>{index < 3 && <ArrowRight className="journey-connector" size={16}/>}</li>)}</ol>
    <div className="journey-detail" id="journey-detail" key={`${lastAction?.after.events[0]?.eventId ?? 'empty'}-${step}-${lastAction?.type ?? 'empty'}`} aria-live="polite">
      {!packet ? <div className="journey-empty"><span className="small-icon cyan"><Package size={20}/></span><div><h3>Give your first packet a destination.</h3><p>Create a packet or load the guided demo. Its real destination, queue, and scheduling decision will appear here.</p><Link to="/packets" className="text-link">Open packet management<ArrowRight size={14}/></Link></div></div>
        : step === 0 ? <div className="journey-created"><div><p className="eyebrow">01 / VALIDATE & CREATE</p><h3>Packet #{packet.id} has valid details.</h3><p>The ID and priority are nonnegative whole numbers. Both IP addresses are valid IPv4 addresses; the ID was available when this packet was submitted.</p></div><dl className="journey-packet-fields"><div><dt>Source IP</dt><dd className="mono">{packet.sourceIP}</dd></div><div><dt>Destination IP</dt><dd className="mono">{packet.destinationIP}</dd></div><div><dt>Priority</dt><dd>{packet.priority}</dd></div></dl></div>
        : step === 1 ? <div className="journey-routing"><div><p className="eyebrow">02 / ROUTE BY DESTINATION</p><h3>{routing.isDefault ? 'No listed prefix matches. Use Queue 0.' : `${routing.matchedPrefix} matches Queue ${routing.queueIndex}.`}</h3><p>{routing.reason} The source IP does not choose the queue.</p></div><div className="journey-route-match"><code>{packet.destinationIP}</code><ArrowRight size={17}/><span className="badge badge-cyan">{routing.isDefault ? 'Default route' : routing.matchedPrefix}</span><ArrowRight size={17}/><strong>Queue {routing.queueIndex}</strong></div></div>
        : step === 2 ? <div className="journey-queue"><div><p className="eyebrow">03 / ENQUEUE INTO AN ARRAY</p><h3>{dropped ? `Queue ${packet.queueIndex} was full. This packet was dropped.` : lastAction.type === 'processed' ? `Packet #${packet.id} has left Queue ${packet.queueIndex}.` : `Packet #${packet.id} joined Queue ${packet.queueIndex} at index ${arrivalIndex}.`}</h3><p>{dropped ? 'All three array slots were occupied. The router kept the waiting packets, recorded a drop, and left this ID available for reuse.' : lastAction.type === 'processed' ? 'Dequeue removed the selected packet and shifted every following array element left. The remaining packets keep their relative arrival order.' : 'Enqueue appended this packet at the end. The array stays in arrival order; dequeue finds the minimum priority when you process a packet.'}</p></div><div className="journey-array" aria-label={`Queue ${packet.queueIndex} immediately after the latest action`}>{Array.from({ length: afterQueue.capacity }, (_, index) => <div key={index} className={afterQueue.packets[index]?.id === packet.id ? 'is-highlighted' : ''}><span>Index {index}</span><strong>{afterQueue.packets[index] ? `#${afterQueue.packets[index].id}` : 'Empty'}</strong><small>{afterQueue.packets[index] ? `Priority ${afterQueue.packets[index].priority}` : 'Available slot'}</small></div>)}</div><small className="journey-snapshot-label">Array immediately after this action</small></div>
        : <div className="journey-processing"><div><p className="eyebrow">04 / SELECT & DEQUEUE</p><h3>{selection.packet ? `${lastAction.type === 'processed' ? 'Processed' : 'Next to process'}: Packet #${selection.packet.id} from Queue ${selection.queueIndex}` : 'Every queue is empty.'}</h3><p>{selection.reason}</p>{dropped && <p className="journey-warning"><XCircle size={15}/>Packet #{packet.id} was dropped and is never a processing candidate.</p>}</div>{selection.packet && <div className="journey-search"><p className="journey-search-heading">Linear search in Queue {selection.queueIndex} · actual array order</p><ol>{selection.scans.map(scan => <li key={scan.index} className={scan.selected ? 'is-selected' : ''}><span>Index {scan.index}</span><strong>#{scan.packetId} <small>P{scan.priority}</small></strong><span>{scan.comparison === 'initial' ? 'Start with this packet' : scan.comparison === 'lower' ? 'Lower priority → new minimum' : scan.comparison === 'equal' ? 'Equal → keep earlier arrival' : 'Higher → keep current minimum'}</span>{scan.selected && <span className="badge badge-cyan">Selected</span>}</li>)}</ol></div>}{lastAction.type === 'processed' && <p className="journey-processed-note"><CheckCheck size={16}/>This decision was taken from the queue state immediately before processing Packet #{packet.id}.</p>}</div>}
    </div>
    <div className="journey-footer"><span><Info size={14}/>Queue order first. Minimum priority next. FIFO for ties.</span><div><button type="button" className="button button-secondary journey-previous" disabled={step === 0} onClick={() => chooseStep(step - 1)}><ArrowLeft size={14}/>Previous</button><button type="button" className="button button-secondary journey-next" disabled={step === 3} onClick={() => chooseStep(step + 1)}>Next step<ArrowRight size={14}/></button></div></div>
  </section>;
}
