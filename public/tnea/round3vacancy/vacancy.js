import { $, $$, esc } from '../../shared/js/utils.js';
import { applyTheme, initTheme } from '../../shared/js/theme.js';
import { FilterSheet } from '../../shared/js/FilterSheet.js';
import { SiteHeader } from '../../shared/js/SiteHeader.js';
import { requestJSON, initBackgroundCache } from '../../shared/js/caching.js';

const S = {
  colleges: {},
  branches: [],
  districts: [],
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
    const path = '/assets/db/tnea/cutoff/round3_vacancy.json';
    const dataMap = await requestJSON([path]);
    const data = dataMap[path];
    
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

  let html = '';
  for (const col of filteredColleges) {
    const rankLabel = col.sortRank < 900000 ? `Rank #${col.sortRank}` : 'Unranked';
    
    let rowsHtml = '';
    for (const b of col.filteredBranches) {
      const ocClass = getCellClass(b.oc, 'OC');
      const commClass = !isOC ? getCellClass(b[commKey] || 0, S.community) : '';

      rowsHtml += `
        <tr>
          <td class="branch-code-cell center">${esc(b.brc)}</td>
          <td class="branch-name-cell">${esc(b.brn)}</td>
          <td class="seat-cell center ${ocClass}">${b.oc}</td>
          ${!isOC ? `<td class="seat-cell center ${commClass}">${b[commKey] || 0}</td>` : ''}
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
                <th class="center ${isOC ? 'active-comm' : ''}" style="width: 80px;">OC</th>
                ${!isOC ? `<th class="center active-comm" style="width: 80px;">${esc(S.community)}</th>` : ''}
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
}

function getCellClass(count, commName) {
  let classes = count === 0 ? 'zero' : 'has-seats';
  if (S.community === commName) {
    classes += ' active-comm';
  }
  return classes;
}

document.addEventListener('DOMContentLoaded', init);
