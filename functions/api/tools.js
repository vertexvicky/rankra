import db from "../../B_DB/DB.json";

// 1. getcollegelist
function getcollegelist(params) {
  const { min, max, community, districts, course } = params;
  const commKey = community?.toUpperCase();
  const commData = db[commKey];

  if (!commData) return { results: [], meta: { error: "Community not found" } };

  let allowedCocs = null;
  if (districts && districts.length > 0) {
    allowedCocs = new Set();
    districts.forEach(d => {
      const cocs = db.cdistrict?.[d.toLowerCase()];
      if (cocs) cocs.forEach(c => allowedCocs.add(Number(c)));
    });
  }

  let allValid = [];
  if (course) {
    const cns = commData.cns || [];
    const filteredCns = cns.filter(item => {
      const courseMatch = item.brc === course;
      const distMatch = allowedCocs ? allowedCocs.has(Number(item.coc)) : true;
      return courseMatch && distMatch;
    });
    allValid = filteredCns.map(item => [item.coc, item.c, item.c]);
  } else {
    const cutrange = commData.cutrange || [];
    const filteredRange = cutrange.filter(item => {
      return allowedCocs ? allowedCocs.has(Number(item.coc)) : true;
    });
    allValid = filteredRange.map(item => [item.coc, item.minc, item.maxc]);
  }

  let results = allValid.filter(c => c[2] >= min && c[1] <= max);

  if (results.length < 10) {
    const belowMin = allValid.filter(c => c[2] < min);
    belowMin.sort((a, b) => b[2] - a[2] || b[1] - a[1]);
    const needed = 10 - results.length;
    results.push(...belowMin.slice(0, needed));
  }

  results.sort((a, b) => b[2] - a[2] || b[1] - a[1]);

  return { results };
}

// 2. cab
function getCAB(params) {
  const { branch, community } = params;
  const commKey = community?.toUpperCase();
  const commData = db[commKey];
  if (!commData) return { results: {}, meta: { error: "Community not found" } };

  const cns = commData.cns || [];
  const colleges = cns.filter(item => item.brc === branch).map(item => item.coc);
  return { results: { [branch]: colleges } };
}

// 3. bac
function getBAC(params) {
  const { college, community } = params;
  const commKey = community?.toUpperCase();
  const commData = db[commKey];
  if (!commData) return { results: {}, meta: { error: "Community not found" } };

  const cns = commData.cns || [];
  const branches = cns.filter(item => Number(item.coc) === Number(college)).map(item => item.brc);
  return { results: { [college]: branches } };
}

// 4. getcutoff
function getcutoff(params) {
  const { min, max, community, colleges, branches, districts } = params;
  const commKey = community?.toUpperCase();
  const commData = db[commKey];

  if (!commData) return { results: [], meta: { error: "Community not found" } };

  const cns = commData.cns || [];
  const cocSet = (colleges && Array.isArray(colleges)) ? new Set(colleges.map(Number)) : null;
  const brcSet = (branches && Array.isArray(branches)) ? new Set(branches.map(s => s.trim())) : null;
  
  let allowedDistCocs = null;
  if (districts && districts.length > 0) {
    allowedDistCocs = new Set();
    districts.forEach(d => {
      const cocs = db.cdistrict?.[d.toLowerCase()];
      if (cocs) cocs.forEach(c => allowedDistCocs.add(Number(c)));
    });
  }

  const allValid = cns.filter(item => {
    const cocMatch = cocSet ? cocSet.has(Number(item.coc)) : true;
    const brcMatch = brcSet ? brcSet.has(item.brc) : true;
    const distMatch = allowedDistCocs ? allowedDistCocs.has(Number(item.coc)) : true;
    return cocMatch && brcMatch && distMatch;
  }).map(item => [item.coc, item.brc, item.c]);

  let results = allValid.filter(c => c[2] >= min && c[2] <= max);
  results.sort((a, b) => b[2] - a[2]);

  return { results, meta: { count: results.length } };
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method === "POST") {
    try {
      const body = await request.json();
      const finalResponse = [];

      for (const entry of body) {
        const funcName = Object.keys(entry)[0];
        const queries = entry[funcName];
        const actionResults = [];

        for (const params of queries) {
          let result;
          if (funcName === "getcollegelist") result = getcollegelist(params);
          else if (funcName === "cab") result = getCAB(params);
          else if (funcName === "bac") result = getBAC(params);
          else if (funcName === "getcutoff") result = getcutoff(params);
          else result = { error: `Function ${funcName} not found` };
          actionResults.push(result);
        }
        finalResponse.push({ [funcName]: actionResults });
      }

      return new Response(JSON.stringify(finalResponse), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON body structure" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const params = {
    min: parseFloat(url.searchParams.get('min')),
    max: parseFloat(url.searchParams.get('max')),
    community: url.searchParams.get('community'),
    districts: url.searchParams.get('district') ? [url.searchParams.get('district')] : [],
    course: url.searchParams.get('course'),
    branch: url.searchParams.get('branch'),
    college: url.searchParams.get('college'),
    colleges: url.searchParams.get('colleges')?.split(','),
    branches: url.searchParams.get('branches')?.split(',')
  };

  let data;
  if (action === 'getcollegelist') data = getcollegelist(params);
  else if (action === 'cab') data = getCAB(params);
  else if (action === 'bac') data = getBAC(params);
  else if (action === 'getcutoff') data = getcutoff(params);
  else data = { error: "Invalid action" };

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
