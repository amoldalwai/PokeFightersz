const fs = require('fs'), os = require('os'), path = require('path');
const d = JSON.parse(fs.readFileSync(path.join(os.tmpdir(), 'moves_all.json'), 'utf8'));
const names = [...new Set(d.specials.map(s => s.n))].sort((a, b) => a.localeCompare(b));
fs.writeFileSync(path.join(__dirname, '..', 'data', 'moveids.js'), '// Fixed move IDs for saved move unlocks: an ID is the position in this list, so only ever append new moves at the end.\nconst MOVE_IDS = ' + JSON.stringify(names) + ';\n');
console.log(names.length);
