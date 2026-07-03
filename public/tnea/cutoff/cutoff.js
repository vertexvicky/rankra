import { $, $$, esc, tok } from '../../shared/js/utils.js';
import { applyTheme, initTheme } from '../../shared/js/theme.js';
import { Trie } from '../../shared/js/trie.js';
import { TNEA_CONFIG } from './cutoff-config.js';
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
  targetRank: 0,
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

function setFilterType(type, { skipModal = false } = {}) {
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
    if (S.targetRank <= 0) {
      if (!skipModal) initRankModal();
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

let shDistrict, shCourse, shType, siteHeader;
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
  if (S.filterType === 'rank') {
    if (S.targetRank > 0) params.set('rank', S.targetRank);
  } else {
    if (S.targetCutoff > 0) params.set('cutoff', S.targetCutoff);
  }
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
  return Promise.resolve();
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
    const isRankMode = S.filterType === 'rank';
    const savedValue = isRankMode ? localStorage.getItem('rankra_rank') : localStorage.getItem('rankra_cutoff');

    const finalComm = params.get('c') || savedComm;
    const finalValue = isRankMode ? (params.get('rank') || savedValue) : (params.get('cutoff') || savedValue);

    if (finalComm && finalValue) return resolve();

    const hideComm = !!finalComm;

    const modal = document.createElement('div');
    modal.className = 'overlay-full cutoff-calc-overlay';

    const inputTitle = isRankMode ? "Enter your Rank" : "Enter your cutoff mark";
    const inputPlaceholder = isRankMode ? "e.g. 5000" : "e.g. 185";
    const inputMin = isRankMode ? "1" : "0";
    const inputMax = isRankMode ? "999999" : "200";
    const inputStep = isRankMode ? "1" : "0.5";

    modal.innerHTML = `
      <style>
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
        }
      </style>
      <div class="overlay-backdrop"></div>
      <div class="gate-sheet cutoff-calc-sheet" style="max-width: 320px;">
        <div id="modal-comm-section" ${hideComm ? 'style="display:none;"' : ''}>
          <h3 class="calc-section-title" id="modal-comm-title" style="margin-bottom: 12px; text-align: left; opacity: 0.8; font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">Select your community</h3>
          <div class="gate-chips chips-sm" id="modal-comm-chips" style="margin-bottom: 24px; justify-content: flex-start; gap: 8px; display: flex; flex-wrap: wrap;">
            <button class="gate-chip gate-chip-sm" data-value="OC">OC</button>
            <button class="gate-chip gate-chip-sm" data-value="BC">BC</button>
            <button class="gate-chip gate-chip-sm" data-value="BCM">BCM</button>
            <button class="gate-chip gate-chip-sm" data-value="MBC">MBC</button>
            <button class="gate-chip gate-chip-sm" data-value="SC">SC</button>
            <button class="gate-chip gate-chip-sm" data-value="SCA">SCA</button>
            <button class="gate-chip gate-chip-sm" data-value="ST">ST</button>
          </div>
        </div>

        <h3 class="calc-section-title" style="margin-bottom: 8px; text-align: center; opacity: 0.8; font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">${inputTitle}</h3>
        <div class="calc-section" style="margin-bottom: 24px; display: flex; justify-content: center;">
          <div class="calc-field" style="width: 140px; display: flex; flex-direction: column; gap: 6px;">
            <input type="number" id="calc-direct" placeholder="${inputPlaceholder}" min="${inputMin}" max="${inputMax}" step="${inputStep}" 
                   style="font-size: 1.1rem; font-weight: 700; padding: 10px; border-radius: 8px; width: 100%; text-align: center; border: 1.5px solid var(--border); background: var(--bg-primary); color: var(--text-primary); outline: none;">
          </div>
        </div>

        <button class="gate-continue" id="calc-apply" style="margin-top: 10px; background: var(--accent); color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; width: 100%;">Continue →</button>
      </div>
    `;
    document.body.appendChild(modal);

    const chips = modal.querySelectorAll('.gate-chip');
    let selectedComm = finalComm || '';

    if (selectedComm) {
      modal.querySelectorAll(`.gate-chip[data-value="${selectedComm}"]`).forEach(c => c.classList.add('selected'));
    }
    if (savedValue) {
      modal.querySelector('#calc-direct').value = savedValue;
    }
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        selectedComm = chip.dataset.value;
        const commChips = $('modal-comm-chips');
        if (commChips) commChips.style.animation = 'none';
      });
    });

    const close = () => {
      modal.classList.add('hidden');
      setTimeout(() => {
        modal.remove();
        resolve();
        if (window.triggerScrollTutorial) window.triggerScrollTutorial();
      }, 400);
    };

    $('calc-apply').addEventListener('click', () => {
      const input = $('calc-direct');
      const chipContainer = $('modal-comm-chips');
      let val = parseFloat(input.value);
      let valid = true;

      if (!selectedComm) {
        if (chipContainer) {
          chipContainer.style.animation = 'none';
          setTimeout(() => chipContainer.style.animation = 'shake 0.4s ease', 10);
        }
        valid = false;
      }

      if (isRankMode) {
        if (isNaN(val) || val <= 0 || val > 999999) {
          if (input) {
            input.style.borderColor = '#ef4444';
            input.style.animation = 'none';
            setTimeout(() => input.style.animation = 'shake 0.4s ease', 10);
          }
          valid = false;
        }
      } else {
        if (isNaN(val) || val <= 0 || val > 200) {
          if (input) {
            input.style.borderColor = '#ef4444';
            input.style.animation = 'none';
            setTimeout(() => input.style.animation = 'shake 0.4s ease', 10);
          }
          valid = false;
        }
      }

      if (!valid) return;

      S.cutoffComm = selectedComm;
      localStorage.setItem('rankra_comm', selectedComm);
      if (isRankMode) {
        val = Math.round(val);
        S.targetRank = val;
        localStorage.setItem('rankra_rank', val);
      } else {
        val = Math.max(0, Math.min(200, val));
        S.targetCutoff = val;
        localStorage.setItem('rankra_cutoff', val);
      }
      
      if (window.RankraAuth && !window.RankraAuth.isGuest()) {
        const updatePayload = { community: selectedComm };
        if (isRankMode) {
          updatePayload.rank = val;
        } else {
          updatePayload.cutoff = val;
        }
        window.RankraAuth.updateProfile(updatePayload).catch(console.error);
      }
      
      setCommUI(S.cutoffComm);
      if ($('target-cutoff')) {
        $('target-cutoff').value = val;
      }

      render();
      close();
    });
  });
}

