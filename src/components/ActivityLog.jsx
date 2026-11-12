import { Activity, ArrowDownToLine, ArrowRight, CheckCheck, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const icons = { added: ArrowDownToLine, processed: CheckCheck, dropped: XCircle };
export default function ActivityLog({ events }) {
  return <section className="panel activity-panel" aria-labelledby="recent-activity-heading"><div className="panel-header"><div><h2 id="recent-activity-heading">Recent activity</h2><p className="section-description">A quick look at your latest packet events.</p></div><Link className="text-link" to="/history">View history<ArrowRight size={14}/></Link></div>
    {events.length === 0 ? <div className="activity-empty"><span className="empty-icon"><Activity size={26} strokeWidth={1.5}/></span><h3>A clean slate. A new experiment.</h3><p>Your packet activity will show up here.<br/>Add a packet to start the story.</p><Link to="/packets" className="text-link">Create a packet<ArrowRight size={14}/></Link></div>
      : <ul className="event-list">{events.slice(0,4).map(event => { const Icon=icons[event.type]; return <li className={`event-item event-${event.type}`} key={event.eventId}><span className="event-icon"><Icon size={16}/></span><div><p>{event.description}</p><small>{event.type === 'added' ? 'Accepted' : event.type === 'processed' ? 'Processed' : 'Dropped'} · Queue {event.queueIndex}</small></div><time dateTime={event.at}>{new Date(event.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time></li>; })}</ul>}
  </section>;
}
