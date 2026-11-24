'use strict';
// ---------------------------------------------------------------- map intro: a Ken Burns camera over the arena (a random dolly or reveal), an animated map name (random of five), a push-in on each fighter, then back to the fight.
// The clock (S.cin.t) runs in the sim and holds introT at 0, so online both phones stay in step. Camera, name, cards, bars and atmosphere are render-only.
(() => {
  const V = VAR, S = V.S, DUR = 6;
  let enabled = true; try { enabled = localStorage.getItem('pf_cin') !== '0'; } catch (e) { }
  S.cin = null; let cam = null;
  const NAMES = ['drop', 'slash', 'decode', 'stamp', 'banner'], CAMS = ['dolly', 'reveal']; let lastNm = '', lastCm = '';
  const rollFrom = (pool, last) => { const o = pool.filter(x => x !== last); return o[Math.floor(Math.random() * o.length)]; }; // a different style every match, never the same twice in a row

  V.cinOn = () => !!(S.cin && S.cin.on && state === 'intro');
  V.cinStart = () => { S.cin = null; if (practice || lab || demo || !P || !E || (!NETG.on && !enabled)) return; lastNm = rollFrom(NAMES, lastNm); lastCm = rollFrom(CAMS, lastCm); S.cin = { on: true, t: 0, dur: DUR, vis: true, built: false, nm: lastNm, cm: lastCm, cx0: undefined }; };
  V.cinHold = dt => { const c = S.cin; if (!c || !c.on || introT < 0) return false; c.t += dt; if (c.t >= c.dur) { c.on = false; return false; } return true; };
  V.cinSkip = () => { const c = S.cin; if (!c || !c.on || state !== 'intro' || introT < 0 || !c.vis) return; if (NETG.on) c.vis = false; else c.t = c.dur; }; // online the fight still starts together, so skipping only changes what you see

  // ---- camera: keyframes are [time, world x, zoom, focus y, roll in degrees]; each segment has its own easing
  const io = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, sine = t => -(Math.cos(Math.PI * t) - 1) / 2, lin = t => t, outC = t => 1 - Math.pow(1 - t, 3);
  const expo = t => t <= 0 ? 0 : t >= 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2, back = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const EZ = { sine, io, lin, out: outC, expo, back };
  function track(nat, cm) {
    const mid = (P.x + E.x) / 2 - W / 2, cl = x => clamp(x, 0, WORLD_W - W), fyN = H * .56, body = f => GROUND - f.h * .5;
    const fighters = (r1, r2) => [[2.9, cl(P.x - W / 2 - 130), 1.7, body(P), -r1], [3.9, cl(P.x - W / 2 - 110), 1.78, body(P), -r1 * .6], [4.5, cl(E.x - W / 2 + 130), 1.7, body(E), r2], [5.4, cl(E.x - W / 2 + 110), 1.78, body(E), r2 * .6]];
    if (cm === 'reveal') return { K: [[0, cl(mid + 520), 1.7, fyN + 40, 2.2], [1.4, cl(mid + 60), .82, fyN, -.3], [2.1, cl(mid + 330), .92, fyN, .3], ...fighters(1.2, 1.2), [6, nat, 1, fyN, 0]], E: ['out', 'io', 'expo', 'lin', 'expo', 'lin', 'back'] }; // opens tight, pulls out to reveal, whips to each fighter, punches out
    return { K: [[0, cl(mid - 420), .8, fyN + 70, -1.4], [1.1, cl(mid - 100), .86, fyN + 25, -.5], [2.1, cl(mid + 300), .98, fyN - 10, .6], ...fighters(1.6, 1.6), [6, nat, 1, fyN, 0]], E: ['sine', 'sine', 'io', 'lin', 'io', 'lin', 'io'] }; // crane up and across, dutch tilts that level out
  }
  function evalK(tr, t) { const K = tr.K; t = clamp(t, 0, DUR); let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++; const a = K[i], b = K[i + 1], e = EZ[tr.E[i]](clamp((t - a[0]) / (b[0] - a[0]), 0, 1)), l = j => a[j] + (b[j] - a[j]) * e; return { cx: l(1), z: l(2), fy: l(3), roll: l(4) }; }
  const active = () => S.cin && S.cin.on && S.cin.vis && state === 'intro' && introT >= 0;
  V.cinX = () => { // after the normal camera pan: replace it with the intro path
    if (!active()) { cam = null; return; }
    const tr = track(camX, S.cin.cm || 'dolly'), t = clamp(S.cin.t, 0, DUR), c = evalK(tr, t), a = evalK(tr, t - .03), b = evalK(tr, t + .03), hh = Math.min(1, t / .6) * (1 - clamp((t - 5.4) / .6, 0, 1)); // a little handheld drift, settled by the hand-off
    cam = { cx: clamp(c.cx + hh * (Math.sin(t * .7) * 3 + Math.sin(t * 1.9) * 1.5), 0, WORLD_W - W), z: c.z, fy: c.fy + hh * Math.cos(t * .6) * 2, roll: c.roll + hh * Math.sin(t * .8) * .25, v: Math.abs(b.cx - a.cx) / .06 * c.z }; camX = cam.cx;
  };
  V.cinApply = () => { if (!cam) return; const w = $('world'); w.style.transformOrigin = `${W / 2}px ${cam.fy}px`; w.style.transform = `translate(0px,${H * .56 - cam.fy}px) scale(${cam.z * (1 + Math.abs(cam.roll) * .014)}) rotate(${cam.roll}deg)`; camZ = cam.z; };

  // ---- cards, bars and atmosphere
  const style = document.createElement('style');
  style.textContent = 'body.cin #hud,body.cin #touch,body.cin #legend,body.cin .combo,body.cin #gear,body.cin #msg,body.cin #wx{opacity:0!important;pointer-events:none!important}#hud,#touch,#legend,.combo,#gear{transition:opacity .3s}'
    + '.cinBar{position:absolute;left:0;right:0;height:0;background:#000;z-index:40;transition:height .5s ease;pointer-events:none}body.cin .cinBar{height:9%}#cinT{top:0}#cinB{bottom:0}'
    + '.cinCard{position:absolute;z-index:42;opacity:0;pointer-events:none;color:#fff}'
    + '#cinMap{left:50%;top:27%;transform:translateX(-50%);text-align:center}#cinMap small{display:block;font:800 17px system-ui,sans-serif;letter-spacing:8px;color:#ffe27a;text-shadow:0 2px 6px #000}'
    + '#cinMap b{display:block;font:900 70px system-ui,sans-serif;font-style:italic;letter-spacing:4px;text-shadow:0 0 28px rgba(80,140,255,.9),0 5px 0 rgba(0,0,0,.7);white-space:nowrap;position:relative;z-index:1}#cinMap i{display:block;height:5px;margin:8px auto 0;background:linear-gradient(90deg,transparent,#ffe27a,transparent);width:0}'
    + '#cinMap .chips{margin-top:12px;display:flex;gap:10px;justify-content:center}#cinMap .chips span{background:rgba(6,10,28,.82);border:1px solid #8fa0e8;border-radius:14px;padding:4px 14px;font:800 14px system-ui,sans-serif;letter-spacing:1.5px}'
    + '#cinWrap{position:relative;display:inline-block;isolation:isolate}#cinMap .ch{display:inline-block;white-space:pre;will-change:transform,opacity}'
    + '#cinStreak{z-index:3;position:absolute;top:-6px;bottom:-6px;left:0;width:90px;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.9),rgba(255,255,255,0));transform:skewX(-20deg);opacity:0;mix-blend-mode:screen;pointer-events:none}'
    + '#cinScan{position:absolute;left:-12px;right:-12px;height:4px;top:0;background:linear-gradient(90deg,rgba(90,240,255,0),#7fe9ff,rgba(90,240,255,0));box-shadow:0 0 14px #7fe9ff;opacity:0;pointer-events:none}'
    + '#cinRing{position:absolute;left:50%;top:50%;width:200px;height:200px;margin:-100px 0 0 -100px;border:4px solid rgba(255,226,122,.9);border-radius:50%;opacity:0;pointer-events:none}'
    + '#cinBand{position:absolute;left:-60px;right:-60px;top:-8px;bottom:-8px;background:linear-gradient(90deg,rgba(6,10,28,.93),rgba(20,32,80,.88));border-top:3px solid #ffe27a;border-bottom:3px solid #ffe27a;transform:skewX(-14deg) scaleX(0);transform-origin:0 50%;opacity:0;z-index:0}'
    + '#cinFx{position:absolute;left:0;top:0;width:960px;height:480px;z-index:41;pointer-events:none}'
    + '.cinFg{position:absolute;bottom:-70px;width:340px;height:380px;pointer-events:none;background:radial-gradient(ellipse at 50% 70%,rgba(8,14,8,.8),rgba(8,14,8,0) 70%);opacity:0;z-index:41}#cinFgL{left:-150px}#cinFgR{right:-150px}'
    + '#cinSpd{position:absolute;inset:0;pointer-events:none;opacity:0;z-index:41;background:repeating-linear-gradient(0deg,rgba(255,255,255,0) 0 8px,rgba(255,255,255,.22) 8px 10px,rgba(255,255,255,0) 10px 19px);-webkit-mask-image:linear-gradient(90deg,#000 0,rgba(0,0,0,.2) 30%,rgba(0,0,0,.2) 70%,#000 100%);mask-image:linear-gradient(90deg,#000 0,rgba(0,0,0,.2) 30%,rgba(0,0,0,.2) 70%,#000 100%)}'
    + '#cinLens{position:absolute;top:-10%;bottom:-10%;width:22%;left:-40%;pointer-events:none;opacity:0;z-index:41;background:linear-gradient(90deg,rgba(255,236,190,0),rgba(255,236,190,.55),rgba(255,236,190,0));transform:skewX(-18deg);mix-blend-mode:screen}'
    + '#bgBlurCin{position:absolute;pointer-events:none;opacity:0;image-rendering:auto!important}'
    + '.cinP{bottom:13%;width:360px;padding:12px 18px;background:linear-gradient(90deg,rgba(6,10,28,.92),rgba(20,30,70,.82));border-left:6px solid var(--c);border-radius:8px 18px 18px 8px}.cinP.r{border-left:0;border-right:6px solid var(--c);text-align:right;border-radius:18px 8px 8px 18px;background:linear-gradient(270deg,rgba(6,10,28,.92),rgba(20,30,70,.82))}'
    + '#cinP1{left:4%}#cinP2{right:4%}.cinP small{display:block;font:700 13px system-ui,sans-serif;letter-spacing:4px;color:#9fb2e8}.cinP b{display:block;font:900 42px system-ui,sans-serif;font-style:italic;letter-spacing:3px;text-shadow:0 3px 0 rgba(0,0,0,.6)}'
    + '.cinP .ty{display:flex;gap:8px;margin:5px 0 8px}.cinP.r .ty{justify-content:flex-end}.cinP .ty span{padding:2px 12px;border-radius:11px;font:800 13px system-ui,sans-serif;letter-spacing:1px;color:#10141f}'
    + '.cinP .st{display:grid;grid-template-columns:44px 1fr;gap:3px 10px;align-items:center;font:700 12px system-ui,sans-serif;letter-spacing:1px;color:#b8c6f0}.cinP.r .st{grid-template-columns:1fr 44px;grid-auto-flow:row dense}.cinP.r .st em{grid-column:2}.cinP.r .st i{grid-column:1}'
    + '.cinP .st i{display:block;height:8px;border-radius:4px;background:rgba(255,255,255,.15);position:relative;overflow:hidden}.cinP .st i::after{content:"";position:absolute;left:0;top:0;bottom:0;width:var(--w);background:var(--c)}'
    + '#cinSkip{position:absolute;right:16px;bottom:14px;z-index:60;display:none;background:rgba(6,10,28,.8);color:#fff;border:1px solid rgba(255,255,255,.5);border-radius:18px;padding:8px 18px;font:800 15px system-ui,sans-serif;letter-spacing:2px;cursor:pointer}'
    + '#cinWait{position:absolute;left:50%;bottom:7%;transform:translateX(-50%);z-index:42;display:none;font:800 16px system-ui,sans-serif;letter-spacing:3px;color:#ffe27a;text-shadow:0 2px 6px #000}';
  document.head.appendChild(style);
  const stage = document.getElementById('stage'), mk = (tag, id, cls) => { const e = document.createElement(tag); e.id = id; if (cls) e.className = cls; stage.appendChild(e); return e; };
  mk('div', 'cinT', 'cinBar'); mk('div', 'cinB', 'cinBar');
  const fxc = mk('canvas', 'cinFx'), spd = mk('div', 'cinSpd'), lens = mk('div', 'cinLens'), fgL = mk('div', 'cinFgL', 'cinFg'), fgR = mk('div', 'cinFgR', 'cinFg'); fxc.width = 960; fxc.height = 480; const fxg = fxc.getContext('2d');
  const cMap = mk('div', 'cinMap', 'cinCard'), c1 = mk('div', 'cinP1', 'cinCard cinP'), c2 = mk('div', 'cinP2', 'cinCard cinP r'), skip = mk('button', 'cinSkip'), wait = mk('div', 'cinWait');
  skip.textContent = 'SKIP \u25B6'; skip.onclick = e => { e.stopPropagation(); V.cinSkip(); };
  stage.addEventListener('pointerdown', () => { if (active() && !skip.contains(document.activeElement)) V.cinSkip(); });
  addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && active()) { e.preventDefault(); V.cinSkip(); } });

  const upper = s => String(s).toUpperCase(), esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let nameEl = null, lineEl = null, smallEl = null, chipsEl = null, wrapEl = null, streakEl = null, scanEl = null, ringEl = null, bandEl = null;
  function build() {
    const wx = weather, chips = `<span>${wx ? upper(wx.name) : 'CLEAR SKY'}</span><span style="opacity:.85">${wx ? upper(wx.up.join(' / ')) + ' +20%' : 'NO WEATHER BONUS'}</span>`;
    cMap.style.transform = 'translateX(-50%)';
    cMap.innerHTML = `<small>NOW ENTERING</small><span id="cinWrap"><b>${[...upper(curTheme.name || curTheme.id)].map(c => `<span class="ch" data-c="${esc(c)}">${esc(c)}</span>`).join('')}</b><span id="cinStreak"></span><span id="cinScan"></span><span id="cinRing"></span><span id="cinBand"></span></span><i></i><div class="chips">${chips}</div>`;
    smallEl = cMap.querySelector('small'); wrapEl = cMap.querySelector('#cinWrap'); nameEl = wrapEl.querySelector('b'); streakEl = cMap.querySelector('#cinStreak'); scanEl = cMap.querySelector('#cinScan'); ringEl = cMap.querySelector('#cinRing'); bandEl = cMap.querySelector('#cinBand'); lineEl = cMap.querySelector('i'); chipsEl = cMap.querySelector('.chips');
    const stats = p => [['HP', p.hp], ['ATK', p.atk], ['DEF', p.def], ['SPA', p.spa], ['SPD', p.spd], ['SPE', p.spe]];
    for (const [el, f, i] of [[c1, P, 1], [c2, E, 2]]) {
      const p = f.p || {}, col = colsOf(f.kit.types[0] || 'normal')[1], role = NETG.on ? (f === meF() ? 'YOU' : 'FRIEND') : (i === 1 ? 'PLAYER' : 'RIVAL');
      el.style.setProperty('--c', col);
      el.innerHTML = `<small>${role}${f.ability && f.ability.name ? ' \u00b7 ' + upper(f.ability.name) : ''}</small><b>${upper(nm(p.name || ''))}</b><div class="ty">${f.kit.types.map(t => `<span style="background:${colsOf(t)[1]}">${upper(t)}</span>`).join('')}</div><div class="st">${stats(p).map(([n, v]) => `<em>${n}</em><i style="--w:${Math.min(100, (v || 0) / 1.6)}%"></i>`).join('')}</div>`;
    }
  }
  const seg = (a, b, t) => clamp((t - a) / (b - a), 0, 1);
  const show = (el, a, b, t, tf) => { const k = Math.min(seg(a, a + .4, t), 1 - seg(b - .35, b, t)); el.style.opacity = String(k); if (tf) el.style.transform = tf(k); };
  const h = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

  // ---- the map name: five looks, one picked per match. Time is mapped from the 1.8 s the card is on screen onto the 2.8 s these were designed at.
  const GL = '#%&@$01<>/|+=*?';
  function mapAnim(c, t0) {
    const st = c.nm || 'drop', t = .5 + (t0 - .3) * (2.8 / 1.8), outK = seg(2.9, 3.3, t), chs = nameEl.children, n = chs.length, smallK = seg(.4, .85, t) * (1 - outK), W420 = 420;
    cMap.style.transform = 'translateX(-50%)'; cMap.style.opacity = t > .3 && t < 3.45 ? 1 : 0;
    if (st === 'drop') {
      for (let i = 0; i < n; i++) { const a = .55 + i * .05, k = seg(a, a + .5, t), e = back(k), o = seg(2.85 + (n - 1 - i) * .02, 3.2 + (n - 1 - i) * .02, t), el = chs[i]; el.style.opacity = Math.min(1, k * 2.5) * (1 - o); el.style.transform = `translateY(${(1 - e) * -130 + o * 32}px) scale(${1 + (1 - e) * 1.8}) rotate(${(1 - e) * (i % 2 ? -14 : 14)}deg)`; }
      smallEl.style.opacity = smallK; smallEl.style.letterSpacing = (14 - 6 * outC(seg(.4, 1.3, t))) + 'px';
      const sh = seg(1.95, 2.6, t); streakEl.style.opacity = Math.sin(Math.PI * sh) * .6; streakEl.style.left = (-100 + sh * (wrapEl.offsetWidth + 120)) + 'px';
      lineEl.style.width = (seg(1.4, 2.1, t) * (1 - outK) * W420) + 'px'; chipsEl.style.opacity = seg(1.6, 2, t) * (1 - outK);
    } else if (st === 'slash') {
      const w = io(seg(.6, 1.35, t));
      wrapEl.style.clipPath = `inset(-30px ${(1 - w) * 100}% -30px ${outK * 100}%)`; nameEl.style.transform = `scale(${1.14 - .14 * outC(seg(.6, 1.5, t))})`;
      streakEl.style.opacity = w > 0 && w < 1 ? 1 : 0; streakEl.style.left = (w * wrapEl.offsetWidth - 45) + 'px';
      smallEl.style.opacity = smallK; smallEl.style.transform = `translateY(${(1 - outC(seg(.4, .9, t))) * -18}px)`;
      lineEl.style.width = (seg(1.1, 1.7, t) * (1 - outK) * W420) + 'px'; chipsEl.style.opacity = seg(1.5, 1.9, t) * (1 - outK);
    } else if (st === 'stamp') {
      const k = seg(.55, .85, t), e = back(k), rk = seg(.82, 1.5, t), sh = t > .85 ? Math.max(0, 1 - seg(.85, 1.25, t)) : 0;
      nameEl.style.opacity = Math.min(1, k * 3) * (1 - outK); nameEl.style.transform = `scale(${(2.8 - 1.8 * e) * (1 + outK * .35)})`;
      ringEl.style.opacity = rk > 0 && rk < 1 ? (1 - rk) * .9 : 0; ringEl.style.transform = `scale(${.3 + rk * 5})`;
      cMap.style.transform = `translateX(calc(-50% + ${Math.sin(t * 90) * 9 * sh}px)) translateY(${Math.cos(t * 77) * 6 * sh}px)`;
      smallEl.style.opacity = seg(.95, 1.3, t) * (1 - outK); lineEl.style.width = (seg(.9, 1.5, t) * (1 - outK) * W420) + 'px'; chipsEl.style.opacity = seg(1.3, 1.7, t) * (1 - outK);
    } else if (st === 'banner') {
      const bk = outC(seg(.5, 1.05, t)), bo = io(seg(2.8, 3.3, t)), Wd = wrapEl.offsetWidth || 1, sh = seg(1.35, 1.95, t);
      bandEl.style.opacity = t > .45 && t < 3.35 ? 1 : 0; bandEl.style.transformOrigin = bo > 0 ? '100% 50%' : '0 50%'; bandEl.style.transform = `skewX(-14deg) scaleX(${bo > 0 ? 1 - bo : bk})`;
      const lead = clamp((-60 + bk * (Wd + 120)) / Wd, 0, 1), trail = clamp((-60 + bo * (Wd + 120)) / Wd, 0, 1); // the name shows only where the banner already is
      nameEl.style.clipPath = `inset(-14px ${(1 - lead) * 100}% -14px ${trail * 100}%)`;
      smallEl.style.opacity = smallK; smallEl.style.transform = `translateX(${(1 - outC(seg(.7, 1.2, t))) * 50}px)`;
      streakEl.style.opacity = Math.sin(Math.PI * sh) * .55; streakEl.style.left = (-100 + sh * (Wd + 120)) + 'px';
      lineEl.style.width = (seg(1.2, 1.8, t) * (1 - outK) * W420) + 'px'; chipsEl.style.opacity = seg(1.5, 1.9, t) * (1 - outK);
    } else if (st === 'decode') {
      for (let i = 0; i < n; i++) {
        const el = chs[i], ch0 = el.dataset.c, res = .8 + i * .075, ex = 2.85 + (n - 1 - i) * .035; let ch = ch0, col = '', op = 1, ts = '', tf = '';
        if (ch0 === ' ') continue;
        if (t < .55) op = 0; else if (t < res) { ch = GL[Math.floor(h(i, Math.floor(t * 18)) * GL.length)]; col = '#7fe9ff'; op = .9; }
        else if (t < res + .28) { ts = '3px 0 #ff3a6a,-3px 0 #3af0ff'; tf = `translateX(${Math.sin(t * 90 + i) * 3}px)`; }
        if (t > ex) { const k = seg(ex, ex + .35, t); if (k < .75) { ch = GL[Math.floor(h(i, Math.floor(t * 18) + 5) * GL.length)]; col = '#7fe9ff'; } op *= 1 - k; }
        if (el.textContent !== ch) el.textContent = ch; el.style.color = col; el.style.opacity = op; el.style.textShadow = ts; el.style.transform = tf;
      }
      const sp = seg(.7, 1.9, t); scanEl.style.opacity = sp > 0 && sp < 1 ? .9 : 0; scanEl.style.top = (sp * (wrapEl.offsetHeight + 8) - 4) + 'px';
      smallEl.style.opacity = smallK; lineEl.style.width = (seg(1.5, 2.2, t) * (1 - outK) * W420) + 'px'; chipsEl.style.opacity = seg(1.7, 2.1, t) * (1 - outK);
    }
  }

  // ---- atmosphere: rack focus (a cheap downscaled copy of the arena fades in behind the fighters), speed streaks, light motes, a lens sweep and soft foreground edges
  const bgEl = $('bg'), bgb = document.createElement('canvas'), bgbg = bgb.getContext('2d'); bgb.id = 'bgBlurCin'; bgEl.insertAdjacentElement('afterend', bgb); let bgbKey = '', atmoOn = false;
  function blurTick(op) {
    if (op < .02) { if (bgb.style.opacity !== '0') bgb.style.opacity = '0'; return; }
    const key = bgEl.width + 'x' + bgEl.height + '|' + bgTier;
    if (key !== bgbKey) { bgbKey = key; const cs = getComputedStyle(bgEl); bgb.width = Math.ceil(bgEl.width / 8); bgb.height = Math.ceil(bgEl.height / 8); bgb.style.left = cs.left; bgb.style.top = cs.top; bgb.style.width = cs.width; bgb.style.height = cs.height; }
    bgbg.drawImage(bgEl, 0, 0, bgb.width, bgb.height); bgb.style.opacity = op.toFixed(2);
  }
  function atmo(c, t, vis) {
    if (!vis || !cam) { if (atmoOn) { atmoOn = false; fxg.clearRect(0, 0, 960, 480); spd.style.opacity = lens.style.opacity = fgL.style.opacity = fgR.style.opacity = '0'; bgb.style.opacity = '0'; } return; }
    atmoOn = true; if (c.cx0 === undefined) c.cx0 = cam.cx;
    const fade = seg(2.7, 3.2, t) * (1 - seg(5.5, 5.95, t));
    blurTick(c.cm === 'reveal' ? Math.max(1 - seg(0, .9, t), fade) : fade);
    spd.style.opacity = Math.min(.6, Math.max(0, (cam.v - 350) / 1200));
    const lk = seg(.06, 1.2, t); lens.style.opacity = Math.sin(Math.PI * lk) * .5; lens.style.left = (-40 + lk * 150) + '%';
    const pan = clamp(-(cam.cx - c.cx0) * .2, -80, 80); fgL.style.opacity = fgR.style.opacity = '.6'; fgL.style.transform = fgR.style.transform = `translateX(${pan}px)`;
    fxg.clearRect(0, 0, 960, 480);
    for (let i = 0; i < 26; i++) { const z = .4 + h(i, 3) * .9, x = (((h(i, 1) * 1100 + t * (6 + h(i, 2) * 9) - (cam.cx - c.cx0) * z * .5) % 1100) + 1100) % 1100 - 70, y = (((h(i, 4) * 540 - t * (8 + h(i, 5) * 12)) % 540) + 540) % 540 - 30, a = (.18 + .3 * Math.abs(Math.sin(t * .9 + i))) * z; fxg.fillStyle = `rgba(255,240,200,${a})`; fxg.beginPath(); fxg.arc(x, y, 1.2 + z * 2.2, 0, 6.283); fxg.fill(); }
  }

  const _ed = V.extraDraw;
  V.extraDraw = () => {
    if (_ed) _ed();
    const c = S.cin, run = !!(c && c.on && state === 'intro'), vis = run && c.vis && introT >= 0;
    document.body.classList.toggle('cin', vis);
    skip.style.display = vis ? 'block' : 'none'; wait.style.display = run && !c.vis && introT >= 0 ? 'block' : 'none';
    if (!vis) { cMap.style.opacity = c1.style.opacity = c2.style.opacity = '0'; atmo(c, 0, false); if (run && !c.vis && introT >= 0) wait.textContent = 'FIGHT STARTS IN ' + Math.max(1, Math.ceil(c.dur - c.t) + 1); return; }
    if (!c.built) { c.built = true; build(); }
    const t = c.t; mapAnim(c, t);
    show(c1, 2.9, 3.95, t, k => `translateX(${(1 - k) * -70}px)`); show(c2, 4.5, 5.45, t, k => `translateX(${(1 - k) * 70}px)`);
    atmo(c, t, true);
  };

  // ---- settings: offline players can switch the intro off (online always plays it so both sides stay in step)
  const row = document.querySelector('.rndchip') && document.querySelector('.rndchip').closest('.oitem');
  if (row) {
    row.insertAdjacentHTML('afterend', '<div class="oitem"><div class="t"><b>Map intro</b><small>Camera sweep over the arena before a match (online always plays it)</small></div><div class="seg"><button class="cinchip" data-v="1">On</button><button class="cinchip" data-v="0">Off</button></div></div>');
    const sync = () => document.querySelectorAll('.cinchip').forEach(b => b.classList.toggle('sel', (b.dataset.v === '1') === enabled));
    document.querySelectorAll('.cinchip').forEach(b => b.onclick = () => { enabled = b.dataset.v === '1'; try { localStorage.setItem('pf_cin', enabled ? '1' : '0'); } catch (e) { } sync(); }); sync();
  }
  const _mr = V.moveResetWx; V.moveResetWx = () => { if (_mr) _mr(); S.cin = null; cam = null; };
})();
