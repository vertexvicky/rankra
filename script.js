/* ============================================================
   TNEA CUTOFF EXPLORER — script.js
   Pure vanilla JS · No libraries · No build step
   ============================================================ */
'use strict';

const YEARS = ['2020','2021','2022','2023','2024','2025'];
const COMMUNITIES = ['OC','BC','BCM','MBC','SC','SCA','ST'];
const CHUNK = 60;

const SEAT_KEYS = {
  OC:  {tl:'octl', al:'ocal'},
  BC:  {tl:'bctl', al:'bcal'},
  BCM: {tl:'bcmtl',al:'bcmal'},
  MBC: {tl:'mbctl',al:'mbcal'},
  SC:  {tl:'sctl', al:'scal'},
  SCA: {tl:'scatl',al:'scaal'},
  ST:  {tl:'sttl', al:'stal'},
};

const DISTRICT_NORM = {
  'Kanchipuram':'Kancheepuram','Sivaganga':'Sivagangai',
  'Kallakkurichi':'Kallakurichi','Thiruvallur':'Tiruvallur',
  'Tirupur':'Tiruppur','Nagappattinam':'Nagapattinam',
  'Thiruppathur':'Tirupattur','Thiruppattur':'Tirupattur',
};

/* ── State ── */
const S = {
  year: '2025',
  data: [],
  filtered: [],
  rendered: 0,
  expandedIdx: -1,

  search: '',
  districts: new Set(),
  activeComms: new Set(COMMUNITIES),
  primaryComm: null,

  cutoffMin: 0,
  cutoffMax: 200,
  cutoffComm: '',

  sortBy: 'cutoff-desc',
  isMobile: false,

  trie: null,
  districtIndex: null,
};

const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

/* ── Revision check (silent cache-bust) ── */
async function checkRevision() {
  try {
    const res = await fetch('./api/update.json', { cache: 'no-store' });
    if (!res.ok) return;
    const { app_revision, data_revision } = await res.json();
    const stored = parseInt(localStorage.getItem('tnea-app-revision') || '0', 10);
    if (app_revision !== stored) {
      // New revision — wipe all SW caches so fresh assets are fetched
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      localStorage.setItem('tnea-app-revision', String(app_revision));
    }
    // Always keep data_revision in sync
    localStorage.setItem('tnea-data-revision', String(data_revision));
  } catch (e) {
    // Network offline or api missing — silently continue
  }
}

/* ── Init ── */
async function init() {
  S.isMobile = window.innerWidth < 768;

  // Silent revision/cache check — must run first
  await checkRevision();

  // Service Worker (non-blocking)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      navigator.serviceWorker.addEventListener('message', e => {
        if (e.data?.type === 'CACHE_PROGRESS') {
          const pct = Math.round((e.data.loaded / e.data.total) * 100);
          $('loading-bar').style.width = pct + '%';
          $('loading-status').textContent = `Caching data ${e.data.loaded}/${e.data.total}…`;
        }
      });
    }).catch(e => console.warn('SW:', e));
  }

  // Theme
  const saved = localStorage.getItem('tnea-theme');
  if (saved === 'dark' || (!saved && matchMedia('(prefers-color-scheme:dark)').matches)) {
    applyTheme('dark');
  }

  // Community gate — hide loading overlay first so gate is visible
  const p = localStorage.getItem('tnea-primary');
  if (!p) {
    // Immediately hide loading overlay so gate dialog is not blocked
    $('loading-overlay').classList.add('hidden');
    showGate();
    // bindEvents called inside showGate after user selects community → boot
  } else {
    S.primaryComm = p;
    S.cutoffComm = p;
    $('cutoff-comm').value = p;
    boot(); // bindEvents called at end of boot
  }
}

function applyTheme(mode) {
  document.body.className = mode;
  $('icon-sun').classList.toggle('hidden', mode === 'light');
  $('icon-moon').classList.toggle('hidden', mode === 'dark');
  localStorage.setItem('tnea-theme', mode);
}

