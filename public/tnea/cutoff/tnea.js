import { $, $$, esc, tok } from '../../shared/js/utils.js';
import { applyTheme, initTheme } from '../../shared/js/theme.js';
import { Trie } from '../../shared/js/trie.js';
import { TNEA_CONFIG } from './tnea-config.js';
import { buildInfeedAd, initVignetteAd } from '../../shared/js/ad-engine.js';
import { FilterSheet } from '../../shared/js/FilterSheet.js';
import { SiteHeader } from '../../shared/js/SiteHeader.js';

const _v1 = "rank";

const S = {
  data: [],
  districtIndex: new Map(),
  primaryComm: '',
  cutoffComm: '',
  districts: new Set(),
  districtMode: 'include',
  colleges: new Set(),
  collegeMode: 'include',
  courses: new Set(),
  courseMode: 'include',
  year: '2025',
  search: '',
  cutoffMin: 0,
  cutoffMax: 200,
  sortBy: 'cutoff-desc',
  currentPage: 1,
  pageSize: 20,
  isMobile: window.innerWidth < 1024,
  isGuest: false,
  filterCount: parseInt(localStorage.getItem('rankra_guest_filters') || '0', 10)
};

let shDistrict, shCollege, shCourse, siteHeader;


function setCommUI(val) {
  $$('.comm-option').forEach(o => o.classList.toggle('active', o.dataset.value === val));
  if ($('comm-btn-text')) $('comm-btn-text').textContent = val || 'OC';
}

function syncURL() {
  const params = new URLSearchParams();
  if (S.year !== '2025') params.set('year', S.year);
  if (S.districts.size > 0) {
    params.set('d', [...S.districts].join(','));
    if (S.districtMode === 'exclude') params.set('dm', 'ex');
  }
  if (S.colleges.size > 0) {
    params.set('col', [...S.colleges].join('||'));
    if (S.collegeMode === 'exclude') params.set('cm', 'ex');
  }
  if (S.courses.size > 0) {
    params.set('crs', [...S.courses].join('||'));
    if (S.courseMode === 'exclude') params.set('rm', 'ex');
  }
  if (S.cutoffComm) params.set('c', S.cutoffComm);
  if (S.sortBy !== 'cutoff-desc') params.set('sort', S.sortBy);
  if (S.cutoffMin > 0) params.set('min', S.cutoffMin);
  if (S.cutoffMax < 200) params.set('max', S.cutoffMax);
  if (S.search) params.set('q', S.search);

  const qs = params.toString();
  const url = window.location.pathname + (qs ? '?' + qs : '');
  window.history.replaceState(null, '', url);
}

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

