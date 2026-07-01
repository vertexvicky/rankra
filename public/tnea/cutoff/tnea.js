import { $, $$, esc, tok } from '../../shared/js/utils.js';
import { applyTheme, initTheme } from '../../shared/js/theme.js';
import { Trie } from '../../shared/js/trie.js';
import { TNEA_CONFIG } from './tnea-config.js';
import { buildInfeedAd, initVignetteAd } from '../../shared/js/ad-engine.js';
import { FilterSheet } from '../../shared/js/FilterSheet.js';
import { SiteHeader } from '../../shared/js/SiteHeader.js';

import { requestJSON, getYearFromURL, initBackgroundCache } from '../../shared/js/caching.js';

const ENABLE_GUEST_LIMIT = false; 

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
  types: new Set(),
  typeMode: 'include',
  year: '2025',
  search: '',
  filterType: 'cutoff',
  targetCutoff: 0,
  targetRank: 1,
  sortBy: 'cutoff-desc',
  currentPage: 1,
  pageSize: 20,
  isMobile: window.innerWidth < 1024,
  isGuest: false,
  filterCount: parseInt(localStorage.getItem('rankra_guest_filters') || '0', 10),
  showMedium: false,
  hiddenMediumCount: 0,
  allDistricts: []
};

function setFilterType(type) {
  S.filterType = type;
  const input = $('target-cutoff');
  const toggleButtons = $$('#filter-type-toggle .toggle-btn');
  
  toggleButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  
  if (type === 'rank') {
    if (input) {
      input.placeholder = 'e.g. 5000';
      input.min = '1';
      input.max = '999999';
      input.step = '1';
      input.value = S.targetRank > 0 ? S.targetRank : '';
    }
  } else {
    if (input) {
      input.placeholder = 'e.g. 150';
      input.min = '0';
      input.max = '200';
      input.step = '0.5';
      input.value = S.targetCutoff > 0 ? S.targetCutoff : '';
    }
  }
  
  localStorage.setItem('rankra_filter_type', type);
}
window.setFilterType = setFilterType;

let shDistrict, shCollege, shCourse, shType, siteHeader;
let codeToType = {};

function setCommUI(val) {
  $$('.comm-option').forEach(o => o.classList.toggle('active', o.dataset.value === val));
  if ($('comm-btn-text')) $('comm-btn-text').textContent = val || 'OC';
  S.showMedium = false; // Reset when community changes
}

function revealMediumResults() {
  if ($('chance-summary')) $('chance-summary').style.display = 'none';
  S.showMedium = true;
  render();

  const start = window.pageYOffset;
  const startTime = performance.now();
  const duration = 3000; // 3 seconds as requested

  function scroll(timestamp) {
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // Ease out cubic
    window.scrollTo(0, start * (1 - ease));
    if (progress < 1) requestAnimationFrame(scroll);
  }
  requestAnimationFrame(scroll);
}
window.revealMediumResults = revealMediumResults;

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
  if (S.types.size > 0) {
    params.set('t', [...S.types].join(','));
    if (S.typeMode === 'exclude') params.set('tm', 'ex');
  }
  if (S.cutoffComm) params.set('c', S.cutoffComm);
  if (S.sortBy !== 'cutoff-desc') params.set('sort', S.sortBy);
  if (S.filterType !== 'cutoff') params.set('type', S.filterType);
  if (S.targetCutoff > 0) params.set('cutoff', S.targetCutoff);
  if (S.targetRank > 0) params.set('rank', S.targetRank);
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
  return new Promise(resolve => {
    if (localStorage.getItem('disclaimerAccept')) {
      return resolve();
    }

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
      setTimeout(() => {
        modal.remove();
        resolve();
      }, 400);
    });
  });
}