/* ── Community Gate ── */
function showGate() {
  const gate = $('community-gate');
  gate.classList.remove('hidden');
  let selected = null;

  gate.querySelectorAll('.gate-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      gate.querySelectorAll('.gate-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      selected = chip.dataset.community;
      $('gate-continue').disabled = false;
    });
  });

  $('gate-continue').addEventListener('click', () => {
    if (!selected) return;
    S.primaryComm = selected;
    S.cutoffComm = selected;
    $('cutoff-comm').value = selected;
    localStorage.setItem('tnea-primary', selected);
    gate.classList.add('hidden');
    boot();
  });
}

/* ── Boot (after gate) ── */
async function boot() {
  showLoading(true);
  await loadYear(S.year);
  showLoading(false);
  buildDistrictList();
  syncCommChips();
  bindEvents(); // bind after data is ready
  render();
}

function showLoading(v) {
  const el = $('loading-overlay');
  if (v) { el.classList.remove('hidden','fade-out'); $('loading-bar').style.width='0%'; }
  else { el.classList.add('fade-out'); setTimeout(()=>el.classList.add('hidden'),450); }
}

/* ── Data Loading ── */
async function loadYear(year) {
  $('loading-status').textContent = `Loading ${year}…`;
  $('loading-bar').style.width = '30%';
  try {
    const res = await fetch(`./assets/${year}.json`);
    if (!res.ok) throw new Error(res.status);
    const raw = await res.json();
    $('loading-bar').style.width = '75%';
    S.data = raw.map(r => {
      const d = DISTRICT_NORM[r.district] || r.district || 'Unknown';
      const conClean = r.con ? r.con.split('\n')[0].trim() : '';
      const abbrMatch = r.con ? r.con.match(/\(([^)]+)\)/g) : null;
      const abbrs = abbrMatch ? abbrMatch.map(m => m.slice(1,-1).toLowerCase()) : [];
      return { ...r, district: d, _conClean: conClean, _abbrs: abbrs };
    });
    buildSearchIndex();
    $('loading-bar').style.width = '100%';
  } catch(e) {
    $('loading-status').textContent = `Error: ${e.message}`;
    console.error(e);
  }
}

/* ── Search Index (Trie) ── */
class Trie{
  constructor(){this.r={};}
  add(w,i){let n=this.r;for(const c of w){if(!n[c])n[c]={_:[]};if(n[c]._.length<5000)n[c]._.push(i);n=n[c];}}
  find(p){let n=this.r;for(const c of p){if(!n[c])return new Set();n=n[c];}return new Set(this._c(n));}
  _c(n){let r=[...n._];for(const k in n){if(k!=='_')r=r.concat(this._c(n[k]));}return r;}
}

function buildSearchIndex() {
  const t = new Trie();
  S.districtIndex = new Map();
  S.data.forEach((r,i) => {
    tok(r._conClean).forEach(w => t.add(w,i));
    r._abbrs.forEach(a => t.add(a,i));
    tok(r.brn||'').forEach(w => t.add(w,i));
    if(r.brc) t.add(r.brc.toLowerCase(),i);
    t.add(String(r.coc),i);
    t.add(String(r.coc).padStart(4,'0'),i);
    const d=r.district;
    if(!S.districtIndex.has(d))S.districtIndex.set(d,new Set());
    S.districtIndex.get(d).add(i);
  });
  S.trie = t;
}

function tok(s){return s.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w);}

/* ── Filter & Sort ── */
function applyFilters() {
  if (!S.trie) { S.filtered = []; return; } // guard: data not loaded yet
  let res;
  if (S.search.trim()) {
    const terms = tok(S.search);
    let sets = terms.map(t => S.trie.find(t));
    let base = sets[0];
    for(let i=1;i<sets.length;i++) base = new Set([...base].filter(x=>sets[i].has(x)));
    res = [...base].map(i => S.data[i]);
  } else {
    res = S.data;
  }

  if (S.districts.size > 0)
    res = res.filter(r => S.districts.has(r.district));

  if (S.cutoffComm && (S.cutoffMin > 0 || S.cutoffMax < 200)) {
    res = res.filter(r => {
      const v = parseFloat(r[S.cutoffComm]);
      if (isNaN(v)) return false;
      return v >= S.cutoffMin && v <= S.cutoffMax;
    });
  }

  res = sortArr(res);
  S.filtered = res;
  S.rendered = 0;
  S.expandedIdx = -1;
}

