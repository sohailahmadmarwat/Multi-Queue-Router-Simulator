import { useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowRight, CheckCheck, Clock3, History, Search, SearchX, X, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSimulation } from '../context/SimulationContext.jsx';

const eventTypes = {
  added: { label: 'Accepted', icon: ArrowDownToLine, tone: 'cyan' },
  processed: { label: 'Processed', icon: CheckCheck, tone: 'teal' },
  dropped: { label: 'Dropped', icon: XCircle, tone: 'amber' },
};

const filters = [
  { value: 'all', label: 'All events' },
  { value: 'added', label: 'Accepted' },
  { value: 'processed', label: 'Processed' },
  { value: 'dropped', label: 'Dropped' },
];

export default function ActivityHistory() {
  const { state } = useSimulation();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const counts = useMemo(() => state.events.reduce((result, event) => {
    result[event.type] = (result[event.type] || 0) + 1;
    return result;
  }, { all: state.events.length }), [state.events]);
  const visibleEvents = useMemo(() => {
    const search = query.trim().toLowerCase().replace(/^#/, '');
    return state.events.filter((event) => (
      (filter === 'all' || event.type === filter)
      && (!search || String(event.packetId).includes(search) || event.description.toLowerCase().includes(search))
    ));
  }, [state.events, filter, query]);

  function clearFilters() {
    setFilter('all');
    setQuery('');
  }

  return (
    <div className="page-stack">
      <div className="page-header"><div><p className="eyebrow">FOLLOW THE PACKET TRAIL</p><h1>Activity history</h1><p className="page-description">Every arrival, every decision. See what happened in your simulation.</p></div></div>
      <div className="history-summary-grid">
        {[
          { type: 'added', count: state.addedCount, description: 'Successfully added to a queue' },
          { type: 'processed', count: state.processedCount, description: 'Removed by the scheduler' },
          { type: 'dropped', count: state.droppedCount, description: 'Rejected because a queue was full' },
        ].map(({ type, count, description }) => {
          const { label, icon: Icon, tone } = eventTypes[type];
          return <article className={`panel history-summary tone-${tone}`} key={type}>
            <span className="history-summary-icon"><Icon size={19} aria-hidden="true" /></span>
            <div><span className="muted">{label}</span><strong>{count}</strong><p>{description}</p></div>
          </article>;
        })}
      </div>

      <section className="panel history-panel" aria-labelledby="event-history-heading">
        <div className="panel-header">
          <div><h2 className="section-title" id="event-history-heading">Simulation timeline</h2><p className="section-description">Your latest 40 events, with the newest first.</p></div>
          <span className="badge"><Clock3 size={13} aria-hidden="true" /> Current session</span>
        </div>
        <div className="history-toolbar">
          <div className="filter-tabs" role="group" aria-label="Filter activity by event type">
            {filters.map(({ value, label }) => <button key={value} type="button" className={`filter-tab ${filter === value ? 'active' : ''}`} aria-pressed={filter === value} onClick={() => setFilter(value)}>
              {label}<span className="filter-count">{counts[value] || 0}</span>
            </button>)}
          </div>
          <div className="search-field">
            <Search size={16} aria-hidden="true" />
            <label className="sr-only" htmlFor="history-search">Search by packet ID or event description</label>
            <input id="history-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search packet ID or event…" />
            {query && <button className="icon-button" type="button" aria-label="Clear search" onClick={() => setQuery('')}><X size={14} aria-hidden="true" /></button>}
          </div>
        </div>

        {visibleEvents.length ? <>
          <div className="table-wrap">
            <table className="data-table history-table">
              <caption className="sr-only">Simulation events, newest first</caption>
              <thead><tr><th scope="col">Event</th><th scope="col">Packet</th><th scope="col">Details</th><th scope="col">Time</th></tr></thead>
              <tbody>{visibleEvents.map((event) => {
                const { label, icon: Icon, tone } = eventTypes[event.type];
                const date = new Date(event.at);
                return <tr key={event.eventId}>
                  <td><span className={`event-badge tone-${tone}`}><Icon size={14} aria-hidden="true" />{label}</span></td>
                  <td><span className="packet-id mono">#{event.packetId}</span><span className="history-queue">Queue {event.queueIndex}</span></td>
                  <td className="history-description">{event.description}</td>
                  <td><time dateTime={event.at} title={date.toLocaleString()} className="history-time"><span className="mono">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span><small>{date.toLocaleDateString([], { month: 'short', day: 'numeric' })}</small></time></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          <div className="history-table-footer" role="status">Showing {visibleEvents.length} of {state.events.length} retained events<span>Statistics above include the entire session.</span></div>
        </> : <div className="empty-state history-empty-state">
          <span className="empty-icon">{state.events.length ? <SearchX size={25} aria-hidden="true" /> : <History size={25} aria-hidden="true" />}</span>
          <h3>{state.events.length ? 'No matching events' : 'Your simulation starts here'}</h3>
          <p>{state.events.length ? 'Try another packet ID or select a different event type.' : 'Add your first packet to see where it goes. Accepted, processed, and dropped events will appear here.'}</p>
          {state.events.length ? <button type="button" className="button button-secondary" onClick={clearFilters}>Clear filters</button> : <Link to="/packets" className="button button-primary">Add a packet<ArrowRight size={16} aria-hidden="true" /></Link>}
          <span className="sr-only" role="status">No events to show.</span>
        </div>}
      </section>
      <p className="history-session-note"><Clock3 size={14} aria-hidden="true" /> Activity stays available as you move between pages. Resetting or refreshing starts a new session.</p>
    </div>
  );
}
