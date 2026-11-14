// Mira's voice clips from ElevenLabs (docs/MIRA.md, phase V). Run it yourself; the key is typed at a hidden prompt and
// never saved. Only each line's fixed words (`say` in mira.js) are sent, never his data. Clips land in models/voice/
// (gitignored, never committed); putting them online is a separate step.
//   node tools/mira-voice.mjs list                 the voices in My Voices (add one from the Voice Library first)
//   node tools/mira-voice.mjs sample <voice_id>    six lines to listen to first (a few hundred credits)
//   node tools/mira-voice.mjs all <voice_id>       every line; ones already made with this voice and text are skipped
// Options: --model eleven_multilingual_v2 (default) | eleven_v3;  --lang ja  speak the Japanese (Mira.JA), English subtitles
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'models', 'voice');
const API = 'https://api.elevenlabs.io/v1';
const [mode, voice] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const opt = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
const MODEL = opt('model') || 'eleven_multilingual_v2', LANG = opt('lang') || 'en';

/* her lines, straight from mira.js */
const sandbox = { window: {}, Math };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'mira.js'), 'utf8'), sandbox);
const L = sandbox.window.Mira.L;
const JA = sandbox.window.Mira.JA || {};
/* --lang ja: she speaks the Japanese (Mira.JA), the English stays on screen as the subtitle */
const every = Object.entries(L).flatMap(([id, v]) => v.map((say, k) => ({ id: `${id}.${k + 1}`, say: LANG === 'ja' ? JA[`${id}.${k + 1}`] : say })));
const all = every.filter(x => x.say);
if (all.length < every.length) console.log(`${every.length - all.length} line(s) have no ${LANG} version yet and are skipped.`);