function sortArr(arr) {
  const comm = S.primaryComm || 'OC';
  return [...arr].sort((a,b) => {
    switch(S.sortBy) {
      case 'cutoff-desc': return (parseFloat(b[comm])||0) - (parseFloat(a[comm])||0);
      case 'cutoff-asc':  return (parseFloat(a[comm])||0) - (parseFloat(b[comm])||0);
      case 'name-asc':    return (a._conClean||'').localeCompare(b._conClean||'');
      case 'code-asc':    return a.coc - b.coc;
      case 'vacant-desc': return tVacant(b) - tVacant(a);
      default: return 0;
    }
  });
}
function tSeats(r){return COMMUNITIES.reduce((s,c)=>s+(r[SEAT_KEYS[c].tl]||0),0);}
function tFill(r){return COMMUNITIES.reduce((s,c)=>s+(r[SEAT_KEYS[c].al]||0),0);}
function tVacant(r){return tSeats(r)-tFill(r);}

/* ── Render ── */
function render() {
  applyFilters();
  $('result-count').textContent = S.filtered.length.toLocaleString() + ' results';
  if (S.isMobile) renderMobile(true); else renderDesktop(true);
  $('empty-state').classList.toggle('hidden', S.filtered.length > 0);
}

/* ── Desktop Rendering ── */
function updateGridStyle() {
  const comms = [...S.activeComms];
  const n = comms.length;
  // grid: code(56) inst(auto) branch(auto) + N comm cols(64px each)
  const cols = `56px minmax(160px,1.4fr) minmax(120px,1fr) repeat(${n}, 64px)`;
  $('grid-style').textContent = `.results-header,.result-row{display:grid;grid-template-columns:${cols};}`;

  // Build header
  const hdr = $('results-header');
  hdr.innerHTML = `
    <div class="r-code" style="font-size:.6875rem;padding:8px 8px 8px 12px">CODE</div>
    <div class="r-inst" style="font-size:.6875rem;padding:8px">INSTITUTE</div>
    <div class="r-branch" style="font-size:.6875rem;padding:8px">BRANCH</div>
    ${comms.map(c=>`<div class="r-cutoff" style="font-size:.6875rem;padding:8px 10px;color:var(--text-secondary)">${c}</div>`).join('')}`;
}

function renderDesktop(reset) {
  const body = $('results-body');
  if (reset) { body.innerHTML = ''; S.rendered = 0; updateGridStyle(); }
  const from = S.rendered;
  const to = Math.min(from+CHUNK, S.filtered.length);
  const comms = [...S.activeComms];
  const frag = document.createDocumentFragment();
  for (let i=from;i<to;i++) {
    frag.appendChild(mkDesktopRow(S.filtered[i], i, comms));
  }
  body.appendChild(frag);
  S.rendered = to;
}

function mkDesktopRow(r, idx, comms) {
  const row = document.createElement('div');
  row.className = 'result-row';
  row.dataset.idx = idx;
  const code = String(r.coc).padStart(4,'0');
  const con  = r._conClean || '';
  const dist = r.district || '';
  const pc   = S.primaryComm || 'OC';
  const sk   = SEAT_KEYS[pc];
  const tl   = r[sk.tl] || 0;
  const al   = r[sk.al] || 0;
  const vac  = tl - al;
  const pct  = tl > 0 ? Math.round(al / tl * 100) : -1;
  let seatCls = '', seatTxt = '';
  if (tl > 0) {
    if (pct === 100) { seatCls = 'seats-full';    seatTxt = `${al}/${tl} filled`; }
    else if (vac <= 3) { seatCls = 'seats-partial'; seatTxt = `${vac} left / ${tl}`; }
    else               { seatCls = 'seats-low';     seatTxt = `${vac} available`; }
  }

  let html = `
    <div class="r-code">${esc(code)}</div>
    <div class="r-inst">
      <div class="r-inst-name">${esc(con)}</div>
      <div class="r-inst-meta">
        <span class="r-inst-district">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${esc(dist)}
        </span>
        ${tl > 0 ? `<span class="r-inst-seats ${seatCls}">${seatTxt}</span>` : ''}
      </div>
    </div>
    <div class="r-branch">
      <div class="r-branch-code">${esc(r.brc||'')}</div>
      <div class="r-branch-name">${esc(r.brn||'')}</div>
    </div>`;

  comms.forEach(c => {
    const v = r[c]; const n = parseFloat(v);
    if (v===''||v===null||v===undefined||isNaN(n))
      html += `<div class="r-cutoff empty">—</div>`;
    else
      html += `<div class="r-cutoff">${n%1===0?n:n.toFixed(1)}</div>`;
  });

  // Blinking CTA spanning all columns — bottom-left
  html += `<div class="r-vacant-hint" title="Click to see seat details"> Show vacant seats</div>`;

  row.innerHTML = html;
  row.addEventListener('click', () => toggleDesktopDrawer(row, r, idx));
  return row;
}

