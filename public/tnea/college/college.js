import { SiteHeader } from '../../shared/js/SiteHeader.js';
import { initTheme } from '../../shared/js/theme.js';
import { requestJSON, initBackgroundCache } from '../../shared/js/caching.js';
import { FilterSheet } from '../../shared/js/FilterSheet.js';

const DISTRICT_NORM = {
  'Kanchipuram': 'Kancheepuram', 'Sivaganga': 'Sivagangai',
  'Kallakkurichi': 'Kallakurichi', 'Thiruvallur': 'Tiruvallur',
  'Tirupur': 'Tiruppur', 'Nagappattinam': 'Nagapattinam',
  'Thiruppathur': 'Tirupattur', 'Thiruppattur': 'Tirupattur',
  'Thiruvannamalai': 'Tiruvannamalai', 'Thiruvarur': 'Tiruvarur'
};

function normalizeDistrict(d) {
  return DISTRICT_NORM[d] || d;
}

let shDistrict = null;
let shCourse = null;
let shType = null;
let codeToType = {};

document.addEventListener('DOMContentLoaded', () => {
  new SiteHeader({
    title: 'Colleges',
    logoPath: '../../assets/rankra_logo50.png'
  });
  initTheme();
  initBackgroundCache();
  init();
});

let cocs = {}, searchIndex = {}, ranges = {}, globalMaxMap = {}, courseCodesMap = {}, branchRecordsMap = {}, allCodes = [];
let cutoffInput, textInput;

const S = {
  districts: new Set(),
  districtMode: 'include',
  courses: new Set(),
  courseMode: 'include',
  types: new Set(),
  typeMode: 'include',
  community: 'OC',
  filterType: 'cutoff'
};

function setFilterType(type, { skipModal = false } = {}) {
  S.filterType = type;
  const input = document.getElementById('cutoffSearch');
  const toggleButtons = document.querySelectorAll('#filter-type-toggle .toggle-btn');
  
  toggleButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  
  if (type === 'rank') {
    const savedRank = localStorage.getItem('rankra_rank');
    if (input) {
      input.placeholder = 'e.g. 5000';
      input.min = '1';
      input.max = '999999';
      input.step = '1';
      input.value = savedRank ? savedRank : '';
    }
    if (!savedRank || parseInt(savedRank, 10) <= 0) {
      if (!skipModal) initRankModal();
    }
  } else {
    const savedCutoff = localStorage.getItem('rankra_cutoff');
    if (input) {
      input.placeholder = '200.0';
      input.min = '0';
      input.max = '200';
      input.step = '0.5';
      input.value = savedCutoff ? savedCutoff : '200';
    }
  }
  
  localStorage.setItem('rankra_filter_type_clg', type);
  
  if (Object.keys(ranges).length > 0) {
    updateSort();
    runSearch();
  }
}
window.setFilterType = setFilterType;

function initCutoffModal() {
  return new Promise(resolve => {
    const params = new URLSearchParams(window.location.search);
    const savedComm = localStorage.getItem('rankra_comm');
    const isRankMode = S.filterType === 'rank';
    const savedValue = isRankMode ? localStorage.getItem('rankra_rank') : localStorage.getItem('rankra_cutoff');

    const finalComm = params.get('comm') || savedComm;
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
        const commChips = document.getElementById('modal-comm-chips');
        if (commChips) commChips.style.animation = 'none';
      });
    });

    const close = () => {
      modal.classList.add('hidden');
      setTimeout(() => {
        modal.remove();
        resolve();
      }, 400);
    };

    document.getElementById('calc-apply').addEventListener('click', () => {
      const input = document.getElementById('calc-direct');
      const chipContainer = document.getElementById('modal-comm-chips');
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

      S.community = selectedComm;
      localStorage.setItem('rankra_comm', selectedComm);
      if (isRankMode) {
        val = Math.round(val);
        localStorage.setItem('rankra_rank', val);
      } else {
        val = Math.max(0, Math.min(200, val));
        localStorage.setItem('rankra_cutoff', val);
      }
      
      const commBtnText = document.getElementById('comm-btn-text');
      if (commBtnText) commBtnText.textContent = selectedComm;
      if (cutoffInput) {
        cutoffInput.value = val;
      }

      updateSort();
      close();
    });
  });
}

