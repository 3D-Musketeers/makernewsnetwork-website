// Prints the SHA-256 hex of the preview gate word, for gate.html.
//   node tools/gate-hash.js "the new word"
const crypto = require('crypto');
const w = process.argv[2];
if (!w) { console.error('usage: node tools/gate-hash.js "word"'); process.exit(1); }
console.log(crypto.createHash('sha256').update(w).digest('hex'));
