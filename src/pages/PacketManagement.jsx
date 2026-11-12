import { ArrowRight, Info, Layers3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSimulation } from '../context/SimulationContext.jsx';
import PacketForm from '../components/PacketForm.jsx';
import NextPacket from '../components/NextPacket.jsx';
import { QUEUE_INFO } from '../core/RoutingTable.js';
import PacketJourney from '../components/PacketJourney.jsx';
import DemoControl, { DemoProgress } from '../components/DemoControl.jsx';

export default function PacketManagement() {
  const { state, addPacket } = useSimulation();
  return <div className="page-stack"><div className="page-header"><div><p className="eyebrow">CREATE · ROUTE · PROCESS</p><h1>Packet management<span className="heading-dot">.</span></h1><p className="page-description">Give your packet a destination. Let the router do the rest.</p></div><div className="page-actions"><span className="badge badge-cyan"><Layers3 size={14}/>{state.queuedCount} packets queued</span><DemoControl/></div></div>
    <DemoProgress/>
    <div className="packet-workspace"><PacketForm onAdd={addPacket}/><NextPacket/></div>
    <PacketJourney/>
    <section className="panel routing-reference"><div className="panel-header"><div><h2>A quick routing reference</h2><p className="section-description">The first part of the destination IP chooses the queue.</p></div><Link to="/queues" className="text-link">See all queues <ArrowRight size={14}/></Link></div><div className="routing-reference-grid">{QUEUE_INFO.map(info=><div className={`route-reference-item tone-${info.color}`} key={info.index}><span className="queue-dot"/><span className="mono">{info.prefix}</span><ArrowRight size={14}/><strong>Queue {info.index}</strong></div>)}</div><p className="inline-note"><Info size={15}/>Any other valid destination goes to Queue 0. A full queue drops the incoming packet.</p></section>
  </div>;
}
