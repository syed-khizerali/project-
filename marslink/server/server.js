// MARSLINK delay server: static files + WebSocket relay that holds every message for tau.
const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');
const PORT = process.env.PORT || 3000;
const PUB = path.join(__dirname, '..', 'public');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };

const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(PUB, path.normalize(p));
  if (!f.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    res.end(data);
  });
});

// Shared mission config. msPerMin: real milliseconds that stand for one mission minute (demo time scale).
const state = { tau: 12, tThink: 10, msPerMin: 250 };
const wss = new WebSocketServer({ server: srv });
const send = (c, o) => c.readyState === 1 && c.send(JSON.stringify(o));
const broadcast = o => wss.clients.forEach(c => send(c, o));

wss.on('connection', ws => {
  send(ws, { type: 'config', ...state });
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.type === 'hello') { ws.role = m.role === 'earth' ? 'earth' : 'mars'; return; }
    if (m.type === 'config') {
      for (const k of ['tau', 'tThink', 'msPerMin']) if (Number.isFinite(m[k])) state[k] = m[k];
      return broadcast({ type: 'config', ...state });
    }
    if (m.type === 'msg') {
      const delay = state.tau * state.msPerMin, deliverAt = Date.now() + delay;
      const out = { type: 'msg', id: m.id, from: ws.role, plan: m.plan, hazard: m.hazard, text: m.text, sentAt: m.sentAt, deliverAt };
      send(ws, { type: 'ack', id: m.id, deliverAt, tau: state.tau });
      setTimeout(() => wss.clients.forEach(c => c.role && c.role !== ws.role && send(c, out)), delay);
    }
  });
});
srv.listen(PORT, () => console.log(`MARSLINK running on http://localhost:${PORT}  (open ?role=mars and ?role=earth)`));
