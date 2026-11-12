import { ArrowUpRight, Inbox } from 'lucide-react';

export default function QueueCard({ queue, info, nextPacket }) {
  const count = queue.packets.length;
  return <article className={`panel queue-card tone-${info.color}`} aria-labelledby={`queue-${info.index}-heading`}>
    <div className="queue-head"><div className="queue-name-area"><span className="queue-number">0{info.index}</span><div><h2 id={`queue-${info.index}-heading`}>{info.title}</h2><span className="queue-subtitle">Processing order {info.index + 1} of 4</span></div></div><span className={`queue-state ${count === queue.capacity ? 'is-full' : ''}`}><i/>{count === 0 ? 'Empty' : count === queue.capacity ? 'Full' : 'In use'}</span></div>
    <div className="queue-meta"><span className="route-chip"><ArrowUpRight size={14}/>{info.prefix}</span><span><strong>{count}</strong> / {queue.capacity} slots</span></div>
    <div className="capacity-meter" role="meter" aria-label={`${info.title} occupancy`} aria-valuemin={0} aria-valuemax={queue.capacity} aria-valuenow={count}>{Array.from({ length: queue.capacity }, (_, index) => <span className={index < count ? 'filled' : ''} key={index}/>)}</div>
    <div className="queue-list-labels" aria-hidden="true"><span>Arrival</span><span>Packet / destination</span><span>Priority</span></div>
    <div className="packet-list">{Array.from({ length: queue.capacity }, (_, index) => {
      const packet = queue.packets[index];
      const next = packet && nextPacket?.queueIndex === info.index && nextPacket.id === packet.id;
      return packet ? <div className={`packet-row${next ? ' packet-next' : ''}`} key={`packet-${packet.id}`} data-packet-id={packet.id}><span className="packet-arrival"><strong>{index + 1}</strong><small>index {index}</small></span><div className="packet-details"><div className="packet-row-heading"><strong>Packet #{packet.id}</strong>{next && <span className="next-badge">Up next</span>}</div><span className="packet-destination">To <span className="mono">{packet.destinationIP}</span></span><span className="packet-source">From <span className="mono">{packet.sourceIP}</span></span></div><span className="priority-pill" title={`Priority ${packet.priority}`}>{packet.priority}</span></div>
        : <div className="empty-packet-slot" key={`empty-${index}`}><span className="packet-arrival"><strong>{index + 1}</strong><small>index {index}</small></span><Inbox size={16}/><span>Available slot</span></div>;
    })}</div><p className="queue-card-note">Array indices 0–{queue.capacity - 1} · packets stay in arrival order</p>
  </article>;
}
