/* Arcadia's sound: the Neon cues, the ambience and the player for his own ring. A classic script, loaded before the app.
   Copied from the Sound Lab (Documents/Daybook City/sound-lab.html), which stays normative for how a cue sounds; only
   lab-only parts are left out here (the Classic set, grit, the signature auditions). t66 renders every cue in both
   and checks they match sample for sample. Everything is off until Sound is turned on in System, on this device. */
/* === neon-sound v1 === */
// Arcadia's Neon cues, made in code. No audio files; nothing sampled or copied.
// Every pitched UI note sits in A minor pentatonic (A C D E G); error clashes E with F on purpose. Only the level-up leaves
// the key: its climb and landing are written with hz() instead of N, so the key check still covers everything else.
// The 25% pulse, FM ratio 2 and the rising E to A fourth belong to the UI.
// The phone family (ring, pickup, hangup, message) shares the clean voice, dry and high-passed. Pickup, hangup and message are held
// notes moved by a gentle oscillation, and their A to C grows from the apartment signature. A ring is one baked cycle; rep schedules it again on the audio clock, at most rep.n times (2), the
// second cycle 3 dB softer, and never loops.
// When the app rings: only when a new decision arrived since the last ring (a plain revisit gets the Phone glow only), at
// most once per 30 min, and at least 1 s after land, so the land's A to C tail never sits under the ring's A to C.
// message fires from a timer, not a tap: keep the context awake with hold('message', true) from about 60 s before the next
// due reminder until it fires (as the rest timer does), or it drops. It also drops while a ring voice is live.
// A cue is (ctx, out, opts) => seconds, scheduled at opts.at. Cues render once offline in batches. Post steps run in
// JS. Each variant is set to a loudness
// target (K-weighted, max over 100 ms), capped at -14 dBFS, stored as an AudioBuffer and played through a
// stateless -12 dBFS soft ceiling.
// Normative for sound: recipes, post steps, loudness targets and SIG. Not normative (the build prompt
// wins): cue priority and swallowing, idle time, memory and code budgets.
const NeonSound = (() => {
const N = { A3: 220, C4: 261.63, D4: 293.66, E4: 329.63, G4: 392, A4: 440, C5: 523.25, E5: 659.26, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98, A6: 1760 };
const LEAD = .003, E = .0001, CAP = -14, db = d => Math.pow(10, d / 20), todb = v => v > 0 ? 20 * Math.log10(v) : -200;
const OAC = window.OfflineAudioContext, cfg = { idle: 60000, holdWin: 300, holdMax: 250, repMax: 2 }; // sleep after 60 s idle; a cue may wait 250 ms for a wake-up that a tap started; a ring plays 2 cycles at most
const T = (c, o) => o.at ?? c.currentTime;
const nap = (() => { const q = [], ch = new MessageChannel(); ch.port1.onmessage = () => q.shift()(); return () => new Promise(r => { q.push(r); ch.port2.postMessage(0); }); })(); // yield without the 4 ms timer clamp
function rng(s) { let a = (s * 2654435761) >>> 0 || 1; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const memo = new WeakMap(), cc = c => { let m = memo.get(c); if (!m) memo.set(c, m = {}); return m; };

// ---- sources and shapers ----
function noise(c, secs, seed, chans) { // short white noise for cues
  const ch = chans || 1, n = Math.max(2, Math.ceil(secs * c.sampleRate)), b = c.createBuffer(ch, n, c.sampleRate);
  for (let k = 0; k < ch; k++) { const d = b.getChannelData(k), r = rng((seed || 1) + k * 977); for (let i = 0; i < n; i++) d[i] = r() * 2 - 1; }
  return b;
}
function drive(c, k) { // tanh drive: harmonics that carry on a phone speaker
  const m = cc(c), key = 'd' + k; let cu = m[key];
  if (!cu) { cu = m[key] = new Float32Array(1025); const t = Math.tanh(k); for (let i = 0; i < 1025; i++) cu[i] = Math.tanh(k * (i / 512 - 1)) / t; }
  const w = c.createWaveShaper(); w.curve = cu; w.oversample = '2x'; return w;
}
const G = (c, v) => { const g = c.createGain(); g.gain.value = v; return g; };
const chain = (...n) => { for (let i = 1; i < n.length; i++) n[i - 1].connect(n[i]); return n[n.length - 1]; };
function F(c, type, f, q) { const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; }
function ramp(p, t, v0, pts, lin) { p.setValueAtTime(v0, t); (pts || []).forEach(([dt, v]) => lin ? p.linearRampToValueAtTime(v, t + dt) : p.exponentialRampToValueAtTime(v, t + dt)); }
function env(c, t, a, d, pk, hold) { // click-free: from 0.0001 up, back down to 0.0001
  const g = c.createGain(), p = g.gain; pk = pk || 1; hold = hold || 0;
  p.setValueAtTime(E, t); p.exponentialRampToValueAtTime(pk, t + a); if (hold) p.setValueAtTime(pk, t + a + hold);
  p.exponentialRampToValueAtTime(E * Math.min(1, pk), t + a + hold + d); return g;
}
function hit(c, out, t, o) { // noise click or burst, kept faint: the set is tonal
  o = Object.assign({}, o, { g: (o.g || 1) * .3 }); const d = o.d || .006, s = c.createBufferSource(); s.buffer = noise(c, d + (o.hold || 0) + .02, o.s || 1);
  const f = F(c, o.type || 'bandpass', o.f || 3000, o.q ?? 2); if (o.f2) ramp(f.frequency, t, o.f || 3000, [[o.ft || d, o.f2]]);
  chain(s, f, env(c, t, o.a || .0005, d, o.g || 1, o.hold), out); s.start(t); s.stop(t + d + (o.hold || 0) + .015); return t + d;
}
function tone(c, out, t, o) { // oscillator: glide points, scoop/bend in cents, vibrato, drive, lowpass sweep
  const s = c.createOscillator(); s.type = o.type || 'sine';
  ramp(s.frequency, t, o.f, o.fr); if (o.det || o.bend) ramp(s.detune, t, o.det || 0, o.bend, true);
  const a = o.a || .002, end = t + a + (o.hold || 0) + o.d; let n = s;
  if (o.vib) { const [hz, ct, from] = o.vib, l = c.createOscillator(), lg = c.createGain(); l.frequency.value = hz; ramp(lg.gain, t, 0, [[from, 0], [from + .08, ct]], true); chain(l, lg, s.detune); l.start(t); l.stop(end + .02); }
  if (o.k) n = chain(n, drive(c, o.k));
  if (o.lp) { const f = F(c, 'lowpass', o.lp, o.lq ?? .7); if (o.lpr) ramp(f.frequency, t, o.lp, o.lpr); n = chain(n, f); }
  chain(n, env(c, t, a, o.d, o.g || 1, o.hold), out); s.start(t); s.stop(end + .02); return end;
}
function fm(c, out, t, o) { // glass FM: ratio 2 clean, 1.41 / 2.76 / 3.5 metallic, decaying index, optional tremolo
  const car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), mf = o.f * o.r, a = o.a || .002, end = t + a + o.d, det = o.det || 0;
  car.frequency.value = o.f; mod.frequency.value = mf;
  if (det || o.bend) [car, mod].forEach(x => ramp(x.detune, t, det, (o.bend || []).map(([dt, v]) => [dt, v + det]), true));
  ramp(mg.gain, t, Math.max(o.i0, .01) * mf, [[o.it || .05, Math.max(o.i1 || 0, .01) * mf]]);
  mod.connect(mg); mg.connect(car.frequency);
  let n = car; if (o.lp) { const f = F(c, 'lowpass', o.lp, .7); if (o.lpr) ramp(f.frequency, t, o.lp, o.lpr); n = chain(n, f); }
  if (o.trem) { const tg = G(c, 1), l = c.createOscillator(); l.frequency.value = o.trem[0]; chain(l, G(c, o.trem[1]), tg.gain); l.start(t); l.stop(end + .02); n = chain(n, tg); }
  chain(n, env(c, t, a, o.d, o.g || 1), out); car.start(t); mod.start(t); car.stop(end + .02); mod.stop(end + .02); return end;
}
function thump(c, out, t, o) { // sine drop, tanh-driven, plus a knock phones can play: a triangle on the 4th harmonic and a 600 Hz burst
  const gl = o.gl || .09, d = o.d || gl + .05, tg = G(c, o.g || 1), mix = c.createGain(), oscs = []; tg.connect(out);
  [[1, 1], o.oct != null && [2, db(o.oct)]].forEach(v => { if (!v) return; const s = c.createOscillator(); ramp(s.frequency, t, o.f0 * v[0], [[gl, o.f1 * v[0]]]); chain(s, G(c, v[1]), mix); oscs.push(s); });
  chain(mix, env(c, t, .002, d, 1), drive(c, o.k || 3), F(c, 'lowpass', 1400, .7), tg);
  tone(c, tg, t, { f: o.f0 * (o.km || 4), fr: [[gl, o.f1 * (o.km || 4)]], type: 'triangle', a: .002, d: .07, g: db(o.kn ?? 3) }); // +3 dB: the level that keeps phone loss under 8 dB
  hit(c, tg, t, { d: .012, f: 600, q: 1.2, a: .001, g: 8 * db(o.kb ?? -8), s: 5 }); // x8: the band-passed noise sits near unit RMS
  oscs.forEach(s => { s.start(t); s.stop(t + d + .03); }); return t + d;
}
const IRC = {};
function irBuf(c, secs, pre, top, seed) { // stereo room impulse: highs die first (cutoff falls from top to 700 Hz), optional pre-delay
  const sr = c.sampleRate, key = [sr, secs, pre, top, seed].join(); if (IRC[key]) return IRC[key];
  const P = Math.round(pre * sr), n = Math.ceil(secs * sr), b = c.createBuffer(2, n + P, sr);
  const q = Math.pow(700 / top, 1 / n), dk = Math.exp(-6.9 / n);
  for (let k = 0; k < 2; k++) { const d = b.getChannelData(k), r = rng(seed + k * 31); let y = 0, fc = top, a = 0, e = 1;
    for (let i = 0; i < n; i++) { if (!(i & 63)) a = 1 - Math.exp(-2 * Math.PI * fc / sr); y += (r() * 2 - 1 - y) * a; d[P + i] = y * e * Math.min(1, i / 64); fc *= q; e *= dk; } }
  return IRC[key] = b;
}
function space(c, out, o) { // per-cue bus: hp/lp, reverb rv:[secs, wet, pre, top], echo:[delay, dB, lp]
  const inp = c.createGain(); let dst = out;
  if (o.hp) { dst = F(c, 'highpass', o.hp, .7); dst.connect(out); }
  if (o.lp) { const l = F(c, 'lowpass', o.lp, .7); l.connect(dst); dst = l; }
  inp.connect(dst);
  if (o.rv) { const cv = c.createConvolver(); cv.buffer = irBuf(c, o.rv[0], o.rv[2] || 0, o.rv[3] || 6000, o.seed || 7); chain(inp, cv, G(c, o.rv[1]), dst); }
  if (o.echo) { const dl = c.createDelay(1); dl.delayTime.value = o.echo[0]; chain(inp, dl, F(c, 'lowpass', o.echo[2] || 2500, .7), G(c, db(o.echo[1])), dst); }
  return inp;
}

// ---- JS post: grit, grains, loudness, trims ----
function kq(type, f, q, g, sr) { // biquad coefficients (RBJ): lp, hp, hs
  const A = Math.pow(10, (g || 0) / 40), w = 2 * Math.PI * f / sr, cs = Math.cos(w), al = Math.sin(w) / (2 * q); let b0, b1, b2, a0, a1, a2;
  if (type === 'hs') { const s = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) + (A - 1) * cs + s); b1 = -2 * A * ((A - 1) + (A + 1) * cs); b2 = A * ((A + 1) + (A - 1) * cs - s); a0 = (A + 1) - (A - 1) * cs + s; a1 = 2 * ((A - 1) - (A + 1) * cs); a2 = (A + 1) - (A - 1) * cs - s; }
  else { const h = type === 'hp'; b0 = h ? (1 + cs) / 2 : (1 - cs) / 2; b1 = h ? -(1 + cs) : 1 - cs; b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
function filt(x, k) { const [b0, b1, b2, a1, a2] = k, y = new Float64Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; }
const KW = {}, kw = (x, sr) => { const k = KW[sr] || (KW[sr] = [kq('hs', 1681.97, .7072, 4, sr), kq('hp', 38.135, .5003, 0, sr)]); return filt(filt(x, k[0]), k[1]); };
function loud(chs, sr, win) { // K-weighted loudness, max over a sliding window (100 ms for cues); mono counts as both channels
  const W = Math.round(win * sr), H = Math.round(.005 * sr), m = chs.length === 1 ? 2 : 1;
  const cs = chs.map(d => { const y = kw(d, sr), c = new Float64Array(y.length + 1); for (let i = 0; i < y.length; i++) c[i + 1] = c[i] + y[i] * y[i]; return c; });
  const n = cs[0].length - 1; let best = 0;
  for (let s = 0; s < n; s += H) { const e = Math.min(n, s + W); let ms = 0; cs.forEach(c => ms += (c[e] - c[s]) / W); if (ms > best) best = ms; }
  return best > 0 ? -.691 + 10 * Math.log10(best * m) : -200;
}
const same = (a, b) => { for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 1e-7) return false; return true; }; // mono cues are processed and stored once
function peakOf(chs) { let p = 0; for (const d of chs) for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > p) p = v; } return p; }
function grains(chs, sr, at, len, starts, gains, o) { // copy one grain to new spots: stutter and glitch-in
  o = o || {}; const a = Math.round((at + LEAD) * sr), L = Math.round(len * sr), f = Math.max(1, Math.round(.0015 * sr));
  for (const d of chs) {
    let g = d.slice(a, a + L); if (o.hp) g = filt(g, kq('hp', o.hp, .7071, 0, sr)); 
    for (let i = 0; i < g.length; i++) g[i] *= Math.min(1, i / f, (g.length - 1 - i) / f);
    starts.forEach((s, k) => { const b = Math.round((s + LEAD) * sr); for (let i = 0; i < g.length && b + i < d.length; i++) d[b + i] += g[i] * gains[k]; });
  }
}
function stut(chs, sr, at, len, gaps, step, o) { let s = at; const st = [], gs = []; gaps.forEach((g, k) => { s += len + g; st.push(s); gs.push(db(-step * (k + 1))); }); grains(chs, sr, at, len, st, gs, o); }
function finish(chs, sr, L) { // 20 Hz DC block, loudness target, peak cap -14 dBFS, tail trimmed at -70 dBFS, 2 ms edge fades, mono when L == R
  if (L != null) { chs = chs.map(d => filt(d, kq('hp', 20, .7071, 0, sr))); const p = peakOf(chs); let k = db(L - loud(chs, sr, .1)); if (p * k > db(CAP)) k = db(CAP) / p; for (const d of chs) for (let i = 0; i < d.length; i++) d[i] *= k; }
  let last = 0; for (const d of chs) for (let i = d.length - 1; i > last; i--) if (Math.abs(d[i]) > 3.2e-4) { last = i; break; }
  const n = Math.min(chs[0].length, last + Math.round(.004 * sr)), f = Math.round(.002 * sr);
  const out = chs.map(d => { const o = new Float32Array(d.subarray(0, n)); for (let i = 0; i < f && i < n; i++) { o[i] *= i / f; o[n - 1 - i] *= i / f; } return o; });
  return out.length > 1 && same(out[0], out[1]) ? [out[0]] : out;
}
function mkBuf(chs, sr) { let b; try { b = new AudioBuffer({ length: chs[0].length, numberOfChannels: chs.length, sampleRate: sr }); } catch (e) { b = new OAC(1, 1, sr).createBuffer(chs.length, chs[0].length, sr); }
  chs.forEach((d, i) => b.copyToChannel(d instanceof Float32Array ? d : new Float32Array(d), i)); return b; }
