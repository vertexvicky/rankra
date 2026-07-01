import { SiteHeader } from '../../shared/js/SiteHeader.js';
import { initTheme } from '../../shared/js/theme.js';
import { requestJSON } from '../../shared/js/caching.js';

/* ================================================================
   DATA
   ================================================================ */
let choiceData = [];   // [[collegeCode, branchCode], …]
let cocs = {};         // { collegeCode: "College Name\nAddress" }
let brnc = {};         // { branchCode: "Branch Name" }
let clgs = {};         // { collegeCode: { name, district, types, … } }

/* ================================================================
   STATE
   ================================================================ */
const LS_KEY = 'rankra_choice_lists';

function loadLists() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function saveLists(lists) {
  localStorage.setItem(LS_KEY, JSON.stringify(lists));
}

let lists = loadLists();
let currentId = null;
let currentChoices = [];

/* Insertion/Replacement state */
let activeInsertIndex = null;
let activeReplaceIndex = null;

/* Filter state */
let fSearch = '';

/* Choices Search state */
let choicesSearchQuery = '';
let choicesMatches = [];
let choicesMatchIndex = -1;

/* ================================================================
   DOM REFS (populated after DOMContentLoaded)
   ================================================================ */
let $dashboardView, $editorView, $listsGrid, $dashboardEmpty;
let $listName, $editorEmpty, $choicesContainer;
let $staticSearchPanel, $searchStatusBar, $searchStatusText, $resultsList;
let $choicesSearchContainer, $choicesSearchInput, $choicesSearchCounter;

/* Infinite scroll state */
let currentMatchedResults = [];
let renderedCount = 0;
const BATCH_SIZE = 100;

/* ================================================================
   INIT
   ================================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  new SiteHeader({ title: 'Choice List', logoPath: '../../assets/rankra_logo50.png' });
  initTheme();

  $dashboardView   = document.getElementById('dashboard-view');
  $editorView      = document.getElementById('editor-view');
  $listsGrid       = document.getElementById('lists-grid');
  $dashboardEmpty  = document.getElementById('dashboard-empty');
  $listName        = document.getElementById('list-name');
  $editorEmpty     = document.getElementById('editor-empty');
  $choicesContainer = document.getElementById('choices-container');
  $staticSearchPanel = document.getElementById('static-search-panel');
  $searchStatusBar = document.getElementById('search-status-bar');
  $searchStatusText = document.getElementById('search-status-text');
  $resultsList     = document.getElementById('results-list');
  $choicesSearchContainer = document.getElementById('choices-search-container');
  $choicesSearchInput     = document.getElementById('choices-search-input');
  $choicesSearchCounter   = document.getElementById('choices-search-counter');

  /* Load data */
  const paths = [
    '/assets/db/tnea/choice.json',
    '/assets/db/tnea/college/cocs.json',
    '/assets/db/tnea/college/brnc.json',
    '/assets/db/tnea/college/clgs.gzip'
  ];

  const data = await requestJSON(paths);
  choiceData = data[paths[0]] || [];
  cocs       = data[paths[1]] || {};
  brnc       = data[paths[2]] || {};
  clgs       = data[paths[3]] || {};

  bindEvents();

  // Handle routing on initial load
  const hash = window.location.hash;
  const hashId = hash.replace(/^#\/?/, '');
  const params = new URLSearchParams(window.location.search);
  const queryId = params.get('id');
  const id = hashId || queryId;

  if (id && lists.some(l => l.id === id)) {
    openEditor(id, false);
  } else {
    showDashboard(false);
  }
});

/* ================================================================
   EVENTS
   ================================================================ */
function bindEvents() {
  /* Create */
  document.getElementById('btn-create-list').addEventListener('click', () => {
    const list = {
      id: Date.now().toString(),
      name: 'My Choice List ' + (lists.length + 1),
      choices: [],
      updatedAt: Date.now()
    };
    lists.push(list);
    saveLists(lists);
    openEditor(list.id);
  });

  /* Back */
  document.getElementById('btn-back').addEventListener('click', () => {
    saveEditor();
    showDashboard();
  });

  /* Name change */
  $listName.addEventListener('change', saveEditor);



  /* Infinite scroll for results list */
  $resultsList.addEventListener('scroll', () => {
    if ($resultsList.scrollHeight - $resultsList.scrollTop - $resultsList.clientHeight < 100) {
      loadMoreResults();
    }
  });

  /* Cancel action button */
  document.getElementById('btn-cancel-action').addEventListener('click', cancelSearchAction);

  /* College search */
  document.getElementById('college-search').addEventListener('input', e => {
    fSearch = e.target.value.toLowerCase();
    renderResults();
  });

  /* Choices list search input & navigation */
  $choicesSearchInput.addEventListener('input', e => {
    choicesSearchQuery = e.target.value.trim().toLowerCase();
    performChoicesSearch();
  });

  document.getElementById('btn-choices-search-prev').addEventListener('click', () => {
    navigateChoicesSearch(-1);
  });

  document.getElementById('btn-choices-search-next').addEventListener('click', () => {
    navigateChoicesSearch(1);
  });

  /* Routing listener */
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash;
    const id = hash.replace(/^#\/?/, '');
    if (id && lists.some(l => l.id === id)) {
      openEditor(id, false);
    } else {
      showDashboard(false);
    }
  });

  /* close all menus on outside click */
  document.addEventListener('click', e => {
    if (!e.target.closest('.cl-more-btn')) {
      document.querySelectorAll('.cl-menu').forEach(m => m.remove());
    }
  });
}

