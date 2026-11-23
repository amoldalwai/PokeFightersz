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
  style.textContent = '#lowhp{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,rgba(255,0,0,0) 45%,rgba(220,0,20,.55) 100%)}#lowhp.on{animation:lhBeat 1s ease-in-out infinite}#lowhp.crit{animation-duration:.6s;background:radial-gradient(ellipse at center,rgba(255,0,0,0) 35%,rgba(235,0,20,.7) 100%)}'
    + '@keyframes lhBeat{0%,100%{opacity:.35}12%{opacity:1}28%{opacity:.5}42%{opacity:.95}70%{opacity:.35}}'
    + '.btn.rdy{animation:rdyPulse 1s ease-in-out infinite}@keyframes rdyPulse{0%,100%{box-shadow:0 0 8px 2px #ffd34d,inset 0 0 8px #ffd34d}50%{box-shadow:0 0 22px 8px #ffe27a,inset 0 0 16px #ffe27a}}'
    + '.kibar.rdy{animation:kiPulse 1s ease-in-out infinite}@keyframes kiPulse{50%{filter:brightness(1.6)}}';
  document.head.appendChild(style);
  const lh = document.createElement('div'); lh.id = 'lowhp'; const tint = document.getElementById('tint'); if (tint) tint.insertAdjacentElement('afterend', lh); else document.getElementById('stage').appendChild(lh);

  const _ed = V.extraDraw;
  V.extraDraw = () => {
    if (_ed) _ed();
    const f = state === 'fight' && !demo && !lab ? meF() : null, hp = f && !f.dead ? f.hp / f.maxhp : 1, cls = hp < .1 ? 'on crit' : hp < .25 ? 'on' : '';
    if (lh.className !== cls) { lh.className = cls; lh.style.opacity = cls ? '' : '0'; }
  };
  V.statusDrawOn = true;
})();