const chans = b => [...Array(b.numberOfChannels)].map((_, i) => b.getChannelData(i).slice());

// ---- shared figures ----
function pad(c, out, t, notes, o) { // two saws per note, +/-10 cents
  const g = c.createGain(), p = g.gain, end = t + o.a + o.hold + o.r;
  p.setValueAtTime(E, t); p.exponentialRampToValueAtTime(o.g, t + o.a); p.setValueAtTime(o.g, t + o.a + o.hold); p.exponentialRampToValueAtTime(E, end);
  const f = F(c, 'lowpass', o.lp, o.q ?? .7); if (o.lpr) ramp(f.frequency, t, o.lp, o.lpr); chain(f, drive(c, 1.5), o.hp ? F(c, 'highpass', o.hp, .7) : G(c, 1), g, out);
  notes.forEach((n, i) => [-10, 10].forEach(det => { const s = c.createOscillator(); s.type = 'triangle'; s.frequency.value = n; s.detune.value = det; let x = s;
    if (o.pan) { const pn = c.createStereoPanner(); pn.pan.value = (i % 2 ? 1 : -1) * o.pan; x = chain(s, pn); }
    chain(x, G(c, .25), f); s.start(t); s.stop(end + .02); }));
  return end;
}
const RINGS = ['ring'];
function ringDef(voice, extra) { return Object.assign({ lvl: 'p', L: -26, len: 1.1, cd: 1800000, jit: 't', cr: [-18, .11, .07], vars: [{}], rep: { n: 2, every: 3, skip: .066, fall: -3 }, cut: RINGS,
  post(chs, sr) { grains(chs, sr, .07, .012, [0, .024, .048], [db(-10), db(-7), db(-4)], { hp: 800, cr: [4, 3, .6] }); },
  fn(c, out, o) { const t = T(c, o) + .07; return voice(c, space(c, out, { hp: 280 }), t) - T(c, o); } }, extra); }

// The level-up. No melody from any game, show or known jingle.
// A new one replaces one still going, so they can be compared. TONES: fewest different notes and note changes for "more than one tone".
const LEVEL_IDS = ['level'], TONES = [6, 12];
// hz('Cs6'): notes that may leave the key. names('A4 C5'): a list of them. lead: the UI's 25% pulse with ratio-2 FM glass on top.
const hz = s => { const m = /^([A-G])(s?)(\d)$/.exec(s); return 440 * Math.pow(2, ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0) + (m[3] - 4) * 12 - 9) / 12); };
const names = s => s.split(' ').map(hz);
// C, Surge: 12 hits speeding up on rising fifths, a breath, the drop on a bare fifth, and a five-note hook; its C sharp turns the chord major.
const surgeAt = i => .13 * (1 - Math.pow(.88, i)) / .12, SD = .98;

// ---- the clean voices, the texture he chose across the set: pure tones, most energy 300 Hz to 3 kHz, little above, no noise, smooth level, small slides. All notes and rhythms are original.
// dk: two detuned sines with steady ratio-2 FM, softly driven, through a gentle lowpass. fr: pitch as ratios. bend: cents. Longer notes scoop in unless they already bend.
function dk(c, out, t, f, o) { o = o || {}; const a = Math.max(o.a || .003, .004), h = o.h || 0, d = o.d || .12, end = t + a + h + d, w = Math.min(o.w || 5, 5), bus = c.createGain(), det = o.det || 0, lp = F(c, 'lowpass', Math.max(o.lp || 1400, 900), Math.min(o.q ?? 1, 1.2)), hp = F(c, 'highpass', o.hp ?? 260, .7); if (o.lpr) ramp(lp.frequency, t, Math.max(o.lp || 1400, 900), o.lpr.map(([x, v]) => [x, Math.max(v, 800)]));
  chain(bus, drive(c, 1.3), hp, lp, env(c, t, a, d, o.g || 1, h), out); const scoop = !o.bend && !o.fr && h + d > .14, start = det + (scoop ? -50 : 0), bend = o.bend || (scoop ? [[.03, det]] : []);
  [-1, 1].forEach(sd => { const car = c.createOscillator(), mod = c.createOscillator(), mg = G(c, f * 2 * (o.i ?? .8)); [[car, 1], [mod, 2]].forEach(([x, m]) => { const f0 = f * m; ramp(x.frequency, t, f0, (o.fr || []).map(([dt, r]) => [dt, r * f0])); ramp(x.detune, t, start + sd * w, bend.map(([dt, v]) => [dt, v + sd * w]), true); });
    chain(mod, mg, car.frequency); chain(car, G(c, .4), bus); [car, mod].forEach(x => { x.start(t); x.stop(end + .02); }); });
  return end; }
const clank = (c, out, t, f, o) => { o = o || {}; return fm(c, out, t, { f, r: 2 + (o.r ? ((o.r * 100) % 7) / 100 : 0), i0: Math.min(o.i || 1.4, 1.4), i1: .2, it: o.it || .05, a: .001, d: o.d || .14, g: o.g || 1, lp: o.lp || 2200 }); }; // a soft tone, not a strike
const stone = (c, out, t, f, d, g) => fm(c, out, t, { f, r: 2, i0: 1.2, i1: .3, it: .4, a: .002, d, g, lp: 1800 });
function darkFigure(c, sp, t, o) { const dt = o.dt || 0, dc = o.dc || 0; thump(c, sp, t, { f0: 105, f1: 50, gl: .1, d: .15, k: 3.5, g: .5 }); [[0, 'A4 E5', .14], [.09 + dt, 'C5 G5', .14], [.18 + 2 * dt, 'E5 B5', .3]].forEach(([x, ch, d]) => names(ch).forEach(f => dk(c, sp, t + x, f, { det: dc, a: .002, h: .03, d, lp: 2300, q: 3, lpr: [[d, 650]], g: .6, sub: .15 }))); }
// Level-ups: same counts as before, an octave and more lower. The Bb chord and the F on top are the phrygian colour.
const DSURGE = i => names(i < 4 ? 'A4 E5' : i < 7 ? 'C5 G5' : i < 10 ? 'D5 A5' : 'E5 B5'), DHOOK = [[0, 'A4', .05, .2, 1], [.13, 'As4', .05, .2, 1], [.26, 'E5', .14, .3, 1], [.52, 'C5', .14, .3, 1], [.78, 'A4', .1, .9, .8]];

// Clean rings, written 2026-10-31. Texture target only: pure tones, most energy 300 Hz to 3 kHz, almost nothing above, no noise, level moving slowly. Tunes and rhythms are original; no notes or timing taken from any recording.
// pure: a sine and a little ratio-2 FM, sustained rather than struck, with a soft attack and release and a slight stereo spread.
function pure(c, out, t, f, h, o) { o = o || {}; const g = o.g ?? 1; [-1, 1].forEach(sd => { const p = c.createStereoPanner(); p.pan.value = sd * .35; p.connect(out); const det = sd * (o.w ?? 5), v = { det: det + (o.from || 0), bend: o.bend && o.bend.map(([x, ct]) => [x, ct + det]) };
  tone(c, p, t, Object.assign({ f, a: .012, hold: h, d: .05, g: g * .5, vib: o.vib }, v)); fm(c, p, t, Object.assign({ f, r: 2, i0: o.i ?? .7, i1: o.i ?? .7, it: .05, a: .012, d: h + .05, g: g * .22, lp: 3000 }, v)); }); return t + .012 + h + .05; }
const cleanRing = (voice, every) => ringDef(voice, { cr: null, post() {}, len: every - .6, rep: { n: 2, every, skip: .066, fall: -3 } });

// The phone sounds, picked by ear 2026-11-01. Broad character only: held notes in a rhythm, moved by an oscillation, not one clean slide. All notes and rhythms are original; nothing is taken from any recording.
// wob: pitch points for pure's bend, +/-ct cents at rate Hz, drifting from 0 to `to` cents. osc: pure through a level wobble, trem: [Hz, depth 0-1].
const wob = (h, rate, ct, to = 0) => { const pts = []; for (let i = 1; i / (2 * rate) < h; i++) { const x = i / (2 * rate); pts.push([x, to * x / h + (i % 2 ? ct : -ct)]); } pts.push([h, to]); return pts; };
function osc(c, out, t, f, h, o) { o = o || {}; let n = out; if (o.trem) { const [rate, depth] = o.trem, tg = G(c, 1 - depth / 2), l = c.createOscillator(); l.frequency.value = rate; chain(l, G(c, depth / 2), tg.gain); tg.connect(out); l.start(t); l.stop(t + h + .1); n = tg; } return pure(c, n, t, f, h, o); }
// One variant each: these notes hold still, so +/-3% pitch variants would sit a quarter tone out of key. jit still varies a repeat by a few cents.
const callFig = steps => (c, out, o) => { const t = T(c, o), sp = space(c, out, { hp: 280 }); return Math.max(...steps.map(([x, nt, h]) => osc(c, sp, t + x, hz(nt), h, { trem: [6, .5], bend: wob(h, 6, 18) }))) - t; };

