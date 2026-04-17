import { $, $$, esc, tok } from '../../shared/js/utils.js';
import { applyTheme } from '../../shared/js/theme.js';
import { Trie } from '../../shared/js/trie.js';
import { TNEA_CONFIG } from './tnea-config.js';
import { buildInfeedAd, initVignetteAd } from '../../shared/js/ad-engine.js';

const _v1 = "rank";

const S = {
  year: '2025',
  data: [],
  filtered: [],
  rendered: 0,
  expandedIdx: -1,

  search: '',
  districts: new Set(),
  primaryComm: null,

  cutoffMin: 0,
  cutoffMax: 200,
  cutoffComm: '',

  sortBy: 'cutoff-desc',
  isMobile: false,

  trie: null,
  districtIndex: null,
};

// Variables removed

function setCommUI(val) {
  $$('.comm-option').forEach(o => o.classList.toggle('active', o.dataset.value === val));
  if ($('comm-btn-text')) $('comm-btn-text').textContent = val || 'OC';
}

/* ── No AdSense / DIY Universal Ads ── */
// universal ads are now dynamically inserted via generateAdMockup()

function syncURL() {
  const params = new URLSearchParams();
  if (S.year !== '2025') params.set('year', S.year);
  if (S.search) params.set('q', S.search);
  if (S.districts.size > 0) params.set('d', [...S.districts].join(','));
  if (S.cutoffComm) params.set('c', S.cutoffComm);
  if (S.cutoffMin > 0) params.set('min', S.cutoffMin);
  if (S.cutoffMax < 200) params.set('max', S.cutoffMax);
  if (S.sortBy !== 'cutoff-desc') params.set('sort', S.sortBy);


  const qs = params.toString();
  const url = window.location.pathname + (qs ? '?' + qs : '');
  window.history.replaceState(null, '', url);
}

/* ── Custom UI Components ── */
function showFeatureNotice(title = 'Feature Coming Soon', message = "We're building this! 🚀 Our team is working hard to bring you detailed college and course insights. Check back in a few days!") {
  const container = $('info-box-container');
  if (!container) return;

  const box = document.createElement('div');
  box.className = 'info-box';
  box.innerHTML = `
    <div class="info-box-icon"><i class="fa-solid fa-circle-info"></i></div>
    <div class="info-box-content">
      <div class="info-box-title">${esc(title)}</div>
      <div class="info-box-text">${esc(message)}</div>
    </div>
  `;

  container.appendChild(box);

  setTimeout(() => {
    box.classList.add('info-box--closing');
    box.addEventListener('animationend', () => box.remove());
  }, 4000);
}

function showShareModal() {
  const modal = $('share-modal');
  if (!modal) return;

  const url = window.location.href;
  $('share-link-input').value = url;
  modal.classList.remove('hidden');

  const copyBtn = $('share-copy-btn');
  copyBtn.textContent = 'Copy';
}

function copyLink() {
  const input = $('share-link-input');
  const btn = $('share-copy-btn');
  input.select();
  input.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(input.value).then(() => {
    btn.textContent = 'Copied!';
    showFeatureNotice('Link Copied', 'The share link has been copied to your clipboard.');
    setTimeout(() => {
      btn.textContent = 'Copy';
    }, 2000);
  });
}

const _v2 = "vicky";

function initFromURL() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('year')) S.year = params.get('year');
  if (params.has('q')) {
    S.search = params.get('q');
    $('search-input').value = S.search;
    $('search-clear').classList.remove('hidden');
  }
  if (params.has('d')) {
    params.get('d').split(',').forEach(d => S.districts.add(d));
    syncDistrictLabel();
  }
  if (params.has('c')) {
    S.cutoffComm = params.get('c');
    setCommUI(S.cutoffComm);
  }
  if (params.has('min')) {
    S.cutoffMin = parseFloat(params.get('min'));
    $('cutoff-min').value = S.cutoffMin;
  }
  if (params.has('max')) {
    S.cutoffMax = parseFloat(params.get('max'));
    $('cutoff-max').value = S.cutoffMax;
  }
  if (params.has('sort')) {
    S.sortBy = params.get('sort');
    // Update sort UI
    $$('#sort-dropdown .sort-option').forEach(opt => {
      if (opt.dataset.value === S.sortBy) {
        opt.classList.add('active');
        const textNodes = opt.textContent.split('\n')[0].trim();
        $('sort-btn-text').textContent = opt.textContent.replace(/<i.*<\/i>/, '').trim();
      } else {
        opt.classList.remove('active');
      }
    });
  }
}

