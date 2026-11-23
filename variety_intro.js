'use strict';
// ---------------------------------------------------------------- map intro: a short Ken Burns sweep over the arena, a push-in on each fighter, then back to the fight.
// The clock (S.cin.t) runs in the sim and holds introT at 0, so online both phones stay in step. Camera, cards and bars are render-only.
(() => {
  const V = VAR, S = V.S, DUR = 6;
  let enabled = true; try { enabled = localStorage.getItem('pf_cin') !== '0'; } catch (e) { }
  S.cin = null; let cam = null;

  V.cinOn = () => !!(S.cin && S.cin.on && state === 'intro');
  V.cinStart = () => { S.cin = null; if (practice || lab || demo || !P || !E || (!NETG.on && !enabled)) return; S.cin = { on: true, t: 0, dur: DUR, vis: true, built: false }; };
  V.cinHold = dt => { const c = S.cin; if (!c || !c.on || introT < 0) return false; c.t += dt; if (c.t >= c.dur) { c.on = false; return false; } return true; };
  V.cinSkip = () => { const c = S.cin; if (!c || !c.on || state !== 'intro' || introT < 0 || !c.vis) return; if (NETG.on) c.vis = false; else c.t = c.dur; }; // online the fight still starts together, so skipping only changes what you see

  const io = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, sine = t => -(Math.cos(Math.PI * t) - 1) / 2, lin = t => t;
  const EASE = [sine, io, lin, io, lin, io];
  function keyframes(nat) {
    const mid = (P.x + E.x) / 2 - W / 2, cl = x => clamp(x, 0, WORLD_W - W), fyN = H * .56, body = f => GROUND - f.h * .5;
    return [[0, cl(mid - 560), .78, fyN], [2.1, cl(mid + 430), .94, fyN], [2.9, cl(P.x - W / 2 - 130), 1.7, body(P)], [3.9, cl(P.x - W / 2 - 110), 1.78, body(P)], [4.5, cl(E.x - W / 2 + 130), 1.7, body(E)], [5.4, cl(E.x - W / 2 + 110), 1.78, body(E)], [6, nat, 1, fyN]];
  }
  const active = () => S.cin && S.cin.on && S.cin.vis && state === 'intro' && introT >= 0;
  V.cinX = () => { // after the normal camera pan: replace it with the intro path
    if (!active()) { cam = null; return; }
    const K = keyframes(camX), t = clamp(S.cin.t, 0, 6); let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++;
    const a = K[i], b = K[i + 1], e = EASE[i](clamp((t - a[0]) / (b[0] - a[0]), 0, 1)), l = (x, y) => x + (y - x) * e;
    cam = { cx: l(a[1], b[1]), z: l(a[2], b[2]), fy: l(a[3], b[3]) }; camX = cam.cx;
  };
  V.cinApply = () => { if (!cam) return; const w = $('world'); w.style.transformOrigin = `${W / 2}px ${cam.fy}px`; w.style.transform = `translate(0px,${H * .56 - cam.fy}px) scale(${cam.z})`; camZ = cam.z; };

  // ---- cards and bars
  const style = document.createElement('style');
  style.textContent = 'body.cin #hud,body.cin #touch,body.cin #legend,body.cin .combo,body.cin #gear,body.cin #msg,body.cin #wx{opacity:0!important;pointer-events:none!important}#hud,#touch,#legend,.combo,#gear{transition:opacity .3s}'
    + '.cinBar{position:absolute;left:0;right:0;height:0;background:#000;z-index:40;transition:height .5s ease;pointer-events:none}body.cin .cinBar{height:9%}#cinT{top:0}#cinB{bottom:0}'
    + '.cinCard{position:absolute;z-index:42;opacity:0;pointer-events:none;color:#fff}'
    + '#cinMap{left:50%;top:27%;transform:translateX(-50%);text-align:center}#cinMap small{display:block;font:800 17px system-ui,sans-serif;letter-spacing:8px;color:#ffe27a;text-shadow:0 2px 6px #000}'
    + '#cinMap b{display:block;font:900 70px system-ui,sans-serif;font-style:italic;letter-spacing:4px;text-shadow:0 0 28px rgba(80,140,255,.9),0 5px 0 rgba(0,0,0,.7);white-space:nowrap}#cinMap i{display:block;height:5px;margin:8px auto 0;background:linear-gradient(90deg,transparent,#ffe27a,transparent);width:0}'
    + '#cinMap .chips{margin-top:12px;display:flex;gap:10px;justify-content:center}#cinMap .chips span{background:rgba(6,10,28,.82);border:1px solid #8fa0e8;border-radius:14px;padding:4px 14px;font:800 14px system-ui,sans-serif;letter-spacing:1.5px}'
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
  const cMap = mk('div', 'cinMap', 'cinCard'), c1 = mk('div', 'cinP1', 'cinCard cinP'), c2 = mk('div', 'cinP2', 'cinCard cinP r'), skip = mk('button', 'cinSkip'), wait = mk('div', 'cinWait');
  skip.textContent = 'SKIP \u25B6'; skip.onclick = e => { e.stopPropagation(); V.cinSkip(); };
  stage.addEventListener('pointerdown', () => { if (active() && !skip.contains(document.activeElement)) V.cinSkip(); });
  addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && active()) { e.preventDefault(); V.cinSkip(); } });

  const upper = s => String(s).toUpperCase();
  function build() {
    const wx = weather, chips = `<span>${wx ? upper(wx.name) : 'CLEAR SKY'}</span><span style="opacity:.85">${wx ? upper(wx.up.join(' / ')) + ' +20%' : 'NO WEATHER BONUS'}</span>`;
    cMap.innerHTML = `<small>NOW ENTERING</small><b>${upper(curTheme.name || curTheme.id)}</b><i></i><div class="chips">${chips}</div>`;
    const stats = p => [['HP', p.hp], ['ATK', p.atk], ['DEF', p.def], ['SPA', p.spa], ['SPD', p.spd], ['SPE', p.spe]];
    for (const [el, f, i] of [[c1, P, 1], [c2, E, 2]]) {
      const p = f.p || {}, col = colsOf(f.kit.types[0] || 'normal')[1], role = NETG.on ? (f === meF() ? 'YOU' : 'FRIEND') : (i === 1 ? 'PLAYER' : 'RIVAL');
      el.style.setProperty('--c', col);
      el.innerHTML = `<small>${role}${f.ability && f.ability.name ? ' \u00b7 ' + upper(f.ability.name) : ''}</small><b>${upper(nm(p.name || ''))}</b><div class="ty">${f.kit.types.map(t => `<span style="background:${colsOf(t)[1]}">${upper(t)}</span>`).join('')}</div><div class="st">${stats(p).map(([n, v]) => `<em>${n}</em><i style="--w:${clamp((v || 0) / 1.6, 4, 100)}%;--c:${col}"></i>`).join('')}</div>`;
    }
  }
  const seg = (a, b, t) => clamp((t - a) / (b - a), 0, 1);
  const show = (el, a, b, t, tf) => { const k = Math.min(seg(a, a + .4, t), 1 - seg(b - .35, b, t)); el.style.opacity = String(k); if (tf) el.style.transform = tf(k); };
  const _ed = V.extraDraw;
  V.extraDraw = () => {
    if (_ed) _ed();
    const c = S.cin, run = !!(c && c.on && state === 'intro'), vis = run && c.vis && introT >= 0;
    document.body.classList.toggle('cin', vis);
    skip.style.display = vis ? 'block' : 'none'; wait.style.display = run && !c.vis && introT >= 0 ? 'block' : 'none';
    if (!vis) { cMap.style.opacity = c1.style.opacity = c2.style.opacity = '0'; if (run && !c.vis && introT >= 0) wait.textContent = 'FIGHT STARTS IN ' + Math.max(1, Math.ceil(c.dur - c.t) + 1); return; }
    if (!c.built) { c.built = true; build(); }
    const t = c.t; show(cMap, .3, 2.1, t, k => `translateX(-50%) translateY(${(1 - k) * 18}px)`); cMap.querySelector('i').style.width = seg(.5, 1.4, t) * 420 + 'px';
    show(c1, 2.9, 3.95, t, k => `translateX(${(1 - k) * -70}px)`); show(c2, 4.5, 5.45, t, k => `translateX(${(1 - k) * 70}px)`);
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