// ---- Neon cues. lvl: w whisper, s soft, p present. L: loudness target (K-weighted 100 ms max). jit: n +/-3% rate, t +/-10 cents.
// wet: has reverb or echo.
// Self-test limits on a cue: lenMs: [min, max] to -60 dBFS; aud: fewest ms until a phone speaker has it 20 dB under its loudest moment; moves: [fewest different strongest notes, fewest changes];
// oneTone: the same limits, which this cue must fail, or the check can't catch what it is for; harsh: the 2-5 kHz band's loudest moment, dB against the cue's ----
const NEON = {
  tick: { lvl: 'w', L: -38, len: .06, cd: 40, jit: 't', cr: [-18, .03], vars: [{ bp: 1100, s: 11, m: 1 }, { bp: 1350, s: 12, m: 1.03 }, { bp: 1600, s: 13, m: .97 }],
    fn(c, out, o) { const t = T(c, o); hit(c, out, t, { d: .009, f: o.bp, q: 3, s: o.s }); dk(c, out, t, hz('E5') * o.m, { a: .001, d: .028, lp: 1800, sub: 0, g: db(-4) }); return .032; } },
  open: { lvl: 's', L: -36, len: .12, cd: 150, jit: 't', cr: [-18, .04], vars: [{ e: 1500, st: .03, s: 21, c: 0 }, { e: 1800, st: .035, s: 22, c: -40 }, { e: 2100, st: .042, s: 23, c: 40 }],
    fn(c, out, o) { const t = T(c, o); hit(c, out, t, { d: .004, f: 1000, q: 1.5, g: .5, s: o.s });
      [hz('A4'), hz('E5')].forEach(f => dk(c, out, t, f, { bend: [[.015, o.c]], det: o.c - 40, lp: 600, q: 4, lpr: [[o.st, o.e]], a: .002, d: .07, g: .6, sub: 0 })); return .072; } },
  back: { lvl: 's', L: -36, len: .13, cd: 150, jit: 't', cr: [-18, .04], vars: [{ q: 3, s: 31, c: 0 }, { q: 4, s: 32, c: -40 }, { q: 5, s: 33, c: 40 }],
    fn(c, out, o) { const t = T(c, o); hit(c, out, t, { d: .004, f: 900, q: 1.5, g: .5, s: o.s });
      [hz('E5'), hz('A4')].forEach(f => dk(c, out, t, f, { det: o.c || 0, bend: [[.08, o.c || 0]], fr: [[.05, 1], [.08, .7]], lp: 1600, q: o.q || 4, lpr: [[.06, 600]], a: .002, d: .085, g: .6, sub: 0 })); return .087; } },
  check: { lvl: 's', L: -31, len: .17, cd: 60, jit: 't', cr: [-18, .04], vars: [{ r: 2.76, j: 0, s: 41 }, { r: 2.9, j: -.003, s: 42 }, { r: 2.6, j: .003, s: 43 }],
    fn(c, out, o) { const t = T(c, o); hit(c, out, t, { d: .005, f: 1400, q: 3, g: .5, s: o.s });
      [[0, 'E4', .06], [.04 + o.j, 'A4', .1]].forEach(([x, nt, d]) => { dk(c, out, t + x, hz(nt), { a: .001, d, lp: 1800, q: 2, lpr: [[d, 500]], sub: .15 }); clank(c, out, t + x, hz(nt), { r: o.r, d, g: db(-6) }); }); return .145; } },
  uncheck: { lvl: 'w', L: -38, len: .1, cd: 60, jit: 't', vars: [{ lp: 900, gl: .036, s: 51, c: 0 }, { lp: 1100, gl: .04, s: 52, c: -40 }, { lp: 1300, gl: .044, s: 53, c: 40 }],
    fn(c, out, o) { const t = T(c, o); hit(c, out, t, { d: .005, f: 1100, q: 2, g: .5, s: o.s }); dk(c, out, t, hz('A4'), { det: o.c, bend: [[o.gl, o.c]], fr: [[o.gl, .944]], a: .002, d: .07, lp: o.lp, sub: 0 }); return .072; } },
  undo: { lvl: 's', L: -34, cd: 150, jit: 't', from: 'check', vars: [{}, {}, {}], // the done sound backwards, 0.95x, lowpass 3 kHz
    xf(chs, sr) { const f = Math.round(.012 * sr), k = kq('lp', 3000, .7071, 0, sr); return chs.map(d => { const n = Math.floor((d.length - 1) / .95), y = new Float64Array(n);
      for (let i = 0; i < n; i++) { const p = d.length - 1 - i * .95, i0 = Math.floor(p), fr = p - i0; y[i] = d[i0] * (1 - fr) + (d[i0 + 1] || 0) * fr; }
      const z = filt(y, k); for (let i = 0; i < f && i < n; i++) { z[i] *= i / f; z[n - 1 - i] *= i / f; } return z; }); } },
  error: { lvl: 's', L: -37, len: .15, cd: 1000, jit: 't', cr: [-18, .045], vars: [{}],
    fn(c, out, o) { const t = T(c, o), g = c.createGain(), p = g.gain, f = F(c, 'lowpass', 1100, 2); p.setValueAtTime(0, t);
      [[0, .045], [.075, .12]].forEach(([a, b]) => { p.setValueAtTime(0, t + a); p.linearRampToValueAtTime(1, t + a + .002); p.setValueAtTime(1, t + b - .002); p.linearRampToValueAtTime(0, t + b); });
      [hz('As4'), hz('E5')].forEach(fq => { const s = c.createOscillator(); s.type = 'triangle'; s.frequency.value = fq; s.connect(f); s.start(t); s.stop(t + .13); }); chain(f, drive(c, 2.5), F(c, 'highpass', 360, .7), g, out); return .12; } }, // a tritone: wrong, not cute
  hover: { lvl: 'w', L: -46, len: .03, cd: 120, jit: 'n', vars: [{ f: 1700, s: 61 }, { f: 2000, s: 62 }, { f: 2300, s: 63 }],
    fn(c, out, o) { tone(c, out, T(c, o), { f: o.f * .6, a: .002, d: .02 }); return .024; } },
  spot: { lvl: 'w', L: -46, len: .045, cd: 120, jit: 'n', vars: [{ m: .9, s: 71 }, { m: 1, s: 72 }, { m: 1.1, s: 73 }],
    fn(c, out, o) { const t = T(c, o), m = o.m; tone(c, out, t, { f: 1100 * m, a: .002, d: .016 }); tone(c, out, t + .018, { f: 880 * m, a: .002, d: .016, g: db(-3) }); return .04; } },
  press: { lvl: 's', L: -34, len: .09, cd: 150, jit: 't', cr: [-18, .03], vars: [{ r: 2.41, s: 81 }, { r: 2.76, s: 82 }, { r: 3.1, s: 83 }],
    fn(c, out, o) { const t = T(c, o); hit(c, out, t, { d: .005, f: 1500, q: 2, g: .5, s: o.s }); clank(c, out, t, hz('D5') * o.r / 2.76, { d: .06, lp: 2400 }); return .062; } },
  fly: { lvl: 's', L: -36, len: .75, cd: 250, jit: 'n', vars: [{ s: 111 }, { s: 112 }, { s: 113 }], post(chs, sr) { stut(chs, sr, .6, .016, [.022, .03], 6); },
    fn(c, out, o) { const t = T(c, o), s = c.createBufferSource(); s.buffer = noise(c, .7, o.s, 2);
      const f = F(c, 'bandpass', 300, 1.5); ramp(f.frequency, t, 300, [[.56, 1300]]); ramp(f.Q, t, 1.5, [[.56, 3]], true);
      const g = c.createGain(), p = g.gain; p.setValueAtTime(E, t); p.exponentialRampToValueAtTime(1, t + .3); p.setValueAtTime(1, t + .56); p.exponentialRampToValueAtTime(E, t + .62);
      chain(s, f, g, out); s.start(t); s.stop(t + .64);
      dk(c, out, t, hz('A3'), { fr: [[.6, 2]], lp: 500, lpr: [[.6, 1300]], a: .3, h: .26, d: .06, g: .22, sub: .2 }); return .7; } },
  exit: { lvl: 's', L: -34, len: .5, cd: 250, jit: 't', cr: [-18, .04], vars: [{ s: 121 }, { s: 122 }, { s: 123 }],
    fn(c, out, o) { const t = T(c, o); NEON.back.fn(c, out, { at: t, q: 4, s: o.s }); const s = c.createBufferSource(); s.buffer = noise(c, .5, o.s + 7, 2);
      const f = F(c, 'bandpass', 1800, 2); ramp(f.frequency, t, 1800, [[.42, 300]]); chain(s, f, env(c, t, .02, .42, 1.6), out); s.start(t); s.stop(t + .46); return .45; } },
  in: { lvl: 'p', L: -29, len: .95, cd: 250, thump: 1, wet: 1, jit: 't', cr: [-15, .12], vars: [{ dt: 0, dc: 0 }, { dt: .012, dc: -10 }, { dt: -.01, dc: 10 }],
    fn(c, out, o) { const t = T(c, o), sp = space(c, out, { lp: 2600, echo: [.14, -14, 1500] });
      thump(c, sp, t, { f0: 120, f1: 60, gl: .08, d: .12, k: 3, g: .25 }); hit(c, sp, t, { d: .008, f: 1200, q: 1.5, g: .5, s: 131 });
      ['A4', 'E5'].forEach(nt => dk(c, sp, t + .03, hz(nt), { det: o.dc, bend: [[.09, o.dc + 300]], lp: 300, q: 3, lpr: [[.14, 2000], [.4, 750]], a: .004, h: .08, d: .3, g: .55, sub: .25 }));
      clank(c, sp, t + .15 + o.dt, hz('A4'), { d: .22, g: db(-5) }); return .65; } }, // a heavy latch, then the power comes up a minor third
  out: { lvl: 'p', L: -29, len: 1, cd: 250, thump: 1, wet: 1, jit: 't', cr: [-15, .1], vars: [{ dt: 0, dc: 0 }, { dt: .012, dc: 10 }, { dt: -.01, dc: -10 }],
    fn(c, out, o) { const t = T(c, o), sp = space(c, out, { lp: 2600, echo: [.14, -14, 1500] });
      clank(c, sp, t, hz('E5'), { d: .12, g: db(-5) }); hit(c, sp, t, { d: .008, f: 1200, q: 1.5, g: .5, s: 132 });
      ['A4', 'E5'].forEach(nt => dk(c, sp, t + .05 + o.dt, hz(nt), { det: o.dc, bend: [[.2, o.dc], [.42, o.dc - 884]], lp: 1800, q: 3, lpr: [[.2, 1500], [.42, 500]], a: .004, h: .18, d: .24, g: .55, sub: .25 }));
      thump(c, sp, t + .52 + o.dt, { f0: 100, f1: 55, gl: .08, d: .12, k: 3, g: .25 * db(-4) }); return .66; } }, // the power sinks away, then the door shuts
  chime: { lvl: 'p', L: -24, len: .85, cd: 250, wet: 1, jit: 't', cr: [-18, .1, .06], vars: [{}], post(chs, sr) { grains(chs, sr, .06, .012, [0, .02], [db(-10), db(-10)]); },
    fn(c, out, o) { const t = T(c, o), sp = space(c, out, { lp: 3000, echo: [.16, -14, 1600] }); [[.06, 'A4'], [.21, 'A4'], [.36, 'E5']].forEach(([x, nt]) => { dk(c, sp, t + x, hz(nt), { a: .002, h: .1, d: .14, lp: 3000, q: 1.2, lpr: [[.22, 1300]], sub: 0, hp: 420, k: 5 }); clank(c, sp, t + x, hz(nt) * 2, { d: .1, g: db(-10), lp: 2800 }); }); return .62; } },
  // ---- the call family: dry, one voice (rk) ----
  // Each ring plays rep.n = 2 cycles, 3 s apart (the second 3 dB softer), then stops; it never loops. cd 30 min. The first cycle
  // glitches in: three crushed copies of the first attack, getting louder, before the first note at 70 ms.
  ring: cleanRing((c, sp, t) => { const a = pure(c, sp, t, hz('D5'), .62, { bend: [[.12, 0], [.42, 700]] }); return Math.max(a, pure(c, sp, t + .86, hz('G5'), .62, { bend: [[.12, 0], [.42, -500]] })); }, 3),
  pickup: { lvl: 's', L: -34, len: .75, cd: 150, jit: 't', cut: RINGS, vars: [{}], fn: callFig([[0, 'A4', .12], [.16, 'C5', .34]]) }, // short then long, rising
  hangup: { lvl: 's', L: -36, len: .75, cd: 150, jit: 't', vars: [{}], fn: callFig([[0, 'C5', .12], [.16, 'A4', .34]]) }, // the same, falling
  message: { lvl: 'p', L: -28, len: 1.3, cd: 60000, jit: 't', vars: [{}], fn: callFig([[0, 'A4', .3], [.38, 'C5', .5]]) }, // two long notes, once
  'study-in': { lvl: 'p', L: -28, len: 3, cd: 250, wet: 1, jit: 't', vars: [{}],
    fn(c, out, o) { const t = T(c, o), sp = space(c, out, { lp: 2800, rv: [1.4, .3, .025, 2600], seed: 14 }); stone(c, sp, t + .08, hz('E4'), 1.1); stone(c, sp, t + .24, hz('A4'), 1.1, db(-4)); return 1.4; } },
  'study-out': { lvl: 'p', L: -28, len: 2.7, cd: 250, wet: 1, jit: 't', vars: [{}],
    fn(c, out, o) { const t = T(c, o), sp = space(c, out, { hp: 250, lp: 2800, rv: [1.2, .3, .025, 2600], seed: 15 });
      stone(c, sp, t, hz('A4'), 1.1); stone(c, sp, t + .2, hz('E4'), 1.1); return 1.3; } },
  'school-check': { lvl: 's', L: -31, len: .7, cd: 60, wet: 1, jit: 't', vars: [{ r: 1.38, j: -.003, s: 151 }, { r: 1.41, j: 0, s: 152 }, { r: 1.44, j: .003, s: 153 }],
    fn(c, out, o) { const t = T(c, o), sp = space(c, out, { hp: 330, rv: [.4, .12, .008, 3000], seed: 16 }); hit(c, sp, t, { d: .005, f: 1500, q: 3, g: .5, s: o.s });
      clank(c, sp, t, hz('A4'), { r: o.r, i: 2, d: .06 }); clank(c, sp, t + .035 + o.j, hz('E5'), { r: o.r, i: 2, d: .09 }); return .16; } },
  win: { lvl: 'p', L: -27, len: 1.6, cd: 250, thump: 1, wet: 1, jit: 't', cr: [-15, .04], vars: [{ gp: .19, dt: 0, dc: 0 }, { gp: .21, dt: .012, dc: -10 }, { gp: .23, dt: -.01, dc: 10 }],
    post(chs, sr, o) { stut(chs, sr, o.gp + 2 * o.dt, .02, [.03, .04, .035], 5, { hp: 1000 }); },
    fn(c, out, o) { darkFigure(c, space(c, out, { lp: 3000, rv: [.6, .18, .008, 3500], seed: 17 }), T(c, o), o); return .8; } },
  trophy: { lvl: 'p', L: -26, len: 2, cd: 250, thump: 1, wet: 1, jit: 't', cr: [-15, .04], vars: [{}],
    post(chs, sr) { stut(chs, sr, .3, .02, [.03, .04, .035], 5, { hp: 1000 }); },
    fn(c, out, o) { const t = T(c, o), sp = space(c, out, { lp: 3200, rv: [.8, .22, .008, 3500], seed: 18 }); darkFigure(c, sp, t, {}); clank(c, sp, t + .27, hz('E5'), { d: .4, g: db(-5) });
      pad(c, sp, t + .15, names('A4 E5 C6'), { hp: 220, a: .15, hold: .2, r: .45, lp: 1300, g: db(-14) * 2 }); return 1; } },
  // ---- level-up: Surge, his pick. All minor; nothing lifts into a major chord
  level: { lvl: 'p', L: -23, len: 4.8, cd: 250, thump: 1, wet: 1, jit: 't', cut: LEVEL_IDS, lenMs: [2500, 3500], aud: 2500, moves: TONES, harsh: -5, cr: [-18, SD + .04, SD], vars: [{}],
    post(chs, sr) { grains(chs, sr, SD, .02, [SD - .07, SD - .03], [db(-12), db(-7)], { hp: 900, cr: [4, 3, .6] }); stut(chs, sr, SD + .78, .02, [.03, .04, .035], 6, { hp: 800 }); },
    fn(c, out, o) { const t = T(c, o), sp = space(c, out, { rv: [1.2, .25, .015, 2800], seed: 29 }), s = c.createBufferSource(), f = F(c, 'bandpass', 300, 1.5), g = c.createGain(), p = g.gain;
      s.buffer = noise(c, 1, 201, 2); ramp(f.frequency, t, 300, [[.88, 2400]]); ramp(f.Q, t, 1.5, [[.88, 4]], true); p.setValueAtTime(.06, t); p.exponentialRampToValueAtTime(.42, t + .84); p.setValueAtTime(.42, t + .86); p.exponentialRampToValueAtTime(E, t + .89); chain(s, f, g, sp); s.start(t); s.stop(t + .92);
      pad(c, sp, t, names('A3 E4 A4'), { hp: 220, a: .72, hold: .13, r: .03, lp: 300, lpr: [[.85, 1900]], g: .34, pan: .3 });
      for (let i = 0; i < 12; i++) { const tt = t + surgeAt(i); DSURGE(i).forEach(x => dk(c, sp, tt, x, { a: .001, h: .012, d: .12, lp: 900 + i * 110, q: 3, g: .3 + i * .02, sub: 0 })); if (i === 0 || i === 4 || i === 7 || i === 10) thump(c, sp, tt, { f0: 90, f1: 50, gl: .05, d: .08, k: 3, g: i ? .2 : .32 }); }
      const D = t + SD; thump(c, sp, D, { f0: 95, f1: 45, gl: .14, d: .26, oct: -10, k: 4, g: .46 }); hit(c, sp, D, { d: .01, f: 1200, q: 1.2, g: .3, s: 202 });
      pad(c, sp, D, names('A3 E4 A4 E5'), { hp: 220, a: .008, hold: .9, r: 2, lp: 650, lpr: [[.12, 1900], [2.4, 500]], g: .9, pan: .5 });
      pad(c, sp, D + .52, names('C5 E5 A5'), { hp: 220, a: .03, hold: .9, r: 1.8, lp: 1500, lpr: [[2, 550]], g: .42, pan: .5 });
      DHOOK.forEach(([x, nt, h, d, gn]) => dk(c, sp, D + x, hz(nt), { h, d, lp: 2000, q: 3, lpr: [[d, 700]], g: gn * .7, sub: 0 })); thump(c, sp, D + .78, { f0: 90, f1: 50, gl: .05, d: .08, k: 3, g: .24 });
      clank(c, sp, D + .78, hz('A4'), { d: 1.4, i: 4, it: .35, g: .35, lp: 1900 }); return SD + 3.4; } },
};