function initRankModal() {
  return new Promise(resolve => {
    const params = new URLSearchParams(window.location.search);
    const savedComm = localStorage.getItem('rankra_comm');
    const finalComm = params.get('c') || savedComm;
    const hideComm = !!finalComm;

    const savedRank = localStorage.getItem('rankra_rank');

    const modal = document.createElement('div');
    modal.className = 'overlay-full rank-calc-overlay';

    modal.innerHTML = `
      <div class="overlay-backdrop"></div>
      <div class="gate-sheet cutoff-calc-sheet" style="max-width: 320px;">
        <div id="modal-comm-section" ${hideComm ? 'style="display:none;"' : ''}>
          <h3 class="calc-section-title" id="modal-comm-title" style="margin-bottom: 12px; text-align: left; opacity: 0.8; font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">Select your community</h3>
          <div class="gate-chips chips-sm" id="modal-comm-chips" style="margin-bottom: 24px; justify-content: flex-start; gap: 8px; display: flex; flex-wrap: wrap;">
            <button class="gate-chip gate-chip-sm" data-value="OC">OC</button>
            <button class="gate-chip gate-chip-sm" data-value="BC">BC</button>
            <button class="gate-chip gate-chip-sm" data-value="BCM">BCM</button>
            <button class="gate-chip gate-chip-sm" data-value="MBC">MBC</button>
            <button class="gate-chip gate-chip-sm" data-value="SC">SC</button>
            <button class="gate-chip gate-chip-sm" data-value="SCA">SCA</button>
            <button class="gate-chip gate-chip-sm" data-value="ST">ST</button>
          </div>
        </div>

        <h3 class="calc-section-title" style="margin-bottom: 8px; text-align: center; opacity: 0.8; font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">Enter your Rank</h3>
        <div class="calc-section" style="margin-bottom: 24px; display: flex; justify-content: center;">
          <div class="calc-field" style="width: 160px; display: flex; flex-direction: column; gap: 6px;">
            <input type="number" id="rank-direct" placeholder="e.g. 5000" min="1" max="999999" step="1" 
                   style="font-size: 1.1rem; font-weight: 700; padding: 10px; border-radius: 8px; width: 100%; text-align: center; border: 1.5px solid var(--border); background: var(--bg-primary); color: var(--text-primary); outline: none;">
          </div>
        </div>
        <button class="gate-continue" id="rank-apply" style="margin-top: 10px; background: var(--accent); color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; width: 100%;">Continue →</button>
      </div>
    `;
    document.body.appendChild(modal);

    const chips = modal.querySelectorAll('.gate-chip');
    let selectedComm = finalComm || '';

    if (selectedComm) {
      modal.querySelectorAll(`.gate-chip[data-value="${selectedComm}"]`).forEach(c => c.classList.add('selected'));
    }

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        selectedComm = chip.dataset.value;
        const commChips = modal.querySelector('#modal-comm-chips');
        if (commChips) commChips.style.animation = 'none';
      });
    });

    const rankDirect = modal.querySelector('#rank-direct');
    if (savedRank && parseInt(savedRank, 10) > 0) {
      rankDirect.value = savedRank;
    }

    const close = () => {
      modal.classList.add('hidden');
      setTimeout(() => { modal.remove(); resolve(); }, 400);
    };

    modal.querySelector('#rank-apply').addEventListener('click', () => {
      const chipContainer = modal.querySelector('#modal-comm-chips');
      let rank = parseInt(rankDirect.value, 10);
      let valid = true;

      if (!selectedComm) {
        if (chipContainer) {
          chipContainer.style.animation = 'none';
          setTimeout(() => chipContainer.style.animation = 'shake 0.4s ease', 10);
        }
        valid = false;
      }

      if (isNaN(rank) || rank <= 0 || rank > 999999) {
        rankDirect.style.borderColor = '#ef4444';
        rankDirect.style.animation = 'none';
        setTimeout(() => rankDirect.style.animation = 'shake 0.4s ease', 10);
        valid = false;
      }

      if (!valid) return;

      S.cutoffComm = selectedComm;
      localStorage.setItem('rankra_comm', selectedComm);
      setCommUI(S.cutoffComm);

      S.targetRank = rank;
      localStorage.setItem('rankra_rank', rank);
      if ($('target-cutoff')) $('target-cutoff').value = S.targetRank;
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

  S.filterType = params.get('type') || 'cutoff';

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

function initCustomScrollbar() {
  if (document.getElementById('mobile-scrollbar')) return;

  const track = document.createElement('div');
  track.id = 'mobile-scrollbar';
  track.className = 'custom-mobile-scrollbar';

  const thumb = document.createElement('div');
  thumb.id = 'mobile-scrollbar-thumb';
  thumb.className = 'custom-mobile-scrollbar-thumb';

  track.appendChild(thumb);
  document.body.appendChild(track);

  function update() {
    const sh = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const ch = window.innerHeight;
    const st = window.scrollY || document.body.scrollTop || document.documentElement.scrollTop;

    // Show scrollbar only if the page has overflow and it's mobile view
    if (sh <= ch + 10 || window.innerWidth >= 1024) {
      track.style.display = 'none';
      return;
    }
    track.style.display = 'block';

    const trackHeight = track.offsetHeight;
    const thumbHeight = Math.max(24, (ch / sh) * trackHeight);
    const maxScroll = Math.max(1, sh - ch);
    const pct = Math.min(1, Math.max(0, st / maxScroll));
    const thumbTop = pct * (trackHeight - thumbHeight);

    thumb.style.height = thumbHeight + 'px';
    thumb.style.top = thumbTop + 'px';
  }

  window.addEventListener('scroll', update, { passive: true, capture: true });
  document.body.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });

  // Hook into the render loop to auto-update scrollbar when content sizes change
  const origRender = render;
  render = function () {
    origRender.apply(this, arguments);
    setTimeout(update, 100);
    setTimeout(update, 350); // also update after programmatic scroll completes
  };

  update();
}