/* ================================================================
   DASHBOARD
   ================================================================ */
function showDashboard(pushToHistory = true) {
  $editorView.classList.add('hidden');
  $dashboardView.classList.remove('hidden');
  currentId = null;
  if (pushToHistory) {
    if (window.location.hash) {
      // Clear the hash without reloading
      window.history.pushState(null, '', window.location.pathname + window.location.search);
    }
  }
  renderDashboard();
}

function renderDashboard() {
  $listsGrid.innerHTML = '';
  if (lists.length === 0) {
    $dashboardEmpty.classList.remove('hidden');
    return;
  }
  $dashboardEmpty.classList.add('hidden');

  lists.forEach(list => {
    const card = document.createElement('div');
    card.className = 'cl-card';
    const dt = new Date(list.updatedAt);
    const dateStr = dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    card.innerHTML = `
      <div class="cl-card-body">
        <div class="cl-card-title">${esc(list.name)}</div>
        <div class="cl-card-meta">
          <span>${list.choices.length} choice${list.choices.length !== 1 ? 's' : ''}</span>
          <span>${dateStr}</span>
        </div>
      </div>
      <button class="cl-more-btn" data-id="${list.id}"><i class="fa-solid fa-ellipsis-vertical"></i></button>
    `;

    /* open list on card click */
    card.addEventListener('click', e => {
      if (e.target.closest('.cl-more-btn') || e.target.closest('.cl-menu')) return;
      openEditor(list.id);
    });

    /* three-dot menu */
    card.querySelector('.cl-more-btn').addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.cl-menu').forEach(m => m.remove());
      const menu = document.createElement('div');
      menu.className = 'cl-menu';
      menu.innerHTML = `<button class="cl-menu-item"><i class="fa-solid fa-trash-can"></i> Delete</button>`;
      menu.querySelector('.cl-menu-item').addEventListener('click', ev => {
        ev.stopPropagation();
        lists = lists.filter(l => l.id !== list.id);
        saveLists(lists);
        renderDashboard();
      });
      card.appendChild(menu);
    });

    $listsGrid.appendChild(card);
  });
}

/* ================================================================
   EDITOR
   ================================================================ */
function openEditor(id, pushToHistory = true) {
  const list = lists.find(l => l.id === id);
  if (!list) return;
  currentId = id;
  currentChoices = [...list.choices];
  $listName.value = list.name;
  $dashboardView.classList.add('hidden');
  $editorView.classList.remove('hidden');

  choicesSearchQuery = '';
  choicesMatches = [];
  choicesMatchIndex = -1;
  if ($choicesSearchInput) {
    $choicesSearchInput.value = '';
  }
  if ($choicesSearchCounter) {
    $choicesSearchCounter.textContent = '0/0';
    $choicesSearchCounter.classList.remove('no-matches');
  }

  renderChoices();
  cancelSearchAction();

  if (pushToHistory) {
    window.location.hash = '/' + id;
  }
}

function saveEditor() {
  if (!currentId) return;
  const list = lists.find(l => l.id === currentId);
  if (!list) return;
  list.name = $listName.value.trim() || 'Untitled';
  list.choices = [...currentChoices];
  list.updatedAt = Date.now();
  saveLists(lists);
}

