'use strict';
// Pokémon research: every offline single-player battle pays points (win or lose), and points unlock fighters along each type's tree.
// Progress is one short JSON value in localStorage ('pf_prog'). It survives app updates; only uninstalling (or clearing app data) removes it.
// Online battles never look at it: everyone has every Pokémon there.
const PROG = (() => {
  const KEY = 'pf_prog', N = 386, COST = [0, 150, 350, 700, 1200, 2500], ROM = ['', 'I', 'II', 'III', 'IV', 'V'], LEGMIN = 12, OFFER = [1, 4, 7, 172, 74, 92];
  const NW = 122, NH = 122, CWID = 172, RH = 138, PADX = 24, PADY = 24;
  const DIFFM = { Easy: .75, Normal: 1, Hard: 1.5 };
  const fresh = () => ({ p: 0, b: 0, own: new Uint8Array(N + 1), ua: 0, streak: 0, st: 0, d: '', m: '', rc: 0, mv: {} });
  let S = fresh(), type = 'water', sel = 0, picks = new Set(), toastT = 0;
  const $$ = id => document.getElementById(id);
  const dx = id => POKEDEX[id - 1], prim = id => dx(id).types[0], bst = id => { const p = dx(id); return p.hp + p.atk + p.def + p.spa + p.spd + p.spe; };
  const tier = id => TREE[id][0], par = id => TREE[id][1];
  const hex = t => TYPE_HEX[t] || '#888';
  // ---- saving: points, battles, a bit map of the 386 fighters, and a few small counters
  const pack = own => { const a = new Uint8Array(49); for (let i = 1; i <= N; i++) if (own[i]) a[(i - 1) >> 3] |= 1 << ((i - 1) & 7); let s = ''; for (const x of a) s += String.fromCharCode(x); return btoa(s); };
  const unpack = b64 => { const s = atob(b64), own = new Uint8Array(N + 1); if (s.length < 49) throw 0; for (let i = 1; i <= N; i++) if (s.charCodeAt((i - 1) >> 3) & (1 << ((i - 1) & 7))) own[i] = 1; return own; };
  // moves bought beyond a Pokémon's first four: "pokedexNo:id.id;..." where an id is the position of the move name in MOVE_IDS (data/moveids.js)
  const mvEnc = () => Object.entries(S.mv).filter(([, a]) => a.length).map(([p, a]) => p + ':' + a.join('.')).join(';');
  const mvDec = s => { const o = {}; if (typeof s !== 'string') return o; for (const part of s.split(';')) { const [p, ids] = part.split(':'), pn = +p; if (!(pn >= 1 && pn <= N) || !ids) continue; const a = ids.split('.').map(Number).filter(x => Number.isInteger(x) && x >= 0 && x < MOVE_IDS.length); if (a.length) o[pn] = [...new Set(a)]; } return o; };
  const enc = () => JSON.stringify({ v: 1, p: S.p, b: S.b, u: pack(S.own), a: S.ua, s: S.streak, t: S.st, d: S.d, m: S.m, r: S.rc, k: mvEnc() });
  function dec(txt) {
    const r = JSON.parse(txt); if (!r || r.v !== 1 || typeof r.p !== 'number' || typeof r.u !== 'string' || !isFinite(r.p)) throw 0;
    return { p: Math.max(0, Math.min(1e9, r.p | 0)), b: Math.max(0, r.b | 0), own: unpack(r.u), ua: r.a ? 1 : 0, streak: Math.max(0, r.s | 0), st: r.t ? 1 : 0, d: typeof r.d === 'string' ? r.d.slice(0, 10) : '', m: typeof r.m === 'string' ? r.m.slice(0, 12) : '', rc: Math.max(0, r.r | 0), mv: mvDec(r.k) };
  }
  const save = () => { try { localStorage.setItem(KEY, enc()); } catch (e) { } };
  try { const raw = localStorage.getItem(KEY); if (raw) S = dec(raw); } catch (e) { S = fresh(); }
  const count = () => { let n = 0; for (let i = 1; i <= N; i++) n += S.own[i]; return n; };
  const owns = id => !!S.ua || S.own[id] === 1;
  const firstOwned = () => { for (let i = 1; i <= N; i++) if (S.own[i]) return i; return 0; };
  // ---- the tree layout of one type: one link per fighter (its earlier evolution), rows lined up with the parent so lines stay straight
  const TC = {};
  function build(t) {
    if (TC[t]) return TC[t];
    const L = []; for (let i = 1; i <= N; i++) if (prim(i) === t) L.push(i); L.sort((a, b) => bst(a) - bst(b) || a - b);
    const inL = new Set(L), pr = {}, kids = {}, tiers = [...new Set(L.map(tier))].sort((a, b) => a - b);
    for (const id of L) { const q = par(id); if (q && inL.has(q)) { pr[id] = q; (kids[q] = kids[q] || []).push(id); } }
    let row = 0; const rowOf = {};
    const place = id => { const k = (kids[id] || []).sort((a, b) => bst(a) - bst(b)); if (!k.length) { rowOf[id] = row++; return; } k.forEach(place); rowOf[id] = rowOf[k[0]]; };
    for (const id of L.filter(id => !pr[id])) { place(id); row += .3; }
    return TC[t] = { L, tiers, par: pr, rowOf, rows: row };
  }
  let TY = null; const types = () => TY || (TY = [...new Set(POKEDEX.map(p => p.types[0]))].sort((a, b) => Object.keys(TYPE_HEX).indexOf(a) - Object.keys(TYPE_HEX).indexOf(b))); // lazy: TYPE_HEX lives in game.js, which loads after this file
  // owned / avail / avail poor / locked. Legendaries (tier V) have no parent: they open once LEGMIN fighters are unlocked.
  function status(id, T) {
    if (owns(id)) return 'owned';
    if (tier(id) === 5 && count() < LEGMIN) return 'locked';
    const q = T.par[id]; if (!q || owns(q)) return S.p >= COST[tier(id)] ? 'avail' : 'avail poor';
    return 'locked';
  }
  function cheapest() { // the nearest goal: the cheapest fighter that can be unlocked right now
    let best = 0, bc = 1e9; for (const t of types()) { const T = build(t); for (const id of T.L) { if (status(id, T).startsWith('avail')) { const c = COST[tier(id)]; if (c < bc) { bc = c; best = id; } } } }
    return best ? { id: best, cost: bc } : null;
  }
  const fmt = n => n >= 1e7 ? Math.floor(n / 1e6) + 'M' : n >= 1e4 ? Math.floor(n / 1e3) + 'K' : String(n);
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  // ---- points for a finished offline fight (the caller skips practice, the lab, watching and online)
  function award(o) {
    S.b++; S.streak = o.win ? S.streak + 1 : 0;
    const key = o.you + '-' + o.foe; if (S.m === key) S.rc++; else { S.m = key; S.rc = 0; }
    const parts = []; let sub = o.win ? 100 : 40, mult = 1;
    if (o.t < 8) { save(); return { pts: 0, parts: ['TOO SHORT TO COUNT'], goal: goal() }; }
    parts.push((o.win ? 'WIN ' : 'LOSS ') + sub);
    if (o.win) {
      const st = Math.min(50, (S.streak - 1) * 10); if (st) { sub += st; parts.push('STREAK +' + st); }
      if (o.taken < 1) { sub += 25; parts.push('FLAWLESS +25'); }
      if (o.t / Math.max(1, o.rounds) <= 20) { sub += 15; parts.push('QUICK KO +15'); }
    }
    const dm = DIFFM[o.diff] || 1; if (dm !== 1) { mult *= dm; parts.push(o.diff.toUpperCase() + ' \u00d7' + dm); }
    if (o.bo > 1) { mult *= 1.25; parts.push('BEST OF ' + o.bo + ' \u00d71.25'); }
    const rf = Math.max(.4, 1 - .2 * S.rc); if (rf < 1) { mult *= rf; parts.push('SAME MATCHUP \u00d7' + rf.toFixed(1)); }
    if (o.win && S.d !== today()) { S.d = today(); mult *= 2; parts.push('FIRST WIN TODAY \u00d72'); }
    const pts = Math.round(sub * mult); S.p += pts; save(); paint();
    return { pts, parts, goal: goal() };
  }
  function goal() { const c = cheapest(); return c ? { name: nm(dx(c.id).name), cost: c.cost, have: S.p } : null; }
  function add(n) { S.p += Math.max(0, n | 0); save(); paint(); }
  // ---- buying
  function buy(id) {
    const c = COST[tier(id)]; if (owns(id) || S.p < c || status(id, build(prim(id))) !== 'avail') return;
    S.p -= c; S.own[id] = 1;
    let msg = 'UNLOCKED ' + nm(dx(id).name).toUpperCase(); const T = build(prim(id)), same = T.L.filter(x => tier(x) === tier(id));
    if (same.every(x => S.own[x])) { const b = Math.round(c / 2); S.p += b; msg += '  \u00b7  TIER ' + ROM[tier(id)] + ' CLEARED +' + b; }
    save(); paint(); toast(msg, ''); render();
  }
  function toast(t, cl) { const e = $$('rsToast'); e.textContent = t; e.className = 'show ' + cl; clearTimeout(toastT); toastT = setTimeout(() => { e.className = cl; }, 2200); }
  // ---- moves: the first FREE_MOVES of a Pokémon's list are free, the rest are bought; the price follows the move's stamina cost (its strength)
  const FREE_MOVES = 4; let midx = null;
  const moveId = name => { if (!midx) { midx = {}; MOVE_IDS.forEach((n, i) => { midx[n] = i; }); } return midx[name]; };
  const hasMove = (pid, name) => { if (S.ua) return true; const id = moveId(name); return id === undefined || (S.mv[pid] || []).includes(id); };
  const moveCost = sta => Math.round((20 + 3.2 * (sta - 20)) / 5) * 5, movePower = sta => sta < 35 ? 1 : sta < 50 ? 2 : sta < 65 ? 3 : sta < 80 ? 4 : 5;
  function buyMove(pid, name, sta) {
    const id = moveId(name), c = moveCost(sta); if (id === undefined || hasMove(pid, name) || S.p < c) return false;
    S.p -= c; (S.mv[pid] = S.mv[pid] || []).push(id); save(); paint(); return true;
  }
  // ---- the research screen
  const CELL = { cw: CWID, rh: RH };
  function render() {
    $$('rsPts').textContent = S.p.toLocaleString(); $$('rsOwn').textContent = S.ua ? N : count();
    $$('rsUa').classList.toggle('on', !!S.ua); const so = $$('optUA'); if (so) so.classList.toggle('on', !!S.ua);
    const tabs = $$('rsTabs'); tabs.innerHTML = types().map(t => { const T = build(t), o = T.L.filter(owns).length; return `<div class="rsTab${t === type ? ' sel' : ''}" data-t="${t}" style="--c:${hex(t)}"><b>${t}</b><span>${o}/${T.L.length}</span></div>`; }).join('');
    const T = build(type), H = Math.max(420, T.rows * RH + PADY * 2), Wd = T.tiers.length * CWID + PADX * 2, cx = ti => PADX + T.tiers.indexOf(ti) * CWID;
    const tree = $$('rsTree'); tree.style.width = Wd + 'px'; tree.style.height = H + 'px';
    const cols = $$('rsCols'); cols.style.width = Wd + 'px'; cols.innerHTML = T.tiers.map(ti => `<div style="left:${cx(ti)}px">TIER ${ROM[ti]}<i>${COST[ti]}</i></div>`).join('');
    const pos = {}; for (const id of T.L) pos[id] = { x: cx(tier(id)), y: PADY + T.rowOf[id] * RH };
    let svg = ''; for (const id in T.par) {
      const a = pos[T.par[id]], b = pos[id], on = owns(T.par[id]), x1 = a.x + NW, y1 = a.y + NH / 2, x2 = b.x, y2 = b.y + NH / 2, xm = x2 - 18;
      svg += `<path d="${y1 === y2 ? `M${x1} ${y1}H${x2}` : `M${x1} ${y1}H${xm}V${y2}H${x2}`}" fill="none" stroke="${on ? hex(type) : '#3a4684'}" stroke-width="${on ? 3 : 2}" stroke-linejoin="round"${on ? '' : ' stroke-dasharray="6 5"'}/>`;
    }
    const nodes = T.L.map(id => {
      const st = status(id, T), p = dx(id), c = COST[tier(id)];
      return `<div class="rsNode ${st}${tier(id) === 5 ? ' leg' : ''}${sel === id ? ' sel' : ''}" data-id="${id}" style="--c:${hex(p.types[0])};left:${pos[id].x}px;top:${pos[id].y}px"><img src="${stillUrl(p)}" alt=""><b>${nm(p.name)}</b><i>POWER ${bst(id)}</i><u>${st === 'owned' ? '\u2713 UNLOCKED' : st === 'locked' ? '\ud83d\udd12 ' + c : '<span class="rsCoin sm">P</span>' + c}</u></div>`;
    }).join('');
    tree.innerHTML = `<svg id="rsLinks" width="${Wd}" height="${H}">${svg}</svg>` + nodes;
    panel(T);
  }
  function panel(T) {
    const P = $$('rsPanel'), id = sel;
    if (!id || prim(id) !== type) { P.innerHTML = `<div class="rsNote" style="margin-top:8px"><b style="color:#fff;font-size:14px">${type.toUpperCase()} TREE</b><br><br>Tap a Pok\u00e9mon to see its power and what it takes to unlock it.<br><br>Gold-framed fighters can be unlocked now. A line joins each fighter to the one that opens it, usually its earlier evolution. Fighters on the left edge are open from the start.<br><br>Every offline battle earns points, even a loss.</div>`; return; }
    const p = dx(id), st = status(id, T), c = COST[tier(id)], mx = { hp: 255, atk: 190, spa: 194, spe: 160 };
    const bar = (l, k, col) => `<div class="rsStat"><span>${l}</span><i><b style="width:${Math.min(100, p[k] / mx[k] * 100)}%;background:${col}"></b></i><em>${p[k]}</em></div>`, q = T.par[id] ? nm(dx(T.par[id]).name) : '';
    let btn;
    if (st === 'owned') btn = '<div id="rsBtn" class="own">\u2713 UNLOCKED</div>'; else if (st === 'locked') btn = '<div id="rsBtn" class="lock">\ud83d\udd12 LOCKED</div>';
    else if (st === 'avail poor') btn = `<div id="rsBtn" class="poor">NEED ${c - S.p} MORE POINTS</div>`; else btn = `<div id="rsBtn" class="go" data-id="${id}">UNLOCK \u00b7 ${c} POINTS</div>`;
    P.style.setProperty('--c', hex(p.types[0]));
    P.innerHTML = `<div class="rsBig"><img src="${stillUrl(p)}" alt=""></div><h2>${nm(p.name)}${tier(id) === 5 ? ' <span style="color:#ffd34d">\u2605</span>' : ''}</h2><div>${p.types.map(t => `<span class="rsTag" style="background:${hex(t)}">${t}</span>`).join('')}<span class="rsTag" style="background:#2d3978">TIER ${ROM[tier(id)]}</span></div>`
      + bar('HP', 'hp', '#ff6a6a') + bar('ATK', 'atk', '#ffb347') + bar('SPA', 'spa', '#7ad8ff') + bar('SPE', 'spe', '#8aff8a')
      + `<div class="rsStat"><span>POWER</span><i><b style="width:${bst(id) / 6.8}%;background:#ffd34d"></b></i><em>${bst(id)}</em></div>`
      + `<div class="rsNote">${st === 'locked' ? (tier(id) === 5 ? `Legendary: opens once you own <b style="color:#fff">${LEGMIN}</b> Pok\u00e9mon in total (you have ${count()}).` : `Opens after you unlock <b style="color:#fff">${q}</b>.`) : st === 'owned' ? 'Ready for battle.' : q ? `Linked from <b style="color:#fff">${q}</b>.` : 'Open from the start of this tree.'}</div>` + btn;
  }
  function open() {
    audio(); type = prim(owns(selYou) ? selYou : firstOwned() || selYou); sel = 0;
    showScreen('treePane'); render(); $$('rsTreeWrap').scrollTo(0, 0);
  }
  // ---- first launch: pick 1 to 3 starters
  function starters() {
    picks = new Set(); const o = $$('starOffer');
    o.innerHTML = OFFER.map(id => { const p = dx(id); return `<div class="rsOc" data-id="${id}" style="--c:${hex(p.types[0])}"><img src="${stillUrl(p)}" alt=""><b>${nm(p.name)}</b><small>POWER ${bst(id)}</small><span class="tg">${p.types[0]}</span></div>`; }).join('');
    const g = $$('starGo'); g.className = 'off'; g.textContent = 'PICK 1 TO 3'; $$('starPane').classList.add('on');
  }
  function backupMsg(t, ok) { const m = $$('pgMsg'); m.textContent = t; m.style.color = ok ? '#7dff9a' : '#ff8a8a'; }
  function paint() {
    const a = $$('tPts'); if (a) a.textContent = fmt(S.p); const b = $$('tResSub'); if (b) b.textContent = (S.ua ? N : count()) + '/' + N;
    const so = $$('optUA'); if (so) so.classList.toggle('on', !!S.ua); const mp = $$('mpPts'); if (mp) mp.textContent = S.p.toLocaleString();
  }
  function setUA(v) { S.ua = v ? 1 : 0; save(); paint(); if ($$('treePane').classList.contains('on')) render(); if (typeof refreshMenu === 'function') refreshMenu(); }
  function init() {
    $$('rsTabs').onclick = e => { const t = e.target.closest('.rsTab'); if (!t) return; type = t.dataset.t; sel = 0; render(); $$('rsTreeWrap').scrollTo(0, 0); };
    $$('rsTree').onclick = e => { const n = e.target.closest('.rsNode'); if (!n) return; sel = +n.dataset.id; render(); };
    $$('rsPanel').onclick = e => { const b = e.target.closest('#rsBtn.go'); if (b) buy(+b.dataset.id); };
    $$('rsBack').onclick = () => { audio(); showScreen('title'); };
    $$('rsUa').onclick = () => setUA(!S.ua); $$('optUA').onclick = () => setUA(!S.ua);
    $$('tRes').onclick = open; $$('tPtsB').onclick = open;
    $$('starOffer').onclick = e => {
      const c = e.target.closest('.rsOc'); if (!c) return; const id = +c.dataset.id;
      if (picks.has(id)) picks.delete(id); else if (picks.size < 3) picks.add(id);
      c.classList.toggle('on', picks.has(id)); const g = $$('starGo'); g.className = picks.size ? '' : 'off'; g.textContent = picks.size ? 'START WITH ' + picks.size : 'PICK 1 TO 3';
    };
    $$('starGo').onclick = () => {
      if (!picks.size) return; for (const id of picks) S.own[id] = 1; S.st = 1; save(); $$('starPane').classList.remove('on'); selYou = [...picks][0]; paint(); refreshMenu();
      setTimeout(() => { try { if (!localStorage.getItem('pf_howto') && screenName === 'title') { localStorage.setItem('pf_howto', '1'); $$('htOffer').classList.add('on'); } } catch (e) { } }, 500);
    };
    // backup: the whole save as one short code
    $$('pgMake').onclick = () => { $$('pgCode').value = 'PF1:' + btoa(enc()); backupMsg('Code created. Copy it and keep it somewhere safe.', true); };
    $$('pgCopy').onclick = () => {
      const t = $$('pgCode'); if (!t.value) $$('pgMake').onclick(); t.focus(); t.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e) { }
      if (!ok && navigator.clipboard) navigator.clipboard.writeText(t.value).then(() => backupMsg('Copied.', true), () => backupMsg('Select the code and copy it by hand.', false)); else backupMsg(ok ? 'Copied.' : 'Select the code and copy it by hand.', ok);
    };
    $$('pgImp').onclick = () => {
      try { const t = $$('pgTxt').value.trim().replace(/^PF1:/, ''); if (!t) throw 0; const n = dec(atob(t)); S = n; S.st = 1; save(); paint(); if (!owns(selYou)) selYou = firstOwned() || selYou; refreshMenu(); backupMsg(`Restored: ${count()} Pok\u00e9mon, ${S.p} points.`, true); $$('pgTxt').value = ''; }
      catch (e) { backupMsg('That code is not valid. Nothing was changed.', false); }
    };
    let rt = 0; const rb = $$('pgReset');
    rb.onclick = () => {
      if (!rt) { rb.textContent = 'TAP AGAIN: THIS ERASES ALL PROGRESS'; rt = setTimeout(() => { rt = 0; rb.textContent = 'ERASE PROGRESS'; }, 3500); return; }
      clearTimeout(rt); rt = 0; rb.textContent = 'ERASE PROGRESS'; S = fresh(); save(); paint(); $$('pgCode').value = ''; backupMsg('Progress erased.', true); starters();
    };
    paint(); if (!S.st && !demoUrl && !q.has('preview') && !q.has('go') && !q.has('howto')) setTimeout(starters, 0);
  }
  return {
    init, owns, firstOwned, award, add, count, paint, open, setUA, hasMove, buyMove, moveCost, movePower, FREE_MOVES, needStart: () => !S.st, status: id => status(id, build(prim(id))),
    get ua() { return !!S.ua; }, get points() { return S.p; },
    // test helpers
    _get: () => S, _set: v => { S = v; save(); paint(); }, _fresh: fresh,
  };
})();