/* ── Init ── */
async function init() {
  S.isMobile = window.innerWidth < 768;

  initFromURL();

  // Vignette Ad via centralized ad-engine
  initVignetteAd('vignette-ad', 'vignette-close');

  // Generate year tabs from config
  const yt = $('year-tabs');
  if (yt) {
    yt.innerHTML = '';
    TNEA_CONFIG.years.forEach(yr => {
      const btn = document.createElement('button');
      btn.className = 'year-tab' + (yr === S.year ? ' active' : '');
      btn.dataset.year = yr;
      btn.setAttribute('role', 'tab');
      if (yr === S.year) btn.setAttribute('aria-selected', 'true');
      btn.textContent = yr;
      yt.appendChild(btn);
    });
  }

  // Theme
  const saved = localStorage.getItem('rankra-theme');
  if (saved === 'dark' || (!saved && matchMedia('(prefers-color-scheme:dark)').matches)) {
    applyTheme('dark');
  }

  // Community gate
  const p = localStorage.getItem('tnea-primary');
  if (!p) {
    showGate();
  } else {
    S.primaryComm = p;
    if (!S.cutoffComm) S.cutoffComm = p;
    setCommUI(S.cutoffComm);
    boot();
  }
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
    if (!S.cutoffComm) S.cutoffComm = selected;
    setCommUI(S.cutoffComm);
    localStorage.setItem('tnea-primary', selected);
    gate.classList.add('hidden');
    boot();
  });
}

async function boot() {
  renderSkeletons();
  await loadYear(S.year);
  buildDistrictList();
  bindEvents(); // bind after data is ready
  render();
  preCacheAllYears(); // Kick off silent background caching
}


const _v3 = "1611";

async function _rx(_d) {
  const _k = (_v1 + "ra" + _v2 + _v3).split('').map(c => c.charCodeAt(0));
  const _b = new Uint8Array(_d);
  for (let i = 0; i < _b.length; i++) _b[i] ^= _k[i % _k.length];
  const _s = new Response(_b).body.pipeThrough(new DecompressionStream('gzip'));
  return new Response(_s).json();
}

/* ── Caching Logic ── */
const BR_CACHE_KEY = 'tnea_db_cutoffmark_cached';

function markYearCached(year) {
  let cached = localStorage.getItem(BR_CACHE_KEY) || '';
  let years = cached ? cached.split(',').filter(Boolean) : [];
  if (!years.includes(year)) {
    years.push(year);
    localStorage.setItem(BR_CACHE_KEY, years.join(','));
  }
}

async function preCacheAllYears() {
  // Wait 4s to ensure main entry render and initial ads are settled
  await new Promise(r => setTimeout(r, 4000));
  
  const cachedStr = localStorage.getItem(BR_CACHE_KEY) || '';
  const cachedSet = new Set(cachedStr.split(',').filter(Boolean));

  for (const year of TNEA_CONFIG.years) {
    if (cachedSet.has(year)) continue;
    
    const rev = year.split('').reverse().join('');
    try {
      // Fetching actually populates the browser's HTTP cache
      const res = await fetch(`${TNEA_CONFIG.dataPath}${rev}.gzip`, { cache: 'no-cache' });
      if (res.ok) {
        markYearCached(year);
        // Small stagger to avoid hammering the network
        await new Promise(r => setTimeout(r, 1200));
      }
    } catch (e) {
      console.warn(`Background cache failed for ${year}:`, e);
    }
  }
}

