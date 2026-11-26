// AI bench: runs scripted fights (a simple bot player vs the AI in each style) in headless Edge and prints how the AI behaves.
// usage: node tools/ai_bench.js [--url=http://127.0.0.1:8100/index.html] [--secs=20] [--runs=2] [--diff=Normal] [--styles=zoner,rusher] [--seed=1] [--json=out.json]
// needs a static server for the game folder, e.g. `python -m http.server 8100` in the project root.
const fs = require('fs'), cp = require('child_process'), os = require('os');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const URL = arg('url', 'http://127.0.0.1:8100/index.html'), SECS = +arg('secs', 20), RUNS = +arg('runs', 2), DIFF = arg('diff', 'Normal'), SEED = +arg('seed', 1);
const STYLES = arg('styles', 'rusher,zoner,trapper,counter,turtle,trickster,berserker,sniper').split(',');
const PORT = 9445, EDGE = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(fs.existsSync);
if (!EDGE) { console.log('msedge not found'); process.exit(1); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// runs inside the game page: one fight, returns the metrics
const PAGE = `(async (a, b, sty, secs, diff) => {
  selDiff = diff; bestOf = 1; selYou = a; selRival = b; startMatch();
  const smp = [], t0 = performance.now(); let setSty = false, lastAct = null; const acts = { melee: 0, ranged: 0, sp: 0, beam: 0, dash: 0 };
  await new Promise(res => {
    const iv = setInterval(() => {
      const t = (performance.now() - t0) / 1000;
      if (state === 'intro' && vsWait) vsStart();
      if (!setSty && E) { VAR.S.fixedStyle = sty; VAR.S.style = VAR.S.style || {}; VAR.S.style[E.side] = sty; setSty = true; }
      if (state === 'fight') {
        const d = Math.abs(E.x - P.x), toward = E.x > P.x ? 'd' : 'a', away = toward === 'd' ? 'a' : 'd';
        keys.a = keys.d = keys.s = false;
        if (d > 260) keys[toward] = true; else if (d < 110 && Math.random() < .3) keys[away] = true;
        if (d < 150 && Math.random() < .5) pulse.melee = true; else if (d > 180 && d < 500 && Math.random() < .25) pulse.ranged = true;
        if (Math.random() < .04) keys.s = true;
        if (E.act && E.act !== lastAct) { lastAct = E.act; const n = E.act.name; if (n in acts) acts[n]++; }
        smp.push({ d, m: E.ai.mode, room: E.x < P.x ? E.x - WALL_L : WALL_R - E.x, eh: E.hp / E.maxhp, ph: P.hp / P.maxhp });
      }
      if (t > secs || state === 'over') { clearInterval(iv); res(); }
    }, 100);
  });
  keys.a = keys.d = keys.s = false;
  const pref = VAR.STYLES[sty].pref, n = smp.length || 1, avg = k => smp.reduce((s, x) => s + x[k], 0) / n;
  const f = pred => smp.filter(pred).length / n;
  return { n: smp.length, dist: Math.round(avg('d')), inBand: f(x => x.d >= pref[0] && x.d <= pref[1]), tooFar: f(x => x.d > pref[1] + 150), retreat: f(x => x.m === 'retreat'), corner: f(x => x.room < 260),
    aiLost: smp.length ? 1 - smp[smp.length - 1].eh : 0, botLost: smp.length ? 1 - smp[smp.length - 1].ph : 0, acts, over: state === 'over' };
})`;

(async () => {
  const proc = cp.spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + os.tmpdir() + '\\pf_bench_prof', '--window-size=1280,720', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
  let pg; for (let i = 0; i < 40 && !pg; i++) { await sleep(500); try { pg = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(p => p.type === 'page'); } catch (e) { } }
  const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}; ws.onmessage = m => { const r = JSON.parse(m.data); if (pend[r.id]) { pend[r.id](r); delete pend[r.id]; } if (r.method === 'Runtime.exceptionThrown') console.log('PAGE ERROR', r.params.exceptionDetails.exception && r.params.exceptionDetails.exception.description); };
  const send = (method, params) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails.exception || r.result.exceptionDetails)); return r.result.result.value; };
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true }); await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: URL });
  for (let i = 0; i < 60; i++) { await sleep(1000); try { if (await ev("typeof startMatch === 'function' && typeof VAR === 'object' && document.readyState === 'complete'")) break; } catch (e) { } }
  await ev("(()=>{for (const b of document.querySelectorAll('button')) if (b.textContent.trim()==='SKIP') b.click(); return 1})()");
  const rnd = mulberry(SEED), rows = [];
  for (const sty of STYLES) {
    const res = [];
    for (let r = 0; r < RUNS; r++) { const a = 1 + Math.floor(rnd() * 386), b = 1 + Math.floor(rnd() * 386); res.push(await ev(`${PAGE}(${a},${b},${JSON.stringify(sty)},${SECS},${JSON.stringify(DIFF)})`)); }
    const m = k => res.reduce((s, x) => s + x[k], 0) / res.length, act = k => res.reduce((s, x) => s + x.acts[k], 0) / res.length;
    rows.push({ style: sty, fightSecs: +(m('n') / 10).toFixed(1), avgDist: Math.round(m('dist')), inBand: +(m('inBand') * 100).toFixed(0), tooFar: +(m('tooFar') * 100).toFixed(0), retreat: +(m('retreat') * 100).toFixed(0), corner: +(m('corner') * 100).toFixed(0), aiDmg: +(m('botLost') * 100).toFixed(0), botDmg: +(m('aiLost') * 100).toFixed(0), melee: +act('melee').toFixed(1), shots: +act('ranged').toFixed(1), specials: +act('sp').toFixed(1), ults: +act('beam').toFixed(1) });
  }
  console.log(`AI bench: ${DIFF}, ${RUNS} fight(s) per style, up to ${SECS}s each (percentages are of fight time; aiDmg/botDmg = % of health taken)`);
  console.table(rows);
  if (arg('json', '')) fs.writeFileSync(arg('json', ''), JSON.stringify(rows, null, 1));
  ws.close(); proc.kill(); process.exit(0);
})().catch(e => { console.log('ERR', e.message); process.exit(1); });