function initCutoffModal() {
  return new Promise(resolve => {
    const params = new URLSearchParams(window.location.search);
    const savedComm = localStorage.getItem('rankra_comm');
    const savedCutoff = localStorage.getItem('rankra_cutoff');
    
    const finalComm = params.get('c') || savedComm;
    const finalCutoff = params.get('cutoff') || savedCutoff;

    if (finalComm && finalCutoff) return resolve();

    const hideComm = !!finalComm;

    const modal = document.createElement('div');
    modal.className = 'overlay-full cutoff-calc-overlay';

    const currentComm = S.cutoffComm || 'OC';

    modal.innerHTML = `
      <div class="overlay-backdrop"></div>
      <div class="gate-sheet cutoff-calc-sheet" style="max-width: 320px;">
        <div id="modal-comm-section" ${hideComm ? 'style="display:none;"' : ''}>
          <h3 class="calc-section-title" id="modal-comm-title" style="margin-bottom: 12px; text-align: left; opacity: 0.8;">Select your community</h3>
          <div class="gate-chips chips-sm" id="modal-comm-chips" style="margin-bottom: 24px; justify-content: flex-start; gap: 8px;">
            <button class="gate-chip gate-chip-sm" data-value="OC">OC</button>
            <button class="gate-chip gate-chip-sm" data-value="BC">BC</button>
            <button class="gate-chip gate-chip-sm" data-value="BCM">BCM</button>
            <button class="gate-chip gate-chip-sm" data-value="MBC">MBC</button>
            <button class="gate-chip gate-chip-sm" data-value="SC">SC</button>
            <button class="gate-chip gate-chip-sm" data-value="SCA">SCA</button>
            <button class="gate-chip gate-chip-sm" data-value="ST">ST</button>
          </div>
        </div>

        <h3 class="calc-section-title" style="margin-bottom: 8px; text-align: center; opacity: 0.8;">Enter your cutoff mark</h3>
        <p style="text-align: center; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px;">Range: <span id="modal-cutoff-display">---</span> to 0</p>
        <div class="calc-section" style="margin-bottom: 24px; display: flex; justify-content: center;">
          <div class="calc-field" style="width: 140px;">
            <input type="number" id="calc-direct" placeholder="e.g. 185" min="0" max="200" step="0.5" 
                   style="font-size: 1.1rem; font-weight: 700; padding: 10px; border-radius: 8px; width: 100%; text-align: center;">
          </div>
        </div>

        <button class="gate-continue" id="calc-apply" style="margin-top: 10px;">Continue →</button>
      </div>
    `;
    document.body.appendChild(modal);

    const chips = modal.querySelectorAll('.gate-chip');
    let selectedComm = finalComm || ''; 
    
    if (selectedComm) {
      modal.querySelectorAll(`.gate-chip[data-value="${selectedComm}"]`).forEach(c => c.classList.add('selected'));
    }
    if (savedCutoff) {
      modal.querySelector('#calc-direct').value = savedCutoff;
      modal.querySelector('#modal-cutoff-display').textContent = savedCutoff;
    }
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        selectedComm = chip.dataset.value;
        $('modal-comm-chips').style.animation = 'none';
      });
    });

    const calcDirect = modal.querySelector('#calc-direct');
    calcDirect.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      modal.querySelector('#modal-cutoff-display').textContent = isNaN(val) ? '---' : val;
    });

    const close = () => {
      modal.classList.add('hidden');
      setTimeout(() => { modal.remove(); resolve(); }, 400);
    };

    // Mandatory: Remove backdrop click listener to prevent closing without input
    // modal.querySelector('.overlay-backdrop').addEventListener('click', close);

    $('calc-apply').addEventListener('click', () => {
      const input = $('calc-direct');
      const chipContainer = $('modal-comm-chips');
      let cutoff = parseFloat(input.value);
      let valid = true;

      if (!selectedComm) {
        chipContainer.style.animation = 'none';
        setTimeout(() => chipContainer.style.animation = 'shake 0.4s ease', 10);
        valid = false;
      }

      if (isNaN(cutoff) || cutoff <= 0 || cutoff > 200) {
        input.style.borderColor = '#ef4444';
        input.style.animation = 'none';
        setTimeout(() => input.style.animation = 'shake 0.4s ease', 10);
        valid = false;
      }

      if (!valid) return;

      cutoff = Math.max(0, Math.min(200, cutoff));
      S.targetCutoff = cutoff;
      S.cutoffComm = selectedComm;
      localStorage.setItem('rankra_comm', selectedComm);
      localStorage.setItem('rankra_cutoff', cutoff);
      if (window.RankraAuth && !window.RankraAuth.isGuest()) {
        window.RankraAuth.updateProfile({ community: selectedComm, cutoff: cutoff }).catch(console.error);
      }
      setCommUI(S.cutoffComm);

      if ($('target-cutoff')) $('target-cutoff').value = S.targetCutoff;

      render();
      close();
    });
  });
}