/* ── Data Loading ── */
async function loadYear(year) {
  const rev = year.split('').reverse().join('');
  try {
    const res = await fetch(`${TNEA_CONFIG.dataPath}${rev}.gzip`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    markYearCached(year); // Mark this year as cached
    const buf = await res.arrayBuffer();
    const raw = await _rx(buf);
    S.data = raw.map(r => {
      const d = TNEA_CONFIG.districtNorm[r.district] || r.district || 'Unknown';
      const conClean = r.con ? r.con.split('\n')[0].trim() : '';
      const abbrMatch = r.con ? r.con.match(/\(([^)]+)\)/g) : null;
      const abbrs = abbrMatch ? abbrMatch.map(m => m.slice(1, -1).toLowerCase()) : [];
      return { ...r, district: d, _conClean: conClean, _abbrs: abbrs };
    });
    buildSearchIndex();
  } catch (e) {
    console.error(e);
  }
}

/* ── Search Index (Trie) ── */
function buildSearchIndex() {
  const t = new Trie();
  S.districtIndex = new Map();
  S.data.forEach((r, i) => {
    tok(r._conClean).forEach(w => t.add(w, i));
    r._abbrs.forEach(a => t.add(a, i));
    tok(r.brn || '').forEach(w => t.add(w, i));
    if (r.brc) t.add(r.brc.toLowerCase(), i);
    t.add(String(r.coc), i);
    t.add(String(r.coc).padStart(4, '0'), i);
    const d = r.district;
    if (!S.districtIndex.has(d)) S.districtIndex.set(d, new Set());
    S.districtIndex.get(d).add(i);
  });
  S.trie = t;
}

/* ── Filter & Sort ── */
function applyFilters() {
  if (!S.trie) { S.filtered = []; return; } // guard: data not loaded yet
  let res;
  if (S.search.trim()) {
    const terms = tok(S.search);
    let master = new Set();
    terms.forEach(t => {
      const s = S.trie.find(t);
      s.forEach(idx => master.add(idx));
    });
    res = [...master].map(i => S.data[i]);
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
  const comm = S.cutoffComm || S.primaryComm || 'OC';
  return [...arr].sort((a, b) => {
    switch (S.sortBy) {
      case 'cutoff-desc': {
        const vA = parseFloat(a[comm]) || 0; const vB = parseFloat(b[comm]) || 0;
        return vB - vA;
      }
      case 'cutoff-asc': {
        const vA = parseFloat(a[comm]) || 0; const vB = parseFloat(b[comm]) || 0;
        return vA - vB;
      }
      case 'name-asc': return (a._conClean || '').localeCompare(b._conClean || '');
      case 'code-asc': return a.coc - b.coc;
      case 'vacant-desc': return tVacant(b) - tVacant(a);
      default: return 0;
    }
  });
}

function tSeats(r) { return TNEA_CONFIG.communities.reduce((s, c) => s + (parseInt(r[TNEA_CONFIG.seatKeys[c].tl], 10) || 0), 0); }
function tFill(r) { return TNEA_CONFIG.communities.reduce((s, c) => s + (parseInt(r[TNEA_CONFIG.seatKeys[c].al], 10) || 0), 0); }
function tVacant(r) { return tSeats(r) - tFill(r); }

/* ── Render ── */
let _scrollObserver = null;

function render() {
  // Disconnect any previous observer so stale sentinels don't trigger
  if (_scrollObserver) { _scrollObserver.disconnect(); _scrollObserver = null; }

  $('results-body').innerHTML = '';
  window.scrollTo({ top: 0 });
  applyFilters();
  syncURL();
  S.rendered = 0;
  renderResults();
  $('empty-state').classList.toggle('hidden', S.filtered.length > 0);
  if ($('results-count')) {
    const total = S.filtered.length;
    $('results-count').textContent = total > 0 ? `${total} result${total !== 1 ? 's' : ''}` : '';
  }
}

const BATCH = 7;

function renderResults() {
  const body = $('results-body');
  const from = S.rendered;
  const to   = Math.min(from + BATCH, S.filtered.length);
  if (from >= to) return;

  const frag = document.createDocumentFragment();
  let lastCard = null;

  for (let i = from; i < to; i++) {
    const card = mkResultCard(S.filtered[i], i);
    frag.appendChild(card);
    lastCard = card;
  }

  // Inject ad after the first card of the first batch only if interval allows
  if (from === 0) {
    const firstCard = frag.firstElementChild;
    const ad = buildInfeedAd();
    if (ad && firstCard) firstCard.after(ad);
  }

  body.appendChild(frag);
  S.rendered = to;

  // Attach IntersectionObserver on the last card of this batch
  if (S.rendered < S.filtered.length && lastCard) {
    _scrollObserver = new IntersectionObserver((entries, obs) => {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      _scrollObserver = null;

      // Inject ad between batches if interval allows
      const ad = buildInfeedAd();
      if (ad) body.appendChild(ad);

      renderResults();
    }, { rootMargin: '0px', threshold: 0.1 });
    _scrollObserver.observe(lastCard);
  }
}

function renderSkeletons() {
  const body = $('results-body');
  body.innerHTML = '';
  $('empty-state').classList.add('hidden');
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 6; i++) {
    const s = document.createElement('div');
    s.className = 'result-card skeleton-card';
    s.innerHTML = `
      <div class="card-header">
        <div class="card-code-line">
          <div class="skeleton-box" style="width: 40px; height: 18px;"></div>
          <div class="skeleton-box" style="width: 120px; height: 16px;"></div>
        </div>
        <div class="skeleton-box" style="width: 75%; height: 22px; margin: 8px 0;"></div>
        <div class="skeleton-box" style="width: 50%; height: 16px;"></div>
      </div>
      <div class="card-foot" style="margin-top: 2px;">
         <div class="skeleton-box" style="width: 100%; height: 40px;"></div>
      </div>
    `;
    frag.appendChild(s);
  }
  body.appendChild(frag);
}