function initAwarenessModal() {
  if (localStorage.getItem('disclaimerAccept')) return;

  const modal = document.createElement('div');
  modal.className = 'overlay-full awareness-overlay';
  modal.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="gate-sheet awareness-sheet">
      <h2 class="gate-title">முக்கிய விழிப்புணர்வு</h2>
      <div class="awareness-content">
        <p style="color: var(--red); font-weight: 700; border-left: 3px solid var(--red); padding-left: 12px; margin-bottom: 16px;">65% இடங்கள் TNEA கவுன்சிலிங் மூலமும், 35% இடங்கள் மட்டுமே மேனேஜ்மென்ட் (direct admission) மூலம் நிரப்பப்படும்.</p>
        <p style="color: var(--red); font-weight: 700; border-left: 3px solid var(--red); padding-left: 12px; margin-bottom: 16px;">TNEA கவுன்சிலிங் (Govt Quota) மூலம் சேரும் மாணவர்கள் மட்டுமே First Graduate & Post Metric Scholarship, 7.5% இட ஒதுக்கீடு, வகுப்புவாரி இட ஒதுக்கீடு, sports quota மற்றும் இதர அரசு சலுகைகளை பெற முடியும்.</p>
        <p style="color: var(--red); font-weight: 700; border-left: 3px solid var(--red); padding-left: 12px; margin-bottom: 16px;">முழு அரசு கல்லூரிகளில் மேனேஜ்மென்ட் கோட்டா கிடையாது. அரசு உதவிபெரும் கல்லூரிகளில் SS(Self Supporting) course-களுக்கு மட்டும் மேனேஜ்மென்ட் கோட்டா உண்டு .</p>
        <p style="color: var(--red); font-weight: 700; border-left: 3px solid var(--red); padding-left: 12px; margin-bottom: 16px;">யாராவது உங்களுக்கு அரசு TNEA govt counselling seat-களை  வாங்கி அல்லது Lock செய்து தருவதாக சொன்னால் அது முற்றிலும் பொய்யானது, ஜாக்கிரதை!</p>
        <p style="color: var(--red); font-weight: 700; border-left: 3px solid var(--red); padding-left: 12px; margin-bottom: 16px;">யாராவது 2026 கட்-ஆஃப் உள்ளது என்று சொன்னால் அது முற்றிலும் பொய்யானது. ஏனென்றால் 2026-க்கான கவுன்சிலிங் இன்னும் நடக்கவில்லை.</p>
        <p style="color: var(--red); font-weight: 700; border-left: 3px solid var(--red); padding-left: 12px; margin-bottom: 16px;" >முயன்றவரை தாங்களே counselling செய்துகொள்ளவும், யாருக்கும் உங்களுடைய TNEA ID மற்றும் password பகிறவேண்டாம் .</p>
        <p style="color: var(--red); font-weight: 700; border-left: 3px solid var(--red); padding-left: 12px; margin-bottom: 16px;">2026-ல் புதிய கல்லூரிகள், புதிய பாடப்பிரிவுகள் வரலாம் அல்லது இடங்களின் எண்ணிக்கை அதிகரிக்கவோ அல்லது குறையவோ வாய்ப்புள்ளது.</p>
        <p>இந்த தளம் மாணவர்கள் விழிப்புணர்வு பெறவும், காலேஜ் மற்றும் கோர்ஸ்-ஐ  Maths , Physics , Chemistry மதிப்பெண் அல்லது cutoff மதிப்பெண் கொண்டு  கணிக்கவும் உருவாக்கப்பட்டது.</p>
      </div>
      <button class="gate-continue" id="awareness-close">I Understood , Continue →</button>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('awareness-close').addEventListener('click', () => {
    localStorage.setItem('disclaimerAccept', 'true');
    modal.classList.add('hidden');
    setTimeout(() => modal.remove(), 400);
  });
}

const _v2 = "vicky";

function initFromURL() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('year')) S.year = params.get('year');
  if (params.has('d')) {
    params.get('d').split(',').forEach(d => S.districts.add(d));
    if (params.get('dm') === 'ex') S.districtMode = 'exclude';
    syncDistrictLabel();
  }
  if (params.has('col')) {
    params.get('col').split('||').forEach(c => S.colleges.add(c));
    if (params.get('cm') === 'ex') S.collegeMode = 'exclude';
    syncCollegeLabel();
  }
  if (params.has('crs')) {
    params.get('crs').split('||').forEach(c => S.courses.add(c));
    if (params.get('rm') === 'ex') S.courseMode = 'exclude';
    syncCourseLabel();
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
    $$('#sort-dropdown .sort-option').forEach(opt => {
      if (opt.dataset.value === S.sortBy) {
        opt.classList.add('active');
        $('sort-btn-text').textContent = opt.textContent.replace(/<i.*<\/i>/, '').trim();
      } else {
        opt.classList.remove('active');
      }
    });
  }
  if (params.has('q')) {
    S.search = params.get('q');
    if ($('search-input')) $('search-input').value = S.search;
  }
  if ($('year-btn-text')) $('year-btn-text').textContent = 'Year: ' + S.year;
}