async function init() {
  initCustomScrollbar();

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
    hideTopBar: true,
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
    initCollegesList();
    if (S.colleges.size > 0) {
      const codes = [...S.colleges].map(v => {
        const col = allColleges.find(c => String(c.value) === String(v));
        return col ? col.code : v;
      });
      if ($('college-search-input')) {
        $('college-search-input').value = codes.join(', ') + ', ';
        if ($('college-search-clear')) $('college-search-clear').classList.remove('hidden');
      }
    }
    initCollegeSearchEvents();
  } catch (e) {
    console.error("[Boot] Cache initialization failed:", e);
  }

  setFilterType(S.filterType, { skipModal: true });
  buildDistrictList();
  bindEvents(); // bind after data is ready
  render();

  awarenessPromise.then(() => {
    const isRankMode = S.filterType === 'rank';
    const finalComm = new URLSearchParams(window.location.search).get('c') || localStorage.getItem('rankra_comm');
    const finalVal = isRankMode 
      ? (new URLSearchParams(window.location.search).get('rank') || localStorage.getItem('rankra_rank'))
      : (new URLSearchParams(window.location.search).get('cutoff') || localStorage.getItem('rankra_cutoff'));

    if (!finalComm || !finalVal) {
      return initCutoffModal();
    }
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

  S.hiddenMediumCount = 0;

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

let _renderScrollTimeout = null;
let _isProgrammaticScroll = false;

// === Windowed Virtual Scrolling with Direction-Aware Preloading ===
// Keeps a sliding window of ~WINDOW_SIZE rendered cards.
// When scrolling brings us within TRIGGER_THRESHOLD invisible cards of an edge,
// we load LOAD_BATCH more in that direction and trim LOAD_BATCH from the opposite edge.
const WINDOW_SIZE = 50;       // target rendered window
const TRIGGER_THRESHOLD = 5;  // when only this many invisible cards remain in scroll direction, load more
const LOAD_BATCH = 10;        // cards to add/remove per adjustment
const INITIAL_RENDER = 50;    // initial cards to render

let _renderedStart = 0;
let _renderedEnd = 0;
let _observer = null;
let _topWatcher = null;   // the card near the top edge we observe
let _bottomWatcher = null; // the card near the bottom edge we observe
let _isAdjusting = false; // lock to prevent re-entrant adjustments

function _destroyObserver() {
  if (_observer) {
    _observer.disconnect();
    _observer = null;
  }
  _topWatcher = null;
  _bottomWatcher = null;
}

function _getEffectiveMax() {
  const total = S.filtered ? S.filtered.length : 0;
  if (ENABLE_GUEST_LIMIT && S.isGuest) {
    const cap = (S.targetIndex > 0) ? S.targetIndex + 20 : 20;
    return Math.min(total, cap);
  }
  return total;
}

function _ensureScrollIndicators() {
  const upInd = document.getElementById('scroll-more-up');
  const downInd = document.getElementById('scroll-more-down');
  if (upInd) upInd.remove();
  if (downInd) downInd.remove();
}

/**
 * Get all rendered result-card elements in DOM order.
 */
function _getRenderedCards(body) {
  return body.querySelectorAll('.result-card');
}

/**
 * Append `count` cards at the bottom of the rendered window.
 * Returns the number of cards actually appended.
 */
function _appendCardsRaw(body, count) {
  const max = _getEffectiveMax();
  if (!S.filtered || _renderedEnd >= max) return 0;

  const end = Math.min(_renderedEnd + count, max);
  const added = end - _renderedEnd;
  if (added <= 0) return 0;

  const frag = document.createDocumentFragment();
  for (let i = _renderedEnd; i < end; i++) {
    frag.appendChild(mkResultCard(S.filtered[i], i));
  }

  body.appendChild(frag);
  _renderedEnd = end;

  // Guest limit card
  if (ENABLE_GUEST_LIMIT && S.isGuest && _renderedEnd >= max && S.filtered.length > max) {
    if (!body.querySelector('.guest-limit-card')) {
      const g = document.createElement('div');
      g.className = 'guest-limit-card';
      g.innerHTML = `<div class="guest-limit-content">
        <div class="guest-limit-icon"><i class="fa-solid fa-layer-group"></i></div>
        <div class="guest-limit-text">
          <h4>Want to see all ${S.filtered.length} results for free?</h4>
          <p>Sign in to unlock full access to all 500+ engineering colleges.</p>
        </div>
        <button class="guest-limit-btn" onclick="window.RankraAuth.showLogin()">Sign in now</button>
      </div>`;
      body.appendChild(g);
    }
  }

  return added;
}

/**
 * Prepend `count` cards at the top of the rendered window.
 * Uses scroll anchoring to prevent visible position jump.
 * Returns the number of cards actually prepended.
 */
function _prependCardsRaw(body, count) {
  if (!S.filtered || _renderedStart <= 0) return 0;

  const newStart = Math.max(0, _renderedStart - count);
  const added = _renderedStart - newStart;
  if (added <= 0) return 0;

  // Anchor: record scroll position relative to the first currently rendered card
  const firstCard = body.querySelector('.result-card');
  const anchorRect = firstCard ? firstCard.getBoundingClientRect() : null;
  const scrollBefore = window.scrollY;

  const frag = document.createDocumentFragment();
  for (let i = newStart; i < _renderedStart; i++) {
    frag.appendChild(mkResultCard(S.filtered[i], i));
  }

  // Insert at the very beginning of body (before all existing cards)
  body.insertBefore(frag, body.firstChild);
  _renderedStart = newStart;

  // Restore scroll position so user doesn't see a jump
  if (firstCard && anchorRect) {
    const newAnchorRect = firstCard.getBoundingClientRect();
    const drift = newAnchorRect.top - anchorRect.top;
    if (Math.abs(drift) > 1) {
      window.scrollTo({ top: scrollBefore + drift, behavior: 'instant' });
    }
  }

  return added;
}

/**
 * Remove `count` cards from the bottom of the rendered window.
 * Only removes if we won't go below a minimum window size.
 */
function _trimBottom(body, count) {
  const cards = _getRenderedCards(body);
  const canRemove = Math.min(count, cards.length - TRIGGER_THRESHOLD - 1);
  if (canRemove <= 0) return;

  // Also remove any guest-limit-card if present
  const guestCard = body.querySelector('.guest-limit-card');
  if (guestCard) guestCard.remove();

  for (let i = 0; i < canRemove; i++) {
    const card = cards[cards.length - 1 - i];
    if (card) card.remove();
  }
  _renderedEnd -= canRemove;
}

/**
 * Remove `count` cards from the top of the rendered window.
 * Uses scroll anchoring to prevent visible position jump.
 */
function _trimTop(body, count) {
  const cards = _getRenderedCards(body);
  const canRemove = Math.min(count, cards.length - TRIGGER_THRESHOLD - 1);
  if (canRemove <= 0) return;

  // Anchor: pick the card just after the ones we'll remove
  const anchorCard = cards[canRemove];
  const anchorRect = anchorCard ? anchorCard.getBoundingClientRect() : null;
  const scrollBefore = window.scrollY;

  for (let i = 0; i < canRemove; i++) {
    if (cards[i]) cards[i].remove();
  }
  _renderedStart += canRemove;

  // Restore scroll
  if (anchorCard && anchorRect) {
    const newAnchorRect = anchorCard.getBoundingClientRect();
    const drift = newAnchorRect.top - anchorRect.top;
    if (Math.abs(drift) > 1) {
      window.scrollTo({ top: scrollBefore + drift, behavior: 'instant' });
    }
  }
}

/**
 * Called when the top watcher card becomes visible — user is scrolling up.
 * Load LOAD_BATCH cards above, trim LOAD_BATCH from below.
 */
function _onApproachingTop(body) {
  if (_isAdjusting || _isProgrammaticScroll) return;
  if (_renderedStart <= 0) return; // nothing more above

  _isAdjusting = true;

  _prependCardsRaw(body, LOAD_BATCH);
  _trimBottom(body, LOAD_BATCH);
  _ensureScrollIndicators();
  _installWatchers(body);

  _isAdjusting = false;
}

/**
 * Called when the bottom watcher card becomes visible — user is scrolling down.
 * Load LOAD_BATCH cards below, trim LOAD_BATCH from above.
 */
function _onApproachingBottom(body) {
  if (_isAdjusting || _isProgrammaticScroll) return;
  const max = _getEffectiveMax();
  if (_renderedEnd >= max) return; // nothing more below

  _isAdjusting = true;

  _appendCardsRaw(body, LOAD_BATCH);
  _trimTop(body, LOAD_BATCH);
  _ensureScrollIndicators();
  _installWatchers(body);

  _isAdjusting = false;
}

/**
 * Install IntersectionObserver watchers on the cards at TRIGGER_THRESHOLD
 * positions from each edge of the rendered window.
 */
function _installWatchers(body) {
  _destroyObserver();

  const cards = _getRenderedCards(body);
  if (cards.length === 0) return;

  // Top watcher: the card at index TRIGGER_THRESHOLD from top
  // (when this becomes visible, we need to load more above)
  const topIdx = Math.min(TRIGGER_THRESHOLD, cards.length - 1);
  _topWatcher = cards[topIdx];

  // Bottom watcher: the card at TRIGGER_THRESHOLD from bottom
  // (when this becomes visible, we need to load more below)
  const bottomIdx = Math.max(0, cards.length - 1 - TRIGGER_THRESHOLD);
  _bottomWatcher = cards[bottomIdx];

  // Don't observe the same card for both
  if (_topWatcher === _bottomWatcher && cards.length > 1) {
    _topWatcher = cards[0];
    _bottomWatcher = cards[cards.length - 1];
  }

  _observer = new IntersectionObserver((entries) => {
    if (_isProgrammaticScroll || _isAdjusting) return;

    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      if (entry.target === _topWatcher) {
        _onApproachingTop(body);
      } else if (entry.target === _bottomWatcher) {
        _onApproachingBottom(body);
      }
    }
  }, { root: null, rootMargin: '200px 0px', threshold: 0 });

  if (_topWatcher && _renderedStart > 0) _observer.observe(_topWatcher);
  if (_bottomWatcher && _renderedEnd < _getEffectiveMax()) _observer.observe(_bottomWatcher);
}

function renderVirtual(boundaryIdx, { skipWatchers = false } = {}) {
  const body = $('results-body');
  if (!body || !S.filtered) return;

  const total = S.filtered.length;
  if (total === 0) { body.innerHTML = ''; return; }

  _destroyObserver();
  const max = _getEffectiveMax();

  let start = 0;
  let end = Math.min(max, INITIAL_RENDER);

  if (boundaryIdx > 0) {
    // Center the window around the boundary:
    // show half INITIAL_RENDER cards above (Medium/Low) and half below (High/VeryHigh)
    const half = Math.floor(INITIAL_RENDER / 2);
    start = Math.max(0, boundaryIdx - half);
    end = Math.min(max, start + INITIAL_RENDER);
    // Adjust start if we bumped into the end
    if (end === max && end - start < INITIAL_RENDER) {
      start = Math.max(0, end - INITIAL_RENDER);
    }
  }

  _renderedStart = start;
  _renderedEnd = end;

  body.innerHTML = '';
  const frag = document.createDocumentFragment();

  for (let i = start; i < end; i++) {
    frag.appendChild(mkResultCard(S.filtered[i], i));
  }

  if (ENABLE_GUEST_LIMIT && S.isGuest && end >= max && total > max) {
    const g = document.createElement('div');
    g.className = 'guest-limit-card';
    g.innerHTML = `<div class="guest-limit-content">
      <div class="guest-limit-icon"><i class="fa-solid fa-layer-group"></i></div>
      <div class="guest-limit-text">
        <h4>Want to see all ${total} results for free?</h4>
        <p>Sign in to unlock full access to all 500+ engineering colleges.</p>
      </div>
      <button class="guest-limit-btn" onclick="window.RankraAuth.showLogin()">Sign in now</button>
    </div>`;
    frag.appendChild(g);
  }

  body.appendChild(frag);

  // If caller is doing a programmatic scroll right after this, delay installing
  // the IntersectionObserver so it doesn't fire during the scroll and eat cards.
  if (!skipWatchers) {
    _installWatchers(body);
  }
  _ensureScrollIndicators();
}

function render() {
  if (_renderScrollTimeout) { clearTimeout(_renderScrollTimeout); _renderScrollTimeout = null; }

  const resultsBody = $('results-body');
  if (!resultsBody) return;
  resultsBody.innerHTML = '';
  _destroyObserver();

  applyFilters();
  syncURL();

  let boundaryIdx = -1;
  const isFilteringTarget = (S.filterType === 'rank' ? S.targetRank > 0 : S.targetCutoff > 0);

  if (isFilteringTarget && S.filtered.length > 0) {
    // Array is sorted by rank ascending (worse chances first, better chances at the bottom).
    // Find the first index where chance becomes High or Very High.
    boundaryIdx = S.filtered.findIndex(r => {
      const chanceText = getChance(r).text;
      return chanceText === 'High Chance' || chanceText === 'Very High Chance';
    });

    // If there are no High chances at all, find the first Medium chance instead
    if (boundaryIdx === -1) {
      boundaryIdx = S.filtered.findIndex(r => getChance(r).text === 'Medium Chance');
    }
  }

  S.targetIndex = boundaryIdx;

  if (ENABLE_GUEST_LIMIT && S.isGuest && S.filterCount > 5) {
    renderGuestWall();
  } else {
    if (boundaryIdx > 0) {
      // skipWatchers=true: we install watchers AFTER the programmatic scroll settles,
      // so the observer doesn't fire during the scroll and accidentally trim cards.
      renderVirtual(boundaryIdx, { skipWatchers: true });

      // Scroll the last Medium card to the top so the first High card is just below.
      _renderScrollTimeout = setTimeout(() => {
        _isProgrammaticScroll = true;

        const boundaryRecord = S.filtered[boundaryIdx - 1];
        let showCard = null;
        if (boundaryRecord) {
          const code = String(boundaryRecord.coc).padStart(4, '0');
          const brc = boundaryRecord.brc;
          showCard = document.getElementById(`card-${code}-${brc}`);
        }

        if (showCard) {
          const filterBar = document.getElementById('filter-bar');
          const filterBarH = filterBar ? filterBar.offsetHeight : 0;
          showCard.style.scrollMarginTop = (filterBarH + 50) + 'px';
          showCard.scrollIntoView({ behavior: 'instant', block: 'start' });
        }

        // Give browser a moment to settle the scroll position, THEN arm the observer.
        // Using 300ms to safely clear any async layout/paint that could fire the observer.
        setTimeout(() => {
          _isProgrammaticScroll = false;
          const body = $('results-body');
          if (body) {
            _installWatchers(body);
            _ensureScrollIndicators();
          }
        }, 300);
      }, 100);
    } else {
      renderVirtual(0);
      _renderScrollTimeout = setTimeout(() => {
        _isProgrammaticScroll = true;
        window.scrollTo({ top: 0, behavior: 'instant' });
        setTimeout(() => { _isProgrammaticScroll = false; }, 200);
      }, 60);
    }

    $('empty-state').classList.toggle('hidden', S.filtered.length > 0);
  }

  if ($('chance-summary')) $('chance-summary').hidden = true;

  if ($('results-count')) {
    const total = S.filtered.length;
    $('results-count').innerHTML = total > 0
      ? `<span class="count-text">${total} result${total !== 1 ? 's' : ''}</span>` : '';
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
      if (S.targetRank <= n * 0.8) return { text: 'Very High Chance', class: 'poss-vhigh' };
      if (S.targetRank <= n) return { text: 'High Chance', class: 'poss-high' };
      if (S.targetRank <= n + 10000) return { text: 'Medium Chance', class: 'poss-medium' };
      if (S.targetRank <= n + 15000) return { text: 'Low Chance', class: 'poss-low' };
      return { text: 'No Chance', class: 'poss-none' };
    } else {
      const ratio = ctl > 0 ? cal / ctl : 0;
      if (cvac >= 20 || (ctl > 0 && ratio < 0.6)) return { text: 'Very High Chance', class: 'poss-vhigh' };
      if (cvac >= 5 || ctl > 30) return { text: 'High Chance', class: 'poss-high' };
      if (cvac >= 2 || ctl > 15) return { text: 'Medium Chance', class: 'poss-medium' };
      return { text: 'Low Chance', class: 'poss-low' };
    }
  } else {
    // Cutoff mode
    if (S.targetCutoff <= 0) return { text: '—', class: '' };
    const v = r[cc]; const n = parseFloat(v); const has = v !== '' && v !== null && !isNaN(n);

    if (has) {
      if (n < S.targetCutoff - 11) return { text: 'Very High Chance', class: 'poss-vhigh' };
      if (n <= S.targetCutoff) return { text: 'High Chance', class: 'poss-high' };
      if (n <= S.targetCutoff + 4.5) return { text: 'Medium Chance', class: 'poss-medium' };
      if (n <= S.targetCutoff + 6.5) return { text: 'Low Chance', class: 'poss-low' };
      return { text: 'No Chance', class: 'poss-none' };
    } else {
      const ratio = ctl > 0 ? cal / ctl : 0;
      if (cvac >= 20 || (ctl > 0 && ratio < 0.6)) return { text: 'Very High Chance', class: 'poss-vhigh' };
      if (cvac >= 5 || ctl > 30) return { text: 'High Chance', class: 'poss-high' };
      if (cvac >= 2 || ctl > 15) return { text: 'Medium Chance', class: 'poss-medium' };
      return { text: 'Low Chance', class: 'poss-low' };
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

  const csk = TNEA_CONFIG.seatKeys[cc] || { tl: 'octl', al: 'ocal' };
  const ctl = parseInt(r[csk.tl], 10) || 0;
  const cal = parseInt(r[csk.al], 10) || 0;

  const chance = getChance(r);
  const possText = chance.text;
  const possClass = chance.class;

  const targetValueActive = S.filterType === 'rank' ? S.targetRank > 0 : S.targetCutoff > 0;
  const hasPoss = targetValueActive && possText !== '—';

  const card = document.createElement('div');
  card.className = 'result-card';
  card.dataset.idx = idx;
  card.id = `card-${code}-${r.brc}`;

  const type = codeToType[String(r.coc)] || "";
  let typeClass = "type-other";
  const ut = type.toUpperCase();
  if (ut.startsWith("GOVT ANNA")) typeClass = "type-au";
  else if (ut.startsWith("GOVT AIDED")) typeClass = "type-aided";
  else if (ut.startsWith("GOVT")) typeClass = "type-govt";
  else if (ut.startsWith("CENTRAL")) typeClass = "type-central";
  else if (ut.startsWith("PRIVATE AUTONOMOUS")) typeClass = "type-pvt-auto";
  else if (ut.startsWith("PRIVATE")) typeClass = "type-pvt";

  card.innerHTML = `
    <div class="card-header" style="padding: 6px 10px;">
      <!-- Row 1: College Type & Chance -->
      <div class="card-type-chance" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; font-size: 0.75rem; font-weight: 600;">
        <div>
          ${type ? `<span class="clg-type-badge ${typeClass}" style="display: inline-block; font-size: 0.6rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase;">${type}</span>` : ''}
        </div>
        <div>
          ${hasPoss ? `<span class="poss-badge ${possClass}" style="font-size: 0.6rem; padding: 2px 6px; border-radius: 4px;">${possText}</span>` : ''}
        </div>
      </div>

      <!-- Row 2: Code and Name -->
      <div class="card-name" style="margin-bottom: 4px; font-size: 0.9rem; font-weight: 600; line-height: 1.4; color: var(--text-primary);">
        <span style="color: var(--accent); font-weight: 900;">${esc(code)}</span> — ${esc(r._conClean || '')}
      </div>

      <!-- Row 3: Course Name -->
      <div class="card-branch" style="opacity: 0.8; font-weight: 500; font-size: 0.75rem; margin-bottom: 4px; color: var(--text-secondary);">
        <span style="color: var(--accent); font-weight: 700;">${esc(r.brc || '')}</span> — ${esc(r.brn || '')}
      </div>
      
      <!-- Row 4: Stats -->
      <div class="card-stats-row" style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); display: flex; align-items: center; gap: 6px; white-space: nowrap;">
        ${S.filterType === 'rank' ? `
          <span>Rank: <span style="color: var(--text-primary); font-weight: 700;${rankValStr ? '' : ' color: var(--text-muted);'}">${rankVal}</span></span>
        ` : `
          <span>Cutoff: <span style="color: var(--text-primary); font-weight: 700;${has ? '' : ' color: var(--text-muted);'}">${cutoffVal}</span></span>
        `}
        <span style="opacity: 0.4;">•</span>
        <span>Seats: <span style="color: var(--text-primary); font-weight: 700;">${ctl || '—'}</span></span>
        <span style="opacity: 0.4;">•</span>
        <span>Filled: <span style="color: var(--text-primary); font-weight: 700;">${cal || '—'}</span></span>
      </div>
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

  buildCourseList();
}

let allColleges = [];

function initCollegesList() {
  const map = new Map();
  S.data.forEach(r => { if (r.coc && r._conClean) map.set(String(r.coc), r._conClean); });
  allColleges = [...map.entries()].map(([v, l]) => ({
    code: String(v).padStart(4, '0'),
    name: l,
    value: String(v)
  })).sort((a, b) => a.code.localeCompare(b.code));
}

function initCollegeSearchEvents() {
  const searchInput = $('college-search-input');
  const suggestionsDiv = $('college-search-suggestions');
  const clearBtn = $('college-search-clear');
  if (!searchInput || !suggestionsDiv) return;

  searchInput.addEventListener('input', (e) => {
    const rawVal = e.target.value;
    if (clearBtn) {
      clearBtn.classList.toggle('hidden', !rawVal);
    }
    if (!rawVal) {
      S.colleges.clear();
      suggestionsDiv.classList.add('hidden');
      suggestionsDiv.innerHTML = '';
      render();
      return;
    }

    const parts = rawVal.split(',');
    const newColleges = new Set();
    let q = '';

    parts.forEach((part, index) => {
      const trimmed = part.trim();
      if (!trimmed) return;

      const found = allColleges.find(c => c.code === trimmed || c.value === trimmed);
      if (found) {
        newColleges.add(found.value);
      } else {
        if (index === parts.length - 1) {
          q = trimmed;
        }
      }
    });

    let changed = false;
    if (newColleges.size !== S.colleges.size) {
      changed = true;
    } else {
      for (let item of newColleges) {
        if (!S.colleges.has(item)) {
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      S.colleges = newColleges;
      render();
    }

    if (!q) {
      suggestionsDiv.classList.add('hidden');
      suggestionsDiv.innerHTML = '';
      return;
    }

    const matches = allColleges.filter(c => {
      return c.code.includes(q) || c.name.toLowerCase().includes(q);
    }).slice(0, 10);

    if (matches.length === 0) {
      suggestionsDiv.innerHTML = '<div class="suggestion-item" style="padding: 8px 12px; color: var(--text-muted); cursor: default; font-size: 0.85rem;">No matching colleges</div>';
    } else {
      suggestionsDiv.innerHTML = matches.map(c => {
        const isSelected = S.colleges.has(c.value);
        return `
          <div class="suggestion-item" data-value="${esc(c.value)}" style="padding: 8px 12px; cursor: pointer; font-size: 0.85rem; border-bottom: 1px solid var(--border); color: var(--text-primary); transition: background var(--t); display: flex; align-items: center; justify-content: space-between;">
            <div>
              <span style="color: var(--accent); font-weight: 700;">${esc(c.code)}</span> — ${esc(c.name)}
            </div>
            ${isSelected ? `<i class="fa-solid fa-check" style="color: var(--accent); margin-left: 8px;"></i>` : ''}
          </div>
        `;
      }).join('');

      suggestionsDiv.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          const val = item.dataset.value;
          if (S.colleges.has(val)) {
            S.colleges.delete(val);
          } else {
            S.colleges.add(val);
          }

          const codes = [...S.colleges].map(v => {
            const col = allColleges.find(c => String(c.value) === String(v));
            return col ? col.code : v;
          });

          searchInput.value = codes.join(', ') + (codes.length > 0 ? ', ' : '');
          if (clearBtn) clearBtn.classList.toggle('hidden', !searchInput.value);
          suggestionsDiv.classList.add('hidden');
          render();
          searchInput.focus();
        });
      });

      suggestionsDiv.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('mouseenter', () => item.style.background = 'var(--bg-hover)');
        item.addEventListener('mouseleave', () => item.style.background = '');
      });
    }
    suggestionsDiv.classList.remove('hidden');
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      S.colleges.clear();
      clearBtn.classList.add('hidden');
      suggestionsDiv.classList.add('hidden');
      suggestionsDiv.innerHTML = '';
      render();
      searchInput.focus();
    });
  }

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
      suggestionsDiv.classList.add('hidden');
    }
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

function syncCollegeLabel() {
  // colleges use raw input list, no count label button
}

let eventsBound = false;
function bindEvents() {
  if (eventsBound) return;
  eventsBound = true;

  $('dd-search-input').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    $('dd-list').querySelectorAll('label').forEach(l => l.style.display = l.textContent.toLowerCase().includes(q) ? '' : 'none');
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
          S.targetRank = 0;
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
  if ($('college-search-input')) $('college-search-input').value = '';
  if ($('college-search-clear')) $('college-search-clear').classList.add('hidden');

  S.courses.clear(); S.courseMode = 'include';
  if ($('course-dd-list')) $('course-dd-list').querySelectorAll('input').forEach(cb => cb.checked = false);
  syncCourseLabel();

  S.types.clear(); S.typeMode = 'include';
  syncTypeLabel();

  buildCourseList();
  if (shDistrict) shDistrict.updateItems(S.allDistricts, S.districts, S.districtMode);

  if ($('year-btn-text')) $('year-btn-text').textContent = 'Year: 2025';
  render();
}

document.addEventListener('DOMContentLoaded', init);

/* ── Scroll Tutorial Hint ── */
(function initScrollTutorial() {
  const tut = document.getElementById('scroll-tutorial');
  if (!tut) return;

  if (localStorage.getItem('scroll_tutorial_dismissed') === 'true') {
    tut.style.display = 'none';
    return;
  }

  const filterBar = document.getElementById('filter-bar');
  const updatePosition = () => {
    if (filterBar) {
      const rect = filterBar.getBoundingClientRect();
      document.documentElement.style.setProperty('--filter-bar-bottom', `${rect.bottom}px`);
    }
  };

  let dismissed = false;
  let isVisible = false;

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    if (isVisible) {
      localStorage.setItem('scroll_tutorial_dismissed', 'true');
    }
    tut.classList.remove('tut-visible');
    tut.classList.add('tut-hiding');
    tut.addEventListener('transitionend', () => {
      tut.style.display = 'none';
    }, { once: true });
    window.removeEventListener('resize', updatePosition);
  }

  // Show on every refresh — no session-storage gate
  function show() {
    if (localStorage.getItem('scroll_tutorial_dismissed') === 'true') {
      tut.style.display = 'none';
      return;
    }
    if (dismissed) return;
    if (document.querySelector('.cutoff-calc-overlay') || document.querySelector('.awareness-overlay') || document.querySelector('.rank-calc-overlay')) {
      return;
    }
    updatePosition();
    window.addEventListener('resize', updatePosition);
    tut.classList.add('tut-visible');
    isVisible = true;
  }

  window.triggerScrollTutorial = function () {
    setTimeout(show, 2000);
  };

  // Start after 2 seconds so the page is loaded
  setTimeout(show, 2000);

  // Dismiss on any scroll, wheel movement, or touch swipe
  function handleScrollDismiss() {
    dismiss();
    window.removeEventListener('scroll', handleScrollDismiss);
    window.removeEventListener('wheel', handleScrollDismiss);
    window.removeEventListener('touchmove', handleScrollDismiss);
  }

  window.addEventListener('scroll', handleScrollDismiss, { passive: true, once: true });
  window.addEventListener('wheel', handleScrollDismiss, { passive: true, once: true });
  window.addEventListener('touchmove', handleScrollDismiss, { passive: true, once: true });
})();

