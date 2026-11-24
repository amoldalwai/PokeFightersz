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
  style.textContent = '#lowhp{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,rgba(255,0,0,0) 45%,rgba(220,0,20,.55) 100%)}#lowhp.on{animation:lhBeat 1s steps(5) infinite}#lowhp.crit{animation-duration:.6s;background:radial-gradient(ellipse at center,rgba(255,0,0,0) 35%,rgba(235,0,20,.7) 100%)}'
    + '@keyframes lhBeat{0%,100%{opacity:.35}12%{opacity:1}28%{opacity:.5}42%{opacity:.95}70%{opacity:.35}}'
    + '.btn.rdy{box-shadow:0 0 14px 4px #ffd34d,inset 0 0 12px #ffd34d}'
    + '.kibar.rdy{filter:brightness(1.4)}'
    // endless decorative loops tick in steps: smooth easing makes the GPU redraw the whole screen every vsync (120 Hz), which heats the phone
    + '#title .tfighter,.stagebox img,#menu .stagebox img,#movesPane .stagebox img,#labPane .stagebox img{animation-timing-function:steps(10)!important}#tSil{animation-timing-function:steps(150)!important}.sta.warn{animation-timing-function:steps(1)!important}.stat b{animation-timing-function:steps(6)!important}#evEdge.on{animation-timing-function:steps(8)!important}.vsStr{animation-timing-function:steps(48)!important}';
  document.head.appendChild(style);
  const lh = document.createElement('div'); lh.id = 'lowhp'; const tint = document.getElementById('tint'); if (tint) tint.insertAdjacentElement('afterend', lh); else document.getElementById('stage').appendChild(lh);

  const _ed = V.extraDraw;
  // weather bonus tag in each fighter's HUD panel: only the fighters the weather helps or hurts get one
  const wxTag = [null, null], wxKey = ['', ''];
  for (const [i, id] of ['faceA', 'faceB'].entries()) { const n = document.getElementById(id); if (!n || !n.parentNode) continue; const s = document.createElement('span'); s.className = 'wxtag'; s.id = 'wxTag' + 'AB'[i]; n.parentNode.appendChild(s); wxTag[i] = s; }
  const wxStyle = document.createElement('style'); wxStyle.textContent = '#hud .face{overflow:visible!important}.wxtag{display:none;position:absolute;left:50%;bottom:-9px;transform:translateX(-50%);align-items:center;gap:3px;padding:1px 7px 1px 4px;border-radius:10px;background:rgba(6,10,28,.92);border:1px solid var(--c);color:#fff;font:800 10px system-ui,sans-serif;letter-spacing:.5px;white-space:nowrap;z-index:3}.wxtag.on{display:inline-flex}.wxtag .sv{width:12px;height:12px;fill:var(--c)}.wxtag.dn{color:#ffb0a8}';
  document.head.appendChild(wxStyle);
  const updWx = () => {
    [P, E].forEach((f, i) => {
      const el = wxTag[i]; if (!el) return; const w = f && weather, up = w && f.kit.types.some(t => w.up.includes(t)), dn = w && !up && f.kit.types.some(t => w.down.includes(t)), key = up ? w.id + '+' : dn ? w.id + '-' : '';
      if (key === wxKey[i]) return; wxKey[i] = key; el.classList.toggle('on', !!key); el.classList.toggle('dn', !!dn);
      if (key) { el.style.setProperty('--c', dn ? '#ff8a7a' : w.col); el.innerHTML = ico(w.icon) + (up ? '+20%' : '\u221220%'); }
    });
  };
  // lane pill under each name card: BACK / CENTER / FRONT, plus a dot that is green while both fighters share a lane (direct hits only connect then)
  const lnEl = [null, null], lnKey = ['', ''], lnLast = [null, null], LN = { '-1': 'BACK', 0: 'CENTER', 1: 'FRONT' };
  document.querySelectorAll('#hud .side').forEach((s, i) => { if (i > 1) return; const el = document.createElement('div'); el.className = 'lnp'; el.innerHTML = '<span class="g"><i></i><i></i><i></i></span><span class="t"></span><span class="rc"></span>'; s.appendChild(el); lnEl[i] = el; });
  const lnStyle = document.createElement('style'); lnStyle.textContent = '.lnp{display:none;position:absolute;top:100%;margin-top:3px;align-items:center;gap:6px;height:20px;padding:0 9px 0 7px;border-radius:11px;background:#0a2263;border:1px solid rgba(150,190,255,.65);color:#fff;font:800 11px/1 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;letter-spacing:.9px;box-shadow:0 2px 6px rgba(0,0,0,.5);white-space:nowrap;z-index:3}.lnp.on{display:flex}#hud .side.l .lnp{left:6px}#hud .side.r .lnp{right:6px;flex-direction:row-reverse;padding:0 7px 0 9px}'
    + '.lnp .g{display:flex;flex-direction:column;align-items:center;gap:2px}.lnp .g i{display:block;height:2px;border-radius:1px;background:rgba(255,255,255,.28)}.lnp .g i:nth-child(1){width:8px}.lnp .g i:nth-child(2){width:11px}.lnp .g i:nth-child(3){width:14px}'
    + '.lnp[data-l="-1"] .g i:nth-child(1),.lnp[data-l="0"] .g i:nth-child(2),.lnp[data-l="1"] .g i:nth-child(3){background:#fff;box-shadow:0 0 4px #fff}.lnp .rc{width:7px;height:7px;border-radius:50%;background:#52e08a;box-shadow:0 0 5px #52e08a}.lnp.no .rc{background:#ff6a6a;box-shadow:0 0 5px #ff6a6a}'
    + '.lnp.pop{animation:lnpop .35s ease-out}@keyframes lnpop{0%{transform:scale(1)}35%{transform:scale(1.18);background:#1e47b8}100%{transform:scale(1)}}';
  document.head.appendChild(lnStyle);
  const updLn = () => {
    const on = state === 'fight' && !demo && !lab, same = Math.abs(P.lp - E.lp) < .6;
    [P, E].forEach((f, i) => {
      const el = lnEl[i]; if (!el) return; el.classList.toggle('on', on); if (!on) { lnLast[i] = null; return; }
      const ln = f.lane | 0, key = ln + (same ? 'y' : 'n'); if (key === lnKey[i]) return; lnKey[i] = key;
      el.dataset.l = ln; el.children[1].textContent = LN[ln]; el.classList.toggle('no', !same);
      if (lnLast[i] !== null && lnLast[i] !== ln) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
      lnLast[i] = ln;
    });
  };
  V.extraDraw = () => {
    if (_ed) _ed();
    if (P && E) updWx();
    if (P && E) updLn();
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
  // ---- spin, dash and leap: the attacker's type decides the look. Render-only: it reads the sim and never changes it.
  const MF = FX.mf = { p: [], rg: [], mk: [], fx: [], last: performance.now() }, MS = new WeakMap(); V.S.mfx = true;
  const LK = {
    normal: { s: ['impact'], add: 0, aura: '#e8e4d0', body: 'plain', gr: null, ds: 'streak', li: 'ring' },
    fire: { s: ['flareball', 'fireball'], add: 1, aura: '#ff8a2a', body: 'plain', gr: 'scorch', ds: 'sheath', li: 'burst', shape: 'flame', rise: 120, fc: ['rgba(255,70,10,.85)', 'rgba(255,160,40,.9)', 'rgba(255,245,170,1)'] },
    water: { s: ['waterwisp'], add: 0, aura: '#4aa8ff', body: 'bubbles', gr: 'puddle', ds: 'streak', li: 'splash' },
    electric: { s: ['electroball'], add: 1, aura: '#ffe01a', body: 'plain', gr: 'zap', ds: 'zig', li: 'bolts' },
    grass: { s: ['leaf1', 'leaf2', 'petal'], add: 0, aura: '#5ed85a', body: 'plain', gr: null, ds: 'spiral', li: 'burst' },
    ice: { s: ['icicle', 'waterwisp'], add: 0, aura: '#8fe6ff', body: 'plain', gr: 'frost', ds: 'streak', li: 'spikes' },
    fighting: { s: ['impact', 'wisp'], add: 0, aura: '#e0602a', body: 'rings', gr: null, ds: 'streak', li: 'ring' },
    poison: { s: ['poisonwisp'], add: 0, aura: '#b050e0', body: 'plain', gr: 'puddle', ds: 'sheath', li: 'splash' },
    ground: { s: ['mudwisp', 'rock1', 'rock2'], add: 0, aura: '#c89a50', body: 'plain', gr: 'mud', ds: 'streak', li: 'spikes' },
    flying: { s: ['feather'], add: 0, aura: '#b8ccff', body: 'plain', gr: null, ds: 'spiral', li: 'burst' },
    psychic: { s: ['mistball'], add: 1, aura: '#ff6adf', body: 'rings', gr: null, ds: 'phase', li: 'ring' },
    bug: { s: ['shine', 'greenmetal1'], add: 0, aura: '#a8c820', body: 'plain', gr: null, ds: 'zig', li: 'burst' },
    rock: { s: ['rock1', 'rock2', 'rock3'], add: 0, aura: '#b8a070', body: 'boulder', gr: null, ds: 'sheath', li: 'rocks' },
    ghost: { s: ['wisp', 'shadowball'], add: 1, aura: '#9a70e0', body: 'ghost', gr: null, ds: 'phase', li: 'burst' },
    dragon: { s: ['bluefireball'], add: 1, aura: '#7a6af0', body: 'rings', gr: null, ds: 'sheath', li: 'ring', shape: 'flame', rise: 80, fc: ['rgba(50,60,255,.85)', 'rgba(110,150,255,.9)', 'rgba(235,240,255,1)'] },
    dark: { s: ['blackwisp'], add: 0, aura: '#6a5a7a', body: 'plain', gr: null, ds: 'phase', li: 'burst' },
    steel: { s: ['shine', 'greenmetal1'], add: 0, aura: '#aab8cc', body: 'metal', gr: null, ds: 'streak', li: 'rocks' },
    fairy: { s: ['shine'], add: 1, aura: '#ff9ad0', body: 'plain', gr: null, ds: 'spiral', li: 'burst' },
  };
  const rr = (a, b) => a + Math.random() * (b - a), pk = a => a[Math.floor(Math.random() * a.length)];
  const lookOf = (f, a) => { const ty = window.__mfxType || (a.ty && a.ty !== 'normal' ? a.ty : f.kit.types[0]) || 'normal'; return [LK[ty] || LK.normal, ty]; };
  const addP = (L, x, y, vx, vy, life, size, o) => { if (MF.p.length > 110) return; o = o || {}; MF.p.push({ x, y, vx, vy: vy - (L.rise || 0) * (o.noRise ? 0 : rr(.4, 1)), life, t: 0, size, sp: o.sp || pk(L.s), rot: rr(0, 6.283), vr: rr(-5, 5), add: o.add !== undefined ? o.add : L.add, g: o.g || 0, shape: L.shape, fc: L.fc, ph: rr(0, 6.283) }); };
  const flameAt = (g, x, y, s, fc, ph) => { const w = s * (.55 + .12 * Math.sin(ph * 14)), h = s * 1.5; g.save(); g.globalCompositeOperation = 'lighter'; g.translate(x, y); for (const [k, col] of [[1, fc[0]], [.62, fc[1]], [.3, fc[2]]]) { g.fillStyle = col; g.beginPath(); g.moveTo(0, -h * k); g.quadraticCurveTo(w * k * 1.1, -h * k * .15, 0, h * k * .45); g.quadraticCurveTo(-w * k * 1.1, -h * k * .15, 0, -h * k); g.fill(); } g.restore(); };
  const ringAt = (x, y, col, R, life, w, flat) => MF.rg.push({ x, y, col, R, life, t: 0, w, flat });
  const burstAt = (L, x, y, n, spd, size) => { n = Math.ceil(n * (lowQ ? .5 : 1)); for (let i = 0; i < n; i++) { const an = rr(0, 6.283), v = rr(spd * .4, spd); addP(L, x, y, Math.cos(an) * v, Math.sin(an) * v - spd * .25, rr(.45, .8), size * rr(.7, 1.2), { g: 260 }); } };
  const rgba = (hex, a) => `rgba(${hexRgb(hex).join(',')},${a})`;
  const glowAt = (g, x, y, r, col, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.restore(); };
  function landAt(L, f, gy) {
    const lx = f.x + f.face * 30; ringAt(lx, gy, L.aura, 150, .5, 7, true); ringAt(lx, gy, '#ffffff', 90, .35, 4, true);
    if (L.li === 'spikes') MF.fx.push({ k: 'spikes', x: lx, y: gy, c: L.aura, t: 0, life: .9 });
    else if (L.li === 'bolts') MF.fx.push({ k: 'bolts', x: lx, y: gy, c: L.aura, t: 0, life: .35 });
    else if (L.li === 'rocks') for (let i = 0; i < (lowQ ? 4 : 8); i++) addP(L, lx + rr(-100, 100), gy - rr(150, 280), 0, rr(300, 520), rr(.55, .8), rr(22, 36), { g: 900, add: 0 });
    else if (L.li === 'splash') for (let i = 0; i < (lowQ ? 6 : 12); i++) addP(L, lx + rr(-20, 20), gy - 6, rr(-230, 230), rr(-400, -180), rr(.55, .85), rr(20, 30), { g: 900 });
    else if (L.li === 'burst') burstAt(L, lx, gy - 20, 14, 340, 28);
    if (L.gr) MF.mk.push({ x: lx, y: gy, k: L.gr, c: L.aura, t: 0, life: 3, big: 1 });
  }
  function mfAct(g, f, dt) {
    const a = f.act; if (!a || a.name !== 'sp' || f.dead) return; const k = a.key; if (k !== 'spin' && k !== 'dash' && k !== 'leap') return;
    let m = MS.get(a); if (!m) { m = { acc: 0, hit: false, land: false, gx: f.x, rg: 0, st: false }; MS.set(a, m); }
    const [L] = lookOf(f, a), c = center(f), oc = center(other(f)), gy = GROUND + laneY(f) + 2, q = lowQ ? .5 : 1, bk = -f.face, sz = clamp(f.h * .38, 22, 46);
    const on = k === 'spin' ? !!a.spinOn : k === 'dash' ? (a.t > .1 && a.t < .4 && Math.abs(f.vx) > 500) : (!!a.jumped && !a.landed);
    let al = 1; // psychic, ghost and dark dashes blink out and back; a ghost spin turns see-through
    if (k === 'dash' && L.ds === 'phase') { const t = a.t; al = t < .1 ? 1 : t < .16 ? 1 - (t - .1) / .06 * .88 : t < .38 ? .12 : t < .5 ? .12 + (t - .38) / .12 * .88 : 1; } else if (k === 'spin' && L.body === 'ghost' && a.spinOn) al = .5;
    if (al < 1) { f.el.style.opacity = al; if (f.wc) f.wc.style.opacity = al; f._mfF = 2; }
    if (on) {
      glowAt(g, c.x, c.y, f.h * .8, L.aura, .5);
      if (k === 'spin') {
        const r = f.h * .5;
        if (L.body === 'boulder') for (let i = 0; i < 3; i++) { const an = now * 14 + i * 2.1; spr(g, 'rock' + (1 + i), c.x + Math.cos(an) * r, c.y + Math.sin(an) * r * .9, 26, an); }
        else if (L.body === 'bubbles') for (let i = 0; i < 4; i++) { const an = now * 9 + i * 1.57; spr(g, 'waterwisp', c.x + Math.cos(an) * r, c.y + Math.sin(an) * r * .9, 22, 0, .85); }
        else if (L.body === 'metal') for (let i = 0; i < 3; i++) { const an = now * 12 + i * 2.1; g.save(); g.globalCompositeOperation = 'lighter'; spr(g, 'shine', c.x + Math.cos(an) * r, c.y + Math.sin(an) * r * .9, 30, an); g.restore(); }
        else if (L.body === 'rings' && now - m.rg > .1) { m.rg = now; ringAt(c.x, c.y, L.aura, f.h * .9, .35, 3, false); }
      } else if (k === 'dash') {
        if (L.ds === 'streak') { const x0 = c.x + bk * 160, gr = g.createLinearGradient(c.x, 0, x0, 0); gr.addColorStop(0, rgba(L.aura, .6)); gr.addColorStop(1, rgba(L.aura, 0)); g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.strokeStyle = gr; g.lineWidth = f.h * .5; g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(x0, c.y); g.stroke(); g.lineWidth = f.h * .16; g.strokeStyle = 'rgba(255,255,255,.55)'; g.stroke(); g.restore(); }
        else if (L.ds === 'zig') { g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round'; for (let j = 0; j < 2; j++) { g.strokeStyle = j ? '#fff' : L.aura; g.lineWidth = j ? 2 : 5; g.beginPath(); g.moveTo(c.x, c.y); for (let i = 1; i <= 6; i++) g.lineTo(c.x + bk * i * 24, c.y + rr(-f.h * .35, f.h * .35)); g.stroke(); } g.restore(); }
        else if (L.ds === 'sheath' || L.ds === 'spiral') { const n = lowQ ? 1 : 2, r = f.h * (L.ds === 'spiral' ? .62 : .42); for (let i = 0; i < n; i++) { const an = now * 16 + i * 3 + rr(0, 1); addP(L, c.x + Math.cos(an) * r, c.y + Math.sin(an) * r * .9, bk * 70, -30, .35, sz * .8); } }
        else if (L.ds === 'phase' && !m.st) { m.st = true; burstAt(L, c.x, c.y, 10, 200, sz); }
      }
      m.acc += dt * (k === 'leap' ? 46 : 78) * q;
      while (m.acc >= 1) { m.acc--; addP(L, c.x + bk * f.w * .3 + rr(-8, 8), c.y + rr(-f.h * .3, f.h * .3), bk * rr(30, 110), rr(-70, 10), rr(.45, .8), sz * rr(.85, 1.3)); }
      if (L.gr && k !== 'leap' && Math.abs(f.x - m.gx) > 34) { m.gx = f.x; MF.mk.push({ x: f.x, y: gy, k: L.gr, c: L.aura, t: 0, life: 2.6 }); }
    }
    if (k !== 'leap' && a.hit && !a.miss && !m.hit) { m.hit = true; ringAt(oc.x, oc.y, L.aura, 80, .4, 6, false); burstAt(L, oc.x, oc.y, 12, 320, sz * .9); }
    if (k === 'leap' && a.landed && !m.land) { m.land = true; landAt(L, f, gy); }
  }
  function mfDraw(g, dt) {
    for (let i = MF.mk.length - 1; i >= 0; i--) {
      const mk = MF.mk[i]; mk.t += dt; const u = mk.t / mk.life; if (u >= 1) { MF.mk.splice(i, 1); continue; } const al = u < .6 ? 1 : 1 - (u - .6) / .4, w = mk.big ? 46 : 26;
      g.save(); g.globalAlpha = al;
      if (mk.k === 'scorch') { g.fillStyle = 'rgba(40,18,8,.6)'; g.beginPath(); g.ellipse(mk.x, mk.y + 2, w, 6, 0, 0, 6.283); g.fill(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,120,30,.55)'; g.beginPath(); g.ellipse(mk.x, mk.y + 1, w * .6, 3, 0, 0, 6.283); g.fill(); g.globalAlpha = al * (1 - u / .8 > 0 ? 1 - u / .8 : 0); for (let j = -1; j <= 1; j += lowQ ? 2 : 1) flameAt(g, mk.x + j * w * .55, mk.y, 11 + (j ? 0 : 5), LK.fire.fc, mk.t + j); }
      else if (mk.k === 'puddle') { g.fillStyle = rgba(mk.c, .5); g.beginPath(); g.ellipse(mk.x, mk.y + 2, w, 6, 0, 0, 6.283); g.fill(); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(mk.x - 6, mk.y, w * .4, 2, 0, 0, 6.283); g.fill(); }
      else if (mk.k === 'frost') { g.fillStyle = 'rgba(210,246,255,.8)'; g.beginPath(); g.ellipse(mk.x, mk.y + 2, w, 5, 0, 0, 6.283); g.fill(); g.fillStyle = '#fff'; g.fillRect(mk.x - 9, mk.y - 3, 3, 3); g.fillRect(mk.x + 8, mk.y - 5, 3, 3); }
      else if (mk.k === 'mud') { g.fillStyle = 'rgba(88,64,32,.75)'; g.beginPath(); g.ellipse(mk.x, mk.y + 2, w, 6, 0, 0, 6.283); g.fill(); }
      else if (mk.k === 'zap') { g.globalCompositeOperation = 'lighter'; g.strokeStyle = mk.c; g.lineWidth = 2; g.beginPath(); g.moveTo(mk.x - w, mk.y + 2); for (let j = 1; j <= 6; j++) g.lineTo(mk.x - w + j * w / 3, mk.y + 2 + (j % 2 ? -4 : 4)); g.stroke(); }
      g.restore();
    }
    for (let i = MF.fx.length - 1; i >= 0; i--) {
      const e = MF.fx[i]; e.t += dt; const u = e.t / e.life; if (u >= 1) { MF.fx.splice(i, 1); continue; }
      g.save();
      if (e.k === 'spikes') { const rise = clamp(e.t / .15, 0, 1), fade = 1 - clamp((u - .6) / .4, 0, 1); g.globalAlpha = fade; for (let j = -3; j <= 3; j++) { const h = (52 - Math.abs(j) * 9) * rise, x = e.x + j * 24; g.fillStyle = e.c; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 9, e.y + 2); g.lineTo(x, e.y + 2 - h); g.lineTo(x + 9, e.y + 2); g.closePath(); g.fill(); g.stroke(); } }
      else if (e.k === 'bolts') { g.globalCompositeOperation = 'lighter'; g.globalAlpha = (1 - u) * (Math.floor(e.t * 40) % 2 ? .7 : 1); g.lineJoin = 'round'; for (let j = -1; j <= 1; j++) for (let p = 0; p < 2; p++) { g.strokeStyle = p ? '#fff' : e.c; g.lineWidth = p ? 2 : 6; g.beginPath(); let x = e.x + j * 44, y = e.y - 300; g.moveTo(x, y); for (let s = 1; s <= 8; s++) { x = e.x + j * 44 + (s % 2 ? 1 : -1) * rr(4, 14) * (1 - s / 9); y = e.y - 300 + s * 37.5; g.lineTo(x, y); } g.stroke(); } }
      g.restore();
    }
    for (let i = MF.rg.length - 1; i >= 0; i--) {
      const r = MF.rg[i]; r.t += dt; const u = r.t / r.life; if (u >= 1) { MF.rg.splice(i, 1); continue; } const e = 1 - Math.pow(1 - u, 3);
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - u; g.strokeStyle = r.col; g.lineWidth = r.w * (1 - u) + 1; g.beginPath(); g.ellipse(r.x, r.y, 14 + e * r.R, r.flat ? (14 + e * r.R) * .22 : 14 + e * r.R, 0, 0, 6.283); g.stroke(); g.restore();
    }
    for (let i = MF.p.length - 1; i >= 0; i--) {
      const p = MF.p[i]; p.t += dt; if (p.t >= p.life) { MF.p.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(.2, dt); p.rot += p.vr * dt; const u = p.t / p.life;
      g.save(); g.globalAlpha = Math.min(1, (1 - u) * 1.6); if (p.shape === 'flame') flameAt(g, p.x, p.y, p.size * (1 - u * .55) * .75, p.fc, p.ph + p.t); else { if (p.add) g.globalCompositeOperation = 'lighter'; spr(g, p.sp, p.x, p.y, p.size * (1 - u * .35), p.rot); } g.restore();
    }
  }
  const unfade = f => { if (!f || !f._mfF) return; f._mfF = 0; if (f.el) f.el.style.opacity = f._op === undefined || f._op < 0 ? 1 : f._op; if (f.wc) f.wc.style.opacity = ''; f._op = -1; };
  const _fd = V.fxDraw;
  V.fxDraw = g => {
    _fd(g); const nowMs = performance.now(), dt = Math.min(.05, (nowMs - MF.last) / 1000); MF.last = nowMs;
    if (!P || !E || !V.S.mfx || fxLow) { unfade(P); unfade(E); if (MF.p.length || MF.rg.length || MF.mk.length || MF.fx.length) MF.p.length = MF.rg.length = MF.mk.length = MF.fx.length = 0; return; }
    for (const f of [P, E]) if (f._mfF) f._mfF = 1;
    if (state === 'fight' || state === 'ko') for (const f of [P, E]) mfAct(g, f, dt);
    for (const f of [P, E]) if (f._mfF === 1) unfade(f);
    mfDraw(g, dt);
  };
  V.setMfx = on => { V.S.mfx = !!on; };
  V.statusDrawOn = true;
})();
