import { useRef } from 'react';
import { ArrowRight, CheckCircle2, FlaskConical, Play, RotateCcw } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext.jsx';

export default function DemoControl() {
  const { state, demo, loadDemo } = useSimulation();
  const confirmation = useRef(null);
  function requestDemo() {
    if (state.addedCount || state.processedCount || state.droppedCount || state.queuedCount) confirmation.current.showModal();
    else loadDemo();
  }
  return <>
    <button type="button" className="button button-secondary demo-load" onClick={requestDemo}><FlaskConical size={16}/>{demo?.isDemo ? 'Restart guided demo' : 'Load guided demo'}</button>
    <dialog className="confirmation-dialog demo-confirmation" ref={confirmation} aria-labelledby="demo-confirm-title" aria-describedby="demo-confirm-description">
      <span className="dialog-icon"><FlaskConical size={24}/></span><h2 id="demo-confirm-title">Load the sample scenario?</h2><p id="demo-confirm-description">This replaces your current packets, statistics, and history with six sample packets. You will process them one at a time.</p>
      <div className="dialog-actions"><button type="button" className="button button-secondary" autoFocus onClick={() => confirmation.current.close()}>Keep current simulation</button><button type="button" className="button button-primary demo-confirm-load" onClick={() => { confirmation.current.close(); loadDemo(); }}>Load sample packets</button></div>
    </dialog>
  </>;
}

export function DemoProgress() {
  const { demo, nextPacket, processPacket } = useSimulation();
  if (!demo?.isDemo) return null;
  const done = demo.processedDemoIds.length;
  return <section className={`demo-progress ${demo.completed ? 'demo-complete' : ''}`} aria-labelledby="demo-progress-title">
    <div className="demo-progress-copy"><span className="small-icon cyan">{demo.completed ? <CheckCircle2 size={21}/> : <FlaskConical size={21}/>}</span><div><h2 id="demo-progress-title">{demo.completed ? 'Demo complete. All six sample packets processed.' : 'Guided demo: one packet at a time'}</h2><p>{demo.isModified ? 'You added your own packets. The live queue order below includes your changes.' : 'Watch Queue 0 take precedence, then see minimum priority and FIFO ties in action.'}</p></div><span className="badge">{done} / {demo.initialCount} samples processed</span></div>
    <div className="demo-progress-bottom">{!demo.isModified && <ol className="demo-sequence" aria-label="Sample processing order">{demo.expectedOrder.map((id, index) => <li key={id} className={demo.processedDemoIds.includes(id) ? 'is-processed' : nextPacket?.id === id ? 'is-next' : ''}>{index > 0 && <ArrowRight size={12}/>}<span>{demo.processedDemoIds.includes(id) && <CheckCircle2 size={12}/>}#{id}</span></li>)}</ol>}{demo.isModified && <span className="muted">The next-packet preview always follows the actual router.</span>}{nextPacket && <button type="button" className="button button-primary demo-process" onClick={processPacket}><Play size={14} fill="currentColor"/>Process next packet<ArrowRight size={14}/></button>}{demo.completed && !nextPacket && <span className="demo-finished"><RotateCcw size={14}/>Restart the demo or create a packet to explore more.</span>}</div>
  </section>;
}
