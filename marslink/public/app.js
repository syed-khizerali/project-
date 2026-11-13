import { CFG } from './config.js';
const $ = s => document.querySelector(s);
const role = new URLSearchParams(location.search).get('role');
if (role !== 'mars' && role !== 'earth') $('#picker').hidden = false; else start();

const NAME = { sov: 'Sovereign', wit: 'Witness', adv: 'Advisory' };
const COLOR = { sov: '#ef6a60', wit: '#e5aa2e', adv: '#4cc17a' };
// Causal Sovereignty: compare the hazard deadline D with signal time tau and Earth thinking time.
const zone = (D, tau, tt) => D < tau ? 'sov' : D < 2 * tau + tt ? 'wit' : 'adv';

async function start() {
  $('#app').hidden = false;
  $('#roleTag').textContent = role === 'mars' ? 'Mars crew' : 'Earth control';
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

  const st = { tau: 12, tThink: 10, msPerMin: 250 };
  const [hz, tj] = await Promise.all([fetch('hazards.json').then(r => r.json()), fetch('tau.json').then(r => r.json())]);
  const H = hz.hazards, P = hz.contracts.map(p => ({ ...p, refreshed: performance.now() }));
  $('#tauSrc').textContent = `τ source: ${tj.source} (start ${tj.start}). Deadlines D are team assumptions and stay configurable.`;
  let sel = null;

  // ---- map (NASA Mars Trek tiles, Jezero) ----
  const map = L.map('map', { crs: L.CRS.EPSG4326, center: CFG.center, zoom: CFG.zoom, minZoom: 2, maxZoom: CFG.maxZoom });
  let bad = 0;
  const base = L.tileLayer(CFG.baseUrl, { attribution: CFG.attribution, maxNativeZoom: 6, noWrap: true }).addTo(map);
  base.on('tileerror', () => { if (++bad === 4) banner('Mars Trek tiles did not load. Check CFG.baseUrl in config.js or your network. Hazards still work.'); });
  if (CFG.slopeUrl) L.tileLayer(CFG.slopeUrl, { opacity: .55, noWrap: true }).addTo(map);
  const markers = H.map((h, i) => L.circleMarker([h.lat, h.lon], { radius: 13, weight: 3, color: '#fff', fillOpacity: .95 })
    .bindTooltip(h.name, { permanent: true, direction: 'bottom', offset: [0, 10] }).on('click', () => select(i)).addTo(map));

  // ---- helpers ----
  const simMin = () => performance.now() / st.msPerMin;
  const age = p => p.age0 + (performance.now() - p.refreshed) / st.msPerMin;
  const logLine = html => { const d = document.createElement('div'); d.innerHTML = html; $('#log').prepend(d); return d; };
  function banner(t) { const b = $('#banner'); b.textContent = t; b.hidden = false; setTimeout(() => b.hidden = true, 7000); }

  function refresh() {
    $('#tauV').textContent = st.tau; $('#ttV').textContent = st.tThink;
    $('#tau').value = st.tau; $('#tt').value = st.tThink;
    const c = { sov: 0, wit: 0, adv: 0 };
    H.forEach((h, i) => { const z = zone(h.D, st.tau, st.tThink); c[z]++; markers[i].setStyle({ fillColor: COLOR[z] }); });
    $('#shares').innerHTML = ['sov', 'wit', 'adv'].map(k => `<div style="flex:${c[k]};background:${COLOR[k]}"></div>`).join('');
    $('#shareT').textContent = `${c.sov} sovereign, ${c.wit} witness, ${c.adv} advisory`;
    // delegation coverage: sovereign + witness hazards that already have a valid (unexpired) plan
    const need = H.filter(h => zone(h.D, st.tau, st.tThink) !== 'adv');
    const ok = need.filter(h => h.plan && age(P.find(p => p.k === h.plan)) < P.find(p => p.k === h.plan).limit);
    $('#cov').textContent = need.length ? Math.round(ok.length / need.length * 100) + '%' : '100%';
    if (sel !== null) describe(sel);
    drawCycle();
  }
  function describe(i) {
    const h = H[i], z = zone(h.D, st.tau, st.tThink), r = 2 * st.tau + st.tThink;
    $('#selName').innerHTML = `${h.name} <span class="chip ${z}">${NAME[z]}</span>`;
    $('#selMsg').textContent = z === 'sov' ? `Earth first learns of this in ${st.tau} min, after the ${h.D} min deadline. Decide on your own.`
      : z === 'wit' ? `Earth learns in ${st.tau} min but a reply needs ${r} min. Crew decides, Earth reviews afterwards.`
      : `Earth’s reply can land in ${r} min, before the ${h.D} min deadline. Earth advises, crew decides.`;
  }
  function renderPlanButtons() {
    const box = $('#planBtns'); box.innerHTML = '';
    if (role === 'mars') ['A', 'B', 'C'].forEach(k => { const b = document.createElement('button'); b.textContent = 'Choose Plan ' + k;
      b.onclick = () => { if (sel === null) return banner('Tap a hazard first.'); send({ plan: k, hazard: H[sel].name, text: `Plan ${k} for ${H[sel].name}` }); }; box.appendChild(b); });
  }
  renderPlanButtons();

  // ---- light-cone animation: signal to Earth, Earth thinks, reply returns, zone settles ----
  let anim = 0;
  function cone(i) {
    cancelAnimationFrame(anim);
    const total = 2 * st.tau + st.tThink, ms = total * st.msPerMin, t0 = performance.now(), dot = $('#dot');
    (function f(n) {
      const m = (n - t0) / st.msPerMin, tau = st.tau;
      const pos = m < tau ? m / tau : m < tau + st.tThink ? 1 : Math.max(0, 1 - (m - tau - st.tThink) / tau);
      dot.style.left = `calc(${pos * 100}% - 6px)`; $('#coneT').textContent = `Signal clock: +${Math.min(m, total).toFixed(0)} of ${total} min`;
      if (n - t0 < ms) anim = requestAnimationFrame(f); else { const z = zone(H[i].D, st.tau, st.tThink); $('#coneT').textContent = `Round trip complete (${total} min). Zone: ${NAME[z]}.`; }
    })(t0);
  }
  function select(i) { sel = i; describe(i); cone(i); map.panTo([H[i].lat, H[i].lon]); }

  // ---- contracts with a half-life ----
  function renderContracts() {
    $('#contracts').innerHTML = '';
    P.forEach(p => {
      const a = age(p), pct = Math.min(100, a / p.limit * 100), ex = a >= p.limit;
      const d = document.createElement('div'); d.className = 'plan';
      d.innerHTML = `<span><b>Plan ${p.k}</b> ${p.label}</span><span class="mute">${ex ? 'EXPIRED: unsupervised risk' : 'valid'}</span>
        <div class="meter"><i style="width:${pct}%;background:${ex ? COLORS('sov') : pct > 70 ? COLORS('wit') : COLORS('adv')}"></i></div>
        <small>Age of Information ${a.toFixed(0)} / ${p.limit} min</small>`;
      if (role === 'earth') { const b = document.createElement('button'); b.className = 'alt'; b.textContent = 'Push update';
        b.onclick = () => send({ plan: 'UPDATE:' + p.k, hazard: '', text: `Contract ${p.k} refreshed` }); d.appendChild(b); }
      $('#contracts').appendChild(d);
    });
  }
  const COLORS = k => COLOR[k];

  // ---- delay messaging with offline outbox ----
  let ws, outbox = JSON.parse(localStorage.getItem('outbox') || '[]');
  const saveOut = () => localStorage.setItem('outbox', JSON.stringify(outbox));
  const open = () => ws && ws.readyState === 1;
  function send(m) {
    const msg = { type: 'msg', id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), sentAt: Date.now(), ...m };
    if (open()) { ws.send(JSON.stringify(msg)); logLine(`Sent: ${m.text}`); }
    else { outbox.push(msg); saveOut(); logLine(`Offline: queued “${m.text}” (${outbox.length} waiting)`); }
  }
  function countdown(el, at) {
    const t = setInterval(() => { const s = Math.max(0, (at - Date.now()) / 1000); el.textContent = s > 0 ? ` arriving in ${s.toFixed(0)} s` : ' delivered'; if (!s) clearInterval(t); }, 250);
  }
  function connect() {
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
    ws.onopen = () => {
      $('#net').textContent = 'online'; $('#net').className = 'pill on';
      ws.send(JSON.stringify({ type: 'hello', role }));
      if (outbox.length) { logLine(`Reconnected: delivering ${outbox.length} queued message(s)`); outbox.splice(0).forEach(m => ws.send(JSON.stringify(m))); saveOut(); }
    };
    ws.onclose = () => { $('#net').textContent = 'offline'; $('#net').className = 'pill off'; setTimeout(connect, 2000); };
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.type === 'config') { Object.assign(st, { tau: m.tau, tThink: m.tThink, msPerMin: m.msPerMin }); refresh(); }
      if (m.type === 'ack') countdown(logLine(`Message on its way to the other planet,<span></span>`).querySelector('span'), m.deliverAt);
      if (m.type === 'msg') {
        navigator.vibrate && navigator.vibrate([120, 60, 120]);
        if (m.plan && m.plan.startsWith('UPDATE:')) { const p = P.find(x => x.k === m.plan.slice(7)); if (p) { p.refreshed = performance.now(); p.age0 = 0; } logLine(`${m.text} (data age reset)`); }
        else logLine(`<b>${m.from === 'earth' ? 'Earth' : 'Mars'}:</b> ${m.text}`);
      }
    };
  }
  connect();
  const pushCfg = () => open() ? ws.send(JSON.stringify({ type: 'config', ...st })) : refresh();
  $('#tau').oninput = e => { st.tau = +e.target.value; pushCfg(); refresh(); };
  $('#tt').oninput = e => { st.tThink = +e.target.value; pushCfg(); refresh(); };
  $('#day').oninput = e => { const d = +e.target.value; st.tau = Math.round(tj.tau[d] * 2) / 2; const dt = new Date(tj.start); dt.setDate(dt.getDate() + d); $('#dateV').textContent = dt.toDateString(); pushCfg(); refresh(); };

  // ---- 26-month cycle chart ----
  function drawCycle() {
    const cv = $('#cyc'), g = cv.getContext('2d'), W = cv.width, Hh = cv.height; g.clearRect(0, 0, W, Hh);
    for (let x = 0; x < W; x++) {
      const t = tj.tau[Math.floor(x / W * tj.tau.length)], c = { sov: 0, wit: 0, adv: 0 }; H.forEach(h => c[zone(h.D, t, st.tThink)]++);
      let y = Hh; ['sov', 'wit', 'adv'].forEach(k => { const hh = c[k] / H.length * Hh; g.fillStyle = COLOR[k]; g.fillRect(x, y - hh, 1, hh); y -= hh; });
    }
    const dx = $('#day').value / tj.tau.length * W; g.strokeStyle = '#fff'; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(dx, 0); g.lineTo(dx, Hh); g.stroke(); g.setLineDash([]);
  }
  setInterval(renderContracts, 500);
  refresh(); renderContracts();
}
