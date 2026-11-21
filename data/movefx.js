// Spikes (Stone Edge, Bone Spikes, Ice Crystals, Toxic Spikes, Iron Spikes) and Surf waves (one per caster type, 13 types).
// Designed in mockups/moves_fx.html; recoloured frames of the effects sheet (assets/spfx/cotton.png) and the wave sprite (assets/spfx/wave.png) add the detail.
window.MOVEFX = (() => {
  const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sm = u => { u = clamp(u); return u * u * (3 - 2 * u); };
const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const easeOut = u => 1 - (1 - clamp(u)) ** 2, easeOutBack = u => { u = clamp(u); const c = 2.1; return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2; };
function poly(g, pts, fill, stroke, lw) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1; g.stroke(); } }
const lg = (g, x0, y0, x1, y1, stops) => { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
/* =================================================================== SPIKES */
const SPP = {
  rock: { l: '#e6d8b0', m: '#a39068', d: '#5c4c30', g: '#ffb84a', dust: '200,180,140' },
  ground: { l: '#fffaf0', m: '#e8d8aa', d: '#a89066', g: '#e8c070', dust: '190,160,110' },
  ice: { l: '#f4fdff', m: '#a6e6ff', d: '#4ca6da', g: '#c8f4ff', dust: '225,246,255' },
  poison: { l: '#eab0ff', m: '#a44ad8', d: '#4a1478', g: '#c8ff3a', dust: '150,70,200' },
  steel: { l: '#f8fbff', m: '#aab8cc', d: '#5a6578', g: '#ffc070', dust: '170,180,195' },
};
// shapes: all drawn upward from (0,0)
function rockSpire(g, h, w, P, sd) {
  const j = hash(sd), B = [[-.56 * w, 0], [-.08 * w, 0], [.22 * w, 0], [.56 * w, 0]], S0 = [-.5 * w, -.42 * h], S1 = [.52 * w, -.34 * h - j * .1 * h], T0 = [-.2 * w, -h], T1 = [.04 * w, -.9 * h], T2 = [.26 * w, -.72 * h - j * .08 * h];
  poly(g, [B[0], S0, T0, T1, B[1]], P.l); poly(g, [B[1], T1, T2, B[2]], P.m); poly(g, [B[2], T2, S1, B[3]], P.d);
  poly(g, [T0, T1, [-.08 * w, -.82 * h], [-.28 * w, -.86 * h]], 'rgba(255,255,255,.35)');
  g.strokeStyle = 'rgba(40,28,12,.55)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(...B[0]); g.lineTo(...S0); g.lineTo(...T0); g.lineTo(...T1); g.lineTo(...T2); g.lineTo(...S1); g.lineTo(...B[3]); g.stroke();
  g.beginPath(); g.moveTo(...T1); g.lineTo(...B[1]); g.moveTo(...T2); g.lineTo(...B[2]); g.stroke();
  g.strokeStyle = 'rgba(40,28,12,.4)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-.3 * w, -.55 * h); g.lineTo(-.18 * w, -.4 * h); g.lineTo(-.26 * w, -.22 * h); g.moveTo(.3 * w, -.4 * h); g.lineTo(.38 * w, -.24 * h); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(...S0); g.lineTo(...T0); g.stroke();
}
function boneTusk(g, h, w, bend, P) {
  const L = [], R = []; for (let i = 0; i <= 18; i++) { const u = i / 18, cx = bend * h * u * u, hw = w * .5 * Math.pow(1 - u, .85) + (u < .12 ? w * .12 * (1 - u / .12) : 0), y = -h * u; L.push([cx - hw, y]); R.push([cx + hw, y]); }
  g.beginPath(); L.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); for (let i = R.length - 1; i >= 0; i--) g.lineTo(...R[i]); g.closePath(); g.fillStyle = lg(g, -w / 2, 0, w / 2 + bend * h, 0, [[0, P.l], [.55, P.m], [1, P.d]]); g.fill(); g.strokeStyle = 'rgba(70,50,20,.6)'; g.lineWidth = 1.8; g.stroke();
  g.strokeStyle = 'rgba(120,90,50,.55)'; g.lineWidth = 1.6; for (const u of [.18, .34, .5, .66, .8]) { const i = Math.round(u * 18), a = L[i], b = R[i]; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo((a[0] + b[0]) / 2, a[1] - w * .12, b[0], b[1]); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2; g.beginPath(); for (let i = 3; i <= 15; i++) { const [x, y] = L[i]; i === 3 ? g.moveTo(x + 3, y) : g.lineTo(x + 3, y); } g.stroke();
  g.fillStyle = P.l; g.beginPath(); g.ellipse(0, 2, w * .62, w * .26, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(70,50,20,.5)'; g.lineWidth = 1.5; g.stroke();
}
function iceCrystal(g, h, w, tilt, P, t, sd) {
  g.save(); g.rotate(tilt); const sh = h * .78, o = w * .1, a = -w / 2, b = -w / 6, c = w / 6, d = w / 2, T = [0, -h];
  poly(g, [[a, 0], [b, 0], [b, -sh - o], [a, -sh]], 'rgba(120,210,250,.92)'); poly(g, [[a, -sh], [b, -sh - o], T], 'rgba(200,244,255,.95)');
  poly(g, [[b, 0], [c, 0], [c, -sh - o], [b, -sh - o]], 'rgba(214,246,255,.9)'); poly(g, [[b, -sh - o], [c, -sh - o], T], 'rgba(255,255,255,.95)');
  poly(g, [[c, 0], [d, 0], [d, -sh], [c, -sh - o]], 'rgba(70,160,220,.92)'); poly(g, [[c, -sh - o], [d, -sh], T], 'rgba(130,205,245,.95)');
  g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(b + w * .04, -sh * .9, w * .07, sh * .8);
  g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(a, 0); g.lineTo(a, -sh); g.lineTo(T[0], T[1]); g.lineTo(d, -sh); g.lineTo(d, 0); g.moveTo(b, 0); g.lineTo(b, -sh - o); g.moveTo(c, 0); g.lineTo(c, -sh - o); g.stroke();
  const tw = .5 + .5 * Math.sin(t * 9 + sd * 5); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,255,255,${.55 + .4 * tw})`; g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 2 : 9 + 4 * tw, an = i * Math.PI / 4; g.lineTo(T[0] + Math.cos(an) * r, T[1] + 4 + Math.sin(an) * r); } g.fill(); g.restore(); g.restore();
}
function toxicSpire(g, h, w, P, t, sd) {
  const L = [], R = []; for (let i = 0; i <= 20; i++) { const u = i / 20, cx = Math.sin(u * 4.6 + sd * 6) * w * .2 * u, hw = w * .5 * Math.pow(1 - u, .8) + (u < .14 ? w * .16 * (1 - u / .14) : 0); L.push([cx - hw, -h * u]); R.push([cx + hw, -h * u]); }
  g.beginPath(); L.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); for (let i = R.length - 1; i >= 0; i--) g.lineTo(...R[i]); g.closePath(); g.fillStyle = lg(g, -w / 2, 0, w / 2, 0, [[0, P.m], [.5, P.l], [1, P.d]]); g.fill(); g.strokeStyle = 'rgba(30,5,50,.7)'; g.lineWidth = 1.8; g.stroke();
  g.save(); g.clip(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; for (let i = 0; i < 7; i++) { const y = -h * (i / 7 + ((t * .25) % (1 / 7))); g.beginPath(); g.moveTo(-w, y + 10); g.lineTo(w, y - 14); g.stroke(); }
  g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { const q = (t * .6 + i * .25 + sd) % 1, bx = Math.sin(i * 2.7 + sd) * w * .12, by = -h * q * .8; g.fillStyle = `rgba(200,255,80,${.7 * (1 - q)})`; g.beginPath(); g.arc(bx, by, 3 + (i % 2) * 2, 0, TAU); g.fill(); }
  g.restore();
  g.fillStyle = P.g; for (const [u, s] of [[.3, -1], [.55, 1]]) { const i = Math.round(u * 20), p = s < 0 ? L[i] : R[i], dy = ((t * 40 + u * 90) % 24); g.globalAlpha = .9; g.beginPath(); g.ellipse(p[0] + s * 2, p[1] + dy, 2.2, 3.4, 0, 0, TAU); g.fill(); g.globalAlpha = 1; }
}
function ironBlade(g, h, w, tilt, P) {
  g.save(); g.rotate(tilt); const tip = [w * .06, -h], sh0 = [-w * .42, -h * .5], sh1 = [w * .42, -h * .56];
  poly(g, [[-w / 2, 0], [0, 0], tip, sh0], lg(g, -w / 2, 0, 0, -h, [[0, P.l], [1, P.m]])); poly(g, [[0, 0], [w / 2, 0], sh1, tip], lg(g, 0, 0, w / 2, -h, [[0, P.m], [1, P.d]]));
  g.strokeStyle = 'rgba(20,24,34,.75)'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(...sh0); g.lineTo(...tip); g.lineTo(...sh1); g.lineTo(w / 2, 0); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, 0); g.lineTo(...tip); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-w * .3, -h * .12); g.lineTo(-w * .32, -h * .42); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(tip[0], tip[1] + 3, 2.6, 0, TAU); g.fill(); g.restore();
}
function drawDebris(g, e, P, G) {
  const ag = Math.max(0, e.k * .6), n = 9; for (let i = 0; i < n; i++) {
    const an = -2.45 + hash(e.sd, i) * 1.75, sp = 150 + hash(e.sd, i + 7) * 190, x = e.x + Math.cos(an) * sp * ag, y = G + Math.sin(an) * sp * ag + 620 * ag * ag, a = 1 - clamp((ag - .32) / .28); if (a <= 0 || y > G + 6) continue;
    g.save(); g.translate(x, y); g.rotate(ag * (6 + i) * (i % 2 ? 1 : -1)); g.globalAlpha = a; const s = 4 + hash(e.sd, i + 3) * 5;
    if (e.ty === 'poison') { g.fillStyle = P.m; g.beginPath(); g.arc(0, 0, s * .8, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(-s * .25, -s * .25, s * .22, 0, TAU); g.fill(); }
    else if (e.ty === 'steel') { g.strokeStyle = '#ffd890'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(-Math.cos(an) * 9, -Math.sin(an) * 9); g.stroke(); }
    else if (e.ty === 'ice') poly(g, [[0, -s * 1.4], [s * .7, 0], [0, s * 1.4], [-s * .7, 0]], 'rgba(220,248,255,.95)', '#fff', 1);
    else if (e.ty === 'ground') { g.fillStyle = P.l; g.strokeStyle = 'rgba(90,70,40,.6)'; g.lineWidth = 1; g.beginPath(); g.ellipse(0, 0, s * 1.2, s * .6, 0, 0, TAU); g.fill(); g.stroke(); }
    else poly(g, [[-s, 0], [-s * .3, -s], [s, -s * .4], [s * .6, s * .8], [-s * .4, s]], P.m, P.d, 1);
    g.restore();
  }
}
function spikeNew(g, e) {
  const P = SPP[e.ty], x = e.x, G = e.G, k = e.k, W = 54;
  if (k < 0) { // warning: a glowing fissure that cracks open before the eruption
    const u = clamp(1 + k / .5), len = 44 * u; g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [lw, c] of [[9, P.g + '33'], [3, P.g]]) { g.strokeStyle = c; g.lineWidth = lw * (.8 + .2 * Math.sin(e.t * 30)); g.beginPath(); g.moveTo(x - len, G + 5); for (let i = 1; i <= 6; i++) g.lineTo(x - len + len * 2 * i / 6, G + 4 + Math.sin(i * 2.3 + e.sd * 9) * 4); g.stroke(); }
    g.restore(); return;
  }
  if (k > 1) return; const rise = easeOutBack(k * 6), r = clamp((k - .55) / .45), H = (185 + hash(e.sd) * 45) * rise * (1 - r * r), fade = 1 - r;
  g.save(); g.translate(x, G + 4);
  // fissure, rim glow and dust ring on the floor
  g.save(); g.globalAlpha = Math.min(1, k * 8) * (1 - clamp((k - .75) / .25)); g.lineCap = 'round'; g.lineJoin = 'round';
  for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 3; i++) { g.strokeStyle = 'rgba(20,12,6,.8)'; g.lineWidth = 3.5 - i * .7; g.beginPath(); let px = s * 14, py = 2 + i * 2; g.moveTo(px, py); for (let j = 1; j <= 4; j++) { px += s * (12 + hash(e.sd, j + i) * 14); py += (hash(e.sd, j * 3 + i) - .5) * 9; g.lineTo(px, py); } g.stroke(); g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = P.g + '66'; g.lineWidth = 1.4; g.stroke(); g.restore(); }
  g.restore();
  const dk = clamp(k * 3); g.save(); g.globalAlpha = (1 - dk) * .8; g.fillStyle = `rgba(${P.dust},.7)`; g.beginPath(); g.ellipse(0, 2, 30 + 110 * easeOut(dk), 7 + 14 * easeOut(dk), 0, 0, TAU); g.fill(); g.restore();
  g.save(); g.globalAlpha = fade;
  if (e.ty === 'rock') { rockSpire(g, H * .6, W * .62, P, e.sd + 1); g.save(); g.translate(-W * .52, 0); g.rotate(-.34); rockSpire(g, H * .5, W * .5, P, e.sd + 2); g.restore(); g.save(); g.translate(W * .5, 0); g.rotate(.3); rockSpire(g, H * .55, W * .5, P, e.sd + 3); g.restore(); rockSpire(g, H, W, P, e.sd); }
  else if (e.ty === 'ground') { boneTusk(g, H * .55, W * .5, -.3, P); boneTusk(g, H * .5, W * .46, .38, P); g.save(); g.translate(-W * .34, 0); boneTusk(g, H * .8, W * .6, -.22, P); g.restore(); boneTusk(g, H, W * .72, .26, P); }
  else if (e.ty === 'ice') { g.save(); g.translate(-W * .5, 0); iceCrystal(g, H * .58, W * .46, -.3, P, e.t, e.sd); g.restore(); g.save(); g.translate(W * .52, 0); iceCrystal(g, H * .5, W * .42, .34, P, e.t, e.sd + 1); g.restore(); g.save(); g.translate(-W * .2, 0); iceCrystal(g, H * .82, W * .52, -.1, P, e.t, e.sd + 2); g.restore(); g.save(); g.translate(W * .12, 0); iceCrystal(g, H, W * .62, .08, P, e.t, e.sd + 3); g.restore(); }
  else if (e.ty === 'poison') { g.save(); g.translate(-W * .5, 0); toxicSpire(g, H * .55, W * .5, P, e.t, e.sd + 1); g.restore(); g.save(); g.translate(W * .5, 0); toxicSpire(g, H * .62, W * .5, P, e.t, e.sd + 2); g.restore(); toxicSpire(g, H, W * .78, P, e.t, e.sd); g.save(); g.fillStyle = 'rgba(120,40,170,.8)'; g.beginPath(); g.ellipse(0, 3, 40, 9, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(220,160,255,.6)'; g.beginPath(); g.ellipse(-8, 1, 12, 3, 0, 0, TAU); g.fill(); g.restore(); }
  else { g.save(); g.translate(-W * .46, 0); ironBlade(g, H * .62, W * .5, -.32, P); g.restore(); g.save(); g.translate(W * .46, 0); ironBlade(g, H * .66, W * .5, .3, P); g.restore(); g.save(); g.translate(-W * .16, 0); ironBlade(g, H * .86, W * .56, -.08, P); g.restore(); ironBlade(g, H, W * .62, .07, P); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = P.g + '55'; g.beginPath(); g.ellipse(0, 2, 34, 6, 0, 0, TAU); g.fill(); g.restore(); }
  g.restore();
  g.restore(); drawDebris(g, e, P, G + 4);
}

/* =================================================================== SURF */
// body: [top, middle, bottom] colours; deco: inner (clipped) and outer pieces; part: [spray kind, colour]
const SURF = {
  water: [{ n: 'Tsunami (your sprite wave)', prof: 'swell', sbody: 'always', body: ['#d6f6ff', '#5db6ff', '#1646b8'], deco: ['foam'], part: ['drop', '#eaffff'] },
          { n: 'Triple breakers', prof: 'sets', body: ['#e6fff8', '#52d6e8', '#1a78c8'], deco: ['streaks', 'foam', 'bubbles'], part: ['drop', '#eaffff'] }],
  normal: [{ n: 'Shock surge', prof: 'wall', body: ['#ffffff', '#ece8dc', '#aaa692'], a: .85, deco: ['rings', 'sparkle'], part: ['star', '#fffbe8'] },
           { n: 'Wind wash', prof: 'swell', body: ['#ffffff', '#dfe6f0', '#9fb0c8'], a: .78, deco: ['streaks', 'puffs'], part: ['puff', '#ffffff'] }],
  electric: [{ n: 'Charged tide', prof: 'swell', sbody: 1, body: ['#fff6b0', '#4aa8e8', '#1a3f9a'], deco: ['streaks', 'foam', 'bolts'], part: ['spark', '#fff27a'] },
             { n: 'Thunder wall', prof: 'wall', body: ['#fffbe0', '#ffe84a', '#e89a10'], a: .92, deco: ['plasma', 'bolts'], part: ['spark', '#fffbe0'] }],
  fire: [{ n: 'Fire wave', prof: 'wall', body: ['#fff2a0', '#ff8a1a', '#b81c0a'], deco: ['upstreaks', 'flames'], part: ['ember', '#ffb040'] },
         { n: 'Magma surge', prof: 'swell', body: ['#ffb040', '#d83a0a', '#4a0c06'], deco: ['cracks', 'flames'], part: ['ember', '#ff8a2a'], flamesSmall: 1 }],
  ice: [{ n: 'Frozen wave', prof: 'swell', sbody: 1, body: ['#f4feff', '#9fe4ff', '#3a8fd0'], a: .88, jag: 1, deco: ['specular', 'shards', 'sparkle'], part: ['ice', '#eaffff'] },
        { n: 'Blizzard surge', prof: 'wall', body: ['#ffffff', '#cfeeff', '#7ab4e0'], a: .9, deco: ['snow', 'puffs', 'icicles'], part: ['snow', '#ffffff'] }],
  ground: [{ n: 'Mud wave', prof: 'swell', sbody: 1, body: ['#a88858', '#6e4a28', '#3a2410'], deco: ['streaksDark', 'mud'], part: ['mud', '#5a3a1c'] },
           { n: 'Sand tide', prof: 'sets', body: ['#f2dca0', '#d0a860', '#8a6a34'], deco: ['sandstreaks', 'dust'], part: ['sand', '#f0d890'] }],
  rock: [{ n: 'Rockslide surge', prof: 'wall', jag: 1, body: ['#c8bca0', '#8a7c5c', '#4a3e28'], deco: ['rocks', 'dust'], part: ['debris', '#8a7c5c'] },
         { n: 'Boulder tide', prof: 'swell', body: ['#b8b0a0', '#7c7468', '#403a30'], a: .82, deco: ['dust', 'riders'], part: ['debris', '#a89c84'] }],
  poison: [{ n: 'Toxic tide', prof: 'swell', sbody: 1, body: ['#e6a0ff', '#a44ad8', '#3e0f66'], deco: ['streaks', 'bubbles', 'foamGreen'], part: ['goo', '#c8ff3a'] },
           { n: 'Acid wall', prof: 'wall', body: ['#d8ff6a', '#9a4ad0', '#3a0a5c'], deco: ['bubbles', 'drips'], part: ['goo', '#d8ff6a'] }],
  dragon: [{ n: 'Dragon tide', prof: 'swell', sbody: 1, jag: 1, body: ['#c8baff', '#5a3ae0', '#1a0f6a'], deco: ['scales', 'foamGold', 'sparkle'], part: ['spark', '#ffe27a'] },
           { n: 'Twin serpents', prof: 'swell', body: null, deco: ['ribbons'], rib: ['#ffe27a', '#7a5aff'], head: 1, part: ['spark', '#ffe27a'] }],
  fighting: [{ n: 'Impact wave', prof: 'wall', body: null, deco: ['arcs'], part: ['spark', '#ffd0a0'] },
             { n: 'Aura surge', prof: 'wall', body: ['#ffd8b0', '#ff6a30', '#a81c10'], a: .78, deco: ['aura', 'spikes'], part: ['spark', '#ffd0a0'] }],
  psychic: [{ n: 'Psi tide', prof: 'swell', sbody: 1, body: ['#ffe0fa', '#ff7ad8', '#8a2aa0'], a: .62, deco: ['rings', 'sparkle'], part: ['star', '#ffe0fa'] },
            { n: 'Mind wave', prof: 'swell', body: null, deco: ['ribbons', 'sparkle'], rib: ['#ffe0fa', '#ff4ac8'], part: ['star', '#ffe0fa'] }],
  dark: [{ n: 'Shadow tide', prof: 'swell', sbody: 1, body: ['#8a6ab0', '#3a2860', '#120a24'], a: .96, rim: '#b890ff', deco: ['tendrils', 'eyes'], part: ['wisp', '#a070ff'] },
         { n: 'Night wall', prof: 'wall', body: ['#7a5aa0', '#2c1c4c', '#0c0618'], a: .96, rim: '#b890ff', deco: ['moons', 'tendrils'], part: ['wisp', '#a070ff'] }],
  steel: [{ n: 'Metal tide', prof: 'swell', sbody: 1, body: ['#f8fbff', '#a0b0c8', '#4a566a'], deco: ['specular', 'foamSilver'], part: ['spark', '#ffffff'] },
          { n: 'Blade surge', prof: 'sets', body: null, deco: ['blades'], part: ['spark', '#ffffff'] }],
};
function profile(kind, xr, H, L, t, jag) {
  const f = clamp(1 - xr / L); let s;
  if (kind === 'swell') s = H * Math.pow(1 - Math.pow(clamp(xr / L), 1.7), .75);
  else if (kind === 'wall') s = xr < L * .55 ? H * (1 - .22 * xr / (L * .55)) : H * .78 * Math.pow(clamp(1 - (xr - L * .55) / (L * .45)), 1.2);
  else { const gs = (c, sg) => Math.exp(-(((xr - c) / sg) ** 2)); s = H * clamp(.95 * gs(0, 95) + .78 * gs(150, 80) + .6 * gs(290, 80) + .1 * f, 0, 1); }
  if (jag) s += H * .07 * Math.abs(Math.sin(xr * .11 + t * 3)) * f;
  return xr < 0 ? s * Math.pow(Math.max(0, 1 + xr / 24), .6) : s;
}
function bodyPath(c) { const p = new Path2D(); const [sx] = c.top(-24); p.moveTo(sx, c.gy); for (let xr = -24; xr <= c.L; xr += 8) p.lineTo(...c.top(xr)); p.lineTo(c.x - c.dir * c.L, c.gy); p.closePath(); return p; }
function part(g, kind, x, y, s, a, colr, i, t) {
  if (a <= .01) return; g.save(); g.globalAlpha *= a; g.translate(x, y);
  switch (kind) {
    case 'drop': g.fillStyle = colr; g.beginPath(); g.arc(0, 0, s, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-s * .3, -s * .3, s * .35, 0, TAU); g.fill(); break;
    case 'ember': { g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(0, 0, 0, 0, 0, s * 2.2); gr.addColorStop(0, '#fff'); gr.addColorStop(.35, colr); gr.addColorStop(1, 'rgba(255,80,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, s * 2.2, 0, TAU); g.fill(); break; }
    case 'spark': g.globalCompositeOperation = 'lighter'; g.strokeStyle = colr; g.lineWidth = 2; g.beginPath(); g.moveTo(-s * 1.6, 0); g.lineTo(s * 1.6, 0); g.moveTo(0, -s * 1.6); g.lineTo(0, s * 1.6); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, s * .5, 0, TAU); g.fill(); break;
    case 'star': g.globalCompositeOperation = 'lighter'; g.fillStyle = colr; g.beginPath(); for (let k = 0; k < 8; k++) { const r = k % 2 ? s * .4 : s * 1.7, an = k * Math.PI / 4 + t; g.lineTo(Math.cos(an) * r, Math.sin(an) * r); } g.fill(); break;
    case 'ice': poly(g, [[0, -s * 1.6], [s * .8, 0], [0, s * 1.6], [-s * .8, 0]], 'rgba(230,250,255,.95)', '#fff', 1); break;
    case 'snow': g.fillStyle = colr; g.beginPath(); g.arc(0, 0, s * .8, 0, TAU); g.fill(); break;
    case 'mud': g.fillStyle = colr; g.beginPath(); g.ellipse(0, 0, s * 1.3, s, i, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,220,160,.35)'; g.beginPath(); g.arc(-s * .3, -s * .3, s * .3, 0, TAU); g.fill(); break;
    case 'goo': g.fillStyle = colr; g.globalAlpha *= .85; g.beginPath(); g.arc(0, 0, s, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(-s * .3, -s * .3, s * .3, 0, TAU); g.fill(); break;
    case 'sand': g.fillStyle = colr; g.fillRect(-s * .5, -s * .5, s, s); break;
    case 'debris': g.rotate(i + t * 4); poly(g, [[-s, 0], [-s * .3, -s], [s, -s * .4], [s * .6, s * .8], [-s * .4, s]], colr, 'rgba(0,0,0,.4)', 1); break;
    case 'puff': g.fillStyle = colr; g.globalAlpha *= .8; g.beginPath(); g.arc(0, 0, s * 1.8, 0, TAU); g.fill(); break;
    case 'wisp': g.globalCompositeOperation = 'lighter'; g.fillStyle = colr; g.beginPath(); g.moveTo(s * 1.4, 0); g.quadraticCurveTo(0, -s * 1.1, -s * 1.8, 0); g.quadraticCurveTo(0, s * 1.1, s * 1.4, 0); g.fill(); break;
  }
  g.restore();
}
const DECO = {
  streaks: { in: 1, f(c) { const { g } = c; g.save(); g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { const yy = c.gy - c.H * (.08 + .8 * hash(i)), xx = (c.t * 260 * (.6 + hash(i, 2)) + hash(i, 1) * 400) % 340; g.beginPath(); g.moveTo(c.x - c.dir * xx, yy); g.lineTo(c.x - c.dir * (xx + 40 + hash(i, 3) * 50), yy); g.stroke(); } g.restore(); } },
  streaksDark: { in: 1, f(c) { const { g } = c; g.save(); g.strokeStyle = 'rgba(30,16,6,.35)'; g.lineWidth = 3; for (let i = 0; i < 8; i++) { const yy = c.gy - c.H * (.06 + .8 * hash(i, 4)), xx = (c.t * 200 * (.6 + hash(i, 2)) + hash(i, 1) * 400) % 340; g.beginPath(); g.moveTo(c.x - c.dir * xx, yy); g.lineTo(c.x - c.dir * (xx + 30 + hash(i, 3) * 40), yy + 3); g.stroke(); } g.restore(); } },
  upstreaks: { in: 1, f(c) { const { g } = c; g.save(); g.globalCompositeOperation = 'lighter'; g.lineWidth = 3; for (let i = 0; i < 12; i++) { const xr = hash(i) * c.L * .8, q = (c.t * 1.4 + hash(i, 2)) % 1, [px] = c.top(xr), top = c.s(xr); g.strokeStyle = `rgba(255,${180 + 60 * hash(i, 5) | 0},60,${.55 * (1 - q)})`; g.beginPath(); g.moveTo(px, c.gy - q * top * .2); g.lineTo(px, c.gy - top * (.25 + q * .75)); g.stroke(); } g.restore(); } },
  sandstreaks: { in: 1, f(c) { const { g } = c; g.save(); g.strokeStyle = 'rgba(255,245,210,.5)'; g.lineWidth = 2; for (let i = 0; i < 12; i++) { const yy = c.gy - c.H * (.05 + .7 * hash(i, 4)), xx = (c.t * 340 * (.6 + hash(i, 2)) + hash(i, 1) * 400) % 340; g.beginPath(); g.moveTo(c.x - c.dir * xx, yy); g.lineTo(c.x - c.dir * (xx + 18 + hash(i, 3) * 26), yy - 4); g.stroke(); } g.restore(); } },
  foam: { f(c) { const { g } = c; g.save(); g.lineCap = g.lineJoin = 'round'; for (const [w, a] of [[9, .3], [4.5, .95]]) { g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = w; g.beginPath(); for (let xr = -14; xr <= c.L * .9; xr += 8) { const [px, py] = c.top(xr), yy = py + Math.sin(xr * .09 - c.t * 9) * 3 + 2; xr === -14 ? g.moveTo(px, yy) : g.lineTo(px, yy); } g.stroke(); } g.restore(); } },
  foamGreen: { f(c) { const { g } = c; g.save(); g.lineCap = g.lineJoin = 'round'; for (const [w, a] of [[9, .3], [4, .95]]) { g.strokeStyle = `rgba(210,255,90,${a})`; g.lineWidth = w; g.beginPath(); for (let xr = -14; xr <= c.L * .9; xr += 8) { const [px, py] = c.top(xr), yy = py + Math.sin(xr * .1 - c.t * 8) * 3 + 2; xr === -14 ? g.moveTo(px, yy) : g.lineTo(px, yy); } g.stroke(); } g.restore(); } },
  foamGold: { f(c) { const { g } = c; g.save(); g.lineCap = g.lineJoin = 'round'; for (const [w, a] of [[10, .3], [4, 1]]) { g.strokeStyle = `rgba(255,226,122,${a})`; g.lineWidth = w; g.beginPath(); for (let xr = -14; xr <= c.L * .9; xr += 8) { const [px, py] = c.top(xr), yy = py + Math.sin(xr * .1 - c.t * 8) * 3 + 2; xr === -14 ? g.moveTo(px, yy) : g.lineTo(px, yy); } g.stroke(); } g.restore(); } },
  foamSilver: { f(c) { const { g } = c; g.save(); g.lineCap = g.lineJoin = 'round'; for (const [w, a] of [[8, .3], [3.5, 1]]) { g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = w; g.beginPath(); for (let xr = -14; xr <= c.L * .9; xr += 8) { const [px, py] = c.top(xr), yy = py + Math.sin(xr * .12 - c.t * 7) * 2 + 2; xr === -14 ? g.moveTo(px, yy) : g.lineTo(px, yy); } g.stroke(); } g.restore(); } },
  curl: { f(c) { const { g, x, dir, gy, H } = c, [tx, ty] = c.top(10); g.save(); g.beginPath(); g.moveTo(tx, ty + 2); g.bezierCurveTo(x + dir * 20, gy - H * 1.16, x + dir * 84, gy - H * 1.0, x + dir * 70, gy - H * .66); g.bezierCurveTo(x + dir * 60, gy - H * .74, x + dir * 42, gy - H * .78, x + dir * 30, gy - H * .74); g.bezierCurveTo(x + dir * 46, gy - H * .86, x + dir * 30, gy - H * .96, tx, ty + 16); g.closePath(); g.fillStyle = 'rgba(235,252,255,.92)'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke(); g.restore(); } },
  bubbles: { in: 1, f(c) { const { g } = c; g.save(); for (let i = 0; i < 12; i++) { const xr = hash(i, 3) * c.L * .7, q = (c.t * .7 + hash(i, 9)) % 1, top = c.s(xr), [px] = c.top(xr), yy = c.gy - q * top * .92; g.strokeStyle = 'rgba(255,255,255,.7)'; g.fillStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1.5; g.beginPath(); g.arc(px, yy, 3 + 4 * hash(i, 5), 0, TAU); g.fill(); g.stroke(); } g.restore(); } },
  rings: { in: 1, f(c) { const { g } = c; g.save(); for (let i = 0; i < 4; i++) { const q = (c.t * 1.1 + i / 4) % 1, r = c.H * (.12 + q * .8), [px] = c.top(30 + i * 40); g.strokeStyle = `rgba(255,255,255,${.7 * (1 - q)})`; g.lineWidth = 3 * (1 - q) + 1; g.beginPath(); g.ellipse(px, c.gy - c.H * .5, r * .5, r, 0, 0, TAU); g.stroke(); } g.restore(); } },
  sparkle: { f(c) { const { g } = c; for (let i = 0; i < (c.low ? 6 : 12); i++) { const xr = hash(i, 6) * c.L * .8, tw = .5 + .5 * Math.sin(c.t * 8 + i * 2), [px, py] = c.top(xr); part(g, 'star', px, py + hash(i, 8) * c.s(xr) * .8, 2.4 + 2 * tw, .4 + .6 * tw, '#ffffff', i, c.t); } } },
  puffs: { f(c) { const { g } = c; g.save(); g.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 9; i++) { const xr = i * 30 - 6, [px, py] = c.top(xr), r = 12 + 5 * Math.sin(c.t * 5 + i); g.beginPath(); g.arc(px, py + 2, r, 0, TAU); g.arc(px - c.dir * r * .9, py + 6, r * .8, 0, TAU); g.arc(px + c.dir * r * .8, py + 6, r * .7, 0, TAU); g.fill(); } g.restore(); } },
  flames: { f(c) { const { g } = c; g.save(); g.globalCompositeOperation = 'lighter'; const sc = c.spec.flamesSmall ? .6 : 1; for (let xr = -10, i = 0; xr < c.L * .85; xr += c.spec.flamesSmall ? 18 : 22, i++) { const [px, py] = c.top(xr), hh = (36 + 16 * Math.sin(c.t * 14 + i * 1.7)) * sc * (1 - xr / (c.L * 1.1)) + 10, w = 15 * sc; const gr = g.createLinearGradient(0, py, 0, py - hh); gr.addColorStop(0, 'rgba(255,200,60,.95)'); gr.addColorStop(.6, 'rgba(255,90,20,.7)'); gr.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(px - w, py + 4); g.quadraticCurveTo(px - w * .3, py - hh * .5, px + Math.sin(c.t * 9 + i) * 6, py - hh); g.quadraticCurveTo(px + w * .5, py - hh * .4, px + w, py + 4); g.fill(); } g.restore(); } },
  cracks: { in: 1, f(c) { const { g } = c; g.save(); g.lineCap = g.lineJoin = 'round'; for (let i = 0; i < 7; i++) { const x0 = c.x - c.dir * (hash(i) * c.L * .8), y0 = c.gy - c.H * (.1 + .6 * hash(i, 2)); g.beginPath(); g.moveTo(x0, y0); for (let j = 1; j <= 4; j++) g.lineTo(x0 - c.dir * j * 14, y0 + (hash(i, j) - .5) * 26); g.strokeStyle = `rgba(255,${150 + 80 * Math.sin(c.t * 5 + i) | 0},40,.9)`; g.lineWidth = 3; g.globalCompositeOperation = 'lighter'; g.stroke(); g.strokeStyle = 'rgba(255,240,180,.9)'; g.lineWidth = 1; g.stroke(); } g.restore(); } },
  bolts: { f(c) { const { g } = c; g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = g.lineJoin = 'round'; const fr = Math.floor(c.t * 16); for (let b = 0; b < 3; b++) { let xr = hash(fr, b) * c.L * .5; g.beginPath(); let [px, py] = c.top(xr); g.moveTo(px, py); for (let j = 0; j < 7; j++) { xr += 14 + hash(fr, b + j) * 14; const [qx, qy] = c.top(xr); g.lineTo(qx, qy - 10 + (hash(fr, b * 9 + j) - .5) * 34); } for (const [w, col] of [[7, 'rgba(255,230,60,.35)'], [2.2, '#ffffff']]) { g.strokeStyle = col; g.lineWidth = w; g.stroke(); } } g.restore(); } },
  plasma: { in: 1, f(c) { const { g } = c; g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = g.lineJoin = 'round'; const fr = Math.floor(c.t * 18); for (let b = 0; b < 5; b++) { const xr = 20 + b * 55, [px] = c.top(xr), top = c.s(xr); g.beginPath(); g.moveTo(px, c.gy - top * .96); for (let j = 1; j <= 6; j++) g.lineTo(px + (hash(fr, b * 7 + j) - .5) * 26, c.gy - top * (.96 - j * .16)); for (const [w, col] of [[6, 'rgba(255,255,255,.35)'], [2, '#ffffff']]) { g.strokeStyle = col; g.lineWidth = w; g.stroke(); } } g.restore(); } },
  shards: { f(c) { const { g } = c; for (let xr = -6, i = 0; xr < c.L * .75; xr += 20, i++) { const [px, py] = c.top(xr), hh = (34 + 22 * hash(i, 1)) * (1 - xr / (c.L * 1.1)), w = 9 + 4 * hash(i, 2), tl = c.dir * (.12 + .1 * hash(i, 3)) * hh; poly(g, [[px - w, py + 6], [px + tl * .4 - w * .3, py - hh * .6], [px + tl, py - hh], [px + tl * .4 + w * .4, py - hh * .55], [px + w, py + 6]], 'rgba(225,250,255,.95)', '#fff', 1.2); poly(g, [[px, py + 6], [px + tl, py - hh], [px + tl * .4 + w * .4, py - hh * .55], [px + w, py + 6]], 'rgba(120,205,245,.7)'); } } },
  icicles: { f(c) { const { g } = c; for (let i = 0; i < 9; i++) { const xr = -8 + i * 11, [px, py] = c.top(xr * .2 + 18), yy = c.gy - c.H * (.82 - i * .075), l = 16 + 14 * hash(i, 4); const fx = c.x + c.dir * (20 - i * 1.5); poly(g, [[fx - 5, yy], [fx + 5, yy], [fx + c.dir * 2, yy + l]], 'rgba(235,252,255,.95)', '#fff', 1); } } },
  snow: { in: 1, f(c) { const { g } = c; g.save(); g.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 26; i++) { const xx = (c.t * 220 * (.5 + hash(i, 2)) + hash(i, 1) * 300) % 320, yy = c.gy - c.H * (.04 + .9 * hash(i, 3)) + Math.sin(c.t * 4 + i) * 5; g.beginPath(); g.arc(c.x - c.dir * xx, yy, 1.5 + hash(i, 4) * 2.4, 0, TAU); g.fill(); } g.restore(); } },
  specular: { in: 1, f(c) { const { g } = c; g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { const xx = (c.t * 260 + i * 110) % 330; g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(c.x - c.dir * xx, c.gy); g.lineTo(c.x - c.dir * (xx + 26), c.gy); g.lineTo(c.x - c.dir * (xx + 70), c.gy - c.H * 1.1); g.lineTo(c.x - c.dir * (xx + 44), c.gy - c.H * 1.1); g.fill(); } g.restore(); } },
  mud: { f(c) { const { g } = c; g.save(); g.fillStyle = '#5a3a1c'; for (let xr = -8, i = 0; xr < c.L * .8; xr += 24, i++) { const [px, py] = c.top(xr), r = 9 + 6 * hash(i, 2) + 3 * Math.sin(c.t * 7 + i); g.beginPath(); g.arc(px, py + 3, r, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,230,170,.35)'; g.beginPath(); g.arc(px - 3, py, r * .35, 0, TAU); g.fill(); g.fillStyle = '#5a3a1c'; } g.restore(); } },
  dust: { f(c) { const { g } = c; g.save(); for (let i = 0; i < 8; i++) { const q = (c.t * .9 + i / 8) % 1, px = c.x - c.dir * (40 + q * 260), py = c.gy - 14 - q * 46 - hash(i) * 20; g.fillStyle = `rgba(${c.spec.dustc || '190,170,130'},${.38 * (1 - q)})`; g.beginPath(); g.arc(px, py, 20 + 22 * q, 0, TAU); g.fill(); } g.restore(); } },
  rocks: { in: 1, f(c) { const { g } = c; for (let i = 0; i < 22; i++) { const xr = hash(i, 1) * c.L * .85, top = c.s(xr); if (top < 20) continue; const [px] = c.top(xr), py = c.gy - hash(i, 2) * top * .9, s = 10 + 12 * hash(i, 3); g.save(); g.translate(px, py); g.rotate(c.t * 2 * (i % 2 ? 1 : -1) + i); poly(g, [[-s, 0], [-s * .4, -s], [s, -s * .5], [s * .7, s * .8], [-s * .5, s]], i % 3 ? '#7a6c4c' : '#a4966c', 'rgba(20,12,4,.6)', 1.5); g.restore(); } } },
  riders: { f(c) { const { g } = c; for (let i = 0; i < 4; i++) { const xr = 10 + i * 56, [px, py] = c.top(xr), s = 20 - i * 3; g.save(); g.translate(px, py - s * .4 + Math.sin(c.t * 6 + i) * 4); g.rotate(c.t * 3 * (i % 2 ? 1 : -1) + i); poly(g, [[-s, 0], [-s * .5, -s], [s * .6, -s * .8], [s, s * .2], [s * .3, s * .9], [-s * .6, s * .7]], lg(g, -s, -s, s, s, [[0, '#cfc4a8'], [1, '#6a6048']]), 'rgba(20,12,4,.7)', 2); g.restore(); } } },
  drips: { f(c) { const { g } = c; g.save(); for (let i = 0; i < 9; i++) { const xr = -4 + i * 28, [px, py] = c.top(xr), q = (c.t * .9 + hash(i, 3)) % 1, len = 20 + 40 * q; g.fillStyle = `rgba(216,255,106,${.9 * (1 - q * .6)})`; g.fillRect(px - 2, py + 3, 4, len); g.beginPath(); g.arc(px, py + 3 + len, 4, 0, TAU); g.fill(); } g.restore(); } },
  scales: { in: 1, f(c) { const { g } = c; g.save(); g.strokeStyle = 'rgba(190,170,255,.45)'; g.lineWidth = 1.6; for (let r = 0; r < 6; r++) for (let i = 0; i < 14; i++) { const px = c.x - c.dir * (i * 24 + (r % 2) * 12 - 20), py = c.gy - c.H * .16 * r - 6; g.beginPath(); g.arc(px, py, 12, 0, Math.PI); g.stroke(); } g.restore(); } },
  ribbons: { f(c) { const { g } = c, [c0, c1] = c.spec.rib; g.save(); g.lineCap = g.lineJoin = 'round'; for (let b = 0; b < 3; b++) { const fr = .42 + b * .26, ph = b * 2.1; for (const [w, col] of [[18 - b * 3, c1 + '77'], [8 - b, c0], [2.4, '#ffffff']]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); for (let xr = -10; xr <= c.L; xr += 7) { const [px] = c.top(xr), py = c.gy - c.s(xr) * fr * 1.1 - Math.sin(xr * .045 - c.t * 8 + ph) * 14 * (1 - xr / (c.L * 1.2)); xr === -10 ? g.moveTo(px, py) : g.lineTo(px, py); } g.stroke(); } if (c.spec.head) { const [px] = c.top(-10), py = c.gy - c.s(-10) * fr * 1.1 - Math.sin(-.45 - c.t * 8 + ph) * 14; poly(g, [[px + c.dir * 24, py], [px - c.dir * 4, py - 12], [px - c.dir * 10, py], [px - c.dir * 4, py + 12]], c0, '#fff', 1.5); g.fillStyle = '#ff3a3a'; g.beginPath(); g.arc(px + c.dir * 6, py - 3, 2.6, 0, TAU); g.fill(); } } g.restore(); } },
  arcs: { f(c) { const { g } = c; g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { const xr = i * 62, R = c.H * (.74 - i * .08), cx = c.x - c.dir * (xr + R * .35), cy = c.gy - c.H * .5; for (const [w, col] of [[26 - i * 3, 'rgba(255,90,30,.35)'], [9, 'rgba(255,170,70,.9)'], [3, '#ffffff']]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(cx, cy, R, c.dir > 0 ? -1.0 : Math.PI - 1.0, c.dir > 0 ? 1.0 : Math.PI + 1.0); g.stroke(); } for (let j = 0; j < 3; j++) { const yy = cy + (j - 1) * R * .5; g.strokeStyle = 'rgba(255,190,100,.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(c.x - c.dir * (xr + 50), yy); g.lineTo(c.x - c.dir * (xr + 110 + 20 * j), yy); g.stroke(); } } g.restore(); } },
  aura: { in: 1, f(c) { const { g } = c; g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 16; i++) { const xr = hash(i) * c.L * .85, q = (c.t * 1.2 + hash(i, 2)) % 1, [px] = c.top(xr), top = c.s(xr); g.strokeStyle = `rgba(255,${120 + 100 * hash(i, 4) | 0},60,${.7 * (1 - q)})`; g.lineWidth = 4; g.beginPath(); g.moveTo(px, c.gy - q * top * .5); g.lineTo(px, c.gy - top * (.3 + q * .8)); g.stroke(); } g.restore(); } },
  spikes: { f(c) { const { g } = c; g.save(); g.globalCompositeOperation = 'lighter'; for (let xr = -6, i = 0; xr < c.L * .6; xr += 26, i++) { const [px, py] = c.top(xr), hh = 26 + 18 * Math.sin(c.t * 12 + i * 2); poly(g, [[px - 8, py + 4], [px + c.dir * 4, py - hh], [px + 8, py + 4]], 'rgba(255,170,90,.85)'); } g.restore(); } },
  tendrils: { f(c) { const { g } = c; g.save(); g.fillStyle = '#12081f'; for (let xr = -8, i = 0; xr < c.L * .85; xr += 20, i++) { const [px, py] = c.top(xr), hh = 24 + 16 * Math.sin(c.t * 9 + i * 1.9) + 10 * hash(i, 3); g.beginPath(); g.moveTo(px - 8, py + 6); g.quadraticCurveTo(px - 2, py - hh * .5, px + c.dir * 8 + Math.sin(c.t * 7 + i) * 5, py - hh); g.quadraticCurveTo(px + 6, py - hh * .3, px + 8, py + 6); g.fill(); } g.restore(); } },
  eyes: { in: 1, f(c) { const { g } = c; g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 5; i++) { const xr = 30 + i * 52, top = c.s(xr), [px] = c.top(xr), py = c.gy - top * (.35 + .3 * hash(i, 2)), bl = Math.sin(c.t * 3 + i * 2) > .92 ? .1 : 1; g.fillStyle = '#ff3a4a'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(px + s * 7, py, 3.4, 3.4 * bl, 0, 0, TAU); g.fill(); } } g.restore(); } },
  moons: { in: 1, f(c) { const { g } = c; g.save(); g.fillStyle = 'rgba(190,150,255,.75)'; for (let i = 0; i < 6; i++) { const xx = (c.t * 90 + i * 55) % 320, yy = c.gy - c.H * (.15 + .65 * hash(i, 3)), s = 9 + 5 * hash(i, 4); g.beginPath(); g.arc(c.x - c.dir * xx, yy, s, 0, TAU); g.arc(c.x - c.dir * xx + s * .5, yy - s * .1, s * .85, 0, TAU, true); g.fill(); } g.restore(); } },
  blades: { f(c) { const { g } = c; for (let xr = c.L, i = 0; xr >= -10; xr -= 24, i++) { const [px, py] = c.top(xr), hh = Math.max(14, c.s(xr)) * (.92 + .1 * Math.sin(c.t * 8 + i)), w = 26; g.save(); g.translate(px, c.gy); g.scale(c.dir, 1); g.rotate(.16); poly(g, [[-w / 2, 0], [0, 0], [w * .06, -hh], [-w * .42, -hh * .5]], lg(g, -w / 2, 0, 0, -hh, [[0, '#f4f8ff'], [1, '#a0aec4']])); poly(g, [[0, 0], [w / 2, 0], [w * .42, -hh * .55], [w * .06, -hh]], lg(g, 0, 0, w / 2, -hh, [[0, '#a0aec4'], [1, '#56627a']])); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, 0); g.lineTo(w * .06, -hh); g.stroke(); g.strokeStyle = 'rgba(20,24,34,.7)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(-w * .42, -hh * .5); g.lineTo(w * .06, -hh); g.lineTo(w * .42, -hh * .55); g.lineTo(w / 2, 0); g.stroke(); g.restore(); } } },
};
/* ---------------------------------------------------------------- sprite sheet layer (Cotton Boomerang effects), recoloured per type; the button switches it off to compare */
let SPR_ON = true, curTy = 'water';
const SHEET = new Image(); SHEET.src = 'assets/spfx/cotton.png'; const WAVEIMG = new Image(); WAVEIMG.src = 'assets/spfx/wave.png';
const HSL = { normal: [40, 8, 74], fire: [22, 100, 55], water: [215, 95, 58], electric: [52, 100, 55], grass: [112, 70, 50], ice: [190, 90, 68], fighting: [8, 80, 50], poison: [285, 70, 55], ground: [36, 60, 48], flying: [205, 70, 72], psychic: [325, 90, 65], bug: [78, 75, 48], rock: [38, 35, 52], ghost: [270, 55, 45], dragon: [255, 90, 62], dark: [265, 35, 36], steel: [215, 15, 65], fairy: [330, 90, 78] };
const FRM = {
  flame: { y: 56, h: 63, b: 25, x: [[8, 42], [58, 44], [109, 45], [160, 46], [212, 47]] }, fire: { y: 468, h: 48, b: 22, x: [[4, 48], [56, 48], [108, 48], [160, 48], [212, 47], [264, 48]] },
  orb: { y: 4, h: 48, b: 48, x: [[132, 40]] }, smoke: { y: 668, h: 40, b: 40, x: [[34, 30], [83, 35], [133, 39]] }, sring: { y: 668, h: 40, b: 40, x: [[182, 45], [233, 47]] }, glint: { y: 668, h: 40, b: 48, x: [[376, 24], [376, 24], [320, 24]] },
  crystal: { y: 712, h: 48, b: 195, x: [[163, 42], [218, 35], [268, 40], [316, 48], [368, 47], [423, 41]] }, spear: { y: 847, h: 17, b: 195, x: [[4, 40], [48, 40], [92, 40], [136, 40]] }, dragon: { y: 520, h: 56, b: 15, x: [[276, 76], [360, 79], [449, 79], [200, 69]] },
};
const tcache = new Map();
function tintedFrame(name, i, ty) {
  if (!SHEET.naturalWidth) return null; const key = name + i + ty; let c = tcache.get(key); if (c) return c;
  const F = FRM[name], [x, w] = F.x[i % F.x.length], [h, s, l] = HSL[ty] || HSL.normal; c = document.createElement('canvas'); c.width = w; c.height = F.h; const g = c.getContext('2d');
  g.filter = `hue-rotate(${h - F.b}deg) saturate(${clamp(s / 80, .05, 1.3)}) brightness(${clamp(l / 52, .6, 1.5)})`; g.drawImage(SHEET, x, F.y, w, F.h, 0, 0, w, F.h); tcache.set(key, c); return c;
}
function spr(g, name, i, ty, x, y, sc, rot, a, o = {}) {
  const c = tintedFrame(name, i, ty); if (!c || a <= .01) return; g.save(); g.translate(x, y); g.rotate(rot || 0); if (o.sy) g.scale(1, o.sy); if (o.add) g.globalCompositeOperation = 'lighter'; g.globalAlpha *= a; g.imageSmoothingEnabled = false; g.drawImage(c, -c.width * sc / 2, -c.height * sc / 2, c.width * sc, c.height * sc); g.restore();
}
const WTINT = { electric: [200, 1.1, 1.15], ice: [190, .9, 1.35], ground: [32, .55, .7], poison: [285, .95, .9], dragon: [255, 1, .9], psychic: [325, .9, 1.25], dark: [270, .5, .5], steel: [215, .08, 1.2] };
function waveImg(ty) {
  const t = WTINT[ty]; if (!t) return WAVEIMG; const k = 'wave' + ty; let c = tcache.get(k); if (c) return c; c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d');
  g.filter = `hue-rotate(${t[0] - 235}deg) saturate(${t[1]}) brightness(${t[2]})`; g.drawImage(WAVEIMG, 0, 0); tcache.set(k, c); return c;
}
function waveSprite(g, c, a, ty) { const Hh = c.H * 1.4, Wd = Hh * 2; g.save(); g.globalAlpha = a; g.imageSmoothingEnabled = false; g.translate(c.x, 0); g.scale(c.dir, 1); g.drawImage(waveImg(ty), 30 - Wd, c.gy + 12 - Hh, Wd, Hh); g.restore(); }
const D0 = {}; for (const k of ['curl', 'flames', 'shards', 'icicles', 'puffs', 'dust', 'sparkle', 'ribbons']) D0[k] = DECO[k].f;
DECO.curl.f = c => { if (!c.spriteBody) D0.curl(c); };
DECO.flames.f = c => { if (!SPR_ON) return D0.flames(c); const g = c.g, small = c.spec.flamesSmall; for (let xr = -6, i = 0; xr < c.L * .8; xr += small ? 24 : 28, i++) { const [px, py] = c.top(xr), q = 1 - xr / (c.L * 1.1), sc = (small ? .9 : 1.5) * q + .45; spr(g, 'flame', (i + Math.floor(c.t * 12)) % 5, 'fire', px, py - 16 * sc, sc, 0, .95); } if (!small) for (let i = 0; i < 3; i++) { const [px, py] = c.top(10 + i * 70); spr(g, 'fire', (Math.floor(c.t * 10) + i) % 6, 'fire', px, py - 8, 1 - i * .12, c.t * 3 + i, .9, { add: 1 }); } };
DECO.shards.f = c => { if (!SPR_ON) return D0.shards(c); const g = c.g; for (let xr = -4, i = 0; xr < c.L * .75; xr += 26, i++) { const [px, py] = c.top(xr), q = 1 - xr / (c.L * 1.1); spr(g, 'spear', (i + 3) % 4, 'ice', px + c.dir * 4, py - 14 * q, 1.5 * q + .5, -Math.PI / 2 + c.dir * (.12 + .1 * hash(i)), .98); } };
DECO.icicles.f = c => { if (!SPR_ON) return D0.icicles(c); const g = c.g; for (let i = 0; i < 6; i++) { const fx = c.x + c.dir * (22 - i * 2), yy = c.gy - c.H * (.82 - i * .1); spr(g, 'spear', i % 4, 'ice', fx, yy + 14, 1.15, Math.PI / 2, .95); } };
DECO.puffs.f = c => { if (!SPR_ON) return D0.puffs(c); const g = c.g; for (let i = 0; i < 8; i++) { const [px, py] = c.top(i * 34 - 6); spr(g, 'smoke', i % 3, 'normal', px, py + 4, 1.3 + .25 * Math.sin(c.t * 5 + i), 0, .95); } };
DECO.dust.f = c => { if (!SPR_ON) return D0.dust(c); const g = c.g, ty = curTy === 'ground' || curTy === 'rock' ? curTy : 'ground'; for (let i = 0; i < 7; i++) { const q = (c.t * .9 + i / 7) % 1; spr(g, 'smoke', i % 3, ty, c.x - c.dir * (40 + q * 250), c.gy - 16 - q * 30 - hash(i) * 14, 1.6 + 1.2 * q, c.t + i, .8 * (1 - q)); } };
DECO.sparkle.f = c => { D0.sparkle(c); if (!SPR_ON) return; const g = c.g; for (let i = 0; i < (c.low ? 3 : 6); i++) { const xr = hash(i, 6) * c.L * .8, tw = .5 + .5 * Math.sin(c.t * 8 + i * 2), [px, py] = c.top(xr); spr(g, 'glint', i % 3, curTy, px, py + hash(i, 8) * c.s(xr) * .8, 1 + .6 * tw, c.t * 2, .5 + .5 * tw, { add: 1 }); } };
DECO.ribbons.f = c => { const head = c.spec.head; if (!SPR_ON || !head) return D0.ribbons(c); const sp = c.spec; c.spec = { ...sp, head: 0 }; D0.ribbons(c); c.spec = sp; const g = c.g; for (let b = 0; b < 3; b++) { const fr = .42 + b * .26, ph = b * 2.1, xr0 = -10 + b * 58, [px] = c.top(xr0), py = c.gy - c.s(xr0) * fr * 1.1 - Math.sin(xr0 * .045 - c.t * 8 + ph) * 14 * (1 - xr0 / (c.L * 1.2)); spr(g, 'dragon', b + 1, 'dragon', px + c.dir * 18, py - 6, 1.55 - b * .12, 0, .98); } };
const part0 = part;
part = function (g, kind, x, y, s, a, colr, i, t) {
  if (!SPR_ON || a <= .01) return part0(g, kind, x, y, s, a, colr, i, t);
  if (kind === 'ember') return spr(g, 'fire', i % 6, 'fire', x, y, s * .16, t * 3 + i, a * .9, { add: 1 });
  if (kind === 'spark' || kind === 'star') return spr(g, 'glint', i % 3, curTy, x, y, s * .11 + .35, t * 3 + i, a, { add: 1 });
  if (kind === 'ice') return spr(g, 'spear', i % 4, 'ice', x, y, s * .16, i + t * 3, a);
  if (kind === 'puff') return spr(g, 'smoke', i % 3, 'normal', x, y, s * .35, 0, a * .8);
  part0(g, kind, x, y, s, a, colr, i, t);
};
function spikeH(e) { const k = e.k, rise = easeOutBack(k * 6), r = clamp((k - .55) / .45); return (185 + hash(e.sd) * 45) * rise * (1 - r * r); }
function spikeUnder(g, e) {
  if (!SPR_ON || e.k < 0 || e.k > 1) return; const k = e.k, x = e.x, G = e.G + 4, rk = clamp(k * 3.2);
  if (rk < 1) spr(g, 'sring', 0, e.ty, x, G, 1 + 3.4 * easeOut(rk), 0, (1 - rk) * .9, { sy: .28 });
  if (e.ty === 'ice') { const fk = clamp(k * 2); spr(g, 'crystal', 3, 'ice', x, G, 1.5 + .9 * easeOut(fk), k * 2, (1 - fk * .7) * .85, { sy: .32, add: 1 }); }
}
function spikeOver(g, e) {
  if (!SPR_ON || e.k < 0 || e.k > 1) return; const k = e.k, x = e.x, G = e.G + 4, P = SPP[e.ty];
  if (k < .2) spr(g, 'orb', 0, e.ty, x, G - 18, 1.2 + 4 * k, 0, (1 - k / .2) * .95, { add: 1 });
  for (let j = 0; j < 6; j++) { const side = j < 3 ? -1 : 1, q = clamp(k * 2.2); spr(g, 'smoke', j % 3, e.ty, x + side * (16 + (26 + j * 9) * easeOut(q)), G - 8 - (8 + j * 5) * q, 1 + .7 * q, 0, (1 - q) * .9); }
  const H = spikeH(e); if (H < 20) return;
  if (e.ty === 'ice') for (let i = 0; i < 6; i++) { const ag = k * .6, an = -2.4 + hash(e.sd, i + 20) * 1.7, sp = 170 + hash(e.sd, i + 5) * 170, a = 1 - clamp((ag - .3) / .28); spr(g, 'spear', i % 4, 'ice', x + Math.cos(an) * sp * ag, G + Math.sin(an) * sp * ag + 620 * ag * ag, 1.3, Math.atan2(Math.sin(an) * sp + 1240 * ag, Math.cos(an) * sp), a); }
  if (e.ty === 'steel') { const tw = .5 + .5 * Math.sin(e.t * 10); spr(g, 'glint', 0, 'steel', x + H * .07, G - H, 1.1 + .6 * tw, e.t * 2, .6 + .4 * tw, { add: 1 }); }
  if (e.ty === 'poison') spr(g, 'orb', 0, 'poison', x, G - H * .98, .9 + .2 * Math.sin(e.t * 8), 0, .7, { add: 1 });
  if (e.ty === 'rock') spr(g, 'glint', 0, 'rock', x - H * .02, G - H, .9 + .3 * Math.sin(e.t * 9), e.t, .5, { add: 1 });
}
function spikeFx(g, e) { spikeUnder(g, e); spikeNew(g, e); spikeOver(g, e); }
function drawWave(g, o) {
  curTy = o.ty;
  const spec = SURF[o.ty][o.v], dir = o.dir || 1, rise = easeOut(o.age * 3.2), a = clamp(1 - Math.max(0, o.age - 1.4) / .4); if (a <= 0 || rise <= 0) return;
  const H = o.H * rise * (spec.prof === 'wall' ? 1.05 : 1), L = 300, t = o.t;
  const c = { g, x: o.x, gy: o.gy, dir, age: o.age, t, H, L, spec, low: o.low, s: xr => profile(spec.prof, xr, H, L, t, spec.jag), top: xr => [o.x - dir * xr, o.gy - profile(spec.prof, xr, H, L, t, spec.jag)] };
  g.save(); g.globalAlpha = a;
  if (spec.body) {
    const path = bodyPath(c), [b0, b1, b2] = spec.body;
    if (spec.back) { g.save(); g.translate(-dir * 22, 6); g.globalAlpha = a * .3; g.fillStyle = b2; g.fill(path); g.restore(); }
    if (spec.sbody && (SPR_ON || spec.sbody === 'always') && WAVEIMG.naturalWidth) { c.spriteBody = true; waveSprite(g, c, a, spec.sbody === 'always' ? 'water' : o.ty); }
    else { g.save(); g.globalAlpha = a * (spec.a || .94); g.fillStyle = lg(g, 0, o.gy - H * 1.05, 0, o.gy, [[0, b0], [.28, b1], [1, b2]]); g.fill(path); g.restore(); }
    if (spec.rim) { g.save(); g.strokeStyle = spec.rim; g.lineWidth = 2.5; g.globalAlpha = a * .85; g.stroke(path); g.restore(); }
    g.save(); g.clip(path); for (const d of spec.deco) if (DECO[d].in) DECO[d].f(c); g.restore();
  } else for (const d of spec.deco) if (DECO[d].in) DECO[d].f(c);
  for (const d of spec.deco) if (!DECO[d].in) DECO[d].f(c);
  const [kind, colr] = spec.part, N = o.low ? 8 : 15; for (let i = 0; i < N; i++) { const p = (t * 1.5 + i / N) % 1, xr = hash(i) * L * .4 - 12, [px, py] = c.top(xr), x = px + dir * (6 + hash(i, 2) * 34) * p, y = py - (58 * Math.sin(p * Math.PI * .92) + 8) * (.5 + hash(i, 3)); part(g, kind, x, y, 2.5 + hash(i, 4) * 3.5, 1 - p, colr, i, t); }
  g.restore();
}

  for (const k in SURF) SURF[k].length = 1; // one wave per type
  // ---- game hooks
  function spike(g, p, G, t) { // p: a pillar { x, t, delay, ty, sd }
    spikeFx(g, { x: p.x, G, ty: SPP[p.ty] ? p.ty : 'rock', k: (p.t - p.delay) / .6, t, sd: p.sd || 0 });
  }
  const surfType = w => SURF[w.wt] ? w.wt : 'water'; // w.wt: the caster's type
  function surf(g, w, gy, t, low) { drawWave(g, { x: w.x, gy, ty: surfType(w), v: 0, age: w.t, t, H: 175, low, dir: Math.sign(w.vx) || 1 }); }
  let splashes = [];
  function splash(x, y, w, now) { splashes.push({ x, y, ty: surfType(w), t0: now }); if (splashes.length > 6) splashes.shift(); }
  function drawSplashes(g, now) {
    splashes = splashes.filter(s => now - s.t0 >= 0 && now - s.t0 < .6);
    for (const s of splashes) {
      const age = now - s.t0, [kind, colr] = SURF[s.ty][0].part; curTy = s.ty;
      for (let i = 0; i < 12; i++) { const an = -2.6 + hash(i) * 2.1, sp = (160 + hash(i, 2) * 160) * 1.25; part(g, kind, s.x + Math.cos(an) * sp * age, s.y + Math.sin(an) * sp * age + 620 * age * age, 4 + hash(i, 3) * 5, 1 - age / .6, colr, i, now); }
    }
  }
  return { spike, surf, splash, drawSplashes };
})();
