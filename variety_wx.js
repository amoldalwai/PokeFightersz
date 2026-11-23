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

  // ---- twelve new arenas, placed after Red Canyon Gate and before the Wasteland
  const NEW_MAPS = [
    ['clockwork', 'Clockwork Citadel', '#c9a47a', ['clear', 'sun', 'rain', 'thunder', 'cyclone'], 'dust'], ['spiritruins', 'Spirit Ruins', '#5a5aa0', ['clear', 'fog', 'thunder', 'rain'], 'fly'],
    ['dinofalls', 'Dino Falls', '#c9a47a', ['clear', 'sun', 'rain', 'fog', 'thunder'], 'leaf'], ['cosmic', 'Cosmic Crystals', '#6a64a8', ['clear', 'thunder', 'snow'], 'fly'],
    ['bamboo', 'Bamboo Grove', '#8cc84a', ['clear', 'sun', 'rain', 'fog', 'cyclone'], 'leaf'], ['lakeside', 'Lakeside Clearing', '#d9a768', ['clear', 'sun', 'rain', 'thunder', 'cyclone'], 'dust'],
    ['moonlake', 'Moonlit Lake', '#5d6a9a', ['clear', 'fog', 'rain', 'thunder'], 'fly'], ['sunsetruins', 'Sunset Ruins', '#d99a62', ['clear', 'sun', 'sand', 'cyclone', 'rain'], 'dust'],
    ['skyisles', 'Sky Islands', '#8cd048', ['clear', 'sun', 'rain', 'thunder', 'cyclone'], 'leaf'], ['sunken', 'Sunken Temple', '#7aa2c0', ['clear'], undefined],
    ['starshrine', 'Starlit Shrine', '#7a74b8', ['clear', 'fog', 'thunder', 'snow'], 'fly'], ['suntemple', 'Sun Temple', '#e8b878', ['clear', 'sun', 'sand', 'cyclone'], 'dust'],
  ];
  { const fresh = []; for (const [id, name, gc, wx, amb] of NEW_MAPS) { fresh.push({ id, name, file: id + '.jpg' }); GROUND_COL[id] = gc; THEME_WEATHER[id] = wx; if (amb) AMBIENT[id] = amb; } const at = THEMES.findIndex(t => t.id === 'desert'); THEMES.splice(at < 0 ? THEMES.length : at, 0, ...fresh); } // they sit between Red Canyon Gate and the Wasteland
  for (const id of ['bamboo', 'skyisles', 'dinofalls']) TUFT_MAPS.add(id);

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
      g.save();
      const blob = (x, y, rx, ry, a) => { g.save(); g.translate(x, y); g.scale(1, ry / rx); const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, `rgba(236,241,249,${a})`); gr.addColorStop(.55, `rgba(236,241,249,${a * .5})`); gr.addColorStop(1, 'rgba(236,241,249,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, 6.283); g.fill(); g.restore(); };
      for (let i = 0; i < Q(10); i++) { const span = 960 + 700, x = (((h(i, 1) * span + t * (6 + h(i, 2) * 10) * (i % 2 ? 1 : -1) - camX * .08 * (1 + i % 3)) % span) + span) % span - 350; blob(x, 270 + h(i, 3) * 170, 240 + h(i, 4) * 200, 60 + h(i, 5) * 60, .42 + .08 * Math.sin(t * .5 + i)); }
      const fg = g.createLinearGradient(0, 480 * .72, 0, 480); fg.addColorStop(0, 'rgba(236,241,249,0)'); fg.addColorStop(1, 'rgba(236,241,249,.14)'); g.fillStyle = fg; g.fillRect(0, 480 * .72, 960, 480 * .28);
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
  const TINT = { thunder: 'rgba(8,10,30,.42)', snow: 'rgba(205,228,255,.12)', fog: 'rgba(222,228,240,.08)', cyclone: 'rgba(80,92,72,.28)' };
  const _ut = updateTint;
  updateTint = function () { _ut(); const c = weather && TINT[weather.id]; if (c) { const el = $('tint'), cur = el.style.backgroundImage; el.style.backgroundImage = (cur && cur !== 'none' ? cur + ',' : '') + `linear-gradient(${c},${c})`; } };
  const T = { rs: 0, lt: 0, th: 0, wid: '' };
  const strikeAt = (kind, ty, x, dmg, r, warn, sz) => hazards.push({ kind, ty, x: clamp(x, WALL_L + 60, WALL_R - 60), dmg, r, sz, every: [9, 9], t: 0, warn, done: false });

  // the same pixel boulders the Rock moves use (rock1 to rock3), with a soft shadow on the floor
  V.drawRock = (g, x, y, size, rot, seed) => {
    const k = 1 + Math.floor(Math.abs(seed)) % 3, sh = clamp(1 - (GROUND - y) / 420, 0, 1);
    if (sh > 0) { g.save(); g.fillStyle = `rgba(0,0,0,${.25 * sh})`; g.beginPath(); g.ellipse(x, GROUND + 14, size * .35 * sh, size * .08 * sh, 0, 0, 6.283); g.fill(); g.restore(); }
    spr(g, 'rock' + k, x, y, size, rot);
  };

  function debris(cx, n) {
    for (let i = 0; i < n; i++) V.spawn({ kind: 'debris', x: cx + rnd(150, 800), y: -rnd(20, 260), vx: -rnd(520, 860), vy: rnd(240, 480), sz: rnd(50, 130), rot: rnd(0, 6), spin: rnd(-9, 9), life: 3.2, upd: (e, dt) => { e.x += e.vx * dt; e.y += e.vy * dt; e.rot += e.spin * dt; return e.y < GROUND + 40; }, draw: (g, e) => V.drawRock(g, e.x, e.y, e.sz, e.rot, e.seed), seed: i * 13 + 5 });
  }
  const doRock = () => { V.banner('rock'); sfx('boom'); debris((P.x + E.x) / 2, 16); for (let i = 0; i < 8; i++) { const tg = i % 2 ? P : E; strikeAt('rock', 'rock', tg.x + rnd(-260, 260), 55, 90, 1.1 + i * .3, rnd(110, 190)); } };
  const doBolt = () => { V.banner('bolt'); for (let i = 0; i < 4; i++) { const tg = i % 2 ? P : E; strikeAt('bolt', 'electric', tg.x + rnd(-110, 110), 60, 75, 1 + i * .55); } };
  V.forceRock = doRock; V.forceBolt = doBolt;
  V.forceWave = () => { const h = HAZARD[curTheme.id] || HAZARD.cave; V.banner('hazard'); for (let i = 0; i < 3; i++) { const tg = i % 2 ? P : E; hazards.push({ ...h, x: clamp(tg.x + rnd(-200, 200), WALL_L + 60, WALL_R - 60), t: 0, warn: .95 + i * .45, done: false }); } };
  V.extraWorld = dt => {
    const wid = weather ? weather.id : ''; if (wid !== T.wid) { T.wid = wid; updateTint(); } // the screen tint follows the sky, including when a weather move ends
    if (practice || lab || !V.S.evMatch) return;
    // rock slide: big rocks tumble across the arena and drop around both fighters
    T.rs -= dt; if (T.rs <= 0) { T.rs = rnd(42, 62); doRock(); }
    // lightning strike: bolts fall on both fighters one after another
    T.lt -= dt; if (T.lt <= 0) { T.lt = rnd(26, 40); doBolt(); }
    if (weather && weather.id === 'thunder') { T.th -= dt; if (T.th <= 0) { T.th = rnd(3.6, 5.6); const tg = Math.random() < .5 ? P : E; strikeAt('bolt', 'electric', tg.x + rnd(-130, 130), 45, 70, .95); } } else T.th = Math.max(T.th, 2);
    if (weather && weather.id === 'cyclone') { const w = Math.sign(Math.sin(now * .5)) * 75 * dt; for (const f of [P, E]) if (!f.dead && f.hitT <= 0 && f.z + f.lift < 60) f.x = clamp(f.x + w * (f.kit.types.includes('flying') ? .3 : 1), WALL_L, WALL_R); }
  };
  V.moveResetWx = () => { T.rs = rnd(38, 55); T.lt = rnd(22, 34); T.th = 2; };

  // ---- weather choice: AUTO lets the sky change during the fight, anything else is fixed for the whole match
  const WX_OPTS = [['auto', 'Weather: Auto'], ['clear', 'Weather: Clear'], ['sun', 'Weather: Sun'], ['rain', 'Weather: Rain'], ['thunder', 'Weather: Thunderstorm'], ['snow', 'Weather: Snow'], ['fog', 'Weather: Fog'], ['cyclone', 'Weather: Cyclone'], ['sand', 'Weather: Sandstorm'], ['hail', 'Weather: Hail']];
  let sel = 'auto'; try { const v = localStorage.getItem('pf_wx'); if (WX_OPTS.some(o => o[0] === v)) sel = v; } catch (e) { }
  V.S.wxMatch = 'auto';
  // dynamic events (rock slides, lightning, timed events, weather shifts, hazard waves, extra pickups) can be switched off for a match
  let evOn = true; try { evOn = localStorage.getItem('pf_ev') !== '0'; } catch (e) { }
  V.S.evMatch = true;
  V.evOn = () => evOn;
  const setEvBtn = (b, on) => { b.textContent = 'Events: ' + (on ? 'On' : 'Off'); b.classList.toggle('off', !on); };
  V.setEv = on => { evOn = !!on; try { localStorage.setItem('pf_ev', evOn ? '1' : '0'); } catch (e) { } for (const id of ['evBtn', 'nEvBtn']) { const b = document.getElementById(id); if (b) setEvBtn(b, evOn); } };
  V.wxSel = () => sel;
  V.setWx = v => { if (!WX_OPTS.some(o => o[0] === v)) v = 'auto'; sel = v; try { localStorage.setItem('pf_wx', v); } catch (e) { } for (const id of ['wxSel', 'nWxSel']) { const s = document.getElementById(id); if (s && s.value !== v) s.value = v; } };
  V.lobbyWx = (host, cfg) => {
    const s = document.getElementById('nWxSel'); if (!s) return; const v = host ? sel : (cfg && cfg.wx) || 'auto'; if (s.value !== v) s.value = v; s.disabled = !host;
    const b = document.getElementById('nEvBtn'); if (b) { b.disabled = !host; setEvBtn(b, host ? evOn : !cfg || cfg.ev !== 0); }
  };
  const _sm = startMatch;
  startMatch = function (opts) { const ol = opts && opts.online; V.S.wxMatch = ol ? (ol.wx || 'auto') : V.S.nextRule ? 'auto' : sel; V.S.evMatch = ol ? ol.ev !== 0 : V.S.nextRule ? true : evOn; return _sm.apply(this, arguments); };
  const _pw = pickWeather;
  pickWeather = function () {
    const id = V.S.wxMatch; if (!id || id === 'auto' || (id !== 'clear' && !WEATHER[id])) return _pw();
    const el = $('wx'); weather = id === 'clear' ? null : { id, ...WEATHER[id] }; weatherBase = weather; rainFx = false;
    if (weather) { el.innerHTML = ico(weather.icon) + weather.name + `<small>${weather.up.map(t => t.toUpperCase()).join('/')} +20%</small>`; el.style.setProperty('--c', weather.col); el.classList.add('on'); } else el.classList.remove('on');
  };
  const _sw = setWeather;
  setWeather = function (id, dur) { if (V.S.wxMatch !== 'auto') return; _sw(id, dur); updateTint(); }; // a chosen weather stays, even against weather moves
  const style = document.createElement('style');
  style.textContent = '.arctl{position:absolute;top:5px;left:6px;right:6px;display:flex;gap:4px;z-index:4}.wxsel{flex:1;min-width:0;background:rgba(10,16,40,.82);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:9px;font:700 10px system-ui,sans-serif;letter-spacing:.3px;padding:3px 4px}.evbtn{flex:none;width:76px;background:rgba(20,70,40,.88);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:9px;font:700 10px system-ui,sans-serif;letter-spacing:.3px;padding:3px 2px;cursor:pointer}.evbtn.off{background:rgba(90,30,30,.88)}.wxsel:disabled,.evbtn:disabled{opacity:.75}';
  document.head.appendChild(style);
  const mkCtl = (wid, bid, host) => {
    const a = document.getElementById(host); if (!a) return; const row = document.createElement('div'); row.className = 'arctl'; row.onclick = e => e.stopPropagation();
    const s = document.createElement('select'); s.id = wid; s.className = 'wxsel'; s.title = 'Auto lets the weather change during the fight; any other choice stays all match'; s.innerHTML = WX_OPTS.map(o => `<option value="${o[0]}">${o[1]}</option>`).join(''); s.value = sel;
    const b = document.createElement('button'); b.id = bid; b.className = 'evbtn'; b.title = 'Rock slides, lightning, zero gravity, blackout and other timed events'; setEvBtn(b, evOn); row.appendChild(s); row.appendChild(b); a.appendChild(row); return [s, b];
  };
  const mc = mkCtl('wxSel', 'evBtn', 'arenaPrev'); if (mc) { mc[0].onchange = () => V.setWx(mc[0].value); mc[1].onclick = () => V.setEv(!evOn); }
  mkCtl('nWxSel', 'nEvBtn', 'nArenaPrev');
})();