function toggleDesktopDrawer(row, r, idx) {
  const body = $('results-body');
  const existing = body.querySelector(`.result-drawer[data-for="${idx}"]`);
  if (existing) {
    existing.remove(); row.classList.remove('expanded'); S.expandedIdx = -1; return;
  }
  // Close previous
  const prev = body.querySelector('.result-drawer');
  if (prev) { prev.remove(); body.querySelector('.result-row.expanded')?.classList.remove('expanded'); }

  row.classList.add('expanded');
  S.expandedIdx = idx;

  const drawer = document.createElement('div');
  drawer.className = 'result-drawer';
  drawer.dataset.for = idx;
  drawer.innerHTML = buildDrawerHTML(r);
  row.insertAdjacentElement('afterend', drawer);
}

function buildDrawerHTML(r) {
  let cols = '';
  COMMUNITIES.forEach(c => {
    const v = r[c]; const n = parseFloat(v); const has = v!==''&&v!==null&&!isNaN(n);
    const sk = SEAT_KEYS[c]; const tl = r[sk.tl]||0; const al = r[sk.al]||0;
    const pct = tl>0?Math.round(al/tl*100):0;
    const bc = tl===0?'':pct===100?'bar-full':pct>=50?'bar-partial':'bar-low';
    const isPrimary = c === S.primaryComm;
    const vac = tl - al;
    cols += `
      <div class="drawer-col">
        <div class="drawer-comm-tag${isPrimary?' primary':''}">${c}${isPrimary?' ★':''}</div>
        <div class="drawer-cutoff-val${has?'':' nd'}">${has?(n%1===0?n:n.toFixed(1)):'—'}</div>
        ${tl>0?`
          <div class="drawer-fraction">${al}/${tl}</div>
          <div class="drawer-bar"><div class="drawer-bar-fill ${bc}" style="width:${pct}%"></div></div>
          <div class="drawer-pct">${pct}%${vac>0?' · '+vac+' vacant':''}</div>
        `:`<div class="drawer-fraction" style="color:var(--text-muted)">—</div>`}
      </div>`;
  });
  const addr = r.address || '';
  return `<div class="drawer-grid">${cols}</div>
    ${addr?`<div class="drawer-address"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${esc(addr)}</div>`:''}`;
}

/* ── Mobile Rendering ── */
function renderMobile(reset) {
  const list = $('mobile-list');
  if (reset) { list.innerHTML = ''; S.rendered = 0; }
  const from = S.rendered;
  const to = Math.min(from+CHUNK, S.filtered.length);
  const frag = document.createDocumentFragment();
  const multiComms = S.activeComms.size > 1;
  for (let i=from;i<to;i++) {
    frag.appendChild(mkMobileCard(S.filtered[i], i, multiComms));
  }
  list.appendChild(frag);
  S.rendered = to;
}

