'use strict';
// ---------------------------------------------------------------- timed arena events (zero gravity, brawl time, lane shuffle, overdrive, blackout, low gravity) and the event banners
(() => {
  const V = VAR, S = V.S;
  const EV = {
    zerog: { n: 'ZERO GRAVITY', s: 'Everyone floats', ic: 'atom', c: '#a68bff', dur: 8 },
    brawl: { n: 'BRAWL TIME', s: 'Melee, jump and dash only', ic: 'boxing-glove', c: '#ff8a4a', dur: 10 },
    lanes: { n: 'LANE SHUFFLE', s: 'The lanes keep moving', ic: 'swap-vertical', c: '#4ad0ff', dur: 6 },
    overdrive: { n: 'OVERDRIVE', s: 'Ki floods in, no melee', ic: 'flash', c: '#ffe54a', dur: 8 },
    blackout: { n: 'BLACKOUT', s: 'Lights out', ic: 'weather-night', c: '#93a1d8', dur: 6 },
    lowgrav: { n: 'LOW GRAVITY', s: 'Jumps float higher', ic: 'rocket-launch', c: '#7dd8ff', dur: 5 },
    typestorm: { n: 'TYPE STORM', s: 'One type hits harder', ic: 'weather-lightning', c: '#ffb347', dur: 9 },
    glass: { n: 'GLASS HOUR', s: 'Everyone deals 50% more damage', ic: 'diamond-stone', c: '#ff7a7a', dur: 8 },
    frenzy: { n: 'COOLDOWN FRENZY', s: 'Cooldowns recover 3x as fast', ic: 'lightning-bolt', c: '#ffd34d', dur: 8 },
    mud: { n: 'MUD FLATS', s: 'Everyone moves slower', ic: 'terrain', c: '#b58a5a', dur: 8 },
    underdog: { n: 'UNDERDOG BOOST', s: 'Less health, more damage', ic: 'heart-flash', c: '#7dff9a', dur: 9 },
    exhaust: { n: 'EXHAUSTION', s: 'Stamina barely recovers', ic: 'sleep', c: '#9aa7ff', dur: 8 },
    showdown: { n: 'SPECIALS SHOWDOWN', s: 'No melee, specials hit harder', ic: 'creation', c: '#c58bff', dur: 8 },
    springs: { n: 'HEALING SPRINGS', s: 'Stand in the glow to heal', ic: 'heart-plus', c: '#5affc0', dur: 10 },
  };
  const BN = {
    rock: { n: 'ROCK SLIDE', s: 'Stay out of the red rings', ic: 'landslide', c: '#e0a560' }, bolt: { n: 'LIGHTNING STRIKE', s: 'Bolts are coming down', ic: 'weather-lightning', c: '#ffe54a' },
    hazard: { n: 'HAZARD WAVE', s: 'Three strikes incoming', ic: 'flash-alert', c: '#ff6a4a' }, crowd: { n: 'THE CROWD ROARS', s: 'Both fighters get a boost', ic: 'volume-high', c: '#ffd34d' },
  };
  const KEYS = Object.keys(EV), T = { next: 24, last: '', hist: [], ln: 0, sec: -1, bt: 0, br: [0, 0] };

  const style = document.createElement('style');
  style.textContent = '#evBanner{position:absolute;left:50%;top:148px;transform:translate(-50%,-14px) scale(.92);opacity:0;display:flex;align-items:center;gap:12px;padding:6px 22px 6px 8px;border-radius:40px;background:linear-gradient(90deg,rgba(6,10,28,.94),rgba(22,30,66,.9));border:2px solid var(--c);box-shadow:0 0 26px color-mix(in srgb,var(--c) 55%,transparent),0 6px 16px rgba(0,0,0,.5);pointer-events:none;z-index:30;transition:opacity .25s,transform .35s cubic-bezier(.2,1.5,.4,1);white-space:nowrap}'
    + '#evBanner.on{opacity:1;transform:translate(-50%,0) scale(1)}#evBanner .ei{width:36px;height:36px;border-radius:50%;background:var(--c);display:grid;place-items:center;box-shadow:inset 0 0 0 3px rgba(255,255,255,.35)}#evBanner .ei .sv{width:22px;height:22px;fill:#0a1028}'
    + '#evBanner b{display:block;font:900 19px system-ui,sans-serif;letter-spacing:2px;color:#fff;text-shadow:0 0 14px var(--c),0 2px 0 rgba(0,0,0,.6);font-style:italic}#evBanner small{display:block;font:700 12px system-ui,sans-serif;letter-spacing:1px;color:#d6e2ff;margin-top:1px}'
    + '#evChip{position:relative;display:none;align-items:center;gap:7px;height:26px;padding:0 12px 0 6px;border-radius:14px;background:rgba(6,10,28,.78);border:1px solid var(--c);color:#fff;font:800 11px system-ui,sans-serif;letter-spacing:1px;pointer-events:none;z-index:29;white-space:nowrap;overflow:hidden}#evChip.on{display:flex}#evChip .sv{width:16px;height:16px;fill:var(--c)}#evChip i{position:absolute;left:0;bottom:0;height:3px;background:var(--c)}'
    + '#hudRow{position:absolute;left:50%;top:108px;transform:translateX(-50%);display:flex;gap:6px;align-items:center;justify-content:center;white-space:nowrap;pointer-events:none}#wx{display:none!important}'
    + '#blackout{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;display:none}.btn.evlock{opacity:.22;filter:grayscale(1)}'
    + '#evEdge{position:absolute;inset:0;pointer-events:none;opacity:0;box-shadow:inset 0 0 70px 6px var(--c,#fff),inset 0 0 14px 2px var(--c,#fff)}#evEdge.on{animation:evEdge 1.6s ease-in-out infinite}@keyframes evEdge{0%,100%{opacity:.3}50%{opacity:.9}}';
  document.head.appendChild(style);
  const stage = document.getElementById('stage'), tint = document.getElementById('tint');
  const ban = document.createElement('div'), chip = document.createElement('div'), blk = document.createElement('canvas');
  ban.id = 'evBanner'; chip.id = 'evChip'; blk.id = 'blackout'; blk.width = W; blk.height = H;
  if (tint) { tint.insertAdjacentElement('afterend', blk); } else stage.appendChild(blk);
  stage.appendChild(ban);
  { const row = document.createElement('div'); row.id = 'hudRow'; const hud = document.getElementById('hud') || stage; row.appendChild(chip); hud.appendChild(row); } // the event chip sits in a row under the timer; the weather bonus lives on the fighters' panels
  const edge = document.createElement('div'); edge.id = 'evEdge'; if (tint) tint.insertAdjacentElement('afterend', edge); else stage.appendChild(edge);

  V.bannerX = (title, sub, ic, c) => {
    ban.innerHTML = `<div class="ei">${ico(ic)}</div><div><b>${title}</b><small>${sub}</small></div>`; ban.style.setProperty('--c', c);
    ban.classList.remove('on'); void ban.offsetWidth; ban.classList.add('on'); clearTimeout(T.bt); T.bt = setTimeout(() => ban.classList.remove('on'), 2300);
    edge.style.setProperty('--c', c); edge.className = 'on'; clearTimeout(T.et); if (!S.ev) T.et = setTimeout(() => { if (!S.ev) edge.className = ''; }, 2300); // one-off events glow for the banner, timed ones for their whole run
  };
  V.banner = k => { const b = BN[k] || EV[k]; if (b) V.bannerX(b.n, b.s, b.ic, b.c); };

  const lockKeys = { brawl: ['leaf', 'vine', 'special2', 'special3', 'beam'], overdrive: ['tackle', 'grab'], showdown: ['tackle', 'grab'] };
  const setLocks = k => { document.querySelectorAll('.btn.evlock').forEach(b => b.classList.remove('evlock')); if (k && lockKeys[k]) for (const d of lockKeys[k]) document.querySelectorAll('.btn[data-k="' + d + '"]').forEach(b => b.classList.add('evlock')); };

  V.locked = (f, name) => {
    const k = S.ev && S.ev.key; if (!k) return false;
    const bad = k === 'brawl' ? (name === 'ranged' || name === 'beam' || name.startsWith('special')) : (k === 'overdrive' || k === 'showdown') ? (name === 'melee' || name === 'grab') : false;
    if (bad && f === meF() && now - (f.lockAt || -9) > .7) { f.lockAt = now; floatText(f.x, V.top(f) - 20, 'LOCKED', '#ff8a6a', 20); }
    return bad;
  };

  function startEv(k) {
    let d = EV[k], ty = null;
    if (k === 'typestorm') { const ts = Object.keys(TYPE_HEX); ty = ts[Math.min(ts.length - 1, Math.floor(rnd(0, ts.length)))]; d = Object.assign({}, d, { n: ty.toUpperCase() + ' STORM', s: nm(ty) + ' moves hit 40% harder', c: TYPE_HEX[ty] }); } // the storm's type is rolled with the fight's own random numbers
    S.ev = { key: k, t: 0, dur: d.dur, ty }; V.bannerX(d.n, d.s, d.ic, d.c); sfx('charge'); T.sec = -1; T.ln = 0;
    if (k === 'zerog') for (const f of [P, E]) if (!f.dead) f.vz = Math.max(f.vz, 320);
    if (k === 'lowgrav') S.lowG = d.dur;
    if (k === 'springs') spawnSprings(d.dur);
    setLocks(k); chip.style.setProperty('--c', d.c); chip.innerHTML = `${ico(d.ic)}<span>${d.n}</span><b></b><i></i>`;
  }
  function spawnSprings(dur) { // a glowing patch between the fighters that heals whoever stands in it
    const x = clamp((P.x + E.x) / 2, WALL_L + 220, WALL_R - 220);
    V.spawn({
      x, r: 130, life: dur + .6, springs: true,
      upd(e, dt) { for (const f of [P, E]) if (!f.dead && f.z < 50 && Math.abs(f.x - e.x) < e.r) { f.hp = Math.min(f.maxhp, f.hp + f.maxhp * .04 * dt); if (now - (f.spAt || -9) > 1.2) { f.spAt = now; floatText(f.x, V.top(f) - 24, 'SPRINGS +HP', '#5affc0', 20); } } },
      draw(g, e) {
        const a = Math.max(0, Math.min(1, e.t / .5, (e.life - e.t) / .6)), y = GROUND + (laneY(P) + laneY(E)) / 2 - 12, r = e.r, pulse = (e.t * .9) % 1;
        g.globalAlpha = a; g.globalCompositeOperation = 'lighter';
        const bm = g.createLinearGradient(0, y, 0, y - 190); bm.addColorStop(0, 'rgba(90,255,192,.35)'); bm.addColorStop(1, 'rgba(90,255,192,0)'); g.fillStyle = bm; g.fillRect(e.x - r * .8, y - 190, r * 1.6, 190); // light column
        const gr = g.createRadialGradient(e.x, y, 6, e.x, y, r); gr.addColorStop(0, 'rgba(90,255,192,.7)'); gr.addColorStop(1, 'rgba(90,255,192,0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(e.x, y, r, r * .3, 0, 0, 6.283); g.fill();
        g.strokeStyle = `rgba(160,255,220,${.8 * (1 - pulse)})`; g.lineWidth = 3; g.beginPath(); g.ellipse(e.x, y, r * (.4 + .6 * pulse), r * .3 * (.4 + .6 * pulse), 0, 0, 6.283); g.stroke();
        g.strokeStyle = 'rgba(160,255,220,.9)'; g.lineWidth = 3; g.beginPath(); g.ellipse(e.x, y, r, r * .3, 0, 0, 6.283); g.stroke();
        g.lineWidth = 3; g.lineCap = 'round';
        for (let i = 0; i < 7; i++) { const ph = (e.t * .6 + i / 7) % 1, mx = e.x + Math.sin(i * 2.4 + e.t) * r * .7, my = y - 10 - ph * 150, s = 6 * (1 - ph * .4); g.strokeStyle = `rgba(210,255,235,${.9 * (1 - ph)})`; g.beginPath(); g.moveTo(mx - s, my); g.lineTo(mx + s, my); g.moveTo(mx, my - s); g.lineTo(mx, my + s); g.stroke(); } // rising plus signs
      },
    });
  }
  function endEv() { S.ev = null; setLocks(null); edge.className = ''; }
  V.forceEv = k => { if (EV[k]) startEv(k); };

  function tickEv(dt) {
    const k = S.ev.key;
    if (k === 'zerog') { for (const f of [P, E]) if (!f.dead && f.z > 0) f.vz += (2100 + (170 - f.z) * 5 - f.vz * 1.5) * dt; }
    if (k === 'brawl') for (const f of [P, E]) f.sta = Math.min(100, f.sta + 12 * dt);
    if (k === 'lanes') { T.ln -= dt; if (T.ln <= 0) { T.ln = 2; for (const f of [P, E]) if (!f.dead) { f.lane = Math.floor(Math.random() * 3) - 1; f.laneCool = 0; } } }
    if (k === 'overdrive') for (const f of [P, E]) { f.ki = Math.min(100, f.ki + 45 * dt); for (const c in f.cool) f.cool[c] = Math.max(0, f.cool[c] - dt * 5); }
    if (k === 'frenzy') for (const f of [P, E]) { for (const c in f.cool) f.cool[c] = Math.max(0, f.cool[c] - dt * 2); f.dashCool = Math.max(0, f.dashCool - dt * 2); }
    if (k === 'exhaust' && Math.floor(S.ev.t * 2) % 2 === 0) for (const f of [P, E]) f.staDelay = Math.max(f.staDelay, .3); // stamina only recovers every other half second
    if (k === 'underdog') for (const f of [P, E]) { const o = f === P ? E : P; if (!f.dead && f.hp / f.maxhp < o.hp / o.maxhp - .05) { f.sta = Math.min(100, f.sta + 10 * dt); if (now - (f.udAt || -9) > .5) { f.udAt = now; spark(f.x, V.top(f) + 10, '#7dff9a', 3, 120); } } }
  }

  const _ew = V.extraWorld;
  V.extraWorld = dt => {
    _ew(dt);
    if (practice || lab || !S.evMatch) { if (S.ev) endEv(); return; }
    if (S.ev) {
      S.ev.t += dt; tickEv(dt); if (S.ev.t >= S.ev.dur) { endEv(); return; }
      const sec = Math.ceil(S.ev.dur - S.ev.t); if (sec !== T.sec) { T.sec = sec; const b = chip.querySelector('b'); if (b) b.textContent = sec + 's'; }
      const bar = chip.querySelector('i'); if (bar) bar.style.width = (100 * (1 - S.ev.t / S.ev.dur)) + '%';
    } else {
      T.next -= dt;
      if (T.next <= 0 && !(S.lowG > 0)) { const o = KEYS.filter(k => !T.hist.includes(k)), k = o[Math.floor(Math.random() * o.length)]; T.last = k; T.hist = [...T.hist, k].slice(-3); T.next = S.rule === 'chaos' ? rnd(14, 20) : rnd(30, 45); startEv(k); }
    }
  };
  const _mr = V.moveResetWx;
  V.moveResetWx = () => { _mr(); endEv(); T.last = null; T.hist = []; T.next = S.rule === 'chaos' ? rnd(10, 14) : rnd(20, 30); };

  // the overlay and chip follow the sim state; nothing here changes it
  V.extraDraw = () => {
    const on = !!S.ev && state === 'fight';
    chip.classList.toggle('on', on); if (!on && !S.ev && state !== 'fight' && edge.className) edge.className = '';
    if (!on) { if (blk.style.display !== 'none') blk.style.display = 'none'; if (document.querySelector('.btn.evlock')) setLocks(null); return; }
    if (S.ev.key !== 'blackout') { if (blk.style.display !== 'none') blk.style.display = 'none'; return; }
    blk.style.display = 'block';
    const g = blk.getContext('2d'), sr = stage.getBoundingClientRect(), k = blk.width / sr.width, left = S.ev.dur - S.ev.t, fade = Math.min(1, S.ev.t / .6, left / .6);
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, blk.width, blk.height);
    g.fillStyle = `rgba(2,4,14,${.94 * fade * (1 - clamp(flashT * 5, 0, .6))})`; g.fillRect(0, 0, blk.width, blk.height);
    g.globalCompositeOperation = 'destination-out';
    [P, E].forEach((f, i) => {
      if (f.dead || !f.el) return; const r = f.el.getBoundingClientRect(), cx = (r.left + r.width / 2 - sr.left) * k, cy = (r.top + r.height * .45 - sr.top) * k;
      const want = 120 + (f.flash > 0 || (f.act && f.act.name !== 'melee') ? 130 : 0); T.br[i] += (want - (T.br[i] || 120)) * .2; const rad = (T.br[i] || 120) * k;
      const gr = g.createRadialGradient(cx, cy, rad * .15, cx, cy, rad); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.6, 'rgba(0,0,0,.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, rad, 0, 6.283); g.fill();
    });
    g.globalCompositeOperation = 'source-over';
  };
})();
