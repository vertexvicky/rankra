const fs = require('fs');
const zlib = require('zlib');
const key = 'rankravicky1611'.split('').map(c => c.charCodeAt(0));
const data = fs.readFileSync('public/assets/db/tnea/cutoff/5202.gzip');
for (let i = 0; i < data.length; i++) {
  data[i] ^= key[i % key.length];
}
const decompressed = zlib.gunzipSync(data);
const parsed = JSON.parse(decompressed.toString());
const uniqueChoices = [];
const seen = new Set();

for (const item of parsed) {
  const coc = item.coc;
  const brc = item.brc;
  if (coc != null && brc != null) {
    const choiceKey = coc + "-" + brc;
    if (!seen.has(choiceKey)) {
      seen.add(choiceKey);
      // Ensure code is converted to string or number properly, user example showed [college code, course]
      uniqueChoices.push([String(coc), String(brc)]);
    }
  }
}

fs.writeFileSync('public/assets/db/tnea/choice.json', JSON.stringify(uniqueChoices));
console.log('Wrote', uniqueChoices.length, 'choices');
