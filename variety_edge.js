'use strict';
// ---------------------------------------------------------------- edge Tesla poles: stay within 150 px of an arena wall for 6 seconds and the pole zaps you and throws you toward the center.
// The timer, the throw, the damage and the safe window run in the sim (deterministic online: only the seeded Math.random is used). The glow, lamps, ring and bolts are render-only.
(() => {
  const V = VAR, S = V.S;
  const EDGE = 150, LEAVE = 220, TIME = 6, WARNF = 2 / 3, NEAR = 440, DMG = .03, SAFE = .5, LAMPS = 6;
  S.edge = { time: TIME, ch: [0, 0], t0: [-99, -99], off: false };
  let zaps = [];
  const wallX = w => w ? WALL_R : WALL_L, dirIn = w => w ? -1 : 1, distTo = (f, w) => w ? WALL_R - f.x : f.x - WALL_L, wallOf = f => f.x - WALL_L <= WALL_R - f.x ? 0 : 1;

  // distance travelled per 1 px/s of launch speed with the game's own knock-back rules (gravity, three bounces, slide), and how long the airborne part lasts
  const coefCache = {};
  function coef(vz0, tossV, z0) {
    z0 = Math.round(z0 / 10) * 10; const key = vz0 + '|' + tossV + '|' + z0; if (coefCache[key]) return coefCache[key];
    const dt = 1 / 60; let x = 0, kv = 1, z = z0, vz = vz0, toss = 3, tv = tossV, wasAir = true, t = 0, T = 0;
    for (let i = 0; i < 900; i++) {
      x += kv * dt; kv *= Math.pow(toss > 0 ? .3 : .02, dt); vz -= 2100 * dt; z += vz * dt; t += dt;
      if (z <= 0) { const landed = wasAir; z = 0; if (vz < 0) vz = 0; if (landed && toss > 0) { toss--; tv *= .65; vz = tv; kv *= .8; } else if (landed) { T = t; break; } wasAir = false; } else wasAir = true;
    }
    return coefCache[key] = { k: x + kv / 3.912, T: T || t };
  }

  function launch(f, w, D) {
    const dir = dirIn(w), fly = !!f.hover, vz0 = fly ? 940 : 800, tv = fly ? 780 : 680, c = coef(vz0, tv, f.z + f.lift); // a flyer starts the throw from its hover height, which adds a little airtime
    f.refly = !!(f.hover && f.air);
    f.z += f.lift; f.lift = 0; f.lv = 0; f.grabLift = 0; f.flyBack = null; f.aimT = 0; // whatever altitude a flyer had becomes the start of the throw
    f.act = null; f.charging = false; f.under = false; f.spinT = 0; f.vx = 0; f.el.style.clipPath = '';
    f.hitBig = true; f.hv = 1; f.jDir = dir; f.spinA = 0; f.stuckT = 0; f.crashed = false; f.jt = []; f.smash = false; f.bounced = false; f.canJuggle = false; f.sqT = 0;
    f.toss = 3; f.tossV = tv; f.vz = vz0; f.kvx = dir * D / c.k;
    f.hitT = c.T + 1.05; f.inv = Math.max(f.inv, f.hitT + SAFE); f.flash = .3; f.ghostT = .3; // thrown, slides, lies dazed, then half a second where nobody can hit it
    if (f.hover) { f.air = false; f.alt = 0; f.noFlyT = f.hitT + .6; } // a shocked flyer cannot take off again for a moment
    f.hp = Math.max(1, f.hp - f.maxhp * DMG); f.edgeT = 0; f.edgeD = D; f.edgeX0 = f.x;
    floatText(f.x, GROUND - f.z - f.lift - f.h - 20, 'ZAPPED!', '#ffe54a', 32);
    if (f.hover) floatText(f.x, GROUND - f.z - f.lift - f.h - 62, 'FLIGHT SHORTED', '#9fe8ff', 22);
  }

  function zap(w, trig) {
    const list = [P, E].filter(f => !f.dead && f.hp > 0 && (f === trig || distTo(f, w) <= NEAR)).sort((a, b) => distTo(a, w) - distTo(b, w));
    let rest = 0;
    list.forEach((f, i) => {
      const s = distTo(f, w); let D;
      if (i === 0) { D = 300 + Math.random() * 400; rest = s + D; } else { rest += 190 + Math.random() * 140; D = Math.max(220, rest - s); rest = s + D; } // the second fighter always ends up ahead of the first, never on top of it
      launch(f, w, D);
    });
    freeze = Math.max(freeze, .14); shake = Math.max(shake, 22); flashCol = '190,235,255'; flashT = Math.max(flashT, .12); sfx('zap'); sfx('boom');
    S.edge.t0[w] = now; zaps.push({ t0: now, w, list });
  }

  function edgeStep(dt) {
    const e = S.edge;
    for (const f of [P, E]) if (f && f.noFlyT > 0) { f.noFlyT -= dt; if (f.noFlyT <= 0 && f.refly && !f.dead) { f.air = true; f.alt = 0; f.refly = false; } } // flight comes back a moment after the fight resumes
    e.ch[0] = e.ch[1] = 0;
    if (state !== 'fight' || practice || lab || e.off || !P || !E) { for (const f of [P, E]) if (f) f.edgeT = 0; return; }
    const time = e.time || TIME; let trig = null;
    for (const f of [P, E]) {
      if (f.dead || f.hp <= 0) { f.edgeT = 0; continue; }
      const w = wallOf(f), d = distTo(f, w); f.edgeW = w;
      if (d <= EDGE) f.edgeT = (f.edgeT || 0) + dt; else if (d > LEAVE) f.edgeT = 0; // a quick step away does not reset it, leaving the edge does
      if (f.edgeT > 0) e.ch[w] = Math.max(e.ch[w], f.edgeT / time);
      if (f.edgeT >= time && !trig) trig = f;
    }
    if (trig) zap(trig.edgeW, trig);
  }
  const _ew = V.extraWorld; V.extraWorld = dt => { if (_ew) _ew(dt); edgeStep(dt); };

  // ---- computer fighters know about the poles: once the lamps get high they break away toward the center
  const _ai = aiInput;
  aiInput = (f, o, dt) => {
    const inp = _ai(f, o, dt);
    if (inp && f.isAI && !practice && !lab && state === 'fight' && (f.edgeT || 0) >= (S.edge.time || TIME) * .4 && f.hitT <= 0) {
      const c = (WALL_L + WALL_R) / 2 > f.x ? 'r' : 'l', other = c === 'r' ? 'l' : 'r'; inp[c] = true; inp[other] = false;
      if ((f.edgeT || 0) >= (S.edge.time || TIME) * .55 && f.dashCool <= 0 && f.sta >= 12) inp.dash = true;
    }
    return inp;
  };

  // ---- drawing: the pole in the arena wall, the glowing fence, and the bolts of the zap
  const hh = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); }, cl01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const warnOf = w => cl01((S.edge.ch[w] - WARNF) / (1 - WARNF)), flashOf = w => cl01(1 - (now - S.edge.t0[w]) / .3);
  const fencePath = (g, x, bx, top, bt, bot) => { g.beginPath(); for (let i = 0; i <= 10; i++) { const u = i / 10, u2 = Math.min(1, u + .12); g.moveTo(x + (bx - x) * u, top + (bt - top) * u); g.lineTo(x + (bx - x) * u2, bot - 22 * u2); g.moveTo(x + (bx - x) * u, bot - 22 * u); g.lineTo(x + (bx - x) * u2, top + (bt - top) * u2); } };
  const zig = (g, x0, y0, x1, y1, seed, amp) => { const n = 5; g.moveTo(x0, y0); for (let i = 1; i < n; i++) { const u = i / n; g.lineTo(x0 + (x1 - x0) * u + (hh(i, seed) - .5) * amp, y0 + (y1 - y0) * u + (hh(i, seed + 9) - .5) * amp); } g.lineTo(x1, y1); };

  V.wallFence = (g, x, out, top, bot, bx, bt) => {
    const w = out < 0 ? 0 : 1, warn = warnOf(w), fl = flashOf(w); if (warn <= 0 && fl <= 0) return;
    const sd = Math.floor(now * 24);
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(110,225,255,${Math.min(1, (.12 + .5 * warn) * (.65 + .35 * hh(3, sd)) + fl)})`; g.lineWidth = 2 + 2 * fl; fencePath(g, x, bx, top, bt, bot); g.stroke();
    g.strokeStyle = `rgba(170,240,255,${Math.min(1, .3 + .6 * warn + fl)})`; g.lineWidth = 2; g.beginPath(); for (const u of [0, .5, 1]) { g.moveTo(x, top + (bot - top) * u); g.lineTo(bx, bt + (bot - 22 - bt) * u); } g.stroke();
    if (!lowQ) { g.lineWidth = 1.6; g.beginPath(); for (let k = 0; k < 1 + Math.round(warn * 5 + fl * 4); k++) { const u = hh(k, sd), v = Math.floor(hh(k, sd + 2) * 3) / 2, xA = x + (bx - x) * u, yA = top + (bot - top) * v + ((bt + (bot - 22 - bt) * v) - (top + (bot - top) * v)) * u; zig(g, xA, yA, xA + (hh(k, sd + 5) - .5) * 40, yA + (hh(k, sd + 7) - .5) * 40, sd + k, 14); } g.stroke(); }
    g.restore();
  };

  V.wallPost = (g, x, out, top, bot) => {
    const w = out < 0 ? 0 : 1, ch = S.edge.ch[w], warn = warnOf(w), fl = flashOf(w), charge = Math.min(1, ch * .35 + warn * .65 + fl), sd = Math.floor(now * 24), ey = top - 24;
    // lamps set into the post: one per second of edge time, the last ones turn red and blink
    const lit = Math.floor(ch * LAMPS + 1e-6), sy0 = GROUND - 250, sh = LAMPS * 24 + 8;
    g.fillStyle = '#161a22'; g.beginPath(); g.roundRect ? g.roundRect(x - 8, sy0, 16, sh, 8) : g.rect(x - 8, sy0, 16, sh); g.fill(); g.strokeStyle = '#0c0e13'; g.lineWidth = 2; g.stroke();
    for (let i = 0; i < LAMPS; i++) {
      const cy = sy0 + sh - 16 - i * 24, on = i < lit, red = i >= LAMPS / 2 && on, blink = red && Math.floor(now * 6) % 2 === 0;
      g.beginPath(); g.arc(x, cy, 5, 0, 6.283); g.fillStyle = on ? (red ? (blink ? '#ff5a4a' : '#ffa07a') : '#ffe54a') : '#2a303c'; g.fill(); g.strokeStyle = '#0c0e13'; g.lineWidth = 1.5; g.stroke();
      if (on) { g.save(); g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(x, cy, 2, x, cy, 16); gl.addColorStop(0, red ? 'rgba(255,90,70,.55)' : 'rgba(255,230,80,.5)'); gl.addColorStop(1, 'rgba(255,200,60,0)'); g.fillStyle = gl; g.beginPath(); g.arc(x, cy, 16, 0, 6.283); g.fill(); g.restore(); }
    }
    // the Tesla terminal where the red beacon used to be
    g.fillStyle = '#3a404c'; g.fillRect(x - 9, top - 14, 18, 14); g.fillStyle = '#5b6372'; g.fillRect(x - 9, top - 14, 18, 3); g.fillRect(x - 9, top - 7, 18, 2); g.strokeStyle = '#23252b'; g.lineWidth = 2.5; g.strokeRect(x - 9, top - 14, 18, 14);
    g.lineWidth = 3; g.beginPath(); g.moveTo(x - 11, top - 14); g.lineTo(x - 16, ey - 4); g.moveTo(x + 11, top - 14); g.lineTo(x + 16, ey - 4); g.stroke(); g.strokeStyle = '#8f98a8'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - 11, top - 14); g.lineTo(x - 16, ey - 4); g.moveTo(x + 11, top - 14); g.lineTo(x + 16, ey - 4); g.stroke();
    g.fillStyle = '#8f98a8'; for (const sx of [-16, 16]) { g.beginPath(); g.arc(x + sx, ey - 5, 3.5, 0, 6.283); g.fill(); g.strokeStyle = '#23252b'; g.lineWidth = 1.5; g.stroke(); }
    g.save(); g.globalCompositeOperation = 'lighter'; const R = 22 + 80 * charge, gl = g.createRadialGradient(x, ey, 2, x, ey, R); gl.addColorStop(0, `rgba(190,245,255,${.15 + .7 * charge})`); gl.addColorStop(.5, `rgba(80,190,255,${.08 + .35 * charge})`); gl.addColorStop(1, 'rgba(80,190,255,0)'); g.fillStyle = gl; g.beginPath(); g.arc(x, ey, R, 0, 6.283); g.fill(); g.restore();
    const eg = g.createRadialGradient(x - 3, ey - 3, 1, x, ey, 10); eg.addColorStop(0, `rgb(${215 + 40 * charge},${235 + 20 * charge},255)`); eg.addColorStop(.6, `rgb(${120 + 100 * charge},${150 + 90 * charge},${185 + 70 * charge})`); eg.addColorStop(1, '#4a5262'); g.fillStyle = eg; g.beginPath(); g.arc(x, ey, 10, 0, 6.283); g.fill(); g.strokeStyle = '#23252b'; g.lineWidth = 2.5; g.stroke();
    g.strokeStyle = 'rgba(143,152,168,.95)'; g.lineWidth = 2.2; g.beginPath(); g.ellipse(x, ey, 17, 5, 0, 0, 6.283); g.stroke();
    if (warn > 0 && !lowQ) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(190,245,255,${.55 + .45 * warn})`; g.lineWidth = 2; g.beginPath(); zig(g, x - 16, ey - 5, x, ey - 2, sd, 8); zig(g, x, ey - 2, x + 16, ey - 5, sd + 3, 8); for (let k = 0; k < Math.round(warn * 3); k++) { const a = -Math.PI / 2 + (hh(k, sd + 4) - .5) * 2.6, r1 = 28 + 24 * hh(k, sd + 8); zig(g, x + Math.cos(a) * 10, ey + Math.sin(a) * 10, x + Math.cos(a) * r1, ey + Math.sin(a) * r1, sd + k * 3, 10); } g.stroke(); g.restore(); }
    // a ring on the floor under every fighter who is in the warning zone fills up as the zap gets closer
    for (const f of [P, E]) {
      if (!f || f.dead || wallOf(f) !== w || (f.edgeT || 0) / (S.edge.time || TIME) < WARNF) continue;
      const prog = cl01(((f.edgeT || 0) / (S.edge.time || TIME) - WARNF) / (1 - WARNF)), c = prog > .66 ? '255,90,70' : '255,226,80', fy = GROUND + 14 + laneY(f), rx = 70 + f.w * .15;
      g.save(); g.globalAlpha = .35 + .35 * Math.abs(Math.sin(now * (6 + prog * 10))); g.strokeStyle = `rgb(${c})`; g.lineWidth = 6; g.beginPath(); g.ellipse(f.x, fy, rx, rx * .22, 0, -Math.PI / 2, -Math.PI / 2 + prog * 6.283); g.stroke(); g.fillStyle = `rgba(${c},.12)`; g.beginPath(); g.ellipse(f.x, fy, rx, rx * .22, 0, 0, 6.283); g.fill(); g.restore();
    }
  };

  function bolt(g, x0, y0, x1, y1, seed, wd) {
    const n = 9, pts = [[x0, y0]], dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    for (let i = 1; i < n; i++) { const u = i / n, off = (hh(i, seed) - .5) * 70 * Math.sin(u * Math.PI); pts.push([x0 + dx * u + nx * off, y0 + dy * u + ny * off]); } pts.push([x1, y1]);
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round'; g.lineCap = 'round';
    for (const [lw, col] of [[wd * 4, 'rgba(70,170,255,.28)'], [wd * 1.9, 'rgba(150,235,255,.85)'], [wd * .8, 'rgba(255,255,255,1)']]) { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }
    g.restore();
  }
  const _fd = V.fxDraw;
  V.fxDraw = g => {
    if (_fd) _fd(g);
    if (!zaps.length) return;
    zaps = zaps.filter(z => now - z.t0 < .45 && now >= z.t0 - .1);
    for (const z of zaps) {
      const age = now - z.t0; if (age < 0 || age > .32) continue;
      const tx = wallX(z.w), ty = GROUND - 300 - 24, seed = Math.floor(age * 30) * 7;
      z.list.forEach((f, i) => bolt(g, tx, ty, f.x, GROUND + laneY(f) - f.z - f.lift - f.h * .55, seed + i * 5, 5));
      const u = age / .32; g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(150,235,255,${1 - u})`; g.lineWidth = 6; g.beginPath(); g.arc(tx, ty, 20 + u * 180, 0, 6.283); g.stroke(); g.restore();
    }
  };
  const _mr = V.moveResetWx; V.moveResetWx = () => { if (_mr) _mr(); zaps = []; S.edge.ch[0] = S.edge.ch[1] = 0; S.edge.t0[0] = S.edge.t0[1] = -99; };
})();
