'use strict';
// ---------------------------------------------------------------- variety layer
// Combat rules (stale moves, variety meter, weakness break, comeback), AI styles and fight phases, arena events and repeating pickups,
// type combos, mastery and tournament perks. Everything here runs inside the 60 Hz simulation, so it only uses the seeded Math.random and
// the sim clock `now`; drawing never changes state. Moves live in variety_moves.js.
const VAR = (() => {
  const S = { ents: [], pkT: 0, wxT: 0, hzwT: 0, lgT: 0, lowG: 0, cheer: false, style: null, perks: [], mastery: {}, tw: 0 };
  const REP_MUL = [1, 1, .85, .7, .55];
  const vr = f => f.vr || (f.vr = { hist: [], rep: 0, lastKey: '', lastAt: -99, bonusT: 0, bonusAt: -99, cmb: 0, cmbUsed: false, aura: 0, brkAt: -99, lastTy: null, lastTyAt: -99, comboAt: -99, phase: 1, orbs: 0, orbT: 0, orbAt: 0, regenT: 0, tw: {}, cat: { melee: 0, ranged: 0, special: 0 }, first: true, staleAt: -99 });
  const live = () => state === 'fight' && P && E;
  const offline = () => !NETG.on && !demo && !practice && !lab, aiOn = () => !NETG.on && !lab && (!practice || dummyMode === 2);
  const top = f => GROUND + laneY(f) - f.z - f.lift - f.h;

  // ---- type combos: the next hit of the second type lands harder when it follows the first within 2.5 s
  const COMBOS = [
    ['water', 'electric', 1.35, 'SOAKED SHOCK'], ['ice', 'fighting', 1.35, 'SHATTER'], ['fire', 'grass', 1.3, 'WILDFIRE', 'burn'], ['ground', 'water', 1.25, 'MUD SLIDE', 'slow'],
    ['grass', 'fire', 1.3, 'DRY BRUSH'], ['electric', 'ground', 1.25, 'GROUNDED'], ['psychic', 'ghost', 1.3, 'NIGHTMARE'], ['fire', 'water', 1.25, 'STEAM BURST'],
    ['ice', 'fire', 1.3, 'THAW'], ['dark', 'psychic', 1.3, 'MIND CRUSH'], ['rock', 'fighting', 1.25, 'ROCK SMASH'], ['flying', 'electric', 1.3, 'STORM FRONT'],
  ];

  // ---- AI styles (offline only): each one re-weights what the AI wants to do
  const K = {
    proj: new Set(['blast', 'cannon', 'volley', 'minibeam', 'wave', 'geyser', 'drain', 'bounce', 'boomer', 'seeker', 'split', 'chain', 'bomb', 'charge']),
    contact: new Set(['combo', 'dash', 'leap', 'spin', 'slash', 'trail', 'swoop']),
    trap: new Set(['ring', 'spikes', 'vine', 'mine', 'gravity', 'mark', 'wall', 'bomb', 'quake', 'poison', 'sleep', 'para']),
    counter: new Set(['counter', 'shield', 'orbit', 'wall']),
    def: new Set(['shield', 'heal', 'orbit', 'wall', 'decoy', 'counter', 'buff']),
    tricky: new Set(['teleport', 'decoy', 'dig', 'pushpull', 'mark', 'boomer', 'debuff']),
  };
  const STYLES = {
    rusher: { n: 'RUSHER', w: { approach: 3, dash: 2.5, melee: 2.2, guard: .3, retreat: .15, ranged: .4, rest: .5 }, sp: { contact: 2 } },
    zoner: { n: 'ZONER', w: { ranged: 3, retreat: 3, approach: .25, melee: .4, dash: .5, guard: .8 }, sp: { proj: 3 }, keep: 360 },
    trapper: { n: 'TRAPPER', w: { retreat: 1.8, sidestep: .5, approach: .6, ranged: .6 }, sp: { trap: 3.5 }, keep: 280 },
    counter: { n: 'COUNTER', w: { guard: 3.5, grab: 2.2, approach: .3, melee: 1.6, dash: .4 }, sp: { counter: 4 } },
    turtle: { n: 'TURTLE', w: { guard: 4.5, rest: 3, retreat: 1.8, approach: .3, melee: .5, ranged: 1.2 }, sp: { def: 3.5 } },
    trickster: { n: 'TRICKSTER', w: { sidestep: 4, align: 2, dash: 3, jump: 3, guard: .4, melee: .8 }, sp: { tricky: 3 } },
    berserker: { n: 'BERSERKER', w: { melee: 3, guard: .1, approach: 2.8, retreat: .1, rest: .2, ranged: .3 }, sp: { contact: 1.8 }, dmg: 1.1, take: 1.1 },
    sniper: { n: 'SNIPER', w: { ranged: 2.6, retreat: 2.6, approach: .3, melee: .4, guard: .8 }, sp: { proj: 2.6 }, keep: 420 },
  };
  const STYLE_IDS = Object.keys(STYLES);
  const RULES = { glass: { n: 'GLASS CANNON', d: 'everyone deals 40% more damage' }, lowgrav: { n: 'MOON ARENA', d: 'low gravity all fight' }, chaos: { n: 'STORM CHASER', d: 'weather and hazards every few seconds' }, berries: { n: 'BERRY RAIN', d: 'a pickup drops every 6 seconds' }, rush: { n: 'OVERCLOCK', d: 'cooldowns recover twice as fast' } };
  const RULE_IDS = Object.keys(RULES), dayKey = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
  const dailyDone = () => { try { return localStorage.getItem('pf_daily') === String(dayKey()); } catch (e) { return false; } };
  function matchEnd() { if (S.rule && winner === P && !NETG.on) { try { localStorage.setItem('pf_daily', String(dayKey())); } catch (e) { } showMsg('DAILY CHALLENGE COMPLETE!', 2500); setDailyLabel(); } }
  function setDailyLabel() { const b = document.getElementById('dailyBtn'); if (b) b.textContent = (dailyDone() ? 'DONE' : 'DAILY'); }
  const styleOf = f => STYLES[S.style && S.style[f.side]] || null;

  // ---- perks (tournament): one is drafted after every won round and stays for the whole run
  const PERKS = {
    thick: { n: 'Thick Skin', d: 'Take 8% less damage' }, heavy: { n: 'Heavy Hitter', d: 'Deal 8% more damage' }, feet: { n: 'Quick Feet', d: 'Move 8% faster' },
    battery: { n: 'Ki Battery', d: 'Ki refills faster' }, wind: { n: 'Second Wind', d: 'Heal 15% once per round at low HP' }, vamp: { n: 'Vampiric', d: 'Heal 6% of damage dealt' },
    stamina: { n: 'Deep Lungs', d: 'Stamina refills 25% faster' }, last: { n: 'Last Stand', d: '+20% damage below 30% HP' }, berry: { n: 'Berry Lover', d: 'Berries heal double' },
    opener: { n: 'Opener', d: 'First hit of each round +25%' }, exec: { n: 'Executioner', d: '+20% damage to foes below 30% HP' }, thorns: { n: 'Thorns', d: 'Reflect 6% of damage taken' },
    lucky: { n: 'Lucky', d: '8% chance to halve a hit' }, cool: { n: 'Cooldown Up', d: 'Moves recharge 15% faster' }, thief: { n: 'Ki Thief', d: 'Hits give extra ki' },
    brawler: { n: 'Brawler', d: 'Melee deals 12% more' }, sniper: { n: 'Marksman', d: 'Shots and specials deal 8% more' },
  };
  const hasPerk = (f, k) => f === P && !NETG.on && tourOn && tour && tour.perks && tour.perks.includes(k);

  function actKey(a) { return a.name === 'sp' ? a.key : a.name; }

  // ---- mastery (offline): every move levels up with use, and each level adds a little damage
  try { S.mastery = JSON.parse(localStorage.getItem('pf_mastery') || '{}') || {}; } catch (e) { S.mastery = {}; }
  const mLv = n => n >= 250 ? 3 : n >= 100 ? 2 : n >= 30 ? 1 : 0;
  const saveMastery = () => { try { localStorage.setItem('pf_mastery', JSON.stringify(S.mastery)); } catch (e) { } };

  function onAct(f, a) {
    const v = vr(f), k = actKey(a);
    if (k === v.lastKey && now - v.lastAt < 4.5) v.rep++; else v.rep = 1;
    v.lastKey = k; v.lastAt = now; v.hist.push({ k, t: now });
    const cat = a.name === 'melee' || a.name === 'grab' ? 'melee' : a.name === 'ranged' ? 'ranged' : 'special'; v.cat[cat]++;
    if (f.vr.rep >= 2 && f.vr.rep <= 4 && !f.hazard && state === 'fight' && now - v.staleAt > .8) { v.staleAt = now; floatText(f.x, top(f) - 24, v.rep >= 4 ? 'STALE -45%' : v.rep === 3 ? 'STALE -30%' : 'STALE -15%', '#ff9a7a', 18); }
    while (v.hist.length && now - v.hist[0].t > 7) v.hist.shift();
    const set = new Set(v.hist.map(h => h.k)); // four different attacks in 7 s earns a damage bonus
    if (set.size >= 4 && now - v.bonusAt > 9 && state === 'fight') { v.bonusAt = now; v.bonusT = 5; floatText(f.x, top(f) - 30, 'VARIETY BONUS +20%', '#7dffb0', 22); sfx('chime'); spark(f.x, top(f) + 20, '#7dffb0', 14); }
  }
  const distinct = f => { const v = vr(f); const set = new Set(); for (const h of v.hist) if (now - h.t <= 7) set.add(h.k); return set.size; };

  function dmgMul(att, def, ty, amount) {
    if (att.hazard || amount <= 0) return 1;
    const a = vr(att), d = vr(def); let m = 1;
    if (now - a.lastAt < 6) m *= REP_MUL[Math.min(a.rep, 4)];
    if (a.bonusT > 0) m *= 1.2;
    if (a.aura > 0) m *= 1.25;
    const as = styleOf(att), ds = styleOf(def);
    if (att.isAI && aiOn()) { if (a.phase === 2) m *= 1.08; else if (a.phase === 3) m *= 1.15; if (as && as.dmg) m *= as.dmg; }
    if (def.isAI && ds && ds.take) m *= ds.take;
    if (ty && a.lastTy && a.lastTy !== ty && now - a.lastTyAt < 2.5) { // type combo
      const c = COMBOS.find(x => x[0] === a.lastTy && x[1] === ty);
      if (c) { m *= c[2]; if (now - a.comboAt > .8) { a.comboAt = now; floatText(def.x, top(def) - 34, c[3] + '!', '#ffb347', 24); a.combo = c; } }
    }
    if (offline() && att === P && a.lastKey) m *= 1 + .04 * mLv(S.mastery[a.lastKey] || 0);
    if (hasPerk(att, 'heavy')) m *= 1.08;
    if (hasPerk(att, 'last') && att.hp < att.maxhp * .3) m *= 1.2;
    if (hasPerk(att, 'exec') && def.hp < def.maxhp * .3) m *= 1.2;
    if (hasPerk(att, 'opener') && a.first) m *= 1.25;
    if (hasPerk(att, 'brawler') && att.act && att.act.name === 'melee') m *= 1.12;
    if (hasPerk(att, 'sniper') && (!att.act || att.act.name !== 'melee')) m *= 1.08;
    if (S.rule === 'glass') m *= 1.4;
    if (hasPerk(def, 'thick')) m *= .92;
    if (hasPerk(def, 'lucky') && Math.random() < .08) m *= .5;
    return m;
  }

  function onHit(att, def, ty, d, eff, blocked, big) {
    const dv = vr(def);
    if (!blocked && d > 0 && !def.dead) { // the comeback meter fills as you take damage
      if (!dv.cmbUsed) dv.cmb += d / def.maxhp * 160;
      if (!dv.cmbUsed && dv.cmb >= 100 && def.hp < def.maxhp * .45 && def.hp > 0) {
        dv.cmbUsed = true; dv.aura = 3.5; def.hp = Math.min(def.maxhp, def.hp + def.maxhp * .1); def.ki = Math.min(100, def.ki + 40); def.sta = 100;
        floatText(def.x, top(def) - 40, 'COMEBACK!', '#ffd34d', 34); sfx('charge'); spark(def.x, center(def).y, '#ffd34d', 22); shake = Math.max(shake, 12); flashCol = '255,220,120'; flashT = Math.max(flashT, .1);
      }
    }
    if (att.hazard) return;
    const av = vr(att); av.first = false;
    if (hasPerk(att, 'vamp') && d > 0) att.hp = Math.min(att.maxhp, att.hp + d * .06);
    if (hasPerk(att, 'thief') && !blocked) att.ki = Math.min(100, att.ki + 3);
    if (hasPerk(def, 'thorns') && d > 0 && !blocked && !def.dead && !att.dead) att.hp = Math.max(1, att.hp - d * .06);
    if (blocked) return;
    if (eff > 1 && d > 0 && !big && !def.dead && now - dv.brkAt > 4 && def.hitT < .45) { // a super-effective hit staggers the foe a little longer
      dv.brkAt = now; def.hitT = Math.max(def.hitT, .6); def.act = null; def.sta = Math.max(0, def.sta - 12);
      floatText(def.x, top(def) - 58, 'WEAKNESS BREAK!', '#ff6a8a', 26); spark(def.x, center(def).y, '#ff6a8a', 14);
    }
    if (ty) { const c = av.combo; if (c && c[4] && now - av.comboAt < .1) applyStatus(def, c[4], false, att); av.combo = null; av.lastTy = ty; av.lastTyAt = now; }
    if (offline() && att === P && av.lastKey) { const k = av.lastKey, n = S.mastery[k] = (S.mastery[k] || 0) + 1; if (mLv(n) !== mLv(n - 1)) { floatText(att.x, top(att) - 50, 'MASTERY LV ' + mLv(n), '#ffe27a', 22); saveMastery(); } else if (n % 10 === 0) saveMastery(); }
  }

  // an orbiting orb (see moves) soaks a whole hit
  function absorb(att, def, amount) {
    const v = def.vr; if (!v || v.orbs <= 0 || amount <= 0) return false;
    v.orbs--; floatText(def.x, top(def) - 20, 'ORB ABSORBED', '#9fe8ff', 20); sfx('block'); spark(def.x, center(def).y, '#9fe8ff', 10); return true;
  }

  // ---- per-fighter upkeep: phases, comeback aura, perk effects
  function fighterTick(f, dt) {
    const v = vr(f);
    if (f.dead) return;
    v.bonusT = Math.max(0, v.bonusT - dt); v.aura = Math.max(0, v.aura - dt); v.regenT = Math.max(0, v.regenT - dt);
    if (v.regenT > 0) f.sta = Math.min(100, f.sta + 12 * dt);
    if (S.rule === 'rush') for (const k in f.cool) f.cool[k] = Math.max(0, f.cool[k] - dt);
    while (v.hist.length && now - v.hist[0].t > 7) v.hist.shift();
    if (hasPerk(f, 'battery')) f.ki = Math.min(100, f.ki + 1.5 * dt);
    if (hasPerk(f, 'stamina') && f.staDelay <= 0) f.sta = Math.min(100, f.sta + 3 * dt);
    if (hasPerk(f, 'cool')) for (const k in f.cool) f.cool[k] = Math.max(0, f.cool[k] - dt * .15);
    if (hasPerk(f, 'wind') && !v.windUsed && f.hp > 0 && f.hp < f.maxhp * .2) { v.windUsed = true; f.hp += f.maxhp * .15; floatText(f.x, top(f) - 40, 'SECOND WIND', '#7dff9a', 26); sfx('heal'); }
    if (f.isAI && aiOn()) { // fight phases
      const r = f.hp / f.maxhp, ph = r < .33 ? 3 : r < .66 ? 2 : 1;
      if (ph > v.phase) {
        v.phase = ph; spark(f.x, center(f).y, ph === 3 ? '#ff5a3a' : '#ffb347', 20); sfx('boom'); shake = Math.max(shake, 10);
        floatText(f.x, top(f) - 46, ph === 3 ? 'RAGE!' : 'PHASE 2', ph === 3 ? '#ff5a3a' : '#ffb347', 30);
        if (ph === 3 && S.style && S.style[f.side] === 'counter') { S.style[f.side] = 'berserker'; tag(); }
      }
      if (v.phase > 1) for (const k in f.cool) f.cool[k] = Math.max(0, f.cool[k] - dt * .16 * (v.phase - 1));
    }
    if (VAR.moveTick) VAR.moveTick(f, dt);
  }

  // ---- AI: styles re-weight the options the AI rolls each think
  function tag() { // the AI's style sits under its name on the HUD
    const el = document.querySelector('#nameB small'); if (!el || !E) return;
    const st = STYLES[S.style && S.style[E.side]], txt = (E.ability && E.ability.name || '') + (st ? ' \u00b7 ' + st.n : ''); if (el.textContent !== txt) el.textContent = txt;
  }
  function aiOpts(f, o, opts) {
    if (!aiOn() || !f.isAI) return;
    if (!S.style) S.style = {};
    if (!S.style[f.side]) { S.style[f.side] = STYLE_IDS[Math.floor(Math.random() * STYLE_IDS.length)]; floatText(f.x, top(f) - 30, STYLES[S.style[f.side]].n + ' STYLE', '#ffd0a0', 20); }
    if (practice && S.forceStyle) S.style[f.side] = S.forceStyle;
    const st = STYLES[S.style[f.side]]; if (!st) return; tag();
    const dd = Math.abs(o.x - f.x);
    for (const x of opts) {
      const nm = x[0]; let m = st.w[nm] || 1;
      if (st.keep && nm === 'retreat' && dd < st.keep) m *= 2; // ranged styles back away when you get close
      const i = nm === 'special' ? 0 : nm === 'special2' ? 1 : nm === 'special3' ? 2 : -1;
      if (i >= 0 && f.specs[i]) { const key = f.specs[i].key; for (const g in st.sp) if (K[g] && K[g].has(key)) m *= st.sp[g]; }
      if (nm === 'ranged' && st.sp.proj) m *= 1;
      x[1] *= m;
    }
  }
  function roundAdapt(oP, oE) { // the AI studies how it lost the last round and changes its style
    if (!aiOn() || !oP || !oP.vr || !S.style) return;
    const c = oP.vr.cat, t = c.melee + c.ranged + c.special; if (t < 4) return;
    const old = S.style[E.side]; let ns = old;
    const pickOf = l => { const r = l.filter(x => x !== old); return r[Math.floor(Math.random() * r.length)]; };
    if (c.ranged / t > .4) ns = pickOf(['rusher', 'trickster', 'trapper', 'turtle']); else if (c.melee / t > .5) ns = pickOf(['counter', 'zoner', 'sniper', 'trapper']); else if (c.special / t > .45) ns = pickOf(['counter', 'sniper', 'rusher', 'trickster']); else ns = pickOf(STYLE_IDS);
    if (ns !== old) { S.style[E.side] = ns; S.adaptMsg = STYLES[ns].n; }
  }

  // ---- arena events and repeating pickups
  const PK = [['berry', 3], ['orb', 3], ['shield', 2], ['power', 2], ['cure', 1.5], ['crate', 1.5]];
  const pkKind = () => { let t = 0; for (const p of PK) t += p[1]; let r = Math.random() * t; for (const p of PK) { r -= p[1]; if (r <= 0) return p[0]; } return 'berry'; };
  function spawnPickup() {
    if (pickups.length >= (S.rule === 'berries' ? 3 : 2)) return;
    pickups.push({ kind: pkKind(), x: clamp((P.x + E.x) / 2 + rnd(-260, 260), WALL_L + 80, WALL_R - 80), y: -40, t: 0, life: 13 });
  }
  function collect(f, p) {
    const col = k => ({ berry: '#ff5a6a', orb: '#5ad6ff', shield: '#8cc8ff', power: '#ff9a3a', cure: '#7dff9a', crate: '#ffd34d' }[k] || '#fff');
    let kind = p.kind;
    if (kind === 'crate') {
      const r = Math.random();
      if (r < .2) { f.hp = Math.max(1, f.hp - f.maxhp * .06); floatText(f.x, top(f) - 14, 'TRAP! -6%', '#ff7a5a', 26); boom(f.x, GROUND - 30, 90, '#ff9a3a', 10); return true; }
      if (r < .4) { vr(f).regenT = 6; floatText(f.x, top(f) - 14, 'STAMINA BOOST', '#5ad6ff', 24); return true; }
      kind = ['berry', 'orb', 'shield', 'power', 'cure'][Math.floor(Math.random() * 5)];
    }
    spark(p.x, p.y, col(kind), 12);
    if (kind === 'berry') { const g = f.maxhp * .15 * (hasPerk(f, 'berry') ? 2 : 1); f.hp = Math.min(f.maxhp, f.hp + g); floatText(f.x, top(f) - 14, '+HP', '#7dff9a', 28); }
    else if (kind === 'orb') { f.sta = Math.min(100, f.sta + 45); f.ki = Math.min(100, f.ki + 25); floatText(f.x, top(f) - 14, '+STAMINA', '#5ad6ff', 24); }
    else if (kind === 'shield') { f.shieldT = 6; floatText(f.x, top(f) - 14, 'SHIELD', '#8cc8ff', 26); }
    else if (kind === 'power') { f.buffT = 8; floatText(f.x, top(f) - 14, 'POWER UP', '#ff9a3a', 26); }
    else if (kind === 'cure') { f.sleepT = f.poisonT = f.burnT = f.confT = f.slowT = f.freezeT = 0; f.hp = Math.min(f.maxhp, f.hp + f.maxhp * .05); floatText(f.x, top(f) - 14, 'CURED', '#7dff9a', 26); }
    return true;
  }
  const wants = (f, p) => (p.kind === 'berry' && f.hp < f.maxhp * .7) || (p.kind === 'orb' && f.sta < 50) || p.kind === 'shield' || p.kind === 'power' || p.kind === 'crate' || (p.kind === 'cure' && statusy(f));
  function drawPickup(g, p) {
    if (p.kind === 'berry' || p.kind === 'orb') return false;
    if (p.life - p.t < 2 && Math.floor(now * 8) % 2) return true;
    const y = p.y + Math.sin(now * 4 + p.x) * 4, c = { shield: '#8cc8ff', power: '#ff9a3a', cure: '#7dff9a', crate: '#ffd34d' }[p.kind] || '#fff';
    g.save(); g.globalCompositeOperation = 'lighter'; spr(g, 'shine', p.x, y, 70, now * 2, .8); g.globalCompositeOperation = 'source-over';
    if (p.kind === 'crate') { g.fillStyle = '#b8782a'; g.fillRect(p.x - 15, y - 15, 30, 30); g.strokeStyle = '#ffd34d'; g.lineWidth = 3; g.strokeRect(p.x - 15, y - 15, 30, 30); g.fillStyle = '#ffd34d'; g.font = 'bold 20px sans-serif'; g.textAlign = 'center'; g.fillText('?', p.x, y + 7); }
    else {
      g.fillStyle = c; circ(g, p.x, y, 16); g.fillStyle = 'rgba(255,255,255,.75)'; g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2;
      g.beginPath();
      if (p.kind === 'shield') { g.moveTo(p.x, y - 9); g.lineTo(p.x + 8, y - 5); g.lineTo(p.x + 6, y + 5); g.lineTo(p.x, y + 10); g.lineTo(p.x - 6, y + 5); g.lineTo(p.x - 8, y - 5); }
      else if (p.kind === 'power') { g.moveTo(p.x, y - 10); g.lineTo(p.x + 8, y + 3); g.lineTo(p.x + 2, y + 3); g.lineTo(p.x + 2, y + 10); g.lineTo(p.x - 8, y - 3); g.lineTo(p.x - 2, y - 3); }
      else { g.moveTo(p.x - 3, y - 9); g.lineTo(p.x + 3, y - 9); g.lineTo(p.x + 3, y - 3); g.lineTo(p.x + 9, y - 3); g.lineTo(p.x + 9, y + 3); g.lineTo(p.x + 3, y + 3); g.lineTo(p.x + 3, y + 9); g.lineTo(p.x - 3, y + 9); g.lineTo(p.x - 3, y + 3); g.lineTo(p.x - 9, y + 3); g.lineTo(p.x - 9, y - 3); g.lineTo(p.x - 3, y - 3); }
      g.closePath(); g.fill(); g.stroke();
    }
    g.restore(); return true;
  }

  function events(dt) {
    if (practice || lab) return;
    pkDone = true; // the old one-per-round drop is replaced by repeating pickups
    S.pkT -= dt; if (S.pkT <= 0) { S.pkT = S.rule === 'berries' ? rnd(5, 7) : rnd(14, 22); spawnPickup(); }
    // weather shift: the sky changes mid-fight for a while
    S.wxT -= dt; if (S.wxT <= 0) {
      S.wxT = S.rule === 'chaos' ? rnd(10, 14) : rnd(34, 50); const ids = Object.keys(WEATHER).filter(k => !weather || weather.id !== k), id = ids[Math.floor(Math.random() * ids.length)];
      if (id) { setWeather(id, rnd(22, 32)); updateTint(); showMsg('WEATHER SHIFT: ' + WEATHER[id].name.toUpperCase(), 1500); }
    }
    // hazard waves on arenas that already have hazards: three strikes in a row
    const h = HAZARD[curTheme.id] || (S.rule === 'chaos' ? HAZARD.cave : null);
    if (h) { S.hzwT -= dt; if (S.hzwT <= 0) { S.hzwT = S.rule === 'chaos' ? rnd(12, 16) : rnd(30, 42); showMsg('HAZARD WAVE!', 1200); for (let i = 0; i < 3; i++) { const tg = i % 2 ? P : E; hazards.push({ ...h, x: clamp(tg.x + rnd(-200, 200), WALL_L + 60, WALL_R - 60), t: 0, warn: .95 + i * .45, done: false }); } } }
    // low gravity pulse
    if (S.rule === 'lowgrav') S.lowG = Math.max(S.lowG, 1);
    if (S.lowG > 0) { S.lowG -= dt; for (const f of [P, E]) if (!f.dead && f.z > 0) f.vz += 1100 * dt; if (S.lowG <= 0) showMsg('GRAVITY BACK', 900); }
    else { S.lgT -= dt; if (S.lgT <= 0) { S.lgT = rnd(38, 55); S.lowG = 5; showMsg('LOW GRAVITY!', 1300); } }
    // crowd cheer: when both fighters are nearly out, the crowd pushes them on
    if (!S.cheer && P.hp < P.maxhp * .3 && E.hp < E.maxhp * .3 && P.hp > 0 && E.hp > 0) { S.cheer = true; showMsg('THE CROWD ROARS!', 1500); for (const f of [P, E]) { f.hp = Math.min(f.maxhp, f.hp + f.maxhp * .03); f.buffT = Math.max(f.buffT, 4); f.sta = 100; } }
  }

  function world(dt) {
    if (!live()) return;
    if (S.rule && !S.ruleShown) { S.ruleShown = true; showMsg('DAILY: ' + RULES[S.rule].n, 2600); }
    for (const f of [P, E]) fighterTick(f, dt);
    events(dt); if (VAR.extraWorld) VAR.extraWorld(dt);
    for (const e of S.ents) { e.t += dt; if (e.upd(e, dt) === false || e.t > e.life) e.dead = true; }
    if (S.ents.some(e => e.dead)) S.ents = S.ents.filter(e => !e.dead);
  }

  function reset() {
    S.ents = []; S.pkT = rnd(10, 16); S.wxT = rnd(30, 45); S.hzwT = rnd(25, 35); S.lgT = rnd(32, 48); S.lowG = 0; S.cheer = false;
    if (!P || !E) return;
    if (rounds && rounds.n <= 1) { S.style = null; S.rule = S.nextRule || null; S.nextRule = null; S.ruleShown = false; }
    for (const f of [P, E]) { f.vr = null; vr(f); }
    if (VAR.moveReset) VAR.moveReset(); if (VAR.moveResetWx) VAR.moveResetWx(); tag();
    for (const f of [P, E]) if (hasPerk(f, 'feet')) f.kit = Object.assign({}, f.kit, { speed: f.kit.speed * 1.08 });
    if (S.adaptMsg && E.isAI) { floatText(E.x, top(E) - 30, 'AI CHANGED STYLE: ' + S.adaptMsg, '#ffd0a0', 20); S.adaptMsg = null; }
  }

  // ---- drawing: the variety pips and comeback meter over each fighter, plus the moves' own effects
  function draw(g) {
    if (!live()) return;
    for (const f of [P, E]) {
      if (f.dead) continue; const v = vr(f), n = Math.min(4, distinct(f)), x0 = f.x - 21, y = top(f) - 6;
      g.save(); g.globalAlpha = .9;
      for (let i = 0; i < 4; i++) { g.fillStyle = i < n ? (v.bonusT > 0 ? '#ffe27a' : '#7dffb0') : 'rgba(0,0,0,.45)'; g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.2; g.beginPath(); g.arc(x0 + i * 14, y, 4.2, 0, 6.283); g.fill(); g.stroke(); }
      if (v.rep >= 3 && now - v.lastAt < 6) { g.fillStyle = '#ff8a6a'; g.font = 'bold 12px sans-serif'; g.textAlign = 'center'; g.fillText('STALE x' + v.rep, f.x, y - 9); }
      if (!v.cmbUsed && v.cmb > 6) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(f.x - 22, y + 8, 44, 4); g.fillStyle = '#ffb347'; g.fillRect(f.x - 22, y + 8, 44 * clamp(v.cmb / 100, 0, 1), 4); }
      if (v.aura > 0) { g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#ffd34d'; g.lineWidth = 3; g.beginPath(); g.ellipse(f.x, center(f).y, f.w * .5 + 8 + Math.sin(now * 10) * 3, f.h * .55, 0, 0, 6.283); g.stroke(); }
      g.restore();
    }
    for (const e of S.ents) if (e.draw) { g.save(); e.draw(g, e); g.restore(); }
  }

  // ---- perk draft: after each won tournament round, pick one of three perks that last for the whole run
  function perkOffer() {
    if (!tour) return; tour.perks = tour.perks || [];
    const left = Object.keys(PERKS).filter(k => !tour.perks.includes(k)); for (let i = left.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [left[i], left[j]] = [left[j], left[i]]; }
    tour.offer = left.slice(0, 3);
  }
  function perkUI() {
    const pane = $('tourPane'); let box = $('perkBox');
    if (!box) { box = document.createElement('div'); box.id = 'perkBox'; pane.appendChild(box); const st = document.createElement('style'); st.textContent = '#perkBox{position:absolute;left:0;right:0;bottom:8px;display:none;text-align:center;z-index:5}#perkBox.on{display:block}#perkBox h3{margin:0 0 6px;font:800 15px sans-serif;letter-spacing:2px;color:#ffe27a}#perkBox button{margin:0 6px;padding:8px 12px;width:200px;border-radius:10px;border:2px solid #ffe27a;background:rgba(20,24,50,.95);color:#fff;font:700 13px sans-serif;cursor:pointer}#perkBox button small{display:block;font-weight:400;color:#bcd;margin-top:3px}'; document.head.appendChild(st); }
    const offer = tour && !tour.over && tour.offer;
    box.classList.toggle('on', !!offer); $('tbGo').disabled = !!offer; $('tbGo').style.opacity = offer ? .35 : ''; $('tbMsg').style.visibility = offer ? 'hidden' : '';
    if (offer) $('tbGo').style.display = 'none';
    if (tour && tour.perks && tour.perks.length) $('tbMsg').textContent += '  \u00b7  Perks: ' + tour.perks.map(k => PERKS[k].n).join(', ');
    if (!offer) return;
    box.innerHTML = '<h3>CHOOSE A PERK</h3>' + offer.map(k => `<button data-k="${k}">${PERKS[k].n}<small>${PERKS[k].d}</small></button>`).join('');
    box.querySelectorAll('button').forEach(b => b.onclick = () => { tour.perks.push(b.dataset.k); tour.offer = null; tourSave(); drawTour(); });
  }

  const api = { S, matchEnd, perkOffer, perkUI, vr, onAct, dmgMul, onHit, absorb, world, reset, draw, aiOpts, roundAdapt, collect, wants, drawPickup, events, PERKS, STYLES, hasPerk, actKey, spawn: e => { e.t = e.t || 0; e.life = e.life || 3; S.ents.push(e); return e; }, distinct, top, offline };
  // training room: pick the style the "fights back" dummy uses
  const pu = document.getElementById('practiceUI');
  if (pu) {
    const b = document.createElement('button'); b.className = 'chip'; b.id = 'styleBtn'; b.textContent = 'DUMMY STYLE: AUTO'; pu.appendChild(b);
    b.onclick = () => { const i = S.forceStyle ? STYLE_IDS.indexOf(S.forceStyle) + 1 : 0; S.forceStyle = i >= STYLE_IDS.length ? null : STYLE_IDS[i]; if (S.style && E) S.style[E.side] = S.forceStyle; b.textContent = 'DUMMY STYLE: ' + (S.forceStyle ? STYLES[S.forceStyle].n : 'AUTO'); };
  }
  const db = document.getElementById('dailyBtn');
  if (db) {
    setDailyLabel();
    db.onclick = () => { // same rule, rival and arena for everyone on the same date
      if (!owns(selYou)) { showScreen('menu'); return; }
      const k = dayKey(); S.nextRule = RULE_IDS[k % RULE_IDS.length]; selRival = 1 + (k * 7919) % POKEDEX.length; themeIdx = k % THEMES.length; setTheme(THEMES[themeIdx]);
      startMatch();
    };
  }
  return api;
})();
