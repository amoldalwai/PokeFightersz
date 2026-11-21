// Sprite look-alikes (Cotton / Tales / FireRed-LeafGreen sheets, recoloured per type) and Dragon Ball sounds for the generic moves.
// Every move keeps its classic look; a use picks the sprite variation at random (SPFX.pick). Effects are drawn in world coordinates;
// the artwork was designed in mockup pixels, so shapes are drawn inside g.scale(Z) around their anchor (see mockups/move_fx).
window.SPFX = (() => {
  const Z = 1.154, K = 2.2, TAU = Math.PI * 2, S = { T: 0, dim: 0, flash: 0, low: false };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), lerp = (a, b, k) => a + (b - a) * k, ease = u => 1 - (1 - clamp(u)) ** 2;
  const img = s => { const i = new Image(); i.src = s; return i; };
  const IM = { c: img('assets/spfx/cotton.png'), t: img('assets/spfx/tales_t.png'), wb: img('assets/spfx/wave.png') };
  let H = { FX: {}, muted: () => false, low: () => false, G: () => 515, laneY: () => 0 };
  const TH = { normal: [40, .12, 1.25], fire: [22, 1.1, 1.05], water: [215, 1.25, 1], electric: [52, 1.1, 1.15], grass: [112, 1, .95], ice: [190, .9, 1.2], fighting: [8, 1.1, .9], poison: [285, 1, .9], ground: [36, .7, .85], flying: [205, .5, 1.3], psychic: [325, 1.1, 1.05], bug: [78, 1, .9], rock: [38, .5, .85], ghost: [270, .9, .7], dragon: [255, 1.2, .95], dark: [265, .6, .5], steel: [215, .15, 1.15], fairy: [330, .6, 1.25] };
  const TC = { normal: '#e8e4d0', fire: '#ff8a2a', water: '#4aa8ff', electric: '#ffe01a', grass: '#5ed85a', ice: '#8fe6ff', fighting: '#e0602a', poison: '#b050e0', ground: '#c89a50', flying: '#b8ccff', psychic: '#ff6adf', bug: '#a8c820', rock: '#b8a070', ghost: '#8a5ad0', dragon: '#7a5aff', dark: '#6a4a8a', steel: '#c0ccdc', fairy: '#ffa8dc' };
  const split = (x, y, w, h, n) => Array.from({ length: n }, (_, i) => [Math.round(x + i * w / n), y, Math.round(w / n), h]);
  const FR = {
    comet: [[5, 3, 41, 24], [46, 3, 42, 24]], burst: [[132, 7, 40, 41], [238, 7, 36, 39], [287, 5, 42, 44], [340, 4, 41, 45], [392, 4, 41, 45], [442, 3, 42, 47]],
    flame: [[8, 53, 42, 59], [58, 53, 44, 59], [266, 55, 43, 57], [320, 60, 42, 59], [370, 59, 44, 54]], boom: split(92, 221, 203, 51, 4),
    star: [[380, 425, 32, 35], [423, 424, 34, 37], [465, 423, 38, 40]], ice: [[163, 709, 42, 51], [218, 712, 35, 44], [268, 710, 40, 49], [423, 709, 41, 50], [477, 711, 37, 46], [528, 711, 39, 46]],
    iceStrip: split(416, 816, 172, 20, 4), sparkle: split(182, 665, 330, 43, 13), bolt: [[207, 10, 9, 75], [226, 10, 16, 75], [166, 9, 24, 75]],
  };
  const BASE = { comet: 25, burst: 28, flame: 30, boom: 28, star: 55, ice: 195, iceStrip: 195, sparkle: 55, wind: 110 }, RW = [0, 0, 128, 64];
  const an = (name, u) => { const a = FR[name]; return a[Math.min(a.length - 1, Math.floor(clamp(u) * a.length))]; };
  function autoFrames(sheet, rect, minGap = 2) { // splits a strip into frames wherever a few empty columns separate the drawings
    const [x, y, w, h] = rect, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(IM[sheet], x, y, w, h, 0, 0, w, h); const d = g.getImageData(0, 0, w, h).data, col = new Array(w).fill(0);
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (d[(yy * w + xx) * 4 + 3] > 40) col[xx]++;
    const out = []; let s = -1, gap = 0; for (let xx = 0; xx <= w; xx++) { const on = xx < w && col[xx] > 0; if (on) { if (s < 0) s = xx; gap = 0; } else if (s >= 0) { gap++; if (gap >= minGap || xx === w) { const e = xx - gap + 1; if (e - s >= 6) out.push([x + s, y, e - s, h]); s = -1; gap = 0; } } } (window.__AF = window.__AF || {})[sheet + ':' + rect + ':' + minGap] = out; return out;
  }
  const AUTO = {}, ready = () => IM.c.naturalWidth > 0 && IM.t.naturalWidth > 0 && IM.wb.naturalWidth > 0;
  const wind = n => AUTO['w' + n] || (IM.c.naturalWidth ? (AUTO['w' + n] = autoFrames('c', n ? [4, 1030, 559, 50] : [4, 973, 559, 50])) : []);
  const orbF = () => AUTO.orb || (IM.c.naturalWidth ? (AUTO.orb = autoFrames('c', [4, 1166, 605, 52]).filter(r => r[2] >= 28)) : []);
  const leafF = () => AUTO.leaf || (IM.c.naturalWidth ? (AUTO.leaf = autoFrames('c', [0, 924, 612, 50]).filter(r => r[2] >= 24)) : []);
  const flameF = () => AUTO.fl || (IM.c.naturalWidth ? (AUTO.fl = autoFrames('c', [0, 520, 612, 56]).concat(autoFrames('c', [0, 580, 612, 42])).filter(r => r[2] >= 30)) : []);
  function tinted(sheet, rect, ty, base, mode = 'hue') { // one recoloured copy per piece and type, kept on the rectangle itself
    const k = ty + mode, cc = rect._c || (rect._c = {}); if (cc[k]) return cc[k]; const im = IM[sheet]; if (!im.naturalWidth) return null;
    const [x, y, w, h] = rect, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), [hu, sa, br] = TH[ty] || TH.fire;
    if (mode === 'hue') { g.filter = `hue-rotate(${Math.round(hu - base)}deg) saturate(${sa}) brightness(${br})`; g.drawImage(im, x, y, w, h, 0, 0, w, h); }
    else { g.drawImage(im, x, y, w, h, 0, 0, w, h); g.globalCompositeOperation = 'multiply'; g.fillStyle = TC[ty]; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'destination-in'; g.drawImage(im, x, y, w, h, 0, 0, w, h); }
    return cc[k] = c;
  }
  function sp(g, sheet, rect, ty, base, cx, cy, sc, rot = 0, al = 1, mode = 'hue', add = false, flip = 1) {
    const c = tinted(sheet, rect, ty, base, mode); if (!c || al <= 0) return; g.save(); g.translate(cx, cy); if (rot) g.rotate(rot); g.scale(sc * flip, sc); g.globalAlpha = clamp(al); if (add) g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = false; g.drawImage(c, -rect[2] / 2, -rect[3] / 2); g.restore();
  }
  const at = (g, x, y, fn) => { g.save(); g.translate(x, y); g.scale(Z, Z); fn(); g.restore(); };
  function glow(g, x, y, r, ty, a = 1) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, '#fff'); gr.addColorStop(.3, TC[ty]); gr.addColorStop(1, TC[ty] + '00'); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = clamp(a); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore(); }
  function ringFx(g, x, y, r, ty, a, w = 6, sy = 1) { if (a <= 0) return; g.save(); g.translate(x, y); g.scale(1, sy); g.globalCompositeOperation = 'lighter'; g.globalAlpha = clamp(a); g.strokeStyle = TC[ty]; g.lineWidth = w; g.beginPath(); g.arc(0, 0, Math.max(1, r), 0, TAU); g.stroke(); g.lineWidth = w * .35; g.strokeStyle = '#fff'; g.stroke(); g.restore(); }
  function sphereFx(g, x, y, r, ty, a = 1) { if (a <= 0) return; glow(g, x, y, r * 1.9, ty, a * .55); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, '#fff'); gr.addColorStop(.45, TC[ty]); gr.addColorStop(1, TC[ty] + '00'); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = clamp(a); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore(); }
  function burstAt(g, x, y, tt, ty, sc = 1) { // small impact: flame burst, expanding ring, sparks
    if (tt < 0 || tt > .5) return; glow(g, x, y, 90 * sc, ty, (1 - tt * 2) * .8); sp(g, 'c', an('burst', tt / .4), ty, BASE.burst, x, y, K * 1.2 * sc, 0, 1 - tt * 1.2); ringFx(g, x, y, (20 + tt * 170) * sc, ty, 1 - tt * 2, 5);
    for (let i = 0; i < (S.low ? 3 : 7); i++) { const a = i * 0.9 + 1, d = tt * 200 * sc * (.6 + i % 3 * .25); sp(g, 'c', an('star', i / 7), ty, BASE.star, x + Math.cos(a) * d, y + Math.sin(a) * d, K * .5 * sc, 0, 1 - tt * 2, 'hue', true); }
  }
  function boomAt(g, x, y, tt, ty, sc = 1) { // big explosion: fireball frames, shock ring, white flash, flying sparks
    if (tt < 0 || tt > .9) return; const u = tt / .8; glow(g, x, y, 190 * sc, ty, (1 - u) * .9);
    sp(g, 'c', an('boom', u), ty, BASE.boom, x, y - 20 * sc, K * 2.6 * sc, 0, 1 - u * .5); ringFx(g, x, y + 30 * sc, (30 + u * 230) * sc, ty, 1 - u, 8, .32);
    if (tt < .15) sphereFx(g, x, y, (50 + tt * 500) * sc, 'normal', 1 - tt * 6);
    for (let i = 0; i < (S.low ? 4 : 9); i++) { const a = i * .7, d = u * 260 * sc * (.5 + i % 4 * .2); sp(g, 'c', an('star', (i * .3) % 1), ty, BASE.star, x + Math.cos(a) * d, y - 20 + Math.sin(a) * d * .8 + u * u * 80, K * .6 * sc, 0, 1 - u, 'hue', true); }
  }
  const okTy = ty => TC[ty] ? ty : 'normal';
  function glowC(g, x, y, r, col, a = 1) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, '#fff'); gr.addColorStop(.3, col); gr.addColorStop(1, col + '00'); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = clamp(a); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore(); }
  function ringHalf(g, x, y, r, cP, cE, a, w, sy = 1) { if (a <= 0) return; g.save(); g.translate(x, y); g.scale(1, sy); g.globalCompositeOperation = 'lighter'; g.globalAlpha = clamp(a); g.lineWidth = w; g.strokeStyle = cP; g.beginPath(); g.arc(0, 0, Math.max(1, r), Math.PI / 2, Math.PI * 1.5); g.stroke(); g.strokeStyle = cE; g.beginPath(); g.arc(0, 0, Math.max(1, r), -Math.PI / 2, Math.PI / 2); g.stroke(); g.lineWidth = w * .3; g.strokeStyle = '#fff'; g.beginPath(); g.arc(0, 0, Math.max(1, r), 0, TAU); g.stroke(); g.restore(); }
  function boltFx(g, x0, y0, x1, y1, seed, w = 1) { let s = seed; const R = () => (s = (s * 9301 + 49297) % 233280) / 233280, pts = [[x0, y0]]; for (let k = 1; k < 6; k++) pts.push([lerp(x0, x1, k / 6) + (R() - .5) * 40, lerp(y0, y1, k / 6) + (R() - .5) * 40]); pts.push([x1, y1]); g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round'; for (const [lw, col] of [[9 * w, 'rgba(160,200,255,.3)'], [3.5 * w, '#cfe6ff'], [1.3 * w, '#fff']]) { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); } g.restore(); }
  // ---------------------------------------------------------------- timed things (impacts, explosions, splashes, the funnel that carries the foe)
  let fxl = [];
  const addFx = o => { if (fxl.length > 36) fxl.shift(); o.t = 0; fxl.push(o); };
  function drawFunnel(g, x, gy, grow, fade, ty) {
    const fr = wind(0), fr2 = wind(1); if (!fr.length) return; const all = fr.concat(fr2), n = S.low ? 7 : 12, t = S.T;
    at(g, x, gy, () => {
      ringFx(g, 0, 0, 140 * grow, ty, .5 * fade, 8, .26);
      for (let i = 0; i < n; i++) { const k = i / (n - 1), y = -8 - k * 230 * grow, sway = Math.sin(t * 8 - k * 5) * (14 + k * 36); sp(g, 'c', all[(i * 3 + Math.floor(t * 14)) % all.length], ty, BASE.wind, sway, y, K * (.55 + k * .9) * grow, Math.sin(t * 9 + i) * .15, (.4 + .3 * (1 - k)) * fade, 'hue', k > .6, i % 2 ? -1 : 1); }
      if (!S.low) for (let i = 0; i < 6; i++) { const ph = (t * 1.6 + i / 6) % 1, a = ph * TAU * 2 + i, r = 30 + ph * 90; sp(g, 'c', FR.sparkle[(i * 2) % 13], ty, BASE.sparkle, Math.cos(a) * r, -30 - ph * 200, K * .5, 0, (1 - ph) * fade, 'hue', true); }
    });
  }
  function drawFx(g, o) {
    const t = o.t, ty = o.ty;
    if (o.k === 'burst') at(g, o.x, o.y, () => burstAt(g, 0, 0, t, ty, o.sc));
    else if (o.k === 'boom') at(g, o.x, o.y, () => boomAt(g, 0, 0, t, ty, o.sc));
    else if (o.k === 'muzzle') at(g, o.x, o.y, () => sphereFx(g, 0, 0, 34 * (1 - t / .15) + 10, ty, 1 - t / .15));
    else if (o.k === 'splash') at(g, o.x, o.y, () => { glow(g, 0, 0, 150, ty, (1 - t / .8) * .5); for (let i = 0; i < (S.low ? 8 : 16); i++) { const a = -Math.PI / 2 + (i - 7.5) * .14 * (S.low ? 2 : 1), d = t * (260 + (i % 4) * 50); g.save(); g.globalAlpha = 1 - t / .8; g.fillStyle = i % 2 ? '#fff' : '#bfe4ff'; g.beginPath(); g.arc(Math.cos(a) * d * .6, 40 + Math.sin(a) * d - t * t * 340, 3 + i % 3, 0, TAU); g.fill(); g.restore(); } });
    else if (o.k === 'land') at(g, o.x, o.gy, () => {
      const h = t; sp(g, 'c', an('star', h / .4), o.ice ? 'ice' : ty, BASE.star, 0, -18, K * 1.5, 0, 1 - h * 2, 'hue', true); if (!o.ice) ringFx(g, 0, 0, 20 + h * 150, 'ground', 1 - h * 2, 5, .3);
      for (let k = 0; k < 4; k++) { const px = (k - 1.5) * h * (o.ice ? 150 : 110), py = -20 - Math.sin(h * (o.ice ? 7 : 8) + k) * (o.ice ? 50 : 60) * (1 - h);
        if (o.ice) sp(g, 'c', FR.ice[(k + 1) % 6], 'ice', BASE.ice, px, py, K * .6, h * 8 + k, 1 - h * 2.5);
        else { const im = H.FX['rock' + (1 + k % 3)]; if (im && im.naturalWidth) { g.save(); g.globalAlpha = clamp(1 - h * 2); g.translate(px, py); g.rotate(h * 9 + k); g.drawImage(im, -11, -11, 22, 22); g.restore(); } } }
    });
    else if (o.k === 'funnel') { // the foe is caught, spun round and dropped; sparks circle its head once it lands
      const f = o.foe, fade = t > 1.45 ? 1 - (t - 1.45) / .4 : 1; drawFunnel(g, f.x, o.gy, ease(t / .3), fade, ty);
      if (t > 1.3) { const k = (t - 1.3) / .6; at(g, f.x, o.gy, () => ringFx(g, 0, 0, 20 + k * 120, 'ground', 1 - k, 5, .28)); at(g, f.x, o.gy - f.h - 6, () => { for (let s = 0; s < 3; s++) { const a = t * 9 + s * 2.1; sp(g, 'c', FR.sparkle[(s * 4 + Math.floor(t * 10)) % 13], 'electric', BASE.sparkle, Math.cos(a) * 46, Math.sin(a) * 10, K * .55, 0, 1 - k * .6, 'hue', true); } }); }
    }
  }
  const FX_LEN = { burst: .5, boom: .9, muzzle: .15, splash: .8, land: .5, funnel: 1.9 };
  // ---------------------------------------------------------------- sounds (HTMLAudio: the app serves the game from file://, where fetch() is not allowed)
  const SND = {
    kiblast: [['dragon_ball_ki_blast', 'voicy_ki_blast'], 1.4, .7], charge1: [['charged_ki_blast_v1', 'voicy_small_aura_burst'], 1.2, .7], release: [['dragon_ball_z_huge_ki_blast'], 2.4, .8],
    boom: [['explosion_dragon_ball_z'], 1.8, .8], boom2: [['anime_explosion_one_piece_dragon_ball', 'explosion_dragon_ball_z'], 2.4, .85], bcharge: [['dragon_ball_kamehameha_charge', 'voicy_beam_charge_a'], 1.6, .75],
    wave: [['kamehameha_wave_dragon_ball_z'], 2.4, .85], ss2: [['voicy_ss2'], 1.0, .7], punch: [['dragon_ball_z_super_strong_punch'], 1.2, .8], hand: [['dragon_ball_z_piccolo_demon_hand'], 1.0, .75],
  };
  const aud = {}, live = [], url = f => 'assets/snd/' + f + '.mp3', VOL = .55;
  const getAud = f => aud[f] || (aud[f] = (() => { const a = new Audio(url(f)); a.preload = 'auto'; return a; })());
  function snd(name, alive) { // a sound lives only while its move does: alive() false (cancelled, projectile gone, beam over) fades it out; every sound also has a length cap
    const d = SND[name]; if (!d || H.muted()) return; const f = d[0][Math.floor(Math.random() * d[0].length)]; let a = getAud(f);
    if (!a.paused && !a.ended) a = new Audio(url(f));
    try { a.currentTime = 0; } catch (e) { } a.volume = clamp(d[2] * VOL * (H.vol ? H.vol() : 1)); const p = a.play(); if (p && p.catch) p.catch(() => { });
    live.push({ a, born: performance.now(), alive, cut: d[1] * 1000, v: a.volume, fade: false }); if (live.length > 12) kill(live.shift());
  }
  function kill(l) { try { l.a.pause(); } catch (e) { } }
  function sndTick() {
    const nw = performance.now();
    for (let i = live.length - 1; i >= 0; i--) { const l = live[i];
      if (!l.fade && ((l.alive && !l.alive()) || nw - l.born > l.cut || H.muted())) l.fade = true;
      if (l.fade) { l.v *= .72; try { l.a.volume = clamp(l.v); } catch (e) { } if (l.v < .02) { kill(l); live.splice(i, 1); } } else if (l.a.ended) live.splice(i, 1); }
  }
  // ---------------------------------------------------------------- drawers for the moves
  const OK = { blast: ['fire', 'dragon'], beam: ['fire', 'water', 'electric', 'grass', 'ice', 'psychic', 'normal', 'dark', 'steel', 'fairy'], selfdestruct: ['normal'], wave: ['water'], geyser: ['fire', 'water'], blizzard: ['ice'], tornado: ['water', 'ground', 'rock', 'ice', 'flying'], strike: ['electric'], rain: ['rock'], slash: ['flying', 'steel', 'dark', 'bug'], whirl: ['water', 'normal', 'psychic', 'electric', 'fire', 'bug', 'grass', 'poison', 'fighting', 'dragon', 'dark', 'fairy', 'ghost', 'ice'], minibeam: ['grass', 'psychic', 'water'] };
  const trailAng = p => { const dir = Math.sign(p.vx) || 1; return [dir, Math.atan2(p.vy, Math.abs(p.vx)) * dir]; };
  const API = {
    init(o) { H = Object.assign(H, o); ['dragon_ball_ki_blast', 'voicy_ki_blast', 'dragon_ball_z_huge_ki_blast', 'explosion_dragon_ball_z', 'dragon_ball_kamehameha_charge', 'kamehameha_wave_dragon_ball_z'].forEach(getAud); },
    T() { return S.T; }, ready,
    has(key, ty) { return !!(OK[key] && OK[key].includes(ty)); },
    pick(f, key, ty) { // 0 = the classic look, 1 = the sprite variation; never more than twice in a row
      if (!ready() || !(key === 'shot' || API.has(key, ty))) return 0; if (window.__forceSp !== undefined) return window.__forceSp ? 1 : 0;
      const m = f._spl || (f._spl = {}), last = m[key], v = Math.random() < (last === 1 ? .35 : last === 0 ? .65 : .5) ? 1 : 0; return m[key] = v;
    },
    update(dt) { S.T += dt; S.low = H.low(); for (const o of fxl) o.t += dt; fxl = fxl.filter(o => o.t < FX_LEN[o.k]); S.flash = Math.max(0, S.flash - dt * 6); warmStep(); },
    tick() { sndTick(); warmStep(); },
    draw(g) { for (const o of fxl) drawFx(g, o); },
    screen(g, W, Hh) { // the sky darkens while a lightning strike gathers and flashes white when it lands
      if (S.dim > .01) { g.fillStyle = `rgba(20,20,50,${S.dim})`; g.fillRect(0, 0, W, Hh); } S.dim = 0;
      if (S.flash > .01) { g.fillStyle = `rgba(255,255,230,${clamp(S.flash, 0, .6)})`; g.fillRect(0, 0, W, Hh); }
    },
    reset() { fxl = []; API.stopAll(); }, stopAll() { for (const l of live) kill(l); live.length = 0; },
    snd,
    burst(x, y, ty, sc = 1) { addFx({ k: 'burst', x, y, ty: okTy(ty), sc }); }, boom(x, y, ty, sc = 1) { addFx({ k: 'boom', x, y, ty: okTy(ty), sc }); }, muzzle(x, y, ty) { addFx({ k: 'muzzle', x, y, ty: okTy(ty) }); },
    splash(x, y, ty) { addFx({ k: 'splash', x, y, ty: okTy(ty) }); }, land(x, gy, ice, ty) { addFx({ k: 'land', x, gy, ice, ty: okTy(ty) }); }, funnel(foe, gy, ty) { addFx({ k: 'funnel', foe, gy, ty: okTy(ty) }); },
    flash(v) { S.flash = Math.max(S.flash, v); },
    // ---- beam clash: a swirling energy ball in both colours with rings, sparks and lightning, growing as the struggle goes on
    clash(g, c, tyP, tyE) {
      tyP = okTy(tyP); tyE = okTy(tyE); const cP = TC[tyP], cE = TC[tyE], low = S.low, t = S.T, o = orbF(), tt = c.t, k = .6 + .9 * clamp(c.t / 3.8), win = c.ph === 1 ? clamp(c.rt / .3) : 0, R = (52 + 34 * k + 6 * Math.sin(t * 14)) * .75 * (1 + .3 * win), gl = (H.G() - c.y) / Z;
      at(g, c.x, c.y, () => {
        ringHalf(g, 0, gl + 4, R * 1.6 + 20 * Math.sin(t * 9), cP, cE, .7, 10, .2); ringHalf(g, 0, gl + 4, R * 2.4, cP, cE, .35, 5, .2); glowC(g, 0, gl, R * 2.2, '#ffffff', .22 * k);
        g.save(); g.strokeStyle = 'rgba(20,12,6,.8)'; g.lineWidth = 3; g.beginPath(); for (let i = -5; i <= 5; i++) { const x = i * 38 * (.6 + k * .5), l = 14 + (i % 3) * 8; g.moveTo(x, gl + 6); g.lineTo(x + 8, gl + 6 + l); g.lineTo(x - 5, gl + 6 + l * 2); } g.stroke(); g.restore();
        for (let n = 0; n < (low ? 2 : 3); n++) { const ph = (t * 1.7 + n / 3) % 1; ringHalf(g, 0, 0, R * 1.1 + ph * R * 4.6, cP, cE, (1 - ph) * .9, 13 * (1 - ph) + 2, .9); }
        glowC(g, -R * .35, 0, R * 2.8, cP, .38); glowC(g, R * .35, 0, R * 2.8, cE, .38); glowC(g, 0, 0, R * 2, '#ffffff', .12);
        g.save(); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip(); g.fillStyle = '#10142a'; g.fillRect(-R, -R, R * 2, R * 2); g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 8; i++) { const a = t * (i % 2 ? -3.2 : 3.6) + i * TAU / 8, rr = R * (.38 + .12 * Math.sin(t * 4 + i)); glowC(g, Math.cos(a) * rr, Math.sin(a) * rr, R * .7, i % 2 ? cE : cP, .7); }
        if (o.length) { sp(g, 'c', o[Math.floor(t * 14) % o.length], tyP, BASE.wind, 0, 0, K * R / 38, t * 3, .6, 'hue', true); sp(g, 'c', o[Math.floor(t * 12 + 3) % o.length], tyE, BASE.wind, 0, 0, K * R / 46, -t * 4, .55, 'hue', true); }
        glowC(g, 0, 0, R * .42, '#ffffff', .8); g.restore();
        g.strokeStyle = '#fff'; g.lineWidth = 3; g.globalAlpha = .8; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke(); g.globalAlpha = 1;
        for (let i = 0; i < (low ? 2 : 3); i++) { g.save(); g.rotate(t * (1.1 + i * .45) * (i % 2 ? -1 : 1) + i * 1.05); g.scale(1, .3 + .08 * i); g.globalCompositeOperation = 'lighter'; const rr = R * (1.45 + i * .32); g.lineWidth = 5; g.strokeStyle = i % 2 ? cE : cP; g.globalAlpha = .9; g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.stroke(); g.lineWidth = 1.6; g.strokeStyle = '#fff'; g.stroke();
          for (let s = 0; s < 3; s++) { const a = t * 2.6 * (i % 2 ? -1 : 1) + s * TAU / 3 + i; sp(g, 'c', an('star', (s * .3 + t * 2) % 1), i % 2 ? tyE : tyP, BASE.star, Math.cos(a) * rr, Math.sin(a) * rr, K * .8, a, 1, 'hue', true); } g.restore(); }
        const N = low ? 8 : 22; for (let i = 0; i < N; i++) { const ph = (t * .95 + i * .137) % 1, a = i * 2.399 + t * .25, r = R * .9 + ph * 340; sp(g, 'c', an('star', ph), i % 2 ? tyE : tyP, BASE.star, Math.cos(a) * r, Math.sin(a) * r * .8, K * (.9 * (1 - ph) + .15), a, 1 - ph, 'hue', true); }
        if (!low) for (let i = 0; i < 4; i++) { const a = Math.floor(t * 18) * 1.7 + i * 1.3, l = R + 90 + ((i * 53) % 90); boltFx(g, Math.cos(a) * R, Math.sin(a) * R, Math.cos(a) * l + (i % 2 ? 30 : -30), Math.sin(a) * l, Math.floor(t * 18) * 31 + i * 7, .8); }
        if (tt < .6) for (let i = 0; i < 6; i++) sp(g, 'c', an('burst', tt / .5), i % 2 ? tyE : tyP, BASE.burst, Math.cos(i * 1.05) * R * 1.5, Math.sin(i * 1.05) * R * 1.5, K * 1.2, 0, 1 - tt / .6, 'hue', false);
      });
    },
    // ---- the K button shot: twin helix, two glowing strands spiral round the flight path into a bright core
    shot(g, p) {
      const ty = okTy(p.ty), c = TC[ty], t = p.trail, n = t.length, a = Math.atan2(p.vy, p.vx), nx = -Math.sin(a), ny = Math.cos(a), ph = S.T * 18;
      const [cr, cg, cb] = [1, 3, 5].map(i => parseInt(c.substr(i, 2), 16));
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
      if (n > 1) {
        if (!S.low) for (let i = 1; i < n; i++) { const u = i / (n - 1); g.strokeStyle = `rgba(${cr},${cg},${cb},${u * .3})`; g.lineWidth = Math.max(.5, 11 * u); g.beginPath(); g.moveTo(t[i - 1].x, t[i - 1].y); g.lineTo(t[i].x, t[i].y); g.stroke(); }
        for (const sg of [1, -1]) {
          g.beginPath(); for (let i = 0; i < n; i++) { const off = Math.sin(ph - i * .85) * 16 * sg * (.35 + .65 * i / n); g[i ? 'lineTo' : 'moveTo'](t[i].x + nx * off, t[i].y + ny * off); }
          g.strokeStyle = `rgba(${cr},${cg},${cb},.9)`; g.lineWidth = 7; g.stroke();
          if (!S.low) { g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2.5; g.stroke(); }
        }
      }
      g.restore(); glowC(g, p.x, p.y, 40, c, .9); g.save(); g.fillStyle = '#fff'; g.beginPath(); g.arc(p.x, p.y, 10, 0, TAU); g.fill(); g.restore();
    },
    // ---- big energy ball (Fire Blast, Dragon moves)
    blast(g, p) {
      const ty = okTy(p.ty), [dir, a] = trailAng(p), n = p.trail.length, o = orbF();
      at(g, p.x, p.y, () => {
        if (!S.low) for (let i = 0; i < n - 1; i++) { const j = n - 1 - i; if (j > 6) continue; sp(g, 'c', FR.comet[j % 2], ty, BASE.comet, (p.trail[i].x - p.x) / Z, (p.trail[i].y - p.y) / Z, K * 2.4 * (1 - j * .08), a, .5 - j * .07, 'hue', true, dir); }
        sphereFx(g, 0, 0, 56, ty, 1); if (o.length) sp(g, 'c', o[Math.floor(S.T * 14) % o.length], ty, BASE.wind, 0, 0, K * 1.7, S.T * 3, .95, 'hue', true); sp(g, 'c', FR.comet[Math.floor(S.T * 20) % 2], ty, BASE.comet, -10 * dir, 0, K * 2.4, a, 1, 'hue', false, dir);
      });
    },
    chargeBall(g, m, u, ty) { // the ball gathering in the hands: glow, ring and sparks pulled in
      ty = okTy(ty); at(g, m.x, m.y, () => { sphereFx(g, 0, 0, 14 + 50 * u, ty, .6 + u * .4); ringFx(g, 0, 0, 120 * (1 - ((u * 2.5) % 1)) + 20, ty, u, 4);
        for (let i = 0; i < 5; i++) { const a = i * 1.26 + S.T * 9, r = (1 - u) * 110 + 20; sp(g, 'c', an('star', (i * .3 + S.T * 3) % 1), ty, BASE.star, Math.cos(a) * r, Math.sin(a) * r * .7, K * .55, 0, u, 'hue', true); } });
    },
    // ---- hyper beam: a growing ball with sparks flying in while it charges, explosions rolling on the target while it lasts
    beamCharge(g, m, t, ty, dir) {
      ty = okTy(ty); const u = clamp(t / .9), o = orbF();
      at(g, m.x + 14 * dir, m.y, () => { sphereFx(g, 0, 0, 12 + 70 * u, ty, .6 + .4 * u); if (o.length) sp(g, 'c', o[Math.floor(S.T * 12) % o.length], ty, BASE.wind, 0, 0, K * (.5 + u * 1.9), S.T * 2, .9, 'hue', true); ringFx(g, 0, 0, 150 * (1 - (u * 3 % 1)) + 14, ty, .7, 4);
        if (!S.low) for (let i = 0; i < 6; i++) { const a = i * 1.05 + S.T * 7, r = (1 - ((u * 2 + i * .17) % 1)) * 150 + 12; sp(g, 'c', FR.sparkle[(i * 2) % 13], ty, BASE.sparkle, Math.cos(a) * r, Math.sin(a) * r * .6, K * .8, 0, u * .9, 'hue', true); } });
    },
    beamBoom(g, bm) {
      const ty = okTy(bm.ty || bm.owner.kit.beam.type), fade = clamp((bm.dur - bm.t) / .3); at(g, bm.x, bm.y, () => sphereFx(g, 0, 0, 46, ty, .9 * fade)); if (bm.hit) at(g, bm.endX, bm.endY, () => boomAt(g, 0, 0, bm.t % .45, ty, .65));
    },
    sdCharge(g, x, y, u, ty) { // self-destruct: a pulsing white-hot core
      ty = okTy(ty); u = clamp(u); at(g, x, y, () => { sphereFx(g, 0, 0, 30 + 110 * u * u, ty, .5 + .5 * Math.abs(Math.sin(S.T * 18)));
        for (let i = 0; i < 6; i++) { const a = i * 1.05 + S.T * 6, r = (1 - u) * 130 + 20; sp(g, 'c', an('star', (i * .17 + S.T * 4) % 1), ty, BASE.star, Math.cos(a) * r, Math.sin(a) * r * .8, K * .6, 0, u, 'hue', true); } });
    },
    // ---- geyser / eruption column
    geyser(g, p, gy) {
      const ty = okTy(p.ty), k = (p.t - p.delay) / .6, hL = 270 / Z * ease(k * 3.5) * (1 - Math.max(0, k - .55) / .45), fade = Math.min(1, (1 - k) * 2), sc = clamp(hL / 150, .25, 1.15); if (hL < 4) return;
      at(g, p.x, gy, () => { glow(g, 0, -hL * .5, 170 * sc, ty, .5 * fade); const t = S.T;
        for (let j = 0; j < 4; j++) sp(g, 'c', FR.flame[(Math.floor(t * 16) + j) % 5], ty, BASE.flame, (j % 2 ? 8 : -8), -6 - hL * (j / 3.2), K * (1.9 - j * .28) * sc, 0, fade, 'hue', true);
        ringFx(g, 0, 0, 90, ty, .8 * fade, 7, .28);
        if (!S.low) for (let i = 0; i < 6; i++) { const ph = (t * 1.3 + i * .17) % 1; sp(g, 'c', FR.sparkle[(i * 5 + Math.floor(t * 10)) % 13], ty, BASE.sparkle, Math.sin(i * 3) * 60, -30 - ph * hL * 1.1, K * .7, 0, (1 - ph) * fade, 'hue', true); } });
    },
    // ---- falling rocks / ice
    rock(g, r, gy, ty) {
      ty = okTy(ty); const u = clamp((r.y + 90) / (gy + 90)), t = S.T, n = Math.floor(r.x);
      if (r.style === 'ice') at(g, r.x, r.y, () => { sp(g, 'c', FR.ice[n % 6], ty, BASE.ice, 0, 0, K * 1.5, .25 + Math.sin(n) * .2); if (!S.low) sp(g, 'c', FR.iceStrip[n % 4], ty, BASE.iceStrip, -18, -52, K * 1.1, Math.PI / 2 + .25, .5, 'hue', true); });
      else {
        g.save(); g.fillStyle = `rgba(0,0,0,${.35 * u})`; g.beginPath(); g.ellipse(r.x, gy + 6, 34 * u * Z, 9 * u * Z, 0, 0, TAU); g.fill(); g.restore();
        const im = H.FX['rock' + (1 + n % 3)]; g.save(); g.translate(r.x, r.y); g.rotate(r.t * 6 + n); if (im && im.naturalWidth) g.drawImage(im, -39, -39, 78, 78); g.restore();
        at(g, r.x, r.y, () => { glow(g, 0, -20, 60, 'fire', .35 * u); if (!S.low) sp(g, 'c', FR.comet[0], 'rock', BASE.comet, 18, -52, K * .9, -Math.PI / 2 + .3, .45, 'hue', true); });
      }
    },
    // ---- whirlwind: a funnel of wind blades that carries the foe
    gust(g, p) { drawFunnel(g, p.x, H.G() + H.laneY(p.owner), 1, 1, okTy(p.ty)); },
    // ---- lightning
    strikeCharge(g, mark, t, ty) { ty = okTy(ty); const u = clamp(t / .7); S.dim = Math.max(S.dim, .35 * clamp(t / .4)); at(g, mark, 50, () => { sp(g, 'c', FR.sparkle[Math.floor(S.T * 20) % 13], ty, BASE.sparkle, 0, 0, K * 1.2 * u, 0, u, 'hue', true); glow(g, 0, -10, 140, ty, u * .6); }); },
    bolt(g, s) {
      const ty = okTy(s.sv), u = s.t; if (u > .55) return; const idx = [0, 1, 2, 1, 0, 2][Math.floor(u * 20) % 6], jag = Math.floor(u * 30), c = tinted('t', FR.bolt[idx], ty, [55, 55, 28][idx] || 55, ty === 'electric' ? 'hue' : 'mul'), G = H.G(), Wd = (120 + (jag % 3) * 14) * Z;
      if (c) { g.save(); g.imageSmoothingEnabled = false; g.globalCompositeOperation = 'lighter'; g.globalAlpha = clamp(1 - u * 1.4); g.drawImage(c, s.x - Wd / 2 + ((jag % 2) ? 6 : -6), -10, Wd, G - 5); g.drawImage(c, s.x - Wd / 2 + ((jag % 2) ? -4 : 4), -10, Wd * .6, G - 5); g.restore(); }
      at(g, s.x, G - 60, () => glow(g, 0, 0, 200, ty, (1 - u * 1.6) * .9)); S.flash = Math.max(S.flash, clamp(.55 - u * 1.6));
    },
    // ---- slash: a wind blade flies to the foe
    slash(g, p) {
      const ty = okTy(p.ty), fr = wind(0); if (!fr.length) return; const dir = Math.sign(p.vx) || 1, f = fr[(Math.floor(S.T * 20) + (p.tilt > 0 ? 4 : 0)) % fr.length];
      at(g, p.x, p.y, () => { glow(g, 0, 0, 70, ty, .45); sp(g, 'c', f, ty, BASE.wind, 0, 0, K * 2.7, p.tilt * .7 * dir, .95, 'hue', true, dir); });
    },
    // ---- short beam: flame-style blades rolling along the line
    flameBeam(g, bm) {
      const ty = okTy(bm.ty), fl = flameF(); if (!fl.length) return; const th = bm.th || 0, len = Math.min(bm.endS !== undefined ? bm.endS : 560, 900), grow = clamp(bm.t / .12), fade = clamp((bm.dur - bm.t) / .15), L = len / Z, t = bm.t;
      g.save(); g.translate(bm.x, bm.y); g.rotate(th); if (Math.cos(th) < 0) g.scale(1, -1); g.scale(Z, Z);
      for (let i = 0; i < (S.low ? 5 : 7); i++) { const k = ((i / 7) + t * 1.5) % 1; sp(g, 'c', fl[(i * 2 + Math.floor(t * 14)) % fl.length], ty, BASE.flame, k * L * grow, Math.sin(t * 20 + i) * 6, K * (.5 + k * 1.3), 0, (1 - k * .5) * .95 * fade, 'hue', true); }
      glow(g, 30, 0, 70, ty, .8 * fade); if (bm.hit) { glow(g, L * grow, 0, 130, ty, .6 * fade); boomAt(g, L * grow, 0, t % .5, ty, .7); } g.restore();
    },
  };
  // ---------------------------------------------------------------- recoloured pieces are cut once at the start of a match, a few per frame, so a first cast never stalls
  let warmQ = [], warmBuilt = false, warmTypes = [];
  API.warm = types => { warmTypes = Array.from(new Set(types.filter(t => TC[t]))); warmBuilt = false; warmQ = []; };
  function buildWarm() {
    const jobs = [], add = (sheet, rect, base, mode) => { for (const ty of warmTypes) jobs.push(() => tinted(sheet, rect, ty, base, mode || 'hue')); };
    for (const n of ['comet', 'burst', 'flame', 'boom', 'star', 'ice', 'iceStrip', 'sparkle']) for (const r of FR[n]) add('c', r, BASE[n]);
    for (const r of wind(0).concat(wind(1), orbF(), leafF(), flameF())) add('c', r, BASE.wind); add('wb', RW, 215);
    for (let i = 0; i < 3; i++) for (const ty of warmTypes) { if (ty === 'electric' || OK.strike.includes(ty)) jobs.push(() => tinted('t', FR.bolt[i], ty, [55, 55, 28][i], ty === 'electric' ? 'hue' : 'mul')); }
    warmQ = jobs; warmBuilt = true;
  }
  function warmStep() {
    if (!warmTypes.length || !ready()) return; if (!warmBuilt) buildWarm(); if (!warmQ.length) return;
    const t0 = performance.now(); while (warmQ.length && performance.now() - t0 < 2) warmQ.pop()();
  }
  return API;
})();
