import { AlertCircle, ArrowRight, CheckCircle2, Info, Plus, RotateCcw } from 'lucide-react';
import { useRef, useState } from 'react';
import { getQueueIndex } from '../core/RoutingTable.js';
import { isValidIPv4, parseNonnegativeInteger } from '../core/validation.js';
import { useSimulation } from '../context/SimulationContext.jsx';

const initialForm = { id: '', sourceIP: '', destinationIP: '', priority: '1' };
const fields = [
  { key: 'id', label: 'Packet ID', placeholder: 'e.g. 101', inputMode: 'numeric', description: 'A unique, nonnegative whole number.' },
  { key: 'priority', label: 'Priority', placeholder: 'e.g. 1', inputMode: 'numeric', description: 'Lower number = higher priority. Starts at 0.' },
  { key: 'sourceIP', label: 'Source IP address', placeholder: 'e.g. 192.168.1.10', description: 'Where this packet comes from.' },
  { key: 'destinationIP', label: 'Destination IP address', placeholder: 'e.g. 10.0.0.8', description: 'Where it is going. This selects the queue.' },
];

export default function PacketForm({ onAdd }) {
  const { state } = useSimulation();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const inputs = useRef({});
  const validDestination = isValidIPv4(form.destinationIP);
  const targetQueue = validDestination ? getQueueIndex(form.destinationIP.trim()) : null;

  function submit(event) {
    event.preventDefault();
    const nextErrors = {};
    for (const key of ['id', 'priority']) {
      try { parseNonnegativeInteger(form[key], key === 'id' ? 'Packet ID' : 'Priority'); }
      catch (error) { nextErrors[key] = error.message; }
    }
    for (const key of ['sourceIP', 'destinationIP']) {
      if (!isValidIPv4(form[key])) nextErrors[key] = 'Use four numbers from 0 to 255, without leading zeros.';
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setResult(null);
      inputs.current[Object.keys(nextErrors)[0]]?.focus();
      return;
    }
    const outcome = onAdd(form);
    if (outcome.error) {
      setErrors({ id: outcome.error });
      setResult(null);
      inputs.current.id?.focus();
      return;
    }
    setErrors({});
    setResult(outcome);
    if (outcome.accepted) setForm(initialForm);
  }

  function useExample() {
    const activeIDs = new Set(state.queues.flatMap(queue => queue.packets.map(packet => packet.id)));
    let id = 101;
    while (activeIDs.has(id)) id += 1;
    setForm({ id: String(id), sourceIP: '192.168.1.10', destinationIP: '10.0.0.8', priority: '1' });
    setErrors({});
    setResult(null);
    inputs.current.id?.focus();
  }

  return <section className="panel form-card" aria-labelledby="add-packet-heading">
    <div className="panel-header"><div><p className="eyebrow">01 / CREATE & ROUTE</p><h2 id="add-packet-heading">Create a packet</h2></div><button type="button" className="text-link example-button" onClick={useExample}><RotateCcw size={14}/>Fill example</button></div>
    <p className="section-description form-intro">Start with the details below, or fill an example to give it a try.</p>
    <form onSubmit={submit} noValidate>
      <div className="form-grid">{fields.map(field => <div className="input-group" key={field.key}><label htmlFor={`packet-${field.key}`}>{field.label}<span aria-hidden="true"> *</span></label><input id={`packet-${field.key}`} name={field.key} ref={node => { inputs.current[field.key] = node; }} autoComplete="off" inputMode={field.inputMode || 'decimal'} value={form[field.key]} placeholder={field.placeholder} required aria-invalid={Boolean(errors[field.key])} aria-describedby={`packet-${field.key}-help${errors[field.key] ? ` packet-${field.key}-error` : ''}`} onChange={event => { setForm(previous => ({ ...previous, [field.key]: event.target.value })); setErrors(previous => ({ ...previous, [field.key]: undefined })); setResult(null); }}/><small id={`packet-${field.key}-help`}>{field.description}</small>{errors[field.key] && <span className="field-error" id={`packet-${field.key}-error`} role="alert">{errors[field.key]}</span>}</div>)}</div>
      <div className={`route-preview ${validDestination ? 'has-route' : ''}`}><span className="small-icon cyan"><ArrowRight size={16}/></span><div><strong>{validDestination ? `This packet will route to Queue ${targetQueue}` : 'Your route will appear here'}</strong><p>{validDestination ? `${state.queues[targetQueue].packets.length} of 3 slots occupied${state.queues[targetQueue].packets.length === 3 ? ' · Full: this packet will be dropped.' : ' · Ready to accept a packet.'}` : 'Enter a valid destination IP to preview its queue.'}</p></div></div>
      <button className="button button-primary full-width" type="submit"><Plus size={17}/>Add packet to queue<ArrowRight size={17}/></button>
      <p className="form-note"><Info size={13}/>All fields are required. No real network traffic is sent.</p>
    </form>
    {result && <div className={`form-result ${result.accepted ? 'accepted' : 'dropped'}`} role="status">{result.accepted ? <CheckCircle2 size={19}/> : <AlertCircle size={19}/>}<div><strong>{result.accepted ? `Packet #${result.packet.id} accepted` : `Packet #${result.packet.id} dropped`}</strong><p>{result.accepted ? `Added to Queue ${result.queueIndex} with priority ${result.packet.priority}.` : `Queue ${result.queueIndex} is full. Process a packet to make room, then try again.`}</p></div></div>}
  </section>;
}