function renderChoices(highlightIndex = null) {
  const hasChoices = currentChoices.length > 0;
  $editorEmpty.classList.toggle('hidden', hasChoices);
  $choicesContainer.classList.toggle('hidden', !hasChoices);
  $editorView.classList.toggle('cl-no-choices', !hasChoices);
  if ($choicesSearchContainer) {
    $choicesSearchContainer.classList.toggle('hidden', !hasChoices);
  }

  $choicesContainer.innerHTML = '';
  currentChoices.forEach((key, i) => {
    const [cc, bc] = key.split('-');
    const info = getCollegeInfo(cc);
    const courseName = brnc[bc] || bc;

    const el = document.createElement('div');
    el.className = 'cl-choice-item';
    el.setAttribute('data-choice-index', i);
    if (i === highlightIndex) {
      el.classList.add('cl-highlight-pulse');
    }
    
    const districtPart = info.district ? ` – <span class="cl-district-lbl">${esc(info.district)}</span>` : '';
    
    el.innerHTML = `
      <span class="cl-choice-rank">${i + 1}</span>
      <div class="cl-choice-info">
        <div class="cl-choice-college">
          <span class="cl-code-badge">${esc(padCode(cc))}</span> – <span class="cl-college-name">${esc(info.name)}</span>${districtPart}
        </div>
        <div class="cl-choice-course">
          <span class="cl-branch-code">${esc(bc)}</span> – <span class="cl-course-name">${esc(courseName)}</span>
        </div>
      </div>
      <div class="cl-choice-actions">
        <button class="cl-choice-replace" data-i="${i}" title="Replace choice"><i class="fa-solid fa-arrows-rotate"></i></button>
        <button class="cl-choice-del" data-i="${i}" title="Remove choice"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    `;

    /* Replace listener */
    el.querySelector('.cl-choice-replace').addEventListener('click', () => {
      triggerSearchAction(null, i);
    });

    /* Delete listener */
    el.querySelector('.cl-choice-del').addEventListener('click', () => {
      currentChoices.splice(i, 1);
      saveEditor();
      renderChoices();
    });

    $choicesContainer.appendChild(el);

    if (i === highlightIndex) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }

    /* Render an inline "+ Add Choice" button between choices */
    if (i < currentChoices.length - 1) {
      const divider = document.createElement('div');
      divider.className = 'cl-choices-divider';
      divider.innerHTML = `
        <button class="cl-choices-divider-btn">
          <i class="fa-solid fa-plus"></i> Add
        </button>
      `;
      divider.querySelector('.cl-choices-divider-btn').addEventListener('click', () => {
        triggerSearchAction(i + 1, null);
      });
      $choicesContainer.appendChild(divider);
    }
  });

  if (choicesSearchQuery) {
    performChoicesSearch(true);
  }

  // Refresh search results to keep Add/Added buttons in sync
  renderResults();
}

/* ================================================================
   STATIC SEARCH PANEL ACTIONS
   ================================================================ */
function triggerSearchAction(insertIndex = null, replaceIndex = null) {
  activeInsertIndex = insertIndex;
  activeReplaceIndex = replaceIndex;

  if (activeReplaceIndex !== null) {
    $searchStatusText.textContent = `Replacing choice #${activeReplaceIndex + 1}`;
    $searchStatusBar.classList.remove('hidden');
  } else if (activeInsertIndex !== null) {
    $searchStatusText.textContent = `Inserting choice at position #${activeInsertIndex + 1}`;
    $searchStatusBar.classList.remove('hidden');
  } else {
    $searchStatusBar.classList.add('hidden');
  }

  $staticSearchPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  
  const input = document.getElementById('college-search');
  if (input) {
    input.focus();
  }

  renderResults();
}

function cancelSearchAction() {
  activeInsertIndex = null;
  activeReplaceIndex = null;
  $searchStatusBar.classList.add('hidden');
  fSearch = '';
  document.getElementById('college-search').value = '';
  renderResults();
}

function renderResults() {
  currentMatchedResults = choiceData.filter(([cc, bc]) => {
    const meta = clgs[cc];
    const info = getCollegeInfo(cc);

    /* text search matches code, name, branch or district */
    if (fSearch) {
      const branchName = brnc[bc] || bc;
      const paddedCc = padCode(cc);
      const hay = (cc + ' ' + paddedCc + ' ' + info.name + ' ' + (info.district || '') + ' ' + branchName).toLowerCase();
      if (!hay.includes(fSearch)) return false;
    }

    return true;
  });

  $resultsList.innerHTML = '';
  $resultsList.scrollTop = 0;
  renderedCount = 0;
  loadMoreResults();
}

