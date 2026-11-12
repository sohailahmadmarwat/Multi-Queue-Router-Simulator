/**
 * Real-browser smoke checks with an already-installed Chrome or Edge.
 * Start Vite, then run: node scripts/browser-smoke.mjs http://127.0.0.1:5173
 * Optional: --screenshots=./artifacts/browser  or CHROME_PATH=<browser executable>.
 * Restricted Windows hosts may need BROWSER_SMOKE_NO_SANDBOX=1 for Chrome renderers.
 * Uses only Node built-ins; it is deliberately outside node --test discovery.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const baseUrl = process.argv.find((arg) => /^https?:\/\//.test(arg)) || 'http://127.0.0.1:5173';
const screenshotArg = process.argv.find((arg) => arg.startsWith('--screenshots='));
const screenshotDir = screenshotArg ? path.resolve(screenshotArg.slice('--screenshots='.length)) : null;
const chromePath = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((candidate) => candidate && existsSync(candidate));
assert.ok(chromePath, 'Install Chrome/Edge or set CHROME_PATH to an existing browser.');

const profile = await mkdtemp(path.join(tmpdir(), 'router-browser-smoke-'));
const browser = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  ...(process.env.BROWSER_SMOKE_NO_SANDBOX === '1' ? ['--no-sandbox'] : []),
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
let socket;
let session;
let sequence = 0;
const pending = new Map();
const failures = [];
const checks = [];
const pause = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));
const visible = '(el) => !!el.getClientRects().length && !el.closest("dialog:not([open])")';

async function until(callback, description, timeout = 12000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeout) {
    try { const result = await callback(); if (result) return result; } catch (error) { lastError = error; }
    await pause();
  }
  throw new Error(`Timed out: ${description}${lastError ? ` (${lastError.message})` : ''}`);
}

function send(method, params = {}, target = session) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timer });
    if (process.env.BROWSER_SMOKE_DEBUG) console.log('CDP SEND', id, method, target);
    socket.send(JSON.stringify({ id, method, params, ...(target ? { sessionId: target } : {}) }));
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + (result.exceptionDetails.exception?.description || expression));
  return result.result.value;
}

async function click(selector, text) {
  const match = text == null ? 'true' : `el.textContent.trim() === ${JSON.stringify(text)}`;
  const result = await evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(el => (${visible})(el) && ${match}); if (!el || el.disabled) return false; el.click(); return true; })()`);
  assert.equal(result, true, `Visible enabled control exists: ${selector}${text ? ` (${text})` : ''}`);
  await pause(35);
}

async function fill(selector, value) {
  assert.equal(await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(String(value))}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`), true, `Input exists: ${selector}`);
  await pause(20);
}

async function add(id, destinationIP, priority = 1) {
  await fill('#packet-id', id);
  await fill('#packet-sourceIP', '192.168.1.10');
  await fill('#packet-destinationIP', destinationIP);
  await fill('#packet-priority', priority);
  await click('form button[type="submit"]');
}

async function nextId() {
  return evaluate('document.querySelector(".next-packet-title h3")?.textContent.trim() || null');
}

async function navigate(route, mobile = false) {
  if (mobile) {
    await click('button[aria-label="Open navigation"]');
    assert.equal(await evaluate('document.querySelector(".mobile-nav").open'), true);
  }
  await click(`${mobile ? 'dialog.mobile-nav' : 'aside.sidebar'} .main-nav a[href="${route}"]`);
  await until(() => evaluate(`location.pathname === ${JSON.stringify(route)} && !!document.querySelector('main h1')`), `navigate to ${route}`);
  if (mobile) assert.equal(await evaluate('document.querySelector(".mobile-nav").open'), false, 'Navigation drawer closes after selecting route');
  assert.ok(await evaluate('document.querySelector("main h1").textContent.trim()'), `Page heading exists for ${route}`);
  await pause(200);
  const dimensions = await evaluate('({ width: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth })');
  assert.ok(dimensions.document <= dimensions.width + 1 && dimensions.body <= dimensions.width + 1, `${mobile ? 'Mobile' : 'Desktop'} page ${route} has no viewport overflow: ${JSON.stringify(dimensions)}`);
  const nestedScroll = await evaluate(`(() => [...document.querySelectorAll('main *')].filter(el => {
    if (!el.getClientRects().length) return false;
    const style = getComputedStyle(el);
    const vertical = /(auto|scroll)/.test(style.overflowY) && el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 2;
    const horizontal = /(auto|scroll)/.test(style.overflowX) && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2 && !el.classList.contains('table-wrap');
    return vertical || horizontal;
  }).map(el => el.className))()`);
  assert.deepEqual(nestedScroll, [], `No unexpected nested scrolling on ${route} at ${dimensions.width}px`);
  await assertLogos(`${dimensions.width}px ${route}`);
}

async function assertLogos(context) {
  await until(() => evaluate(`(() => { const images = [...document.querySelectorAll('img.brand-image')]; return images.length > 0 && images.every(img => img.complete && img.naturalWidth === 1672 && img.naturalHeight === 941); })()`), `exact original logo loads (${context})`);
  assert.equal(await evaluate('document.querySelectorAll(".brand-wordmark").length'), 0, `No fallback branding (${context})`);
  const logos = await evaluate(`(() => [...document.querySelectorAll('img.brand-image')].filter(${visible}).map(img => {
    const box = img.getBoundingClientRect(); const style = getComputedStyle(img);
    const clips = []; let parent = img.parentElement;
    while (parent && parent !== document.documentElement) {
      const parentStyle = getComputedStyle(parent);
      if (/(hidden|clip)/.test(parentStyle.overflowX + parentStyle.overflowY)) {
        const limit = parent.getBoundingClientRect();
        if (box.left < limit.left - 1 || box.right > limit.right + 1 || box.top < limit.top - 1 || box.bottom > limit.bottom + 1) clips.push(parent.className);
      }
      parent = parent.parentElement;
    }
    return { fit: style.objectFit, width: box.width, height: box.height, source: img.currentSrc, clips, sidebar: !!img.closest('.sidebar'), topbar: !!img.closest('.topbar'), welcome: !!img.closest('.welcome-banner'), menu: !!img.closest('.mobile-nav') };
  }))()`);
  assert.ok(logos.length > 0, `Official logo is visible (${context})`);
  assert.ok(logos.some(logo => context.startsWith('menu') ? logo.menu : Number(context.split('px')[0]) <= 760 ? logo.topbar : logo.sidebar), `Official logo is visible in ${context.startsWith('menu') ? 'mobile navigation' : 'desktop sidebar or mobile header'} (${context})`);
  for (const logo of logos) {
    assert.equal(logo.fit, 'contain', `Logo retains its proportions (${context})`);
    assert.ok(logo.width > 0 && logo.height > 0, `Logo has visible dimensions (${context})`);
    assert.ok(logo.source.endsWith('/brand/router-logo.png'), `Logo uses the exact original PNG (${context})`);
    assert.deepEqual(logo.clips, [], `Full logo remains inside clipping boundaries (${context})`);
  }
  if (context.endsWith('px /') && Number(context.split('px')[0]) > 560) assert.ok(logos.some(logo => logo.welcome), `Official logo appears in dashboard welcome (${context})`);
}

async function screenshot(name) {
  if (!screenshotDir) return;
  await mkdir(screenshotDir, { recursive: true });
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(path.join(screenshotDir, `${name}.png`), Buffer.from(data, 'base64'));
}

async function screenshotElement(name, selector) {
  if (!screenshotDir) return;
  await mkdir(screenshotDir, { recursive: true });
  const clip = await evaluate(`(() => {
    const box = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
    return { x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height, scale: 1 };
  })()`);
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip });
  await writeFile(path.join(screenshotDir, `${name}.png`), Buffer.from(data, 'base64'));
}

async function dismissNoticeIfVisible() {
  if (await evaluate('!!document.querySelector(".toast")')) await click('.toast button[aria-label="Dismiss notification"]');
}

async function confirmMobileReset() {
  await click('button[aria-label="Open navigation"]');
  await click('dialog.mobile-nav .reset-button');
  await click('.confirmation-dialog button', 'Reset simulation');
}

async function assertFreshPacketForm() {
  assert.deepEqual(await evaluate(`Object.fromEntries(['id', 'sourceIP', 'destinationIP', 'priority'].map(key => [key, document.querySelector('#packet-' + key).value]))`), {
    id: '', sourceIP: '', destinationIP: '', priority: '1',
  });
  assert.equal(await evaluate('document.querySelectorAll(".form-result, .field-error, input[aria-invalid=true]").length'), 0);
  assert.equal(await nextId(), null);
}

async function elementText(selector) {
  return evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent.trim() || ''`);
}

async function queuedCount() {
  return Number(await elementText('aside.sidebar .nav-count'));
}

async function journeyStep(index) {
  await click(`[data-testid="packet-journey"] .journey-stages li:nth-child(${index + 1}) button`);
  assert.equal(await evaluate(`document.querySelectorAll('[data-testid="packet-journey"] .journey-stages button')[${index}].getAttribute('aria-current')`), 'step');
}

async function responsiveDemoRoutes() {
  for (const width of [1440, 320, 360, 390, 560, 760, 768, 1024]) {
    const mobile = width <= 760;
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile });
    for (const route of ['/', '/packets', '/queues', '/history', '/how-it-works']) {
      await navigate(route, mobile);
      if (width === 1440 && route === '/') await screenshot('desktop-demo-dashboard');
      if (width === 1440 && route === '/packets') {
        await journeyStep(3);
        await screenshotElement('desktop-packet-journey', '.packet-journey');
      }
      if (width === 1440 && route === '/queues') await screenshot('desktop-compact-queues');
      if (width === 1440 && route === '/how-it-works') {
        await screenshot('desktop-how-it-works');
        await screenshotElement('desktop-algorithm-lab', '[data-testid="algorithm-lab"]');
      }
      if (width === 390 && route === '/') await screenshot('mobile-demo-dashboard');
      if (width === 390 && route === '/how-it-works') await screenshot('mobile-how-it-works');
      if (width === 390 && route === '/queues') {
        await evaluate('document.querySelector(".queues-grid").scrollIntoView({block: "start"})');
        await screenshot('mobile-compact-queues');
      }
    }
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await navigate('/packets', true);
  assert.equal(await queuedCount(), 6, 'Responsive navigation never processes the demo');
  assert.equal(await nextId(), '#203');
  pass('Populated demo, journey, compact queues, and guide fit all eight viewport widths without nested scrolling');
}

async function exerciseGuidedDemo() {
  await navigate('/packets', true);
  assert.equal(await queuedCount(), 0);
  await evaluate('document.querySelector(".demo-load").focus()');
  await click('.demo-load');
  assert.equal(await evaluate('document.activeElement.id'), 'main-content', 'Loading a demo restores focus to the updated main content');
  assert.equal(await evaluate('document.querySelector(".demo-confirmation").open'), false, 'Empty sessions load the sample directly');
  assert.equal(await queuedCount(), 6);
  assert.equal(await nextId(), '#203');
  assert.match(await elementText('.demo-progress .badge'), /0\s*\/\s*6/);
  assert.match(await elementText('[data-testid="packet-journey"] .panel-header'), /Packet #206.*Accepted/);
  await journeyStep(1);
  assert.match(await elementText('.journey-routing'), /150\.\* matches Queue 3/);
  await journeyStep(3);
  assert.match(await elementText('.journey-processing h3'), /Next to process: Packet #203 from Queue 0/);
  assert.match(await elementText('.journey-processing'), /FIFO breaks the tie/);
  assert.match(await elementText('.next-selection-reason'), /Queue 0 is the first nonempty queue/);
  await journeyStep(0);
  await journeyStep(2);
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".journey-array strong")].map(el => el.textContent)'), ['#206', 'Empty', 'Empty']);
  assert.equal(await queuedCount(), 6, 'Reviewing steps does not process packets');
  await pause(350);
  assert.equal(await nextId(), '#203', 'The demo never processes packets automatically');
  await navigate('/history', true);
  assert.equal(await evaluate('document.querySelectorAll(".history-table tbody tr").length'), 6);
  assert.ok(await evaluate('[...document.querySelectorAll(".history-table tbody .event-badge")].every(el => el.textContent.trim() === "Accepted")'));
  pass('Empty-session demo loads six real packets without processing; trace review leaves live queues unchanged');

  await navigate('/packets', true);
  await click('.next-packet-panel button');
  assert.equal(await nextId(), '#204');
  assert.equal(await queuedCount(), 5);
  assert.match(await elementText('.journey-processing h3'), /Processed: Packet #203 from Queue 0/);
  assert.match(await elementText('.journey-processed-note'), /immediately before processing Packet #203/);
  await journeyStep(2);
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".journey-array strong")].map(el => el.textContent)'), ['#202', '#204', 'Empty']);
  await navigate('/queues', true);
  assert.match(await elementText('[data-testid="packet-journey"] .panel-header'), /Packet #203.*Processed/);
  await navigate('/packets', true);
  await click('.demo-load');
  assert.equal(await evaluate('document.querySelector(".demo-confirmation").open'), true);
  await click('.demo-confirmation button', 'Keep current simulation');
  assert.equal(await queuedCount(), 5);
  assert.equal(await nextId(), '#204');
  assert.match(await elementText('[data-testid="packet-journey"] .panel-header'), /Packet #203.*Processed/);
  await navigate('/history', true);
  assert.equal(await evaluate('document.querySelectorAll(".history-table tbody tr").length'), 7);
  await navigate('/packets', true);
  await click('.demo-load');
  await click('.demo-confirm-load');
  assert.equal(await evaluate('document.activeElement.id'), 'main-content', 'Replacing a demo restores focus to main content');
  assert.equal(await queuedCount(), 6);
  assert.equal(await nextId(), '#203');
  assert.match(await elementText('.demo-progress .badge'), /0\s*\/\s*6/);
  await navigate('/history', true);
  assert.equal(await evaluate('document.querySelectorAll(".history-table tbody tr").length'), 6);
  await navigate('/packets', true);
  pass('Canceling demo replacement preserves progress and history; confirmation starts a clean sample session');

  await dismissNoticeIfVisible();
  await responsiveDemoRoutes();
  await screenshot('mobile-guided-demo');
  for (const id of [203, 204, 202, 201, 205, 206]) {
    assert.equal(await nextId(), `#${id}`);
    await click('.next-packet-panel button');
    assert.match(await elementText('.journey-processing h3'), new RegExp(`Processed: Packet #${id} from Queue`));
    assert.match(await elementText('.journey-processed-note'), new RegExp(`before processing Packet #${id}`));
  }
  assert.equal(await queuedCount(), 0);
  assert.equal(await nextId(), null);
  assert.match(await elementText('.demo-progress'), /Demo complete/);
  assert.match(await elementText('.demo-progress .badge'), /6\s*\/\s*6/);
  await confirmMobileReset();
  assert.equal(await evaluate('document.querySelector(".demo-progress")'), null);
  assert.match(await elementText('[data-testid="packet-journey"]'), /Waiting for a packet/);
  pass('Guided processing follows 203→204→202→201→205→206; true before/after traces and reset remain consistent');
}

async function exercisePacketTrace() {
  await add(301, '8.8.8.8', 8);
  await journeyStep(1);
  assert.match(await elementText('.journey-routing'), /No listed prefix matches.*Queue 0/);
  assert.match(await elementText('.journey-route-match'), /8\.8\.8\.8.*Default route.*Queue 0/);
  await navigate('/queues', true);
  assert.match(await elementText('[data-testid="packet-journey"] .panel-header'), /Packet #301.*Accepted/);
  await journeyStep(1);
  assert.match(await elementText('.journey-routing'), /No listed prefix matches/);
  await navigate('/packets', true);
  await add(302, '192.168.1.2', 2);
  await add(303, '192.168.1.3', 2);
  await add(304, '8.8.4.4', 0);
  assert.equal(await queuedCount(), 3);
  assert.match(await elementText('[data-testid="packet-journey"] .panel-header'), /Packet #304.*Dropped/);
  assert.match(await elementText('.journey-queue h3'), /Queue 0 was full.*dropped/);
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".journey-array strong")].map(el => el.textContent)'), ['#301', '#302', '#303']);
  await journeyStep(3);
  assert.match(await elementText('.journey-processing h3'), /Next to process: Packet #302/);
  assert.match(await elementText('.journey-warning'), /Packet #304 was dropped and is never a processing candidate/);
  await add(301, '10.0.0.8', 0);
  assert.match(await elementText('[role="alert"]'), /already in a queue/);
  assert.match(await elementText('[data-testid="packet-journey"] .panel-header'), /Packet #304.*Dropped/);
  await click('.next-packet-panel button');
  assert.equal(await nextId(), '#303');
  assert.match(await elementText('.journey-processing h3'), /Processed: Packet #302/);
  assert.match(await elementText('.journey-processing'), /FIFO breaks the tie/);
  await journeyStep(1);
  assert.match(await elementText('.journey-routing'), /192\.\* matches Queue 0/);
  await confirmMobileReset();
  await assertFreshPacketForm();
  assert.match(await elementText('[data-testid="packet-journey"] .panel-header'), /Waiting for a packet/);
  pass('Shared journey explains prefix/default routing, truthful drops, FIFO selection, and reset without inventing events');
}

async function exercisePracticeLab() {
  await add(901, '10.0.0.8', 1);
  await navigate('/how-it-works', true);
  const labPackets = () => evaluate('[...document.querySelectorAll("[data-testid=lab-array] [data-packet-id]")].map(el => el.dataset.packetId)');
  assert.deepEqual(await labPackets(), ['12', '13', '14']);
  assert.equal(await elementText('[data-testid="lab-candidate"]'), 'Not scanned');
  for (const [ip, queueIndex] of [['192.168.1.8', 0], ['10.0.0.8', 1], ['172.16.0.8', 2], ['150.1.1.8', 3]]) {
    await fill('[data-testid="lab-route-input"]', ip);
    assert.match(await elementText('[data-testid="lab-route-result"]'), new RegExp(`Matches .*Queue ${queueIndex}`));
  }
  await fill('[data-testid="lab-route-input"]', '8.8.8.8');
  assert.match(await elementText('[data-testid="lab-route-result"]'), /No prefix match.*Queue 0/);
  for (const ip of ['999.0.0.1', '01.2.3.4']) {
    await fill('[data-testid="lab-route-input"]', ip);
    assert.match(await elementText('[data-testid="lab-route-result"]'), /Enter a valid IPv4 address/);
    assert.equal(await evaluate('document.querySelector("[data-testid=lab-route-input]").getAttribute("aria-invalid")'), 'true');
  }
  await fill('[data-testid="lab-route-input"]', '10.0.0.8');
  await click('[data-testid="lab-enqueue"]');
  assert.match(await elementText('[data-testid="lab-status"]'), /Overflow.*Packet #15 was rejected/);
  assert.deepEqual(await labPackets(), ['12', '13', '14']);
  await click('[data-testid="lab-start"]');
  assert.equal(await elementText('[data-testid="lab-candidate"]'), '#12');
  await click('[data-testid="lab-compare"]');
  assert.equal(await elementText('[data-testid="lab-candidate"]'), '#13');
  assert.match(await elementText('[data-testid="lab-status"]'), /lower than 3/);
  await click('[data-testid="lab-compare"]');
  assert.equal(await elementText('[data-testid="lab-candidate"]'), '#13');
  assert.match(await elementText('[data-testid="lab-status"]'), /FIFO breaks the tie/);
  await dismissNoticeIfVisible();
  await screenshotElement('mobile-algorithm-lab', '[data-testid="algorithm-lab"]');
  await click('[data-testid="lab-dequeue"]');
  assert.deepEqual(await labPackets(), ['12', '14', '']);
  assert.match(await elementText('[data-testid="lab-status"]'), /Dequeued Packet #13.*Packet #14 moved from index 2 to 1/);
  assert.equal(await evaluate('document.querySelectorAll("[data-testid=lab-array] [data-index]")[1].dataset.packetId'), '14');
  await click('[data-testid="lab-enqueue"]');
  assert.deepEqual(await labPackets(), ['12', '14', '15']);
  assert.match(await elementText('[data-testid="lab-status"]'), /Enqueued Packet #15.*index 2/);
  await click('[data-testid="lab-reset"]');
  assert.deepEqual(await labPackets(), ['12', '13', '14']);
  assert.equal(await elementText('[data-testid="lab-candidate"]'), 'Not scanned');
  assert.equal(await queuedCount(), 1, 'Practice operations do not alter live router queues');
  await navigate('/history', true);
  assert.equal(await evaluate('document.querySelectorAll(".history-table tbody tr").length'), 1, 'Practice operations do not invent live events');
  await navigate('/packets', true);
  assert.equal(await nextId(), '#901');
  await confirmMobileReset();
  pass('Guide practice uses real routing, overflow, linear scan, FIFO, dequeue/shift, enqueue, and local reset without changing the live simulation');
}

async function exerciseDemoModifications() {
  await evaluate('document.querySelector(".demo-load").focus()');
  await click('.demo-load');
  assert.equal(await evaluate('document.activeElement.id'), 'main-content');
  await add(207, '192.168.1.207', 0);
  assert.equal(await queuedCount(), 6);
  assert.ok(await evaluate('!!document.querySelector(".demo-sequence")'), 'Rejected custom arrivals retain the unchanged sample order');
  assert.doesNotMatch(await elementText('.demo-progress-copy p'), /You added your own packets/);
  assert.match(await elementText('[data-testid="packet-journey"] .panel-header'), /Packet #207.*Dropped/);
  await add(208, '10.0.0.208', 0);
  assert.equal(await queuedCount(), 7);
  assert.equal(await evaluate('document.querySelector(".demo-sequence")'), null, 'Accepted custom arrivals replace the sample-only order with the live preview');
  assert.match(await elementText('.demo-progress-copy p'), /You added your own packets/);
  assert.equal(await nextId(), '#203');
  await confirmMobileReset();
  pass('Demo focus is restored; rejected custom packets preserve sample order while accepted additions switch to truthful live guidance');
}

function pass(description) {
  checks.push(description);
  console.log(`PASS ${description}`);
}

try {
  browser.on('error', (error) => failures.push(error.message));
  // Consume stderr so Chromium cannot block on its output buffer.
  browser.stderr.on('data', (data) => { if (process.env.BROWSER_SMOKE_DEBUG) console.log(String(data)); });
  const port = await until(async () => {
    if (browser.exitCode != null) throw new Error(`Browser exited with ${browser.exitCode}`);
    const content = await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8');
    return Number(content.split('\n')[0]);
  }, 'Chrome remote debugging port');
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (process.env.BROWSER_SMOKE_DEBUG) console.log('CDP RECEIVE', JSON.stringify(message).slice(0, 700));
    if (message.id && pending.has(message.id)) {
      const { resolve, reject, timer } = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(timer);
      message.error ? reject(new Error(message.error.message)) : resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') {
      failures.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    } else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      const entry = message.params.entry;
      failures.push(`${entry.text}${entry.url ? ` (${entry.url})` : ''}`);
    }
  };
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' }, null);
  ({ sessionId: session } = await send('Target.attachToTarget', { targetId, flatten: true }, null));
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: baseUrl });
  await until(() => evaluate('!!document.querySelector("main h1")'), 'React application ready');
  const favicon = await evaluate(`(async () => {
    const href = document.querySelector('link[rel=icon]')?.href;
    const response = await fetch(href);
    const image = new Image(); image.src = href;
    await image.decode();
    return { href, status: response.status, width: image.naturalWidth, height: image.naturalHeight, type: response.headers.get('content-type') };
  })()`);
  assert.ok(favicon.href.endsWith('/brand/router-favicon.png'));
  assert.equal(favicon.status, 200);
  assert.equal(favicon.width, 64);
  assert.equal(favicon.height, 64);
  assert.match(favicon.type, /^image\/png/);
  pass('Original-logo favicon loads successfully as a 64×64 PNG');
  for (const route of ['/', '/packets', '/queues', '/history', '/how-it-works']) await navigate(route);
  pass('All five desktop pages render without horizontal overflow');

  await navigate('/packets');
  await add(101, '10.0.0.8', 0);
  await until(async () => (await nextId()) === '#101', 'first accepted packet');
  await add(102, '192.168.1.2', 8);
  assert.equal(await nextId(), '#102', 'Queue 0 precedes higher-priority packet in Queue 1');
  await add(103, '192.168.1.3', 2);
  assert.equal(await nextId(), '#103', 'Lower numeric priority is processed first within queue');
  await add(104, '192.168.1.4', 2);
  assert.equal(await nextId(), '#103', 'Equal priority preserves arrival order');
  pass('Next-packet preview respects queue precedence, packet priority, and FIFO ties');

  await add(104, '10.0.0.8', 1);
  assert.match(await evaluate('document.querySelector("[role=alert]")?.textContent || ""'), /already in a queue/i);
  await add(105, '999.0.0.1', 1);
  assert.match(await evaluate('document.querySelector("[role=alert]")?.textContent || ""'), /four numbers from 0 to 255/i);
  await add(105, '192.168.1.5', 1);
  assert.match(await evaluate('document.querySelector(".toast")?.textContent || ""'), /full|dropped/i);
  await add(105, '172.16.0.1', 1);
  await add(106, '150.1.0.1', 0);
  assert.equal(await evaluate('document.querySelector("aside.sidebar .nav-count").textContent.trim()'), '6');
  pass('Duplicate ID and malformed IPv4 validation, capacity overflow, and dropped-ID reuse');

  await navigate('/queues');
  for (const id of [101, 102, 103, 104, 105, 106]) assert.ok(await evaluate(`document.querySelector('main').textContent.includes('#${id}')`), `Queue view includes packet ${id}`);
  await navigate('/');
  assert.equal(await nextId(), '#103');
  await click('.toast button[aria-label="Dismiss notification"]');
  assert.equal(await evaluate('document.querySelector(".toast")'), null);
  await screenshot('desktop-dashboard');
  pass('State and packet previews remain consistent across router navigation');

  await navigate('/history');
  await click('.filter-tab', 'Dropped1');
  assert.equal(await evaluate('document.querySelectorAll(".history-table tbody tr").length'), 1);
  assert.match(await evaluate('document.querySelector(".history-table tbody").textContent'), /#105/);
  await click('.filter-tab', 'Accepted6');
  assert.equal(await evaluate('document.querySelectorAll(".history-table tbody tr").length'), 6);
  await fill('#history-search', '101');
  assert.equal(await evaluate('document.querySelectorAll(".history-table tbody tr").length'), 1);
  await fill('#history-search', '99999');
  assert.match(await evaluate('document.querySelector("main").textContent'), /No matching events/);
  await click('button', 'Clear filters');
  assert.equal(await evaluate('document.querySelectorAll(".history-table tbody tr").length'), 7);
  pass('Activity history filters, packet search, no-results state, and clear filters');

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await click('button[aria-label="Open navigation"]');
  await assertLogos('menu 390px');
  await screenshot('mobile-navigation');
  await click('button[aria-label="Close navigation"]');
  assert.equal(await evaluate('document.querySelector(".mobile-nav").open'), false);
  for (const route of ['/', '/packets', '/queues', '/history', '/how-it-works']) {
    await navigate(route, true);
    if (route === '/') await screenshot('mobile-dashboard');
    if (route === '/queues') await screenshot('mobile-queues');
  }
  pass('All five mobile pages fit the viewport; navigation opens, closes, and follows links');

  for (const width of [320, 360, 560, 760, 768, 1024]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width <= 760 });
    for (const route of ['/', '/packets', '/queues', '/history', '/how-it-works']) await navigate(route, width <= 760);
  }
  pass('All five pages also fit 320px, 360px, 560px, 760px, 768px, and 1024px without unexpected nested scrolling');
  pass('Exact original 1672×941 logo loads in desktop sidebar, mobile header/menu, and dashboard without cropping or stretched proportions');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

  await navigate('/packets', true);
  for (const id of [103, 104, 102, 101, 105, 106]) {
    assert.equal(await nextId(), `#${id}`, `Packet ${id} is next before processing`);
    await click('.next-packet-panel button');
    assert.match(await evaluate('document.querySelector(".last-processed").textContent'), new RegExp(`Packet #${id}\\b`));
  }
  assert.equal(await nextId(), null);
  assert.equal(await evaluate('document.querySelector(".next-packet-panel button").disabled'), true);
  pass('Processing follows the exact previewed sequence and disables itself when empty');

  await navigate('/history', true);
  assert.equal(await evaluate('document.querySelectorAll(".history-table tbody tr").length'), 13);
  await click('button[aria-label="Open navigation"]');
  await click('dialog.mobile-nav .reset-button');
  assert.equal(await evaluate('document.querySelector(".confirmation-dialog").open'), true);
  await click('.confirmation-dialog button', 'Keep simulation');
  assert.equal(await evaluate('document.querySelector(".confirmation-dialog").open'), false);
  assert.equal(await evaluate('document.querySelectorAll(".history-table tbody tr").length'), 13);
  await click('button[aria-label="Open navigation"]');
  await click('dialog.mobile-nav .reset-button');
  await click('.confirmation-dialog button', 'Reset simulation');
  assert.equal(await evaluate('document.querySelectorAll(".history-table tbody tr").length'), 0);
  assert.match(await evaluate('document.querySelector("main").textContent'), /Your simulation starts here/);
  pass('Reset cancellation preserves history; confirmation clears the simulation');

  await navigate('/packets', true);
  await add(201, '10.0.0.8', 1);
  assert.match(await evaluate('document.querySelector(".form-result")?.textContent || ""'), /Packet #201 accepted/);
  await confirmMobileReset();
  await assertFreshPacketForm();
  await add(202, '999.0.0.1', 2);
  assert.equal(await evaluate('document.querySelectorAll(".field-error").length'), 1);
  await confirmMobileReset();
  await assertFreshPacketForm();
  pass('Reset on Packet Management clears accepted results, draft inputs, and validation errors');
  await exerciseGuidedDemo();
  await exercisePacketTrace();
  await exercisePracticeLab();
  await exerciseDemoModifications();
  assert.deepEqual(failures, [], `Browser console/runtime errors: ${failures.join('; ')}`);
  console.log(`\n${checks.length} browser smoke groups passed at desktop 1440px and mobile 390px.`);
  if (screenshotDir) console.log(`Screenshots: ${screenshotDir}`);
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    try { await send('Browser.close', {}, null); } catch { /* Chrome may disconnect before acknowledging close. */ }
    socket.close();
  }
  if (browser.exitCode == null) browser.kill();
  await until(() => browser.exitCode != null, 'browser process exit', 3000).catch(() => {});
  // Only delete the exact private temporary profile created by this script.
  const resolvedProfile = path.resolve(profile);
  assert.ok(resolvedProfile.startsWith(path.resolve(tmpdir()) + path.sep) && path.basename(resolvedProfile).startsWith('router-browser-smoke-'));
  await rm(resolvedProfile, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
}
