// Spin & Shred (whirl): three counter-rotating lanes of the type's own particle with trails, a glowing column and a floor ring,
// plus type-coloured slashes where the foe is hit. Designed in mockups/whirl.html (concept C); colours come from the Pokémon type.
window.WHIRLFX = (() => {
  const TAU = Math.PI * 2, clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sm = u => { u = clamp(u); return u * u * (3 - 2 * u); };
  const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  // [hue, saturation %, lightness %]
  const PAL = { normal: [40, 8, 74], fire: [22, 100, 55], water: [215, 95, 58], electric: [52, 100, 55], grass: [112, 70, 50], ice: [190, 90, 68], fighting: [8, 80, 50], poison: [285, 70, 55], ground: [36, 60, 48], flying: [205, 70, 72], psychic: [325, 90, 65], bug: [78, 75, 48], rock: [38, 35, 52], ghost: [270, 55, 45], dragon: [255, 90, 62], dark: [265, 35, 36], steel: [215, 15, 65], fairy: [330, 90, 78] };
  const SIG = { normal: ['comet', 'star4'], fire: ['flame', 'ember'], water: ['drop', 'bubble'], electric: ['bolt', 'star4'], grass: ['leaf', 'leaf'], ice: ['crystal', 'needle'], fighting: ['burst', 'star4'], poison: ['bubble', 'drop'], ground: ['clod', 'boulder'], flying: ['feather', 'comet'], psychic: ['star4', 'ring'], bug: ['needle', 'leaf'], rock: ['boulder', 'clod'], ghost: ['wisp', 'wisp'], dragon: ['claw', 'flame'], dark: ['moon', 'wisp'], steel: ['shard', 'needle'], fairy: ['heart', 'star4'] };
  const col = (ty, k, a = 1) => { const [h, s, l] = PAL[ty]; const L = [l * .55, l, Math.min(94, l + 26), 97][k]; return `hsla(${h},${k === 3 ? s * .35 : s}%,${L}%,${a})`; };

  // real flame and ice-crystal frames from the effects sheet, recoloured per type once and cached
  const sheet = new Image(); let sheetOk = false; sheet.onload = () => { sheetOk = true; }; sheet.src = 'assets/spfx/cotton.png';
  const FRM = {
    flame: { y: 56, h: 63, base: 25, x: [[8, 42], [58, 44], [109, 45], [160, 46], [212, 47], [266, 43], [320, 42], [370, 44], [424, 42]] },
    crystal: { y: 712, h: 48, base: 195, x: [[163, 42], [218, 35], [268, 40], [316, 48], [368, 47], [423, 41]] },
  };
  const cache = new Map();
  function tinted(name, i, ty) {
    if (!sheetOk) return null; const k = name + i + ty; let c = cache.get(k); if (c) return c;
    const F = FRM[name], [x, w] = F.x[i % F.x.length], [h, s, l] = PAL[ty];
    c = document.createElement('canvas'); c.width = w; c.height = F.h; const g = c.getContext('2d');
    g.filter = `hue-rotate(${h - F.base}deg) saturate(${clamp(s / 80, .05, 1.3)}) brightness(${clamp(l / 52, .6, 1.5)})`;
    g.drawImage(sheet, x, F.y, w, F.h, 0, 0, w, F.h); cache.set(k, c); return c;
  }
  function sheetAt(g, name, i, ty, x, y, sc, rot, a) {
    const c = tinted(name, i, ty); if (!c) return;
    g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha *= a; g.drawImage(c, -c.width * sc / 2, -c.height * sc / 2, c.width * sc, c.height * sc); g.restore();
  }

  // one particle shape per type, drawn pointing along +x
  function shape(g, kind, x, y, s, rot, ty, a, fi = 0) {
    if (a <= .01 || s <= 0) return;
    const c0 = col(ty, 0), c1 = col(ty, 1), c2 = col(ty, 2), w = col(ty, 3);
    g.save(); g.translate(x, y); g.globalAlpha *= a; g.lineJoin = 'round';
    if (kind === 'flame') { g.restore(); sheetAt(g, 'flame', fi, ty, x, y - s * .4, s / 24, rot * .15, a); return; }
    if (kind === 'crystal') { g.restore(); sheetAt(g, 'crystal', fi, ty, x, y, s / 22, rot, a); return; }
    g.rotate(rot);
    switch (kind) {
      case 'ember': { const gr = g.createRadialGradient(0, 0, 0, 0, 0, s); gr.addColorStop(0, w); gr.addColorStop(.35, c2); gr.addColorStop(1, col(ty, 1, 0)); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, s, 0, TAU); g.fill(); break; }
      case 'drop': { g.beginPath(); g.moveTo(s * 1.3, 0); g.bezierCurveTo(s * .4, -s * .8, -s * .9, -s * .8, -s * .9, 0); g.bezierCurveTo(-s * .9, s * .8, s * .4, s * .8, s * 1.3, 0); const gr = g.createLinearGradient(-s, -s, s, s); gr.addColorStop(0, c2); gr.addColorStop(1, c0); g.fillStyle = gr; g.fill(); g.fillStyle = w; g.beginPath(); g.ellipse(-s * .1, -s * .28, s * .32, s * .14, -.4, 0, TAU); g.fill(); break; }
      case 'bubble': { const gr = g.createRadialGradient(-s * .3, -s * .3, 0, 0, 0, s); gr.addColorStop(0, col(ty, 3, .8)); gr.addColorStop(.5, col(ty, 1, .3)); gr.addColorStop(1, col(ty, 2, .75)); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, s, 0, TAU); g.fill(); g.strokeStyle = c2; g.lineWidth = 1.5; g.stroke(); break; }
      case 'bolt': { g.lineCap = 'round'; const P = [[-1.3, 0], [-.55, -.5], [-.1, .45], [.45, -.4], [1.3, 0]]; g.beginPath(); P.forEach(([px, py], i) => i ? g.lineTo(px * s, py * s) : g.moveTo(px * s, py * s)); g.strokeStyle = c1; g.lineWidth = s * .55; g.stroke(); g.strokeStyle = w; g.lineWidth = s * .2; g.stroke(); break; }
      case 'leaf': { g.beginPath(); g.moveTo(-s * 1.2, 0); g.quadraticCurveTo(0, -s * .95, s * 1.2, 0); g.quadraticCurveTo(0, s * .95, -s * 1.2, 0); const gr = g.createLinearGradient(0, -s, 0, s); gr.addColorStop(0, c2); gr.addColorStop(1, c0); g.fillStyle = gr; g.fill(); g.strokeStyle = c0; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-s * 1.2, 0); g.lineTo(s * 1.1, 0); g.stroke(); break; }
      case 'feather': { g.beginPath(); g.moveTo(-s * 1.4, 0); g.quadraticCurveTo(0, -s * .7, s * 1.3, 0); g.quadraticCurveTo(0, s * .7, -s * 1.4, 0); g.fillStyle = w; g.fill(); g.strokeStyle = c1; g.lineWidth = 1.4; g.stroke(); g.beginPath(); g.moveTo(-s * 1.6, 0); g.lineTo(s * 1.1, 0); g.stroke(); for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * s * .4, 0); g.lineTo(i * s * .4 + s * .35, -s * .42); g.moveTo(i * s * .4, 0); g.lineTo(i * s * .4 + s * .35, s * .42); g.stroke(); } break; }
      case 'star4': { g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? s * .28 : s * 1.15, an = i * Math.PI / 4; g.lineTo(Math.cos(an) * r, Math.sin(an) * r); } g.closePath(); g.fillStyle = c2; g.fill(); g.fillStyle = w; g.beginPath(); g.arc(0, 0, s * .3, 0, TAU); g.fill(); break; }
      case 'burst': { g.beginPath(); for (let i = 0; i < 16; i++) { const r = i % 2 ? s * .5 : s * 1.2, an = i * Math.PI / 8; g.lineTo(Math.cos(an) * r, Math.sin(an) * r); } g.closePath(); g.fillStyle = c1; g.fill(); g.strokeStyle = w; g.lineWidth = 1.5; g.stroke(); break; }
      case 'clod': { const P = [[-1, -.2], [-.6, -.8], [.2, -.9], [.9, -.4], [1, .4], [.3, .85], [-.6, .7]]; g.beginPath(); P.forEach(([px, py], i) => i ? g.lineTo(px * s, py * s) : g.moveTo(px * s, py * s)); g.closePath(); const gr = g.createLinearGradient(-s, -s, s, s); gr.addColorStop(0, c2); gr.addColorStop(1, c0); g.fillStyle = gr; g.fill(); g.strokeStyle = c0; g.lineWidth = 1.2; g.stroke(); break; }
      case 'boulder': { const P = [[-1.1, 0], [-.55, -.95], [.55, -1], [1.15, -.1], [.6, .95], [-.6, .9]]; g.beginPath(); P.forEach(([px, py], i) => i ? g.lineTo(px * s, py * s) : g.moveTo(px * s, py * s)); g.closePath(); g.fillStyle = c0; g.fill(); g.fillStyle = c1; g.beginPath(); g.moveTo(-1.1 * s, 0); g.lineTo(-.55 * s, -.95 * s); g.lineTo(.55 * s, -s); g.lineTo(0, -.05 * s); g.closePath(); g.fill(); g.fillStyle = c2; g.beginPath(); g.moveTo(-.55 * s, -.95 * s); g.lineTo(.55 * s, -s); g.lineTo(.2 * s, -.6 * s); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.stroke(); break; }
      case 'needle': { g.beginPath(); g.moveTo(-s * 1.5, 0); g.lineTo(0, -s * .22); g.lineTo(s * 1.5, 0); g.lineTo(0, s * .22); g.closePath(); g.fillStyle = c2; g.fill(); g.strokeStyle = w; g.lineWidth = 1; g.stroke(); break; }
      case 'wisp': { g.beginPath(); g.moveTo(s * 1.4, 0); g.bezierCurveTo(s * .4, -s * .9, -s * .8, -s * .8, -s * 1.5, -s * .2); g.bezierCurveTo(-s * .9, 0, -s * .9, 0, -s * 1.5, s * .2); g.bezierCurveTo(-s * .8, s * .8, s * .4, s * .9, s * 1.4, 0); const gr = g.createRadialGradient(0, 0, 0, 0, 0, s * 1.3); gr.addColorStop(0, c2); gr.addColorStop(1, col(ty, 1, .6)); g.fillStyle = gr; g.fill(); g.fillStyle = '#10051c'; g.beginPath(); g.ellipse(s * .35, -s * .26, s * .14, s * .2, 0, 0, TAU); g.ellipse(s * .35, s * .26, s * .14, s * .2, 0, 0, TAU); g.fill(); break; }
      case 'claw': { g.beginPath(); g.arc(0, 0, s * 1.2, -1.15, 1.15); g.arc(-s * .55, 0, s * 1.05, 1.0, -1.0, true); g.closePath(); const gr = g.createLinearGradient(-s, 0, s * 1.4, 0); gr.addColorStop(0, col(ty, 1, .5)); gr.addColorStop(1, w); g.fillStyle = gr; g.fill(); break; }
      case 'moon': { g.beginPath(); g.arc(0, 0, s, 0, TAU); g.arc(s * .45, -s * .1, s * .86, 0, TAU, true); g.fillStyle = c2; g.fill(); g.strokeStyle = w; g.lineWidth = 1.2; g.stroke(); break; }
      case 'shard': { g.beginPath(); g.moveTo(s * 1.4, 0); g.lineTo(-s * .8, -s * .65); g.lineTo(-s * .35, 0); g.lineTo(-s * .8, s * .65); g.closePath(); const gr = g.createLinearGradient(0, -s, 0, s); gr.addColorStop(0, w); gr.addColorStop(.5, c1); gr.addColorStop(1, c0); g.fillStyle = gr; g.fill(); g.strokeStyle = w; g.lineWidth = 1.2; g.stroke(); break; }
      case 'heart': { g.rotate(-rot + Math.sin(rot) * .3); g.beginPath(); g.moveTo(0, s * .8); g.bezierCurveTo(-s * 1.6, -s * .1, -s * .8, -s * 1.1, 0, -s * .4); g.bezierCurveTo(s * .8, -s * 1.1, s * 1.6, -s * .1, 0, s * .8); g.fillStyle = c1; g.fill(); g.strokeStyle = w; g.lineWidth = 1.3; g.stroke(); break; }
      case 'ring': { g.strokeStyle = c2; g.lineWidth = Math.max(1.5, s * .18); g.beginPath(); g.ellipse(0, 0, s * 1.1, s * .55, 0, 0, TAU); g.stroke(); break; }
      case 'comet': { const gr = g.createLinearGradient(-s * 2.6, 0, s * .8, 0); gr.addColorStop(0, col(ty, 1, 0)); gr.addColorStop(1, w); g.fillStyle = gr; g.beginPath(); g.moveTo(s * .9, 0); g.lineTo(-s * 2.6, -s * .3); g.lineTo(-s * 2.6, s * .3); g.closePath(); g.fill(); g.fillStyle = w; g.beginPath(); g.arc(s * .5, 0, s * .4, 0, TAU); g.fill(); break; }
    }
    g.restore();
  }
  const sig = (g, ty, which, x, y, s, rot, a, fi) => { const sg = SIG[ty]; shape(g, sg[which % sg.length], x, y, s, rot, ty, a, fi); };

  // c: { x, feet (bottom of the body), floor (lane ground), h (body height), low }. layer: 'back' (behind the Pokémon) or 'front'.
  function draw(g, z, layer, c) {
    const ty = PAL[z.ty] ? z.ty : 'normal', t = z.t, fade = clamp(Math.min(t / .25, (z.dur - t) / .3)), grow = sm(t / .25);
    if (fade <= 0) return;
    const fin = t > z.dur - .2 ? clamp((t - (z.dur - .2)) / .2) : 0, ex = 1 + fin * .3, { x, feet, floor, h, low } = c, R = z.r, K = clamp(h / 110, 1.1, 1.8);
    g.save(); g.globalCompositeOperation = 'lighter';
    if (layer === 'back') {
      const r = R * grow * 1.05, gr = g.createRadialGradient(x, floor, 0, x, floor, r); gr.addColorStop(0, col(ty, 2, .5 * fade)); gr.addColorStop(.7, col(ty, 1, .22 * fade)); gr.addColorStop(1, col(ty, 1, 0));
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, floor, r, r * .24, 0, 0, TAU); g.fill();
      g.strokeStyle = col(ty, 3, .8 * fade); g.lineWidth = 3 * K; g.setLineDash([22 * K, 16 * K]); g.lineDashOffset = -t * 160; g.beginPath(); g.ellipse(x, floor, r * .92, r * .22, 0, 0, TAU); g.stroke(); g.setLineDash([]);
      if (fin > 0) { const rr = R * (.7 + fin * .9); g.strokeStyle = col(ty, 3, (1 - fin) * .9); g.lineWidth = (8 * (1 - fin) + 2) * K; g.beginPath(); g.ellipse(x, floor, rr, rr * .24, 0, 0, TAU); g.stroke(); g.strokeStyle = col(ty, 1, (1 - fin) * .6); g.lineWidth = 16 * (1 - fin) * K; g.stroke(); }
      const cg = g.createLinearGradient(0, feet, 0, feet - h * 1.3); cg.addColorStop(0, col(ty, 1, .3 * fade)); cg.addColorStop(1, col(ty, 1, 0)); g.fillStyle = cg; g.beginPath(); g.ellipse(x, feet - h * .6, R * .55 * grow, h * .75, 0, 0, TAU); g.fill();
    }
    const L = [[.18, .72, 9, 7], [.5, .95, -7, 6], [.82, .62, 11, 5]]; // [height, radius, spin speed, particles]
    L.forEach(([hy, rf, sp, n0], k) => {
      const y = feet - h * (.1 + hy * .95), rx = R * rf * grow * ex, ry = rx * .28, n = low ? Math.max(3, n0 - 2) : n0, sgn = Math.sign(sp);
      if (layer === 'back') { g.strokeStyle = col(ty, 2, .22 * fade); g.lineWidth = 1.5 * K; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.stroke(); }
      for (let i = 0; i < n; i++) {
        const base = t * sp * 1.3 + i * TAU / n + k;
        for (let m = low ? 3 : 5; m >= 0; m--) {
          const a = base - sgn * m * .13, dep = Math.sin(a); if ((layer === 'front') !== (dep > 0)) continue;
          const px = x + Math.cos(a) * rx, py = y + Math.sin(a) * ry, tang = Math.atan2(Math.cos(a) * ry, -Math.sin(a) * rx) + (sgn < 0 ? Math.PI : 0);
          sig(g, ty, (i + k) % 2 ? 1 : 0, px, py, (13 + k) * K * (.75 + .35 * dep) * (1 - m * .1), tang, fade * (m ? .3 / m : 1), i + Math.floor(t * 14));
        }
      }
    });
    if (!low && layer === 'front') for (let i = 0; i < 10; i++) { const q = (t * .9 + i / 10) % 1; shape(g, 'ember', x + Math.sin(i * 2.2) * R * .35, feet - h * .2 - q * h * 1.1, 5 * K * (1 - q * .5), 0, ty, fade * (1 - q)); }
    g.restore();
  }

  // hit feedback: tapered type-coloured slashes, flying particles and a burst on the finisher
  let hits = [];
  function hit(x, y, ty, fin, n, now) { hits.push({ x, y, ty: PAL[ty] ? ty : 'normal', fin, n, t0: now }); if (hits.length > 24) hits.shift(); }
  function drawHits(g, now) {
    const K = 1.35; hits = hits.filter(h => now - h.t0 >= 0 && now - h.t0 < .6);
    for (const h of hits) {
      const age = now - h.t0, ty = h.ty, cx = h.x, cy = h.y, n = h.n, fin = h.fin;
      if (age < .26) {
        const u = clamp(age / .09), al = 1 - clamp((age - .09) / .17), marks = fin ? [[-.75, 150, 22], [.8, 150, 22]] : [[(n % 2 ? -1 : 1) * (.7 + hash(n) * .3), 105, 15], [(n % 2 ? 1 : -1) * (.5 + hash(n, 3) * .4), 62, 10]];
        g.save(); g.globalCompositeOperation = 'lighter';
        marks.forEach(([ang, len, wid], s) => {
          len *= K; wid *= K; const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx, ox = (s ? 14 : -6) * K * nx, oy = (s ? 14 : -6) * K * ny;
          const hx = cx + ox + dx * len * (2 * u - 1), hy = cy + oy + dy * len * (2 * u - 1), tx = cx + ox - dx * len, ty2 = cy + oy - dy * len, mx = (hx + tx) / 2, my = (hy + ty2) / 2;
          for (const [wm, cc] of [[1, col(ty, 1, .75 * al)], [.38, col(ty, 3, al)]]) { g.fillStyle = cc; g.beginPath(); g.moveTo(tx, ty2); g.quadraticCurveTo(mx + nx * wid * wm, my + ny * wid * wm, hx, hy); g.quadraticCurveTo(mx - nx * wid * wm * .25, my - ny * wid * wm * .25, tx, ty2); g.fill(); }
        });
        g.restore();
      }
      for (let i = 0; i < (fin ? 10 : 5) && age < .5; i++) {
        const an = hash(n, i) * TAU, sp = (fin ? 330 : 200) * K * (.6 + hash(n, i + 9) * .7);
        sig(g, ty, i, cx + Math.cos(an) * sp * age, cy + Math.sin(an) * sp * age + 420 * K * age * age, (fin ? 9 : 6) * K * (1 - age), an + age * 8, 1 - age / .5, i);
      }
      if (fin && age < .3) { g.save(); g.globalCompositeOperation = 'lighter'; const r = (40 + age * 380) * K, gr = g.createRadialGradient(cx, cy, 0, cx, cy, r), a = 1 - age / .3; gr.addColorStop(0, col(ty, 3, .9 * a)); gr.addColorStop(.6, col(ty, 1, .5 * a)); gr.addColorStop(1, col(ty, 1, 0)); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill(); g.restore(); }
    }
  }
  return { draw, hit, drawHits };
})();
