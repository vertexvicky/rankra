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

document.addEventListener('DOMContentLoaded', () => {
  new SiteHeader({
    title: 'Colleges',
    logoPath: '../../assets/rankra_logo50.png'
  });
  initTheme();
  initBackgroundCache(); 
  init();
});

let cocs = {}, searchIndex = {}, ranges = {}, allCodes = [];

const S = {
  districts: new Set(),
  districtMode: 'include',
  community: 'OC'
};

async function init() {
  try {
    const v = Date.now(); // Cache-buster
    const paths = [
      `/assets/db/tnea/college/cocs.json?v=${v}`,
      `/assets/db/tnea/college/csearch.json?v=${v}`,
      `/assets/db/tnea/college/cutrange.json?v=${v}`,
      `/assets/db/tndistricts.json?v=${v}`
    ];
    const data = await requestJSON(paths);
    
    cocs        = data[paths[0]];
    searchIndex = data[paths[1]];
    ranges      = data[paths[2]];
    const districts = data[paths[3]];
    
    // Sort allCodes by max cutoff 2025 (descending) for the current community
    updateSort();

    // Initialize district filter
    shDistrict = new FilterSheet('district-sheet', {
      title: 'Select Districts',
      items: districts,
      showModeToggle: true,
      onApply: (selected, mode) => {
        S.districts = selected;
        S.districtMode = mode;
        const label = document.getElementById('district-label');
        const btn = document.getElementById('district-btn');
        if (label) label.textContent = selected.size > 0 ? `Districts (${selected.size})` : 'District (all)';
        if (btn) btn.classList.toggle('active', selected.size > 0);
        runSearch();
      },
      onClear: () => {
        S.districts.clear();
        const label = document.getElementById('district-label');
        const btn = document.getElementById('district-btn');
        if (label) label.textContent = 'District (all)';
        if (btn) btn.classList.remove('active');
        runSearch();
      }
    });

    const distBtn = document.getElementById('district-btn');
    if (distBtn) distBtn.addEventListener('click', () => shDistrict.open());

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

    render(allCodes);
  } catch (e) {
    console.error(e);
    const list = document.getElementById('collegeList');
    if (list) list.innerHTML = `<div class="empty-state">Failed to load registry: ${e.message}</div>`;
  }
}

function updateSort() {
  allCodes = Object.keys(cocs).sort((a, b) => {
    let rA = [0, 0], rB = [0, 0];
    const rawA = ranges[a], rawB = ranges[b];
    
    if (rawA) {
      if (Array.isArray(rawA)) rA = rawA;
      else if (rawA[S.community]) rA = rawA[S.community];
    }
    if (rawB) {
      if (Array.isArray(rawB)) rB = rawB;
      else if (rawB[S.community]) rB = rawB[S.community];
    }
    
    return rB[0] - rA[0];
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

function render(codes) {
  const list  = document.getElementById('collegeList');
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
    
    // SMART RANGE PARSING: Handle both old array format and new community object format
    let r = [0, 0, 0, 0, 0, 0];
    const rawRange = ranges[code];
    if (rawRange) {
      if (Array.isArray(rawRange)) {
        r = rawRange; // Fallback to old format
      } else if (typeof rawRange === 'object' && rawRange[S.community]) {
        r = rawRange[S.community]; // Use new community format
      }
    }
    
    const [max25, min25, max_cagr, min_cagr, max_proj, min_proj] = r;

    let possibilityBadge = '';
    if (!isNaN(cq) && cq > 0 && max25 > 0) {
      if (cq < min25 - 2) {
        possibilityBadge = `<span class="possibility-badge" data-sentiment="negative">Low Possibility</span>`;
      }
    }

    return `
      <a class="clg-card result-card" href="view?code=${code}">
        <div class="clg-card-inner">
          <div class="clg-left">
            <div class="clg-meta">
              <span class="clg-code">Code ${highlight(code, tq)}</span>
              <span class="clg-district">${highlight(district, tq)}</span>
              ${possibilityBadge}
            </div>
            <div class="clg-name">${highlight(name, tq)}</div>
          </div>
          <div class="clg-right">
            <span class="clg-range-low">${min25 > 0 ? min25.toFixed(1) : '—'}</span>
            <span class="clg-range-sep">to</span>
            <span class="clg-range-high">${max25 > 0 ? max25.toFixed(1) : '—'}</span>
          </div>
        </div>
        <div class="clg-row-3">
          <span class="clg-stats">Show more about this college</span>
        </div>
      </a>`;
  }).join('');
}

const cutoffInput = document.getElementById('cutoffSearch');
const textInput   = document.getElementById('collegeSearch');

const runSearch = () => {
  const cq = parseFloat(cutoffInput.value);
  const tq = textInput.value.toLowerCase().trim();
  
  let filtered = allCodes.filter(code => {
    const raw = cocs[code] || '';
    const r = (ranges[code] && ranges[code][S.community]) || [0, 0, 0, 0, 0, 0];
    const exists = r[0] > 0 || r[1] > 0;
    if (!exists) return false;

    if (tq) {
      const q = tq.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (q) {
        const { name, district } = parse(raw);
        const kws = searchIndex[code] || [];
        
        const normCode = code.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normDist = district.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normKws  = kws.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));

        const match = normCode.includes(q) || 
                      normName.includes(q) || 
                      normDist.includes(q) || 
                      normKws.some(k => k.includes(q));
        return match;
      }
    }
    return true;
  });

  if (!isNaN(cq) && cq > 0) {
    filtered = filtered.filter(code => {
      const r = (ranges[code] && ranges[code][S.community]) || [0, 0, 0, 0, 0, 0];
      const min = r[1] || 0;
      return cq >= min; // Absolute filter
    });
  }

  if (S.districts.size > 0) {
    filtered = filtered.filter(code => {
      const { district } = parse(cocs[code]);
      const has = S.districts.has(district);
      return S.districtMode === 'include' ? has : !has;
    });
  }

  // 3. Text filter
  if (tq) {
    const rq = tq.toLowerCase().replace(/[^a-z0-9]/g, '');
    const scored = filtered.map(code => {
      const full = cocs[code];
      const { name, district } = parse(full);
      const kws  = searchIndex[code] || []; // Use code for index lookup
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

  render(filtered);
};

if (cutoffInput) cutoffInput.addEventListener('input', runSearch);
if (textInput) textInput.addEventListener('input', runSearch);
