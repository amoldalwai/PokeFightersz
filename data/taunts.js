// 10 lines a type says about itself, and 10 lines anyone can use against that type. Short, fight-neutral, usable at any moment.
const TAUNTS = {
  own: {
    normal: ['Plain and proud!', 'Nothing fancy. Still winning.', 'Average? Watch me!', 'Just a normal day.', 'No tricks. Just me.', 'Basic? Basically unbeatable.', 'Normal is the new cool.', 'Keep it simple!', 'Vanilla power!', 'Everyone starts somewhere.'],
    fire: ['Feel the heat!', 'Too hot to handle!', "I'm on fire!", "Light 'em up!", 'Burn bright!', 'Spicy one, huh?', 'Who brought marshmallows?', 'Hot stuff coming through!', 'Turn up the heat!', 'Flame on!'],
    water: ['Go with the flow!', 'Make a splash!', 'Time to dive in!', 'Wave goodbye!', 'Under pressure? Not me.', 'Stay hydrated!', 'Rain check, buddy!', "I'm in my element!", 'Wet floor!', "Tide's turning!"],
    electric: ['Shocking, right?', 'Zap zap!', 'Fully charged!', 'Watt a fight!', "I'm so current!", "Static? I'm electric!", 'Light speed!', 'Spark of genius!', 'Volt-age rising!', "Don't touch me!"],
    grass: ['Grow up!', 'Leaf me alone!', 'Rooting for me!', 'Photosynthesis, baby!', 'Turning over a new leaf!', 'Stay green!', 'Bloom time!', "Nature's calling!", 'Pollen power!', 'Branching out!'],
    ice: ['Chill out!', 'Stay frosty!', 'Ice to meet you!', 'Cold as ice!', 'Let it go... down!', 'Cool story, bro.', 'Brr-utal!', 'Snow problem!', 'Keep your cool!', 'Freeze! Just kidding. Maybe.'],
    fighting: ['Hiyah!', 'Train harder!', 'No pain, no gain!', 'Fists up!', 'Leg day never skipped!', "Let's spar!", 'Feel the burn!', 'Punch first!', 'Knuckle up!', 'Eat your protein!'],
    poison: ['Toxic vibes!', 'Sssick moves!', 'A little venom?', "Don't lick that.", 'Smells like victory!', 'Bad to the bone!', 'Feeling queasy?', 'Stay toxic!', 'Antidote? Never heard of it.', 'Poison pen, poison fang.'],
    ground: ['Solid as rock!', 'Shake it up!', "Dirt don't hurt!", 'Dig this!', 'Stand your ground!', 'Earth to you!', 'Feeling grounded?', 'Mud in your eye!', 'Down to earth!', 'Rumble time!'],
    flying: ['Too slow!', "Sky's the limit!", 'Catch me if you can!', 'Head in the clouds!', 'Winging it!', 'Fly high!', 'Air time!', 'Feather-weight? Nope!', "Wind's with me!", 'Up and away!'],
    psychic: ['I saw that.', 'Mind over matter.', 'Reading your mind!', 'Predictable!', 'Think about it.', 'Big brain energy!', 'I knew you would say that.', 'Spoon-bending time!', 'Focus, grasshopper.', 'I see you losing.'],
    bug: ['Buzz off!', 'Bug me again!', 'Swarm time!', 'Tiny but mighty!', "Don't squash me!", 'Antennae up!', 'Creepy-crawly power!', 'Silk and style!', 'Wing it, buddy!', 'Six legs, zero fear!'],
    rock: ['Unbreakable!', 'Rock on!', 'Hard as stone!', 'Rock solid!', 'Boulder dash!', "You can't scratch me!", 'Pebble pride!', 'Gneiss try!', 'Stone cold!', "I'm a big deal. Literally."],
    ghost: ['Boo...', 'Behind you.', 'Spooky time!', 'Did you feel that?', "Can't catch a ghost!", 'Casper who?', 'Haunting you now!', 'Pass-through power!', 'Fear the unseen!', 'Spirit up!'],
    dragon: ['Roar!', 'Bow down!', 'Respect the scales!', 'Fire and fury!', "Dragon's honor!", "Treasure's mine!", 'Wings spread!', 'Legend incoming!', 'Tremble!', 'Rise of the dragon!'],
    dark: ['Too easy.', 'Lights out.', 'Shadows rise.', 'Night falls.', "Don't fear the dark.", 'I am the dark.', 'Sneaky!', 'Edgy? Yes.', 'Midnight is my element.', 'Trust no one.'],
    steel: ['Iron will!', 'Stand firm!', 'Metal to the pedal!', 'Shiny and strong!', 'Dent me, I dare you.', 'Clang!', 'Forged for this!', 'Heavy metal!', 'Rust? Never!', 'Steel yourself!'],
    fairy: ['Sparkle!', 'Aww, cute!', 'Spread the magic!', 'Glitter bomb!', 'Pixie power!', 'Wish upon a win!', 'Too cute to lose!', 'Fairy tale ending!', 'Believe!', 'Sweet dreams!']
  },
  about: {
    normal: ['Mr. Average!', 'Plain old you!', 'Is that all?', 'Vanilla!', 'Nothing special!', 'Ordinary much?', 'Beige energy!', 'Basic!', 'How very standard.', 'No type, no problem!'],
    fire: ['Mr. Hothead!', 'Cool off!', 'Hot air!', 'Smoke much?', "Don't burn out!", 'Campfire boy!', 'Match-stick!', 'Hot take!', 'Toasty!', 'Need an extinguisher?'],
    water: ['Soggy!', 'Drip drip!', 'Wet blanket!', 'Fish out of luck!', 'Pruny already?', 'Lost at sea?', 'Puddle brain!', 'Bath time!', 'Splash zone!', 'Bubble boy!'],
    electric: ['Shocker!', 'Static cling!', 'Lightbulb brain!', 'Mind the wires!', 'Battery low?', 'Zappy!', 'Spark plug!', 'Short circuit!', 'Fuzzy socks!', 'Unplug yourself!'],
    grass: ['Lawn ornament!', 'Salad bar!', 'Weed whacker time!', 'Leafy boy!', 'Mulch ado!', 'Mow the grass!', 'Pollen brain!', 'Herbivore!', 'Topiary!', 'Photosynthesize this!'],
    ice: ['Ice cube!', 'Frosty!', 'Cold feet?', 'Chill pill!', 'Melt down!', 'Snowflake!', 'Brain freeze!', 'Slippery!', 'Popsicle!', 'Defrost, buddy!'],
    fighting: ['Meathead!', 'Gym rat!', 'All brawn, no brain!', 'Leg day again?', 'Protein shake!', 'Karate kid!', 'Flex much?', 'Punch-drunk!', 'Muscles for brains!', 'Sweaty!'],
    poison: ['Stinky!', 'Venom drama!', 'Gross!', 'Bad breath!', 'Toxic ex!', 'Drink the antidote!', 'Smells off!', 'Slimy!', 'Sick much?', 'Eww!'],
    ground: ['Dirty!', 'Mud pie!', 'Bury yourself!', 'Down in the dirt!', 'Earthworm!', 'Sandy socks!', 'Rolling in mud?', 'Dusty!', 'Grounded!', 'Sandbox!'],
    flying: ['Birdbrain!', 'Come down!', 'Feather duster!', 'Wing-nut!', 'Cluck cluck!', 'Fly away!', 'Plane dumb!', 'Lost your way?', 'Head in the clouds!', 'Land already!'],
    psychic: ['Spoon-bender!', 'Stop reading my mind!', 'Smarty-pants!', 'Fortune faker!', 'Big forehead!', 'Headache incoming!', 'Mind games?', 'Crystal-ball clown!', 'Think fast!', 'Overthinker!'],
    bug: ['Creepy-crawly!', 'Squish!', 'Bug spray time!', 'Itty-bitty!', 'Six legs, zero chance!', 'Pest!', 'Web-slinger!', 'Wing-flapper!', 'Ew, crawl away!', 'Bug off!'],
    rock: ['Pet rock!', 'Rock-head!', 'Stone-faced!', 'Pebble brain!', 'Boulder boy!', 'Heavy sleeper!', 'Gravel gertie!', 'Dense!', 'Hard-headed!', 'You rock? Nope.'],
    ghost: ['Boo-hoo!', 'Spooky-poo!', 'Cover yourself, sheet!', 'Casper!', 'Fade away!', 'Scaredy-ghost!', 'Wooo, scary!', 'See-through!', 'Haunted house!', 'Vanish already!'],
    dragon: ['Lizard!', 'Overgrown gecko!', 'Fire-breathing pet!', 'Scaly!', 'Big lizard energy!', 'Dragon down!', 'Hoarder!', 'Show-off wings!', 'Dino-might?', 'Wings or not?'],
    dark: ['Emo!', 'Edge-lord!', 'Afraid of light?', 'Night owl!', 'Goth phase!', 'Too cool for school!', 'Shady!', 'Turn on a light!', 'Sneaky-pants!', 'Dark side drama!'],
    steel: ['Tin can!', 'Rusty!', 'Metal-head!', 'Robo-brain!', 'Iron-ic!', 'Magnet bait!', 'Heavy hitter? Heavy!', 'Can opener time!', 'Clunky!', 'Squeaky joints!'],
    fairy: ['Glitter-brain!', 'Tooth fairy!', 'Pixie dust!', 'Sparkles!', 'Too sweet!', 'Wand-waver!', 'Cutesy!', 'Tinkerbell!', 'Fluffy!', 'Sugar rush!']
  }
};