// ---- place signatures: note one inside tap, note two inside land ----
const SIG = {
  apartment: { n: [hz('A4'), hz('C5')], gap: .32, hp: 280, rv: [.4, .15, .008, 3000], seed: 21, play(c, out, t, f) { fm(c, out, t, { f, r: 1, i0: 1.6, i1: .3, it: .3, a: .003, d: .45, lp: 1500, trem: [4.5, .17] }); dk(c, out, t, f, { a: .004, d: .42, lp: 1000, q: 1, lpr: [[.42, 500]], g: .4, sub: .2 }); return .46; } },
  shop: { n: [hz('C5'), hz('G4')], gap: .3, hp: 280, rv: [.5, .15, .008, 3000], seed: 22, play(c, out, t, f, i) { dk(c, out, t, f, { a: .006, h: .3, d: .28, lp: 2200 }); return .6; } },
  gym: { n: [hz('A4'), hz('E5')], gap: .26, hp: 280, lt: .25, cr: [-15, .04], echo: [.11, -14, 1500], thump: 1, play(c, out, t, f, i) { dk(c, out, t, f, { a: .002, d: .25, lp: 2200, q: 4, lpr: [[.15, 800]], k: 3.5, sub: .4 }); if (!i) thump(c, out, t, { f0: 90, f1: 55, gl: .06, d: .09, k: 3, g: .25 }); return .25; } },
  ski: { n: [hz('A4'), hz('D5')], gap: .3, hp: 280, rv: [.9, .25, .015, 3500], seed: 24, play(c, out, t, f, i) { const v = { f, det: -30, bend: [[.04, 0]], vib: [5, 8, .12], a: .012, d: .4, lp: 1800 };
    tone(c, out, t, Object.assign({ type: 'triangle' }, v)); return .41; } },
  castle: { n: [hz('E4'), hz('A4')], gap: .45, hp: 280, rv: [1.4, .3, .025, 2600], seed: 26, play(c, out, t, f) { fm(c, out, t, { f, r: 2, i0: 1.2, i1: .3, it: .5, a: .004, d: .9, lp: 1700 }); dk(c, out, t, f, { a: .004, d: .7, lp: 700, q: 1, lpr: [[.7, 300]], g: .35, sub: .2 }); return .9; } },
};
for (const k in SIG) delete SIG[k].cr;
for (const k in SIG) {
  const S = SIG[k], tail = S.rv ? S.rv[0] + S.rv[2] : .2, th = !!S.thump, wet = S.rv || S.echo ? 1 : 0, cr = S.cr;
  NEON['tap:' + k] = { lvl: 's', L: -32, len: 1 + tail, cd: 250, cr, wet, thump: th, jit: 't', vars: [{}],
    fn(c, out, o) { const t = T(c, o), sp = space(c, out, S); hit(c, sp, t, { d: .006, f: 3000, q: 2, g: .6, s: 101 }); return S.play(c, sp, t, S.n[0], 0); } };
  NEON['land:' + k] = { lvl: 's', L: -32, len: 1.2 + tail, cd: 250, cr: cr && [cr[0], .06, .02], wet, thump: 1, jit: 't', vars: [{}],
    fn(c, out, o) { const t = T(c, o), sp = space(c, out, S); thump(c, out, t, { f0: 110, f1: 55, gl: .09, d: .14, oct: -10, k: 3, g: S.lt || .45 }); return .02 + S.play(c, sp, t + .02, S.n[1], 1); } };
}

for (const k in NEON) { delete NEON[k].cr; delete NEON[k].cx; }

const CUES = { neon: NEON };