function loadMoreResults() {
  if (renderedCount >= currentMatchedResults.length) return;

  const nextBatch = currentMatchedResults.slice(renderedCount, renderedCount + BATCH_SIZE);
  const fragment = document.createDocumentFragment();

  nextBatch.forEach(([cc, bc]) => {
    const key = cc + '-' + bc;
    const isReplacingThis = activeReplaceIndex !== null && currentChoices[activeReplaceIndex] === key;
    const alreadyInList = currentChoices.includes(key);
    const showAsAdded = alreadyInList && !isReplacingThis;

    const info = getCollegeInfo(cc);
    const courseName = brnc[bc] || bc;

    const row = document.createElement('div');
    row.className = 'cl-result';
    
    let btnText = 'Add';
    if (activeReplaceIndex !== null) {
      btnText = 'Replace';
    }

    row.innerHTML = `
      <div class="cl-result-info">
        <div class="cl-result-college">${esc(padCode(cc))} – ${esc(info.name)}${info.district ? ' – ' + esc(info.district) : ''}</div>
        <div class="cl-result-course">${esc(courseName)}</div>
      </div>
      <button class="cl-btn-add ${showAsAdded ? 'added' : ''}">${showAsAdded ? 'Added' : btnText}</button>
    `;

    if (!showAsAdded) {
      const btn = row.querySelector('.cl-btn-add');
      btn.addEventListener('click', () => {
        if (activeReplaceIndex !== null) {
          const index = activeReplaceIndex;
          currentChoices[activeReplaceIndex] = key;
          saveEditor();
          renderChoices(index);
          cancelSearchAction();
        } else if (activeInsertIndex !== null) {
          const index = activeInsertIndex;
          currentChoices.splice(activeInsertIndex, 0, key);
          saveEditor();
          renderChoices(index);
          cancelSearchAction();
        } else {
          /* Append — stay in search, just mark button as Added */
          currentChoices.push(key);
          const index = currentChoices.length - 1;
          saveEditor();
          renderChoices(index);
          btn.textContent = 'Added';
          btn.classList.add('added');
          btn.style.pointerEvents = 'none';
        }
      });
    }

    fragment.appendChild(row);
  });

  $resultsList.appendChild(fragment);
  renderedCount += nextBatch.length;
}

/* ================================================================
   HELPERS
   ================================================================ */
function getCollegeInfo(code) {
  let name = 'College ' + code;
  let district = '';

  if (clgs[code]) {
    name = clgs[code].name;
    district = (clgs[code].district || '').split(',')[0].trim();
  } else if (cocs[code]) {
    const parts = cocs[code].split('\n');
    name = parts[0];
    if (parts[1]) {
      district = parts[1].split('-')[0].trim();
    }
  }

  return { name, district };
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function padCode(code) {
  const str = String(code).trim();
  if (/^\d+$/.test(str)) {
    return str.padStart(4, '0');
  }
  return str;
}

/* ================================================================
   CHOICES SEARCH (CTRL+F) LOGIC
   ================================================================ */
function performChoicesSearch(keepIndex = false) {
  $choicesContainer.querySelectorAll('.cl-choice-item').forEach(el => {
    el.classList.remove('cl-search-active-match');
  });

  if (!choicesSearchQuery) {
    choicesMatches = [];
    choicesMatchIndex = -1;
    $choicesSearchCounter.textContent = '0/0';
    return;
  }

  choicesMatches = [];
  currentChoices.forEach((key, i) => {
    const [cc, bc] = key.split('-');
    const info = getCollegeInfo(cc);
    const paddedCc = padCode(cc);
    const searchString = `${cc} ${paddedCc} ${info.name} ${info.district || ''} ${bc} ${courseName}`.toLowerCase();
    if (searchString.includes(choicesSearchQuery)) {
      choicesMatches.push(i);
    }
  });

  if (choicesMatches.length === 0) {
    choicesMatchIndex = -1;
    $choicesSearchCounter.textContent = '0/0';
    $choicesSearchCounter.classList.add('no-matches');
    return;
  }

  $choicesSearchCounter.classList.remove('no-matches');
  
  if (!keepIndex || choicesMatchIndex === -1 || !choicesMatches.includes(choicesMatches[choicesMatchIndex])) {
    choicesMatchIndex = 0;
  } else {
    const prevMatchIndexVal = choicesMatches[choicesMatchIndex];
    const newIdx = choicesMatches.indexOf(prevMatchIndexVal);
    choicesMatchIndex = newIdx !== -1 ? newIdx : 0;
  }

  highlightChoicesMatch();
}

function navigateChoicesSearch(direction) {
  if (choicesMatches.length === 0) return;
  choicesMatchIndex = (choicesMatchIndex + direction + choicesMatches.length) % choicesMatches.length;
  highlightChoicesMatch();
}

function highlightChoicesMatch() {
  $choicesContainer.querySelectorAll('.cl-choice-item').forEach(el => {
    el.classList.remove('cl-search-active-match');
  });

  const matchedChoiceIndex = choicesMatches[choicesMatchIndex];
  const el = $choicesContainer.querySelector(`[data-choice-index="${matchedChoiceIndex}"]`);
  if (el) {
    el.classList.add('cl-search-active-match');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  $choicesSearchCounter.textContent = `${choicesMatchIndex + 1}/${choicesMatches.length}`;
}
