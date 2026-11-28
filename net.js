// Online 1v1 over Wi-Fi: PeerJS data channel + deterministic lockstep.
// Both devices run the same simulation at a fixed 60 Hz from the same seed and exchange only the controls, so effects and sound come for free.
// The host plays the left fighter (P), the guest the right one (E).
(() => {
  const TICK = 1 / 60, INIT_D = 4, MAX_D = 16, HASH_EVERY = 20, HELD = 63; // HELD: the first six input bits are held keys (the rest are one-shot presses)
  const NET_VER = '0.11.3'; // bump on every release: friends must run exactly the same game code to stay in sync
  const KEYS = ['l', 'r', 'guard', 'down', 'upHold', 'charge', 'up', 'dash', 'laneBack', 'laneFront', 'melee', 'ranged', 'special', 'special2', 'special3', 'beam', 'grab', 'tap'];
  const enc = i => { let m = 0; for (let k = 0; k < KEYS.length; k++) if (i[KEYS[k]]) m |= 1 << k; return m; };
  const dec = m => { const o = {}; for (let k = 0; k < KEYS.length; k++) if (m & (1 << k)) o[KEYS[k]] = true; return o; };

  // ---- seeded random numbers: only the simulation uses them, drawing keeps the real Math.random
  const nativeRnd = Math.random.bind(Math);
  let simR = null, rs = 1;
  const mulberry = () => { rs = (rs + 0x6D2B79F5) | 0; let t = Math.imul(rs ^ (rs >>> 15), 1 | rs); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const site = () => { // where in the code a random number was asked for (diagnostics only: __net.trace = true)
    const s = (new Error().stack || '').split('\n').slice(3, 6).map(l => { const m = l.match(/at (?:async )?([\w$.<>]+) \(.*?([\w.]+\.js:\d+):\d+\)/) || l.match(/at .*?([\w.]+\.js:\d+):\d+/); return m ? (m.length > 2 ? m[1] + '@' + m[2] : m[1]) : '?'; });
    return s.join('<');
  };
  Math.random = () => { if (!simR) return nativeRnd(); const v = simR(); const n = window.__net; if (n) { if (n.trace) n.calls.push(site()); else n.nCalls++; } return v; };

  const N = { role: '', peer: null, conn: null, code: '', linked: false, go: false, tick: 0, simT: 0, acc: 0, loc: {}, rem: {}, readyL: false, readyR: false, cfg: null, rmL: false, rmR: false, rival: null, stall: 0, hl: {}, hr: {}, desync: 0, saved: null, D: INIT_D, wantD: INIT_D, hitch: 0, stallEv: [], rtts: [], dbg: new URLSearchParams(location.search).has('netdbg') };
  window.__net = N;
  const ALPHA = 'ACDEFGHJKLMNPQRSTUVWXYZ';
  const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }]; // Wi-Fi only: no relay server
  const send = m => { try { if (N.conn && N.conn.open) N.conn.send(m); } catch (e) { } };
  const cleanName = s => String(s || '').replace(/[^A-Za-z0-9 _\-]/g, '').trim().slice(0, 12).toUpperCase();
  const myName = () => cleanName($('nName').value) || 'PLAYER';
  try { $('nName').value = cleanName(localStorage.getItem('pf_name')); } catch (e) { }

  // fingerprint of every script this build runs (the game code and its data): the same version number with different files would still drift apart
  N.hash = ''; N.info = null;
  const hashReady = new Promise(res => {
    const srcs = [...document.scripts].map(s => s.getAttribute('src')).filter(s => s && !/peerjs/.test(s)); let left = srcs.length, h = 2166136261;
    if (!left) { res(); return; }
    const texts = new Array(srcs.length), done = () => { if (--left) return; for (const t of texts) for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619); N.hash = (h >>> 0).toString(16).padStart(8, '0'); res(); };
    srcs.forEach((u, i) => { const x = new XMLHttpRequest(); x.open('GET', u); x.onload = () => { texts[i] = x.responseText || ''; done(); }; x.onerror = () => { texts[i] = ''; N.hashBad = true; done(); }; x.send(); });
  }).then(() => { if (N.hashBad) N.hash = ''; $('tVer').textContent = 'ONLINE v' + NET_VER + (N.hash ? ' \u00b7 ' + N.hash.slice(0, 6) : ''); if (N.linked) refresh(); });
  $('tVer').textContent = 'ONLINE v' + NET_VER;
  const verOk = () => !!N.info && N.info.ver === NET_VER && (!N.info.hash || !N.hash || N.info.hash === N.hash);

  NETG.rngOn = seed => { if (seed === undefined || seed === null) return; rs = seed >>> 0; simR = mulberry; DetMath.on(); hvLast.P = hvLast.E = -1; lkLast.P = lkLast.E = -1; };
  NETG.rngOff = () => { simR = null; DetMath.off(); };

  // ---- lobby
  const steps = ['nStep0', 'nStepHost', 'nStepJoin', 'nStepLobby'];
  function step(n) { for (const s of steps) $(s).style.display = s === n ? '' : 'none'; $('netPane').classList.toggle('lob', n === 'nStepLobby'); }
  function stat(t, bad) { const e = $('nStat'); e.textContent = t || ''; e.classList.toggle('bad', !!bad); }
  function toast(t) { const e = $('nToast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 3500); }
  function specIdx(id) {
    const p = dexById(id), kit = buildKit(p), pool = kit.pool, pick = loadouts[id];
    return pick && pick.length === Math.min(3, pool.length) && pick.every(i => pool[i]) ? pick.slice() : defaultSpecIndices(kit);
  }
  const sendPick = () => { const m = { t: 'pick', pk: selYou, spec: specIdx(selYou) }, k = JSON.stringify(m); if (k === N.lastPick) return; N.lastPick = k; send(m); }; // refresh() runs on every received message, so repeating a send here would bounce between the phones forever
  function card(id, p, who, name, spec) {
    $(id).innerHTML = p ? `<div class="nwho"></div><img src="${stillUrl(p)}" onerror="this.onerror=null;this.src='${spriteUrl(p)}'" alt=""><div class="nnm">${nm(p.name)}</div><div class="tags">${tags(p.types)}</div><div class="nmv"></div>` : `<div class="nwho"></div><div class="nwait">choosing...</div>`;
    $(id).firstChild.textContent = who + (name ? ' \u00b7 ' + name : '');
    if (p) { const pool = buildKit(p).pool; $(id).querySelector('.nmv').textContent = (spec || []).map(i => pool[i] ? pool[i].name : '').filter(Boolean).join(' \u00b7 '); }
  }
  function refresh() {
    if (!N.linked) return;
    const mine = dexById(selYou), rival = N.rival ? dexById(N.rival.pk) : null, host = N.role === 'host', ok = verOk();
    const thN = THEMES[host || !N.lobCfg ? themeIdx : N.lobCfg.theme] || THEMES[0], bestN = host || !N.lobCfg ? bestOf : N.lobCfg.best;
    card('nMe', mine, 'YOU', myName(), specIdx(selYou)); card('nFr', rival, 'FRIEND', N.info && cleanName(N.info.name), N.rival && N.rival.spec);
    sendPick();
    $('nArenaName').textContent = thN.name || thN.id; $('nArenaPrev').style.backgroundImage = `url(${arThumb(thN)})`;
    $('nArenaPrev').classList.toggle('ro', !host); VAR.lobbyWx(host, N.lobCfg); $('nRounds').classList.toggle('ro', !host);
    for (const b of document.querySelectorAll('#nRounds .chip')) b.classList.toggle('sel', +b.dataset.r === bestN);
    if (host) { const lk = themeIdx + ':' + bestOf + ':' + VAR.wxSel() + ':' + VAR.evOn() + ':' + VAR.hzOn(); if (lk !== N.lastLcfg) { N.lastLcfg = lk; send({ t: 'lcfg', theme: themeIdx, best: bestOf, wx: VAR.wxSel(), ev: VAR.evOn() ? 1 : 0, hz: VAR.hzOn() ? 1 : 0 }); } } // the guest sees the host's arena and rounds read-only
    for (const e of document.querySelectorAll('.nhost')) e.style.display = host ? '' : 'none';
    for (const e of document.querySelectorAll('.nguest')) e.style.display = host ? 'none' : '';
    $('nGo').disabled = !rival || !ok;
    const mv = 'v' + NET_VER + (N.hash ? ' (' + N.hash.slice(0, 6) + ')' : ''), fv = N.info ? 'v' + N.info.ver + (N.info.hash ? ' (' + N.info.hash.slice(0, 6) + ')' : '') : '...';
    $('nVer').textContent = 'Your version ' + mv + ' \u00b7 friend ' + fv; $('nVer').classList.toggle('bad', !!N.info && !ok);
    if (N.info && !ok) { stat('Different game versions. Update the game (main menu > CHECK FOR UPDATES) so you both have the same version.', true); return; }
    if (!N.info && N.noHello) { $('nGo').disabled = true; stat('Your friend\'s game is too old to compare versions. Both of you need the latest version.', true); return; }
    stat(rival ? (host ? 'Friend connected. Press FIGHT when you are both ready.' : 'Connected. Waiting for the host to start.') : 'Friend connected. Waiting for their pick...');
  }
  NETG.refresh = refresh;
  NETG.open = () => { NETG.lobby = true; closeNet(); N.rival = null; N.lobCfg = null; step('nStep0'); stat(''); showScreen('netPane'); NETG.lobby = true; };

  function newPeer(id) {
    if (N.peer) try { N.peer.destroy(); } catch (e) { }
    return N.peer = new Peer(id, { debug: 1, config: { iceServers: ICE } });
  }
  const errText = e => e.type === 'peer-unavailable' ? 'No room with that code. Check the code and that the host is waiting.' : e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error' ? 'Cannot reach the connection server. Check your Wi-Fi.' : 'Connection error: ' + e.type;
  function hostRoom(tries = 0) {
    N.role = 'host'; const code = Array.from({ length: 4 }, () => ALPHA[Math.floor(nativeRnd() * ALPHA.length)]).join('');
    step('nStepHost'); $('nCode').textContent = '....'; stat('Opening a room...');
    const p = newPeer('pfz-' + code);
    p.on('open', () => { N.code = code; $('nCode').textContent = code; stat('Tell your friend this code, then wait here.'); });
    p.on('connection', c => { if (N.conn) { c.close(); return; } bind(c); });
    p.on('error', e => { if (e.type === 'unavailable-id' && tries < 5) { hostRoom(tries + 1); return; } stat(errText(e), true); });
  }
  function joinRoom(code) {
    code = String(code || '').toUpperCase().replace(/[^A-Z]/g, ''); if (code.length !== 4) { stat('Type the 4 letter code.', true); return; }
    N.role = 'guest'; stat('Connecting to ' + code + '...'); const p = newPeer();
    p.on('open', () => {
      const c = p.connect('pfz-' + code, { reliable: true }); bind(c);
      setTimeout(() => { if (N.conn === c && !N.linked) stat('Still connecting. Both of you need Wi-Fi (not mobile data). Check the code.', true); }, 15000);
    });
    p.on('error', e => stat(errText(e), true));
  }
  function bind(c) {
    N.conn = c;
    c.on('open', () => { N.linked = true; N.rival = null; N.info = null; N.noHello = false; N.lastPick = N.lastLcfg = ''; step('nStepLobby'); refresh(); hashReady.then(() => send({ t: 'hello', ver: NET_VER, hash: N.hash, name: myName() }));
      setTimeout(() => { if (N.conn === c && N.linked && !N.info) { N.noHello = true; if (NETG.lobby) refresh(); } }, 5000); }); // a game older than the version check never answers
    c.on('data', onData);
    c.on('close', () => { if (N.conn === c) onGone(); });
    c.on('error', () => { if (N.conn === c) onGone(); });
  }
  function closeNet() {
    N.linked = false; N.info = null; N.rtts = []; const c = N.conn, p = N.peer; N.conn = null; N.peer = null;
    try { if (c) c.close(); } catch (e) { } try { if (p) p.destroy(); } catch (e) { }
  }
  function onGone() {
    if (NETG.on) { leave('Your friend disconnected.'); return; }
    N.conn = null; N.linked = false; N.rival = null;
    if (N.role === 'host' && N.peer && !N.peer.destroyed) { step('nStepHost'); stat('Your friend left. Waiting for someone to join.'); } else { step('nStep0'); stat('The host closed the room.', true); }
  }
  function leave(note) {
    send({ t: 'bye' }); closeNet();
    if (NETG.on) { // put back the settings the match borrowed from the host
      NETG.on = false; NETG.role = ''; document.body.classList.remove('online');
      if (N.saved) { spriteStyle = N.saved.sprite; bestOf = N.saved.best; lowQ = N.saved.low; setGM(N.saved.gm); bgDirty = true; themeIdx = N.saved.theme; setTheme(THEMES[themeIdx]); N.saved = null; }
    }
    NETG.lobby = false; N.go = false; N.role = ''; N.rival = null; $('pause').classList.remove('on'); $('msg').classList.remove('on');
    showScreen('title'); if (note) toast(note);
  }
  NETG.leave = () => leave();

  // ---- messages
  function onData(d) {
    if (!d || !d.t) return;
    if (d.t === 'i') N.rem[d.k] = d.m;
    else if (d.t === 'p') send({ t: 'q', s: d.s });
    else if (d.t === 'q') { N.rtts.push(performance.now() - d.s); if (N.rtts.length > 8) N.rtts.shift(); updateNet(); }
    else if (d.t === 'hello') { N.noHello = false; N.info = { ver: String(d.ver), hash: String(d.hash || ''), name: cleanName(d.name) || 'FRIEND' }; if (NETG.lobby) refresh(); }
    else if (d.t === 'lcfg') { N.lobCfg = { theme: +d.theme, best: +d.best, wx: d.wx || 'auto', ev: d.ev === 0 ? 0 : 1, hz: d.hz === 0 ? 0 : 1 }; if (NETG.lobby) refresh(); }
    else if (d.t === 'pick') { N.rival = { pk: d.pk, spec: d.spec }; if (NETG.lobby) refresh(); }
    else if (d.t === 'start') { if (N.role === 'guest') begin(d.cfg); }
    else if (d.t === 'rdy') { N.readyR = true; N.fpR = d.fp || null; checkGo(); }
    else if (d.t === 'h') { N.hr[d.k] = d.h; cmp(d.k); }
    else if (d.t === 'ring') { N.peerRing = d; compareRings(); }
    else if (d.t === 'rm') { N.rmR = true; checkRematch(); }
    else if (d.t === 'bye') onGone();
  }
  function fight() {
    if (N.role !== 'host' || !N.rival || !verOk()) return;
    const cfg = { seed: (nativeRnd() * 4294967296) >>> 0, pa: selYou, pb: N.rival.pk, spP: specIdx(selYou), spE: N.rival.spec, bestOf, theme: themeIdx, wx: VAR.wxSel(), ev: VAR.evOn() ? 1 : 0, hz: VAR.hzOn() ? 1 : 0, sprite: spriteStyle, gm: [GM.dmg, GM.sta, GM.ki], names: [myName(), N.info.name] };
    send({ t: 'start', cfg }); begin(cfg);
  }
  function begin(cfg) {
    if (!N.saved) N.saved = { sprite: spriteStyle, best: bestOf, low: lowQ, theme: themeIdx, gm: [GM.dmg, GM.sta, GM.ki] };
    Object.assign(N, { cfg, spvReady: undefined, spvMine: undefined, go: false, readyL: false, readyR: false, rmL: false, rmR: false, tick: 0, simT: 0, acc: 0, loc: {}, rem: {}, hl: {}, hr: {}, stall: 0, D: INIT_D, wantD: INIT_D, hitch: 0, stallEv: [], lastStall: 0, fpL: null, fpR: null, lastDiff: null, desyncAt: 0, desync: 0, ring: {}, calls: [], nCalls: 0, peerRing: null, diag: null, ringSent: false });
    setGM(cfg.gm);
    for (let t = 0; t < INIT_D; t++) { N.loc[t] = 0; N.rem[t] = 0; }
    NETG.on = true; NETG.role = N.role; NETG.lobby = false; NETG.inP = {}; NETG.inE = {}; NETG.names = (cfg.names || ['', '']).map(cleanName);
    $('plA').textContent = NETG.names[0]; $('plB').textContent = NETG.names[1];
    document.body.classList.add('online'); $('pause').classList.remove('on'); $('againBtn').textContent = 'REMATCH';
    startMatch({ online: cfg });
  }
  // everything that changes how a fight plays out must be identical on both devices, so the host's gameplay multipliers win
  function setGM(g) { if (g && g.length === 3) { GM.dmg = +g[0]; GM.sta = +g[1]; GM.ki = +g[2]; } }
  function envFp() { // a short description of this device's setup; if two devices disagree the fight cannot stay in sync
    const sp = f => f.specs.map(s => s.name).join(',');
    return { gm: [GM.dmg, GM.sta, GM.ki].join(','), low: lowQ, life: LIFE, anim: ANIM2D, sprite: spriteStyle, size: [P.w, P.h, E.w, E.h].map(v => Math.round(v * 10)).join(','), hp: Math.round(P.maxhp) + ',' + Math.round(E.maxhp), moves: sp(P) + '|' + sp(E), abil: P.ability.name + ',' + E.ability.name, bo: bestOf };
  }
  NETG.ready = () => { // this device has loaded the fighters; wait (briefly) for the effect sprites too so both devices start the same way
    const t0 = performance.now(), go = () => { N.spvMine = NETG.spvNow ? !!NETG.spvNow() : false; N.readyL = true; N.fpL = { ...envFp(), spv: N.spvMine }; send({ t: 'rdy', fp: N.fpL }); checkGo(); };
    const wait = () => { if (!NETG.on) return; if (NETG.spvNow && !NETG.spvNow() && performance.now() - t0 < 4000) setTimeout(wait, 100); else go(); };
    wait();
  };
  function checkGo() {
    if (!(NETG.on && N.readyL && N.readyR && !N.go)) return;
    const bad = N.fpR ? Object.keys(N.fpL).filter(k => k !== 'spv' && String(N.fpL[k]) !== String(N.fpR[k])) : [];
    N.spvReady = !!(N.fpL.spv && N.fpR && N.fpR.spv); // the shot-effect sprites count as loaded only if they are on both devices, so both pick shot variants from the same list
    if (bad.length) { N.envBad = bad; toast('Your games are set up differently (' + bad.join(', ') + '). The fight may drift apart.'); if (N.dbg) console.log('ENV DIFF', bad, N.fpL, N.fpR); }
    N.go = true; N.acc = 0;
  }
  NETG.rematch = () => { N.rmL = true; send({ t: 'rm' }); $('againBtn').textContent = 'WAITING FOR FRIEND...'; checkRematch(); };
  function checkRematch() {
    if (N.role !== 'host' || !N.rmL || !N.rmR) return;
    const cfg = { ...N.cfg, seed: (nativeRnd() * 4294967296) >>> 0 }; send({ t: 'start', cfg }); begin(cfg);
  }

  // ---- lockstep
  const PARTS = ['position', 'health', 'stamina', 'attacks', 'random numbers'];
  function hashState() { // one short hash per area, so a drift can be traced to where it began
    const hs = [2166136261, 2166136261, 2166136261, 2166136261], add = (i, v) => { hs[i] = Math.imul(hs[i] ^ (Math.round(v * 100) | 0), 16777619); };
    for (const f of [P, E]) { add(0, f.x); add(0, f.z); add(0, f.lp); add(0, f.lift); add(0, f.vx); add(0, f.face); add(1, f.hp); add(1, f.hitT * 1000); add(2, f.sta); add(2, f.ki); add(3, f.cool.ranged + f.cool.s0 + f.cool.s1 + f.cool.s2 + f.cool.beam + f.dashCool); add(3, f.act ? 1 : 0); }
    add(1, matchTime); add(3, projectiles.length + beams.length * 7);
    return [...hs, rs].map(x => (x >>> 0).toString(36)).join('/');
  }
  const EXACT = ['x', 'z', 'lp', 'lift', 'vx', 'vz', 'kvx', 'hp', 'sta', 'ki', 'hitT', 'skT', 'toss', 'tossV', 'hv', 'inv', 'face', 'cbN', 'idleT', 'laneCool', 'dashCool'];
  const exact = () => { const o = []; for (const f of [P, E]) for (const k of EXACT) o.push(+f[k] || 0); o.push(matchTime, freeze, slowT, introT, overT, N.cin ? N.cin[0] : 0, N.cin ? N.cin[1] : 0); return o; }; // exact values: any difference is where the fights split (the last two are the inputs each side played)
  function compareRings() { // the first tick whose random-number state or fighter state differs tells where the fights split
    const p = N.peerRing; if (!p || !N.ringSent || N.diag) return;
    for (let i = 0; i < p.d.length; i++) {
      const t = p.from + i, a = N.ring[t], b = p.d[i]; if (!a || !b) continue;
      if (a[0] !== b[0] || a[2] !== b[2] || (a[3] && b[3] && a[3].some((v, j) => v !== b[3][j]))) { const jx = a[3] && b[3] ? a[3].findIndex((v, j) => v !== b[3][j]) : -1, names = [...EXACT.map(k => 'P.' + k), ...EXACT.map(k => 'E.' + k), 'matchTime', 'freeze', 'slowT', 'introT', 'overT', 'inP', 'inE']; N.diag = { tick: t, diffs: a[3] && b[3] ? names.map((n, j) => a[3][j] !== b[3][j] ? n + ':' + a[3][j] + '/' + b[3][j] : '').filter(Boolean) : null, kind: jx >= 0 ? 'value ' + names[jx] : 'random numbers', exactMine: jx >= 0 ? a[3][jx] : null, exactTheirs: jx >= 0 ? b[3][jx] : null, mine: [a[0], typeof a[1] === 'number' ? a[1] : a[1].length, a[2]], theirs: [b[0], typeof b[1] === 'number' ? b[1] : b[1].length, b[2]], prevCalls: [N.ring[t - 1] && N.ring[t - 1][1], p.d[i - 1] && p.d[i - 1][1]], state: state }; if (typeof a[1] === 'string' && typeof b[1] === 'string') { const ma = a[1].split('|'), tb = b[1].split('|'); let q = 0; while (q < ma.length && q < tb.length && ma[q] === tb[q]) q++; N.diag.callsAt = { count: [ma.length, tb.length], firstDiff: q, mine: ma.slice(Math.max(0, q - 3), q + 3), theirs: tb.slice(Math.max(0, q - 3), q + 3) }; N.diag.prevCalls = null; } if (N.dbg) console.log('FIRST SPLIT', N.diag); return; }
    }
    N.diag = { tick: -1, kind: 'not within the last 100 ticks' };
  }
  function cmp(k) {
    if (N.hl[k] === undefined || N.hr[k] === undefined) return;
    if (N.hl[k] !== N.hr[k]) {
      const a = N.hl[k].split('/'), b = N.hr[k].split('/'), diff = PARTS.filter((_, i) => a[i] !== b[i]);
      N.desync++; N.desyncAt = performance.now(); N.lastDiff = { tick: k, parts: diff };
      if (!N.ringSent) { N.ringSent = true; const d = []; for (let t = k - 100; t < k; t++) d.push(N.ring[t] || null); send({ t: 'ring', from: k - 100, d }); compareRings(); } // trace where the two devices first disagreed
      if (N.desync === 1) toast('Out of sync (' + diff.join(', ') + '). The two screens may disagree from here.');
      if (N.dbg) console.log('DESYNC at tick', k, diff, 'mine', N.hl[k], 'theirs', N.hr[k]);
    }
    delete N.hl[k]; delete N.hr[k];
  }
  function tick(stepFn) {
    const t = N.tick, host = N.role === 'host';
    setGM(N.cfg.gm); // the settings screen must not change the rules mid-fight
    if (N.D > N.wantD) N.D--; // shrinking the buffer: the input for this slot was already sent, so skip sampling once
    else {
      const m = enc(playerInput());
      if (N.D < N.wantD) { // a longer delay: the ticks in between repeat the held keys so the friend never waits for them
        for (let k = t + N.D; k < t + N.wantD; k++) { N.loc[k] = m & HELD; send({ t: 'i', k, m: m & HELD }); }
        N.D = N.wantD;
      }
      N.loc[t + N.D] = m; send({ t: 'i', k: t + N.D, m });
    }
    NETG.inP = dec(host ? N.loc[t] : N.rem[t]); NETG.inE = dec(host ? N.rem[t] : N.loc[t]); N.cin = [host ? N.loc[t] : N.rem[t], host ? N.rem[t] : N.loc[t]];
    delete N.loc[t]; delete N.rem[t];
    now = N.simT; simR = mulberry; DetMath.on(); // the built-in sin, cos, pow ... differ between CPU types; the fight must not use them
    try { stepFn(TICK); } finally { simR = null; DetMath.off(); }
    N.ring[N.tick] = [rs >>> 0, N.trace ? N.calls.join('|') : N.nCalls, Math.round((P.x + E.x * 3 + P.hp * 5 + E.hp * 7 + P.z * 11 + E.z * 13) * 100), exact()]; N.calls = []; N.nCalls = 0; delete N.ring[N.tick - 400];
    N.tick++; N.simT += TICK;
    if (N.tick % HASH_EVERY === 0) { const h = hashState(); N.hl[N.tick] = h; send({ t: 'h', k: N.tick, h }); cmp(N.tick); }
  }
  NETG.frame = (raw, stepFn) => {
    const rdt = Math.min(Math.max(raw / 1000 || 0, 0), .25);
    if (N.go) {
      N.acc += rdt; let n = 0, stalled = false;
      while (N.acc >= TICK && n < 8) { if (N.rem[N.tick] === undefined) { stalled = true; break; } tick(stepFn); N.acc -= TICK; n++; }
      if (N.acc > TICK * 10) N.acc = TICK * 3; // came back from a hidden tab: do not race to catch up
      const ms = performance.now(), prog = n > 0, waiting = stalled && !prog; // a frame that still ran ticks is not a wait: the faster phone always ends a frame at the edge of its friend's input
      // only waits over 80 ms count, and the first 5 s (loading, VS splash) are ignored: three in ten seconds means the link is jittery, so buffer more input
      if (waiting && N.stall + rdt >= .08 && !N.stallCounted && N.tick > 300) {
        N.stallCounted = true; N.stallEv = N.stallEv.filter(x => ms - x < 10000); N.stallEv.push(ms);
        if (N.stallEv.length >= 3 && N.wantD < MAX_D) { N.wantD = Math.min(MAX_D, N.wantD + 2); N.stallEv = []; }
      }
      if (prog) { if (N.stall > .1) { N.hitch++; (N.hlog = N.hlog || []).push([N.tick, Math.round(N.stall * 1000), state, Math.round(N.rtts.length ? N.rtts[N.rtts.length - 1] : -1)]); if (N.hlog.length > 40) N.hlog.shift(); } N.stallCounted = false; }
      if (waiting && N.stall >= .08) N.lastStall = ms; else if (N.wantD > INIT_D && ms - N.lastStall > 10000) { N.wantD--; N.lastStall = ms - 7000; }
      N.stall = prog ? 0 : waiting ? N.stall + rdt : N.stall; // a frame that is simply not due yet (120 Hz screens) leaves the count alone
      if (N.stall > .7) showMsg('WAITING FOR FRIEND...', 0); else if (N.stall === 0 && $('msg').textContent.startsWith('WAITING')) $('msg').classList.remove('on');
      now = N.simT + Math.min(N.acc, TICK);
    } else now = last / 1000;
    hudDt = Math.min(rdt, .05);
    if (N.dbg) { let e = $('nDbg'); if (!e) { e = document.createElement('div'); e.id = 'nDbg'; $('stage').appendChild(e); } e.textContent = `${N.role} tick ${N.tick} desync ${N.desync} stall ${N.stall.toFixed(1)}`; }
  };

  // ---- connection status: round trip to the friend, waits, and how much input is buffered
  function updateNet() {
    const r = N.rtts, avg = r.length ? r.reduce((a, b) => a + b, 0) / r.length : -1, mx = r.length ? Math.max(...r) : 0;
    const lvl = avg < 0 ? 'wait' : (N.stall > .3 || avg >= 90 || mx >= 200 || N.desyncAt && performance.now() - N.desyncAt < 8000) ? 'bad' : (avg >= 40 || mx >= 100 || N.hitch > 0 && N.go) ? 'mid' : 'ok';
    const txt = avg < 0 ? 'checking...' : Math.round(avg) + ' ms' + (NETG.on ? (N.hitch ? ' \u00b7 ' + N.hitch + ' hitch' + (N.hitch > 1 ? 'es' : '') : '') + (N.D > INIT_D ? ' \u00b7 buffer ' + Math.round(N.D * 1000 / 60) + ' ms' : '') + (N.desync ? ' \u00b7 OUT OF SYNC' + (N.lastDiff ? ' (' + N.lastDiff.parts.join('/') + ')' : '') : '') : (lvl === 'ok' ? ' \u00b7 good link' : lvl === 'mid' ? ' \u00b7 fair link' : ' \u00b7 weak link'));
    for (const id of ['nNet', 'nPing']) { const e = $(id); e.textContent = '\u25cf ' + txt; e.className = 'lv-' + lvl; }
  }
  setInterval(() => { if (N.linked) send({ t: 'p', s: performance.now() }); updateNet(); }, 1000);

  // ---- keep looks out of the shared fight: effect helpers draw from the real random generator, so a spark or puff that one phone shows and the other does not can never shift the fight's random numbers
  for (const n of ['puff', 'spark', 'typeHit', 'landFx', 'rollFx', 'statusFx', 'boom', 'juiceHit', 'hitFx', 'noise', 'jingle']) { // sound synthesis alone asks for tens of thousands of random numbers per fight, and how many depends on mute and the device's audio sample rate
    const f = window[n]; if (typeof f !== 'function') continue;
    window[n] = function () { const s = simR; simR = null; try { return f.apply(this, arguments); } finally { simR = s; } };
  }
  if (typeof SPV !== 'undefined' && SPV) for (const k of Object.keys(SPV)) { // the shot-effects engine: looks only (has, T and ready are answers the fight uses, so they stay as they are)
    const f = SPV[k]; if (typeof f !== 'function' || k === 'has' || k === 'T' || k === 'ready') continue;
    SPV[k] = function () { const s = simR; simR = null; try { return f.apply(this, arguments); } finally { simR = s; } };
  }
  if (typeof SPV !== 'undefined' && SPV && typeof SPV.ready === 'function') { // whether the effect sprites have loaded must not change mid-fight
    const r0 = SPV.ready; SPV.ready = () => NETG.on && N.spvReady !== undefined ? N.spvReady : r0();
    NETG.spvNow = () => r0();
  }

  // ---- wiring
  $('tOnline').onclick = () => { audio(); NETG.open(); };
  $('nHost').onclick = () => { if (!nameOk()) return; saveName(); hostRoom(); };
  $('nJoin').onclick = () => { if (!nameOk()) return; saveName(); N.role = 'guest'; step('nStepJoin'); stat(''); $('nIn').focus(); };
  function nameOk() { const e = $('nName'), n = cleanName(e.value); e.classList.toggle('bad', !n); if (!n) { stat('Enter your name first.', true); e.focus(); } else stat(''); return !!n; }
  function saveName() { const n = cleanName($('nName').value); $('nName').value = n; try { localStorage.setItem('pf_name', n); } catch (e) { } }
  $('nName').onkeydown = e => e.stopPropagation(); $('nName').onkeyup = e => e.stopPropagation(); $('nName').oninput = () => $('nName').classList.remove('bad');
  $('nJoinGo').onclick = () => joinRoom($('nIn').value);
  $('nIn').oninput = e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); };
  $('nIn').onkeydown = e => { if (e.key === 'Enter') joinRoom($('nIn').value); e.stopPropagation(); };
  $('nIn').onkeyup = e => e.stopPropagation();
  $('nBack').onclick = () => leave();
  $('nPick').onclick = () => openPicker('you');
  $('nMoves').onclick = () => openMoves();
  $('nGo').onclick = fight;
  $('nArPrev').onclick = () => { setThemeIdx(themeIdx - 1); refresh(); }; $('nArNext').onclick = () => { setThemeIdx(themeIdx + 1); refresh(); }; { const ws = $('nWxSel'); if (ws) ws.onchange = () => { VAR.setWx(ws.value); refresh(); }; const eb = $('nEvBtn'); if (eb) eb.onclick = () => { VAR.setEv(!VAR.evOn()); refresh(); }; const hb = $('nHzBtn'); if (hb) hb.onclick = () => { VAR.setHz(!VAR.hzOn()); refresh(); }; }
  $('nArenaPrev').onclick = e => { if (N.role !== 'host' || e.target.closest('.arr')) return; arPg = -1; drawArenas(); $('arenaPane').classList.add('on'); }; // the same arena cards as the battle menu
  for (const b of document.querySelectorAll('#nRounds .chip')) b.onclick = () => { setRounds(+b.dataset.r); refresh(); };
  $('nCopy').onclick = () => { const t = N.code; try { navigator.clipboard.writeText(t); toast('Code copied'); } catch (e) { toast('Code: ' + t); } };

  // ---- update check against the GitHub releases of this game (Android app only: the web page is always current)
  const REPO = 'amoldalwai/PokeFightersz';
  const appVer = () => { try { const fv = new URLSearchParams(location.search).get('fakever'); if (fv && window.PF) return fv; // test hook: ?fakever=1.0.0 pretends to be an older app
     return window.PF && typeof PF.appVersion === 'function' ? String(PF.appVersion()) : ''; } catch (e) { return ''; } };
  const vnum = v => String(v).replace(/^v/i, '').split('.').map(x => parseInt(x, 10) || 0);
  const isNewer = (a, b) => { const x = vnum(a), y = vnum(b); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
  function showUpd(title, text, url) {
    $('updT').textContent = title; $('updP').textContent = text; $('updGo').style.display = url ? '' : 'none'; $('updLater').textContent = url ? 'LATER' : 'OK';
    $('updGo').onclick = () => { $('updPane').classList.remove('on'); try { PF.openUrl(url); } catch (e) { window.open(url, '_blank'); } };
    $('updLater').onclick = () => $('updPane').classList.remove('on'); $('updPane').classList.add('on');
  }
  async function checkUpdate(manual) {
    const cur = appVer(); if (!cur) return;
    if (manual) $('tUpd').textContent = 'CHECKING...';
    try {
      const r = await fetch('https://api.github.com/repos/' + REPO + '/releases/latest', { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      const rel = await r.json(), latest = String(rel.tag_name || '').replace(/^v/i, ''), apk = (rel.assets || []).find(a => /\.apk$/i.test(a.name));
      if (latest && isNewer(latest, cur)) { $('tUpd').classList.add('has'); showUpd('UPDATE AVAILABLE', 'Version ' + latest + ' is available (you have ' + cur + '). Online matches need both players on the same version.', apk ? apk.browser_download_url : rel.html_url); }
      else { $('tUpd').classList.remove('has'); if (manual) showUpd('UP TO DATE', 'You have the latest version (' + cur + ').', ''); }
    } catch (e) { if (manual) showUpd('CANNOT CHECK', 'Could not reach GitHub. Check your internet connection and try again.', ''); }
    $('tUpd').textContent = 'CHECK FOR UPDATES';
  }
  $('tUpd').onclick = () => checkUpdate(true);
  const GH = 'https://github.com/' + REPO + '/';
  $('tGit').onclick = () => { try { if (window.PF && typeof PF.openUrl === 'function') PF.openUrl(GH); else window.open(GH, '_blank'); } catch (e) { window.open(GH, '_blank'); } };
  if (!(window.PF && PF.openBalls)) $('tGit').style.right = '98px'; // no Poké Ball button in the browser, so the icon takes its place
  if (appVer()) { $('tUpd').style.display = 'block'; setTimeout(() => checkUpdate(false), 2500); }

  const q = new URLSearchParams(location.search);
  if (q.has('join') || q.has('host')) setTimeout(() => { NETG.open(); if (q.has('host')) hostRoom(); else { N.role = 'guest'; step('nStepJoin'); $('nIn').value = q.get('join').toUpperCase(); joinRoom(q.get('join')); } }, 400);
})();
