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
  };
  const BN = {
    rock: { n: 'ROCK SLIDE', s: 'Stay out of the red rings', ic: 'landslide', c: '#e0a560' }, bolt: { n: 'LIGHTNING STRIKE', s: 'Bolts are coming down', ic: 'weather-lightning', c: '#ffe54a' },
    hazard: { n: 'HAZARD WAVE', s: 'Three strikes incoming', ic: 'flash-alert', c: '#ff6a4a' }, crowd: { n: 'THE CROWD ROARS', s: 'Both fighters get a boost', ic: 'volume-high', c: '#ffd34d' },
  };
  const KEYS = Object.keys(EV), T = { next: 35, last: '', ln: 0, sec: -1, bt: 0, br: [0, 0] };

  const style = document.createElement('style');
  style.textContent = '#evBanner{position:absolute;left:50%;top:198px;transform:translate(-50%,-14px) scale(.92);opacity:0;display:flex;align-items:center;gap:12px;padding:8px 26px 8px 10px;border-radius:40px;background:linear-gradient(90deg,rgba(6,10,28,.94),rgba(22,30,66,.9));border:2px solid var(--c);box-shadow:0 0 26px color-mix(in srgb,var(--c) 55%,transparent),0 6px 16px rgba(0,0,0,.5);pointer-events:none;z-index:30;transition:opacity .25s,transform .35s cubic-bezier(.2,1.5,.4,1);white-space:nowrap}'
    + '#evBanner.on{opacity:1;transform:translate(-50%,0) scale(1)}#evBanner .ei{width:46px;height:46px;border-radius:50%;background:var(--c);display:grid;place-items:center;box-shadow:inset 0 0 0 3px rgba(255,255,255,.35)}#evBanner .ei .sv{width:28px;height:28px;fill:#0a1028}'
    + '#evBanner b{display:block;font:900 24px system-ui,sans-serif;letter-spacing:2.5px;color:#fff;text-shadow:0 0 14px var(--c),0 2px 0 rgba(0,0,0,.6);font-style:italic}#evBanner small{display:block;font:700 12px system-ui,sans-serif;letter-spacing:1px;color:#d6e2ff;margin-top:1px}'
    + '#evChip{position:absolute;left:50%;top:164px;transform:translateX(-50%);display:none;align-items:center;gap:7px;padding:3px 12px 3px 6px;border-radius:14px;background:rgba(6,10,28,.78);border:1px solid var(--c);color:#fff;font:800 11px system-ui,sans-serif;letter-spacing:1px;pointer-events:none;z-index:29;white-space:nowrap;overflow:hidden}#evChip.on{display:flex}#evChip .sv{width:16px;height:16px;fill:var(--c)}#evChip i{position:absolute;left:0;bottom:0;height:3px;background:var(--c)}'
    + '#blackout{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;display:none}.btn.evlock{opacity:.22;filter:grayscale(1)}';
  document.head.appendChild(style);
  const stage = document.getElementById('stage'), tint = document.getElementById('tint');
  const ban = document.createElement('div'), chip = document.createElement('div'), blk = document.createElement('canvas');
  ban.id = 'evBanner'; chip.id = 'evChip'; blk.id = 'blackout'; blk.width = W; blk.height = H;
  if (tint) { tint.insertAdjacentElement('afterend', blk); } else stage.appendChild(blk);
  stage.appendChild(ban); stage.appendChild(chip);

  V.bannerX = (title, sub, ic, c) => {
    ban.innerHTML = `<div class="ei">${ico(ic)}</div><div><b>${title}</b><small>${sub}</small></div>`; ban.style.setProperty('--c', c);
    ban.classList.remove('on'); void ban.offsetWidth; ban.classList.add('on'); clearTimeout(T.bt); T.bt = setTimeout(() => ban.classList.remove('on'), 2300);
  };
  V.banner = k => { const b = BN[k] || EV[k]; if (b) V.bannerX(b.n, b.s, b.ic, b.c); };

  const lockKeys = { brawl: ['leaf', 'vine', 'special2', 'special3', 'beam'], overdrive: ['tackle', 'grab'] };
  const setLocks = k => { document.querySelectorAll('.btn.evlock').forEach(b => b.classList.remove('evlock')); if (k && lockKeys[k]) for (const d of lockKeys[k]) document.querySelectorAll('.btn[data-k="' + d + '"]').forEach(b => b.classList.add('evlock')); };

  V.locked = (f, name) => {
    const k = S.ev && S.ev.key; if (!k) return false;
    const bad = k === 'brawl' ? (name === 'ranged' || name === 'beam' || name.startsWith('special')) : k === 'overdrive' ? (name === 'melee' || name === 'grab') : false;
    if (bad && f === meF() && now - (f.lockAt || -9) > .7) { f.lockAt = now; floatText(f.x, V.top(f) - 20, 'LOCKED', '#ff8a6a', 20); }
    return bad;
  };

  function startEv(k) {
    const d = EV[k]; S.ev = { key: k, t: 0, dur: d.dur }; V.banner(k); sfx('charge'); T.sec = -1; T.ln = 0;
    if (k === 'zerog') for (const f of [P, E]) if (!f.dead) f.vz = Math.max(f.vz, 320);
    if (k === 'lowgrav') S.lowG = d.dur;
    setLocks(k); chip.style.setProperty('--c', d.c); chip.innerHTML = `${ico(d.ic)}<span>${d.n}</span><b></b><i></i>`;
  }
  function endEv() { S.ev = null; setLocks(null); }
  V.forceEv = k => { if (EV[k]) startEv(k); };

  function tickEv(dt) {
    const k = S.ev.key;
    if (k === 'zerog') { for (const f of [P, E]) if (!f.dead && f.z > 0) f.vz += (2100 + (170 - f.z) * 5 - f.vz * 1.5) * dt; }
    if (k === 'brawl') for (const f of [P, E]) f.sta = Math.min(100, f.sta + 12 * dt);
    if (k === 'lanes') { T.ln -= dt; if (T.ln <= 0) { T.ln = 2; for (const f of [P, E]) if (!f.dead) { f.lane = Math.floor(Math.random() * 3) - 1; f.laneCool = 0; } } }
    if (k === 'overdrive') for (const f of [P, E]) { f.ki = Math.min(100, f.ki + 45 * dt); for (const c in f.cool) f.cool[c] = Math.max(0, f.cool[c] - dt * 5); }
  }

  const _ew = V.extraWorld;
  V.extraWorld = dt => {
    _ew(dt);
    if (practice || lab) { if (S.ev) endEv(); return; }
    if (S.ev) {
      S.ev.t += dt; tickEv(dt); if (S.ev.t >= S.ev.dur) { endEv(); return; }
      const sec = Math.ceil(S.ev.dur - S.ev.t); if (sec !== T.sec) { T.sec = sec; const b = chip.querySelector('b'); if (b) b.textContent = sec + 's'; }
      const bar = chip.querySelector('i'); if (bar) bar.style.width = (100 * (1 - S.ev.t / S.ev.dur)) + '%';
    } else {
      T.next -= dt;
      if (T.next <= 0 && !(S.lowG > 0)) { const o = KEYS.filter(k => k !== T.last), k = o[Math.floor(Math.random() * o.length)]; T.last = k; T.next = S.rule === 'chaos' ? rnd(14, 20) : rnd(40, 60); startEv(k); }
    }
  };
  const _mr = V.moveResetWx;
  V.moveResetWx = () => { _mr(); endEv(); T.next = S.rule === 'chaos' ? rnd(10, 14) : rnd(28, 42); };

  // the overlay and chip follow the sim state; nothing here changes it
  V.extraDraw = () => {
    const on = !!S.ev && state === 'fight';
    chip.classList.toggle('on', on);
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