async function init() {

  const waitForAuth = setInterval(() => {
    if (window.RankraAuth) {
      clearInterval(waitForAuth);
      window.RankraAuth.requireAuth((user, profile) => {
        
        const wasGuest = S.isGuest;
        S.isGuest = profile.isGuest || false;
        
        // Use community from profile
        const community = profile.community || 'OC'; // Default to OC if teacher or guest
        S.primaryComm = community;

        // If we transitioned from guest to real user, or if cutoffComm hasn't been set by URL
        const params = new URLSearchParams(window.location.search);
        if (!params.has('c') || (wasGuest && !S.isGuest)) {
          S.cutoffComm = community;
        }
        
        // Cache in memory for this session
        localStorage.setItem('tnea-primary', community);
        
        // Set UI and boot using the resolved cutoffComm
        setCommUI(S.cutoffComm);
        boot();
      });
    }
  }, 50);


  S.isMobile = window.innerWidth < 1024;


  shDistrict = new FilterSheet('district-sheet', {
    title: 'Select District',
    placeholder: 'Search district...',
    showModeToggle: true,
    onApply: (sel, mode) => { S.districts = sel; S.districtMode = mode; syncDistrictLabel(); render(); },
    onClear: () => { S.districts.clear(); syncDistrictLabel(); render(); }
  });
  shCollege = new FilterSheet('college-sheet', {
    title: 'Select College',
    placeholder: 'Search college...',
    showModeToggle: true,
    onApply: (sel, mode) => { S.colleges = sel; S.collegeMode = mode; syncCollegeLabel(); render(); },
    onClear: () => { S.districts.clear(); syncDistrictLabel(); render(); }
  });
  shCourse = new FilterSheet('course-sheet', {
    title: 'Select Course',
    placeholder: 'Search course...',
    showModeToggle: true,
    onApply: (sel, mode) => { S.courses = sel; S.courseMode = mode; syncCourseLabel(); render(); },
    onClear: () => { S.courses.clear(); syncCourseLabel(); render(); }
  });

  initFromURL();

  siteHeader = new SiteHeader({
    title: 'TNEA cutoff',
    onShare: () => showShareModal()
  });

  // Vignette Ad via centralized ad-engine
  initVignetteAd('vignette-ad', 'vignette-close');

  // Generate year dropdown options from config
  const yd = $('year-dropdown');
  if (yd) {
    yd.innerHTML = [...TNEA_CONFIG.years].reverse().map(yr => `
      <div class="sort-option ${yr === S.year ? 'active' : ''}" data-value="${yr}">${yr}</div>
    `).join('');

    yd.querySelectorAll('.sort-option').forEach(opt => {
      opt.addEventListener('click', async () => {
        const yr = opt.dataset.value;
        if (yr === S.year) return;

        S.year = yr;
        S.currentPage = 1;

        // Update UI
        $('year-btn-text').textContent = 'Year: ' + yr;
        yd.querySelectorAll('.sort-option').forEach(o => o.classList.toggle('active', o === opt));
        yd.hidden = true;
        $('year-btn').setAttribute('aria-expanded', 'false');

        renderSkeletons();
        await loadYear(S.year);
        buildDistrictList();
        render();
      });
    });
  }

  // Theme
  initTheme();
}



async function boot() {
  renderSkeletons();
  initAwarenessModal();
  if (siteHeader) siteHeader.update();
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
  await new Promise(r => setTimeout(r, 4000));

  const cachedStr = localStorage.getItem(BR_CACHE_KEY) || '';
  const cachedSet = new Set(cachedStr.split(',').filter(Boolean));

  for (const year of TNEA_CONFIG.years) {
    if (cachedSet.has(year)) continue;

    const rev = year.split('').reverse().join('');
    try {
      const res = await fetch(`${TNEA_CONFIG.dataPath}${rev}.gzip`, { cache: 'no-cache' });
      if (res.ok) {
        markYearCached(year);
        await new Promise(r => setTimeout(r, 1200));
      }
    } catch (e) {
      console.warn(`Background cache failed for ${year}:`, e);
    }
  }
}

