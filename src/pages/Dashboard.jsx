import { ArrowDownToLine, ArrowRight, BookOpen, CheckCheck, ChevronRight, Layers3, Plus, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSimulation } from '../context/SimulationContext.jsx';
import { QUEUE_INFO } from '../core/RoutingTable.js';
import NextPacket from '../components/NextPacket.jsx';
import ActivityLog from '../components/ActivityLog.jsx';
import Brand from '../components/Brand.jsx';
import DemoControl, { DemoProgress } from '../components/DemoControl.jsx';

function Metric({ icon: Icon, label, value, hint, tone }) {
  return <article className="panel metric-card"><div className="metric-top"><span>{label}</span><span className={`small-icon ${tone}`}><Icon size={18} /></span></div><div className="metric-bottom"><strong>{value.toString().padStart(2, '0')}</strong><span>{hint}</span></div></article>;
}

function WelcomeBrand() {
  return <div className="welcome-brand"><Brand className="welcome-brand-image" /><span>ONE ROUTER. FOUR POSSIBILITIES.</span></div>;
}

export default function Dashboard() {
  const { state } = useSimulation();
  const capacity = state.queues.reduce((total, queue) => total + queue.capacity, 0);
  return <div className="page-stack">
    <div className="page-header"><div><p className="eyebrow">YOUR NETWORKING WORKSPACE</p><h1>Dashboard<span className="heading-dot">.</span></h1><p className="page-description">A little clarity into how packets find their way.</p></div><div className="page-actions"><DemoControl/><Link className="button button-primary" to="/packets"><Plus size={17} /> Add a packet</Link></div></div>
    <section className="welcome-banner"><div className="welcome-copy"><span className="welcome-tag"><span className="status-dot" /> INTERACTIVE ROUTER SIMULATOR</span><h2>Small packets.<br /><span>Big understanding.</span></h2><p>Explore routing and priority queues, one packet at a time.<br className="desktop-break" /> Your hands-on space to make DSA click.</p><Link className="welcome-link" to="/how-it-works">See how it works <ArrowRight size={15} /></Link></div><WelcomeBrand /></section>
    <section className="stats-grid" aria-label="Packet statistics"><Metric icon={Layers3} label="Packets in queue" value={state.queuedCount} hint={`of ${capacity} available slots`} tone="cyan" /><Metric icon={ArrowDownToLine} label="Total accepted" value={state.addedCount} hint="successfully added" tone="blue" /><Metric icon={CheckCheck} label="Processed" value={state.processedCount} hint="completed this session" tone="teal" /><Metric icon={XCircle} label="Dropped" value={state.droppedCount} hint="due to full queues" tone="amber" /></section>
    <DemoProgress/>
    <div className="dashboard-grid"><section className="panel queue-overview"><div className="panel-header"><div><h2>Queue overview</h2><p className="section-description">Four queues. Three slots each. All in view.</p></div><Link className="text-link" to="/queues">View queues <ArrowRight size={14} /></Link></div><div className="overview-column-labels"><span>QUEUE / ROUTE</span><span>OCCUPANCY</span><span>STATUS</span></div><div className="overview-rows">{state.queues.map((queue,index) => { const count=queue.packets.length; const info=QUEUE_INFO[index]; return <Link className={`overview-row tone-${info.color}`} to="/queues" key={index}><span className="overview-queue"><span className="queue-number">0{index}</span><span><strong>Queue {index}</strong><small className="mono">{info.prefix}</small></span></span><span className="overview-capacity"><span className="slot-meter">{Array.from({length:queue.capacity},(_,slot)=><i className={slot<count?'filled':''} key={slot}/>)}</span><span>{count}<span className="muted"> / {queue.capacity}</span></span></span><span className={`queue-state ${count===queue.capacity?'is-full':''}`}><i />{count===0?'Empty':count===queue.capacity?'Full':'In use'}</span></Link>; })}</div><div className="panel-note"><span className="status-dot" /><span>{state.queuedCount} packets queued across 4 queues</span><span className="mono">{Math.round(state.queuedCount/capacity*100)}% occupied</span></div></section><NextPacket /></div>
    <div className="dashboard-bottom"><ActivityLog events={state.events}/><section className="learn-card"><span className="learn-icon"><BookOpen size={21} strokeWidth={1.6}/></span><span className="eyebrow">A CONCEPT, MADE CLEAR</span><h2>Why does priority matter?</h2><p>Within a queue, a lower priority number goes first. If two packets tie, the first to arrive wins.</p><Link className="text-link" to="/how-it-works">Get to know the algorithms <ChevronRight size={15}/></Link><div className="priority-example" aria-label="Example: priority 1 is processed before priority 3"><span>P1 <span>FIRST</span></span><ArrowRight size={15}/><span>P3 <span>NEXT</span></span></div></section></div>
  </div>;
}
