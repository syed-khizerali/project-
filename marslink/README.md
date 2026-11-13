# MARSLINK: Who decides on Mars?

MARSLINK turns Earth-Mars signal delay into a map. For every hazard it shows whether Earth can **help**, can only **watch**, or will **not even know** in time.

## Idea: Causal Sovereignty
Each hazard has a deadline **D** (time until irreversible harm). Each message has a one-way signal time **τ** (3 to 22 min on Mars). **T_think** is Earth's decision time.

| Zone | Condition | Who acts |
|---|---|---|
| Sovereign (red) | D < τ | Mars crew alone |
| Witness (amber) | τ < D < 2τ + T_think | Crew decides, Earth reviews afterwards |
| Advisory (green) | D > 2τ + T_think | Earth advises, crew decides |

Also built in: contracts with a half-life (Age of Information), Delegation Coverage, a breathing map over the 26-month cycle.

## What is in this project
- `public/` PWA with two roles (Mars crew, Earth control), Leaflet map on **NASA Mars Trek** tiles (Jezero), zone classifier with delay slider, light-cone animation, Plans A/B/C with expiry, offline outbox, vibration alerts.
- `server/server.js` Node WebSocket delay server: holds each message for τ before delivering. Mission time is scaled (`msPerMin`, default 250 ms per mission minute).
- `data/make_tau.py` generates `public/tau.json` (daily τ for 780 days) from **Skyfield / JPL DE421**; falls back to a circular-orbit approximation if Skyfield is not installed.

## Run
```bash
npm install
pip install skyfield        # optional, for real planetary positions
python3 data/make_tau.py    # regenerates public/tau.json
npm start                   # http://localhost:3000
```
Open `http://<your-laptop-ip>:3000/?role=mars` on one phone and `?role=earth` on another (same Wi-Fi). Use HTTPS (e.g. a tunnel) if you want the phone to offer "Add to Home Screen".

## Demo (2 minutes)
1. Give the Earth phone to a judge; keep Mars.
2. Tap **Dust front**: red, "Earth first learns of this in 12 min, decide on your own."
3. Watch the light-cone dot travel to Earth and back; the zone settles.
4. Choose **Plan B**; the Earth phone receives it after τ with a countdown on yours.
5. Drag τ to 22: amber and green hazards turn red one by one.
6. Airplane mode, send a message, reconnect: it delivers from the outbox.
Record a backup video first; Wi-Fi is the usual demo killer.

## Configuration and honesty notes
- Edit hazards, deadlines and contracts in `public/hazards.json`. **Deadlines are team assumptions, not NASA numbers.**
- Tile URL and optional slope layer: `public/config.js`. Check layer names at https://trek.nasa.gov/mars/ . The Mars Trek tile path was written from memory and not tested here; if tiles fail, an in-app banner appears.
- "To our knowledge" this per-hazard map is new; we cannot prove nothing similar exists.
- Real Mars missions will not use phones; this is a simulation anyone can try.

## Team roles
Theory/simulation, Data/map, Frontend, Backend, Mobile/offline, Story/demo.

## Future work
Regret Map, conjunction mode, natural-language search, all of Mars beyond Jezero.
