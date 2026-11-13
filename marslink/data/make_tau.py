"""Generate public/tau.json: one-way Earth-Mars light time (minutes) for every day of a 26-month cycle.
Uses Skyfield + JPL DE421 when available (pip install skyfield; needs internet once to fetch de421.bsp).
Falls back to a circular-orbit approximation so the app always runs."""
import json, math, os, datetime as dt
START = dt.date(2026, 1, 1); DAYS = 780
out = []
try:
    from skyfield.api import load
    ts = load.timescale(); eph = load('de421.bsp'); earth, mars = eph['earth'], eph['mars']
    for i in range(DAYS):
        d = START + dt.timedelta(days=i)
        t = ts.utc(d.year, d.month, d.day)
        au = earth.at(t).observe(mars).distance().au
        out.append(round(au * 8.3167, 2))      # light minutes per AU
    src = 'skyfield/JPL DE421'
except Exception as e:
    print('Skyfield unavailable, using circular approximation:', e)
    for i in range(DAYS):
        a = 2 * math.pi * (i / 365.25 - i / 686.98)
        out.append(round(math.sqrt(1 + 1.524**2 - 2 * 1.524 * math.cos(a)) * 8.3167, 2))
    src = 'circular approximation'
path = os.path.join(os.path.dirname(__file__), '..', 'public', 'tau.json')
json.dump({'start': START.isoformat(), 'source': src, 'tau': out}, open(path, 'w'))
print(f'wrote {path}: {src}, tau {min(out):.1f}-{max(out):.1f} min')
