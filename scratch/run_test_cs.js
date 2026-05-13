const db = require('../B_DB/DB.json');
const { performance } = require('perf_hooks');

function getcollegelist(min, max, community, district, course) {
  const startTime = performance.now();
  const commKey = community.toUpperCase();
  const commData = db[commKey];

  if (!commData) {
    return { results: [], meta: { info: "Community data not found", time: "0.000ms" } };
  }

  let allowedCocs = null;
  if (district) {
    const distKey = district.toLowerCase();
    const cocs = db.cdistrict?.[distKey];
    if (cocs) {
      allowedCocs = new Set(cocs.map(Number));
    } else {
      return { results: [], meta: { info: "District not found", time: "0.000ms" } };
    }
  }

  let allValid = [];

  if (course) {
    // Use cns array
    const cns = commData.cns || [];
    const filteredCns = cns.filter(item => {
      const courseMatch = item.brc === course;
      const distMatch = allowedCocs ? allowedCocs.has(Number(item.coc)) : true;
      return courseMatch && distMatch;
    });
    
    allValid = filteredCns.map(item => [0, item.coc, item.c, item.c, item.t]);
  } else {
    // Use cutrange array
    const cutrange = commData.cutrange || [];
    const filteredRange = cutrange.filter(item => {
      return allowedCocs ? allowedCocs.has(Number(item.coc)) : true;
    });
    
    allValid = filteredRange.map(item => [0, item.coc, item.minc, item.maxc, 0]);
  }

  // Filter by user range
  let results = allValid.filter(c => c[3] >= min && c[2] <= max);

  let newMin = min;

  if (results.length < 10) {
    const belowMin = allValid.filter(c => c[3] < min);
    belowMin.sort((a, b) => b[3] - a[3] || b[2] - a[2]);
    
    const needed = 10 - results.length;
    const paddingItems = belowMin.slice(0, needed);
    results.push(...paddingItems);

    if (paddingItems.length > 0) {
      newMin = paddingItems[paddingItems.length - 1][3];
    }
  }

  // Final Sort
  results.sort((a, b) => b[3] - a[3] || b[2] - a[2]);

  for (let i = 0; i < results.length; i++) {
    results[i][0] = i + 1;
    // Remove the seats helper index before returning
    results[i] = results[i].slice(0, 4);
  }

  // Calculate info for ALL results below min threshold
  const belowMinItems = allValid.filter(c => c[3] < min);
  const totalResultsBelow = belowMinItems.length;
  const totalSeatsBelow = belowMinItems.reduce((acc, curr) => acc + (curr[4] || 0), 0);

  const timeTaken = (performance.now() - startTime).toFixed(3);
  let infoStr = `${totalResultsBelow} results and ${totalSeatsBelow} seats below ${min} ( ${newMin} is min cutoff )`;

  return {
    results,
    meta: {
      info: infoStr,
      time: `${timeTaken}ms`
    }
  };
}

console.log("Test: High Precision Timing (min=140, max=150)");
console.log(JSON.stringify(getcollegelist(140, 150, "OC", null, "CS"), null, 2));
