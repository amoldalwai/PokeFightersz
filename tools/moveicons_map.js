// Move name -> game-icons.net icon (resolved to lorc, then delapouite, then any author; write "author/name" to force one).
// Run: node tools/build_moveicons.js  (needs the game-icons repo unzipped, see the script).
module.exports = {
  specials: {
    // fire
    'Fire Blast': 'fireball', 'Overheat': 'bright-explosion', 'Fire Bomb': 'fire-bomb', 'Lava Plume': 'smoking-volcano', 'Eruption': 'volcano', 'Fire Trail': 'fire-dash', 'Flare Blitz': 'flaming-arrow',
    'Mirage Rush': 'heat-haze', 'Ember Roll': 'burning-round-shot', 'Flame Wheel': 'flame-spin', 'Fire Tornado': 'flame-tunnel', 'Blaze Cyclone': 'wildfires', 'Fire Spin': 'fire-ring', 'Flamethrower': 'flamethrower',
    'Flame Wall': 'firewall', 'Ember Veil': 'fire-shield', 'Fire Fang': 'bestial-fangs', 'Fire Punch': 'flame-claws', 'Inferno Orbit': 'three-burning-balls', 'Seeking Flame': 'ember-shot', 'Charge Orb': 'burning-dot',
    'Phoenix Dive': 'winged-arrow', 'Heat Wave': 'fire-wave', 'Sunny Day': 'sun', 'Solar Crash': 'burning-meteor',
    // water
    'Hydro Pump': 'bubbling-beam', 'Surf Rush': 'wave-surfer', 'Push and Pull': 'pull', 'Whirlpool Spin': 'vortex', 'Surf': 'big-wave', 'Bubble Barrage': 'bubbles', 'Rain Dance': 'heavy-rain', 'Aqua Lance': 'harpoon-trident',
    'Bubble Prison': 'bubble-field', 'Bubble Bounce': 'jellyfish', 'Water Roll': 'circling-fish', 'Tidal Crash': 'wave-strike', 'Aqua Jet': 'water-bolt', 'Life Tether': 'heart-drop', 'Water Shuriken': 'darkzaitzev/whirlpool-shuriken',
    'Whirlpool': 'whirlwind', 'Waterfall': 'waterfall', 'Clamp': 'sea-star', 'Water Spout': 'fountain', 'Hydro Cannon': 'water-gun', 'Octazooka': 'octopus', 'Torrent Geyser': 'steam-blast', 'Rain Veil': 'raining',
    'Flood Floor': 'flood', 'Muddy Water': 'high-tide', 'Water Pulse': 'droplets', 'Crabhammer': 'crab-claw',
    // electric
    'Thunder': 'thunder-struck', 'Thunder Spear': 'thunder-blade', 'Static Orbit': 'orbital', 'Volt Cyclone': 'lightning-helix', 'Thunderbolt': 'heavy-lightning', 'Thunder Wave': 'static-waves', 'Thunder Cage': 'zigzag-cage',
    'Volt Switch': 'switch-weapon', 'Overcharge': 'power-lightning', 'Thunderfall': 'lightning-storm', 'Spark Wheel': 'circle-sparks', 'Discharge Nova': 'lightning-dissipation', 'Zap Cannon': 'tesla-turret',
    'Ball Lightning': 'thunderball', 'Boomerang': 'boomerang', 'Electric Field': 'lightning-dome', 'Static Chain': 'willdabeast/chain-lightning', 'Wild Charge': 'hypersonic-bolt', 'Chain Bolt': 'arcing-bolt',
    'Thunder Punch': 'fulguro-punch', 'Spark': 'comet-spark', 'Magnet Pull': 'magnet', 'Shock Wave': 'sonic-lightning',
    // grass
    'Solar Beam': 'sunbeams', 'Petal Blizzard': 'flower-twirl', 'Spore Mine': 'spotted-mushroom', 'Leaf Cyclone': 'leaf-swirl', 'Vine Whip': 'vine-whip', 'Mega Drain': 'oak-leaf', 'Absorb': 'sprout', 'Giga Drain': 'tree-growth',
    'Sleep Powder': 'pollen-dust', 'Stun Spore': 'spoted-flower', 'Spore': 'mushroom', 'Leech Seed': 'plant-seed', 'Synthesis': 'sunflower', 'Thorn Cage': 'crown-of-thorns', 'Frenzy Plant': 'tree-roots', 'Seed Split': 'apple-seeds',
    'Razor Whirl': 'zigzag-leaf', 'Leaf Spin': 'maple-leaf', 'Grass Knot': 'knot', 'Vine Lash': 'curling-vines', 'Seeker Orb': 'crosshair-arrow', 'Giant Bloom': 'lotus-flower', 'Petal Dance': 'twirly-flower', 'Seed Bomb': 'oak',
    'Vine Wall Slam': 'vines', 'Leech Tether': 'thorny-tentacle', 'Root Snare': 'root-tip', 'Spore Burst': 'mushroom-cloud', 'Pollen Cloud': 'dandelion-flower', 'Spring Bloom': 'spiral-bloom', 'Bullet Seed': 'grain',
    'Magical Leaf': 'falling-leaf', 'Needle Arm': 'cactus',
    // ice
    'Blizzard': 'snowflake-2', 'Ice Beam': 'ice-bolt', 'Frost Breath': 'snowing', 'Avalanche': 'icebergs', 'Snowball Roll': 'snowman', 'Ice Wall': 'frozen-block', 'Ice Ball': 'frozen-orb', 'Snow Cyclone': 'tension-snowflake',
    'Glacier Prison': 'ice-cube', 'Aurora Veil': 'ice-shield', 'Snow Cloak': 'igloo', 'Ice Shard': 'ice-spear', 'Ice Crystals': 'crystal-cluster', 'Hailstorm': 'icicles-aura', 'Snow Squall': 'snowflake-1', 'Ice Punch': 'ice-golem',
    'Glacier Slide': 'ice-skate', 'Frost Nova': 'ice-bomb', 'Shard Split': 'crystalize', 'Black Ice': 'iceberg', 'Frost Mark': 'icicles-fence', 'Icicle Crash': 'frozen-arrow',
    // fighting
    'Submission': 'hand-grip', 'Sky Uppercut': 'hand-of-god', 'Focus Blast': 'magic-palm', 'Hurricane Kick': 'cartwheel', 'Whirl Kick': 'winged-leg', 'Counter': 'shield-bash', 'Bulk Up': 'biceps', 'Cross Chop': 'cut-palm',
    'Shockwave Push': 'punch-blast', 'Dynamic Punch': 'thor-fist', 'Mach Punch': 'speedometer', 'Axe Kick': 'soccer-kick', 'Aura Burst': 'glowing-hands', 'Target Mark': 'crosshair', 'Karate Chop': 'black-belt',
    'Close Combat Flurry': 'brass-knuckles', 'High Jump Kick': 'jump-across', 'Rolling Kick': 'sprint', 'Comic Combo': 'boxing-glove', 'Aura Sphere': 'concentration-orb', 'Double Kick': 'high-kick', 'Rock Smash': 'hammer-break',
    'Focus Stance': 'monk-face', 'Focus Punch': 'armor-punch', 'Chi Wave Barrage': 'palm', 'Brick Break': 'broken-wall',
    // poison
    'Poison Powder': 'poison-bottle', 'Acid Rain': 'acid-blob', 'Venom Fang': 'snake-bite', 'Toxic Sink': 'sinking-trap', 'Poison Jab': 'syringe', 'Poison Gas': 'poison-gas', 'Smog Cloud': 'dust-cloud', 'Toxic': 'biohazard',
    'Gunk Shot': 'dripping-goo', 'Toxic Cyclone': 'snake-spiral', 'Venom Rain': 'dripping-tube', 'Sludge Bomb': 'goo-explosion', 'Acid Armor': 'sbed/acid', 'Toxic Mine': 'sbed/death-skull', 'Poison Ivy': 'thorny-vine',
    'Toxic Spikes': 'sbed/spikes-full', 'Sludge Tide': 'chemical-drop', 'Toxic Cauldron': 'cauldron', 'Venom Tether': 'snake-tongue', 'Toxic Bomb': 'bubbling-flask', 'Acid Ceiling Drip': 'leaky-skull', 'Acid': 'fizzing-flask',
    'Smog': 'sbed/poison-cloud', 'Toxic Spike Field': 'sbed/spikes-half', 'Sludge': 'gooey-molecule', 'Poison Fang': 'cobra',
    // ground
    'Dig': 'dig-hole', 'Earthquake': 'earth-crack', 'Bonemerang': 'broken-bone', 'Gravity Well': 'black-hole-bolas', 'Bone Spikes': 'stalagtite', 'Fissure': 'edge-crack', 'Mud Bomb': 'earth-spit', 'Drill Run': 'drill',
    'Fault Line': 'cracked-glass', 'Sand Tomb': 'desert', 'Land Mine': 'sbed/spikeball', 'Mud Roll': 'crumbling-ball', 'Boulder Roll': 'falling-boulder', 'Pillar March': 'djed-pillar', 'Earth Wall': 'spiked-wall', 'Sinkhole': 'hole',
    'Mud Skip': 'boot-prints', 'Bulldoze': 'farm-tractor', 'Sandfall': 'sands-of-time', 'Sand Attack': 'sandstorm', 'Mud Armor': 'backbone-shell', 'Mud Shot': 'quicksand', 'Quicksand Maw': 'spiky-pit', 'Magnitude': 'quake-stomp',
    // flying
    'Fly': 'wingfoot', 'Air Slash': 'crescent-blade', 'Split Shot': 'two-feathers', 'Roost': 'bird-house', 'Gale Force': 'wind-slap', 'Sky Attack': 'crow-dive', 'Gale Front': 'windy-stripes', 'Skyfall Dive': 'eagle-emblem',
    'Cyclone Wings': 'angel-wings', 'Twister Pincer': 'pentarrows-tornado', 'Mirror Move': 'crossed-air-flows', 'Feather Storm': 'feather', 'Peck': 'hummingbird', 'Updraft': 'arrow-wings', 'Aerial Ace': 'air-zigzag',
    'Brave Bird': 'hawk-emblem', 'Boomerang Gale': 'concentric-crescents', 'Hurricane': 'tornado', 'Drill Peck': 'needle-drill', 'Tailwind': 'windsock', 'Wing Attack': 'wing-cloak', 'Aeroblast': 'tornado-discs', 'Gust': 'swallow',
    // psychic
    'Reflect': 'shinto-shrine-mirror', 'Psychic': 'psychic-waves', 'Psycho Cut': 'quick-slash', 'Mirror Image': 'two-shadows', 'Psy Spin': 'bowl-spiral', 'Teleport': 'teleport', 'Rest': 'night-sleep', 'Future Sight': 'crystal-ball',
    'Dream Eater': 'brain-leak', 'Telekinesis Slam': 'brain-tentacle', 'Psy Ring': 'power-ring', 'Calm Mind': 'third-eye', 'Mind Prism': 'crystal-eye', 'Future Mark': 'hourglass', 'Zen Headbutt': 'brain', 'Astral Orbit': 'orbital-rays',
    'Gravity Crush': 'solar-system', 'Blink Strike': 'sword-clash', 'Hypnosis': 'eye-of-horus', 'Orbit Shield': 'moon-orbit', 'Mirror Coat': 'mirror-mirror', 'Psy Orb': 'orb-direction', 'Extrasensory': 'brainstorm',
    'Skill Swap': 'swap-bag', 'Time Warp': 'alarm-clock', 'Mirror Room': 'crystal-shrine', 'Light Screen': 'bolt-shield', 'Cosmic Power': 'planet-core', 'Psycho Boost': 'bolt-eye',
    // bug
    'String Shot': 'web-spit', 'X-Scissor': 'scissors', 'Silk Tether': 'hanging-spider', 'Silver Spin': 'cobweb', 'Web Trap': 'mantrap', 'Needle Slash': 'sewing-needle', 'Megahorn': 'mighty-horn', 'Leech Life': 'insect-jaws',
    'Hive Swarm Wall': 'beehive', 'Sticky Web': 'spider-web', 'Silver Wind': 'butterfly-warning', 'Needle Split': 'triple-needle', 'Swarm Cyclone': 'dragonfly', 'Blade Whirl': 'butterfly-knife', 'Web Mine': 'spider-eye',
    'Pin Missile': 'missile-swarm', 'Silk Reel': 'spider-bot', 'Bug Buzz': 'bee', 'Twineedle': 'wasp-sting', 'Swarm Dive': 'flying-beetle', 'Fury Cutter': 'reaper-scythe', 'Cricket Chorus': 'cricket', 'Cocoon Guard': 'beetle-shell',
    // rock
    'Rock Slide': 'falling-rocks', 'Sandstorm': 'sandstorm', 'Rock Bomb': 'rock', 'Stone Edge': 'stone-spear', 'Rock Roll': 'boulder-dash', 'Stealth Rock': 'stone-pile', 'Rock Polish': 'diamond-hard', 'Head Smash': 'rock-golem',
    'Rock Mine': 'stone-sphere', 'Boulder Punt': 'stone-block', 'Rock Skip': 'stone-path', 'Gem Volley': 'gems', 'Rock Tomb': 'tombstone', 'Fossil Cage': 'fossil', 'Stone Wall': 'stone-wall', 'Ancient Power': 'rune-stone',
    'Crystal Spires': 'crystal-growth', 'Granite Skin': 'stone-tablet', 'Meteor Shard Fall': 'fragmented-meteor', 'Rock Blast': 'striking-diamonds', 'Rollout': 'stone-wheel',
    // ghost
    'Will-O-Wisp': 'lantern-flame', 'Shadow Clone': 'shadow-follower', 'Shadow Roll': 'shadow-grasp', 'Spirit Orbit': 'soul', 'Confuse Ray': 'six-eyes', 'Shadow Punch': 'evil-hand', 'Destiny Bond': 'chained-heart', 'Boo Blackout': 'ghost',
    'Curse Mark': 'cursed-star', 'Shadow Ball': 'bottled-shadow', 'Copycat': 'ghost-ally', 'Soul Well': 'soul-vessel', 'Haunting Shade': 'haunting', 'Coffin Drop': 'coffin', 'Phantom Parade': 'floating-ghost', 'Wisp Seeker': 'candle-flame',
    'Soul Lantern': 'lantern', 'Shadow Sneak': 'hood',
    // dragon
    'Dragon Tail': 'reptile-tail', 'Dragon Roll': 'dragon-spiral', 'Dragon Pulse': 'energy-breath', 'Dragon Helix': 'double-dragon', 'Scale Ward': 'dragon-shield', 'Dragon Dance': 'sea-dragon', 'Dragon Charge': 'dragon-orb',
    'Dragon Cyclone': 'hydra', 'Dragon Rush': 'dragon-head', 'Scale Storm': 'scales', 'Draconic Gaze': 'all-seeing-eye', 'Dragon Orbit': 'cosmic-egg', 'Outrage': 'enrage', 'Wyrm Bite': 'spiked-dragon-head', 'Draco Bomb': 'evil-comet',
    'Draco Meteor': 'meteor-impact', 'Dragon Claw': 'shining-claw', 'Dragon Breath': 'fire-breath', 'Twister': 'half-tornado',
    // dark
    'Bite': 'blade-bite', 'Thief': 'robber-mask', 'Pursuit': 'ninja-mask', 'Shadow Chains': 'harpoon-chain', 'Hunter Mark': 'eye-target', 'Night Whirl': 'moon-bats', 'Night Slash': 'bat-blade', 'Nasty Plot': 'devil-mask',
    'Shadow Pit': 'magic-portal', 'Crunch': 'croc-jaws', 'Dark Tether': 'andromeda-chain', 'Pursuit Spin': 'eclipse-saw', 'Dark Void': 'evil-moon', 'Knock Off': 'crowbar', 'Dark Boomerang': 'bat-wing', 'Phantom Claws': 'midnight-claw',
    'Snarl': 'direwolf', 'Red Eye Ambush': 'beast-eye', 'Eclipse': 'eclipse', 'Sucker Punch': 'fist', 'Torment': 'dead-eye', 'Dusk Pact': 'moon-claws', 'Taunt': 'angry-eyes',
    // steel
    'Iron Head': 'viking-helmet', 'Meteor Mash': 'mailed-fist', 'Steel Orbit': 'morph-ball', 'Iron Tail': 'armadillo-tail', 'Gear Grinder': 'cog', 'Iron Wall': 'brick-wall', 'Steel Spin': 'shuriken-aperture', 'Iron Roll': 'wrecking-ball',
    'Iron Defense': 'templar-shield', 'Gyro Ball': 'mono-wheel-robot', 'Metal Claw': 'saw-claw', 'Steel Rain': 'thrown-spear', 'Blade Boomerang': 'armored-boomerang', 'Flash Cannon': 'laser-blast', 'Steel Wing': 'steelwing-emblem',
    'Bullet Punch': 'mechanical-arm', 'Iron Spikes': 'spiked-fence', 'Chrome Blade Fan': 'shard-sword', 'Piston Barrage': 'factory-arm', 'Alloy Plating': 'metal-plate', 'Steel Mine': 'skoll/spiked-ball', 'Anvil Drop': 'anvil-impact',
    'Doom Desire': 'swords-power',
    // fairy
    'Wish Star': 'falling-star', 'Charm Pull': 'heart-wings', 'Twinkle Spin': 'sparkles', 'Dazzling Gleam': 'crystal-shine', 'Charm': 'hearts', 'Sparkle Ward': 'healing-shield', 'Moonblast': 'moon', 'Fairy Orbit': 'star-cycle',
    'Fairy Cyclone': 'fairy-wings', 'Play Rough': 'fluffy-wing', 'Moonlight': 'night-sky', 'Rainbow Bridge': 'rainbow-star', 'Moon Seeker': 'crescent-staff', 'Fairy Wind': 'butterfly', 'Sweet Kiss': 'lips', 'Draining Kiss': 'crowned-heart',
    'Starlight Rain': 'stars-stack', 'Crescent Moon Strike': 'falcon-moon', 'Rainbow Ribbon Whip': 'whip', 'Glitter Clone': 'fairy',
    // normal
    'Cut': 'serrated-slash', 'Mega Kick': 'boot-kick', 'Body Slam': 'sbed/weight-crush', 'Strength': 'muscle-up', 'Mega Punch': 'punch', 'Skull Bash': 'cracked-helm', 'Quick Attack': 'fast-forward-button', 'Harden': 'checked-shield',
    'Swift': 'star-formation', 'Double Edge': 'axe-sword', 'Razor Wind': 'crossed-air-flows', 'Fury Attack': 'bird-claw', 'Titan Stomp': 'giant', 'Phantom Clone': 'shadow-follower', 'Hyper Spin': 'spiral-arrow', 'Take Down': 'charging',
    'Mimic': 'drama-masks', 'Bide': 'armoured-shell', 'Hyper Voice': 'megaphone', 'Double-Team Swarm': 'multiple-targets', 'Halo Crush': 'spiked-halo', 'Roar Wave': 'lion', 'Substitute': 'shield-opposition', 'Extreme Speed': 'rocket-flight',
    'Giga Impact': 'crowned-explosion', 'Power Orb': 'unstable-orb', 'Double Team': 'double-ringed-orb', 'Tri Attack': 'triorb', 'Confetti Cannon': 'party-popper', 'Hyper Fang': 'fangs-circle', 'Bounce Shot': 'rolling-bomb',
    'Super Fang': 'toad-teeth', 'Swords Dance': 'crossed-swords', 'Horn Attack': 'horned-helm', 'Sing': 'musical-notes', 'Wrecking Swing': 'flail', 'Slash': 'saber-slash', 'Pay Day': 'two-coins', 'Scratch': 'claw-slashes',
    'Double Slap': 'slap', 'Wrap': 'rope-coil', 'Explosion': 'skoll/nuclear-bomb', 'Stomp': 'elephant', 'Horn Drill': 'rhinoceros-horn', 'Sonic Boom': 'skoll/sound-waves', 'Whirlwind': 'whirlwind', 'Headbutt': 'horned-skull',
    'Slam': 'hammer-drop', 'Vice Grip': 'clamp', 'Egg Bomb': 'easter-egg', 'Barrage': 'striking-balls', 'Metronome': 'perspective-dice-six-faces-random', 'Cheer Rally': 'knight-banner', 'Dizzy Punch': 'knocked-out-stars',
    'Thrash': 'wolverine-claws', 'Lovely Kiss': 'love-letter', 'Splash': 'water-splash', 'Transform': 'chameleon-glyph', 'Conversion': 'cycle', 'Spotlight Slam': 'theater-curtains', 'Spike Cannon': 'cannon-shot',
    'Self Destruct': 'time-bomb', 'Hidden Power': 'magic-swirl', 'Fury Swipes': 'claw-string', 'Frustration': 'broken-heart', 'Pound': 'gavel', 'Present': 'gift-of-knowledge', 'Tackle': 'body-balance', 'Perish Song': 'lyre',
    'Safeguard': 'heart-shield', 'Constrict': 'spiral-tentacle', 'Sketch': 'pencil-brush', 'Crush Claw': 'triple-claws', 'False Swipe': 'slashed-shield', 'Flail': 'flat-hammer', 'Encore': 'sonic-shout',
  },
  ranged: {
    'Razor Leaf': 'maple-leaf', 'Ember': 'small-fire', 'Bubble Beam': 'bubbling-beam', 'Pin Missile': 'missile-swarm', 'Gust': 'swallow', 'Poison Sting': 'wasp-sting', 'Swift': 'star-formation', 'Acid': 'sbed/acid',
    'Thunder Shock': 'lightning-arc', 'Sand Attack': 'sandstorm', 'Confusion': 'brain', 'Mega Drain': 'oak-leaf', 'Seismic Toss': 'throwing-ball', 'Psywave': 'psychic-waves', 'Psybeam': 'rolling-energy', 'Rock Throw': 'rock',
    'Aurora Beam': 'ice-bolt', 'Sludge': 'dripping-goo', 'Lick': 'lizard-tongue', 'Leech Seed': 'plant-seed', 'Bone Club': 'bone-mace', 'Water Gun': 'water-gun', 'Dragon Rage': 'dragon-balls', 'Giga Drain': 'vine-leaf',
    'Hidden Power': 'magic-swirl', 'Sludge Bomb': 'goo-explosion', 'Zap Cannon': 'tesla-turret', 'Future Sight': 'crystal-ball', 'Faint Attack': 'shadow-grasp', 'Shadow Ball': 'bottled-shadow', 'Mud Slap': 'earth-spit',
    'Icy Wind': 'snowing', 'Dragon Breath': 'dragon-breath', 'Ancient Power': 'rune-stone', 'Sacred Fire': 'fire-silhouette', 'Water Pulse': 'droplets', 'Spark': 'comet-spark', 'Signal Beam': 'laser-sparks',
    'Mist Ball': 'smoking-orb', 'Luster Purge': 'sparkles', 'Mud Shot': 'quicksand',
  },
};