// ---- engine ----
const S = { ctx: null, bus: null, set: 'neon', vol: 1, bufs: {}, pend: {}, last: {}, lastAt: {}, voices: [], holds: {}, held: null, gestureAt: 0, gen: 0, ss: 0, idleT: 0, wakeMs: null, redo: 0, started: 0, lvlUntil: 0, log: [], onstate: null };
const bid = (kind, key, sr) => kind + '|' + key + '|' + sr;
function resolve(kind, name, o) {
  let k = name; if (kind !== 'neon') return null;
  if (k === 'tap' || k === 'land') { const r = (o && o.room) || 'apartment'; k += ':' + (r === 'chalet' ? 'ski' : r); } // the chalet sits in the ski village
  return NEON[k] ? [k, NEON[k]] : null;
}
async function render(kind, keys, sr) { // one short OfflineAudioContext per variant, all rendering in parallel. (A shared long
  // context costs more: every WaveShaper and convolver keeps running to its end.) Graph building yields between variants.
  const jobs = [], runs = [];
  for (const k of keys) { const def = CUES[kind][k]; for (let i = 0; i < def.vars.length; i++) {
    const j = { k, v: i, def, o: Object.assign({ v: i }, def.vars[i], { at: LEAD }) }, oc = new OAC(2, Math.ceil((def.len + LEAD) * sr), sr);
    def.fn(oc, oc.destination, j.o); runs.push(oc.startRendering().then(rb => { const L = rb.getChannelData(0), R = rb.getChannelData(1); j.chs = same(L, R) ? [L] : [L, R]; })); jobs.push(j); await nap(); } }
  await Promise.all(runs); return jobs;
}
function bake(kind, keys, sr) { // render a batch, post-process in JS, store AudioBuffers; a failed bake is not cached
  const gen = S.gen, need = [], wait = [];
  for (const k of [].concat(keys)) { const id = bid(kind, k, sr); if (S.bufs[id] || !CUES[kind][k]) continue; if (S.pend[id]) wait.push(S.pend[id]); else need.push(k); }
  if (!need.length) return Promise.all(wait);
  const p = (async () => {
    const main = need.filter(k => !CUES[kind][k].from), jobs = main.length ? await render(kind, main, sr) : [];
    for (const j of jobs) {
      const def = j.def;
      if (def.post) def.post(j.chs, sr, j.o); await nap();
      j.out = finish(j.chs, sr, def.raw ? null : def.L); await nap();
    }
    if (gen !== S.gen) return;
    main.forEach(k => { const js = jobs.filter(j => j.k === k); S.bufs[bid(kind, k, sr)] = js.map(j => mkBuf(j.out, sr)); });
    for (const k of need.filter(k => CUES[kind][k].from)) { const def = CUES[kind][k]; await bake(kind, def.from, sr); const src = S.bufs[bid(kind, def.from, sr)]; if (!src || gen !== S.gen) return;
      S.bufs[bid(kind, k, sr)] = src.map(b => mkBuf(finish(def.xf(chans(b), sr), sr, def.L), sr)); }
  })();
  need.forEach(k => S.pend[bid(kind, k, sr)] = p);
  const done = () => need.forEach(k => { if (S.pend[bid(kind, k, sr)] === p) delete S.pend[bid(kind, k, sr)]; }); p.then(done, done);
  return Promise.all([p, ...wait]);
}
let CEIL = null;
function ceilCurve() { const cu = new Float32Array(4097), a = db(CAP), h = db(-12) - a; for (let i = 0; i < 4097; i++) { const x = i / 2048 - 1, m = Math.abs(x); cu[i] = Math.sign(x) * (m <= a ? m : a + h * Math.tanh((m - a) / h)); } return cu; }
function buildBus(c, vol) { // ui -> master -> soft ceiling (identity to -14 dBFS, tanh knee to -12; no warm-up, no makeup, no latency) -> out
  const master = G(c, vol), lim = c.createWaveShaper(), ui = G(c, 1);
  lim.curve = CEIL || (CEIL = ceilCurve()); lim.oversample = 'none'; ui.connect(master); chain(master, lim, c.destination); return { master, lim, ui };
}
function boot() { // only from a tap: 'ambient' session first, then the context
  if (S.ctx && S.ctx.state !== 'closed') { wake(); return S.ctx; }
  try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) {}
  if (!window.AudioContext || !OAC) return null;
  let c; try { c = new AudioContext({ latencyHint: 'interactive' }); } catch (e) { return null; }
  S.ctx = c; S.bus = buildBus(c, S.vol); c.addEventListener('statechange', () => { flush(); if (S.onstate) S.onstate(); }); wake(); touch(); return c;
}
function wake() { // resume after a tap; if the clock does not move, recreate once (buffers are reused), then give up quietly
  const c = S.ctx; if (!c || c.state === 'running' || c.state === 'closed') return; const t0 = performance.now(), ss = S.ss;
  c.resume().then(() => { if (S.ctx !== c) return; S.wakeMs = Math.round(performance.now() - t0); const ct = c.currentTime; flush(); touch();
    setTimeout(() => { if (S.ctx === c && c.state === 'running' && S.ss === ss && c.currentTime - ct < .1) stalled(c); }, 250); }, () => {});
}
function stalled(c) { if (S.redo) { if (!S.log.length) { S.log.push({ t: Date.now(), e: 'audio stalled' }); console.warn('Sound: audio stalled'); } return; }
  S.redo = 1; S.ctx = null; S.bus = null; S.voices = []; c.close().catch(() => {}); boot(); }
const gesture = () => { S.gestureAt = performance.now(); wake(); };
['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach(ev => addEventListener(ev, gesture, true));
function touch() { clearTimeout(S.idleT); S.idleT = setTimeout(idle, cfg.idle); }
const prune = c => S.voices = S.voices.filter(v => v.end > c.currentTime); // by end time: onended can be late or missing
function idle() { const c = S.ctx; if (!c || c.state !== 'running') return; prune(c); if (S.voices.length || Object.values(S.holds).some(Boolean)) { touch(); return; } S.ss++; c.suspend().catch(() => {}); delete S.bufs[bid('neon', 'level', c.sampleRate)]; }
function hold(k, on) { S.holds[k] = !!on; touch(); }
function flush() { const h = S.held, c = S.ctx; if (!h) return; if (performance.now() > h.exp) { S.held = null; return; } if (!c || c.state !== 'running' || document.hidden) return;
  const r = resolve(h.kind, h.name, h.o), b = r && S.bufs[bid(h.kind, r[0], c.sampleRate)]; if (!b) return; S.held = null; start(c, h.kind, r[0], r[1], b, h.o, h.name); }
function play(name, o) { // synchronous; drops when off, hidden or not ready. One cue may wait up to 250 ms after a tap. Never queues.
  o = o || {}; const c = S.ctx; if (!c || c.state === 'closed' || !S.bus || document.hidden) return 0;
  const kind = o.kind || S.set, r = resolve(kind, name, o); if (!r) return 0;
  const [key, def] = r, ck = kind + key, now = performance.now(), cd = def.cd ?? 0;
  if (key !== 'level' && !o.force && now < S.lvlUntil) return 0; // the level-up swallows other cues while it plays
  if (!o.force && cd && now - (S.lastAt[ck] || 0) < cd) return 0;
  const bufs = S.bufs[bid(kind, key, c.sampleRate)];
  if (bufs && c.state === 'running') { S.lastAt[ck] = now; return start(c, kind, key, def, bufs, o, name); }
  if (!bufs) bake(kind, key, c.sampleRate).then(flush, () => {});
  const w = o.wait || (now - S.gestureAt <= cfg.holdWin ? cfg.holdMax : 0); // o.wait: a cue worth waiting for while it bakes (the level-up, the ring)
  if (w) { S.lastAt[ck] = now; S.held = { kind, name, o, exp: now + w }; wake(); setTimeout(flush, w + 1); }
  return 0;
}
const fadeStop = (c, v, t) => { t = t ?? c.currentTime; try { v.g.gain.setTargetAtTime(0, t, .008); } catch (e) {} v.src.forEach(s => { try { s.stop(t + .05); } catch (e) {} }); }; // also cancels cycles not yet started
function start(c, kind, key, def, bufs, o, name) { // a rep cue (the ring) is one voice: its cycles are scheduled on the audio clock, at most cfg.repMax, never a loop
  const ck = kind + key; let v = Math.floor(Math.random() * bufs.length); if (bufs.length > 1 && v === S.last[ck]) v = (v + 1) % bufs.length; S.last[ck] = v;
  const j = kind === 'neon' ? def.jit : 0, b = bufs[v], rate = j === 'n' ? 1 + (Math.random() * 2 - 1) * .03 : j === 't' ? Math.pow(2, (Math.random() * 20 - 10) / 1200) : 1;
  if (kind === 'neon' && def.cut) def.cut.forEach(x => quiet(x, kind)); // pickup stops a ring that is still going, whichever ring it is
  const rp = kind === 'neon' && def.rep, reps = rp ? Math.max(1, Math.min(o.reps || rp.n, cfg.repMax)) : 1; // o.reps: lab auditions only
  const g = G(c, kind === 'neon' && def.lvl !== 'p' ? db((Math.random() * 2 - 1) * 1.5) : 1), fg = reps > 1 && rp.fall ? G(c, db(rp.fall)) : null; let n = g;
  if (fg) fg.connect(g); // later cycles are rp.fall dB softer, so a second ring reads as polite, not nagging
  if (o.x != null) { const pn = c.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, (2 * o.x / innerWidth - 1) * (o.phone ? .3 : .5))); n = chain(g, pn); }
  n.connect(S.bus.ui); const now = c.currentTime, src = [];
  for (let k = 0; k < reps; k++) { const s = c.createBufferSource(), off = k ? LEAD + rp.skip : 0; s.buffer = b; s.playbackRate.value = rate; s.connect(k && fg ? fg : g); // later cycles skip the glitch-in
    if (k) s.start(now + (k * rp.every + off) / rate, off); else s.start(); src.push(s); }
  const dur = ((reps - 1) * (rp ? rp.every : 0) + b.duration) / rate, voice = { key: ck, nm: kind + '|' + (name || key), src, g, end: now + dur + .05 }; prune(c); S.voices.push(voice); S.started++; if (key === 'level') S.lvlUntil = performance.now() + 3500;
  while (S.voices.length > 6) fadeStop(c, S.voices.shift());
  let left = reps; src.forEach(s => s.onended = () => { if (--left) return; try { src.forEach(x => x.disconnect()); if (fg) fg.disconnect(); g.disconnect(); n.disconnect(); } catch (e) {} S.voices = S.voices.filter(x => x !== voice); });
  touch(); return dur;
}
async function off() { // fade, close, free every buffer
  const c = S.ctx; S.gen++; S.held = null; clearTimeout(S.idleT);
  if (c && S.bus) { const t = c.currentTime; S.bus.master.gain.setTargetAtTime(0, t, .01); S.voices.forEach(v => fadeStop(c, v, t)); }
  S.ctx = null; S.bus = null; S.voices = []; S.bufs = {}; S.pend = {}; S.last = {}; S.redo = 0; S.lvlUntil = 0;
  for (const k in IRC) delete IRC[k];
  if (c) { await new Promise(r => setTimeout(r, 60)); try { await c.close(); } catch (e) {} }
}
function setVol(v) { S.vol = v; if (S.bus) S.bus.master.gain.setTargetAtTime(v, S.ctx.currentTime, .02); }
async function prepare(groups, onStep) { // [[kind, [keys]], ...] batch by batch, so the first taps are ready early
  const c = S.ctx; if (!c) return; const all = groups.reduce((s, g) => s + g[1].length, 0); let n = 0;
  for (const [kind, keys] of groups) { if (S.ctx !== c) return; try { await bake(kind, keys, c.sampleRate); } catch (e) {} n += keys.length; if (S.ctx === c && onStep) onStep(n, all); }
}

function quiet(name, kind) { // fade every voice started under this name (not its Classic stand-in's other uses), and drop it if held
  kind = kind || S.set; const c = S.ctx, nm = kind + '|' + name;
  if (S.held && S.held.name === name && S.held.kind === kind) S.held = null; if (c) S.voices = S.voices.filter(v => v.nm !== nm || (fadeStop(c, v), false)); }
function stopAll() { const c = S.ctx; if (c) S.voices.forEach(v => fadeStop(c, v)); S.voices = []; S.held = null; S.lvlUntil = 0; }
function hide(force) { // hidden: voices fade and stop (a ring's later cycles too), the context sleeps; only a tap wakes it
  const c = S.ctx; if (!c || !S.bus) return; const t = c.currentTime; S.held = null; S.bus.master.gain.setTargetAtTime(0, t, .01); S.voices.forEach(v => fadeStop(c, v, t)); S.voices = [];
  const zz = () => { if (S.ctx === c && c.state === 'running') { S.ss++; c.suspend().catch(() => {}); } }; if (force) zz(); else setTimeout(() => { if (document.hidden) zz(); }, 60);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); else if (S.bus) S.bus.master.gain.setTargetAtTime(S.vol, S.ctx.currentTime, .02); });
addEventListener('pagehide', () => hide(1));

return { N, NEON, CUES, SIG, S, cfg, LEAD, OAC, db, todb, kq, filt, loud, play, quiet, boot, off, wake, setVol, prepare, bake, resolve, hold, stopAll };
})();
/* === end neon-sound === */

