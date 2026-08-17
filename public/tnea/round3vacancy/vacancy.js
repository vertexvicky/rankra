import { $, $$, esc } from '../../shared/js/utils.js';
import { applyTheme, initTheme } from '../../shared/js/theme.js';
import { FilterSheet } from '../../shared/js/FilterSheet.js';
import { SiteHeader } from '../../shared/js/SiteHeader.js';
import { requestJSON, initBackgroundCache } from '../../shared/js/caching.js';

const S = {
  colleges: {},
  branches: [],
  districts: [],
  cocs: {},
  brnc: {},
  community: 'OC',
  selectedCourses: new Set(),
  courseMode: 'include',
  selectedDistricts: new Set(),
  districtMode: 'include',
  searchQuery: ''
};

let shCourse, shDistrict, siteHeader;

function syncURL() {
  const params = new URLSearchParams();
  if (S.community && S.community !== 'OC') params.set('c', S.community);
  if (S.selectedDistricts.size > 0) {
    params.set('d', [...S.selectedDistricts].join(','));
    if (S.districtMode === 'exclude') params.set('dm', 'ex');
  }
  if (S.selectedCourses.size > 0) {
    params.set('crs', [...S.selectedCourses].join(','));
    if (S.courseMode === 'exclude') params.set('rm', 'ex');
  }
  if (S.searchQuery) params.set('q', S.searchQuery);

  const qs = params.toString();
  const url = window.location.pathname + (qs ? '?' + qs : '');
  window.history.replaceState(null, '', url);
}

function initFromURL() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('c')) {
    const c = params.get('c').toUpperCase();
    const validComms = ['OC', 'BC', 'BCM', 'MBC', 'SC', 'SCA', 'ST'];
    if (validComms.includes(c)) {
      S.community = c;
      const textSpan = $('comm-btn-text');
      if (textSpan) textSpan.textContent = c;
      $$('.comm-option').forEach(o => o.classList.toggle('active', o.dataset.value === c));
    }
  }
  if (params.has('d')) {
    params.get('d').split(',').map(s => s.trim()).filter(Boolean).forEach(d => S.selectedDistricts.add(d));
    if (params.get('dm') === 'ex') S.districtMode = 'exclude';
    updateDistrictBtnLabel();
  }
  if (params.has('crs')) {
    const raw = params.get('crs');
    const list = raw.includes('||') ? raw.split('||') : raw.split(',');
    list.map(s => s.trim()).filter(Boolean).forEach(c => S.selectedCourses.add(c));
    if (params.get('rm') === 'ex') S.courseMode = 'exclude';
    updateCourseBtnLabel();
  }
  if (params.has('q')) {
    const q = params.get('q').trim();
    S.searchQuery = q.toLowerCase();
    const input = $('college-search-input');
    if (input) input.value = q;
    const clearBtn = $('college-search-clear');
    if (clearBtn && S.searchQuery) clearBtn.classList.remove('hidden');
  }
}

async function init() {
  initTheme();
  
  siteHeader = new SiteHeader({
    title: 'Rankra - Round 3 Vacancy',
    logoPath: '../../assets/rankra_logo50.png',
    hideTopBar: true
  });

  setupCommunityDropdown();
  setupCollegeSearch();
  initFromURL();

  try {
    const paths = [
      '/assets/db/tnea/cutoff/round3_vacancy.json',
      '/assets/db/tnea/college/cocs.json',
      '/assets/db/tnea/college/brnc.json'
    ];
    const dataMap = await requestJSON(paths);
    const data = dataMap[paths[0]];
    S.cocs = dataMap[paths[1]] || {};
    S.brnc = dataMap[paths[2]] || {};
    
    if (data) {
      S.colleges = data.colleges || {};
      S.branches = data.branches || [];
      S.districts = data.districts || [];
      
      initFilterSheets();
      render();
      initBackgroundCache();
    }
    
    if ($('loading-state')) {
      $('loading-state').style.display = 'none';
    }
  } catch (err) {
    console.error(err);
    if ($('loading-state')) {
      $('loading-state').innerHTML = `<p style="color:var(--red);">Failed to load vacancy data. Please refresh.</p>`;
    }
  }
}