function initFromURL() {
  const params = new URLSearchParams(window.location.search);
  S.year = getYearFromURL('2025');
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
  if (params.has('t')) {
    params.get('t').split(',').forEach(t => S.types.add(t));
    if (params.get('tm') === 'ex') S.typeMode = 'exclude';
    syncTypeLabel();
  }
  if (params.has('c')) {
    S.cutoffComm = params.get('c');
  } else {
    const localComm = localStorage.getItem('rankra_comm');
    if (localComm) S.cutoffComm = localComm;
  }
  if (S.cutoffComm) setCommUI(S.cutoffComm);

  S.filterType = params.get('type') || localStorage.getItem('rankra_filter_type') || 'cutoff';

  if (params.has('cutoff')) {
    S.targetCutoff = parseFloat(params.get('cutoff'));
  } else {
    const localCutoff = localStorage.getItem('rankra_cutoff');
    if (localCutoff) S.targetCutoff = parseFloat(localCutoff);
  }

  if (params.has('rank')) {
    S.targetRank = parseInt(params.get('rank'), 10);
  } else {
    const localRank = localStorage.getItem('rankra_rank');
    if (localRank) S.targetRank = parseInt(localRank, 10);
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

  shType = new FilterSheet('type-sheet', {
    title: 'Select College Type',
    placeholder: 'Search type...',
    showModeToggle: true,
    onApply: (sel, mode) => { S.types = sel; S.typeMode = mode; syncTypeLabel(); render(); },
    onClear: () => { S.types.clear(); syncTypeLabel(); render(); }
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
        S.showMedium = false; // Revoke on year change

        // Update UI
        $('year-btn-text').textContent = 'Year: ' + yr;
        yd.querySelectorAll('.sort-option').forEach(o => o.classList.toggle('active', o === opt));
        yd.hidden = true;
        $('year-btn').setAttribute('aria-expanded', 'false');

        renderSkeletons();
        try {
          const path = `/assets/db/tnea/cutoff/${yr.split('').reverse().join('')}.gzip`;
          const dataMap = await requestJSON([path]);
          const raw = dataMap[path];
          
      S.data = raw.map(r => {
        const d = TNEA_CONFIG.districtNorm[r.district] || r.district || 'Unknown';
        
        let conClean = '';
        if (r.con) {
          const parts = r.con.split('\n');
          const namePart = parts[0] ? parts[0].trim() : '';
          let dPart = '';
          if (parts.length > 1) {
            dPart = parts[1].split('-')[0].trim();
          }
          conClean = dPart ? `${namePart} ${dPart}` : namePart;
        }

        const abbrMatch = r.con ? r.con.match(/\(([^)]+)\)/g) : null;
        const abbrs = abbrMatch ? abbrMatch.map(m => m.slice(1, -1).toLowerCase()) : [];
        return { ...r, district: d, _conClean: conClean, _abbrs: abbrs };
      });
          buildSearchIndex();
        } catch (e) {
          console.error("[Year Switch] Failed to load year data:", e);
        }
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
  const awarenessPromise = initAwarenessModal();
  if (siteHeader) siteHeader.update();
  
  // Use centralized caching
  try {
    const csearchPath = '/assets/db/tnea/college/csearch.json';
    const distPath = '/assets/db/tndistricts.json';
    const typePath = '/assets/db/tnea/college/type.json';
    const cutoffPath = `/assets/db/tnea/cutoff/${S.year.split('').reverse().join('')}.gzip`;
    
    const v = Date.now();
    const dataMap = await requestJSON([
      cutoffPath, 
      distPath, 
      typePath,
      `${csearchPath}?v=${v}`
    ]);
    const raw = dataMap[cutoffPath];
    S.allDistricts = dataMap[distPath];
    S.csearch = dataMap[`${csearchPath}?v=${v}`];
    const typesData = dataMap[typePath];

    if (typesData) {
      codeToType = {};
      for (const [cat, ids] of Object.entries(typesData)) {
        for (const id of ids) {
          codeToType[String(id)] = cat.toUpperCase();
        }
      }
      if (shType) {
        const typeItems = Object.keys(typesData).map(t => {
          const uType = t.toUpperCase();
          const count = typesData[t].length;
          return {
            value: uType,
            label: `${uType} (${count})`
          };
        }).sort((a, b) => a.value.localeCompare(b.value));
        shType.updateItems(typeItems, S.types, S.typeMode);
      }
    }

    S.data = raw.map(r => {
      const d = TNEA_CONFIG.districtNorm[r.district] || r.district || 'Unknown';
      let conClean = '';
      if (r.con) {
        const parts = r.con.split('\n');
        const namePart = parts[0] ? parts[0].trim() : '';
        let dPart = '';
        if (parts.length > 1) {
          dPart = parts[1].split('-')[0].trim();
        }
        conClean = dPart ? `${namePart} ${dPart}` : namePart;
      }
      const abbrMatch = r.con ? r.con.match(/\(([^)]+)\)/g) : null;
      const abbrs = abbrMatch ? abbrMatch.map(m => m.slice(1, -1).toLowerCase()) : [];
      return { ...r, district: d, _conClean: conClean, _abbrs: abbrs };
    });
    buildSearchIndex();
    initBackgroundCache();
  } catch (e) {
    console.error("[Boot] Cache initialization failed:", e);
  }

  setFilterType(S.filterType);
  buildDistrictList();
  bindEvents(); // bind after data is ready
  render();

  awarenessPromise.then(() => {
    return initCutoffModal();
  });
}


function buildSearchIndex() {
  const t = new Trie();
  S.data.forEach((r, i) => {
    const clean = r._conClean || '';
    tok(clean).forEach(w => t.add(w, i));
    const squashed = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (squashed) t.add(squashed, i);
    
    r._abbrs.forEach(a => t.add(a, i));
    tok(r.brn || '').forEach(w => t.add(w, i));
    if (r.brc) t.add(r.brc.toLowerCase(), i);
    t.add(String(r.coc), i);
    t.add(String(r.coc).padStart(4, '0'), i);

    // Add csearch aliases
    if (S.csearch && r.con) {
      const aliases = S.csearch[r.con] || [];
      aliases.forEach(alias => {
        tok(alias).forEach(w => t.add(w, i));
        const sq = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (sq) t.add(sq, i);
      });
    }
  });
  S.trie = t;
}

function applyFilters() {
  if (!S.trie) { S.filtered = []; return; }
  let res = S.data;

  if (S.search) {
    res = S.trie.search(S.search);
  }

  // Filter out colleges with 0 seats for the selected community
  const comm = S.cutoffComm || S.primaryComm || 'OC';
  const csk = TNEA_CONFIG.seatKeys[comm] || { tl: 'octl' };
  res = res.filter(r => (parseInt(r[csk.tl], 10) || 0) > 0);

  // If user has a cutoff/rank, filter results to within reasonable ranges
  S.hiddenMediumCount = 0;
  if (S.filterType === 'rank') {
    if (S.targetRank > 0) {
      res = res.filter(r => {
        const rValStr = r[comm.toLowerCase() + 'r'];
        const n = parseInt(rValStr, 10);
        if (rValStr === '' || rValStr === null || isNaN(n)) return true;

        const chance = getChance(r);
        if (chance.text === 'Medium') {
          if (!S.showMedium) {
            S.hiddenMediumCount++;
            return false;
          }
        }
        return S.targetRank <= n + 10000; // only show if rank is within medium/high/very high chance
      });
    }
  } else {
    if (S.targetCutoff > 0) {
      res = res.filter(r => {
        const v = r[comm];
        const n = parseFloat(v);
        if (v === '' || v === null || isNaN(n)) return true; 

        const chance = getChance(r);
        if (chance.text === 'Medium') {
          if (!S.showMedium) {
            S.hiddenMediumCount++;
            return false;
          }
        }
        return n <= S.targetCutoff + 4.5;
      });
    }
  }

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

  if (S.types.size > 0) {
    const isEx = S.typeMode === 'exclude';
    res = res.filter(r => {
      const type = codeToType[String(r.coc)] || "";
      return isEx ? !S.types.has(type) : S.types.has(type);
    });
  }

  res = sortArr(res);
  S.filtered = res;
  S.expandedIdx = -1;

  // Guest filter limit logic
  if (ENABLE_GUEST_LIMIT && S.isGuest) {
    S.filterCount++;
    localStorage.setItem('rankra_guest_filters', S.filterCount);
  }
}

function sortArr(arr) {
  const comm = S.cutoffComm || S.primaryComm || 'OC';
  const csk = TNEA_CONFIG.seatKeys[comm] || { tl: 'octl', al: 'ocal' };

  return [...arr].sort((a, b) => {
    const vA = parseFloat(a[comm]) || 0;
    const vB = parseFloat(b[comm]) || 0;

    const getMetrics = (r) => {
      const tl = parseInt(r[csk.tl], 10) || 0;
      const al = parseInt(r[csk.al], 10) || 0;
      const ratio = tl > 0 ? al / tl : 0;
      return { tl, ratio, coc: parseInt(r.coc, 10) || 0 };
    };

    if (S.sortBy === 'cutoff-desc' || S.sortBy === 'cutoff-asc') {
      const isDesc = S.sortBy === 'cutoff-desc';
      
      if (S.filterType === 'rank') {
        const rA = parseInt(a[comm.toLowerCase() + 'r'], 10) || 999999;
        const rB = parseInt(b[comm.toLowerCase() + 'r'], 10) || 999999;
        if (rA !== rB) return isDesc ? rA - rB : rB - rA; // Descending (best first) means smaller rank first
      } else {
        if (vA !== vB) return isDesc ? vB - vA : vA - vB;
      }

      // 2. Filled Ratio
      const mA = getMetrics(a);
      const mB = getMetrics(b);
      if (mA.ratio !== mB.ratio) return mB.ratio - mA.ratio;

      // 3. Total Seats
      if (mA.tl !== mB.tl) return mB.tl - mA.tl;

      // 4. College Code
      return mA.coc - mB.coc;
    }

    if (S.sortBy === 'vacant-desc') {
      const mA = getMetrics(a);
      const mB = getMetrics(b);
      const vacA = mA.tl - (parseInt(a[csk.al], 10) || 0);
      const vacB = mB.tl - (parseInt(b[csk.al], 10) || 0);

      // 1. Unfilled Seats
      if (vacA !== vacB) return vacB - vacA;
      // 2. Total Seats
      if (mA.tl !== mB.tl) return mB.tl - mA.tl;
      // 3. Cutoff / Rank
      if (S.filterType === 'rank') {
        const rA = parseInt(a[comm.toLowerCase() + 'r'], 10) || 999999;
        const rB = parseInt(b[comm.toLowerCase() + 'r'], 10) || 999999;
        if (rA !== rB) return rA - rB; // smaller rank first (better)
      } else {
        if (vA !== vB) return vB - vA;
      }
      // 4. College Code
      return mA.coc - mB.coc;
    }
    
    return 0;
  });
}

function tSeats(r) { return TNEA_CONFIG.communities.reduce((s, c) => s + (parseInt(r[TNEA_CONFIG.seatKeys[c].tl], 10) || 0), 0); }
function tFill(r) { return TNEA_CONFIG.communities.reduce((s, c) => s + (parseInt(r[TNEA_CONFIG.seatKeys[c].al], 10) || 0), 0); }
function tVacant(r) { return tSeats(r) - tFill(r); }

let _scrollObserver = null;

function render() {
  if (_scrollObserver) { _scrollObserver.disconnect(); _scrollObserver = null; }

  const resultsBody = $('results-body');
  if (!resultsBody) return;
  resultsBody.innerHTML = '';
  window.scrollTo({ top: 0 });
  applyFilters();
  const totalSeatsSum = S.filtered.reduce((sum, r) => sum + tSeats(r), 0);
  console.log(`Total seats across all results: ${totalSeatsSum}`);
  syncURL();
  S.rendered = 0;

  // Guest limit check: If > 5 filters, show hard wall
  if (ENABLE_GUEST_LIMIT && S.isGuest && S.filterCount > 5) {
    renderGuestWall();
  } else {
    renderResults();
    $('empty-state').classList.toggle('hidden', S.filtered.length > 0);
  }

  if ($('chance-summary')) {
    const summary = { 'Medium': { count: 0, seats: 0 }, 'High': { count: 0, seats: 0 }, 'Very High': { count: 0, seats: 0 } };
    const cc = S.cutoffComm || S.primaryComm || 'OC';
    const csk = TNEA_CONFIG.seatKeys[cc] || { tl: 'octl' };

    S.filtered.forEach(r => {
      const chance = getChance(r);
      if (summary[chance.text] !== undefined) {
        summary[chance.text].count++;
        summary[chance.text].seats += (parseInt(r[csk.tl], 10) || 0);
      }
    });

    console.log('--- Chance Summary ---');
    Object.keys(summary).forEach(key => {
      console.log(`${key}: ${summary[key].count} results, ${summary[key].seats} total seats`);
    });

    const targetValueActive = S.filterType === 'rank' ? S.targetRank > 0 : S.targetCutoff > 0;
    const hasSummary = targetValueActive && S.hiddenMediumCount > 0;
    const el = $('chance-summary');
    el.hidden = !hasSummary;
    if (hasSummary) {
      el.style.display = ''; // Clear inline display:none
      el.innerHTML = `
        <button class="chance-aim-btn" onclick="revealMediumResults()">
           <i class="fa-solid fa-bullseye"></i> Click To Know ${S.hiddenMediumCount} <span class="chance-highlight">Medium Chance</span> Course&College
        </button>
      `;
    }
  }

  if ($('results-count')) {
    const total = S.filtered.length;
    $('results-count').innerHTML = total > 0 ? `<span class="count-text">${total} result${total !== 1 ? 's' : ''}</span>` : '';
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
  if (ENABLE_GUEST_LIMIT && S.isGuest) effectiveMax = Math.min(effectiveMax, 20);

  const to = Math.min(from + BATCH, effectiveMax);

  if (from >= to) {
    // If we hit the 20 limit and there's more, show the guest card
    if (ENABLE_GUEST_LIMIT && S.isGuest && S.rendered >= 20 && S.filtered.length > 20 && !body.querySelector('.guest-limit-card')) {
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

function getChance(r) {
  const cc = S.cutoffComm || S.primaryComm || 'OC';
  const csk = TNEA_CONFIG.seatKeys[cc] || { tl: 'octl', al: 'ocal' };
  const ctl = parseInt(r[csk.tl], 10) || 0;
  const cal = parseInt(r[csk.al], 10) || 0;
  const cvac = ctl - cal;

  if (S.filterType === 'rank') {
    if (S.targetRank <= 0) return { text: '—', class: '' };
    const rValStr = r[cc.toLowerCase() + 'r'];
    const n = parseInt(rValStr, 10);
    const has = rValStr !== '' && rValStr !== null && !isNaN(n);

    if (has) {
      if (S.targetRank <= n * 0.8) return { text: 'Very High', class: 'poss-vhigh' };
      if (S.targetRank <= n) return { text: 'High', class: 'poss-high' };
      if (S.targetRank <= n + 10000) return { text: 'Medium', class: 'poss-medium' };
    } else {
      const ratio = ctl > 0 ? cal / ctl : 0;
      if (cvac >= 20 || (ctl > 0 && ratio < 0.6)) return { text: 'Very High', class: 'poss-vhigh' };
      if (cvac >= 5 || ctl > 30) return { text: 'High', class: 'poss-high' };
      return { text: 'Medium', class: 'poss-medium' };
    }
  } else {
    // Cutoff mode
    if (S.targetCutoff <= 0) return { text: '—', class: '' };
    const v = r[cc]; const n = parseFloat(v); const has = v !== '' && v !== null && !isNaN(n);

    if (has) {
      if (n < S.targetCutoff - 11) return { text: 'Very High', class: 'poss-vhigh' };
      if (n <= S.targetCutoff) return { text: 'High', class: 'poss-high' };
      if (n <= S.targetCutoff + 4.5) return { text: 'Medium', class: 'poss-medium' };
    } else {
      const ratio = ctl > 0 ? cal / ctl : 0;
      if (cvac >= 20 || (ctl > 0 && ratio < 0.6)) return { text: 'Very High', class: 'poss-vhigh' };
      if (cvac >= 5 || ctl > 30) return { text: 'High', class: 'poss-high' };
      return { text: 'Medium', class: 'poss-medium' };
    }
  }
  return { text: '—', class: '' };
}

function mkResultCard(r, idx) {
  const cc = S.cutoffComm || S.primaryComm || 'OC';
  const code = String(r.coc).padStart(4, '0');

  const v = r[cc]; const n = parseFloat(v); const has = v !== '' && v !== null && !isNaN(n);
  const cutoffVal = has ? (n % 1 === 0 ? n : n.toFixed(1)) : '—';
  
  const rankValStr = r[cc.toLowerCase() + 'r'];
  const rankVal = rankValStr ? rankValStr : '—';

  const displayVal = S.filterType === 'rank' ? rankVal : cutoffVal;
  const colHeader = S.filterType === 'rank' ? 'Rank' : 'Cutoff';

  const csk = TNEA_CONFIG.seatKeys[cc] || { tl: 'octl', al: 'ocal' };
  const ctl = parseInt(r[csk.tl], 10) || 0;
  const cal = parseInt(r[csk.al], 10) || 0;
  const cvac = ctl - cal;

  const chance = getChance(r);
  const possText = chance.text;
  const possClass = chance.class;

  const targetValueActive = S.filterType === 'rank' ? S.targetRank > 0 : S.targetCutoff > 0;
  const hasPoss = targetValueActive && possText !== '—';
  const gridStyle = hasPoss ? ` style="grid-template-columns: minmax(max-content, 0.8fr) repeat(4, minmax(max-content, 1fr));"` : '';

  const communityRow = `
    <div class="ct-row ct-primary-row"${gridStyle}>
      <div class="ct-label primary">${esc(cc)}</div>
      <div class="ct-td${(S.filterType === 'rank' ? rankValStr : v) ? '' : ' nd'}">${displayVal}</div>
      <div class="ct-td">${ctl || '—'}</div>
      <div class="ct-td">${cal || '—'}</div>
      <div class="ct-td">${ctl > 0 ? cvac : '—'}</div>
    </div>`;

  const card = document.createElement('div');
  card.className = 'result-card';
  card.dataset.idx = idx;

  const type = codeToType[String(r.coc)] || "";
  let typeClass = "type-other";
  const ut = type.toUpperCase();
  if (ut.startsWith("GOVT ANNA")) typeClass = "type-au";
  else if (ut.startsWith("GOVT AIDED")) typeClass = "type-aided";
  else if (ut.startsWith("GOVT")) typeClass = "type-govt";
  else if (ut.startsWith("CENTRAL")) typeClass = "type-central";
  else if (ut.startsWith("PRIVATE AUTONOMOUS")) typeClass = "type-pvt-auto";
  else if (ut.startsWith("PRIVATE")) typeClass = "type-pvt";

  const typeBadge = type ? `<span class="clg-type-badge ${typeClass}" style="margin-bottom: 8px; display: inline-block; font-size: 0.65rem; padding: 2px 8px; border-radius: 4px; font-weight: 700; text-transform: uppercase;">${type}</span>` : "";

  card.innerHTML = `
    <div class="card-header">
      <div class="card-code-line">
        ${typeBadge}
        ${hasPoss ? `<div style="margin-left: auto;"><span class="poss-badge ${possClass}">Chance : ${possText}</span></div>` : ''}
      </div>
      <div class="card-name" style="margin-top: 4px;">
        <span style="color: var(--accent); font-weight: 900;">${esc(code)}</span> — ${esc(r._conClean || '')}
      </div>
      <div class="card-branch" style="opacity: 0.8; font-weight: 500; font-size: 0.85rem; margin-top: 4px;">
        ${esc(r.brc || '')} — ${esc(r.brn || '')}
      </div>
    </div>
    <div class="comm-table">
      <div class="ct-row ct-head"${gridStyle}>
        <div class="ct-th">Community</div>
        <div class="ct-th">${colHeader}</div>
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
  const districts = S.allDistricts.sort((a, b) => {
    const sA = S.districts.has(a), sB = S.districts.has(b);
    if (sA !== sB) return sA ? -1 : 1;
    return a.localeCompare(b);
  });
  const ddList = $('dd-list');
  if (!ddList) return;
  ddList.innerHTML = '';
  districts.forEach(d => {
    const lbl = document.createElement('label');
    lbl.innerHTML = `<input type="checkbox" value="${esc(d)}"/>${esc(d)}`;
    lbl.querySelector('input').checked = S.districts.has(d);
    lbl.querySelector('input').addEventListener('change', e => {
      if (e.target.checked) S.districts.add(d); else S.districts.delete(d);
      S.showMedium = false; // Revoke on district change
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
      S.showMedium = false; // Revoke on college change
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
      S.showMedium = false; // Revoke on course change
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

function syncTypeLabel() {
  const n = S.types.size;
  $('type-label').textContent = n > 0 ? `College Type (${n})` : 'College Type';
  $('type-btn').classList.toggle('active', n > 0);
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
    if ($('type-wrap') && !$('type-wrap').contains(e.target)) {
      if ($('type-dropdown')) $('type-dropdown').hidden = true;
      $('type-btn').setAttribute('aria-expanded', 'false');
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

  $('type-btn').addEventListener('click', e => {
    e.stopPropagation();
    if (shType) shType.open();
  });

  // Bind Rank / Cutoff Toggle buttons
  const toggleBtns = $$('#filter-type-toggle .toggle-btn');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      setFilterType(type);
      render();
    });
  });

  if ($('target-cutoff')) {
    $('target-cutoff').addEventListener('input', e => {
      let v = parseFloat(e.target.value);
      S.showMedium = false;
      if (S.filterType === 'rank') {
        if (isNaN(v) || v <= 0) {
          S.targetRank = 1;
        } else {
          S.targetRank = Math.round(v);
        }
        localStorage.setItem('rankra_rank', S.targetRank);
      } else {
        if (isNaN(v) || v <= 0) {
          S.targetCutoff = 0;
        } else {
          S.targetCutoff = Math.max(0, Math.min(200, v));
        }
        localStorage.setItem('rankra_cutoff', S.targetCutoff);
      }
      render();
    });
  }

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
  if ($('dd-list')) $('dd-list').querySelectorAll('input').forEach(cb => cb.checked = false);
  syncDistrictLabel();

  S.colleges.clear(); S.collegeMode = 'include';
  if ($('college-dd-list')) $('college-dd-list').querySelectorAll('input').forEach(cb => cb.checked = false);
  syncCollegeLabel();

  S.courses.clear(); S.courseMode = 'include';
  if ($('course-dd-list')) $('course-dd-list').querySelectorAll('input').forEach(cb => cb.checked = false);
  syncCourseLabel();

  S.types.clear(); S.typeMode = 'include';
  syncTypeLabel();
  
  buildCollegeList();
  buildCourseList();
  if (shDistrict) shDistrict.updateItems(S.allDistricts, S.districts, S.districtMode);

  if ($('year-btn-text')) $('year-btn-text').textContent = 'Year: 2025';
  render();
}

document.addEventListener('DOMContentLoaded', init);