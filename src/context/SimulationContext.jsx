import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Router } from '../core/Router.js';
import { getNextPacket } from '../core/selectors.js';
import { createDemoRouter, DEMO_EXPECTED_ORDER, DEMO_PACKETS } from '../core/demo.js';

const SimulationContext = createContext(null);
const emptyDemo = {
  isDemo: false,
  initialCount: 0,
  packetIds: [],
  expectedOrder: [],
  processedDemoIds: [],
  isModified: false,
  completed: false,
};

/** Keep one simulator above the routes so navigation never resets its state. */
export function SimulationProvider({ children }) {
  const routerRef = useRef(null);
  if (routerRef.current === null) routerRef.current = new Router();

  const [state, setState] = useState(() => routerRef.current.snapshot());
  const [notice, setNotice] = useState(null);
  const [resetVersion, setResetVersion] = useState(0);
  const [lastAction, setLastAction] = useState(null);
  const [demo, setDemo] = useState(emptyDemo);

  const addPacket = useCallback((form) => {
    try {
      const before = routerRef.current.snapshot();
      const outcome = routerRef.current.addPacket(form);
      const after = routerRef.current.snapshot();
      setState(after);
      const { packet, queueIndex, accepted } = outcome;
      setLastAction({ type: accepted ? 'added' : 'dropped', packet: { ...packet, queueIndex }, before, after });
      setDemo(current => current.isDemo && accepted ? { ...current, isModified: true } : current);
      const capacity = routerRef.current.queues[queueIndex].capacity;
      setNotice(accepted
        ? { type: 'success', text: `Packet #${packet.id} added to Queue ${queueIndex}.` }
        : { type: 'warning', text: `Queue ${queueIndex} is full (${capacity}/${capacity}). Packet #${packet.id} was dropped.` });
      return outcome;
    } catch (error) {
      setNotice(null);
      return { error: error.message };
    }
  }, []);

  const processPacket = useCallback(() => {
    const before = routerRef.current.snapshot();
    const packet = routerRef.current.processPacket();
    const after = routerRef.current.snapshot();
    setState(after);
    if (packet) {
      setLastAction({ type: 'processed', packet: { ...packet }, before, after });
      setDemo(current => {
        if (!current.isDemo || !current.packetIds.includes(packet.id) || current.processedDemoIds.includes(packet.id)) return current;
        const processedDemoIds = [...current.processedDemoIds, packet.id];
        return { ...current, processedDemoIds, completed: processedDemoIds.length === current.initialCount };
      });
    }
    setNotice(packet
      ? { type: 'success', text: `Packet #${packet.id} processed from Queue ${packet.queueIndex}.` }
      : { type: 'warning', text: 'All queues are empty. Add a packet first.' });
    return packet;
  }, []);

  // The caller presents the reset confirmation before invoking this action.
  const resetSimulation = useCallback(() => {
    routerRef.current = new Router();
    setState(routerRef.current.snapshot());
    setResetVersion(version => version + 1);
    setLastAction(null);
    setDemo(emptyDemo);
    setNotice({ type: 'success', text: 'Simulation reset. All queues and activity are clear.' });
  }, []);

  // The caller confirms replacement of a nonempty session before loading.
  const loadDemo = useCallback(() => {
    const prepared = createDemoRouter();
    routerRef.current = prepared.router;
    setState(prepared.router.snapshot());
    setLastAction(prepared.lastAction);
    setDemo({
      isDemo: true,
      initialCount: DEMO_PACKETS.length,
      packetIds: DEMO_PACKETS.map(packet => packet.id),
      expectedOrder: [...DEMO_EXPECTED_ORDER],
      processedDemoIds: [],
      isModified: false,
      completed: false,
    });
    setResetVersion(version => version + 1);
    setNotice({ type: 'success', text: 'Demo loaded. Six packets are ready across all four queues. Process one at a time to follow the rules.' });
    return { count: DEMO_PACKETS.length };
  }, []);

  const dismissNotice = useCallback(() => setNotice(null), []);
  const value = useMemo(() => ({
    state,
    resetVersion,
    lastAction,
    demo,
    nextPacket: getNextPacket(state),
    addPacket,
    processPacket,
    resetSimulation,
    loadDemo,
    notice,
    dismissNotice,
  }), [state, resetVersion, lastAction, demo, addPacket, processPacket, resetSimulation, loadDemo, notice, dismissNotice]);

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation() {
  const simulation = useContext(SimulationContext);
  if (simulation === null) throw new Error('useSimulation must be used inside SimulationProvider.');
  return simulation;
}
