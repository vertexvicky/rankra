const db = require('../B_DB/DB.json');

// --- Simulated Process Logic from tools.js ---
let memoizedDb = null;
function getProcessedDb() {
  if (memoizedDb) return memoizedDb;
  const cdistrict = {};
  const nestedCutoff = {};
  const rawCutoff = db.cutoff || [];

  rawCutoff.forEach(item => {
    if (item.district && item.coc) {
      const dist = item.district.toLowerCase();
      if (!cdistrict[dist]) cdistrict[dist] = [];
      if (!cdistrict[dist].includes(item.coc)) cdistrict[dist].push(item.coc);
    }
    if (item.coc && item.brc) {
      if (!nestedCutoff[item.coc]) nestedCutoff[item.coc] = {};
      const { con, district, brn, code, ...rest } = item;
      nestedCutoff[item.coc][item.brc] = rest;
    }
  });
  memoizedDb = { cdistrict, nestedCutoff, cutrange: db.cutrange || {} };
  return memoizedDb;
}
// ----------------------------------------------

const minVal = 140;
const maxVal = 150;
const commKey = "BC";

const { cdistrict, nestedCutoff, cutrange } = getProcessedDb();
const results = [];
let inRangeCount = 0;
let belowRangeCount = 0;

const collegeCodes = Object.keys(cutrange);

for (const coc of collegeCodes) {
  const rangeData = cutrange[coc];
  if (rangeData && rangeData[commKey]) {
    const cMin = rangeData[commKey][1];
    const cMax = rangeData[commKey][4];
    if (cMin && cMin > 0 && cMin <= maxVal) {
      results.push([0, parseInt(coc), cMin, cMax]);
      if (cMin >= minVal) inRangeCount++; else belowRangeCount++;
    }
  }
}

results.sort((a, b) => b[3] - a[3]);
const finalResults = results.slice(0, 10).map((row, index) => {
  row[0] = index + 1;
  return row;
});
finalResults.push([`${inRangeCount} results and ${belowRangeCount} seats below ${minVal} (min cutoff)`]);

console.log(`Verified API Logic (Internal Processing):`);
console.log(JSON.stringify(finalResults, null, 2));
