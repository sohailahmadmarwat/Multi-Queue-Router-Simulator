import { ArrowRight, Info, Play, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSimulation } from '../context/SimulationContext.jsx';
import { QUEUE_INFO } from '../core/RoutingTable.js';
import QueueCard from '../components/QueueCard.jsx';
import PacketJourney from '../components/PacketJourney.jsx';
import DemoControl, { DemoProgress } from '../components/DemoControl.jsx';

export default function QueueManagement() {
  const { state, nextPacket, processPacket } = useSimulation();
  return <div className="page-stack"><div className="page-header"><div><p className="eyebrow">A PLACE FOR EVERY PACKET</p><h1>Queue management<span className="heading-dot">.</span></h1><p className="page-description">Follow your packets from arrival to their turn in line.</p></div><div className="page-actions"><DemoControl/><Link className="button button-primary" to="/packets"><Plus size={17}/>Add a packet</Link></div></div>
    <div className="queue-summary"><div><span className="status-dot"/><strong>{state.queuedCount} / 12</strong><span>slots occupied</span><span className="summary-divider"/><strong>4</strong><span>priority queues</span></div><span className="muted">Packets below appear in arrival order.</span></div>
    <div className="queue-service-order" aria-label="Queue processing order">{state.queues.map((queue,index)=><div className={nextPacket?.queueIndex === index ? 'is-active' : ''} key={index}><span className="service-order-number">{index + 1}</span><span><strong>Queue {index}</strong><small>{queue.packets.length ? `${queue.packets.length} waiting` : 'Empty · skipped'}</small></span>{index < 3 && <ArrowRight size={15}/>}</div>)}</div>
    <DemoProgress/>
    <div className="queues-grid">{state.queues.map((queue,index)=><QueueCard key={index} queue={queue} info={QUEUE_INFO[index]} nextPacket={nextPacket}/>)}</div>
    <section className="panel queue-processing"><div className="queue-processing-copy"><span className="small-icon cyan"><Play size={18}/></span><div><h2>{nextPacket ? `Up next: Packet #${nextPacket.id}` : 'Ready for your first packet'}</h2><p className="section-description">{nextPacket ? `Queue ${nextPacket.queueIndex} · Priority ${nextPacket.priority} · Destination ${nextPacket.destinationIP}` : 'Create a packet to see routing and priorities in action.'}</p></div></div>{nextPacket ? <button className="button button-primary" onClick={processPacket}><Play size={15} fill="currentColor"/>Process next packet<ArrowRight size={16}/></button> : <Link className="button button-secondary" to="/packets"><Plus size={16}/>Create a packet</Link>}</section>
    <div className="callout"><Info size={18}/><p>The router checks <strong>Queue 0 → 1 → 2 → 3</strong>. In the first nonempty queue, the lowest priority number goes first. Equal priorities follow arrival order.</p></div>
    <PacketJourney/>
  </div>;
}
