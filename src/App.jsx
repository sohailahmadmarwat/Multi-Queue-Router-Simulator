import { useEffect, useRef } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AlertCircle, ArrowRight, BookOpen, CheckCircle2, ChevronRight, CircleHelp, FlaskConical, History, LayoutDashboard, Layers3, Menu, Package, RotateCcw, X } from 'lucide-react';
import { useSimulation } from './context/SimulationContext.jsx';
import Brand from './components/Brand.jsx';
import Dashboard from './pages/Dashboard.jsx';
import PacketManagement from './pages/PacketManagement.jsx';
import QueueManagement from './pages/QueueManagement.jsx';
import ActivityHistory from './pages/ActivityHistory.jsx';
import HowItWorks from './pages/HowItWorks.jsx';

const navigation = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/packets', label: 'Packet Management', icon: Package },
  { path: '/queues', label: 'Queue Management', icon: Layers3 },
  { path: '/history', label: 'Activity History', icon: History },
  { path: '/how-it-works', label: 'How It Works', icon: BookOpen },
];

function SidebarContent({ onNavigate, onReset }) {
  const { state } = useSimulation();
  return <>
    <Link to="/" className="sidebar-brand" aria-label="Multi-Queue Router Simulator home" onClick={onNavigate}><Brand /></Link>
    <div className="sidebar-divider" />
    <p className="nav-label">WORKSPACE</p>
    <nav className="main-nav" aria-label="Main navigation">
      {navigation.map(({ path, label, icon: Icon }) => <NavLink key={path} to={path} end={path === '/'} onClick={onNavigate} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
        <Icon size={19} strokeWidth={1.7} /><span>{label}</span>{path === '/queues' && <span className="nav-count">{state.queuedCount}</span>}
      </NavLink>)}
    </nav>
    <div className="sidebar-bottom">
      <div className="sidebar-help"><span className="help-icon"><FlaskConical size={20} /></span><h3>Your networking sandbox.</h3><p>Create a packet. Follow its route.<br />See the algorithms in action.</p><Link to="/how-it-works" onClick={onNavigate}>Explore the guide <ArrowRight size={14} /></Link></div>
      <button className="reset-button" onClick={() => { onNavigate?.(); onReset(); }}><RotateCcw size={16} /> Reset simulation</button>
      <div className="sidebar-footer"><span className="status-dot" /> Local simulation<span className="version">v1.0</span></div>
    </div>
  </>;
}

export default function App() {
  const location = useLocation();
  const mobileMenu = useRef(null);
  const resetDialog = useRef(null);
  const mainRef = useRef(null);
  const firstRender = useRef(true);
  const { state, resetVersion, notice, dismissNotice, resetSimulation } = useSimulation();
  const currentPage = navigation.find((item) => item.path === location.pathname)?.label || 'Dashboard';

  useEffect(() => {
    document.title = `${currentPage} | Multi-Queue Router Simulator`;
    mobileMenu.current?.close();
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (!firstRender.current) mainRef.current?.focus({ preventScroll: true });
    firstRender.current = false;
  }, [location.pathname, currentPage, resetVersion]);

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="sidebar"><SidebarContent onReset={() => resetDialog.current.showModal()} /></aside>
    <dialog ref={mobileMenu} className="mobile-nav" aria-label="Navigation">
      <button className="icon-button mobile-nav-close" aria-label="Close navigation" onClick={() => mobileMenu.current.close()}><X size={21} /></button>
      <SidebarContent onNavigate={() => mobileMenu.current.close()} onReset={() => resetDialog.current.showModal()} />
    </dialog>
    <div className="main-shell">
      <header className="topbar">
        <div className="topbar-left"><button className="icon-button menu-toggle" aria-label="Open navigation" aria-haspopup="dialog" onClick={() => mobileMenu.current.showModal()}><Menu size={21} /></button><Link to="/" className="mobile-header-brand" aria-label="Multi-Queue Router Simulator home"><Brand /></Link><div className="breadcrumb"><span>Workspace</span><ChevronRight size={13} /><strong>{currentPage}</strong></div></div>
        <div className="topbar-right"><span className="sandbox-label"><FlaskConical size={15} /> Learning sandbox</span><span className="session-status"><span className="status-dot" />{state.queuedCount ? 'Simulation active' : 'Ready to simulate'}</span><Link className="icon-button guide-link" to="/how-it-works" aria-label="Open simulator guide"><CircleHelp size={19} /></Link></div>
      </header>
      <main className="main-content" id="main-content" tabIndex={-1} ref={mainRef}>
        <div className="route-content" key={`${location.pathname}:${resetVersion}`}><Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/packets" element={<PacketManagement />} />
          <Route path="/queues" element={<QueueManagement />} />
          <Route path="/history" element={<ActivityHistory />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes></div>
        <footer className="page-footer"><span>Multi-Queue Router Simulator</span><span>Made for learning. Built on real algorithms.<span className="footer-dot">·</span> In-memory simulation</span></footer>
      </main>
    </div>
    <dialog ref={resetDialog} className="confirmation-dialog" aria-labelledby="reset-title" aria-describedby="reset-description">
      <span className="dialog-icon"><RotateCcw size={23} /></span><h2 id="reset-title">Start a fresh simulation?</h2><p id="reset-description">This clears all {state.queuedCount} queued packets, packet statistics, and activity history.</p>
      <div className="dialog-actions"><button className="button button-secondary" onClick={() => resetDialog.current.close()} autoFocus>Keep simulation</button><button className="button button-danger" onClick={() => { resetSimulation(); resetDialog.current.close(); }}>Reset simulation</button></div>
    </dialog>
    {notice && <div className={`toast toast-${notice.type}`} role="status" aria-live="polite">{notice.type === 'warning' ? <AlertCircle size={19} /> : <CheckCircle2 size={19} />}<span>{notice.text}</span><button className="icon-button" onClick={dismissNotice} aria-label="Dismiss notification"><X size={17} /></button></div>}
  </div>;
}