function mkMobileCard(r, idx, multiComms) {
  const wrap = document.createElement('div');
  const pc = S.primaryComm||'OC';
  const code = String(r.coc).padStart(4,'0');
  const con  = r._conClean||'';
  const dist = r.district || '';
  const v  = r[pc]; const n = parseFloat(v); const has = v!==''&&v!==null&&!isNaN(n);
  const sk = SEAT_KEYS[pc]; const tl = r[sk.tl]||0; const al = r[sk.al]||0;

  // Seat badge
  const vac = tl - al;
  let badgeHTML = '';
  if (tl > 0) {
    if (vac === 0) badgeHTML = `<div class="seat-badge badge-full">✓ Fully subscribed</div>`;
    else if (vac <= 3) badgeHTML = `<div class="seat-badge badge-partial">${vac} seat${vac>1?'s':''} available</div>`;
    else               badgeHTML = `<div class="seat-badge badge-empty">${vac} seats available</div>`;
  }

  // Multi-community inline display
  let mcHTML = '';
  if (multiComms) {
    const comms = [pc, ...COMMUNITIES.filter(c => c !== pc && S.activeComms.has(c))];
    mcHTML = `<div class="m-multi-comms">${comms.map(c => {
      const cv = r[c]; const cn = parseFloat(cv); const ch = cv!==''&&cv!==null&&!isNaN(cn);
      const csk = SEAT_KEYS[c]; const ctl = r[csk.tl]||0; const cal = r[csk.al]||0;
      const isPrimary = c === pc;
      return `<div class="m-mc-item">
        <div class="m-mc-tag${isPrimary?' primary':''}">${c}${isPrimary?' ★':''}</div>
        <div class="m-mc-val${ch?'':' nd'}">${ch?(cn%1===0?cn:cn.toFixed(1)):'—'}</div>
        ${ctl>0?`<div class="m-mc-seats">${cal}/${ctl}</div>`:''}
      </div>`;
    }).join('')}</div>`;
  }

  const card = document.createElement('div');
  card.className = 'm-card';
  card.dataset.idx = idx;
  card.innerHTML = `
    <div class="m-top">
      <div class="m-left">
        <div class="m-code-line">
          <span class="m-code">${code}</span>
          <span class="m-district">${esc(dist)}</span>
        </div>
        <div class="m-college">${esc(con)}</div>
        <div class="m-branch">${esc(r.brc||'')} — ${esc(r.brn||'')}</div>
      </div>
      ${!multiComms ? `<div class="m-right">
        <div class="m-comm-label">${pc}</div>
        <div class="m-cutoff${has?'':' nd'}">${has?(n%1===0?n:n.toFixed(1)):'—'}</div>
        ${tl>0?`<div class="m-seats-line">${al}/${tl} seats</div>`:''}
      </div>` : ''}
    </div>
    ${multiComms ? mcHTML : ''}
    ${badgeHTML}
    <div class="m-vacant-hint" title="Tap to see all community seat details">⥤ Show vacant seats</div>`;

  card.addEventListener('click', () => toggleMobileDrawer(wrap, r, idx, card));
  wrap.appendChild(card);
  return wrap;
}

function toggleMobileDrawer(wrap, r, idx, card) {
  const existing = wrap.querySelector('.m-drawer');
  if (existing) { existing.remove(); card.classList.remove('expanded'); S.expandedIdx=-1; return; }

  // Close previous
  $$('.m-drawer').forEach(el=>el.remove());
  $$('.m-card.expanded').forEach(el=>el.classList.remove('expanded'));

  card.classList.add('expanded');
  S.expandedIdx = idx;

  const drawer = document.createElement('div');
  drawer.className = 'm-drawer';
  const pc = S.primaryComm||'OC';
  const ordered = [pc, ...COMMUNITIES.filter(c=>c!==pc)];

  let html = '';
  ordered.forEach(c => {
    const v = r[c]; const n = parseFloat(v); const has = v!==''&&v!==null&&!isNaN(n);
    const sk = SEAT_KEYS[c]; const tl = r[sk.tl]||0; const al = r[sk.al]||0;
    const pct = tl>0?Math.round(al/tl*100):0;
    const bc = tl===0?'':pct===100?'bar-full':pct>=50?'bar-partial':'bar-low';
    const isPrimary = c===pc;
    html += `
      <div class="md-row${isPrimary?' is-primary':''}">
        <div class="md-left">
          <div class="md-tag${isPrimary?' primary':''}">${c}</div>
          <div class="md-cutoff${has?'':' nd'}">${has?(n%1===0?n:n.toFixed(1)):'—'}</div>
        </div>
        <div class="md-right">
          ${tl>0?`
            <div class="md-bar-wrap"><div class="md-bar"><div class="md-bar-fill ${bc}" style="width:${pct}%"></div></div></div>
            <div class="md-fraction">${al}/${tl}</div>
          `:`<div style="font-size:.7rem;color:var(--text-muted)">—</div>`}
        </div>
      </div>`;
  });

  const addr = r.address||'';
  if (addr) html += `<div class="m-address"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${esc(addr)}</div>`;

  drawer.innerHTML = html;
  wrap.appendChild(drawer);
}

