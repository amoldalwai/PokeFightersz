'use strict';
// ---------------------------------------------------------------- visual polish: status badges over the head, low-HP vignette, pulsing beam READY (draw and DOM only, no sim state)
(() => {
  const V = VAR;
  const ST = [
    ['burn', 'burnT', 'fire', '#ff7a2a', '#fff'], ['poison', 'poisonT', 'skull-crossbones', '#b05cff', '#fff'], ['sleep', 'sleepT', 'sleep', '#6aa8ff', '#fff'], ['freeze', 'freezeT', 'snowflake', '#7fe8ff', '#0a2a3a'],
    ['slow', 'slowT', 'arrow-down-bold-circle', '#9aa8b8', '#10202e'], ['confuse', 'confT', 'sync', '#ff7ae6', '#fff'], ['shock', 'shockT', 'flash', '#ffe54a', '#3a2a00'], ['weak', 'debT', 'arrow-down-bold', '#ff8a8a', '#3a0a0a'],
  ];
  const paths = {}; const path = n => paths[n] || (paths[n] = new Path2D(ICON_PATH[n] || ''));
  const ease = t => 1 - Math.pow(1 - t, 3), back = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  V.statusDraw = (g, f) => {
    if (f.dead) return; const v = f.vr; if (!v) return; const m = v.stm || (v.stm = {}), at = v.sta2 || (v.sta2 = {}), act = [];
    for (const s of ST) {
      const cur = f[s[1]] || 0;
      if (cur > .02) { if (!m[s[0]] || cur > m[s[0]]) m[s[0]] = cur; if (at[s[0]] === undefined) at[s[0]] = now; act.push(s); } else { delete m[s[0]]; delete at[s[0]]; }
    }
    if (!act.length) return;
    const sz = 28, gap = 6, w = act.length * (sz + gap) - gap, hy = V.top(f) - 44;
    act.forEach((s, i) => {
      const left = clamp((f[s[1]] || 0) / (m[s[0]] || 1), 0, 1), age = now - at[s[0]], pop = age < .25 ? back(clamp(age / .25, 0, 1)) : 1, x = f.x - w / 2 + i * (sz + gap) + sz / 2, y = hy + Math.sin(now * 3 + i * 1.3) * 3;
      g.save(); g.translate(x, y); g.scale(pop, pop); g.globalAlpha = clamp(age / .12, 0, 1) * (left < .12 ? left / .12 : 1);
      g.fillStyle = 'rgba(8,12,30,.85)'; g.beginPath(); g.arc(0, 0, sz / 2 + 3, 0, 6.283); g.fill();
      g.strokeStyle = s[3]; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, sz / 2 + 1, -Math.PI / 2, -Math.PI / 2 + 6.283 * left); g.stroke();
      g.fillStyle = s[3]; g.beginPath(); g.arc(0, 0, sz / 2 - 3, 0, 6.283); g.fill();
      g.save(); g.scale((sz - 10) / 24, (sz - 10) / 24); g.translate(-12, -12); g.fillStyle = s[4]; g.fill(path(s[2])); g.restore();
      g.restore();
    });
  };

  const style = document.createElement('style');
  style.textContent = '#lowhp{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,rgba(255,0,0,0) 45%,rgba(220,0,20,.55) 100%)}#lowhp.on{animation:lhBeat 1s ease-in-out infinite}#lowhp.crit{animation-duration:.6s;background:radial-gradient(ellipse at center,rgba(255,0,0,0) 35%,rgba(235,0,20,.7) 100%)}'
    + '@keyframes lhBeat{0%,100%{opacity:.35}12%{opacity:1}28%{opacity:.5}42%{opacity:.95}70%{opacity:.35}}'
    + '.btn.rdy{animation:rdyPulse 1s ease-in-out infinite}@keyframes rdyPulse{0%,100%{box-shadow:0 0 8px 2px #ffd34d,inset 0 0 8px #ffd34d}50%{box-shadow:0 0 22px 8px #ffe27a,inset 0 0 16px #ffe27a}}'
    + '.kibar.rdy{animation:kiPulse 1s ease-in-out infinite}@keyframes kiPulse{50%{filter:brightness(1.6)}}';
  document.head.appendChild(style);
  const lh = document.createElement('div'); lh.id = 'lowhp'; const tint = document.getElementById('tint'); if (tint) tint.insertAdjacentElement('afterend', lh); else document.getElementById('stage').appendChild(lh);

  const _ed = V.extraDraw;
  // weather bonus tag in each fighter's HUD panel: only the fighters the weather helps or hurts get one
  const wxTag = [null, null], wxKey = ['', ''];
  for (const [i, id] of ['nameA', 'nameB'].entries()) { const n = document.getElementById(id); if (!n) continue; const s = document.createElement('span'); s.className = 'wxtag'; s.id = 'wxTag' + 'AB'[i]; n.insertAdjacentElement('afterend', s); wxTag[i] = s; }
  const wxStyle = document.createElement('style'); wxStyle.textContent = '.wxtag{display:none;align-items:center;gap:4px;margin-left:8px;padding:1px 8px 1px 5px;border-radius:10px;background:rgba(0,0,0,.55);border:1px solid var(--c);color:#fff;font:800 10px system-ui,sans-serif;letter-spacing:.8px;white-space:nowrap;vertical-align:middle}.wxtag.on{display:inline-flex}.wxtag .sv{width:13px;height:13px;fill:var(--c)}.wxtag.dn{color:#ffb0a8}';
  document.head.appendChild(wxStyle);
  const updWx = () => {
    [P, E].forEach((f, i) => {
      const el = wxTag[i]; if (!el) return; const w = f && weather, up = w && f.kit.types.some(t => w.up.includes(t)), dn = w && !up && f.kit.types.some(t => w.down.includes(t)), key = up ? w.id + '+' : dn ? w.id + '-' : '';
      if (key === wxKey[i]) return; wxKey[i] = key; el.classList.toggle('on', !!key); el.classList.toggle('dn', !!dn);
      if (key) { el.style.setProperty('--c', dn ? '#ff8a7a' : w.col); el.innerHTML = ico(w.icon) + w.name + (up ? ' +20%' : ' \u221220%'); }
    });
  };
  V.extraDraw = () => {
    if (_ed) _ed();
    if (P && E) updWx();
    const f = state === 'fight' && !demo && !lab ? meF() : null, hp = f && !f.dead ? f.hp / f.maxhp : 1, cls = hp < .1 ? 'on crit' : hp < .25 ? 'on' : '';
    if (lh.className !== cls) { lh.className = cls; lh.style.opacity = cls ? '' : '0'; }
  };
  // ---- dust, landing cracks, melee swipe arcs and the KO ring: all render-time, they only read the sim
  const FX = { puffs: [], cracks: [], rings: [], pf: [], last: performance.now(), ko: false, arcN: 0 };
  V.fx = FX;
  const dustCol = () => { const c = GROUND_COL[curTheme.id] || '#c8b496'; return hexRgb(lighten(c, .15)).join(','); };
  const puffAt = (x, y, n, big) => { const m = lowQ ? .5 : 1; for (let i = 0; i < Math.ceil(n * m); i++) FX.puffs.push({ x: x + (Math.random() - .5) * 26, y, vx: (Math.random() - .5) * (big ? 260 : 70), vy: -Math.random() * (big ? 70 : 28), t: 0, life: .55 + Math.random() * .3, r: big ? 16 : 8 }); };
  V.fxDraw = g => {
    const nowMs = performance.now(), dt = Math.min(.05, (nowMs - FX.last) / 1000); FX.last = nowMs;
    if (!P || !E) return;
    const live = state === 'fight' || state === 'ko';
    if (live) [P, E].forEach((f, i) => {
      const s = FX.pf[i] || (FX.pf[i] = { x: f.x, z: 0, zmax: 0, sp: 0, at: 0 });
      const fly = f.hover && (f.air || f.lift > 12), gy = GROUND + laneY(f) + 2;
      s.sp += (Math.abs(f.x - s.x) / Math.max(dt, .001) - s.sp) * .25; s.x = f.x;
      if (!fly && f.z <= 2 && !f.dead && s.sp > 230 && nowMs - s.at > (s.sp > 700 ? 35 : 120)) { s.at = nowMs; puffAt(f.x - f.face * f.w * .25, gy, s.sp > 700 ? 2 : 1, false); }
      if (f.z > s.zmax) s.zmax = f.z;
      if (s.z > 24 && f.z <= 2 && !fly) { puffAt(f.x, gy, s.zmax > 140 ? 12 : 6, true); if (s.zmax > 140 && !lowQ) FX.cracks.push({ x: f.x, y: gy, t: 0 }); s.zmax = 0; }
      if (f.z <= 2) s.zmax = 0; s.z = f.z;
    });
    // ground cracks
    for (let i = FX.cracks.length - 1; i >= 0; i--) {
      const c = FX.cracks[i]; c.t += dt; const a = 1 - c.t / 1.6; if (a <= 0) { FX.cracks.splice(i, 1); continue; }
      g.save(); g.strokeStyle = `rgba(30,20,10,${a * .7})`; g.lineWidth = 2; g.beginPath(); for (const sg of [-1, 1]) { let x = c.x, y = c.y; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += sg * (10 + k * 9); y += k % 2 ? 3 : -2; g.lineTo(x, y); } } g.stroke(); g.restore();
    }
    // dust puffs
    if (FX.puffs.length) { const col = dustCol(); for (let i = FX.puffs.length - 1; i >= 0; i--) { const p = FX.puffs[i]; p.t += dt; if (p.t > p.life) { FX.puffs.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .94; const k = p.t / p.life; g.fillStyle = `rgba(${col},${.7 * (1 - k)})`; g.beginPath(); g.arc(p.x, p.y, p.r * (1 + k * 1.6), 0, 6.283); g.fill(); } }
    // melee swipe arcs: a tapered crescent in the move's type colour during the swing
    if (live) for (const f of [P, E]) {
      const a = f.act; if (!a || a.name !== 'melee' || f.dead || a.t < .06 || a.t > .3) continue;
      const k = (a.t - .06) / .24, col = colsOf(f.kit.melee.type)[1], c = center(f), cx = f.x + f.face * f.w * .2, cy = c.y - f.h * .08, R = 52 + f.w * .5, n = lowQ ? 8 : 14; FX.arcN++;
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      for (let j = 0; j < n; j++) {
        const u = j / n, w = (1 - Math.abs(u - .5) * 1.6) * 15 * (1 - k); if (w <= 0) continue; let a0 = -1.3 + u * 2.1 * ease(Math.min(1, k * 1.6)), a1 = a0 + .16; if (f.face < 0) { const t0 = Math.PI - a1; a1 = Math.PI - a0; a0 = t0; }
        g.globalAlpha = (1 - k) * .9; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(cx, cy, R, a0, a1); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = w * .35; g.beginPath(); g.arc(cx, cy, R, a0, a1); g.stroke();
      }
      g.restore();
    }
    // KO ring
    if (state === 'ko' && !FX.ko) { FX.ko = true; const l = [P, E].find(f => f.dead); if (l) FX.rings.push({ x: l.x, y: center(l).y, t: 0 }); } else if (state !== 'ko') FX.ko = false;
    for (let i = FX.rings.length - 1; i >= 0; i--) {
      const r = FX.rings[i]; r.t += dt; if (r.t > .7) { FX.rings.splice(i, 1); continue; } const k = r.t / .7;
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,255,255,${1 - k})`; g.lineWidth = 14 * (1 - k) + 2; g.beginPath(); g.arc(r.x, r.y, 30 + ease(k) * 380, 0, 6.283); g.stroke();
      g.strokeStyle = `rgba(255,220,140,${.8 * (1 - k)})`; g.lineWidth = 6 * (1 - k); g.beginPath(); g.arc(r.x, r.y, 20 + ease(k) * 250, 0, 6.283); g.stroke(); g.restore();
    }
  };
  V.statusDrawOn = true;
})();