function initRankModal() {
  return new Promise(resolve => {
    const params = new URLSearchParams(window.location.search);
    const savedComm = localStorage.getItem('rankra_comm');
    const finalComm = params.get('comm') || savedComm;
    const hideComm = !!finalComm;

    const savedRank = localStorage.getItem('rankra_rank');

    const modal = document.createElement('div');
    modal.className = 'overlay-full rank-calc-overlay';

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

      S.community = selectedComm;
      localStorage.setItem('rankra_comm', selectedComm);
      const commBtnText = document.getElementById('comm-btn-text');
      if (commBtnText) commBtnText.textContent = selectedComm;

      localStorage.setItem('rankra_rank', rank);
      if (cutoffInput) {
        cutoffInput.value = rank;
      }
      updateSort();
      runSearch();
      close();
    });
  });
}

async function init() {
  try {
    cutoffInput = document.getElementById('cutoffSearch');
    textInput = document.getElementById('collegeSearch');

    if (cutoffInput) {
      cutoffInput.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        if (S.filterType === 'rank') {
          if (!isNaN(v) && v > 0) {
            localStorage.setItem('rankra_rank', Math.round(v));
          }
        } else {
          if (!isNaN(v) && v > 0) {
            localStorage.setItem('rankra_cutoff', Math.max(0, Math.min(200, v)));
          }
        }
        runSearch();
      });
    }
    if (textInput) textInput.addEventListener('input', runSearch);

    const params = new URLSearchParams(window.location.search);
    const initialYear = params.get('year') || '2025';
    const yearReversed = initialYear.split('').reverse().join('');
    const cutoffPath = `/assets/db/tnea/cutoff/${yearReversed}.gzip`;
    
    const yearBtnText = document.getElementById('year-btn-text');
    if (yearBtnText) yearBtnText.textContent = initialYear;

    const toggleButtons = document.querySelectorAll('#filter-type-toggle .toggle-btn');
    toggleButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        setFilterType(e.target.dataset.type);
      });
    });

    const localCutoff = localStorage.getItem('rankra_cutoff');
    const localRank = localStorage.getItem('rankra_rank');
    let savedType = params.get('type') || localStorage.getItem('rankra_filter_type_clg');
    if (localCutoff && !localRank && !params.has('type')) {
      savedType = 'cutoff';
    }
    if (!savedType) savedType = 'cutoff';
    setFilterType(savedType, { skipModal: true });

    loadStateFromURL();

    // Check if we need to show the popup
    const finalComm = params.get('comm') || localStorage.getItem('rankra_comm');
    const isRankMode = S.filterType === 'rank';
    const finalVal = isRankMode 
      ? (params.get('rank') || localStorage.getItem('rankra_rank'))
      : (params.get('cutoff') || localStorage.getItem('rankra_cutoff'));

    let initPromise = Promise.resolve();
    if (!finalComm || !finalVal) {
      initPromise = initCutoffModal();
    }

    const paths = [
      `/assets/db/tnea/college/cocs.json`,
      `/assets/db/tnea/college/csearch.json`,
      cutoffPath,
      `/assets/db/tndistricts.json`,
      `/assets/db/tnea/college/type.json`
    ];
    const data = await requestJSON(paths);

    cocs = data[paths[0]];
    searchIndex = data[paths[1]];
    const rawCutoff = data[cutoffPath];
    const districts = data[paths[3]];
    const typesData = data[paths[4]];

    // Group raw cutoff data by college
    const processedRanges = {};
    const gMax = {};
    const cCodes = {};
    const bRecords = {};
    const allCourseSet = new Set();
    const courseLabels = {};

    rawCutoff.forEach(r => {
      const code = String(r.coc);
      if (!processedRanges[code]) processedRanges[code] = {};
      if (gMax[code] === undefined) gMax[code] = 0;
      if (!cCodes[code]) cCodes[code] = new Set();
      if (!bRecords[code]) bRecords[code] = [];

      bRecords[code].push(r);
      if (r.brc) {
        cCodes[code].add(r.brc);
        allCourseSet.add(r.brc);
        if (r.brn) courseLabels[r.brc] = r.brn.toUpperCase();
      }

      ['OC', 'BC', 'BCM', 'MBC', 'SC', 'SCA', 'ST'].forEach(comm => {
        if (!processedRanges[code][comm]) processedRanges[code][comm] = [0, 200, 0, 999999, 0, 0];
        const val = parseFloat(r[comm]);
        const rankVal = parseInt(r[comm.toLowerCase() + 'r'], 10);
        
        if (!isNaN(val) && val > 0) {
          processedRanges[code][comm][0] = Math.max(processedRanges[code][comm][0], val);
          processedRanges[code][comm][1] = Math.min(processedRanges[code][comm][1], val);
          gMax[code] = Math.max(gMax[code], val);
        }

        if (!isNaN(rankVal) && rankVal > 0) {
          processedRanges[code][comm][2] = Math.max(processedRanges[code][comm][2], rankVal);
          processedRanges[code][comm][3] = Math.min(processedRanges[code][comm][3], rankVal);
        }
      });
    });
    Object.values(processedRanges).forEach(commObj => {
      Object.values(commObj).forEach(arr => { 
        if (arr[1] === 200) arr[1] = 0; 
        if (arr[3] === 999999) arr[3] = 0;
      });
    });
    ranges = processedRanges;
    globalMaxMap = gMax;
    Object.keys(cCodes).forEach(k => { courseCodesMap[k] = [...cCodes[k]].sort(); });
    branchRecordsMap = bRecords;

    // Sort allCodes by max cutoff 2025 (descending) for the current community
    updateSort();

    // Initialize district filter
    shDistrict = new FilterSheet('district-sheet', {
      title: 'Select Districts',
      items: districts,
      showModeToggle: true,
      selected: Array.from(S.districts),
      mode: S.districtMode,
      onApply: (selected, mode) => {
        S.districts = selected;
        S.districtMode = mode;
        syncFilterUI();
        runSearch();
      },
      onClear: () => {
        S.districts.clear();
        syncFilterUI();
        runSearch();
      }
    });

    const distBtn = document.getElementById('district-btn');
    if (distBtn) distBtn.addEventListener('click', () => shDistrict.open());

    // Initialize course filter
    const courseList = [...allCourseSet].sort().map(c => ({
      value: c,
      label: `${c} - ${courseLabels[c] || c}`
    }));

    shCourse = new FilterSheet('course-sheet', {
      title: 'Select Courses',
      items: courseList,
      showModeToggle: true,
      selected: Array.from(S.courses),
      mode: S.courseMode,
      onApply: (selected, mode) => {
        S.courses = selected;
        S.courseMode = mode;
        syncFilterUI();
        runSearch();
      },
      onClear: () => {
        S.courses.clear();
        syncFilterUI();
        runSearch();
      }
    });

    const courseBtn = document.getElementById('course-btn');
    if (courseBtn) courseBtn.addEventListener('click', () => shCourse.open());

    // Build reverse map for fast type lookup
    codeToType = {};
    if (typesData) {
      for (const [cat, ids] of Object.entries(typesData)) {
        for (const id of ids) {
          codeToType[String(id)] = cat.toUpperCase();
        }
      }
    }

    // Initialize type filter
    const typeList = typesData ? Object.keys(typesData).map(t => {
      const uType = t.toUpperCase();
      const count = typesData[t].length;
      return {
        value: uType,
        label: `${uType} (${count})`
      };
    }).sort((a, b) => a.value.localeCompare(b.value)) : [];

    shType = new FilterSheet('type-sheet', {
      title: 'Select College Types',
      items: typeList,
      showModeToggle: true,
      selected: Array.from(S.types),
      mode: S.typeMode,
      onApply: (selected, mode) => {
        S.types = selected;
        S.typeMode = mode;
        syncFilterUI();
        runSearch();
      },
      onClear: () => {
        S.types.clear();
        syncFilterUI();
        runSearch();
      }
    });

    const typeBtn = document.getElementById('type-btn');
    if (typeBtn) typeBtn.addEventListener('click', () => shType.open());

    // Sync UI after state is loaded
    syncFilterUI();


    // Custom Community Dropdown Logic
    const commBtn = document.getElementById('comm-btn');
    const commDropdown = document.getElementById('comm-dropdown');
    const commBtnText = document.getElementById('comm-btn-text');

    if (commBtn && commDropdown) {
      commBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const willBeOpen = commDropdown.hidden;
        commDropdown.hidden = !willBeOpen;
        commBtn.setAttribute('aria-expanded', String(willBeOpen));
      });

      commDropdown.querySelectorAll('.sort-option').forEach(opt => {
        if (opt.dataset.value === S.community) opt.classList.add('active');
        else opt.classList.remove('active');
        
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const val = opt.dataset.value;
          S.community = val;
          commBtnText.textContent = val;

          // Update active state in UI
          commDropdown.querySelectorAll('.sort-option').forEach(o => o.classList.toggle('active', o === opt));

          commDropdown.hidden = true;
          commBtn.setAttribute('aria-expanded', 'false');

          updateSort();
          runSearch();
        });
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!commBtn.contains(e.target) && !commDropdown.contains(e.target)) {
          commDropdown.hidden = true;
          commBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Year switcher
    const yearBtn = document.getElementById('year-btn');
    const yearDropdown = document.getElementById('year-dropdown');

    if (yearBtn && yearDropdown) {
      yearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const willBeOpen = yearDropdown.hidden;
        yearDropdown.hidden = !willBeOpen;
        yearBtn.setAttribute('aria-expanded', String(willBeOpen));
      });

      yearDropdown.querySelectorAll('.sort-option').forEach(opt => {
        const currentYear = document.getElementById('year-btn-text')?.textContent || '2025';
        opt.classList.toggle('active', opt.dataset.value === currentYear);

        opt.addEventListener('click', async (e) => {
          e.stopPropagation();
          const year = opt.dataset.value;
          // e.g. "2025" -> "5202"
          const reversed = year.split('').reverse().join('');
          const newCutoffPath = `/assets/db/tnea/cutoff/${reversed}.gzip`;

          yearBtnText.textContent = year;
          yearDropdown.querySelectorAll('.sort-option').forEach(o => o.classList.toggle('active', o === opt));
          yearDropdown.hidden = true;
          yearBtn.setAttribute('aria-expanded', 'false');

          // Reload cutoff data for the selected year
          const list = document.getElementById('collegeList');
          if (list) list.innerHTML = '<div class="empty-state" style="padding:40px;"><p>Loading ' + year + ' data…</p></div>';
          try {
            const newData = await requestJSON([newCutoffPath]);
            const rawCutoff = newData[newCutoffPath];
            const processedRanges = {};
            const gMax = {};
            const cCodes = {};
            const bRecords = {};
            rawCutoff.forEach(r => {
              const code = String(r.coc);
              if (!processedRanges[code]) processedRanges[code] = {};
              if (gMax[code] === undefined) gMax[code] = 0;
              if (!cCodes[code]) cCodes[code] = new Set();
              if (!bRecords[code]) bRecords[code] = [];
              bRecords[code].push(r);
              if (r.brc) cCodes[code].add(r.brc);
              ['OC', 'BC', 'BCM', 'MBC', 'SC', 'SCA', 'ST'].forEach(comm => {
                if (!processedRanges[code][comm]) processedRanges[code][comm] = [0, 200, 0, 999999, 0, 0];
                const val = parseFloat(r[comm]);
                const rankVal = parseInt(r[comm.toLowerCase() + 'r'], 10);
                
                if (!isNaN(val) && val > 0) {
                  processedRanges[code][comm][0] = Math.max(processedRanges[code][comm][0], val);
                  processedRanges[code][comm][1] = Math.min(processedRanges[code][comm][1], val);
                  gMax[code] = Math.max(gMax[code], val);
                }
                
                if (!isNaN(rankVal) && rankVal > 0) {
                  processedRanges[code][comm][2] = Math.max(processedRanges[code][comm][2], rankVal);
                  processedRanges[code][comm][3] = Math.min(processedRanges[code][comm][3], rankVal);
                }
              });
            });
            Object.values(processedRanges).forEach(commObj => {
              Object.values(commObj).forEach(arr => { 
                if (arr[1] === 200) arr[1] = 0; 
                if (arr[3] === 999999) arr[3] = 0;
              });
            });
            ranges = processedRanges;
            globalMaxMap = gMax;
            Object.keys(cCodes).forEach(k => { courseCodesMap[k] = [...cCodes[k]].sort(); });
            branchRecordsMap = bRecords;
            updateSort();
            runSearch();
          } catch (err) {
            if (list) list.innerHTML = '<div class="empty-state">Failed to load ' + year + ' data.</div>';
          }
        });
      });

      document.addEventListener('click', (e) => {
        if (!yearBtn.contains(e.target) && !yearDropdown.contains(e.target)) {
          yearDropdown.hidden = true;
          yearBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    render(allCodes);
    await initPromise;
    runSearch(); // Apply initial URL filters
  } catch (e) {
    console.error(e);
    const list = document.getElementById('collegeList');
    if (list) list.innerHTML = `<div class="empty-state">Failed to load registry: ${e.message}</div>`;
  }
}

function updateSort() {
  allCodes = Object.keys(cocs).sort((a, b) => {
    const rA = ranges[a]?.[S.community] || [0, 0];
    const rB = ranges[b]?.[S.community] || [0, 0];

    const hasA = rA[0] > 0;
    const hasB = rB[0] > 0;

    // 1. Cutoff colleges first
    if (hasA !== hasB) return hasB ? 1 : -1;

    if (hasA) {
      if (S.filterType === 'rank') {
        const minRankA = rA[3] || 0;
        const minRankB = rB[3] || 0;
        if (minRankA !== minRankB) return minRankA - minRankB; // Ascending for rank (best rank first)
        return rA[2] - rB[2];
      } else {
        // 2. Sort Cutoff colleges: Max desc, then Min desc
        if (rB[0] !== rA[0]) return rB[0] - rA[0];
        return rB[1] - rA[1];
      }
    } else {
      // 3. Sort Non-cutoff colleges: Global Max desc, then Name asc
      const gA = globalMaxMap[a] || 0;
      const gB = globalMaxMap[b] || 0;
      if (gB !== gA) return gB - gA;

      const { name: nA } = parse(cocs[a]);
      const { name: nB } = parse(cocs[b]);
      return nA.localeCompare(nB);
    }
  });
}

function parse(str) {
  if (!str) return { name: '', district: '' };
  const parts = str.split('\n');
  const namePart = parts[0] ? parts[0].trim() : '';
  let d = '';
  if (parts.length > 1) {
    d = parts[1].split('-')[0].trim();
  }
  const fullName = d ? `${namePart} ${d}` : namePart;
  return { name: fullName, district: normalizeDistrict(d) };
}

function updateURL() {
  const params = new URLSearchParams();

  // Year
  const yearBtnText = document.getElementById('year-btn-text');
  if (yearBtnText && yearBtnText.textContent !== '2025') {
    params.set('year', yearBtnText.textContent);
  }

  // Type
  if (S.filterType !== 'cutoff') params.set('type', S.filterType);

  // Community
  if (S.community !== 'OC') params.set('comm', S.community);

  // Search queries
  const tq = textInput?.value?.trim();
  if (tq) params.set('q', tq);

  const cq = cutoffInput?.value;
  if (cq && !isNaN(parseFloat(cq)) && parseFloat(cq) > 0) {
    if (S.filterType === 'rank') {
      params.set('rank', cq);
    } else {
      params.set('cutoff', cq);
    }
  }

  // Filter Sets
  if (S.districts.size > 0) {
    params.set('dist', Array.from(S.districts).join(','));
    if (S.districtMode !== 'include') params.set('dm', S.districtMode);
  }
  if (S.courses.size > 0) {
    params.set('crs', Array.from(S.courses).join(','));
    if (S.courseMode !== 'include') params.set('cm', S.courseMode);
  }
  if (S.types.size > 0) {
    params.set('typ', Array.from(S.types).join(','));
    if (S.typeMode !== 'include') params.set('tm', S.typeMode);
  }

  const queryString = params.toString();
  const newURL = window.location.pathname + (queryString ? '?' + queryString : '');
  window.history.replaceState(null, '', newURL);
}

function loadStateFromURL() {
  const params = new URLSearchParams(window.location.search);

  const localComm = localStorage.getItem('rankra_comm');
  const localCutoff = localStorage.getItem('rankra_cutoff');
  const localRank = localStorage.getItem('rankra_rank');
  const localType = localStorage.getItem('rankra_filter_type_clg') || 'cutoff';

  if (params.has('comm')) {
    S.community = params.get('comm').toUpperCase();
  } else if (localComm) {
    S.community = localComm.toUpperCase();
  }

  if (params.has('type')) {
    S.filterType = params.get('type');
  }

  if (params.has('q') && textInput) textInput.value = params.get('q');
  
  if (S.filterType === 'rank' && params.has('rank') && cutoffInput) {
    cutoffInput.value = params.get('rank');
  } else if (S.filterType === 'cutoff' && params.has('cutoff') && cutoffInput) {
    cutoffInput.value = params.get('cutoff');
  } else if (!params.has('cutoff') && !params.has('rank')) {
    if (localType === 'rank' && localRank) {
      if (cutoffInput) cutoffInput.value = localRank;
    } else if (localType === 'cutoff' && localCutoff) {
      if (cutoffInput) cutoffInput.value = localCutoff;
    }
  }

  if (params.has('dist')) {
    S.districts = new Set(params.get('dist').split(','));
    S.districtMode = params.get('dm') || 'include';
  }
  if (params.has('crs')) {
    S.courses = new Set(params.get('crs').split(','));
    S.courseMode = params.get('cm') || 'include';
  }
  if (params.has('typ')) {
    S.types = new Set(params.get('typ').split(','));
    S.typeMode = params.get('tm') || 'include';
  }
}

function syncFilterUI() {
  const pList = [
    { id: 'district', set: S.districts, singular: 'District' },
    { id: 'course', set: S.courses, singular: 'Course' },
    { id: 'type', set: S.types, label: 'College Type' }
  ];

  pList.forEach(p => {
    const label = document.getElementById(`${p.id}-label`);
    const btn = document.getElementById(`${p.id}-btn`);
    const hasSelection = p.set.size > 0;
    if (label) {
      if (p.id === 'type') {
        label.textContent = hasSelection ? `College Type (${p.set.size})` : 'College Type';
      } else {
        label.textContent = hasSelection ? `${p.singular}s (${p.set.size})` : `${p.singular} (all)`;
      }
    }
    if (btn) btn.classList.toggle('active', hasSelection);
  });

  const commBtnText = document.getElementById('comm-btn-text');
  if (commBtnText) commBtnText.textContent = S.community;
}

function getEditDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
}

