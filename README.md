# Multi-Queue Router Simulator

<p align="center">
  <img src="public/brand/router-logo.png" alt="Multi-Queue Router Simulator logo" width="420">
</p>

<p align="center">
  <strong>An interactive web application for learning packet routing, priority queues, and Data Structures & Algorithms (DSA).</strong>
</p>

Built with **React, JavaScript, Tailwind CSS, Vite, and React Router**. Create packets, route them by destination IP, and watch four array-based priority queues process them step by step.

> **Educational simulation:** This project models routing decisions in the browser. It does not send real network packets or connect to physical routers. No backend, database, or account is required.

## Features

- **Packet management:** Create packets with an ID, source IP, destination IP, and numerical priority.
- **Four routing queues:** See packet arrivals, current capacity, and processing order.
- **Priority-based processing:** The lowest numerical priority value is served first *within the selected queue*.
- **Interactive packet journey:** Follow packet creation, routing, enqueue, and processing.
- **Guided demonstration:** Load sample packets and process them one by one.
- **Activity history:** Review accepted, processed, and dropped packets with timestamps.
- **Algorithm learning lab:** Explore linear search, FIFO ties, enqueue, dequeue, and array shifting.
- **Responsive interface:** Navigate the simulator on desktop or mobile.

## Pages

| Page | Purpose |
| --- | --- |
| **Dashboard** | Overview of queued, accepted, processed, and dropped packets |
| **Packet Management** | Add and process packets |
| **Queue Management** | View all four queues and identify the next packet |
| **Activity History** | Search and filter simulation events |
| **How It Works** | Learn and interact with the underlying DSA logic |

## How the router works

Each packet contains:

| Field | Example |
| --- | --- |
| Packet ID | `101` |
| Source IP | `192.168.1.10` |
| Destination IP | `10.0.0.8` |
| Priority | `2` |

The destination IP determines the packet's queue:

| Destination IP starts with | Assigned queue |
| --- | --- |
| `192.` | Queue 0 |
| `10.` | Queue 1 |
| `172.` | Queue 2 |
| `150.` | Queue 3 |
| Other valid IPv4 address | Queue 0 (default) |

**DSA rules:**

1. There are **4 array-based queues**, each holding at most **3 packets**.
2. The router always checks **Queue 0 → Queue 1 → Queue 2 → Queue 3** and processes a packet from the first nonempty queue.
3. Within that queue, a **linear search** selects the packet with the **lowest numerical priority**.
4. Equal-priority packets are processed in **first-in, first-out (FIFO)** order.
5. After dequeue, remaining elements are **shifted left** in the array.
6. A packet arriving at a full queue is **dropped**. Duplicate active packet IDs are rejected; IDs become available again after processing.

> **Important:** Queue order comes before packet priority across queues. A priority-`5` packet in Queue 0 is processed before a priority-`0` packet waiting in Queue 1.

## Getting started

**Requirements:** Node.js 22 or later and npm.

```bash
# Clone the repository
git clone https://github.com/sohailahmadmarwat/Multi-Queue-Router-Simulator.git

# Open the project
cd Multi-Queue-Router-Simulator

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open the local address shown by Vite (usually **http://localhost:5173/**).

### Try a simulation

1. Open **Packet Management**.
2. Enter a packet ID, valid source and destination IPv4 addresses, and a priority.
3. Select **Add Packet** to route it into a queue.
4. Visit **Queue Management** to inspect the packet and its priority.
5. Select **Process Next Packet** to process one packet and review the result.

Alternatively, use the **guided demo** to load sample packets and explore the processing sequence. Simulation state is shared between pages during the current browser session; refreshing starts a new session.

## Technology stack

| Technology | Role |
| --- | --- |
| React + JavaScript (JSX) | Interactive user interface |
| React Router | Multi-page navigation |
| Tailwind CSS | Styling and responsive layouts |
| Vite | Development server and production build |
| Lucide React | UI icons |
| JavaScript arrays and classes | Core DSA implementations |

## Project structure

```text
public/               Logo and static assets
src/
  components/         Reusable UI components
  context/            Shared simulation state
  core/               Router, routing rules, priority queues, validation
  pages/              Five application pages
  App.jsx             App layout and navigation
tests/                Algorithm and simulation tests
scripts/              Browser smoke test utilities
```

## Testing and build

```bash
npm test
npm run build
npm run preview
```

- `npm test` runs the core logic tests.
- `npm run build` produces the production site in `dist/`.
- `npm run preview` serves the built application locally.

For browser smoke checks, see `scripts/browser-smoke.mjs` and the `test:browser` command in `package.json`.

## Project repository

**GitHub:** [Multi-Queue Router Simulator](https://github.com/sohailahmadmarwat/Multi-Queue-Router-Simulator)

This project focuses on visualizing **routing logic, fixed-capacity arrays, priority queues, and scheduling decisions** through a beginner-friendly website.
