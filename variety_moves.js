'use strict';
// ---------------------------------------------------------------- 16 new move behaviours (loaded after game.js)
// Bounce shot, boomerang, seeker orb, split shot, gravity well, mark + detonate, mine, orbit shield, decoy, push/pull wave, energy wall,
// chain bolt, delayed bomb, life tether, charge levels, trail dash. Each lives in VAR's entity list, so the sim and the drawing stay separate.
(() => {
  const V = VAR, spawn = V.spawn, top = V.top, vr = V.vr;
  const floorY = f => GROUND + laneY(f) - 14;
  const cols = ty => colsOf(ty || 'normal');
  const ang = (a, b) => ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

  // a body-contact test that respects the depth lanes (a different lane evades, once)
  function touch(e, r) {
    const o = other(e.owner); if (o.dead || o.inv > 0 || !circleRect(e.x, e.y, r, body(o))) return false;
    if (Math.abs(e.lane - o.lp) > .6) { if (!e.evaded) { e.evaded = true; floatText(o.x, top(o) - 10, 'EVADED', '#9fe8ff'); } return false; }
    return true;
  }
  function strike(e, dmg, knock, big, st, dir) {
    const o = other(e.owner); if (o.dead) return false;
    if (e.miss) { if (!e.said) { e.said = 1; floatText(o.x, top(o) - 10, 'MISS', '#ddd'); } return false; }
    const c = center(o), d = dir || (Math.sign(c.x - e.x) || e.owner.face);
    const ok = damage(e.owner, o, dmg, d * knock, { x: clamp(e.x, c.x - 30, c.x + 30), y: c.y }, !!big, e.ty);
    if (ok && st) applyStatus(o, st, true, e.owner); return ok;
  }
  function glow(g, x, y, r, c, a = 1) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; const gr = g.createRadialGradient(x, y, 1, x, y, r); gr.addColorStop(0, '#fff'); gr.addColorStop(.35, c[1]); gr.addColorStop(1, c[0] + '00'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.restore();
  }
  function trailDraw(g, e, c, w = 10) {
    if (!e.tr || e.tr.length < 2) return; g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (let i = 1; i < e.tr.length; i++) { g.globalAlpha = i / e.tr.length * .6; g.strokeStyle = c[1]; g.lineWidth = w * i / e.tr.length; g.beginPath(); g.moveTo(e.tr[i - 1].x, e.tr[i - 1].y); g.lineTo(e.tr[i].x, e.tr[i].y); g.stroke(); } g.restore();
  }
  const pushTr = e => { (e.tr || (e.tr = [])).push({ x: e.x, y: e.y }); if (e.tr.length > 9) e.tr.shift(); };
  const shadow = (g, x, f, r) => { g.save(); g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x, floorY(f) + 10, r, r * .3, 0, 0, 6.283); g.fill(); g.restore(); };

  // generic small shot used by splits, decoys and orbit orbs
  function shard(owner, x, y, vx, vy, dmg, ty, life, r, home) {
    return spawn({ kind: 'shard', owner, x, y, vx, vy, dmg, ty, lane: owner.lp, life: life || 1.3, r: r || 13, home, upd: uShard, draw: dShard });
  }
  function uShard(e, dt) {
    if (e.home) { const c = center(other(e.owner)), want = Math.atan2(c.y - e.y, c.x - e.x), sp = Math.hypot(e.vx, e.vy), a = Math.atan2(e.vy, e.vx); const na = a + clamp(ang(a, want), -3 * dt, 3 * dt); e.vx = Math.cos(na) * sp; e.vy = Math.sin(na) * sp; }
    e.x += e.vx * dt; e.y += e.vy * dt; pushTr(e);
    if (e.x < WALL_L - 60 || e.x > WALL_R + 60 || e.y > GROUND + 40) return false;
    if (touch(e, e.r + 6)) { strike(e, e.dmg, 240, false); spark(e.x, e.y, cols(e.ty)[1], 6); return false; }
  }
  function dShard(g, e) { const c = cols(e.ty); trailDraw(g, e, c, e.r * 1.2); glow(g, e.x, e.y, e.r * 1.8, c); g.fillStyle = '#fff'; g.beginPath(); g.arc(e.x, e.y, e.r * .45, 0, 6.283); g.fill(); }

  // ---- 1. bounce shot: skips along the floor, so ducking under it does not help
  ARCH.bounce = {
    cost: 14, cool: 2.8, range: [180, 760], dur: .6, twice: true,
    start() { sfx('shot'); },
    tick(f, o, a) { f.vx = 0; if (!a.done && a.t >= .2) { a.done = true; const m = muzzle(f); spawn({ kind: 'bounce', owner: f, x: m.x, y: m.y, vx: f.face * 470, vy: -140, lane: f.lp, ty: a.ty, miss: a.miss, life: 3.4, bn: 0, dmg: D(f, 38), upd: uBounce, draw: dBounce }); } },
  };
  function uBounce(e, dt) {
    e.vy += 1500 * dt; e.x += e.vx * dt; e.y += e.vy * dt; pushTr(e); const fl = floorY(e.owner) - 10;
    if (e.y > fl) { e.y = fl; e.vy = -Math.max(400, Math.abs(e.vy) * .82); e.bn++; spark(e.x, fl, cols(e.ty)[1], 6, 160); if (e.bn > 3) return false; }
    if (e.x < WALL_L || e.x > WALL_R) { e.vx *= -1; e.x = clamp(e.x, WALL_L, WALL_R); }
    if (touch(e, 24)) { strike(e, e.dmg, 400, false); boom(e.x, e.y, 70, cols(e.ty)[1], 6); return false; }
  }
  function dBounce(g, e) { const c = cols(e.ty); shadow(g, e.x, e.owner, 16); trailDraw(g, e, c, 18); glow(g, e.x, e.y, 34, c); g.fillStyle = c[1]; g.beginPath(); g.arc(e.x, e.y, 15, 0, 6.283); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(e.x - 5, e.y - 5, 5, 0, 6.283); g.fill(); }

  // ---- 2. boomerang: hits on the way out and again on the way back
  ARCH.boomer = {
    cost: 14, cool: 3, range: [160, 720], dur: .55, twice: true,
    start() { sfx('whip'); },
    tick(f, o, a) { f.vx = 0; if (!a.done && a.t >= .2) { a.done = true; const m = muzzle(f); spawn({ kind: 'boomer', owner: f, x: m.x, y: m.y, face: f.face, lane: f.lp, ty: a.ty, miss: a.miss, life: 3, dmg: D(f, 30), ph: 0, upd: uBoomer, draw: dBoomer }); } },
  };
  function uBoomer(e, dt) {
    const f = e.owner;
    if (e.t < .55) e.x += e.face * 780 * (1 - e.t / .55 * .85) * dt;
    else { if (!e.back) { e.back = true; e.hit = false; e.ph = 1; } const c = center(f), dx = c.x - e.x, dy = c.y - e.y, L = Math.hypot(dx, dy) || 1; e.x += dx / L * 820 * dt; e.y += dy / L * 820 * dt; if (L < 40) return false; }
    pushTr(e);
    if (!e.hit && touch(e, 28)) { e.hit = true; const o = other(f); strike(e, e.dmg, 300, false, null, e.ph ? (f.x > o.x ? 1 : -1) : e.face); }
  }
  function dBoomer(g, e) { const c = cols(e.ty); trailDraw(g, e, c, 12); g.save(); g.translate(e.x, e.y); g.rotate(e.t * 20); glow(g, 0, 0, 36, c, .7); g.strokeStyle = '#fff'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, 20, .4, 2.4); g.stroke(); g.strokeStyle = c[1]; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 20, .4, 2.4); g.stroke(); g.restore(); }

  // ---- 3. seeker orb: slow, but it turns to follow you; only a lane switch or a guard beats it
  function launchSeeker(f, x, y, ty, dmg, spd, miss, a0) {
    return spawn({ kind: 'seeker', owner: f, x, y, ang: a0 === undefined ? (f.face > 0 ? -.35 : Math.PI + .35) : a0, spd: spd || 400, lane: f.lp, ty, miss, life: 3.4, dmg, upd: uSeeker, draw: dSeeker });
  }
  ARCH.seeker = {
    cost: 16, cool: 3, range: [160, 800], dur: .6, twice: true,
    start() { sfx('charge'); },
    tick(f, o, a) { f.vx = 0; if (!a.done && a.t >= .25) { a.done = true; const m = muzzle(f); launchSeeker(f, m.x, m.y, a.ty, D(f, 38), 400, a.miss); sfx('shot'); } },
  };
  function uSeeker(e, dt) {
    const o = other(e.owner), c = center(o), want = Math.atan2(c.y - e.y, c.x - e.x); e.ang += clamp(ang(e.ang, want), -2.6 * dt, 2.6 * dt); e.spd = Math.min(560, e.spd + 120 * dt);
    e.x += Math.cos(e.ang) * e.spd * dt; e.y += Math.sin(e.ang) * e.spd * dt; pushTr(e);
    if (e.y > GROUND + 30) e.y = GROUND + 30;
    if (touch(e, 22)) { strike(e, e.dmg, 320, false); boom(e.x, e.y, 80, cols(e.ty)[1], 7); return false; }
    if (e.miss && Math.hypot(c.x - e.x, c.y - e.y) < 40) { strike(e, 0, 0); return false; }
  }
  function dSeeker(g, e) { const c = cols(e.ty); trailDraw(g, e, c, 16); glow(g, e.x, e.y, 36, c); g.fillStyle = '#fff'; g.beginPath(); g.arc(e.x, e.y, 8, 0, 6.283); g.fill(); g.strokeStyle = c[1]; g.lineWidth = 2; g.beginPath(); g.arc(e.x, e.y, 13 + Math.sin(e.t * 18) * 2, 0, 6.283); g.stroke(); }

  // ---- 4. split shot: one orb that bursts into three
  ARCH.split = {
    cost: 14, cool: 2.8, range: [200, 780], dur: .6,
    start() { sfx('shot'); },
    tick(f, o, a) { f.vx = 0; if (!a.done && a.t >= .2) { a.done = true; const m = muzzle(f); spawn({ kind: 'split', owner: f, x: m.x, y: m.y, vx: f.face * 560, lane: f.lp, ty: a.ty, miss: a.miss, life: 2, dmg: D(f, 28), upd: uSplit, draw: dSplit }); } },
  };
  function uSplit(e, dt) {
    e.x += e.vx * dt; pushTr(e);
    if (e.t > .42) { const c = center(other(e.owner)), dir = Math.sign(e.vx) || 1, base = Math.atan2(clamp(c.y - e.y, -300, 300), 420); for (const off of [-.5, 0, .5]) { const a = base + off; shard(e.owner, e.x, e.y, Math.cos(a) * dir * 560, Math.sin(a) * 560, D(e.owner, 19), e.ty, 1.2, 12); } sfx('shot'); spark(e.x, e.y, cols(e.ty)[1], 10); return false; }
    if (touch(e, 22)) { strike(e, e.dmg, 260, false); return false; }
  }
  function dSplit(g, e) { const c = cols(e.ty), k = clamp(e.t / .42, 0, 1); trailDraw(g, e, c, 14); glow(g, e.x, e.y, 30 + 12 * k, c); g.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { const a = e.t * 14 + i * 2.094; g.beginPath(); g.arc(e.x + Math.cos(a) * 9 * k, e.y + Math.sin(a) * 9 * k, 6, 0, 6.283); g.fill(); } }

  // ---- 5. gravity well: drags the foe in, then collapses
  ARCH.gravity = {
    cost: 18, cool: 5, range: [150, 540], dur: .7,
    start() { sfx('charge'); },
    tick(f, o, a) { f.vx = 0; f.charging = true; if (!a.done && a.t >= .3) { a.done = true; spawn({ kind: 'well', owner: f, x: clamp(lerp(f.x, o.x, .85), WALL_L + 60, WALL_R - 60), lane: f.lp, ty: a.ty, miss: a.miss, life: 4.8, upd: uWell, draw: dWell }); sfx('boom'); } },
  };
  function uWell(e, dt) {
    const f = e.owner, o = other(f);
    if (!o.dead && Math.abs(e.lane - o.lp) <= 1.2 && Math.abs(o.x - e.x) < 260 && !e.miss) { const pull = o.z + o.lift > 20 ? 110 : 300; o.x = clamp(o.x + Math.sign(e.x - o.x) * pull * dt, WALL_L, WALL_R); o.slowT = Math.max(o.slowT, .25); }
    if (e.t > 4.6 && !e.done) { e.done = true; boom(e.x, GROUND - 40, 170, cols(e.ty)[1], 16); aoe(f, e.x, GROUND - 40, 170, D(f, 50), 340, true, null, e.ty); return false; }
  }
  function dWell(g, e) {
    const c = cols(e.ty), k = clamp(e.t / .3, 0, 1) * (e.t > 4.3 ? clamp((4.8 - e.t) / .5, 0, 1) : 1), cy = GROUND - 40;
    g.save(); const gr = g.createRadialGradient(e.x, cy, 4, e.x, cy, 130 * k); gr.addColorStop(0, 'rgba(10,0,30,.95)'); gr.addColorStop(.6, 'rgba(60,20,110,.55)'); gr.addColorStop(1, c[1] + '00'); g.fillStyle = gr; g.beginPath(); g.ellipse(e.x, cy, 140 * k, 90 * k, 0, 0, 6.283); g.fill();
    g.globalCompositeOperation = 'lighter'; g.strokeStyle = c[1]; g.lineWidth = 2.5; for (let i = 0; i < 4; i++) { g.beginPath(); for (let t = 0; t < 2.4; t += .2) { const a = i * 1.57 + t * 2.1 - e.t * 6, r = (140 - t * 50) * k; g.lineTo(e.x + Math.cos(a) * r, cy + Math.sin(a) * r * .65); } g.stroke(); } g.restore();
  }

  // ---- 6. mark: a target ring on the ground that detonates; walk (or jump) out of it
  ARCH.mark = {
    cost: 18, cool: 4.5, range: [100, 700], dur: .45,
    start(f, o, a) { sfx('charge'); },
    tick(f, o, a) { f.vx = 0; if (!a.done && a.t >= .15) { a.done = true; const x = clamp(o.x + (a.miss ? (Math.random() < .5 ? -1 : 1) * rnd(230, 300) : 0), WALL_L + 40, WALL_R - 40); spawn({ kind: 'mark', owner: f, x, lane: f.lp, ty: a.ty, life: 1.4, upd: uMark, draw: dMark }); floatText(x, GROUND - 120, 'MARKED', '#ff6a8a', 22); } },
  };
  function uMark(e) { if (e.t >= 1.2 && !e.done) { e.done = true; boom(e.x, GROUND - 30, 130, cols(e.ty)[1], 18); aoe(e.owner, e.x, GROUND - 40, 130, D(e.owner, 66), 480, true, null, e.ty); return false; } }
  function dMark(g, e) {
    const c = cols(e.ty), k = clamp(e.t / 1.2, 0, 1), gy = GROUND + 6 + laneY(e.owner), r = 130 * (1 - .15 * k);
    g.save(); g.strokeStyle = `rgba(255,70,90,${.5 + .4 * Math.sin(e.t * 20)})`; g.lineWidth = 4; g.beginPath(); g.ellipse(e.x, gy, r, r * .22, 0, 0, 6.283); g.stroke(); g.fillStyle = 'rgba(255,60,80,.16)'; g.fill();
    g.strokeStyle = c[1]; g.lineWidth = 3; g.beginPath(); g.ellipse(e.x, gy, r * (1 - k), r * .22 * (1 - k), 0, 0, 6.283); g.stroke();
    g.beginPath(); g.moveTo(e.x - 20, gy); g.lineTo(e.x + 20, gy); g.moveTo(e.x, gy - 8); g.lineTo(e.x, gy + 8); g.stroke(); g.restore();
  }

  // ---- 7. mine: hidden on the floor, arms after a moment, up to two at once
  ARCH.mine = {
    cost: 16, cool: 3.5, range: [90, 440], dur: .5,
    start(f, o, a) {
      const mine = V.S.ents.filter(e => e.kind === 'mine' && e.owner === f); if (mine.length >= 2) mine[0].dead = true;
      spawn({ kind: 'mine', owner: f, x: clamp(f.x + f.face * clamp(Math.abs(o.x - f.x) * .65, 90, 360), WALL_L + 40, WALL_R - 40), arm: .7, lane: f.lp, ty: a.ty, life: 14, upd: uMine, draw: dMine }); sfx('whip');
    },
    tick(f) { f.vx = 0; },
  };
  function uMine(e, dt) {
    e.arm -= dt; if (e.arm > 0) return; const o = other(e.owner);
    if (!o.dead && o.z + o.lift < 70 && Math.abs(o.x - e.x) < o.w * .34 + 34 && Math.abs(e.lane - o.lp) <= .6) { boom(e.x, GROUND - 30, 115, cols(e.ty)[1], 16); aoe(e.owner, e.x, GROUND - 30, 115, D(e.owner, 58), 520, true, null, e.ty); return false; }
  }
  function dMine(g, e) {
    const c = cols(e.ty), gy = GROUND + 4 + laneY(e.owner), armed = e.arm <= 0;
    g.save(); g.fillStyle = '#2a2230'; g.beginPath(); g.ellipse(e.x, gy, 22, 7, 0, 0, 6.283); g.fill(); g.strokeStyle = c[1]; g.lineWidth = 2; g.stroke();
    g.fillStyle = armed ? (Math.floor(now * 4) % 2 ? '#ff4a4a' : '#701818') : '#aaa'; g.beginPath(); g.arc(e.x, gy - 3, 4, 0, 6.283); g.fill(); g.restore();
  }

  // ---- 8. orbit shield: three orbs circle you; each soaks one hit, and spare ones fire at the foe
  ARCH.orbit = {
    cost: 14, cool: 9, range: [0, 9999], dur: .7, when: f => vr(f).orbs <= 0,
    start(f, o, a) { const v = vr(f); v.orbs = 3; v.orbT = 7; v.orbTy = a.ty; v.orbId = (v.orbId || 0) + 1; spawn({ kind: 'orbit', owner: f, id: v.orbId, life: 8, upd: uOrbit, draw: dOrbit }); floatText(f.x, top(f) - 10, 'ORBIT SHIELD', cols(a.ty)[1], 22); sfx('heal'); },
    tick(f) { f.vx = 0; f.charging = true; },
  };
  const uOrbit = e => { const v = vr(e.owner); return v.orbs > 0 && v.orbId === e.id && !e.owner.dead; };
  function dOrbit(g, e) { const f = e.owner, v = vr(f), c = cols(v.orbTy), cy = center(f).y; for (let i = 0; i < v.orbs; i++) { const a = now * 3.2 + i * 6.283 / v.orbs; glow(g, f.x + Math.cos(a) * f.w * .6, cy + Math.sin(a) * f.h * .42, 20, c); g.fillStyle = '#fff'; g.beginPath(); g.arc(f.x + Math.cos(a) * f.w * .6, cy + Math.sin(a) * f.h * .42, 5, 0, 6.283); g.fill(); } }
  function orbitFire(f, dt) {
    const v = vr(f); if (v.orbs <= 0) return; v.orbT -= dt; if (v.orbT <= 0) { v.orbs = 0; return; }
    const o = other(f); if (v.orbs >= 2 && now - v.orbAt > 1.3 && !o.dead && Math.abs(f.lp - o.lp) <= .6 && Math.abs(o.x - f.x) < 460) { v.orbAt = now; v.orbs--; const c = center(f); launchSeeker(f, c.x, c.y - 20, v.orbTy, D(f, 24), 480, false, f.face > 0 ? -.8 : Math.PI + .8); }
  }

  // ---- 9. decoy: a clone that shoots and soaks three projectiles
  ARCH.decoy = {
    cost: 16, cool: 8, range: [0, 9999], dur: .6, when: f => !V.S.ents.some(e => e.kind === 'decoy' && e.owner === f),
    start(f, o, a) { spawn({ kind: 'decoy', owner: f, x: clamp(f.x + f.face * 120, WALL_L + 40, WALL_R - 40), hp: 3, shot: .6, lane: f.lp, ty: a.ty, life: 6, upd: uDecoy, draw: dDecoy }); puff(f.x, GROUND, 8, 'rgba(235,235,235,.6)', 90); sfx('whip'); },
    tick(f) { f.vx = 0; },
  };
  function uDecoy(e, dt) {
    const f = e.owner, c = center(f); e.shot -= dt;
    if (e.shot <= 0 && Math.abs(other(f).x - e.x) < 700) { e.shot = .9; shard(f, e.x + f.face * 20, c.y, f.face * 520, 0, D(f, 15), e.ty, 1.4, 10); }
    for (const p of projectiles) if (p.owner !== f && p.life > 0 && !p.nodmg && Math.abs(p.x - e.x) < 40 && Math.abs(p.y - c.y) < 70) { p.life = 0; e.hp--; spark(e.x, c.y, '#fff', 8); floatText(e.x, c.y - 50, 'DECOY', '#ddd', 16); }
    for (const x of V.S.ents) if (x.owner !== f && x.kind !== 'decoy' && x.dmg && x.vx !== undefined && Math.abs(x.x - e.x) < 40 && Math.abs(x.y - c.y) < 70 && !x.dead) { x.dead = true; e.hp--; spark(e.x, c.y, '#fff', 8); }
    if (e.hp <= 0) { puff(e.x, GROUND, 8, 'rgba(235,235,235,.6)', 90); return false; }
  }
  function dDecoy(g, e) {
    const f = e.owner, el = f.el, cy = center(f).y, h = f.h * 1.05; g.save(); g.globalAlpha = .55 + .1 * Math.sin(now * 8);
    const ok = el && ((el.tagName === 'CANVAS' && el.width) || (el.tagName === 'IMG' && el.complete && el.naturalWidth));
    if (ok) { const w0 = el.tagName === 'CANVAS' ? el.width : el.naturalWidth, h0 = el.tagName === 'CANVAS' ? el.height : el.naturalHeight, s = h / h0; g.translate(e.x, GROUND + laneY(f)); g.scale(f.face < 0 ? -1 : 1, 1); try { g.drawImage(el, -w0 * s / 2, -h, w0 * s, h); } catch (x) { } }
    else { glow(g, e.x, cy, f.h * .6, cols(e.ty)); }
    g.restore(); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .25; g.fillStyle = cols(e.ty)[1]; g.beginPath(); g.ellipse(e.x, cy, f.w * .45, f.h * .5, 0, 0, 6.283); g.fill(); g.restore();
  }

  // ---- 10. push and pull wave: shoves the foe away, then drags it back
  ARCH.pushpull = {
    cost: 16, cool: 4, range: [0, 380], dur: 1,
    start(f, o, a) { spawn({ kind: 'pp', owner: f, x: f.x, ty: a.ty, life: 1.1, upd: () => { }, draw: dPP }); sfx('whip'); },
    tick(f, o, a) {
      f.vx = 0; const near = !o.dead && Math.abs(f.lp - o.lp) <= .6 && Math.abs(o.x - f.x) < 400, d = Math.sign(o.x - f.x) || f.face;
      if (!a.p1 && a.t >= .25) { a.p1 = true; if (near && !a.miss) damage(f, o, D(f, 16), d * 820, center(o), false, a.ty); }
      if (!a.p2 && a.t >= .8) { a.p2 = true; if (near && !a.miss) damage(f, o, D(f, 18), -d * 820, center(o), false, a.ty); }
    },
  };
  function dPP(g, e) { const f = e.owner, c = cols(e.ty), cy = center(f).y; g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = c[1]; g.lineWidth = 5; const k = e.t < .55 ? e.t / .55 : 1 - clamp((e.t - .55) / .45, 0, 1); for (let i = 0; i < 3; i++) { const r = (e.t < .55 ? 40 + 330 * clamp(e.t / .55 - i * .12, 0, 1) : 40 + 330 * clamp(1 - (e.t - .6) / .5 + i * .1, 0, 1)); g.globalAlpha = .6 * k; g.beginPath(); g.ellipse(f.x, cy, r * .7, r, 0, 0, 6.283); g.stroke(); } g.restore(); }

  // ---- 11. energy wall: blocks shots and the foe's walk for a few seconds
  ARCH.wall = {
    cost: 14, cool: 7, range: [60, 600], dur: .55,
    start(f, o, a) { sfx('whip'); },
    tick(f, o, a) { f.vx = 0; if (!a.done && a.t >= .25) { a.done = true; const x = clamp(f.x + f.face * 130, WALL_L + 40, WALL_R - 40); spawn({ kind: 'wall', owner: f, x, h: 120, hp: 3, side: Math.sign(o.x - x) || f.face, lane: f.lp, ty: a.ty, life: 6.5, upd: uWall, draw: dWall }); sfx('block'); } },
  };
  function uWall(e) {
    const f = e.owner, o = other(f);
    if (!o.dead && Math.abs(e.lane - o.lp) <= .8) {
      if (o.z + o.lift >= 100) e.side = Math.sign(o.x - e.x) || e.side;
      else { const th = 18 + o.w * .34; if (Math.sign(o.x - e.x) !== e.side || Math.abs(o.x - e.x) < th) o.x = e.x + e.side * th; }
      if (o.act && o.act.name === 'melee' && o.act.t < .3 && Math.abs(o.x - e.x) < 110 && e.lastAct !== o.act) { e.lastAct = o.act; e.hp--; spark(e.x, GROUND - 60, '#fff', 10); floatText(e.x, GROUND - e.h - 10, 'CRACK', '#ddd', 18); }
    }
    for (const p of projectiles) if (p.owner !== f && p.life > 0 && !p.nodmg && Math.abs(p.x - e.x) < 26 && p.y > GROUND - e.h - 40) { p.life = 0; e.hp--; spark(p.x, p.y, '#fff', 8); }
    for (const x of V.S.ents) if (x.owner !== f && x.kind !== 'wall' && x.dmg && x.vx !== undefined && !x.dead && Math.abs(x.x - e.x) < 26 && x.y > GROUND - e.h - 40) { x.dead = true; e.hp--; spark(x.x, x.y, '#fff', 8); }
    if (e.hp <= 0) { boom(e.x, GROUND - 60, 60, cols(e.ty)[1], 6); return false; }
  }
  function dWall(g, e) {
    const c = cols(e.ty), k = clamp(e.t / .2, 0, 1), h = e.h * k, gy = GROUND + laneY(e.owner), fade = e.life - e.t < .6 ? (Math.floor(now * 10) % 2 ? .4 : 1) : 1;
    g.save(); g.globalAlpha = .85 * fade; const gr = g.createLinearGradient(e.x - 14, 0, e.x + 14, 0); gr.addColorStop(0, c[0]); gr.addColorStop(.5, '#fff'); gr.addColorStop(1, c[1]); g.fillStyle = gr; g.beginPath(); g.moveTo(e.x - 14, gy); g.lineTo(e.x - 10, gy - h); g.lineTo(e.x + 10, gy - h - 8 * k); g.lineTo(e.x + 14, gy); g.closePath(); g.fill();
    g.strokeStyle = c[1]; g.lineWidth = 2; g.stroke(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .3 * fade; g.fillStyle = c[1]; g.fillRect(e.x - 20, gy - h, 40, h); g.restore();
    g.save(); g.fillStyle = '#fff'; for (let i = 0; i < e.hp; i++) { g.beginPath(); g.arc(e.x - 8 + i * 8, gy - h - 16, 3, 0, 6.283); g.fill(); } g.restore();
  }

  // ---- 12. chain bolt: a bolt that jumps from the foe to the foe's new spot, up to three times
  ARCH.chain = {
    cost: 20, cool: 3.2, range: [150, 560], dur: 1,
    start() { sfx('charge'); },
    tick(f, o, a) {
      f.vx = 0; f.charging = a.t < .35; if (a.stop) return;
      const n = a.t >= .85 ? 2 : a.t >= .6 ? 1 : a.t >= .35 ? 0 : -1;
      if (n > (a.n === undefined ? -1 : a.n)) {
        a.n = n; const c = center(o), from = n === 0 ? muzzle(f) : a.last; a.last = { x: c.x, y: c.y };
        spawn({ kind: 'bolt', owner: f, from, to: { x: c.x, y: c.y }, ty: a.ty, life: .3, upd: () => { }, draw: dBolt }); sfx('zap'); shake = Math.max(shake, 4);
        if (a.miss) { floatText(c.x, c.y - 30, 'MISS', '#ddd'); a.stop = true; return; }
        if (Math.abs(f.lp - o.lp) > .6) { floatText(o.x, top(o) - 10, 'EVADED', '#9fe8ff'); a.stop = true; return; }
        const ok = damage(f, o, D(f, n === 0 ? 38 : n === 1 ? 28 : 22), f.face * 240, c, false, a.ty); if (!ok) a.stop = true;
      }
    },
  };
  function dBolt(g, e) {
    const c = cols(e.ty), k = clamp(1 - e.t / .3, 0, 1); let s = Math.floor(e.t * 40) * 9301 + 49297; const R = () => (s = (s * 9301 + 49297) % 233280) / 233280, pts = [[e.from.x, e.from.y]];
    for (let i = 1; i < 6; i++) pts.push([lerp(e.from.x, e.to.x, i / 6) + (R() - .5) * 40, lerp(e.from.y, e.to.y, i / 6) + (R() - .5) * 40]); pts.push([e.to.x, e.to.y]);
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round'; g.lineCap = 'round'; g.globalAlpha = k;
    for (const [w, col] of [[10, c[1]], [4, '#fff'], [1.5, '#fff']]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }
    glow(g, e.to.x, e.to.y, 40, c, k); g.restore();
  }

  // ---- 13. delayed bomb: lobbed at the foe, goes off after a fuse; a flying foe gets it as an air burst instead
  ARCH.bomb = {
    cost: 20, cool: 4.5, range: [150, 650], dur: .55,
    start() { sfx('shot'); },
    tick(f, o, a) { f.vx = 0; if (!a.done && a.t >= .2) { a.done = true; const m = muzzle(f), air = o.z + o.lift > 90, tx = clamp(o.x + (a.miss ? (Math.random() < .5 ? -1 : 1) * rnd(230, 300) : 0), WALL_L + 40, WALL_R - 40); spawn({ kind: 'bomb', owner: f, x0: m.x, y0: m.y, x: m.x, y: m.y, tx, ty2: air ? center(o).y : floorY(f) - 12, air, lane: f.lp, ty: a.ty, life: air ? .8 : 2.4, upd: uBomb, draw: dBomb }); } },
  };
  function uBomb(e) {
    const u = clamp(e.t / .55, 0, 1); if (u < 1) { e.x = lerp(e.x0, e.tx, u); e.y = lerp(e.y0, e.ty2, u) - Math.sin(u * Math.PI) * (e.air ? 30 : 170); }
    if ((e.air && u >= 1) || e.t >= 2) { boom(e.x, e.y, e.air ? 120 : 135, cols(e.ty)[1], 18); aoe(e.owner, e.x, e.y, e.air ? 120 : 135, D(e.owner, e.air ? 54 : 64), 480, true, null, e.ty); return false; }
  }
  function dBomb(g, e) {
    const c = cols(e.ty), fuse = e.air ? 0 : clamp((e.t - .55) / 1.45, 0, 1); g.save(); if (!e.air) { shadow(g, e.x, e.owner, 14); if (e.t > .55) { g.strokeStyle = `rgba(255,70,50,${.3 + .5 * fuse})`; g.lineWidth = 3; g.beginPath(); g.ellipse(e.x, GROUND + 8 + laneY(e.owner), 135 * fuse, 135 * fuse * .2, 0, 0, 6.283); g.stroke(); } }
    g.fillStyle = '#26202c'; g.beginPath(); g.arc(e.x, e.y, 15, 0, 6.283); g.fill(); g.strokeStyle = c[1]; g.lineWidth = 3; g.stroke(); g.strokeStyle = '#ddd'; g.lineWidth = 2; g.beginPath(); g.moveTo(e.x + 5, e.y - 13); g.lineTo(e.x + 10, e.y - 22); g.stroke(); glow(g, e.x + 10, e.y - 23, 9 + Math.sin(e.t * 40) * 3, ['#ffa030', '#ffd34d']); g.restore();
  }

  // ---- 14. life tether: a beam that drains HP over time while the foe is in range and your lane
  ARCH.tether = {
    cost: 18, cool: 5, range: [100, 520], dur: 1.5,
    start(f, o, a) { spawn({ kind: 'tether', owner: f, act: a, ty: a.ty, life: 1.6, upd: e => e.owner.act === e.act && !e.owner.dead, draw: dTether }); sfx('charge'); },
    tick(f, o, a) {
      f.vx = 0; f.charging = true;
      if (a.t >= .3 && a.t < 1.4 && !o.dead) {
        const ok = Math.abs(f.lp - o.lp) <= .6 && Math.abs(o.x - f.x) < 580; a.live = ok;
        if (ok && !a.miss && a.t >= (a.nt || .3)) { a.nt = a.t + .35; const hp0 = o.hp; if (damage(f, o, D(f, 12), f.face * 60, center(o), false, a.ty)) { const g = Math.max(0, hp0 - o.hp) * .7; f.hp = Math.min(f.maxhp, f.hp + g); floatText(f.x, top(f) - 8, '+' + Math.round(g), '#7dff9a', 20); } }
      } else a.live = false;
    },
  };
  function dTether(g, e) {
    const f = e.owner, o = other(f), a = e.act; if (!a || !a.live) return; const c = cols(e.ty), p0 = muzzle(f), p1 = center(o);
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (const [w, col, al] of [[12, c[1], .35], [4, '#fff', .9]]) { g.strokeStyle = col; g.lineWidth = w; g.globalAlpha = al; g.beginPath(); for (let i = 0; i <= 14; i++) { const u = i / 14; g.lineTo(lerp(p0.x, p1.x, u), lerp(p0.y, p1.y, u) + Math.sin(u * 12 - now * 20) * 10 * Math.sin(u * Math.PI)); } g.stroke(); }
    for (let i = 0; i < 3; i++) { const u = 1 - ((now * 1.6 + i / 3) % 1); glow(g, lerp(p0.x, p1.x, u), lerp(p0.y, p1.y, u), 10, c); } g.restore();
  }

  // ---- 15. charge orb: the more ki you hold, the bigger it gets (level 3 pierces)
  ARCH.charge = {
    cost: 12, cool: 4.5, range: [200, 800], dur: 1.2,
    start(f, o, a) { a.lvl = f.ki >= 70 ? 3 : f.ki >= 40 ? 2 : 1; a.fire = .3 + .22 * a.lvl; spawn({ kind: 'chg', owner: f, act: a, ty: a.ty, life: 1.5, upd: e => e.owner.act === e.act && !e.act.done && !e.owner.dead, draw: dChg }); sfx('charge'); },
    tick(f, o, a) {
      f.vx = 0; f.charging = true;
      if (!a.done && a.t >= a.fire) { a.done = true; f.ki = Math.max(0, f.ki - (a.lvl - 1) * 12); const m = muzzle(f); spawn({ kind: 'bigorb', owner: f, x: m.x, y: m.y, vx: f.face * 600, lane: f.lp, ty: a.ty, miss: a.miss, lvl: a.lvl, r: 16 + 9 * a.lvl, dmg: D(f, 30 + 24 * a.lvl), life: 2, upd: uBig, draw: dBig }); sfx('shot'); shake = Math.max(shake, 4 + 3 * a.lvl); floatText(f.x, top(f) - 10, 'LV ' + a.lvl, cols(a.ty)[1], 22); }
    },
  };
  function uBig(e, dt) {
    e.x += e.vx * dt; pushTr(e); if (e.x < WALL_L - 60 || e.x > WALL_R + 60) return false;
    if (!e.hit && touch(e, e.r)) { e.hit = true; strike(e, e.dmg, 380 + 100 * e.lvl, e.lvl >= 2); boom(e.x, e.y, 60 + 25 * e.lvl, cols(e.ty)[1], 8 + 3 * e.lvl); if (e.lvl < 3) return false; }
  }
  function dBig(g, e) { const c = cols(e.ty); trailDraw(g, e, c, e.r * 1.6); glow(g, e.x, e.y, e.r * 2.2, c); g.fillStyle = '#fff'; g.beginPath(); g.arc(e.x, e.y, e.r * .55, 0, 6.283); g.fill(); }
  function dChg(g, e) { const f = e.owner, a = e.act, m = muzzle(f), k = clamp(a.t / a.fire, 0, 1), c = cols(e.ty), r = (8 + 14 * a.lvl) * k; glow(g, m.x, m.y, r * 2.2, c); g.fillStyle = '#fff'; g.beginPath(); g.arc(m.x, m.y, r * .5, 0, 6.283); g.fill(); g.fillStyle = c[1]; g.font = 'bold 14px sans-serif'; g.textAlign = 'center'; g.fillText('LV' + a.lvl, m.x, m.y - r * 1.3 - 6); }

  // ---- 16. trail dash: rushes through the foe leaving a burning, poisoned or frozen strip on the floor
  ARCH.trail = {
    cost: 8, cool: 3, range: [150, 650], dur: .55,
    start(f, o, a) { a.lx = f.x; sfx('whip'); },
    tick(f, o, a, dt) {
      ARCH.dash.tick(f, o, a, dt);
      if (a.t >= .1 && a.t < .4 && Math.abs(f.x - a.lx) > 48) { a.lx = f.x; spawn({ kind: 'patch', owner: f, x: f.x, lane: f.lp, ty: a.ty, cd: .1, life: 5.5, upd: uPatch, draw: dPatch }); }
    },
  };
  function uPatch(e, dt) {
    const o = other(e.owner); e.cd -= dt; if (e.cd > 0 || o.dead) return;
    if (o.z + o.lift < 50 && Math.abs(o.x - e.x) < o.w * .34 + 26 && Math.abs(e.lane - o.lp) <= .8) { e.cd = .6; damage(e.owner, o, D(e.owner, 7), 0, center(o), false, e.ty); const st = STATUS_ON_HIT[e.ty]; if (st && !statusy(o) && Math.random() < .35) applyStatus(o, st[0], false, e.owner); }
  }
  function dPatch(g, e) { const c = cols(e.ty), gy = GROUND + 4 + laneY(e.owner), k = clamp((e.life - e.t) / .6, 0, 1); g.save(); g.globalAlpha = k; for (let i = 0; i < 3; i++) glow(g, e.x + (i - 1) * 14, gy - 8 - Math.abs(Math.sin(now * 9 + e.x * .1 + i)) * 14, 16, c, .9); g.restore(); }

  // ---- registration: tables the rest of the game reads for every move
  const NEW = {
    bounce: ['arrow-collapse-down', 14, 'Skips along the floor; ducking does not help'], boomer: ['sync', 14, 'Hits going out and coming back'], seeker: ['crosshairs-gps', 16, 'A slow orb that follows the foe'],
    split: ['creation', 14, 'One orb that bursts into three'], gravity: ['atom', 20, 'A well that drags the foe in, then collapses'], mark: ['bullseye-arrow', 18, 'Marks the floor; leave before it detonates'],
    mine: ['bomb', 16, 'A hidden mine, up to two at once'], orbit: ['rotate-orbit', 18, 'Orbs soak hits and fire at the foe'], decoy: ['ninja', 16, 'A clone that shoots and soaks 3 shots'],
    pushpull: ['swap-horizontal', 16, 'Shoves the foe away, then pulls it back'], wall: ['anvil', 18, 'A wall that blocks shots and walking'], chain: ['flash-alert', 20, 'A bolt that jumps up to 3 times'],
    bomb: ['meteor', 20, 'A lobbed bomb with a fuse (air burst on flyers)'], tether: ['heart-flash', 18, 'Drains HP while the foe stays in range'], charge: ['battery-charging', 20, 'More ki held means a bigger orb (LV3 pierces)'],
    trail: ['fire-circle', 14, 'A fast rush that leaves a damaging trail'],
  };
  for (const k in NEW) { const n = NEW[k]; ARCH_ICON[k] = n[0]; STA[k] = n[1]; DESC[k] = n[2]; BASE_SCORE[k] = 5; ANIM_OF[k] = ['bounce', 'boomer', 'seeker', 'split', 'bomb', 'mark', 'chain', 'charge', 'tether', 'trail'].includes(k) ? ['Shoot'] : ['Charge', 'Shoot']; }
  Object.assign(ALERT_LEN, { bounce: 500, boomer: 500, seeker: 500, split: 500, chain: 450, bomb: 600, tether: 500, charge: 800, gravity: 600 });
  for (const k of ['seeker', 'chain', 'charge', 'bounce', 'split']) AIM_KEYS.add(k);
  for (const k of ['bounce', 'boomer', 'seeker', 'split', 'chain', 'bomb', 'charge']) PROJ_KEYS.add(k);
  CANCEL_KEYS.add('trail'); CONTACT_SP.add('trail');

  // which moves suit which type: every Pokémon gets one in its default three and sometimes a second one in its list
  const VX = {
    normal: ['decoy', 'pushpull', 'charge', 'bounce'], fire: ['trail', 'bomb', 'charge', 'seeker'], water: ['bounce', 'tether', 'gravity', 'pushpull'], grass: ['tether', 'mine', 'split', 'seeker'],
    electric: ['chain', 'orbit', 'seeker', 'boomer'], ice: ['wall', 'split', 'mark', 'boomer'], fighting: ['charge', 'pushpull', 'mark', 'boomer'], poison: ['mine', 'tether', 'bomb', 'gravity'],
    ground: ['mine', 'wall', 'bounce', 'gravity'], flying: ['boomer', 'pushpull', 'seeker', 'split'], psychic: ['gravity', 'mark', 'orbit', 'decoy'], bug: ['split', 'mine', 'tether', 'seeker'],
    rock: ['bounce', 'wall', 'bomb', 'mine'], ghost: ['decoy', 'mark', 'gravity', 'seeker'], dragon: ['charge', 'orbit', 'bomb', 'seeker'], dark: ['decoy', 'mark', 'tether', 'boomer'],
    steel: ['wall', 'boomer', 'mine', 'orbit'], fairy: ['orbit', 'seeker', 'decoy', 'pushpull'],
  };
  const NAMES = {
    bounce: { water: 'Bubble Bounce', rock: 'Rock Skip', ground: 'Mud Skip', _: 'Bounce Shot' }, boomer: { flying: 'Air Boomerang', steel: 'Blade Boomerang', dark: 'Dark Boomerang', _: 'Boomerang' },
    seeker: { fire: 'Seeking Flame', ghost: 'Wisp Seeker', fairy: 'Moon Seeker', _: 'Seeker Orb' }, split: { bug: 'Needle Split', ice: 'Shard Split', grass: 'Seed Split', _: 'Split Shot' },
    gravity: { ghost: 'Soul Well', poison: 'Toxic Sink', _: 'Gravity Well' }, mark: { psychic: 'Future Mark', ghost: 'Curse Mark', dark: 'Hunter Mark', ice: 'Frost Mark', _: 'Target Mark' },
    mine: { poison: 'Toxic Mine', ground: 'Land Mine', steel: 'Steel Mine', rock: 'Rock Mine', bug: 'Web Mine', grass: 'Spore Mine', _: 'Hidden Mine' },
    orbit: { electric: 'Static Orbit', dragon: 'Dragon Orbit', fairy: 'Fairy Orbit', steel: 'Steel Orbit', _: 'Orbit Shield' }, decoy: { normal: 'Double Team', ghost: 'Shadow Clone', psychic: 'Mirror Image', dark: 'Shadow Clone', fairy: 'Glitter Clone', _: 'Decoy' },
    pushpull: { flying: 'Gale Force', fighting: 'Shockwave Push', fairy: 'Charm Pull', normal: 'Roar Wave', _: 'Push and Pull' }, wall: { ice: 'Ice Wall', rock: 'Stone Wall', ground: 'Earth Wall', steel: 'Iron Wall', _: 'Energy Wall' },
    chain: { _: 'Chain Bolt' }, bomb: { fire: 'Fire Bomb', poison: 'Sludge Bomb', rock: 'Rock Bomb', dragon: 'Draco Bomb', _: 'Delayed Bomb' },
    tether: { grass: 'Leech Tether', poison: 'Venom Tether', bug: 'Silk Tether', dark: 'Dark Tether', _: 'Life Tether' }, charge: { fighting: 'Focus Blast', dragon: 'Dragon Charge', normal: 'Power Orb', _: 'Charge Orb' },
    trail: { fire: 'Fire Trail', poison: 'Toxic Trail', ice: 'Ice Slick', water: 'Water Trail', electric: 'Spark Trail', _: 'Trail Dash' },
  };
  const mk = (key, type) => ({ key, name: NAMES[key][type] || NAMES[key]._, type, sc: 98, pw: 70, sta: Math.round(STA[key] * 2.16), acc: fixAcc(), icon: ARCH_ICON[key] });
  const _bk = buildKit;
  buildKit = function (p) {
    const had = kitCache[p.id], kit = _bk(p); if (had || kit.vx) return kit; kit.vx = 1;
    const t0 = kit.types[0], t1 = kit.types[1] || t0, pool = kit.pool, l0 = VX[t0] || VX.normal, l1 = VX[t1] || l0;
    pool.splice(Math.min(2, pool.length), 0, mk(l0[p.id % 4], t0));
    const k2 = l1[(p.id + 1) % 4]; if (p.id % 2 === 0 && !pool.some(s => s.key === k2)) pool.push(mk(k2, t1));
    kit.specials = pool.slice(0, 3); return kit;
  };
  try { // one-time: saved move choices keep pointing at the same moves now that one new move sits in slot 3
    if (!localStorage.getItem('pf_vx1')) { for (const id in loadouts) loadouts[id] = loadouts[id].map(i => i >= 2 ? i + 1 : i); localStorage.setItem('pf_loadouts', JSON.stringify(loadouts)); localStorage.setItem('pf_vx1', '1'); }
  } catch (e) { }

  // two charges: the first cast of these only costs a short cooldown, the second pays the full one
  V.coolFor = (f, i, A) => { if (!A.twice) return A.cool; const t = vr(f).tw; if (t[i] && now - t[i] < 4) { t[i] = 0; return A.cool; } t[i] = now; return .5; };
  V.moveTick = (f, dt) => orbitFire(f, dt);
  V.moveReset = () => { };
})();