/* === ambience v1 === */
// Arcadia's background ambience: one quiet bed per place, shaped by the weather. All synthesised; nothing sampled or copied.
// It plays through the cue engine's master (volume and ceiling), keeps the engine awake while it plays, ducks 6 dB under
// every cue, and stops when the page is hidden or sound is turned off. Each place and weather is measured offline and
// set to one quiet level (LOW -42 LUFS, MEDIUM -36; rain +1, downpour +2.5), so switching never jumps.
const AmbSound = (() => {
const NS = NeonSound, SR = 48000, db = d => Math.pow(10, d / 20), todb = v => v > 0 ? 20 * Math.log10(v) : -200;
function rng(s) { let a = (s * 2654435761) >>> 0 || 1; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const G = (c, v) => { const g = c.createGain(); g.gain.value = v; return g; };
const F = (c, type, f, q) => { const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; };
const chain = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; };
function kq(type, f, q, g, sr) {
  const A = Math.pow(10, (g || 0) / 40), w = 2 * Math.PI * f / sr, cs = Math.cos(w), al = Math.sin(w) / (2 * q); let b0, b1, b2, a0, a1, a2;
  if (type === 'hs') { const s = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) + (A - 1) * cs + s); b1 = -2 * A * ((A - 1) + (A + 1) * cs); b2 = A * ((A + 1) + (A - 1) * cs - s); a0 = (A + 1) - (A - 1) * cs + s; a1 = 2 * ((A - 1) - (A + 1) * cs); a2 = (A + 1) - (A - 1) * cs - s; }
  else if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else { const h = type === 'hp'; b0 = h ? (1 + cs) / 2 : (1 - cs) / 2; b1 = h ? -(1 + cs) : 1 - cs; b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
function filt(x, k) { const [b0, b1, b2, a1, a2] = k, y = new Float64Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; }
const KW = [kq('hs', 1681.97, .7072, 4, SR), kq('hp', 38.135, .5003, 0, SR)];
function lufs(chs, t0) { const s = Math.round(t0 * SR); let sum = 0; for (const d of chs) { const y = filt(filt(d.subarray(s), KW[0]), KW[1]); let m = 0; for (let i = 0; i < y.length; i++) m += y[i] * y[i]; sum += m / y.length; } return sum > 0 ? -.691 + 10 * Math.log10(sum) : -200; }
const peakOf = chs => { let p = 0; for (const d of chs) for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > p) p = v; } return p; };