async function loadYear(year) {
  const rev = year.split('').reverse().join('');
  try {
    const res = await fetch(`${TNEA_CONFIG.dataPath}${rev}.gzip`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    markYearCached(year);
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

function applyFilters() {
  if (!S.trie) { S.filtered = []; return; }
  let res = S.data;

  if (S.districts.size > 0) {
    const isEx = S.districtMode === 'exclude';
    res = res.filter(r => isEx ? !S.districts.has(r.district) : S.districts.has(r.district));
  }

  if (S.colleges.size > 0) {
    const isEx = S.collegeMode === 'exclude';
    res = res.filter(r => isEx ? !S.colleges.has(String(r.coc)) : S.colleges.has(String(r.coc)));
  }

  if (S.courses.size > 0) {
    const isEx = S.courseMode === 'exclude';
    res = res.filter(r => isEx ? !S.courses.has(r.brc) : S.courses.has(r.brc));
  }

  if (S.cutoffComm && (S.cutoffMin > 0 || S.cutoffMax < 200)) {
    res = res.filter(r => {
      const v = parseFloat(r[S.cutoffComm]);
      if (isNaN(v)) return false;
      return v >= S.cutoffMin && v <= S.cutoffMax;
    });
  }

  res = sortArr(res);
  S.filtered = res;
  S.expandedIdx = -1;

  // Guest filter limit logic
  if (S.isGuest) {
    S.filterCount++;
    localStorage.setItem('rankra_guest_filters', S.filterCount);
  }
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

let _scrollObserver = null;

function render() {
  if (_scrollObserver) { _scrollObserver.disconnect(); _scrollObserver = null; }

  $('results-body').innerHTML = '';
  window.scrollTo({ top: 0 });
  applyFilters();
  syncURL();
  S.rendered = 0;

  // Guest limit check: If > 5 filters, show hard wall
  if (S.isGuest && S.filterCount > 5) {
    renderGuestWall();
  } else {
    renderResults();
    $('empty-state').classList.toggle('hidden', S.filtered.length > 0);
  }

  if ($('results-count')) {
    const total = S.filtered.length;
    $('results-count').textContent = total > 0 ? `${total} result${total !== 1 ? 's' : ''}` : '';
  }
}

function renderGuestWall() {
  const body = $('results-body');
  body.innerHTML = `
    <div class="guest-gate-card">
      <div class="guest-gate-icon"><i class="fa-solid fa-rocket"></i></div>
      <h3 class="guest-gate-title">Sign in to get unlimited free results</h3>
      <button class="guest-gate-btn" onclick="window.RankraAuth.showLogin()">Sign in for Free Access</button>
    </div>
  `;
  if ($('results-count')) $('results-count').textContent = '';
}

const BATCH = 7;

function renderResults() {
  const body = $('results-body');
  const from = S.rendered;
  
  // Guest result limit logic: Cap at 20
  let effectiveMax = S.filtered.length;
  if (S.isGuest) effectiveMax = Math.min(effectiveMax, 20);

  const to = Math.min(from + BATCH, effectiveMax);
  
  if (from >= to) {
    // If we hit the 20 limit and there's more, show the guest card
    if (S.isGuest && S.rendered >= 20 && S.filtered.length > 20 && !body.querySelector('.guest-limit-card')) {
      renderGuestLimitCard();
    }
    return;
  }

  const frag = document.createDocumentFragment();
  let lastCard = null;

  for (let i = from; i < to; i++) {
    const card = mkResultCard(S.filtered[i], i);
    frag.appendChild(card);
    lastCard = card;
  }

  if (from === 0) {
    const firstCard = frag.firstElementChild;
    const ad = buildInfeedAd();
    if (ad && firstCard) firstCard.after(ad);
  }

  body.appendChild(frag);
  S.rendered = to;

  if (S.rendered < S.filtered.length && lastCard) {
    _scrollObserver = new IntersectionObserver((entries, obs) => {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      _scrollObserver = null;

      const ad = buildInfeedAd();
      if (ad) body.appendChild(ad);

      renderResults();
    }, { rootMargin: '0px', threshold: 0.1 });
    _scrollObserver.observe(lastCard);
  }
}

function renderGuestLimitCard() {
  const body = $('results-body');
  const card = document.createElement('div');
  card.className = 'guest-limit-card';
  card.innerHTML = `
    <div class="guest-limit-content">
      <div class="guest-limit-icon"><i class="fa-solid fa-layer-group"></i></div>
      <div class="guest-limit-text">
        <h4>Want to see all ${S.filtered.length} results for free?</h4>
        <p>Sign in to unlock full access to all 500+ engineering colleges.</p>
      </div>
      <button class="guest-limit-btn" onclick="window.RankraAuth.showLogin()">Sign in now</button>
    </div>
  `;
  body.appendChild(card);
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



  return card;
}

function buildDistrictList() {
  const districts = [...S.districtIndex.keys()].sort((a, b) => {
    const sA = S.districts.has(a), sB = S.districts.has(b);
    if (sA !== sB) return sA ? -1 : 1;
    return a.localeCompare(b);
  });
  const ddList = $('dd-list');
  ddList.innerHTML = '';
  districts.forEach(d => {
    const lbl = document.createElement('label');
    lbl.innerHTML = `<input type="checkbox" value="${esc(d)}"/>${esc(d)}`;
    lbl.querySelector('input').checked = S.districts.has(d);
    lbl.querySelector('input').addEventListener('change', e => {
      if (e.target.checked) S.districts.add(d); else S.districts.delete(d);
      syncDistrictLabel(); render();
    });
    ddList.appendChild(lbl);
  });

  if (shDistrict) shDistrict.updateItems(districts, S.districts, S.districtMode);

  $$('#district-dropdown .sheet-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === S.districtMode);
  });

  buildCollegeList();
  buildCourseList();
}

function buildCollegeList() {
  const map = new Map();
  S.data.forEach(r => { if (r.coc && r._conClean) map.set(String(r.coc), r._conClean); });
  const items = [...map.entries()].map(([v, l]) => ({ 
    label: `${String(v).padStart(4, '0')} - ${l}`, 
    value: v 
  })).sort((a, b) => {
    const sA = S.colleges.has(a.value), sB = S.colleges.has(b.value);
    if (sA !== sB) return sA ? -1 : 1;
    return a.label.localeCompare(b.label);
  });

  const ddList = $('college-dd-list');
  ddList.innerHTML = '';
  items.forEach(item => {
    const lbl = document.createElement('label');
    lbl.innerHTML = `<input type="checkbox" value="${esc(item.value)}"/>${esc(item.label)}`;
    lbl.querySelector('input').checked = S.colleges.has(item.value);
    lbl.querySelector('input').addEventListener('change', e => {
      if (e.target.checked) S.colleges.add(item.value); else S.colleges.delete(item.value);
      syncCollegeLabel(); render();
    });
    ddList.appendChild(lbl);
  });
  if (shCollege) shCollege.updateItems(items, S.colleges, S.collegeMode);

  $$('#college-dropdown .sheet-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === S.collegeMode);
  });
}

function buildCourseList() {
  const map = new Map();
  S.data.forEach(r => { if (r.brc && r.brn) map.set(r.brc, r.brn.toUpperCase()); });
  const items = [...map.entries()].map(([v, l]) => ({ 
    label: `${v} - ${l}`, 
    value: v 
  })).sort((a, b) => {
    const sA = S.courses.has(a.value), sB = S.courses.has(b.value);
    if (sA !== sB) return sA ? -1 : 1;
    return a.label.localeCompare(b.label);
  });

  const ddList = $('course-dd-list');
  ddList.innerHTML = '';
  items.forEach(item => {
    const lbl = document.createElement('label');
    lbl.innerHTML = `<input type="checkbox" value="${esc(item.value)}"/>${esc(item.label)}`;
    lbl.querySelector('input').checked = S.courses.has(item.value);
    lbl.querySelector('input').addEventListener('change', e => {
      if (e.target.checked) S.courses.add(item.value); else S.courses.delete(item.value);
      syncCourseLabel(); render();
    });
    ddList.appendChild(lbl);
  });
  if (shCourse) shCourse.updateItems(items, S.courses, S.courseMode);

  $$('#course-dropdown .sheet-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === S.courseMode);
  });
}

function syncDistrictLabel() {
  const n = S.districts.size;
  $('district-label').textContent = n > 0 ? `District (${n})` : 'District (all)';
  $('district-btn').classList.toggle('active', n > 0);
}

function closeAllDropdowns(exceptId = null) {
  const dropdownPairs = [
    { btn: 'district-btn', dd: 'district-dropdown' },
    { btn: 'college-btn', dd: 'college-dropdown' },
    { btn: 'course-btn', dd: 'course-dropdown' },
    { btn: 'sort-btn', dd: 'sort-dropdown' },
    { btn: 'year-btn', dd: 'year-dropdown' },
    { btn: 'comm-btn', dd: 'comm-dropdown' }
  ];

  dropdownPairs.forEach(p => {
    if (p.dd !== exceptId) {
      if ($(p.dd)) $(p.dd).hidden = true;
      if ($(p.btn)) $(p.btn).setAttribute('aria-expanded', 'false');
    }
  });
}

function syncCollegeLabel() {
  const n = S.colleges.size;
  $('college-label').textContent = n > 0 ? `College (${n})` : 'College (all)';
  $('college-btn').classList.toggle('active', n > 0);
}

function syncCourseLabel() {
  const n = S.courses.size;
  $('course-label').textContent = n > 0 ? `Course (${n})` : 'Course (all)';
  $('course-btn').classList.toggle('active', n > 0);
}

let eventsBound = false;
function bindEvents() {
  if (eventsBound) return;
  eventsBound = true;

  $('dd-search-input').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    $('dd-list').querySelectorAll('label').forEach(l => l.style.display = l.textContent.toLowerCase().includes(q) ? '' : 'none');
  });
  $('college-dd-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    $('college-dd-list').querySelectorAll('label').forEach(l => l.style.display = l.textContent.toLowerCase().includes(q) ? '' : 'none');
  });
  $('course-dd-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    $('course-dd-list').querySelectorAll('label').forEach(l => l.style.display = l.textContent.toLowerCase().includes(q) ? '' : 'none');
  });

  const shareModal = $('share-modal');
  if (shareModal) {
    const closeShare = () => shareModal.classList.add('hidden');
    $('share-modal-close').addEventListener('click', closeShare);
    $('share-modal-backdrop').addEventListener('click', closeShare);
    $('share-copy-btn').addEventListener('click', copyLink);
  }



  $('district-btn').addEventListener('click', e => {
    e.stopPropagation();
    if (S.isMobile) {
      if (shDistrict) shDistrict.open();
    } else {
      const dd = $('district-dropdown');
      const willBeOpen = dd.hidden;
      closeAllDropdowns(willBeOpen ? 'district-dropdown' : null);
      dd.hidden = !willBeOpen;
      $('district-btn').setAttribute('aria-expanded', String(willBeOpen));
    }
  });

  document.addEventListener('click', e => {
    if (!$('district-wrap').contains(e.target)) {
      $('district-dropdown').hidden = true;
      $('district-btn').setAttribute('aria-expanded', 'false');
    }
    if ($('college-wrap') && !$('college-wrap').contains(e.target)) {
      $('college-dropdown').hidden = true;
      $('college-btn').setAttribute('aria-expanded', 'false');
    }
    if ($('course-wrap') && !$('course-wrap').contains(e.target)) {
      $('course-dropdown').hidden = true;
      $('course-btn').setAttribute('aria-expanded', 'false');
    }
    if ($('sort-wrap') && !$('sort-wrap').contains(e.target)) {
      $('sort-dropdown').hidden = true;
      $('sort-btn').setAttribute('aria-expanded', 'false');
    }
    if ($('year-wrap') && !$('year-wrap').contains(e.target)) {
      $('year-dropdown').hidden = true;
      $('year-btn').setAttribute('aria-expanded', 'false');
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

  $('college-btn').addEventListener('click', e => {
    e.stopPropagation();
    if (S.isMobile) {
      if (shCollege) shCollege.open();
    } else {
      const dd = $('college-dropdown');
      const willBeOpen = dd.hidden;
      closeAllDropdowns(willBeOpen ? 'college-dropdown' : null);
      dd.hidden = !willBeOpen;
      $('college-btn').setAttribute('aria-expanded', String(willBeOpen));
    }
  });
  $('college-dd-clear').addEventListener('click', () => {
    S.colleges.clear();
    $('college-dd-list').querySelectorAll('input').forEach(cb => cb.checked = false);
    syncCollegeLabel(); render();
  });

  $('course-btn').addEventListener('click', e => {
    e.stopPropagation();
    if (S.isMobile) {
      if (shCourse) shCourse.open();
    } else {
      const dd = $('course-dropdown');
      const willBeOpen = dd.hidden;
      closeAllDropdowns(willBeOpen ? 'course-dropdown' : null);
      dd.hidden = !willBeOpen;
      $('course-btn').setAttribute('aria-expanded', String(willBeOpen));
    }
  });
  $('course-dd-clear').addEventListener('click', () => {
    S.courses.clear();
    $('course-dd-list').querySelectorAll('input').forEach(cb => cb.checked = false);
    syncCourseLabel(); render();
  });

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

  $$('.mode-toggle-btns .sheet-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      const target = btn.dataset.target;
      if (target === 'college') S.collegeMode = mode;
      else if (target === 'course') S.courseMode = mode;
      else if (target === 'district') S.districtMode = mode;

      btn.parentElement.querySelectorAll('.sheet-mode-btn').forEach(b => b.classList.toggle('active', b === btn));
      render();
    });
  });

  $('comm-btn').addEventListener('click', e => {
    e.stopPropagation();
    const sd = $('comm-dropdown');
    const willBeOpen = sd.hidden;
    closeAllDropdowns(willBeOpen ? 'comm-dropdown' : null);
    sd.hidden = !willBeOpen;
    $('comm-btn').setAttribute('aria-expanded', String(willBeOpen));
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

  $('year-btn').addEventListener('click', e => {
    e.stopPropagation();
    const yd = $('year-dropdown');
    const willBeOpen = yd.hidden;
    closeAllDropdowns(willBeOpen ? 'year-dropdown' : null);
    yd.hidden = !willBeOpen;
    $('year-btn').setAttribute('aria-expanded', String(willBeOpen));
  });

  $('sort-btn').addEventListener('click', e => {
    e.stopPropagation();
    const sd = $('sort-dropdown');
    const willBeOpen = sd.hidden;
    closeAllDropdowns(willBeOpen ? 'sort-dropdown' : null);
    sd.hidden = !willBeOpen;
    $('sort-btn').setAttribute('aria-expanded', String(willBeOpen));
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

  if ($('empty-reset')) $('empty-reset').addEventListener('click', resetAll);
  if ($('header-reset')) $('header-reset').addEventListener('click', resetAll);

  if ($('load-more-btn')) {
    $('load-more-btn').addEventListener('click', () => {
      const cards = $$('.result-card');
      const lastItem = cards.length > 0 ? cards[cards.length - 1] : null;

      $$('.in-feed-ad').forEach(el => el.remove());

      renderResults(false);

      if (lastItem) {
        lastItem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  let wasMobile = S.isMobile;
  window.addEventListener('resize', () => {
    const now = window.innerWidth < 768;
    if (now !== wasMobile) { wasMobile = now; S.isMobile = now; render(); }
  });

  let lastScrollY = window.scrollY;
  const filterBar = $('filter-bar');
  window.addEventListener('scroll', () => {
    const currentY = window.scrollY;
    if (currentY <= 60) {
      filterBar.classList.remove('filter-bar--hidden');
    } else if (currentY > lastScrollY + 4) {
      filterBar.classList.add('filter-bar--hidden');
    } else if (lastScrollY > currentY + 4) {
      filterBar.classList.remove('filter-bar--hidden');
    }
    lastScrollY = currentY;
  }, { passive: true });
}

function resetAll() {
  S.districts.clear(); S.districtMode = 'include';
  $('dd-list').querySelectorAll('input').forEach(cb => cb.checked = false);
  syncDistrictLabel();

  S.colleges.clear(); S.collegeMode = 'include';
  $('college-dd-list').querySelectorAll('input').forEach(cb => cb.checked = false);
  syncCollegeLabel();

  S.courses.clear(); S.courseMode = 'include';
  $('course-dd-list').querySelectorAll('input').forEach(cb => cb.checked = false);
  syncCourseLabel();

  const districts = [...S.districtIndex.keys()].sort();
  buildCollegeList();
  buildCourseList();
  if (shDistrict) shDistrict.updateItems(districts, S.districts, S.districtMode);

  S.cutoffMin = 0; S.cutoffMax = 200; S.cutoffComm = S.primaryComm || '';
  $('cutoff-min').value = 0; $('cutoff-max').value = 200;
  setCommUI(S.cutoffComm);
  if ($('year-btn-text')) $('year-btn-text').textContent = 'Year: 2025';
  render();
}

document.addEventListener('DOMContentLoaded', init);
