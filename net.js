// Online 1v1 over Wi-Fi: PeerJS data channel + deterministic lockstep.
// Both devices run the same simulation at a fixed 60 Hz from the same seed and exchange only the controls, so effects and sound come for free.
// The host plays the left fighter (P), the guest the right one (E).
(() => {
  const TICK = 1 / 60, DELAY = 3, HASH_EVERY = 20;
  const KEYS = ['l', 'r', 'guard', 'down', 'upHold', 'charge', 'up', 'dash', 'laneBack', 'laneFront', 'melee', 'ranged', 'special', 'special2', 'special3', 'beam', 'grab', 'tap'];
  const enc = i => { let m = 0; for (let k = 0; k < KEYS.length; k++) if (i[KEYS[k]]) m |= 1 << k; return m; };
  const dec = m => { const o = {}; for (let k = 0; k < KEYS.length; k++) if (m & (1 << k)) o[KEYS[k]] = true; return o; };

  // ---- seeded random numbers: only the simulation uses them, drawing keeps the real Math.random
  const nativeRnd = Math.random.bind(Math);
  let simR = null, rs = 1;
  const mulberry = () => { rs = (rs + 0x6D2B79F5) | 0; let t = Math.imul(rs ^ (rs >>> 15), 1 | rs); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Math.random = () => simR ? simR() : nativeRnd();

  const N = { role: '', peer: null, conn: null, code: '', linked: false, go: false, tick: 0, simT: 0, acc: 0, loc: {}, rem: {}, readyL: false, readyR: false, cfg: null, rmL: false, rmR: false, rival: null, stall: 0, hl: {}, hr: {}, desync: 0, saved: null, dbg: new URLSearchParams(location.search).has('netdbg') };
  window.__net = N;
  const ALPHA = 'ACDEFGHJKLMNPQRSTUVWXYZ';
  const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }]; // Wi-Fi only: no relay server
  const send = m => { try { if (N.conn && N.conn.open) N.conn.send(m); } catch (e) { } };

  NETG.rngOn = seed => { if (seed === undefined || seed === null) return; rs = seed >>> 0; simR = mulberry; hvLast.P = hvLast.E = -1; lkLast.P = lkLast.E = -1; };
  NETG.rngOff = () => { simR = null; };

  // ---- lobby
  const steps = ['nStep0', 'nStepHost', 'nStepJoin', 'nStepLobby'];
  function step(n) { for (const s of steps) $(s).style.display = s === n ? '' : 'none'; }
  function stat(t, bad) { const e = $('nStat'); e.textContent = t || ''; e.classList.toggle('bad', !!bad); }
  function toast(t) { const e = $('nToast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 3500); }
  function specIdx(id) {
    const p = dexById(id), pool = buildKit(p).pool, pick = loadouts[id];
    return pick && pick.length === Math.min(3, pool.length) && pick.every(i => pool[i]) ? pick.slice() : pool.slice(0, 3).map((_, i) => i);
  }
  const sendPick = () => send({ t: 'pick', pk: selYou, spec: specIdx(selYou) });
  function card(id, p, who) {
    $(id).innerHTML = p ? `<div class="nwho">${who}</div><img src="${stillUrl(p)}" onerror="this.onerror=null;this.src='${spriteUrl(p)}'" alt=""><div class="nnm">${nm(p.name)}</div><div class="tags">${tags(p.types)}</div>` : `<div class="nwho">${who}</div><div class="nwait">choosing...</div>`;
  }
  function refresh() {
    if (!N.linked) return;
    const mine = dexById(selYou), rival = N.rival ? dexById(N.rival.pk) : null, host = N.role === 'host';
    card('nMe', mine, 'YOU'); card('nFr', rival, 'FRIEND');
    sendPick();
    $('nArena').textContent = THEMES[themeIdx].name || THEMES[themeIdx].id;
    for (const b of document.querySelectorAll('#nRounds .chip')) b.classList.toggle('sel', +b.dataset.r === bestOf);
    for (const e of document.querySelectorAll('.nhost')) e.style.display = host ? '' : 'none';
    for (const e of document.querySelectorAll('.nguest')) e.style.display = host ? 'none' : '';
    $('nGo').disabled = !rival;
    stat(rival ? (host ? 'Friend connected. Press FIGHT when you are both ready.' : 'Connected. Waiting for the host to start.') : 'Friend connected. Waiting for their pick...');
  }
  NETG.refresh = refresh;
  NETG.open = () => { NETG.lobby = true; closeNet(); N.rival = null; step('nStep0'); stat(''); showScreen('netPane'); NETG.lobby = true; };

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
    c.on('open', () => { N.linked = true; N.rival = null; step('nStepLobby'); refresh(); });
    c.on('data', onData);
    c.on('close', () => { if (N.conn === c) onGone(); });
    c.on('error', () => { if (N.conn === c) onGone(); });
  }
  function closeNet() {
    N.linked = false; const c = N.conn, p = N.peer; N.conn = null; N.peer = null;
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
      if (N.saved) { spriteStyle = N.saved.sprite; bestOf = N.saved.best; lowQ = N.saved.low; bgDirty = true; themeIdx = N.saved.theme; setTheme(THEMES[themeIdx]); N.saved = null; }
    }
    NETG.lobby = false; N.go = false; N.role = ''; N.rival = null; $('pause').classList.remove('on'); $('msg').classList.remove('on');
    showScreen('title'); if (note) toast(note);
  }
  NETG.leave = () => leave();

  // ---- messages
  function onData(d) {
    if (!d || !d.t) return;
    if (d.t === 'i') N.rem[d.k] = d.m;
    else if (d.t === 'pick') { N.rival = { pk: d.pk, spec: d.spec }; if (NETG.lobby) refresh(); }
    else if (d.t === 'start') { if (N.role === 'guest') begin(d.cfg); }
    else if (d.t === 'rdy') { N.readyR = true; checkGo(); }
    else if (d.t === 'h') { N.hr[d.k] = d.h; cmp(d.k); }
    else if (d.t === 'rm') { N.rmR = true; checkRematch(); }
    else if (d.t === 'bye') onGone();
  }
  function fight() {
    if (N.role !== 'host' || !N.rival) return;
    const cfg = { seed: (nativeRnd() * 4294967296) >>> 0, pa: selYou, pb: N.rival.pk, spP: specIdx(selYou), spE: N.rival.spec, bestOf, theme: themeIdx, sprite: spriteStyle };
    send({ t: 'start', cfg }); begin(cfg);
  }
  function begin(cfg) {
    if (!N.saved) N.saved = { sprite: spriteStyle, best: bestOf, low: lowQ, theme: themeIdx };
    Object.assign(N, { cfg, go: false, readyL: false, readyR: false, rmL: false, rmR: false, tick: 0, simT: 0, acc: 0, loc: {}, rem: {}, hl: {}, hr: {}, stall: 0 });
    for (let t = 0; t < DELAY; t++) { N.loc[t] = 0; N.rem[t] = 0; }
    NETG.on = true; NETG.role = N.role; NETG.lobby = false; NETG.inP = {}; NETG.inE = {};
    document.body.classList.add('online'); $('pause').classList.remove('on'); $('againBtn').textContent = 'REMATCH';
    startMatch({ online: cfg });
  }
  NETG.ready = () => { N.readyL = true; send({ t: 'rdy' }); checkGo(); }; // this device has loaded the fighters
  function checkGo() { if (NETG.on && N.readyL && N.readyR && !N.go) { N.go = true; N.acc = 0; } }
  NETG.rematch = () => { N.rmL = true; send({ t: 'rm' }); $('againBtn').textContent = 'WAITING FOR FRIEND...'; checkRematch(); };
  function checkRematch() {
    if (N.role !== 'host' || !N.rmL || !N.rmR) return;
    const cfg = { ...N.cfg, seed: (nativeRnd() * 4294967296) >>> 0 }; send({ t: 'start', cfg }); begin(cfg);
  }

  // ---- lockstep
  function hashState() {
    let h = 2166136261; const add = v => { h = Math.imul(h ^ (Math.round(v * 100) | 0), 16777619); };
    for (const f of [P, E]) { add(f.x); add(f.z); add(f.hp); add(f.sta); add(f.ki); add(f.lp); add(f.lift); add(f.vx); add(f.face); add(f.hitT * 1000); }
    add(matchTime); add(projectiles.length); add(beams.length);
    return (h >>> 0) + '/' + (rs >>> 0);
  }
  function cmp(k) {
    if (N.hl[k] === undefined || N.hr[k] === undefined) return;
    if (N.hl[k] !== N.hr[k]) { N.desync++; if (N.desync === 1) toast('Connection out of sync. Finish the round or leave and rejoin.'); if (N.dbg) console.log('DESYNC at tick', k, 'mine', N.hl[k], 'theirs', N.hr[k]); }
    delete N.hl[k]; delete N.hr[k];
  }
  function tick(stepFn) {
    const t = N.tick, m = enc(playerInput()), host = N.role === 'host';
    N.loc[t + DELAY] = m; send({ t: 'i', k: t + DELAY, m });
    NETG.inP = dec(host ? N.loc[t] : N.rem[t]); NETG.inE = dec(host ? N.rem[t] : N.loc[t]);
    delete N.loc[t]; delete N.rem[t];
    now = N.simT; simR = mulberry;
    try { stepFn(TICK); } finally { simR = null; }
    N.tick++; N.simT += TICK;
    if (N.tick % HASH_EVERY === 0) { const h = hashState(); N.hl[N.tick] = h; send({ t: 'h', k: N.tick, h }); cmp(N.tick); }
  }
  NETG.frame = (raw, stepFn) => {
    const rdt = Math.min(Math.max(raw / 1000 || 0, 0), .25);
    if (N.go) {
      N.acc += rdt; let n = 0, stalled = false;
      while (N.acc >= TICK && n < 8) { if (N.rem[N.tick] === undefined) { stalled = true; break; } tick(stepFn); N.acc -= TICK; n++; }
      if (N.acc > TICK * 10) N.acc = TICK * 3; // came back from a hidden tab: do not race to catch up
      N.stall = stalled ? N.stall + rdt : 0;
      if (N.stall > .7) showMsg('WAITING FOR FRIEND...', 0); else if (N.stall === 0 && $('msg').textContent.startsWith('WAITING')) $('msg').classList.remove('on');
      now = N.simT + Math.min(N.acc, TICK);
    } else now = last / 1000;
    hudDt = Math.min(rdt, .05);
    if (N.dbg) { let e = $('nDbg'); if (!e) { e = document.createElement('div'); e.id = 'nDbg'; $('stage').appendChild(e); } e.textContent = `${N.role} tick ${N.tick} desync ${N.desync} stall ${N.stall.toFixed(1)}`; }
  };

  // ---- wiring
  $('tOnline').onclick = () => { audio(); NETG.open(); };
  $('nHost').onclick = () => hostRoom();
  $('nJoin').onclick = () => { N.role = 'guest'; step('nStepJoin'); stat(''); $('nIn').focus(); };
  $('nJoinGo').onclick = () => joinRoom($('nIn').value);
  $('nIn').oninput = e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); };
  $('nIn').onkeydown = e => { if (e.key === 'Enter') joinRoom($('nIn').value); e.stopPropagation(); };
  $('nIn').onkeyup = e => e.stopPropagation();
  $('nBack').onclick = () => leave();
  $('nPick').onclick = () => openPicker('you');
  $('nGo').onclick = fight;
  $('nPrev').onclick = () => { setThemeIdx(themeIdx - 1); refresh(); }; $('nNext').onclick = () => { setThemeIdx(themeIdx + 1); refresh(); };
  for (const b of document.querySelectorAll('#nRounds .chip')) b.onclick = () => { setRounds(+b.dataset.r); refresh(); };
  $('nCopy').onclick = () => { const t = N.code; try { navigator.clipboard.writeText(t); toast('Code copied'); } catch (e) { toast('Code: ' + t); } };

  const q = new URLSearchParams(location.search);
  if (q.has('join') || q.has('host')) setTimeout(() => { NETG.open(); if (q.has('host')) hostRoom(); else { N.role = 'guest'; step('nStepJoin'); $('nIn').value = q.get('join').toUpperCase(); joinRoom(q.get('join')); } }, 400);
})();