/* looping noise beds: white, pink and brown, stereo with uncorrelated sides, the loop seam crossfaded, all at one RMS */
const NB = {};
function noiseBuf(kind, seed = 1) {
  const key = kind + seed; if (NB[key]) return NB[key];
  const n = SR * 7, X = Math.round(SR * .3), buf = new AudioBuffer({ length: n, numberOfChannels: 2, sampleRate: SR });
  for (let ch = 0; ch < 2; ch++) {
    const r = rng(seed * 977 + ch * 131 + kind.charCodeAt(0)), raw = new Float32Array(n + X);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, br = 0;
    for (let i = 0; i < n + X; i++) {
      const w = r() * 2 - 1;
      if (kind === 'white') raw[i] = w;
      else if (kind === 'pink') { b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852; b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898; raw[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362; b6 = w * .115926; }
      else { br = (br + .02 * w) / 1.02; raw[i] = br; }
    }
    for (let i = 0; i < X; i++) { const a = i / X * Math.PI / 2; raw[i] = raw[i] * Math.sin(a) + raw[n + i] * Math.cos(a); }
    let ms = 0; for (let i = 0; i < n; i++) ms += raw[i] * raw[i]; const k = .25 / Math.sqrt(ms / n);
    const d = buf.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = raw[i] * k;
  }
  return NB[key] = buf;
}
/* grains: short one-shots, sixteen of each so nothing repeats in an obvious way */
const GB = {};
function grains(kind) {
  if (GB[kind]) return GB[kind];
  const out = [];
  for (let v = 0; v < 16; v++) {
    const r = rng(5000 + v * 37 + kind.length * 101); let parts;
    if (kind === 'drop') parts = [[.003 + .01 * r(), 2500 + 4500 * r(), 1.2 + 2 * r(), 1]];
    else if (kind === 'tick') parts = [[.0015 + .003 * r(), 4200 + 3800 * r(), 6 + 5 * r(), 1], [.001, 7000 + 3000 * r(), 3, .35]];
    else if (kind === 'drip') parts = [[.012 + .016 * r(), 700 + 1100 * r(), 2 + 2 * r(), 1]];
    else if (kind === 'crackle') parts = [[.0006 + .0018 * r(), 1800 + 3400 * r(), 1 + 2.5 * r(), 1], [.004 + .006 * r(), 3200 + 1800 * r(), 5, .25]];
    else parts = [[.012 + .02 * r(), 220 + 480 * r(), 1.6 + 2 * r(), 1], [.0012, 2600 + 1600 * r(), 1.2, .5]];
    const n = Math.ceil(Math.max(...parts.map(p => p[0])) * 7 * SR) + 64, x = new Float64Array(n);
    for (const [tau, f, q, g] of parts) { const e = new Float64Array(n); for (let i = 0; i < n; i++) e[i] = (r() * 2 - 1) * Math.exp(-i / (tau * SR)); const y = filt(e, kq('bp', f, q, 0, SR)); for (let i = 0; i < n; i++) x[i] += y[i] * g; }
    let p = 0; for (let i = 0; i < n; i++) p = Math.max(p, Math.abs(x[i]));
    const b = new AudioBuffer({ length: n, numberOfChannels: 1, sampleRate: SR }), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = x[i] / p * .5 * Math.min(1, (n - i) / 48);
    out.push(b);
  }
  return GB[kind] = out;
}
let IR = null;
function irBuf() {
  if (IR) return IR; const n = Math.round(SR * 2.6), b = new AudioBuffer({ length: n, numberOfChannels: 2, sampleRate: SR });
  for (let ch = 0; ch < 2; ch++) { const r = rng(77 + ch), d = b.getChannelData(ch); let lp = 0; for (let i = 0; i < n; i++) { const t = i / SR, a = .12 + .85 * Math.exp(-t * 2.2); lp += a * ((r() * 2 - 1) - lp); d[i] = lp * Math.exp(-t * 2.4) * .35; } }
  return IR = b;
}

/* ---- what each place sounds like, given the weather ----
   layer: { n: noise | tone: [hz], g: dB, hp, lp, bp: [f, q], gust: [r1, r2, depth], sweep: [rate, hz], am: [rate, depth], pan, cycle: [on s, off s] }
   stream: { ev: drop|tick|drip|crackle|pop|car, rate /s, g dB, jit dB, pan, lp, cluster, wet } */
const WX = { clear: { rain: 0, snow: 0, add: 0, wind: .25 }, rain: { rain: .5, snow: 0, add: 1, wind: .35 }, downpour: { rain: 1, snow: 0, add: 2.5, wind: .55 }, snow: { rain: 0, snow: 1, add: 0, wind: .75 } };
const PLACES = [
  ['city', 'City', 'Flying over the island: traffic far below, the city\'s murmur, air, a car going by. Rain, or a snow wind.'],
  ['apartment', 'Apartment', 'High up behind glass: the city below, a fridge that cycles, a car far down. Rain on the glass and its drops.'],
  ['shop', 'Shop', 'Street level, door open: the street, people far off, the air con, cars passing. Rain on the awning and drips off it.'],
  ['gym', 'Gym', 'Ventilation, a fan, the city muffled. Rain on the roof.'],
  ['chalet', 'Chalet', 'A fire: its roar, hiss, crackles and the odd knot popping. The mountain wind outside, a whistle in snow.'],
  ['castle', 'Castle', 'The study hall: a softer hearth in a stone room, wind at the glass. Rain on the stained glass.'],
];
function scene(place, w, wind) {
  const L = [], St = [], R = w.rain, S = w.snow, wet = R > 0, gust = 10 * Math.log10(.15 + wind);
  const fire = (k = 0) => { L.push({ n: 'brown', g: -9 + k, hp: 45, lp: 340, gust: [.63, 1.71, .35] }, { n: 'pink', g: -27 + k, bp: [2600, .7], gust: [.91, 2.3, .55] });
    St.push({ ev: 'crackle', rate: 5, g: -15 + k, jit: 7, pan: .35, cluster: .35, wet: place === 'castle' }, { ev: 'pop', rate: .22, g: -12 + k, jit: 5, pan: .3, wet: place === 'castle' }); };
  const windOut = (g, lp) => { L.push({ n: 'pink', g: g + gust, bp: [460, .8], lp, gust: [.051, .113, .8], sweep: [.037, 140] }); if (wind > .45 || S) L.push({ n: 'white', g: g - 13 + gust * 1.5, bp: [880, 13], gust: [.043, .097, .9], sweep: [.029, 160] }); };
  if (place === 'city') {
    L.push({ n: 'brown', g: S ? -12 : -6, hp: 70, lp: S ? 300 : 420, gust: [.041, .093, .25] }, { n: 'pink', g: S ? -22 : -17, bp: [700, .5], gust: [.053, .11, .3] }, { n: 'pink', g: -14 + gust, bp: [950, .7], gust: [.071, .131, .6], sweep: [.047, 300] });
    St.push({ ev: 'car', rate: S ? .1 : .22, g: -10, lp: 2400, pan: .9, hiss: wet });
    if (wet) L.push({ n: 'pink', g: -16 + R * 7, hp: 1500, lp: 8000, gust: [.06, .14, .25] });
    if (S) L.push({ n: 'white', g: -26 + gust * 1.5, bp: [1100, 14], gust: [.043, .097, .9], sweep: [.031, 220] });
  } else if (place === 'apartment') {
    L.push({ n: 'brown', g: -22, lp: 180 }, { n: 'brown', g: S ? -16 : -11, hp: 60, lp: 300, gust: [.031, .083, .3] }, { tone: [118, 236, 354.5], g: -31, lp: 600, cycle: [45, 30] });
    St.push({ ev: 'car', rate: .1, g: -20, lp: 600, pan: .6 });
    if (wet) { L.push({ n: 'pink', g: -17 + R * 6, bp: [2400, .6], lp: 4500, gust: [.07, .15, .3] }); St.push({ ev: 'tick', rate: 6 + R * 22, g: -21, jit: 6, pan: .8, lp: 7000 }); }
    if (S || wind > .5) windOut(-20, 900);
  } else if (place === 'shop') {
    L.push({ n: 'brown', g: S ? -12 : -8, hp: 80, lp: S ? 600 : 900, gust: [.05, .1, .3] }, { n: 'pink', g: -19, bp: [820, .6], gust: [.067, .17, .35] }, { n: 'pink', g: -21, hp: 120, lp: 650 }, { tone: [240, 241.3], g: -38, lp: 500 });
    St.push({ ev: 'car', rate: S ? .14 : .3, g: -12, lp: 2500, pan: 1, hiss: wet });
    if (wet) { L.push({ n: 'white', g: -15 + R * 6, bp: [3000, .5], gust: [.08, .17, .25] }); St.push({ ev: 'drip', rate: 1.5 + R * 4, g: -17, jit: 5, pan: .7 }); }
  } else if (place === 'gym') {
    L.push({ n: 'pink', g: -10, hp: 100, lp: 600 }, { n: 'pink', g: -22, bp: [420, 3], am: [5.5, .22] }, { tone: [180, 360], g: -36, lp: 450 }, { n: 'brown', g: -19, lp: 250, gust: [.04, .09, .3] });
    if (wet) { L.push({ n: 'pink', g: -16 + R * 6, hp: 200, lp: 1100, gust: [.06, .13, .25] }); St.push({ ev: 'drop', rate: 10 + R * 30, g: -25, jit: 6, pan: .9, lp: 2000 }); }
    if (S) windOut(-24, 700);
  } else if (place === 'chalet') {
    fire(); windOut(-21, 900);
    if (wet) L.push({ n: 'pink', g: -18 + R * 6, hp: 180, lp: 900, gust: [.06, .13, .25] });
  } else if (place === 'castle') {
    fire(-4); L.push({ n: 'brown', g: -24, lp: 160 }, { n: 'pink', g: -22 + gust, bp: [700, 1.2], gust: [.051, .117, .8], sweep: [.033, 150] });
    if (wind > .3 || S) L.push({ n: 'white', g: -31 + gust * 1.5, bp: [1000, 16], gust: [.043, .1, .9], sweep: [.027, 180] });
    if (wet) { L.push({ n: 'pink', g: -18 + R * 6, bp: [2200, .6], gust: [.07, .15, .3] }); St.push({ ev: 'tick', rate: 4 + R * 14, g: -22, jit: 6, pan: .8, wet: true }); }
  }
  return { L, St, room: place === 'castle' };
}
function buildScene(c, dest, place, w, wind, seed) {
  const def = scene(place, w, wind), out = G(c, 1), nodes = [], r = rng(seed || 1), t0 = c.currentTime;
  out.connect(dest);
  let verb = null; if (def.room) { verb = c.createConvolver(); verb.buffer = irBuf(); chain(verb, G(c, .5), out); }
  const lfo = (rate, amp, param) => { const o = c.createOscillator(); o.frequency.value = rate * (.9 + .2 * r()); chain(o, G(c, amp), param); o.start(t0 + r() * 2); nodes.push(o); };
  const cycles = [];
  def.L.forEach((L, i) => {
    let src;
    if (L.tone) { src = G(c, 1); L.tone.forEach(f => { const o = c.createOscillator(); o.frequency.value = f; o.connect(src); o.start(t0); nodes.push(o); }); }
    else { src = c.createBufferSource(); src.buffer = noiseBuf(L.n, 1 + (i * 7 + (seed || 0)) % 5); src.loop = true; src.start(t0, r() * 6.5); nodes.push(src); }
    let n = src;
    if (L.hp) n = chain(n, F(c, 'highpass', L.hp, .7));
    if (L.bp) { const b = F(c, 'bandpass', L.bp[0], L.bp[1]); n = chain(n, b); if (L.sweep) lfo(L.sweep[0], L.sweep[1], b.frequency); }
    if (L.lp) n = chain(n, F(c, 'lowpass', L.lp, .7));
    const base = db(L.g), g = G(c, L.cycle ? 0 : base);
    if (L.gust) { lfo(L.gust[0], base * L.gust[2] / 2, g.gain); lfo(L.gust[1], base * L.gust[2] / 2, g.gain); }
    if (L.am) lfo(L.am[0], base * L.am[1], g.gain);
    n = chain(n, g);
    if (L.pan) { const p = c.createStereoPanner(); p.pan.value = L.pan; n = chain(n, p); }
    n.connect(out);
    if (L.cycle) cycles.push({ g: g.gain, base, on: L.cycle[0], off: L.cycle[1], next: t0 + r() * L.cycle[1], up: false });
  });
  const streams = def.St.map(s => ({ ...s, next: t0 + r() * 1.5 }));
  const fire = (s, t) => {
    if (s.ev === 'car') return car(c, out, t, s, r);
    const set = grains(s.ev), src = c.createBufferSource(); src.buffer = set[Math.floor(r() * set.length)]; src.playbackRate.value = .85 + .35 * r();
    let n = chain(src, G(c, db(s.g - (s.jit || 0) * r())));
    if (s.lp) n = chain(n, F(c, 'lowpass', s.lp, .7));
    const p = c.createStereoPanner(); p.pan.value = (r() * 2 - 1) * (s.pan || 0); n = chain(n, p); n.connect(out);
    if (s.wet && verb) n.connect(verb);
    src.start(t);
  };
  function schedule(until) {
    for (const s of streams) while (s.next < until) { fire(s, s.next); s.next += s.cluster && r() < s.cluster ? .012 + .05 * r() : -Math.log(1 - r()) / s.rate; }
    for (const y of cycles) while (y.next < until) { y.up = !y.up; y.g.setTargetAtTime(y.up ? y.base : 0, y.next, 1.2); y.next += (y.up ? y.on : y.off) * (.8 + .4 * r()); }
  }
  return { out, schedule, stop(t) { nodes.forEach(n => { try { n.stop(t); } catch (e) {} }); setTimeout(() => { try { out.disconnect(); } catch (e) {} }, Math.max(0, (t - c.currentTime) * 1000) + 200); } };
}
function car(c, dest, t, s, r) {
  const dur = 4 + 5 * r(), dir = r() < .5 ? -1 : 1, src = c.createBufferSource(); src.buffer = noiseBuf('brown', 3); src.loop = true;
  const bp = F(c, 'bandpass', 280, .8), g = G(c, 0), p = c.createStereoPanner(), lp = F(c, 'lowpass', s.lp || 3000, .7), pk = db(s.g - 4 * r());
  bp.frequency.setValueAtTime(260, t); bp.frequency.linearRampToValueAtTime(520 + 200 * r(), t + dur * .48); bp.frequency.linearRampToValueAtTime(250, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk * .25, t + dur * .25); g.gain.linearRampToValueAtTime(pk, t + dur * .5); g.gain.linearRampToValueAtTime(pk * .2, t + dur * .78); g.gain.linearRampToValueAtTime(0, t + dur);
  p.pan.setValueAtTime(-.85 * dir * (s.pan || 1), t); p.pan.linearRampToValueAtTime(.85 * dir * (s.pan || 1), t + dur);
  chain(src, bp, g, p, lp, dest); src.start(t, r() * 6); src.stop(t + dur + .05);
  if (s.hiss) { const h = c.createBufferSource(); h.buffer = noiseBuf('white', 4); h.loop = true; const hg = G(c, 0);
    hg.gain.setValueAtTime(0, t); hg.gain.linearRampToValueAtTime(pk * .5, t + dur * .5); hg.gain.linearRampToValueAtTime(0, t + dur); chain(h, F(c, 'bandpass', 3400, .7), hg, p); h.start(t, r() * 6); h.stop(t + dur + .05); }
}

/* ---- levels ---- */
// CAL: each place, weather and wind (to 0.1) measured once by tools/amb-cal.html, so a phone never renders one to level it.
// A key not in the table is measured on first use. Re-run the tool after any change to scene() or the layers.
const LEVEL = { low: -42, medium: -36 }, CAL = {'city|clear|0':-15.87,'city|clear|1':-15.85,'city|clear|2':-15.82,'city|clear|3':-15.8,'city|clear|4':-15.78,'city|clear|5':-15.76,'city|clear|6':-15.73,'city|clear|7':-15.71,'city|clear|8':-15.69,'city|clear|9':-15.66,'city|clear|10':-15.64,'city|rain|0':-14.98,'city|rain|1':-14.96,'city|rain|2':-14.94,'city|rain|3':-14.93,'city|rain|4':-14.91,'city|rain|5':-14.89,'city|rain|6':-14.87,'city|rain|7':-14.85,'city|rain|8':-14.83,'city|rain|9':-14.81,'city|rain|10':-14.8,'city|downpour|0':-14.21,'city|downpour|1':-14.19,'city|downpour|2':-14.17,'city|downpour|3':-14.16,'city|downpour|4':-14.14,'city|downpour|5':-14.13,'city|downpour|6':-14.11,'city|downpour|7':-14.1,'city|downpour|8':-14.08,'city|downpour|9':-14.07,'city|downpour|10':-14.05,'city|snow|0':-21.47,'city|snow|1':-21.39,'city|snow|2':-21.3,'city|snow|3':-21.22,'city|snow|4':-21.14,'city|snow|5':-21.06,'city|snow|6':-20.98,'city|snow|7':-20.91,'city|snow|8':-20.83,'city|snow|9':-20.76,'city|snow|10':-20.69,'apartment|clear|0':-21.16,'apartment|clear|1':-21.16,'apartment|clear|2':-21.16,'apartment|clear|3':-21.16,'apartment|clear|4':-21.16,'apartment|clear|5':-21.16,'apartment|clear|6':-21.05,'apartment|clear|7':-21.04,'apartment|clear|8':-21.02,'apartment|clear|9':-21.01,'apartment|clear|10':-20.99,'apartment|rain|0':-20.26,'apartment|rain|1':-20.26,'apartment|rain|2':-20.26,'apartment|rain|3':-20.26,'apartment|rain|4':-20.26,'apartment|rain|5':-20.26,'apartment|rain|6':-20.15,'apartment|rain|7':-20.14,'apartment|rain|8':-20.12,'apartment|rain|9':-20.11,'apartment|rain|10':-20.09,'apartment|downpour|0':-19.52,'apartment|downpour|1':-19.52,'apartment|downpour|2':-19.52,'apartment|downpour|3':-19.52,'apartment|downpour|4':-19.52,'apartment|downpour|5':-19.52,'apartment|downpour|6':-19.42,'apartment|downpour|7':-19.41,'apartment|downpour|8':-19.39,'apartment|downpour|9':-19.38,'apartment|downpour|10':-19.37,'apartment|snow|0':-25.7,'apartment|snow|1':-25.65,'apartment|snow|2':-25.61,'apartment|snow|3':-25.56,'apartment|snow|4':-25.51,'apartment|snow|5':-25.47,'apartment|snow|6':-25.42,'apartment|snow|7':-25.38,'apartment|snow|8':-25.33,'apartment|snow|9':-25.29,'apartment|snow|10':-25.24,'shop|clear|0':-17.46,'shop|clear|1':-17.46,'shop|clear|2':-17.46,'shop|clear|3':-17.46,'shop|clear|4':-17.46,'shop|clear|5':-17.46,'shop|clear|6':-17.46,'shop|clear|7':-17.46,'shop|clear|8':-17.46,'shop|clear|9':-17.46,'shop|clear|10':-17.46,'shop|rain|0':-16.31,'shop|rain|1':-16.31,'shop|rain|2':-16.31,'shop|rain|3':-16.31,'shop|rain|4':-16.31,'shop|rain|5':-16.31,'shop|rain|6':-16.31,'shop|rain|7':-16.31,'shop|rain|8':-16.31,'shop|rain|9':-16.31,'shop|rain|10':-16.31,'shop|downpour|0':-15.5,'shop|downpour|1':-15.5,'shop|downpour|2':-15.5,'shop|downpour|3':-15.5,'shop|downpour|4':-15.5,'shop|downpour|5':-15.5,'shop|downpour|6':-15.5,'shop|downpour|7':-15.5,'shop|downpour|8':-15.5,'shop|downpour|9':-15.5,'shop|downpour|10':-15.5,'shop|snow|0':-21.18,'shop|snow|1':-21.18,'shop|snow|2':-21.18,'shop|snow|3':-21.18,'shop|snow|4':-21.18,'shop|snow|5':-21.18,'shop|snow|6':-21.18,'shop|snow|7':-21.18,'shop|snow|8':-21.18,'shop|snow|9':-21.18,'shop|snow|10':-21.18,'gym|clear|0':-22.89,'gym|clear|1':-22.89,'gym|clear|2':-22.89,'gym|clear|3':-22.89,'gym|clear|4':-22.89,'gym|clear|5':-22.89,'gym|clear|6':-22.89,'gym|clear|7':-22.89,'gym|clear|8':-22.89,'gym|clear|9':-22.89,'gym|clear|10':-22.89,'gym|rain|0':-21.33,'gym|rain|1':-21.33,'gym|rain|2':-21.33,'gym|rain|3':-21.33,'gym|rain|4':-21.33,'gym|rain|5':-21.33,'gym|rain|6':-21.33,'gym|rain|7':-21.33,'gym|rain|8':-21.33,'gym|rain|9':-21.33,'gym|rain|10':-21.33,'gym|downpour|0':-20.19,'gym|downpour|1':-20.19,'gym|downpour|2':-20.19,'gym|downpour|3':-20.19,'gym|downpour|4':-20.19,'gym|downpour|5':-20.19,'gym|downpour|6':-20.19,'gym|downpour|7':-20.19,'gym|downpour|8':-20.19,'gym|downpour|9':-20.19,'gym|downpour|10':-20.19,'gym|snow|0':-22.88,'gym|snow|1':-22.87,'gym|snow|2':-22.86,'gym|snow|3':-22.85,'gym|snow|4':-22.84,'gym|snow|5':-22.83,'gym|snow|6':-22.82,'gym|snow|7':-22.81,'gym|snow|8':-22.8,'gym|snow|9':-22.79,'gym|snow|10':-22.78,'chalet|clear|0':-20.06,'chalet|clear|1':-20.05,'chalet|clear|2':-20.04,'chalet|clear|3':-20.03,'chalet|clear|4':-20.02,'chalet|clear|5':-20.01,'chalet|clear|6':-19.99,'chalet|clear|7':-19.98,'chalet|clear|8':-19.97,'chalet|clear|9':-19.96,'chalet|clear|10':-19.95,'chalet|rain|0':-19.53,'chalet|rain|1':-19.52,'chalet|rain|2':-19.51,'chalet|rain|3':-19.5,'chalet|rain|4':-19.49,'chalet|rain|5':-19.48,'chalet|rain|6':-19.47,'chalet|rain|7':-19.46,'chalet|rain|8':-19.45,'chalet|rain|9':-19.44,'chalet|rain|10':-19.43,'chalet|downpour|0':-19.05,'chalet|downpour|1':-19.05,'chalet|downpour|2':-19.04,'chalet|downpour|3':-19.03,'chalet|downpour|4':-19.02,'chalet|downpour|5':-19.01,'chalet|downpour|6':-19,'chalet|downpour|7':-18.99,'chalet|downpour|8':-18.98,'chalet|downpour|9':-18.97,'chalet|downpour|10':-18.96,'chalet|snow|0':-20.06,'chalet|snow|1':-20.05,'chalet|snow|2':-20.04,'chalet|snow|3':-20.03,'chalet|snow|4':-20.02,'chalet|snow|5':-20.01,'chalet|snow|6':-19.99,'chalet|snow|7':-19.98,'chalet|snow|8':-19.97,'chalet|snow|9':-19.96,'chalet|snow|10':-19.95,'castle|clear|0':-23.84,'castle|clear|1':-23.83,'castle|clear|2':-23.81,'castle|clear|3':-23.8,'castle|clear|4':-23.78,'castle|clear|5':-23.76,'castle|clear|6':-23.75,'castle|clear|7':-23.73,'castle|clear|8':-23.71,'castle|clear|9':-23.7,'castle|clear|10':-23.68,'castle|rain|0':-22.64,'castle|rain|1':-22.63,'castle|rain|2':-22.62,'castle|rain|3':-22.6,'castle|rain|4':-22.56,'castle|rain|5':-22.55,'castle|rain|6':-22.54,'castle|rain|7':-22.53,'castle|rain|8':-22.52,'castle|rain|9':-22.5,'castle|rain|10':-22.49,'castle|downpour|0':-21.7,'castle|downpour|1':-21.69,'castle|downpour|2':-21.68,'castle|downpour|3':-21.67,'castle|downpour|4':-21.62,'castle|downpour|5':-21.61,'castle|downpour|6':-21.61,'castle|downpour|7':-21.6,'castle|downpour|8':-21.59,'castle|downpour|9':-21.58,'castle|downpour|10':-21.57,'castle|snow|0':-23.84,'castle|snow|1':-23.83,'castle|snow|2':-23.81,'castle|snow|3':-23.79,'castle|snow|4':-23.78,'castle|snow|5':-23.76,'castle|snow|6':-23.75,'castle|snow|7':-23.73,'castle|snow|8':-23.71,'castle|snow|9':-23.7,'castle|snow|10':-23.68};
const keyOf = (p, wx, wind) => `${p}|${wx}|${Math.round(wind * 10)}`;
async function measure(place, wx, wind, gain = 1) {
  const secs = 10, oc = new OfflineAudioContext(2, SR * secs, SR), g = G(oc, gain); g.connect(oc.destination);
  buildScene(oc, g, place, WX[wx], wind, 11).schedule(secs);
  const t = performance.now(), rb = await oc.startRendering(), ms = performance.now() - t, chs = [rb.getChannelData(0), rb.getChannelData(1)];
  return { lufs: lufs(chs, 2), peak: todb(peakOf(chs.map(d => d.subarray(2 * SR)))), ms };
}
async function calib(place, wx, wind) { const k = keyOf(place, wx, wind); if (!(k in CAL)) CAL[k] = (await measure(place, wx, wind)).lufs; return CAL[k]; }

/* ---- playback, on the cue engine's context ---- */
const A = { place: null, wx: 'rain', wind: WX.rain.wind, level: 'low', ctx: null, bus: null, duck: null, cur: null, timer: 0, gen: 0, seen: 0, onchange: null };
const gainFor = m => db(LEVEL[A.level] + WX[A.wx].add - m);
function ensureBus(c) {
  if (A.ctx === c && A.bus) return; A.ctx = c; A.duck = G(c, 1); A.bus = G(c, 0); chain(A.bus, A.duck, NS.S.bus.master);
}
async function start(place, fade = 2.5) {
  const c = NS.S.ctx; if (!c || !NS.S.bus) return false; ensureBus(c);
  const gen = ++A.gen; A.place = place; NS.hold('ambience', true); if (A.onchange) A.onchange();
  const m = await calib(place, A.wx, A.wind); if (gen !== A.gen || NS.S.ctx !== c) return false;
  for (let i = 0; i < 40 && c.state !== 'running'; i++) await new Promise(r => setTimeout(r, 25));
  if (gen !== A.gen || NS.S.ctx !== c) return false;
  const t = c.currentTime + .05, sc = buildScene(c, A.bus, place, WX[A.wx], A.wind, 1 + Math.floor(Math.random() * 1000)); sc.m = m;
  sc.out.gain.setValueAtTime(0, t); sc.out.gain.linearRampToValueAtTime(gainFor(m), t + fade);
  const old = A.cur; A.cur = sc;
  if (old) { old.out.gain.cancelScheduledValues(t); old.out.gain.setValueAtTime(old.out.gain.value, t); old.out.gain.linearRampToValueAtTime(0, t + fade); old.stop(t + fade + .1); }
  A.bus.gain.cancelScheduledValues(t); A.bus.gain.setValueAtTime(A.bus.gain.value, t); A.bus.gain.linearRampToValueAtTime(1, t + (old ? .1 : 4));
  A.seen = NS.S.started || 0; clearInterval(A.timer);
  A.timer = setInterval(() => {
    if (NS.S.ctx !== c || c.state === 'closed') return stop(0);
    if (A.cur) A.cur.schedule(c.currentTime + .5);
    const n = NS.S.started || 0; if (n !== A.seen) { A.seen = n; duck(c); }   // a cue started: dip under it
  }, 60);
  A.cur.schedule(c.currentTime + .5); if (A.onchange) A.onchange(); return true;
}
function duck(c) { const d = A.duck.gain, t = c.currentTime; d.cancelScheduledValues(t); d.setValueAtTime(d.value, t); d.linearRampToValueAtTime(db(-6), t + .05); d.setValueAtTime(db(-6), t + .5); d.linearRampToValueAtTime(1, t + 1.3); }
function stop(fade = 1.2) {
  A.gen++; const c = A.ctx, cur = A.cur; A.cur = null; A.place = null; clearInterval(A.timer); A.timer = 0; NS.hold('ambience', false);
  if (c && cur && c.state !== 'closed') { const t = c.currentTime; A.bus.gain.cancelScheduledValues(t); A.bus.gain.setValueAtTime(A.bus.gain.value, t); A.bus.gain.linearRampToValueAtTime(0, t + fade); cur.stop(t + fade + .1); }
  if (!c || c.state === 'closed' || NS.S.ctx !== c) { A.ctx = null; A.bus = null; }
  if (A.onchange) A.onchange();
}
function setLevel(l) { A.level = l; const c = A.ctx; if (c && A.cur) { const t = c.currentTime, g = A.cur.out.gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(gainFor(A.cur.m), t + 1); } }
function setWeather(wx, wind) { A.wx = wx; A.wind = wind ?? WX[wx].wind; if (A.place) start(A.place, 2); }
document.addEventListener('visibilitychange', () => { if (document.hidden && A.place) stop(.2); });
addEventListener('pagehide', () => { if (A.place) stop(0); });

/* ---- self-test: every place and weather, measured raw, then at its set gain ---- */
async function selftest() {
  const rows = []; let ok = true;
  for (const [p] of PLACES) for (const wx of Object.keys(WX)) {
    const w = WX[wx].wind, m = await measure(p, wx, w), want = LEVEL.medium + WX[wx].add, again = await measure(p, wx, w, db(want - m.lufs));
    const pass = isFinite(m.lufs) && Math.abs(again.lufs - want) < 1 && again.peak < -18 && m.ms < 4000; ok = ok && pass;
    rows.push({ p, wx, raw: Math.round(m.lufs * 10) / 10, set: Math.round(again.lufs * 10) / 10, want, peak: Math.round(again.peak * 10) / 10, ms: Math.round(m.ms), pass });
  }
  return { ok, rows };
}
return { PLACES, WX, LEVEL, A, CAL, keyOf, start, stop, setLevel, setWeather, calib, measure, selftest };
})();
/* === end ambience === */

