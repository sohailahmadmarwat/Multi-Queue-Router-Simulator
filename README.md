# Multi-Queue Router Simulator

A responsive educational simulator built with React, JavaScript, React Router, Tailwind CSS, and Vite. Create packets, follow their destination routes, and see array-based priority queues in action. Everything runs locally in the browser; no authentication, backend, database, or real network traffic is involved.

## Run locally

Use Node.js 22 or later and npm. Open a terminal in this project folder:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173/`. Stop the server with `Ctrl+C`.

## Five pages, one simulation

| Page | Route | What you can do |
| --- | --- | --- |
| Dashboard | `/` | See real session statistics, queue occupancy, the next packet, recent activity, and guided-demo progress. |
| Packet Management | `/packets` | Create packets, validate inputs, process packets, and review the latest real packet journey. |
| Queue Management | `/queues` | Inspect arrival indices, priorities, capacity, processing order, and the latest packet journey. |
| Activity History | `/history` | Search and filter accepted, processed, and dropped events. |
| How It Works | `/how-it-works` | Learn the rules and step through an interactive routing and array-queue practice lab. |

`SimulationProvider` sits above the routes and owns a single `Router` instance. Moving between pages preserves the queues, statistics, and history. Refreshing the browser or confirming **Reset simulation** starts a new session. The latest 40 activity events are retained; statistics cover the entire current session.

## Hands-on explanations

- **Packet journey:** Review creation, routing, enqueue, and processing for the latest real action. Before-and-after snapshots explain the actual decision; reviewing steps does not change the simulation.
- **Queue visibility:** Compact packet cards show arrival indices and per-queue processing order. The next-packet explanation shows queue precedence, minimum priority, and FIFO ties.
- **Guided demo:** Load six samples through the real router, then process each explicitly. Progress follows the sample order `203 → 204 → 202 → 201 → 205 → 206`. Loading samples requires confirmation before replacing an existing session. Adding your own accepted packets hides the sample sequence and follows the actual updated queues. There is no automatic processing.
- **Practice lab:** Try destination prefixes, default routing, and invalid IPv4 inputs. In a clearly separate practice array, reveal each linear-search comparison, follow FIFO ties, enqueue into available slots, reject overflow, and dequeue to see the manual left shift. Queue operations use the original `PacketPriorityQueue` class; the live simulation stays unchanged.

## Original DSA rules

- Four array-based queues, with a fixed capacity of **3 packets each**.
- Destination prefixes select the queue: `192.*` → Queue 0, `10.*` → Queue 1, `172.*` → Queue 2, and `150.*` → Queue 3. Other valid IPv4 addresses default to Queue 0.
- Processing checks **Queue 0 → 1 → 2 → 3**, serving the first nonempty queue.
- Inside that queue, a manual linear scan selects the **lowest numerical priority**. Equal priorities use arrival order (FIFO). Remaining array elements shift left after removal.
- Queue order takes precedence over packet priority: priority 5 in Queue 0 goes before priority 0 in Queue 1.
- IDs and priorities must be nonnegative safe whole numbers. IPv4 addresses need four octets from 0 to 255, without leading zeros.
- Active packet IDs must be unique. A processed packet's ID can be reused.
- A full queue drops the incoming packet and records the event. Waiting packets stay in place, and the dropped ID is not reserved.
- The next-packet preview follows the same scheduling rules without changing queue contents.

## Checks and production build

```powershell
npm test
npm run build
```

The Node tests cover routing, validation, overflow, duplicate IDs, priorities, FIFO ties, statistics, next-packet selection, explanations, and the guided demo. Browser checks exercise page navigation, real packet actions, the demo, the practice lab, and responsive layouts. Vite writes the production app to `dist/`.

For browser smoke checks, start the built app:

```powershell
npm run preview -- --host 127.0.0.1 --port 4173
```

Then run this in a second terminal:

```powershell
npm run test:browser -- http://127.0.0.1:4173
```

The smoke runner uses an existing Chrome or Edge installation and Node's built-in WebSocket support. Set `CHROME_PATH` if your browser is installed elsewhere. Add `--screenshots=artifacts/browser` to save screenshots. With no URL argument, it checks `http://127.0.0.1:5173`.

## Custom logo

The official original logo is included unchanged at:

```text
public/brand/router-logo.png
```

The sidebar, mobile header and navigation, and dashboard welcome section display the supplied artwork with its original aspect ratio and `object-fit: contain`. The full image stays visible without stretching or cropping. The site uses the official image, with no generated or generic replacement.

The browser favicon is extracted from the router-symbol portion of the same image; the original logo file remains unchanged.

## Source layout

- `src/core/`: original router, routing table, array queue, validation, and next-packet selector; `explanations.js` describes real choices, and `demo.js` creates the sample scenario.
- `src/context/SimulationContext.jsx`: shared simulation state and actions.
- `src/pages/`: the five routed pages, `learning.css`, and scoped `algorithm-lab.css`.
- `src/components/`: shared UI plus `PacketJourney`, `DemoControl`, and `AlgorithmLab`.
- `src/styles.css` and `src/enhancements.css`: responsive theme and readable visual explanations.
- `src/App.jsx`: responsive navigation, routes, reset confirmation, and notifications.
- `tests/`: DSA, selector, explanation, and demo tests; `scripts/browser-smoke.mjs`: browser checks.

## Hosting later

This redesign runs in the existing local project; it has not been published. To host the production `dist/` folder, configure your static host to serve `index.html` for application routes such as `/queues` and `/history`. This fallback allows React Router's `BrowserRouter` to handle direct visits and refreshes on every page.
