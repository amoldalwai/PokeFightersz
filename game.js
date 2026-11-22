'use strict';
// Poké Fighters Z: a Dragon Ball style 2D fighter for all 386 Gen 1, 2 and 3 Pokémon (private project).
// Stats, types, sizes and learnsets come from PokeAPI (see data/pokedex.js, built by tools/build_data.py).
// Sprites: Black/White animated sprites from the Pokémon Database. Arenas: Pokémon Showdown battle backgrounds.
// the stage is 960x480; the world is drawn on a 1300x650 view scaled down to fit it (see #wbase), which zooms everything out
const CW = 960, CH = 480, W = 1300, H = 650, GROUND = 594, WORLD_W = 6400, MAXSEP = 1150;
const $ = id => document.getElementById(id);
const stage = $('stage');
function fit() { stage.style.transform = `scale(${Math.min(innerWidth / CW, innerHeight / CH)})`; }
addEventListener('resize', fit); fit();
const BGT = [[0, 0, 0, 1], [700, 500, 120, 1], [2200, 1300, 200, .5]]; // background canvas margins [side, top, bottom, resolution] per zoom-out tier; the far tier is half resolution so it can reach much further without a huge bitmap
for (const id of ['bg', 'fxb', 'fxf']) { $(id).width = W; $(id).height = H; }
let lowQ = new URLSearchParams(location.search).has('lowq'), fAvg = 16, fCnt = 0; // low-quality mode switches on by itself when the frame rate is poor
let fpsCap = 60, fxLow = false, lastRun = 0; // Settings > Graphics: frame-rate cap (0 follows the screen's own rate) and reduced effects
try { const v = localStorage.getItem('pf_fps'); if (v === '30' || v === '60' || v === '0') fpsCap = +v; fxLow = localStorage.getItem('pf_fx') === '1'; if (fxLow) lowQ = true; } catch (e) { }
const ico = n => ICON_PATH[n] ? `<svg class="sv" viewBox="0 0 24 24"><path d="${ICON_PATH[n]}"/></svg>` : '';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = x => 1 - (1 - clamp(x, 0, 1)) ** 2;
const nm = s => s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
const rnd = (a, b) => a + Math.random() * (b - a);
// Gen 1 type chart from PokeAPI (data/typechart.js): multiplier of an attack type against a list of defending types
const effect = (ty, types) => { const row = TYPECHART[ty] || {}; let m = 1; for (const t of types) m *= row[t] === undefined ? 1 : row[t]; return m; };
const rollMiss = acc => Math.random() * 100 >= acc;
const fixAcc = a => 100 - (100 - (a || 100)) * .85;
const TYPE_ICON = { normal: '⭐', fire: '🔥', water: '💧', electric: '⚡', grass: '🍃', ice: '❄️', fighting: '🥊', poison: '☠️', ground: '🏜️', flying: '🦅', psychic: '🔮', bug: '🐛', rock: '⛰️', ghost: '👻', dragon: '🐉' };
const ARCH_ICON = { strike: '⚡', blast: '💥', dig: '🕳️', quake: '🌋', teleport: '🌀', dash: '💨', wave: '🌊', rain: '☄️', blizzard: '❄️', tornado: '🌪️', sleep: '💤', poison: '☠️', para: '⚡', selfdestruct: '💣', heal: '💚', buff: '⬆️', vine: '🌿', geyser: '⛲', cannon: '🎯', slash: '⚔️', volley: '🎆', swoop: '🦅' };
Object.assign(TYPE_ICON, { normal: 'star-four-points', fire: 'fire', water: 'water', electric: 'flash', grass: 'leaf', ice: 'snowflake', fighting: 'karate', poison: 'skull-crossbones', ground: 'terrain', flying: 'bird', psychic: 'brain', bug: 'bug', rock: 'diamond-stone', ghost: 'ghost', dragon: 'flare' });
Object.assign(ARCH_ICON, { strike: 'weather-lightning', blast: 'fire-circle', dig: 'shovel', quake: 'volcano', teleport: 'rotate-orbit', dash: 'run-fast', wave: 'waves', rain: 'weather-hail', blizzard: 'snowflake', tornado: 'weather-tornado', sleep: 'sleep', poison: 'skull-crossbones', para: 'flash-alert', selfdestruct: 'bomb', heal: 'heart-plus', buff: 'battery-charging', vine: 'sprout', geyser: 'fountain', cannon: 'bullseye-arrow', slash: 'sword-cross', volley: 'rocket-launch', swoop: 'bird', combo: 'boxing-glove', leap: 'arrow-collapse-down', minibeam: 'laser-pointer', drain: 'water-plus', debuff: 'arrow-down-bold-circle', shield: 'shield', counter: 'swap-horizontal', metronome: 'dice-5', spin: 'autorenew', whirl: 'weather-tornado', boulder: 'bowling', roots: 'grass', spikes: 'diamond-stone', bloom: 'flower' });
const VOLLEY_KIND = { grass: 'leaf', water: 'water', bug: 'sting', poison: 'sting', normal: 'star', fighting: 'star', fire: 'fire', electric: 'bolt', ice: 'ice', rock: 'rock', ground: 'bone', psychic: 'psy', ghost: 'shadow', dragon: 'orb', flying: 'gust' };

// ---------------------------------------------------------------- types, colours and the move tables that give every Pokémon a kit
const TYPE_COL = {
  normal: ['#ffffff', '#c8c8b0'], fire: ['#fff2b0', '#ff7a1a'], water: ['#e8fbff', '#3a9bff'], electric: ['#ffffff', '#ffe01a'], grass: ['#b8ff8a', '#2e9e3a'],
  ice: ['#ffffff', '#7fdcff'], fighting: ['#ffe0b0', '#d0501a'], poison: ['#f0c8ff', '#a030d0'], ground: ['#f5e0a0', '#b07a30'], flying: ['#ffffff', '#9fb8ff'],
  psychic: ['#ffffff', '#ff6adf'], bug: ['#e8ffa0', '#8ab820'], rock: ['#e8dcc0', '#8a7a5a'], ghost: ['#e2b8ff', '#5a1fb0'], dragon: ['#c8d0ff', '#5a2fff'],
};
const TYPE_HEX = { normal: '#a8a878', fire: '#f08030', water: '#6890f0', electric: '#f8d030', grass: '#78c850', ice: '#98d8d8', fighting: '#c03028', poison: '#a040a0', ground: '#e0c068', flying: '#a890f0', psychic: '#f85888', bug: '#a8b820', rock: '#b8a038', ghost: '#705898', dragon: '#7038f8' };
Object.assign(TYPE_COL, { dark: ['#d9c6b0', '#5c4636'], steel: ['#ffffff', '#a8b8d0'], fairy: ['#fff0fa', '#ff9ad8'] });
Object.assign(TYPE_HEX, { dark: '#705848', steel: '#b8b8d0', fairy: '#ee99ac' });
Object.assign(TYPE_ICON, { dark: 'weather-night', steel: 'anvil', fairy: 'auto-fix' });
Object.assign(VOLLEY_KIND, { dark: 'shadow', steel: 'star', fairy: 'psy' });
const colsOf = t => TYPE_COL[t] || TYPE_COL.normal;
// ranged moves: [projectile look, shots, damage, speed, radius, cooldown]
const RANGED = {
  'ember': ['fire', 1, 42, 600, 20, .9], 'water-gun': ['water', 2, 24, 660, 15, .8], 'bubble': ['water', 3, 18, 560, 13, .8], 'bubble-beam': ['water', 3, 22, 620, 15, .9],
  'thunder-shock': ['bolt', 1, 40, 920, 16, .8], 'razor-leaf': ['leaf', 3, 20, 760, 15, .75], 'absorb': ['leaf', 1, 22, 600, 14, .7], 'mega-drain': ['leaf', 2, 24, 640, 14, .8],
  'leech-seed': ['leaf', 2, 16, 560, 12, .8], 'confusion': ['psy', 1, 44, 640, 22, .9], 'psybeam': ['psy', 1, 50, 700, 22, .9], 'psywave': ['psy', 1, 40, 620, 20, .9],
  'gust': ['gust', 1, 34, 560, 30, .9], 'poison-sting': ['sting', 3, 16, 820, 10, .7], 'pin-missile': ['sting', 4, 16, 800, 10, .8], 'twineedle': ['sting', 2, 22, 820, 10, .7],
  'acid': ['acid', 2, 26, 600, 16, .9], 'sludge': ['acid', 2, 30, 600, 18, 1], 'smog': ['acid', 2, 24, 560, 18, .9], 'rock-throw': ['rock', 1, 50, 560, 22, 1],
  'aurora-beam': ['ice', 1, 44, 720, 18, .9], 'swift': ['star', 3, 20, 860, 14, .8], 'bone-club': ['bone', 1, 44, 640, 20, .9], 'bonemerang': ['bone', 2, 34, 720, 18, .9],
  'night-shade': ['shadow', 1, 48, 560, 24, 1], 'lick': ['shadow', 1, 36, 600, 18, .8], 'dragon-rage': ['dragon', 1, 52, 660, 22, 1], 'seismic-toss': ['fist', 1, 44, 620, 20, .9],
  'fire-blast-small': ['fire', 2, 30, 640, 22, 1], 'sand-attack': ['sand', 1, 24, 620, 16, .8],
};
const DEF_RANGED = { normal: 'swift', fire: 'ember', water: 'water-gun', electric: 'thunder-shock', grass: 'razor-leaf', ice: 'aurora-beam', fighting: 'seismic-toss', poison: 'poison-sting', ground: 'bone-club', flying: 'gust', psychic: 'confusion', bug: 'pin-missile', rock: 'rock-throw', ghost: 'night-shade', dragon: 'dragon-rage', dark: 'faint-attack', steel: 'swift', fairy: 'confusion' };
Object.assign(RANGED, { 'faint-attack': ['shadow', 1, 42, 700, 18, .8], 'shadow-ball': ['shadow', 1, 52, 620, 24, 1], 'octazooka': ['water', 2, 28, 600, 16, 1], 'sludge-bomb': ['acid', 2, 34, 600, 18, 1], 'spark': ['bolt', 1, 42, 860, 16, .8], 'powder-snow': ['ice', 2, 22, 640, 15, .8], 'icy-wind': ['ice', 2, 24, 640, 15, .9], 'mud-slap': ['sand', 1, 24, 640, 16, .8], 'zap-cannon': ['bolt', 1, 54, 820, 20, 1.1], 'aeroblast': ['gust', 1, 54, 760, 26, 1.1], 'ancient-power': ['rock', 1, 46, 600, 22, 1], 'giga-drain': ['leaf', 2, 30, 640, 16, .9], 'dragon-breath': ['dragon', 1, 44, 680, 20, .9], 'sacred-fire': ['fire', 1, 50, 600, 22, 1], 'future-sight': ['psy', 1, 50, 600, 24, 1], 'bone-rush': ['bone', 2, 26, 680, 16, .9], 'hidden-power': ['orb', 1, 36, 640, 18, .9] });
const MELEE = ['tackle', 'scratch', 'pound', 'body-slam', 'slam', 'cut', 'slash', 'wing-attack', 'bite', 'headbutt', 'horn-attack', 'mega-punch', 'mega-kick', 'karate-chop', 'low-kick', 'double-kick', 'fury-swipes', 'stomp', 'strength', 'rolling-kick', 'jump-kick', 'hi-jump-kick', 'peck', 'drill-peck', 'fury-attack', 'vice-grip', 'comet-punch', 'thrash', 'submission', 'take-down', 'double-edge', 'skull-bash', 'ice-punch', 'fire-punch', 'thunder-punch', 'dizzy-punch', 'hyper-fang', 'crabhammer', 'stomp', 'lick', 'crunch', 'iron-tail', 'metal-claw', 'steel-wing', 'mach-punch', 'dynamic-punch', 'cross-chop', 'extreme-speed', 'fury-cutter', 'megahorn', 'pursuit', 'return', 'frustration', 'false-swipe', 'thief', 'rock-smash', 'triple-kick', 'vital-throw', 'flail', 'brick-break', 'shadow-punch', 'sky-uppercut', 'poison-fang', 'crush-claw', 'leaf-blade', 'blaze-kick', 'dragon-claw', 'needle-arm', 'aerial-ace', 'meteor-mash'];
const BEAM_NAMES = { fire: ['fire-blast', 'flamethrower'], water: ['hydro-pump'], electric: ['thunderbolt', 'thunder'], grass: ['solar-beam'], ice: ['blizzard', 'ice-beam'], psychic: ['psychic'], normal: ['hyper-beam', 'tri-attack'], dark: ['dark-pulse'], steel: ['flash-cannon'], fairy: ['moonblast'] };
const BEAM_DEF = { fire: 'Flamethrower', water: 'Hydro Pump', electric: 'Thunderbolt', grass: 'Solar Beam', ice: 'Ice Beam', psychic: 'Psychic', normal: 'Hyper Beam', dark: 'Dark Pulse', steel: 'Mirror Cannon', fairy: 'Moonlight Ray' };
// which learnable moves become which special archetype (see ARCH); every Gen 1 move PokeAPI lists for a Pokémon can turn into one of these
const SPECIALS = {
  'vine-whip': 'vine', 'thunder': 'strike', 'fire-blast': 'blast', 'egg-bomb': 'blast', 'dig': 'dig', 'earthquake': 'quake', 'fissure': 'quake', 'teleport': 'teleport',
  'quick-attack': 'dash', 'take-down': 'dash', 'double-edge': 'dash', 'skull-bash': 'dash', 'rolling-kick': 'dash', 'tackle': 'dash', 'fly': 'swoop', 'sky-attack': 'swoop',
  'slash': 'slash', 'cut': 'slash', 'scratch': 'slash', 'guillotine': 'slash', 'wing-attack': 'slash', 'razor-wind': 'tornado', 'whirlwind': 'tornado', 'gust': 'tornado', 'roar': 'tornado',
  'pin-missile': 'volley', 'barrage': 'volley', 'spike-cannon': 'volley', 'twineedle': 'volley', 'swift': 'volley', 'bonemerang': 'volley',
  'karate-chop': 'combo', 'double-kick': 'combo', 'comet-punch': 'combo', 'mega-punch': 'combo', 'mega-kick': 'combo', 'fury-attack': 'combo', 'fury-swipes': 'combo', 'double-slap': 'combo', 'dizzy-punch': 'combo',
  'fire-punch': 'combo', 'ice-punch': 'combo', 'thunder-punch': 'combo', 'low-kick': 'combo', 'submission': 'combo', 'pay-day': 'combo', 'peck': 'combo', 'drill-peck': 'combo', 'horn-drill': 'combo', 'horn-attack': 'combo',
  'vice-grip': 'combo', 'bite': 'combo', 'hyper-fang': 'combo', 'super-fang': 'combo', 'crabhammer': 'combo', 'lick': 'combo', 'thrash': 'combo', 'petal-dance': 'combo', 'pound': 'combo',
  'stomp': 'leap', 'body-slam': 'leap', 'slam': 'leap', 'jump-kick': 'leap', 'hi-jump-kick': 'leap', 'high-jump-kick': 'leap', 'strength': 'leap', 'headbutt': 'leap',
  'ice-beam': 'minibeam', 'psybeam': 'minibeam', 'flamethrower': 'minibeam', 'solar-beam': 'minibeam', 'hydro-pump': 'minibeam', 'thunderbolt': 'minibeam', 'tri-attack': 'minibeam', 'psychic': 'minibeam',
  'sludge': 'cannon', 'sonic-boom': 'cannon', 'acid': 'cannon', 'smog': 'poison',
  'absorb': 'drain', 'mega-drain': 'drain', 'leech-life': 'drain', 'leech-seed': 'drain', 'dream-eater': 'drain',
  'growl': 'debuff', 'leer': 'debuff', 'screech': 'debuff', 'tail-whip': 'debuff', 'string-shot': 'debuff', 'sand-attack': 'debuff', 'smokescreen': 'debuff', 'flash': 'debuff', 'supersonic': 'debuff', 'kinesis': 'debuff',
  'confuse-ray': 'debuff', 'mist': 'debuff', 'haze': 'debuff', 'disable': 'debuff',
  'harden': 'shield', 'withdraw': 'shield', 'defense-curl': 'shield', 'barrier': 'shield', 'light-screen': 'shield', 'reflect': 'shield', 'acid-armor': 'shield', 'minimize': 'shield', 'substitute': 'shield', 'double-team': 'shield',
  'agility': 'buff', 'swords-dance': 'buff', 'growth': 'buff', 'meditate': 'buff', 'sharpen': 'buff', 'focus-energy': 'buff', 'rage': 'buff', 'amnesia': 'buff',
  'counter': 'counter', 'bide': 'counter', 'mirror-move': 'counter', 'metronome': 'metronome', 'mimic': 'metronome', 'transform': 'metronome', 'conversion': 'metronome', 'splash': 'metronome',
  'surf': 'wave', 'waterfall': 'geyser', 'rock-slide': 'rain', 'blizzard': 'blizzard', 'fire-spin': 'ring', 'clamp': 'ring', 'wrap': 'ring', 'bind': 'ring', 'constrict': 'ring',
  'hypnosis': 'sleep', 'sleep-powder': 'sleep', 'sing': 'sleep', 'lovely-kiss': 'sleep', 'spore': 'sleep', 'poison-powder': 'poison', 'poison-gas': 'poison', 'toxic': 'poison',
  'stun-spore': 'para', 'thunder-wave': 'para', 'glare': 'para', 'explosion': 'selfdestruct', 'self-destruct': 'selfdestruct', 'recover': 'heal', 'softboiled': 'heal', 'rest': 'heal',
};
Object.assign(SPECIALS, { 'extreme-speed': 'dash', 'mach-punch': 'dash', 'faint-attack': 'dash', 'pursuit': 'dash', 'thief': 'dash', 'spark': 'dash', 'flame-wheel': 'dash', 'dynamic-punch': 'combo', 'cross-chop': 'combo', 'triple-kick': 'combo', 'rock-smash': 'combo', 'vital-throw': 'combo', 'outrage': 'combo', 'crunch': 'combo', 'fury-cutter': 'slash', 'metal-claw': 'slash', 'steel-wing': 'slash', 'false-swipe': 'slash', 'iron-tail': 'leap', 'megahorn': 'leap', 'return': 'leap', 'frustration': 'leap', 'flail': 'leap', 'bone-rush': 'volley', 'sacred-fire': 'blast', 'dragon-breath': 'blast', 'zap-cannon': 'cannon', 'octazooka': 'cannon', 'sludge-bomb': 'cannon', 'shadow-ball': 'cannon', 'aeroblast': 'cannon', 'future-sight': 'cannon', 'hidden-power': 'cannon', 'ancient-power': 'rain', 'magnitude': 'quake', 'twister': 'tornado', 'sandstorm': 'tornado', 'whirlpool': 'ring', 'spider-web': 'ring', 'mean-look': 'debuff', 'scary-face': 'debuff', 'charm': 'debuff', 'sweet-scent': 'debuff', 'swagger': 'debuff', 'cotton-spore': 'debuff', 'spite': 'debuff', 'attract': 'debuff', 'curse': 'debuff', 'encore': 'debuff', 'foresight': 'debuff', 'mud-slap': 'debuff', 'sweet-kiss': 'sleep', 'perish-song': 'sleep', 'nightmare': 'poison', 'destiny-bond': 'counter', 'mirror-coat': 'counter', 'detect': 'shield', 'protect': 'shield', 'endure': 'shield', 'safeguard': 'shield', 'belly-drum': 'buff', 'psych-up': 'buff', 'lock-on': 'buff', 'mind-reader': 'buff', 'synthesis': 'heal', 'moonlight': 'heal', 'morning-sun': 'heal', 'milk-drink': 'heal', 'heal-bell': 'heal', 'pain-split': 'heal', 'giga-drain': 'drain', 'icy-wind': 'minibeam', 'powder-snow': 'minibeam', 'present': 'metronome', 'sketch': 'metronome' });
const BASE_SCORE = { strike: 6, blast: 6, quake: 5, dig: 5, wave: 5, rain: 4, teleport: 5, vine: 4, blizzard: 5, ring: 4, tornado: 3, sleep: 4, poison: 3, para: 3, dash: 3, selfdestruct: 5, heal: 2, buff: 2, geyser: 5, cannon: 4, slash: 4, volley: 4, swoop: 5, combo: 5, leap: 5, minibeam: 5, drain: 4, debuff: 2, shield: 3, counter: 3, metronome: 3, spin: 5, whirl: 4, boulder: 5, roots: 4, spikes: 5, bloom: 5 };
const AFFINITY = { geyser: ['water'], cannon: ['water', 'psychic', 'dragon', 'poison'], slash: ['normal', 'bug', 'fighting', 'grass', 'flying'], volley: ['bug', 'normal', 'grass', 'water', 'poison'], swoop: ['flying'], strike: ['electric'], blast: ['fire', 'dragon'], ring: ['fire', 'water'], wave: ['water'], vine: ['grass'], blizzard: ['ice'], rain: ['rock', 'ground'], dig: ['ground', 'rock'], quake: ['ground', 'rock', 'fighting'], teleport: ['psychic'], sleep: ['psychic', 'ghost', 'grass'], poison: ['poison', 'grass', 'bug'], para: ['electric', 'bug'], dash: ['normal', 'fighting', 'flying', 'electric', 'bug'], tornado: ['flying'], heal: ['psychic'], combo: ['fighting', 'normal', 'bug', 'flying'], leap: ['fighting', 'normal', 'rock', 'ground'], minibeam: ['psychic', 'ice', 'fire', 'water', 'electric', 'grass'], drain: ['grass', 'bug'], counter: ['fighting'], metronome: ['normal', 'psychic'] };
// per-type specials a Pokémon can fall back on; which one it gets rotates with its Pokédex number so same-type Pokémon don't all look alike
const POOL = {
  electric: [['strike', 'Thunder'], ['para', 'Thunder Wave'], ['dash', 'Volt Tackle']], fire: [['blast', 'Fire Blast'], ['ring', 'Fire Spin'], ['dash', 'Flame Charge']],
  water: [['wave', 'Surf'], ['geyser', 'Water Spout'], ['ring', 'Whirlpool'], ['cannon', 'Hydro Cannon']], grass: [['vine', 'Vine Whip'], ['volley', 'Leaf Storm'], ['sleep', 'Sleep Powder']],
  ice: [['blizzard', 'Blizzard'], ['cannon', 'Ice Cannon'], ['ring', 'Icy Vortex']], fighting: [['dash', 'Mach Punch'], ['slash', 'Karate Chop'], ['quake', 'Ground Pound']],
  poison: [['poison', 'Poison Gas'], ['volley', 'Poison Needles']], ground: [['dig', 'Dig'], ['quake', 'Earthquake'], ['rain', 'Rock Slide']],
  rock: [['rain', 'Rock Slide'], ['quake', 'Earthquake'], ['cannon', 'Rock Cannon']], flying: [['swoop', 'Sky Dive'], ['tornado', 'Whirlwind'], ['slash', 'Wing Attack']],
  psychic: [['teleport', 'Teleport'], ['cannon', 'Psy Orb'], ['sleep', 'Hypnosis']], ghost: [['sleep', 'Hypnosis'], ['volley', 'Shadow Balls'], ['poison', 'Toxic Haze']],
  bug: [['para', 'String Shot'], ['volley', 'Pin Missile'], ['slash', 'Twineedle']], dragon: [['blast', 'Dragon Breath'], ['cannon', 'Dragon Pulse'], ['tornado', 'Twister']],
  normal: [['dash', 'Quick Attack'], ['slash', 'Slash'], ['volley', 'Swift']],
};
// stamina cost of each special before the move's power adjusts it
const STA = { vine: 12, strike: 30, blast: 28, dig: 24, quake: 26, teleport: 16, dash: 14, wave: 26, rain: 26, blizzard: 28, ring: 20, tornado: 14, sleep: 20, poison: 16, para: 16, selfdestruct: 40, heal: 22, buff: 16, geyser: 26, cannon: 30, slash: 18, volley: 24, swoop: 30, combo: 20, leap: 26, minibeam: 28, drain: 18, debuff: 14, shield: 18, counter: 20, metronome: 24, spin: 16, whirl: 18, boulder: 26, roots: 16, spikes: 22, bloom: 22 };
const POWER_KEYS = new Set(['strike', 'blast', 'quake', 'blizzard', 'selfdestruct', 'cannon', 'swoop', 'wave', 'geyser', 'rain', 'minibeam', 'boulder', 'spikes']); // power moves drain most of the stamina bar
const kitCache = {};
Object.assign(SPECIALS, { 'aerial-ace': 'slash', 'dragon-claw': 'slash', 'crush-claw': 'slash', 'leaf-blade': 'slash', 'brick-break': 'combo', 'focus-punch': 'combo', 'shadow-punch': 'combo', 'sky-uppercut': 'combo', 'poison-fang': 'combo', 'blaze-kick': 'combo', 'needle-arm': 'combo', 'meteor-mash': 'dash', 'volt-tackle': 'dash', 'ice-ball': 'dash', 'bounce': 'leap', 'water-pulse': 'cannon', 'shock-wave': 'cannon', 'mud-shot': 'cannon', 'extrasensory': 'cannon', 'psycho-boost': 'cannon', 'hydro-cannon': 'cannon', 'doom-desire': 'cannon', 'weather-ball': 'cannon', 'luster-purge': 'cannon', 'mist-ball': 'cannon', 'signal-beam': 'minibeam', 'rock-tomb': 'rain', 'rock-blast': 'volley', 'bullet-seed': 'volley', 'magical-leaf': 'volley', 'silver-wind': 'tornado', 'hail': 'blizzard', 'sheer-cold': 'blizzard', 'overheat': 'blast', 'blast-burn': 'blast', 'eruption': 'blast', 'heat-wave': 'wave', 'muddy-water': 'wave', 'water-spout': 'geyser', 'frenzy-plant': 'vine', 'sand-tomb': 'ring', 'calm-mind': 'buff', 'bulk-up': 'buff', 'dragon-dance': 'buff', 'howl': 'buff', 'charge': 'buff', 'stockpile': 'buff', 'iron-defense': 'shield', 'cosmic-power': 'shield', 'taunt': 'debuff', 'torment': 'debuff', 'teeter-dance': 'debuff', 'flatter': 'debuff', 'will-o-wisp': 'debuff', 'swallow': 'heal', 'wish': 'heal', 'ingrain': 'heal', 'skill-swap': 'metronome', 'role-play': 'metronome', 'tickle': 'debuff', 'memento': 'debuff' });
Object.assign(RANGED, { 'water-pulse': ['water', 2, 28, 640, 16, .9], 'shock-wave': ['bolt', 1, 42, 900, 16, .8], 'mud-shot': ['sand', 2, 24, 640, 16, .8], 'signal-beam': ['psy', 1, 48, 720, 20, .9], 'bullet-seed': ['leaf', 3, 14, 780, 12, .8], 'magical-leaf': ['leaf', 3, 16, 780, 14, .8], 'extrasensory': ['psy', 1, 52, 680, 22, 1], 'weather-ball': ['orb', 1, 40, 640, 18, .9], 'rock-blast': ['rock', 3, 16, 720, 14, .8], 'mist-ball': ['psy', 1, 50, 620, 22, 1], 'luster-purge': ['psy', 1, 52, 620, 22, 1] });
Object.assign(POOL, { dark: [['dash', 'Faint Attack'], ['slash', 'Night Slash'], ['cannon', 'Dark Pulse']], steel: [['dash', 'Meteor Mash'], ['slash', 'Metal Claw'], ['cannon', 'Flash Cannon']], fairy: [['cannon', 'Moonblast'], ['sleep', 'Sweet Kiss'], ['volley', 'Fairy Wind']] });
AFFINITY.slash.push('steel', 'dark'); AFFINITY.dash.push('dark'); AFFINITY.leap.push('steel'); AFFINITY.cannon.push('steel', 'fairy', 'dark'); AFFINITY.sleep.push('dark', 'fairy'); AFFINITY.debuff = ['dark', 'fairy']; AFFINITY.shield = ['steel']; AFFINITY.combo.push('dark');
const SIG = { grass: ['roots', 'bloom', 'whirl', 'spin'], rock: ['boulder', 'spin', 'spikes'], ground: ['spikes', 'spin', 'boulder'], fire: ['spin', 'whirl'], water: ['spin', 'whirl'], electric: ['spin', 'whirl'], ice: ['spikes', 'spin', 'whirl'], fighting: ['spin', 'whirl'], poison: ['roots', 'spikes', 'whirl'], bug: ['whirl', 'spin', 'roots'], normal: ['spin', 'whirl'], flying: ['whirl', 'spin'], psychic: ['whirl', 'spin'], ghost: ['spin', 'whirl'], dragon: ['whirl', 'spin'] };
const SIG_NAME = {
  spin: { rock: 'Rollout', ground: 'Mud Roll', fire: 'Flame Wheel', water: 'Aqua Jet', electric: 'Spark Wheel', grass: 'Leaf Spin', ice: 'Ice Ball', fighting: 'Hurricane Kick', bug: 'Silver Spin', poison: 'Toxic Roll', ghost: 'Shadow Roll', dragon: 'Dragon Rush', flying: 'Aerial Spin', psychic: 'Psy Spin', normal: 'Rollout' },
  whirl: { grass: 'Razor Whirl', fire: 'Fire Tornado', water: 'Whirlpool Spin', electric: 'Static Orbit', flying: 'Feather Storm', bug: 'Silver Wind', dragon: 'Twister', psychic: 'Psy Ring', ice: 'Snow Cyclone', poison: 'Toxic Cyclone', fighting: 'Whirl Kick', ghost: 'Spirit Orbit', normal: 'Hyper Spin' },
  roots: { grass: 'Root Snare', poison: 'Poison Ivy', bug: 'Web Trap', normal: 'Root Snare' }, bloom: { grass: 'Leaf Cyclone', normal: 'Leaf Cyclone' },
  boulder: { rock: 'Rock Roll', ground: 'Boulder Roll', normal: 'Rock Roll' }, spikes: { rock: 'Stone Edge', ground: 'Bone Spikes', ice: 'Ice Crystals', poison: 'Toxic Spikes', normal: 'Stone Edge' },
};
Object.assign(SIG, { dark: ['spin', 'whirl'], steel: ['spikes', 'spin', 'boulder'], fairy: ['whirl', 'spin'] });
Object.assign(SIG_NAME.spin, { dark: 'Pursuit Spin', steel: 'Gyro Ball', fairy: 'Twinkle Spin' }); Object.assign(SIG_NAME.whirl, { dark: 'Night Whirl', steel: 'Metal Cyclone', fairy: 'Fairy Wind' }); Object.assign(SIG_NAME.spikes, { steel: 'Iron Spikes' }); Object.assign(SIG_NAME.boulder, { steel: 'Iron Roll' });
function buildKit(p) {
  if (kitCache[p.id]) return kitCache[p.id];
  const types = p.types, t0 = types[0], L = new Set(p.moves), mv = n => MOVEDEX[n] || {};
  const atkM = clamp((p.atk + 45) / 115, .8, 1.4), spaM = clamp((p.spa + 45) / 115, .8, 1.4);
  let rn = null, rp = -1;
  for (const n of p.moves) if (RANGED[n] && MOVEDEX[n] && types.includes(MOVEDEX[n].type)) { const pw = MOVEDEX[n].power || 30; if (pw > rp) { rp = pw; rn = n; } }
  if (!rn) rn = DEF_RANGED[t0] || 'swift';
  const rd = RANGED[rn], rType = mv(rn).type || t0;
  // melee first (best non-special-looking contact move), then up to six specials from everything else the Pokémon learns
  let melee = null, best = -1, bestScore = -99;
  for (const n of MELEE) if (L.has(n) && MOVEDEX[n] && n !== rn) {
    const pw = MOVEDEX[n].power || 40, mt = MOVEDEX[n].type, sc = Math.min(pw, 80) + (types.includes(mt) ? 15 : 0) - (mt === 'normal' && !types.includes('normal') ? 12 : 0) + (p.id * 31 + MELEE.indexOf(n) * 17) % 23 - (['skull-bash', 'double-edge', 'take-down', 'thrash', 'submission'].includes(n) ? 30 : 0);
    if (sc > bestScore) { bestScore = sc; best = pw; melee = n; }
  }
  if (!melee) { melee = 'tackle'; best = 35; }
  const cand = {};
  for (const n of p.moves) {
    const k = SPECIALS[n]; if (!k || n === rn || n === melee) continue;
    const m = mv(n), sc = (BASE_SCORE[k] || 1) + ((AFFINITY[k] || []).some(t => types.includes(t)) ? 3 : 0) + (types.includes(m.type) ? 2 : 0) + (m.power || 0) / 50 + ((p.id * 7 + n.length * 3) % 5) / 5;
    if (!cand[k] || cand[k].sc < sc) cand[k] = { key: k, name: nm(n), raw: n, type: m.type || t0, sc, pw: m.power, acc: m.acc };
  }
  const pool = Object.values(cand).sort((a, b) => b.sc - a.sc).slice(0, 6);
  const add = s => { if (pool.length < 4 && !pool.some(x => x.key === s.key)) pool.push(s); };
  for (const t of types.concat('normal')) { const tp = POOL[t]; if (tp) for (let i = 0; i < tp.length; i++) { const d = tp[(p.id + i) % tp.length]; add({ key: d[0], name: d[1], type: t }); } }
  if (pool.length < 3) add({ key: 'buff', name: 'Power Surge', type: 'normal' });
  { // signature specials: each Pokémon gets the newer movement attacks that suit its type (rolls, spins, roots, boulders, spikes), so no two feel the same
    const sigs = SIG[t0] || SIG.normal, addSig = (key, at) => { if (!pool.some(x => x.key === key)) pool.splice(Math.min(at, pool.length), 0, { key, name: (SIG_NAME[key] || {})[t0] || (SIG_NAME[key] || {}).normal || nm(key), type: t0, sc: 99 }); };
    addSig(sigs[p.id % sigs.length], 1); if (p.id % 2 === 0 && sigs.length > 1) addSig(sigs[(p.id + 1) % sigs.length], 2);
  }
  { // each type's own scripted specials: three of its five for this Pokémon (one up front), plus one from a second type
    const tl = TM_BY_TYPE[t0], addTM = (key, at) => { if (key && !pool.some(x => x.key === key)) pool.splice(Math.min(at, pool.length), 0, { key, name: TM[key].name, type: TM[key].type, sc: 99, pw: 70 }); };
    if (tl) { addTM(tl[p.id % tl.length], 1); addTM(tl[(p.id + 2) % tl.length], 99); addTM(tl[(p.id + 4) % tl.length], 99); }
    if (types[1] && TM_BY_TYPE[types[1]]) addTM(TM_BY_TYPE[types[1]][p.id % TM_BY_TYPE[types[1]].length], 99);
  }
  for (const s of pool) { s.sta = Math.min(85, Math.round(STA[s.key] * clamp(.8 + (s.pw || 70) / 250, .85, 1.2) * 2)); if (POWER_KEYS.has(s.key)) s.sta = Math.min(90, Math.round(s.sta * 1.25)); s.acc = fixAcc(s.acc); s.icon = s.key === 'ring' || (s.key === 'blast' && s.type !== 'fire') ? TYPE_ICON[s.type] : ARCH_ICON[s.key]; }
  const specials = pool.slice(0, 3), used = new Set(pool.map(s => s.name).concat(nm(rn), nm(melee)));
  let beamName = null; for (const n of (BEAM_NAMES[t0] || BEAM_NAMES.normal)) if (L.has(n) && !used.has(nm(n))) { beamName = nm(n); break; }
  if (!beamName) beamName = used.has(BEAM_DEF[t0]) ? 'Hyper Beam' : (BEAM_DEF[t0] || 'Hyper Beam');
  const bc = colsOf(t0);
  const kit = {
    types, atkM, spaM, hp: clamp(650 + p.hp * 4.2, 800, 1500) * 1.7, speed: clamp((190 + p.spe * .75) * 1.2, 255, 400), cols: bc, aura: [bc[0], bc[1]],
    melee: { name: nm(melee), dmg: clamp(24 + best * .22, 30, 52) * atkM, reach: 70, lunge: ['quick-attack', 'take-down', 'double-edge', 'skull-bash'].includes(melee) ? 760 : 560, type: mv(melee).type || 'normal', acc: fixAcc(mv(melee).acc), sta: clamp(6 + best * .14, 9, 20), icon: 'boxing-glove' },
    ranged: { name: nm(rn), kind: rd[0], n: rd[1], dmg: rd[2] * spaM, cost: 6 + rd[1] * 2, cool: rd[5], speed: rd[3], r: rd[4], cols: colsOf(rType), type: rType, acc: fixAcc(mv(rn).acc), sta: clamp(5 + rd[1] * rd[2] * .09, 8, 18), icon: TYPE_ICON[rType] },
    specials, pool, beam: { name: beamName, dmg: 46 * spaM, cols: ['#ffffff', bc[0], bc[1]], type: t0, sta: 90, icon: 'creation' },
  };
  return (kitCache[p.id] = kit);
}

// ---------------------------------------------------------------- sound (made with the browser, no files)
let ac = null;
function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } return ac; }
let PJ = 1;
function tone(freq, dur, type = 'square', vol = .07, slide = 0) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(); o.type = type;
  o.frequency.setValueAtTime(freq * PJ, a.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * PJ + slide), a.currentTime + dur);
  g.gain.setValueAtTime(vol * VOL.fx, a.currentTime); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + dur);
  o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + dur);
}
function noise(dur, vol = .1) {
  const a = audio(); if (!a) return;
  const b = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource(), g = a.createGain(); s.buffer = b; g.gain.value = vol * VOL.fx; s.connect(g); g.connect(a.destination); s.start();
}
const SFX = {
  hit: () => { noise(.12, .16); tone(150, .1, 'square', .09, -90); }, block: () => tone(560, .07, 'triangle', .08),
  leaf: () => tone(900, .12, 'sawtooth', .035, 400), whip: () => { noise(.18, .07); tone(300, .15, 'sawtooth', .04, 500); },
  shot: () => tone(420, .14, 'square', .05, -200), charge: () => tone(160, .9, 'sawtooth', .04, 700),
  beam: () => { noise(.9, .12); tone(90, .9, 'sawtooth', .09); }, boom: () => { noise(.5, .22); tone(70, .5, 'sawtooth', .12, -30); },
  zap: () => { noise(.25, .2); tone(1400, .2, 'square', .06, -1100); }, ko: () => tone(320, .9, 'square', .1, -260), go: () => tone(660, .25, 'square', .08, 300),
  tele: () => tone(1200, .2, 'sine', .06, -900), heal: () => tone(520, .5, 'sine', .06, 400),
  ui: () => tone(880, .05, 'triangle', .035, 240), pick: () => { tone(660, .1, 'square', .05, 300); setTimeout(() => tone(990, .15, 'square', .05), 80); },
  parry: () => { tone(1500, .12, 'triangle', .07, -500); tone(2200, .08, 'sine', .04); }, crit: () => { tone(1100, .1, 'square', .05, 500); noise(.05, .1); },
  smash: () => { noise(.4, .25); tone(55, .5, 'sawtooth', .13, -20); }, ability: () => { tone(520, .35, 'sine', .05, 520); tone(780, .3, 'sine', .035, 400); },
  chime: () => { tone(880, .12, 'triangle', .05); setTimeout(() => tone(1320, .2, 'triangle', .05), 90); },
};
const sfx = n => { if (muted) return; try { SFX[n] && SFX[n](); } catch (e) { } };
const HIT_SFX = {
  fire: () => { noise(.2, .14); tone(110, .18, 'sawtooth', .07, -40); }, water: () => { tone(500, .14, 'sine', .08, -300); noise(.08, .08); }, electric: () => SFX.zap(),
  grass: () => { noise(.1, .1); tone(700, .09, 'triangle', .05, 200); }, ice: () => { tone(1400, .18, 'triangle', .06, -500); tone(2100, .1, 'sine', .04); },
  ground: () => { noise(.22, .2); tone(70, .2, 'square', .1, -30); }, rock: () => { noise(.18, .2); tone(95, .15, 'square', .1, -40); }, fighting: () => { noise(.1, .2); tone(180, .08, 'square', .1, -100); },
  poison: () => { tone(260, .2, 'sine', .06, 180); tone(330, .2, 'sine', .05, 120); noise(.06, .06); }, psychic: () => { tone(700, .3, 'sine', .06, -400); tone(710, .3, 'sine', .05, -390); },
  ghost: () => { tone(240, .35, 'sawtooth', .04, -120); noise(.1, .08); }, bug: () => { tone(1000, .08, 'square', .04, 300); noise(.08, .08); }, flying: () => SFX.whip(),
  dragon: () => { noise(.2, .14); tone(90, .3, 'sawtooth', .09, -20); },
};
const hitSfx = (ty, cn = 1) => { if (muted) return; PJ = (.86 + NETG.vr() * .28) * (1 + Math.min(.5, (cn - 1) * .06)); try { (HIT_SFX[ty] || SFX.hit)(); } catch (e) { } PJ = 1; }; // a longer combo rises in pitch
let vibeOn = true; try { vibeOn = localStorage.getItem('pf_vibe') !== '0'; } catch (e) { }
let lastBuzz = 0;
const buzz = ms => { // phone vibration: the app bridge when running in the Android app, the browser API otherwise
  if (!vibeOn || performance.now() - lastBuzz < 40) return; lastBuzz = performance.now();
  try { if (window.PF && window.PF.vibrate) window.PF.vibrate(ms); else if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { }
};
// ---------------------------------------------------------------- background music: small chiptune loops written as note patterns and played with the browser's synth, kept quiet under the effects
let musicOn = true; try { musicOn = localStorage.getItem('pf_music') !== '0'; } catch (e) { }
const MUS = { out: null, cur: null, step: 0, next: 0, vol: .5, hold: 0, tg: -1, battle: 'battleA' };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function musBus() {
  const a = audio(); if (!a) return null;
  if (!MUS.out) {
    const g = a.createGain(), lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2800; g.gain.value = 0; g.connect(lp); lp.connect(a.destination); MUS.out = g;
    const nb = a.createBuffer(1, a.sampleRate, a.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; MUS.nb = nb;
  }
  return MUS.out;
}
function mnote(t, m, dur, type, vol) {
  const a = ac, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(mtof(m), t);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0008, t + dur); o.connect(g); g.connect(MUS.out); o.start(t); o.stop(t + dur + .03);
}
function mdrum(t, kind) {
  const a = ac;
  if (kind === 'kick') { const o = a.createOscillator(), g = a.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + .1); g.gain.setValueAtTime(.1, t); g.gain.exponentialRampToValueAtTime(.001, t + .15); o.connect(g); g.connect(MUS.out); o.start(t); o.stop(t + .17); return; }
  const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter(), hat = kind === 'hat', dur = hat ? .035 : .11;
  f.type = hat ? 'highpass' : 'bandpass'; f.frequency.value = hat ? 7500 : 1900; s.buffer = MUS.nb; g.gain.setValueAtTime(hat ? .03 : .055, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  s.connect(f); f.connect(g); g.connect(MUS.out); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
}
// each track is 4 bars of 16 steps; m = intensity: 0 intro, 1 fight, 2 someone nearly down
const TRACKS = {
  menu: { bpm: 92, len: 64, play(s, t, d) { // calm: soft chords and a slow arpeggio over C, Am, F, G
    const bar = s >> 4, st = s & 15, root = [48, 45, 41, 43][bar], tri = [[0, 4, 7], [0, 3, 7], [0, 4, 7], [0, 4, 7]][bar];
    if (st === 0) for (const iv of tri) mnote(t, root + 12 + iv, d * 15, 'triangle', .03);
    if (st % 2 === 0) mnote(t, root + 24 + tri[[0, 1, 2, 1, 0, 2, 1, 2][(st >> 1) % 8]], d * 3, 'sine', .035);
    if (st === 0 || st === 8) mnote(t, root, d * 6, 'sine', .07);
  } },
  battleA: { bpm: 140, len: 64, play(s, t, d, m) { // driving A minor: Am, F, G, Am
    const bar = s >> 4, st = s & 15, root = [45, 41, 43, 45][bar], tri = [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 3, 7]][bar];
    if (st % 4 === 0) mdrum(t, 'kick'); if (m >= 1 && (st === 4 || st === 12)) mdrum(t, 'snare'); if (m >= 1 && st % 2 === 1) mdrum(t, 'hat');
    if (st % 2 === 0) mnote(t, root - 12 + [0, 0, 12, 0, 7, 0, 12, 7][(st >> 1) % 8], d * 1.7, 'sawtooth', .026);
    mnote(t, root + 12 + tri[st % 3] + (st % 6 > 2 ? 12 : 0), d * .9, 'square', .011);
    const L = [0, -1, 7, -1, 12, -1, 10, -1, 7, -1, 5, -1, 3, -1, -1, -1][st]; if (m >= 2 && L >= 0) mnote(t, root + 24 + L, d * 2.2, 'square', .02);
  } },
  battleB: { bpm: 150, len: 64, play(s, t, d, m) { // tense E minor: Em, C, D, Em with a syncopated bass
    const bar = s >> 4, st = s & 15, root = [40, 36, 38, 40][bar], tri = [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 3, 7]][bar];
    if (st === 0 || st === 6 || st === 8 || st === 11) mdrum(t, 'kick'); if (m >= 1 && (st === 4 || st === 12)) mdrum(t, 'snare'); if (m >= 1 && st % 4 === 2) mdrum(t, 'hat');
    const B = [0, -1, 0, 12, -1, 7, -1, 0, 0, -1, 12, -1, 7, 5, -1, 3][st]; if (B >= 0) mnote(t, root + B, d * 1.4, 'sawtooth', .027);
    if (st % 2 === 0) mnote(t, root + 24 + tri[(st >> 1) % 3], d * 1.8, 'triangle', .02);
    const L = [12, -1, -1, 10, -1, 7, -1, -1, 12, -1, 15, -1, 14, -1, 12, -1][st]; if (m >= 2 && L >= 0) mnote(t, root + 24 + L, d * 2, 'square', .02);
  } },
  battleC: { bpm: 128, len: 64, play(s, t, d, m) { // heavy D minor: Dm, Bb, C, A
    const bar = s >> 4, st = s & 15, root = [38, 34, 36, 33][bar], tri = [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]][bar];
    if (st % 4 === 0 || st === 14) mdrum(t, 'kick'); if (m >= 1 && (st === 4 || st === 12)) mdrum(t, 'snare'); if (m >= 1 && st % 2 === 1) mdrum(t, 'hat');
    if (st % 4 === 0 || st % 4 === 3) mnote(t, root - 12 + (st > 7 ? 7 : 0), d * 2.4, 'sawtooth', .03);
    mnote(t, root + 12 + tri[st % 3] + (st % 8 > 3 ? 12 : 0), d * .9, 'square', .01);
    const L = [0, -1, 3, -1, 7, -1, 3, -1, 5, -1, 8, -1, 7, -1, -1, -1][st]; if (m >= 2 && L >= 0) mnote(t, root + 24 + L, d * 2.2, 'square', .02);
  } },
};
function jingle(win) { // a short fanfare when the match ends
  const a = audio(); if (!a || muted || !musicOn) return; const bus = musBus(); if (!bus) return;
  const t0 = a.currentTime + .1, notes = win ? [[72, 0], [76, .14], [79, .28], [84, .44], [79, .64], [84, .78]] : [[67, 0], [64, .22], [60, .44], [55, .78]];
  MUS.hold = t0 + (win ? 2.6 : 2.4); MUS.cur = null; bus.gain.cancelScheduledValues(a.currentTime); bus.gain.setValueAtTime(MUS.vol * VOL.mus, a.currentTime); MUS.tg = MUS.vol * VOL.mus;
  for (const [m, at] of notes) { mnote(t0 + at, m, win ? .3 : .5, 'square', .04); mnote(t0 + at, m - 12, win ? .3 : .5, 'triangle', .04); }
}
let bgHold = false; // while the app is in the background nothing may play: both music engines restart themselves from their 50 ms timers
function setBg(on) { bgHold = on; try { if (on) { if (musEl.a) musEl.a.pause(); if (ac && ac.state === 'running') ac.suspend(); } else if (ac && ac.state === 'suspended') ac.resume(); } catch (e) { } }
document.addEventListener('visibilitychange', () => setBg(document.hidden)); addEventListener('pagehide', () => setBg(true)); window.__bg = setBg;
function wantTrack() {
  if (muted || !musicOn) return null;
  if (state === 'menu' || state === 'over') return 'menu';
  if (state === 'intro' || state === 'fight' || state === 'ko' || state === 'pause') return MUS.fileOn ? null : MUS.battle;
  return null;
}
function musTick() {
  const a = ac; if (!a || bgHold) return; if (a.state === 'suspended') { try { a.resume(); } catch (e) { } } if (a.state !== 'running') return;
  const bus = musBus(); if (!bus || a.currentTime < MUS.hold) return;
  const want = wantTrack(), n0 = a.currentTime, target = want ? MUS.vol * VOL.mus * (state === 'pause' ? .4 : 1) : 0;
  if (MUS.tg !== target) { MUS.tg = target; bus.gain.setTargetAtTime(target, n0, .3); }
  if (want !== MUS.cur) { MUS.cur = want; MUS.step = 0; MUS.next = n0 + .12; }
  if (!want) return;
  if (MUS.next < n0 - .5) MUS.next = n0 + .05; // after a stall (hidden tab) restart instead of playing the backlog
  const tr = TRACKS[want], d = 60 / tr.bpm / 4, lo = P ? Math.min(P.hp / P.maxhp, E.hp / E.maxhp) : 1, m = state === 'fight' ? (lo < .3 ? 2 : 1) : 0;
  while (MUS.next < n0 + .3) { tr.play(MUS.step % tr.len, MUS.next, d, m); MUS.next += d; MUS.step++; }
}
// real tracks (assets/music, compressed mp3): one per match, chosen at random unless a track is picked in settings
const MUSIC = [{ n: 'Johto Trainer', f: 'hgss-johto-trainer.mp3' }, { n: 'Black/White Rival', f: 'bw-rival.mp3' }, { n: 'Black 2/White 2 Rival', f: 'bw2-rival.mp3' }, { n: 'X/Y Rival', f: 'xy-rival.mp3' }, { n: 'Sun/Moon Trainer', f: 'sm-trainer.mp3' }, { n: 'Colosseum Battle', f: 'xd-miror-b.mp3' }, { n: 'ORAS Rival', f: 'oras-rival.mp3' }];
const FILE_VOL = .3; let musSel = 'random'; try { const s = localStorage.getItem('pf_track'); if (s === 'random' || s === 'synth' || (s !== null && MUSIC[+s])) musSel = s; } catch (e) { }
const musEl = { a: null, cur: -1, idx: -1, last: -1, vol: 0 };
function pickMusic() { if (musSel === 'synth') return -1; if (musSel === 'random') { let i; do i = Math.floor(Math.random() * MUSIC.length); while (MUSIC.length > 1 && i === musEl.last); return i; } return +musSel; }
const trackName = () => musSel === 'random' ? 'Random' : musSel === 'synth' ? 'Chiptune' : MUSIC[+musSel].n;
function cycleTrack() { const order = ['random', ...MUSIC.map((_, i) => String(i)), 'synth']; musSel = order[(order.indexOf(musSel) + 1) % order.length]; try { localStorage.setItem('pf_track', musSel); } catch (e) { } if (MUS.inB) { musEl.idx = pickMusic(); musEl.last = musEl.idx; } refreshPause(); }
function fileTick() {
  if (bgHold) return;
  const battle = musicOn && !muted && (state === 'intro' || state === 'fight' || state === 'ko' || state === 'pause');
  if (battle && !MUS.inB) { MUS.inB = true; musEl.idx = pickMusic(); musEl.last = musEl.idx; } else if (!battle) MUS.inB = false;
  MUS.fileOn = battle && musEl.idx >= 0; const fi = MUS.fileOn ? musEl.idx : -1, target = fi >= 0 ? FILE_VOL * VOL.mus * (state === 'pause' ? .4 : 1) : 0;
  if (fi >= 0 && musEl.cur !== fi) { if (musEl.a) musEl.a.pause(); const a = new Audio('assets/music/' + MUSIC[fi].f); a.loop = true; a.volume = 0; musEl.a = a; musEl.cur = fi; musEl.vol = 0; }
  const a = musEl.a; if (!a) return; musEl.vol += (target - musEl.vol) * .12; a.volume = clamp(musEl.vol, 0, 1);
  if (fi >= 0 && a.paused) { const p = a.play(); if (p && p.catch) p.catch(() => { }); } else if (fi < 0 && musEl.vol < .01 && !a.paused) { a.pause(); musEl.cur = -1; }
}
setInterval(musTick, 50); setInterval(fileTick, 50);
let muted = false; try { muted = localStorage.getItem('pf_mute') === '1'; } catch (e) { }
// volume sliders (70 = the loudness the game always had) and the gameplay multipliers of the settings screen
let volMus = 70, volFx = 70; const VOL = { mus: 1, fx: 1 }, GM = { dmg: 1, sta: 1, ki: 1 };
try { const a = localStorage.getItem('pf_vmus'), b = localStorage.getItem('pf_vfx'); if (a !== null && +a >= 0 && +a <= 100) volMus = +a; if (b !== null && +b >= 0 && +b <= 100) volFx = +b; const g = (localStorage.getItem('pf_gm') || '').split(',').map(Number); if (g.length === 3 && g.every(v => v >= .5 && v <= 3)) { GM.dmg = g[0]; GM.sta = g[1]; GM.ki = g[2]; } } catch (e) { }
const applyVol = () => { VOL.mus = volMus / 70; VOL.fx = volFx / 70; }; applyVol();

// ---------------------------------------------------------------- arenas (Pokémon Showdown backgrounds plus a pixel desert drawn in code)
const THEMES = [
  { id: 'champion', name: "Champion's Arena", file: 'champion.jpg' }, { id: 'ranch', name: 'Ranch Paddock', file: 'ranch.jpg' }, { id: 'crystalcave', name: 'Crystal Cavern', file: 'crystalcave.jpg' }, { id: 'magmacrater', name: 'Magma Crater', file: 'magmacrater.jpg' },
  { id: 'palmcove', name: 'Palm Cove', file: 'palmcove.jpg' }, { id: 'plaza', name: 'Fountain Square', file: 'plaza.jpg' }, { id: 'pokeball', name: 'Pok\u00e9ball Stadium', file: 'pokeball.jpg' }, { id: 'frozenlake', name: 'Frozen Lake', file: 'frozenlake.jpg' },
  { id: 'cliffs', name: 'Waterfall Cliffs', file: 'cliffs.jpg' }, { id: 'ruins', name: 'Moonlit Ruins', file: 'ruins.jpg' }, { id: 'glade', name: 'Sunny Glade', file: 'glade.jpg' },
  { id: 'shrine', name: 'Shrine Falls', file: 'shrine.jpg' }, { id: 'lab', name: 'Neon Lab', file: 'lab.jpg' }, { id: 'redcanyon', name: 'Red Canyon Gate', file: 'redcanyon.jpg' },
  { id: 'desert', name: 'Wasteland (DBZ)', proc: true }, { id: 'stadium', name: 'Stadium', file: 'skypillar.jpg' }, { id: 'meadow', name: 'Meadow', file: 'meadow.jpg' },
  { id: 'forest', name: 'Forest', file: 'forest.jpg' }, { id: 'beach', name: 'Beach', file: 'beach.jpg' }, { id: 'city', name: 'City Plaza', file: 'city.jpg' },
  { id: 'night', name: 'Night City', file: 'darkcity.jpg' }, { id: 'ice', name: 'Ice Cave', file: 'icecave.jpg' }, { id: 'volcano', name: 'Volcano', file: 'volcanocave.png' },
  { id: 'cave', name: 'Cave', file: 'earthycave.jpg' }, { id: 'sea', name: 'Deep Sea', file: 'deepsea.jpg' }, { id: 'storm', name: 'Thunder Plains', file: 'thunderplains.png' },
  { id: 'water', name: 'Water Arena', file: 'leaderwallace.jpg' }, { id: 'canyon', name: 'Canyon', file: 'desert.jpg' }
];
let procBg = null, curBg = null, curTheme = THEMES[0];
const bgCtx = $('bg').getContext('2d');
let bgTier = 0, bgCam = -1e9, bgAt = 0, bgDirty = true;
function setBgExt(t) { if (t === bgTier) return; bgTier = t; const [mx, mt, mb, s] = BGT[t], c = $('bg'); c.width = Math.round((W + 2 * mx) * s); c.height = Math.round((H + mt + mb) * s); c.style.width = W + 2 * mx + 'px'; c.style.height = H + mt + mb + 'px'; c.style.left = -mx + 'px'; c.style.top = -mt + 'px'; bgDirty = true; }
function rng(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function makeProcBackground() {
  const c = document.createElement('canvas'); c.width = 320; c.height = 160; const g = c.getContext('2d'), r = rng(11), horizon = 76;
  const sky = ['#5f3030', '#6e3a34', '#7e4538', '#905238', '#a8603c', '#c07344', '#d98a50', '#ea9f5a', '#f2b06a'];
  for (let y = 0; y < horizon; y++) { g.fillStyle = sky[Math.min(sky.length - 1, Math.floor(y / horizon * sky.length))]; g.fillRect(0, y, 320, 1); }
  for (let i = 0; i < 46; i++) { const y = Math.floor(r() * 62), x = Math.floor(r() * 320), w = 18 + Math.floor(r() * 80); g.fillStyle = r() < .55 ? 'rgba(80,32,34,.4)' : 'rgba(255,190,130,.2)'; g.fillRect(x, y, w, 1 + Math.floor(r() * 3)); }
  const mesa = (x, w, h, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x, horizon); g.lineTo(x + 5, horizon - h); g.lineTo(x + w - 5, horizon - h); g.lineTo(x + w, horizon); g.fill(); };
  mesa(10, 60, 22, '#b86a40'); mesa(95, 90, 14, '#c27846'); mesa(205, 50, 28, '#b06238'); mesa(262, 70, 16, '#c27846');
  for (let y = horizon; y < 160; y++) { const t = (y - horizon) / (160 - horizon); g.fillStyle = `rgb(${Math.floor(214 + 26 * t)},${Math.floor(152 + 36 * t)},${Math.floor(76 + 30 * t)})`; g.fillRect(0, y, 320, 1); }
  for (let i = 0; i < 360; i++) { const x = Math.floor(r() * 320), y = horizon + 2 + Math.floor(r() * (160 - horizon - 2)), w = 1 + Math.floor(r() * 4); g.fillStyle = ['#c0803a', '#f5cb84', '#aa6c2c', '#e9b566'][Math.floor(r() * 4)]; g.fillRect(x, y, w, 1); }
  const shrub = (x, y) => { g.fillStyle = '#6f7d54'; g.fillRect(x, y - 4, 10, 4); g.fillRect(x + 2, y - 6, 6, 2); g.fillStyle = '#8f9c6a'; g.fillRect(x + 1, y - 5, 4, 1); g.fillStyle = '#7a4a28'; g.fillRect(x + 6, y, 6, 2); };
  [[40, 150], [140, 118], [224, 140], [270, 112], [92, 108]].forEach(p => shrub(p[0], p[1]));
  const big = document.createElement('canvas'); big.width = 960; big.height = 480; const bg = big.getContext('2d'); bg.imageSmoothingEnabled = false; bg.drawImage(c, 0, 0, 960, 480);
  return big;
}
procBg = makeProcBackground();
function setTheme(t) {
  curTheme = t; makeProps(); bgDirty = true;
  if (t.proc) { curBg = procBg; return; }
  const im = new Image(); im.onload = () => { if (curTheme === t) { curBg = im; bgDirty = true; } }; im.src = 'assets/bg/' + t.file; curBg = procBg;
}
// scenery that scrolls with the ground and in front of it, so crossing the long arena is visible
let props = [], rainFx = false;
// every map gets small rocks tinted from its own ground colour (measured from the background just under the fighters); maps with grass keep grass tufts among them
const GROUND_COL = { champion: '#e7ad6a', ranch: '#8ac14d', crystalcave: '#5d4c53', magmacrater: '#5b3642', palmcove: '#f8d19a', plaza: '#b5a4b9', pokeball: '#f4bf6c', frozenlake: '#73bdfa', cliffs: '#b69b80', ruins: '#364fac', glade: '#9fb83e', shrine: '#f7d194', lab: '#66a8ea', redcanyon: '#f5c27d', desert: '#e2a85a', stadium: '#f9e5d2', meadow: '#ead990', forest: '#83a75c', beach: '#fdefb9', city: '#b4b5b0', night: '#6f70ad', ice: '#e5e5e5', volcano: '#cb7e6b', cave: '#8a532b', sea: '#1b3a66', storm: '#c3b380', water: '#c3f5f6', canyon: '#cf8c4b' };
const TUFT_MAPS = new Set(['ranch', 'palmcove', 'ruins', 'glade', 'meadow', 'forest', 'beach']);
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)), rgbHex = a => '#' + a.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
const darken = (h, k) => rgbHex(hexRgb(h).map(v => v * (1 - k))), lighten = (h, k) => rgbHex(hexRgb(h).map(v => v + (255 - v) * k));
function makeProps() { const r = rng(7), kinds = TUFT_MAPS.has(curTheme.id) ? ['tuft', 'tuft', 'rock'] : ['rock']; props = []; for (let i = 0; i < 70; i++) props.push({ x: r() * WORLD_W, f: r() * 1400, s: .6 + r() * .9, k: r(), kind: kinds[Math.floor(r() * kinds.length)] }); }
function drawProp(g, p, x, y, front) {
  const s = p.s * (front ? 1.8 : 1);
  g.save(); g.translate(x, y);
  if (p.kind === 'tuft') { g.fillStyle = front ? '#1f4a22' : '#3a7a2e'; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 5 * s, 0); g.quadraticCurveTo(i * 7 * s, -22 * s, i * 9 * s + (i % 2) * 6, -(26 + (i % 3) * 8) * s); g.quadraticCurveTo(i * 5 * s + 4, -14 * s, i * 5 * s + 6, 0); g.fill(); } }
  else if (p.kind === 'rock') { const gc = GROUND_COL[curTheme.id] || '#8a7a60', s2 = p.s * (front ? 1.5 : .9), base = darken(gc, front ? .58 : .38), v = Math.floor(p.k * 3); g.scale(s2, s2);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(0, 1, 24, 4, 0, 0, 6.283); g.fill(); g.fillStyle = base; g.beginPath();
    if (v === 0) { g.moveTo(-20, 0); g.quadraticCurveTo(-22, -12, -10, -17); g.quadraticCurveTo(2, -22, 14, -14); g.quadraticCurveTo(24, -8, 22, 0); } else if (v === 1) { g.moveTo(-14, 0); g.quadraticCurveTo(-16, -10, -6, -13); g.quadraticCurveTo(6, -16, 14, -8); g.quadraticCurveTo(18, -4, 16, 0); } else { g.moveTo(-26, 0); g.quadraticCurveTo(-28, -9, -16, -12); g.quadraticCurveTo(-8, -14, -2, -10); g.quadraticCurveTo(4, -20, 16, -16); g.quadraticCurveTo(28, -12, 26, 0); }
    g.closePath(); g.fill(); g.fillStyle = darken(base, .25); g.beginPath(); g.moveTo(4, -2); g.quadraticCurveTo(12, -8, 20, -6); g.lineTo(20, 0); g.lineTo(4, 0); g.fill(); g.globalAlpha = .55; g.fillStyle = lighten(base, .22); g.beginPath(); g.ellipse(-6, -13, 8, 3, -.2, 0, 6.283); g.fill(); }
  else if (p.kind === 'shard') { g.fillStyle = front ? 'rgba(150,215,255,.55)' : 'rgba(190,235,255,.7)'; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 12 * s - 7 * s, 0); g.lineTo(i * 12 * s, -(30 + (i + 1) * 12) * s); g.lineTo(i * 12 * s + 7 * s, 0); g.fill(); } }
  else if (p.kind === 'lamp') { g.fillStyle = front ? '#14141c' : '#2a2a38'; g.fillRect(-2 * s, -95 * s, 4 * s, 95 * s); g.fillRect(-12 * s, -97 * s, 24 * s, 5 * s); g.fillStyle = 'rgba(255,230,150,.9)'; g.globalCompositeOperation = 'lighter'; circ(g, 0, -88 * s, 7 * s); g.fillStyle = tod === 'day' ? 'rgba(255,230,150,.18)' : 'rgba(255,230,150,.34)'; circ(g, 0, -88 * s, (tod === 'day' ? 34 : 60) * s); }
  else if (p.kind === 'bubble') { g.strokeStyle = 'rgba(220,245,255,.7)'; g.lineWidth = 2; const yy = -((now * 30 * p.s + p.k * 300) % 200); g.beginPath(); g.arc(Math.sin(now + p.k * 9) * 10, yy, (4 + p.k * 5) * s, 0, 6.283); g.stroke(); }
  g.restore();
}
function drawGroundProps(g) {
  g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 2; g.beginPath(); const x0 = Math.floor(camX / 130) * 130; for (let x = x0; x < camX + W + 130; x += 130) { g.moveTo(x, GROUND + 6); g.lineTo(x - 36, H); } g.stroke();
  for (const p of props) if (p.x > camX - 80 && p.x < camX + W + 80 && p.kind !== 'tile') drawProp(g, p, p.x, GROUND + 6 + (p.k * 14), false);
}
function drawFrontProps(g) {
  let n = 0; for (const p of props) { if (n >= 8 || p.kind === 'tile' || p.kind === 'lamp') continue; const sx = (((p.f - camX * 1.45) % 1400) + 1400) % 1400 - 220; if (sx > W + 120) continue; n++; drawProp(g, p, sx + camX, H + 6 - p.k * 8, true); }
}
function drawBg(camX) {
  const g = bgCtx, img = curBg || procBg;
  const need = camZ >= .96 ? 0 : camZ >= .64 ? 1 : 2; let tier = bgTier;
  if (need > tier) tier = need; else if (need < tier && camZ > (tier === 2 ? .68 : .995)) tier = need; // a little hysteresis so it doesn't flip back and forth
  setBgExt(tier);
  if (!bgDirty && Math.abs(camX - bgCam) < .75 && now - bgAt < .12) return; // the background only needs redrawing when the camera moved
  bgCam = camX; bgAt = now; bgDirty = false;
  const [mx, mt, mb, bs] = BGT[bgTier];
  g.setTransform(bs, 0, 0, bs, mx * bs, mt * bs); g.clearRect(-mx, -mt, W + 2 * mx, H + mt + mb);
  g.imageSmoothingEnabled = img !== procBg;
  const w = Math.round(img.width * H / img.height), off = Math.floor(camX * .55);
  for (let i = Math.floor((off - mx) / w); i * w - off < W + mx; i++) {
    const x = i * w - off, flip = ((i % 2) + 2) % 2;
    g.save(); if (flip) { g.translate(x + w, 0); g.scale(-1, 1); } else g.translate(x, 0);
    g.drawImage(img, 0, 0, w, H);
    if (mt) { g.drawImage(img, 0, 0, img.width, 1, 0, -mt, w, mt); g.drawImage(img, 0, img.height - 1, img.width, 1, 0, H, w, mb); } // stretch the top and bottom rows so sky and ground continue
    g.restore();
  }
  const sh = g.createLinearGradient(0, H - 130, 0, H); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.28)'); g.fillStyle = sh; g.fillRect(-mx, H - 130, W + 2 * mx, 130); if (mb) { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(-mx, H, W + 2 * mx, mb); }
  if (!lowQ) drawClouds(g);
}

// ---------------------------------------------------------------- state
const keys = {}, pulse = {}, held = {}, joy = { l: false, r: false, d: false };
const DIFF = { Easy: { think: .75, block: .22, ult: .1, dmg: .7, hp: .9, speed: .8 }, Normal: { think: .5, block: .45, ult: .2, dmg: 1, hp: 1.05, speed: 1 }, Hard: { think: .3, block: .7, ult: .35, dmg: 1.2, hp: 1.3, speed: 1.15 } };
DIFF.Easy.ans = .5; DIFF.Easy.lag = [.5, .8]; DIFF.Normal.ans = .7; DIFF.Normal.lag = [.3, .6]; DIFF.Hard.ans = .7; DIFF.Hard.lag = [.1, .4]; // chance the AI answers your beam with its own, and how long it takes to react
let state = 'menu', selYou = 1, selRival = 6, selDiff = 'Normal', activeSlot = 'you';
let P, E, projectiles, vines, beams, waves, rocks, zones, strikes, booms, cracks, sparks, floaters, rings, puffs, pillars = [];
let shake = 0, freeze = 0, now = 0, matchTime = 99, introT = 0, overT = 0, winner = null, last = 0, camX = 0, flashT = 0, flashCol = '255,255,255', cine = null, btnCost = {}, slowT = 0, camZ = 1, punch = 0, weather = null, decals = [], washA = 0, washCol = '255,255,255';
const DASH_STA = 14;
let hazards = [], pickups = [], impacts = [], clashes = [], clashT = 0, tod = 'day', stats = { dealt: 0, taken: 0, combo: 0, parry: 0 }, hzT = 5, pkT = 12, pkDone = false, practice = false, lab = false, labId = 25, labAb = 'own', labSel = null, labFlip = 0, dummyMode = 0, cur = null, rounds = { a: 0, b: 0, n: 1 }, bestOf = 3, inputLog = [];
try { const v = +localStorage.getItem('pf_rounds'); if (v === 1 || v === 3) bestOf = v; } catch (e) { }
const fxb = $('fxb').getContext('2d'), fxf = $('fxf').getContext('2d');
const q = new URLSearchParams(location.search), demoUrl = q.has('demo'); let demo = demoUrl; // demo: both fighters are AI (?demo=1, or the Watch AI Fight button)
const dexById = id => POKEDEX[id - 1];
const other = f => f === P ? E : P;
// online 1v1 (net.js fills this in): lockstep, both devices run the same simulation from the same inputs
const NETG = { on: false, role: '', lobby: false, names: ['', ''], inP: {}, inE: {}, vr: Math.random /* the real random generator, for looks and sound only */, rngOn() { }, rngOff() { }, ready() { }, frame() { }, rematch() { }, leave() { }, refresh() { } };
const meF = () => NETG.on && NETG.role === 'guest' ? E : P; // the fighter this device controls
const LANE_PX = 26, DMG_SCALE = .78, laneY = f => f.lp * LANE_PX;
const WALL_L = WORLD_W / 2 - 1500, WALL_R = WORLD_W / 2 + 1500; // the arena has edges: heavy hits bounce off them
const ALT_H = [0, 50, 100, 150]; // altitudes a flyer can hold; the camera zooms out as it climbs
const maxAlt = () => lowQ ? 2 : ALT_H.length - 1;
const isFly = f => f.hover && (f.air || f.lift > 12); // a flyer that is up in the air rather than standing on the ground
// lane-step dodge: light, fast Pokémon get a longer dodge window, a shorter cooldown and a quicker step
const grabOdds = (f, o) => { const pw = x => x.p.hp + x.p.atk + x.p.def + x.p.spa + x.p.spd + x.p.spe, s = .5 * clamp(Math.log2(pw(f) / pw(o)), -1, 1) + .5 * clamp(Math.log2(Math.max(1, f.p.w) / Math.max(1, o.p.w)) / 2, -1, 1); return clamp(.5 + .2 * s, .3, .7); }; // 50% even, up to 70% when stronger and heavier
const evadeStats = f => { const agi = clamp((f.kit.speed - 255) / 145, 0, 1), lite = clamp(1 - Math.log10(Math.max(1, f.p.w)) / 3, 0, 1), k = .6 * agi + .4 * lite; return { win: .15 + .2 * k, cool: .7 - .45 * k, rate: .8 + .7 * k }; };
const ABILITIES = {
  fire: { name: 'Blaze', boost: 1 }, water: { name: 'Torrent', boost: 1 }, grass: { name: 'Overgrow', boost: 1 }, bug: { name: 'Swarm', boost: 1 },
  electric: { name: 'Static', contact: 'slow' }, poison: { name: 'Poison Point', contact: 'poison' }, ghost: { name: 'Cursed Body', contact: 'confuse' },
  ground: { name: 'Sturdy', sturdy: 1 }, rock: { name: 'Sturdy', sturdy: 1 }, psychic: { name: 'Inner Focus', focus: 1 }, fighting: { name: 'Inner Focus', focus: 1 },
  normal: { name: 'Guts', guts: 1 }, dragon: { name: 'Multiscale', multi: 1 }, ice: { name: 'Ice Body', regen: 1 }, flying: { name: 'Gale Wings', gale: 1 },
  dark: { name: 'Intimidate', intim: 1 }, steel: { name: 'Sturdy', sturdy: 1 }, fairy: { name: 'Cute Charm', contact: 'confuse' },
};
// each Pokémon's own PokeAPI ability (data/abilities.js) is mapped to one of these effects; anything unmapped falls back to its type's ability above
const ABIL_FX = {
  overgrow: { boost: 1 }, blaze: { boost: 1 }, torrent: { boost: 1 }, swarm: { boost: 1 },
  static: { contact: 'slow' }, 'poison-point': { contact: 'poison' }, 'effect-spore': { contact: 'sleep' }, 'cute-charm': { contact: 'confuse' }, 'flame-body': { contact: 'burn' }, 'cursed-body': { contact: 'confuse' }, stench: { contact: 'poison' },
  'rock-head': { armor: .9 }, 'shell-armor': { armor: .88, nocrit: 1 }, 'battle-armor': { armor: .88, nocrit: 1 }, damp: { armor: .92 }, 'hyper-cutter': { atk: 1.12 },
  'inner-focus': { focus: 1 }, 'own-tempo': { focus: 1 }, oblivious: { focus: 1 }, insomnia: { immune: ['sleep'] }, 'vital-spirit': { immune: ['sleep'] }, immunity: { immune: ['poison'] }, limber: { immune: ['slow'] }, 'water-veil': { immune: ['burn'] }, 'magma-armor': { immune: ['freeze'] },
  guts: { guts: 1 }, multiscale: { multi: 1 }, 'thick-fat': { resist: ['fire', 'ice'] }, 'marvel-scale': { scale: 1 }, 'shield-dust': { dust: 1 },
  'natural-cure': { cure: .5 }, 'shed-skin': { cure: .3 }, 'ice-body': { regen: 1 }, pickup: { regen: 1 },
  intimidate: { intim: 1 }, levitate: { levi: 1 }, trace: { trace: 1 }, pressure: { pressure: 1 }, synchronize: { sync: 1 },
  'water-absorb': { absorb: 'water' }, 'dry-skin': { absorb: 'water' }, 'volt-absorb': { absorb: 'electric' }, 'lightning-rod': { absorb: 'electric' }, 'flash-fire': { absorb: 'fire' },
  'swift-swim': { wx: 'rain' }, chlorophyll: { wx: 'sun' }, 'sand-veil': { wx: 'sand' },
  'compound-eyes': { crit: .16 }, 'keen-eye': { crit: .12 }, illuminate: { crit: .1 }, 'serene-grace': { serene: 1 },
  'early-bird': { early: 1 }, 'run-away': { gale: 1 }, 'arena-trap': { trap: 1 }, 'magnet-pull': { trap: 1 },
  'clear-body': { nodebuff: 1 }, soundproof: { nodebuff: 1 },
  'pure-power': { atk: 1.15 }, 'wonder-guard': { armor: .85 }, 'liquid-ooze': { contact: 'poison' }, truant: { atk: 1.1 }, plus: { crit: .1 }, minus: { crit: .1 }, 'white-smoke': { nodebuff: 1 }, 'air-lock': { nodebuff: 1 }, forecast: { crit: .1 }, 'color-change': { armor: .92 }, drizzle: { wx: 'rain' }, drought: { wx: 'sun' },
  sturdy: { sturdy: 1 }, hustle: { atk: 1.12 }, 'suction-cups': { armor: .92 }, 'shadow-tag': { trap: 1 }, 'speed-boost': { gale: 1 }, 'sand-stream': { wx: 'sand' }, 'rough-skin': { contact: 'poison' }, 'poison-touch': { contact: 'poison' }, 'sheer-force': { atk: 1.12 },
};
const prettyAb = s => s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
function abilityFor(types, id) {
  const slug = typeof ABIL_OF !== 'undefined' && ABIL_OF[id], fx = slug && ABIL_FX[slug];
  if (fx) return { name: prettyAb(slug), ...fx };
  return ABILITIES[types[0]] || ABILITIES.normal;
}
// AI personalities scale how often each choice is picked; the AI also watches what the player does and adapts (more on Hard)
const PERSONA_W = {
  aggressive: { melee: 1.5, grab: 1.3, approach: 1.6, retreat: .5, guard: .5, special: 1.2, special2: 1.2, special3: 1.2, ranged: .8, dash: 1.3, align: 1.2, sidestep: .6, charge: .6 },
  defensive: { melee: .9, approach: .7, retreat: 1.6, guard: 1.8, ranged: 1.5, special: .9, special2: .9, special3: .9, sidestep: 1.4, charge: 1.2, rest: 1.3, dash: .8 },
  trickster: { sidestep: 2.2, align: 1.6, dash: 1.8, jump: 1.8, special: 1.2, special2: 1.2, special3: 1.2, ranged: 1.2, guard: .7 },
};
const PERSONA_BY_TYPE = { fighting: 'aggressive', fire: 'aggressive', dragon: 'aggressive', rock: 'defensive', ground: 'defensive', water: 'defensive', normal: 'defensive', ice: 'defensive', grass: 'defensive', psychic: 'trickster', ghost: 'trickster', bug: 'trickster', electric: 'trickster', flying: 'trickster', poison: 'trickster', dark: 'trickster', steel: 'defensive', fairy: 'trickster' };
const personaFor = types => PERSONA_BY_TYPE[types[0]] || 'aggressive';
const PROJ_KEYS = new Set(['blast', 'cannon', 'volley', 'minibeam', 'wave', 'geyser', 'poison', 'sleep', 'para', 'debuff', 'drain']);
const AIM_KEYS = new Set(['blast', 'cannon', 'minibeam', 'volley', 'drain', 'debuff', 'slash']);
const CANCEL_KEYS = new Set(['dash', 'slash', 'combo', 'leap']); // quick specials that can be followed up
const statusy = f => f.sleepT > 0 || f.freezeT > 0 || f.poisonT > 0 || f.burnT > 0 || f.confT > 0;
const STATUS_ON_HIT = { fire: ['burn', .18], ice: ['freeze', .1], electric: ['slow', .2], poison: ['poison', .22], psychic: ['confuse', .15], ghost: ['confuse', .15], dark: ['confuse', .12], fairy: ['confuse', .12] };
const STATUS_TXT = { freeze: ['FROZEN!', '#bfeaff'], sleep: ['ASLEEP!', '#e2b8ff'], poison: ['POISONED!', '#c060ff'], slow: ['PARALYZED!', '#ffe01a'], burn: ['BURNED!', '#ff8a3a'], confuse: ['CONFUSED!', '#ff7ae6'] };
// stand-in attacker for arena hazards
const HAZ = { mult: 1, debT: 0, isAI: false, kit: { types: [] }, ki: 0, face: 1, x: 0, hitT: 0, act: null, vx: 0, kvx: 0, cbN: 0, cbT: -9, cbD: 0, sta: 0, lp: 0, hazard: true, ability: {} };
const body = f => ({ x1: f.x - f.w * .34, x2: f.x + f.w * .34, y1: GROUND + laneY(f) - f.z - f.lift - f.h * .95 * (1 - .42 * (f.duck || 0)), y2: GROUND + laneY(f) - f.z - f.lift });
const muzzle = f => ({ x: f.x + f.face * f.w * .45, y: GROUND + laneY(f) - f.z - f.lift - f.h * .55 });
const aimA = (m, o) => { const c = center(o); return clamp(Math.atan2(c.y - m.y, Math.max(60, Math.abs(c.x - m.x))), -1.35, 1.35); }; // angle from the muzzle up or down to the target
const center = f => { const b = body(f); return { x: (b.x1 + b.x2) / 2, y: (b.y1 + b.y2) / 2 }; };
// three sprite styles: 'pmd' action sprites (PMD SpriteCollab: walk, attack, shoot, charge, hurt...), 'bw' Gen 3-5 pixel poses, 'xy' 3D standing models
let spriteStyle = 'bw'; try { const s = localStorage.getItem('pf_sprite2'); if (s === 'xy' || s === 'bw' || s === 'pmd') spriteStyle = s; } catch (e) { }
const stillUrl = p => `assets/pose/hg/${p.name}.png`; // menu cards show a still sprite; only the chosen fighters animate
const STAND_FRONT = new Set([67]); // Machoke's animated front sprite crouches, so its HGSS standing pose is the idle instead
const spriteUrl = p => spriteStyle === 'xy' ? `assets/ani/${p.name}.gif` : STAND_FRONT.has(p.id) ? `assets/pose/hg/${p.name}.png` : `assets/front/${p.name}.gif`;
const loadImg = url => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(im); im.src = url; });
// front: idle/walk (BW animated) - back: strikes and charging (BW animated) - atk: ranged, specials, jumps (Platinum) - hurt: hit (Emerald) - down: knocked down (Platinum back)
const POSE_ORIENT = { front: -1, atk: -1, hurt: -1, back: 1, fly: -1, hg: -1, fr: -1, hgb: 1, frb: 1 }; // -1 = sprite looks left, 1 = looks right
const POSE_K = { front: 1, back: 1, atk: 1, hurt: .96, fly: 1, hg: 1, fr: 1, hgb: 1, frb: 1 };
const FLY_POSE = new Set([6, 16, 18, 83, 123, 149]); // flyers whose 2D front sprite stands: another game's sprite of them in the air is used while they hover
const ANIM2D = !q.has('noanim'); // ?noanim=1 shows the old look (looping GIFs, no tweening) for comparison
const poseUrls = p => spriteStyle === 'xy' ? { front: spriteUrl(p) } : { front: spriteUrl(p), back: `assets/pose/back/${p.name}.gif`, atk: `assets/pose/p4/${p.name}.png`, hurt: `assets/pose/p3/${p.name}.png`, hg: `assets/pose/hg/${p.name}.png`, hgb: `assets/pose/hgb/${p.name}.png`, fr: `assets/pose/${p.id > 151 ? 'hg' : 'fr'}/${p.name}.png`, frb: `assets/pose/${p.id > 151 ? 'hgb' : 'frb'}/${p.name}.png`, ...(FLY_POSE.has(p.id) ? { fly: `assets/pose/fly/${p.name}.png` } : {}) };
async function loadPoses(p) {
  const urls = poseUrls(p), imgs = {}; await Promise.all(Object.keys(urls).map(async k => { imgs[k] = await loadImg(urls[k]); }));
  if (spriteStyle === 'xy' && !imgs.front.naturalWidth) { const keep = spriteStyle; spriteStyle = 'bw'; const s2 = await loadPoses(p); spriteStyle = keep; return s2; } // no 3D model: use the 2D poses
  let anim = null; // the Black/White animations as frame sheets, so they can follow the action
  if (ANIM2D && spriteStyle === 'bw' && typeof BWA !== 'undefined' && BWA[p.id] && !STAND_FRONT.has(p.id)) { anim = {}; await Promise.all(['front', 'back'].map(async k => { anim[k] = { info: BWA[p.id][k], img: await loadImg(`assets/bwa/${p.name}_${k}.png`) }; })); }
  return { urls, imgs, anim };
}
async function loadSet(p) {
  const info = typeof PMD !== 'undefined' && PMD[p.id];
  if (spriteStyle !== 'pmd' || !info || !(info.Idle || info.Walk)) { const keep = spriteStyle; if (keep === 'pmd') spriteStyle = 'bw'; const s = await loadPoses(p); spriteStyle = keep; return s; }
  const imgs = {}; await Promise.all(Object.keys(info).map(async n => { imgs[n] = await loadImg(`assets/pmd/${p.id}_${n}.png`); }));
  return { pmd: { info, imgs } };
}
const frameAt = (d, p) => { let t = clamp(p, 0, .9999) * d.reduce((a, b) => a + b, 0), i = 0; while (i < d.length - 1 && t >= d[i]) { t -= d[i]; i++; } return i; };
const frameLoop = (d, sec) => { const tot = d.reduce((a, b) => a + b, 0); let t = (sec * 60) % tot, i = 0; while (i < d.length - 1 && t >= d[i]) { t -= d[i]; i++; } return i; };
// which PMD animations each special plays (first one the Pokémon has wins)
const ANIM_OF = { strike: ['Charge'], blast: ['Charge', 'Shoot'], cannon: ['Charge', 'Shoot'], volley: ['Shoot'], geyser: ['Swing'], wave: ['Swing'], quake: ['Hop'], swoop: ['Hop'], dig: ['Hop'], leap: ['Hop'], combo: ['Double', 'Attack'], slash: ['Swing'], dash: ['Attack'], vine: ['Swing'], rain: ['Charge'], blizzard: ['Charge'], ring: ['Swing'], tornado: ['Swing'], sleep: ['Shoot'], poison: ['Shoot'], para: ['Shoot'], selfdestruct: ['Charge'], heal: ['Charge'], buff: ['Charge'], shield: ['Charge'], minibeam: ['Shoot', 'Charge'], drain: ['Shoot'], debuff: ['Shoot', 'Swing'], counter: ['Charge'], metronome: ['Swing'], spin: ['Hop', 'Charge'], whirl: ['Swing'], boulder: ['Charge'], roots: ['Charge'], spikes: ['Charge'], bloom: ['Hop'] };

// flying and ghost types (and a few floaters) hover above the ground instead of standing on it
// which three of a Pokémon's specials the player takes into a fight (chosen in the menu, remembered per Pokémon)
let loadouts = {}; try { loadouts = JSON.parse(localStorage.getItem('pf_loadouts') || '{}'); } catch (e) { }
let aiPick = {}; // the AI's three specials are rolled at random per Pokémon; the menu shows the set the next fight will use, and a new roll follows each fight start
function specsFor(p, isAI) {
  const pool = buildKit(p).pool, pick = !isAI && loadouts[p.id];
  if (pick && pick.length === Math.min(3, pool.length) && pick.every(i => pool[i])) return pick.map(i => pool[i]);
  if (isAI && pool.length > 3) {
    let r = aiPick[p.id]; if (!r || !r.every(i => pool[i])) { const ix = pool.map((_, i) => i); for (let i = ix.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ix[i], ix[j]] = [ix[j], ix[i]]; } r = aiPick[p.id] = ix.slice(0, 3); }
    return r.map(i => pool[i]);
  }
  return pool.slice(0, 3);
}
const FLOATERS = new Set(['mew', 'mewtwo', 'koffing', 'weezing', 'magnemite', 'magneton', 'unown', 'porygon2', 'celebi', 'baltoy', 'claydol', 'lunatone', 'solrock', 'chimecho', 'beldum', 'metang', 'metagross', 'castform', 'deoxys', 'latias', 'latios', 'jirachi']);
function makeFighter(p, side, isAI, hpMul, set) {
  const kit = buildKit(p), pm = set.pmd, anim = !pm && ANIM2D && set.anim || null;
  let nh, nw, scale, dh = clamp((70 + 85 * Math.sqrt(p.h)) * .92, 100, 190), boxes, pmd = null, w;
  if (pm) {
    dh *= .82; const I = pm.info.Idle || pm.info.Walk, bb = I.bb || [0, 0, I.w, I.h], s = dh / Math.max(8, bb[3] - bb[1]);
    pmd = { info: pm.info, imgs: pm.imgs, s, gy: bb[3] - I.h / 2, key: '' }; w = Math.max(40, (bb[2] - bb[0]) * s); nh = dh; boxes = { front: { w, h: dh } };
  } else {
    const im = set.imgs.front; nh = im.naturalHeight || 40; nw = im.naturalWidth || 40; scale = dh / nh; if (nw * scale > 290) { scale = 290 / nw; dh = nh * scale; }
    boxes = { front: { w: nw * scale, h: dh } }; w = nw * scale;
    for (const k in set.imgs) if (k !== 'front') { const m = set.imgs[k], mh = m.naturalHeight || 40, mw = m.naturalWidth || 40; let h = dh * POSE_K[k], s = h / mh; if (mw * s > 300) { s = 300 / mw; h = mh * s; } boxes[k] = { w: mw * s, h }; }
  }
  const hover = p.types.includes('flying') || p.types.includes('ghost') || FLOATERS.has(p.name);
  return {
    p, id: p.id, kit, side, isAI, x: WORLD_W / 2 + side * 340, z: 0, vz: 0, vx: 0, face: -side, hp: kit.hp * hpMul, maxhp: kit.hp * hpMul, ki: isAI ? 20 : 30, sta: 20, stored: 0, fullT: 0, staDelay: 0, warnT: 0, dashCool: 0, cineCool: 0, shiny: false, effAt: -9, nh,
    poses: set.urls || {}, vimg: (!pm && set.imgs && set.imgs.front) || null, boxes, pmd, curPose: 'front', popT: 0, idleT: 0, lane: 0, lp: 0, laneCool: 0, hpTrail: kit.hp * hpMul, alertT: 0, alertLen: 0, guardAge: 9, gPrev: false, comboN: 0, comboT: -9, evT: -9,
    hover, air: false, toss: 0, tossV: 0, sqT: 0, laneRate: 1, liftBase: clamp(115 - dh * .3, 55, 95), lift: 0, hitBig: false, alt: 0, dPrev: false, smash: false, grabLift: 0, carriedT: 0, slamK: 0,
    w, h: dh, act: null, hitT: 0, kvx: 0, flash: 0, guarding: false, charging: false, cool: { ranged: 0, s0: 0, s1: 0, s2: 0, beam: 0 }, mult: 1, dead: false, deadT: 0, specs: specsFor(p, isAI), shieldT: 0, counterT: 0, debT: 0,
    el: $((pmd || anim ? 'cv' : 'img') + (side < 0 ? 'A' : 'B')), anim, imgs: set.imgs, ai: { t: .6, mode: 'idle', plan: null, pulse: null, persona: personaFor(kit.types) }, inv: 0, sleepT: 0, freezeT: 0, poisonT: 0, slowT: 0, buffT: 0, fade: 1, under: false,
    walkPh: 0, landT: 0, wasAir: false, ghostT: 0, fam: Math.floor(Math.random() * 3), lv: 0, lsp: 0, bk: 0, wph: Math.random() * 6.28, wamp: .08, wrate: 12, burst: 0, wasHit: false, shown: null, shownAt: -9, turn: null, ghosts: [], dustT: 0, ability: abilityFor(kit.types, p.id), burnT: 0, confT: 0, abilOn: 0, chainQ: false, canJuggle: false, juggleN: 0, bounced: false, duck: 0,
  };
}
async function startMatch(opts) {
  tourOn = !!(opts && opts.tour); demo = demoUrl || !!(opts && opts.watch); document.body.classList.toggle('watch', demo && !demoUrl);
  const ol = opts && opts.online; if (ol) { demo = false; spriteStyle = ol.sprite; bestOf = ol.bestOf; lowQ = false; themeIdx = ol.theme; setTheme(THEMES[themeIdx]); }
  MUS.battle = ['battleA', 'battleB', 'battleC'][(selYou * 7 + selRival * 3 + (typeof themeIdx === 'number' ? themeIdx : 0)) % 3];
  const d = DIFF[selDiff]; lab = !!(opts && opts.lab); practice = lab || !!(opts && opts.practice); document.body.classList.toggle('lab', lab); dummyMode = 0; $('dummyBtn').textContent = 'DUMMY: IDLE';
  for (const id of ['title', 'menu', 'over', 'pause', 'opts', 'movesPane', 'labPane', 'tourPane', 'netPane']) $(id).classList.remove('on'); $('title').classList.remove('on'); $('opts').classList.remove('on');
  const pa = dexById(ol ? ol.pa : lab ? labId : selYou), pb = ol ? dexById(ol.pb) : lab ? pa : dexById(selRival);
  const [sa, sb] = await Promise.all([loadSet(pa), loadSet(pb)]);
  NETG.rngOn(ol && ol.seed);
  P = makeFighter(pa, -1, false, 1, sa); E = makeFighter(pb, 1, !ol, ol ? 1 : d.hp * tourHp(), sb); aiPick = {};
  if (ol) { P.specs = ol.spP.map(i => P.kit.pool[i]); E.specs = ol.spE.map(i => E.kit.pool[i]); }
  if (lab) { P.ability = labAbility(pa); E.ability = { name: '' }; E.maxhp = E.hp = E.hpTrail = 1e7; } // practise: the target is an invisible, unbreakable dummy
  cur = { pa, pb, sa, sb }; rounds = { a: 0, b: 0, n: 1 }; stats = { dealt: 0, taken: 0, combo: 0, parry: 0 }; prepFighters(); if (SPV) { const wt = []; for (const f of [P, E]) { for (const s of f.specs) if (s) wt.push(s.type); wt.push(f.kit.ranged.type, f.kit.beam.type); } SPV.warm(wt); }
  $('faceA').src = `assets/pose/hg/${pa.name}.png`; $('faceB').src = `assets/pose/hg/${pb.name}.png`; // still portraits: no animated frames to pay for
  $('nameA').innerHTML = nm(pa.name).toUpperCase() + `<small>${P.ability.name}</small>`; $('nameB').innerHTML = nm(pb.name).toUpperCase() + `<small>${E.ability.name}</small>`;
  resetField(); introT = practice ? 0 : -3.2; vsWait = !practice && !demo && !ol;
  const mf = meF(), k = mf.kit, sp = mf.specs;
  $('legend').innerHTML = `<b>J</b> ${ico(k.melee.icon)} ${k.melee.name} · <b>K</b> ${ico(k.ranged.icon)} ${k.ranged.name} · ` + sp.map((s, i) => `<b>${'LON'[i]}</b> ${ico(s.icon)} ${s.name}`).join(' · ') + ` · <b>I</b> ${ico(k.beam.icon)} ${k.beam.name} · <b>Shift</b> ${ico('run-fast')} dash · <b>U</b> ${ico('battery-charging')} charge · <b>S</b> ${ico('shield')} duck + guard · <b>G</b> ${ico('hand-back-right')} grab · <b>Q/E</b> ${ico('swap-vertical')} lane`;
  btnCost = { tackle: ['sta', k.melee.sta], leaf: ['sta', k.ranged.sta], vine: ['sta', sp[0].sta], special2: ['sta', sp[1] ? sp[1].sta : 0], special3: ['sta', sp[2] ? sp[2].sta : 0], beam: ['ki', 50], dash: ['sta', DASH_STA] };
  $('ic_tackle').innerHTML = ico(k.melee.icon); $('ic_leaf').innerHTML = ico(k.ranged.icon); $('ic_vine').innerHTML = ico(sp[0].icon); $('ic_special2').innerHTML = sp[1] ? ico(sp[1].icon) : ''; $('ic_special3').innerHTML = sp[2] ? ico(sp[2].icon) : '';
  $('ic_beam').innerHTML = ico(k.beam.icon);
  pickWeather(); pickTod(); NETG.rngOff(); updateTint(); setHudColours(); updatePips(); $('practiceUI').classList.toggle('on', practice); if (!practice) showVs(pa, pb);
  state = 'intro'; if (ol) NETG.ready();
}
function prepFighters() {
  for (const [f, id] of [[P, 'A'], [E, 'B']]) {
    $('img' + id).style.display = f.pmd || f.anim ? 'none' : ''; $('cv' + id).style.display = f.pmd || f.anim ? '' : 'none';
    if (!f.pmd && !f.anim) { f.el.src = f.poses.front; f.el.style.width = f.boxes.front.w + 'px'; f.el.style.height = f.boxes.front.h + 'px'; }
    if (f.anim) { f.curPose = 'front'; f.akey = ''; f.xf = 0; f.el.style.width = f.boxes.front.w + 'px'; f.el.style.height = f.boxes.front.h + 'px'; }
    document.querySelectorAll('canvas.wing').forEach(e => e.remove()); f.wc = null; f.wOn = false; f.kk = null; f.skw = 0; f.chromaT = 0; f.el.style.visibility = '';
    f.el.className = 'fighter'; f.el.style.clipPath = ''; f.el.style.opacity = 1; f.el.style.setProperty('--gl', f.kit.cols[1]);
  }
}
function resetField() {
  jfx = []; kick = 0; bclash = null; $('tug').classList.remove('on'); $('tapBtn').classList.remove('on'); $('bars').classList.remove('on'); tmClear(); if (SPV) SPV.reset(); for (const f of [P, E]) if (f) { f.spinT = 0; f.shockT = f.shockImm = f.shock = 0; f.shkLog = null; f.flyBack = null; } projectiles = []; vines = []; beams = []; waves = []; rocks = []; zones = []; strikes = []; booms = []; cracks = []; sparks = []; floaters = []; rings = []; puffs = []; pillars = []; popups = []; decals = []; hazards = []; pickups = []; impacts = []; clashes = []; clashT = 0; hzT = 5; pkT = rnd(20, 55); pkDone = false; washA = 0; VAR.reset();
  matchTime = bestOf > 1 && !practice ? 120 : 180; shake = 0; freeze = 0; winner = null; introT = 0; overT = 0; camX = clamp(WORLD_W / 2 - W / 2, 0, WORLD_W - W); flashT = 0; cine = null; slowT = 0; camZ = 1; punch = 0; $('cine').classList.remove('on'); $('mvbA').classList.remove('on'); $('mvbB').classList.remove('on');
}
// best of 3: after each knockout the fighters are reset and the next round starts without leaving the arena
function updatePips() {
  const need = Math.ceil(bestOf / 2);
  for (const [id, w] of [['A', rounds.a], ['B', rounds.b]]) { const el = $('pip' + id); el.style.display = bestOf > 1 && !practice ? '' : 'none'; el.innerHTML = Array.from({ length: need }, (_, i) => `<i class="${i < w ? 'w' : ''}"></i>`).join(''); }
}
function roundOver() {
  if (winner === P) rounds.a++; else rounds.b++;
  updatePips();
  const need = Math.ceil(bestOf / 2);
  if (bestOf > 1 && rounds.a < need && rounds.b < need) nextRound(); else endMatch();
}
function nextRound() {
  const oP = P, oE = E; rounds.n++;
  P = makeFighter(cur.pa, -1, false, 1, cur.sa); E = makeFighter(cur.pb, 1, !NETG.on, NETG.on ? 1 : DIFF[selDiff].hp * tourHp(), cur.sb);
  P.stored = oP.stored; E.stored = oE.stored; P.specs = oP.specs; E.specs = oE.specs; E.ai.persona = oE.ai.persona; E.ai.habit = oE.ai.habit;
  prepFighters(); VAR.roundAdapt(oP, oE); resetField(); $('msg').classList.remove('on'); state = 'intro';
}
const HAZARD = { storm: { kind: 'bolt', ty: 'electric', every: [6, 9], dmg: 80, r: 90 }, volcano: { kind: 'geyser', ty: 'fire', every: [7, 10], dmg: 70, r: 80 }, cave: { kind: 'rock', ty: 'rock', every: [6, 9], dmg: 65, r: 70 }, crystalcave: { kind: 'rock', ty: 'rock', every: [6, 9], dmg: 65, r: 70 }, magmacrater: { kind: 'geyser', ty: 'fire', every: [7, 10], dmg: 70, r: 80 }, ice: { kind: 'icicle', ty: 'ice', every: [6, 9], dmg: 65, r: 70 } };
HAZARD.frozenlake = HAZARD.ice;
function updateHazards(dt) {
  if (state !== 'fight') return;
  const h = HAZARD[curTheme.id];
  if (h && !practice) { hzT -= dt; if (hzT <= 0) { hzT = rnd(h.every[0], h.every[1]); const tg = Math.random() < .5 ? P : E; hazards.push({ ...h, x: clamp(tg.x + rnd(-170, 170), WALL_L + 60, WALL_R - 60), t: 0, warn: .95, done: false }); } }
  for (const z of hazards) { z.t += dt; if (!z.done && z.t >= z.warn) { z.done = true; hazardStrike(z); } }
  hazards = hazards.filter(z => z.t < z.warn + .6);
  // one berry or orb per round, dropped at a random moment; whoever walks into it takes it
  if (!pkDone && !lab) { pkT -= dt; if (pkT <= 0) { pkDone = true; pickups.push({ kind: Math.random() < .5 ? 'berry' : 'orb', x: clamp((P.x + E.x) / 2 + rnd(-250, 250), WALL_L + 80, WALL_R - 80), y: -40, t: 0, life: 14 }); } }
  for (const p of pickups) {
    p.t += dt; p.y = Math.min(GROUND - 18, p.y + (120 + p.t * 900) * dt);
    if (p.y < GROUND - 40) continue;
    for (const f of [P, E]) if (!f.dead && p.life > 0 && Math.abs(f.x - p.x) < f.w * .5 + 24 && f.z + f.lift < 90) {
      p.life = 0; sfx('pick'); spark(p.x, p.y, p.kind === 'berry' ? '#ff5a6a' : '#5ad6ff', 12);
      if (VAR.collect(f, p)) { } else if (p.kind === 'berry') { f.hp = Math.min(f.maxhp, f.hp + f.maxhp * .15); floatText(f.x, GROUND - f.h - 14, '+HP', '#7dff9a', 28); } else { f.sta = Math.min(100, f.sta + 45); f.ki = Math.min(100, f.ki + 25); floatText(f.x, GROUND - f.h - 14, '+STAMINA', '#5ad6ff', 24); }
    }
  }
  pickups = pickups.filter(p => p.t < p.life);
}
function hazardStrike(z) {
  if (z.kind === 'bolt') { strikes.push({ x: z.x, t: 0 }); sfx('zap'); }
  boom(z.x, GROUND - 30, z.r * 1.6, colsOf(z.ty)[1], 16);
  for (const f of [P, E]) if (!f.dead && Math.abs(f.x - z.x) < z.r + f.w * .3 && (z.kind === 'bolt' || f.z + f.lift < 70) && f.counterT <= 0) damage(HAZ, f, z.dmg, Math.sign(f.x - z.x || 1) * 380, center(f), true, z.ty);
}
function drawHazard(g, z) {
  if (z.t < z.warn) {
    g.save(); g.strokeStyle = `rgba(255,70,50,${.45 + .4 * Math.sin(now * 28)})`; g.lineWidth = 4; g.beginPath(); g.ellipse(z.x, GROUND + 6, z.r, z.r * .2, 0, 0, 6.283); g.stroke(); g.fillStyle = 'rgba(255,60,40,.14)'; g.fill();
    if (z.kind === 'rock' || z.kind === 'icicle') { const f = clamp((z.t - (z.warn - .3)) / .3, 0, 1); if (f > 0) spr(g, z.kind === 'rock' ? 'rocks' : 'icicle', z.x, -60 + (GROUND + 20) * f * f, 90, now * 6); }
    g.restore();
  } else if (z.kind === 'geyser') {
    const a = 1 - (z.t - z.warn) / .6; g.save(); g.globalAlpha = clamp(a, 0, 1); g.globalCompositeOperation = 'lighter';
    const gr = g.createLinearGradient(0, GROUND - 260, 0, GROUND); gr.addColorStop(0, 'rgba(255,120,30,0)'); gr.addColorStop(.4, 'rgba(255,170,60,.9)'); gr.addColorStop(1, 'rgba(255,230,150,1)'); g.fillStyle = gr; g.fillRect(z.x - z.r * .45, GROUND - 260, z.r * .9, 270);
    for (let i = 0; i < 6; i++) spr(g, 'fireball', z.x + Math.sin(now * 14 + i) * z.r * .3, GROUND - 40 - i * 40, 46, 0, .9);
    g.restore();
  }
}
function drawPickup(g, p) { if (VAR.drawPickup(g, p)) return;
  if (p.life - p.t < 2 && Math.floor(now * 8) % 2) return;
  const y = p.y + Math.sin(now * 4 + p.x) * 4, berry = p.kind === 'berry'; g.save();
  g.globalCompositeOperation = 'lighter'; spr(g, 'shine', p.x, y, 70, now * 2, .8); g.globalCompositeOperation = 'source-over';
  if (berry) { g.fillStyle = '#e0334a'; circ(g, p.x, y, 14); g.fillStyle = 'rgba(255,255,255,.5)'; circ(g, p.x - 5, y - 5, 4); g.fillStyle = '#3fb04c'; g.beginPath(); g.ellipse(p.x + 5, y - 15, 8, 4, -.6, 0, 6.283); g.fill(); }
  else { const gr = g.createRadialGradient(p.x, y, 2, p.x, y, 16); gr.addColorStop(0, '#fff'); gr.addColorStop(.5, '#5ad6ff'); gr.addColorStop(1, '#1a6aff'); g.fillStyle = gr; circ(g, p.x, y, 16); }
  g.restore();
}
function pickTod() { // time of day for outdoor arenas
  const id = curTheme.id; if (id === 'night' || id === 'ruins') { tod = 'night'; return; } if (id === 'storm') { tod = 'dusk'; return; }
  const out = ['meadow', 'forest', 'beach', 'stadium', 'canyon', 'desert', 'city'].includes(id), r = Math.random(); tod = out ? (r < .5 ? 'day' : r < .78 ? 'dusk' : 'night') : 'day';
}
const shade = (hex, k) => '#' + [1, 3, 5].map(i => Math.round(clamp(k > 0 ? parseInt(hex.substr(i, 2), 16) * (1 - k) + 255 * k : parseInt(hex.substr(i, 2), 16) * (1 + k), 0, 255)).toString(16).padStart(2, '0')).join('');
function setHudColours() { // the portrait frame and life bar take the colour of the Pokémon's type
  for (const [f, id] of [[P, 'A'], [E, 'B']]) { const hx = TYPE_HEX[f.kit.types[0]] || '#e8601c', s = $('face' + id).closest('.side'); s.style.setProperty('--tc', hx); s.style.setProperty('--tcl', shade(hx, .35)); s.style.setProperty('--tcd', shade(hx, -.45)); }
}
function pickSil() { $('tSil').src = spriteUrl(dexById(1 + Math.floor(Math.random() * POKEDEX.length))); }
function updateTint() { // time-of-day and weather colour as one full-screen overlay, so it still covers everything when the camera zooms out
  const L = []; if (tod === 'night') L.push('rgba(10,18,70,.30)'); else if (tod === 'dusk') L.push('rgba(255,110,40,.12)');
  const wc = weather && { rain: 'rgba(20,40,80,.16)', hail: 'rgba(150,190,240,.14)', sand: 'rgba(190,140,70,.22)', sun: 'rgba(255,170,60,.06)' }[weather.id]; if (wc) L.push(wc);
  const bgs = L.map(c => `linear-gradient(${c},${c})`); if (weather && weather.id === 'sun') bgs.push('radial-gradient(circle at 100% 0,rgba(255,225,130,.34),rgba(255,170,60,0) 70%)');
  $('tint').style.background = bgs.join(',') || 'none';
}
const CLOUD_THEMES = new Set(['meadow', 'forest', 'beach', 'stadium', 'canyon', 'desert', 'city', 'pokeball', 'champion', 'cliffs', 'glade', 'shrine', 'redcanyon', 'ranch', 'palmcove', 'plaza']);
function drawClouds(g) { // slow background clouds that drift at their own speed
  if (!CLOUD_THEMES.has(curTheme.id)) return; g.save(); g.fillStyle = tod === 'night' ? 'rgba(170,180,230,.16)' : tod === 'dusk' ? 'rgba(255,200,160,.32)' : 'rgba(255,255,255,.32)';
  for (let i = 0; i < 6; i++) { const x = (((i * 260 - camX * .18 + now * (6 + i * 2)) % (W + 300)) + W + 300) % (W + 300) - 150, y = 40 + (i * 53) % 150; for (let j = 0; j < 4; j++) { g.beginPath(); g.ellipse(x + j * 34 - 50, y + Math.sin(j * 2) * 6, 46 - j * 4 + (j % 2) * 8, 18, 0, 0, 6.283); g.fill(); } }
  g.restore();
}
function setRounds(n) { bestOf = n; try { localStorage.setItem('pf_rounds', String(n)); } catch (e) { } document.querySelectorAll('.rndchip').forEach(b => b.classList.toggle('sel', +b.dataset.r === n)); }

// ---------------------------------------------------------------- effects
const WEATHER = {
  sun: { name: 'SUN', icon: 'weather-sunny', up: ['fire'], down: ['water'], col: '#ffb347' }, rain: { name: 'RAIN', icon: 'weather-rainy', up: ['water', 'electric'], down: ['fire'], col: '#6ab7ff' },
  sand: { name: 'SANDSTORM', icon: 'weather-windy', up: ['rock', 'ground'], down: [], col: '#d9a65a' }, hail: { name: 'HAIL', icon: 'weather-snowy-heavy', up: ['ice'], down: [], col: '#bfeaff' },
};
const THEME_WEATHER = { desert: ['sand'], beach: ['sun', 'rain'], sea: ['rain'], water: ['rain'], ice: ['hail'], storm: ['rain'], volcano: ['sun'], meadow: ['sun', 'rain', 'clear'], forest: ['rain', 'clear'], canyon: ['sun', 'sand'], stadium: ['clear', 'sun', 'rain'], city: ['clear', 'rain'], night: ['clear', 'rain'], cave: ['clear'], pokeball: ['clear', 'sun', 'rain'], champion: ['clear', 'sun'], frozenlake: ['hail'], cliffs: ['clear', 'rain', 'sun'], ruins: ['clear', 'rain'], glade: ['sun', 'rain', 'clear'], shrine: ['clear', 'rain'], lab: ['clear'], redcanyon: ['sun', 'sand', 'clear'], ranch: ['sun', 'rain', 'clear'], crystalcave: ['clear'], magmacrater: ['sun'], palmcove: ['sun', 'rain', 'clear'], plaza: ['clear', 'rain', 'sun'] };
const wxMul = ty => weather && ty ? (weather.up.includes(ty) ? 1.2 : weather.down.includes(ty) ? .8 : 1) : 1;
function pickWeather() {
  const l = THEME_WEATHER[curTheme.id] || ['clear'], id = l[Math.floor(Math.random() * l.length)], el = $('wx');
  weather = id === 'clear' ? null : { id, ...WEATHER[id] }; weatherBase = weather; rainFx = !weather && Math.random() < .4; // a clear map sometimes gets a slight rain that only looks like rain
  if (weather) { el.innerHTML = ico(weather.icon) + weather.name + `<small>${weather.up.map(t => t.toUpperCase()).join('/')} +20%</small>`; el.style.setProperty('--c', weather.col); el.classList.add('on'); } else el.classList.remove('on');
}
// ---------------------------------------------------------------- fight intro: type-themed panels with the 3D models, one slanted seam, a skip button
const VS_TH = {
  fire: { c: ['#d9300f', '#ffb62b'], pat: 'stripe', en: 'slide', pt: 'ember', tag: 'BLAZING' }, water: { c: ['#1456c9', '#4fe0ff'], pat: 'dots', en: 'rise', pt: 'bubble', tag: 'TIDAL' },
  electric: { c: ['#c79a00', '#fff06a'], pat: 'chev', en: 'flicker', pt: 'bolt', tag: 'VOLTAGE' }, grass: { c: ['#1f8a3a', '#b7f06a'], pat: 'stripe', en: 'rise', pt: 'leaf', tag: 'OVERGROWN' },
  ice: { c: ['#3a8fd0', '#d8f6ff'], pat: 'chev', en: 'rise', pt: 'snow', tag: 'FROSTBITE' }, poison: { c: ['#6a1f9a', '#d37bff'], pat: 'dots', en: 'rise', pt: 'drip', tag: 'TOXIC' },
  ground: { c: ['#8a5a22', '#e2b878'], pat: 'chev', en: 'drop', pt: 'dust', tag: 'QUAKE' }, rock: { c: ['#6d5a3a', '#cdb98a'], pat: 'chev', en: 'drop', pt: 'dust', tag: 'BEDROCK' },
  flying: { c: ['#5d86d8', '#e6f0ff'], pat: 'stripe', en: 'fade', pt: 'wind', tag: 'GALE' }, psychic: { c: ['#b02a86', '#ff9ae6'], pat: 'dots', en: 'fade', pt: 'ring', tag: 'MINDSTORM' },
  bug: { c: ['#6f8a10', '#d6f04a'], pat: 'dots', en: 'flicker', pt: 'fly', tag: 'SWARM' }, ghost: { c: ['#3d2a78', '#a98cff'], pat: 'dots', en: 'fade', pt: 'wisp', tag: 'PHANTOM' },
  dragon: { c: ['#3b2bb8', '#ff9a3a'], pat: 'stripe', en: 'slide', pt: 'dragon', tag: 'DRACONIC' }, dark: { c: ['#1c1530', '#8a6ad0'], pat: 'stripe', en: 'fade', pt: 'smoke', tag: 'NIGHTFALL' },
  steel: { c: ['#5d6a80', '#e6edf7'], pat: 'chev', en: 'slide', pt: 'shine', tag: 'IRONCLAD' }, fairy: { c: ['#d8559c', '#ffd0ec'], pat: 'dots', en: 'fade', pt: 'twinkle', tag: 'ENCHANTED' },
  fighting: { c: ['#a82a0a', '#ff8a4a'], pat: 'stripe', en: 'slide', pt: 'impact', tag: 'BRAWLER' }, normal: { c: ['#7d7a68', '#f0ecd6'], pat: 'stripe', en: 'slide', pt: 'streak', tag: 'CHALLENGER' } };
const VS_RATE = { ember: 22, bubble: 12, leaf: 8, snow: 14, drip: 8, dust: 16, wind: 9, ring: .9, fly: 5, wisp: 6, dragon: 20, smoke: 5, shine: .8, twinkle: 9, impact: 2, streak: 6, bolt: 1.4 };
const VS_CLIP = { L: 'polygon(0 0,54.3% 0,44.3% 100%,0 100%)', R: 'polygon(100% 0,100% 100%,45.7% 100%,55.7% 0)' };
let vsParts = [], vsAcc = { L: {}, R: {} }, vsTy = { L: 'normal', R: 'normal' }, vsG = null, vsDirty = false;
function vsStripe(pat, c1, c2) {
  if (pat === 'dots') return { bg: `radial-gradient(circle,${c2}aa 4px,transparent 5px) 0 0/32px 32px,linear-gradient(120deg,${c1},${c2}55)`, tile: 32 };
  if (pat === 'chev') return { bg: `linear-gradient(135deg,${c2}66 25%,transparent 25%) -32px 0/64px 64px,linear-gradient(225deg,${c2}66 25%,transparent 25%) -32px 0/64px 64px,linear-gradient(315deg,${c2}66 25%,transparent 25%) 0 0/64px 64px,linear-gradient(45deg,${c2}66 25%,transparent 25%) 0 0/64px 64px,${c1}`, tile: 64 };
  return { bg: `linear-gradient(135deg,${c1} 25%,${c2}88 25%,${c2}88 50%,${c1} 50%,${c1} 75%,${c2}88 75%) 0 0/64px 64px`, tile: 64 };
}
function vsBuild(s, p, role) {
  const ty = VS_TH[p.types[0]] ? p.types[0] : 'normal', th = VS_TH[ty], el = $(s === 'L' ? 'vsPL' : 'vsPR'), name = nm(p.name); vsTy[s] = ty;
  el.className = `vsPnl ${s} ${th.en}`; el.style.setProperty('--c1', th.c[0]); el.style.setProperty('--c2', th.c[1]); el.style.clipPath = VS_CLIP[s];
  const st = vsStripe(th.pat, th.c[0], th.c[1]), sp = el.querySelector('.vsStr'); sp.style.background = st.bg; sp.style.backgroundColor = th.c[0]; sp.style.animationDuration = (st.tile / 64 * 2.4) + 's';
  const big = el.querySelector('.vsBig'); big.textContent = name.toUpperCase(); big.style.fontSize = clamp(300 / (name.length * .72), 36, 80) + 'px';
  const im = el.querySelector('img'); im.style.height = ''; im.onload = () => { im.style.height = Math.round(im.naturalHeight * clamp(250 / im.naturalHeight, 1.2, 3.6)) + 'px'; }; im.onerror = () => { im.onerror = null; im.src = spriteUrl(p); };
  im.src = `assets/ani/${p.name}.gif`; // the 3D models, whichever sprite style is chosen
  el.querySelector('.vsRole').textContent = role; el.querySelector('.vsPlate').innerHTML = `<div class="vsTag">${th.tag}</div><div class="vsChips">${p.types.map(t => `<span style="background:${colsOf(t)[1]}">${t}</span>`).join('')}</div>`;
}
function showVs(pa, pb) {
  const v = $('vsSplash'); v.classList.remove('on', 'out'); v.classList.toggle('demo', demo); v.classList.toggle('low', lowQ);
  vsBuild('L', pa, demo ? (demoUrl ? 'CPU A' : 'YOUR PICK') : NETG.on ? (NETG.role === 'host' ? 'P1  YOU' : 'P1  FRIEND') : 'P1  YOU'); vsBuild('R', pb, demo ? (demoUrl ? 'CPU B' : 'RIVAL') : NETG.on ? (NETG.role === 'guest' ? 'P2  YOU' : 'P2  FRIEND') : 'CPU'); vsParts = []; vsAcc = { L: {}, R: {} }; $('vsDemo').textContent = demoUrl ? 'DEMO' : 'AI BATTLE';
  void v.offsetWidth; v.classList.add('on');
}
let vsWait = false; // the VS splash holds until the player presses START (watch mode just runs on)
function vsStart() { if (state === 'intro' && vsWait) { vsWait = false; introT = Math.max(introT, -.2); } } // fade out, then READY? and FIGHT!
addEventListener('keydown', e => { if (vsWait && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); vsStart(); } });
function vsSpawn(s, kind) {
  const x0 = s === 'L' ? 20 : 500, w = 440, d = { s, kind, t: 0, life: 1.4 + Math.random() * 1.2, x: x0 + Math.random() * w, y: 150 + Math.random() * 330, vx: 0, vy: 0, r: 2 + Math.random() * 3, a: Math.random() * 6.28, hue: Math.random() }, dir = s === 'L' ? 1 : -1;
  switch (kind) {
    case 'ember': d.y = 480; d.vy = -60 - Math.random() * 90; d.vx = (Math.random() - .5) * 40; break; case 'bubble': d.y = 480; d.vy = -35 - Math.random() * 40; d.r = 4 + Math.random() * 8; break;
    case 'leaf': d.y = -10; d.vy = 40 + Math.random() * 40; d.vx = dir * 20; d.r = 5 + Math.random() * 4; break; case 'snow': d.y = -10; d.vy = 30 + Math.random() * 40; d.vx = (Math.random() - .5) * 20; break;
    case 'drip': d.y = 480; d.vy = -25 - Math.random() * 40; d.r = 3 + Math.random() * 6; break; case 'dust': d.x = s === 'L' ? x0 : x0 + w; d.y = 440 + Math.random() * 30; d.vx = dir * (80 + Math.random() * 120); d.vy = -80 - Math.random() * 100; d.r = 2 + Math.random() * 4; d.life = 1; break;
    case 'wind': d.x = s === 'L' ? x0 : x0 + w; d.vx = dir * (500 + Math.random() * 300); d.life = .7; break; case 'ring': d.x = s === 'L' ? 270 : 690; d.y = 300; d.life = 1.2; break;
    case 'fly': d.vx = (Math.random() - .5) * 40; d.vy = (Math.random() - .5) * 40; break; case 'wisp': d.y = 480; d.vy = -40 - Math.random() * 30; d.r = 6 + Math.random() * 6; break;
    case 'dragon': d.x = s === 'L' ? 270 : 690; d.y = 360; d.vx = (Math.random() - .5) * 120; d.vy = -80 - Math.random() * 120; break; case 'smoke': d.y = 480; d.vy = -30 - Math.random() * 30; d.r = 14 + Math.random() * 16; d.life = 2; break;
    case 'shine': d.x = s === 'L' ? -60 : 620; d.y = 0; d.vx = 520; d.life = .9; break; case 'twinkle': d.r = 5 + Math.random() * 6; d.life = 1.1; break;
    case 'impact': d.x = s === 'L' ? 270 : 690; d.y = 300; d.life = .35; break; case 'streak': d.vx = dir * 220; d.life = .9; break;
    case 'bolt': { d.life = .12; d.x = x0 + Math.random() * w; d.y = 0; d.pts = []; let x = d.x, y = 0; while (y < 440) { d.pts.push([x, y]); x += (Math.random() - .5) * 60; y += 40 + Math.random() * 30; } d.pts.push([x, 440]); break; }
  }
  vsParts.push(d);
}
function vsDraw(p) {
  const g = vsG, u = p.t / p.life, al = 1 - u; g.save(); g.globalAlpha = Math.max(0, p.kind === 'twinkle' ? Math.sin(u * Math.PI) : p.kind === 'fly' ? .5 + .5 * Math.sin(p.t * 9 + p.a) : al);
  switch (p.kind) {
    case 'ember': case 'dragon': g.fillStyle = p.kind === 'dragon' && p.hue > .5 ? '#a78bff' : p.hue > .5 ? '#ffd65a' : '#ff6a1a'; g.beginPath(); g.arc(p.x, p.y, p.r * (1 - u * .5), 0, 6.283); g.fill(); break;
    case 'bubble': case 'drip': g.strokeStyle = p.kind === 'drip' ? '#e0a0ff' : '#d8f6ff'; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.stroke(); break;
    case 'leaf': g.translate(p.x, p.y); g.rotate(p.a + p.t * 2); g.fillStyle = p.hue > .5 ? '#7bd84a' : '#3fa83a'; g.beginPath(); g.ellipse(0, 0, p.r * 1.6, p.r * .8, 0, 0, 6.283); g.fill(); break;
    case 'snow': g.fillStyle = '#fff'; g.beginPath(); g.arc(p.x, p.y, p.r * .8, 0, 6.283); g.fill(); break;
    case 'dust': g.fillStyle = '#d8c090'; g.fillRect(p.x, p.y, p.r * 1.6, p.r); break;
    case 'wind': case 'streak': g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - Math.sign(p.vx) * (p.kind === 'wind' ? 120 : 60), p.y); g.stroke(); break;
    case 'ring': g.strokeStyle = '#ffb0f0'; g.lineWidth = 3; g.beginPath(); g.ellipse(p.x, p.y, 40 + 180 * u, (40 + 180 * u) * .45, 0, 0, 6.283); g.stroke(); break;
    case 'fly': g.fillStyle = '#e8ff6a'; g.beginPath(); g.arc(p.x, p.y, 3, 0, 6.283); g.fill(); g.globalAlpha *= .3; g.beginPath(); g.arc(p.x, p.y, 8, 0, 6.283); g.fill(); break;
    case 'wisp': g.fillStyle = '#d8ccff'; g.beginPath(); g.ellipse(p.x + Math.sin(p.t * 3 + p.a) * 14, p.y, p.r * .7, p.r * 1.3, 0, 0, 6.283); g.fill(); break;
    case 'smoke': g.fillStyle = '#000'; g.globalAlpha *= .35; g.beginPath(); g.arc(p.x, p.y, p.r * (1 + u), 0, 6.283); g.fill(); break;
    case 'shine': g.fillStyle = '#fff'; g.globalAlpha = .35 * al; g.beginPath(); g.moveTo(p.x, 0); g.lineTo(p.x + 40, 0); g.lineTo(p.x - 20, 480); g.lineTo(p.x - 60, 480); g.fill(); break;
    case 'twinkle': g.translate(p.x, p.y); g.rotate(p.t * 2); g.fillStyle = '#fff'; g.beginPath(); for (let k = 0; k < 8; k++) { const r = k % 2 ? p.r * .35 : p.r; g.lineTo(Math.cos(k * .785) * r, Math.sin(k * .785) * r); } g.fill(); break;
    case 'impact': g.strokeStyle = '#fff'; g.lineWidth = 3; for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283, r0 = 30 + 160 * u, r1 = r0 + 40; g.beginPath(); g.moveTo(p.x + Math.cos(a) * r0, p.y + Math.sin(a) * r0 * .7); g.lineTo(p.x + Math.cos(a) * r1, p.y + Math.sin(a) * r1 * .7); g.stroke(); } break;
    case 'bolt': g.strokeStyle = '#fffbb0'; g.lineWidth = 3; g.lineJoin = 'round'; g.beginPath(); p.pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); break;
  }
  g.restore();
}
function vsTick(dt) { // themed particles on one small canvas while the intro shows
  if (!vsG) vsG = $('vsPc').getContext('2d'); vsG.clearRect(0, 0, 960, 480); vsDirty = true;
  const max = lowQ ? 14 : 40;
  for (const s of ['L', 'R']) { const k = VS_TH[vsTy[s]].pt, a = vsAcc[s]; a[k] = (a[k] || 0) + dt * VS_RATE[k] * (lowQ ? .4 : 1); while (a[k] >= 1 && vsParts.length < max) { vsSpawn(s, k); a[k]--; } if (a[k] > 3) a[k] = 0; }
  vsParts = vsParts.filter(p => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.kind === 'leaf') p.vx += Math.sin(p.t * 3) * 30 * dt; if (p.kind === 'dust') p.vy += 300 * dt; if (p.kind === 'snow') p.x += Math.sin(p.t * 2 + p.a) * 10 * dt; if (p.kind === 'fly') { p.vx += (Math.random() - .5) * 200 * dt; p.vy += (Math.random() - .5) * 200 * dt; } return p.t < p.life; });
  vsParts.forEach(vsDraw);
}
function vsClear() { if (vsDirty && vsG) { vsG.clearRect(0, 0, 960, 480); vsParts = []; vsDirty = false; } }
$('vsGo').addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); vsStart(); });
const COL_TY = {}; for (const k in TYPE_COL) COL_TY[TYPE_COL[k][1]] = k;
function addDecal(x, r, col) { if (decals.length > 14) decals.shift(); decals.push({ x, r, ty: COL_TY[col] || 'normal', col, t: 0, life: 6 }); }
function spark(x, y, col, n = 10, speed = 320) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = speed * (.4 + Math.random() * .8); sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: .3 + Math.random() * .25, col, size: 2 + Math.random() * 3 }); }
  rings.push({ x, y, t: 0, col });
}
const floatText = (x, y, text, col, size = 28) => floaters.push({ x, y, t: 0, text, col, size });
let supT = 0, supCol = '#ff7a3a', impactT = 0, impX = 480, impY = 240, koLineT = 0, koLineCol = '#fff', koLineX = 480, koLineY = 240, rageG = null;
function speak(f, delay = 0) { // a short line in a speech bubble: about itself or about the foe's type, never the same line twice running
  if (lab || !f || !f.kit) return; const foe = other(f), own = Math.random() < .55 || !foe || !foe.kit, ty = own ? f.kit.types[0] : foe.kit.types[0], L = (own ? TAUNTS.own : TAUNTS.about)[ty] || TAUNTS.own.normal; let s, g = 0;
  do s = L[Math.floor(Math.random() * L.length)]; while (s === f.say && ++g < 6); f.say = s; f.sayT = now + delay; f.sayAt = now;
}
function tauntTick() { // each fighter pipes up every 8-14 s, and once when it drops low on health
  if (lab || state !== 'fight') return;
  for (const f of [P, E]) {
    if (!f || f.dead || f.hp <= 0) continue; if (f.tauntT === undefined) f.tauntT = now + rnd(5, 9);
    if (now >= f.tauntT && !(f.hitT > 0 && f.hitBig)) { speak(f); f.tauntT = now + rnd(8, 14); }
    if (!f.lowSaid && f.hp < f.maxhp * .25) { f.lowSaid = true; if (now - (f.sayAt || -9) > 3) { speak(f, .2); f.tauntT = now + rnd(8, 14); } }
  }
}
function rrect(g, x, y, w, h, r) { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function typeHit(x, y, ty, n) { // sparks in the move's own colours
  const c = colsOf(ty);
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = rnd(160, 460); sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, t: 0, life: rnd(.3, .6), col: i % 2 ? c[1] : c[0], size: rnd(3, 6) }); }
  rings.push({ x, y, t: 0, col: c[1] });
}
const MV_TYI = { fire: 'fire', water: 'water', electric: 'flash', grass: 'leaf', ice: 'snowflake', fighting: 'boxing-glove', poison: 'skull-crossbones', ground: 'terrain', flying: 'weather-windy', psychic: 'flare', bug: 'bug', rock: 'diamond-stone', ghost: 'ghost', dragon: 'star-four-points', dark: 'weather-night', steel: 'shield', fairy: 'star-four-points', normal: 'paw' };
function moveBanner(f, name, ty, icon) { // a round badge slides in beside the caster on every special: type-coloured disc, the move's icon, a type pip and the name
  const el = $(f === P ? 'mvbA' : 'mvbB'), c = colsOf(ty); el.style.setProperty('--c1', c[0]); el.style.setProperty('--c2', c[1]);
  el.innerHTML = `<div class="disc"><div class="i">${ico(icon || 'star-four-points')}</div></div><div class="dot">${ico(MV_TYI[ty] || 'star-four-points')}</div><div class="rb">${name.toUpperCase()}</div>`;
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
}
function statusFx(f, dt) {
  if (f.dead || state !== 'fight') return;
  const top = GROUND + laneY(f) - f.z - f.lift - f.h, cy = top + f.h * .5, rx = () => f.x + rnd(-f.w * .35, f.w * .35);
  if (f.act && f.act.name === 'sp' && f.act.t < .4 && Math.random() < dt * 45) sparks.push({ x: rx(), y: cy + f.h * .35, vx: 0, vy: rnd(-200, -110), t: 0, life: .45, col: colsOf(f.act.ty)[1], size: rnd(3, 5) });
  if (f.sleepT > 0 && Math.random() < dt * 2.2) floatText(f.x + f.face * 20, top - 4, 'z', '#e2b8ff', 22);
  if (f.poisonT > 0 && Math.random() < dt * 14) puffs.push({ x: rx(), y: cy + f.h * .3, vx: rnd(-10, 10), vy: rnd(-90, -50), t: 0, life: .6, r: rnd(3, 6), col: 'rgba(170,60,220,.7)' });
  if (f.freezeT > 0 && Math.random() < dt * 16) sparks.push({ x: rx(), y: cy + rnd(-f.h * .4, f.h * .4), vx: 0, vy: -30, t: 0, life: .4, col: '#bfeaff', size: rnd(2, 4) });
  if (f.slowT > 0 && Math.random() < dt * 10) sparks.push({ x: rx(), y: cy + rnd(-f.h * .4, f.h * .4), vx: rnd(-120, 120), vy: rnd(-120, 120), t: 0, life: .25, col: '#ffe01a', size: rnd(2, 4) });
  if (f.buffT > 0 && Math.random() < dt * 12) sparks.push({ x: rx(), y: cy + f.h * .3, vx: 0, vy: rnd(-160, -90), t: 0, life: .5, col: '#ffb347', size: rnd(2, 4) });
  if (f.debT > 0 && Math.random() < dt * 8) sparks.push({ x: rx(), y: top, vx: 0, vy: rnd(60, 110), t: 0, life: .5, col: '#c070ff', size: rnd(2, 4) });
  if (f.burnT > 0 && Math.random() < dt * 16) sparks.push({ x: rx(), y: cy + f.h * .3, vx: rnd(-20, 20), vy: rnd(-170, -100), t: 0, life: .45, col: Math.random() < .5 ? '#ff7a1a' : '#ffd34d', size: rnd(3, 5) });
  if (f.confT > 0 && Math.random() < dt * 14) sparks.push({ x: f.x + Math.cos(now * 9) * 26, y: top - 4 + Math.sin(now * 9) * 7, vx: 0, vy: 0, t: 0, life: .15, col: '#ffe066', size: 5 });
}
function puff(x, y, n, col = 'rgba(230,200,150,.6)', spread = 60) { for (let i = 0; i < n; i++) puffs.push({ x: x + rnd(-spread, spread) * .3, y, vx: rnd(-spread, spread), vy: rnd(-40, -10), t: 0, life: rnd(.35, .6), r: rnd(6, 14), col }); }
function boom(x, y, r, col, big = 20) {
  booms.push({ x, y, r, t: 0, dur: .55, col }); shake = Math.max(shake, big); sfx('boom'); flashT = Math.max(flashT, .1); if (y > GROUND - 130) addDecal(x, r, col);
  for (let i = 0; i < 18; i++) { const a = rnd(0, 6.283), s = rnd(120, 520); sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, t: 0, life: rnd(.4, .8), col: i % 2 ? '#ffd34d' : col, size: rnd(3, 6) }); }
}
function aoe(att, x, y, r, dmg, knock, big, status, ty) {
  const t = other(att); if (t.dead) return false;
  if (Math.abs(att.lp - t.lp) > 1.2) return false; // the far depth lane is out of reach
  if (!circleRect(x, y, r, body(t))) return false;
  const c = center(t);
  const ok = damage(att, t, dmg, Math.sign(c.x - x || att.face) * knock, { x: clamp(c.x, x - r, x + r), y: c.y }, big, ty);
  if (ok && status) applyStatus(t, status, true, att);
  return ok;
}

// ---------------------------------------------------------------- combat
function abilityPop(f, text, col) { sfx('ability'); floatText(f.x, GROUND - f.z - f.lift - f.h - 34, text, col, 24); spark(f.x, center(f).y, col, 10); } // a short flourish when an ability does something
function cureStatus(f) { f.sleepT = f.poisonT = f.burnT = f.confT = f.slowT = f.freezeT = 0; abilityPop(f, f.ability.name.toUpperCase() + '!', '#7dff9a'); }
function fightStart() { // abilities that act as the fight begins
  P.spawnT = E.spawnT = .35; speak(P); speak(E, .35);
  for (const f of [P, E]) {
    const o = other(f);
    if (f.ability.trace && o.ability.name) { f.ability = { ...o.ability, trace: 0, name: 'Trace' }; abilityPop(f, 'TRACE: ' + o.ability.name.toUpperCase(), '#c8a8ff'); }
    if (f.ability.intim) { o.debT = 8; abilityPop(f, 'INTIMIDATE!', '#ff6a5a'); impacts.push({ x: f.x, y: center(f).y, t: 0, n: 14, col: '#ff6a5a', rot: 0 }); sfx('boom'); }
  }
}
function applyStatus(t, kind, force, src) {
  if (t.dead || (!force && statusy(t)) || (kind === 'confuse' && t.ability.focus)) return;
  if (t.ability.immune && t.ability.immune.includes(kind)) { abilityPop(t, t.ability.name.toUpperCase() + '!', '#ddd'); return; }
  if (kind === 'freeze') { t.freezeT = .9; t.hitT = 0; } else if (kind === 'sleep') t.sleepT = 3.2 * (t.ability.early ? .5 : 1); else if (kind === 'poison') t.poisonT = 5; else if (kind === 'slow') t.slowT = 3; else if (kind === 'burn') t.burnT = 4; else if (kind === 'confuse') t.confT = 3.2;
  const L = STATUS_TXT[kind]; if (L) floatText(t.x, GROUND - t.z - t.lift - t.h - 8, L[0], L[1], 24);
  if (src && src !== t && t.ability.sync && ['poison', 'burn', 'slow'].includes(kind) && !statusy(src)) { abilityPop(t, 'SYNCHRONIZE', '#ff7ae6'); applyStatus(src, kind); }
}
function cancelInput(f, inp) { // after an attack connects (or a dash), a different attack can interrupt its recovery to keep the combo going
  const a = f.act; if (a.t < .1) return null;
  const pick = (...n) => n.find(x => inp[x]) || null;
  if (a.name === 'melee') return a.landed ? pick('special', 'special2', 'special3', 'ranged', 'grab') : null;
  if (a.name === 'dash') return pick('melee', 'special', 'special2', 'special3', 'grab');
  if (a.name === 'sp') return a.landed && CANCEL_KEYS.has(a.key) ? pick('melee', 'special', 'special2', 'special3', 'grab') : null;
  return null;
}
function confuseInput(f, inp) { // a confused fighter sometimes stumbles the wrong way
  if (now - (f.confAt || 0) > .5) { f.confAt = now; f.confDir = Math.floor(Math.random() * 3) - 1; f.confOn = Math.random() < .6; }
  return f.confOn ? { ...inp, l: f.confDir < 0, r: f.confDir > 0, guard: false } : inp;
}
const LV_MUL = [1, 1.3, 1.6, 1.9, 2.25]; // refill speed with 0-4 banked levels
const staEff = f => f.sta;
const spend = (f, n) => { f.sta = Math.max(0, f.sta - n); f.staDelay = n >= 30 ? 1.1 : .5; };
function canSpend(f, n) {
  if (f.sta >= n) return true;
  f.warnT = .45; if (!f.isAI && now - (f.warnAt || -9) > .6) { f.warnAt = now; floatText(f.x, GROUND - f.h - 14, 'NO STAMINA', '#ffb347'); }
  return false;
}
// ---------------------------------------------------------------- hit reactions (four throw styles) and extra combat visuals
let jfx = [], kick = 0, wordT = 0; const hvLast = { P: -1, E: -1 }, lkLast = { P: -1, E: -1 };
const pickLk = f => { if (window.__forceLk !== undefined) return window.__forceLk; const k = f === P ? 'P' : 'E'; let v; do v = Math.floor(Math.random() * 4); while (v === lkLast[k]); lkLast[k] = v; return v; };
const pickHv = def => { if (window.__forceHv !== undefined) return window.__forceHv; const k = def === P ? 'P' : 'E'; let v; do v = Math.floor(Math.random() * 4); while (v === hvLast[k]); hvLast[k] = v; return v; };
const jpush = o => { if (jfx.length > (lowQ ? 20 : 48)) jfx.shift(); jfx.push(o); };
const CDIR = [[-1, 0], [.75, -.66], [.8, .6], [-.55, .83]]; // where each blow of a rush comes from, as seen from the attacker's side: front, above-behind, below, uppercut
const hsh = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const comboPick = f => { const L = ['A', 'B', 'C', 'D'].filter(x => x !== f.lastCl), v = L[Math.floor(Math.random() * L.length)]; f.lastCl = v; return v; }; // A flurry from all sides, B fight cloud, C teleport strikes, D flurry then burst; never the same look twice running
function drawStar(g, x, y, r, rot, al) { g.save(); g.globalAlpha = Math.max(0, Math.min(1, al)); g.translate(x, y); g.rotate(rot); g.fillStyle = '#ffe36a'; g.strokeStyle = '#7a5a00'; g.lineWidth = 2; g.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? r * .45 : r, a = k / 10 * 6.283; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); g.stroke(); g.restore(); }
function styleHit(def, att, pw, pt, col) { // 0 impact pop, 1 spin launcher, 2 skid and wall slam, 3 meteor crash
  const v = def.hv; def.jDir = Math.sign(def.x - att.x) || att.face; def.spinA = 0; def.stuckT = 0; def.crashed = false; def.jt = []; if (def.hover) { def.air = false; def.alt = 0; } // a flyer is knocked out of the air
  if (v === 0) { def.toss = 2; def.vz = Math.max(def.vz, 380); freeze = Math.max(freeze, .13); def.flash = .2; def.ghostT = .35; jpush({ k: 'ring', x: pt.x, y: pt.y, col, t: 0, life: .45, r: 100 }); }
  else if (v === 1) { def.toss = 3; def.vz = Math.max(def.vz, 520 + 160 * pw); freeze = Math.max(freeze, .1); }
  else if (v === 2) { def.toss = 1; def.tossV = 380; def.vz = Math.max(def.vz, 420); def.kvx *= 1.05; def.hitT = Math.max(def.hitT, 1.0); freeze = Math.max(freeze, .1); } // a skid now follows an arc and bounces
  else { def.toss = 1; def.vz = 700 + 260 * pw; def.kvx *= .7; def.hitT = Math.max(def.hitT, 1.45); def.ghostT = .3; freeze = Math.max(freeze, .14); }
}
function landFx(f) {
  const x = f.x, y = GROUND + laneY(f), v = f.hv;
  if (f.lk > 0 && f.toss <= 0 && v !== 1) jpush({ k: 'dizzy', f, t: 0, life: 1.1 });
  if (v === 0) { jpush({ k: 'ring', x, y: y - 2, col: '#e6dcc8', t: 0, life: .5, r: f.toss > 0 ? 70 : 100, flat: 1 }); for (let i = 0; i < 4; i++) jpush({ k: 'star', x: x + rnd(-40, 40), y: y - 30, vx: rnd(-90, 90), vy: -rnd(260, 420), t: 0, life: .55 }); puff(x, GROUND, 8, 'rgba(215,200,170,.7)', 110); }
  else if (v === 1) { jpush({ k: 'crack', x, y: y + 4, t: 0, life: 1.6 }); shake = Math.max(shake, 8); if (f.toss <= 0) jpush({ k: 'dizzy', f, t: 0, life: 1.1 }); }
  else if (v === 3 && !f.crashed) {
    f.crashed = true; jpush({ k: 'crack', x, y: y + 4, t: 0, life: 2.2 }); jpush({ k: 'ring', x, y: y - 2, col: '#e6dcc8', t: 0, life: .55, r: 130, flat: 1 });
    for (let i = 0; i < (lowQ ? 4 : 7); i++) jpush({ k: 'chunk', x: x + rnd(-20, 20), y: y - 10, vx: rnd(-260, 260), vy: -rnd(380, 720), rot: rnd(0, 6), vr: rnd(-8, 8), n: 1 + i % 3, w: rnd(12, 22), t: 0, life: .9 });
    puff(x, GROUND, 10, 'rgba(200,185,155,.75)', 130); shake = Math.max(shake, 16); addDecal(x, 55, f.kit.cols[0]);
  }
}
const WORDS = { electric: ['ZAP!', 'ZZT!'], fire: ['BOOM!', 'FWOOSH!'], water: ['SPLASH!', 'SPLOSH!'], grass: ['WHIP!', 'THWACK!'], ice: ['CRACK!', 'CHILL!'], fighting: ['POW!', 'BAM!'], poison: ['SPLAT!', 'BLEGH!'], ground: ['THUD!', 'BONK!'], flying: ['WHOOSH!', 'SWOOP!'], psychic: ['ZING!', 'WOOM!'], bug: ['SKRIT!', 'ZIP!'], rock: ['CRUNCH!', 'THUD!'], ghost: ['BOO!', 'WHOOO!'], dragon: ['ROAR!', 'KABOOM!'], normal: ['WHAP!', 'BAM!'], dark: ['SNAP!', 'CHOMP!'], steel: ['CLANG!', 'DING!'], fairy: ['TINKLE!', 'POOF!'] };
const BIGW = ['WHAM!!', 'CRASH!!', 'SMASH!!', 'KABLAM!'];
function juiceHit(att, def, pt, pw, big, crit, ty, tc) {
  kick = clamp(kick + (Math.sign(def.x - att.x) || att.face) * (3 + 14 * pw) * (big ? 1.4 : 1), -22, 22); // the camera is nudged along the blow
  if (now - wordT > .35 && (big || crit || pw > .4)) { wordT = now; const w = big || crit ? BIGW[Math.floor(Math.random() * BIGW.length)] : (WORDS[ty] || WORDS.normal)[Math.floor(Math.random() * 2)]; jpush({ k: 'word', x: pt.x + (Math.random() < .5 ? -1 : 1) * rnd(70, 110), y: pt.y + 6, txt: w, col: crit ? '#ffd34d' : big ? '#ff9a3a' : tc[1], big: big || crit, rot: rnd(-.28, .12), t: 0, life: .75 }); }
  const mv = att.act && (att.act.name === 'melee' ? att.kit.melee.name : att.act.sp && att.act.sp.name) || '';
  if (/slash|claw|cut|scratch|fang|bite|crunch|blade|leaf/i.test(mv)) jpush({ k: 'slash', x: pt.x, y: pt.y, t: 0, life: .4, col: tc[1], dir: Math.sign(def.x - att.x) || 1 });
  if (def.z < 20 && (big || pw > .5) && (ty === 'fire' || ty === 'electric' || ty === 'dark' || ty === 'poison')) addDecal(def.x, 40 + 40 * pw, tc[0]); // a scorch or stain stays on the floor
}
function updJfx(dt) {
  kick *= Math.exp(-dt * 9);
  for (const j of jfx) { j.t += dt; if (j.k === 'chunk' || j.k === 'star') { j.vy += 1500 * dt; j.x += j.vx * dt; j.y += j.vy * dt; if (j.rot !== undefined) j.rot += j.vr * dt; } }
  jfx = jfx.filter(j => j.t < j.life);
}
function drawTrail(g, f) {
  if (!f.jt || f.jt.length < 2) return; g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; const col = f.hv === 3 ? '#ff9a2a' : f.kit.cols[0];
  for (let i = 1; i < f.jt.length; i++) { const a = f.jt[i - 1], b = f.jt[i], k = i / f.jt.length; g.globalAlpha = k * clamp(1 - (now - b.t) / .5, 0, 1) * .8; g.strokeStyle = col; g.lineWidth = (f.hv === 3 ? 26 : 14) * k + 3; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
  g.restore();
}
function drawJfx(g) {
  for (const j of jfx) {
    const k = j.t / j.life; g.save();
    if (j.k === 'word') { const pop = j.t < .1 ? 1 + (1 - j.t / .1) * .7 : 1; g.translate(j.x, j.y - 22 * easeOut(Math.min(1, k))); g.rotate(j.rot); g.scale(pop, pop); g.globalAlpha = 1 - clamp((k - .65) / .35, 0, 1); g.font = `italic 900 ${j.big ? 50 : 34}px system-ui,Arial,sans-serif`; g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 8; g.strokeStyle = '#1a0a00'; g.strokeText(j.txt, 0, 0); g.fillStyle = j.col; g.fillText(j.txt, 0, 0); }
    else if (j.k === 'ring') { g.globalAlpha = 1 - k; g.strokeStyle = j.col; g.lineWidth = 4 * (1 - k) + 1; const r = 8 + j.r * easeOut(k); g.beginPath(); g.ellipse(j.x, j.y, r, j.flat ? r * .28 : r, 0, 0, 6.283); g.stroke(); }
    else if (j.k === 'slash') { const e = easeOut(Math.min(1, j.t / .12)); g.globalAlpha = 1 - clamp((k - .35) / .65, 0, 1); g.lineCap = 'round'; for (let i = 0; i < 3; i++) { const ox = (i - 1) * 16; g.beginPath(); g.moveTo(j.x - 36 + ox, j.y - 52 + i * 5); g.lineTo(j.x - 36 + ox + 56 * e * j.dir, j.y - 52 + i * 5 + 100 * e); g.strokeStyle = '#fff'; g.lineWidth = 5; g.stroke(); g.strokeStyle = j.col; g.lineWidth = 2; g.stroke(); } }
    else if (j.k === 'crack') { g.globalAlpha = (1 - k) * .85; g.strokeStyle = '#15130e'; g.lineWidth = 2.5; for (let i = 0; i < 6; i++) { const an = Math.PI * (.08 + i * .17), L = 24 + ((i * 37) % 40); g.beginPath(); g.moveTo(j.x, j.y); g.lineTo(j.x + Math.cos(an) * L, j.y - Math.sin(an) * L * .26); g.stroke(); } }
    else if (j.k === 'splat') { g.globalAlpha = 1 - k * .6; g.strokeStyle = '#0f1020'; g.lineWidth = 2.5; for (let i = 0; i < 7; i++) { const an = i / 7 * 6.283, L = 22 + ((i * 29) % 34); g.beginPath(); g.moveTo(j.x, j.y); g.lineTo(j.x + Math.cos(an) * L, j.y + Math.sin(an) * L); g.stroke(); } if (j.t < .3) { g.strokeStyle = '#fff'; g.globalAlpha = 1 - j.t / .3; g.beginPath(); g.arc(j.x, j.y, 14 + 90 * (j.t / .3), 0, 6.283); g.stroke(); } }
    else if (j.k === 'star') { g.globalAlpha = 1 - k; g.strokeStyle = '#ffec78'; g.lineWidth = 2.5; g.lineCap = 'round'; const r = 8 * (1 - k * .5) + 2; for (let i = 0; i < 4; i++) { const a = j.t * 6 + i * 1.57; g.beginPath(); g.moveTo(j.x, j.y); g.lineTo(j.x + Math.cos(a) * r, j.y + Math.sin(a) * r); g.stroke(); } }
    else if (j.k === 'chunk') { g.globalAlpha = 1 - clamp((k - .6) / .4, 0, 1); spr(g, 'rock' + j.n, j.x, j.y, j.w, j.rot, 1); }
    else if (j.k === 'dizzy') { const f = j.f, y = GROUND + laneY(f) - f.z - f.lift - f.h * .5 - 34; g.globalAlpha = 1 - clamp((k - .7) / .3, 0, 1); g.strokeStyle = '#ffe27a'; g.lineWidth = 3; g.lineCap = 'round'; for (let i = 0; i < 3; i++) { const a = now * 7 + i * 2.09, x = f.x + Math.cos(a) * 28, yy = y + Math.sin(a) * 7; g.beginPath(); g.moveTo(x - 6, yy); g.lineTo(x + 6, yy); g.moveTo(x, yy - 6); g.lineTo(x, yy + 6); g.stroke(); } }
    else if (j.k === 'cline') { g.strokeStyle = j.col; g.lineWidth = 6; g.lineCap = 'round'; g.globalAlpha = .7 * (1 - k); g.beginPath(); g.moveTo(j.x0, j.y0); g.lineTo(j.x1, j.y1); g.stroke(); }
    else if (j.k === 'cfist') { // a fist or paw rushing in from its own side with a speed streak, then a starburst
      const u = j.t - .1, ang = Math.atan2(-j.dy, -j.dx), w = j.big ? 96 : 82, sz = j.big ? 1.3 : 1;
      if (u < .12 && !j.ns) {
        const p = j.t < .1 ? easeOut(j.t / .1) : 1, d = 240 * (1 - p) - (u > 0 ? 22 * u / .12 : 0), x = j.x + j.dx * d, y = j.y + j.dy * d, al = u > 0 ? 1 - u / .12 * .5 : 1;
        g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#fff'; g.lineCap = 'round';
        for (let n = 0; n < 3; n++) { g.globalAlpha = al * (.55 - n * .15); g.lineWidth = 5 - n; g.beginPath(); g.moveTo(x + j.dx * (30 + n * 10), y + j.dy * (30 + n * 10) + (n - 1) * 9); g.lineTo(x + j.dx * (190 + n * 30), y + j.dy * (190 + n * 30) + (n - 1) * 9); g.stroke(); }
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        for (let n = 3; n >= 1; n--) spr(g, j.img, x + j.dx * n * 30, y + j.dy * n * 30, w * .9, ang * .35, al * (.35 - n * .08));
        spr(g, j.img, x, y, w, ang * .35 + Math.sin(j.t * 80) * .1, al);
      }
      if (u >= 0 && u < .3) {
        const kk = u / .3, rr = 70 * sz * (.8 + 1.4 * easeOut(kk)); auraBlob(g, j.x, j.y, rr, rr, j.col, .8 * (1 - kk));
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - kk; g.strokeStyle = '#fff'; g.lineWidth = 4 * (1 - kk) + 1; g.beginPath();
        for (let n = 0; n < 8; n++) { const an = n / 8 * 6.283 + .3, r0 = 14 + 30 * kk, r1 = 30 + 80 * easeOut(kk) * sz; g.moveTo(j.x + Math.cos(an) * r0, j.y + Math.sin(an) * r0); g.lineTo(j.x + Math.cos(an) * r1, j.y + Math.sin(an) * r1); } g.stroke();
        if (u < .16 && !j.ns) { g.lineWidth = 6 * (1 - u / .16); g.globalAlpha = 1 - u / .16; g.beginPath(); g.moveTo(j.x + j.dx * 120, j.y + j.dy * 120); g.lineTo(j.x - j.dx * 120, j.y - j.dy * 120); g.stroke(); }
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        if (u < .22) spr(g, j.img, j.ns ? j.x + j.dx * 34 : j.x + (hsh(j.i, 7) - .5) * 40, j.ns ? j.y + j.dy * 34 : j.y - 20 - u * 140, 60 * (1 - u * 1.3), j.ns ? j.dx * .5 : (hsh(j.i, 8) - .5) * 1.2, 1 - u / .22);
      }
    }
    else if (j.k === 'crad') { // the finisher: icons fly out in all directions with a shock ring
      const kk = j.t / j.life, e = easeOut(kk), ry = j.fy;
      g.strokeStyle = j.col; g.lineWidth = 7; g.globalAlpha = 1 - kk; g.beginPath(); g.ellipse(j.x, ry, 30 + 330 * e, (30 + 330 * e) * .35, 0, 0, 6.283); g.stroke();
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.globalAlpha = .7 * (1 - kk); g.beginPath(); g.ellipse(j.x, ry, 18 + 210 * e, (18 + 210 * e) * .35, 0, 0, 6.283); g.stroke(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      for (let n = 0; n < 8; n++) { const an = n / 8 * 6.283 + hsh(n) * .6, d = 90 + 220 * easeOut(Math.min(1, kk * 1.3)), x = j.x + Math.cos(an) * d, y = j.y + Math.sin(an) * d * .75, al = 1 - Math.min(1, Math.max(0, (kk - .5) / .5)); spr(g, j.img, x, y, 62 * (1 - .35 * kk), an + kk * 3, al); if (n % 3 === 0) drawStar(g, x - Math.cos(an) * 26, y - Math.sin(an) * 26, 11, kk * 6, 1 - kk); }
    }
    else if (j.k === 'ccloud') { // the cartoon dust ball with fists, paws and stars popping out
      const grow = sstep(j.t / .12), shrink = 1 - sstep((j.t - (j.life - .08)) / .08), rad = j.r * grow * shrink;
      if (rad >= 2) {
        const cx = (j.a.x + j.d.x) / 2, cy = Math.min(center(j.d).y + 6, GROUND - rad), Q = [];
        for (let n = 0; n < 16; n++) { const an = n / 16 * 6.283 + j.t * 3.2, r = rad * (.62 + .18 * hsh(n)); Q.push([cx + Math.cos(an) * r + Math.sin(j.t * 40 + n) * 5, cy + Math.sin(an) * r * .8 + Math.cos(j.t * 36 + n * 2) * 5, rad * (.42 + .1 * hsh(n, 3))]); }
        Q.push([cx, cy, rad * .72]); g.globalAlpha = .96;
        g.fillStyle = '#7d776c'; for (const [x, y, r] of Q) { g.beginPath(); g.arc(x, y, r + 4, 0, 6.283); g.fill(); }
        g.fillStyle = '#f3efe6'; for (const [x, y, r] of Q) { g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); }
        g.fillStyle = '#d9d3c6'; for (const [x, y, r] of Q) { g.beginPath(); g.arc(x + r * .18, y + r * .22, r * .66, 0, 6.283); g.fill(); }
        g.globalAlpha = 1; const k0 = Math.floor(j.t / .055);
        for (let n = Math.max(0, k0 - 6); n <= k0; n++) { const u = (j.t - n * .055) / .32; if (u < 0 || u > 1) continue; const an = hsh(n, 5) * 6.283, d = rad * .78 + 80 * easeOut(u), x = cx + Math.cos(an) * d, y = cy + Math.sin(an) * d * .8, ty = hsh(n, 6), al = 1 - Math.min(1, Math.max(0, (u - .6) / .4)); if (ty < .62) spr(g, ty < .3 ? j.img : (j.img === 'foot' ? 'foot' : 'fist'), x, y, 56 + 26 * hsh(n, 7), an + 1.6, al); else drawStar(g, x, y, 10 + 6 * hsh(n, 8), u * 5, al); }
      }
    }
    g.restore();
  }
  if (!lowQ && state === 'fight') for (const f of [P, E]) if (!f.dead && f.hp > 0 && f.hp < f.maxhp * .25) { g.save(); for (let i = 0; i < 3; i++) { const u = (now * .9 + i * .33) % 1, x = f.x - f.w * .25 + i * f.w * .25, y = GROUND + laneY(f) - f.z - f.lift - f.h * .95 + u * f.h * .3; g.globalAlpha = 1 - u; g.fillStyle = '#9fe0ff'; g.beginPath(); g.arc(x, y, 4, 0, 6.283); g.fill(); g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x, y - 11); g.lineTo(x + 4, y); g.fill(); } g.restore(); }
  if (LIFE && !lowQ) for (const f of [P, E]) { // speed lines behind a lunge or a dash
    const a = f.act; if (!a || f.dead || !((a.name === 'melee' && a.t > .1 && a.t < .36) || a.name === 'dash' || (a.name === 'sp' && a.key === 'dash'))) continue;
    const cy = GROUND + laneY(f) - f.z - f.lift - f.h * .5; g.save(); g.globalAlpha = .55; g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.lineCap = 'round';
    for (let i = 0; i < 6; i++) { const yy = cy - 46 + i * 18, L = 36 + (i * 37 % 34), x0 = f.x - f.face * (f.w * .35 + i * 5); g.beginPath(); g.moveTo(x0, yy); g.lineTo(x0 - f.face * L, yy + (i % 2 ? 3 : -3)); g.stroke(); } g.restore();
  }
}
function damage(att, def, amount, knock, pt, big, ty) {
  if (def.dead || state !== 'fight') return false; if (def.inv <= 0 && VAR.absorb(att, def, amount)) return false;
  if (def.inv > 0) { if (amount > 0 && now - def.evT > .6) { def.evT = now; floatText(pt.x, pt.y - 30, 'EVADED', '#9fe8ff'); } return false; }
  if (amount > 0 && ty && !att.reflecting) { // abilities that turn an incoming type aside
    const ab = def.ability;
    if (ab.levi && ty === 'ground') { abilityPop(def, 'LEVITATE!', '#bfe0ff'); return false; }
    if (ab.absorb === ty) { const gain = Math.round(amount * .5); def.hp = Math.min(def.maxhp, def.hp + gain); abilityPop(def, ab.name.toUpperCase() + ' +' + gain, '#7dff9a'); return false; }
  }
  if (def.counterT > 0 && !att.reflecting && amount > 0) { // Counter / Bide: nothing lands, the hit comes back stronger
    def.counterT = 0; def.act = null; def.charging = false; def.reflecting = true; spark(pt.x, pt.y, '#ffd34d', 14); sfx('block'); floatText(pt.x, pt.y - 40, 'COUNTER!', '#ffd34d');
    damage(def, att, amount * 1.6 + 20, -def.face * 480, center(att), true, 'fighting'); def.reflecting = false; return true;
  }
  const eff = ty ? effect(ty, def.kit.types) : 1, stab = ty && att.kit.types.includes(ty) ? 1.15 : 1;
  const cHit = !!(def.act && def.act.t < .3 && amount > 0 && !att.reflecting && !att.hazard), jugS = def.canJuggle && def.z > 20 ? Math.pow(.8, def.juggleN) : 1, abil = att.ability || {};
  let d0 = amount * att.mult * VAR.dmgMul(att, def, ty, amount) * (att.debT > 0 ? .72 : 1) * (def.shieldT > 0 ? .5 : 1) * (att.isAI ? DIFF[selDiff].dmg * (tourOn && tour ? 1 + .05 * tour.round : 1) : 1) * (eff === 0 ? .15 : clamp(eff, .25, 4)) * stab * wxMul(ty) * (abil.boost && att.abilOn && ty && att.kit.types.includes(ty) ? 1.5 : 1) * (abil.guts && statusy(att) ? 1.2 : 1) * (att.burnT > 0 ? .8 : 1) * (LIFE && att.hp > 0 && att.hp < att.maxhp * .25 ? 1.2 : 1) * (cHit ? 1.25 : 1) * jugS * (def.ability.multi && def.hp >= def.maxhp * .95 ? .5 : 1) * (def.ability.armor || 1) * (abil.atk || 1) * (def.ability.resist && def.ability.resist.includes(ty) ? .5 : 1) * (def.ability.scale && statusy(def) ? .72 : 1) * (def.sleepT > 0 ? 1.3 : 1) * DMG_SCALE * GM.dmg * (att.shockT > 0 && att.shockV === 2 ? .5 : 1);
  const crit = amount >= 14 && !att.reflecting && !def.ability.nocrit && Math.random() < .07 + (abil.crit || 0); if (crit) d0 *= 1.5;
  if (now - def.comboT < .9) def.comboN++; else def.comboN = 0; def.comboT = now; d0 *= Math.max(.45, 1 / (1 + .22 * def.comboN)); // long strings of hits lose power
  let blocked = !att.unblockable && def.guarding && staEff(def) > 0 && Math.sign(att.x - def.x) === def.face, gbreak = false;
  if (blocked && big && amount > 0 && staEff(def) <= 24) { blocked = false; gbreak = true; } // a heavy hit against a tired guard breaks it
  if (blocked && def.guardAge < .2 && amount > 0) { // a guard raised just in time parries: no damage and the attacker is staggered
    def.sta = Math.min(100, def.sta + 14); def.ki = Math.min(100, def.ki + 8); att.hitT = Math.max(att.hitT, .5); att.act = null; att.vx = 0; att.kvx = -att.face * 260; sfx('block'); shake = Math.max(shake, 8); freeze = Math.max(freeze, .09);
    spark(pt.x, pt.y, '#fff8a0', 16); floatText(pt.x, pt.y - 36, 'PARRY!', '#fff8a0'); sfx('parry'); if (def === meF() || att === meF()) buzz(35); if (def === meF()) stats.parry++; return true;
  }
  let d = d0;
  if (gbreak) { d = d0 * .8; def.sta = 0; floatText(pt.x, pt.y - 60, 'GUARD BREAK!', '#ff5a5a', 28); sfx('boom'); shake = Math.max(shake, 12); }
  if (blocked) { d = d0 * .2; def.ki = Math.min(100, def.ki + 2); spend(def, big ? 24 : 9); spark(pt.x, pt.y, '#8cf', 6); sfx('block'); def.x += Math.sign(def.x - att.x) * 10; kickF(def, -.04, -.06, 0, -def.face * 9); }
  else {
    def.hitT = gbreak ? .75 : att.launch ? .6 : cHit ? .42 : big ? .45 : .26; def.hitBig = !!big; def.sleepT = Math.max(0, def.sleepT - 1.2); def.act = null; def.under = false; def.fade = 1; def.kvx = knock; def.flash = .12; def.ki = Math.min(100, def.ki + 3);
    const pw = clamp(d0 / (def.maxhp * .05), 0, 1), tc = colsOf(ty || 'normal'); // heavier hits freeze and zoom more
    if (!big) kickF(def, .18 * (.5 + pw), -.13 * (.5 + pw), -def.face * 8 * (.5 + pw), -def.face * 10 * (.5 + pw)); if (big || crit) def.chromaT = .16; if (att.act && att.act.name === 'melee') kickF(att, -.05, .04, 0, att.face * 6);
    spark(pt.x, pt.y, '#fff', big ? 16 : 10); typeHit(pt.x, pt.y, ty || 'normal', eff > 1 ? 24 : eff < 1 ? 4 : big ? 16 : 9); hitSfx(ty, now - (att.cbT ?? -9) < 1.3 ? att.cbN + 1 : 1); if (eff > 1) sfx('chime'); shake = Math.max(shake, big ? 14 : 6);
    freeze = Math.max(freeze, (big ? .07 : .04) + .05 * pw + (eff > 1 ? .03 : 0) + (crit ? .03 : 0)); punch = Math.max(punch, .012 + .04 * pw + (big ? .015 : 0) + (crit ? .025 : 0));
  if (big && att && !att.dead && now - (att.sayAt || -9) > 6 && Math.random() < .4) speak(att, .3); // a big hit sometimes earns a taunt
    if (eff > 1) { flashCol = rgbOf(tc[1]); flashT = Math.max(flashT, .07); } else if (eff < 1) puff(pt.x, pt.y, 5, 'rgba(160,170,180,.6)', 50);
    if (big || crit || eff > 1) impacts.push({ x: pt.x, y: pt.y, t: 0, n: big ? 14 : 9, col: tc[0], rot: rnd(0, 6.28) }); // radiating impact lines
    juiceHit(att, def, pt, pw, big, crit, ty, tc);
    if (att.launch) { def.vz = 640; def.canJuggle = true; def.juggleN = 0; if (LIFE) floatText(pt.x, pt.y - 100, 'LAUNCH!', '#9fe8ff', 30); } // a launcher pops the foe up so one or two more hits can follow
    else if (att.slamHit) { // the fourth hit of a combo drives the juggled foe into the floor; it bounces once on landing
      def.hv = 3; styleHit(def, att, 1, pt, tc[0]); def.vz = -1150; def.kvx *= .1; def.smash = true; def.cSlam = true; def.slamK = .04; def.toss = 1; def.tossV = 720; def.hitT = Math.max(def.hitT, 1.2); def.inv = Math.max(def.inv, 1.7); def.ghostT = .3;
      floatText(pt.x, pt.y - 110, 'SLAM!', '#ffd34d', 34); shake = Math.max(shake, 16); freeze = Math.max(freeze, .1);
    }
    else if (def.canJuggle && def.z > 20) { def.juggleN++; def.vz = Math.max(def.vz, 380); if (def.juggleN >= 2) def.canJuggle = false; }
    else def.vz = Math.max(def.vz, big ? 260 : 250); // even a light hit pops the foe up a little so the knock-back is an arc, not a straight slide
    if (big && !att.launch && !(def.canJuggle && def.z > 20) && !def.dead) { const pw2 = clamp(d0 / (def.maxhp * .09), 0, 1); def.toss = 3; def.tossV = 420 + 300 * pw2; def.vz = Math.max(def.vz, def.tossV); def.hitT = Math.max(def.hitT, 1.15 + .25 * pw2); def.kvx = (Math.sign(def.x - att.x) || att.face) * (Math.abs(knock) * .5 + 520 + 760 * pw2) * .7; def.sqT = 0; def.hv = pickHv(def); styleHit(def, att, pw2, pt, tc[0]); } // strong hits throw the foe flat on its back, bouncing away over the floor
    def.el.style.clipPath = '';
    def.pv = Math.floor(Math.random() * 3); def.sta = Math.max(0, def.sta - clamp(2 + d0 / def.maxhp * 110, 2.5, 11)); def.staDelay = Math.max(def.staDelay, .6); // being hit knocks stamina out of you even when the bar is full
    if (big && !att.launch && !att.hazard && !def.canJuggle && def.z < 20 && d0 >= def.maxhp * .035 && (crit || Math.random() < .22)) { // a crushing blow throws the foe across the arena and up into the sky
      def.smash = true; def.hv = -1; def.kvx = (Math.sign(def.x - att.x) || att.face) * 1500; def.vz = 1050; def.hitT = 1.9; def.hitBig = true; def.toss = 3; def.tossV = 460; slowT = Math.max(slowT, .45); punch = Math.max(punch, .1); shake = Math.max(shake, 26); flashCol = '255,255,255'; flashT = Math.max(flashT, .12);
      floatText(pt.x, pt.y - 100, 'SMASH!', '#ff5a3a', 38); sfx('smash'); impacts.push({ x: pt.x, y: pt.y, t: 0, n: 18, col: '#fff', rot: 0 }); if (def === meF()) buzz(120);
    }
    if (big && !att.launch && !def.canJuggle) { def.inv = Math.max(def.inv, def.hitT + .5); def.ghostT = .14; } // no endless juggling: a knockdown is followed by a moment of invulnerability
    if (crit) { shake += 6; spark(pt.x, pt.y, '#ffd34d', 18); floatText(pt.x, pt.y - 70, 'CRITICAL!', '#ffd34d'); sfx('crit'); impactT = .08; impX = pt.x - camX; impY = pt.y; }
    if (cHit) { floatText(pt.x, pt.y - 88, 'COUNTER HIT!', '#ff9a3a', 26); freeze = Math.max(freeze, .06); }
    const st = STATUS_ON_HIT[ty];
    if (st && !statusy(def) && Math.random() < st[1] * (big ? 1.5 : 1) * (amount >= 14 ? 1 : .5) * (abil.serene ? 2 : 1) * (def.ability.dust ? .4 : 1)) applyStatus(def, st[0], false, att);
    else if (!big && !gbreak && !def.ability.focus && !att.hazard && Math.random() < .08) { def.hitT = .55; floatText(def.x, GROUND - def.z - def.lift - def.h - 10, 'FLINCH!', '#fff', 22); }
    if (def.ability.contact && att.act && att.act.name === 'melee' && !statusy(att) && Math.random() < .3) applyStatus(att, def.ability.contact, false, def);
  }
  if (def.ability.sturdy && !def.sturdyUsed && def.hp >= def.maxhp * .9 && d >= def.hp) { d = def.hp - 1; def.sturdyUsed = true; floatText(def.x, GROUND - def.z - def.lift - def.h - 30, 'STURDY!', '#d9c08a', 28); }
  def.hp = Math.max(0, def.hp - d); VAR.onHit(att, def, ty, d, eff, blocked, big); att.ki = Math.min(100, att.ki + (blocked ? 1 : 5)); if (!blocked && d > 0 && amount > 0) shockHit(def, d);
  if (!blocked) { if (now - (att.cbT ?? -9) < 1.3) { att.cbN++; att.cbD += d; } else { att.cbN = 1; att.cbD = d; } att.cbT = now; }
  if (att === meF()) { stats.dealt += d; stats.combo = Math.max(stats.combo, att.cbN || 0); } if (def === meF()) stats.taken += d;
  if (!blocked && att.act && !att.hazard && (att.act.name === 'melee' || att.act.name === 'grab' || (att.act.name === 'sp' && CANCEL_KEYS.has(att.act.key)))) att.act.landed = true;
  if (def === meF()) buzz(gbreak ? 90 : blocked ? 8 : Math.round(14 + 110 * clamp(d / def.maxhp * 6, 0, 1)) + (big ? 12 : 0)); else if (att === P && !blocked) buzz(12);
  floatText(pt.x, pt.y - 20, Math.round(d), blocked ? '#8cf' : eff > 1 ? colsOf(ty)[1] : (big ? '#ffd34d' : '#fff'), blocked ? 28 : eff > 1 ? 36 : eff < 1 ? 22 : 28);
  if (!blocked && eff !== 1 && now - def.effAt > .7) {
    def.effAt = now; const sup = eff > 1;
    if (sup && LIFE && !demo) { supT = 1; supCol = colsOf(ty)[1]; } else floatText(pt.x, pt.y - 52, eff === 0 ? 'NO EFFECT' : sup ? 'SUPER EFFECTIVE!' : 'NOT VERY EFFECTIVE', sup ? '#ff7a3a' : '#9fb4c8', sup ? 36 : 24); // a super-effective hit gets a big banner
  }
  if (def.hp <= 0) ko(def, att);
  return true;
}
function ko(def, att) {
  if (att === HAZ) att = other(def);
  def.dead = true; def.vz = 420; def.kvx = att.face * 260; def.act = null; def.under = false; def.fade = 1; def.el.style.clipPath = ''; winner = att; overT = 0; state = 'ko';
  sfx('ko'); buzz(320); $('bars').classList.add('on'); setTimeout(() => $('bars').classList.remove('on'), 1700); shake = 22; freeze = .25; slowT = 1.5; punch = .2; flashCol = '255,255,255'; flashT = .15; showMsg('K.O.!', 1800);
  koLineT = .55; koLineCol = colsOf(att.kit.types[0] || 'normal')[1]; koLineX = def.x - camX; koLineY = GROUND - def.h * .5; sfx('boom'); speak(att, .5); // speed lines round the loser and the winner has a word
}
function inReach(f, o, reach) {
  const b = body(o), fx = f.x + f.face * f.w * .15, edge = fx + f.face * (f.w * .35 + reach), x1 = Math.min(fx, edge), x2 = Math.max(fx, edge), fb = body(f);
  return x2 > b.x1 && x1 < b.x2 && fb.y2 > b.y1 && fb.y1 < b.y2 && Math.abs(f.lp - o.lp) < .6;
}
function circleRect(cx, cy, r, b) { const x = clamp(cx, b.x1, b.x2), y = clamp(cy, b.y1, b.y2); return (cx - x) ** 2 + (cy - y) ** 2 <= r * r; }
function ghost(f) { f.ghostT = .05; }
function aimLunge(f, o, dt, spd = 4000) { // a flyer's rush climbs or dives toward the foe's height instead of running level
  if (!isFly(f) || f.under) return;
  const fc = center(f), oc = center(o), dy = oc.y - fc.y;
  const step = Math.min(Math.abs(dy), spd * dt);
  f.lift = Math.max(0, f.lift - Math.sign(dy) * step); f.aimT = .12;
}

// every special move is one of these archetypes: what it does, what it costs and when the AI should use it
const D = (f, v) => v * f.kit.spaM;
const ROCK_TY = { ice: 'ice', fire: 'fire', rock: 'rock' };
const ALERT_LEN = { wave: 760, quake: 600, minibeam: 560, geyser: 700, cannon: 700, blast: 800, volley: 620, combo: 300, strike: 0, boulder: 700, spin: 560, spikes: 700 };
const METRO = ['strike', 'blast', 'wave', 'quake', 'rain', 'blizzard', 'geyser', 'cannon', 'volley', 'combo', 'leap', 'minibeam', 'slash', 'drain', 'ring', 'sleep', 'para', 'poison', 'tornado'];
const METRO_TY = ['fire', 'water', 'electric', 'psychic', 'ice', 'rock', 'normal', 'grass', 'fighting', 'ghost', 'dragon'];
const DEBUFF_KIND = { 'string-shot': 'web', 'sand-attack': 'sand', 'smokescreen': 'smoke', 'flash': 'flashy', 'screech': 'psy', 'supersonic': 'psy', 'confuse-ray': 'shadow' };
const comboFx = raw => /kick/.test(raw) ? 'foot' : /punch|chop|slap|crab|strength|thrash|pay|slam/.test(raw) ? 'fist' : /swipe|fury|scratch|vice|petal/.test(raw) ? 'sword' : 'impact';
let popups = [];
function hitFx(x, y, img, s = 1) { popups.push({ x, y, img, t: 0, rot: rnd(-.5, .5), s }); }
function meleeFx(f, o, name, big) {
  const c = center(o), nmx = name.toLowerCase(); f.x += f.face * clamp(Math.abs(o.x - f.x) - (f.w + o.w) * .27, 0, 70); // step right up to the foe
  const n = ((f.act && f.act.n) | 0), d = CDIR[n === 2 ? 3 : n % 2 ? 1 : 0]; // each blow of the chain comes from a new side; the launcher is an uppercut
  jpush({ k: 'cfist', x: c.x, y: c.y, dx: d[0] * f.face, dy: d[1], img: comboFx(nmx), col: colsOf(f.kit.melee.type)[1], i: n, t: .03, life: .5, big: !!big });
}
function rollFx(f, ty, dt) { // particles while a Pokémon rolls or spins: leaves, dust, flames, droplets, sparks
  const x = f.x + rnd(-f.w * .3, f.w * .3), y = GROUND - f.z - f.lift - rnd(0, f.h * .8), earth = ty === 'rock' || ty === 'ground';
  if (Math.random() < dt * 40) {
    if (ty === 'grass') popups.push({ x, y, img: Math.random() < .5 ? 'leaf1' : 'leaf2', t: 0, rot: rnd(-3, 3), s: .8 });
    else sparks.push({ x, y, vx: rnd(-160, 160), vy: rnd(-160, 40), t: 0, life: .45, col: earth ? '#c9b88a' : colsOf(ty)[1], size: rnd(3, 6) });
  }
  if (Math.random() < dt * 25 && f.z + f.lift < 120) puff(f.x - f.face * f.w * .3, GROUND + laneY(f), 1, earth ? 'rgba(170,140,90,.7)' : 'rgba(230,230,230,.5)', 50);
}
function spore(f, a, st) { // sleep powder, poison gas and stun spore drift to the foe and apply their status on contact
  const m = muzzle(f); projectiles.push({ owner: f, x: m.x, y: m.y, vx: f.face * 430, vy: 0, r: 30, dmg: D(f, 9), kind: 'spore', st, cols: colsOf(a.ty), life: 2.4, rot: 0, trail: [], home: true, ty: a.ty, miss: a.miss }); sfx(st === 'slow' ? 'zap' : 'heal');
}
const ARCH = {
  vine: { cost: 10, cool: 1.1, range: [0, 280], dur: .6,
    start(f, o, a) { vines.push({ owner: f, t: 0, dur: .6, hit: false, reach: 270, dmg: D(f, 58), ty: a.ty, miss: a.miss }); sfx('whip'); } },
  strike: { cost: 28, cool: 3, range: [100, 800], dur: 1.05,
    start(f, o, a) { a.off = a.miss ? (Math.random() < .5 ? -1 : 1) * rnd(230, 300) : 0; a.mark = o.x + a.off; sfx('charge'); },
    tick(f, o, a) {
      f.charging = true; if (a.t < .45) a.mark = o.x + a.off;
      if (!a.done && a.t >= .8) { a.done = true; strikes.push({ x: a.mark, t: 0, sv: a.sv ? a.ty : 0 }); sfx('zap'); boom(a.mark, GROUND - 30, 150, '#ffe01a', 24); if (a.sv) svBoom(a.mark, GROUND - 30, a.ty, .9); aoe(f, a.mark, o.z + o.lift > 60 ? center(o).y : GROUND - 50, 150, D(f, 72), 520, true, null, a.ty); cracks.push({ x: a.mark, t: 0, dur: 2.5 }); if (a.miss) floatText(a.mark, GROUND - 130, 'MISS', '#ddd'); }
    } },
  blast: { cost: 25, cool: 3, range: [220, 900], dur: .55,
    start(f, o, a) { sfx('charge'); if (a.sv) SPV.snd('charge1', () => f.act === a && !a.done); },
    tick(f, o, a) {
      f.vx = 0;
      if (!a.done && a.t >= .25) {
        a.done = true; const m = muzzle(f), t0 = a.ty || f.kit.types[0], c = colsOf(t0);
        projectiles.push({ owner: f, x: m.x, y: m.y, vx: f.face * 500, vy: a.miss ? -150 : 0, r: 30, dmg: 0, kind: t0 === 'fire' ? 'fire' : 'orb', cols: c, life: 2, rot: 0, trail: [], explode: { r: 175, dmg: D(f, 54), col: c[1] }, dist: 900, ty: a.ty, miss: a.miss, sv: a.sv ? 'blast' : 0 }); sfx('shot'); if (a.sv) { const pr = projectiles[projectiles.length - 1]; SPV.snd('release', () => pr.life > 0); }
      }
    } },
  dig: { cost: 18, cool: 3.2, range: [200, 900], dur: 99,
    start(f, o, a) { a.phase = 0; f.vx = 0; sfx('whip'); for (let i = 0; i < 4; i++) hitFx(f.x + rnd(-40, 40), GROUND - rnd(8, 40), 'rock' + (1 + i % 3)); },
    tick(f, o, a, dt) {
      if (a.phase === 0) { a.sink = clamp(a.t / .35, 0, 1); f.vx = 0; if (a.t >= .35) { a.phase = 1; a.t1 = 0; f.under = true; } }
      else if (a.phase === 1) {
        a.t1 += dt; f.inv = Math.max(f.inv, .1); f.x += Math.sign(o.x - f.x) * 700 * dt; f.vx = 0;
        if (Math.random() < .7) puff(f.x, GROUND, 1, 'rgba(120,80,40,.8)', 80); if (Math.random() < .25) hitFx(f.x, GROUND - 12, 'mudwisp');
        if (Math.abs(o.x - f.x) < 40 || a.t1 > 1.6) {
          a.phase = 2; a.t2 = 0; f.under = false; f.vz = Math.max(640, Math.sqrt(4200 * (Math.max(0, o.z + o.lift - f.lift) + 110))); f.inv = .15; f.el.style.clipPath = ''; // bursts up as high as a flying foe
          for (let i = 0; i < 6; i++) hitFx(f.x + rnd(-70, 70), GROUND - rnd(10, 90), 'rock' + (1 + i % 3), 1.2);
          puff(f.x, GROUND, 14, 'rgba(120,80,40,.8)', 200); shake = Math.max(shake, 14); sfx('boom'); aoe(f, f.x, o.z + o.lift > 40 ? center(o).y : GROUND - 70, 140, D(f, 62), 480, true, null, a.ty);
        }
      } else { a.t2 += dt; if (a.t2 > .4) endAct(f); }
    } },
  quake: { cost: 22, cool: 3, range: [0, 560], dur: .95,
    start(f, o, a) { f.vz = 380; },
    tick(f, o, a) {
      f.vx = 0;
      if (!a.done && a.t >= .3) {
        a.done = true; f.vz = -900; shake = Math.max(shake, 28); sfx('beam'); puff(f.x, GROUND, 16, 'rgba(160,120,70,.8)', 260);
        for (const s of [-1, 1]) waves.push({ owner: f, kind: 'quake', x: f.x, vx: s * 640, t: 0, dur: 1.1, hit: false, dmg: D(f, 55), ty: a.ty });
        cracks.push({ x: f.x, t: 0, dur: 3 });
      }
    } },
  teleport: { cost: 14, cool: 2.6, range: [200, 900], dur: .8,
    start(f, o, a) { sfx('tele'); },
    tick(f, o, a) {
      if (a.t < .2) { f.inv = Math.max(f.inv, .1); f.fade = 1 - a.t / .2; }
      else if (!a.moved) {
        a.moved = true; hitFx(f.x, GROUND - f.h / 2, 'mistball', 1.4); hitFx(f.x, GROUND - f.h / 2, 'shine', 1.2); spark(f.x, GROUND - f.h / 2, '#fff', 10); f.x = clamp(o.x - o.face * (o.w * .5 + f.w * .5 + 20), WALL_L, WALL_R); f.z = 0; f.face = o.x >= f.x ? 1 : -1; f.fade = 0; hitFx(f.x, GROUND - f.h / 2, 'mistball', 1.4); hitFx(f.x, GROUND - f.h / 2, 'shine', 1.2); spark(f.x, GROUND - f.h / 2, '#fff', 10); sfx('tele');
      } else if (a.t < .4) f.fade = (a.t - .2) / .2;
      else { f.fade = 1; if (!a.hit) { a.hit = true; const c = center(o); aoe(f, c.x, c.y, o.w * .6, D(f, 50), 420, true, null, a.ty); } }
    } },
  dash: { cost: 8, cool: 1.6, range: [150, 650], dur: .55,
    tick(f, o, a, dt) {
      if (a.t < .1) f.vx = -f.face * 80;
      else if (a.t < .38) { f.vx = f.face * 1300; ghost(f); aimLunge(f, o, dt); if (!a.hit && inReach(f, o, 30)) { a.hit = true; const c = center(o); if (a.miss) floatText(c.x, c.y - 30, 'MISS', '#ddd'); else damage(f, o, D(f, 46), f.face * 520, c, true, a.ty); f.vx *= .2; } }
      else f.vx *= .8;
    } },
  wave: { cost: 24, cool: 3, range: [200, 760], dur: .7,
    start(f, o, a) { sfx('whip'); },
    tick(f, o, a) { f.vx = 0; if (!a.done && a.t >= .4) { a.done = true; shake = Math.max(shake, 10); waves.push({ owner: f, kind: 'surf', x: f.x + f.face * 30, vx: f.face * 520, t: 0, dur: 1.7, hit: false, dmg: D(f, 54), ty: a.ty, wt: f.kit.types[0], sv: a.sv }); sfx('beam'); } } },
  rain: { cost: 22, cool: 3.2, range: [200, 900], dur: .9,
    start(f, o, a) {
      a.style = f.kit.types.includes('ice') ? 'ice' : f.kit.types.includes('fire') ? 'fire' : 'rock';
      const off = a.miss ? (Math.random() < .5 ? -1 : 1) * rnd(210, 280) : 0;
      for (let i = 0; i < 6; i++) rocks.push({ owner: f, x: clamp(o.x + off + (i - 2.5) * 85 + rnd(-25, 25), 40, WORLD_W - 40), y: -90, t: 0, delay: .5 + i * .12, style: a.style, dmg: D(f, 30), sv: a.sv && a.style === 'rock', first: i === 0 });
      sfx('charge');
    }, tick(f, o, a) { f.vx = 0; f.charging = true; } },
  blizzard: { cost: 24, cool: 3.4, range: [200, 900], dur: .9,
    start(f, o, a) { const off = a.miss ? (Math.random() < .5 ? -1 : 1) * rnd(210, 280) : 0; for (let i = 0; i < 7; i++) rocks.push({ owner: f, x: clamp(o.x + off + (i - 3) * 75 + rnd(-20, 20), 40, WORLD_W - 40), y: -90, t: 0, delay: .45 + i * .1, style: 'ice', dmg: D(f, 24), freeze: true, sv: a.sv }); sfx('charge'); },
    tick(f, o, a) { f.vx = 0; f.charging = true; } },
  ring: { cost: 16, cool: 3, range: [100, 560], dur: .6,
    start(f, o, a) { zones.push({ kind: 'ring', owner: f, x: o.x, t: 0, dur: 1.9, r: 100, tick: 0, dmg: D(f, 14), col: colsOf(a.ty), ty: a.ty, miss: a.miss }); sfx('whip'); }, tick(f) { f.vx = 0; } },
  tornado: { cost: 12, cool: 2, range: [100, 560], dur: .5,
    tick(f, o, a) { f.vx = 0; if (!a.done && a.t >= .2) { a.done = true; const m = muzzle(f); projectiles.push({ owner: f, x: m.x, y: m.y, vx: f.face * 440, vy: 0, r: 46, dmg: D(f, 20), kind: 'gust', cols: ['#ffffff', '#c8e0ff'], life: 2, rot: 0, trail: [], lift: true, knock: 800, ty: a.ty, miss: a.miss, sv: a.sv ? 'gust' : 0 }); sfx('shot'); } } },
  sleep: { cost: 18, cool: 3.4, range: [140, 600], dur: .6,
    start(f, o, a) { sfx('whip'); }, tick(f, o, a) { f.vx = 0; if (!a.done && a.t >= .2) { a.done = true; spore(f, a, 'sleep'); } } },
  poison: { cost: 14, cool: 3, range: [140, 600], dur: .6,
    start(f, o, a) { sfx('whip'); }, tick(f, o, a) { f.vx = 0; if (!a.done && a.t >= .2) { a.done = true; spore(f, a, 'poison'); } } },
  para: { cost: 12, cool: 3, range: [140, 600], dur: .6,
    start(f, o, a) { sfx('whip'); }, tick(f, o, a) { f.vx = 0; if (!a.done && a.t >= .2) { a.done = true; spore(f, a, 'slow'); } } },
  selfdestruct: { cost: 40, cool: 6, range: [0, 170], dur: 1.0,
    start(f, o, a) { sfx('charge'); if (a.sv) SPV.snd('ss2', () => f.act === a && !a.done); },
    tick(f, o, a) {
      f.vx = 0; f.charging = true; shake = Math.max(shake, 4); if (Math.random() < .5) hitFx(f.x + rnd(-f.w / 2, f.w / 2), GROUND - rnd(0, f.h), 'flareball', .8);
      if (!a.done && a.t >= .65) { a.done = true; boom(f.x, GROUND - f.h / 2, 250, '#ff7a1a', 32); if (a.sv) { svBoom(f.x, GROUND - f.h / 2, a.ty, 1.6, 'boom2'); SPV.flash(.8); } else { for (let i = 0; i < 7; i++) hitFx(f.x + rnd(-130, 130), GROUND - rnd(20, 150), i % 2 ? 'fireball' : 'flareball', 2); hitFx(f.x, GROUND - f.h / 2, 'shine', 3); } aoe(f, f.x, GROUND - f.h / 2, 250, D(f, 150), 700, true, null, a.ty); f.hp = Math.max(1, f.hp - f.maxhp * .25); floatText(f.x, GROUND - f.h, 'BOOM', '#ff9a3a'); }
    } },
  heal: { cost: 24, cool: 8, range: [0, 9999], dur: 1.3, when: f => f.hp < f.maxhp * .65,
    start(f, o, a) { sfx('heal'); }, tick(f, o, a, dt) { f.vx = 0; f.charging = true; f.hp = Math.min(f.maxhp, f.hp + f.maxhp * .2 / 1.3 * dt); if (Math.random() < .5) sparks.push({ x: f.x + rnd(-f.w / 2, f.w / 2), y: GROUND - rnd(0, f.h), vx: 0, vy: -90, t: 0, life: .7, col: '#7dff9a', size: 4 }); } },
  buff: { cost: 16, cool: 9, range: [0, 9999], dur: .8, when: f => f.buffT <= 0,
    start(f, o, a) { f.buffT = 10; floatText(f.x, GROUND - f.h - 10, 'POWER UP!', '#ffd34d'); sfx('charge'); }, tick(f) { f.vx = 0; f.charging = true; } },
  geyser: { cost: 20, cool: 3.2, range: [100, 760], dur: .9,
    start(f, o, a) {
      const d = o.x - f.x, n = 5; sfx('whip');
      for (let i = 0; i < n; i++) pillars.push({ owner: f, x: clamp(f.x + d * (i + 1) / n + (i === n - 1 && a.miss ? (Math.random() < .5 ? -1 : 1) * rnd(200, 260) : 0), 40, WORLD_W - 40), t: 0, delay: .25 + i * .13, ty: a.ty, dmg: D(f, 40), done: false, sv: a.sv, first: i === 0 });
    }, tick(f) { f.vx = 0; f.charging = true; } },
  cannon: { cost: 24, cool: 3.4, range: [250, 900], dur: .8,
    start(f, o, a) { sfx('charge'); },
    tick(f, o, a) {
      f.vx = 0; f.charging = a.t < .5;
      if (!a.done && a.t >= .5) { a.done = true; const m = muzzle(f); projectiles.push({ owner: f, x: m.x, y: m.y, vx: f.face * 520, vy: a.miss ? -90 : 0, r: 34, dmg: D(f, 64), kind: VOLLEY_KIND[a.ty] || 'orb', cols: colsOf(a.ty), life: 2.4, rot: 0, trail: [], knock: 700, big: true, ty: a.ty, miss: a.miss }); f.x -= f.face * 16; shake = Math.max(shake, 8); sfx('boom'); }
    } },
  slash: { cost: 14, cool: 2.4, range: [60, 560], dur: .6,
    tick(f, o, a) {
      f.vx = 0;
      for (let i = 0; i < 2; i++) if (!a['s' + i] && a.t >= .1 + i * .14) { a['s' + i] = true; const m = muzzle(f); projectiles.push({ owner: f, x: m.x, y: m.y + (i ? 34 : -34), vx: f.face * 780, vy: 0, r: 40, dmg: D(f, 30), kind: 'slash', tilt: i ? 1 : -1, cols: colsOf(a.ty), life: .8, rot: 0, trail: [], ty: a.ty, miss: a.miss, sv: a.sv ? 'slash' : 0 }); if (a.sv) { if (i === 0) SPV.snd('hand'); } else sfx('whip'); }
    } },
  volley: { cost: 18, cool: 3, range: [200, 800], dur: .95,
    start(f, o, a) { sfx('charge'); a.shots = 0; },
    tick(f, o, a) {
      f.vx = 0; f.charging = a.t < .25;
      while (a.shots < 7 && a.t >= .25 + a.shots * .07) {
        const i = a.shots++, m = muzzle(f), ang = (i - 3) * .12;
        projectiles.push({ owner: f, x: m.x, y: m.y, vx: Math.cos(ang) * 700 * f.face, vy: Math.sin(ang) * 700, r: 14, dmg: D(f, 15), kind: VOLLEY_KIND[a.ty] || 'star', cols: colsOf(a.ty), life: 1.6, rot: 0, trail: [], home: true, ty: a.ty, miss: rollMiss(a.sp.acc) }); sfx('shot');
      }
    } },
  spin: { cost: 16, cool: 3, range: [120, 620], dur: .95, // curl up and roll through the foe like a wheel
    start(f, o, a) { sfx('whip'); },
    tick(f, o, a, dt) {
      a.spinOn = a.t >= .18 && a.t < .8; a.deg = (a.t - .18) * 2300;
      if (a.t < .18) f.vx = -f.face * 90;
      else if (a.t < .8) {
        f.vx = f.face * 1100; ghost(f); aimLunge(f, o, dt); rollFx(f, a.ty, dt);
        if (!a.hit && inReach(f, o, 34)) { a.hit = true; const c = center(o); if (a.miss) floatText(c.x, c.y - 30, 'MISS', '#ddd'); else { f.launch = true; damage(f, o, D(f, 54), f.face * 640, c, true, a.ty); f.launch = false; } f.vx *= .25; }
      } else f.vx *= .8;
    } },
  whirl: { cost: 20, cool: 3.4, range: [0, 300], dur: 1.15, // spin on the spot, throwing a ring of leaves, rocks, flames or feathers that shreds anything close
    start(f, o, a) { zones.push({ kind: 'whirl', owner: f, x: f.x, t: 0, dur: 1, r: 200, tick: .1, dmg: D(f, 17), ty: a.ty, miss: a.miss }); sfx('whip'); },
    tick(f, o, a) { f.vx = f.face * 90; a.spinOn = false; } },
  boulder: { cost: 22, cool: 3.4, range: [200, 800], dur: .75, // roll a boulder along the ground like a bowling ball
    start(f, o, a) { sfx('charge'); },
    tick(f, o, a) {
      f.vx = 0; f.charging = a.t < .3;
      if (!a.done && a.t >= .3) { a.done = true; waves.push({ owner: f, kind: 'boulder', x: f.x + f.face * 50, vx: f.face * 640, t: 0, dur: 1.9, hit: false, dmg: D(f, 60), ty: a.ty, rot: 0, miss: a.miss }); shake = Math.max(shake, 6); sfx('boom'); puff(f.x + f.face * 50, GROUND, 8, 'rgba(160,130,90,.8)', 120); }
    } },
  roots: { cost: 18, cool: 3.4, range: [100, 600], dur: .85, // roots burst out of the ground under the foe and tangle it
    start(f, o, a) {
      sfx('whip'); const side = Math.random() < .5 ? -1 : 1;
      for (let i = 0; i < 3; i++) pillars.push({ owner: f, x: o.x, t: 0, delay: .5 + i * .32, ty: a.ty, dmg: D(f, 34), done: false, kind: 'root', track: true, off: (i === 0 ? 0 : (i === 1 ? -1 : 1) * 70) + (a.miss ? side * 230 : 0) });
    }, tick(f) { f.vx = 0; f.charging = true; } },
  spikes: { cost: 20, cool: 3.2, range: [150, 750], dur: .9, // a line of stone, bone or ice spikes erupts toward the foe
    start(f, o, a) {
      const d = o.x - f.x, n = 5; sfx('whip');
      for (let i = 0; i < n; i++) pillars.push({ owner: f, x: clamp(f.x + d * (i + 1) / n + (i === n - 1 && a.miss ? (Math.random() < .5 ? -1 : 1) * rnd(200, 260) : 0), 40, WORLD_W - 40), t: 0, delay: .25 + i * .12, ty: a.ty, dmg: D(f, 34), done: false, kind: 'spike', sd: i * .37 + .11 });
    }, tick(f) { f.vx = 0; f.charging = true; } },
  bloom: { cost: 22, cool: 3.6, range: [150, 650], dur: 1.3, // leap up spinning and scatter a fan of leaves
    start(f, o, a) { f.vz = 820; sfx('whip'); },
    tick(f, o, a) {
      a.spinOn = a.t < .75; a.deg = a.t * 1100; f.vx = f.face * 120;
      if (!a.done && a.t >= .38) {
        a.done = true; const m = muzzle(f);
        for (let i = 0; i < 7; i++) { const ang = (i - 3) * .2; projectiles.push({ owner: f, x: m.x, y: m.y, vx: Math.cos(ang) * 620 * f.face, vy: Math.sin(ang) * 620, r: 18, dmg: D(f, 22), kind: VOLLEY_KIND[a.ty] || 'leaf', cols: colsOf(a.ty), life: 1.4, rot: 0, trail: [], ty: a.ty, miss: rollMiss(a.sp.acc) }); }
        sfx('shot');
      }
    } },
  swoop: { cost: 22, cool: 3.6, range: [200, 900], dur: 99,
    start(f, o, a) { a.phase = 0; sfx('whip'); },
    tick(f, o, a, dt) {
      f.vx = 0; f.inv = Math.max(f.inv, .1); const hi = Math.max(640, o.z + o.lift - f.lift + 360), tz = Math.max(50, o.z + o.lift - f.lift); // a flying foe is dived on at its own height
      if (a.phase === 0) { f.vz = 0; f.z += 1900 * dt; if (f.z > hi) { a.phase = 1; a.t1 = 0; a.off = a.miss ? (Math.random() < .5 ? -1 : 1) * rnd(220, 280) : 0; a.mark = o.x + a.off; } }
      else if (a.phase === 1) {
        f.vz = 0; a.t1 += dt; if (a.t1 < .55) a.mark = o.x + a.off;
        if (a.t1 >= .8) { a.phase = 2; f.x = clamp(a.mark, 60, WORLD_W - 60); f.face = o.x >= f.x ? 1 : -1; f.z = hi + 60; f.vz = -2400; }
      } else if (a.phase === 2) {
        f.vz = -2400; ghost(f);
        if (f.z <= tz) { a.phase = 3; a.t3 = 0; f.vz = 0; const iy = o.z + o.lift > 60 ? center(o).y : GROUND - 60; boom(f.x, iy + 20, 170, colsOf(a.ty)[1], 26); puff(f.x, GROUND, 12, 'rgba(230,220,200,.8)', 200); aoe(f, f.x, iy, 170, D(f, 72), 560, true, null, a.ty); if (a.miss) floatText(f.x, GROUND - 140, 'MISS', '#ddd'); }
      } else { a.t3 += dt; if (a.t3 > .35) endAct(f); }
    } },
  combo: { cost: 14, cool: 2.6, range: [0, 300], dur: 1,
    start(f, o, a) { sfx('whip'); a.cl = comboPick(f); },
    tick(f, o, a, dt) {
      const gap = Math.abs(o.x - f.x) - (f.w + o.w) * .26, cl = a.cl || 'A', fx = comboFx(a.sp.raw), col = colsOf(a.ty || f.kit.types[0])[1];
      f.vx = a.t < .22 ? f.face * clamp(gap / .2, 0, 1000) : f.face * 40; if (a.t < .5) aimLunge(f, o, dt);
      if (LIFE && !lowQ && (cl === 'A' || cl === 'D') && a.t > .16 && a.t < .86 && (a.gT = (a.gT || 0) - dt) <= 0) { a.gT = .03; for (let k = 0; k < 3; k++) f.ghosts.push({ x: f.x + Math.sin(now * 55 + k * 2.1) * 38, z: f.z, lift: f.lift + Math.abs(Math.cos(now * 40 + k)) * 14, ly: laneY(f), fo: f.fgOff || 0, fs: f.fgGs || 1, col, face: f.face, back: f.poseBack, gd: f.gd, noflip: f.gd && f.gd.noflip, at: now, life: .12 }); } // the attacker blurs into tinted copies
      if (cl === 'B' && !a.cloud && a.t >= .16) { a.cloud = true; jpush({ k: 'ccloud', a: f, d: o, t: 0, life: .63, r: clamp(Math.max(f.h, o.h) * .75, 90, 150), img: fx }); }
      for (let i = 0; i < 4; i++) if (!a['p' + i] && a.t >= .24 + i * .15 - .1) { // each blow is announced a moment before it lands
        a['p' + i] = true; if (a.miss) continue; const c = center(o), d = CDIR[i], ns = cl === 'C' || (cl === 'D' && i === 3);
        if (cl === 'C') { const dist = clamp((f.w + o.w) * .35, 90, 170), gx = o.x + d[0] * f.face * dist, gz = d[1] < 0 ? 78 : 0, p0 = a.pp || { x: f.x, y: center(f).y }; f.ghosts.push({ x: gx, z: gz, lift: 0, ly: laneY(f), fo: 0, fs: 1, col, face: o.x >= gx ? 1 : -1, back: f.poseBack, gd: f.gd, noflip: f.gd && f.gd.noflip, at: now, life: .16, front: true }); const gy = GROUND + laneY(f) - gz - f.h * .5; jpush({ k: 'cline', x0: p0.x, y0: p0.y, x1: gx, y1: gy, col, t: 0, life: .2 }); jpush({ k: 'ring', x: gx, y: gy, col, t: 0, life: .25, r: 50 }); a.pp = { x: gx, y: gy }; }
        if (cl !== 'B' && (cl !== 'D' || i < 3 || ns)) jpush({ k: 'cfist', x: c.x, y: c.y, dx: d[0] * f.face, dy: d[1], img: fx, col, i, t: 0, life: .5, big: i === 3, ns });
      }
      for (let i = 0; i < 4; i++) if (!a['h' + i] && a.t >= .24 + i * .15) {
        a['h' + i] = true; const c = center(o);
        if (inReach(f, o, 50)) {
          if (a.miss) { if (i === 0) floatText(c.x, c.y - 30, 'MISS', '#ddd'); }
          else {
            damage(f, o, D(f, i === 3 ? 34 : 16), f.face * (i === 3 ? 520 : 60), c, i === 3, a.ty);
            if (i === 3) { if (cl !== 'A') { jpush({ k: 'crad', x: c.x, y: c.y, fy: GROUND + laneY(o) + 2, img: fx, col, t: 0, life: .7 }); shake = Math.max(shake, 9); } else jpush({ k: 'ring', x: c.x, y: GROUND + laneY(o) - 2, col, t: 0, life: .5, r: 200, flat: 1 }); }
          }
        }
      }
    } },
  leap: { cost: 18, cool: 3.2, range: [150, 700], dur: 1.2,
    start(f, o, a) { a.off = a.miss ? (Math.random() < .5 ? -1 : 1) * rnd(230, 300) : 0; sfx('whip'); },
    tick(f, o, a) {
      if (a.t < .22) { f.vx = 0; return; }
      if (!a.jumped) { a.jumped = true; f.vz = 800; f.vx = clamp((o.x + a.off - f.x) / .76, -820, 820); }
      if (!a.landed) {
        ghost(f);
        if (f.z <= 0 && a.t > .4) { a.landed = true; f.vx = 0; boom(f.x, GROUND - 30, 150, colsOf(a.ty)[1], 22); puff(f.x, GROUND, 10, 'rgba(210,190,150,.8)', 160); aoe(f, f.x + f.face * 30, GROUND - 50, 150, D(f, 58), 520, true, null, a.ty); cracks.push({ x: f.x, t: 0, dur: 2 }); if (a.miss) floatText(f.x, GROUND - 140, 'MISS', '#ddd'); }
      } else f.vx = 0;
    } },
  minibeam: { cost: 20, cool: 3, range: [200, 620], dur: 1,
    start(f, o, a) { sfx('charge'); if (a.sv) SPV.snd('release', () => f.act === a || (a.bm && a.bm.t < a.bm.dur)); },
    tick(f, o, a) {
      f.vx = 0; f.charging = a.t < .4;
      if (!a.done && a.t >= .4) { a.done = true; const m = muzzle(f), c = colsOf(a.ty); beams.push({ owner: f, t: 0, dur: .55, x: m.x, y: m.y, tick: 0, w: 34, len: Math.max(560, Math.hypot(center(o).x - m.x, center(o).y - m.y) + 100), ang: aimA(m, o), dmg: D(f, 26), ty: a.ty, cols: ['#ffffff', c[0], c[1]], sv: a.sv ? 'mini' : 0 }); a.bm = beams[beams.length - 1]; sfx('beam'); shake = Math.max(shake, 6); }
    } },
  drain: { cost: 14, cool: 2.8, range: [150, 620], dur: .6,
    start(f, o, a) { sfx('shot'); },
    tick(f, o, a) {
      f.vx = 0;
      if (!a.done && a.t >= .2) { a.done = true; const m = muzzle(f); projectiles.push({ owner: f, x: m.x, y: m.y, vx: f.face * 520, vy: 0, r: 20, dmg: D(f, 36), kind: 'drain', cols: ['#e8ffd0', '#58d84a'], life: 1.8, rot: 0, trail: [], home: true, drain: true, ty: a.ty, miss: a.miss }); }
    } },
  debuff: { cost: 10, cool: 3, range: [150, 650], dur: .6,
    tick(f, o, a) {
      f.vx = 0;
      if (!a.done && a.t >= .2) { a.done = true; const m = muzzle(f); projectiles.push({ owner: f, x: m.x, y: m.y, vx: f.face * 560, vy: 0, r: 22, dmg: 0, kind: DEBUFF_KIND[a.sp.raw] || 'curse', cols: ['#ffffff', '#c070ff'], life: 1.6, rot: 0, trail: [], debuff: true, home: true, ty: a.ty, miss: a.miss }); sfx('shot'); }
    } },
  shield: { cost: 14, cool: 8, range: [0, 9999], dur: .7, when: f => f.shieldT <= 0,
    start(f, o, a) { f.shieldT = 7; floatText(f.x, GROUND - f.z - f.lift - f.h - 10, 'SHIELD!', colsOf(a.ty)[1]); sfx('heal'); }, tick(f) { f.vx = 0; f.charging = true; } },
  counter: { cost: 16, cool: 7, range: [0, 260], dur: 1.2,
    start(f, o, a) { f.counterT = 1.1; floatText(f.x, GROUND - f.z - f.lift - f.h - 10, 'READY', '#ffd34d'); sfx('charge'); },
    tick(f, o, a) { f.vx = 0; f.charging = true; if (a.t >= 1.15) f.counterT = 0; } },
  metronome: { cost: 18, cool: 5, range: [150, 700], dur: 1.5,
    start(f, o, a) { a.sub = METRO[Math.floor(Math.random() * METRO.length)]; a.ty = METRO_TY[Math.floor(Math.random() * METRO_TY.length)]; floatText(f.x, GROUND - f.z - f.lift - f.h - 12, '?', '#fff'); const A = ARCH[a.sub]; A.start && A.start(f, o, a); },
    tick(f, o, a, dt) { const A = ARCH[a.sub]; A.tick && A.tick(f, o, a, dt); } },
};
function startAct(f, name) {
  const k = f.kit, o = other(f);
  if (f.confT > 0 && Math.random() < .3) { floatText(f.x, GROUND - f.h - 10, 'MISFIRE!', '#ff7ae6', 22); f.hitT = .3; return; }
  if (name === 'melee') { if (!canSpend(f, k.melee.sta)) return; spend(f, k.melee.sta); f.chainQ = false; f.act = { name, t: 0, hit: false, landed: false, n: 0, miss: rollMiss(k.melee.acc) }; }
  else if (name === 'grab') { if (f.z > 0 || !canSpend(f, 14)) return; spend(f, 14); f.act = { name, t: 0, hit: false, ph: 0, miss: Math.random() >= grabOdds(f, f.side === P.side ? E : P) }; } // grab odds: 50%, 70% for the stronger+heavier fighter
  else if (name === 'ranged') { if (f.cool.ranged > 0 || f.ki < k.ranged.cost || !canSpend(f, k.ranged.sta)) return; spend(f, k.ranged.sta); f.act = { name, t: 0, fired: false, miss: rollMiss(k.ranged.acc) }; }
  else if (name === 'special' || name === 'special2' || name === 'special3') {
    const i = name === 'special' ? 0 : name === 'special2' ? 1 : 2, sp = f.specs[i]; if (!sp) return;
    const A = ARCH[sp.key]; if (f.cool['s' + i] > 0 || f.ki < A.cost || !canSpend(f, sp.sta)) return;
    spend(f, sp.sta); f.ki -= A.cost; f.cool['s' + i] = VAR.coolFor ? VAR.coolFor(f, i, A) : A.cool; if (o.ability.pressure) f.sta = Math.max(0, f.sta - 5); f.act = { name: 'sp', key: sp.key, t: 0, ty: sp.type, sp, miss: rollMiss(sp.acc), sv: SPV ? SPV.pick(f, sp.key, sp.type) : 0 };
    if (A.cost >= 16 && f.cineCool <= 0) { f.cineCool = 5; startCine(f, sp.type, sp.name); }
    moveBanner(f, sp.name, sp.type, sp.icon);
    A.start && A.start(f, o, f.act); f.alertT = .5; f.alertLen = ALERT_LEN[sp.key] || 0; f.alertAim = AIM_KEYS.has(sp.key);
  } else if (name === 'beam') { if (f.ki < 50 || f.z > 0 || f.cool.beam > 0 || !canSpend(f, k.beam.sta)) return; spend(f, k.beam.sta); f.ki -= 50; f.cool.beam = 7; f.act = { name, t: 0, fired: false, sv: SPV ? SPV.pick(f, 'beam', k.beam.type) : 0 }; sfx('charge'); if (f.act.sv) { const ba = f.act; SPV.snd('bcharge', () => f.act === ba && !ba.fired); } if (!f.noCine) startCine(f, k.beam.type, k.beam.name); f.alertT = .9; f.alertLen = 1100; f.alertAim = true; }
  if (f.act) VAR.onAct(f, f.act); const ac = f.act; if (ac && (ac.name === 'melee' || ac.name === 'grab' || (ac.name === 'sp' && (CONTACT_SP.has(ac.key) || (TM[ac.key] && TM[ac.key].rush))))) flyIn(f, o);
}
const CONTACT_SP = new Set(['combo', 'dash', 'leap', 'spin']);
function streak(f, x0, l0, x1, l1) { // faded afterimages along the path a flyer just flew
  for (let i = 0; i < 7; i++) { const u = i / 6; f.ghosts.push({ x: lerp(x0, x1, u), z: f.z, lift: lerp(l0, l1, u), ly: laneY(f), fo: f.fgOff || 0, fs: f.fgGs || 1, face: f.face, back: f.poseBack, gd: f.gd, noflip: f.gd && f.gd.noflip, at: now - (1 - u) * .05 }); }
  if (f.ghosts.length > 40) f.ghosts.splice(0, f.ghosts.length - 40);
}
const sstep = u => { u = clamp(u, 0, 1); return u * u * u * (u * (u * 6 - 15) + 10); };
// ---- shock: a flurry of heavy hits fills a meter (22% of max HP lost within 2.5 s); full = stunned for 1.5 s or slowed and weakened for 3 s (random), then immune for 8 s
const SHK_WIN = 2.5, SHK_FRAC = .22, SHK_IMM = 8;
function shockHit(f, d) { if (lab && f === E) return; (f.shkLog || (f.shkLog = [])).push([now, d]); }
function shockOn(f) {
  f.shockV = Math.random() < .5 ? 1 : 2; f.shockT = f.shockLen = f.shockV === 1 ? 1.5 : 3; f.shockImm = f.shockLen + SHK_IMM; f.shkLog = []; f.shock = 0; f.act = null; f.charging = false; f.vx = 0;
  floatText(f.x, GROUND - f.z - f.lift - f.h - 34, 'SHOCKED!', '#ffe54a', 30); sfx('zap'); shake = Math.max(shake, 10); flashCol = '255,255,255'; flashT = Math.max(flashT, .12); freeze = Math.max(freeze, .08); if (f === meF()) buzz(90);
}
function shockTick(f, dt) {
  if (f.shockT > 0) f.shockT -= dt; if (f.shockImm > 0) f.shockImm -= dt;
  const L = f.shkLog; if (!L || !L.length) { f.shock = 0; return; }
  while (L.length && now - L[0][0] > SHK_WIN) L.shift(); let s = 0; for (const e of L) s += e[1]; f.shock = clamp(s / (f.maxhp * SHK_FRAC) * 100, 0, 100);
  if (f.shock >= 100 && f.shockImm <= 0 && !f.dead && state === 'fight') shockOn(f);
}
const shockFlash = f => f.shockT > 0 && ((f.shockV === 1 || f.shockLen - f.shockT < .35) ? Math.sin(now * 50) > 0 : Math.sin(now * 11) > .55);
function drawShock(g, f) { // electric arcs round the body and stars circling over the head
  const cx = f.x, base = GROUND + laneY(f) - f.z - f.lift, top = base - f.h, cy = base - f.h * .5, t = now, n = f.shockV === 1 ? (lowQ ? 3 : 5) : 2;
  g.save(); auraBlob(g, cx, cy, f.w * .8, f.h * .8, '#ffe54a', .2 + .08 * Math.sin(t * 30));
  let s = Math.floor(t * 18) * 9301 + 49297; const R = () => (s = (s * 9301 + 49297) % 233280) / 233280; g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    const a0 = R() * 6.283, a1 = a0 + (R() - .5) * 1.6, x0 = cx + Math.cos(a0) * f.w * .38, y0 = cy + Math.sin(a0) * f.h * .42, x1 = cx + Math.cos(a1) * f.w * .5, y1 = cy + Math.sin(a1) * f.h * .55, pts = [[x0, y0]];
    for (let k = 1; k < 5; k++) pts.push([lerp(x0, x1, k / 5) + (R() - .5) * 18, lerp(y0, y1, k / 5) + (R() - .5) * 18]); pts.push([x1, y1]);
    for (const [w, col] of [[7, 'rgba(255,224,26,.35)'], [3, '#ffe54a'], [1.2, '#fff']]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }
  }
  g.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 5; i++) { const a = t * 6 + i * 6.283 / 5, r = 9 * (Math.sin(a) > 0 ? 1.15 : .8), x = cx + Math.cos(a) * 34, y = top + 2 + Math.sin(a) * 9; g.fillStyle = '#ffe54a'; g.strokeStyle = '#6a4a00'; g.lineWidth = 1.5; g.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? r * .45 : r, aa = -Math.PI / 2 + k * Math.PI / 5; g.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr); } g.closePath(); g.fill(); g.stroke(); }
  g.restore();
}
// ---- the AI answers your beam: it starts its own and its charge catches up, so both fire on the same frame and the beams clash
function aiBeamAnswer(f, o) {
  const a = o.act; if (state !== 'fight' || f.dead || o.dead || !a || a.name !== 'beam' || a.fired || a.t > .85 || (!f.isAI && !demo)) return;
  if (f.act || f.hitT > 0 || f.sleepT > 0 || f.freezeT > 0 || (f.shockT > 0 && f.shockV === 1) || f.z > 0 || f.cool.beam > 0 || f.ki < 50 || bclash || Math.abs(f.lp - o.lp) > .6 || (practice && dummyMode < 2 && f === E)) return;
  if (a.aiRoll === undefined) { const D = DIFF[selDiff]; a.aiRoll = Math.random() < D.ans ? rnd(D.lag[0], D.lag[1]) : -1; }
  if (a.aiRoll < 0 || a.t < a.aiRoll || !canSpend(f, f.kit.beam.sta)) return;
  a.aiRoll = -1; f.noCine = true; f.face = o.x >= f.x ? 1 : -1; startAct(f, 'beam'); f.noCine = false;
  if (f.act && f.act.name === 'beam') { f.act.t = a.t; f.flash = .2; floatText(f.x, GROUND - f.z - f.lift - f.h - 30, 'COUNTER BEAM!', '#9fe8ff', 26); rings.push({ x: muzzle(f).x, y: muzzle(f).y, t: 0, col: '#9fe8ff' }); sfx('charge'); }
}
// ---- settings screen: volume sliders and gameplay multipliers
function saveS() { try { localStorage.setItem('pf_vmus', volMus); localStorage.setItem('pf_vfx', volFx); localStorage.setItem('pf_gm', [GM.dmg, GM.sta, GM.ki].join(',')); } catch (e) { } }
function syncSettings() {
  const sv = (i, o, v) => { const e = $(i); if (e) { e.value = v; $(o).textContent = v + '%'; } };
  sv('vMus', 'oMus', volMus); sv('vMus2', 'oMus2', volMus); sv('vFx', 'oFx', volFx); sv('vFx2', 'oFx2', volFx); if (!$('gD')) return;
  for (const [i, o, v] of [['gD', 'oD', GM.dmg], ['gS', 'oS', GM.sta], ['gK', 'oK', GM.ki]]) { $(i).value = Math.round(v * 10); $(o).textContent = v.toFixed(1) + 'x'; }
  const cur = [GM.dmg, GM.sta, GM.ki].map(v => v.toFixed(1)).join(','); let hit = false;
  document.querySelectorAll('.gpre').forEach(b => { const m = b.dataset.p !== 'custom' && b.dataset.p.split(',').map(Number).map(v => v.toFixed(1)).join(',') === cur; if (m) hit = true; b.dataset.m = m ? '1' : ''; });
  document.querySelectorAll('.gpre').forEach(b => b.classList.toggle('sel', b.dataset.p === 'custom' ? !hit : b.dataset.m === '1'));
  const T = 142 * Math.pow(GM.dmg, -.89) * Math.pow((GM.sta + GM.ki) / 2, -.5); $('gEst').innerHTML = `Estimated average fight: <b>${Math.round(T)} s</b>. Damage and refill speed apply to both fighters.`;
}
function settingsInit() {
  for (const [i, k] of [['vMus', 'mus'], ['vMus2', 'mus'], ['vFx', 'fx'], ['vFx2', 'fx']]) { const e = $(i); if (!e) continue; e.oninput = () => { if (k === 'mus') volMus = +e.value; else volFx = +e.value; applyVol(); saveS(); syncSettings(); }; if (k === 'fx') e.onchange = () => hitSfx('fighting'); }
  for (const [i, k] of [['gD', 'dmg'], ['gS', 'sta'], ['gK', 'ki']]) { const e = $(i); if (e) e.oninput = () => { GM[k] = +e.value / 10; saveS(); syncSettings(); }; }
  document.querySelectorAll('.gpre').forEach(b => b.onclick = () => { if (b.dataset.p !== 'custom') { const [d, s, k] = b.dataset.p.split(',').map(Number); GM.dmg = d; GM.sta = s; GM.ki = k; saveS(); } syncSettings(); });
  document.querySelectorAll('.fpschip').forEach(b => b.onclick = () => setFps(+b.dataset.f)); document.querySelectorAll('.fxchip').forEach(b => b.onclick = () => setFx(b.dataset.x === 'low'));
  syncSettings(); syncGfx();
}
function syncGfx() { document.querySelectorAll('.fpschip').forEach(b => b.classList.toggle('sel', +b.dataset.f === fpsCap)); document.querySelectorAll('.fxchip').forEach(b => b.classList.toggle('sel', (b.dataset.x === 'low') === fxLow)); }
function setFps(v) { fpsCap = v; try { localStorage.setItem('pf_fps', String(v)); } catch (e) { } fCnt = 0; syncGfx(); }
function setFx(low) { fxLow = low; if (!NETG.on) { lowQ = low || new URLSearchParams(location.search).has('lowq'); bgDirty = true; fCnt = 0; } try { localStorage.setItem('pf_fx', low ? '1' : '0'); } catch (e) { } syncGfx(); }
function flyIn(f, o) {
  const a = f.act; if (!a || a.home || !isFly(f) || o.dead) return;
  const dir = Math.sign(o.x - f.x) || f.face, tx = clamp(o.x - dir * (f.w * .3 + o.w * .3 + 26), WALL_L, WALL_R), tl = Math.max(0, o.z + o.lift - f.z);
  if (Math.abs(tx - f.x) < 70 && Math.abs(tl - f.lift) < 50) return;
  a.home = { x: f.x, lift: f.lift }; a.fly = { x0: f.x, x1: tx, l0: f.lift, l1: tl, t: 0, arc: clamp(Math.hypot(tx - f.x, tl - f.lift) * .12, 18, 70), dur: clamp(Math.hypot(tx - f.x, tl - f.lift) / 1800 + .08, .15, .8) }; f.flyBack = null; f.face = dir; f.lane = o.lane; f.lp = o.lp; // the flyer really flies to the foe (see actTick)
}
function flyOut(f) { const h = f.act && f.act.home; if (!h) return; f.act.home = null; const dd = Math.hypot(h.x - f.x, h.lift - f.lift); if (dd < 20) { f.x = h.x; f.lift = h.lift; f.aimT = 0; return; } f.flyBack = { x0: f.x, x1: h.x, l0: f.lift, l1: h.lift, t: 0, dur: clamp(dd / 1800 + .08, .15, .8) }; f.aimT = .1; f.burst = .7; }
function endAct(f) { flyOut(f); f.act = null; f.vx = 0; if (f.under) { f.under = false; f.el.style.clipPath = ''; } f.fade = 1; }
function actTick(f, o, dt) {
  const a = f.act, k = f.kit;
  if (a.fly) { const F = a.fly; F.t += dt; const s = sstep(F.t / F.dur); f.x = lerp(F.x0, F.x1, s); f.lift = LIFE ? lerp(F.l0, F.l1, s) + Math.sin(Math.PI * Math.min(1, F.t / F.dur * 1.25)) * (1 - F.t / F.dur) * F.arc : lerp(F.l0, F.l1, s) - Math.sin(s * Math.PI) * 14; f.aimT = .1; f.vx = 0; ghost(f); for (const i of tfx) if (i.f === f) i.age -= dt; if (F.t >= F.dur) { a.fly = null; f.lift = F.l1; f.aimT = 1; puff(f.x, GROUND + laneY(f), 4, 'rgba(235,235,225,.4)', 60); } return; } // flying to the foe at 1800 px/s: the attack waits until it arrives
  a.t += dt;
  if (a.name === 'melee') {
    if (a.t < .1) f.vx = -f.face * 70;
    else if (a.t < .28) {
      f.vx = f.face * k.melee.lunge; ghost(f); aimLunge(f, o, dt);
      if (!a.hit && inReach(f, o, k.melee.reach)) {
        a.hit = true;
        if (a.miss) floatText(center(o).x, center(o).y - 30, 'MISS', '#ddd');
        else { const L = a.n === 2, S = LIFE && a.n === 3 && o.canJuggle && o.z > 15; f.launch = L; f.slamHit = S; a.landed = damage(f, o, k.melee.dmg * (L ? 1.25 : S ? 1.4 : 1), f.face * (L ? 560 : S ? 140 : 380), center(o), L || S, k.melee.type); f.launch = f.slamHit = false; meleeFx(f, o, k.melee.name, L || S); }
      }
    } else f.vx *= .85;
    if (a.t >= .3 && f.chainQ && a.landed && (a.n < 2 || (LIFE && a.n === 2 && o.canJuggle && o.z > 15)) && staEff(f) >= k.melee.sta * .6) { f.chainQ = false; spend(f, k.melee.sta * .6); a.n++; a.t = .05; a.hit = false; a.landed = false; a.miss = rollMiss(k.melee.acc); } // press melee again to chain; the third hit launches
    if (a.t >= .5) endAct(f);
  } else if (a.name === 'grab') { // reach out, carry the foe up (a flyer climbs high with it), then throw it
    const air = isFly(f), dur = air ? .75 : .35;
    if (a.ph === 0) {
      f.vx = a.t < .2 ? f.face * 160 : 0;
      if (a.miss && !a.said && a.t >= .2) { a.said = true; floatText(f.x + f.face * 60, GROUND - f.z - f.lift - f.h * .6, 'MISSED!', '#ddd', 26); f.sta = Math.max(0, f.sta - 10); f.staDelay = Math.max(f.staDelay, .8); }
      if (!a.miss && a.t >= .16 && a.t < .32 && Math.abs(o.x - f.x) < f.w * .35 + 70 + o.w * .2 && Math.abs(f.lp - o.lp) < .6 && Math.abs((f.z + f.lift) - (o.z + o.lift)) < 170 && !o.dead && o.inv <= 0) {
        f.unblockable = true; const ok = damage(f, o, k.melee.dmg * .5, 0, center(o), false, 'fighting'); f.unblockable = false;
        if (ok) { a.ph = 1; a.t1 = 0; floatText(center(o).x, center(o).y - 60, 'GOT YOU!', '#ffd34d', 26); sfx('boom'); } else a.t = .33;
      }
      if (a.ph === 0 && a.t >= .65) endAct(f);
    } else if (a.ph === 1) {
      a.t1 += dt; const kk = clamp(a.t1 / dur, 0, 1); f.vx = 0; f.grabLift = air ? 380 * easeOut(kk) : 0;
      o.x = f.x + f.face * (f.w * .3 + 24); o.lane = f.lane; o.lp = f.lp; o.vx = 0; o.kvx = 0; o.vz = 0; o.hitT = Math.max(o.hitT, .15); o.inv = Math.max(o.inv, .2); o.carriedT = .15; o.act = null; o.charging = false;
      o.z = Math.max(0, f.z + f.lift + (air ? 10 : 120 * easeOut(kk)) - o.lift);
      if (a.t1 >= dur) {
        a.ph = 2; a.t2 = 0; o.inv = 0; f.unblockable = true; const ok = damage(f, o, k.melee.dmg * (air ? 1.8 : 1.5), f.face * (air ? 420 : 1100), center(o), true, air ? 'flying' : 'fighting'); f.unblockable = false;
        if (ok) { o.hitT = air ? 1.1 : .9; o.smash = true; o.slamK = air ? .08 : .05; o.ghostT = .9; o.vz = air ? -1900 : 650; o.kvx = f.face * (air ? 420 : 1100); floatText(center(o).x, center(o).y - 70, air ? 'SKY SLAM!' : 'THROW!', '#ffd34d', 34); sfx('boom'); shake = Math.max(shake, 18); impacts.push({ x: center(o).x, y: center(o).y, t: 0, n: 14, col: '#fff', rot: 0 }); }
        f.grabLift = 0;
      }
    } else { a.t2 += dt; f.vx = 0; if (a.t2 >= .3) endAct(f); }
  } else if (a.name === 'dash') {
    f.vx = a.dir * (a.t < .22 ? 1000 : 250); if (a.t < .2) f.inv = Math.max(f.inv, .06); ghost(f);
    if (isFly(f) && a.dir === (Math.sign(o.x - f.x) || f.face)) { const c1 = center(f), c2 = center(o); aimLunge(f, o, dt, Math.min(2500, Math.abs(f.vx) * Math.abs(c2.y - c1.y) / Math.max(120, Math.abs(c2.x - c1.x)))); } // dashing at the foe flies the straight line to it    if (Math.random() < .5) puff(f.x - a.dir * f.w * .2, GROUND, 1, 'rgba(230,200,150,.6)', 40);
    if (a.t >= .3) endAct(f);
  } else if (a.name === 'ranged') {
    f.vx = 0;
    if (!a.fired && a.t >= .12) {
      a.fired = true; const r = k.ranged; f.ki -= r.cost; f.cool.ranged = r.cool; kickF(f, .1, -.05, 0, -f.face * 8); const m = muzzle(f);
      const sv = pickShotVar(f, r);
      if (sv && sv !== 'sprite') fireShotVar(f, r, a, m, sv); else {
      const aim = 0; // shots are aimed at the target when they leave the muzzle (see updateWorld)
      for (let i = 0; i < r.n; i++) {
        const ang = aim + (r.n === 1 ? 0 : (i - (r.n - 1) / 2) * .17);
        projectiles.push({ owner: f, x: m.x, y: m.y, vx: Math.cos(ang) * r.speed * f.face, vy: Math.sin(ang) * r.speed, r: r.r, dmg: r.dmg, kind: r.kind, cols: r.cols, life: 2.2, rot: 0, trail: [], ty: r.type, miss: a.miss, sv: sv === 'sprite' ? 'shot' : 0 });
      }
      }
      if (sv === 'sprite') { SPV.snd('kiblast'); SPV.muzzle(m.x, m.y, r.type); } else sfx(r.kind === 'leaf' ? 'leaf' : 'shot');
    }
    if (a.t >= .4) endAct(f);
  } else if (a.name === 'sp') {
    const A = ARCH[a.key]; A.tick && A.tick(f, o, a, dt);
    if (f.act === a && a.t >= A.dur) endAct(f);
  } else if (a.name === 'beam') {
    f.vx = 0; f.charging = true; if (f.bhold) a.t = Math.min(a.t, 1.3); // held in the beam clash
    if (!a.fired && a.t >= .9) { a.fired = true; kickF(f, .16, -.06, 0, -f.face * 16); const m = muzzle(f), mega = Math.random() < .25; beams.push({ owner: f, t: 0, dur: mega ? 1.35 : .95, x: m.x, y: m.y, tick: 0, w: mega ? 84 : 54, ang: aimA(m, o), dmg: mega ? f.kit.beam.dmg * 1.35 : undefined, born: now, norm: 1, sv: a.sv ? 'big' : 0 }); beamClashCheck(beams[beams.length - 1]); if (a.sv) { const bm = beams[beams.length - 1]; SPV.snd('wave', () => bm.t < bm.dur); } if (mega) floatText(f.x, GROUND - f.h - 30, 'MEGA BEAM!', '#fff', 34); sfx('beam'); shake = mega ? 22 : 10; }
    if (a.t >= 1.9) endAct(f);
  }
}

// ---------------------------------------------------------------- AI (also drives the player in ?demo mode)
function aiInput(f, o, dt) {
  if (practice && f.isAI && dummyMode < 2) return dummyMode === 1 ? { guard: true } : {}; // practice dummy: stands still or just guards
  if (f.isAI) { // remember what the player keeps doing
    const h = f.ai.habit || (f.ai.habit = { melee: 0, ranged: 0, total: 0, last: '', rep: 0, seen: null, guardT: 0, fightT: 0 });
    h.fightT += dt; if (o.guarding) h.guardT += dt;
    if (o.act && o.act !== h.seen) { h.seen = o.act; const n = o.act.name, kind = n === 'melee' || n === 'grab' ? 'melee' : n === 'ranged' || (n === 'sp' && PROJ_KEYS.has(o.act.key)) ? 'ranged' : 'other'; if (kind !== 'other') h[kind]++; h.total++; if (kind === h.last) h.rep++; else { h.last = kind; h.rep = 1; } }
  }
  const a = f.ai, inp = {}, Df = DIFF[selDiff], k = f.kit;
  const dx = o.x - f.x, d = Math.abs(dx), toward = dx > 0 ? 'r' : 'l', away = dx > 0 ? 'l' : 'r';
  if (a.pulse) { inp[a.pulse] = true; a.pulse = null; }
  if (f.act && f.act.name === 'melee' && f.act.landed && f.act.n < 2 && Math.random() < dt * (selDiff === 'Hard' ? 9 : selDiff === 'Normal' ? 5 : 2.5)) { inp.melee = true; return inp; }
  if (f.act && f.act.landed && (f.act.name === 'sp' ? CANCEL_KEYS.has(f.act.key) : f.act.name === 'dash' || (f.act.name === 'melee' && f.act.n >= 1)) && Math.random() < dt * (selDiff === 'Hard' ? 4 : selDiff === 'Normal' ? 2 : .8)) { inp[f.act.name === 'melee' ? ['special', 'special2', 'ranged', 'grab'][Math.floor(Math.random() * 4)] : 'melee'] = true; return inp; } // cancel into a follow-up
  if (a.plan) {
    a.plan.t -= dt;
    if (a.plan.type === 'guard') { inp.guard = true; if (a.plan.duck) inp.down = true; }
    if (a.plan.type === 'charge') inp.charge = true;
    if (a.plan.type === 'jump' && !a.plan.done) { inp.up = true; a.plan.done = true; inp[toward] = true; }
    if (a.plan.t <= 0) a.plan = null;
    return inp;
  }
  const threat = projectiles.find(p => p.owner !== f && !p.nodmg && !p.wait && Math.sign(f.x - p.x) === Math.sign(p.vx) && Math.abs(f.x - p.x) < 320 && Math.abs(p.y - (GROUND + laneY(f) - f.z - f.lift - f.h / 2)) < f.h * .8 + 30);
  if (threat && f.laneCool <= 0 && f.sta >= 10 && Math.abs((threat.lane === undefined ? o.lp : threat.lane) - f.lp) < .6 && Math.random() < Df.block * dt * 7) { // sidestep out of the shot's lane
    const tl = threat.lane === undefined ? o.lp : threat.lane, want = tl > .3 ? -1 : 1; inp[want < f.lane ? 'laneBack' : want > f.lane ? 'laneFront' : (f.lane > 0 ? 'laneBack' : 'laneFront')] = true; return inp;
  }
  if (threat && Math.random() < Df.block * dt * 6) { a.plan = { type: Math.random() < .6 ? 'guard' : 'jump', t: .4 + Math.random() * .3, duck: Math.random() < .5 }; return inp; }
  a.t -= dt;
  if (a.goto != null) { if (!pickups.length || Math.abs(a.goto - f.x) < 24) a.goto = null; else { inp[a.goto > f.x ? 'r' : 'l'] = true; return inp; } } // walk to a pickup
  if (a.t <= 0) {
    a.t = Df.think * (.7 + Math.random() * .6); a.mode = 'idle';
    const pk = pickups.find(p => p.y > GROUND - 120 && Math.abs(p.x - f.x) < 650 && VAR.wants(f, p));
    if (pk && d > 160 && Math.random() < .7) { a.goto = pk.x; a.t = .3; return inp; }
    const reach = f.w * .35 + k.melee.reach, opts = [], ew = ty => clamp(1 + (effect(ty, o.kit.types) - 1) * .7, .35, 2.2);
    const inLane = Math.abs(f.lp - o.lp) < .6;
    if (f.ki >= 50 && f.sta >= k.beam.sta && f.cool.beam <= 0 && d > 150 && inLane && Math.random() < Df.ult) { a.pulse = 'beam'; a.t = 2.2; return inp; }
    if (d < reach + 20 && f.sta >= k.melee.sta && inLane) opts.push(['melee', 3 * ew(k.melee.type)]);
    if (d < reach + 10 && inLane && o.guarding && f.sta >= 14) opts.push(['grab', 4]);
    if (isFly(f) && d < 320 && inLane && f.sta >= 14 && !o.dead) opts.push(['grab', 2.5]);
    if (!inLane && d < 500 && f.sta >= 8 && f.laneCool <= 0) opts.push(['align', 4]);
    if (inLane && d < 420 && f.sta >= 45 && f.laneCool <= 0) opts.push(['sidestep', .7]);
    if (f.cool.ranged <= 0 && f.ki >= k.ranged.cost && f.sta >= k.ranged.sta && d > 150 && inLane) opts.push(['ranged', 3 * ew(k.ranged.type)]);
    f.specs.forEach((s, i) => { const A = ARCH[s.key]; if (inLane && f.cool['s' + i] <= 0 && f.ki >= A.cost && f.sta >= s.sta && d >= A.range[0] && d <= A.range[1] && (!A.when || A.when(f, o)) && (s.key !== 'selfdestruct' || Math.random() < .15)) opts.push([['special', 'special2', 'special3'][i], 2.6 * ew(s.type)]); });
    opts.push(['approach', d > 300 ? 3 : 1], ['retreat', d < reach ? 1.5 : .4], ['guard', d < reach ? 1 : 0], ['jump', .8], ['charge', f.ki < 45 && d > 400 ? 2 : 0], ['rest', f.sta < 28 ? 5 : f.ki >= 50 && f.cool.beam <= 0 && f.sta < k.beam.sta && d > 300 ? 3 : 0], ['dash', f.sta >= DASH_STA + 10 && f.dashCool <= 0 ? (d > 420 ? 1.2 : .5) : 0]);
    const pw = PERSONA_W[a.persona] || {}, hb = a.habit, L = selDiff === 'Hard' ? 1 : selDiff === 'Normal' ? .6 : .25, lw = {};
    if (hb && hb.total >= 4) {
      const rs = hb.ranged / hb.total, ms = hb.melee / hb.total, gs = hb.fightT ? hb.guardT / hb.fightT : 0;
      if (rs > .4) { lw.approach = 1 + L * .8; lw.dash = 1 + L; lw.sidestep = 1 + L; }
      if (ms > .5) { lw.guard = 1 + L * .8; lw.retreat = 1 + L * .5; lw.ranged = 1 + L * .6; }
      if (gs > .3) lw.grab = 1 + L * 2;
      if (hb.rep >= 3 && hb.last === 'melee') lw.guard = (lw.guard || 1) * 1.5;
    }
    for (const x of opts) x[1] *= (pw[x[0]] || 1) * (lw[x[0]] || 1); VAR.aiOpts(f, o, opts);
    if (f.hover) { if (!f.air) { if (Math.random() < .5) { f.air = true; f.alt = 0; puff(f.x, GROUND, 10, 'rgba(235,235,225,.5)', 110); } } else if (Math.random() < .4) { f.alt = d < 220 ? 0 : Math.floor(Math.random() * 3); if (f.alt === 0 && d < 200 && Math.random() < .3) f.air = false; } } // flying AI takes off and lands now and then
    let tot = 0; for (const x of opts) tot += x[1]; let r = Math.random() * tot, pick = 'approach';
    for (const x of opts) { r -= x[1]; if (r <= 0) { pick = x[0]; break; } }
    if (pick === 'approach') a.mode = 'approach'; else if (pick === 'retreat') { a.mode = 'retreat'; a.t = .5; }
    else if (pick === 'rest') { a.mode = 'retreat'; a.t = .7; }
    else if (pick === 'dash') { a.pulse = 'dash'; a.mode = d > 300 ? 'approach' : 'retreat'; a.t = .3; }
    else if (pick === 'align') { a.pulse = o.lane > f.lane ? 'laneFront' : o.lane < f.lane ? 'laneBack' : (f.lane > 0 ? 'laneBack' : 'laneFront'); a.t = .35; }
    else if (pick === 'sidestep') { a.pulse = f.lane > 0 ? 'laneBack' : f.lane < 0 ? 'laneFront' : (Math.random() < .5 ? 'laneBack' : 'laneFront'); a.t = .5; }
    else if (pick === 'guard') a.plan = { type: 'guard', t: .5 }; else if (pick === 'jump') a.plan = { type: 'jump', t: .4 }; else if (pick === 'charge') a.plan = { type: 'charge', t: 1.1 };
    else a.pulse = pick;
  }
  if (a.mode === 'approach') inp[toward] = true; else if (a.mode === 'retreat') inp[away] = true;
  return inp;
}
function playerInput() {
  const i = {
    l: keys.a || keys.arrowleft || joy.l, r: keys.d || keys.arrowright || joy.r, guard: keys.s || keys.arrowdown || held.guard || joy.d, down: keys.s || keys.arrowdown || joy.d, upHold: keys.w || keys.arrowup || keys[' '] || joy.up,
    charge: keys.u || held.charge, up: pulse.up, dash: pulse.dash, laneBack: pulse.laneBack, laneFront: pulse.laneFront, melee: pulse.melee, ranged: pulse.ranged, special: pulse.special, special2: pulse.special2, special3: pulse.special3, beam: pulse.beam, grab: pulse.grab, tap: pulse.tap,
  };
  for (const k in pulse) { if (pulse[k] && practice) inputLog.push({ k, t: now }); pulse[k] = false; }
  return i;
}
const INLABEL = { up: 'JUMP', melee: 'J', ranged: 'K', special: 'L', special2: 'O', special3: 'N', beam: 'I', dash: 'DASH', grab: 'G', laneBack: 'Q', laneFront: 'E' };

// ---------------------------------------------------------------- update
function updateFighter(f, o, inp, dt) {
  if (f.dead) { f.deadT += dt; f.lift *= Math.pow(.01, dt); f.vz -= 2100 * dt; f.z = Math.max(0, f.z + f.vz * dt); f.x = clamp(f.x + f.kvx * dt, WALL_L, WALL_R); f.kvx *= Math.pow(.05, dt); return; }
  for (const k in f.cool) f.cool[k] = Math.max(0, f.cool[k] - dt);
  f.flash = Math.max(0, f.flash - dt); if (f.chromaT > 0) f.chromaT -= dt; f.inv = Math.max(0, f.inv - dt); f.guarding = false; f.charging = false; f.landT = Math.max(0, f.landT - dt); f.sqT = Math.max(0, f.sqT - dt);
  f.buffT = Math.max(0, f.buffT - dt); f.slowT = Math.max(0, f.slowT - dt); f.shieldT = Math.max(0, f.shieldT - dt); f.counterT = Math.max(0, f.counterT - dt); f.debT = Math.max(0, f.debT - dt); f.mult = f.buffT > 0 ? 1.25 : 1; statusFx(f, dt);
  f.warnT = Math.max(0, f.warnT - dt); f.dashCool = Math.max(0, f.dashCool - dt); f.cineCool = Math.max(0, f.cineCool - dt); f.staDelay -= dt; f.laneCool = Math.max(0, f.laneCool - dt); f.alertT = Math.max(0, f.alertT - dt);
  f.lp += (f.lane - f.lp) * Math.min(1, dt * 8 * (f.laneRate || 1));
  if (f.gPrev) f.staDelay = Math.max(f.staDelay, .5); // holding guard pauses stamina regeneration
  if (f.staDelay <= 0 && !f.dead) f.sta = Math.min(100, f.sta + (f.act ? 4.5 : 14) * (f.buffT > 0 ? 1.4 : 1) * (f.ability.regen ? 1.2 : 1) * LV_MUL[f.stored] * GM.sta * dt);
  if (!f.dead && !lab && f.sta >= 99.9) { f.fullT += dt; if (f.fullT >= 5 && f.stored < 4) { f.stored++; f.sta = 0; f.fullT = 0; floatText(f.x, GROUND - f.z - f.lift - f.h - 14, 'STAMINA LV ' + (f.stored + 1), '#ffe27a', 22); sfx('heal'); } } else f.fullT = 0;
  if ((f.buffT > 0) !== f.shiny) f.shiny = f.buffT > 0;
  if (!f.act || f.act.name !== 'grab') f.grabLift = 0; f.carriedT = Math.max(0, f.carriedT - dt);
  if (f.spinT > 0) { f.spinT -= dt; const u = clamp(1 - f.spinT / f.spinLen, 0, 1); f.spinDeg = (1 - (1 - u) ** 2) * 1080; f.act = null; f.charging = false; f.vx = 0; f.kvx = 0; f.vz = 0; f.hitT = Math.max(f.hitT, .1); f.z = (f.spinZ0 || 0) * (1 - u) + Math.sin(u * Math.PI) * 95; f.x = clamp(f.x + Math.cos(u * 14) * 60 * dt, WALL_L, WALL_R); } // caught in a whirlwind: lifted, spun three times, dropped
  shockTick(f, dt);
  if (f.flyBack) { const F = f.flyBack; if (f.hitT > 0 || f.act || f.dead) f.flyBack = null; else { F.t += dt; const s = sstep(F.t / F.dur); f.x = lerp(F.x0, F.x1, s); f.lift = lerp(F.l0, F.l1, s); f.aimT = .1; f.vx = 0; ghost(f); if (F.t >= F.dur) { f.flyBack = null; f.aimT = 0; } } } // a flyer returns home by flying
  const wantLift = f.hover && f.air && !f.under ? f.liftBase + ALT_H[f.alt] + f.grabLift + Math.sin(now * 3 + f.side) * 6 - (f.shockT > 0 && f.shockV === 1 ? 16 : 0) : 0;
  if (f.aimT > 0) { f.aimT -= dt; f.lv = 0; } else if (LIFE) { f.lv += (-90 * (f.lift - wantLift) - 12 * f.lv) * dt; f.lift += f.lv * dt; if (f.lift < 0) { f.lift = 0; if (f.lv < 0) f.lv = 0; } } else f.lift += (wantLift - f.lift) * Math.min(1, dt * 6); // altitude follows a spring: a little overshoot, then it settles
  if (f.ability.cure && statusy(f) && Math.random() < dt * f.ability.cure) cureStatus(f);
  if (f.poisonT > 0) { f.poisonT -= dt; f.hp -= f.maxhp * .011 * dt; if (f.hp <= 0) { f.hp = 0; ko(f, o); return; } }
  if (f.burnT > 0) { f.burnT -= dt; f.hp -= 7 * dt; if (f.hp <= 0) { f.hp = 0; ko(f, o); return; } }
  if (f.confT > 0) f.confT -= dt;
  const abOn = f.ability.boost && (f.hp < f.maxhp / 3 || (lab && f === P)) ? 1 : 0; // Blaze, Torrent, Overgrow and Swarm wake up when the Pokémon is hurt (always on while practising)
  if (abOn && !f.abilOn && state === 'fight') { floatText(f.x, GROUND - f.z - f.lift - f.h - 30, f.ability.name.toUpperCase() + '!', colsOf(f.kit.types[0])[1], 28); flashCol = rgbOf(colsOf(f.kit.types[0])[1]); flashT = .1; sfx('charge'); }
  f.abilOn = abOn;
  const ground = f.z <= 0, spd = f.kit.speed * (f.isAI ? DIFF[selDiff].speed : 1) * (f.slowT > 0 ? .45 : 1) * (f.debT > 0 ? .82 : 1) * (f.shockT > 0 && f.shockV === 2 ? .5 : 1) * (f.ability.wx && weather && weather.id === f.ability.wx ? 1.3 : 1);
  const stunned = f.hitT > 0 || f.sleepT > 0 || f.freezeT > 0 || (f.shockT > 0 && f.shockV === 1);
  let duckNow = false;
  if (f.stuckT > 0) { f.stuckT -= dt; f.kvx = 0; f.vz = 0; f.hitT = Math.max(f.hitT, .2); if (f.stuckT <= 0) f.kvx = -(f.jDir || 1) * 90; }
  if (f.hitT > 0) { f.hitT -= dt; f.x += f.kvx * dt; f.kvx *= Math.pow(f.smash ? .4 : f.toss > 0 ? .3 : f.hv === 2 && f.hitBig ? .12 : .02, dt); }
  else if (f.sleepT > 0 || f.freezeT > 0 || (f.shockT > 0 && f.shockV === 1)) { f.sleepT = Math.max(0, f.sleepT - dt); f.freezeT = Math.max(0, f.freezeT - dt); }
  else if (f.act) {
    if (inp.melee && f.act.name === 'melee') f.chainQ = true;
    const nx = cancelInput(f, inp);
    if (nx) { const prev = f.act; f.act = null; startAct(f, nx); if (f.act) { if (prev.home && !f.act.home) f.act.home = prev.home; ghost(f); floatText(f.x, GROUND - f.z - f.lift - f.h - 6, 'CANCEL', '#9fe8ff', 20); } else f.act = prev; }
    if (f.act) { actTick(f, o, dt); f.x += f.vx * dt; }
  }
  else {
    if (f.confT > 0) inp = confuseInput(f, inp);
    if (f.hover && f.air) { // flyers in the air: tap down to drop a level (then land), hold up to climb
      if (f.alt > maxAlt()) f.alt = maxAlt();
      if (inp.down) { f.dHold = (f.dHold || 0) + dt; if (!f.dPrev || f.dHold > .3) { if (f.alt > 0) f.alt--; else { f.air = false; puff(f.x, GROUND, 6, 'rgba(235,235,225,.4)', 90); } f.dHold = 0; } } else f.dHold = 0;
      f.dPrev = !!inp.down;
      if (inp.upHold) { f.uHold = (f.uHold || 0) + dt; if (f.uHold > .35 && f.alt < maxAlt() && staEff(f) >= 3) { f.alt++; f.uHold = 0; spend(f, 3); } } else f.uHold = 0;
    }
    let dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    if (ground && inp.guard) { duckNow = !!inp.down && !isFly(f); f.guarding = true; dir = 0; f.guardAge = f.gPrev ? f.guardAge + dt : 0; }
    else if (ground && inp.charge) {
      f.charging = true; dir = 0; f.ki = Math.min(100, f.ki + 10 * dt * GM.ki);
      if (f.ki >= 100 && f.buffT <= 0) { f.buffT = 14; f.ki = 35; floatText(f.x, GROUND - f.h - 10, 'POWER UP!', '#ffd34d'); startCine(f, f.kit.types[0], 'Power Up'); }
      if (Math.random() < .4) sparks.push({ x: f.x + (Math.random() - .5) * f.w, y: GROUND - Math.random() * f.h, vx: 0, vy: -140 - Math.random() * 120, t: 0, life: .6, col: f.kit.aura[0], size: 3 });
    }
    f.vx += (dir * spd - f.vx) * Math.min(1, dt * 16); f.x += f.vx * dt;
    // the player turns the way the stick is pushed and looks back at the rival after a moment of standing still; the AI always faces the player
    if (f.isAI || demo) f.face = o.x >= f.x ? 1 : -1;
    else if (dir) { f.face = dir; f.idleT = 0; } else { f.idleT += dt; if (f.idleT > .35) f.face = o.x >= f.x ? 1 : -1; }
    if (inp.dash && o.ability.trap && ground && !f.guarding && f.dashCool <= 0) { f.dashCool = .8; floatText(f.x, GROUND - f.z - f.lift - f.h - 12, 'TRAPPED!', '#ffb347', 22); inp = { ...inp, dash: false }; }
    if (inp.dash && ground && !f.guarding && f.dashCool <= 0 && canSpend(f, f.ability.gale ? DASH_STA / 2 : DASH_STA)) { spend(f, f.ability.gale ? DASH_STA / 2 : DASH_STA); f.dashCool = .6; f.act = { name: 'dash', t: 0, dir: dir || f.face }; sfx('whip'); }
    else if (inp.up && ground && !f.guarding && staEff(f) >= 6) { if (f.hover) { if (!f.air) { f.air = true; f.alt = 0; spend(f, 4); puff(f.x, GROUND, 10, 'rgba(235,235,225,.5)', 110); sfx('whip'); } else if (f.alt < maxAlt()) { f.alt++; spend(f, 4); puff(f.x, GROUND, 4, 'rgba(235,235,225,.4)', 80); } } else { spend(f, 6); f.vz = 790; } }
    if ((inp.laneBack || inp.laneFront) && ground && !f.guarding && f.laneCool <= 0) { // step into the background or foreground lane to dodge
      const nl = clamp(f.lane + (inp.laneFront ? 1 : -1), -1, 1);
      if (nl !== f.lane) { const ev = evadeStats(f); f.lane = nl; f.laneCool = ev.cool; f.laneRate = ev.rate; f.inv = Math.max(f.inv, ev.win); ghost(f); puff(f.x, GROUND + laneY(f), 4, 'rgba(230,200,150,.5)', 50); sfx('whip'); }
    }
    if (!f.guarding) {
      if (inp.melee) startAct(f, 'melee'); else if (inp.special) startAct(f, 'special'); else if (inp.special2) startAct(f, 'special2'); else if (inp.special3) startAct(f, 'special3'); else if (inp.ranged) startAct(f, 'ranged'); else if (inp.beam) startAct(f, 'beam'); else if (inp.grab) startAct(f, 'grab');
    }
  }
  f.duck += ((duckNow ? 1 : 0) - f.duck) * Math.min(1, dt * 18);
  if (stunned) f.vx = 0;
  f.gPrev = f.guarding;
  f.vz -= 2100 * dt; f.z += f.vz * dt;
  if (f.z <= 0) { const landed = f.wasAir && !f.under; f.canJuggle = false; if (f.wasAir && !f.under) { f.landT = .16; if (!f.hitBig) kickF(f, .11, -.18, 0, 0); puff(f.x, GROUND, 5); if (f.hitBig && f.hitT > 0) landFx(f); if (f.smash) { f.smash = false; slam(f, o); if (f.dead) return; } } f.z = 0; if (f.vz < 0) f.vz = 0;
  if (landed && f.toss > 0 && f.hitT > .05 && !f.dead) { f.toss--; f.tossV *= .65; f.vz = f.tossV; f.sqT = .14; f.kvx *= .8; f.bounced = false; puff(f.x, GROUND, 8, 'rgba(210,190,150,.8)', 110); shake = Math.max(shake, 5 + 4 * f.toss); sfx('block'); }
  f.wasAir = false; } else f.wasAir = true;
  if (f.hitBig && f.hitT > 0) {
    if ((f.hv === 2 || (!NETG.on && f.lk === 2)) && f.z <= 0 && Math.abs(f.kvx) > 200) { f.skT = (f.skT || 0) - dt; if (f.skT <= 0) { f.skT = .04; puff(f.x - Math.sign(f.kvx) * f.w * .3, GROUND + laneY(f), 2, 'rgba(215,200,170,.6)', 45); if (!lowQ) spark(f.x - Math.sign(f.kvx) * f.w * .3, GROUND - 4, '#ffd34d', 2); } }
    if (!lowQ && (f.hv === 1 || f.hv === 3) && f.z > 0) (f.jt = f.jt || []).push({ x: f.x, y: GROUND + laneY(f) - f.z - f.lift - f.h / 2, t: now });
  }
  while (f.jt && f.jt.length && now - f.jt[0].t > .5) f.jt.shift();
  f.x = clamp(f.x, WALL_L, WALL_R);
  if (f.hitT <= 0) { f.bounced = false; f.toss = 0; }
  else if (f.hitBig && !f.bounced && Math.abs(f.kvx) > 140 && (f.x <= WALL_L + 1 || f.x >= WALL_R - 1)) { // slammed into the arena wall
    f.bounced = true; f.kvx *= -.55; f.vz = Math.max(f.vz, 320); if (f.hv === 2) { f.kvx = 0; f.vz = 0; f.stuckT = .5; jpush({ k: 'splat', x: f.x, y: GROUND - f.z - f.h * .5, t: 0, life: 1.4 }); } f.hp -= f.maxhp * .04; floatText(f.x, GROUND - f.z - f.lift - f.h - 20, 'WALL BOUNCE!', '#9fe8ff', 26); shake = Math.max(shake, 14); sfx('boom'); puff(f.x, GROUND - 40, 8, 'rgba(200,230,255,.7)', 80);
    if (f.hp <= 0) { f.hp = 0; ko(f, o); return; }
  }
  f.ki = Math.min(100, f.ki + 4 * dt * GM.ki);
  if (Math.abs(f.vx) > 40 && ground && !f.act) { f.walkPh += dt * Math.abs(f.vx) / 24; f.dustT -= dt; if (f.dustT <= 0 && !isFly(f)) { f.dustT = .13; puff(f.x - f.face * f.w * .2, GROUND, 1, 'rgba(230,200,150,.5)', 40); } }
  f.windT = (f.windT || 0) - dt; // wing-wash: dust kicked up under a flyer
  if (isFly(f) && f.windT <= 0 && f.lift < 130) { f.windT = Math.abs(f.vx) > 40 ? .1 : .22; puff(f.x + rnd(-20, 20), GROUND + laneY(f), 1, 'rgba(235,235,225,.3)', 90); }
  if (LIFE && !lowQ && !f.dead) { const a = f.act; if ((a && a.name === 'melee' && a.t > .1 && a.t < .4) || (a && a.name === 'dash') || Math.abs(f.lane - f.lp) > .25 || Math.abs(f.vx) > 700) f.ghostT = Math.max(f.ghostT, .06); }
  if (f.ghostT > 0) { f.ghostT -= dt; if (!f.ghosts.length || now - f.ghosts[f.ghosts.length - 1].at > .03) f.ghosts.push({ x: f.x, z: f.z, lift: f.lift, ly: laneY(f), fo: f.fgOff || 0, fs: f.fgGs || 1, col: LIFE && !f.pmd && f.act && (f.act.name === 'dash' || f.act.name === 'sp' || (f.act.name === 'melee' && f.act.n === 2)) ? f.kit.cols[1] : null, face: f.face, back: f.poseBack, gd: f.gd, noflip: f.gd && f.gd.noflip, at: now }); }
  while (f.ghosts.length && now - f.ghosts[0].at > .28) f.ghosts.shift();
}
// Two fighters on the ground push each other apart; they can also never get further apart than the screen is wide.
function slam(f, o) { // landing after a smash
  boom(f.x, GROUND - 30, 190, '#ffd9a0', 26); addDecal(f.x, 190, TYPE_COL.ground[1]); cracks.push({ x: f.x, t: 0, dur: 3 }); puff(f.x, GROUND, 14, 'rgba(200,170,120,.8)', 220);
  const cs = f.cSlam; f.cSlam = false; floatText(f.x, GROUND - f.h - 20, cs ? 'BOUNCE!' : 'SLAM!', '#ffd34d', cs ? 32 : 30);
  if (cs) { jpush({ k: 'ring', x: f.x, y: GROUND + laneY(f) - 2, col: '#ffd34d', t: 0, life: .55, r: 170, flat: 1 }); shake = Math.max(shake, 24); o.cbN++; o.cbD += f.maxhp * (f.slamK || .03); o.cbT = now; }
  f.hp -= f.maxhp * (f.slamK || .03); f.slamK = 0; if (f.hp <= 0) { f.hp = 0; ko(f, o); }
}
// ---------------------------------------------------------------- beam clash: two beams fired together meet, and a tapping tug of war decides which one wins
let bclash = null, tugLen = 0, clashDim = 0; const BCW = .25, BCT = 4; // the second beam must follow the first within BCW seconds; the struggle lasts at most BCT seconds
const bcRate = t => ({ Easy: 4.2, Normal: 5.2, Hard: 6.2 }[selDiff] || 5.2) + 1.2 * Math.sin(t * 2.1) + (Math.sin(t * .9 + 1) > .85 ? 1.6 : 0); // how hard the AI pushes, in taps per second
function beamClashCheck(nb) {
  if (bclash || state !== 'fight' || lab) return; const f = nb.owner, o = other(f);
  const ob = beams.find(b => b.owner === o && b.norm && !b.hold && now - b.born <= BCW && b.t < b.dur);
  if (!ob || f.dead || o.dead || Math.abs(f.lp - o.lp) > .6) return;
  const bp = f === P ? nb : ob, be = f === P ? ob : nb, p0 = .5 + (ob.owner === P ? .08 : -.08); // whoever fired first starts a little ahead
  bclash = { bp, be, p: p0, disp: p0, time: BCT, t: 0, ph: 0, auto: 0, x: (P.x + E.x) / 2, y: muzzle(P).y, tapT: 0, cp: colsOf(bp.ty || P.kit.beam.type)[1], ce: colsOf(be.ty || E.kit.beam.type)[1] };
  bp.hold = be.hold = true; P.bhold = E.bhold = true;
  $('tugA').style.stroke = bclash.cp; $('tugB').style.stroke = bclash.ce; $('tugA')._w = ''; $('tug').classList.add('on'); if (SPV) { SPV.flash(.5); SPV.snd('boom'); } $('tapBtn').classList.toggle('on', !demo);
  floatText((P.x + E.x) / 2, GROUND - 170, 'BEAM CLASH!', '#fff', 40); sfx('boom'); shake = Math.max(shake, 14); flashCol = '255,255,255'; flashT = Math.max(flashT, .12); freeze = Math.max(freeze, .08); if (!demo) buzz(60);
}
function endBeamClash() { const c = bclash; if (!c) return; c.bp.hold = c.be.hold = false; P.bhold = E.bhold = false; bclash = null; $('tug').classList.remove('on'); $('tapBtn').classList.remove('on'); }
function beamTap() {
  const c = bclash; if (!c || c.ph !== 0 || demo) return; if (NETG.on) { pulse.tap = true; return; } c.p = Math.min(1, c.p + .05); shake = Math.max(shake, 4); spark(c.x, c.y, c.cp, 4); rings.push({ x: c.x, y: c.y, t: 0, col: c.cp });
  if (now - c.tapT > .09) { c.tapT = now; sfx('block'); buzz(10); }
}
document.addEventListener('pointerdown', beamTap, true); document.addEventListener('keydown', e => { if (!e.repeat && e.code !== 'Escape' && e.code !== 'KeyP') beamTap(); }, true);
function finishClash(c) {
  const W = c.w, Lz = other(W), wb = W === P ? c.bp : c.be, lb = W === P ? c.be : c.bp, ty = wb.ty || W.kit.beam.type;
  const full = (wb.dmg || W.kit.beam.dmg) * Math.max(3, Math.round(wb.dur / .16)); // the winner's whole beam lands at once
  lb.t = 99; wb.t = Math.min(wb.t, .2); wb.nodmg = true; endBeamClash();
  Lz.act = null; damage(W, Lz, full, W.face * 700, center(Lz), true, ty);
  floatText(Lz.x, GROUND - Lz.h - 40, W === P ? 'OVERPOWERED!' : 'BLASTED!', colsOf(ty)[1], 34); if (SPV) { SPV.boom(Lz.x, center(Lz).y, ty, 1.5); SPV.flash(.8); SPV.snd('boom2'); } sfx('smash'); shake = Math.max(shake, 24); punch = Math.max(punch, .08); if (W === meF() || Lz === meF()) buzz(140);
}
function updBeamClash(dt) {
  const c = bclash; if (!c) return;
  if (P.dead || E.dead || state !== 'fight') { endBeamClash(); return; }
  c.t += dt; const mP = muzzle(P), mE = muzzle(E);
  if (c.ph === 0) {
    c.time -= dt; if (NETG.on) { for (const [f, d] of [[P, 1], [E, -1]]) if (f.tapIn) { c.p = clamp(c.p + .05 * d, 0, 1); shake = Math.max(shake, 4); spark(c.x, c.y, d > 0 ? c.cp : c.ce, 4); rings.push({ x: c.x, y: c.y, t: 0, col: d > 0 ? c.cp : c.ce }); if (f === meF() && now - c.tapT > .09) { c.tapT = now; sfx('block'); buzz(10); } } } else c.p -= bcRate(c.t) * .047 * dt; // the AI never stops pushing; online each tap comes from a player
    if (demo) { c.auto += (5.2 + 1.6 * Math.sin(c.t * 1.7 + .6)) * dt; while (c.auto >= 1) { c.auto -= 1; c.p += .05; } } // both sides are AI in demo mode
    c.p = clamp(c.p, 0, 1); c.disp = clamp(c.disp + (c.p - c.disp) * clamp(dt * 14, 0, 1), 0, 1);
    shake = Math.max(shake, 2 + 8 * Math.abs(c.disp - .5) * 2);
    if (!lowQ || Math.random() < .3) spark(c.x, c.y + rnd(-18, 18), Math.random() < .5 ? c.cp : c.ce, lowQ ? 1 : 2);
    if (c.p >= .97 || c.p <= .03 || c.time <= 0) { c.ph = 1; c.rt = 0; c.w = c.p >= .5 ? P : E; }
  } else { c.rt += dt; c.disp = clamp(c.disp + ((c.w === P ? 1 : 0) - c.disp) * clamp(dt * 12, 0, 1), 0, 1); if (c.rt >= .3) { finishClash(c); return; } }
  c.x = lerp(mP.x, mE.x, c.disp); c.y = lerp(mP.y, mE.y, c.disp);
  for (const [bm, m] of [[c.bp, mP], [c.be, mE]]) { bm.t = bm.dur * .4; bm.x = m.x; bm.y = m.y; bm.th = Math.atan2(c.y - m.y, c.x - m.x); bm.endS = Math.hypot(c.x - m.x, c.y - m.y); bm.hit = false; }
  const wv = (c.disp * 100).toFixed(1), ta = $('tugA'); if (ta._w !== wv) { ta._w = wv; ta.setAttribute('stroke-dasharray', wv + ' 100'); const bg = $('tugBg'), pt = bg.getPointAtLength(c.disp * (tugLen || (tugLen = bg.getTotalLength()))), m = $('tugM'); m.setAttribute('cx', pt.x); m.setAttribute('cy', pt.y); } // the clash bar is a curved arc
  const tt = Math.max(0, c.time).toFixed(1); if (c._tt !== tt) { c._tt = tt; $('tugT').textContent = tt; }
}
function drawBClash(g) {
  if (SPV && SPV.ready()) { const c = bclash; SPV.clash(g, c, c.bp.ty || c.bp.owner.kit.beam.type, c.be.ty || c.be.owner.kit.beam.type); return; }
  const c = bclash, R = 46 + 14 * Math.abs(Math.sin(now * 26)) + 18 * (1 - Math.abs(c.disp - .5) * 2);
  g.save(); g.globalCompositeOperation = 'lighter';
  auraBlob(g, c.x, c.y, R * 2.2, R * 2.2, '#ffffff', .85); auraBlob(g, c.x - R * .3, c.y, R * .9, R * .9, c.cp, .5); auraBlob(g, c.x + R * .3, c.y, R * .9, R * .9, c.ce, .5);
  if (!lowQ) { g.strokeStyle = '#fff'; g.lineWidth = 3; g.setLineDash([14, 12]); g.lineDashOffset = -now * 120; g.beginPath(); g.arc(c.x, c.y, R * 1.05, 0, 6.283); g.stroke(); g.lineDashOffset = now * 160; g.lineWidth = 2; g.beginPath(); g.arc(c.x, c.y, R * 1.45, 0, 6.283); g.stroke(); g.setLineDash([]); }
  g.restore();
}
function clash(p, r) { // two shots meet: a big explosion that shakes and rattles the whole screen and shoves both fighters back
  const x = (p.x + r.x) / 2, y = (p.y + r.y) / 2, big = clamp((p.r + r.r) * 3.2, 150, 280);
  boom(x, y, big, (p.cols && p.cols[1]) || '#ffd34d', 30); booms.push({ x, y, r: big * 1.4, t: 0, dur: .7, col: (r.cols && r.cols[1]) || '#ffffff' });
  clashes.push({ x, y, t: 0 }); clashT = .6; shake = Math.max(shake, 36); punch = Math.max(punch, .1); flashCol = '255,255,255'; flashT = .2; freeze = Math.max(freeze, .1); slowT = Math.max(slowT, .25);
  hitFx(x, y, 'shine', 4); for (let i = 0; i < 4; i++) hitFx(x + rnd(-90, 90), y + rnd(-70, 70), i % 2 ? 'flareball' : 'mistball', 2);
  floatText(x, y - 60, 'CLASH!', '#fff', 40); sfx('block'); if (p.owner === meF() || r.owner === meF()) buzz(110);
  for (const f of [P, E]) if (!f.dead && Math.abs(f.x - x) < 800) { f.kvx = (Math.sign(f.x - x) || -f.face) * 520; f.hitT = Math.max(f.hitT, .22); f.hitBig = false; f.act = null; f.vx = 0; }
}
function separate(a, b) {
  if (a.dead || b.dead) return;
  const dx = b.x - a.x, s = dx >= 0 ? 1 : -1, dist = Math.abs(dx);
  if (Math.abs(a.z - b.z) <= Math.min(a.h, b.h) * .6 && !a.under && !b.under) {
    const min = (a.w + b.w) * .3, over = min - dist;
    if (over > 0) { a.x = clamp(a.x - s * over / 2, WALL_L, WALL_R); b.x = clamp(b.x + s * over / 2, WALL_L, WALL_R); }
  }
  const excess = dist - MAXSEP;
  if (excess > 0) { a.x += s * excess / 2; b.x -= s * excess / 2; }
}
// The basic ranged shot has 3 extra looks per type (data/shotfx.js); each shot picks one at random, never the same twice in a row.
function pickShotVar(f, r) {
  const V = typeof SHOTFX !== 'undefined' && SHOTFX.VARIANTS[r.type]; if (!V || window.__noShotVar) return null;
  const n = V.length + 1 + (SPV && SPV.ready() ? 1 : 0); let i = window.__forceShot !== undefined ? window.__forceShot : Math.floor(Math.random() * n);
  if (window.__forceShot === undefined && i === f.lastSv) i = (i + 1 + Math.floor(Math.random() * (n - 1))) % n;
  f.lastSv = i; return i > V.length ? 'sprite' : i ? V[i - 1] : null; // 0 = the classic shot, the last index = the sprite comet
}
function fireShotVar(f, r, a, m, v) {
  const o = other(f), tc = center(o), D = clamp(Math.abs(tc.x - m.x), 300, 1100), list = [];
  v.spawn({ X0: 0, X1: D, Y: 0, G: GROUND + laneY(f) - m.y, sh(s) { list.push({ d: s.d || 0, T: s.T || 1.1, endU: s.endU || s.hitU || 1, pos: s.pos, draw: s.draw, tr: s.tr === undefined ? 10 : s.tr, imp: s.imp || 'ring', big: s.big || 1 }); } });
  const ts = D / 590 * (536 / r.speed), dy = a.miss ? -140 : tc.y - m.y, dm = []; list.forEach((s, i) => { if (s.imp !== 'none') dm.push(i); });
  const hitters = new Set(dm.filter((_, j) => j === 0 || Math.floor(j * 6 / dm.length) !== Math.floor((j - 1) * 6 / dm.length))); // at most 6 shots carry damage, the whole volley still deals what the classic shot does
  list.forEach((s, i) => projectiles.push({ owner: f, x: m.x, y: m.y, vx: f.face * r.speed, vy: 0, r: clamp(14 + 14 * s.big, 18, 40), dmg: hitters.has(i) ? r.dmg * r.n / hitters.size : 0, nodmg: !hitters.has(i), kind: 'pat', cols: r.cols, life: 9, rot: 0, trail: [], ty: r.type, miss: a.miss, aimed: true, pat: { s, dir: f.face, mx: m.x, my: m.y, ts, dy, t: -s.d, sv: { x: 0, y: 0, rot: 0, u: 0, t: 0, hist: [], idx: i, T: s.T } } }));
}
function patStep(p, dt) { // the shot's path is relative to the muzzle (x towards the foe), see data/shotfx.js
  const q = p.pat, s = q.s, sv = q.sv; q.t += dt; if (q.t < 0) { p.wait = true; return; } p.wait = false;
  const u = q.t / (s.T * q.ts); if (u >= s.endU) { p.life = 0; return; }
  const pos = s.pos(u, sv), px = sv.x, py = sv.y; sv.x = pos[0]; sv.y = pos[1] + q.dy * clamp(u, 0, 1);
  sv.rot = pos[2] !== undefined ? pos[2] : Math.hypot(sv.x - px, sv.y - py) > .05 ? Math.atan2(sv.y - py, sv.x - px) : sv.rot;
  sv.u = u; sv.t = q.t; sv.hist.push([sv.x, sv.y]); if (sv.hist.length > s.tr) sv.hist.shift();
  p.x = q.mx + q.dir * sv.x; p.y = q.my + sv.y;
}
function drawPat(g, p) { const q = p.pat; g.save(); g.translate(q.mx, q.my); g.scale(q.dir, 1); q.s.draw(g, q.sv); g.restore(); }
const svBoom = (x, y, ty, sc, sound) => { if (booms.length) booms[booms.length - 1].sv = 1; SPV.boom(x, y, ty, sc); if (sound) SPV.snd(sound); }; // the sprite explosion replaces the plain glow of the game's own boom
function catchFoe(t, ty) { t.spinT = t.spinLen = 1.3; t.spinDeg = 0; t.spinZ0 = t.z; t.act = null; t.charging = false; SPV.funnel(t, GROUND + laneY(t), ty); } // a whirlwind lifts the foe and spins it (updateFighter, renderFighter)
function projectileHit(p, t) {
  p.life = 0; if (p.sv === 'shot') SPV.burst(p.x, p.y, p.ty, 1); else if (p.sv === 'slash') SPV.burst(p.x, p.y, p.ty, .7);
  if (p.st) {
    if (t.guarding && Math.sign(p.owner.x - t.x) === t.face) { floatText(t.x, GROUND - t.z - t.lift - t.h - 10, 'BLOCKED', '#8cf'); return; }
    damage(p.owner, t, p.dmg, Math.sign(p.vx) * 80, { x: p.x, y: p.y }, false, p.ty);
    if (!t.dead) { applyStatus(t, p.st, true, p.owner); if (p.st === 'poison') zones.push({ kind: 'poison', owner: p.owner, x: t.x, t: 0, dur: 2.4, r: 110, miss: false }); }
    return;
  }
  if (p.debuff) { if (t.ability.nodebuff) { abilityPop(t, 'IMMUNE', '#ddd'); return; } t.debT = 7; spark(p.x, p.y, '#c070ff', 12); sfx('tele'); floatText(t.x, GROUND - t.z - t.lift - t.h - 14, 'WEAKENED', '#c070ff'); return; }
  if (p.explode) { boom(p.x, p.y, p.explode.r, p.explode.col, 22); if (p.sv) svBoom(p.x, p.y, p.ty, .9, 'boom'); aoe(p.owner, p.x, p.y, p.explode.r, p.explode.dmg, 460, true, null, p.ty); return; }
  if (p.sv === 'gust') { const blk = t.guarding && Math.sign(p.owner.x - t.x) === t.face; if (damage(p.owner, t, p.dmg, 0, { x: p.x, y: p.y }, false, p.ty) && !blk && !t.dead) catchFoe(t, p.ty); return; }
  damage(p.owner, t, p.dmg, Math.sign(p.vx) * (p.knock || 300), { x: p.x, y: p.y }, !!(p.lift || p.big), p.ty);
  if (p.drain) { const o = p.owner, g = p.dmg * .7; o.hp = Math.min(o.maxhp, o.hp + g); floatText(o.x, GROUND - o.z - o.lift - o.h - 16, '+' + Math.round(g), '#7dff9a'); for (let i = 0; i < 8; i++) sparks.push({ x: o.x + rnd(-o.w / 2, o.w / 2), y: GROUND - o.z - o.lift - rnd(0, o.h), vx: 0, vy: -90, t: 0, life: .7, col: '#7dff9a', size: 4 }); }
  if (p.lift) t.vz = 520;
}
function updateWorld(dt) {
  updateHazards(dt); tmWorld(dt); VAR.world(dt); if (SPV) SPV.update(dt);
  for (const p of projectiles) {
    if (p.pat) { patStep(p, dt); if (p.wait) continue; }
    else if (!p.aimed) { // a straight shot leaves angled toward the target, so flying or crouching foes can still be hit
      p.aimed = true; const tg = other(p.owner), tc = center(tg), dir = Math.sign(p.vx), dxx = tc.x - p.x;
      if (!p.miss && dir && dxx * dir > 20) { const a1 = Math.atan2(p.vy, Math.abs(p.vx)) + clamp(Math.atan2(tc.y - p.y, Math.abs(dxx)), -1.3, 1.3), sp = Math.hypot(p.vx, p.vy); p.vx = dir * Math.cos(a1) * sp; p.vy = Math.sin(a1) * sp; }
    }
    if (!p.pat) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.rot += dt * 18; p.trail.push({ x: p.x, y: p.y }); if (p.trail.length > 8) p.trail.shift(); }
    if (p.home && !p.miss) { const tt = other(p.owner); p.vy = clamp(p.vy + clamp((GROUND - tt.z - tt.lift - tt.h * .5) - p.y, -60, 60) * 14 * dt, -900, 900); }
    if (p.dist) { p.dist -= Math.abs(p.vx) * dt; if (p.dist <= 0) { p.life = 0; if (p.explode) { boom(p.x, p.y, p.explode.r, p.explode.col, 18); if (p.sv) svBoom(p.x, p.y, p.ty, .9, 'boom'); aoe(p.owner, p.x, p.y, p.explode.r, p.explode.dmg, 460, true, null, p.ty); } } }
    const t = other(p.owner);
    if (p.lane === undefined) p.lane = p.owner.lp;
    if (p.life > 0 && !p.nodmg && !t.dead && t.inv <= 0 && circleRect(p.x, p.y, p.r, body(t))) {
      if (Math.abs(p.lane - t.lp) > .6) { if (!p.missed) { p.missed = true; floatText(t.x, GROUND + laneY(t) - t.z - t.lift - t.h - 10, 'EVADED', '#9fe8ff'); } }
      else if (!p.miss) projectileHit(p, t); else if (!p.missed) { p.missed = true; floatText(t.x, GROUND - t.z - t.lift - t.h - 10, 'MISS', '#ddd'); }
    }
    if (p.x < -40 || p.x > WORLD_W + 40 || p.y < -1600 || p.y > H + 40) p.life = 0;
  }
  for (let i = 0; i < projectiles.length; i++) for (let j = i + 1; j < projectiles.length; j++) {
    const p = projectiles[i], r = projectiles[j];
    if (p.owner !== r.owner && p.life > 0 && r.life > 0 && !p.nodmg && !r.nodmg && !p.wait && !r.wait && (p.x - r.x) ** 2 + (p.y - r.y) ** 2 < (p.r + r.r) ** 2) { p.life = r.life = 0; clash(p, r); }
  }
  projectiles = projectiles.filter(p => p.life > 0);
  for (const v of vines) {
    v.t += dt; const f = v.owner, o = other(f), L = vineLen(v);
    if (!v.hit && L >= v.reach * .85 && !o.dead && Math.abs(f.lp - o.lp) < .6) {
      const oy = GROUND + laneY(f) - f.z - f.lift - f.h * .72, ox = f.x, b = body(o), x1 = Math.min(ox, ox + f.face * L), x2 = Math.max(ox, ox + f.face * L);
      if (x2 > b.x1 && x1 < b.x2 && oy + 45 > b.y1 && oy - 45 < b.y2) { v.hit = true; if (v.miss) floatText(o.x, oy - 30, 'MISS', '#ddd'); else damage(f, o, v.dmg, f.face * 560, { x: clamp(o.x, x1, x2), y: oy }, true, v.ty); }
    }
  }
  vines = vines.filter(v => v.t < v.dur && !v.owner.dead);
  for (const bm of beams) {
    if (bm.hold) continue; // a beam locked in a clash is moved by updBeamClash
    bm.t += dt; bm.tick -= dt; const f = bm.owner, o = other(f);
    if (f.dead) { bm.t = 99; continue; }
    const m = muzzle(f); bm.x = m.x; bm.y = m.y;
    const BL = bm.len || 1500, hw = bm.w * .5, th = bm.ang || 0, ux = f.face * Math.cos(th), uy = Math.sin(th); // the beam leaves at the angle it was fired and stops on its target
    let hitS = -1; if (!o.dead && Math.abs(f.lp - o.lp) < .6) for (let s = 0; s <= BL; s += 24) if (circleRect(bm.x + ux * s, bm.y + uy * s, hw, body(o))) { hitS = s; break; }
    bm.th = Math.atan2(uy, ux); bm.hit = hitS >= 0; bm.endS = bm.hit ? hitS + o.w * .1 : BL; bm.endX = bm.x + ux * bm.endS; bm.endY = bm.y + uy * bm.endS;
    if (bm.tick <= 0 && bm.hit && !bm.nodmg) { bm.tick = .16; damage(f, o, bm.dmg || f.kit.beam.dmg, f.face * 220, { x: bm.endX, y: bm.endY }, false, bm.ty || f.kit.beam.type); }
  }
  beams = beams.filter(b => b.t < b.dur); updBeamClash(dt);
  for (const w of waves) {
    w.t += dt; w.x += w.vx * dt; const f = w.owner, o = other(f);
    if (w.kind === 'boulder') { w.rot += w.vx * dt / 46; if (Math.random() < dt * 30) puff(w.x, GROUND, 1, 'rgba(160,130,90,.7)', 50); }
    if (!w.hit && !o.dead && Math.abs(f.lp - o.lp) <= 1.2 && Math.abs(o.x - w.x) < o.w * .4 + (w.kind === 'boulder' ? 46 : 36) && o.z + o.lift < (w.kind === 'surf' ? 130 : w.kind === 'boulder' ? 70 : 45)) {
      w.hit = true;
      if (w.miss) floatText(o.x, GROUND - o.z - o.lift - o.h - 10, 'MISS', '#ddd');
      else { damage(f, o, w.dmg, Math.sign(w.vx) * 600, center(o), true, w.ty); if (w.kind === 'surf') MOVEFX.splash(o.x, center(o).y, w, now); else if (w.sv) SPV.splash(o.x, center(o).y, w.ty); if (w.kind === 'surf') o.vz = Math.max(o.vz, 300); else if (w.kind === 'boulder') { o.vz = Math.max(o.vz, 780); w.vx *= .55; shake = Math.max(shake, 16); puff(w.x, GROUND, 8, 'rgba(160,130,90,.8)', 120); } }
    }
    if (w.kind === 'quake' && Math.random() < .5) puff(w.x, GROUND, 1, 'rgba(150,110,70,.7)', 40);
  }
  waves = waves.filter(w => w.t < w.dur && w.x > -200 && w.x < WORLD_W + 200);
  for (const r of rocks) {
    r.t += dt;
    if (r.t >= r.delay && !r.done) {
      r.y += 950 * dt;
      if (r.y >= GROUND - 12) {
        r.done = true; if (r.sv) { SPV.land(r.x, GROUND, r.style === 'ice', ROCK_TY[r.style] || 'rock'); if (r.first) SPV.snd('punch'); } shake = Math.max(shake, 7); sfx('hit'); puff(r.x, GROUND, 6, r.style === 'ice' ? 'rgba(220,245,255,.8)' : 'rgba(150,120,80,.8)', 90);
        spark(r.x, GROUND - 20, r.style === 'ice' ? '#bfeaff' : r.style === 'fire' ? '#ff9a3a' : '#e8dcc0', 8);
        if (aoe(r.owner, r.x, GROUND - 30, 62, r.dmg, 260, false, r.freeze ? 'freeze' : null, ROCK_TY[r.style]) && r.style === 'fire') other(r.owner).poisonT = 0;
      }
    }
  }
  rocks = rocks.filter(r => !r.done && !r.owner.dead);
  for (const z of zones) {
    z.t += dt; const f = z.owner, o = other(f);
    const inside = !o.dead && !z.miss && Math.abs(o.x - z.x) < z.r + o.w * .2 && o.z + o.lift < 140;
    if (z.miss && !z.shown && Math.abs(o.x - z.x) < z.r + o.w * .2) { z.shown = true; floatText(o.x, GROUND - o.h - 10, 'MISS', '#ddd'); }
    if (z.kind === 'ring') {
      z.tick -= dt; if (inside && z.ty === 'water') o.x += Math.sign(z.x - o.x) * 150 * dt;
      if (inside && z.tick <= 0) { z.tick = .22; damage(f, o, z.dmg, 0, center(o), false, z.ty); o.hitT = 0; }
    }
    else if (z.kind === 'whirl') {
      z.x = f.x; z.tick -= dt; const near = !o.dead && Math.abs(o.x - z.x) < z.r + o.w * .2 && Math.abs((o.z + o.lift) - (f.z + f.lift)) < 240 && Math.abs(f.lp - o.lp) < 1.2;
      if (near && !z.miss && z.tick <= 0) { z.tick = .17; const last = z.t > z.dur - .2; damage(f, o, z.dmg * (last ? 2.2 : 1), Math.sign(o.x - f.x || f.face) * (last ? 700 : 240), center(o), last, z.ty); o.hitT = last ? o.hitT : 0; WHIRLFX.hit(o.x, center(o).y, z.ty, last, z.hn = (z.hn || 0) + 1, now); }
    }
    else if (z.kind === 'sleep') { if (inside && !z.hit) { z.inT += dt; if (z.inT > .35) { z.hit = true; o.sleepT = 1.5; o.act = null; floatText(o.x, GROUND - o.h - 10, 'ZZZ', '#e2b8ff'); } } }
    else if (z.kind === 'poison') { if (inside && !(o.ability.immune && o.ability.immune.includes('poison'))) o.poisonT = Math.max(o.poisonT, 2.2); }
    else if (z.kind === 'para') { if (inside) { o.slowT = Math.max(o.slowT, 3); if (Math.random() < dt * 8) spark(o.x + rnd(-30, 30), GROUND - rnd(20, o.h), '#ffe01a', 3, 140); } }
  }
  zones = zones.filter(z => z.t < z.dur && !z.owner.dead);
  for (const p of pillars) {
    p.t += dt;
    if (p.track && !p.done && p.t < p.delay - .2) { const tgt = other(p.owner); p.x = clamp(tgt.x + (p.off || 0), 40, WORLD_W - 40); } // roots follow the foe until the last moment
    if (p.t >= p.delay && !p.done && p.kind === 'root') {
      p.done = true; sfx('hit'); shake = Math.max(shake, 6); puff(p.x, GROUND, 8, 'rgba(70,120,40,.7)', 90); const tgt = other(p.owner);
      if (aoe(p.owner, p.x, GROUND - 80, 56, p.dmg, 300, false, null, p.ty)) { tgt.slowT = Math.max(tgt.slowT, 2.4); floatText(tgt.x, GROUND - tgt.z - tgt.lift - tgt.h - 8, 'ENTANGLED!', '#7dff4a', 24); }
    } else if (p.t >= p.delay && !p.done && p.kind === 'spike') {
      p.done = true; sfx('hit'); shake = Math.max(shake, 9); puff(p.x, GROUND, 7, 'rgba(190,170,130,.8)', 90); const tgt = other(p.owner);
      if (aoe(p.owner, p.x, GROUND - 70, 52, p.dmg, 380, true, null, p.ty)) tgt.vz = Math.max(tgt.vz, 560);
    } else if (p.t >= p.delay && !p.done && !p.kind) { p.done = true; if (p.sv && p.first) SPV.snd('boom'); sfx('hit'); shake = Math.max(shake, 8); puff(p.x, GROUND, 6, 'rgba(200,230,255,.8)', 90); aoe(p.owner, p.x, GROUND - 90, 70, p.dmg, 420, true, null, p.ty); }
  }
  pillars = pillars.filter(p => p.t < p.delay + .6 && !p.owner.dead);
  for (const s of strikes) s.t += dt; strikes = strikes.filter(s => s.t < .6);
  for (const b of booms) b.t += dt; booms = booms.filter(b => b.t < b.dur);
  for (const c of cracks) c.t += dt; cracks = cracks.filter(c => c.t < c.dur);
  for (const d of decals) d.t += dt; decals = decals.filter(d => d.t < d.life); updJfx(dt);
  for (const s of sparks) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= .94; s.vy *= .94; }
  sparks = sparks.filter(s => s.t < s.life);
  for (const s of puffs) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= .95; } puffs = puffs.filter(s => s.t < s.life);
  for (const r of rings) r.t += dt; rings = rings.filter(r => r.t < .3);
  for (const m of impacts) m.t += dt; impacts = impacts.filter(m => m.t < .22);
  for (const c of clashes) c.t += dt; clashes = clashes.filter(c => c.t < .6);
  for (const u of popups) u.t += dt; popups = popups.filter(u => u.t < .4);
  for (const t of floaters) t.t += dt; floaters = floaters.filter(t => t.t < .9);
  flashT = Math.max(0, flashT - dt);
}
const vineLen = v => { const r = v.reach, t = v.t; return t < .06 ? 0 : t < .26 ? r * easeOut((t - .06) / .2) : t < .36 ? r : r * (1 - easeOut((t - .36) / .24)); };

// ---------------------------------------------------------------- drawing
const auraRgb = {}, auraHash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function auraBlob(g, x, y, rx, ry, col, a) { // a soft radial glow, squashed to an ellipse
  if (rx < 1 || ry < 1 || a <= .01) return; const c = auraRgb[col] || (auraRgb[col] = [1, 3, 5].map(i => parseInt(col.substr(i, 2), 16)).join(','));
  g.save(); g.translate(x, y); g.scale(1, ry / rx); const q = g.createRadialGradient(0, 0, 0, 0, 0, rx); q.addColorStop(0, `rgba(${c},${a})`); q.addColorStop(.55, `rgba(${c},${a * .72})`); q.addColorStop(1, `rgba(${c},0)`);
  g.fillStyle = q; g.beginPath(); g.arc(0, 0, rx, 0, 6.283); g.fill(); g.restore();
}
function drawAura(g, f, k, cols = f.kit.aura) { // soft halo: a breathing glow round the whole body with wisps drifting up; no flat edge, so it suits flyers too
  const floor = GROUND + laneY(f), lift = f.z + f.lift, base = floor - lift, w = f.w, h = f.h, cx = f.x, cy = base - h / 2, fly = lift > 10, t = now, ks = clamp(k, .3, 1.5), al = Math.min(1.3, ks);
  const pulse = 1 + .05 * Math.sin(t * 3.2), N = Math.round((lowQ ? 8 : 16) * ks);
  g.save(); // the coloured body of the glow is drawn normally so it shows on bright arenas too; the hot centre and sparkles are added on top
  auraBlob(g, cx, cy, w * 1.25 * pulse * (.8 + .2 * ks), h * 1.02 * pulse * (.85 + .15 * ks), cols[1], .75 * al);
  if (!fly) auraBlob(g, cx, floor, w * (1.05 + .15 * ks), h * .14, cols[1], .7 * Math.min(1.2, ks)); else auraBlob(g, cx, floor, w * .75, h * .08, cols[1], .35 * Math.min(1, ks)); // a pool of light on the floor, a faint one under a flyer
  for (let i = 0; i < N; i++) {
    const u = (t * .5 + i * .618) % 1, x = cx + (auraHash(i) * 2 - 1) * w * .5 + Math.sin(u * 6 + i) * w * .1, y = cy + (auraHash(i + 9) * 2 - 1) * h * (fly ? .45 : .3) + (fly ? 0 : h * .12) - u * h;
    auraBlob(g, x, y, w * .16 * (1 - u * .5), h * .3 * (1 - u * .45), i % 2 ? cols[0] : cols[1], Math.sin(u * Math.PI) * .7 * al);
  }
  g.globalCompositeOperation = 'lighter';
  auraBlob(g, cx, cy + h * .04, w * .6, h * .62, cols[0], .5 * Math.min(1, ks + .2));
  const M = Math.round((lowQ ? 4 : 12) * ks), sr = Math.max(2.5, h / 50);
  for (let i = 0; i < M; i++) { const u = (t * .8 + i * .37) % 1; auraBlob(g, cx + (auraHash(i + 30) * 2 - 1) * w * .6 + Math.sin(u * 8 + i) * 6, cy + h * .35 - u * h * 1.2, sr, sr, '#ffffff', Math.sin(u * Math.PI) * .9); }
  g.restore();
}function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); }
// battle effect sprites from Pokémon Showdown (tools/build_pmd.py downloads them)
const FX = {};
for (const n of 'fireball flareball electroball shadowball mistball waterwisp poisonwisp wisp energyball blackwisp mudwisp icicle rocks rock1 rock2 rock3 leaf1 leaf2 petal feather fist foot bone lightning shell shine sword web impact greenmetal1 bluefireball'.split(' ')) { const im = new Image(); im.src = `assets/fx/${n}.png`; FX[n] = im; }
if (typeof TFX !== 'undefined') TFX.init(FX);
if (typeof SHOTFX !== 'undefined') SHOTFX.init({ spr, FX, TYPE_COL });
const SPV = typeof SPFX !== 'undefined' ? SPFX : null; if (SPV) SPV.init({ FX, muted: () => muted, low: () => lowQ, G: () => GROUND, laneY, vol: () => VOL.fx });
const tfxS = f => clamp(f.h / 62, 1.4, 3);
function spr(g, n, x, y, w, rot = 0, alpha = 1) {
  const im = FX[n]; if (!im || !im.naturalWidth) return; const h = w * im.naturalHeight / im.naturalWidth;
  g.save(); g.globalAlpha *= alpha; g.translate(x, y); if (rot) g.rotate(rot); g.drawImage(im, -w / 2, -h / 2, w, h); g.restore();
}
const TYPE_ORB = { fire: 'flareball', water: 'waterwisp', electric: 'electroball', grass: 'energyball', ice: 'waterwisp', psychic: 'mistball', ghost: 'shadowball', poison: 'poisonwisp', ground: 'mudwisp', rock: 'mudwisp', dragon: 'shadowball', fighting: 'wisp', normal: 'wisp', flying: 'wisp', bug: 'energyball', dark: 'shadowball', steel: 'wisp', fairy: 'mistball' };
function drawProj(g, p) {
  if (p.pat) { if (!p.wait) drawPat(g, p); return; }
  if (p.sv) { SPV[p.sv](g, p); return; }
  const k = p.kind, r = p.r, dir = Math.sign(p.vx) || 1, ang = Math.atan2(p.vy, p.vx), n = p.trail.length;
  const add = fn => { g.save(); g.globalCompositeOperation = 'lighter'; fn(); g.restore(); };
  const glow = (name, s, a = 1) => add(() => spr(g, name, p.x, p.y, r * s, 0, a));
  const trail = (name, s, a) => add(() => { for (let i = 0; i < n; i++) spr(g, name, p.trail[i].x, p.trail[i].y, r * s * (.35 + .65 * i / n), 0, a * i / n); });
  if (k === 'fire') { trail('flareball', 2.6, .5); glow('flareball', 4, 1); for (let i = 0; i < 3; i++) spr(g, 'fireball', p.x - dir * i * r * .8, p.y + Math.sin(now * 30 + i * 2) * 4, r * (2.4 - i * .5), ang - Math.PI / 2); }
  else if (k === 'water') { trail('waterwisp', 2.2, .4); glow('waterwisp', 3.2, 1); for (let i = 0; i < 3; i++) spr(g, 'bluefireball', p.x - dir * (r + i * 12), p.y + Math.sin(now * 20 + i * 2) * 8, r * .9, ang - Math.PI / 2, .85); }
  else if (k === 'leaf') { trail('energyball', 1.8, .3); spr(g, Math.floor(p.rot) % 2 ? 'leaf1' : 'leaf2', p.x, p.y, r * 2.8, p.rot * .5); }
  else if (k === 'rock') spr(g, ['rock1', 'rock2', 'rock3'][Math.floor(r) % 3], p.x, p.y, r * 2.6, p.rot * .4);
  else if (k === 'ice') { glow('waterwisp', 2.4, .5); spr(g, 'icicle', p.x, p.y, r * 3.2, ang); add(() => spr(g, 'shine', p.x + dir * r, p.y, r * 1.6, p.rot * .3)); }
  else if (k === 'bone') spr(g, 'bone', p.x, p.y, r * 2.8, p.rot);
  else if (k === 'star') { glow('shine', 3, .8); spr(g, 'greenmetal1', p.x, p.y, r * 2.8, p.rot); }
  else if (k === 'psy') { trail('mistball', 2, .35); glow('mistball', 3.4, 1); drawOrb(g, p); }
  else if (k === 'shadow' || k === 'curse') { trail('shadowball', 2, .35); glow('shadowball', 3.6, 1); }
  else if (k === 'acid') { trail('poisonwisp', 2, .4); glow('poisonwisp', 3.6, 1); glow('mudwisp', 2, .6); }
  else if (k === 'sand') { trail('mudwisp', 2, .4); glow('mudwisp', 3.4, 1); }
  else if (k === 'drain') { trail('energyball', 2, .4); glow('energyball', 3.6, 1); for (let i = 0; i < 3; i++) { const a = now * 9 + i * 2.1; spr(g, 'leaf2', p.x + Math.cos(a) * r * 1.8, p.y + Math.sin(a) * r * 1.8, r * 1.4, a); } }
  else if (k === 'web') spr(g, 'web', p.x, p.y, r * 3.4, p.rot * .3);
  else if (k === 'smoke') { trail('blackwisp', 2.4, .5); glow('blackwisp', 4, .9); }
  else if (k === 'flashy') { glow('wisp', 4, 1); glow('shine', 5, 1); }
  else if (k === 'bolt') { trail('electroball', 2.4, .4); glow('electroball', 3.6, 1); drawOrb(g, p); }
  else if (k === 'gust') { // a spinning funnel with feathers circling it
    g.save(); for (let i = 0; i < 9; i++) { const u = i / 8, w = 14 + u * 44, y = p.y + 36 - u * 110, ox = Math.sin(now * 14 + i * .9) * 8 * (1 - u * .3); g.globalAlpha = .55 - u * .2; g.fillStyle = i % 2 ? '#dff0ff' : '#ffffff'; g.beginPath(); g.ellipse(p.x + ox, y, w, 7 + u * 4, 0, 0, 6.283); g.fill(); } g.restore();
    for (let i = 0; i < 5; i++) { const a = now * 10 + i * 1.26; spr(g, 'feather', p.x + Math.cos(a) * 40, p.y - 20 + Math.sin(a) * 16 - i * 8, 30, a); }
    glow('wisp', 3, .5);
  }
  else if (k === 'spore') { // a drifting cloud: purple Zs for sleep, green-purple bubbles for poison, crackling yellow for paralysis
    const col = p.st === 'sleep' ? '#d9b8ff' : p.st === 'poison' ? '#b055e0' : '#ffe84a'; g.save();
    for (let i = 0; i < 6; i++) { const a = now * 6 + i * 1.05; g.globalAlpha = .45; g.fillStyle = col; circ(g, p.x + Math.cos(a) * r * .8, p.y + Math.sin(a * 1.3) * r * .6, r * (.5 + .1 * (i % 3))); }
    g.globalAlpha = 1; g.fillStyle = '#fff'; g.font = 'bold 22px "Courier New",monospace'; g.textAlign = 'center';
    if (p.st === 'sleep') g.fillText('Z', p.x + 4, p.y - r - ((now * 40) % 16)); else if (p.st === 'poison') for (let i = 0; i < 3; i++) circ(g, p.x + Math.sin(now * 8 + i * 2) * r * .6, p.y - ((now * 50 + i * 20) % 40), 3);
    else { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(p.x - r * .5, p.y - 8); g.lineTo(p.x, p.y + 4); g.lineTo(p.x + r * .5, p.y - 6); g.stroke(); }
    g.restore(); glow('wisp', 2.4, .4);
  }
  else if (k === 'sting' || k === 'slash') drawOrb(g, p);
  else if (k === 'fist') { // a flying punch: afterimages of the fist trail behind it
    for (let i = 0; i < n; i += 2) spr(g, 'fist', p.trail[i].x, p.trail[i].y, r * 2.4 * (.4 + .6 * i / n), 0, .35 * i / n);
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .5; g.fillStyle = p.cols[1]; circ(g, p.x, p.y, r * 1.7); g.restore();
    g.save(); g.translate(p.x, p.y); g.scale(dir > 0 ? -1 : 1, 1); g.rotate((dir > 0 ? -1 : 1) * Math.sin(now * 20) * .12); const im = FX.fist; if (im && im.naturalWidth) { const w = r * 3.6, h = w * im.naturalHeight / im.naturalWidth; g.drawImage(im, -w / 2, -h / 2, w, h); } g.restore();
    glow('shine', 2.6, .8);
  }
  else { const o = TYPE_ORB[p.ty] || 'wisp'; trail(o, 2.2, .35); glow(o, 3.8, 1); glow('wisp', 1.8, .9); }
}
function drawLeaf(g, p) {
  g.save();
  for (let i = 0; i < p.trail.length; i += 2) { g.globalAlpha = i / p.trail.length * .35; g.fillStyle = p.cols[1]; circ(g, p.trail[i].x, p.trail[i].y, p.r * .5); }
  g.globalAlpha = 1; g.translate(p.x, p.y); g.rotate(p.rot);
  const gr = g.createLinearGradient(-p.r, 0, p.r, 0); gr.addColorStop(0, p.cols[1]); gr.addColorStop(1, p.cols[0]);
  g.fillStyle = gr; g.beginPath(); g.moveTo(-p.r * 1.3, 0); g.quadraticCurveTo(0, -p.r * 1.1, p.r * 1.3, 0); g.quadraticCurveTo(0, p.r * 1.1, -p.r * 1.3, 0); g.fill();
  g.strokeStyle = '#1c6a28'; g.lineWidth = 2; g.beginPath(); g.moveTo(-p.r * 1.3, 0); g.lineTo(p.r * 1.2, 0); g.stroke(); g.restore();
}
function drawOrb(g, p) {
  const c = p.cols, dir = Math.sign(p.vx) || 1; g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < p.trail.length; i++) { g.globalAlpha = i / p.trail.length * .4; g.fillStyle = c[1]; circ(g, p.trail[i].x, p.trail[i].y, p.r * (.4 + i / p.trail.length * .5)); }
  g.globalAlpha = 1;
  const k = p.kind;
  if (k === 'bolt') {
    g.strokeStyle = c[1]; g.lineWidth = 8; g.shadowColor = c[1]; g.shadowBlur = 18; g.beginPath(); g.moveTo(p.x - 40 * dir, p.y);
    for (let i = 1; i <= 6; i++) g.lineTo(p.x - 40 * dir + i * 14 * dir, p.y + (Math.random() - .5) * 26); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
  } else if (k === 'psy') {
    g.strokeStyle = c[1]; g.lineWidth = 6; for (let i = 0; i < 3; i++) { g.globalAlpha = 1 - i * .3; g.beginPath(); g.arc(p.x, p.y, p.r * (.5 + i * .4 + .1 * Math.sin(now * 20)), 0, 6.283); g.stroke(); }
    g.globalAlpha = 1; g.fillStyle = c[0]; circ(g, p.x, p.y, p.r * .45);
  } else if (k === 'sting') {
    g.strokeStyle = c[1]; g.lineWidth = 4; g.beginPath(); g.moveTo(p.x - 16 * dir, p.y); g.lineTo(p.x + 14 * dir, p.y); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
  } else if (k === 'star') {
    g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = '#ffe66a'; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? p.r * .55 : p.r * 1.3, a = i * Math.PI / 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill();
  } else if (k === 'rock') {
    g.globalCompositeOperation = 'source-over'; g.translate(p.x, p.y); g.rotate(p.rot * .5); g.fillStyle = '#8a7a5a'; g.strokeStyle = '#3a3020'; g.lineWidth = 3; g.beginPath();
    for (let i = 0; i < 7; i++) { const r = p.r * (1 + (i % 3) * .12), a = i * .897; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke();
  } else if (k === 'ice') {
    g.globalCompositeOperation = 'source-over'; g.translate(p.x, p.y); g.rotate(Math.atan2(p.vy, p.vx)); g.fillStyle = '#bfeaff'; g.strokeStyle = '#4aa8e8'; g.lineWidth = 2; g.beginPath(); g.moveTo(-p.r * 1.4, 0); g.lineTo(0, -p.r * .7); g.lineTo(p.r * 1.5, 0); g.lineTo(0, p.r * .7); g.closePath(); g.fill(); g.stroke();
  } else if (k === 'bone') {
    g.globalCompositeOperation = 'source-over'; g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = '#f2ecd8'; g.strokeStyle = '#8a7a5a'; g.lineWidth = 2; g.fillRect(-p.r * 1.2, -4, p.r * 2.4, 8); for (const sx of [-1, 1]) for (const sy of [-1, 1]) circ(g, sx * p.r * 1.2, sy * 5, 6);
  } else if (k === 'slash') {
    g.globalCompositeOperation = 'source-over'; g.translate(p.x, p.y); g.rotate(p.tilt * .6); g.scale(dir, 1);
    g.strokeStyle = c[0]; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.arc(-p.r * .7, 0, p.r * 1.3, -1.05, 1.05); g.stroke();
    g.strokeStyle = c[1]; g.lineWidth = 3; g.beginPath(); g.arc(-p.r * .7 - 6, 0, p.r * 1.3, -1.05, 1.05); g.stroke();
  } else if (k === 'gust') {
    g.strokeStyle = '#fff'; g.lineWidth = 5; for (let i = 0; i < 3; i++) { g.globalAlpha = 1 - i * .25; g.beginPath(); g.arc(p.x - i * 12 * dir, p.y, p.r * (.5 + i * .25), -1.2 + p.rot * .3, 1.2 + p.rot * .3); g.stroke(); }
  } else {
    const gr = g.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.r * 1.6); gr.addColorStop(0, c[0]); gr.addColorStop(.45, c[1]); gr.addColorStop(1, c[1] + '00');
    g.fillStyle = gr; circ(g, p.x, p.y, p.r * 1.6);
    if (k === 'water') { g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(255,255,255,.8)'; circ(g, p.x - p.r * .35, p.y - p.r * .35, p.r * .25); }
    if (k === 'acid') { g.globalCompositeOperation = 'source-over'; g.fillStyle = '#7a2a9a'; circ(g, p.x, p.y, p.r * .6); g.fillStyle = 'rgba(255,255,255,.6)'; circ(g, p.x - p.r * .25, p.y - p.r * .25, p.r * .18); }
  }
  g.restore();
}
function drawBeam(g, bm) {
  const f = bm.owner, c = bm.cols || f.kit.beam.cols, k = Math.sin(clamp(bm.t / bm.dur, 0, 1) * Math.PI), w = bm.w * (.4 + .6 * Math.min(1, k * 2.2));
  const th = bm.th !== undefined ? bm.th : (f.face > 0 ? 0 : Math.PI), len = Math.max(10, bm.endS !== undefined ? bm.endS : (bm.len || 1400));
  if (typeof TFX !== 'undefined') { // every type has its own pixel-art beam (data/typefx.js); the short beams of Flamethrower, Ice Beam and the like use it smaller
    if (bm.sv === 'mini') { SPV.flameBeam(g, bm); return; } const ty = bm.ty || f.kit.beam.type; TFX.beam(ty, g, .8 + clamp(bm.t / bm.dur, 0, 1) * 1.5, { mx: bm.x, my: bm.y, th: ty === 'ground' ? (f.face > 0 ? 0 : Math.PI) : th, S: tfxS(f) * clamp(bm.w / 54, .6, 1.5), len: Math.min(len, 900), gy: GROUND + laneY(f) }); if (bm.sv === 'big') SPV.beamBoom(g, bm); return;
  }
  g.save(); g.translate(bm.x, bm.y); g.rotate(th); g.globalCompositeOperation = 'lighter'; // drawn along +x, then turned to the beam's angle
  for (const [mul, col, al] of [[1.9, c[2], .35], [1.2, c[1], .6], [.55, c[0], 1]]) {
    g.globalAlpha = al; g.fillStyle = col; g.beginPath(); const steps = 28;
    g.moveTo(0, -w * mul / 2);
    for (let i = 0; i <= steps; i++) g.lineTo(len * i / steps, -w * mul / 2 + Math.sin(i * .7 - now * 40) * 4 * mul);
    for (let i = steps; i >= 0; i--) g.lineTo(len * i / steps, w * mul / 2 + Math.sin(i * .7 - now * 40 + 2) * 4 * mul);
    g.closePath(); g.fill();
  }
  const rg = g.createRadialGradient(0, 0, 2, 0, 0, w * 1.4); rg.addColorStop(0, '#fff'); rg.addColorStop(.4, c[1] + 'cc'); rg.addColorStop(1, c[2] + '00');
  g.globalAlpha = 1; g.fillStyle = rg; circ(g, 0, 0, w * 1.4);
  // rounded light ball where the beam ends, bigger and with flares when it lands on its target
  const er = w * (bm.hit ? 2.3 : 1.5), eg = g.createRadialGradient(len, 0, 2, len, 0, er); eg.addColorStop(0, '#fff'); eg.addColorStop(.3, c[1]); eg.addColorStop(.7, c[2] + '99'); eg.addColorStop(1, c[2] + '00');
  g.fillStyle = eg; circ(g, len, 0, er); spr(g, 'shine', len, 0, er * 2.2, now * 3, .9); spr(g, 'shine', len, 0, er * 1.4, -now * 4, .8);
  if (bm.hit) for (let i = 0; i < 6; i++) { const a = now * 9 + i * 1.05, r0 = er * .6; g.strokeStyle = c[0]; g.lineWidth = 3; g.beginPath(); g.moveTo(len + Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(len + Math.cos(a) * r0 * 1.9, Math.sin(a) * r0 * 1.9); g.stroke(); }
  g.restore();
}
function drawVine(g, v) {
  const f = v.owner, L = vineLen(v); if (L <= 2) return;
  const ox = f.x, oy = GROUND - f.z - f.lift - f.h * .72;
  g.save(); g.lineCap = 'round';
  for (const [dy, ph, col, wd] of [[-12, 0, '#2f9a3c', 9], [12, 2.2, '#3fb04c', 8]]) {
    for (const [stroke, wmul] of [['#145a22', 1.5], [col, 1]]) {
      g.strokeStyle = stroke; g.lineWidth = wd * wmul; g.beginPath(); g.moveTo(ox, oy + dy);
      for (let i = 1; i <= 24; i++) { const u = i / 24; g.lineTo(ox + f.face * L * u, oy + dy + Math.sin(u * 7 + ph - v.t * 22) * 16 * u * (1 - v.t / v.dur * .5)); }
      g.stroke();
    }
    const tx = ox + f.face * L, ty = oy + dy + Math.sin(7 + ph - v.t * 22) * 16;
    g.fillStyle = '#7dff4a'; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + f.face * 18, ty - 14, tx + f.face * 34, ty); g.quadraticCurveTo(tx + f.face * 18, ty + 14, tx, ty); g.fill();
    g.save(); g.globalCompositeOperation = 'lighter'; spr(g, 'energyball', tx + f.face * 10, ty, 74, 0, .7); g.restore(); spr(g, Math.floor(now * 10) % 2 ? 'leaf1' : 'leaf2', tx + f.face * 14, ty, 56, now * 9 * f.face);
  }
  g.restore();
}
function drawBolt(g, x, a) {
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round';
  if (FX.lightning.naturalWidth) { g.globalAlpha = a; g.drawImage(FX.lightning, x - 80, -10, 160, GROUND + 30); g.globalAlpha = a * .6; g.drawImage(FX.lightning, x - 120, -10, 240, GROUND + 30); }
  const pts = [[x + rnd(-6, 6), -20]]; for (let y = 40; y < GROUND - 20; y += 46) pts.push([x + rnd(-36, 36), y]); pts.push([x, GROUND - 20]);
  for (const [w, col] of [[26, 'rgba(255,224,26,.35)'], [12, '#ffe01a'], [4, '#fff']]) { g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }
  g.restore();
}
function drawSurf(g, w) { MOVEFX.surf(g, w, GROUND + 6 + laneY(w.owner), now, lowQ); } // the wave looks follow the caster's type
function drawQuakeWave(g, w) {
  const dir = Math.sign(w.vx), a = clamp(1 - Math.max(0, w.t - .8) / .3, 0, 1), ly = laneY(w.owner), by = GROUND + ly;
  g.save(); g.globalAlpha = a; g.lineCap = 'round'; g.lineJoin = 'round';
  // glowing fissure behind the shock front, rocks thrown up along it, dust rolling out
  for (const [wd, col] of [[16, 'rgba(255,140,40,.25)'], [7, 'rgba(255,200,90,.7)'], [2.5, '#fff6d0']]) {
    g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); g.moveTo(w.x, by + 4);
    for (let i = 1; i <= 14; i++) g.lineTo(w.x - dir * i * 26, by + 5 + Math.sin(i * 2.3 + w.vx) * 5 + (i % 3) * 1.5);
    g.stroke();
  }
  for (let i = 0; i < 7; i++) {
    const x = w.x - dir * (i * 34 + 10), h = 78 * Math.max(0, 1 - i * .12) * (.72 + .28 * Math.sin(now * 18 + i));
    spr(g, 'rock' + (1 + i % 3), x, by - h * .5, 56 - i * 3, now * 3 + i * 1.3);
    spr(g, 'mudwisp', x, by - 24, 74, 0, .55 * (1 - i * .1));
  }
  g.globalCompositeOperation = 'lighter'; spr(g, 'shine', w.x, by - 18, 110, now * 5, .6);
  g.restore();
}
function svOverlay(g, f) { // sprite looks for the wind-up of the move being cast
  const a = f.act, m = muzzle(f); if (a.name === 'beam') { if (!a.fired) SPV.beamCharge(g, m, a.t, f.kit.beam.type, f.face); return; } if (a.name !== 'sp' || a.done) return;
  if (a.key === 'blast') SPV.chargeBall(g, m, clamp(a.t / .25, 0, 1), a.ty); else if (a.key === 'minibeam') SPV.chargeBall(g, m, clamp(a.t / .4, 0, 1), a.ty); else if (a.key === 'selfdestruct') SPV.sdCharge(g, f.x, center(f).y, a.t / .65, a.ty); else if (a.key === 'strike') SPV.strikeCharge(g, a.mark, a.t, a.ty);
}
function drawAlert(g, f) {
  if (f.alertT <= 0 || f.dead) return;
  const k = f.alertT / .5, y = GROUND + laneY(f) - f.z - f.lift - f.h - 34, pulse = 1 + .2 * Math.sin(now * 40);
  if (f.alertLen) { // the warning strip points the way the shot will go
    const m = muzzle(f), an = f.alertAim ? aimA(m, other(f)) : 0, th = Math.atan2(Math.sin(an), f.face * Math.cos(an)), pw = 1 + .08 * Math.sin(now * 30);
    g.save(); g.translate(m.x, m.y); g.rotate(th); g.lineCap = 'round'; // a capsule that fades along its length, centred on the beam's own axis
    for (const [w, al] of [[50, .14], [34, .22], [18, .4]]) { const gr = g.createLinearGradient(0, 0, f.alertLen, 0); gr.addColorStop(0, `rgba(255,80,60,${al * 1.4})`); gr.addColorStop(1, 'rgba(255,80,60,0)'); g.strokeStyle = gr; g.lineWidth = w * pw; g.beginPath(); g.moveTo(0, 0); g.lineTo(f.alertLen, 0); g.stroke(); }
    g.restore();
  }
  g.save(); g.translate(f.x, y); g.scale(pulse, pulse); g.fillStyle = '#ff3b3b'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -22); g.lineTo(21, 15); g.lineTo(-21, 15); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.font = 'bold 26px "Courier New",monospace'; g.textAlign = 'center'; g.fillText('!', 0, 12); g.restore();
}
function drawRock(g, r) {
  if (r.sv && r.t >= r.delay) return SPV.rock(g, r, GROUND, ROCK_TY[r.style] || 'rock');
  if (r.t < r.delay) {
    const a = .4 + .3 * Math.sin(now * 20); g.strokeStyle = `rgba(255,80,60,${a})`; g.lineWidth = 3; g.beginPath(); g.ellipse(r.x, GROUND + 4, 44, 10, 0, 0, 6.283); g.stroke(); return;
  }
  g.save(); g.translate(r.x, r.y);
  if (r.style === 'ice') { spr(g, 'icicle', 0, 0, 110, 2.0); g.globalCompositeOperation = 'lighter'; spr(g, 'shine', 0, -30, 40, r.t * 4, .8); }
  else if (r.style === 'fire') { g.globalCompositeOperation = 'lighter'; spr(g, 'flareball', 0, 0, 120); spr(g, 'fireball', 0, -26, 70, Math.PI); }
  else { spr(g, 'rock' + (1 + Math.floor(r.x) % 3), 0, 0, 74, r.t * 4); }
  g.restore();
}
const whirlBox = z => { const f = z.owner, fl = GROUND + laneY(f); return { x: z.x, feet: fl - f.z - f.lift, floor: fl, h: f.h, low: lowQ }; }; // where the Spin & Shred effect sits on its owner
function drawZone(g, z) {
  if (z.kind === 'whirl') { WHIRLFX.draw(g, z, 'back', whirlBox(z)); return; }
  const fade = clamp(Math.min(z.t / .25, (z.dur - z.t) / .3), 0, 1); g.save(); g.globalAlpha = fade;
  if (z.kind === 'ring' && z.ty === 'water') {
    g.strokeStyle = '#bfe8ff'; g.lineWidth = 6;
    for (let i = 0; i < 4; i++) { const k = (now * 1.6 + i * .25) % 1, rr = z.r * (.35 + k * .75); g.globalAlpha = fade * (1 - k); g.beginPath(); g.ellipse(z.x, GROUND - 6 - k * 70, rr, rr * .22, 0, 0, 6.283); g.stroke(); }
    g.globalAlpha = fade * .55; g.fillStyle = '#3a9bff'; g.beginPath(); g.ellipse(z.x, GROUND, z.r, 18, 0, 0, 6.283); g.fill();
    g.fillStyle = '#fff'; g.globalAlpha = fade; for (let i = 0; i < 9; i++) { const a = now * 5 + i * .7, k = i / 9; circ(g, z.x + Math.cos(a) * z.r * (.3 + k * .7), GROUND - 10 - k * 80, 4); }
  } else if (z.kind === 'ring') {
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * 6.283 + z.t * 6, x = z.x + Math.cos(a) * z.r, base = GROUND + Math.sin(a) * 12, hgt = 70 + 30 * Math.sin(now * 14 + i * 2);
      const gr = g.createLinearGradient(0, base, 0, base - hgt); gr.addColorStop(0, z.col[1] + 'ee'); gr.addColorStop(1, z.col[0] + '00'); g.fillStyle = gr;
      g.beginPath(); g.moveTo(x - 14, base); g.quadraticCurveTo(x, base - hgt * .6, x + Math.sin(now * 9 + i) * 8, base - hgt); g.quadraticCurveTo(x + 6, base - hgt * .5, x + 14, base); g.fill();
      spr(g, TYPE_ORB[z.ty] || 'wisp', x, base - hgt * .55, 54, 0, .8);
    }
  } else {
    const col = z.kind === 'sleep' ? ['rgba(190,140,255,.55)', '#e2b8ff'] : z.kind === 'poison' ? ['rgba(130,40,170,.55)', '#c060ff'] : ['rgba(255,230,40,.45)', '#fff27a'];
    for (let i = 0; i < 10; i++) { const a = i * 1.7 + z.t * 1.4, x = z.x + Math.cos(a) * z.r * .8, y = GROUND - 30 - Math.abs(Math.sin(a * 1.3)) * 60; g.fillStyle = col[0]; circ(g, x, y, 28 + (i % 3) * 8); }
    g.fillStyle = col[1]; g.font = 'bold 26px "Courier New",monospace'; g.textAlign = 'center';
    if (z.kind === 'sleep') for (let i = 0; i < 3; i++) g.fillText('Z', z.x - 30 + i * 30, GROUND - 120 - ((now * 60 + i * 30) % 70));
    if (z.kind === 'para') for (let i = 0; i < 3; i++) { g.strokeStyle = col[1]; g.lineWidth = 3; g.beginPath(); const x = z.x - 40 + i * 40; g.moveTo(x, GROUND - 140); g.lineTo(x + 8, GROUND - 100); g.lineTo(x - 6, GROUND - 90); g.lineTo(x + 4, GROUND - 50); g.stroke(); }
  }
  g.restore();
}
function drawPillar(g, p) {
  if (p.kind === 'root') return drawRoot(g, p); if (p.kind === 'spike') return drawSpike(g, p); if (p.sv && p.t >= p.delay) return SPV.geyser(g, p, GROUND, p.ty);
  const c = colsOf(p.ty);
  if (p.t < p.delay) { g.strokeStyle = c[1]; g.globalAlpha = .5 + .3 * Math.sin(now * 25); g.lineWidth = 3; g.beginPath(); g.ellipse(p.x, GROUND + 4, 50, 10, 0, 0, 6.283); g.stroke(); g.globalAlpha = 1; return; }
  const k = (p.t - p.delay) / .6, h = 270 * easeOut(Math.min(1, k * 3.5)) * (1 - Math.max(0, k - .55) / .45), w = 84 + Math.sin(now * 30) * 6;
  if (h < 4) return;
  g.save(); g.globalAlpha = Math.min(1, (1 - k) * 2);
  const gr = g.createLinearGradient(p.x - w / 2, 0, p.x + w / 2, 0); gr.addColorStop(0, c[1]); gr.addColorStop(.5, c[0]); gr.addColorStop(1, c[1]);
  g.fillStyle = gr; g.beginPath(); g.moveTo(p.x - w / 2, GROUND + 4); g.lineTo(p.x - w * .38, GROUND - h); g.quadraticCurveTo(p.x, GROUND - h - 26, p.x + w * .38, GROUND - h); g.lineTo(p.x + w / 2, GROUND + 4); g.closePath(); g.fill();
  g.fillStyle = '#fff'; for (let i = 0; i < 8; i++) circ(g, p.x + Math.sin(now * 14 + i * 2) * w * .4, GROUND - h * ((i + 1) / 9) - Math.cos(now * 9 + i) * 8, 4 + (i % 3) * 2);
  circ(g, p.x - w * .35, GROUND - h, 8); circ(g, p.x + w * .35, GROUND - h + 4, 7);
  g.restore();
}
function drawRoot(g, p) {
  if (p.t < p.delay) { // a trembling mound of earth warns where the root will burst out
    g.save(); g.globalAlpha = .4 + .4 * clamp(1 - (p.delay - p.t) / .5, 0, 1); g.fillStyle = '#3a2a14'; g.beginPath(); g.ellipse(p.x, GROUND + 3, 30 + 6 * Math.sin(now * 30), 8, 0, 0, 6.283); g.fill();
    g.strokeStyle = '#6fd04a'; g.lineWidth = 3; g.beginPath(); g.moveTo(p.x - 14, GROUND); g.quadraticCurveTo(p.x, GROUND - 14 - 10 * Math.sin(now * 25), p.x + 14, GROUND); g.stroke(); g.restore(); return;
  }
  const k = (p.t - p.delay) / .6, h = 250 * easeOut(Math.min(1, k * 3.2)) * (1 - Math.max(0, k - .6) / .4); if (h < 4) return;
  g.save(); g.lineCap = 'round';
  for (const [dx, wd, col] of [[-16, 15, '#2f8a34'], [12, 12, '#3fb04c'], [-2, 9, '#58c85a']]) {
    const ph = dx * .3, sway = u => Math.sin(u * 5 + ph + now * 6) * 14 * u;
    for (const [stroke, m] of [['#145a22', 1.45], [col, 1]]) { g.strokeStyle = stroke; g.lineWidth = wd * m; g.beginPath(); g.moveTo(p.x + dx, GROUND + 4); for (let i = 1; i <= 16; i++) { const u = i / 16; g.lineTo(p.x + dx + sway(u) + dx * u * .8, GROUND + 4 - h * u); } g.stroke(); }
    g.fillStyle = '#7dff4a'; for (let i = 1; i < 5; i++) { const u = i / 5, ty = GROUND + 4 - h * u, tx = p.x + dx + sway(u) + dx * u * .8; g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx + (i % 2 ? 14 : -14), ty - 6); g.lineTo(tx, ty - 12); g.fill(); }
    spr(g, Math.floor(now * 8 + dx) % 2 ? 'leaf1' : 'leaf2', p.x + dx + sway(1) + dx * .8, GROUND + 4 - h, 52, now * 3 + dx);
  }
  g.restore();
}
function drawSpike(g, p) { MOVEFX.spike(g, p, GROUND, now); }
function drawBoulder(g, w) { // the bowling ball: a big spinning rock with a shadow
  const r = 46, fade = clamp((w.dur - w.t) / .3, 0, 1);
  g.save(); g.globalAlpha = fade; g.fillStyle = 'rgba(10,5,0,.3)'; g.beginPath(); g.ellipse(w.x, GROUND + 4, r * .9, 9, 0, 0, 6.283); g.fill();
  g.translate(w.x, GROUND - r + 6); g.rotate(w.rot);
  const gr = g.createRadialGradient(-r * .3, -r * .3, 4, 0, 0, r); gr.addColorStop(0, '#b4a47e'); gr.addColorStop(1, '#5a4c34'); g.fillStyle = gr; g.strokeStyle = '#2e2412'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(40,30,16,.7)'; g.lineWidth = 3; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0, 0, r * (.35 + i * .22), i * 2, i * 2 + 2.2); g.stroke(); }
  g.fillStyle = 'rgba(40,30,16,.8)'; for (let i = 0; i < 3; i++) circ(g, Math.cos(i * 2.1) * r * .5, Math.sin(i * 2.1) * r * .5, 6);
  g.restore();
}
function drawBoom(g, b) {
  if (b.sv) return;
  const k = b.t / b.dur, r = b.r * easeOut(k), a = 1 - k; g.save(); g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(b.x, b.y, 4, b.x, b.y, r); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(.35, b.col + Math.floor(a * 200).toString(16).padStart(2, '0')); gr.addColorStop(1, b.col + '00');
  g.fillStyle = gr; circ(g, b.x, b.y, r);
  g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = 8 * a + 1; g.beginPath(); g.arc(b.x, b.y, r * .95, 0, 6.283); g.stroke(); g.restore();
}
function drawDecal(g, d) {
  const a = clamp(1 - d.t / d.life, 0, 1) * clamp(d.t / .12, 0, 1), r = d.r * .8, ty = d.ty;
  g.save(); g.translate(d.x, GROUND + 10); g.scale(1, .2); g.globalAlpha = a;
  const rg = (c0, c1) => { const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; circ(g, 0, 0, r); };
  if (ty === 'ice') { rg('rgba(235,250,255,.85)', 'rgba(150,220,255,0)'); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, r * .7, 0, 6.283); g.stroke(); }
  else if (ty === 'water') { rg('rgba(70,150,255,.6)', 'rgba(70,150,255,0)'); g.strokeStyle = 'rgba(210,240,255,.7)'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, r * (.5 + .2 * Math.sin(now * 4)), 0, 6.283); g.stroke(); }
  else if (ty === 'poison') rg('rgba(150,40,200,.65)', 'rgba(150,40,200,0)');
  else if (ty === 'ground' || ty === 'rock' || ty === 'fighting') { rg('rgba(50,32,14,.8)', 'rgba(50,32,14,0)'); g.strokeStyle = 'rgba(210,170,100,.6)'; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, r * .78, 0, 6.283); g.stroke(); }
  else { rg('rgba(18,10,6,.78)', 'rgba(18,10,6,0)'); if (d.t < 2) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * (1 - d.t / 2) * .7; rg(d.col + 'aa', d.col + '00'); } }
  g.restore();
}
// weather overlay, drawn over the whole view
function drawWeather(g) {
  if (!weather) { if (rainFx) { g.save(); g.strokeStyle = 'rgba(205,228,255,.5)'; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i < 30; i++) { const x = ((i * 97.3 + now * 120) % (W + 60)) - 30, y = ((i * 53.1 + now * 620 * (.8 + (i % 4) * .1)) % (H + 40)) - 20; g.moveTo(x, y); g.lineTo(x - 4, y + 14); } g.stroke(); g.restore(); } return; } const id = weather.id, t = now; g.save();
  if (id === 'rain') {
    g.strokeStyle = 'rgba(190,220,255,.55)'; g.lineWidth = 1.6; g.beginPath();
    for (let i = 0; i < 70; i++) { const x = ((i * 131.7 + t * 260) % (W + 80)) - 40, y = ((i * 71.3 + t * 1250 * (.7 + (i % 5) * .12)) % (H + 60)) - 30; g.moveTo(x, y); g.lineTo(x - 9, y + 26); } g.stroke();
  } else if (id === 'hail') {
    g.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 70; i++) { const x = ((i * 157.3 + t * 90 + Math.sin(t * 2 + i) * 14) % (W + 40)) - 20, y = ((i * 83.1 + t * 420 * (.7 + (i % 4) * .15)) % (H + 20)) - 10; g.fillRect(x, y, 4 + i % 3, 4 + i % 3); }
  } else if (id === 'sand') {
    g.strokeStyle = 'rgba(240,205,140,.4)'; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i < 60; i++) { const x = (((i * 173 - t * 900) % (W + 200)) + W + 200) % (W + 200) - 100, y = (i * 53.7) % H; g.moveTo(x, y); g.lineTo(x + 46, y + 3); } g.stroke();
  } else if (id === 'sun') {
    /* the sun's glow is part of the #tint overlay */
  }
  g.restore();
}
// small things moving in the arena so it never feels frozen
const AMBIENT = { meadow: 'leaf', forest: 'leaf', volcano: 'ember', desert: 'dust', canyon: 'dust', cave: 'dust', stadium: 'dust', city: 'dust', ice: 'snow', night: 'fly', frozenlake: 'snow', ruins: 'fly', glade: 'leaf', cliffs: 'leaf', shrine: 'leaf', redcanyon: 'dust', champion: 'dust', pokeball: 'dust', ranch: 'leaf', crystalcave: 'dust', magmacrater: 'ember', plaza: 'leaf' };
function drawAmbient(g) {
  const id = curTheme.id, t = now, par = camX * .3, kind = AMBIENT[id] || (tod === 'night' ? 'fly' : undefined); g.save();
  if (['meadow', 'forest', 'beach', 'stadium', 'canyon', 'desert', 'ranch', 'palmcove'].includes(id)) {
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2; i++) { const x = (((i * 380 - par + 200) % (W + 300)) + W + 300) % (W + 300) - 150, a = .045 + .03 * Math.sin(t * .8 + i * 2), gr = g.createLinearGradient(x, 0, x + 160, H * .8); gr.addColorStop(0, `rgba(255,236,170,${a})`); gr.addColorStop(1, 'rgba(255,236,170,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 90, 0); g.lineTo(x + 330, H * .8); g.lineTo(x + 170, H * .8); g.fill(); }
    g.globalCompositeOperation = 'source-over';
  }
  if (id === 'sea' || id === 'water') { g.strokeStyle = 'rgba(200,240,255,.10)'; g.lineWidth = 3; for (let i = 0; i < 8; i++) { g.beginPath(); for (let x = 0; x <= W; x += 40) g.lineTo(x, 380 + i * 30 + Math.sin(x * .02 + t * 1.6 + i) * 6); g.stroke(); } } // shimmering water
  if (id === 'volcano' || id === 'magmacrater') { const gr = g.createLinearGradient(0, H * .55, 0, H); gr.addColorStop(0, 'rgba(255,90,20,0)'); gr.addColorStop(1, `rgba(255,90,20,${.14 + .07 * Math.sin(t * 3) + .03 * Math.sin(t * 11)})`); g.fillStyle = gr; g.fillRect(0, H * .55, W, H * .45); } // flickering lava glow
  if (kind) for (let i = 0; i < 16; i++) {
    const bx = (((i * 149.3 + t * 30 * (1 + i % 3) - par) % (W + 60)) + W + 60) % (W + 60) - 30;
    if (kind === 'leaf') { const y = ((i * 61 + t * 40 * (.6 + (i % 3) * .3)) % (H + 40)) - 20; g.fillStyle = i % 2 ? '#7fbf4a' : '#d8c04a'; g.globalAlpha = .8; g.beginPath(); g.ellipse(bx + Math.sin(t * 1.5 + i) * 24, y, 7, 3, t * 3 + i, 0, 6.283); g.fill(); }
    else if (kind === 'ember') { const y = H - ((i * 53 + t * 60 * (.5 + (i % 4) * .3)) % (H + 40)); g.fillStyle = '#ffb347'; g.globalAlpha = .5 + .4 * Math.sin(t * 9 + i); g.fillRect(bx + Math.sin(t + i) * 12, y, 2 + i % 3, 2 + i % 3); }
    else if (kind === 'dust') { g.fillStyle = '#fff'; g.globalAlpha = .18 + .12 * Math.sin(t + i); g.fillRect(bx, (i * 41 + t * 6 * (1 + i % 3)) % H, 2, 2); }
    else if (kind === 'snow') { const y = ((i * 67 + t * 50 * (.6 + (i % 3) * .25)) % (H + 20)) - 10; g.fillStyle = '#fff'; g.globalAlpha = .55 + .35 * Math.sin(t * 3 + i); g.fillRect(bx + Math.sin(t + i) * 16, y, 3, 3); }
    else if (kind === 'fly') { g.globalAlpha = .5 + .5 * Math.sin(t * 2 + i); g.fillStyle = '#d6ff6a'; circ(g, bx + Math.sin(t * .7 + i * 3) * 60, 280 + (i % 7) * 40 + Math.cos(t * .9 + i) * 30, 2.5); }
  }
  g.restore();
}
function drawWall(g, x) { // a fence at the edge of the arena, with the out-of-bounds side shaded
  const out = x < WORLD_W / 2 ? -1 : 1, top = GROUND - 300, bot = GROUND + 40, depth = 120;
  g.save();
  const sh = g.createLinearGradient(x, 0, x + out * 520, 0); sh.addColorStop(0, 'rgba(0,0,0,.55)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(out > 0 ? x : x - 520, 0, 520, H);
  const bx = x + out * depth, bt = top + 30; // back post, shorter so the fence recedes
  g.fillStyle = 'rgba(190,200,215,.10)'; g.beginPath(); g.moveTo(x, top); g.lineTo(bx, bt); g.lineTo(bx, bot - 22); g.lineTo(x, bot); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(210,220,235,.28)'; g.lineWidth = 1.5; g.beginPath(); // chain-link
  for (let i = 0; i <= 10; i++) { const u = i / 10; g.moveTo(x + (bx - x) * u, top + (bt - top) * u); g.lineTo(x + (bx - x) * Math.min(1, u + .12), bot - (22 * Math.min(1, u + .12))); g.moveTo(x + (bx - x) * u, bot - 22 * u); g.lineTo(x + (bx - x) * Math.min(1, u + .12), top + (bt - top) * Math.min(1, u + .12)); }
  g.stroke();
  g.strokeStyle = '#8f98a8'; g.lineWidth = 5; g.beginPath(); for (const t of [0, .5, 1]) { const y0 = top + (bot - top) * t, y1 = bt + (bot - 22 - bt) * t; g.moveTo(x, y0); g.lineTo(bx, y1); } g.stroke();
  g.fillStyle = '#5b6372'; g.fillRect(bx - 5, bt, 10, bot - 22 - bt); // back post
  const hz = 26; g.fillStyle = '#ffd34d'; g.fillRect(x - 11, top, 22, bot - top); g.fillStyle = '#23252b'; g.beginPath(); // front post with hazard stripes
  for (let y = top; y < bot; y += hz) { g.moveTo(x - 11, y); g.lineTo(x + 11, y + hz / 2); g.lineTo(x + 11, y + hz); g.lineTo(x - 11, y + hz / 2); } g.fill();
  g.strokeStyle = '#23252b'; g.lineWidth = 3; g.strokeRect(x - 11, top, 22, bot - top);
  g.fillStyle = '#ff4a3a'; circ(g, x, top - 8, 9); g.fillStyle = `rgba(255,120,90,${.25 + .15 * Math.sin(now * 4)})`; circ(g, x, top - 8, 22);
  g.restore();
}
function ghostTint(f, w, h, col) { // the fighter's current frame painted in one flat colour, reused by every afterimage of this draw
  const c = f._gc || (f._gc = document.createElement('canvas')); w = Math.max(1, Math.ceil(w)); h = Math.max(1, Math.ceil(h));
  if (c.width !== w || c.height !== h || c._k !== col + '|' + (f.shown || '') + '|' + Math.floor(now * 20)) { c.width = w; c.height = h; c._k = col + '|' + (f.shown || '') + '|' + Math.floor(now * 20); const x = c.getContext('2d'); x.drawImage(f.el, 0, 0, w, h); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, w, h); }
  return c;
}
function drawGhost(g, f, gh, a, dx = 0, dz = 0) {
  g.save(); g.globalAlpha = a; g.translate(gh.x + dx, GROUND - gh.z - gh.lift + (gh.ly || 0) + (gh.fo || 0) - dz); g.scale((gh.fs || 1) * (gh.noflip ? 1 : (gh.back ? -1 : 1) * (gh.face > 0 ? -1 : 1)), gh.fs || 1); g.imageSmoothingEnabled = false;
  try { const d = gh.gd || { x: -(f.bw || f.w) / 2, y: -(f.bh || f.h), w: f.bw || f.w, h: f.bh || f.h }; if (gh.col) { g.drawImage(ghostTint(f, d.w, d.h, gh.col), d.x, d.y, d.w, d.h); } else g.drawImage(gh.snap || f.el, d.x, d.y, d.w, d.h); } catch (e) { } g.restore();
}
function drawGhosts(g, f, front) {
  for (const gh of f.ghosts) { if (!!gh.front !== !!front) continue; const a = (1 - (now - gh.at) / (gh.life || .28)) * (gh.col ? .5 : .35) * (front ? 1.6 : 1); if (a > 0) drawGhost(g, f, gh, a); }
}
function chargeFx(g, f) { // charging: a tinted outline round the body and two rings pulsing out along the floor
  const col = f.kit.cols[1], gh = { x: f.x, z: f.z, lift: f.lift, ly: laneY(f), fo: f.fgOff || 0, fs: f.fgGs || 1, face: f.face, back: f.poseBack, gd: f.gd, noflip: f.gd && f.gd.noflip, col };
  for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) drawGhost(g, f, gh, .55, dx, dz);
  const y = GROUND + laneY(f) - f.z - f.lift + 2; g.save(); g.strokeStyle = col; g.lineWidth = 4;
  for (let i = 0; i < 2; i++) { const v = (now * 1.2 + i * .5) % 1, r = f.w * (.3 + .75 * v); g.globalAlpha = 1 - v; g.beginPath(); g.ellipse(f.x, y, r, r * .3, 0, 0, 6.283); g.stroke(); }
  g.restore();
}
let camSep = 600;
function draw() {
  fxb.clearRect(0, 0, W, H); fxf.clearRect(0, 0, W, H);
  if (!P) { drawBg(0); return; }
  let tx = (P.x + E.x) / 2 - W / 2; const M = meF(), O = other(M), follow = !demo && !lab && !P.dead && !E.dead; // the player stays in the free middle of the screen, clear of the buttons; a far-away foe may leave the view
  if (follow) { const s = Math.sign(O.x - M.x) || 1; tx = clamp(tx, M.x - (s > 0 ? .48 : .64) * W, M.x - (s > 0 ? .30 : .52) * W); }
  camX += (clamp(tx, 0, WORLD_W - W) - camX) * .12; if (follow) camX = clamp(clamp(camX, M.x - .70 * W, M.x - .26 * W), 0, WORLD_W - W);
  drawBg(camX);
  clashDim += ((bclash ? 1 : 0) - clashDim) * Math.min(1, hudDt * 7); if (clashDim > .01) { fxb.fillStyle = `rgba(0,0,14,${(.8 * clashDim).toFixed(3)})`; fxb.fillRect(0, 0, W, H); } // the arena darkens during a beam clash so the eye stays on the beams
  fxb.save(); fxb.translate(-camX, 0); fxf.save(); fxf.translate(-camX, 0);
  for (const c of cracks) { const a = clamp(1 - c.t / c.dur, 0, 1) * clamp(c.t / .1, 0, 1); fxb.strokeStyle = `rgba(30,18,8,${a * .8})`; fxb.lineWidth = 3; fxb.beginPath(); for (let i = -4; i <= 4; i++) { fxb.moveTo(c.x + i * 22, GROUND + 4); fxb.lineTo(c.x + i * 22 + 10, GROUND + 22); fxb.lineTo(c.x + i * 22 - 6, GROUND + 40); } fxb.stroke(); }
  for (const z of zones) drawZone(fxb, z);
  for (const d of decals) drawDecal(fxb, d); for (const f of [P, E]) drawTrail(fxb, f);
  for (const wx of [WALL_L, WALL_R]) if (wx > camX - 60 && wx < camX + W + 60) drawWall(fxb, wx);
  drawGroundProps(fxb);
  tmDraw('b', fxb);
  for (const f of [P, E]) {
    if (lab && f === E) continue;
    const sx = f.x, sy = GROUND + 4 + laneY(f), rw = f.w * .46 * (1 + f.lp * .14) * Math.max(.25, 1 - (f.z + f.lift) / 520), al = Math.max(0, .5 - (f.z + f.lift) / 700) * (f.under ? 0 : f.fade); // soft contact shadow
    fxb.save(); fxb.translate(sx, sy); fxb.scale(1, .2); const sg = fxb.createRadialGradient(0, 0, 0, 0, 0, rw); sg.addColorStop(0, `rgba(10,5,0,${al})`); sg.addColorStop(.6, `rgba(10,5,0,${al * .6})`); sg.addColorStop(1, 'rgba(10,5,0,0)'); fxb.fillStyle = sg; circ(fxb, 0, 0, rw); fxb.restore();
    if (!lowQ) drawGhosts(fxb, f);
    if (LIFE && f.chromaT > 0) chromaDraw(fxb, f);
    if (f.shieldT > 0 && !f.dead) { const cc = f.kit.cols, cy = GROUND - f.z - f.lift - f.h * .5, rr = Math.max(f.w, f.h) * .75, gl = fxb.createRadialGradient(f.x, cy, rr * .6, f.x, cy, rr); gl.addColorStop(0, cc[1] + '10'); gl.addColorStop(1, cc[0] + '88'); fxb.fillStyle = gl; circ(fxb, f.x, cy, rr); fxb.strokeStyle = cc[0]; fxb.lineWidth = 3; fxb.globalAlpha = .6 + .3 * Math.sin(now * 8); fxb.beginPath(); fxb.arc(f.x, cy, rr, 0, 6.283); fxb.stroke(); fxb.globalAlpha = 1; }
    if (f.under) { fxb.fillStyle = '#7a5a30'; fxb.beginPath(); fxb.ellipse(f.x, GROUND + 2, 46, 16, 0, Math.PI, 0); fxb.fill(); }
    const big = f.act && f.act.name === 'beam' ? 1.2 : 0;
    if (!f.dead && (f.charging || big || f.buffT > 0 || f.abilOn)) drawAura(fxb, f, f.charging || big ? 1 + big * .3 : .28);
    if (LIFE && !lowQ && f.charging && !f.dead && !f.pmd) chargeFx(fxb, f);
    else if (!f.dead && f.act && f.act.name === 'sp' && f.act.t < .4) drawAura(fxb, f, .7, colsOf(f.act.ty));
    else if (LIFE && !lowQ && !f.dead && f.hp < f.maxhp * .25 && state === 'fight') auraBlob(fxb, f.x, GROUND + laneY(f) - f.z - f.lift - f.h / 2, f.w * 1.1, f.h * .95, '#ff3a3a', .16 + .09 * Math.sin(now * 6)); // a tired fighter pulses red
  }
  for (const p of puffs) { fxb.globalAlpha = 1 - p.t / p.life; fxb.fillStyle = p.col; circ(fxb, p.x, p.y, p.r * (1 + p.t)); } fxb.globalAlpha = 1;
  // warnings where a lightning strike will land
  for (const f of [P, E]) if (f.act && ((f.act.key === 'strike' && !f.act.done) || (f.act.key === 'swoop' && f.act.phase === 1))) { const m = f.act.mark; fxf.strokeStyle = `rgba(255,224,26,${.5 + .4 * Math.sin(now * 30)})`; fxf.lineWidth = 4; fxf.beginPath(); fxf.ellipse(m, GROUND + 4, 120, 22, 0, 0, 6.283); fxf.stroke(); }
  for (const z of hazards) drawHazard(fxf, z);
  tmDraw('f', fxf);
  for (const p of pickups) drawPickup(fxf, p);
  for (const r of rocks) drawRock(fxf, r);
  for (const p of pillars) drawPillar(fxf, p);
  for (const z of zones) if (z.kind === 'whirl') WHIRLFX.draw(fxf, z, 'front', whirlBox(z));
  WHIRLFX.drawHits(fxf, now); MOVEFX.drawSplashes(fxf, now);
  for (const v of vines) drawVine(fxf, v);
  for (const f of [P, E]) {
    if (!lowQ) drawGhosts(fxf, f, true);
    if (f.act && f.act.sv) svOverlay(fxf, f);
    if (f.act && f.act.name === 'beam' && !f.act.fired && typeof TFX !== 'undefined') { const m = muzzle(f); TFX.beam(f.kit.beam.type, fxf, .78 * clamp(f.act.t / .9, 0, 1), { mx: m.x, my: m.y, th: f.face > 0 ? 0 : Math.PI, S: tfxS(f), len: Math.abs(center(other(f)).x - m.x), gy: GROUND + laneY(f) }); }
    else if (f.act && f.act.name === 'beam' && !f.act.fired) {
      const m = muzzle(f), k = clamp(f.act.t / .9, 0, 1), r = 10 + 40 * k, g = fxf, c = f.kit.beam.cols;
      g.save(); g.globalCompositeOperation = 'lighter';
      const rg = g.createRadialGradient(m.x + f.face * 10, m.y, 1, m.x + f.face * 10, m.y, r * 1.5); rg.addColorStop(0, '#fff'); rg.addColorStop(.35, c[1]); rg.addColorStop(1, c[2] + '00');
      g.fillStyle = rg; circ(g, m.x + f.face * 10, m.y, r * 1.5);
      g.strokeStyle = c[1]; g.lineWidth = 2; for (let i = 0; i < 10; i++) { const a = i * .628 + now * 4, d1 = r * 2.2 * (1 - (now * 2 + i * .1) % 1); g.beginPath(); g.moveTo(m.x + f.face * 10 + Math.cos(a) * d1, m.y + Math.sin(a) * d1); g.lineTo(m.x + f.face * 10 + Math.cos(a) * d1 * .8, m.y + Math.sin(a) * d1 * .8); g.stroke(); }
      g.restore();
    }
  }
  for (const w of waves) (w.kind === 'surf' ? drawSurf : w.kind === 'boulder' ? drawBoulder : drawQuakeWave)(fxf, w);
  for (const b of beams) drawBeam(fxf, b); if (bclash) drawBClash(fxf);
  for (const p of projectiles) drawProj(fxf, p); VAR.draw(fxf);
  for (const u of popups) { const k = u.t / .4; fxf.save(); fxf.globalAlpha = 1 - k; spr(fxf, u.img, u.x, u.y, (36 + 60 * easeOut(k * 2)) * (u.s || 1), u.rot); fxf.restore(); }
  drawJfx(fxf); for (const m of impacts) { const k = m.t / .22; fxf.save(); fxf.globalAlpha = 1 - k; fxf.strokeStyle = m.col; fxf.lineWidth = 4 - 2 * k; fxf.beginPath(); for (let i = 0; i < m.n; i++) { const a = i / m.n * 6.283 + m.rot, r0 = 24 + 40 * k, r1 = r0 + 36 * (1 - k * .5); fxf.moveTo(m.x + Math.cos(a) * r0, m.y + Math.sin(a) * r0); fxf.lineTo(m.x + Math.cos(a) * r1, m.y + Math.sin(a) * r1); } fxf.stroke(); fxf.restore(); }
  for (const s of strikes) { if (s.sv) SPV.bolt(fxf, s); else drawBolt(fxf, s.x, clamp(1 - s.t / .5, 0, 1)); }
  for (const b of booms) drawBoom(fxf, b); if (SPV) SPV.draw(fxf);
  for (const f of [P, E]) if (f.shockT > 0 && !f.dead) drawShock(fxf, f);
  for (const c of clashes) { const k = c.t / .6; fxf.save(); fxf.globalCompositeOperation = 'lighter'; fxf.globalAlpha = 1 - k; fxf.strokeStyle = '#fff'; fxf.lineWidth = 16 * (1 - k) + 3; fxf.beginPath(); fxf.arc(c.x, c.y, 40 + easeOut(k) * 1100, 0, 6.283); fxf.stroke(); fxf.strokeStyle = '#ffd34d'; fxf.lineWidth = 8 * (1 - k) + 2; fxf.beginPath(); fxf.arc(c.x, c.y, 20 + easeOut(k) * 800, 0, 6.283); fxf.stroke(); fxf.restore(); }
  for (const r of rings) { fxf.strokeStyle = r.col; fxf.globalAlpha = 1 - r.t / .3; fxf.lineWidth = 4; fxf.beginPath(); fxf.arc(r.x, r.y, 10 + r.t * 220, 0, 6.283); fxf.stroke(); fxf.globalAlpha = 1; }
  for (const s of sparks) { fxf.globalAlpha = 1 - s.t / s.life; if (s.col === '#fff' || s.col === '#ffd34d') { fxf.save(); fxf.globalCompositeOperation = 'lighter'; spr(fxf, 'shine', s.x, s.y, s.size * 4, s.t * 6); fxf.restore(); } else { fxf.fillStyle = s.col; fxf.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size); } } fxf.globalAlpha = 1;
  fxf.textAlign = 'center';
  for (const t of floaters) { fxf.globalAlpha = 1 - t.t / .9; const y = t.y - t.t * 70; fxf.font = `bold ${Math.round(t.size * (1 + .45 * Math.max(0, 1 - t.t / .12)))}px "Courier New",monospace`; fxf.lineJoin = 'round'; fxf.lineWidth = 6; fxf.strokeStyle = '#000'; fxf.strokeText(t.text, t.x, y); fxf.fillStyle = t.col; fxf.fillText(t.text, t.x, y); } fxf.globalAlpha = 1;
  if (NETG.on) for (const [f, i] of [[P, 0], [E, 1]]) { // the players' names float over their Pokémon
    const n = NETG.names[i]; if (!n || f.dead) continue; const y = GROUND + laneY(f) - f.z - f.lift - f.h - 8;
    fxf.save(); fxf.font = '900 13px system-ui,sans-serif'; fxf.textAlign = 'center'; const tw = fxf.measureText(n).width + 20; fxf.globalAlpha = .92; fxf.fillStyle = i ? '#ffb066' : '#9fe8ff'; fxf.beginPath(); rrect(fxf, f.x - tw / 2, y - 18, tw, 19, 9.5); fxf.fill(); fxf.fillStyle = '#06210f'; fxf.fillText(n, f.x, y - 4); fxf.restore();
  }
  for (const f of [P, E]) { // speech bubbles
    const u = now - (f.sayT || -9); if (!f.say || u < 0 || u > 2.3) continue;
    const k = u < .12 ? .6 + u / .12 * .4 : 1, y = GROUND + laneY(f) - f.z - f.lift - f.h - (NETG.on ? 54 : 30);
    fxf.save(); fxf.globalAlpha = 1 - clamp((u - 2.0) / .3, 0, 1); fxf.font = '800 17px system-ui,sans-serif'; fxf.textAlign = 'center'; const tw = fxf.measureText(f.say).width + 24;
    fxf.translate(f.x, y); fxf.scale(k, k); fxf.fillStyle = '#fff'; fxf.beginPath(); rrect(fxf, -tw / 2, -30, tw, 32, 12); fxf.moveTo(-6, 1); fxf.lineTo(0, 11); fxf.lineTo(8, 1); fxf.fill(); fxf.fillStyle = '#111'; fxf.fillText(f.say, 0, -8); fxf.restore();
  }
  fxb.restore(); fxf.restore();
  fxf.save(); fxf.translate(-camX, 0); for (const f of [P, E]) drawAlert(fxf, f); if (!lowQ) drawFrontProps(fxf); fxf.restore();
  if (!lowQ) { drawAmbient(fxf); drawWeather(fxf); }
  let wc = null; for (const f of [P, E]) { const a = f.act; if (a && !f.dead && ((a.name === 'sp' && a.key !== 'dash') || (a.name === 'beam' && a.fired))) wc = colsOf(a.ty || f.kit.beam.type)[1]; }
  if (wc) washCol = rgbOf(wc); washA += ((wc ? .13 : 0) - washA) * Math.min(1, hudDt * 10);
  if (washA > .004) { fxf.save(); fxf.globalCompositeOperation = 'lighter'; fxf.fillStyle = `rgba(${washCol},${washA})`; fxf.fillRect(0, 0, W, H); fxf.restore(); }
  if (flashT > 0) { fxf.fillStyle = `rgba(${flashCol},${clamp(flashT * 5, 0, .55)})`; fxf.fillRect(0, 0, W, H); }
  if (impactT > 0) { // a critical hit freezes on one white frame with black speed lines
    impactT -= hudDt; fxf.save(); fxf.fillStyle = '#fff'; fxf.fillRect(0, 0, W, H); fxf.strokeStyle = '#000'; fxf.beginPath(); for (let i = 0; i < 36; i++) { const a = i / 36 * 6.283 + (i % 3) * .04; fxf.lineWidth = 2 + (i % 4) * 2; fxf.moveTo(impX + Math.cos(a) * 60, impY + Math.sin(a) * 60 * .7); fxf.lineTo(impX + Math.cos(a) * 800, impY + Math.sin(a) * 800 * .7); } fxf.stroke(); fxf.restore();
  }
  if (koLineT > 0) { // K.O.: coloured speed lines round the loser
    koLineT -= hudDt; const kk = clamp(koLineT / .55, 0, 1), fr = Math.floor(now * 24); fxf.save(); fxf.globalCompositeOperation = 'lighter'; fxf.strokeStyle = koLineCol;
    for (let i = 0; i < 40; i++) { const h1 = Math.abs(Math.sin(i * 127.1 + fr * 3.7)), a = i / 40 * 6.283 + h1 * .15, r0 = 90 + h1 * 120; fxf.globalAlpha = kk * (.3 + .5 * Math.abs(Math.sin(i * 9.3))); fxf.lineWidth = 1.5 + h1 * 4; fxf.beginPath(); fxf.moveTo(koLineX + Math.cos(a) * r0, koLineY + Math.sin(a) * r0 * .7); fxf.lineTo(koLineX + Math.cos(a) * 700, koLineY + Math.sin(a) * 700 * .7); fxf.stroke(); }
    fxf.restore();
  }
  if (supT > 0) { // big SUPER EFFECTIVE! banner in the type colour
    supT -= hudDt; const u = 1 - supT, pop = u < .15 ? 1 + (1 - u / .15) * .5 : 1; fxf.save(); fxf.globalAlpha = clamp(supT / .25, 0, 1); fxf.translate(W / 2, (H - CH) / 2 + 200); fxf.scale(pop, pop); fxf.rotate(-.04); fxf.font = 'italic 900 46px system-ui,sans-serif'; fxf.textAlign = 'center'; fxf.lineJoin = 'round'; fxf.lineWidth = 9; fxf.strokeStyle = '#000'; fxf.strokeText('SUPER EFFECTIVE!', 0, 0); fxf.fillStyle = supCol; fxf.fillText('SUPER EFFECTIVE!', 0, 0); fxf.restore();
  }
  if (LIFE && state === 'fight') for (const [f, x, al] of [[P, (W - CW) / 2 + 150, 'left'], [E, (W + CW) / 2 - 150, 'right']]) if (f.hp > 0 && f.hp < f.maxhp * .25) { fxf.save(); fxf.globalAlpha = .75 + .25 * Math.sin(now * 8); fxf.font = '900 13px system-ui,sans-serif'; fxf.textAlign = al; fxf.lineWidth = 4; fxf.lineJoin = 'round'; fxf.strokeStyle = '#000'; fxf.strokeText('RAGE x1.2', x, (H - CH) / 2 + 124); fxf.fillStyle = '#ff4a3a'; fxf.fillText('RAGE x1.2', x, (H - CH) / 2 + 124); fxf.restore(); }
  if (LIFE && !lowQ && state === 'fight' && (P.hp > 0 && P.hp < P.maxhp * .25 || E.hp > 0 && E.hp < E.maxhp * .25)) { // someone is in rage: a pulsing red edge
    if (!rageG) { rageG = fxf.createRadialGradient(W / 2, H / 2, H * .42, W / 2, H / 2, H * .95); rageG.addColorStop(0, 'rgba(255,30,20,0)'); rageG.addColorStop(1, 'rgba(255,30,20,1)'); }
    fxf.save(); fxf.globalAlpha = .24 + .12 * Math.sin(now * 8); fxf.fillStyle = rageG; fxf.fillRect(0, 0, W, H); fxf.restore();
  }
  if (SPV) SPV.screen(fxf, W, H);
  for (const f of [P, E]) renderFighter(f);
  if (lab) E.el.style.display = 'none';
  const sep = Math.abs(P.x - E.x), ko = state === 'ko' && winner && overT < 1.8, loser = winner === P ? E : P; // push in when the fighters are close; on a KO, close in on the loser
  const hiAlt = Math.max(P.z + P.lift, E.z + E.lift);
  if (lab) camZ += (Math.max(.74, (clamp(1.12 - (sep - 240) / 2000, 1, 1.12) + (ko ? .14 : 0)) / (1 + clamp((hiAlt - 150) / 500, 0, 1.8))) - camZ) * .06; // the move lab keeps its own framing
  else { // dynamic camera: pushes in as the fighters close up, eases out as they part, never crops a fighter's head or the screen sides
    camSep += (sep - camSep) * (1 - Math.exp(-hudDt * 7)); // smoothed so a dash in and out does not make the zoom pump
    const near = clamp((660 - camSep) / 500, 0, 1); let z = 1 + .3 * near * near * (3 - 2 * near);
    if (near > 0 && [P, E].some(f => f.act && (f.act.name === 'melee' || f.act.name === 'sp' && CONTACT_SP.has(f.act.key)))) z += .05 * near; // a little closer still while a rush or strike is landing
    const hh = Math.max(P.h, E.h) * (1 + Math.max(P.lp, E.lp, 0) * .14); z = Math.min(z, Math.max(1, (GROUND - 30) / (hh + 40)));
    const ox = (P.x + E.x) / 2 - camX; for (const f of [P, E]) { const sx = f.x - camX, half = f.w / 2 + 40; z = Math.min(z, Math.max(1, sx < ox ? ox / (ox - sx + half) : (W - ox) / (sx - ox + half))); }
    const tz = Math.max(.74, (z + (ko ? .14 : 0)) / (1 + clamp((hiAlt - 150) / 500, 0, 1.8)));
    camZ += (tz - camZ) * (1 - Math.exp(-hudDt * (tz > camZ ? 2.4 : 5.5))); // in slowly, out quickly
  }
  if (!lab) punch *= Math.exp(-hudDt * 10);
  $('world').style.transformOrigin = ko ? `${loser.x - camX}px ${GROUND - loser.h / 2}px` : `${(P.x + E.x) / 2 - camX}px ${GROUND}px`;
  $('world').style.transform = (shake > .5 || Math.abs(kick) > .5 ? `translate(${(Math.random() - .5) * shake + kick}px,${(Math.random() - .5) * shake}px) ` : '') + `scale(${camZ + punch})` + (clashT > .02 ? ` rotate(${(Math.sin(now * 55) * clashT * 2.5).toFixed(2)}deg)` : '');
  clashT = Math.max(0, clashT - hudDt * 1.6);
  hud();
}
// A little life on top of the animated sprite: breathing, hopping steps, stretch and squash on jumps and landings, lunges, recoil.
function pmdPick(f) {
  const a = f.act, I = f.pmd.info, pick = (...n) => n.find(x => I[x]) || (I.Idle ? 'Idle' : 'Walk');
  if (f.dead) return { n: pick('Hurt'), p: 1 };
  if (f.sleepT > 0) return { n: pick('Sleep', 'Hurt'), loop: 1 };
  if (f.freezeT > 0) return { n: pick('Hurt'), p: .1 };
  if (f.hitT > 0) return { n: pick('Hurt'), loop: 1.6 };
  if (a) {
    if (a.name === 'grab') return a.ph === 1 ? { n: pick('Swing', 'Attack'), p: clamp(a.t1 / (isFly(f) ? .75 : .35), 0, .99) } : a.ph === 2 ? { n: pick('Attack'), p: clamp(.4 + a.t2 / .3 * .6, 0, .99) } : { n: pick('Attack'), p: clamp(a.t / .5, 0, .6) };
    if (a.name === 'melee') return { n: pick('Attack'), p: a.t / .5 };
    if (a.name === 'dash') return { n: pick('Attack'), p: a.t / .3 };
    if (a.name === 'ranged') return { n: pick('Shoot', 'Attack'), p: a.t / .45 };
    if (a.name === 'beam') return a.fired ? { n: pick('Shoot', 'Attack'), p: (a.t - .9) / 1 } : { n: pick('Charge', 'Shoot'), p: a.t / .9 };
    if (a.key === 'whirl') return { n: pick('Swing', 'Attack'), loop: 3 }; // the sheet's own spin frames
    if (a.key === 'spin') return { n: pick('Hop', 'Charge'), p: .5 };
    return { n: pick(...(ANIM_OF[a.key] || ['Swing']), 'Attack'), p: a.t / Math.min(ARCH[a.key].dur, 1.1) };
  }
  if (f.charging) return { n: pick('Charge'), loop: 1.5 };
  if (isFly(f)) return { n: pick('Flap', 'Fly', 'Walk', 'Idle'), loop: Math.abs(f.vx) > 40 ? 1.8 + Math.abs(f.vx) / 300 : 1.2 }; // PMD 'FlapAround' (real flapping frames) where the artists drew it, else the Hop-based 'Fly' sheet, else the walk sheet
  if (f.z > 8 && !isFly(f)) return { n: pick('Hop'), p: clamp(.5 - f.vz / 1700, 0, 1) };
  if (Math.abs(f.vx) > 30 && f.z <= 0) return { n: pick('Walk'), loop: 1 + Math.abs(f.vx) / 400 };
  return { n: pick('Idle', 'Walk'), loop: 1 };
}
let olc = null; // scratch canvas for the sprite outline
function pmdFrame(f) {
  const pk = pmdPick(f), inf = f.pmd.info[pk.n], img = f.pmd.imgs[pk.n], idx = pk.p !== undefined ? frameAt(inf.d, pk.p) : frameLoop(inf.d, now * pk.loop);
  const row = f.vf >= 0 ? 1 : 0, key = pk.n + idx + row, s = f.pmd.s, cw = inf.w * s, ch = inf.h * s;
  if (f.pmd.key !== key) {
    const cv = f.el; if (cv.width !== inf.w || cv.height !== inf.h) { cv.width = inf.w; cv.height = inf.h; }
    const c = cv.getContext('2d'); c.clearRect(0, 0, inf.w, inf.h);
    if (!lowQ) { // a dark outline baked into the frame (done once per animation frame, not every screen frame)
      if (!olc) olc = document.createElement('canvas'); if (olc.width !== inf.w || olc.height !== inf.h) { olc.width = inf.w; olc.height = inf.h; }
      const tc = olc.getContext('2d'); tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, inf.w, inf.h); tc.drawImage(img, idx * inf.w, row * inf.h, inf.w, inf.h, 0, 0, inf.w, inf.h);
      tc.globalCompositeOperation = 'source-in'; tc.fillStyle = 'rgba(12,8,24,.95)'; tc.fillRect(0, 0, inf.w, inf.h);
      c.drawImage(olc, -1, 0); c.drawImage(olc, 1, 0); c.drawImage(olc, 0, -1); c.drawImage(olc, 0, 1);
    }
    c.drawImage(img, idx * inf.w, row * inf.h, inf.w, inf.h, 0, 0, inf.w, inf.h);
    f.pmd.key = key; cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  }
  return { cw, ch, gyPx: (inf.h / 2 + f.pmd.gy) * s };
}
// 2D style: the Black/White sprites play frame by frame (faster when moving, slow motion and hit stop follow the game) and poses crossfade
function anim2D(f, pose, rdt) {
  const cv = f.el, sheet = f.anim[pose], im = sheet ? sheet.img : f.imgs[pose], bx = f.boxes[pose], inf = sheet && sheet.info;
  if (pose !== f.curPose) {
    const pv = f.curPose && f.curPose !== pose ? { pose: f.curPose, idx: f.curIdx || 0 } : null;
    f.prev = pv; f.xf = pv && POSE_ORIENT[pv.pose] === POSE_ORIENT[pose] ? .09 : 0; f.curPose = pose; f.popT = .12; f.akey = '';
    cv.style.width = bx.w + 'px'; cv.style.height = bx.h + 'px';
  }
  f.at = (f.at || 0) + rdt * (freeze > 0 ? 0 : slowT > 0 ? .35 : 1) * (isFly(f) ? 1.2 : Math.abs(f.vx) > 40 ? 1.5 : 1);
  const idx = inf ? frameLoop(inf.d, f.at) : 0; f.curIdx = idx;
  if (f.xf > 0) f.xf = Math.max(0, f.xf - rdt);
  const key = pose + idx + (f.xf > 0 ? 'x' + Math.round(f.xf * 60) : '');
  if (f.akey === key) return; f.akey = key;
  const fw = inf ? inf.w : (im.naturalWidth || 40), fh = inf ? inf.h : (im.naturalHeight || 40);
  if (cv.width !== fw || cv.height !== fh) { cv.width = fw; cv.height = fh; }
  const c = cv.getContext('2d'); c.clearRect(0, 0, fw, fh); c.imageSmoothingEnabled = false;
  if (f.xf > 0 && f.prev) {
    const ps = f.anim[f.prev.pose], pi = ps ? ps.img : f.imgs[f.prev.pose], pw = ps ? ps.info.w : pi.naturalWidth || fw, ph = ps ? ps.info.h : pi.naturalHeight || fh, k = f.xf / .09, s = fh / ph;
    c.globalAlpha = k; try { c.drawImage(pi, ps ? f.prev.idx * pw : 0, 0, pw, ph, (fw - pw * s) / 2, 0, pw * s, fh); } catch (e) { } c.globalAlpha = 1 - k;
  }
  try { c.drawImage(im, inf ? idx * inf.w : 0, 0, fw, fh, 0, 0, fw, fh); } catch (e) { }
  c.globalAlpha = 1;
}
// anticipation, strike and recovery as smooth curves instead of a snap between two poses; returns the extra lean, stretch and forward shift
function tween2D(f, a) {
  const F = f.face, ease = x => 1 - (1 - x) * (1 - x), lerp = (u, v, k) => u + (v - u) * k;
  if (f.hitT > 0) { if (f.hitBig) return null; const k = ease(clamp(f.hitT / .26, 0, 1)); return { dx: -F * 12 * k, rot: -F * 14 * k, sx: 1 + .1 * k, sy: 1 - .08 * k }; }
  if (!a) return null;
  if (a.name === 'melee') {
    const t = a.t, H = a.n === 2 ? 40 : 14; // the strike lifts the fighter a little, a launcher a lot
    if (t < .1) { const k = ease(t / .1); return { dx: -F * 10 * k, rot: -F * 9 * k, sx: 1 - .06 * k, sy: 1 + .04 * k, dz: 0 }; }
    if (t < .28) { const k = ease((t - .1) / .18); return { dx: F * lerp(-10, 30, k), rot: F * lerp(-9, 13, k), sx: lerp(.94, 1.16, k), sy: lerp(1.04, .93, k), dz: H * k }; }
    const k = ease(clamp((t - .28) / .22, 0, 1)); return { dx: F * lerp(30, 0, k), rot: F * lerp(13, 0, k), sx: lerp(1.16, 1, k), sy: lerp(.93, 1, k), dz: H * (1 - k) };
  }
  if (a.name === 'dash' || (a.name === 'sp' && a.key === 'dash')) { const k = ease(clamp(a.t / .25, 0, 1)), r = ease(clamp((a.t - .25) / .3, 0, 1)); return { dx: F * 16 * k * (1 - r), rot: (a.dir || F) * 12 * (1 - r), sx: lerp(1, 1.18, k) * (1 - .18 * r), sy: lerp(1, .9, k) * (1 + .1 * r) }; }
  if (a.name === 'ranged') { const k = clamp(a.t / .4, 0, 1), s = a.t < .12 ? ease(a.t / .12) * -.5 : Math.sin(clamp((a.t - .12) / .28, 0, 1) * Math.PI); return { dx: -F * 14 * Math.abs(s) * (s < 0 ? .5 : 1), rot: F * 5 * s, sx: 1 + .1 * Math.abs(s), sy: 1 - .04 * Math.abs(s) }; }
  if (a.name === 'beam' || f.charging) { const k = a.t !== undefined ? Math.min(1, a.t / .9) : 1; return { dx: -F * 6 * k + Math.sin(now * 50) * 1.5 * k, rot: -F * 6 * k, sx: 1 + .05 * k, sy: 1 - .04 * k }; }
  return null;
}
function poseGate(f, want, rdt) { // a pose is held for at least .09s (hits cut in at once) and a change of facing turns through the middle for .11s; returns the pose to draw now
  const o = f.shown;
  if (!o || !f.boxes[o] || f.dead) { f.shown = want; f.shownAt = now; f.turn = null; return want; }
  if (f.turn) { f.turn.t += rdt; if (f.turn.t >= .11) f.turn = null; }
  if (want !== o && (f.hitT > 0 || want === 'down' || want === 'hurt' || now - f.shownAt >= .09)) {
    if (POSE_ORIENT[o] !== POSE_ORIENT[want] && !(f.hitT > 0 || want === 'down' || want === 'hurt')) f.turn = { t: 0, from: o }; else if (f.hitT > 0 || want === 'down' || want === 'hurt') f.turn = null;
    f.shown = want; f.shownAt = now; kickF(f, 0, -.05, 0, 0);
  }
  return f.turn && f.turn.t < .055 ? f.turn.from : f.shown;
}
function backPose(f, a) { // one back sprite per strike, mixed between the animated back and the cropped static ones and never the same twice in a row; leaps, spins and anything airborne keep the animated back so no cut edge shows
  const air = f.z > 12 || f.lift > 12 || (a && (a.spinOn || a.fly || (a.name === 'sp' && (a.key === 'leap' || a.key === 'spin'))));
  if (!LIFE || air || !a) return 'back';
  if (a.bkN !== (a.n | 0)) { a.bkN = a.n | 0; const pool = f.id <= 151 ? ['back', 'hgb', 'back', 'frb'] : ['back', 'hgb']; let c, g = 0; do c = pool[Math.floor(Math.random() * pool.length)]; while (c === f.lastBk && ++g < 8); f.lastBk = c; a.bk = c; }
  return a.bk;
}
function poseOf(f) { // the 2D style mixes sprites from several games so attacks and hits don't always look the same
  if (!f.boxes.back) return 'front';
  const a = f.act, pick3 = (v, x, y, z) => [x, y, z][((v | 0) % 3 + 3) % 3];
  if (a && a.pv === undefined) a.pv = Math.floor(Math.random() * 3);
  const pv = LIFE ? (a ? a.pv : f.fam) : a && a.pv; // fronts are picked per action, backs per strike (see backPose)
  if (f.dead) return 'hurt';
  if (f.hitT > 0) return (f.pv | 0) % 2 ? 'hg' : 'atk'; // a hit shows a full-body Gen 4 front, never a cropped back or the small Gen 3 fronts
  if (a) {
    if (LIFE && a.fly && isFly(f)) return pick3(pv, 'atk', 'hg', 'fr'); // diving onto the foe
    if (a.name === 'grab') return a.ph === 1 ? pick3(pv, 'atk', 'hg', 'fr') : backPose(f, a);
    if (a.name === 'melee') return a.t < .1 || a.t > .42 ? 'front' : backPose(f, a);
    if (a.name === 'dash') return backPose(f, a);
    if (a.name === 'ranged') return pick3(pv, 'atk', 'hg', 'fr');
    if (a.name === 'beam') return a.fired ? pick3(pv, 'atk', 'hg', 'fr') : backPose(f, a);
    if (a.name === 'sp' && (a.key === 'dash' || a.key === 'spin' || a.key === 'leap' || a.key === 'combo' || (TM[a.key] && TM[a.key].rush))) return backPose(f, a);
    return f.charging ? 'back' : pick3(pv, 'atk', 'hg', 'fr');
  }
  if (f.charging) return 'back';
  if (f.z > 30 && !isFly(f)) return 'atk';
  return isFly(f) && f.boxes.fly ? 'fly' : 'front';
}
// ---------------------------------------------------------------- sprite life: spring recoil and overshoot, lean, wing hinge, colour split (?nolife=1 turns all of it off)
let LIFE = !new URLSearchParams(location.search).has('nolife');
const KV = 27.6; // spring velocity that peaks at 1 (stiffness 260, damping 14)
function kickF(f, sx, sy, rot, dx) { if (!LIFE || f.pmd) return; const k = f.kk || (f.kk = { sx: 0, sy: 0, r: 0, dx: 0, a: 0, b: 0, c: 0, d: 0 }); k.a += sx * KV; k.b += sy * KV; k.c += rot * KV; k.d += dx * KV; }
function stepKick(f, dt) { const k = f.kk, S = 260, C = 14; k.a += (-S * k.sx - C * k.a) * dt; k.sx += k.a * dt; k.b += (-S * k.sy - C * k.b) * dt; k.sy += k.b * dt; k.c += (-S * k.r - C * k.c) * dt; k.r += k.c * dt; k.d += (-S * k.dx - C * k.d) * dt; k.dx += k.d * dt; }
const CT = { r: null, c: null };
function chromaDraw(g, f) { // a red and a cyan copy slip apart for a moment on heavy hits
  const L = f.lt, d = f.gd, el = f.el; if (!L || !d) return; const sw = el.naturalWidth || el.width, sh = el.naturalHeight || el.height; if (!sw || !sh) return;
  const k = f.chromaT / .16, off = 1 + 4 * k; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .5 * k; g.imageSmoothingEnabled = false;
  for (const [key, col, sg] of [['r', '#ff2a2a', -1], ['c', '#22d4ff', 1]]) {
    const tc = CT[key] || (CT[key] = document.createElement('canvas')); if (tc.width !== sw || tc.height !== sh) { tc.width = sw; tc.height = sh; }
    const tg = tc.getContext('2d'); tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, sw, sh); tg.drawImage(el, 0, 0, sw, sh); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = col; tg.fillRect(0, 0, sw, sh);
    g.save(); g.translate(f.x + L.dx + sg * off, GROUND + laneY(f) - f.z - f.lift + L.dy); g.rotate(L.rot * Math.PI / 180); g.scale(L.sx, L.sy); g.drawImage(tc, d.x, d.y, d.w, d.h); g.restore();
  }
  g.restore();
}
function wingOn(f) { return LIFE && !lowQ && !f.pmd && f.hover && isFly(f) && !f.dead && f.hitT <= 0 && f.sleepT <= 0 && f.freezeT <= 0 && !f.under && !f.spun && !(f.act && f.act.key === 'dig'); }
function wingAdvance(f, rdt) { // wing tempo follows what the flyer is doing (folded in a dive, fast when climbing or recovering); returns the beat so the body can bob against it
  const a = f.act, busy = Math.abs(f.vx) > 40 || a; let tr, ta;
  if (a && a.fly) { tr = 0; ta = .015; } else if (f.burst > 0 || f.lsp > 120) { tr = 30; ta = .14; } else if (busy) { tr = 21; ta = .1; } else { tr = 12; ta = .09; }
  const k = Math.min(1, rdt * 14); f.wrate += (tr - f.wrate) * k; f.wamp += (ta - f.wamp) * k; f.wph += rdt * f.wrate; f.burst = Math.max(0, f.burst - rdt);
  return Math.sin(f.wph) * f.wamp;
}
function wingStep(f, bx, tf, op, cls, rdt) { // a hovering flyer is drawn through its own small canvas as 10 vertical slices: the outer ones rise and fall with the wing beat, the middle stays put
  const on = wingOn(f);
  if (!on) { if (f.wOn) { f.wOn = false; if (f.wc) f.wc.style.display = 'none'; f.el.style.visibility = ''; } return; }
  const src = f.el, sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height; if (!sw || !sh) return;
  let wc = f.wc; if (!wc) { wc = f.wc = document.createElement('canvas'); wc.className = 'fighter px wing'; wc.style.display = 'none'; src.parentNode.insertBefore(wc, src.nextSibling); }
  if (!f.wOn) { f.wOn = true; wc.style.display = ''; src.style.visibility = 'hidden'; }
  const amp = sh * f.wamp, pad = Math.ceil(sh * .14) + 1, ch = sh + pad * 2; // room above and below for the wing tips
  if (wc.width !== sw || wc.height !== ch) { wc.width = sw; wc.height = ch; }
  const s = Math.sin(f.wph), g = wc.getContext('2d'), M = 10;
  g.clearRect(0, 0, sw, ch); g.imageSmoothingEnabled = false;
  for (let j = 0; j < M; j++) { const x0 = sw * j / M, ux = Math.abs((j + .5) / M * 2 - 1), oy = -amp * s * ux ** 1.5 + amp * .2 * s * (1 - ux); g.drawImage(src, x0, 0, sw / M, sh, x0, pad + oy, sw / M + .6, sh); }
  const k = bx.h / sh, st = wc.style; if (f._wk !== k || f._wp !== pad) { f._wk = k; f._wp = pad; st.width = bx.w + 'px'; st.height = ch * k + 'px'; st.marginTop = -pad * k + 'px'; }
  st.transformOrigin = '50% ' + ((pad + sh * (f.ctrOn ? .5 : 1)) / ch * 100).toFixed(2) + '%'; st.transform = tf; st.zIndex = src.style.zIndex; st.opacity = op; const cn = cls + ' wing'; if (wc.className !== cn) wc.className = cn;
}
function renderFighter(f) {
  const feetY = GROUND + laneY(f) - f.z - f.lift, ls = 1 + f.lp * .14; let sx = 1, sy = 1, rot = 0, dy = 0, ly = 0; f.el.style.zIndex = 5 + Math.round(f.lp * 3);
  const rdt = Math.min(.05, now - (f.lastR || now)); f.lastR = now; f.vf = f.vf === undefined ? f.face : f.vf + (f.face - f.vf) * Math.min(1, rdt * 16); // the sprite swings round when its owner changes side
  const moving = Math.abs(f.vx) > 20 && f.z <= 0 && !f.act && f.hitT <= 0 && f.sleepT <= 0, a = f.act;
  if (!(f.hitT > 0 && f.hitBig)) f.lkOn = false; else if (!f.lkOn) { f.lkOn = true; f.lk = pickLk(f); if (f.hv === 1 && f.lk === 0) f.lk = 1; f.spinA = 0; f.rollA = 0; f.lyK = 0; }
  if (f.dead) { rot = -f.face * Math.min(90, f.deadT * 260); sy = .86; if (f.pmd) dy = -f.h * .42 * Math.min(1, f.deadT * 4); }
  else if (f.hitT > 0 && f.hitBig) { // knocked down: the front sprite lies flat on its back (hurt face), tumbles, or rolls like a wheel
    const air = f.z + f.lift > 10, sq = clamp((f.sqT || 0) / .14, 0, 1), lp = (u, v, k) => u + (v - u) * k;
    if (f.pmd) { rot = -f.face * (air ? 78 : 90); sx = 1.1 + .3 * sq; sy = (air ? .88 : .72) - .2 * sq; if (f.stuckT > 0) { sx = .78; sy = 1.1; } if (!air) dy = -f.h * .42; }
    else { // never lies flat: 0 skids on its heels, 1 somersaults, 2 squashes into a pancake, 3 hops with a dizzy wobble
      const lk = f.lk | 0, hr = f.hitT; f.lyK = 0;
      if (lk === 1) { ly = 1; f.spinA = f.spinA || 0; if (air) f.spinA += 760 * rdt; else f.spinA += (Math.round(f.spinA / 360) * 360 - f.spinA) * Math.min(1, rdt * 14); rot = -f.face * f.spinA; if (f.landT > 0) { const q = f.landT / .16; sx *= 1 + .25 * q; sy *= 1 - .3 * q; } }
      else if (lk === 0) { rot = -f.face * (air ? 14 : 26) * (hr > .25 ? 1 : hr / .25); sx = .97; sy = 1.03; }
      else if (lk === 2) { f.panK = (f.panK || 0) + ((air ? 0 : 1) - (f.panK || 0)) * Math.min(1, rdt * 22); const pop = hr < .22 ? 1 - hr / .22 : 0; sx = 1 + .45 * f.panK * (1 - pop) - .1 * pop; sy = 1 - .5 * f.panK * (1 - pop) + .25 * pop; }
      else { rot = air ? -f.face * clamp(f.vz / 700, -1, 1) * 30 : Math.sin(now * 13) * 6 * clamp(hr / .8, 0, 1); if (f.landT > 0) { const q = f.landT / .16; sx *= 1 + .18 * q; sy *= 1 - .2 * q; } }
      sx *= 1 + .2 * sq; if (f.stuckT > 0) { sx *= .85; sy *= 1.06; }
    }
  }
  else if (f.hitT > 0) { rot = -f.face * 12; sx = 1.08; sy = .92; }
  else if (f.sleepT > 0) { sy = .9; rot = -f.face * 8; }
  else if (f.freezeT > 0) { sy = 1; }
  else if (a && (a.name === 'melee' || (a.name === 'sp' && a.key === 'dash'))) { if (a.t < .1) { rot = -f.face * 8; sx = .94; } else if (a.t < .4) { rot = f.face * 12; sx = 1.14; sy = .94; } }
  else if (a && a.name === 'dash') { rot = a.dir * 10; sx = 1.1; sy = .94; }
  else if (a && a.name === 'ranged') { const k = Math.sin(clamp(a.t / .4, 0, 1) * Math.PI); sx = 1 + .08 * k; rot = f.face * 4 * k; }
  else if (a) { sy = 1 + Math.sin(now * 30) * .02; if (a.key === 'quake' && a.t < .3) sy = 1.1; }
  else if (f.z > 0) { sy = f.vz > 0 ? 1.08 : .96; sx = f.vz > 0 ? .94 : 1.04; }
  else if (f.landT > 0) { const k = f.landT / .16; sy = 1 - .14 * k; sx = 1 + .1 * k; }
  else if (moving) { const hop = Math.abs(Math.sin(f.walkPh)); dy = -hop * 9; sy = 1 - .03 * (1 - hop); rot = Math.sign(f.vx) * 4 * Math.sin(f.walkPh); }
  else { const lo = f.hp < f.maxhp * .25 && f.hp > 0; sy = 1 + (lo ? .045 : .018) * Math.sin(now * (lo ? 8 : 3.2) + f.side); sx = 1 - (lo ? .025 : .01) * Math.sin(now * (lo ? 8 : 3.2) + f.side); if (lo) { rot = -f.face * 3; if (LIFE) { sy *= .95; sx *= 1.03; } } else if (LIFE) rot += .57 * Math.sin(now * 1.7 + f.side * 2); }
  let dx = 0;
  if (!f.pmd && ANIM2D && !f.dead && f.sleepT <= 0 && f.freezeT <= 0) { const tw = tween2D(f, a); if (tw) { rot = tw.rot; sx = tw.sx; sy = tw.sy; dx = tw.dx; if (tw.dz) dy -= Math.min(tw.dz, f.fgL > .01 ? 20 : 99); } } // smooth anticipation, strike and recovery for the 2D sprites
  if (f.hitT > 0 && !f.hitBig && !f.dead) dx += Math.sin(now * 95) * 4 * clamp(f.hitT / .26, 0, 1); // a struck fighter shudders
  if (LIFE && !f.pmd && freeze > 0 && f.hitT > 0 && !f.dead) { dx += (Math.random() - .5) * 5; dy += (Math.random() - .5) * 3; } // and jitters through the hit stop
  let clip = '', bx, flip, tsx = 1;
  if (f.pmd) {
    if (!f.dead && !(f.hitT > 0 && f.hitBig)) { if (f.hitT <= 0) rot = 0; sx = sy = 1; dy = 0; } // the sprite sheets already animate these
    if (f.hitT > 0 && !f.hitBig && !f.dead) { const hk = f.hitT / .26; sx = 1 + .16 * hk; sy = 1 - .12 * hk; }
    const r = pmdFrame(f); bx = { w: r.cw, h: r.gyPx }; flip = Math.abs(f.vf); f.posNow = null;
    f.el.style.transformOrigin = `50% ${r.gyPx}px`; f.gd = { x: -r.cw / 2, y: -r.gyPx, w: r.cw, h: r.ch, noflip: true }; f.bw = r.cw; f.bh = r.gyPx;
  } else {
    const pose = LIFE ? poseGate(f, poseOf(f), rdt) : poseOf(f);
    if (f.anim) anim2D(f, pose, rdt);
    else if (pose !== f.curPose) { f.curPose = pose; f.el.src = f.poses[pose]; f.el.style.width = f.boxes[pose].w + 'px'; f.el.style.height = f.boxes[pose].h + 'px'; f.popT = .12; }
    bx = f.boxes[pose]; f.bw = bx.w; f.bh = bx.h; f.poseBack = POSE_ORIENT[pose] > 0; flip = f.poseBack ? f.vf : -f.vf; f.posNow = pose;
    f.gd = { x: -bx.w / 2, y: -bx.h, w: bx.w, h: bx.h, noflip: false };
    if (f.popT > 0) { const pk = Math.max(0, f.popT) / .12; f.popT -= rdt; sx *= 1 + .1 * pk; sy *= 1 - .07 * pk; }
    if (f.turn) tsx = Math.max(.07, Math.abs(1 - 2 * f.turn.t / .11)); // a change of facing squashes through the middle instead of popping
  }
  if (LIFE && f.spawnT > 0) { const sk = f.spawnT / .35; f.spawnT -= rdt; sx *= 1 + .28 * sk * sk; sy *= 1 + .28 * sk * sk; } // a pop as the fight begins
  if (f.carriedT > 0 && !f.dead) { rot += Math.sin(now * 16) * 14; sx *= .92; } // struggling in a grab
  if (a && a.fly) { rot += f.face * 16; sx *= 1.08; sy *= .94; } else if (f.flyBack) rot -= f.face * 10; // leaning into the flight
  if (f.spinT > 0 && !f.dead) { rot = f.spinDeg * f.face; dy -= f.h * .25; f.el.style.transformOrigin = '50% 50%'; f.spun = true; } else if (a && a.spinOn && !f.dead && f.hitT <= 0) { rot = a.deg * f.face; dy -= f.h * .25; f.el.style.transformOrigin = '50% 50%'; f.spun = true; } // rolling or spinning attacks turn the whole sprite like a wheel
  else if (f.spun) { f.spun = false; if (!f.pmd) f.el.style.transformOrigin = ''; }
  if (f.duck > .02 && !f.dead && f.hitT <= 0 && !a) { sy *= 1 - .32 * f.duck; sx *= 1 + .1 * f.duck; } // crouching squashes the sprite and lowers its hitbox
  if (!f.dead && f.hitT <= 0) { // lean toward the opponent when they are above or below, more while attacking and for floaters
    const to = other(f), tc = center(to), fy = GROUND + laneY(f) - f.z - f.lift - f.h * .5, atk = a && (a.name === 'ranged' || a.name === 'beam' || (a.name === 'sp' && AIM_KEYS.has(a.key)) || (isFly(f) && (a.name === 'melee' || (a.name === 'dash' && a.dir === f.face) || (a.name === 'sp' && (a.key === 'dash' || a.key === 'combo'))))), tk = atk ? .75 : isFly(f) ? .15 : 0;
    if (tk) rot += -f.face * clamp(Math.atan2(fy - tc.y, Math.max(120, Math.abs(tc.x - f.x))) * 57.3 * tk, atk ? -24 : -8, atk ? 24 : 8);
    const lv = f.z + f.lift, dl = (lv - (f.pLv === undefined ? lv : f.pLv)) / Math.max(rdt, .001); f.pLv = lv; f.pit = (f.pit || 0) + (clamp(dl / 900, -1, 1) - (f.pit || 0)) * Math.min(1, rdt * 10);
    f.lsp = dl; f.bk += (clamp(f.vx / 450, -1, 1) - f.bk) * Math.min(1, rdt * 9);
    rot += -f.face * f.pit * (isFly(f) ? 16 : 8) + Math.sin(now * (isFly(f) ? 3 : 2) + f.side * 2) * (isFly(f) ? 2.5 : 1.2); // pitch up when climbing and down when diving, plus a slow idle sway
    if (isFly(f) && !a) { const mv = Math.abs(f.vx) > 40; if (LIFE) { rot += f.bk * 9; dx += 7 * Math.sin(now * .8 + f.side * 2); dy += 4 * Math.sin(now * 1.6 + f.side); if (!wingOn(f)) dy += Math.sin(now * (mv ? 16 : 6) + f.side) * (mv ? 5 : 3); } else { rot += clamp(f.vx / 400, -1, 1) * 7; dy += Math.sin(now * (mv ? 16 : 6) + f.side) * (mv ? 5 : 3); } } // slow figure-eight drift and a smoothed bank into the direction of travel (flapping bob without the wing beat)
  }
  let skw = 0;
  if (LIFE && !f.pmd && f.kk && freeze <= 0) stepKick(f, rdt);
  if (LIFE && !f.pmd && !ly && !f.dead) {
    const k = f.kk; if (k) { sx *= 1 + k.sx; sy *= 1 + k.sy; rot += k.r; dx += k.dx; }
    if (!a) { const st = clamp((Math.abs(f.vx) - 200) / 3200, 0, .12); sx *= 1 + st; sy *= 1 - st * .5; } // stretch along the run
    if (!(a && a.spinOn)) { const vxE = f.vx + (f.hitT > 0 ? f.kvx * .5 : 0), tg = clamp(-Math.atan(vxE * .0007) * 57.3, -9, 9) - (f.hp < f.maxhp * .25 && f.hp > 0 ? f.face * 3 : 0); f.skw = (f.skw || 0) + (tg - (f.skw || 0)) * Math.min(1, rdt * 10); skw = f.skw; } // the top of the body trails behind the movement
    if (state === 'ko' && winner === f && overT > .5 && !a) { const vt = overT - .5, s = (vt / .6) % 1, j = Math.floor(vt / .6), air = s > .12 && s < .8 ? (s - .12) / .68 : -1; if (air >= 0) { dy -= 60 * 4 * air * (1 - air); sy *= 1 + .1 * Math.sin(air * Math.PI); sx *= (1 - .06 * Math.sin(air * Math.PI)) * (j === 1 ? Math.cos(air * 6.283) : 1); } else if (s < .12) { sy *= 1 - .14 * s / .12; sx *= 1 + .1 * s / .12; } } // the winner hops, and the second hop turns round
  }
  if (LIFE && !f.pmd && f.hover) { // a flyer shakes off a knockdown with a burst of wing beats, and its body bobs against the beat
    if (f.wasHit && f.hitT <= 0 && !f.dead) { f.burst = .7; kickF(f, .1, -.18, 0, 0); } f.wasHit = f.hitT > 0;
    if (wingOn(f)) dy += wingAdvance(f, rdt) * bx.h * .45;
  }
  if (ly) { const th = rot * Math.PI / 180; dy = bx.h / 2 - ((bx.w * sx / 2) * Math.abs(Math.sin(th)) + (bx.h * sy / 2) * Math.abs(Math.cos(th))) * ls; }
  if (a && a.key === 'dig' && a.phase === 0) { const k = a.sink; clip = `inset(0 0 ${k * 100}% 0)`; dy += k * f.h; }
  if (f.el.style.clipPath !== clip) f.el.style.clipPath = clip;
  { // a cropped static back steps toward the camera so its cut edge ends up below the bottom of the screen (visual only: reach, lanes and hit boxes are untouched)
    const cb = LIFE && !f.pmd && !f.dead && f.hitT <= 0 && !ly && f.z <= 8 && f.lift <= 8 ? f.posNow : null, tgt = cb === 'hgb' || cb === 'frb' ? 1 : 0;
    f.fgL = (f.fgL || 0) + (tgt - (f.fgL || 0)) * Math.min(1, rdt * 14);
    if (f.fgL > .01) { const key = f.fgPose = cb || f.fgPose, c = BACKCUT[key] && BACKCUT[key][f.id], k = f.fgL;
      if (c && c[0] && f.boxes[key]) { const ks = f.boxes[key].h / c[3], gs = 1 + .22 * k, od = k * (Math.max(0, 39 - laneY(f)) + c[1] * ks * gs + 24); dy += od; sx *= gs; sy *= gs; f.fgOff = od; f.fgGs = gs; } }
    else { f.fgOff = 0; f.fgGs = 1; }
  }
  const Lt = f.lt || (f.lt = {}); Lt.dx = dx; Lt.dy = dy; Lt.rot = rot; Lt.sx = flip * sx * ls * tsx; Lt.sy = sy * ls;
  if (!f.pmd) { // a flyer banks around the middle of its body instead of its feet
    f.ctrOn = LIFE && !ly && !f.dead && f.hitT <= 0 && !f.spun && isFly(f);
    if (f.spun) f._org = null; else { const og = f.ctrOn ? '50% 50%' : ''; if (f._org !== og) { f._org = og; f.el.style.transformOrigin = og; } }
  }
  f.el.style.transform = `translate(${f.x - camX - bx.w / 2 + dx}px,${feetY - bx.h + dy}px) rotate(${rot}deg) skewX(${skw}deg) scale(${flip * sx * ls * tsx},${sy * ls})`;
  const op = (f.under ? 0 : f.fade) * (1 - Math.max(0, -f.lp) * .1); if (f._op !== op) { f._op = op; f.el.style.opacity = op; } // the far lane is a little fainter
  const cl = ['fighter']; if (f.pmd || spriteStyle === 'bw') cl.push('px'); if (f.flash > 0 || shockFlash(f)) cl.push('flash'); if (f.guarding) cl.push('guard'); if (f.freezeT > 0) cl.push('frozen'); if (f.poisonT > 0) cl.push('poison'); if (f.shiny) cl.push('form'); if (f.dead && f.deadT > .8) cl.push('down');
  const name = cl.join(' '); if (f.el.className !== name) f.el.className = name;
  wingStep(f, bx, f.el.style.transform, op, name, rdt);
}
const hudEl = {}, hE = id => hudEl[id] || (hudEl[id] = $(id));
const sw = (id, v) => { const e = hE(id); if (e._w !== v) { e._w = v; e.style.width = v; } }; // HUD writes only touch the page when the value changed
const stx = (id, v) => { const e = hE(id); if (e._t !== v) { e._t = v; e.textContent = v; } };
const pct = v => (Math.round(v * 2) / 2) + '%'; // half-percent steps: the bars only touch the page when they move a visible amount
function hud() {
  const M = meF();
  sw('hpA', pct(P.hp / P.maxhp * 100)); sw('hpB', pct(E.hp / E.maxhp * 100));
  for (const [f, id] of [[P, 'A'], [E, 'B']]) { f.hpTrail = f.hp > f.hpTrail ? f.hp : Math.max(f.hp, f.hpTrail - (f.maxhp * .05 + (f.hpTrail - f.hp) * 1.6) * hudDt); sw('hp' + id + 't', pct(f.hpTrail / f.maxhp * 100)); }
  stx('hpAn', `${Math.ceil(P.hp)}/${Math.round(P.maxhp)}`); stx('hpBn', `${Math.ceil(E.hp)}/${Math.round(E.maxhp)}`);
  stx('kiA', Math.round(P.ki) + '%'); stx('kiB', Math.round(E.ki) + '%');
  sw('kibA', pct(P.ki)); sw('kibB', pct(E.ki));
  sw('staA', pct(P.sta)); sw('staB', pct(E.sta));
  for (const [f, id] of [[P, 'A'], [E, 'B']]) { const imm = f.shockImm > 0 && f.shockT <= 0, v = f.shockT > 0 ? 100 : imm ? clamp(f.shockImm / SHK_IMM, 0, 1) * 100 : (f.shock || 0); sw('shk' + id, pct(v)); const e = hE('shk' + id), c = f.shockT > 0 ? 'on' : imm ? 'imm' : ''; if (e._c !== c) { e._c = c; e.className = c; } }
  for (const [f, id] of [[P, 'A'], [E, 'B']]) { stx('sp' + id, Math.round(f.sta) + '%'); const e = hE('sp' + id), cl = 'spct' + (f.sta < 25 ? ' lo' : f.sta < 50 ? ' mid' : ''); if (e.className !== cl) e.className = cl; // stamina badge colour and the banked-level pips
    if (f._lv !== f.stored) { f._lv = f.stored; [...hE('lv' + id).children].forEach((p, k) => p.classList.toggle('on', k < f.stored)); } }
  $('staA').parentNode.classList.toggle('warn', P.warnT > 0); $('staB').parentNode.classList.toggle('warn', E.warnT > 0);
  for (const k in btnCost) { const [kind, c] = btnCost[k]; btnEl[k] && btnEl[k].classList.toggle('dim', (kind === 'ki' ? M.ki : staEff(M)) < c || (k === 'beam' && staEff(M) < M.kit.beam.sta)); }
  stx('timer', practice ? '∞' : String(Math.max(0, Math.ceil(matchTime))));
  if (practice) { inputLog = inputLog.filter(x => now - x.t < 3).slice(-9); $('inlog').innerHTML = inputLog.map(x => `<b>${INLABEL[x.k] || x.k}</b>`).join(''); }
  const sp = M.specs, cdv = { leaf: M.cool.ranged / M.kit.ranged.cool, vine: sp[0] ? M.cool.s0 / ARCH[sp[0].key].cool : 0, special2: sp[1] ? M.cool.s1 / ARCH[sp[1].key].cool : 0, special3: sp[2] ? M.cool.s2 / ARCH[sp[2].key].cool : 0, dash: M.dashCool / .6, beam: M.cool.beam / 7 };
  for (const k in cdv) { const v = Math.round(clamp(cdv[k], 0, 1) * 25) * 4; if (btnEl[k] && btnEl[k]._cd !== v) { btnEl[k]._cd = v; btnEl[k].style.setProperty('--cd', v); } }
  const cdsec = { leaf: M.cool.ranged, vine: M.cool.s0, special2: M.cool.s1, special3: M.cool.s2, dash: M.dashCool, beam: M.cool.beam };
  for (const k in cdsec) { const s = cdsec[k] > .05 ? cdsec[k].toFixed(1) : ''; if (btnEl[k] && btnEl[k]._cs !== s) { btnEl[k]._cs = s; btnEl[k].dataset.cd = s; } }
  if (btnEl.beam) btnEl.beam.classList.toggle('rdy', M.ki >= 50 && staEff(M) >= M.kit.beam.sta && !M.dead);
  for (const [f, id] of [[P, 'A'], [E, 'B']]) { // pulse the bars when the beam is ready or stamina is nearly out
    $('ki' + id).classList.toggle('rdy', f.ki >= 50); $('hp' + id).parentNode.classList.toggle('lowhp', f.hp < f.maxhp * .25 && !f.dead); $('kib' + id).parentNode.classList.toggle('rdy', f.ki >= 50); $('sta' + id).parentNode.classList.toggle('low', f.sta < 20);
    const el = $('cb' + id), on = f.cbN >= 2 && now - f.cbT < 1.3 && state !== 'over'; // combo counter
    if (on) { if (f.cbKey !== f.cbN) { f.cbKey = f.cbN; el.innerHTML = `<b>${f.cbN}</b><i>HITS</i><span>${Math.round(f.cbD)} DMG  ${f.cbN >= 8 ? 'UNREAL!' : f.cbN >= 6 ? 'BRUTAL!' : f.cbN >= 4 ? 'GREAT!' : 'NICE'}</span>`; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } } else f.cbKey = 0;
    el.classList.toggle('on', on);
  }
  const lo = M.hp / M.maxhp, vg = !M.dead && lo < .28 && state !== 'over' ? ((.45 + .3 * Math.sin(now * 5)) * (1 - lo / .28 * .45)).toFixed(2) : '0'; if (hE('vig')._o !== vg) { hE('vig')._o = vg; $('vig').style.opacity = vg; } // red edges when you are nearly down; only written when it changes
  for (const [f, id] of [[P, 'A'], [E, 'B']]) { // status chips under the name
    const s = f.dead ? [] : STATUS_CHIPS.filter(x => f[x[0]] > 0), key = s.map(x => x[1]).join();
    if (f.stKey !== key) { f.stKey = key; $('st' + id).innerHTML = s.map(x => `<b style="--c:${x[2]}">${ico(x[1])}</b>`).join(''); }
  }
}
const STATUS_CHIPS = [['sleepT', 'sleep', '#9b6cff'], ['freezeT', 'snowflake', '#4fc3f7'], ['poisonT', 'skull-crossbones', '#a030d0'], ['slowT', 'flash-alert', '#d9a800'], ['debT', 'arrow-down-bold-circle', '#c070ff'], ['buffT', 'battery-charging', '#ff9d1a'], ['shieldT', 'shield', '#3a9bff'], ['burnT', 'fire', '#ff6a1a'], ['confT', 'dice-5', '#e65ce6'], ['abilOn', 'creation', '#ffd34d']];
let msgTimer = 0, hudDt = .016;
function showMsg(t, ms) { const m = $('msg'); m.textContent = t; m.classList.add('on'); clearTimeout(msgTimer); if (ms) msgTimer = setTimeout(() => m.classList.remove('on'), ms); }

// ---------------------------------------------------------------- special-attack cut-in: the attacker zooms in over type-coloured speed lines and aura rings
const TYPE_SHAKE = { ground: 26, rock: 24, fighting: 20, fire: 18, electric: 20, dragon: 22, water: 14, ice: 14, psychic: 16, ghost: 12, poison: 12, grass: 12, bug: 10, flying: 14, normal: 14, dark: 16, steel: 20, fairy: 12 };
const cg = $('cineCv').getContext('2d'), cineImg = $('cineImg'), rgbOf = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)).join(',');
function startCine(f, ty, name) {
  if (cine || state !== 'fight') return;
  const cols = colsOf(ty); cine = { f, ty, cols, t: 0, dur: .62 };
  const pm = f.pmd; cineImg.style.display = pm ? 'none' : ''; $('cinePm').style.display = pm ? 'block' : 'none';
  if (pm) { const I = pm.info.Idle || pm.info.Walk; cine.pm = { s: clamp(f.h * 1.5, 200, 300) / Math.max(8, I.bb ? I.bb[3] - I.bb[1] : I.h) }; }
  else { cineImg.src = f.poses.back || f.poses.front; cineImg.style.height = clamp(f.h * 1.7, 200, 320) + 'px'; }
  cineImg.style.imageRendering = spriteStyle === 'bw' ? 'pixelated' : 'auto';
  cineImg.style.filter = 'drop-shadow(0 0 14px rgba(255,255,255,.7))' + (f.shiny ? ' hue-rotate(-40deg) saturate(1.7) brightness(1.15)' : ''); $('cinePm').style.filter = cineImg.style.filter;
  const tx = $('cineTxt'); tx.textContent = name.toUpperCase() + '!'; tx.style.color = cols[0]; tx.style.textShadow = `4px 4px 0 #000, 0 0 24px ${cols[1]}`;
  $('cine').classList.add('on');
}
function endCine() { const c = cine; cine = null; $('cine').classList.remove('on'); shake = Math.max(shake, TYPE_SHAKE[c.ty] || 12); flashCol = rgbOf(c.cols[1]); flashT = .12; }
function cineParticles(g, ty, cols) {
  const W = CW, H = CH, t = now; g.fillStyle = cols[0]; g.strokeStyle = cols[0];
  if (ty === 'fire' || ty === 'dragon') for (let i = 0; i < 34; i++) g.fillRect((i * 97 + Math.sin(t * 3 + i) * 30) % W, H - ((t * 220 + i * 59) % (H + 40)), 5, 5 + i % 4 * 3);
  else if (ty === 'water' || ty === 'ice' || ty === 'poison') for (let i = 0; i < 26; i++) { const x = (i * 131 + Math.sin(t * 2 + i) * 40) % W, y = ty === 'ice' ? (t * 120 + i * 71) % H : H - ((t * 150 + i * 71) % H); g.beginPath(); g.arc(x, y, 3 + i % 4 * 2, 0, 6.283); if (ty === 'ice') g.fill(); else g.stroke(); }
  else if (ty === 'electric') { g.lineWidth = 3; for (let i = 0; i < 5; i++) { g.beginPath(); let x = rnd(0, W), y = 0; g.moveTo(x, y); while (y < H) { x += rnd(-40, 40); y += rnd(40, 80); g.lineTo(x, y); } g.stroke(); } }
  else if (ty === 'grass' || ty === 'bug') for (let i = 0; i < 18; i++) { g.beginPath(); g.ellipse((t * 260 + i * 97) % W, (i * 61 + Math.sin(t * 5 + i) * 50 + H) % H, 12, 5, t * 4 + i, 0, 6.283); g.fill(); }
  else if (ty === 'psychic' || ty === 'ghost') { g.lineWidth = 3; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(480, 250, 150 + i * 55, 40 + i * 14, t * (i % 2 ? 1 : -1) + i, 0, 6.283); g.stroke(); } }
  else if (ty === 'ground' || ty === 'rock' || ty === 'fighting') for (let i = 0; i < 22; i++) { const s = 8 + i % 3 * 4; g.fillRect((i * 83) % W, H - ((t * 260 + i * 67) % (H - 60)), s, s); }
  else for (let i = 0; i < 24; i++) g.fillRect((i * 89 + t * 160) % W, (i * 53 + Math.sin(t * 6 + i) * 20 + H) % H, 4, 4);
}
function drawCine() {
  const W = CW, H = CH;
  const c = cine, k = c.t / c.dur, g = cg, dir = c.f.face, cx = dir > 0 ? 310 : 650, a = Math.min(1, c.t / .1) * (k > .82 ? (1 - k) / .18 : 1);
  g.clearRect(0, 0, W, H); g.save(); g.globalAlpha = a;
  const gr = g.createRadialGradient(cx, 240, 30, cx, 240, 640); gr.addColorStop(0, c.cols[1] + '66'); gr.addColorStop(1, 'rgba(4,4,14,.88)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.4)';
  for (let i = 0; i < 28; i++) { const len = 140 + (i * 53) % 420; g.fillRect((((now * 1500 * dir + i * 233) % (W + len)) + W + len) % (W + len) - len, (i * 47 + 13) % H, len, 1 + i % 3); }
  g.strokeStyle = c.cols[0]; g.lineWidth = 5;
  for (let i = 0; i < 3; i++) { const p = (k * 1.4 + i * .33) % 1; g.globalAlpha = a * (1 - p); g.beginPath(); g.arc(cx, 250, 110 + p * 260, 0, 6.283); g.stroke(); }
  g.globalAlpha = a; cineParticles(g, c.ty, c.cols); g.restore();
  const zoom = .8 + .35 * easeOut(k * 1.6), sh = (1 - k) * 5;
  if (c.pm) {
    const f = c.f, I = f.pmd.info, n = I.Charge ? 'Charge' : I.Shoot ? 'Shoot' : I.Attack ? 'Attack' : I.Idle ? 'Idle' : 'Walk', inf = I[n], idx = frameLoop(inf.d, now * 1.3), cv = $('cinePm');
    if (cv.width !== inf.w || cv.height !== inf.h) { cv.width = inf.w; cv.height = inf.h; }
    const x = cv.getContext('2d'); x.clearRect(0, 0, inf.w, inf.h); x.drawImage(f.pmd.imgs[n], idx * inf.w, (dir > 0 ? 1 : 0) * inf.h, inf.w, inf.h, 0, 0, inf.w, inf.h);
    cv.style.width = inf.w * c.pm.s + 'px'; cv.style.height = inf.h * c.pm.s + 'px'; cv.style.opacity = a; cv.style.left = cx + 'px'; cv.style.top = '250px';
    cv.style.transform = `translate(-50%,-50%) translate(${rnd(-sh, sh)}px,${rnd(-sh, sh)}px) scale(${zoom})`;
  } else {
    cineImg.style.opacity = a; cineImg.style.left = cx + 'px'; cineImg.style.top = '250px';
    cineImg.style.transform = `translate(-50%,-50%) translate(${rnd(-sh, sh)}px,${rnd(-sh, sh)}px) scale(${(c.f.poses.back ? dir : -dir) * zoom},${zoom})`;
  }
  $('cineTxt').style.opacity = a; $('cineTxt').style.transform = `skewX(-10deg) scale(${1 + .12 * (1 - easeOut(k * 3))})`;
}

// ---------------------------------------------------------------- loop
function frame(ts) {
  const idle = !NETG.on && (state === 'menu' || state === 'over' || state === 'pause'), capMs = idle ? 100 : fpsCap === 30 ? 1000 / 30 : fpsCap === 60 ? 1000 / 60 : 0; // menus and the pause screen show a frozen picture: no need to redraw it
  if (capMs && ts - lastRun < capMs - 2) { requestAnimationFrame(frame); return; }
  lastRun = ts; const raw = ts - last; last = ts;
  if (idle) { if (SPV) SPV.stopAll(); if (NETG.on) NETG.frame(raw, step); requestAnimationFrame(frame); return; }
  if (NETG.on) { NETG.frame(raw, step); if (SPV) { SPV.tick(); if (state !== 'fight') SPV.stopAll(); } if (cine) drawCine(); draw(); requestAnimationFrame(frame); return; }
  const rdt = Math.max(0, Math.min(fpsCap === 30 ? .06 : .033, raw / 1000 || 0)); now = ts / 1000;
  if (state === 'fight' && raw > 0) { fAvg += (Math.min(raw, 60) - fAvg) * .03; if (!lowQ && ++fCnt > 150 && fAvg > (fpsCap === 30 ? 44 : 26)) { lowQ = true; bgDirty = true; } } // slow device: drop the optional effects
  step(rdt);
  if (SPV) { SPV.tick(); if (state !== 'fight') SPV.stopAll(); }
  draw();
  requestAnimationFrame(frame);
}
function step(rdt) { // one slice of game time; online it runs at a fixed rate on both devices
  const dt = slowT > 0 ? rdt * .35 : rdt; slowT = Math.max(0, slowT - rdt); hudDt = rdt;
  shake *= Math.pow(.004, dt);
  if (state === 'pause') { /* frozen */ }
  else if (cine) { cine.t += dt; if (!NETG.on) drawCine(); if (cine.t >= cine.dur) endCine(); }
  else if (state === 'intro') {
    introT += dt; if (vsWait && introT > -.05) introT = -.05; $('vsSplash').classList.toggle('on', introT < 0); $('vsSplash').classList.toggle('out', introT < 0 && introT > -.25 && !vsWait);
    if (introT < 0) vsTick(dt); else vsClear();
    if (introT < 0) { /* versus splash */ } else if (introT < .9) showMsg(rounds.n > 1 ? 'ROUND ' + rounds.n : 'READY?', 0); else if (introT < 1.9) { if (!$('msg').textContent.startsWith('FIGHT')) { showMsg('FIGHT!', 0); sfx('go'); } } else { $('msg').classList.remove('on'); state = 'fight'; P.sta = E.sta = 20; fightStart(); }
    updateFighter(P, E, {}, dt); updateFighter(E, P, {}, dt); separate(P, E);
  } else if (state === 'fight' || state === 'ko') {
    tauntTick();
    if (freeze > 0) freeze -= dt;
    else {
      if (state === 'fight') {
        matchTime -= dt; if (practice) { matchTime = 99; if (E.hp < E.maxhp * .3) E.hp = E.maxhp; if (P.hp < P.maxhp * .3) P.hp = P.maxhp; }
        if (lab) { P.sta = 100; P.ki = 100; P.staDelay = 0; } // practise moves: infinite stamina and ki
        if (!lab) { aiBeamAnswer(E, P); if (demo) aiBeamAnswer(P, E); }
        const iP = NETG.on ? NETG.inP : demo ? aiInput(P, E, dt) : playerInput(), iE = NETG.on ? NETG.inE : aiInput(E, P, dt);
        if (NETG.on) { P.tapIn = !!iP.tap; E.tapIn = !!iE.tap; }
        updateFighter(P, E, iP, dt);
        updateFighter(E, P, iE, dt);
        if (lab) labGhost(dt); else separate(P, E);
        if (matchTime <= 0 && state === 'fight') { winner = P.hp / P.maxhp >= E.hp / E.maxhp ? P : E; state = 'ko'; showMsg('TIME UP', 1800); overT = 0; }
      } else { updateFighter(P, E, {}, dt); updateFighter(E, P, {}, dt); overT += dt; if (overT > 2.2) roundOver(); }
      updateWorld(dt);
    }
  }
}
function endMatch() { VAR.matchEnd();
  state = 'over'; const me = meF(), win = winner === me; jingle(win);
  $('winImg').src = spriteUrl(winner.p); $('over').classList.toggle('lose', !win && !demo);
  $('winStars').innerHTML = Array.from({ length: 26 }, (_, i) => { const a = i / 26 * 6.283, r = 70 + (i % 3) * 22; return `<i style="left:${95 + Math.cos(a) * r}px;top:${95 + Math.sin(a) * r}px;animation-delay:${(i * .09).toFixed(2)}s;--s:${(.6 + (i % 4) * .22).toFixed(2)}"></i>`; }).join('');
  $('overT').textContent = demo ? nm(winner.p.name).toUpperCase() + ' WINS' : win ? 'YOU WIN!' : 'YOU LOSE'; $('overT').style.color = win || demo ? '#ffd34d' : '#ff6a6a';
  $('overS').textContent = demo ? `${nm(P.p.name)} vs ${nm(E.p.name)}.` + (bestOf > 1 ? ` Rounds ${rounds.a}-${rounds.b}.` : '') : (win ? `${nm(me.p.name)} beat ${nm(other(me).p.name)}${NETG.on ? '.' : ' on ' + selDiff + '.'}` : NETG.on ? `${nm(other(me).p.name)} won this time.` : `${nm(E.p.name)} was too strong this time.`) + (bestOf > 1 ? ` Rounds ${rounds.a}-${rounds.b}.` : '');
  const ratio = stats.dealt / Math.max(1, stats.taken), grade = win ? (ratio >= 3 ? 'S' : ratio >= 1.8 ? 'A' : 'B') : (ratio >= .8 ? 'C' : 'D');
  const pts = win && !practice && !demo && !NETG.on ? Math.round(({ Easy: 20, Normal: 40, Hard: 80 }[selDiff] || 40) * (bestOf > 1 ? 1.5 : 1)) : 0; // points for the app's ball shop
  if (pts) { try { if (window.PF && window.PF.award) window.PF.award(pts); } catch (e) { } }
  $('ostats').innerHTML = [['DAMAGE', stats.dealt], ['TAKEN', stats.taken], ['BEST COMBO', stats.combo], ['PARRIES', stats.parry]].map(([l, v]) => `<div class="os"><b>${Math.round(v)}</b><small>${l}</small></div>`).join('') + `<div class="os rate"><b>${grade}</b><small>RATING</small></div>` + (pts ? `<div class="os" style="border-color:#ffd34d"><b style="color:#ffd34d">+${pts}</b><small>POINTS</small></div>` : '');
  if (tourOn) tourEnd(win); else { $('againBtn').textContent = demo ? 'WATCH AGAIN' : 'REMATCH'; $('menuBtn').style.display = ''; }
  $('over').classList.add('on');
}

// ---------------------------------------------------------------- input and menus
addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  if (e.repeat) return; audio(); keys[k] = true;
  if (k === 'w' || k === 'arrowup' || k === ' ') pulse.up = true; if (k === 'j') pulse.melee = true; if (k === 'k') pulse.ranged = true; if (k === 'l') pulse.special = true; if (k === 'o') pulse.special2 = true; if (k === 'n') pulse.special3 = true; if (k === 'i') pulse.beam = true;
  if (k === 'shift') pulse.dash = true; if (k === 'g') pulse.grab = true; if (k === 'q') pulse.laneBack = true; if (k === 'e') pulse.laneFront = true;
  if (['a', 'd', 'arrowleft', 'arrowright'].includes(k)) { if (now - (lastTap[k] || -9) < .25) pulse.dash = true; lastTap[k] = now; }
  if (k === 'p' || k === 'escape') togglePause();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
const lastTap = {}, btnEl = {};
document.querySelectorAll('.btn').forEach(b => {
  const k = b.dataset.k, map = { tackle: 'melee', leaf: 'ranged', vine: 'special', special2: 'special2', special3: 'special3', beam: 'beam', up: 'up', dash: 'dash', grab: 'grab', laneBack: 'laneBack', laneFront: 'laneFront' }; btnEl[k] = b;
  b.addEventListener('pointerdown', e => { e.preventDefault(); audio(); b.classList.add('on'); if (map[k]) { pulse[map[k]] = true; if (k !== 'up' && k !== 'laneBack' && k !== 'laneFront') buzz(6); } else held[k] = true; b.setPointerCapture(e.pointerId); });
  const up = () => { b.classList.remove('on'); held[k] = false; };
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
});
(() => {
  const j = $('joy'), s = $('stick');
  const move = e => {
    const r = j.getBoundingClientRect(), sc = r.width / 160, dx = (e.clientX - (r.left + r.width / 2)) / sc, dy = (e.clientY - (r.top + r.height / 2)) / sc, m = Math.hypot(dx, dy) || 1, k = Math.min(1, 48 / m);
    s.style.left = 48 + dx * k + 'px'; s.style.top = 48 + dy * k + 'px';
    joy.l = dx < -18; joy.r = dx > 18; joy.d = dy > 36; if (dy < -36 && !joy.up) pulse.up = true; joy.up = dy < -36;
  };
  j.addEventListener('pointerdown', e => { e.preventDefault(); audio(); j.setPointerCapture(e.pointerId); move(e); });
  j.addEventListener('pointermove', e => { if (e.buttons || e.pressure > 0) move(e); });
  const end = () => { joy.l = joy.r = joy.d = joy.up = false; s.style.left = '48px'; s.style.top = '48px'; };
  j.addEventListener('pointerup', end); j.addEventListener('pointercancel', end);
})();

const tags = types => types.map(t => `<span class="tag" style="background:${TYPE_HEX[t] || '#777'}">${t.toUpperCase()}</span>`).join('');
function matchup(you, rival) {
  const off = Math.max(...you.types.map(t => effect(t, rival.types))), def = Math.max(...rival.types.map(t => effect(t, you.types)));
  const lab = m => m >= 2 ? `<b style="color:#ff7a3a">x${m}</b>` : m < 1 ? `<b style="color:#9fb4c8">x${m}</b>` : '<b>x1</b>';
  const verdict = def >= 2 && off < 2 ? '<br><b style="color:#ff6a6a">HARD FIGHT</b>' : off >= 2 && def < 2 ? '<br><b style="color:#37e06a">EASY FIGHT</b>' : '';
  return `Your hits ${lab(off)} · Their hits ${lab(def)}${verdict}`;
}
const STAT_COL = { hp: '#5fe07a', atk: '#ff8a4a', spa: '#6aa8ff', spe: '#ffd34d' };
const DESC = { strike: 'Lightning from the sky', blast: 'Exploding fireball', dig: 'Tunnel under, burst out', quake: 'Ground-shaking stomp', teleport: 'Vanish and strike', dash: 'Fast charging hit', wave: 'Big crashing wave', rain: 'Rocks or ice fall from above', blizzard: 'Freezing storm', ring: 'Trapping vortex', tornado: 'Knock-up gust', sleep: 'Spores: foe sleeps 3 s', poison: 'Spores: poison over time', para: 'Spores: paralyzes', selfdestruct: 'Huge blast, costs life', heal: 'Restores HP', buff: 'Power up for 10s', vine: 'Long whip lash', geyser: 'Eruptions toward the foe', cannon: 'Heavy slow shot', slash: 'Crescent blades', volley: 'Fan of homing shots', swoop: 'Fly up, dive down', combo: 'Rush and hit 4 times', leap: 'Jump and slam', minibeam: 'Short beam', drain: 'Steals HP', debuff: 'Weakens the foe', shield: 'Halves damage taken', counter: 'Reflects the next hit', metronome: 'A random move', spin: 'Roll through the foe', whirl: 'Spin and shred nearby', boulder: 'Bowling-ball boulder', roots: 'Roots tangle and slow', spikes: 'Line of erupting spikes', bloom: 'Spin leap, leaf fan' };
// ---------------------------------------------------------------- type moves: 126 scripted specials (7 per type). The pixel-art visuals live in data/typefx.js; the rules are scripted here.
// Times are in "mockup seconds" (the timeline of the artwork) and are scaled by ts; hits land where the foe stood when the move started unless {live:1}.
const TM = {}, TM_BY_TYPE = {}; let tfx = [], tzones = [], weatherBase = null, wxClock = 0;
const slugOf = s => s.toLowerCase().replace(/[^a-z]/g, '');
function T(type, name, desc, o) {
  const key = slugOf(name), c = { key, name, type, desc, ts: 1.35, h: [], ...o }; TM[key] = c; (TM_BY_TYPE[type] = TM_BY_TYPE[type] || []).push(key);
  STA[key] = c.sta; BASE_SCORE[key] = c.score || 5; ARCH_ICON[key] = TYPE_ICON[type] || 'star-four-points'; DESC[key] = desc; ANIM_OF[key] = [c.anim || 'Attack'];
  if (c.pow) POWER_KEYS.add(key);
  ARCH[key] = { cost: c.c, cool: c.cd, range: c.r || [150, 650], dur: c.d / c.ts + .3, when: c.when, start(f, foe, a) { tmStart(f, foe, a, c); }, tick(f, foe, a, dt) { tmTick(f, foe, a, dt, c); } };
}
const rep = (n, t0, dt, dmg, r, kb, o, last) => Array.from({ length: n }, (_, i) => [t0 + i * dt, i === n - 1 && last ? last : dmg, r, kb, i === n - 1 && last ? 1 : 0, 0, 1, o || {}]);
const L1 = { live: 1 };
function setWeather(id, dur) {
  weather = { id, ...WEATHER[id], until: dur ? wxClock + dur : 0 }; const el = $('wx');
  el.innerHTML = ico(weather.icon) + weather.name + `<small>${weather.up.map(t => t.toUpperCase()).join('/')} +20%</small>`; el.style.setProperty('--c', weather.col); el.classList.add('on'); sfx('charge');
}
const inWin = (w, t) => w.some(([a, b]) => t >= a && t < b);
function tmStart(f, foe, a, c) {
  const S = clamp(f.h / 62, 1.4, 3), tc = center(foe), lift = f.z + f.lift;
  a.c = c; a.S = S; a.x0 = f.x; a.gy = GROUND + laneY(f); a.tx = foe.x + (a.miss ? (Math.random() < .5 ? -1 : 1) * rnd(230, 300) : 0); a.ty = tc.y; a.done = {};
  const nv = typeof TFX !== 'undefined' && TFX.vars ? TFX.vars(c.key) : 0; let v = 0; // each cast shows the original look or one of its variations, never the same one twice in a row
  if (nv) { const lv = f.lastV = f.lastV || {}, opts = []; for (let k = 0; k <= nv; k++) if (k !== lv[c.key]) opts.push(k); v = window.__forceVar !== undefined ? Math.min(nv, window.__forceVar) : opts[Math.floor(Math.random() * opts.length)]; lv[c.key] = v; }
  a.v = v; a.vk = v ? TFX.varKey(c.key, v) : ''; a.to = c.h.length ? c.h[0][0] : 0;
  const inst = { c, f, age: 0, x0: f.x, gy: a.gy, lift, S, dir: f.face, tx: a.tx, ty: tc.y, end: 2.7 / c.ts + (c.hold || 0), v, to: a.to, miss: !!a.miss }; tfx.push(inst);
  if (c.z) for (const [from, to, r, dmg, st, p, ev] of c.z) tzones.push({ owner: f, x: p === 'G' ? 0 : lerp(f.x, a.tx, p === undefined ? 1 : p), glob: p === 'G', r, dmg, st, age: 0, from: from / c.ts, to: to / c.ts, every: ev || .5, acc: 0, ty: c.type });
  sfx(c.sfx || 'charge');
}
function tmHit(f, foe, a, c, h) {
  const [, dmg, r, kb, big, st, p = 1, o = {}] = h; if (foe.dead) return;
  const tc = center(foe); let x, y;
  if (o.self) { x = f.x; y = center(f).y; }
  else if (o.live) { if (a.miss) { if (!a.said) { a.said = 1; floatText(tc.x, tc.y - 30, 'MISS', '#ddd'); } return; } x = tc.x; y = tc.y; }
  else { x = lerp(a.x0, a.tx, p); y = p >= 1 ? a.ty : GROUND - 50; }
  if (o.unb) f.unblockable = true;
  const ok = dmg > 0 ? aoe(f, x, y, r, D(f, dmg), kb, !!big, null, c.type) : circleRect(x, y, r, body(foe)) && Math.abs(f.lp - foe.lp) <= 1.2;
  f.unblockable = false; if (!ok) return;
  if (st && Math.random() < (o.sc === undefined ? 1 : o.sc)) applyStatus(foe, st === 'rand' ? ['burn', 'slow', 'freeze'][Math.floor(Math.random() * 3)] : st, true, f);
  if (o.leech) { const g = Math.round(D(f, dmg) * o.leech * .78); f.hp = Math.min(f.maxhp, f.hp + g); floatText(f.x, GROUND - f.z - f.lift - f.h - 10, '+' + g, '#7dff9a', 22); }
  if (o.launch) { foe.vz = o.launch; foe.hitT = Math.max(foe.hitT, .6); foe.hitBig = true; }
  if (o.slam) { foe.vz = o.slam; foe.smash = true; }
  if (o.trip) { foe.hitT = Math.max(foe.hitT, .8); foe.hitBig = true; }
  if (o.debuff) { foe.debT = o.debuff; floatText(foe.x, GROUND - foe.z - foe.lift - foe.h - 8, 'ACCURACY DOWN', '#d8b868', 20); }
  if (big) shake = Math.max(shake, 10);
}
// variations that really move the foe (mockup px from the variation's own script) or add a status
const TW_ON = { 'water|Water Tornado': m => m.dy < -.5, 'bug|Silk Snare': m => Math.abs(m.dx) > .3, 'water|Bowling Ball': m => Math.abs(m.dx) > .3 || m.dy < -.5 };
function twistVar(f, foe, a, c, t) {
  if (a.miss || foe.dead || t < a.to - .02) return;
  if (a.vk === 'psychic|Mirage Swarm') { if (!a.cd) { a.cd = 1; if (Math.random() < .8) applyStatus(foe, 'confuse', false, f); } return; }
  const on = TW_ON[a.vk]; if (!on) return; const m = TFX.foeMove(c.key, a.v, t, a.to); if (!m || !on(m)) return;
  const dir = Math.sign(foe.x - f.x) || f.face; if (a.tbx === undefined) a.tbx = foe.x - dir * m.dx * a.S;
  let nx = a.tbx + dir * m.dx * a.S; if (a.vk === 'bug|Silk Snare') nx = dir > 0 ? Math.max(nx, f.x + f.w * .5 + foe.w * .5 + 12) : Math.min(nx, f.x - f.w * .5 - foe.w * .5 - 12);
  foe.x = clamp(nx, WALL_L, WALL_R); foe.vx = 0; foe.kvx = 0; foe.hitT = Math.max(foe.hitT, .12); foe.carriedT = .15; foe.act = null; foe.charging = false;
  const lift = Math.max(0, -m.dy) * a.S; if (lift > 0 || foe.z > 0) { foe.z = lift; foe.vz = 0; }
}
function tmSelf(f, c, [, kind, v, v2]) {
  const top = GROUND - f.z - f.lift - f.h - 10;
  if (kind === 'heal') { const g = Math.round(f.maxhp * v); f.hp = Math.min(f.maxhp, f.hp + g); floatText(f.x, top, '+' + g, '#7dff9a', 26); sfx('heal'); }
  else if (kind === 'buff') { f.buffT = Math.max(f.buffT, v); floatText(f.x, top, 'POWER UP', '#ffb347', 24); sfx('heal'); }
  else if (kind === 'shield') { f.shieldT = Math.max(f.shieldT, v); floatText(f.x, top, 'SHIELD!', colsOf(c.type)[1], 24); sfx('heal'); }
  else if (kind === 'counter') { f.counterT = v; floatText(f.x, top, 'READY', '#ffd34d', 24); sfx('charge'); }
  else if (kind === 'cure') f.sleepT = f.poisonT = f.burnT = f.confT = f.slowT = f.freezeT = 0;
  else if (kind === 'wx') setWeather(v, v2);
}
function tmTick(f, foe, a, dt, c) {
  const t = a.t * c.ts; f.charging = !!(c.ch && t < c.ch);
  let vx = 0, moved = false; const stop = f.w * .3 + foe.w * .3 + 24;
  if (c.rush) for (const [t0, t1, spd] of c.rush) if (t >= t0 && t < t1) { if (Math.abs(foe.x - f.x) > stop) vx = Math.sign(foe.x - f.x) * spd; f.face = Math.sign(foe.x - f.x) || f.face; if (!c.hide) { ghost(f); f.inv = Math.max(f.inv, .06); } moved = true; }
  if (!moved && c.back) for (const [t0, t1, spd] of c.back) if (t >= t0 && t < t1 && Math.abs(a.x0 - f.x) > 30) { vx = Math.sign(a.x0 - f.x) * spd; if (!c.hide) ghost(f); }
  f.vx = vx;
  if (c.hide) { const h = inWin(c.hide, t); f.fade = h ? 0 : 1; if (h) f.inv = Math.max(f.inv, .1); }
  if (c.tp && !a.tped && t >= c.tp) { a.tped = 1; const s = Math.sign(foe.x - f.x) || f.face; f.x = clamp(foe.x + s * (foe.w * .5 + f.w * .5 + 20), WALL_L, WALL_R); f.face = -s; f.vx = 0; puff(f.x, GROUND, 8, 'rgba(60,30,90,.7)', 120); }
  for (let i = 0; i < c.h.length; i++) if (!a.done[i] && t >= c.h[i][0]) { a.done[i] = 1; tmHit(f, foe, a, c, c.h[i]); }
  if (a.vk) twistVar(f, foe, a, c, t);
  if (c.self) for (let i = 0; i < c.self.length; i++) if (!a.done['s' + i] && t >= c.self[i][0]) { a.done['s' + i] = 1; tmSelf(f, c, c.self[i]); }
  if (c.rec && !a.recd && c.h.length && a.done[c.h.length - 1]) { a.recd = 1; const l = Math.round(f.maxhp * c.rec); f.hp = Math.max(1, f.hp - l); floatText(f.x, GROUND - f.z - f.lift - f.h - 10, '-' + l, '#ff8a8a', 22); }
}
function tmWorld(dt) {
  wxClock += dt; if (weather && weather.until && wxClock >= weather.until) { weather = weatherBase; const el = $('wx'); if (weather) { el.innerHTML = ico(weather.icon) + weather.name + `<small>${weather.up.map(t => t.toUpperCase()).join('/')} +20%</small>`; el.style.setProperty('--c', weather.col); } else el.classList.remove('on'); }
  for (const i of tfx) i.age += dt; tfx = tfx.filter(i => i.age < i.end);
  for (const z of tzones) {
    z.age += dt; if (z.age < z.from || z.age > z.to) continue; z.acc += dt; if (z.acc < z.every) continue; z.acc = 0;
    const foe = other(z.owner); if (foe.dead || state !== 'fight' || foe.inv > 0) continue; const b = body(foe);
    if (z.glob || circleRect(z.x, GROUND - 40, z.r, b)) {
      if (z.dmg) { const d = Math.round(D(z.owner, z.dmg) * DMG_SCALE * GM.dmg * (foe.shieldT > 0 ? .5 : 1)); foe.hp -= d; floatText(foe.x, GROUND - foe.z - foe.lift - foe.h - 6, String(d), colsOf(z.ty)[1], 20); if (z.owner === meF()) stats.dealt += d; if (foe.hp <= 0) { foe.hp = 0; ko(foe, z.owner); } }
      if (z.st && !z.stDone) { z.stDone = 1; applyStatus(foe, z.st, true, z.owner); }
    }
  }
  tzones = tzones.filter(z => z.age <= z.to);
}
function tmDraw(layer, g) {
  for (const i of tfx) {
    const c = i.c; let mt = i.age * c.ts; if (c.loop && mt > c.loop[1]) mt = c.loop[0] + (mt - c.loop[0]) % (c.loop[1] - c.loop[0]);
    let tx = i.tx, ty = i.ty; if (i.v && !i.miss) { const o = other(i.f); tx = o.x; ty = center(o).y; } // a variation follows the foe live
    TFX.move(layer, c.key, g, mt, { x: i.x0, gy: i.gy, dir: i.dir, S: i.S, dx: (i.f.x - i.x0) * i.dir / i.S, lift: i.lift, tx, ty, v: i.v, to: i.to, img: i.f.vimg, imgW: i.f.w / i.S, imgH: i.f.h / i.S });
  }
}
const tmClear = () => { tfx = []; tzones = []; };

// ----- NORMAL
T('normal', 'Hyper Voice', 'Sound rings that shove the foe back', { c: 18, cd: 3, sta: 24, r: [100, 540], ch: .5, h: [[1.0, 50, 270, 680, 1, 0, .55]], d: 1.5, anim: 'Shoot' });
T('normal', 'Extreme Speed', 'Blur through the foe, five quick hits', { c: 14, cd: 2.6, sta: 22, r: [150, 640], rush: [[.5, 1.1, 1700]], back: [[1.75, 2.3, 1500]], h: rep(5, 1.15, .12, 13, 110, 240, L1, 17), d: 2.3 });
T('normal', 'Double-Team Swarm', 'Copies strike from every side', { c: 18, cd: 3.2, sta: 24, r: [150, 620], h: rep(4, .85, .3, 20, 140, 280, L1, 26), d: 1.95, anim: 'Double' });
T('normal', 'Giga Impact', 'Full-power comet ram, big recoil', { c: 30, cd: 6.5, sta: 40, pow: 1, r: [200, 700], ch: .95, rush: [[.95, 1.3, 2000]], back: [[1.95, 2.4, 1300]], h: [[1.3, 96, 170, 860, 1, 0, 1, L1]], rec: .05, d: 2.4 });
T('normal', 'Tri Attack', 'Three orbs merge into a prism blast', { c: 22, cd: 3.4, sta: 30, r: [200, 820], ch: 1.2, h: [[1.8, 64, 110, 430, 1, 'rand', 1, L1]], d: 2.2, anim: 'Shoot' });
// ----- FIRE
T('fire', 'Eruption', 'Lava column blasts up under the foe', { c: 26, cd: 4, sta: 34, pow: 1, r: [200, 860], ch: .9, h: [[1.0, 78, 130, 420, 1, 'burn', 1, { sc: .4 }]], d: 1.6, anim: 'Charge' });
T('fire', 'Flame Wall', 'A burning wall that scorches', { c: 20, cd: 5, sta: 26, r: [150, 560], h: [[1.2, 30, 120, 200, 0, 'burn', .88, { sc: .5 }]], z: [[1.2, 4.0, 120, 9, 'burn', .88, .45]], loop: [1.4, 2.4], hold: 1.6, d: 1.6, anim: 'Swing' });
T('fire', 'Inferno Orbit', 'Three fireballs circle then home in', { c: 24, cd: 3.4, sta: 32, r: [150, 780], h: [[1.7, 28, 100, 300, 0, 0, 1, L1], [1.92, 28, 100, 300, 0, 0, 1, L1], [2.14, 34, 110, 360, 1, 0, 1, L1]], d: 2.4, anim: 'Shoot' });
T('fire', 'Flare Blitz', 'Blazing charge, recoil damage', { c: 26, cd: 5, sta: 34, pow: 1, r: [180, 640], rush: [[.7, 1.05, 2000]], back: [[1.9, 2.4, 1500]], h: [[1.05, 84, 160, 780, 1, 'burn', 1, { live: 1, sc: .35 }]], rec: .05, d: 2.4 });
T('fire', 'Lava Plume', 'Geysers race along the ground', { c: 22, cd: 4, sta: 30, pow: 1, r: [200, 800], h: [0, 1, 2, 3, 4, 5].map(i => [.55 + i * .18, i === 5 ? 46 : 20, 90, i === 5 ? 380 : 120, i === 5 ? 1 : 0, 0, .25 + i * .15]), d: 1.9, anim: 'Charge' });
// ----- WATER
T('water', 'Bubble Barrage', 'Slow bubbles home in and pop', { c: 18, cd: 3.2, sta: 24, r: [150, 680], h: [[1.8, 20, 110, 160, 0, 0, 1, L1], [2.15, 20, 110, 160, 0, 0, 1, L1], [2.5, 26, 120, 240, 1, 0, 1, L1]], d: 2.7, ts: 1.45, anim: 'Shoot' });
T('water', 'Tidal Crash', 'A huge wave crashes down on the foe', { c: 26, cd: 4, sta: 34, pow: 1, r: [200, 860], h: [[1.5, 74, 160, 520, 1, 0, 1]], d: 2.1, anim: 'Charge' });
T('water', 'Rain Dance', 'Summon rain, water moves hit harder', { c: 16, cd: 9, sta: 20, r: [0, 9999], self: [[.6, 'wx', 'rain', 16], [.9, 'heal', .06]], loop: [1.4, 2.2], hold: 2, d: 1.2, anim: 'Charge', when: f => !weather || weather.id !== 'rain' });
T('water', 'Aqua Jet', 'Water-bullet dash through the foe', { c: 14, cd: 2.6, sta: 24, r: [200, 660], rush: [[.6, 1.0, 1900]], back: [[1.9, 2.4, 1500]], h: [[1.0, 60, 130, 620, 1, 0, 1, L1]], d: 2.4 });
T('water', 'Water Shuriken', 'Five spinning water stars', { c: 18, cd: 3, sta: 26, r: [150, 720], h: [0, 1, 2, 3, 4].map(i => [1.1 + i * .12, 15, 90, 200, 0, 0, 1, L1]), d: 1.9, anim: 'Shoot' });
// ----- ELECTRIC
T('electric', 'Thunder Cage', 'Bolts form a shocking cage', { c: 22, cd: 4, sta: 30, r: [180, 740], h: [[1.1, 18, 130, 100, 0, 'slow', 1, { sc: .7 }], [1.5, 18, 130, 100, 0, 0], [1.9, 18, 130, 100, 0, 0], [2.3, 24, 130, 220, 1, 0]], d: 2.4, anim: 'Charge' });
T('electric', 'Discharge Nova', 'Arcs burst out in every direction', { c: 26, cd: 5, sta: 34, pow: 1, r: [0, 440], ch: 1.1, h: [[1.35, 72, 440, 820, 1, 'slow', 0, { self: 1, sc: .45 }]], d: 1.9, anim: 'Charge' });
T('electric', 'Volt Switch', 'Zap through the foe and snap back', { c: 14, cd: 3, sta: 22, r: [200, 680], rush: [[.5, .95, 2400]], back: [[1.5, 1.95, 2400]], h: [[.95, 52, 130, 600, 1, 0, 1, L1]], d: 2.0 });
T('electric', 'Zap Cannon', 'Slow big orb, heavy paralysis chance', { c: 26, cd: 4.4, sta: 34, pow: 1, r: [220, 860], ch: 1.0, h: [[1.8, 72, 140, 520, 1, 'slow', 1, { live: 1, sc: .65 }]], d: 2.3, anim: 'Charge' });
T('electric', 'Electric Field', 'Shock zone crackling on the ground', { c: 20, cd: 5, sta: 26, r: [100, 600], z: [[1.1, 4.4, 220, 8, 'slow', .7, .4]], loop: [1.2, 2.2], hold: 1.8, d: 1.5, anim: 'Swing' });
// ----- GRASS
T('grass', 'Seed Bomb', 'Lobbed seeds burst into spores', { c: 18, cd: 3, sta: 24, r: [150, 640], h: [[1.2, 22, 110, 220, 0, 0, 1], [1.5, 22, 110, 220, 0, 0, 1], [1.8, 28, 120, 300, 1, 0, 1]], d: 2.0, anim: 'Shoot' });
T('grass', 'Petal Blizzard', 'A thick spiral of petals', { c: 20, cd: 3.4, sta: 28, r: [100, 640], h: [[1.55, 15, 130, 160, 0, 0, 1, L1], [1.75, 15, 130, 160, 0, 0, 1, L1], [1.95, 15, 130, 160, 0, 0, 1, L1], [2.15, 20, 140, 260, 1, 0, 1, L1]], d: 2.3, anim: 'Swing' });
T('grass', 'Frenzy Plant', 'Giant roots burst out and squeeze', { c: 26, cd: 5, sta: 34, pow: 1, r: [100, 560], h: [[1.0, 42, 130, 160, 0, 'slow', 1], [1.5, 52, 140, 320, 1, 0, 1]], d: 2.0, anim: 'Charge' });
T('grass', 'Leech Seed', 'Vines drain HP back to the user', { c: 18, cd: 4.5, sta: 24, r: [120, 700], h: [1.05, 1.4, 1.8, 2.2].map(t => [t, 10, 110, 0, 0, 0, 1, { live: 1, leech: .9 }]), d: 2.4, anim: 'Shoot' });
T('grass', 'Grass Knot', 'Strands knot the legs and trip the foe', { c: 20, cd: 4, sta: 28, r: [100, 600], h: [[1.3, 56, 120, 40, 1, 'slow', 1, { trip: 1 }]], d: 1.9, anim: 'Charge' });
// ----- ICE
T('ice', 'Glacier Prison', 'Encase the foe in ice, then shatter', { c: 24, cd: 5.5, sta: 32, pow: 1, r: [120, 640], h: [[.9, 16, 120, 0, 0, 'freeze', 1, { sc: .85 }], [1.9, 46, 130, 360, 1, 0, 1]], d: 2.2, anim: 'Charge' });
T('ice', 'Avalanche', 'Ice boulders tumble like meteors', { c: 24, cd: 4.5, sta: 32, pow: 1, r: [200, 860], h: [[1.05, 18, 110, 100, 0, 0], [1.25, 18, 110, 100, 0, 0], [1.45, 18, 110, 100, 0, 0], [1.65, 20, 110, 120, 0, 0], [1.85, 44, 140, 360, 1, 0]], d: 2.1, anim: 'Charge' });
T('ice', 'Aurora Veil', 'Aurora dome halves damage taken', { c: 18, cd: 10, sta: 22, r: [0, 9999], self: [[.6, 'shield', 9]], loop: [1.2, 2.0], hold: 3, d: 1.2, anim: 'Charge', when: f => f.shieldT <= 0 });
T('ice', 'Icicle Crash', 'A giant icicle drops like a spear', { c: 22, cd: 3.8, sta: 30, pow: 1, r: [160, 860], h: [[1.25, 72, 130, 380, 1, 'freeze', 1, { sc: .25 }]], d: 1.9, anim: 'Charge' });
T('ice', 'Hailstorm', 'Hail pours down across the arena', { c: 20, cd: 8, sta: 26, r: [0, 9999], self: [[.7, 'wx', 'hail', 16]], z: [[1.0, 4.0, 0, 7, 0, 'G', .5]], loop: [1.2, 2.2], hold: 2, d: 1.6, anim: 'Charge', when: f => !weather || weather.id !== 'hail' });
// ----- FIGHTING
T('fighting', 'Close Combat Flurry', 'A blur of fists and kicks', { c: 24, cd: 4, sta: 32, r: [120, 520], rush: [[.4, .8, 1900]], back: [[2.0, 2.5, 1500]], h: rep(14, .8, .09, 11, 100, 90, L1, 22), d: 2.5, ts: 1.4, anim: 'Double' });
T('fighting', 'Aura Sphere', 'A homing sphere that cannot be blocked', { c: 22, cd: 3.2, sta: 26, r: [200, 900], ch: 1.0, h: [[1.7, 64, 110, 480, 1, 0, 1, { live: 1, unb: 1 }]], d: 2.2, anim: 'Shoot' });
T('fighting', 'Sky Uppercut', 'Rising uppercut launches the foe', { c: 22, cd: 4, sta: 30, r: [150, 640], rush: [[.3, .7, 2000]], back: [[2.0, 2.5, 1500]], h: [[.75, 64, 130, 0, 1, 0, 1, { live: 1, launch: 620 }], [1.9, 36, 130, 300, 1, 0, 1, L1]], d: 2.5 });
T('fighting', 'Dynamic Punch', 'One huge punch, leaves the foe dizzy', { c: 26, cd: 5, sta: 34, pow: 1, r: [150, 640], rush: [[.4, .75, 2000]], back: [[2.2, 2.6, 1500]], h: [[.95, 86, 150, 900, 1, 'confuse', 1, { live: 1, sc: .8 }]], d: 2.6 });
T('fighting', 'Bulk Up', 'Flex: attack up for a while', { c: 16, cd: 10, sta: 20, r: [0, 9999], self: [[.5, 'buff', 12]], d: 1.2, anim: 'Charge', when: f => f.buffT <= 0 });
// ----- POISON
T('poison', 'Sludge Bomb', 'Lobbed blob leaves a toxic puddle', { c: 20, cd: 3.4, sta: 26, r: [200, 860], h: [[1.2, 50, 120, 260, 1, 'poison', 1, { sc: .7 }]], z: [[1.2, 4.0, 130, 6, 0, 1, .5]], loop: [1.8, 2.5], hold: 1.5, d: 1.7, anim: 'Shoot' });
T('poison', 'Acid Rain', 'Acid drops eat away at the foe', { c: 20, cd: 4.5, sta: 26, r: [160, 760], h: [[1.0, 16, 150, 0, 0, 'poison', 1, { sc: .5 }]], z: [[1.0, 3.4, 150, 8, 0, 1, .5]], loop: [1.4, 2.2], hold: 1, d: 1.6, anim: 'Charge' });
T('poison', 'Venom Fang', 'Fangs snap shut, venom drips', { c: 20, cd: 3.4, sta: 28, r: [100, 520], rush: [[.4, .8, 1900]], back: [[1.9, 2.4, 1500]], h: [[1.1, 70, 130, 420, 1, 'poison', 1, { live: 1, sc: .55 }]], d: 2.4 });
T('poison', 'Poison Jab', 'A long venom spike thrust', { c: 16, cd: 2.8, sta: 24, r: [100, 480], rush: [[.5, .8, 2000]], back: [[1.9, 2.4, 1500]], h: [[.85, 64, 120, 420, 1, 'poison', 1, { live: 1, sc: .4 }]], d: 2.3 });
T('poison', 'Smog Cloud', 'Thick smog that poisons', { c: 18, cd: 4, sta: 24, r: [140, 720], z: [[1.0, 3.4, 170, 7, 'poison', .8, .5]], loop: [1.5, 2.2], hold: 1, d: 1.5, anim: 'Shoot' });
// ----- GROUND
T('ground', 'Bonemerang', 'A bone that hits going and returning', { c: 16, cd: 3, sta: 22, r: [160, 720], h: [[1.4, 40, 100, 300, 0, 0, 1, L1], [2.0, 34, 100, 300, 0, 0, 1, L1]], d: 2.4, anim: 'Swing' });
T('ground', 'Sand Tomb', 'A sand column traps the foe', { c: 18, cd: 4.4, sta: 24, r: [120, 640], h: [[.7, 24, 110, 0, 0, 'slow', 1]], z: [[.7, 2.6, 110, 6, 0, 1, .5]], loop: [1.2, 2.0], hold: .8, d: 1.5, anim: 'Charge' });
T('ground', 'Mud Bomb', 'Mud splashes and slows the foe', { c: 18, cd: 3.2, sta: 24, r: [200, 820], h: [[1.2, 46, 120, 200, 1, 'slow', 1, { sc: .8 }]], d: 1.8, anim: 'Shoot' });
T('ground', 'Sand Attack', 'Sand in the face: accuracy down', { c: 10, cd: 4, sta: 16, r: [100, 700], h: [[1.2, 10, 130, 0, 0, 0, 1, { debuff: 7 }]], d: 1.7, anim: 'Shoot', score: 3 });
T('ground', 'Drill Run', 'Tunnel under, erupt beneath the foe', { c: 22, cd: 4.2, sta: 30, pow: 1, r: [200, 840], rush: [[.5, 1.3, 850]], hide: [[.5, 1.3]], h: [[1.3, 66, 130, 200, 1, 0, 1, { live: 1, launch: 520 }]], d: 2.1, anim: 'Charge' });
// ----- FLYING
T('flying', 'Feather Storm', 'A fan of sharp feathers', { c: 20, cd: 3.4, sta: 26, r: [150, 720], h: [[1.2, 14, 100, 160, 0, 0], [1.4, 14, 100, 160, 0, 0], [1.6, 14, 100, 160, 0, 0], [1.8, 18, 110, 240, 1, 0]], d: 2.0, anim: 'Swing' });
T('flying', 'Tailwind', 'Rushing wind: power up and cure', { c: 14, cd: 10, sta: 20, r: [0, 9999], self: [[.5, 'buff', 10], [.5, 'cure']], d: 1.2, anim: 'Charge', when: f => f.buffT <= 0 });
T('flying', 'Hurricane', 'A cyclone lifts and spins the foe', { c: 22, cd: 4.5, sta: 30, pow: 1, r: [160, 760], h: [[1.0, 26, 130, 0, 1, 0, 1, { launch: 560 }], [1.7, 44, 140, 380, 1, 'confuse', 1, { sc: .4 }]], d: 2.3, anim: 'Charge' });
T('flying', 'Roost', 'Rest and recover HP', { c: 18, cd: 9, sta: 22, r: [0, 9999], self: [[.9, 'heal', .2], [.9, 'cure']], d: 1.5, anim: 'Charge', when: f => f.hp < f.maxhp * .85 });
T('flying', 'Aerial Ace', 'Zig-zag slashes that cannot be tracked', { c: 18, cd: 3.4, sta: 26, r: [160, 700], rush: [[.5, .65, 2400]], back: [[1.7, 2.1, 1700]], h: rep(4, .8, .25, 18, 130, 150, L1, 24), d: 2.1, anim: 'Double' });
// ----- PSYCHIC
T('psychic', 'Psycho Cut', 'Two psychic blades cross on the foe', { c: 18, cd: 3, sta: 24, r: [160, 760], h: [[1.2, 34, 110, 260, 0, 0, 1, L1], [1.32, 34, 110, 260, 1, 0, 1, L1]], d: 1.8, anim: 'Swing' });
T('psychic', 'Telekinesis Slam', 'Lift the foe, then slam it down', { c: 24, cd: 5, sta: 32, pow: 1, r: [150, 700], h: [[.6, 18, 120, 0, 0, 0, 1, { live: 1, launch: 620 }], [1.85, 62, 130, 0, 1, 0, 1, { live: 1, slam: -1500 }]], d: 2.3, anim: 'Charge' });
T('psychic', 'Future Sight', 'A marked spot is struck moments later', { c: 24, cd: 5.5, sta: 32, pow: 1, r: [200, 900], h: [[1.85, 84, 140, 460, 1, 0, 1]], d: 2.3, anim: 'Charge' });
T('psychic', 'Reflect', 'Barrier that counters the next hit', { c: 16, cd: 9, sta: 20, r: [0, 9999], self: [[.5, 'counter', 1.8]], d: 1.4, anim: 'Charge', when: f => f.counterT <= 0 });
T('psychic', 'Dream Eater', 'Sleep, then drain HP from the foe', { c: 20, cd: 4.5, sta: 26, r: [140, 680], h: [[.35, 0, 130, 0, 0, 'sleep', 1, { live: 1, sc: .55 }], [1.2, 24, 130, 0, 0, 0, 1, { live: 1, leech: 1 }], [1.6, 24, 130, 0, 0, 0, 1, { live: 1, leech: 1 }], [2.0, 28, 130, 0, 0, 0, 1, { live: 1, leech: 1 }]], d: 2.4, anim: 'Shoot' });
// ----- BUG
T('bug', 'Bug Buzz', 'A buzzing swarm of tiny bugs', { c: 20, cd: 3.4, sta: 26, r: [150, 720], h: [[1.3, 14, 110, 150, 0, 0, 1, L1], [1.6, 14, 110, 150, 0, 0, 1, L1], [1.9, 14, 110, 150, 0, 0, 1, L1], [2.2, 18, 120, 240, 1, 0, 1, L1]], d: 2.4, anim: 'Shoot' });
T('bug', 'X-Scissor', 'Two blades cross in an X', { c: 18, cd: 3, sta: 24, r: [100, 520], h: [[1.0, 38, 110, 240, 0, 0, 1, L1], [1.18, 40, 120, 300, 1, 0, 1, L1]], d: 1.7, anim: 'Swing' });
T('bug', 'Sticky Web', 'A web net that slows the foe', { c: 16, cd: 4.2, sta: 22, r: [140, 640], h: [[1.1, 16, 130, 0, 0, 'slow', 1]], z: [[1.1, 3.6, 130, 5, 0, 1, .5]], loop: [1.8, 2.5], hold: 1.5, d: 1.6, anim: 'Shoot' });
T('bug', 'Megahorn', 'A glowing horn skewers the foe', { c: 24, cd: 4.4, sta: 32, pow: 1, r: [150, 640], rush: [[.5, .85, 1900]], back: [[2.0, 2.5, 1500]], h: [[.85, 88, 150, 740, 1, 0, 1, L1]], d: 2.5 });
T('bug', 'Silver Wind', 'A wave of glittering silver dust', { c: 20, cd: 3.4, sta: 26, r: [160, 720], h: [[1.2, 24, 130, 220, 0, 0], [1.5, 24, 130, 220, 0, 0], [1.8, 28, 130, 300, 1, 0]], d: 2.3, anim: 'Shoot' });
// ----- ROCK
T('rock', 'Rock Tomb', 'Boulders rise and cage the foe', { c: 20, cd: 4, sta: 28, r: [160, 680], h: [[.9, 42, 120, 0, 0, 'slow', 1], [2.0, 22, 120, 200, 0, 0, 1]], d: 2.4, anim: 'Charge' });
T('rock', 'Ancient Power', 'Orbiting rocks are flung one by one', { c: 22, cd: 3.8, sta: 30, r: [160, 820], ch: 1.0, h: rep(6, 1.7, .12, 14, 120, 150, L1, 24), d: 2.5, anim: 'Charge' });
T('rock', 'Sandstorm', 'Summon a sandstorm', { c: 16, cd: 10, sta: 22, r: [0, 9999], self: [[.6, 'wx', 'sand', 16]], z: [[.8, 4.0, 0, 6, 0, 'G', .5]], loop: [1.0, 2.0], hold: 2, d: 1.4, anim: 'Charge', when: f => !weather || weather.id !== 'sand' });
T('rock', 'Head Smash', 'Huge rocky headbutt, heavy recoil', { c: 28, cd: 6, sta: 38, pow: 1, r: [150, 620], rush: [[.7, 1.0, 2000]], back: [[2.0, 2.5, 1400]], h: [[1.0, 104, 170, 920, 1, 0, 1, L1]], rec: .07, d: 2.5 });
T('rock', 'Stealth Rock', 'Rocks planted in the ground cut the foe', { c: 20, cd: 7, sta: 26, r: [200, 880], z: [[1.3, 7.5, 150, 12, 0, .9, 1.2]], loop: [2.0, 2.5], hold: 4.5, d: 1.8, anim: 'Swing' });
// ----- GHOST
T('ghost', 'Shadow Sneak', 'Slip into shadow, claw from behind', { c: 18, cd: 3, sta: 24, r: [120, 700], hide: [[.4, 2.1]], tp: 1.0, h: [[1.3, 64, 130, 400, 1, 0, 1, L1]], d: 2.2, anim: 'Charge' });
T('ghost', 'Spectral Hands', 'Dark hands grab and hold the foe', { c: 22, cd: 4.4, sta: 30, r: [120, 640], h: [[1.0, 34, 130, 0, 0, 'slow', 1], [1.9, 34, 130, 260, 1, 0, 1]], d: 2.3, anim: 'Charge' });
T('ghost', 'Will-O-Wisp', 'Cold blue flames that burn', { c: 18, cd: 4, sta: 24, r: [200, 780], h: [[1.9, 32, 110, 160, 0, 'burn', 1, L1]], d: 2.3, anim: 'Shoot' });
T('ghost', 'Confuse Ray', 'Orbs circle the foe, it staggers', { c: 14, cd: 4, sta: 20, r: [150, 760], h: [[1.0, 10, 110, 0, 0, 'confuse', 1, { live: 1, sc: .85 }]], d: 1.7, anim: 'Shoot' });
T('ghost', 'Shadow Punch', 'A ghost fist from a dark portal', { c: 20, cd: 3, sta: 26, r: [100, 700], h: [[1.4, 70, 120, 720, 1, 0, 1, L1]], d: 2.0, anim: 'Shoot' });
// ----- DRAGON
T('dragon', 'Outrage', 'Three wild rushes in a rage', { c: 30, cd: 6, sta: 40, pow: 1, r: [150, 560], rush: [[.5, .8, 2000], [1.1, 1.4, 2000], [1.7, 2.0, 2000]], back: [[.9, 1.05, 1700], [1.5, 1.65, 1700], [2.1, 2.5, 1700]], h: [[.8, 42, 150, 700, 1, 0, 1, L1], [1.4, 42, 150, 700, 1, 0, 1, L1], [2.0, 50, 150, 800, 1, 0, 1, L1]], d: 2.5, anim: 'Double' });
T('dragon', 'Dragon Claw', 'Three glowing claw slashes', { c: 20, cd: 3, sta: 26, r: [100, 640], h: [[.85, 74, 130, 420, 1, 0, 1, L1]], d: 1.7, anim: 'Swing' });
T('dragon', 'Draco Meteor', 'Meteors rain down, the last one huge', { c: 30, cd: 6.5, sta: 40, pow: 1, r: [200, 900], ch: .4, h: [[1.05, 24, 110, 200, 0, 0], [1.27, 24, 110, 200, 0, 0], [1.49, 24, 110, 200, 0, 0], [1.71, 24, 110, 200, 0, 0], [1.93, 56, 150, 420, 1, 0]], d: 2.4, anim: 'Charge' });
T('dragon', 'Dragon Tail', 'A huge tail sweep that knocks back', { c: 22, cd: 3.6, sta: 28, r: [100, 520], rush: [[.5, .8, 1900]], back: [[2.0, 2.5, 1500]], h: [[.95, 68, 140, 900, 1, 0, 1, L1]], d: 2.5, anim: 'Swing' });
T('dragon', 'Dragon Dance', 'Dance: power up for a while', { c: 16, cd: 10, sta: 20, r: [0, 9999], self: [[.6, 'buff', 14]], d: 1.4, anim: 'Charge', when: f => f.buffT <= 0 });
// Gen 2 types: dark, steel and fairy
T('dark', 'Crunch', 'Spectral jaws snap shut', { c: 20, cd: 3.4, sta: 26, r: [100, 620], h: [[1.15, 66, 120, 420, 1, 0, 1, L1]], d: 1.9, anim: 'Swing' });
T('dark', 'Night Slash', 'Streak through the foe, two dark blades', { c: 20, cd: 3.2, sta: 26, r: [150, 640], rush: [[.5, .9, 1800]], back: [[1.75, 2.3, 1500]], h: [[.95, 40, 120, 260, 0, 0, 1, L1], [1.1, 44, 130, 320, 1, 0, 1, L1]], d: 2.3 });
T('dark', 'Dark Void', 'A black void that puts the foe to sleep', { c: 20, cd: 6, sta: 26, r: [200, 780], h: [[1.1, 10, 130, 0, 0, 'sleep', 1, { live: 1, sc: .6 }]], d: 2.3, anim: 'Shoot' });
T('dark', 'Nasty Plot', 'Scheme: attack up for a while', { c: 16, cd: 10, sta: 20, r: [0, 9999], self: [[.6, 'buff', 14]], d: 1.6, anim: 'Charge', when: f => f.buffT <= 0 });
T('dark', 'Knock Off', 'A sweeping strike launches the foe', { c: 20, cd: 3.6, sta: 26, r: [120, 620], h: [[1.15, 72, 130, 0, 1, 0, 1, { live: 1, launch: 540 }]], d: 2.2, anim: 'Swing' });
T('steel', 'Iron Head', 'Steel-plated headbutt', { c: 22, cd: 4, sta: 30, r: [150, 640], rush: [[.7, 1.0, 1900]], back: [[2.0, 2.5, 1400]], h: [[1.0, 80, 150, 700, 1, 0, 1, L1]], d: 2.5 });
T('steel', 'Meteor Mash', 'A silver fist falls like a meteor', { c: 24, cd: 4.4, sta: 30, pow: 1, r: [150, 700], ch: .7, h: [[1.3, 86, 150, 740, 1, 0, 1, L1]], d: 2.2, anim: 'Charge' });
T('steel', 'Flash Cannon', 'One thick, blinding silver ray', { c: 26, cd: 5, sta: 34, pow: 1, r: [200, 900], ch: 1.3, h: [[1.55, 84, 140, 560, 1, 0, 1, L1]], d: 2.3, anim: 'Shoot' });
T('steel', 'Iron Defense', 'Steel shell halves damage taken', { c: 18, cd: 11, sta: 22, r: [0, 9999], self: [[.6, 'shield', 9]], d: 1.4, anim: 'Charge', when: f => f.shieldT <= 0 });
T('steel', 'Bullet Punch', 'Four silver fists at bullet speed', { c: 16, cd: 3, sta: 22, r: [150, 620], h: rep(4, .72, .28, 16, 110, 260, L1, 22), d: 2.0, anim: 'Double' });
T('fairy', 'Moonblast', 'A moon orb drops on the foe', { c: 24, cd: 4.6, sta: 32, pow: 1, r: [200, 860], ch: 1.2, h: [[1.75, 80, 150, 520, 1, 0, 1, L1]], d: 2.5, anim: 'Charge' });
T('fairy', 'Dazzling Gleam', 'A flash that dazzles everything near the foe', { c: 20, cd: 4, sta: 26, r: [100, 620], ch: .4, h: [[1.1, 52, 230, 420, 1, 0, 1, L1]], d: 2.2, anim: 'Shoot' });
T('fairy', 'Play Rough', 'Bound in for a fluffy brawl', { c: 22, cd: 3.8, sta: 28, r: [150, 640], rush: [[.5, .9, 1800]], back: [[2.0, 2.5, 1400]], h: rep(5, .95, .17, 14, 110, 200, L1, 24), d: 2.5 });
T('fairy', 'Charm', 'Hearts that lower the foe\u2019s accuracy', { c: 10, cd: 4, sta: 16, r: [100, 700], h: [[1.5, 8, 140, 0, 0, 0, 1, { live: 1, debuff: 8 }]], d: 2.1, anim: 'Shoot', score: 3 });
T('fairy', 'Moonlight', 'Moonbeam restores HP', { c: 18, cd: 9, sta: 22, r: [0, 9999], self: [[.9, 'heal', .22], [.9, 'cure']], d: 1.8, anim: 'Charge', when: f => f.hp < f.maxhp * .85 });
// Two more scripted specials for every type
T('normal', 'Body Slam', 'Full-body ram that can paralyse', { c: 20, cd: 3.6, sta: 28, r: [150, 640], rush: [[.6, .95, 1900]], back: [[1.9, 2.4, 1500]], h: [[.95, 76, 150, 640, 1, 'slow', 1, { live: 1, sc: .3 }]], d: 2.4 });
T('normal', 'Swords Dance', 'Swords spin up: attack sharply up', { c: 16, cd: 10, sta: 20, r: [0, 9999], self: [[.6, 'buff', 16]], d: 1.5, anim: 'Charge', when: f => f.buffT <= 0 });
T('fire', 'Fire Fang', 'Flaming jaws that can burn', { c: 20, cd: 3.4, sta: 26, r: [100, 600], h: [[1.15, 62, 120, 360, 1, 'burn', 1, { live: 1, sc: .4 }]], d: 1.9, anim: 'Swing' });
T('fire', 'Sunny Day', 'Summon the sun, Fire moves hit harder', { c: 16, cd: 10, sta: 22, r: [0, 9999], self: [[.6, 'wx', 'sun', 16]], loop: [1.4, 2.2], hold: 2, d: 1.2, anim: 'Charge', when: f => !weather || weather.id !== 'sun' });
T('water', 'Whirlpool', 'A vortex that traps and slows', { c: 20, cd: 4.4, sta: 26, r: [150, 680], h: [[1.1, 24, 130, 0, 0, 'slow', 1]], z: [[1.1, 3.4, 130, 6, 'slow', 1, .6]], loop: [1.8, 2.5], hold: 1.5, d: 1.8, anim: 'Charge' });
T('water', 'Waterfall', 'Rising torrent that launches the foe', { c: 22, cd: 4, sta: 28, r: [120, 640], h: [[1.15, 70, 130, 0, 1, 0, 1, { live: 1, launch: 540 }]], d: 2.2, anim: 'Swing' });
T('electric', 'Wild Charge', 'Electric ram, small recoil', { c: 24, cd: 4.4, sta: 32, pow: 1, r: [180, 640], rush: [[.6, .95, 2000]], back: [[1.9, 2.4, 1500]], h: [[.95, 84, 150, 760, 1, 'slow', 1, { live: 1, sc: .3 }]], rec: .05, d: 2.4 });
T('electric', 'Thunder Wave', 'Static rings that paralyse', { c: 14, cd: 4.4, sta: 20, r: [150, 760], h: [[1.1, 12, 130, 0, 0, 'slow', 1, { live: 1, sc: .85 }]], d: 2.1, anim: 'Shoot' });
T('grass', 'Synthesis', 'Sunlight restores HP', { c: 18, cd: 9, sta: 22, r: [0, 9999], self: [[.9, 'heal', .2], [.9, 'cure']], d: 1.6, anim: 'Charge', when: f => f.hp < f.maxhp * .85 });
T('grass', 'Vine Lash', 'Two whipping vines trip the foe', { c: 20, cd: 3.6, sta: 26, r: [100, 600], h: [[1.1, 34, 120, 200, 0, 0, 1], [1.5, 40, 120, 320, 1, 'slow', 1, { trip: 1 }]], d: 2.0, anim: 'Swing' });
T('ice', 'Ice Shard', 'Three fast ice shards', { c: 14, cd: 3, sta: 22, r: [150, 760], h: rep(3, .7, .3, 18, 110, 200, L1, 24), d: 1.8, anim: 'Shoot' });
T('ice', 'Frost Breath', 'A freezing mist, may freeze', { c: 20, cd: 4, sta: 26, r: [150, 640], h: [[1.1, 40, 150, 150, 0, 'freeze', 1, { live: 1, sc: .3 }]], d: 2.0, anim: 'Shoot' });
T('fighting', 'Mach Punch', 'A blindingly fast punch', { c: 12, cd: 2.6, sta: 18, r: [150, 600], rush: [[.5, .75, 2200]], back: [[1.7, 2.2, 1500]], h: [[.75, 52, 120, 420, 1, 0, 1, L1]], d: 2.2 });
T('fighting', 'Cross Chop', 'Two crossing chops', { c: 20, cd: 3.4, sta: 26, r: [100, 560], h: [[.9, 40, 120, 260, 0, 0, 1, L1], [1.15, 46, 130, 380, 1, 0, 1, L1]], d: 1.9, anim: 'Swing' });
T('poison', 'Toxic', 'A toxic splash that poisons', { c: 16, cd: 5, sta: 22, r: [150, 720], h: [[1.1, 16, 130, 0, 0, 'poison', 1, { live: 1 }]], d: 2.0, anim: 'Shoot' });
T('poison', 'Gunk Shot', 'A lobbed lump of gunk', { c: 26, cd: 5, sta: 34, pow: 1, r: [200, 860], h: [[1.4, 84, 140, 520, 1, 'poison', 1, { sc: .5 }]], d: 2.2, anim: 'Shoot' });
T('ground', 'Earthquake', 'The whole floor heaves three times', { c: 26, cd: 5, sta: 34, pow: 1, r: [0, 600], ch: .6, h: rep(3, .9, .45, 30, 300, 260, L1, 48), d: 2.3, anim: 'Charge' });
T('ground', 'Bulldoze', 'A dust wave that shoves and slows', { c: 20, cd: 4, sta: 26, r: [200, 760], h: [[1.35, 62, 140, 520, 1, 'slow', 1, { sc: .5 }]], d: 2.1, anim: 'Charge' });
T('flying', 'Brave Bird', 'Diving charge, recoil damage', { c: 26, cd: 5, sta: 34, pow: 1, r: [180, 640], rush: [[.6, .95, 2000]], back: [[1.95, 2.45, 1500]], h: [[.95, 88, 160, 780, 1, 0, 1, L1]], rec: .06, d: 2.4 });
T('flying', 'Air Slash', 'Two crescents of cutting air', { c: 18, cd: 3, sta: 24, r: [160, 760], h: [[1.15, 36, 110, 240, 0, 0, 1, L1], [1.4, 40, 120, 320, 1, 0, 1, L1]], d: 2.0, anim: 'Swing' });
T('psychic', 'Calm Mind', 'Focus: power up for a while', { c: 16, cd: 10, sta: 20, r: [0, 9999], self: [[.6, 'buff', 14]], d: 1.5, anim: 'Charge', when: f => f.buffT <= 0 });
T('psychic', 'Zen Headbutt', 'A glowing, charging headbutt', { c: 22, cd: 4, sta: 30, r: [150, 640], rush: [[.7, 1.0, 1900]], back: [[2.0, 2.5, 1400]], h: [[1.0, 82, 150, 700, 1, 0, 1, L1]], d: 2.5 });
T('bug', 'Leech Life', 'Fangs that drain HP', { c: 18, cd: 4.2, sta: 24, r: [120, 640], h: [1.0, 1.4, 1.8].map(t => [t, 14, 110, 0, 0, 0, 1, { live: 1, leech: 1 }]), d: 2.3, anim: 'Shoot' });
T('bug', 'String Shot', 'Sticky silk that slows the foe', { c: 12, cd: 4, sta: 18, r: [140, 720], h: [[1.2, 18, 130, 0, 0, 'slow', 1, { live: 1 }]], d: 2.0, anim: 'Shoot', score: 3 });
T('rock', 'Rock Slide', 'Boulders crash down three times', { c: 24, cd: 4.4, sta: 30, r: [180, 800], h: rep(3, .9, .4, 26, 170, 220, null, 40), d: 2.2, anim: 'Charge' });
T('rock', 'Rock Polish', 'Polish up: power up for a while', { c: 16, cd: 10, sta: 20, r: [0, 9999], self: [[.8, 'buff', 14]], d: 1.8, anim: 'Charge', when: f => f.buffT <= 0 });
T('ghost', 'Shadow Ball', 'A ball of shadow that can confuse', { c: 22, cd: 3.6, sta: 28, r: [200, 800], ch: .9, h: [[1.5, 66, 120, 420, 1, 'confuse', 1, { live: 1, sc: .25 }]], d: 2.1, anim: 'Shoot' });
T('ghost', 'Destiny Bond', 'A chain that repays the next hit', { c: 16, cd: 9, sta: 20, r: [0, 9999], self: [[.5, 'counter', 1.8]], d: 1.6, anim: 'Charge', when: f => f.counterT <= 0 });
T('dragon', 'Dragon Pulse', 'A pulse of draconic rings', { c: 22, cd: 3.8, sta: 30, r: [200, 820], ch: .7, h: [[1.4, 72, 130, 440, 1, 0, 1, L1]], d: 2.0, anim: 'Shoot' });
T('dragon', 'Dragon Rush', 'A dragon-head charge', { c: 26, cd: 5, sta: 34, pow: 1, r: [180, 640], rush: [[.6, .95, 2000]], back: [[1.95, 2.45, 1500]], h: [[.95, 92, 160, 820, 1, 0, 1, L1]], d: 2.4 });
T('dark', 'Snarl', 'A roar of rings that flinches the foe', { c: 20, cd: 3.4, sta: 26, r: [150, 700], h: [[1.3, 62, 130, 360, 1, 0, 1, L1]], d: 2.0, anim: 'Shoot' });
T('dark', 'Sucker Punch', 'A sneaky, instant punch', { c: 12, cd: 2.6, sta: 18, r: [100, 520], h: [[.8, 60, 110, 520, 1, 0, 1, L1]], d: 1.5, anim: 'Swing' });
T('steel', 'Gyro Ball', 'Roll through the foe three times', { c: 22, cd: 4, sta: 28, r: [150, 640], rush: [[.5, .9, 2000]], back: [[2.0, 2.5, 1500]], h: rep(3, .9, .3, 28, 130, 240, L1, 40), d: 2.5 });
T('steel', 'Steel Wing', 'Two silver wing cuts', { c: 18, cd: 3, sta: 24, r: [100, 560], h: [[.9, 40, 120, 260, 0, 0, 1, L1], [1.12, 46, 130, 380, 1, 0, 1, L1]], d: 1.8, anim: 'Swing' });
T('fairy', 'Fairy Wind', 'A petal gust in three waves', { c: 18, cd: 3.2, sta: 24, r: [150, 760], h: rep(3, 1.0, .4, 22, 120, 200, L1, 30), d: 2.2, anim: 'Shoot' });
T('fairy', 'Draining Kiss', 'A kiss that drains HP', { c: 18, cd: 4.2, sta: 24, r: [140, 680], h: [1.1, 1.4, 1.7].map(t => [t, 14, 110, 0, 0, 0, 1, { live: 1, leech: 1 }]), d: 2.2, anim: 'Shoot' });

function statRows(p) { const mx = { hp: 255, atk: 190, spa: 194, spe: 160 }; return [['HP', 'hp'], ['ATK', 'atk'], ['SPA', 'spa'], ['SPE', 'spe']].map(([l, k]) => `<div class="srow"><span>${l}</span><i><b style="width:${Math.min(100, p[k] / mx[k] * 100)}%;background:${STAT_COL[k]}"></b></i><em>${p[k]}</em></div>`).join(''); }
const moveIcons = (k, specs) => [`<div class="mi" title="${k.melee.name}">${ico(k.melee.icon)}</div>`, `<div class="mi" title="${k.ranged.name}">${ico(k.ranged.icon)}</div>`, ...specs.map(s => `<div class="mi" title="${s.name}">${ico(s.icon)}</div>`), `<div class="mi ult" title="${k.beam.name}">${ico(k.beam.icon)}</div>`].join('');
// every Pokémon of the first three generations is always unlocked, in the app and in the browser (the ?mine= list is ignored)
const mine = null;
const owns = id => true;
function refreshMenu() {
  document.querySelectorAll('.cell').forEach(c => { const id = +c.dataset.id; c.classList.toggle('you', id === selYou); c.classList.toggle('rival', id === selRival); c.classList.toggle('locked', !owns(id)); });
  $('slotYou').classList.toggle('act', activeSlot === 'you'); $('slotRival').classList.toggle('act', activeSlot === 'rival');
  for (const [slot, id, isAI] of [['You', selYou, false], ['Rival', selRival, true]]) {
    const p = dexById(id), k = buildKit(p);
    $('s' + slot + 'Img').src = spriteUrl(p); $('slot' + slot).style.setProperty('--tc', TYPE_HEX[p.types[0]]);
    $('s' + slot + 'Name').innerHTML = `<small>#${String(id).padStart(3, '0')}</small>${nm(p.name)}`; $('s' + slot + 'Types').innerHTML = tags(p.types); $('s' + slot + 'Stats').innerHTML = statRows(p);
    $('s' + slot + 'Moves').innerHTML = moveIcons(k, specsFor(p, isAI));
  }
  const ya = dexById(selYou), yb = dexById(selRival); $('menu').style.setProperty('--a', TYPE_HEX[ya.types[0]] || '#3a4a7a'); $('menu').style.setProperty('--b', TYPE_HEX[yb.types[0]] || '#3a4a7a'); $('mBg').style.backgroundImage = menuBgUrl();
  $('matchup').innerHTML = matchup(ya, yb);
  $('arenaName').textContent = curTheme.name; $('arenaPrev').style.backgroundImage = curTheme.file ? `url(assets/bg/${curTheme.file})` : 'linear-gradient(#5f3030,#d98a50)';
  [...$('diffRow').querySelectorAll('.chip')].forEach(b => b.classList.toggle('sel', b.textContent === selDiff));
  document.querySelectorAll('.sprchip').forEach(b => b.classList.toggle('sel', b.dataset.s === spriteStyle)); refreshPause();
}
const menuBgUrl = () => curTheme.file ? `url(assets/bg/${curTheme.file})` : 'linear-gradient(#5f3030,#d98a50)';
function fitSprite(im) { // whole-number pixel scaling so small Pok\u00e9mon fill the stage as much as big ones
  const t = +im.dataset.t || 165, h = im.naturalHeight || 40, w = im.naturalWidth || 40; let s = Math.max(1, Math.round(t / h));
  while (h * s > t * 1.25 && s > 1) s--; while (w * s > 270 && s > 1) s--; im.style.width = w * s + 'px'; im.style.height = h * s + 'px';
}
function openMoves() {
  const p = dexById(selYou), k = buildKit(p), need = Math.min(3, k.pool.length), tc = TYPE_HEX[p.types[0]] || '#3a4a7a';
  let sel = loadouts[p.id] && loadouts[p.id].length === need ? [...loadouts[p.id]] : k.pool.slice(0, need).map((_, i) => i);
  const pane = $('movesPane'); pane.style.setProperty('--a', tc); pane.style.setProperty('--b', '#4dec82'); $('mpBg').style.backgroundImage = menuBgUrl(); $('mpBox').style.setProperty('--tc', tc);
  $('mpImg').dataset.t = 120; $('mpImg').onload = () => fitSprite($('mpImg')); $('mpImg').src = spriteUrl(p);
  $('mpName').innerHTML = `<small>#${String(p.id).padStart(3, '0')}</small>${nm(p.name)}`; $('mpTypes').innerHTML = tags(p.types);
  const draw = () => {
    const keep = $('mpList').scrollTop;
    $('mpTitle').textContent = `${nm(p.name).toUpperCase()} \u00b7 CHOOSE ${need} SPECIALS`; $('mpCount').textContent = `${sel.length} / ${need}`;
    $('mpSlots').innerHTML = Array.from({ length: need }, (_, n) => sel[n] !== undefined ? `<div class="slot f"><i>${n + 1}</i>${ico(k.pool[sel[n]].icon)}</div>` : '<div class="slot">+</div>').join('');
    $('mpList').innerHTML = k.pool.map((s, i) => { const n = sel.indexOf(i); return `<div class="mp ${n >= 0 ? 'sel' : ''}" data-i="${i}" style="--c:${TYPE_HEX[s.type] || '#888'}"><div class="ic">${ico(s.icon)}</div><div class="tx"><b>${s.name}<span class="tag" style="background:${TYPE_HEX[s.type] || '#888'}">${s.type.toUpperCase()}</span></b><small>${DESC[s.key]}</small></div><em>STAMINA ${s.sta}</em><div class="eye" title="Preview">${EYE}</div>${n >= 0 ? `<div class="ck">${n + 1}</div>` : ''}</div>`; }).join('');
    $('mpList').scrollTop = keep;
    $('mpList').querySelectorAll('.mp').forEach(el => el.onclick = e => { const i = +el.dataset.i; if (e.target.closest('.eye')) { openPreview(p, i); return; } if (sel.includes(i)) { if (sel.length > 1) sel = sel.filter(x => x !== i); } else { sel.push(i); if (sel.length > need) sel.shift(); } draw(); });
  };
  draw(); $('mpList').scrollTop = 0; pane.classList.add('on');
  $('mpBack').onclick = () => { pane.classList.remove('on'); refreshMenu(); if (NETG.lobby) NETG.refresh(); };
  $('mpDone').onclick = () => { if (sel.length === need) { loadouts[p.id] = sel; try { localStorage.setItem('pf_loadouts', JSON.stringify(loadouts)); } catch (e) { } } pane.classList.remove('on'); refreshMenu(); if (NETG.lobby) NETG.refresh(); };
}
// ---- move preview dialog: the eye button on a move opens a small window that runs this same game in ?preview mode (see the end of this file)
const EYE = '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 4.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5zm0 12.5a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/></svg>';
let pvReady = false, pvTimer = 0;
const pvSend = m => { const w = $('pvFrame').contentWindow; if (w) w.postMessage(Object.assign({ pf: 'pv' }, m), '*'); };
function pvBtn(busy) { const b = $('pvPlay'); b.disabled = busy; b.innerHTML = busy ? 'PLAYING\u2026' : '\u25b6 PLAY'; clearTimeout(pvTimer); if (busy) pvTimer = setTimeout(() => pvBtn(false), 7000); }
function openPreview(p, i) {
  const s = buildKit(p).pool[i], fr = $('pvFrame'), c = TYPE_HEX[s.type] || '#888';
  $('pvTitle').innerHTML = `${nm(p.name).toUpperCase()} \u00b7 <span style="color:${c}">${s.name.toUpperCase()}</span>`;
  $('pvInfo').innerHTML = `<span class="tag" style="background:${c}">${s.type.toUpperCase()}</span>${DESC[s.key]}`;
  $('pvModal').classList.add('on'); pvBtn(false);
  if (!pvReady) { $('pvLoad').style.display = ''; fr.src = `index.html?preview=1&p=${p.id}&mv=${i}`; } else pvSend({ id: p.id, mv: i });
}
function closePreview() { $('pvModal').classList.remove('on'); pvBtn(false); pvSend({ cmd: 'pause' }); }
$('pvClose').onclick = closePreview; $('pvPlay').onclick = () => { pvBtn(true); pvSend({ cmd: 'play' }); };
addEventListener('message', e => {
  if (e.source !== $('pvFrame').contentWindow || !e.data) return;
  if (e.data.pf === 'pool') { pvReady = true; $('pvLoad').style.display = 'none'; } else if (e.data.pf === 'done') pvBtn(false);
});
let screenName = 'title', themeIdx = 0;
function showScreen(n) {
  vsWait = false; screenName = n; state = 'menu'; cine = null; demo = demoUrl; document.body.classList.remove('watch'); $('cine').classList.remove('on'); $('msg').classList.remove('on');
  for (const id of ['title', 'menu', 'over', 'pause', 'opts', 'movesPane', 'labPane', 'tourPane', 'netPane']) $(id).classList.toggle('on', id === n);
  $('pickPane').classList.remove('on');
  if (n === 'title') { const a = POKEDEX[Math.floor(Math.random() * POKEDEX.length)], b = POKEDEX[Math.floor(Math.random() * POKEDEX.length)]; $('tImgA').src = spriteUrl(a); $('tImgB').src = spriteUrl(b); }
  if (n === 'menu') refreshMenu();
  if (n === 'title') refreshTourBtn();
  if (n === 'title' && window.__refreshPts) window.__refreshPts();
}
const setThemeIdx = i => { themeIdx = (i + THEMES.length) % THEMES.length; setTheme(THEMES[themeIdx]); refreshMenu(); };
let pickSlot = 'you', pickType = '', pickQ = '', pickGen = '', pickPg = -1;
const PICK_PAGE = 15; // 5 x 3 cards per page keeps the picker light: only 15 sprites exist at a time
const pgNums = (c, n) => { const a = [...new Set([0, n - 1, c - 1, c, c + 1])].filter(i => i >= 0 && i < n).sort((x, y) => x - y), out = []; a.forEach((i, k) => { if (k && i - a[k - 1] > 1) out.push('\u2026'); out.push(i); }); return out; };
function drawPicker() { // one page of 15 cards, filtered by the search text, the generation and the type chip
  const q = pickQ.trim().toLowerCase().replace(/^#/, ''), curYou = pickSlot === 'lab' ? labId : selYou, curRival = pickSlot === 'lab' || pickSlot === 'tour' ? 0 : selRival;
  const list = POKEDEX.filter(p => (!pickGen || (p.id <= 151 ? 1 : p.id <= 251 ? 2 : 3) === +pickGen) && (!pickType || p.types.includes(pickType)) && (!q || p.name.includes(q) || nm(p.name).toLowerCase().includes(q) || String(p.id).padStart(3, '0').includes(q))).sort((a, b) => ((pickSlot === 'you' || pickSlot === 'tour') ? owns(b.id) - owns(a.id) : 0) || a.id - b.id);
  const pages = Math.max(1, Math.ceil(list.length / PICK_PAGE));
  if (pickPg < 0) { const at = list.findIndex(p => p.id === (pickSlot === 'rival' ? curRival : curYou)); pickPg = at < 0 ? 0 : Math.floor(at / PICK_PAGE); } // open on the page of the current pick
  pickPg = clamp(pickPg, 0, pages - 1);
  const shown = list.slice(pickPg * PICK_PAGE, (pickPg + 1) * PICK_PAGE);
  $('pkGrid').innerHTML = shown.length ? shown.map(p => `<div class="pk${p.id === curYou ? ' you' : ''}${p.id === curRival ? ' rival' : ''}${(pickSlot === 'you' || pickSlot === 'tour') && !owns(p.id) ? ' locked' : ''}" data-id="${p.id}" style="--tc:${TYPE_HEX[p.types[0]]}"><span class="pid">#${String(p.id).padStart(3, '0')}</span>${p.id === curYou ? '<span class="bdg">YOU</span>' : ''}${p.id === curRival ? '<span class="bdg r">RIVAL</span>' : ''}<img src="${stillUrl(p)}" data-t="96" onload="fitSprite(this)" onerror="this.onerror=null;this.src='${spriteUrl(p)}'" alt=""><div class="pn">${nm(p.name)}</div><div class="tags">${tags(p.types)}</div></div>`).join('') : '<div id="pkNone">No Pokémon match</div>';
  $('pkCount').textContent = (pickSlot === 'you' || pickSlot === 'tour') && mine ? `${list.filter(p => owns(p.id)).length} caught \u00b7 ${list.length} shown` : `${list.length} Pokémon`;
  $('pkPager').innerHTML = pages > 1 ? `<button class="pgb" data-pg="${pickPg - 1}"${pickPg === 0 ? ' disabled' : ''}>\u2039</button>` + pgNums(pickPg, pages).map(i => i === '\u2026' ? '<span class="pgd">\u2026</span>' : `<button class="pgb${i === pickPg ? ' sel' : ''}" data-pg="${i}">${i + 1}</button>`).join('') + `<button class="pgb" data-pg="${pickPg + 1}"${pickPg >= pages - 1 ? ' disabled' : ''}>\u203a</button><span id="pkPg">Page ${pickPg + 1} / ${pages}</span>` : '';
}
function openPicker(slot) { pickSlot = slot; if (slot !== 'lab' && slot !== 'tour') activeSlot = slot; $('pkTitle').textContent = slot === 'you' ? 'CHOOSE YOUR FIGHTER' : slot === 'tour' ? 'CHOOSE YOUR TOURNAMENT FIGHTER' : slot === 'lab' ? 'CHOOSE A POK\u00c9MON FOR THE LAB' : 'CHOOSE THE RIVAL'; $('pickPane').classList.add('on'); pickPg = -1; drawPicker(); $('pkGrid').scrollTop = 0; }
function closePicker() { $('pickPane').classList.remove('on'); if (pickSlot === 'lab') refreshLab(); else { refreshMenu(); if (NETG.lobby) NETG.refresh(); } }
function buildMenu() {
  const types18 = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
  $('pkTypes').innerHTML = [['', 'ALL GENS', '#5b6cff'], ['1', 'GEN 1', '#e0563a'], ['2', 'GEN 2', '#2fb4c4'], ['3', 'GEN 3', '#3fbf7a']].map(([g, l, c]) => `<span class="tchip gen${g === pickGen ? ' sel' : ''}" data-g="${g}" style="--t:${c}">${l}</span>`).join('') + '<span class="tsep"></span>'
    + ['', ...types18].map(t => `<span class="tchip${t === pickType ? ' sel' : ''}" data-t="${t}"${t ? ` style="--t:${TYPE_HEX[t]}"` : ' style="--t:#5b6cff"'}>${t ? t.toUpperCase() : 'ALL TYPES'}</span>`).join('');
  $('pkTypes').onclick = e => {
    const c = e.target.closest('.tchip'); if (!c) return;
    if (c.dataset.g !== undefined) { pickGen = c.dataset.g; document.querySelectorAll('#pkTypes .gen').forEach(x => x.classList.toggle('sel', x === c)); }
    else { pickType = c.dataset.t; document.querySelectorAll('#pkTypes .tchip:not(.gen)').forEach(x => x.classList.toggle('sel', x === c)); }
    pickPg = 0; drawPicker(); $('pkGrid').scrollTop = 0;
  };
  $('pkPager').onclick = e => { const b = e.target.closest('.pgb'); if (!b || b.disabled) return; pickPg = +b.dataset.pg; drawPicker(); $('pkGrid').scrollTop = 0; };
  $('pkSearch').oninput = e => { pickQ = e.target.value; pickPg = 0; drawPicker(); $('pkGrid').scrollTop = 0; };
  $('pkClose').onclick = closePicker;
  $('pkGrid').onclick = e => {
    const c = e.target.closest('.pk'); if (!c) return; const p = dexById(+c.dataset.id);
    if (pickSlot === 'lab') { if (labId !== p.id) { labId = p.id; labAb = 'own'; labSel = null; } closePicker(); return; }
    if (pickSlot === 'tour') { if (!owns(p.id)) { $('pkTitle').textContent = `${nm(p.name)} is not in your collection yet`; setTimeout(() => { $('pkTitle').textContent = 'CHOOSE YOUR TOURNAMENT FIGHTER'; }, 1600); return; } closePicker(); newTournament(p.id); return; }
    if (pickSlot === 'you') { if (!owns(p.id)) { $('pkTitle').textContent = `${nm(p.name)} is not in your collection yet`; setTimeout(() => { $('pkTitle').textContent = 'CHOOSE YOUR FIGHTER'; }, 1600); return; } selYou = p.id; activeSlot = 'rival'; } else selRival = p.id;
    closePicker();
  };
  $('pickYou').onclick = e => { e.stopPropagation(); openPicker('you'); }; $('pickRival').onclick = e => { e.stopPropagation(); openPicker('rival'); };
  [$('sYouImg'), $('sRivalImg'), $('labImg')].forEach(im => { im.dataset.t = im.id === 'labImg' ? 130 : 165; im.onload = () => fitSprite(im); });
  $('slotYou').onclick = () => openPicker('you'); $('slotRival').onclick = () => openPicker('rival');
  $('movesBtn').onclick = e => { e.stopPropagation(); openMoves(); };
  $('randYou').onclick = e => { e.stopPropagation(); const pool = mine && mine.size ? [...mine] : POKEDEX.map(p => p.id); selYou = pool[Math.floor(Math.random() * pool.length)]; activeSlot = 'you'; refreshMenu(); };
  $('randBtn').onclick = e => { e.stopPropagation(); selRival = 1 + Math.floor(Math.random() * POKEDEX.length); activeSlot = 'rival'; refreshMenu(); };
  $('arPrev').onclick = e => { e.stopPropagation(); setThemeIdx(themeIdx - 1); }; $('arNext').onclick = e => { e.stopPropagation(); setThemeIdx(themeIdx + 1); };
  const dr = $('diffRow'); Object.keys(DIFF).forEach(n => { const b = document.createElement('button'); b.className = 'chip'; b.textContent = n; b.onclick = () => { selDiff = n; refreshMenu(); }; dr.appendChild(b); });
  $('goBtn').onclick = () => {
    if (!owns(selYou)) { $('note').textContent = mine.size ? 'Pick one of your caught Pok\u00e9mon as YOU.' : 'Catch a first-generation Pok\u00e9mon with a Pok\u00e9 Ball first.'; return; }
    audio(); startMatch();
  };
  $('againBtn').onclick = () => (NETG.on ? NETG.rematch() : tourOn ? openTour() : startMatch(demo && !demoUrl ? { watch: true } : undefined));
  $('watchBtn').onclick = () => { // your picked Pokémon and its moves, against the rival, both played by the AI
    if (!owns(selYou)) { $('note').textContent = mine.size ? 'Pick one of your caught Pokémon as YOU.' : 'Catch a first-generation Pokémon with a Poké Ball first.'; return; }
    audio(); startMatch({ watch: true });
  };
  $('menuBtn').onclick = toMenu;
  $('gear').onclick = togglePause; $('tExit').onclick = exitGame;
  $('tPlay').onclick = () => { audio(); showScreen('menu'); };
  $('tQuick').onclick = () => { audio(); if (!owns(selYou)) { showScreen('menu'); return; } selRival = 1 + Math.floor(Math.random() * POKEDEX.length); startMatch(); };
  $('optVibe').onclick = () => { vibeOn = !vibeOn; try { localStorage.setItem('pf_vibe', vibeOn ? '1' : '0'); } catch (e) { } refreshPause(); buzz(40); };
  $('tPractice').onclick = () => { audio(); if (!owns(selYou)) { showScreen('menu'); return; } startMatch({ practice: true }); };
  $('dummyBtn').onclick = () => { dummyMode = (dummyMode + 1) % 3; $('dummyBtn').textContent = 'DUMMY: ' + ['IDLE', 'GUARD', 'FIGHTS BACK'][dummyMode]; };
  document.querySelectorAll('.rndchip').forEach(b => b.onclick = () => setRounds(+b.dataset.r)); setRounds(bestOf);
  $('tOpts').onclick = $('optBtn').onclick = () => { refreshPause(); $('opts').classList.add('on'); $('optScroll').scrollTop = 0; optSpy(); };
  $('optClose').onclick = $('optBack').onclick = () => $('opts').classList.remove('on'); settingsInit();
  $('optScroll').addEventListener('scroll', optSpy);
  document.querySelectorAll('.otab').forEach(t => t.onclick = () => $(t.dataset.t).scrollIntoView({ behavior: 'smooth', block: 'start' }));
  let rstT = 0;
  $('optReset').onclick = () => { // two taps so it can't happen by accident
    const b = $('optReset');
    if (!rstT) { b.textContent = 'TAP AGAIN TO CONFIRM'; rstT = setTimeout(() => { rstT = 0; b.textContent = 'RESTORE DEFAULTS'; }, 3000); return; }
    clearTimeout(rstT); rstT = 0; b.textContent = 'RESTORED';  setTimeout(() => { b.textContent = 'RESTORE DEFAULTS'; }, 1500);
    volMus = volFx = 70; applyVol(); GM.dmg = GM.sta = GM.ki = 1; saveS(); muted = false; musicOn = true; vibeOn = true; musSel = 'random'; spriteStyle = 'bw'; setRounds(3); setFps(60); setFx(false);
    setControls(matchMedia('(pointer:coarse)').matches ? 'mobile' : 'pc');
    try { for (const k of ['pf_mute', 'pf_music', 'pf_vibe', 'pf_track', 'pf_sprite2', 'pf_ctl', 'pf_rounds', 'pf_fps', 'pf_fx']) localStorage.removeItem(k); } catch (e) { }
    if (MUS.inB) { musEl.idx = pickMusic(); musEl.last = musEl.idx; }
    refreshMenu();
  };
  $('backBtn').onclick = () => showScreen('title');
  $('pSettings').onclick = () => $('tOpts').onclick(); $('resumeBtn').onclick = togglePause; $('restartBtn').onclick = () => startMatch({ practice, lab, tour: tourOn }); $('selectBtn').onclick = toMenu; $('quitBtn').onclick = exitGame;
  $('optSound').onclick = $('mSound').onclick = () => { muted = !muted; try { localStorage.setItem('pf_mute', muted ? '1' : '0'); } catch (e) { } refreshPause(); };
  $('optTrack').onclick = cycleTrack;
$('optMusic').onclick = $('mMusic').onclick = () => { musicOn = !musicOn; try { localStorage.setItem('pf_music', musicOn ? '1' : '0'); } catch (e) { } refreshPause(); };
  document.addEventListener('pointerdown', () => audio(), true);
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('button, .chip, .pk, .card, .tchip, .mp')) sfx('ui'); }, true);
  document.querySelectorAll('.ctlchip').forEach(b => b.onclick = () => setControls(b.dataset.m));
  document.querySelectorAll('.sprchip').forEach(b => b.onclick = () => { spriteStyle = b.dataset.s; try { localStorage.setItem('pf_sprite2', spriteStyle); } catch (e) { } refreshMenu(); });
  refreshMenu();
}
// ---------------------------------------------------------------- practise moves: a lone fighter with infinite stamina to try any Pokémon's moves and abilities
const LAB_ABILS = Object.entries({ ...ABIL_FX, sturdy: { sturdy: 1 }, 'gale-wings': { gale: 1 } }).map(([slug, fx]) => ({ slug, ab: { name: prettyAb(slug), ...fx } })).sort((a, b) => a.ab.name.localeCompare(b.ab.name));
const labAbility = p => labAb === 'own' ? abilityFor(p.types, p.id) : (LAB_ABILS.find(a => a.slug === labAb) || { ab: abilityFor(p.types, p.id) }).ab;
const FX_DESC = { boost: 'Own-type moves hit 50% harder (always on while practising)', contact: 'Contact hits can inflict a status', armor: 'Takes less damage', nocrit: 'Cannot be hit critically', atk: 'Hits harder', focus: 'Cannot flinch or be confused', immune: 'Immune to a status', guts: 'Hits 20% harder while it has a status', multi: 'Half damage while at full HP', resist: 'Resists some types', scale: 'Takes less damage while it has a status', dust: 'Shrugs off move side-effects', cure: 'Cures its own statuses over time', regen: 'Recovers stamina faster', intim: 'Weakens the foe as the fight starts', levi: 'Ground moves miss it', trace: 'Copies the foe\'s ability', pressure: 'Drains foe stamina when they use specials', sync: 'Passes poison, burn and slow back', absorb: 'Absorbs one type to heal', wx: 'Faster in its favourite weather', crit: 'Better critical-hit chance', serene: 'Status effects twice as likely', early: 'Wakes from sleep sooner', gale: 'Dashes cost half the stamina', trap: 'The foe cannot dash', nodebuff: 'Immune to weakening', sturdy: 'Survives a knockout blow from high HP' };
function refreshLab() {
  const p = dexById(labId), k = buildKit(p), need = Math.min(3, k.pool.length);
  if (!labSel || labSel.length !== need) labSel = loadouts[p.id] && loadouts[p.id].length === need ? [...loadouts[p.id]] : k.pool.slice(0, need).map((_, i) => i);
  $('labImg').src = spriteUrl(p); $('labCard').style.setProperty('--tc', TYPE_HEX[p.types[0]]);
  $('labName').innerHTML = `<small>#${String(p.id).padStart(3, '0')}</small>${nm(p.name)}`; $('labTypes').innerHTML = tags(p.types);
  $('labFixed').innerHTML = [k.melee, k.ranged, k.beam].map(m => `<div class="mi" title="${m.name}">${ico(m.icon)}</div>`).join('');
  $('labMoves').innerHTML = k.pool.map((s, i) => `<div class="lm${labSel.includes(i) ? ' sel' : ''}" data-i="${i}"><span class="ic">${ico(s.icon)}</span><div><b>${s.name}</b><small>${DESC[s.key]}</small></div><div class="eye" title="Preview">${EYE}</div><i>${labSel.includes(i) ? labSel.indexOf(i) + 1 : ''}</i></div>`).join('');
  const own = abilityFor(p.types, p.id), cur = labAb === 'own' ? own : labAbility(p);
  $('labAbs').innerHTML = `<span class="chip${labAb === 'own' ? ' sel' : ''}" data-a="own">${own.name} (own)</span>` + LAB_ABILS.map(a => `<span class="chip${labAb === a.slug ? ' sel' : ''}" data-a="${a.slug}">${a.ab.name}</span>`).join('');
  const fk = Object.keys(cur).find(x => x !== 'name'); $('labAbDesc').textContent = `${cur.name}: ${FX_DESC[fk] || 'No special effect'}`;
}
function buildLab() {
  $('labMoves').onclick = e => {
    const el = e.target.closest('.lm'); if (!el) return; const p = dexById(labId), need = Math.min(3, buildKit(p).pool.length), i = +el.dataset.i;
    if (e.target.closest('.eye')) { openPreview(p, i); return; }
    if (labSel.includes(i)) { if (labSel.length > 1) labSel = labSel.filter(x => x !== i); } else { labSel.push(i); if (labSel.length > need) labSel.shift(); }
    refreshLab();
  };
  $('labAbs').onclick = e => { const c = e.target.closest('.chip'); if (!c) return; labAb = c.dataset.a; refreshLab(); };
  $('labPick').onclick = () => openPicker('lab');
  $('labBack').onclick = () => showScreen('title');
  $('labGo').onclick = () => {
    const p = dexById(labId); if (labSel.length === Math.min(3, buildKit(p).pool.length)) { loadouts[p.id] = [...labSel]; try { localStorage.setItem('pf_loadouts', JSON.stringify(loadouts)); } catch (e) { } }
    audio(); startMatch({ lab: true });
  };
  $('tLab').onclick = () => { audio(); labId = selYou; labAb = 'own'; labSel = null; showScreen('labPane'); refreshLab(); };
}
function labGhost(dt) { // keeps the invisible target unbreakable and in front of the player, whichever way they turn
  const t = E; P.sta = 100; P.ki = 100; t.hp = t.maxhp; t.dead = false; t.hitT = 0; t.act = null; t.sleepT = t.freezeT = t.poisonT = t.burnT = t.slowT = t.confT = 0; t.kvx = t.vx = 0; t.z = t.vz = 0; t.inv = 0; t.guarding = false; t.under = false; t.counterT = 0; t.shieldT = 0; t.sta = 100;
  const dx = t.x - P.x, side = dx >= 0 ? 1 : -1, off = Math.abs(dx); labFlip = P.face !== side ? labFlip + dt : 0;
  if (off > 650 || off < 140 || labFlip > .5) {
    labFlip = 0; let s = P.face || 1, nx = P.x + s * 400;
    if (nx < WALL_L + 100 || nx > WALL_R - 100) { s = -s; nx = P.x + s * 400; }
    t.x = clamp(nx, WALL_L + 100, WALL_R - 100);
  }
}
let ctl = 'pc', resumeState = 'fight';
function setControls(mode) {
  ctl = mode; try { localStorage.setItem('pf_ctl', mode); } catch (e) { }
  $('touch').style.display = mode === 'mobile' ? '' : 'none'; $('legend').style.display = mode === 'mobile' ? 'none' : ''; document.body.classList.toggle('mob', mode === 'mobile');
  document.querySelectorAll('.ctlchip').forEach(b => b.classList.toggle('sel', b.dataset.m === mode));
}
function refreshPause() { syncSettings(); $('mSound').innerHTML = ico(muted ? 'volume-off' : 'volume-high'); $('mMusic').innerHTML = ico('music'); $('mMusic').classList.toggle('off', !musicOn); $('optTrack').textContent = trackName() + ' \u203A'; optSwitches(); }
function optSwitches() { // settings screen: switches show state, dependent rows grey out
  $('optSound').classList.toggle('on', !muted); $('optMusic').classList.toggle('on', musicOn); $('optVibe').classList.toggle('on', vibeOn);
  $('rMus').classList.toggle('dim', muted); $('rTrack').classList.toggle('dim', muted || !musicOn); $('rVm').classList.toggle('dim', muted || !musicOn); $('rVf').classList.toggle('dim', muted);
}
function optSpy() {
  const sc = $('optScroll'), secs = [...sc.querySelectorAll('section')]; let id = secs[0].id;
  const end = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4;
  if (end) id = secs[secs.length - 1].id; else for (const s of secs) if (s.offsetTop <= sc.scrollTop + 40) id = s.id;
  document.querySelectorAll('.otab').forEach(t => t.classList.toggle('on', t.dataset.t === id));
  $('optCur').textContent = $(id).querySelector('h2').textContent; $('optFade').style.opacity = end ? 0 : 1;
}
function togglePause() {
  if (NETG.on) { refreshPause(); $('pause').classList.toggle('on'); return; } // online the match never stops: the menu just sits on top of it
  if (state === 'pause') { state = resumeState; $('pause').classList.remove('on'); return; }
  if (state === 'fight' || state === 'intro' || state === 'ko') { resumeState = state; state = 'pause'; refreshPause(); $('pause').classList.add('on'); }
}
// ---------------------------------------------------------------- tournament: 8 fighters in a bracket, one loss and you are out
const TOUR_KEY = 'pf_tour', TOUR_ROUNDS = ['QUARTER-FINAL', 'SEMI-FINAL', 'FINAL'];
let tour = null, tourOn = false;
try { const t = JSON.parse(localStorage.getItem(TOUR_KEY) || 'null'); if (t && !t.over && Array.isArray(t.ent) && t.ent.length === 8 && Array.isArray(t.win) && t.win.length === 3) tour = t; } catch (e) { }
const tourSave = () => { try { if (tour && !tour.over) localStorage.setItem(TOUR_KEY, JSON.stringify(tour)); else localStorage.removeItem(TOUR_KEY); } catch (e) { } };
const tourHp = () => tourOn && tour ? 1 + .06 * tour.round : 1; // later rounds are only a little tougher
const tourEnt = r => r === 0 ? tour.ent : tour.win[r - 1];
const tourEdge = (a, b) => Math.max(...a.types.map(t => effect(t, b.types)));
function tourSim(ia, ib) { // computer vs computer: base stats and type matchup, with plenty of luck
  const a = dexById(ia), b = dexById(ib), bst = p => p.hp + p.atk + p.def + p.spa + p.spd + p.spe;
  const sc = (x, y) => bst(x) * (.75 + Math.random() * .5) * (1 + .12 * clamp(tourEdge(x, y) - tourEdge(y, x), -2, 2));
  return sc(a, b) >= sc(b, a) ? ia : ib;
}
function tourPlayerMatch() {
  const e = tourEnt(tour.round);
  for (let i = 0; i < e.length; i += 2) if (e[i] === tour.you || e[i + 1] === tour.you) return { i: i / 2, opp: e[i] === tour.you ? e[i + 1] : e[i] };
  return null;
}
function newTournament(you) {
  const pool = POKEDEX.map(p => p.id).filter(id => id !== you);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const ent = pool.slice(0, 7); ent.splice(Math.floor(Math.random() * 8), 0, you);
  tour = { you, ent, win: [[0, 0, 0, 0], [0, 0], [0]], round: 0, over: null, champ: 0 }; tourOn = false; tourSave(); openTour();
}
function tourResolve(playerWon) { // record the player's match and play out everyone else; once the player is out the whole bracket is decided
  const pm = tourPlayerMatch(), simRound = r => { const en = tourEnt(r); for (let i = 0; i < en.length; i += 2) if (!tour.win[r][i / 2]) tour.win[r][i / 2] = tourSim(en[i], en[i + 1]); };
  tour.win[tour.round][pm.i] = playerWon ? tour.you : pm.opp; simRound(tour.round);
  if (!playerWon) { for (let r = tour.round + 1; r < 3; r++) simRound(r); tour.over = 'out'; tour.champ = tour.win[2][0]; }
  else if (tour.round === 2) { tour.over = 'champ'; tour.champ = tour.you; }
  else { tour.round++; VAR.perkOffer(); }
  tourSave();
}
function tourEnd(win) { // the result is stored right away; CONTINUE only opens the bracket
  tourResolve(win); $('againBtn').textContent = 'CONTINUE'; $('menuBtn').style.display = 'none';
  if (tour.over === 'champ') $('overS').textContent += ' You won the tournament!'; else if (tour.over === 'out') $('overS').textContent += ' You are out of the tournament.';
}
function openTour() { showScreen('tourPane'); drawTour(); }
function drawTour() {
  const CW = 196, CH = 32, X = [18, 258, 498, 738], names = ['QUARTER-FINALS', 'SEMI-FINALS', 'FINAL', 'CHAMPION'];
  const ys = [Array.from({ length: 8 }, (_, i) => 22 + i * 38 + CH / 2)];
  for (let l = 1; l < 4; l++) ys.push(Array.from({ length: 8 >> l }, (_, i) => (ys[l - 1][2 * i] + ys[l - 1][2 * i + 1]) / 2));
  const lev = [tour.ent, tour.win[0], tour.win[1], tour.win[2]], pm = tour.over ? null : tourPlayerMatch(), nameOf = id => nm(dexById(id).name);
  let svg = '', cells = names.map((n, l) => `<div class="tbh" style="left:${X[l]}px">${n}</div>`).join('');
  lev.forEach((ids, l) => ids.forEach((id, k) => {
    const nxt = l < 3 ? lev[l + 1][k >> 1] : 0, adv = !!id && nxt === id, lost = !!id && !!nxt && nxt !== id;
    if (l < 3) { const x1 = X[l] + CW, x2 = X[l + 1], xm = (x1 + x2) / 2; svg += `<path d="M${x1} ${ys[l][k]}H${xm}V${ys[l + 1][k >> 1]}H${x2}"${adv ? ' class="adv"' : ''}/>`; }
    const p = id ? dexById(id) : null, now = !!pm && l === tour.round && (k >> 1) === pm.i;
    cells += `<div class="tbc${id === tour.you ? ' you' : ''}${lost ? ' lost' : ''}${now ? ' cur' : ''}${l === 3 && id ? ' champ' : ''}" style="left:${X[l]}px;top:${ys[l][k] - CH / 2}px;width:${CW}px;height:${CH}px">${p ? `<img src="assets/icon/${p.name}.png" alt=""><span>${nm(p.name)}</span>` : '<span class="q">?</span>'}</div>`;
  }));
  $('tbTree').innerHTML = `<svg width="960" height="326">${svg}</svg>` + cells;
  if (tour.over) {
    $('tbSub').textContent = tour.over === 'champ' ? 'CHAMPION!' : 'ELIMINATED';
    $('tbMsg').textContent = tour.over === 'champ' ? `${nameOf(tour.you)} won the tournament!` : `${nameOf(tour.you)} lost in the ${TOUR_ROUNDS[tour.round].toLowerCase()}. ${nameOf(tour.champ)} won the tournament.`;
    $('tbGo').style.display = 'none'; $('tbNew').style.display = ''; $('tbOpt').style.display = 'none';
  } else {
    $('tbSub').textContent = TOUR_ROUNDS[tour.round]; $('tbMsg').textContent = `Next: ${nameOf(tour.you)} vs ${nameOf(pm.opp)}`;
    $('tbGo').style.display = ''; $('tbNew').style.display = 'none'; $('tbOpt').style.display = ''; VAR.perkUI();
  }
}
function refreshTourBtn() { const on = !!(tour && !tour.over); $('tTourRet').style.display = on ? 'flex' : 'none'; $('title').classList.toggle('tr', on); }
$('tTour').onclick = () => { audio(); openPicker('tour'); };
$('tTourRet').onclick = () => { audio(); if (tour && !tour.over) openTour(); };
$('tbBack').onclick = () => { tourOn = false; showScreen('title'); };
$('tbOpt').onclick = () => { audio(); tour = null; tourOn = false; tourSave(); refreshTourBtn(); showScreen('title'); }; // leaving for good: the next TOURNAMENT starts a fresh bracket
$('tbNew').onclick = () => openPicker('tour');
$('tbGo').onclick = () => { audio(); const pm = tour && !tour.over && tourPlayerMatch(); if (!pm) return; selYou = tour.you; selRival = pm.opp; startMatch({ tour: true }); };
refreshTourBtn();

// ---------------------------------------------------------------- arena cards: pick the background from a page of picture cards
const AR_PAGE = 12; let arPg = -1, procThumb = '';
const arThumb = t => t.proc ? (procThumb || (procThumb = procBg.toDataURL('image/jpeg', .7))) : `assets/bg/t/${t.file.replace(/\.\w+$/, '')}.jpg`;
function drawArenas() {
  const pages = Math.ceil(THEMES.length / AR_PAGE); if (arPg < 0) arPg = Math.floor(themeIdx / AR_PAGE); arPg = clamp(arPg, 0, pages - 1);
  const from = arPg * AR_PAGE;
  $('arGrid').innerHTML = THEMES.slice(from, from + AR_PAGE).map((t, k) => `<div class="ar${from + k === themeIdx ? ' sel' : ''}" data-i="${from + k}"><img src="${arThumb(t)}" alt=""><b>${t.name}</b>${from + k === themeIdx ? '<i>SELECTED</i>' : ''}</div>`).join('');
  $('arCount').textContent = `${THEMES.length} arenas`;
  $('arPager').innerHTML = pages > 1 ? `<button class="pgb" data-pg="${arPg - 1}"${arPg === 0 ? ' disabled' : ''}>\u2039</button>` + pgNums(arPg, pages).map(i => i === '\u2026' ? '<span class="pgd">\u2026</span>' : `<button class="pgb${i === arPg ? ' sel' : ''}" data-pg="${i}">${i + 1}</button>`).join('') + `<button class="pgb" data-pg="${arPg + 1}"${arPg >= pages - 1 ? ' disabled' : ''}>\u203a</button><span id="arPg">Page ${arPg + 1} / ${pages}</span>` : '';
}
$('arenaPrev').onclick = () => { arPg = -1; drawArenas(); $('arenaPane').classList.add('on'); };
$('arClose').onclick = () => $('arenaPane').classList.remove('on');
$('arGrid').onclick = e => { const c = e.target.closest('.ar'); if (!c) return; themeIdx = +c.dataset.i; setTheme(THEMES[themeIdx]); $('arenaPane').classList.remove('on'); refreshMenu(); if (NETG.lobby && NETG.refresh) NETG.refresh(); };
$('arPager').onclick = e => { const b = e.target.closest('.pgb'); if (!b || b.disabled) return; arPg = +b.dataset.pg; drawArenas(); };

function toMenu() { if (NETG.on) { NETG.leave(); return; } if (tourOn) { openTour(); return; } if (lab) { showScreen('labPane'); refreshLab(); } else showScreen('menu'); }
function exitGame() { if (window.PF && window.PF.exit) window.PF.exit(); else { try { window.close(); } catch (e) { } location.href = 'about:blank'; } }
// ---------------------------------------------------------------- how to play: the guide is its own page (howto.html) in a frame, loaded the first time it opens
let htReady = false, htWant = null;
function openHow() {
  $('htOffer').classList.remove('on'); const f = $('htFrame'); $('htBox').classList.add('on');
  if (!f.dataset.l) { f.dataset.l = '1'; const x = new XMLHttpRequest(); x.open('GET', 'howto.html'); x.onload = () => { f.srcdoc = x.responseText; }; x.onerror = () => { f.src = 'howto.html'; }; x.send(); } // inline (srcdoc): the phone's WebView does not always load file frames by URL
  const go = () => { f.contentWindow.postMessage({ htcmd: 'open', touch: document.body.classList.contains('mob') }, '*'); f.contentWindow.focus(); };
  if (htReady) go(); else htWant = go;
}
addEventListener('message', e => { const d = e.data; if (!d || !d.ht) return; if (d.ht === 'ready') { htReady = true; if (htWant) { htWant(); htWant = null; } } else if (d.ht === 'close') { $('htBox').classList.remove('on'); window.focus(); } });
$('tHow').onclick = () => { audio(); openHow(); }; $('pHow').onclick = openHow; $('htGo').onclick = openHow; $('htNo').onclick = () => $('htOffer').classList.remove('on');
const fmtPts = n => n >= 1e7 ? Math.floor(n / 1e6) + 'M' : n >= 1e4 ? Math.floor(n / 1e3) + 'K' : String(n); // the Poké Ball button shows the points kept by the app
window.__refreshPts = () => { try { if (window.PF && window.PF.wallet) $('tBallPts').textContent = fmtPts(window.PF.wallet()); } catch (e) { } };
if (window.PF && window.PF.openBalls) { $('tBalls').style.display = 'flex'; window.__refreshPts(); }
$('tBalls').onclick = () => { audio(); try { window.PF.openBalls(); } catch (e) { } };
window.__back = () => {
  if ($('htBox').classList.contains('on')) { $('htFrame').contentWindow.postMessage({ htcmd: 'back' }, '*'); return; }
  if ($('htOffer').classList.contains('on')) { $('htOffer').classList.remove('on'); return; }
  if ($('pvModal').classList.contains('on')) closePreview(); else if ($('opts').classList.contains('on')) $('opts').classList.remove('on'); else if ($('pickPane').classList.contains('on')) closePicker(); else if ($('movesPane').classList.contains('on')) $('mpDone').onclick();
  else if (state === 'menu') { if (screenName === 'title') exitGame(); else if (screenName === 'netPane') NETG.leave(); else showScreen('title'); } else if (state === 'over') toMenu(); else togglePause();
};
const byName = s => { const n = +s; if (n) return n; const p = POKEDEX.find(p => p.name === String(s).toLowerCase()); return p ? p.id : 0; };
buildMenu(); buildLab(); setTheme(THEMES[0]);
if (mine && !owns(selYou)) selYou = [...mine][0] || selYou;
if (q.get('p')) selYou = byName(q.get('p')) || selYou;
if (q.get('rival')) selRival = byName(q.get('rival')) || selRival;
if (q.get('diff') && DIFF[q.get('diff')]) selDiff = q.get('diff');
if (q.get('bg')) { const i = THEMES.findIndex(t => t.id === q.get('bg')); if (i >= 0) { themeIdx = i; setTheme(THEMES[i]); } }
let savedCtl = null; try { savedCtl = localStorage.getItem('pf_ctl'); } catch (e) { }
setControls(q.has('touch') ? 'mobile' : savedCtl || (matchMedia('(pointer:coarse)').matches ? 'mobile' : 'pc'));
if (q.has('app')) $('tExit').style.display = 'block';
document.querySelectorAll('[data-ic]').forEach(e => e.insertAdjacentHTML('afterbegin', ico(e.dataset.ic)));
  showScreen('title'); refreshPause(); refreshMenu(); requestAnimationFrame(frame);
$('tSil').addEventListener('animationiteration', pickSil); pickSil();
if (demo || q.has('go')) startMatch();
if (q.has('howto')) openHow(); else { try { if (!localStorage.getItem('pf_howto') && !demo && !q.has('go') && !q.has('open') && !q.has('preview')) { localStorage.setItem('pf_howto', '1'); setTimeout(() => { if (screenName === 'title') $('htOffer').classList.add('on'); }, 600); } } catch (e) { } } // the NEW HERE? card shows once, on the very first launch
// ---------------------------------------------------------------- move preview (?preview=1&p=25&mv=0): the game becomes a small silent loop that casts one chosen move on a plain background.
// The Moves screen can embed it in an iframe and switch Pok\u00e9mon / move with postMessage({pf:'pv', id, mv}); mv = index into kit.pool, or 'melee' | 'ranged' | 'beam'. It reads the real move data, so new moves preview with no extra work.
if (q.has('preview')) {
  document.body.classList.add('preview'); muted = !q.has('snd');
  const pc = document.createElement('canvas'); pc.width = 960; pc.height = 480;
  { const g = pc.getContext('2d'), s = g.createLinearGradient(0, 0, 0, 480); s.addColorStop(0, '#1d2a48'); s.addColorStop(.62, '#5b78a8'); s.addColorStop(.62, '#2f3a52'); s.addColorStop(1, '#161c2c'); g.fillStyle = s; g.fillRect(0, 0, 960, 480); g.strokeStyle = 'rgba(255,255,255,.07)'; for (let y = 332; y < 480; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(960, y); g.stroke(); } }
  const pv = { mv: 0, next: 0, was: false, id: 0, auto: q.get('auto') === '1', want: false, paused: false }, HOME = WORLD_W / 2 - 200, FIXED = { melee: 1, ranged: 1, beam: 1 };
  const raf0 = window.requestAnimationFrame.bind(window); let held = null; // a closed dialog stops the loop completely
  window.requestAnimationFrame = fn => { if (pv.paused) { held = fn; return 0; } return raf0(fn); };
  const pvPost = m => { if (window.parent !== window) window.parent.postMessage(m, '*'); };
  const pvSet = mv => { const k = P.kit; pv.mv = FIXED[mv] ? mv : Math.max(0, Math.min(k.pool.length - 1, mv | 0)); if (!FIXED[pv.mv]) P.specs[0] = k.pool[pv.mv]; };
  async function pvLoad(id, mv) {
    pv.id = id; labId = id; labSel = null; labAb = 'own'; curTheme = { id: 'plain', name: 'Plain' }; curBg = pc; props = []; bgDirty = true;
    await startMatch({ lab: true });
    curBg = pc; bgDirty = true; weather = null; tod = 'day'; updateTint(); introT = 1.85; pvSet(mv); pv.next = now + .6; pv.was = false;
    const k = P.kit; if (window.parent !== window) window.parent.postMessage({ pf: 'pool', id, name: P.p.name, pool: k.pool.map((s, i) => ({ i, name: s.name, type: s.type, key: s.key, sta: s.sta, desc: DESC[s.key] || '' })), fixed: [k.melee, k.ranged, k.beam].map((m, i) => ({ mv: ['melee', 'ranged', 'beam'][i], name: m.name, type: m.type })) }, '*');
  }
  window.playerInput = () => {
    const i = {}; if (!P || state !== 'fight') return i;
    for (const c in P.cool) P.cool[c] = 0; P.cineCool = 9; P.noCine = true; floaters.length = 0; punch = clamp(400 / Math.max(60, P.h), 1.5, 2.6) - camZ; // always ready, no cinematic or damage numbers, zoomed in on the Pokémon
    if (P.act || P.hitT > 0 || cine) { pv.was = true; return i; }
    if (pv.was) { pv.was = false; pv.next = now + 1.1; pvPost({ pf: 'done' }); }
    const dx = HOME - P.x; if (Math.abs(dx) > 50) { i.l = dx < 0; i.r = dx > 0; return i; }
    if (pv.auto ? now >= pv.next : pv.want) { pv.want = false; startAct(P, FIXED[pv.mv] ? pv.mv : 'special'); if (P.act) pv.was = true; else pvPost({ pf: 'done' }); pv.next = now + 1.5; }
    return i;
  };
  addEventListener('message', e => {
    const d = e.data; if (!d || d.pf !== 'pv') return;
    if (d.cmd === 'pause') { pv.paused = true; return; }
    if (pv.paused) { pv.paused = false; if (held) { raf0(held); held = null; } }
    if (d.cmd === 'play') { pv.want = true; return; }
    const id = +d.id, mv = FIXED[d.mv] ? d.mv : Math.trunc(+d.mv) || 0; if (!(id >= 1 && id <= 386)) return;
    if (P && id === pv.id) { resetField(); P.act = null; pvSet(mv); pv.next = now + .4; pv.was = false; pv.want = false; } else pvLoad(id, mv);
  });
  pvLoad(selYou, q.has('mv') && FIXED[q.get('mv')] ? q.get('mv') : Math.trunc(+q.get('mv')) || 0);
}
if (q.get('open') === 'moves') { showScreen('menu'); openMoves(); } else if (q.get('open') === 'lab') $('tLab').click(); // test shortcuts
window.__game = { get P() { return P; }, get E() { return E; }, get state() { return state; }, kit: buildKit, startMatch };