function mkResultCard(r, idx) {
  const cc = S.cutoffComm || S.primaryComm || 'OC';
  const code = String(r.coc).padStart(4, '0');

  const v = r[cc]; const n = parseFloat(v); const has = v !== '' && v !== null && !isNaN(n);
  const cutoffVal = has ? (n % 1 === 0 ? n : n.toFixed(1)) : '—';
  const csk = TNEA_CONFIG.seatKeys[cc];
  const ctl = parseInt(r[csk.tl], 10) || 0;
  const cal = parseInt(r[csk.al], 10) || 0;
  const cvac = ctl - cal;

  const communityRow = `
    <div class="ct-row ct-primary-row">
      <div class="ct-label primary">${esc(cc)}</div>
      <div class="ct-td${has ? '' : ' nd'}">${cutoffVal}</div>
      <div class="ct-td">${ctl || '—'}</div>
      <div class="ct-td">${cal || '—'}</div>
      <div class="ct-td${cvac > 0 ? ' nd' : ''}">${ctl > 0 ? cvac : '—'}</div>
    </div>`;

  const card = document.createElement('div');
  card.className = 'result-card';
  card.dataset.idx = idx;
  card.innerHTML = `
    <div class="card-header">
      <div class="card-code-line">
        <span class="card-code">${esc(code)}</span>
        <span class="card-district">${esc(r.district || '')}</span>
        <div class="card-links-row">
          <button class="card-link">College info <i class="fa-solid fa-up-right-from-square"></i></button>
          <button class="card-link">Course info <i class="fa-solid fa-up-right-from-square"></i></button>
        </div>
      </div>
      <div class="card-name">${esc(r._conClean || '')}</div>
      <div class="card-branch">${esc(r.brc || '')} — ${esc(r.brn || '')}</div>
    </div>
    <div class="comm-table">
      <div class="ct-row ct-head">
        <div class="ct-th">Community</div>
        <div class="ct-th">Cutoff</div>
        <div class="ct-th">Total seats</div>
        <div class="ct-th">Filled</div>
        <div class="ct-th">Unfilled</div>
      </div>
      ${communityRow}
    </div>
  `;

  card.querySelectorAll('.card-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.stopPropagation();
      const type = link.textContent.trim();
      showFeatureNotice(`${type} Coming Soon`);
    });
  });

  return card;
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
}

function syncDistrictLabel() {
  const n = S.districts.size;
  $('district-label').textContent = n > 0 ? `District (${n})` : 'District';
  $('district-btn').classList.toggle('active', n > 0);
}

