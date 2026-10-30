/* Performance tiers, shared by Dex (rider.js) and anything else that draws in 3D.
   Per device (localStorage daybook_perf): auto | smooth | balanced | saver. Auto starts on
   balanced (saver on a weak machine) and drops to saver if the frame rate can't keep up,
   e.g. under Opera's CPU limiter. Lofi motion reads fine at 30fps.
   Importing it sets html[data-perf] (CSS follows the level) and window.Perf = { get, set, watch }.
   Always import it as './perf.js' (no ?v=), so every caller shares the one copy. */
export const PERF = { smooth: { fps: 60, dpr: 2 }, balanced: { fps: 30, dpr: 1.5 }, saver: { fps: 20, dpr: 1 } };
export const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
let pick = (() => { try { return localStorage.getItem('daybook_perf') || 'auto'; } catch (e) { return 'auto'; } })();
let level = PERF[pick] ? pick : weak ? 'saver' : 'balanced';
const mon = { n: 0, t0: 0, prev: 0, cap: 0 };
const fns = [];
const report = (where, e) => { try { window.logProblem ? window.logProblem(where, e) : console.warn(where, e); } catch (x) {} };
document.documentElement.dataset.perf = level;

// the tier in force: { fps, dpr }
export const tier = () => PERF[level];
// whatever draws (Dex, the city) re-sizes itself here when the level changes; returns an off switch
export function onPerf(fn) { fns.push(fn); return () => { const i = fns.indexOf(fn); if (i >= 0) fns.splice(i, 1); }; }
function apply() {
  document.documentElement.dataset.perf = level; mon.n = 0;
  fns.slice().forEach(fn => { try { fn({ pick, level }); } catch (e) { report('perf', e); } });
}
// perf() reads { pick, level }; perf('saver') picks one and saves it on this device
export function perf(p) {
  if (p === undefined) return { pick, level };
  pick = PERF[p] ? p : 'auto';
  try { localStorage.setItem('daybook_perf', pick); } catch (e) {}
  level = PERF[pick] ? pick : weak ? 'saver' : 'balanced';
  apply(); return { pick, level };
}
// Auto: measure the frame rate he actually gets over 4s windows. Call it after each drawn frame with
// the cap in force right now (fps). It only measures while that cap is the tier's full fps: idle at
// half rate, drawing on demand or standing still, under a sheet, paused, an outfit loading (cap 0),
// hidden and reduced motion all reset it, and a change of cap starts the window over. Otherwise a
// quiet half-fps scene would read as a slow device and drop everyone to Saver.
export function watchPerf(now, cap, where = 'dex') {
  const full = PERF[level].fps;
  if (pick !== 'auto' || level === 'saver' || document.hidden || REDUCED || cap !== full) { mon.n = 0; mon.cap = cap; return; }
  if (cap !== mon.cap) { mon.n = 0; mon.cap = cap; }   // the cap changed: a new window
  if (mon.n && now - mon.prev > 500) mon.n = 0;   // paused (hidden, scrolled away): start over
  mon.prev = now;
  if (!mon.n) mon.t0 = now;
  if (++mon.n < 2) return;
  const span = now - mon.t0;
  if (span < 4000) return;
  const fps = (mon.n - 1) / span * 1000; mon.n = 0;
  if (fps < full * .7) { level = 'saver'; apply(); report(where, 'slow device, switched to saver (' + fps.toFixed(0) + 'fps)'); }
}
// for index.html (Settings > Performance). Its main script runs before any module, so it falls back to localStorage until this is here
window.Perf = { get: () => perf(), set: p => perf(p), watch: watchPerf };