/* ── District List ── */
function buildDistrictList() {
  const districts = [...S.districtIndex.keys()].sort();

  // Desktop dropdown
  const ddList = $('dd-list');
  ddList.innerHTML = '';
  districts.forEach(d => {
    const lbl = document.createElement('label');
    lbl.innerHTML = `<input type="checkbox" value="${esc(d)}"/>${esc(d)}`;
    lbl.querySelector('input').addEventListener('change', e => {
      if (e.target.checked) S.districts.add(d); else S.districts.delete(d);
      syncDistrictLabel(); render();
    });
    ddList.appendChild(lbl);
  });

  // Mobile sheet
  const sheetList = $('district-sheet-list');
  sheetList.innerHTML = '';
  districts.forEach(d => {
    const lbl = document.createElement('label');
    lbl.innerHTML = `<input type="checkbox" value="${esc(d)}"/>${esc(d)}`;
    sheetList.appendChild(lbl);
  });

  // Desktop search
  $('dd-search-input').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    ddList.querySelectorAll('label').forEach(l => l.style.display = l.textContent.toLowerCase().includes(q)?'':'none');
  });
  // Mobile search
  $('district-sheet-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    sheetList.querySelectorAll('label').forEach(l => l.style.display = l.textContent.toLowerCase().includes(q)?'':'none');
  });
}

function syncDistrictLabel() {
  const n = S.districts.size;
  $('district-label').textContent = n > 0 ? `District (${n})` : 'District';
  $('district-btn').classList.toggle('active', n > 0);
}

/* ── Community Chips ── */
function syncCommChips() {
  const bar = $('comm-bar');
  bar.querySelectorAll('.comm-chip').forEach(chip => {
    const c = chip.dataset.community;
    if (c === 'ALL') {
      chip.classList.toggle('active', S.activeComms.size === 7);
    } else {
      chip.classList.toggle('active', S.activeComms.has(c));
      chip.classList.toggle('is-primary', c === S.primaryComm);
    }
  });
}