/* ── Event Binding ── */
function bindEvents() {
  // District search (bound once here, not in buildDistrictList)
  $('dd-search-input').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    $('dd-list').querySelectorAll('label').forEach(l => l.style.display = l.textContent.toLowerCase().includes(q) ? '' : 'none');
  });
  $('district-sheet-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    $('district-sheet-list').querySelectorAll('label').forEach(l => l.style.display = l.textContent.toLowerCase().includes(q) ? '' : 'none');
  });

  const hamburgerBtn = $('hamburger-btn');
  const hamburgerMenu = $('hamburger-menu');
  const hamburgerBackdrop = $('hamburger-backdrop');

  function openMenu() {
    hamburgerMenu.classList.add('open');
    hamburgerMenu.setAttribute('aria-hidden', 'false');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
    hamburgerBackdrop.classList.remove('hidden');
  }

  function closeMenu() {
    hamburgerMenu.classList.remove('open');
    hamburgerMenu.setAttribute('aria-hidden', 'true');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    hamburgerBackdrop.classList.add('hidden');
  }

  hamburgerBtn.addEventListener('click', e => {
    e.stopPropagation();
    hamburgerMenu.classList.contains('open') ? closeMenu() : openMenu();
  });

  $('hmenu-close').addEventListener('click', closeMenu);
  hamburgerBackdrop.addEventListener('click', closeMenu);

  function syncThemePill() {
    const isDark = document.body.classList.contains('dark');
    const label = $('tpt-label');
    const sun = $('icon-sun');
    const moon = $('icon-moon');
    if (label) label.textContent = isDark ? 'NIGHTMODE' : 'DAYMODE';
    if (sun) sun.classList.toggle('hidden', isDark);
    if (moon) moon.classList.toggle('hidden', !isDark);
  }

  syncThemePill();

  $('theme-toggle').addEventListener('click', () => {
    applyTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
    syncThemePill();
  });

  // Export button
  $('export-btn').addEventListener('click', () => {
    showShareModal();
  });

  // Share Modal interactions
  const shareModal = $('share-modal');
  if (shareModal) {
    const closeShare = () => shareModal.classList.add('hidden');
    $('share-modal-close').addEventListener('click', closeShare);
    $('share-modal-backdrop').addEventListener('click', closeShare);
    $('share-copy-btn').addEventListener('click', copyLink);
  }

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
    S.currentPage = 1;

    renderSkeletons();

    await loadYear(S.year);
    buildDistrictList();
    render();
  });

  // District button — desktop dropdown or mobile sheet
  $('district-btn').addEventListener('click', e => {
    e.stopPropagation();
    if (S.isMobile) {
      $('district-sheet').classList.remove('hidden');
    } else {
      const dd = $('district-dropdown');
      const open = !dd.hidden;
      dd.hidden = open;
      $('district-btn').setAttribute('aria-expanded', String(!open));
    }
  });

  // Close dropdowns on outside click
  document.addEventListener('click', e => {
    if (!$('district-wrap').contains(e.target)) {
      $('district-dropdown').hidden = true;
      $('district-btn').setAttribute('aria-expanded', 'false');
    }
    if ($('sort-wrap') && !$('sort-wrap').contains(e.target)) {
      $('sort-dropdown').hidden = true;
      $('sort-btn').setAttribute('aria-expanded', 'false');
    }
    if ($('comm-wrap') && !$('comm-wrap').contains(e.target)) {
      $('comm-dropdown').hidden = true;
      $('comm-btn').setAttribute('aria-expanded', 'false');
    }
  });

  $('dd-clear').addEventListener('click', () => {
    S.districts.clear();
    $('dd-list').querySelectorAll('input').forEach(cb => cb.checked = false);
    syncDistrictLabel(); render();
  });

  // Mobile sheet district
  $('district-sheet-backdrop').addEventListener('click', () => $('district-sheet').classList.add('hidden'));
  $('district-sheet-close').addEventListener('click', () => $('district-sheet').classList.add('hidden'));
  $('district-sheet-clear').addEventListener('click', () => {
    S.districts.clear();
    $('district-sheet-list').querySelectorAll('input').forEach(cb => cb.checked = false);
    syncDistrictLabel();
  });
  $('district-sheet-apply').addEventListener('click', () => {
    S.districts.clear();
    $('district-sheet-list').querySelectorAll('input:checked').forEach(cb => S.districts.add(cb.value));
    syncDistrictLabel();
    $('district-sheet').classList.add('hidden');
    render();
  });

  // Cutoff inputs
  $('cutoff-min').addEventListener('change', e => {
    S.cutoffMin = Math.max(0, parseFloat(e.target.value) || 0);
    e.target.value = S.cutoffMin;
    render();
  });
  $('cutoff-max').addEventListener('change', e => {
    S.cutoffMax = Math.min(200, parseFloat(e.target.value) || 200);
    e.target.value = S.cutoffMax;
    render();
  });

  // Comm custom dropdown
  $('comm-btn').addEventListener('click', e => {
    e.stopPropagation();
    const sd = $('comm-dropdown');
    const open = !sd.hidden;
    sd.hidden = open;
    $('comm-btn').setAttribute('aria-expanded', String(!open));
  });

  $$('.comm-option').forEach(opt => {
    opt.addEventListener('click', () => {
      S.cutoffComm = opt.dataset.value;
      setCommUI(S.cutoffComm);
      $('comm-dropdown').hidden = true;
      $('comm-btn').setAttribute('aria-expanded', 'false');
      render();
    });
  });

  // Sort custom dropdown
  $('sort-btn').addEventListener('click', e => {
    e.stopPropagation();
    const sd = $('sort-dropdown');
    const open = !sd.hidden;
    sd.hidden = open;
    $('sort-btn').setAttribute('aria-expanded', String(!open));
  });

  $$('#sort-dropdown .sort-option').forEach(opt => {
    opt.addEventListener('click', () => {
      S.sortBy = opt.dataset.value;

      const textNode = opt.cloneNode(true);
      const iconBtn = textNode.querySelector('i');
      if (iconBtn) iconBtn.remove();
      $('sort-btn-text').textContent = textNode.textContent.trim();

      $$('#sort-dropdown .sort-option').forEach(o => o.classList.toggle('active', o === opt));
      $('sort-dropdown').hidden = true;
      $('sort-btn').setAttribute('aria-expanded', 'false');
      render();
    });
  });

  // Empty reset
  $('empty-reset').addEventListener('click', resetAll);

  // Load More Button
  if ($('load-more-btn')) {
    $('load-more-btn').addEventListener('click', () => {
      // Find the last item before we load more
      const cards = $$('.result-card');
      const lastItem = cards.length > 0 ? cards[cards.length - 1] : null;

      // Vanish previous ads
      $$('.in-feed-ad').forEach(el => el.remove());

      // Render next 20 items
      renderResults(false);

      if (lastItem) {
        lastItem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // Responsive breakpoint
  let wasMobile = S.isMobile;
  window.addEventListener('resize', () => {
    const now = window.innerWidth < 768;
    if (now !== wasMobile) { wasMobile = now; S.isMobile = now; render(); }
  });

  // Hide filter bar on scroll down, show on scroll up
  let lastScrollY = window.scrollY;
  const filterBar = $('filter-bar');
  window.addEventListener('scroll', () => {
    const currentY = window.scrollY;
    if (currentY <= 60) {
      // Always show near top
      filterBar.classList.remove('filter-bar--hidden');
    } else if (currentY > lastScrollY + 4) {
      // Scrolling down — hide
      filterBar.classList.add('filter-bar--hidden');
    } else if (lastScrollY > currentY + 4) {
      // Scrolling up — show
      filterBar.classList.remove('filter-bar--hidden');
    }
    lastScrollY = currentY;
  }, { passive: true });
}

function resetAll() {
  $('search-input').value = ''; S.search = '';
  $('search-clear').classList.add('hidden');
  S.districts.clear();
  $('dd-list').querySelectorAll('input').forEach(cb => cb.checked = false);
  syncDistrictLabel();
  S.cutoffMin = 0; S.cutoffMax = 200; S.cutoffComm = S.primaryComm || '';
  $('cutoff-min').value = 0; $('cutoff-max').value = 200;
  setCommUI(S.cutoffComm);
  S.sortBy = 'cutoff-desc';
  $$('.sort-option').forEach(o => o.classList.toggle('active', o.dataset.value === 'cutoff-desc'));
  if ($('sort-btn-text')) $('sort-btn-text').textContent = 'Cutoff: High → Low';
  render();
}

document.addEventListener('DOMContentLoaded', init);