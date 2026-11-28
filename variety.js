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
    rusher: { n: 'RUSHER', w: { approach: 3, dash: 2.5, melee: 2.2, guard: .3, retreat: .15, ranged: .4, rest: .5 }, sp: { contact: 2 }, pref: [60, 170], agg: .9 },
    zoner: { n: 'ZONER', w: { ranged: 3, retreat: 3, approach: .25, melee: .4, dash: .5, guard: .8 }, sp: { proj: 3 }, pref: [340, 480], agg: 0 },
    trapper: { n: 'TRAPPER', w: { retreat: 1.8, sidestep: .5, approach: .6, ranged: .6 }, sp: { trap: 3.5 }, pref: [260, 420], agg: 0 },
    counter: { n: 'COUNTER', w: { guard: 3.5, grab: 2.2, approach: .3, melee: 1.6, dash: .4 }, sp: { counter: 4 }, pref: [140, 280], agg: .2 },
    turtle: { n: 'TURTLE', w: { guard: 4.5, rest: 3, retreat: 1.8, approach: .3, melee: .5, ranged: 1.2 }, sp: { def: 3.5 }, pref: [200, 330], agg: -.3 },
    trickster: { n: 'TRICKSTER', w: { sidestep: 4, align: 2, dash: 3, jump: 3, guard: .4, melee: .8 }, sp: { tricky: 3 }, pref: [120, 320], agg: .4 },
    berserker: { n: 'BERSERKER', w: { melee: 3, guard: .1, approach: 2.8, retreat: .1, rest: .2, ranged: .3 }, sp: { contact: 1.8 }, pref: [40, 150], agg: 1, dmg: 1.1, take: 1.1 },
    sniper: { n: 'SNIPER', w: { ranged: 2.6, retreat: 2.6, approach: .3, melee: .4, guard: .8 }, sp: { proj: 2.6 }, pref: [420, 520], agg: 0 },
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
    if (state === 'fight') { const mc = stats.mc || (stats.mc = { P: { melee: 0, ranged: 0, special: 0 }, E: { melee: 0, ranged: 0, special: 0 } }), mine = f === meF(); mc[mine ? 'P' : 'E'][cat]++; if (mine) { const mv = stats.mv || (stats.mv = {}); mv[k] = (mv[k] || 0) + 1; } } // totals for the result screen
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
    m *= .96 + .1 * (att.kit.wt || 0); // heavy fighters hit a little harder
    const ev = S.ev && S.ev.key; // timed arena events
    if (ev === 'glass') m *= 1.5;
    else if (ev === 'typestorm' && ty === S.ev.ty) m *= 1.4;
    else if (ev === 'showdown' && (!att.act || (att.act.name !== 'melee' && att.act.name !== 'grab'))) m *= 1.3;
    else if (ev === 'underdog' && att.hp / att.maxhp < def.hp / def.maxhp - .05) m *= 1.3;
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
    if (offline() && att === P && av.lastKey) { const k = av.lastKey, n = S.mastery[k] = (S.mastery[k] || 0) + 1; if (mLv(n) !== mLv(n - 1)) { floatText(att.x, top(att) - 50, 'MASTERY LV ' + mLv(n), '#ffe27a', 22); (stats.lv || (stats.lv = [])).push([k, mLv(n)]); saveMastery(); } else if (n % 10 === 0) saveMastery(); }
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
    v.bonusT = Math.max(0, v.bonusT - dt); v.aura = Math.max(0, v.aura - dt); v.regenT = Math.max(0, v.regenT - dt); v.magT = Math.max(0, (v.magT || 0) - dt); v.bootT = Math.max(0, (v.bootT || 0) - dt);
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
        if (ph === 3 && S.style && S.style[f.side] === 'counter' && !S.lockStyle) { S.style[f.side] = 'berserker'; tag(); }
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
  const pickStyle = () => { const pool = selDiff === 'Easy' ? ['rusher', 'zoner', 'turtle', 'counter'] : STYLE_IDS; return pool[Math.floor(Math.random() * pool.length)]; }; // Easy never meets the tricky styles
  function aiOpts(f, o, opts) {
    if (!aiOn() || !f.isAI) return;
    if (!S.style) S.style = {};
    if (!S.style[f.side]) { S.style[f.side] = S.fixedStyle || pickStyle(); floatText(f.x, top(f) - 30, STYLES[S.style[f.side]].n + ' STYLE', '#ffd0a0', 20); }
    if (practice && S.forceStyle) S.style[f.side] = S.forceStyle;
    const st = STYLES[S.style[f.side]]; if (!st) return; tag();
    const dd = Math.abs(o.x - f.x), evk = S.ev && S.ev.key, spg = evk === 'springs' && S.ents.find(e => e.springs);
    const wallD = o.x > f.x ? f.x - WALL_L : WALL_R - f.x, band = dd > st.pref[1] ? 1 : dd < st.pref[0] ? -1 : 0, ag = st.agg || 0; // wallD: room left behind the AI; band: too far (1), too close (-1) or in its preferred range (0)
    for (const x of opts) {
      const nm = x[0]; let m = st.w[nm] || 1;
      if (spg && f.hp < f.maxhp * .9 && Math.abs(f.x - spg.x) < spg.r * .8 && (nm === 'approach' || nm === 'retreat')) m *= .3; // hurt and standing in the springs: stay and heal
      if (nm === 'approach') m = (band > 0 ? 2.4 : band < 0 ? .2 : .55) * (1 + ag); // every style steers toward its own preferred range
      else if (nm === 'retreat') m = (band < 0 ? 2.4 : band > 0 ? .15 : .5) * (1 - .6 * ag);
      if (wallD < 260 && nm === 'retreat') m *= .1; if (wallD < 260 && (nm === 'sidestep' || nm === 'jump' || nm === 'guard')) m *= 1.6; // cornered: do not keep backing into the wall
      if (evk === 'brawl' && (nm === 'ranged' || nm === 'special' || nm === 'special2' || nm === 'special3')) m = 0; // locked moves are not worth rolling
      if (evk === 'overdrive' || evk === 'showdown') m *= nm === 'melee' || nm === 'grab' ? 0 : nm === 'ranged' || nm.startsWith('special') ? 3 : 1;
      if (nm === 'melee' && o.hitT > 0) m *= 1.3; // you are staggered: press the attack
      const i = nm === 'special' ? 0 : nm === 'special2' ? 1 : nm === 'special3' ? 2 : -1;
      if (i >= 0 && f.specs[i]) {
        const key = f.specs[i].key; for (const g in st.sp) if (K[g] && K[g].has(key)) m *= st.sp[g];
        if (f.hp < f.maxhp * .4 && K.def.has(key)) m *= 2.5; // hurt: heal, shield or buff
        else if (o.hp < o.maxhp * .3 && (K.proj.has(key) || K.contact.has(key))) m *= 1.6; // you are low: go for the finish
        if (o.hitT > 0 && K.contact.has(key)) m *= 1.4;
      }
      x[1] *= m;
    }
  }
  function roundAdapt(oP, oE) { // the AI studies how it lost the last round and changes its style
    if (!aiOn() || !oP || !oP.vr || !S.style || S.lockStyle || selDiff === 'Easy') return;
    const c = oP.vr.cat, t = c.melee + c.ranged + c.special; if (t < 4) return;
    const old = S.style[E.side]; let ns = old;
    const pickOf = l => { const r = l.filter(x => x !== old); return r[Math.floor(Math.random() * r.length)]; };
    if (c.ranged / t > .4) ns = pickOf(['rusher', 'trickster', 'trapper', 'turtle']); else if (c.melee / t > .5) ns = pickOf(['counter', 'zoner', 'sniper', 'trapper']); else if (c.special / t > .45) ns = pickOf(['counter', 'sniper', 'rusher', 'trickster']); else ns = pickOf(STYLE_IDS);
    if (ns !== old) { S.style[E.side] = ns; S.adaptMsg = STYLES[ns].n; }
  }

  // ---- arena events and repeating pickups
  const PK = [['berry', 3], ['orb', 3], ['shield', 2], ['power', 2], ['cure', 1.5], ['crate', 1.5], ['magnet', 1.2], ['bomb', 1.4], ['boots', 1.6], ['clock', 1.2], ['frost', 1.2]];
  const PICK = { // what each pickup is called and does: written under it on the field and shown over the fighter that takes it
    berry: { n: 'BERRY', e: '+15% health', c: '#ff5a6a' }, orb: { n: 'ENERGY ORB', e: '+45 stamina, +25 ki', c: '#5ad6ff' }, shield: { n: 'SHIELD', e: 'Half damage for 6 s', c: '#8cc8ff' },
    power: { n: 'POWER UP', e: '+25% damage for 8 s', c: '#ff9a3a' }, cure: { n: 'CURE', e: 'Clears status, +5% health', c: '#7dff9a' }, crate: { n: 'MYSTERY CRATE', e: 'Could be anything', c: '#ffd34d' },
    magnet: { n: 'MAGNET', e: 'Pulls pickups to you for 7 s', c: '#b48cff' }, bomb: { n: 'BOMB', e: 'Blast: -9% health nearby', c: '#ff5a3a' }, boots: { n: 'SPEED BOOTS', e: '+35% speed for 7 s', c: '#3fe0b0' },
    clock: { n: 'TIME WARP', e: 'All cooldowns reset', c: '#ffb347' }, frost: { n: 'FROST', e: 'Rival slowed for 4 s', c: '#8fe3ff' },
  };
  const toast = (f, title, line, col) => { // two lines over the fighter: what it took and what that does; back-to-back pickups stack upward
    const v = vr(f), n = now - (v.tAt || -9) < 1.4 ? Math.min(2, (v.tN || 0) + 1) : 0, dy = n * 56; v.tN = n; v.tAt = now;
    floatText(f.x, top(f) - 58 - dy, title, col, 30, 1.7); floatText(f.x, top(f) - 28 - dy, line, '#ffffff', 18, 1.7);
  };
  const speedMul = f => (f.vr && f.vr.bootT > 0 ? 1.35 : 1) * (S.ev && S.ev.key === 'mud' ? .7 : 1);
  const pkKind = () => { let t = 0; for (const p of PK) t += p[1]; let r = Math.random() * t; for (const p of PK) { r -= p[1]; if (r <= 0) return p[0]; } return 'berry'; };
  function spawnPickup() {
    if (pickups.length >= (S.rule === 'berries' ? 3 : 2)) return;
    pickups.push({ kind: pkKind(), x: clamp((P.x + E.x) / 2 + rnd(-260, 260), WALL_L + 80, WALL_R - 80), y: -40, t: 0, life: 13 });
  }
  function collect(f, p) {
    let kind = p.kind, d = PICK[kind] || PICK.berry, title = d.n, line = d.e;
    if (kind === 'crate') {
      const r = Math.random();
      if (r < .2) { f.hp = Math.max(1, f.hp - f.maxhp * .06); toast(f, 'CRATE TRAP!', '-6% health', '#ff7a5a'); boom(f.x, GROUND - 30, 90, '#ff9a3a', 10); return true; }
      if (r < .4) { vr(f).regenT = 6; toast(f, 'CRATE: STAMINA SURGE', 'Fast stamina regen for 6 s', '#5ad6ff'); spark(p.x, p.y, '#5ad6ff', 12); return true; }
      kind = ['berry', 'orb', 'shield', 'power', 'cure', 'magnet', 'boots', 'clock'][Math.floor(Math.random() * 8)]; d = PICK[kind]; title = 'CRATE: ' + d.n; line = d.e;
    }
    if (kind === 'berry' && hasPerk(f, 'berry')) line = '+30% health (Berry perk)';
    spark(p.x, p.y, d.c, 18); toast(f, title, line, d.c);
    if (kind === 'berry') { const g = f.maxhp * .15 * (hasPerk(f, 'berry') ? 2 : 1); f.hp = Math.min(f.maxhp, f.hp + g); }
    else if (kind === 'orb') { f.sta = Math.min(100, f.sta + 45); f.ki = Math.min(100, f.ki + 25); }
    else if (kind === 'shield') f.shieldT = 6;
    else if (kind === 'power') f.buffT = 8;
    else if (kind === 'cure') { f.sleepT = f.poisonT = f.burnT = f.confT = f.slowT = f.freezeT = 0; f.hp = Math.min(f.maxhp, f.hp + f.maxhp * .05); }
    else if (kind === 'magnet') vr(f).magT = 7;
    else if (kind === 'boots') vr(f).bootT = 7;
    else if (kind === 'clock') { for (const c in f.cool) f.cool[c] = 0; f.dashCool = 0; f.laneCool = 0; f.staDelay = 0; }
    else if (kind === 'frost') { const o = f === P ? E : P; if (!o.dead) { o.slowT = Math.max(o.slowT, 4); spark(o.x, center(o).y, '#8fe3ff', 14); floatText(o.x, top(o) - 14, 'SLOWED!', '#8fe3ff', 24); } }
    else if (kind === 'bomb') {
      boom(p.x, GROUND - 30, 230, '#ff7a3a', 26); shake = Math.max(shake, 14);
      for (const t of [P, E]) if (!t.dead && Math.abs(t.x - p.x) < 230) { t.hp = Math.max(1, t.hp - t.maxhp * .09); t.kvx += (t.x >= p.x ? 1 : -1) * 520; floatText(t.x, top(t) - 14, '-9%', '#ff7a5a', 26); }
    }
    return true;
  }
  const wants = (f, p) => { const k = p.kind; return k !== 'bomb' && ((k === 'berry' && f.hp < f.maxhp * .7) || (k === 'orb' && f.sta < 50) || k === 'shield' || k === 'power' || k === 'crate' || k === 'boots' || k === 'frost' || (k === 'cure' && statusy(f)) || (k === 'magnet' && pickups.length > 1) || (k === 'clock' && Object.values(f.cool).some(c => c > 2))); };
  function drawPickup(g, p) {
    if (p.kind === 'berry' || p.kind === 'orb') return false;
    if (p.life - p.t < 2 && Math.floor(now * 8) % 2) return true;
    const d = PICK[p.kind] || PICK.cure, x = p.x, y = p.y + Math.sin(now * 4 + p.x) * 4, c = d.c;
    g.save(); g.globalCompositeOperation = 'lighter';
    const gl = g.createRadialGradient(x, y, 4, x, y, 46); gl.addColorStop(0, c + 'aa'); gl.addColorStop(1, c + '00'); g.fillStyle = gl; circ(g, x, y, 46);
    spr(g, 'shine', x, y, 90, now * 2, .8); g.globalCompositeOperation = 'source-over';
    g.translate(x, y); g.scale(1.3, 1.3); g.translate(-x, -y); // the icons are drawn at 1.3x so they read on a phone
    if (p.kind === 'crate') { g.fillStyle = '#b8782a'; g.fillRect(x - 15, y - 15, 30, 30); g.strokeStyle = '#ffd34d'; g.lineWidth = 3; g.strokeRect(x - 15, y - 15, 30, 30); g.fillStyle = '#ffd34d'; g.font = 'bold 20px sans-serif'; g.textAlign = 'center'; g.fillText('?', x, y + 7); }
    else if (p.kind === 'bomb') { // a visible trap: a pulsing red ring warns that it blows up when touched
      const pulse = .5 + .5 * Math.sin(now * 8); g.strokeStyle = `rgba(255,70,50,${.35 + .5 * pulse})`; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 24 + pulse * 4, 0, 6.283); g.stroke();
      g.fillStyle = '#23232e'; circ(g, x, y + 2, 14); g.fillStyle = 'rgba(255,255,255,.35)'; circ(g, x - 5, y - 3, 4);
      g.strokeStyle = '#b9a27a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 4, y - 11); g.quadraticCurveTo(x + 9, y - 19, x + 15, y - 17); g.stroke();
      g.fillStyle = pulse > .5 ? '#ffe27a' : '#ff8a3a'; circ(g, x + 15, y - 17, 3 + pulse * 2);
    } else {
      g.fillStyle = c; circ(g, x, y, 16); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 16, 0, 6.283); g.stroke();
      if (p.kind === 'magnet') {
        g.lineWidth = 5; g.strokeStyle = '#ff4d5e'; g.beginPath(); g.arc(x, y + 1, 7, Math.PI, 0); g.lineTo(x + 7, y + 6); g.moveTo(x - 7, y + 1); g.lineTo(x - 7, y + 6); g.stroke();
        g.strokeStyle = '#f2f6ff'; g.beginPath(); g.moveTo(x - 7, y + 6); g.lineTo(x - 7, y + 10); g.moveTo(x + 7, y + 6); g.lineTo(x + 7, y + 10); g.stroke();
      } else if (p.kind === 'boots') {
        g.strokeStyle = '#fff'; g.lineWidth = 4; for (const o of [-6, 4]) { g.beginPath(); g.moveTo(x + o - 4, y - 8); g.lineTo(x + o + 4, y); g.lineTo(x + o - 4, y + 8); g.stroke(); }
      } else if (p.kind === 'clock') {
        g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 9, 0, 6.283); g.stroke(); const a = now * 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(a) * 7, y - Math.cos(a) * 7); g.moveTo(x, y); g.lineTo(x + 4, y); g.stroke();
      } else if (p.kind === 'frost') {
        g.strokeStyle = '#fff'; g.lineWidth = 2.5; for (let i = 0; i < 3; i++) { const a = i * 1.0472; g.beginPath(); g.moveTo(x - Math.cos(a) * 10, y - Math.sin(a) * 10); g.lineTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10); g.stroke(); }
      } else {
        g.fillStyle = 'rgba(255,255,255,.75)'; g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2;
        g.beginPath();
        if (p.kind === 'shield') { g.moveTo(x, y - 9); g.lineTo(x + 8, y - 5); g.lineTo(x + 6, y + 5); g.lineTo(x, y + 10); g.lineTo(x - 6, y + 5); g.lineTo(x - 8, y - 5); }
        else if (p.kind === 'power') { g.moveTo(x, y - 10); g.lineTo(x + 8, y + 3); g.lineTo(x + 2, y + 3); g.lineTo(x + 2, y + 10); g.lineTo(x - 8, y - 3); g.lineTo(x - 2, y - 3); }
        else { g.moveTo(x - 3, y - 9); g.lineTo(x + 3, y - 9); g.lineTo(x + 3, y - 3); g.lineTo(x + 9, y - 3); g.lineTo(x + 9, y + 3); g.lineTo(x + 3, y + 3); g.lineTo(x + 3, y + 9); g.lineTo(x - 3, y + 9); g.lineTo(x - 3, y + 3); g.lineTo(x - 9, y + 3); g.lineTo(x - 9, y - 3); g.lineTo(x - 3, y - 3); }
        g.closePath(); g.fill(); g.stroke();
      }
    }
    g.translate(x, y); g.scale(1 / 1.3, 1 / 1.3); g.translate(-x, -y);
    g.font = 'bold 14px sans-serif'; g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.8)'; g.strokeText(d.n, x, y + 40); g.fillStyle = '#fff'; g.fillText(d.n, x, y + 40);
    g.restore(); return true;
  }

  function events(dt) {
    if (practice || lab) return;
    if (!S.evMatch) return; // dynamic events are off: only the original single pickup drops
    pkDone = true; // the old one-per-round drop is replaced by repeating pickups
    S.pkT -= dt; if (S.pkT <= 0) { S.pkT = S.rule === 'berries' ? rnd(5, 7) : rnd(14, 22); spawnPickup(); }
    // weather shift: the sky changes mid-fight for a while
    S.wxT -= dt; if (S.wxT <= 0 && S.wxMatch === 'auto') {
      S.wxT = S.rule === 'chaos' ? rnd(10, 14) : rnd(34, 50); const ids = Object.keys(WEATHER).filter(k => !weather || weather.id !== k), id = ids[Math.floor(Math.random() * ids.length)];
      if (id) { setWeather(id, rnd(22, 32)); updateTint(); VAR.bannerX('WEATHER SHIFT', WEATHER[id].name, WEATHER[id].icon, WEATHER[id].col); }
    }
    // hazard waves on arenas that already have hazards: three strikes in a row
    const h = HAZARD[curTheme.id] || (S.rule === 'chaos' ? HAZARD.cave : null);
    if (h && S.hzMatch !== false) { S.hzwT -= dt; if (S.hzwT <= 0) { S.hzwT = S.rule === 'chaos' ? rnd(22, 30) : rnd(55, 80); VAR.banner('hazard'); for (let i = 0; i < 3; i++) { const tg = i % 2 ? P : E; hazards.push({ ...h, x: clamp(tg.x + rnd(-200, 200), WALL_L + 60, WALL_R - 60), t: 0, warn: .95 + i * .45, done: false }); } } }
    // low gravity pulse
    if (S.rule === 'lowgrav') S.lowG = Math.max(S.lowG, 1);
    if (S.lowG > 0) { S.lowG -= dt; for (const f of [P, E]) if (!f.dead && f.z > 0) f.vz += 1100 * dt; }
    // crowd cheer: when both fighters are nearly out, the crowd pushes them on
    if (!S.cheer && P.hp < P.maxhp * .3 && E.hp < E.maxhp * .3 && P.hp > 0 && E.hp > 0) { S.cheer = true; VAR.banner('crowd'); for (const f of [P, E]) { f.hp = Math.min(f.maxhp, f.hp + f.maxhp * .03); f.buffT = Math.max(f.buffT, 4); f.sta = 100; } }
  }

  function world(dt) {
    if (!live()) return;
    if (S.rule && !S.ruleShown) { S.ruleShown = true; showMsg('DAILY: ' + RULES[S.rule].n, 2600); }
    for (const f of [P, E]) fighterTick(f, dt);
    for (const f of [P, E]) if (f.vr && f.vr.magT > 0 && !f.dead) for (const p of pickups) if (p.life > 0 && p.kind !== 'bomb' && p.y >= GROUND - 40 && Math.abs(f.x - p.x) < 1100) p.x += Math.sign(f.x - p.x) * Math.min(Math.abs(f.x - p.x), 520 * dt); // magnet: pickups slide to its holder
    events(dt); if (VAR.extraWorld) VAR.extraWorld(dt);
    for (const e of S.ents) { e.t += dt; if (e.upd(e, dt) === false || e.t > e.life) e.dead = true; }
    if (S.ents.some(e => e.dead)) S.ents = S.ents.filter(e => !e.dead);
  }

  function reset() {
    S.ents = []; S.pkT = rnd(10, 16); S.wxT = rnd(30, 45); S.hzwT = rnd(55, 75); S.lgT = rnd(32, 48); S.lowG = 0; S.cheer = false;
    if (!P || !E) return;
    if (rounds && rounds.n <= 1) { S.style = null; S.rule = S.nextRule || null; S.nextRule = null; S.ruleShown = false; }
    for (const f of [P, E]) { f.vr = null; vr(f); }
    if (VAR.moveReset) VAR.moveReset(); if (VAR.moveResetWx) VAR.moveResetWx(); tag();
    for (const f of [P, E]) if (hasPerk(f, 'feet')) f.kit = Object.assign({}, f.kit, { speed: f.kit.speed * 1.08 });
    if (S.adaptMsg && E.isAI) { floatText(E.x, top(E) - 30, 'AI CHANGED STYLE: ' + S.adaptMsg, '#ffd0a0', 20); S.adaptMsg = null; }
  }

  // ---- drawing: the variety pips and comeback meter over each fighter, plus the moves' own effects
  function draw(g) {
    if (VAR.extraDraw) VAR.extraDraw();
    if (VAR.fxDraw) VAR.fxDraw(g);
    if (!live()) return;
    for (const f of [P, E]) {
      if (f.dead) continue; const v = vr(f), n = Math.min(4, distinct(f)), x0 = f.x - 21, y = top(f) - 6;
      g.save(); g.globalAlpha = .9;
      for (let i = 0; i < 4; i++) { g.fillStyle = i < n ? (v.bonusT > 0 ? '#ffe27a' : '#7dffb0') : 'rgba(0,0,0,.45)'; g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.2; g.beginPath(); g.arc(x0 + i * 14, y, 4.2, 0, 6.283); g.fill(); g.stroke(); }
      if (v.rep >= 3 && now - v.lastAt < 6) { g.fillStyle = '#ff8a6a'; g.font = 'bold 12px sans-serif'; g.textAlign = 'center'; g.fillText('STALE x' + v.rep, f.x, y - 9); }
      if (!v.cmbUsed && v.cmb > 6) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(f.x - 22, y + 8, 44, 4); g.fillStyle = '#ffb347'; g.fillRect(f.x - 22, y + 8, 44 * clamp(v.cmb / 100, 0, 1), 4); }
      if (v.aura > 0) { g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#ffd34d'; g.lineWidth = 3; g.beginPath(); g.ellipse(f.x, center(f).y, f.w * .5 + 8 + Math.sin(now * 10) * 3, f.h * .55, 0, 0, 6.283); g.stroke(); }
      if (v.magT > 0) { const k = (now * 1.6) % 1; g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(180,140,255,${.7 * (1 - k)})`; g.lineWidth = 3; g.beginPath(); g.arc(f.x, center(f).y, 30 + k * 90, 0, 6.283); g.stroke(); }
      if (v.bootT > 0) { g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(63,224,176,.55)'; g.lineWidth = 3; for (let i = 0; i < 3; i++) { const yy = center(f).y + (i - 1) * 18, len = 24 + ((now * 90 + i * 17) % 30), bx = f.x - f.face * (f.w * .5 + 4); g.beginPath(); g.moveTo(bx, yy); g.lineTo(bx - f.face * len, yy); g.stroke(); } }
      g.restore();
      if (VAR.statusDraw) VAR.statusDraw(g, f);
    }
    for (const f of [P, E]) { // where a lock-on attack will land: a ring on the ground that turns solid once the attack commits
      const mk = !f.dead && f.act && f.act.mk; if (!mk || mk.x == null) continue; const y = GROUND + laneY(other(f)), pulse = .5 + .5 * Math.sin(now * 14);
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,70,40,${mk.lock ? .22 : .1})`; g.beginPath(); g.ellipse(mk.x, y, mk.r, mk.r * .28, 0, 0, 6.283); g.fill();
      g.strokeStyle = `rgba(255,${mk.lock ? 90 : 160},60,${mk.lock ? .6 + .3 * pulse : .45})`; g.lineWidth = mk.lock ? 4 : 3; g.beginPath(); g.ellipse(mk.x, y, mk.r, mk.r * .28, 0, 0, 6.283); g.stroke(); g.restore();
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
    if (tour && tour.perks && tour.perks.length) ($('tbMsg').lastElementChild || $('tbMsg')).insertAdjacentHTML('beforeend', '<div class="l3">Perks: ' + tour.perks.map(k => PERKS[k].n).join(', ') + '</div>');
    if (!offer) return;
    box.innerHTML = '<h3>CHOOSE A PERK</h3>' + offer.map(k => `<button data-k="${k}">${PERKS[k].n}<small>${PERKS[k].d}</small></button>`).join('');
    box.querySelectorAll('button').forEach(b => b.onclick = () => { tour.perks.push(b.dataset.k); tour.offer = null; tourSave(); drawTour(); });
  }

  const api = { S, matchEnd, perkOffer, perkUI, vr, onAct, dmgMul, onHit, absorb, world, reset, draw, aiOpts, roundAdapt, pickStyle, collect, wants, drawPickup, events, PICK, speedMul, PERKS, STYLES, hasPerk, actKey, spawn: e => { e.t = e.t || 0; e.life = e.life || 3; S.ents.push(e); return e; }, distinct, top, offline };
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