/* ── Event Binding ── */
function bindEvents() {
  // Theme
  $('theme-toggle').addEventListener('click', () => {
    applyTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
  });

  // Search
  let st;
  $('search-input').addEventListener('input', e => {
    S.search = e.target.value;
    $('search-clear').classList.toggle('hidden', !S.search);
    clearTimeout(st); st = setTimeout(render, 150);
  });
  $('search-clear').addEventListener('click', () => {
    $('search-input').value = ''; S.search = '';
    $('search-clear').classList.add('hidden');
    render(); $('search-input').focus();
  });

  // Year tabs
  $('year-tabs').addEventListener('click', async e => {
    const tab = e.target.closest('.year-tab');
    if (!tab || tab.dataset.year === S.year) return;
    $$('.year-tab').forEach(t => {
      t.classList.toggle('active', t === tab);
      t.setAttribute('aria-selected', String(t === tab));
    });
    S.year = tab.dataset.year;
    showLoading(true);
    await loadYear(S.year);
    buildDistrictList();
    showLoading(false);
    render();
  });

  // District button — desktop dropdown or mobile sheet
  $('district-btn').addEventListener('click', e => {
    e.stopPropagation();
    if (S.isMobile) {
      // Open mobile bottom sheet
      $('district-sheet').classList.remove('hidden');
    } else {
      // Toggle desktop dropdown
      const dd = $('district-dropdown');
      const open = !dd.hidden;
      dd.hidden = open;
      $('district-btn').setAttribute('aria-expanded', String(!open));
    }
  });
  // Close desktop dropdown on outside click
  document.addEventListener('click', e => {
    if (!$('district-wrap').contains(e.target)) {
      $('district-dropdown').hidden = true;
      $('district-btn').setAttribute('aria-expanded', 'false');
    }
  });
  $('dd-clear').addEventListener('click', () => {
    S.districts.clear();
    $('dd-list').querySelectorAll('input').forEach(cb=>cb.checked=false);
    syncDistrictLabel(); render();
  });

  // Mobile sheet district
  $('district-sheet-backdrop').addEventListener('click', () => $('district-sheet').classList.add('hidden'));
  $('district-sheet-close').addEventListener('click', () => $('district-sheet').classList.add('hidden'));
  $('district-sheet-clear').addEventListener('click', () => {
    S.districts.clear();
    $('district-sheet-list').querySelectorAll('input').forEach(cb=>cb.checked=false);
    syncDistrictLabel();
  });
  $('district-sheet-apply').addEventListener('click', () => {
    S.districts.clear();
    $('district-sheet-list').querySelectorAll('input:checked').forEach(cb=>S.districts.add(cb.value));
    syncDistrictLabel();
    $('district-sheet').classList.add('hidden');
    render();
  });

  // Community chips
  $('comm-bar').addEventListener('click', e => {
    const chip = e.target.closest('.comm-chip');
    if (!chip) return;
    const c = chip.dataset.community;

    if (c === 'ALL') {
      if (S.activeComms.size === 7) {
        // All active → deselect all, keep only primary
        S.activeComms = new Set([S.primaryComm]);
      } else {
        S.activeComms = new Set(COMMUNITIES);
      }
    } else {
      if (S.activeComms.has(c)) {
        if (S.activeComms.size > 1) S.activeComms.delete(c);
      } else {
        S.activeComms.add(c);
      }
    }

    syncCommChips();
    render();
  });

  // Cutoff inputs
  $('cutoff-min').addEventListener('change', e => {
    S.cutoffMin = Math.max(0, parseFloat(e.target.value)||0);
    e.target.value = S.cutoffMin;
    render();
  });
  $('cutoff-max').addEventListener('change', e => {
    S.cutoffMax = Math.min(200, parseFloat(e.target.value)||200);
    e.target.value = S.cutoffMax;
    render();
  });
  $('cutoff-comm').addEventListener('change', e => {
    S.cutoffComm = e.target.value;
    render();
  });

  // Sort
  $('sort-select').addEventListener('change', e => {
    S.sortBy = e.target.value;
    render();
  });

  // Empty reset
  $('empty-reset').addEventListener('click', resetAll);

  // Infinite scroll
  const obs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting && S.rendered < S.filtered.length) {
        if (S.isMobile) renderMobile(false); else renderDesktop(false);
      }
    });
  }, { rootMargin: '200px' });
  obs.observe($('sentinel'));

  // Responsive breakpoint
  let wasMobile = S.isMobile;
  window.addEventListener('resize', () => {
    const now = window.innerWidth < 768;
    if (now !== wasMobile) { wasMobile = now; S.isMobile = now; render(); }
  });
}

function resetAll() {
  $('search-input').value = ''; S.search = '';
  $('search-clear').classList.add('hidden');
  S.districts.clear();
  $('dd-list').querySelectorAll('input').forEach(cb=>cb.checked=false);
  syncDistrictLabel();
  S.activeComms = new Set(COMMUNITIES);
  syncCommChips();
  S.cutoffMin = 0; S.cutoffMax = 200; S.cutoffComm = S.primaryComm||'';
  $('cutoff-min').value = 0; $('cutoff-max').value = 200;
  $('cutoff-comm').value = S.cutoffComm;
  S.sortBy = 'cutoff-desc'; $('sort-select').value = 'cutoff-desc';
  render();
}

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

document.addEventListener('DOMContentLoaded', init);
