'use strict';
// ---------------------------------------------------------------- weather looks, four new weathers, rock slides and lightning strikes (loaded after game.js)
(() => {
  const V = VAR;
  Object.assign(WEATHER, {
    snow: { name: 'SNOW', icon: 'weather-snowy-heavy', up: ['ice'], down: [], col: '#e8f4ff' },
    fog: { name: 'FOG', icon: 'blur', up: ['ghost', 'dark'], down: [], col: '#c8d0dc' },
    thunder: { name: 'THUNDERSTORM', icon: 'weather-lightning', up: ['electric'], down: ['fire'], col: '#ffe54a' },
    cyclone: { name: 'CYCLONE', icon: 'weather-tornado', up: ['flying', 'dragon'], down: [], col: '#9fd0c8' },
  });
  const add = (id, ...w) => { const l = THEME_WEATHER[id]; if (l) l.push(...w.filter(x => !l.includes(x))); else THEME_WEATHER[id] = ['clear', ...w]; };
  add('ice', 'snow'); add('frozenlake', 'snow'); add('forest', 'fog'); add('ruins', 'fog', 'thunder'); add('night', 'fog', 'thunder'); add('shrine', 'fog'); add('glade', 'fog');
  add('storm', 'thunder'); add('canyon', 'cyclone'); add('desert', 'cyclone'); add('cliffs', 'cyclone', 'fog'); add('redcanyon', 'cyclone'); add('plaza', 'thunder'); add('city', 'thunder'); add('champion', 'thunder'); add('stadium', 'thunder');

  // pseudo-random per index: the look never changes the simulation
  const h = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
  const dim = () => { };
  const old = g => { g.save(); g.scale(960 / W, 480 / H); _dw(g); g.restore(); }; // the original weather draws in real pixels
  const Q = n => Math.ceil(n * (lowQ ? .6 : 1));
  const cloudBand = (g, t, col, a, y0, n) => { g.save(); g.fillStyle = col; g.globalAlpha = a; for (let i = 0; i < n; i++) { const x = ((i * 190 + t * (10 + i % 3 * 6)) % (960 + 360)) - 180; for (let j = 0; j < 4; j++) { g.beginPath(); g.ellipse(x + j * 52 - 70, y0 + (i % 3) * 16 + Math.sin(j * 2 + i) * 8, 78 - j * 6, 34, 0, 0, 6.283); g.fill(); } } g.restore(); };
  const splashes = (g, t, n) => { g.save(); g.strokeStyle = 'rgba(210,230,255,.55)'; g.lineWidth = 1.3; for (let i = 0; i < Q(n); i++) { const ph = (t * 2.4 + h(i, 1) * 5) % 1, x = h(i, 2) * 960, y = 372 + h(i, 3) * 96; g.globalAlpha = (1 - ph) * .7; g.beginPath(); g.ellipse(x, y, 3 + ph * 11, (3 + ph * 11) * .3, 0, 0, 6.283); g.stroke(); } g.restore(); };
  const streaks = (g, t, n, len, spd, drift, col, lw, seed) => { g.save(); g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); for (let i = 0; i < Q(n); i++) { const x = ((h(i, seed) * (960 + 120) + t * drift) % (960 + 120)) - 60, y = ((h(i, seed + 7) * (480 + 80) + t * spd * (.75 + h(i, seed + 3) * .5)) % (480 + 80)) - 40; g.moveTo(x, y); g.lineTo(x - len * drift / spd, y + len); } g.stroke(); g.restore(); };
  function bolt(g, x0, a) {
    let s = Math.floor(now * 30) * 9301 + 49297; const R = () => (s = (s * 9301 + 49297) % 233280) / 233280; let x = x0, y = 0; const pts = [[x, y]];
    while (y < 330) { y += 28 + R() * 30; x += (R() - .5) * 60; pts.push([x, y]); }
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round'; for (const [w, c] of [[9, `rgba(255,230,90,${a * .4})`], [3.5, `rgba(255,255,255,${a})`]]) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); } g.restore();
  }

  const _dw = drawWeather;
  drawWeather = function (g) {
    if (!weather) return _dw(g);
    const id = weather.id, t = now; g.save(); g.scale(W / 960, H / 480);
    if (id === 'rain') {
      g.save(); dim(g, 'rgba(18,28,56,.20)'); cloudBand(g, t, '#46526e', .35, 14, 6); g.restore();
      streaks(g, t, 90, 30, 1250, 240, 'rgba(200,225,255,.7)', 2, 1); streaks(g, t, 50, 18, 800, 150, 'rgba(190,220,255,.3)', 1, 5); splashes(g, t, 26);
      g.save(); const gr = g.createLinearGradient(0, 480 * .75, 0, 480); gr.addColorStop(0, 'rgba(160,190,230,0)'); gr.addColorStop(1, 'rgba(160,190,230,.22)'); g.fillStyle = gr; g.fillRect(0, 480 * .75, 960, 480 * .25); g.restore();
    } else if (id === 'thunder') {
      g.save(); dim(g, 'rgba(8,10,28,.36)'); cloudBand(g, t, '#2a2f48', .6, 10, 7); cloudBand(g, t, '#3a4160', .35, 44, 5); g.restore();
      streaks(g, t, 120, 34, 1450, 380, 'rgba(180,205,255,.6)', 1.8, 11); streaks(g, t, 60, 20, 900, 200, 'rgba(180,205,255,.3)', 1, 15); splashes(g, t, 30);
      const k = Math.floor(t / 4.3), ph = (t / 4.3 - k) * 4.3, fl = h(k, 9) < .75 ? Math.max(0, 1 - ph / .5) * (ph < .5 ? (Math.sin(ph * 60) > -.2 ? 1 : .35) : 0) : 0;
      if (fl > 0) { g.save(); g.fillStyle = `rgba(235,240,255,${fl * .35})`; g.fillRect(0, 0, 960, 480); g.restore(); bolt(g, 120 + h(k, 4) * (960 - 240), fl); }
    } else if (id === 'snow') {
      g.save(); dim(g, 'rgba(200,225,255,.10)'); g.fillStyle = '#fff';
      for (let i = 0; i < Q(120); i++) { const near = i % 3 === 0, sz = near ? 4.5 : 2.6, x = ((h(i, 1) * (960 + 80) + t * (28 + h(i, 5) * 30) + Math.sin(t * 1.3 + i) * 20) % (960 + 80)) - 40, y = ((h(i, 2) * (480 + 40) + t * (near ? 90 : 55) * (.7 + h(i, 6) * .6)) % (480 + 40)) - 20; g.globalAlpha = near ? .9 : .6; g.beginPath(); g.arc(x, y, sz, 0, 6.283); g.fill(); }
      g.globalAlpha = 1; const gr = g.createLinearGradient(0, 480 * .7, 0, 480); gr.addColorStop(0, 'rgba(235,245,255,0)'); gr.addColorStop(1, 'rgba(235,245,255,.3)'); g.fillStyle = gr; g.fillRect(0, 480 * .7, 960, 480 * .3); g.restore();
    } else if (id === 'fog') {
      g.save(); dim(g, 'rgba(215,222,235,.20)');
      for (let i = 0; i < 6; i++) { const y = 150 + i * 56, x = ((t * (8 + i * 3) * (i % 2 ? 1 : -1) - camX * .1 * (i + 1)) % 600 + 600) % 600 - 600; const gr = g.createLinearGradient(0, y - 40, 0, y + 40); gr.addColorStop(0, 'rgba(235,240,248,0)'); gr.addColorStop(.5, `rgba(235,240,248,${.22 + .06 * Math.sin(t * .5 + i)})`); gr.addColorStop(1, 'rgba(235,240,248,0)'); g.fillStyle = gr; for (let k = 0; k < 3; k++) g.fillRect(x + k * 600, y - 40, 640, 80); }
      g.restore();
    } else if (id === 'cyclone') {
      g.save(); dim(g, 'rgba(70,80,70,.22)'); const fx = 960 * .5 + Math.sin(t * .35) * 320, base = 396;
      g.globalAlpha = .55; for (let i = 0; i < 22; i++) { const u = i / 21, y = base - u * 380, w = 16 + u * 150, x = fx + Math.sin(t * 2.2 + u * 5) * (14 + u * 26); g.fillStyle = i % 2 ? '#5f6a60' : '#778078'; g.beginPath(); g.ellipse(x, y, w, 12 + u * 6, 0, 0, 6.283); g.fill(); }
      g.globalAlpha = .8; g.fillStyle = '#c9d6c0'; for (let i = 0; i < Q(40); i++) { const u = (h(i, 1) * 3 + t * .35) % 1, a = t * (3 + h(i, 2) * 3) + i, r = 18 + u * 150, x = fx + Math.cos(a) * r, y = base - u * 370 + Math.sin(a) * 10; g.beginPath(); g.ellipse(x, y, 5, 2, a, 0, 6.283); g.fill(); }
      g.restore(); streaks(g, t, 40, 6, 80, 1100, 'rgba(230,235,220,.4)', 1.5, 21);
    } else if (id === 'sun') {
      g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(960 * .9, -20, 10, 960 * .9, -20, 520); gr.addColorStop(0, 'rgba(255,240,170,.5)'); gr.addColorStop(.5, 'rgba(255,200,90,.14)'); gr.addColorStop(1, 'rgba(255,200,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, 960, 480);
      for (let i = 0; i < 6; i++) { const a = 1.9 + i * .17 + Math.sin(t * .4 + i) * .03; g.fillStyle = `rgba(255,235,160,${.05 + .025 * Math.sin(t + i * 2)})`; g.beginPath(); g.moveTo(960 * .9, -20); g.lineTo(960 * .9 + Math.cos(a - .04) * 900, -20 + Math.sin(a - .04) * 900); g.lineTo(960 * .9 + Math.cos(a + .04) * 900, -20 + Math.sin(a + .04) * 900); g.fill(); }
      g.restore();
    } else if (id === 'sand') {
      g.save(); dim(g, 'rgba(200,150,80,.18)'); g.restore(); old(g);
      g.save(); g.strokeStyle = 'rgba(245,215,150,.3)'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i < 30; i++) { const x = (((i * 211 - t * 1300) % (960 + 300)) + 960 + 300) % (960 + 300) - 150, y = h(i, 4) * 480; g.moveTo(x, y); g.lineTo(x + 90, y + 4); } g.stroke(); g.restore();
    } else if (id === 'hail') {
      old(g);
    } else old(g);
    g.restore();
  };

  // ---- sim side: thunderstorm bolts, cyclone wind, rock slides and lightning strikes
  const TINT = { thunder: 'rgba(8,10,30,.42)', snow: 'rgba(205,228,255,.12)', fog: 'rgba(222,228,240,.30)', cyclone: 'rgba(80,92,72,.28)' };
  const _ut = updateTint;
  updateTint = function () { _ut(); const c = weather && TINT[weather.id]; if (c) { const el = $('tint'), cur = el.style.backgroundImage; el.style.backgroundImage = (cur && cur !== 'none' ? cur + ',' : '') + `linear-gradient(${c},${c})`; } };
  const T = { rs: 0, lt: 0, th: 0, wid: '' };
  const strikeAt = (kind, ty, x, dmg, r, warn) => hazards.push({ kind, ty, x: clamp(x, WALL_L + 60, WALL_R - 60), dmg, r, every: [9, 9], t: 0, warn, done: false });

  function debris(cx, n) {
    for (let i = 0; i < n; i++) V.spawn({ kind: 'debris', x: cx + rnd(150, 800), y: -rnd(20, 260), vx: -rnd(520, 860), vy: rnd(240, 480), sz: rnd(34, 70), rot: rnd(0, 6), spin: rnd(-9, 9), life: 3, upd: (e, dt) => { e.x += e.vx * dt; e.y += e.vy * dt; e.rot += e.spin * dt; return e.y < GROUND + 40; }, draw: (g, e) => spr(g, 'rocks', e.x, e.y, e.sz, e.rot) });
  }
  V.extraWorld = dt => {
    const wid = weather ? weather.id : ''; if (wid !== T.wid) { T.wid = wid; updateTint(); } // the screen tint follows the sky, including when a weather move ends
    if (practice || lab) return;
    // rock slide: rocks tumble across the arena and drop around both fighters
    T.rs -= dt; if (T.rs <= 0) {
      T.rs = rnd(42, 62); showMsg('ROCK SLIDE!', 1400); sfx('boom'); const cx = (P.x + E.x) / 2; debris(cx, 12);
      for (let i = 0; i < 8; i++) { const tg = i % 2 ? P : E; strikeAt('rock', 'rock', tg.x + rnd(-260, 260), 48, 60, .9 + i * .3); }
    }
    // lightning strike: bolts fall on both fighters one after another
    T.lt -= dt; if (T.lt <= 0) {
      T.lt = rnd(26, 40); showMsg('LIGHTNING STRIKE!', 1300);
      for (let i = 0; i < 4; i++) { const tg = i % 2 ? P : E; strikeAt('bolt', 'electric', tg.x + rnd(-110, 110), 60, 75, 1 + i * .55); }
    }
    if (weather && weather.id === 'thunder') { T.th -= dt; if (T.th <= 0) { T.th = rnd(3.6, 5.6); const tg = Math.random() < .5 ? P : E; strikeAt('bolt', 'electric', tg.x + rnd(-130, 130), 45, 70, .95); } } else T.th = Math.max(T.th, 2);
    if (weather && weather.id === 'cyclone') { const w = Math.sign(Math.sin(now * .5)) * 75 * dt; for (const f of [P, E]) if (!f.dead && f.hitT <= 0 && f.z + f.lift < 60) f.x = clamp(f.x + w * (f.kit.types.includes('flying') ? .3 : 1), WALL_L, WALL_R); }
  };
  V.moveResetWx = () => { T.rs = rnd(38, 55); T.lt = rnd(22, 34); T.th = 2; };
})();