function highlight(text, query) {
  if (!query || query.length < 2) return text;
  const regex = new RegExp(`(${query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<span class="highlight">$1</span>');
}

window.toggleCourses = (e, code) => {
  e.preventDefault();
  e.stopPropagation();

  const targetEl = document.getElementById(`courses-${code}`);
  if (!targetEl) return;

  const isOpening = !targetEl.classList.contains('active');

  if (isOpening) {
    // Close all other active cards
    document.querySelectorAll('.clg-expanded-courses.active').forEach(openEl => {
      const openCode = openEl.id.replace('courses-', '');
      if (openCode !== code) {
        openEl.classList.remove('active');
        const icon = document.getElementById(`icon-${openCode}`);
        if (icon) icon.classList.remove('active');
        const card = document.querySelector(`.clg-card[data-code="${openCode}"]`);
        const label = card?.querySelector('.clg-stats');
        if (label) label.textContent = 'Show Branches & Cutoffs';
      }
    });
  }

  // Toggle the current card
  const card = document.querySelector(`.clg-card[data-code="${code}"]`);
  const icon = document.getElementById(`icon-${code}`);
  const label = card?.querySelector('.clg-stats');

  const isActive = targetEl.classList.toggle('active');
  if (icon) icon.classList.toggle('active', isActive);
  if (label) {
    label.textContent = isActive ? 'Hide Branches & Cutoffs' : 'Show Branches & Cutoffs';
  }

  // Auto-scroll if opened
  if (isActive && card) {
    requestAnimationFrame(() => {
      const filterBar = document.querySelector('.college-filter-bar');
      const header = document.querySelector('.site-header');
      const headerH = header ? header.offsetHeight : 50;
      const filterH = filterBar ? filterBar.offsetHeight : 0;
      card.style.scrollMarginTop = (headerH + filterH + 10) + 'px';
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
};

function render(codes) {
  const list = document.getElementById('collegeList');
  const tq = textInput?.value || '';
  const cq = parseFloat(cutoffInput?.value);

  if (!codes.length) {
    list.innerHTML = `
      <div class="empty-state">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          <line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
        <p class="empty-title">No colleges found</p>
        <p class="empty-sub">Try a different name, code or community</p>
      </div>`;
    return;
  }

  list.innerHTML = codes.map(code => {
    const { name, district } = parse(cocs[code]);
    const displayBranchRecords = branchRecordsMap[code] || [];
    const currentComm = S.community;
    let min25 = 0, max25 = 0;

    displayBranchRecords.forEach(r => {
      if (S.filterType === 'rank') {
        const val = parseInt(r[currentComm.toLowerCase() + 'r'], 10);
        if (val > 0) {
          if (max25 === 0 || val > max25) max25 = val; // Worst rank
          if (min25 === 0 || val < min25) min25 = val; // Best rank
        }
      } else {
        const val = parseFloat(r[currentComm]);
        if (val > 0) {
          if (max25 === 0 || val > max25) max25 = val;
          if (min25 === 0 || val < min25) min25 = val;
        }
      }
    });

    const type = codeToType[code] || "";
    const typeClass = (ut) => {
      if (ut.startsWith("GOVT ANNA")) return "type-au";
      if (ut.startsWith("GOVT AIDED")) return "type-aided";
      if (ut.startsWith("GOVT")) return "type-govt";
      if (ut.startsWith("CENTRAL")) return "type-central";
      if (ut.startsWith("PRIVATE AUTONOMOUS")) return "type-pvt-auto";
      if (ut.startsWith("PRIVATE")) return "type-pvt";
      return "type-other";
    };

    const typeBadge = type ? `<span class="clg-type-badge ${typeClass(type.toUpperCase())}">${type}</span>` : "";

    const pBadge = (!isNaN(cq) && cq > 0 && max25 > 0 && 
      (S.filterType === 'rank' ? cq > max25 + 500 : cq < min25 - 2))
      ? `<span class="possibility-badge" data-sentiment="negative">Low Possibility</span>`
      : '';

    const rangeHtml = max25 > 0 ? `
      <div class="clg-range-wrap">
        <div class="clg-cutoff-box">
          <span class="clg-cutoff-label">MIN</span>
          <span class="clg-range-low">${S.filterType === 'rank' ? min25 : min25.toFixed(1)}</span>
        </div>
        <span class="clg-range-sep">—</span>
        <div class="clg-cutoff-box">
          <span class="clg-cutoff-label">MAX</span>
          <span class="clg-range-high">${S.filterType === 'rank' ? max25 : max25.toFixed(1)}</span>
        </div>
      </div>
    ` : `<span class="clg-vacant">No Data / Fully Vacant</span>`;

    const courses = displayBranchRecords.map(r => {
      const isRank = S.filterType === 'rank';
      return {
        name: r.brn || r.brc,
        cutoff: isRank ? (parseInt(r[currentComm.toLowerCase() + 'r'], 10) || 0) : (parseFloat(r[currentComm]) || 0),
        isFiltered: S.courses.size > 0 && S.courses.has(r.brc)
      };
    }).sort((a, b) => {
      // Priority 1: Filtered matches first
      if (a.isFiltered !== b.isFiltered) return a.isFiltered ? -1 : 1;

      // Priority 2: Eligible first
      const vA = a.cutoff;
      const vB = b.cutoff;
      const target = isNaN(cq) ? 0 : cq;

      const getGroup = (v) => {
        if (S.filterType === 'rank') {
          if (v > 0 && v >= target) return 1;
          if (v === 0) return 2;
          return 3;
        } else {
          if (v > 0 && v <= target) return 1;
          if (v === 0) return 2;
          return 3;
        }
      };

      const gA = getGroup(vA);
      const gB = getGroup(vB);

      if (gA !== gB) return gA - gB;
      return vA - vB;
    });

    const courseItems = courses.map(c => {
      let colorStyle = '';
      if (cq > 0 && c.cutoff > 0) {
        if (S.filterType === 'rank') {
          if (c.cutoff >= cq) colorStyle = 'color: var(--green); font-weight: 800;';
          else colorStyle = 'color: var(--red); font-weight: 800;';
        } else {
          if (c.cutoff <= cq) colorStyle = 'color: var(--green); font-weight: 800;';
          else colorStyle = 'color: var(--red); font-weight: 800;';
        }
      }

      const displayCutoff = S.filterType === 'rank' ? c.cutoff : (c.cutoff > 0 ? c.cutoff.toFixed(1) : '-');
      return `
        <div class="course-cutoff-item">
          <span class="ecc-name">${c.name.toUpperCase()}</span>
          <span class="ecc-cutoff" style="${colorStyle}">${displayCutoff}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="clg-card result-card" data-code="${code}" onclick="toggleCourses(event, '${code}')" style="cursor:pointer;">
        <div class="clg-card-inner">
          <div class="clg-top-row">
            <div class="clg-identifiers">
              <span class="clg-code">${highlight(code, tq)}</span>
              <span class="clg-district">${highlight(district, tq)}</span>
            </div>
            <a href="view?code=${code}" class="know-clg-link" onclick="event.stopPropagation()">View College <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.55rem;"></i></a>
          </div>

          <div class="clg-name">${highlight(name, tq)}</div>

          <div class="clg-tags-row">
            ${typeBadge}
            ${pBadge}
          </div>

          <div class="clg-cutoff-row">
            ${rangeHtml}
            <button class="clg-expand-btn" onclick="event.stopPropagation(); toggleCourses(event, '${code}')">
              <span>Branches &amp; Cutoffs</span>
              <i class="fa-solid fa-angle-down clg-expand-icon" id="icon-${code}"></i>
            </button>
          </div>
        </div>
        
        <div class="clg-expanded-courses" id="courses-${code}">
          <div class="clg-branch-header">Branches &amp; Cutoffs <span>(${S.community})</span></div>
          ${courseItems || '<div class="clg-no-data">No cutoff data for this community.</div>'}
        </div>
      </div>`;
  }).join('');
}


const runSearch = () => {
  let cq = parseFloat(cutoffInput.value);
  if (S.filterType === 'cutoff' && cq > 200) {
    cq = 200;
    cutoffInput.value = 200;
  }
  const tq = textInput.value.toLowerCase().trim();

  let filtered = allCodes.filter(code => {
    const raw = cocs[code] || '';
    // Include if it has any data or is in search index
    if (tq) {
      const q = tq.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (q) {
        const { name, district } = parse(raw);
        const kws = searchIndex[code] || [];

        const normCode = code.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normDist = district.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normKws = kws.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));

        return normCode.includes(q) ||
          normName.includes(q) ||
          normDist.includes(q) ||
          normKws.some(k => k.includes(q));
      }
      return false;
    }
    return true;
  });

  if (!isNaN(cq) && cq > 0) {
    filtered = filtered.filter(code => {
      const r = (ranges[code] && ranges[code][S.community]) || [0, 0, 0, 0, 0, 0];
      if (S.filterType === 'rank') {
        const maxRank = r[2] || 0; // Worst rank accepted
        return cq <= maxRank;
      } else {
        const min = r[1] || 0;
        return cq >= min; // Absolute filter
      }
    });
  }

  if (S.districts.size > 0) {
    filtered = filtered.filter(code => {
      const { district } = parse(cocs[code]);
      const has = S.districts.has(district);
      return S.districtMode === 'include' ? has : !has;
    });
  }

  if (S.courses.size > 0) {
    filtered = filtered.filter(code => {
      const branchRecords = branchRecordsMap[code] || [];
      const matches = branchRecords.filter(r => S.courses.has(r.brc));

      if (S.courseMode === 'include') {
        if (matches.length === 0) return false;
        // If cutoff is entered, check if eligible for ANY of the selected matches
        if (!isNaN(cq) && cq > 0) {
          return matches.some(r => {
            if (S.filterType === 'rank') {
              const val = parseInt(r[S.community.toLowerCase() + 'r'], 10);
              return val > 0 && cq <= val;
            } else {
              const val = parseFloat(r[S.community]);
              return val > 0 && cq >= val;
            }
          });
        }
        return true;
      } else {
        // Exclude mode: return true if NONE of the branches the college has are in the exclude list
        const hasExcluded = branchRecords.some(r => S.courses.has(r.brc));
        return !hasExcluded;
      }
    });
  }

  if (S.types.size > 0) {
    filtered = filtered.filter(code => {
      const type = codeToType[code];
      if (!type) return S.typeMode === 'exclude';
      const has = S.types.has(type);
      return S.typeMode === 'include' ? has : !has;
    });
  }

  // 3. Text filter
  if (tq) {
    const rq = tq.toLowerCase().replace(/[^a-z0-9]/g, '');
    const scored = filtered.map(code => {
      const full = cocs[code];
      const { name, district } = parse(full);
      const kws = searchIndex[code] || []; // FIXED: Use code, not full string
      const normName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normDist = district.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (code.includes(rq) || normName.includes(rq) || normDist.includes(rq) || kws.some(k => k.toLowerCase().includes(rq))) {
        return { code, score: 0 };
      }

      if (rq.length > 3) {
        const words = normName.split(/\s+/).concat(normDist.split(/\s+/));
        let bestDist = 3;
        for (const w of words) {
          if (w.length < 3) continue;
          const dist = getEditDistance(rq, w.substring(0, rq.length + 1));
          if (dist < bestDist) bestDist = dist;
        }
        if (bestDist <= 2) return { code, score: bestDist + 1 };
      }
      return null;
    }).filter(r => r !== null);

    scored.sort((a, b) => a.score - b.score);
    filtered = scored.map(r => r.code);
  }

  updateURL();
  render(filtered);
};
