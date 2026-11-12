import { ArrowRight, CheckCheck, Inbox, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSimulation } from '../context/SimulationContext.jsx';
import { getSelectionExplanation } from '../core/explanations.js';

export default function NextPacket() {
  const { state, nextPacket, processPacket } = useSimulation();
  const selection = getSelectionExplanation(state);
  return <section className="panel next-packet-panel" aria-labelledby="next-packet-heading">
    <div className="panel-header"><div><p className="eyebrow">READY WHEN YOU ARE</p><h2 id="next-packet-heading">Next to process</h2></div><span className="small-icon cyan"><Play size={17} /></span></div>
    {nextPacket ? <div className="next-packet-details"><div className="next-packet-title"><span className="packet-cube"><span /></span><div><span className="muted small-text">PACKET ID</span><h3>#{nextPacket.id}</h3></div><span className="badge badge-cyan">Queue {nextPacket.queueIndex}</span></div><dl className="packet-definition"><div><dt>Destination</dt><dd className="mono">{nextPacket.destinationIP}</dd></div><div><dt>Priority</dt><dd>{nextPacket.priority} <span className="muted">· lower goes first</span></dd></div></dl></div>
      : <div className="next-empty"><span className="empty-icon"><Inbox size={27} strokeWidth={1.4} /></span><h3>Your next packet awaits</h3><p>Add a packet and the router will<br />find its place in line.</p></div>}
    {nextPacket && <p className="next-selection-reason">{selection.reason}</p>}
    <button className="button button-primary full-width" disabled={!nextPacket} onClick={processPacket}><Play size={15} fill="currentColor" /> Process next packet <ArrowRight size={16} /></button>
    {!nextPacket && <Link className="text-link next-add" to="/packets">Create your first packet <ArrowRight size={13} /></Link>}
    <div className="processing-order"><span>QUEUE ORDER</span><div>{[0, 1, 2, 3].map((index) => <span key={index}>{index > 0 && <ArrowRight size={12} />}<b className={nextPacket?.queueIndex === index ? 'current' : ''}>Q{index}</b></span>)}</div></div>
    {state.lastProcessed && <div className="last-processed"><CheckCheck size={17} /><div><span>Last processed</span><strong>Packet #{state.lastProcessed.id} <span>from Queue {state.lastProcessed.queueIndex}</span></strong></div></div>}
  </section>;
}