function initFilterSheets() {
  const courseItems = S.branches.map(b => ({
    value: b.code,
    label: `${b.code} - ${b.name}`
  }));

  shCourse = new FilterSheet('course-sheet-container', {
    title: 'Select Courses',
    placeholder: 'Search courses...',
    showModeToggle: true,
    mode: S.courseMode,
    selected: Array.from(S.selectedCourses),
    items: courseItems,
    onApply: (selected, mode) => {
      S.selectedCourses = new Set(selected);
      S.courseMode = mode;
      updateCourseBtnLabel();
      render();
    },
    onClear: () => {
      S.selectedCourses.clear();
      updateCourseBtnLabel();
      render();
    }
  });

  const districtItems = S.districts.map(d => ({
    value: d,
    label: d
  }));

  shDistrict = new FilterSheet('district-sheet-container', {
    title: 'Select Districts',
    placeholder: 'Search districts...',
    showModeToggle: true,
    mode: S.districtMode,
    selected: Array.from(S.selectedDistricts),
    items: districtItems,
    onApply: (selected, mode) => {
      S.selectedDistricts = new Set(selected);
      S.districtMode = mode;
      updateDistrictBtnLabel();
      render();
    },
    onClear: () => {
      S.selectedDistricts.clear();
      updateDistrictBtnLabel();
      render();
    }
  });

  const courseBtn = $('course-btn');
  if (courseBtn) {
    courseBtn.addEventListener('click', () => shCourse.open());
  }

  const districtBtn = $('district-btn');
  if (districtBtn) {
    districtBtn.addEventListener('click', () => shDistrict.open());
  }
}

function updateCourseBtnLabel() {
  const label = $('course-label');
  if (!label) return;
  const count = S.selectedCourses.size;
  if (count === 0) {
    label.textContent = 'Course (all)';
  } else {
    const prefix = S.courseMode === 'exclude' ? 'Ex: ' : '';
    label.textContent = `${prefix}Course (${count})`;
  }
}

function updateDistrictBtnLabel() {
  const label = $('district-label');
  if (!label) return;
  const count = S.selectedDistricts.size;
  if (count === 0) {
    label.textContent = 'District (all)';
  } else {
    const prefix = S.districtMode === 'exclude' ? 'Ex: ' : '';
    label.textContent = `${prefix}District (${count})`;
  }
}

function setupCommunityDropdown() {
  const commBtn = $('comm-btn');
  const commDropdown = $('comm-dropdown');
  const commOptions = $$('.comm-option');

  if (commBtn && commDropdown) {
    commBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = commDropdown.hasAttribute('hidden');
      if (isHidden) {
        commDropdown.removeAttribute('hidden');
        commBtn.setAttribute('aria-expanded', 'true');
      } else {
        commDropdown.setAttribute('hidden', '');
        commBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('click', (e) => {
      if (!commDropdown.contains(e.target) && !commBtn.contains(e.target)) {
        commDropdown.setAttribute('hidden', '');
        commBtn.setAttribute('aria-expanded', 'false');
      }
    });

    commOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        commOptions.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        const val = opt.dataset.value;
        S.community = val;
        const textSpan = $('comm-btn-text');
        if (textSpan) textSpan.textContent = val;
        commDropdown.setAttribute('hidden', '');
        commBtn.setAttribute('aria-expanded', 'false');
        render();
      });
    });
  }
}