/* the key: typed at a prompt that doesn't show it */
function askHidden(q) {
  return new Promise(res => {
    const out = process.stdout, inp = process.stdin; out.write(q); let s = '';
    if (!inp.isTTY) { inp.once('data', d => res(String(d).trim())); return; }
    inp.setRawMode(true); inp.resume(); inp.setEncoding('utf8');
    /* a paste may arrive wrapped in bracketed-paste markers, or as a bare Ctrl+V the terminal didn't turn into text:
       then the key comes straight from the Windows clipboard. One * per character, so he can see it went in */
    const add = t => { t = t.replace(/\u001b\[20[01]~/g, '').replace(/[\u0000-\u001f\u007f\s]/g, ''); s += t; out.write('*'.repeat(t.length)); };
    const on = ch => {
      ch = ch.replace(/\u001b\[20[01]~/g, '');
      for (const c of ch) {
        if (c === '\r' || c === '\n') { inp.setRawMode(false); inp.pause(); inp.off('data', on); out.write('\n'); return res(s.trim()); }
        if (c === '\u0003') { out.write('\n'); process.exit(1); }
        if (c === '\u0016') { try { add(execSync('powershell -NoProfile -Command Get-Clipboard', { encoding: 'utf8' })); } catch { } continue; }
        if (c === '\u007f' || c === '\b') { if (s) { s = s.slice(0, -1); out.write('\b \b'); } } else add(c);
      }
    };
    inp.on('data', on);
  });
}
const ask = q => new Promise(res => { process.stdout.write(q); process.stdin.resume(); process.stdin.setEncoding('utf8'); process.stdin.once('data', d => { process.stdin.pause(); res(String(d).trim()); }); });

/* kvfile: every clip for one language in one file for a single upload (needs his go, it goes online):
   npx wrangler kv bulk put --binding SYNC --remote models/voice/kv-ja.json */
if (mode === 'kvfile') {
  const dir = path.join(OUT, LANG === 'en' ? '' : LANG), files = fs.readdirSync(dir).filter(f => f.endsWith('.mp3'));
  const rows = files.map(f => ({ key: `voice:${LANG}/${f}`, value: fs.readFileSync(path.join(dir, f)).toString('base64'), base64: true }));
  const to = path.join(OUT, `kv-${LANG}.json`); fs.writeFileSync(to, JSON.stringify(rows));
  console.log(`${rows.length} clips, ${(fs.statSync(to).size / 1e6).toFixed(2)} MB -> ${to}`); process.exit(0);
}
if (!['list', 'sample', 'all'].includes(mode) || (mode !== 'list' && !voice)) {
  console.log('Use: node tools/mira-voice.mjs list | sample <voice_id> | all <voice_id>  [--model eleven_v3]'); process.exit(1);
}
/* remembered on this laptop only if he says so: a file in his user folder, outside the repo */
const KEYFILE = path.join(process.env.USERPROFILE || process.env.HOME || '.', '.mira-voice-key');
const kept = fs.existsSync(KEYFILE) ? fs.readFileSync(KEYFILE, 'utf8').trim() : '';
const key = process.env.ELEVENLABS_API_KEY || kept || await askHidden('ElevenLabs API key (hidden): ');
if (!key) { console.log('No key.'); process.exit(1); }
if (!key.startsWith('sk_')) { console.log("That isn't the key itself (it should start with sk_). ElevenLabs shows the key once, when it's made: make a new one and copy that. Nothing was spent."); process.exit(1); }
if (!kept && !process.env.ELEVENLABS_API_KEY && (await ask('Remember this key on this laptop so you never paste it again? (y/n) ')).toLowerCase() === 'y') { fs.writeFileSync(KEYFILE, key); console.log(`Kept in ${KEYFILE} (delete that file to forget it).`); }
const H = { 'xi-api-key': key };

if (mode === 'list') {
  const r = await fetch(`${API}/voices`, { headers: H }); if (!r.ok) { console.log('ElevenLabs said', r.status, await r.text()); process.exit(1); }
  const { voices } = await r.json();
  for (const v of voices) console.log(`${v.voice_id}  ${v.name}  (${v.category || ''})`);
  console.log(`\n${voices.length} voices. Copy the id of the one you want into: node tools/mira-voice.mjs sample <id>`);
  process.exit(0);
}

const PICK = ['greet.morning.1', 'greet.evening.2', 'brief.sess.3', 'brief.tasks.clear.1', 'checkin.sess.1', 'checkin.good.2'];
const list = mode === 'sample' ? all.filter(x => PICK.includes(x.id)) : all;
const dir = path.join(OUT, LANG === 'en' ? '' : LANG, mode === 'sample' ? 'sample' : '');
fs.mkdirSync(dir, { recursive: true });
const manPath = path.join(dir, 'manifest.json');
const man = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : { lines: {} };
const todo = list.filter(x => { const m = man.lines[x.id]; return !(m && m.say === x.say && m.voice === voice && m.model === MODEL && fs.existsSync(path.join(dir, x.id + '.mp3'))); });
const chars = todo.reduce((a, x) => a + x.say.length, 0);
console.log(`${todo.length} clip(s) to make (${list.length - todo.length} already done), about ${chars} characters = about ${chars} credits on ${MODEL}.`);
if (!todo.length) process.exit(0);
if ((await ask('Go ahead? (y/n) ')).toLowerCase() !== 'y') { console.log('Stopped. Nothing spent.'); process.exit(0); }

let made = 0;
for (const x of todo) {
  const r = await fetch(`${API}/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_64`, {
    method: 'POST', headers: { ...H, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({ text: x.say, model_id: MODEL, voice_settings: { stability: .45, similarity_boost: .8, style: .3, use_speaker_boost: true } }),
  });
  if (!r.ok) { console.log(`\n${x.id}: ElevenLabs said ${r.status} ${(await r.text()).slice(0, 300)}`); break; }
  fs.writeFileSync(path.join(dir, x.id + '.mp3'), Buffer.from(await r.arrayBuffer()));
  man.lines[x.id] = { say: x.say, voice, model: MODEL };
  fs.writeFileSync(manPath, JSON.stringify(man, null, 1));
  made++; process.stdout.write(`\r${made}/${todo.length}  ${x.id}                    `);
}
console.log(made === todo.length ? `\nDone: ${made} clip(s) in ${dir}` : `\nStopped after ${made} of ${todo.length} clip(s). The ones made are in ${dir}.`);
