import { ArrowRight, ArrowDownToLine, ArrowUpRight, CheckCheck, Code2, GitBranch, Layers3, ListOrdered, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { QUEUE_INFO } from '../core/RoutingTable.js';
import AlgorithmLab from '../components/AlgorithmLab.jsx';

const steps = [
  { number: '01', title: 'Create a packet', icon: ArrowDownToLine, text: 'Give it a unique ID, a source IP, a destination IP, and a priority. Think of a packet as a small envelope of data.' },
  { number: '02', title: 'Find its queue', icon: GitBranch, text: 'The destination IP selects one of four queues. The source IP tells us where the packet came from; it does not select the queue.' },
  { number: '03', title: 'Join the array', icon: Layers3, text: 'The packet is appended to its queue in arrival order. Each array holds up to three packets. A full queue drops new arrivals.' },
  { number: '04', title: 'Process the next', icon: CheckCheck, text: 'The router finds the first nonempty queue, then removes the packet with the lowest priority number from that queue.' },
];

export default function HowItWorks() {
  return (
    <div className="page-stack">
      <div className="page-header"><div><p className="eyebrow">THE LEARNING SANDBOX</p><h1>How it works</h1><p className="page-description">Get to know the data structures behind every packet’s journey.</p></div></div>
      <section className="panel guide-intro">
        <div>
          <span className="eyebrow"><Sparkles size={13} aria-hidden="true" /> A LITTLE THEORY. A LOT OF DISCOVERY.</span>
          <h2>Small packets. <span>Big ideas.</span></h2>
          <p>Explore how a router organizes incoming packets using arrays, priority queues, and a few clear rules. Every action in this simulator lets you see those rules at work.</p>
          <Link to="/packets" className="button button-primary">Try the simulator<ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
        <div className="guide-flow" aria-label="Packet flow: create, route, queue, process">
          <div className="guide-flow-node"><ArrowDownToLine size={21} aria-hidden="true" /><span>Create</span></div><ArrowRight size={16} className="guide-flow-arrow" aria-hidden="true" />
          <div className="guide-flow-node"><GitBranch size={21} aria-hidden="true" /><span>Route</span></div><ArrowRight size={16} className="guide-flow-arrow" aria-hidden="true" />
          <div className="guide-flow-node"><Layers3 size={21} aria-hidden="true" /><span>Queue</span></div><ArrowRight size={16} className="guide-flow-arrow" aria-hidden="true" />
          <div className="guide-flow-node"><CheckCheck size={21} aria-hidden="true" /><span>Process</span></div>
        </div>
      </section>

      <AlgorithmLab />

      <section aria-labelledby="packet-journey-heading">
        <div className="guide-section-heading"><p className="eyebrow">FROM ARRIVAL TO PROCESSING</p><h2 className="section-title" id="packet-journey-heading">A packet’s journey</h2></div>
        <div className="guide-steps">
          {steps.map(({ number, title, icon: Icon, text }) => <article className="panel guide-step" key={number}>
            <div className="guide-step-top"><span className="guide-step-icon"><Icon size={20} aria-hidden="true" /></span><span className="guide-step-number">{number}</span></div>
            <h3>{title}</h3><p>{text}</p>
          </article>)}
        </div>
      </section>

      <div className="guide-grid">
        <section className="panel guide-card" aria-labelledby="routing-rules-heading">
          <div className="guide-card-heading"><span className="guide-card-icon"><GitBranch size={19} aria-hidden="true" /></span><div><p className="eyebrow">01 / ROUTING</p><h2 className="section-title" id="routing-rules-heading">The destination decides</h2></div></div>
          <p className="section-description">The first part of the destination IPv4 address determines its queue.</p>
          <div className="routing-table">
            {QUEUE_INFO.map((queue) => <div className="guide-route-row" key={queue.index}><span className={`queue-dot tone-${queue.color}`} /><code>{queue.index === 0 ? '192.*' : queue.prefix}</code><ArrowRight size={15} aria-hidden="true" /><span>Queue {queue.index}</span></div>)}
          </div>
          <div className="callout"><ShieldCheck size={17} aria-hidden="true" /><p>Any other valid prefix, such as <code>8.8.8.8</code>, goes to <strong>Queue 0</strong>.</p></div>
        </section>

        <section className="panel guide-card" aria-labelledby="processing-rules-heading">
          <div className="guide-card-heading"><span className="guide-card-icon"><ListOrdered size={19} aria-hidden="true" /></span><div><p className="eyebrow">02 / SCHEDULING</p><h2 className="section-title" id="processing-rules-heading">Two rules, one next packet</h2></div></div>
          <ol className="guide-rule-list">
            <li><span>1</span><div><h3>Queue order comes first</h3><p>Check Queue 0, then 1, 2, and 3. Stop at the first queue with a packet.</p></div></li>
            <li><span>2</span><div><h3>The lowest number goes next</h3><p>Within that queue, priority 0 goes before 1, and 1 before 2. Equal priorities follow arrival order (FIFO).</p></div></li>
          </ol>
          <div className="callout"><ListOrdered size={17} aria-hidden="true" /><p>A packet with priority <strong>5 in Queue 0</strong> is processed before priority <strong>0 in Queue 1</strong>.</p></div>
        </section>
      </div>

      <section className="panel guide-array" aria-labelledby="array-queue-heading">
        <div className="guide-array-copy"><div className="guide-card-heading"><span className="guide-card-icon"><Code2 size={19} aria-hidden="true" /></span><div><p className="eyebrow">03 / UNDER THE HOOD</p><h2 className="section-title" id="array-queue-heading">A simple array, doing real work</h2></div></div>
          <p className="section-description">Enqueue adds a packet to the end. Dequeue scans the array for the lowest priority, removes it, and shifts the remaining packets left to close the gap.</p>
          <div className="complexity-tags"><span><code>Enqueue</code> O(1)</span><span><code>Dequeue</code> O(n)</span><span><code>Capacity</code> 3 packets</span></div>
        </div>
        <div className="array-example">
          <div className="array-example-heading"><span>EXAMPLE: ONE QUEUE</span><span>Arrival order <ArrowRight size={12} aria-hidden="true" /></span></div>
          <div className="array-slots">
            <div className="array-slot"><span>Packet #12</span><strong>Priority 3</strong><small>Index 0</small></div>
            <div className="array-slot array-slot-next"><span>Packet #13</span><strong>Priority 1</strong><small>Next to process</small></div>
            <div className="array-slot"><span>Packet #14</span><strong>Priority 1</strong><small>Index 2</small></div>
          </div>
          <p>Packets #13 and #14 share a priority. #13 arrived first, so it goes first.</p>
        </div>
      </section>

      <section className="panel guide-validation" aria-labelledby="validation-heading">
        <div className="guide-card-heading"><span className="guide-card-icon"><ShieldCheck size={19} aria-hidden="true" /></span><div><p className="eyebrow">04 / SAFE INPUTS</p><h2 className="section-title" id="validation-heading">A few useful guardrails</h2></div></div>
        <div className="guide-validation-grid">
          <div><h3>Valid packet details</h3><p>IDs and priorities are nonnegative whole numbers. IPv4 addresses need four numbers from 0 to 255, without leading zeros.</p></div>
          <div><h3>One active ID at a time</h3><p>An ID cannot appear in two queues at once. Once its packet is processed, that ID can be used again.</p></div>
          <div><h3>Full means full</h3><p>A fourth packet for a full queue is dropped and logged. It does not replace a waiting packet, and its ID stays available.</p></div>
        </div>
      </section>
    </div>
  );
}