function setupCollegeSearch() {
  const input = $('college-search-input');
  const clearBtn = $('college-search-clear');
  const resetBtn = $('empty-reset');

  if (input) {
    input.addEventListener('input', (e) => {
      S.searchQuery = e.target.value.trim().toLowerCase();
      if (clearBtn) {
        clearBtn.classList.toggle('hidden', S.searchQuery.length === 0);
      }
      render();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (input) {
        input.value = '';
        S.searchQuery = '';
        clearBtn.classList.add('hidden');
        render();
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      S.community = 'OC';
      $$('.comm-option').forEach(o => o.classList.toggle('active', o.dataset.value === 'OC'));
      if ($('comm-btn-text')) $('comm-btn-text').textContent = 'OC';

      S.selectedCourses.clear();
      updateCourseBtnLabel();

      S.selectedDistricts.clear();
      updateDistrictBtnLabel();

      if (input) {
        input.value = '';
        S.searchQuery = '';
      }
      if (clearBtn) clearBtn.classList.add('hidden');

      render();
    });
  }
}

function getSortRank(college) {
  if (S.community !== 'ALL' && college.comm_ranks && college.comm_ranks[S.community] != null) {
    return college.comm_ranks[S.community];
  }
  return college.rank != null ? college.rank : 999999;
}

function getCollegeAndBranchName(coc, brc) {
  let collegeName = 'Unknown College';
  let branchName = 'Unknown Branch';

  const paddedCode = String(coc).padStart(4, '0');
  const rawCode = String(parseInt(coc, 10) || coc);

  if (S.cocs && S.cocs[rawCode]) {
    collegeName = S.cocs[rawCode].split('\n')[0];
  } else if (S.colleges && (S.colleges[rawCode] || S.colleges[paddedCode])) {
    const c = S.colleges[rawCode] || S.colleges[paddedCode];
    collegeName = c.con || collegeName;
  }

  if (S.brnc && S.brnc[brc]) {
    branchName = S.brnc[brc];
  } else if (S.branches) {
    const b = S.branches.find(item => item.code === brc);
    if (b) branchName = b.name;
  }

  return { collegeName, branchName };
}

function getNameFromInAppModal() {
  return new Promise(resolve => {
    const savedName = localStorage.getItem('rankra_user_name');
    const skipped = localStorage.getItem('rankra_user_name_skipped') === 'true';
    if (savedName || skipped) {
      resolve(savedName || null);
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'overlay-full name-prompt-overlay';

    modal.innerHTML = `
      <div class="overlay-backdrop"></div>
      <div class="gate-sheet name-prompt-sheet" style="max-width: 320px; text-align: center; border-radius: var(--radius-lg); background: var(--bg-card); padding: 28px 24px;">
        <div style="font-size: 2.2rem; margin-bottom: 12px; color: rgb(93, 36, 132);">
          <i class="fa-solid fa-signature"></i>
        </div>
        <h3 class="gate-title" style="margin-bottom: 8px; font-size: 1.15rem; color: var(--text-primary);">Personalize PDF</h3>
        <p class="gate-subtitle" style="font-size: 0.81rem; color: var(--text-secondary); margin-bottom: 20px; line-height: 1.45;">
          Enter your name to customize your TNEA Choice List PDF.
        </p>
        <div style="margin-bottom: 24px;">
          <input type="text" id="pdf-user-name-input" placeholder="Your Name" 
                 style="font-size: 1rem; font-weight: 600; padding: 10px 12px; border-radius: 8px; width: 100%; border: 1.5px solid var(--border); background: var(--bg-primary); color: var(--text-primary); outline: none; box-sizing: border-box; text-align: center; transition: border-color 0.2s;">
        </div>
        <div style="display: flex; gap: 8px; justify-content: stretch;">
          <button id="name-prompt-skip" style="flex: 1; background: transparent; border: 1.5px solid var(--border); color: var(--text-secondary); padding: 10px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Skip</button>
          <button id="name-prompt-submit" style="flex: 2; background: rgb(93, 36, 132); color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Continue →</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const input = modal.querySelector('#pdf-user-name-input');
    const submitBtn = modal.querySelector('#name-prompt-submit');
    const skipBtn = modal.querySelector('#name-prompt-skip');

    setTimeout(() => {
      if (input) input.focus();
    }, 100);

    const cleanUp = () => {
      modal.classList.add('hidden');
      setTimeout(() => modal.remove(), 250);
    };

    submitBtn.addEventListener('mouseenter', () => {
      submitBtn.style.background = 'rgb(75, 29, 107)';
    });
    submitBtn.addEventListener('mouseleave', () => {
      submitBtn.style.background = 'rgb(93, 36, 132)';
    });

    skipBtn.addEventListener('mouseenter', () => {
      skipBtn.style.background = 'var(--bg-primary)';
      skipBtn.style.borderColor = 'rgb(93, 36, 132)';
      skipBtn.style.color = 'rgb(93, 36, 132)';
    });
    skipBtn.addEventListener('mouseleave', () => {
      skipBtn.style.background = 'transparent';
      skipBtn.style.borderColor = 'var(--border)';
      skipBtn.style.color = 'var(--text-secondary)';
    });

    submitBtn.addEventListener('click', () => {
      const value = input.value.trim();
      if (value !== '') {
        localStorage.setItem('rankra_user_name', value);
        localStorage.removeItem('rankra_user_name_skipped');
        resolve(value);
      } else {
        localStorage.setItem('rankra_user_name_skipped', 'true');
        localStorage.removeItem('rankra_user_name');
        resolve(null);
      }
      cleanUp();
    });

    skipBtn.addEventListener('click', () => {
      localStorage.setItem('rankra_user_name_skipped', 'true');
      localStorage.removeItem('rankra_user_name');
      resolve(null);
      cleanUp();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        submitBtn.click();
      } else if (e.key === 'Escape') {
        skipBtn.click();
      }
    });
  });
}

function updateCardPriorities() {
  const badges = document.querySelectorAll('.card-priority-badge');
  if (badges.length === 0) return;
  let activeList = null;
  try {
    const storedLists = localStorage.getItem('rankra_choice_lists');
    const activeId = localStorage.getItem('rankra_active_choice_list_id');
    const lists = storedLists ? JSON.parse(storedLists) : [];
    activeList = lists.find(l => String(l.id) === String(activeId));
  } catch (e) {}

  badges.forEach(badge => {
    const coc = badge.dataset.coc;
    const brc = badge.dataset.brc;
    let text = '';
    let isAdded = false;
    if (activeList && activeList.choices) {
      const choiceIdx = activeList.choices.findIndex(choice => String(choice[0]) === String(coc) && String(choice[1]) === String(brc));
      if (choiceIdx !== -1) {
        text = ` <span style="opacity: 0.4;">•</span> <span style="font-size: 0.72rem; color: var(--text-secondary);">Priority: <span style="color: var(--accent); font-weight: 800;">${choiceIdx + 1}</span></span>`;
        isAdded = true;
      }
    }
    badge.innerHTML = text;
    const row = badge.closest('tr');
    if (row) {
      const btn = row.querySelector('.card-add-choice-btn');
      if (btn) {
        const isInserting = (typeof window.insertChoiceIndex === 'number');
        if (isAdded && !isInserting) {
          btn.textContent = 'Remove Choice';
          btn.classList.add('added');
          btn.classList.remove('insert-mode');
        } else {
          btn.textContent = isInserting ? 'Insert Choice' : '+ Add Choice';
          btn.classList.remove('added');
          btn.classList.toggle('insert-mode', isInserting);
          btn.style.background = '';
          btn.style.borderColor = '';
          btn.style.color = '';
        }
      }
    }
  });
}

function render() {
  const resultsBody = $('results-body');
  const emptyState = $('empty-state');
  if (!resultsBody) return;

  const collegesList = Object.values(S.colleges);
  const commKey = S.community.toLowerCase();
  const isOC = S.community === 'OC';

  const filteredColleges = [];
  let totalVisibleSeats = 0;

  for (const col of collegesList) {
    // 1. District Filter
    if (S.selectedDistricts.size > 0) {
      const match = S.selectedDistricts.has(col.district);
      if (S.districtMode === 'include' && !match) continue;
      if (S.districtMode === 'exclude' && match) continue;
    }

    // 2. College Search Filter
    if (S.searchQuery) {
      const matchCode = col.coc.toLowerCase().includes(S.searchQuery);
      const matchName = col.con.toLowerCase().includes(S.searchQuery);
      if (!matchCode && !matchName) continue;
    }

    // 3. Filter Branches
    const validBranches = [];
    let colTotalSeats = 0;

    for (const b of col.branches) {
      // Course Sheet Filter
      if (S.selectedCourses.size > 0) {
        const match = S.selectedCourses.has(b.brc);
        if (S.courseMode === 'include' && !match) continue;
        if (S.courseMode === 'exclude' && match) continue;
      }

      // Check Vacancy Seats
      const ocSeats = b.oc || 0;
      const commSeats = !isOC ? (b[commKey] || 0) : 0;
      const hasVacancy = isOC ? (ocSeats > 0) : (ocSeats > 0 || commSeats > 0);

      if (hasVacancy) {
        validBranches.push(b);
        colTotalSeats += isOC ? ocSeats : (ocSeats + commSeats);
      }
    }

    if (validBranches.length > 0) {
      filteredColleges.push({
        ...col,
        filteredBranches: validBranches,
        totalSeats: colTotalSeats,
        sortRank: getSortRank(col)
      });
      totalVisibleSeats += colTotalSeats;
    }
  }

  // Sort by index 1 rank
  filteredColleges.sort((a, b) => {
    if (a.sortRank !== b.sortRank) {
      return a.sortRank - b.sortRank;
    }
    const numA = parseInt(a.coc, 10) || 9999;
    const numB = parseInt(b.coc, 10) || 9999;
    return numA - numB;
  });

  // Update Counters
  if ($('college-count')) $('college-count').textContent = filteredColleges.length;
  if ($('total-seats-count')) $('total-seats-count').textContent = totalVisibleSeats;

  syncURL();

  if (filteredColleges.length === 0) {
    resultsBody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  let activeList = null;
  try {
    const storedLists = localStorage.getItem('rankra_choice_lists');
    const activeId = localStorage.getItem('rankra_active_choice_list_id');
    const lists = storedLists ? JSON.parse(storedLists) : [];
    activeList = lists.find(l => String(l.id) === String(activeId));
  } catch (e) {}

  const isInserting = (typeof window.insertChoiceIndex === 'number');

  let html = '';
  for (const col of filteredColleges) {
    const rankLabel = col.sortRank < 900000 ? `Rank #${col.sortRank}` : 'Unranked';
    
    let rowsHtml = '';
    for (const b of col.filteredBranches) {
      const ocClass = getCellClass(b.oc, 'OC');
      const commClass = !isOC ? getCellClass(b[commKey] || 0, S.community) : '';

      let priorityText = '';
      let isAdded = false;
      if (activeList && activeList.choices) {
        const choiceIdx = activeList.choices.findIndex(choice => String(choice[0]) === String(col.coc) && String(choice[1]) === String(b.brc));
        if (choiceIdx !== -1) {
          priorityText = ` <span style="opacity: 0.4;">•</span> <span style="font-size: 0.72rem; color: var(--text-secondary);">Priority: <span style="color: var(--accent); font-weight: 800;">${choiceIdx + 1}</span></span>`;
          isAdded = true;
        }
      }
      const initialBtnText = isAdded ? 'Remove Choice' : (isInserting ? 'Insert Choice' : '+ Add Choice');

      rowsHtml += `
        <tr>
          <td class="branch-code-cell center">${esc(b.brc)}</td>
          <td class="branch-name-cell">
            <div style="display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap;">
              <span>${esc(b.brn)}</span>
              <span class="card-priority-badge" data-coc="${esc(col.coc)}" data-brc="${esc(b.brc)}">${priorityText}</span>
            </div>
          </td>
          <td class="seat-cell center ${ocClass}">${b.oc}</td>
          ${!isOC ? `<td class="seat-cell center ${commClass}">${b[commKey] || 0}</td>` : ''}
          <td class="center" style="white-space: nowrap;">
            <button class="card-add-choice-btn${isAdded ? ' added' : ''}${(!isAdded && isInserting) ? ' insert-mode' : ''}" data-coc="${esc(col.coc)}" data-brc="${esc(b.brc)}">${initialBtnText}</button>
          </td>
        </tr>
      `;
    }

    html += `
      <div class="college-card">
        <div class="college-card-header">
          <div class="college-title-group">
            <span class="college-rank-badge"><i class="fa-solid fa-trophy" style="margin-right:4px; font-size: 0.7rem;"></i>${rankLabel}</span>
            <span class="college-code-pill">${esc(col.coc)}</span>
            <span class="college-name-text">${esc(col.con)}</span>
          </div>
          <div class="college-meta-group">
            <span class="college-district-badge"><i class="fa-solid fa-location-dot" style="margin-right:4px;"></i>${esc(col.district)}</span>
            <span class="college-total-badge">${col.totalSeats} Vacant</span>
          </div>
        </div>
        <div class="table-responsive">
          <table class="vacancy-table">
            <thead>
              <tr>
                <th class="center" style="width: 70px;">Branch</th>
                <th>Branch Name</th>
                <th class="center ${isOC ? 'active-comm' : ''}" style="width: 70px;">OC</th>
                ${!isOC ? `<th class="center active-comm" style="width: 70px;">${esc(S.community)}</th>` : ''}
                <th class="center" style="width: 105px;">Choice</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  resultsBody.innerHTML = html;
  updateCardPriorities();
}

function getCellClass(count, commName) {
  let classes = count === 0 ? 'zero' : 'has-seats';
  if (S.community === commName) {
    classes += ' active-comm';
  }
  return classes;
}

function initChoiceListTabs() {
  const container = document.getElementById('choicelist-container');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  if (params.get('expand') === 'choicelist') {
    localStorage.setItem('rankra_choicelist_size', 'maximized');
  }

  const tabScroll = document.getElementById('bs-tab-scroll');
  const scrollLeftBtn = document.getElementById('bs-scroll-left');
  const scrollRightBtn = document.getElementById('bs-scroll-right');
  const addListBtn = document.getElementById('bs-add-list');
  const goListBtn = document.getElementById('bs-go-list');

  const LS_KEY = 'rankra_choice_lists';
  const ACTIVE_ID_KEY = 'rankra_active_choice_list_id';

  container.addEventListener('wheel', (e) => {
    if (!e.target.closest('#bs-tab-scroll') && !e.target.closest('#bs-content-section')) {
      e.preventDefault();
    }
  }, { passive: false });

  container.addEventListener('touchmove', (e) => {
    if (!e.target.closest('#bs-tab-scroll') && !e.target.closest('#bs-content-section')) {
      e.preventDefault();
    }
  }, { passive: false });

  const toggleSizeBtn = document.getElementById('bs-toggle-size');
  if (toggleSizeBtn) {
    const savedSize = localStorage.getItem('rankra_choicelist_size') || 'minimized';
    container.classList.remove('minimized', 'maximized');
    container.classList.add(savedSize);

    toggleSizeBtn.addEventListener('click', () => {
      if (container.classList.contains('maximized')) {
        container.classList.remove('maximized');
        container.classList.add('minimized');
        localStorage.setItem('rankra_choicelist_size', 'minimized');
      } else {
        container.classList.remove('minimized');
        container.classList.add('maximized');
        localStorage.setItem('rankra_choicelist_size', 'maximized');
      }
    });
  }

  const exportPdfBtn = document.getElementById('bs-export-pdf');
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      const lists = getLists();
      const activeId = getActiveId();
      const activeList = lists.find(l => l.id === activeId);

      if (!activeList || !activeList.choices || activeList.choices.length === 0) {
        alert('Your active choice list is empty. Add colleges and courses to it first!');
        return;
      }

      getNameFromInAppModal().then((userName) => {
        const watermarkImg = new Image();
        watermarkImg.src = '../../assets/rankralogoHD.png';

        const generatePdf = () => {
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
          });

          const now = new Date();
          const dd = String(now.getDate()).padStart(2, '0');
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const yyyy = now.getFullYear();
          const dateString = `${dd}-${mm}-${yyyy}`;

          const hh = String(now.getHours()).padStart(2, '0');
          const min = String(now.getMinutes()).padStart(2, '0');
          const ss = String(now.getSeconds()).padStart(2, '0');
          const timeString = `${hh}-${min}-${ss}`;

          let baseName = 'choicelist';
          if (activeList && activeList.name && !activeList.name.startsWith('choicelist')) {
            baseName = activeList.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
          }

          const namePart = userName ? `_${userName.toLowerCase().replace(/[^a-z0-9]/g, '')}` : '';
          const filename = `${baseName}${namePart}_${dateString}_${timeString}.pdf`;

          doc.setProperties({
            title: filename
          });

          const headers = [['Priority', 'College Code', 'College Name', 'Course']];
          const rows = activeList.choices.map((choice, index) => {
            const [collegeCode, branchCode] = choice;
            const { collegeName, branchName } = getCollegeAndBranchName(collegeCode, branchCode);
            const paddedCode = String(collegeCode).padStart(4, '0');
            const courseText = `${branchCode} — ${branchName}`;

            return [
              index + 1,
              paddedCode,
              collegeName,
              courseText
            ];
          });

          const pageSize = doc.internal.pageSize;
          const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();

          const naturalWidth = watermarkImg.naturalWidth || 500;
          const naturalHeight = watermarkImg.naturalHeight || 120;
          const aspect = naturalWidth / (naturalHeight || 1);

          const topLogoHeight = 65;
          const topLogoWidth = topLogoHeight * aspect;
          const topLogoX = (pageWidth - topLogoWidth) / 2;
          const topLogoY = 30;

          doc.addImage(watermarkImg, 'PNG', topLogoX, topLogoY, topLogoWidth, topLogoHeight);

          let currentY = topLogoY + topLogoHeight + 20;

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(30, 41, 59);

          const communityText = `Community: ${S.community || 'OC'}`;
          doc.text(communityText, 40, currentY);

          currentY += 18;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(100, 116, 139);

          const dateStr = new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });

          const part1 = `Choice list created in rankra.in on ${dateStr}`;
          const part2 = userName ? ` by ` : '';
          doc.text(part1 + part2, 40, currentY);

          if (userName) {
            const width1 = doc.getTextWidth(part1 + part2);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(93, 36, 132);
            doc.text(userName, 40 + width1, currentY);
          }

          currentY += 15;

          doc.autoTable({
            head: headers,
            body: rows,
            startY: currentY,
            theme: 'striped',
            headStyles: {
              fillColor: [93, 36, 132],
              textColor: [255, 255, 255],
              fontSize: 10,
              fontStyle: 'bold'
            },
            bodyStyles: {
              fontSize: 9,
              textColor: [51, 65, 85]
            },
            columnStyles: {
              0: { cellWidth: 50, halign: 'center' },
              1: { cellWidth: 70, halign: 'center' },
              2: { cellWidth: 250 },
              3: { cellWidth: 150 }
            },
            margin: { top: 90, bottom: 60, left: 40, right: 40 },
            didDrawPage: function () {
              doc.saveGraphicsState();
              if (typeof doc.setGState === 'function') {
                try {
                  const gState = new doc.GState({ opacity: 0.08 });
                  doc.setGState(gState);
                } catch (e) {
                  console.error('GState error', e);
                }
              }

              let imgWidth = 320;
              let imgHeight = 320 / aspect;
              if (imgHeight > 320) {
                imgHeight = 320;
                imgWidth = 320 * aspect;
              }

              const angle = -30;
              const angleRad = (angle * Math.PI) / 180;

              const cx = pageWidth / 2;
              const cy = pageHeight / 2;

              const cos = Math.cos(angleRad);
              const sin = Math.sin(angleRad);
              
              const x = cx - (imgWidth / 2 * cos - imgHeight / 2 * sin);
              const y = cy - (imgWidth / 2 * sin + imgHeight / 2 * cos);

              doc.addImage(watermarkImg, 'PNG', x, y, imgWidth, imgHeight, undefined, 'FAST', angle);
              doc.restoreGraphicsState();

              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              doc.setTextColor(148, 163, 184);
              doc.text('Rankra - Precision TNEA Data Insights & Choice List Planner (https://rankra.in)', pageWidth / 2, pageHeight - 30, { align: 'center' });
            }
          });

          doc.save(filename);
        };

        if (watermarkImg.complete) {
          generatePdf();
        } else {
          watermarkImg.onload = generatePdf;
          watermarkImg.onerror = () => {
            console.error('Watermark/logo image failed to load. Exporting PDF without graphics.');
            generatePdf();
          };
        }
      });
    });
  }

  function getLists() {
    try {
      const stored = localStorage.getItem(LS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  function saveLists(lists) {
    localStorage.setItem(LS_KEY, JSON.stringify(lists));
  }

  function getActiveId() {
    return localStorage.getItem(ACTIVE_ID_KEY);
  }

  function setActiveId(id) {
    localStorage.setItem(ACTIVE_ID_KEY, id);
  }

  function checkOverflow() {
    if (!tabScroll || !scrollLeftBtn || !scrollRightBtn) return;
    const hasOverflow = tabScroll.scrollWidth > tabScroll.clientWidth;
    if (hasOverflow) {
      scrollLeftBtn.style.display = 'flex';
      scrollRightBtn.style.display = 'flex';
    } else {
      scrollLeftBtn.style.display = 'none';
      scrollRightBtn.style.display = 'none';
    }
  }

  function renderTabs() {
    let lists = getLists();
    if (lists.length === 0) {
      lists = [{ id: String(Date.now()), name: 'choicelist1', choices: [] }];
      saveLists(lists);
    }

    let activeId = getActiveId();
    if (!activeId || !lists.some(l => l.id === activeId)) {
      activeId = lists[0].id;
      setActiveId(activeId);
    }

    tabScroll.innerHTML = '';
    lists.forEach(list => {
      const tab = document.createElement('div');
      tab.className = `bs-tab ${list.id === activeId ? 'active' : ''}`;
      tab.dataset.id = list.id;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'bs-tab-name';
      nameSpan.textContent = list.name;

      const closeBtn = document.createElement('button');
      closeBtn.className = 'bs-tab-close';
      closeBtn.textContent = '✕';
      closeBtn.setAttribute('aria-label', `Delete ${list.name}`);
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete "${list.name}"?`)) {
          let currentLists = getLists();
          currentLists = currentLists.filter(l => l.id !== list.id);
          saveLists(currentLists);
          if (getActiveId() === list.id) {
            localStorage.removeItem(ACTIVE_ID_KEY);
          }
          renderTabs();
        }
      });

      tab.appendChild(nameSpan);
      tab.appendChild(closeBtn);

      tab.addEventListener('click', () => {
        setActiveId(list.id);
        renderTabs();
      });

      tabScroll.appendChild(tab);
    });

    checkOverflow();
    renderChoicesContent();
  }

  if (scrollLeftBtn && scrollRightBtn && tabScroll) {
    scrollLeftBtn.addEventListener('click', () => {
      tabScroll.scrollBy({ left: -120, behavior: 'smooth' });
    });
    scrollRightBtn.addEventListener('click', () => {
      tabScroll.scrollBy({ left: 120, behavior: 'smooth' });
    });
  }

  if (addListBtn) {
    addListBtn.addEventListener('click', () => {
      const lists = getLists();
      let maxNum = 0;
      lists.forEach(l => {
        const match = l.name.match(/^choicelist(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      const newName = `choicelist${maxNum + 1}`;
      const newList = {
        id: String(Date.now()),
        name: newName,
        choices: []
      };
      lists.push(newList);
      saveLists(lists);
      setActiveId(newList.id);
      renderTabs();

      setTimeout(() => {
        tabScroll.scrollTo({ left: tabScroll.scrollWidth, behavior: 'smooth' });
      }, 50);
    });
  }

  if (goListBtn) {
    goListBtn.addEventListener('click', () => {
      window.location.href = '/tnea/choicelist/';
    });
  }

  function renderChoicesContent() {
    const content = document.getElementById('bs-content-section');
    if (!content) return;

    const lists = getLists();
    const activeId = getActiveId();
    const activeList = lists.find(l => l.id === activeId);

    if (!activeList || !activeList.choices || activeList.choices.length === 0) {
      content.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 24px 0;">
          No choices added to this list yet. Click "+ Add Choice" on any vacancy row to start building your list!
        </div>
      `;
      updateCardPriorities();
      return;
    }

    content.innerHTML = '';
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '0.72rem';

    const renderPlaceholder = () => {
      const placeholderRow = document.createElement('tr');
      placeholderRow.innerHTML = `
        <td colspan="4" style="padding: 10px 8px; text-align: center; background: color-mix(in srgb, var(--accent) 8%, transparent); border: 1.5px dashed var(--accent); border-radius: 8px; color: var(--accent); font-weight: 600; font-size: 0.72rem;">
          Inserting next choice here... 
          <button id="cancel-insert-btn" style="margin-left: 10px; background: var(--red); color: white; border: none; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 0.65rem; font-weight: bold;">Cancel</button>
        </td>
      `;
      placeholderRow.querySelector('#cancel-insert-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        window.insertChoiceIndex = null;
        renderChoicesContent();
      });
      table.appendChild(placeholderRow);
    };

    if (window.insertChoiceIndex === 0) {
      renderPlaceholder(0);
    }

    activeList.choices.forEach((choice, index) => {
      const [collegeCode, branchCode] = choice;
      const { collegeName, branchName } = getCollegeAndBranchName(collegeCode, branchCode);

      const row = document.createElement('tr');
      row.className = 'choice-row';
      row.style.position = 'relative';
      row.style.borderBottom = '1px solid var(--border)';

      const showInsertIndicators = (typeof window.insertChoiceIndex !== 'number');
      let indicatorsHtml = '';
      if (showInsertIndicators) {
        if (index === 0) {
          indicatorsHtml += `
            <div class="row-insert-indicator top-indicator" data-insert-index="0">
              <button class="row-insert-btn" title="Insert choice here">+</button>
            </div>
          `;
        }
        indicatorsHtml += `
          <div class="row-insert-indicator bottom-indicator" data-insert-index="${index + 1}">
            <button class="row-insert-btn" title="Insert choice here">+</button>
          </div>
        `;
      }

      row.innerHTML = `
        <td style="padding: 6px 4px; font-weight: bold; color: var(--text-muted); width: 20px;">${index + 1}</td>
        <td style="padding: 6px 4px; color: var(--text-primary); font-weight: 500; line-height: 1.3;" title="${esc(collegeName)}">
          <span style="font-weight: bold; color: var(--accent);">${String(collegeCode).padStart(4, '0')}</span> — ${esc(collegeName)}
        </td>
        <td style="padding: 6px 4px; color: var(--text-secondary); line-height: 1.3;" title="${esc(branchCode)} - ${esc(branchName)}">
          <span style="font-weight: 700; color: var(--accent);">${esc(branchCode)}</span> — <span style="font-size: 0.66rem;">${esc(branchName)}</span>
        </td>
        <td style="padding: 6px 4px; text-align: right; width: 24px; position: relative; z-index: 12;">
          <button class="remove-choice-btn" data-index="${index}" style="background:none; border:none; color:var(--red); cursor:pointer; font-weight:bold; padding: 4px;">✕</button>
        </td>
        ${indicatorsHtml}
      `;

      row.querySelector('.remove-choice-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        let currentLists = getLists();
        const activeIdx = currentLists.findIndex(l => l.id === activeId);
        if (activeIdx !== -1) {
          currentLists[activeIdx].choices.splice(index, 1);
          if (typeof window.insertChoiceIndex === 'number') {
            if (window.insertChoiceIndex === index + 1) {
              window.insertChoiceIndex = null;
            } else if (window.insertChoiceIndex > index + 1) {
              window.insertChoiceIndex--;
            }
          }
          saveLists(currentLists);
          renderChoicesContent();
        }
      });

      if (showInsertIndicators) {
        row.querySelectorAll('.row-insert-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetIdx = parseInt(btn.parentElement.dataset.insertIndex, 10);
            window.insertChoiceIndex = targetIdx;
            renderChoicesContent();
          });
        });
      }

      table.appendChild(row);

      if (window.insertChoiceIndex === index + 1) {
        renderPlaceholder(index + 1);
      }
    });

    content.appendChild(table);
    updateCardPriorities();
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.card-add-choice-btn');
    if (!btn) return;

    const coc = btn.dataset.coc;
    const brc = btn.dataset.brc;

    const lists = getLists();
    const activeId = getActiveId();
    const activeIdx = lists.findIndex(l => l.id === activeId);

    if (activeIdx === -1) {
      alert('Please select or create a choice list first!');
      return;
    }

    const activeList = lists[activeIdx];
    const isInserting = (typeof window.insertChoiceIndex === 'number');

    if (!isInserting) {
      const existsIdx = activeList.choices.findIndex(choice => String(choice[0]) === String(coc) && String(choice[1]) === String(brc));
      if (existsIdx !== -1) {
        activeList.choices.splice(existsIdx, 1);
        saveLists(lists);
        renderChoicesContent();
        return;
      }
    }

    btn.classList.add('skeleton-box');

    setTimeout(() => {
      const existsIdx = activeList.choices.findIndex(choice => String(choice[0]) === String(coc) && String(choice[1]) === String(brc));
      if (isInserting) {
        let targetIdx = window.insertChoiceIndex;
        if (existsIdx !== -1) {
          activeList.choices.splice(existsIdx, 1);
          if (existsIdx < targetIdx) {
            targetIdx--;
          }
        }
        if (targetIdx >= 0 && targetIdx <= activeList.choices.length) {
          activeList.choices.splice(targetIdx, 0, [coc, brc]);
        } else {
          activeList.choices.push([coc, brc]);
        }
        window.insertChoiceIndex = null;
      } else {
        if (existsIdx === -1) {
          activeList.choices.push([coc, brc]);
        }
      }
      saveLists(lists);
      btn.classList.remove('skeleton-box');

      if (container.classList.contains('minimized')) {
        container.classList.remove('minimized');
        container.classList.add('maximized');
        localStorage.setItem('rankra_choicelist_size', 'maximized');
      }

      renderChoicesContent();
    }, 150);
  });

  window.refreshChoicesContent = renderChoicesContent;

  renderTabs();
  window.addEventListener('resize', checkOverflow);
}

document.addEventListener('DOMContentLoaded', () => {
  init();
  initChoiceListTabs();
});