/* === own ring === */
// His own sound for the ring: any audio or video file he picks in System. The bytes stay in this browser (IndexedDB
// 'arcadia_own'), outside sync and backups, and are never uploaded; the app ships no such sound. Decoded only to play,
// set to -26 (K-weighted, 100 ms max) with a -14 dBFS peak cap and 10 ms edge fades, played once through on the cue bus,
// then freed. Pickup, a hidden page and Sound off stop it.
const OwnRing = (() => {
const NS = NeonSound, O = { has: false, name: '', secs: 0, kept: true, src: null };
let mem = null; // storage blocked: the file lasts until the page reloads
const open = () => new Promise((res, rej) => { const q = indexedDB.open('arcadia_own', 1); q.onupgradeneeded = () => q.result.createObjectStore('f'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
async function store(fn, mode) {
  try { const db = await open(); const out = await new Promise((res, rej) => { const t = db.transaction('f', mode), r = fn(t.objectStore('f')); t.oncomplete = () => res(r.result); t.onerror = t.onabort = () => rej(t.error); }); db.close(); return { ok: true, v: out }; }
  catch (e) { return { ok: false }; }
}
async function decode(bytes, sr) {
  const a = await new NS.OAC(2, 1, sr).decodeAudioData(bytes.slice(0)), chs = [...Array(a.numberOfChannels)].map((_, i) => a.getChannelData(i).slice());
  let pk = 0; chs.forEach(d => { for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i])); }); if (!pk) throw new Error('silent');
  let k = NS.db(-26 - NS.loud(chs, sr, .1)); k = Math.min(k, NS.db(-14) / pk); const f = Math.round(.01 * sr);
  chs.forEach(d => { for (let i = 0; i < d.length; i++) d[i] *= k * Math.min(1, i / f, (d.length - 1 - i) / f); });
  const b = new AudioBuffer({ length: chs[0].length, numberOfChannels: chs.length, sampleRate: sr }); chs.forEach((d, i) => b.copyToChannel(d, i)); return b;
}
const note = v => { O.has = !!v; O.name = v ? v.name : ''; O.secs = v ? v.secs || 0 : 0; };
async function get() { if (mem) return mem; const r = await store(st => st.get('ring'), 'readonly'); return r.ok && r.v ? r.v : null; }
async function load() { const v = await get(); note(v); return v; }
// a file he picked: read and checked here, then kept. { ok, kept } or { ok: false } when it holds no sound this browser can play
async function pick(file) {
  try {
    const bytes = await file.arrayBuffer(), b = await decode(bytes, 44100), rec = { name: String(file.name || 'Sound').slice(0, 80), bytes, secs: Math.round(b.duration * 10) / 10 };
    const r = await store(st => st.put(rec, 'ring'), 'readwrite'); mem = r.ok ? null : rec; O.kept = r.ok; note(rec); return { ok: true, kept: r.ok };
  } catch (e) { return { ok: false }; }
}
async function clear() { stop(); mem = null; await store(st => st.delete('ring'), 'readwrite'); note(null); }
async function play() {
  const c = NS.S.ctx; if (!c || c.state !== 'running' || !NS.S.bus || document.hidden) return false;
  const v = await get(); if (!v) return false; let b; try { b = await decode(v.bytes, c.sampleRate); } catch (e) { return false; }
  if (NS.S.ctx !== c || c.state !== 'running' || document.hidden) return false;
  stop(); const s = c.createBufferSource(); s.buffer = b; s.connect(NS.S.bus.ui);
  s.onended = () => { if (O.src === s) { O.src = null; NS.hold('own', false); } try { s.disconnect(); } catch (e) {} };
  NS.hold('own', true); s.start(); O.src = s; NS.S.started++; return true;
}
function stop() { const s = O.src; O.src = null; NS.hold('own', false); if (s) { try { s.onended = null; s.stop(); s.disconnect(); } catch (e) {} } }
const playing = () => !!O.src;
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
addEventListener('pagehide', stop);
return { O, load, pick, clear, play, stop, playing };
})();
/* === end own ring === */

// top-level consts in a classic script are not window properties; the app reads these through window
Object.assign(window, { NeonSound, AmbSound, OwnRing });
